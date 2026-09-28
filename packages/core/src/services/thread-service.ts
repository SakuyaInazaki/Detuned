import {
  Thread,
  Post,
  PostRevision,
  CreateThreadRequest,
  PatchThreadRequest,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { HasherPort } from '../ports/hasher.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';

export interface CreateThreadResult {
  thread: Thread;
  initial_post?: {
    post: Post;
    revision: PostRevision;
  };
}

export class ThreadService {
  constructor(
    private readonly storage: StoragePort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly hasher: HasherPort,
    private readonly authService: AuthService,
    private readonly idempotency: IdempotencyService
  ) {}

  createThread(
    auth: AuthenticatedContext,
    spaceId: string,
    req: CreateThreadRequest,
    requestKey: string
  ): CreateThreadResult {
    this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'thread.create',
      requestKey,
      req,
      201,
      (tx) => {
        const now = this.clock.nowIso();
        const threadId = this.idGen.generateId('thd');

        const thread: Thread = {
          id: threadId,
          space_id: spaceId,
          title: req.title,
          version: 1,
          state: 'open',
          creator_id: auth.actor.id,
          created_at: now,
          updated_at: now,
        };

        tx.createThread(thread);

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'thread.created',
          object_id: threadId,
          revision: null,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        let initial_post: { post: Post; revision: PostRevision } | undefined = undefined;

        if (req.initial_post) {
          const postId = this.idGen.generateId('pst');
          const post: Post = {
            id: postId,
            space_id: spaceId,
            thread_id: threadId,
            author_id: auth.actor.id,
            kind: req.initial_post.kind,
            current_revision: 1,
            lifecycle: 'active',
            created_at: now,
          };

          const body = req.initial_post.body ?? '';
          const contentHash = this.hasher.sha256(
            `${req.initial_post.title}\n${req.initial_post.summary}\n${body}`
          );

          const postRev: PostRevision = {
            post_id: postId,
            revision: 1,
            title: req.initial_post.title,
            summary: req.initial_post.summary,
            body,
            tags: req.initial_post.tags ?? [],
            structured: req.initial_post.structured ?? {},
            content_hash: contentHash,
            editor_id: auth.actor.id,
            created_at: now,
          };

          tx.createPost(post, postRev);

          tx.appendEvent(spaceId, {
            id: this.idGen.generateId('evt'),
            space_id: spaceId,
            type: 'post.created',
            object_id: postId,
            revision: 1,
            visibility: 'public',
            actor_id: auth.actor.id,
            created_at: now,
          });

          initial_post = { post, revision: postRev };
        }

        return { thread, initial_post };
      }
    ).data;
  }

  patchThread(
    auth: AuthenticatedContext,
    spaceId: string,
    threadId: string,
    req: PatchThreadRequest,
    requestKey: string
  ): Thread {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'thread.patch',
      requestKey,
      req,
      200,
      (tx) => {
        const thread = tx.findThreadById(threadId);
        if (!thread || thread.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在。', 404);
        }

        const isCreator = thread.creator_id === auth.actor.id;
        const isMaintainerOrAbove = ['maintainer', 'owner'].includes(spaceAuth.spaceRole);
        if (!isCreator && !isMaintainerOrAbove) {
          throw new DetunedError(ErrorCode.FORBIDDEN, '无权修改该主题。', 403);
        }

        if (thread.version !== req.expected_version) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            '主题已被其他操作更新，请获取最新状态后重试。',
            409,
            false,
            { current_version: thread.version }
          );
        }

        const now = this.clock.nowIso();
        const updated: Thread = {
          ...thread,
          title: req.title ?? thread.title,
          state: req.state ?? thread.state,
          version: thread.version + 1,
          updated_at: now,
        };

        tx.updateThread(updated);

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'thread.updated',
          object_id: threadId,
          revision: null,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        return updated;
      }
    ).data;
  }
}
