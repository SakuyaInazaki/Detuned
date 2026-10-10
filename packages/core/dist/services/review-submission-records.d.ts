import { type ReviewSubmissionRecord, type ReviewSubmissionAcknowledgement } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
/** Intrinsic stored binding only. Online callers must separately apply current ACL and privacy. */
export declare function validateReviewSubmissionRecords(storage: StoragePort, spaceId: string, submissionId: string): ReviewSubmissionRecord;
export interface ReviewSubmissionResultReference {
    v: 1;
    kind: 'review.submission';
    submission_id: string;
    assignment_id: string;
    request_id: string;
    request_version: number;
    snapshot_id: string;
    manifest_sha256: string;
}
export declare function validateStoredReviewSubmissionReference(storage: StoragePort, operation: string, spaceId: string, raw: unknown): void;
export declare function reviewSubmissionAcknowledgement(submission: ReviewSubmissionRecord): ReviewSubmissionAcknowledgement;
/** Online post-evidence privacy only; old readable revisions remain valid. */
export declare function assertReviewSubmissionPostEvidencePrivacy(storage: StoragePort, spaceId: string, submission: ReviewSubmissionRecord): void;
//# sourceMappingURL=review-submission-records.d.ts.map