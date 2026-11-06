import { validateRelationHistoryQuery } from '@detuned/protocol';
import { DetunedError, ErrorCode, validateDiscoveryQuery, PostRelationsQuerySchema } from '@detuned/protocol';
export class DiscoveryReadService {
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
    project(spaceId, relation) {
        if (relation.space_id !== spaceId)
            return null;
        const source = this.storage.findPostById(relation.source_post_id), target = this.storage.findPostById(relation.target_post_id);
        if (!source || !target || source.space_id !== spaceId || target.space_id !== spaceId || !this.storage.getPostRevisionMetadata(source.id, relation.source_revision) || !this.storage.getPostRevisionMetadata(target.id, relation.target_revision))
            return null;
        return { relation_id: relation.id, relation_type: relation.type, source_ref: { post_id: source.id, revision: relation.source_revision }, target_ref: { post_id: target.id, revision: relation.target_revision }, creator_id: relation.creator_id, source_author_id: source.author_id, target_author_id: target.author_id, state: relation.state, version: relation.version, created_at: relation.created_at, source_status: source.lifecycle, target_status: target.lifecycle, source_has_newer_revision: source.lifecycle === 'redacted' ? null : source.current_revision > relation.source_revision, target_has_newer_revision: target.lifecycle === 'redacted' ? null : target.current_revision > relation.target_revision };
    }
    getRelation(auth, spaceId, id) {
        return this.storage.readSnapshot(() => { const current = this.authService.refreshContext(auth); this.authService.requireSpaceAccess(current, spaceId, 'observer'); const relation = this.storage.findRelationById(id), result = relation ? this.project(spaceId, relation) : null; if (!result)
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Relation does not exist or is not accessible.', 404); return result; });
    }
    getRelationHistory(auth, spaceId, relationId, query, budget) {
        return this.storage.readSnapshot(() => {
            const current = this.authService.refreshContext(auth);
            this.authService.requireSpaceAccess(current, spaceId, 'observer');
            const relation = this.storage.findRelationById(relationId);
            if (!relation || !this.project(spaceId, relation))
                throw new DetunedError(ErrorCode.NOT_FOUND, 'Relation does not exist or is not accessible.', 404);
            validateRelationHistoryQuery(query);
            const now = Math.floor(this.clock.now().getTime() / 1000);
            let exp = now + 86400, throughVersion = relation.version, after;
            if (query.cursor !== undefined) {
                const p = this.signer.verify(query.cursor, this.secret, now);
                if (!p || Object.keys(p).length !== 10 || p.v !== 1 || p.purpose !== 'relation_history' || p.sort !== 'version_id_asc' || p.actor_id !== current.actor.id || p.space_id !== spaceId || p.relation_id !== relationId || typeof p.through_version !== 'number' || !Number.isSafeInteger(p.through_version) || p.through_version < 1 || p.through_version > relation.version || typeof p.after_version !== 'number' || !Number.isSafeInteger(p.after_version) || p.after_version < 2 || p.after_version > p.through_version || typeof p.after_id !== 'string' || !p.after_id.trim() || typeof p.exp !== 'number' || !Number.isSafeInteger(p.exp) || p.exp < now || p.exp > exp)
                    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid relation history cursor.', 400);
                throughVersion = p.through_version;
                exp = p.exp;
                after = { version: p.after_version, id: p.after_id };
            }
            const rows = this.storage.listRelationResolutions(relationId, throughVersion, query.limit ?? 20, after);
            const resolutions = rows.resolutions.map(row => this.projectReason(spaceId, row));
            let removed = false;
            while (true) {
                const more = rows.has_more || removed, last = resolutions.at(-1);
                if (more && !last)
                    throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Required history metadata cannot fit the budget.', 422);
                const next = more ? this.signer.sign({ v: 1, purpose: 'relation_history', sort: 'version_id_asc', actor_id: current.actor.id, space_id: spaceId, relation_id: relationId, through_version: throughVersion, after_version: last.version, after_id: last.resolution_id, exp }, this.secret) : null;
                const page = { data: { relation_id: relationId, resolutions: [...resolutions] }, meta: { truncated: removed, next_cursor: next } };
                if ((next === null || next.length <= 4096) && new TextEncoder().encode(JSON.stringify({ api_version: '1', request_id: budget.request_id, ...page })).length <= (query.max_bytes ?? 12288))
                    return page;
                if (resolutions.length <= 1)
                    throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Required history metadata cannot fit the budget.', 422);
                resolutions.pop();
                removed = true;
            }
        });
    }
    projectReason(spaceId, row) {
        const base = { resolution_id: row.id, relation_id: row.relation_id, version: row.version, action: row.action, resolver_id: row.resolver_id, created_at: row.created_at };
        const post = this.storage.findPostById(row.reason_ref.post_id);
        if (!post || post.space_id !== spaceId || !this.storage.getPostRevisionMetadata(post.id, row.reason_ref.revision))
            return { ...base, reason_ref: null, reason_status: 'unavailable', reason_has_newer_revision: null };
        if (post.lifecycle === 'redacted')
            return { ...base, reason_ref: row.reason_ref, reason_status: 'redacted', reason_has_newer_revision: null };
        return { ...base, reason_ref: row.reason_ref, reason_status: post.lifecycle, reason_has_newer_revision: post.current_revision > row.reason_ref.revision };
    }
    getPostRelations(auth, spaceId, postId, revision, query, budget) {
        return this.storage.readSnapshot(() => {
            const current = this.authService.refreshContext(auth);
            this.authService.requireSpaceAccess(current, spaceId, 'observer');
            const post = this.storage.findPostById(postId);
            if (!post || post.space_id !== spaceId)
                throw new DetunedError(ErrorCode.NOT_FOUND, 'Post does not exist or is not accessible.', 404);
            if (post.lifecycle === 'redacted')
                throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Post content has been redacted.', 410);
            if (!Number.isSafeInteger(revision) || revision < 1)
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid fixed revision.', 400);
            if (!this.storage.getPostRevisionMetadata(postId, revision))
                throw new DetunedError(ErrorCode.NOT_FOUND, 'Post revision does not exist.', 404);
            validateDiscoveryQuery(PostRelationsQuerySchema, query);
            const direction = query.direction ?? 'both', now = Math.floor(this.clock.now().getTime() / 1000);
            let exp = now + 86400, afterId;
            if (query.cursor !== undefined) {
                const p = this.signer.verify(query.cursor, this.secret, now);
                if (!p || Object.keys(p).length !== 10 || p.v !== 1 || p.purpose !== 'post_relations' || p.sort !== 'id_asc' || p.actor_id !== current.actor.id || p.space_id !== spaceId || p.post_id !== postId || p.revision !== revision || p.direction !== direction || (typeof p.after_id !== 'string' || !p.after_id.trim()) || typeof p.exp !== 'number' || !Number.isSafeInteger(p.exp) || p.exp < now || p.exp > exp)
                    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid relation cursor.', 400);
                afterId = p.after_id;
                exp = p.exp;
            }
            const list = this.storage.listPostRelations(spaceId, postId, revision, direction, query.limit ?? 20, afterId);
            const relations = list.relations.flatMap(row => { const result = this.project(spaceId, row); return result ? [result] : []; });
            let removed = false;
            while (true) {
                const more = list.has_more || removed, last = relations.at(-1);
                if (more && !last)
                    throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Required relation metadata cannot fit the budget.', 422);
                const next = more ? this.signer.sign({ v: 1, purpose: 'post_relations', sort: 'id_asc', actor_id: current.actor.id, space_id: spaceId, post_id: postId, revision, direction, after_id: last.relation_id, exp }, this.secret) : null;
                const page = { data: { ref: { post_id: postId, revision }, relations: [...relations] }, meta: { truncated: removed, next_cursor: next } };
                if ((next === null || next.length <= 4096) && new TextEncoder().encode(JSON.stringify({ api_version: '1', request_id: budget.request_id, ...page })).byteLength <= (query.max_bytes ?? 12288))
                    return page;
                if (relations.length <= 1)
                    throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Required relation metadata cannot fit the budget.', 422);
                relations.pop();
                removed = true;
            }
        });
    }
}
//# sourceMappingURL=discovery-read-service.js.map