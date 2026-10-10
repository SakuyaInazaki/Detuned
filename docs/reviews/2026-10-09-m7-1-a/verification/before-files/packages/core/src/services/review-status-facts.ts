import { DetunedError, ErrorCode, type ReviewStatusView } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
import { readIntrinsicReviewRequestRecords } from './review-request-records.js';
import { readReviewValidityFacts } from './review-lifecycle.js';

/** Metadata only. Caller holds one read snapshot and has refreshed current space read ACL.
 * Safe status is independent of online material-content visibility; no sealed contents/blob IO. */
export function readReviewStatusFacts(storage: StoragePort, spaceId: string, requestId: string): ReviewStatusView {
  const head = storage.findReviewRequestById(requestId);
  if (!head || head.space_id !== spaceId) throw new DetunedError(ErrorCode.NOT_FOUND, 'Review request does not exist or is not accessible.', 404);
  const { manifest } = readIntrinsicReviewRequestRecords(storage, spaceId, requestId);
  return {
    request_id: head.id, snapshot_id: head.snapshot_id, phase: head.phase,
    verification_status: manifest.review_policy.required_checks.length === 0 ? 'not_required' : 'pending',
    ...readReviewValidityFacts(storage, spaceId, requestId),
  };
}
