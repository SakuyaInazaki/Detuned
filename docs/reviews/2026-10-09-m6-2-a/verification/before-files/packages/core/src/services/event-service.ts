import {
  Subscription,
  Consumer,
  CreateSubscriptionRequest,
  isSubscriptionStartValid,
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
import { WriteRateLimiter } from './write-rate-limiter.js';

export interface EventWaitScheduler {
  nowMs(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Polling cancelled.', 'AbortError');
}

const defaultWaitScheduler: EventWaitScheduler = {
  nowMs: () => performance.now(),
  sleep(ms, signal) {
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new DOMException('Polling cancelled.', 'AbortError')); };
      if (signal?.aborted) { abort(); return; }
      timer = setTimeout(() => { cleanup(); resolve(); }, ms);
      signal?.addEventListener('abort', abort, { once: true });
    });
  },
};

export class EventService {
  constructor(
    private readonly storage: StoragePort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly authService: AuthService,
    private readonly tokenSecret: string,
    private readonly waitScheduler: EventWaitScheduler = defaultWaitScheduler,
    private readonly writeRateLimiter: WriteRateLimiter = authService.writeRateLimiter
  ) {}

  private waitingPolls = 0;

  subscribe(
    auth: AuthenticatedContext,
    spaceId: string,
    req: CreateSubscriptionRequest
  ): { subscription: Subscription; consumer: Consumer } {
    if (!isSubscriptionStartValid(req)) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, '无效的订阅起点与 checkpoint_token 组合。', 400);
    }
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'observer');
    const space = this.storage.findSpaceById(spaceId)!;

    let startSeq = 0;
    if (req.start === 'now') {
      startSeq = this.storage.getLatestEventSeq(spaceId);
    } else if (req.start === 'context_checkpoint' && req.checkpoint_token) {
      const verified = this.tokenSigner.verify(req.checkpoint_token, this.tokenSecret, Math.floor(this.clock.now().getTime() / 1000));
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

      let admitted = false;
      if (!sub) {
        this.writeRateLimiter.admit(auth.actor.id);
        admitted = true;
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
        if (!admitted) this.writeRateLimiter.admit(auth.actor.id);
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

  private currentConsumer(auth: AuthenticatedContext, spaceId: string, consumerId: string) {
    const current = this.authService.refreshContext(auth);
    this.authService.requireSpaceAccess(current, spaceId, 'observer');
    const space = this.storage.findSpaceById(spaceId)!;
    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) throw new DetunedError(ErrorCode.NOT_FOUND, '消费者不存在。', 404);
    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== current.actor.id || sub.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.FORBIDDEN, '无权访问该消费者。', 403);
    }
    if (consumer.acl_epoch !== space.acl_epoch) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '成员权限已变更，消费者需要重新建立同步游标。', 409);
    }
    return { current, consumer, sub };
  }

  private cursor(auth: AuthenticatedContext, spaceId: string, consumerId: string, batch: DeliveryBatchRecord): string {
    return this.tokenSigner.sign({
      v: 1, purpose: 'event_ack', actor_id: auth.actor.id, space_id: spaceId,
      consumer_id: consumerId, batch_id: batch.id, through_seq: batch.through_seq,
      exp: Math.floor(this.clock.now().getTime() / 1000) + 86400,
    }, this.tokenSecret);
  }

  poll(auth: AuthenticatedContext, spaceId: string, consumerId: string, req: PollRequest): PollResponseData {
    return this.storage.transaction((tx) => {
      const { current, consumer, sub } = this.currentConsumer(auth, spaceId, consumerId);
      const limit = Math.min(Math.max(req.limit ?? 20, 1), 100);
      if (consumer.active_batch_id) {
        const batch = tx.findDeliveryBatchById(consumer.active_batch_id);
        if (!batch || batch.consumer_id !== consumer.id) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '消费者待确认批次不可恢复。', 409);
        }
        const events: Event[] = [];
        for (const id of batch.event_ids) {
          const ev = tx.findEventById(id);
          if (ev && ev.space_id === spaceId && ev.visibility === 'public') events.push(ev);
        }
        return { batch_id: batch.id, events, next_cursor: this.cursor(current, spaceId, consumer.id, batch), has_more: true };
      }
      const raw = tx.listEventsAfter(spaceId, consumer.ack_seq, 500);
      if (!raw.length) return { batch_id: null, events: [], next_cursor: null, has_more: false };
      const events: Event[] = [];
      let through = consumer.ack_seq;
      for (const ev of raw) {
        through = ev.seq;
        if (ev.visibility !== 'public') continue;
        if (sub.event_types.length && !sub.event_types.includes(ev.type)) continue;
        if (sub.thread_ids.length) {
          if (ev.type.startsWith('thread.')) {
            if (!sub.thread_ids.includes(ev.object_id)) continue;
          } else if (ev.type.startsWith('post.')) {
            const post = tx.findPostById(ev.object_id);
            if (!post || post.space_id !== spaceId || !sub.thread_ids.includes(post.thread_id)) continue;
          } else if (ev.type.startsWith('relation.')) {
            const rel = tx.findRelationById(ev.object_id);
            if (!rel || rel.space_id !== spaceId) continue;
            const source = tx.findPostById(rel.source_post_id), target = tx.findPostById(rel.target_post_id);
            if (!(source?.space_id === spaceId && sub.thread_ids.includes(source.thread_id)) &&
                !(target?.space_id === spaceId && sub.thread_ids.includes(target.thread_id))) continue;
          } else if (ev.type === 'review.requested' || ev.type === 'review.cancelled') {
            const request = tx.findReviewRequestById(ev.object_id);
            const target = request?.space_id === spaceId ? tx.findPostById(request.target_ref.post_id) : null;
            if (!target || target.space_id !== spaceId || !sub.thread_ids.includes(target.thread_id)) continue;
          } else continue;
        }
        events.push(ev);
        if (events.length >= limit) break;
      }
      const batch: DeliveryBatchRecord = { id: this.idGen.generateId('bat'), consumer_id: consumer.id,
        from_seq: consumer.ack_seq, through_seq: through, event_ids: events.map(e => e.id), acked_at: null, created_at: this.clock.nowIso() };
      tx.createDeliveryBatch(batch);
      tx.updateConsumerBatch(consumer.id, batch.id, consumer.version + 1);
      return { batch_id: batch.id, events, next_cursor: this.cursor(current, spaceId, consumer.id, batch), has_more: through < tx.getLatestEventSeq(spaceId) };
    });
  }

  async pollWithWait(auth: AuthenticatedContext, spaceId: string, consumerId: string, req: PollRequest,
    options: { signal?: AbortSignal } = {}): Promise<PollResponseData> {
    const signal = options.signal;
    checkAbort(signal);
    const wait = req.wait_ms ?? 0;
    if (!Number.isInteger(wait) || wait < 0 || wait > 25000) {
      this.currentConsumer(auth, spaceId, consumerId);
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'wait_ms必须是0..25000整数。', 400);
    }
    let result = this.poll(auth, spaceId, consumerId, req);
    checkAbort(signal);
    if (result.batch_id || wait === 0) return result;
    if (this.waitingPolls >= 128) throw new DetunedError(ErrorCode.RATE_LIMITED, '等待中的poll已达服务上限。', 429, true);
    this.waitingPolls++;
    const deadline = this.waitScheduler.nowMs() + wait;
    try {
      while (true) {
        const remaining = deadline - this.waitScheduler.nowMs();
        if (remaining <= 0) {
          result = this.poll(auth, spaceId, consumerId, req);
          checkAbort(signal);
          return result;
        }
        await this.waitScheduler.sleep(Math.min(100, remaining), signal);
        checkAbort(signal);
        result = this.poll(auth, spaceId, consumerId, req);
        checkAbort(signal);
        if (result.batch_id || this.waitScheduler.nowMs() >= deadline) return result;
      }
    } finally { this.waitingPolls--; }
  }

  ack(auth: AuthenticatedContext, spaceId: string, consumerId: string, req: AckRequest): AckResponseData {
    return this.storage.transaction((tx) => {
      const { current, consumer } = this.currentConsumer(auth, spaceId, consumerId);
      const invalid = () => new DetunedError(ErrorCode.ACK_INVALID, '无效的确认游标或批次 ID。', 409);
      const verified = this.tokenSigner.verify(req.next_cursor, this.tokenSecret, Math.floor(this.clock.now().getTime() / 1000));
      if (!verified) throw invalid();
      const keys = Object.keys(verified).sort().join(',');
      const legacy = keys === 'batch_id,consumer_id,exp,through_seq';
      const modern = keys === 'actor_id,batch_id,consumer_id,exp,purpose,space_id,through_seq,v';
      if ((!legacy && !modern) || (modern && (verified.v !== 1 || verified.purpose !== 'event_ack' || verified.actor_id !== current.actor.id || verified.space_id !== spaceId)) ||
          verified.consumer_id !== consumer.id || verified.batch_id !== req.batch_id ||
          !Number.isSafeInteger(verified.through_seq) || (verified.through_seq as number) < 0 || !Number.isSafeInteger(verified.exp)) throw invalid();
      const through = verified.through_seq as number;
      const batch = tx.findDeliveryBatchById(req.batch_id);
      if (!batch || batch.consumer_id !== consumer.id || batch.through_seq !== through || through > tx.getLatestEventSeq(spaceId)) throw invalid();
      if (batch.acked_at && consumer.ack_seq >= through) return { confirmed: true, acknowledged_batch_id: batch.id };
      if (consumer.active_batch_id !== batch.id || through < consumer.ack_seq) throw invalid();
      tx.ackDeliveryBatch(batch.id, this.clock.nowIso());
      tx.updateConsumerAck(consumer.id, through, consumer.version + 1);
      tx.updateConsumerBatch(consumer.id, null, consumer.version + 2);
      return { confirmed: true, acknowledged_batch_id: batch.id };
    });
  }

  deactivateConsumer(auth: AuthenticatedContext, spaceId: string, consumerId: string): void {
    this.storage.transaction((tx) => {
      const current = this.authService.refreshContext(auth);
      this.authService.requireSpaceAccess(current, spaceId, 'observer');
      const consumer = tx.findConsumerById(consumerId);
      if (!consumer) return; // Idempotent, without fresh admission.
      const sub = tx.findSubscriptionById(consumer.subscription_id);
      if (!sub || sub.actor_id !== current.actor.id || sub.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.FORBIDDEN, '无权停用该消费者。', 403);
      }
      this.writeRateLimiter.admit(current.actor.id);
      tx.deactivateConsumer(consumerId);
    });
  }
}
