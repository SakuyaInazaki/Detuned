import {
  Subscription,
  Consumer,
  CreateSubscriptionRequest,
  PollRequest,
  PollResponseData,
  AckRequest,
  AckResponseData,
  DetunedError,
  ErrorCode,
  Event,
} from '@detuned/protocol';
import { StoragePort, DeliveryBatchRecord } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';

export class EventService {
  constructor(
    private readonly storage: StoragePort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly authService: AuthService,
    private readonly tokenSecret: string
  ) {}

  subscribe(
    auth: AuthenticatedContext,
    spaceId: string,
    req: CreateSubscriptionRequest
  ): { subscription: Subscription; consumer: Consumer } {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'observer');
    const space = this.storage.findSpaceById(spaceId)!;

    let startSeq = 0;
    if (req.start === 'now') {
      startSeq = this.storage.getLatestEventSeq(spaceId);
    } else if (req.start === 'context_checkpoint' && req.checkpoint_token) {
      const verified = this.tokenSigner.verify(req.checkpoint_token, this.tokenSecret);
      if (
        !verified ||
        verified['purpose'] !== 'checkpoint' ||
        verified['space_id'] !== spaceId ||
        verified['actor_id'] !== auth.actor.id ||
        typeof verified['seq'] !== 'number'
      ) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '无效、过期或跨身份/跨空间的 checkpoint_token。',
          422
        );
      }
      const seq = verified['seq'] as number;
      const latestSeq = this.storage.getLatestEventSeq(spaceId);
      if (seq < 0 || seq > latestSeq) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          `checkpoint_token 序号 (${seq}) 超过当前最新事件序号 (${latestSeq})。`,
          422
        );
      }
      startSeq = seq;
    }

    return this.storage.transaction((tx) => {
      function arraysEqual(a: string[], b: string[]) {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((v, i) => v === sortedB[i]);
      }

      const existingSubs = tx.listSubscriptionsByActorAndSpace(auth.actor.id, spaceId);
      const reqThreadIds = req.thread_ids ?? [];
      const reqEventTypes = req.event_types ?? [];

      let sub = existingSubs.find(
        (s) => arraysEqual(s.thread_ids, reqThreadIds) && arraysEqual(s.event_types, reqEventTypes)
      );

      if (!sub) {
        const subId = this.idGen.generateId('sub');
        sub = {
          id: subId,
          actor_id: auth.actor.id,
          space_id: spaceId,
          thread_ids: reqThreadIds,
          event_types: reqEventTypes,
          created_at: this.clock.nowIso(),
        };
        tx.createSubscription(sub);
      }

      let consumer = tx.findConsumerByKey(sub.id, req.consumer_key);
      if (!consumer) {
        const consumerId = this.idGen.generateId('csr');
        consumer = {
          id: consumerId,
          subscription_id: sub.id,
          consumer_key: req.consumer_key,
          ack_seq: startSeq,
          version: 1,
          active_batch_id: null,
          acl_epoch: space.acl_epoch,
        };
        tx.createConsumer(consumer);
      }

      return { subscription: sub, consumer };
    });
  }

  poll(
    auth: AuthenticatedContext,
    spaceId: string,
    consumerId: string,
    req: PollRequest
  ): PollResponseData {
    this.authService.requireSpaceAccess(auth, spaceId, 'observer');
    const space = this.storage.findSpaceById(spaceId)!;

    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '消费者不存在。', 404);
    }

    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== auth.actor.id || sub.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.FORBIDDEN, '无权访问该消费者。', 403);
    }

    if (consumer.acl_epoch < space.acl_epoch) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        '成员权限已变更，消费者需要重新建立同步游标。',
        409
      );
    }

    const limit = Math.min(Math.max(req.limit ?? 20, 1), 100);

    return this.storage.transaction((tx) => {
      // 1. If consumer has an active unacknowledged batch, redeliver the exact same batch!
      if (consumer.active_batch_id) {
        const batch = tx.findDeliveryBatchById(consumer.active_batch_id);
        if (batch) {
          const events: Event[] = [];
          for (const evId of batch.event_ids) {
            const ev = tx.findEventById(evId);
            if (ev) events.push(ev);
          }
          const nextCursor = this.tokenSigner.sign(
            {
              consumer_id: consumer.id,
              batch_id: batch.id,
              through_seq: batch.through_seq,
              exp: Math.floor(Date.now() / 1000) + 86400,
            },
            this.tokenSecret
          );
          return {
            batch_id: batch.id,
            events,
            next_cursor: nextCursor,
            has_more: true,
          };
        }
      }

      // 2. Scan events after ack_seq
      const rawEvents = tx.listEventsAfter(spaceId, consumer.ack_seq, 500);
      if (rawEvents.length === 0) {
        return {
          batch_id: null,
          events: [],
          next_cursor: null,
          has_more: false,
        };
      }

      // 3. Filter events matching subscription
      const matchedEvents: Event[] = [];
      let throughSeq = consumer.ack_seq;

      for (const ev of rawEvents) {
        throughSeq = Math.max(throughSeq, ev.seq);
        // Filter by event types if configured
        if (sub.event_types.length > 0 && !sub.event_types.includes(ev.type)) {
          continue;
        }

        // Filter by thread_ids if configured
        if (sub.thread_ids.length > 0) {
          if (ev.type.startsWith('thread.')) {
            if (!sub.thread_ids.includes(ev.object_id)) {
              continue;
            }
          } else if (ev.type.startsWith('post.')) {
            const post = tx.findPostById(ev.object_id);
            if (!post || !sub.thread_ids.includes(post.thread_id)) {
              continue;
            }
          } else if (ev.type.startsWith('relation.')) {
            const rel = tx.findRelationById(ev.object_id);
            if (!rel) {
              continue;
            }
            const sourcePost = tx.findPostById(rel.source_post_id);
            const targetPost = tx.findPostById(rel.target_post_id);
            const sourceMatches = sourcePost && sub.thread_ids.includes(sourcePost.thread_id);
            const targetMatches = targetPost && sub.thread_ids.includes(targetPost.thread_id);
            if (!sourceMatches && !targetMatches) {
              continue;
            }
          } else {
            continue;
          }
        }

        matchedEvents.push(ev);
        if (matchedEvents.length >= limit) {
          break;
        }
      }

      const batchId = this.idGen.generateId('bat');
      const batchRecord: DeliveryBatchRecord = {
        id: batchId,
        consumer_id: consumer.id,
        from_seq: consumer.ack_seq,
        through_seq: throughSeq,
        event_ids: matchedEvents.map((e) => e.id),
        acked_at: null,
        created_at: this.clock.nowIso(),
      };

      tx.createDeliveryBatch(batchRecord);
      tx.updateConsumerBatch(consumer.id, batchId, consumer.version + 1);

      const nextCursor = this.tokenSigner.sign(
        {
          consumer_id: consumer.id,
          batch_id: batchId,
          through_seq: throughSeq,
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        this.tokenSecret
      );

      const hasMore = throughSeq < tx.getLatestEventSeq(spaceId);

      return {
        batch_id: batchId,
        events: matchedEvents,
        next_cursor: nextCursor,
        has_more: hasMore,
      };
    });
  }

  ack(
    auth: AuthenticatedContext,
    spaceId: string,
    consumerId: string,
    req: AckRequest
  ): AckResponseData {
    this.authService.requireSpaceAccess(auth, spaceId, 'observer');

    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '消费者不存在。', 404);
    }

    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== auth.actor.id || sub.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.FORBIDDEN, '无权访问该消费者。', 403);
    }

    const verified = this.tokenSigner.verify(req.next_cursor, this.tokenSecret);
    if (
      !verified ||
      verified['consumer_id'] !== consumerId ||
      verified['batch_id'] !== req.batch_id ||
      typeof verified['through_seq'] !== 'number'
    ) {
      throw new DetunedError(
        ErrorCode.ACK_INVALID,
        '无效的确认游标或批次 ID。',
        409
      );
    }

    const throughSeq = verified['through_seq'] as number;

    return this.storage.transaction((tx) => {
      const batch = tx.findDeliveryBatchById(req.batch_id);
      if (!batch || batch.consumer_id !== consumer.id) {
        throw new DetunedError(ErrorCode.ACK_INVALID, '批次不存在或不属于该消费者。', 409);
      }

      // Idempotent retry of identical batch ack
      if (batch.acked_at && consumer.ack_seq >= throughSeq) {
        return {
          confirmed: true,
          acknowledged_batch_id: req.batch_id,
        };
      }

      if (consumer.active_batch_id !== req.batch_id) {
        throw new DetunedError(
          ErrorCode.ACK_INVALID,
          '当前活跃批次与确认批次不一致。',
          409
        );
      }

      // Cursor through_seq must match server persisted delivery batch
      if (throughSeq !== batch.through_seq) {
        throw new DetunedError(
          ErrorCode.ACK_INVALID,
          '确认游标中的序列号与批次实际持久序列号不匹配。',
          409
        );
      }

      const latestSeq = tx.getLatestEventSeq(spaceId);
      if (throughSeq > latestSeq) {
        throw new DetunedError(
          ErrorCode.ACK_INVALID,
          '确认游标序列号超出当前已持久事件最大序列号。',
          409
        );
      }

      const now = this.clock.nowIso();
      tx.ackDeliveryBatch(req.batch_id, now);
      tx.updateConsumerAck(consumer.id, throughSeq, consumer.version + 1);
      tx.updateConsumerBatch(consumer.id, null, consumer.version + 2);

      return {
        confirmed: true,
        acknowledged_batch_id: req.batch_id,
      };
    });
  }

  deactivateConsumer(auth: AuthenticatedContext, spaceId: string, consumerId: string): void {
    this.authService.requireSpaceAccess(auth, spaceId, 'observer');
    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) {
      return; // Idempotent
    }
    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== auth.actor.id) {
      throw new DetunedError(ErrorCode.FORBIDDEN, '无权停用该消费者。', 403);
    }
    this.storage.deactivateConsumer(consumerId);
  }
}
