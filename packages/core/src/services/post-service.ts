import {
  Post,
  PostRevision,
  Relation,
  CreatePostRequest,
  CreatePostRevisionRequest,
  WithdrawPostRequest,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { HasherPort } from '../ports/hasher.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';

export class PostService {
  constructor(
    private readonly storage: StoragePort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly hasher: HasherPort,
    private readonly authService: AuthService,
    private readonly idempotency: IdempotencyService
  ) {}

  private validateStructuredContent(kind: string, structured: any): void {
    if (!structured) return;

    if (kind === 'proposal' || kind === 'claim') {
      if (!structured.statement || !structured.scope || !structured.falsification_plan) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          'proposal/claim 必须包含 statement, assumptions, scope, falsification_plan。',
          422
        );
      }
    } else if (kind === 'objection') {
      if (!structured.target_ref || !structured.issue || !structured.impact) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          'objection 必须包含 target_ref, issue, impact。',
          422
        );
      }
    } else if (kind === 'failure') {
      if (
        !structured.attempt ||
        !structured.category ||
        !structured.tested_scope ||
        !structured.expected ||
        !structured.observed ||
        !structured.ruled_out
      ) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          'failure 必须包含 attempt, category, tested_scope, expected, observed, ruled_out。',
          422
        );
      }
    } else if (kind === 'summary') {
      if (!Array.isArray(structured.source_refs) || structured.source_refs.length === 0) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          'summary 必须包含至少一个 source_refs。',
          422
        );
      }
    }
  }

  createPost(
    auth: AuthenticatedContext,
    spaceId: string,
    threadId: string,
    req: CreatePostRequest,
    requestKey: string
  ): { post: Post; revision: PostRevision; relations: Relation[] } {
    this.authService.requireSpaceAccess(auth, spaceId, 'contributor');
    this.validateStructuredContent(req.kind, req.structured);

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'post.create',
      requestKey,
      req,
      201,
      (tx) => {
        const thread = tx.findThreadById(threadId);
        if (!thread || thread.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在。', 404);
        }
        if (thread.state === 'archived') {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            '主题已归档，禁止发布新帖子。',
            403
          );
        }

        const now = this.clock.nowIso();
        const postId = this.idGen.generateId('pst');
        const body = req.body ?? '';

        const contentHash = this.hasher.sha256(
          `${req.title}\n${req.summary}\n${body}\n${this.hasher.canonicalJson(req.structured ?? {})}`
        );

        const post: Post = {
          id: postId,
          space_id: spaceId,
          thread_id: threadId,
          author_id: auth.actor.id,
          kind: req.kind,
          current_revision: 1,
          lifecycle: 'active',
          created_at: now,
        };

        const postRev: PostRevision = {
          post_id: postId,
          revision: 1,
          title: req.title,
          summary: req.summary,
          body,
          tags: req.tags ?? [],
          structured: req.structured ?? {},
          content_hash: contentHash,
          editor_id: auth.actor.id,
          created_at: now,
        };

        tx.createPost(post, postRev);

        // Process references/relations if any
        const relations: Relation[] = [];
        if (req.refs && req.refs.length > 0) {
          for (const ref of req.refs) {
            // Verify target exists in same space at exact revision
            const targetPost = tx.findPostById(ref.target_ref.post_id);
            if (!targetPost || targetPost.space_id !== spaceId) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `引用的目标帖子 ${ref.target_ref.post_id} 不存在于本空间。`,
                404
              );
            }
            const targetRev = tx.getPostRevision(ref.target_ref.post_id, ref.target_ref.revision);
            if (!targetRev) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `引用的目标帖子修订版本 ${ref.target_ref.revision} 不存在。`,
                404
              );
            }

            const relId = this.idGen.generateId('rel');
            const rel: Relation = {
              id: relId,
              space_id: spaceId,
              source_post_id: postId,
              source_revision: 1,
              target_post_id: ref.target_ref.post_id,
              target_revision: ref.target_ref.revision,
              type: ref.type,
              state: ref.type === 'challenges' ? 'open' : 'resolved',
              version: 1,
              creator_id: auth.actor.id,
              created_at: now,
            };

            tx.createRelation(rel);
            relations.push(rel);

            tx.appendEvent(spaceId, {
              id: this.idGen.generateId('evt'),
              space_id: spaceId,
              type: 'relation.created',
              object_id: relId,
              revision: 1,
              visibility: 'public',
              actor_id: auth.actor.id,
              created_at: now,
            });
          }
        }

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

        return { post, revision: postRev, relations };
      }
    ).data;
  }

  createRevision(
    auth: AuthenticatedContext,
    spaceId: string,
    postId: string,
    req: CreatePostRevisionRequest,
    requestKey: string
  ): { post: Post; revision: PostRevision; relations: Relation[] } {
    this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'post.revision',
      requestKey,
      req,
      201,
      (tx) => {
        const post = tx.findPostById(postId);
        if (!post || post.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '帖子不存在。', 404);
        }

        // Only original author can revise
        if (post.author_id !== auth.actor.id) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            '仅原作者可为此帖子发布新修订。',
            403
          );
        }

        if (post.lifecycle !== 'active') {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            '非活跃状态的帖子不可发布新修订。',
            403
          );
        }

        if (post.current_revision !== req.expected_revision) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            '该帖子已有新修订，请重新读取后提交。',
            409,
            false,
            { current_revision: post.current_revision }
          );
        }

        this.validateStructuredContent(post.kind, req.structured);

        const now = this.clock.nowIso();
        const nextRevision = post.current_revision + 1;
        const body = req.body ?? '';

        const contentHash = this.hasher.sha256(
          `${req.title}\n${req.summary}\n${body}\n${this.hasher.canonicalJson(req.structured ?? {})}`
        );

        const updatedPost: Post = {
          ...post,
          current_revision: nextRevision,
        };

        const postRev: PostRevision = {
          post_id: postId,
          revision: nextRevision,
          title: req.title,
          summary: req.summary,
          body,
          tags: req.tags ?? [],
          structured: req.structured ?? {},
          content_hash: contentHash,
          editor_id: auth.actor.id,
          created_at: now,
        };

        tx.createPostRevision(updatedPost, postRev);

        const relations: Relation[] = [];
        if (req.refs && req.refs.length > 0) {
          for (const ref of req.refs) {
            const targetPost = tx.findPostById(ref.target_ref.post_id);
            if (!targetPost || targetPost.space_id !== spaceId) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `引用的目标帖子 ${ref.target_ref.post_id} 不存在。`,
                404
              );
            }
            const targetRev = tx.getPostRevision(ref.target_ref.post_id, ref.target_ref.revision);
            if (!targetRev) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `引用的目标帖子修订版本 ${ref.target_ref.revision} 不存在。`,
                404
              );
            }

            const relId = this.idGen.generateId('rel');
            const rel: Relation = {
              id: relId,
              space_id: spaceId,
              source_post_id: postId,
              source_revision: nextRevision,
              target_post_id: ref.target_ref.post_id,
              target_revision: ref.target_ref.revision,
              type: ref.type,
              state: ref.type === 'challenges' ? 'open' : 'resolved',
              version: 1,
              creator_id: auth.actor.id,
              created_at: now,
            };

            tx.createRelation(rel);
            relations.push(rel);

            tx.appendEvent(spaceId, {
              id: this.idGen.generateId('evt'),
              space_id: spaceId,
              type: 'relation.created',
              object_id: relId,
              revision: 1,
              visibility: 'public',
              actor_id: auth.actor.id,
              created_at: now,
            });
          }
        }

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'post.revised',
          object_id: postId,
          revision: nextRevision,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        return { post: updatedPost, revision: postRev, relations };
      }
    ).data;
  }

  withdrawPost(
    auth: AuthenticatedContext,
    spaceId: string,
    postId: string,
    req: WithdrawPostRequest,
    requestKey: string
  ): Post {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'post.withdraw',
      requestKey,
      req,
      200,
      (tx) => {
        const post = tx.findPostById(postId);
        if (!post || post.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '帖子不存在。', 404);
        }

        const isAuthor = post.author_id === auth.actor.id;
        const isMaintainer = ['maintainer', 'owner'].includes(spaceAuth.spaceRole);
        if (!isAuthor && !isMaintainer) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            '仅作者或空间维护者可以撤回帖子。',
            403
          );
        }

        if (post.current_revision !== req.expected_revision) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            '帖子修订版本与请求不一致。',
            409,
            false,
            { current_revision: post.current_revision }
          );
        }

        const updated: Post = {
          ...post,
          lifecycle: 'withdrawn',
        };

        tx.updatePost(updated);

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'post.withdrawn',
          object_id: postId,
          revision: post.current_revision,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: this.clock.nowIso(),
        });

        return updated;
      }
    ).data;
  }

  getPost(
    auth: AuthenticatedContext,
    spaceId: string,
    postId: string,
    revision?: number
  ): { post: Post; revision: PostRevision } {
    this.authService.requireSpaceAccess(auth, spaceId, 'observer');

    const post = this.storage.findPostById(postId);
    if (!post || post.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '帖子不存在。', 404);
    }

    if (post.lifecycle === 'redacted') {
      throw new DetunedError(ErrorCode.CONTENT_REDACTED, '该内容已被脱敏移除。', 410);
    }

    const revNum = revision ?? post.current_revision;
    const postRev = this.storage.getPostRevision(postId, revNum);
    if (!postRev) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        `帖子修订版本 ${revNum} 不存在。`,
        404
      );
    }

    return { post, revision: postRev };
  }
}
