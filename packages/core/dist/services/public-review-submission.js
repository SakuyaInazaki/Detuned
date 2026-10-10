import { DetunedError, ErrorCode } from '@detuned/protocol';
import { readIntrinsicReviewRequestRecords, readReviewSnapshotRecords, reviewResync } from './review-request-records.js';
import { validateReviewSubmissionRecords, assertReviewSubmissionPostEvidencePrivacy } from './review-submission-records.js';
import { assertStoredSubmissionEvidencePrivacy } from './review-artifact-access.js';
/** Existing online read chain. Caller already refreshed ACL and holds the read snapshot. */
export function assertReviewSubmissionReadPrivacy(storage, spaceId, submission) {
    const head = storage.findReviewRequestById(submission.request_id);
    if (!head)
        throw new DetunedError(ErrorCode.NOT_FOUND, 'Review material does not exist or is not accessible.', 404);
    readReviewSnapshotRecords(storage, spaceId, head.snapshot_id);
    assertReviewSubmissionPostEvidencePrivacy(storage, spaceId, submission);
    assertStoredSubmissionEvidencePrivacy(storage, spaceId, submission);
}
/** Revealed-only search: intrinsic errors never enter the narrowly scoped privacy catch. */
export function readPublicReviewSubmission(storage, spaceId, submissionId) {
    let submission, request;
    try {
        submission = validateReviewSubmissionRecords(storage, spaceId, submissionId);
        request = readIntrinsicReviewRequestRecords(storage, spaceId, submission.request_id).head;
        if (submission.revealed_at === null)
            return null;
    }
    catch (error) {
        if (error instanceof SyntaxError)
            throw reviewResync();
        throw error;
    }
    try {
        assertReviewSubmissionReadPrivacy(storage, spaceId, submission);
    }
    catch (error) {
        if (error instanceof DetunedError && (error.code === ErrorCode.NOT_FOUND || error.code === ErrorCode.CONTENT_REDACTED))
            return null;
        throw error;
    }
    return { submission, request };
}
//# sourceMappingURL=public-review-submission.js.map