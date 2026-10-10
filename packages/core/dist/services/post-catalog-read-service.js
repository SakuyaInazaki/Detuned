import { CONTEXT_BYTES, LIST_LIMIT, POST_CATALOG_READ_LIMITS, DetunedError, ErrorCode, validatePostRevisionCatalogQuery, validateRevisionArtifactsQuery, isPostRevisionCatalogCursorPayload, isRevisionArtifactsCursorPayload, postRevisionCatalogEnvelopeBytes, postRevisionArtifactsEnvelopeBytes, } from '@detuned/protocol';
const invalidCursor = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid post catalog cursor.', 400);
const tooBroad = () => new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Required metadata and one directory item cannot fit the budget. Increase max_bytes.', 422);
/** Dynamic directories: one synchronous snapshot per page, never a full content read. */
export class PostCatalogReadService {
    storage;
    signer;
    authService;
    secret;
    clock;
    constructor(storage, signer, authService, secret, clock) {
        this.storage = storage;
        this.signer = signer;
        this.authService = authService;
        this.secret = secret;
        this.clock = clock;
    }
    currentPost(auth, spaceId, postId) {
        const current = this.authService.refreshContext(auth);
        this.authService.requireSpaceAccess(current, spaceId, 'observer');
        const post = this.storage.findPostById(postId);
        if (!post || post.space_id !== spaceId)
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Post does not exist or is not accessible.', 404);
        if (post.lifecycle === 'redacted')
            throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Post content has been redacted.', 410);
        return { current, post };
    }
    timing(budget) {
        if (!budget || typeof budget.request_id !== 'string')
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Directory budget requires the actual request_id.', 400);
        const now = Math.floor(this.clock.now().getTime() / 1000);
        return { now, exp: now + POST_CATALOG_READ_LIMITS.cursor_ttl_seconds };
    }
    getRevisions(auth, spaceId, postId, query, budget) {
        const snapshot = this.storage.readSnapshot(() => {
            const { current, post } = this.currentPost(auth, spaceId, postId);
            validatePostRevisionCatalogQuery(query);
            const { now, exp: initialExp } = this.timing(budget);
            let exp = initialExp, afterRevision;
            if (query.cursor !== undefined) {
                const payload = this.signer.verify(query.cursor, this.secret, now);
                if (!isPostRevisionCatalogCursorPayload(payload) || payload.actor_id !== current.actor.id || payload.space_id !== spaceId ||
                    payload.post_id !== postId || now > payload.exp || payload.exp > initialExp)
                    throw invalidCursor();
                afterRevision = payload.after_revision;
                exp = payload.exp;
            }
            const listed = this.storage.listPostRevisionMetadata(postId, query.limit ?? LIST_LIMIT.default, afterRevision);
            return { actorId: current.actor.id, currentRevision: post.current_revision, ...listed, exp,
                maxBytes: query.max_bytes ?? CONTEXT_BYTES.default };
        });
        const revisions = snapshot.revisions.slice();
        let removed = false;
        while (true) {
            const more = snapshot.has_more || removed;
            const last = revisions.at(-1);
            if (more && !last)
                throw tooBroad();
            const cursor = more ? this.signer.sign({ v: 1, purpose: 'post_revisions_catalog', actor_id: snapshot.actorId,
                space_id: spaceId, post_id: postId, sort: 'revision_desc', after_revision: last.revision, exp: snapshot.exp }, this.secret) : null;
            const page = { data: { post_id: postId, current_revision: snapshot.currentRevision, revisions },
                meta: removed ? { truncated: true, next_cursor: cursor } : { truncated: false, next_cursor: cursor } };
            if ((cursor === null || cursor.length <= POST_CATALOG_READ_LIMITS.cursor_chars) &&
                postRevisionCatalogEnvelopeBytes(budget.request_id, page) <= snapshot.maxBytes)
                return page;
            if (revisions.length <= 1)
                throw tooBroad();
            revisions.pop();
            removed = true;
        }
    }
    getArtifacts(auth, spaceId, postId, revision, query, budget) {
        const snapshot = this.storage.readSnapshot(() => {
            const { current } = this.currentPost(auth, spaceId, postId);
            if (!Number.isSafeInteger(revision) || revision < 1)
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Post revision must be a positive safe integer.', 400);
            validateRevisionArtifactsQuery(query);
            if (!this.storage.getPostRevisionMetadata(postId, revision))
                throw new DetunedError(ErrorCode.NOT_FOUND, 'Post revision does not exist.', 404);
            const { now, exp: initialExp } = this.timing(budget);
            let exp = initialExp, afterId;
            if (query.cursor !== undefined) {
                const payload = this.signer.verify(query.cursor, this.secret, now);
                if (!isRevisionArtifactsCursorPayload(payload) || payload.actor_id !== current.actor.id || payload.space_id !== spaceId ||
                    payload.post_id !== postId || payload.revision !== revision || now > payload.exp || payload.exp > initialExp)
                    throw invalidCursor();
                afterId = payload.after_id;
                exp = payload.exp;
            }
            const listed = this.storage.listRevisionArtifactMetadata(spaceId, postId, revision, query.limit ?? LIST_LIMIT.default, afterId);
            return { actorId: current.actor.id, ...listed, exp, maxBytes: query.max_bytes ?? CONTEXT_BYTES.default };
        });
        const artifacts = snapshot.artifacts.slice();
        let removed = false;
        while (true) {
            const more = snapshot.has_more || removed;
            const last = artifacts.at(-1);
            if (more && !last)
                throw tooBroad();
            const cursor = more ? this.signer.sign({ v: 1, purpose: 'revision_artifacts', actor_id: snapshot.actorId,
                space_id: spaceId, post_id: postId, revision, sort: 'artifact_id_asc', after_id: last.id, exp: snapshot.exp }, this.secret) : null;
            const page = { data: { ref: { post_id: postId, revision }, artifacts },
                meta: removed ? { truncated: true, next_cursor: cursor } : { truncated: false, next_cursor: cursor } };
            if ((cursor === null || cursor.length <= POST_CATALOG_READ_LIMITS.cursor_chars) &&
                postRevisionArtifactsEnvelopeBytes(budget.request_id, page) <= snapshot.maxBytes)
                return page;
            if (artifacts.length <= 1)
                throw tooBroad();
            artifacts.pop();
            removed = true;
        }
    }
}
//# sourceMappingURL=post-catalog-read-service.js.map