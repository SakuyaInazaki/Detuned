import { readReviewStatusFacts } from './review-status-facts.js';
import { SearchCursorDependencies, readSearchCursor, createSearchCursor } from './search-cursor.js';
import { projectClaimMaterial, projectFailureMaterial, projectRelation, projectTargetRelations, REPORT_FLAGS } from './knowledge-projection.js';
import {
  SearchQuery,
  SearchResultItem,
  ViewName,
  ViewResponseData,
  normalizeSearchQuery,
  SEARCH_LIMITS,
  DetunedError,
  ErrorCode,
  isSnapshotReviewPolicy,
  type ReviewPolicy,
  type SpaceRevision,
  type ReviewRoundSummary,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';

export class SearchService {
  constructor(
    private readonly storage: StoragePort,
    private readonly authService: AuthService,
    private readonly cursorDependencies?: SearchCursorDependencies,
    private readonly limits: { max_candidates: number; max_response_bytes: number } = { max_candidates: SEARCH_LIMITS.candidates, max_response_bytes: SEARCH_LIMITS.response_bytes }
  ) {}

  search(
    auth: AuthenticatedContext,
    spaceId: string,
    query: SearchQuery
  ): { items: SearchResultItem[]; next_cursor: string | null } {
    this.authService.requireSpaceAccess(this.authService.refreshContext(auth), spaceId, 'observer');

    const normalized = normalizeSearchQuery(query);
    const dependencies = this.cursorDependencies;
    if (!dependencies) throw new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, '搜索游标签名后端未配置。', 500);
    const beforeId = readSearchCursor(dependencies, auth.actor.id, spaceId, normalized);
    const result = this.storage.searchPosts(spaceId, normalized.q, {
      kind: normalized.kind, tags: normalized.tags, thread_id: normalized.thread_id,
    }, normalized.limit, beforeId, { max_candidates: this.limits.max_candidates });
    if (Buffer.byteLength(JSON.stringify(result.items), 'utf8') > this.limits.max_response_bytes) {
      throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, '搜索结果超过编码字节限额，请缩小条件或分页大小。', 422);
    }
    return {
      items: result.items,
      next_cursor: result.next_cursor ? createSearchCursor(dependencies, auth.actor.id, spaceId, normalized, result.next_cursor) : null,
    };
  }

  getView(
    auth: AuthenticatedContext,
    spaceId: string,
    name: ViewName
  ): { view: string; items: ViewResponseData<ViewName> } {
    return this.storage.readSnapshot(() => {
      this.authService.requireSpaceAccess(this.authService.refreshContext(auth), spaceId, 'observer', 'read');
      let policy: ReviewPolicy | undefined;
      if (name === 'findings' || name === 'failures') {
        const space = this.storage.findSpaceById(spaceId);
        const unsafePolicy = () => new DetunedError(ErrorCode.RESYNC_REQUIRED, 'Stored space policy cannot be safely read.', 409);
        if (!space || !Number.isSafeInteger(space.policy_revision) || space.policy_revision < 1) throw unsafePolicy();
        let revision: SpaceRevision | null;
        try {
          revision = this.storage.getSpaceRevision(spaceId, space.policy_revision);
        } catch (error) {
          // Only malformed persisted JSON is translated here. ACL and unrelated
          // storage failures keep their original meaning; no default policy is invented.
          if (error instanceof SyntaxError) throw unsafePolicy();
          throw error;
        }
        if (!revision || revision.space_id !== spaceId || revision.revision !== space.policy_revision || !isSnapshotReviewPolicy(revision.review_policy)) throw unsafePolicy();
        policy = revision.review_policy;
      }

      if (name === 'failures') {
        const result = this.storage.searchPosts(spaceId, '', { kind: 'failure' }, 50);
        return { view: 'failures', items: result.items.map(item => ({...item,kind:'failure' as const,type:'failure' as const,...REPORT_FLAGS,...this.reviewProjection(spaceId,item.post_id,policy!),material:projectFailureMaterial(this.storage.getPostRevision(item.post_id,item.revision)?.structured),relations:projectTargetRelations(this.storage,spaceId,item.post_id)})) };
      } else if (name === 'findings') {
        const claims = this.storage.searchPosts(spaceId, '', { kind: 'claim' }, 25);
        return { view: 'findings', items: claims.items.map(item => ({...item,kind:'claim' as const,type:'claim' as const,...REPORT_FLAGS,...this.reviewProjection(spaceId,item.post_id,policy!),material:projectClaimMaterial(this.storage.getPostRevision(item.post_id,item.revision)?.structured),relations:projectTargetRelations(this.storage,spaceId,item.post_id)})) };
      } else if (name === 'open-questions') {
        const questions = this.storage.searchPosts(spaceId, '', { kind: 'question' }, 25);
        const openChallenges = this.storage.listOpenChallenges(spaceId);
        return {
          view: 'open-questions',
          items: [
            ...questions.items.map(item => ({...item,kind:'question' as const,type:'question' as const})),
            ...openChallenges.flatMap(relation => {
              const projected = projectRelation(this.storage,spaceId,relation);
              return projected ? [{...projected,type:'open_challenge' as const,relation_type:'challenges' as const,state:'open' as const}] : [];
            }),
          ],
        };
      }

      throw new DetunedError(ErrorCode.NOT_FOUND, `未知视图 ${name}`, 404);
    });
  }

  private reviewProjection(spaceId: string, postId: string, policy: ReviewPolicy) {
    const latest = this.storage.listPostReviewRequests(spaceId, postId, 1).requests[0];
    if (!latest) {
      const status = policy.enabled ? 'not_requested' as const : 'not_enabled' as const;
      return {formal_review_status: status, formal_check_status: status, formal_review: null};
    }
    const status = readReviewStatusFacts(this.storage, spaceId, latest.id);
    const summary: ReviewRoundSummary = {...status, space_id:spaceId, target_post_id:postId, round:latest.round, target_revision:latest.target_ref.revision, created_at:latest.created_at};
    return {formal_review_status:status.phase, formal_check_status:status.verification_status, formal_review:summary};
  }
}
