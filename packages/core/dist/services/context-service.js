import { DetunedError, ErrorCode, } from '@detuned/protocol';
export class ContextService {
    storage;
    tokenSigner;
    authService;
    tokenSecret;
    constructor(storage, tokenSigner, authService, tokenSecret) {
        this.storage = storage;
        this.tokenSigner = tokenSigner;
        this.authService = authService;
        this.tokenSecret = tokenSecret;
    }
    getContext(auth, spaceId, query) {
        this.authService.requireSpaceAccess(auth, spaceId, 'observer');
        const space = this.storage.findSpaceById(spaceId);
        if (!space) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '空间不存在。', 404);
        }
        const spaceRev = this.storage.getSpaceRevision(spaceId, space.current_revision);
        if (!spaceRev) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '空间规则修订不存在。', 404);
        }
        const latestSeq = this.storage.getLatestEventSeq(spaceId);
        const checkpointToken = this.tokenSigner.sign({
            purpose: 'checkpoint',
            space_id: spaceId,
            actor_id: auth.actor.id,
            seq: latestSeq,
            exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        }, this.tokenSecret);
        // 1. Pinned summaries
        const pinnedSummaries = [];
        for (const ref of spaceRev.pinned_refs) {
            const p = this.storage.findPostById(ref.post_id);
            if (p && p.space_id === spaceId && p.lifecycle === 'active') {
                const rev = this.storage.getPostRevision(p.id, ref.revision);
                if (rev) {
                    pinnedSummaries.push({
                        ref: { post_id: p.id, revision: ref.revision },
                        title: rev.title,
                        summary: rev.summary,
                        has_newer_revision: p.current_revision > ref.revision,
                    });
                }
            }
        }
        // 2. Open blocking objections (challenges)
        const openChallenges = this.storage.listOpenChallenges(spaceId);
        const blockingObjections = [];
        for (const rel of openChallenges.slice(0, 10)) {
            const srcRev = this.storage.getPostRevision(rel.source_post_id, rel.source_revision);
            blockingObjections.push({
                relation_id: rel.id,
                source_ref: { post_id: rel.source_post_id, revision: rel.source_revision },
                target_ref: { post_id: rel.target_post_id, revision: rel.target_revision },
                issue: srcRev?.structured?.issue ?? srcRev?.summary ?? '存在未解决异议',
                impact: srcRev?.structured?.impact ?? '待复查',
            });
        }
        // 3. Recent failures
        const searchFailures = this.storage.searchPosts(spaceId, '', { kind: 'failure' }, 5);
        const recentFailures = [];
        for (const item of searchFailures.items) {
            const post = this.storage.findPostById(item.post_id);
            if (post && post.lifecycle === 'active') {
                const rev = this.storage.getPostRevision(post.id, post.current_revision);
                if (rev) {
                    const struct = rev.structured;
                    recentFailures.push({
                        ref: { post_id: post.id, revision: post.current_revision },
                        title: rev.title,
                        category: struct?.category ?? 'counterexample',
                        attempt: struct?.attempt ?? rev.summary,
                        tested_scope: struct?.tested_scope ?? '',
                        evidence_state: struct?.evidence_state ?? 'provided',
                    });
                }
            }
        }
        // 4. Recent activity
        const recentEvents = this.storage.listEventsAfter(spaceId, Math.max(0, latestSeq - 5), 5);
        const recentActivity = recentEvents.map((e) => ({
            type: e.type,
            object_id: e.object_id,
            occurred_at: e.created_at,
        }));
        const result = {
            space_id: space.id,
            slug: space.slug,
            objective: spaceRev.objective,
            rules: spaceRev.rules,
            policy_revision: space.policy_revision,
            pinned_summaries: pinnedSummaries,
            blocking_objections: blockingObjections,
            recent_failures: recentFailures,
            recent_activity: recentActivity,
            checkpoint_token: checkpointToken,
        };
        const maxBytes = query.max_bytes ?? 12288;
        const jsonBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
        const truncated = jsonBytes > maxBytes;
        if (truncated) {
            // If budget exceeded, trim recent_failures and recent_activity
            result.recent_activity = [];
            result.recent_failures = result.recent_failures.slice(0, 2);
        }
        return { data: result, truncated };
    }
}
//# sourceMappingURL=context-service.js.map