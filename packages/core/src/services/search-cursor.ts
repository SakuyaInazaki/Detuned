import { DetunedError, ErrorCode, isSearchCursorPayload, NormalizedSearchQuery, SEARCH_LIMITS, SEARCH_CURSOR_ERROR_MESSAGE } from '@detuned/protocol';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';

export interface SearchCursorDependencies {
  signer: TokenSignerPort;
  secret: string;
  clock: ClockPort;
  hasher: HasherPort;
}
export const invalidSearchCursor = () => new DetunedError(ErrorCode.VALIDATION_ERROR, SEARCH_CURSOR_ERROR_MESSAGE, 400, false);
export function searchQueryHash(deps: SearchCursorDependencies, query: NormalizedSearchQuery): string {
  return deps.hasher.sha256(deps.hasher.canonicalJson({
    q: query.q, filters: { kind: query.kind ?? null, thread_id: query.thread_id ?? null, tags: query.tags }, sort: 'id_desc',
  }));
}
export function readSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedSearchQuery): string | undefined {
  if (query.cursor === undefined) return undefined;
  const now = deps.clock.now().getTime() / 1000;
  const payload = deps.signer.verify(query.cursor, deps.secret, now);
  if (!isSearchCursorPayload(payload) || payload.actor_id !== actorId || payload.space_id !== spaceId ||
      payload.query_hash !== searchQueryHash(deps, query) || payload.exp <= now || payload.exp > Math.floor(now) + SEARCH_LIMITS.cursor_ttl_seconds) {
    throw invalidSearchCursor();
  }
  return payload.before_id;
}
export function createSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedSearchQuery, beforeId: string): string {
  return deps.signer.sign({
    v: 1, purpose: 'search', actor_id: actorId, space_id: spaceId,
    query_hash: searchQueryHash(deps, query), sort: 'id_desc', before_id: beforeId,
    exp: Math.floor(deps.clock.now().getTime() / 1000) + SEARCH_LIMITS.cursor_ttl_seconds,
  }, deps.secret);
}
