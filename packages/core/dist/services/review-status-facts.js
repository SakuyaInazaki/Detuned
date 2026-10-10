import { readRequiredCheckFacts } from './check-records.js';
import { DetunedError, ErrorCode } from '@detuned/protocol';
import { readIntrinsicReviewRequestRecords } from './review-request-records.js';
import { readReviewValidityFacts } from './review-lifecycle.js';
/** Metadata only. Caller holds one read snapshot and has refreshed current space read ACL.
 * Safe status is independent of online material-content visibility; no sealed contents/blob IO. */
export function readReviewStatusFacts(storage, spaceId, requestId) {
    const head = storage.findReviewRequestById(requestId);
    if (!head || head.space_id !== spaceId)
        throw new DetunedError(ErrorCode.NOT_FOUND, 'Review request does not exist or is not accessible.', 404);
    const { manifest } = readIntrinsicReviewRequestRecords(storage, spaceId, requestId);
    return {
        request_id: head.id, snapshot_id: head.snapshot_id, phase: head.phase,
        verification_status: readRequiredCheckFacts(storage, spaceId, requestId).verification_status,
        ...readReviewValidityFacts(storage, spaceId, requestId),
    };
}
//# sourceMappingURL=review-status-facts.js.map