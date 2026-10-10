import { isReviewSubmissionSearchCursorPayload, isUnicodeReviewId, SEARCH_LIMITS, type NormalizedReviewSubmissionSearchQuery } from '@detuned/protocol';
import { invalidSearchCursor, type SearchCursorDependencies } from './search-cursor.js';
function queryHash(deps: SearchCursorDependencies, query: NormalizedReviewSubmissionSearchQuery): string {
  return deps.hasher.sha256(deps.hasher.canonicalJson({ source: 'review_submissions', q: query.q, filters: { request_id: query.request_id ?? null, target_post_id: query.target_post_id ?? null }, sort: 'submission_id_desc' }));
}
export function readPublicReviewSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedReviewSubmissionSearchQuery): { before?: string; exp: number } {
  const now = deps.clock.now().getTime() / 1000;
  if (query.cursor === undefined) return { exp: Math.floor(now) + SEARCH_LIMITS.cursor_ttl_seconds };
  const payload = deps.signer.verify(query.cursor, deps.secret, now);
  if (!isReviewSubmissionSearchCursorPayload(payload) || !isUnicodeReviewId(payload.before_submission_id) || payload.actor_id !== actorId || payload.space_id !== spaceId || payload.query_hash !== queryHash(deps, query) || payload.exp <= now || payload.exp > Math.floor(now) + SEARCH_LIMITS.cursor_ttl_seconds) throw invalidSearchCursor();
  return { before: payload.before_submission_id, exp: payload.exp };
}
export function createPublicReviewSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedReviewSubmissionSearchQuery, before: string, exp: number): string {
  return deps.signer.sign({ v: 1, purpose: 'review_submission_search', source: 'review_submissions', actor_id: actorId, space_id: spaceId, query_hash: queryHash(deps, query), sort: 'submission_id_desc', before_submission_id: before, exp }, deps.secret);
}
