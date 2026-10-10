import { DetunedError, ErrorCode, isSearchCursorPayload, SEARCH_LIMITS, SEARCH_CURSOR_ERROR_MESSAGE } from '@detuned/protocol';
export const invalidSearchCursor = () => new DetunedError(ErrorCode.VALIDATION_ERROR, SEARCH_CURSOR_ERROR_MESSAGE, 400, false);
export function searchQueryHash(deps, query) {
    return deps.hasher.sha256(deps.hasher.canonicalJson({
        q: query.q, filters: { kind: query.kind ?? null, thread_id: query.thread_id ?? null, tags: query.tags }, sort: 'id_desc',
    }));
}
export function readSearchCursor(deps, actorId, spaceId, query) {
    if (query.cursor === undefined)
        return undefined;
    const now = deps.clock.now().getTime() / 1000;
    const payload = deps.signer.verify(query.cursor, deps.secret, now);
    if (!isSearchCursorPayload(payload) || payload.actor_id !== actorId || payload.space_id !== spaceId ||
        payload.query_hash !== searchQueryHash(deps, query) || payload.exp <= now || payload.exp > Math.floor(now) + SEARCH_LIMITS.cursor_ttl_seconds) {
        throw invalidSearchCursor();
    }
    return payload.before_id;
}
export function createSearchCursor(deps, actorId, spaceId, query, beforeId) {
    return deps.signer.sign({
        v: 1, purpose: 'search', actor_id: actorId, space_id: spaceId,
        query_hash: searchQueryHash(deps, query), sort: 'id_desc', before_id: beforeId,
        exp: Math.floor(deps.clock.now().getTime() / 1000) + SEARCH_LIMITS.cursor_ttl_seconds,
    }, deps.secret);
}
//# sourceMappingURL=search-cursor.js.map