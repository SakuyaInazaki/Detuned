import { DetunedError, ErrorCode } from '@detuned/protocol';
import { StoragePort, IdempotencyRecord } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';

function extractResultRef(result: any): string {
  if (!result || typeof result !== 'object') {
    return JSON.stringify({ type: 'primitive', val: result });
  }

  // 1. Thread create: { thread, initial_post?: { post, revision, relations } }
  if (result.thread && result.thread.id) {
    const ref: any = {
      $ref: 'thread',
      thread_id: result.thread.id,
    };
    if (result.initial_post?.post?.id) {
      ref.initial_post_id = result.initial_post.post.id;
      ref.initial_post_revision = result.initial_post.revision?.revision ?? 1;
      if (Array.isArray(result.initial_post.relations)) {
        ref.relation_ids = result.initial_post.relations.map((r: any) => r.id);
      }
    }
    return JSON.stringify(ref);
  }

  // 2. Post create / revision / withdraw: { post, revision, relations? }
  if (result.post && result.post.id && result.revision) {
    const ref: any = {
      $ref: 'post',
      post_id: result.post.id,
      revision: result.revision.revision,
    };
    if (Array.isArray(result.relations)) {
      ref.relation_ids = result.relations.map((r: any) => r.id);
    }
    return JSON.stringify(ref);
  }

  // 3. Relation create / resolve / reopen: { relation, resolution? }
  if (result.relation && result.relation.id) {
    const ref: any = {
      $ref: 'relation',
      relation_id: result.relation.id,
    };
    if (result.resolution && result.resolution.id) {
      ref.resolution_id = result.resolution.id;
    }
    return JSON.stringify(ref);
  }

  // 4. Space: { space, revision? }
  if (result.space && result.space.id) {
    return JSON.stringify({
      $ref: 'space',
      space_id: result.space.id,
      revision: result.revision?.revision,
    });
  }

  // Default fallback
  return JSON.stringify(result);
}

function reconstructResult(tx: StoragePort, resultRefStr: string): any {
  let parsed: any;
  try {
    parsed = JSON.parse(resultRefStr);
  } catch {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      '无法解析幂等记录引用，请重新获取最新数据。',
      422
    );
  }

  if (!parsed || typeof parsed !== 'object') return parsed;

  if (parsed.$ref === 'thread' || (parsed.thread && parsed.thread.id)) {
    const threadId = parsed.thread_id ?? parsed.thread.id;
    const thread = tx.findThreadById(threadId);
    if (!thread) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
    }

    const initialPostId = parsed.initial_post_id ?? parsed.initial_post?.post?.id;
    if (initialPostId) {
      const initialRevNum = parsed.initial_post_revision ?? parsed.initial_post?.revision?.revision ?? 1;
      const post = tx.findPostById(initialPostId);
      const revision = tx.getPostRevision(initialPostId, initialRevNum);
      const relationIds: string[] = parsed.relation_ids ?? parsed.initial_post?.relations?.map((r: any) => r.id) ?? [];
      const relations = relationIds.map((id) => tx.findRelationById(id)).filter(Boolean);

      return {
        thread,
        initial_post: {
          post: post ?? { id: initialPostId, lifecycle: 'redacted' },
          revision: revision ?? {
            post_id: initialPostId,
            revision: initialRevNum,
            title: '[REDACTED]',
            summary: '[REDACTED]',
            body: '[REDACTED]',
            tags: [],
            structured: {},
            content_hash: 'redacted',
            editor_id: thread.creator_id,
            created_at: thread.created_at,
          },
          relations,
        },
      };
    }

    return { thread };
  }

  if (parsed.$ref === 'post' || (parsed.post && parsed.post.id)) {
    const postId = parsed.post_id ?? parsed.post.id;
    const revNum = parsed.revision?.revision ?? parsed.revision ?? 1;
    const post = tx.findPostById(postId);
    if (!post) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子已不存在。', 404);
    }
    const revision = tx.getPostRevision(postId, revNum);
    const relationIds: string[] = parsed.relation_ids ?? parsed.relations?.map((r: any) => r.id) ?? [];
    const relations = relationIds.map((id) => tx.findRelationById(id)).filter(Boolean);

    const out: any = {
      post,
      revision: revision ?? {
        post_id: postId,
        revision: revNum,
        title: '[REDACTED]',
        summary: '[REDACTED]',
        body: '[REDACTED]',
        tags: [],
        structured: {},
        content_hash: 'redacted',
        editor_id: post.author_id,
        created_at: post.created_at,
      },
    };
    if (parsed.relations !== undefined || parsed.relation_ids !== undefined) {
      out.relations = relations;
    }
    return out;
  }

  if (parsed.$ref === 'relation' || (parsed.relation && parsed.relation.id)) {
    const relationId = parsed.relation_id ?? parsed.relation.id;
    const relation = tx.findRelationById(relationId);
    if (!relation) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原关系已不存在。', 404);
    }
    return {
      relation,
      resolution: parsed.resolution,
    };
  }

  if (parsed.$ref === 'space' || (parsed.space && parsed.space.id)) {
    const spaceIdTarget = parsed.space_id ?? parsed.space.id;
    const space = tx.findSpaceById(spaceIdTarget);
    if (!space) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原空间已不存在。', 404);
    }
    const revNum = parsed.revision ?? space.current_revision;
    const revision = tx.getSpaceRevision(spaceIdTarget, revNum);
    return { space, revision };
  }

  return parsed;
}

export class IdempotencyService {
  constructor(
    private readonly storage: StoragePort,
    private readonly hasher: HasherPort,
    private readonly clock: ClockPort
  ) {}

  executeIdempotent<T>(
    actorId: string,
    spaceId: string,
    operation: string,
    key: string,
    payload: unknown,
    statusCode: number,
    action: (tx: StoragePort) => T
  ): { data: T; isReplay: boolean } {
    if (!key || typeof key !== 'string') {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        '缺少 Idempotency-Key / request_key。',
        400
      );
    }

    const requestHash = this.hasher.sha256(this.hasher.canonicalJson(payload));

    return this.storage.transaction((tx) => {
      const existing = tx.getIdempotencyRecord(actorId, spaceId, operation, key);
      if (existing) {
        if (existing.request_hash !== requestHash) {
          throw new DetunedError(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            '同名 Idempotency-Key 包含不同的请求内容。',
            409,
            false,
            { key }
          );
        }
        // Identical request retry: reconstruct result applying current redaction/visibility
        const reconstructed = reconstructResult(tx, existing.result_ref) as T;
        return { data: reconstructed, isReplay: true };
      }

      // Execute fresh business action
      const result = action(tx);

      // Save idempotency record with compact reference only
      const resultRef = extractResultRef(result);
      const record: IdempotencyRecord = {
        actor_id: actorId,
        space_id: spaceId,
        operation,
        key,
        request_hash: requestHash,
        result_ref: resultRef,
        http_status: statusCode,
        created_at: this.clock.nowIso(),
      };
      tx.createIdempotencyRecord(record);

      return { data: result, isReplay: false };
    });
  }
}
