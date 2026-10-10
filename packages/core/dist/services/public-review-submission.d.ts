import { type ReviewSubmissionRecord, type ReviewRequestRecord } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
/** Existing online read chain. Caller already refreshed ACL and holds the read snapshot. */
export declare function assertReviewSubmissionReadPrivacy(storage: StoragePort, spaceId: string, submission: ReviewSubmissionRecord): void;
/** Revealed-only search: intrinsic errors never enter the narrowly scoped privacy catch. */
export declare function readPublicReviewSubmission(storage: StoragePort, spaceId: string, submissionId: string): {
    submission: ReviewSubmissionRecord;
    request: ReviewRequestRecord;
} | null;
//# sourceMappingURL=public-review-submission.d.ts.map