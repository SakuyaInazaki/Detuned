import { projectFailureMaterial, projectRelation, projectSummarySources } from './knowledge-projection.js';
import {
  ContextQuery,
  ContextResponseData,
  ContextPage,
  CONTEXT_BYTES,
  contextEnvelopeBytes,
  DetunedError,
  ErrorCode,
  isPostRef,
} from '@detuned/protocol';
import { ClockPort, SystemClock } from '../ports/clock.js';
import { StoragePort } from '../ports/storage.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';

export class ContextService {
  constructor(
    private readonly storage: StoragePort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly authService: AuthService,
    private readonly tokenSecret: string,
    private readonly clock: ClockPort = new SystemClock()
  ) {}

  getContext(
    auth: AuthenticatedContext,
    spaceId: string,
    query: ContextQuery,
    budget: { request_id: string }
  ): ContextPage {
    const snapshot = this.storage.readSnapshot(() => {
      const currentAuth = this.authService.refreshContext(auth);
      this.authService.requireSpaceAccess(currentAuth, spaceId, 'observer');
      const maxBytes = query.max_bytes === undefined ? CONTEXT_BYTES.default : query.max_bytes;
      if (!Number.isInteger(maxBytes) || maxBytes < CONTEXT_BYTES.minimum || maxBytes > CONTEXT_BYTES.maximum) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'max_bytes 必须为4096至65536的整数。', 400);
      }
      let focusThread: ContextResponseData['focus_thread'];
      if (query.focus_thread_id !== undefined) {
        if (typeof query.focus_thread_id !== 'string' || !query.focus_thread_id.trim()) {
          throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'focus_thread_id 必须为非空字符串。', 400);
        }
        const thread = this.storage.findThreadById(query.focus_thread_id);
        if (!thread || thread.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在或不属于此空间。', 404);
        }
        focusThread = thread;
      }
      if (!budget || typeof budget.request_id !== 'string') {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '上下文预算需要实际 request_id。', 400);
      }

      const space = this.storage.findSpaceById(spaceId);
      if (!space) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '空间不存在。', 404);
      }

      const spaceRev = this.storage.getSpaceRevision(spaceId, space.current_revision);
      if (!spaceRev) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '空间规则修订不存在。', 404);
      }

      const latestSeq = this.storage.getLatestEventSeq(spaceId);
      // 1. Pinned summaries
      const pinnedSummaries: ContextResponseData['pinned_summaries'] = [];
      for (const ref of Array.isArray(spaceRev.pinned_refs) ? spaceRev.pinned_refs : []) {
        if (!isPostRef(ref)) continue;
        const p = this.storage.findPostById(ref.post_id);
        if (p && p.space_id === spaceId && p.lifecycle === 'active' && p.kind === 'summary' && (!focusThread || p.thread_id === focusThread.id)) {
          const rev = this.storage.getPostRevision(p.id, ref.revision);
          if (rev) {
            pinnedSummaries.push({
              ref: { post_id: p.id, revision: ref.revision },
              title: rev.title,
              summary: rev.summary,
              has_newer_revision: p.current_revision > ref.revision,
              ...projectSummarySources(this.storage, spaceId, rev.structured),
            });
          }
        }
      }

      // 2. Open blocking objections (challenges)
      const openChallenges = focusThread
        ? this.storage.listOpenChallengesForThread(spaceId, focusThread.id, 10)
        : this.storage.listOpenChallenges(spaceId);
      const blockingObjections: ContextResponseData['blocking_objections'] = [];
      for (const rel of openChallenges.slice(0, 10)) {
        const projected = projectRelation(this.storage, spaceId, rel);
        if (!projected) continue;
        const srcRev = this.storage.getPostRevision(rel.source_post_id, rel.source_revision);
        const redacted = projected.source_status === 'redacted' || projected.target_status === 'redacted';
        const structured = srcRev?.structured as Record<string, unknown> | undefined;
        const issue = !redacted && typeof structured?.issue === 'string' ? structured.issue : null;
        const impact = !redacted && typeof structured?.impact === 'string' ? structured.impact : null;
        blockingObjections.push({
          ...projected, type:'open_challenge', relation_type:'challenges', state:'open', issue, impact,
          missing_fields: [...(issue === null ? ['issue' as const] : []), ...(impact === null ? ['impact' as const] : [])],
        });
      }

      // 3. Recent failures
      const searchFailures = this.storage.searchPosts(spaceId, '', { kind: 'failure', ...(focusThread ? { thread_id: focusThread.id } : {}) }, 5);
      const recentFailures: ContextResponseData['recent_failures'] = [];
      for (const item of searchFailures.items) {
        const post = this.storage.findPostById(item.post_id);
        if (post && post.lifecycle === 'active') {
          const rev = this.storage.getPostRevision(post.id, post.current_revision);
          if (rev) {
            const material = projectFailureMaterial(rev.structured);
            recentFailures.push({
              ref: { post_id: post.id, revision: post.current_revision },
              title: rev.title,
              category: material.category,
              attempt: material.attempt,
              tested_scope: material.tested_scope,
              evidence_state: material.evidence_state,
              report_kind: 'author_report',
              missing_fields: material.missing_fields.filter((key): key is 'category'|'attempt'|'tested_scope'|'evidence_state' => ['category','attempt','tested_scope','evidence_state'].includes(key)),
            });
          }
        }
      }

      // 4. Recent activity
      const recentEvents = focusThread
        ? this.storage.listPublicEventsForThread(spaceId, focusThread.id, latestSeq, 5)
        : this.storage.listEventsAfter(
        spaceId,
        Math.max(0, latestSeq - 5),
        5
      );
      const recentActivity = recentEvents.filter(event => event.visibility === 'public').map((e) => ({
        type: e.type,
        object_id: e.object_id,
        occurred_at: e.created_at,
      }));

      const result: ContextResponseData = {
        space_id: space.id,
        ...(focusThread ? { focus_thread: focusThread } : {}),
        slug: space.slug,
        space_revision_ref: { space_id: space.id, revision: spaceRev.revision },
        space_content_status: 'included',
        objective: spaceRev.objective,
        rules: spaceRev.rules,
        policy_revision: space.policy_revision,
        pinned_summaries: pinnedSummaries,
        blocking_objections: blockingObjections,
        recent_failures: recentFailures,
        recent_activity: recentActivity,
        checkpoint_token: '',
      };

      return { data: result, seq: latestSeq, actorId: currentAuth.actor.id, maxBytes };
    });

    // All database reads have ended. Sign exactly the high-water mark in that snapshot.
    snapshot.data.checkpoint_token = this.tokenSigner.sign({
      purpose: 'checkpoint', space_id: spaceId, actor_id: snapshot.actorId,
      seq: snapshot.seq, exp: Math.floor(this.clock.now().getTime() / 1000) + 86400,
    }, this.tokenSecret);
    let page: ContextPage = { data: snapshot.data, meta: { truncated: false, next_cursor: null } };
    // Decide inline rules using only mandatory fields, without discarding optional candidates.
    const mandatory: ContextPage = { ...page, data: {
      ...page.data, recent_activity: [], recent_failures: [], blocking_objections: [], pinned_summaries: [],
    } };
    if (contextEnvelopeBytes(budget.request_id, mandatory) > snapshot.maxBytes) {
      page = { data: { ...page.data, space_content_status: 'omitted_for_budget', objective: null, rules: null },
        meta: { truncated: true, next_cursor: null } };
    }
    const fits = () => contextEnvelopeBytes(budget.request_id, page) <= snapshot.maxBytes;
    for (const items of [page.data.recent_activity, page.data.recent_failures, page.data.blocking_objections, page.data.pinned_summaries]) {
      while (!fits() && items.length > 0) {
        items.pop();
        page.meta.truncated = true;
      }
    }
    if (!fits()) {
      throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, '空间修订引用与检查点等必要元信息超过上下文预算，请增大 max_bytes。', 422);
    }
    return page;
  }
}
