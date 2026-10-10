import { createHash } from 'node:crypto';
import { isCreateReviewRequest, isCancelReviewRequest, DetunedError, ErrorCode } from '@detuned/protocol';
import { readReviewSnapshotRecords, reconstructReviewRequestView, reviewSnapshotItems, reviewResync } from '@detuned/core';
import { canonicalizeReviewJson } from './canonical-json.js';
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const invalid = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Formal review request requirements are not satisfied.', 400);
const missing = () => new DetunedError(ErrorCode.NOT_FOUND, 'Review material does not exist or is not accessible.', 404);
const forbidden = () => new DetunedError(ErrorCode.FORBIDDEN, 'This review request operation requires its requester or space maintenance authority.', 403);
/** Internal only: fixed assignments and collecting/cancelled heads, no submissions or public endpoint. */
export class ReviewRequestService {
    storage;
    authService;
    idempotency;
    clock;
    idGen;
    builder;
    constructor(storage, authService, idempotency, clock, idGen, builder) {
        this.storage = storage;
        this.authService = authService;
        this.idempotency = idempotency;
        this.clock = clock;
        this.idGen = idGen;
        this.builder = builder;
    }
    readAuth(auth, spaceId, write = false) {
        const current = this.authService.refreshContext(auth);
        return this.authService.requireSpaceAccess(current, spaceId, write ? 'contributor' : 'observer');
    }
    target(auth, spaceId, postId) {
        const current = this.readAuth(auth, spaceId, true), post = this.storage.findPostById(postId);
        if (!post || post.space_id !== spaceId)
            throw missing();
        if (post.lifecycle === 'redacted')
            throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Review material has been redacted.', 410);
        if (post.author_id !== current.actor.id && current.spaceRole !== 'maintainer' && current.spaceRole !== 'owner')
            throw forbidden();
        return current;
    }
    cancelAuth(auth, spaceId, requestId) {
        const current = this.readAuth(auth, spaceId, true), head = this.storage.findReviewRequestById(requestId);
        if (!head || head.space_id !== spaceId)
            throw missing();
        // Privacy is checked before ownership and version errors; no stored manifest can restore redacted material.
        reconstructReviewRequestView(this.storage, spaceId, requestId);
        if (head.requested_by !== current.actor.id && current.spaceRole !== 'maintainer' && current.spaceRole !== 'owner')
            throw forbidden();
        return { current, head };
    }
    createRequest(auth, spaceId, req, requestKey) {
        return this.storage.transaction(tx => {
            this.readAuth(auth, spaceId, true);
            if (!isCreateReviewRequest(req))
                throw invalid();
            const current = this.target(auth, spaceId, req.target_ref.post_id);
            return this.idempotency.executeIdempotent(current.actor.id, spaceId, 'review.request.create', requestKey, req, 201, () => {
                const { manifest, manifestHash } = this.builder.generateSnapshotManifest(current, spaceId, req);
                const policy = manifest.review_policy;
                if (!policy.enabled || !policy.exclude_contributors || !policy.distinct_actors || !policy.seal_until_all_submitted || !policy.invalidate_on_revision ||
                    req.reviewer_actor_ids.length !== policy.required_reviewers)
                    throw invalid();
                const reviewers = [...req.reviewer_actor_ids].sort(cmp), groups = new Set();
                const assignments = reviewers.map(reviewer_actor_id => {
                    const actor = tx.findActorById(reviewer_actor_id), member = tx.getMembership(spaceId, reviewer_actor_id);
                    if (!actor || actor.disabled_at || !['human', 'agent'].includes(actor.kind) || !member || !member.active || !member.reviewer_eligible || manifest.contributors.includes(reviewer_actor_id))
                        throw invalid();
                    if (policy.distinct_independence_groups) {
                        const group = member.independence_group;
                        if (typeof group !== 'string' || !/\S/.test(group) || groups.has(group))
                            throw invalid();
                        groups.add(group);
                    }
                    return { request_id: '', reviewer_actor_id, group_at_assignment: member.independence_group };
                });
                const now = this.clock.nowIso(), snapshotId = this.idGen.generateId('snp'), requestId = this.idGen.generateId('rrq');
                const round = tx.getNextReviewRequestRound(spaceId, req.target_ref.post_id);
                if (!Number.isSafeInteger(round) || round < 1)
                    throw reviewResync();
                const canonical = canonicalizeReviewJson(manifest);
                if (createHash('sha256').update(canonical, 'utf8').digest('hex') !== manifestHash)
                    throw reviewResync();
                tx.createReviewSnapshot({ id: snapshotId, space_id: spaceId, manifest_json: canonical, manifest_sha256: manifestHash,
                    target_ref: { ...manifest.target.ref }, policy_revision: manifest.policy_revision, rules_revision: manifest.rules_revision, created_by: current.actor.id, created_at: now }, reviewSnapshotItems(snapshotId, manifest));
                const record = { id: requestId, space_id: spaceId, target_ref: { ...req.target_ref }, snapshot_id: snapshotId, round,
                    phase: 'collecting', version: 1, requested_by: current.actor.id, created_at: now, changed_by: current.actor.id, changed_at: now, reason: null };
                const version = { request_id: requestId, version: 1, phase: 'collecting', changed_by: current.actor.id, changed_at: now, reason: null };
                tx.createReviewRequest(record, version, assignments.map(a => ({ ...a, request_id: requestId })));
                tx.appendEvent(spaceId, { id: this.idGen.generateId('evt'), space_id: spaceId, type: 'review.requested', object_id: requestId,
                    revision: 1, visibility: 'public', actor_id: current.actor.id, created_at: now });
                return reconstructReviewRequestView(tx, spaceId, requestId, 1);
            }, () => { this.target(auth, spaceId, req.target_ref.post_id); }).data;
        });
    }
    getRequest(auth, spaceId, requestId) {
        return this.storage.readSnapshot(() => { this.readAuth(auth, spaceId); return reconstructReviewRequestView(this.storage, spaceId, requestId); });
    }
    getSnapshot(auth, spaceId, snapshotId) {
        return this.storage.readSnapshot(() => {
            this.readAuth(auth, spaceId);
            const { record, manifest } = readReviewSnapshotRecords(this.storage, spaceId, snapshotId);
            try {
                if (canonicalizeReviewJson(manifest) !== record.manifest_json)
                    throw reviewResync();
            }
            catch {
                throw reviewResync();
            }
            return { snapshot_id: record.id, space_id: record.space_id, manifest_sha256: record.manifest_sha256, manifest, created_by: record.created_by, created_at: record.created_at };
        });
    }
    cancelRequest(auth, spaceId, requestId, req, requestKey) {
        return this.storage.transaction(tx => {
            const { current } = this.cancelAuth(auth, spaceId, requestId);
            if (!isCancelReviewRequest(req))
                throw invalid();
            return this.idempotency.executeIdempotent(current.actor.id, spaceId, `review.request.cancel:${requestId}`, requestKey, req, 200, () => {
                const { head } = this.cancelAuth(auth, spaceId, requestId);
                if (head.version !== req.expected_version)
                    throw new DetunedError(ErrorCode.REVISION_CONFLICT, 'Review request version has changed.', 409);
                if (head.phase !== 'collecting')
                    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Only collecting review requests can be cancelled.', 400);
                const now = this.clock.nowIso(), version = head.version + 1;
                tx.updateReviewRequest({ ...head, phase: 'cancelled', version, changed_by: current.actor.id, changed_at: now, reason: req.reason }, { request_id: requestId, version, phase: 'cancelled', changed_by: current.actor.id, changed_at: now, reason: req.reason });
                tx.appendEvent(spaceId, { id: this.idGen.generateId('evt'), space_id: spaceId, type: 'review.cancelled', object_id: requestId,
                    revision: version, visibility: 'public', actor_id: current.actor.id, created_at: now });
                return reconstructReviewRequestView(tx, spaceId, requestId, version);
            }, () => { this.cancelAuth(auth, spaceId, requestId); }).data;
        });
    }
}
//# sourceMappingURL=request-service.js.map