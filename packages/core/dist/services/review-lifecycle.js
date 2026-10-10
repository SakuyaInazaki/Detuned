import { readRequiredCheckFacts, readCheckReceipt, readCheckRun } from './check-records.js';
import { randomUUID } from 'node:crypto';
import { REVIEW_VALIDITY_REASON_ORDER } from '@detuned/protocol';
import { readIntrinsicReviewRequestRecords, reviewResync } from './review-request-records.js';
import { readIntrinsicReviewDecision } from './review-decision-records.js';
import { validateReviewSubmissionRecords } from './review-submission-records.js';
/** Caller holds the original material mutation transaction. Never applies online privacy to redacted material. */
export function markReviewRequestsStale(storage, spaceId, change) {
    for (const head of storage.listActiveReviewRequestsForMaterial(spaceId, change)) {
        const records = readIntrinsicReviewRequestRecords(storage, spaceId, head.id);
        if (records.head.space_id !== spaceId || !['collecting', 'revealed'].includes(records.head.phase))
            throw reviewResync();
        const version = head.version + 1;
        if (!Number.isSafeInteger(version))
            throw reviewResync();
        storage.updateReviewRequest({ ...head, phase: 'stale', version, changed_by: change.actorId, changed_at: change.changedAt, reason: null }, { request_id: head.id, version, phase: 'stale', submitted_count: head.submitted_count, changed_by: change.actorId, changed_at: change.changedAt, reason: null });
        storage.appendEvent(spaceId, { id: `evt_${randomUUID()}`, space_id: spaceId, type: 'review.stale', object_id: head.id,
            revision: version, actor_id: change.actorId, created_at: change.changedAt, visibility: 'public' });
    }
}
/** Metadata facts only. Caller refreshes current read ACL and holds one read snapshot.
 * Public material redaction does not prevent safe status. No blob IO or sealed evidence inspection. */
export function readReviewValidityFacts(storage, spaceId, requestId) {
    const { head, record, manifest } = readIntrinsicReviewRequestRecords(storage, spaceId, requestId), reasons = new Set();
    if (['accepted', 'changes_requested', 'rejected'].includes(head.phase))
        readIntrinsicReviewDecision(storage, spaceId, requestId);
    for (const [index, entry] of [manifest.target, ...manifest.dependencies].entries()) {
        const post = storage.findPostById(entry.ref.post_id);
        if (!post || post.space_id !== spaceId || !storage.getPostRevisionMetadata(entry.ref.post_id, entry.ref.revision))
            throw reviewResync();
        if (post.lifecycle === 'redacted')
            reasons.add(index === 0 ? 'target_redacted' : 'dependency_redacted');
        else if (post.lifecycle === 'withdrawn')
            reasons.add(index === 0 ? 'target_withdrawn' : 'dependency_withdrawn');
        if (post.current_revision !== entry.ref.revision)
            reasons.add(index === 0 ? 'target_superseded' : 'dependency_superseded');
        if (storage.listOpenChallenges(spaceId, post.id).length > 0)
            reasons.add('open_challenges');
    }
    for (const entry of manifest.artifacts) {
        const artifact = storage.findArtifactById(entry.artifact_id);
        if (!artifact || artifact.space_id !== spaceId || artifact.visibility !== 'space')
            throw reviewResync();
        if (artifact.state === 'redacted')
            reasons.add('artifact_redacted');
        else if (artifact.state !== 'ready')
            reasons.add('artifact_unavailable');
    }
    const space = storage.findSpaceById(spaceId);
    if (!space)
        throw reviewResync();
    if (space.policy_revision !== record.policy_revision)
        reasons.add('policy_superseded');
    for (const row of storage.listReviewSubmissions(head.id)) {
        if (row.revealed_at === null)
            continue;
        const submission = validateReviewSubmissionRecords(storage, spaceId, row.id);
        for (const ref of submission.payload.evidence_refs) {
            if (ref.kind === 'post') {
                const post = storage.findPostById(ref.post_id);
                if (!post || post.space_id !== spaceId || !storage.getPostRevisionMetadata(ref.post_id, ref.revision))
                    throw reviewResync();
                if (post.lifecycle === 'redacted')
                    reasons.add('published_review_evidence_redacted');
                else if (post.lifecycle === 'withdrawn')
                    reasons.add('published_review_evidence_unavailable');
            }
            else {
                const artifact = storage.findArtifactById(ref.artifact_id);
                if (!artifact || artifact.space_id !== spaceId || (artifact.visibility === 'review_assignment' &&
                    (artifact.review_assignment_id !== submission.assignment_id || artifact.owner_id !== submission.reviewer_actor_id)))
                    throw reviewResync();
                if (artifact.state === 'redacted')
                    reasons.add('published_review_evidence_redacted');
                else if (artifact.state !== 'ready')
                    reasons.add('published_review_evidence_unavailable');
            }
        }
    }
    const relevant = new Map();
    for (const check of readRequiredCheckFacts(storage, spaceId, requestId).checks)
        if (check.run)
            relevant.set(check.run.id, check.run);
    const decision = storage.findReviewDecisionByRequestId(requestId);
    for (const receiptId of decision?.check_receipt_ids ?? []) {
        const receipt = storage.findCheckReceiptById(receiptId);
        if (!receipt)
            throw reviewResync();
        const run = readCheckRun(storage, spaceId, receipt.check_run_id);
        relevant.set(run.id, run);
    }
    for (const run of relevant.values()) {
        if (run.state === 'invalidated')
            reasons.add('check_invalidated');
        if (storage.findCheckReceiptByRunId(run.id)) {
            const receipt = readCheckReceipt(storage, spaceId, run.id), log = storage.findArtifactById(receipt.logs_artifact_id);
            if (!log)
                throw reviewResync();
            if (log.state === 'redacted')
                reasons.add('check_log_redacted');
            else if (log.state !== 'ready')
                reasons.add('check_log_unavailable');
        }
    }
    const validity_reasons = REVIEW_VALIDITY_REASON_ORDER.filter(reason => reasons.has(reason));
    const current_validity = validity_reasons.some(reason => REVIEW_VALIDITY_REASON_ORDER.indexOf(reason) < 11) ? 'invalidated' :
        validity_reasons.some(reason => REVIEW_VALIDITY_REASON_ORDER.indexOf(reason) < 14) ? 'superseded' : reasons.has('open_challenges') ? 'challenged' : 'current';
    return { current_validity, validity_reasons };
}
//# sourceMappingURL=review-lifecycle.js.map