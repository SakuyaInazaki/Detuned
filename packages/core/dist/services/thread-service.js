import { validateNewTypedWrite } from './typed-write-validation.js';
import { linkRevisionArtifacts } from './artifact-references.js';
import { DetunedError, ErrorCode, } from '@detuned/protocol';
export class ThreadService {
    storage;
    idGen;
    clock;
    hasher;
    authService;
    idempotency;
    constructor(storage, idGen, clock, hasher, authService, idempotency) {
        this.storage = storage;
        this.idGen = idGen;
        this.clock = clock;
        this.hasher = hasher;
        this.authService = authService;
        this.idempotency = idempotency;
    }
    // The other kinds retain their existing behavior; four typed kinds are checked only in new actions.
    validateStructuredContent(kind, structured) {
        if (['proposal', 'claim', 'failure', 'summary'].includes(kind))
            return;
        if (kind === 'objection') {
            if (!structured || typeof structured !== 'object') {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, `${kind} 类型的帖子必须提供 structured 结构化字段。`, 422);
            }
            if (!structured.target_ref || !structured.issue || !structured.impact) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'objection 必须包含 target_ref, issue, impact。', 422);
            }
        }
    }
    createThread(auth, spaceId, req, requestKey) {
        this.authService.requireSpaceAccess(auth, spaceId, 'contributor');
        if (req.title && [...req.title].length > 160) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '标题长度超出上限 (160 字符)。', 400);
        }
        if (req.initial_post) {
            if (req.initial_post.title && [...req.initial_post.title].length > 160) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '初始帖子标题长度超出上限 (160 字符)。', 400);
            }
            if (req.initial_post.body && Buffer.byteLength(req.initial_post.body, 'utf8') > 65536) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '初始帖子正文大小超出上限 (64KB)。', 422);
            }
            this.validateStructuredContent(req.initial_post.kind, req.initial_post.structured);
        }
        return this.idempotency.executeIdempotent(auth.actor.id, spaceId, 'thread.create', requestKey, req, 201, (tx) => {
            const structured = req.initial_post ? validateNewTypedWrite(tx, this.authService, auth, spaceId, req.initial_post.kind, req.initial_post.structured, req.initial_post.artifact_ids) ?? req.initial_post.structured : undefined;
            const now = this.clock.nowIso();
            const threadId = this.idGen.generateId('thd');
            const thread = {
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
            let initial_post = undefined;
            if (req.initial_post) {
                const postId = this.idGen.generateId('pst');
                const post = {
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
                const contentHash = this.hasher.sha256(`${req.initial_post.title}\n${req.initial_post.summary}\n${body}\n${this.hasher.canonicalJson(structured ?? {})}`);
                const postRev = {
                    post_id: postId,
                    revision: 1,
                    title: req.initial_post.title,
                    summary: req.initial_post.summary,
                    body,
                    tags: req.initial_post.tags ?? [],
                    structured: structured ?? {},
                    content_hash: contentHash,
                    editor_id: auth.actor.id,
                    created_at: now,
                };
                tx.createPost(post, postRev);
                linkRevisionArtifacts(tx, spaceId, postId, 1, req.initial_post.artifact_ids, structured);
                // Persist relations declared on initial_post
                if (req.initial_post.refs && req.initial_post.refs.length > 0) {
                    for (const ref of req.initial_post.refs) {
                        const targetPost = tx.findPostById(ref.target_ref.post_id);
                        if (!targetPost || targetPost.space_id !== spaceId) {
                            throw new DetunedError(ErrorCode.NOT_FOUND, `引用的目标帖子 ${ref.target_ref.post_id} 不存在于本空间。`, 404);
                        }
                        const targetRev = tx.getPostRevision(ref.target_ref.post_id, ref.target_ref.revision);
                        if (!targetRev) {
                            throw new DetunedError(ErrorCode.NOT_FOUND, `引用的目标帖子修订版本 ${ref.target_ref.revision} 不存在。`, 404);
                        }
                        const relId = this.idGen.generateId('rel');
                        const rel = {
                            id: relId,
                            space_id: spaceId,
                            source_post_id: postId,
                            source_revision: 1,
                            target_post_id: ref.target_ref.post_id,
                            target_revision: ref.target_ref.revision,
                            type: ref.type,
                            state: (ref.type === 'challenges' ? 'open' : 'resolved'),
                            version: 1,
                            creator_id: auth.actor.id,
                            created_at: now,
                        };
                        tx.createRelation(rel);
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
                initial_post = { post, revision: postRev };
            }
            return { thread, initial_post };
        }).data;
    }
    patchThread(auth, spaceId, threadId, req, requestKey) {
        const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'contributor');
        return this.idempotency.executeIdempotent(auth.actor.id, spaceId, `thread.patch:${threadId}`, requestKey, req, 200, (tx) => {
            const thread = tx.findThreadById(threadId);
            if (!thread || thread.space_id !== spaceId) {
                throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在。', 404);
            }
            if (thread.version !== req.expected_version) {
                throw new DetunedError(ErrorCode.REVISION_CONFLICT, '主题已被其他操作更新，请获取最新状态后重试。', 409, false, { current_version: thread.version });
            }
            const now = this.clock.nowIso();
            const updated = {
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
        }, (tx) => {
            const thread = tx.findThreadById(threadId);
            if (!thread || thread.space_id !== spaceId)
                throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在。', 404);
            const isCreator = thread.creator_id === auth.actor.id;
            const isMaintainerOrAbove = ['maintainer', 'owner'].includes(spaceAuth.spaceRole);
            if (!isCreator && !isMaintainerOrAbove) {
                throw new DetunedError(ErrorCode.FORBIDDEN, '无权修改该主题。', 403);
            }
        }).data;
    }
}
//# sourceMappingURL=thread-service.js.map