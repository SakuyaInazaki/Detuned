import { type ReviewDecisionRecord, type ReviewDecisionView } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
export interface ReviewDecisionResultReference {
    v: 1;
    kind: 'review.decision';
    decision_id: string;
    request_id: string;
    request_version: number;
    snapshot_id: string;
    manifest_sha256: string;
}
/** Intrinsic immutable decision binding, safe for maintenance after legitimate redaction. */
export declare function readIntrinsicReviewDecision(storage: StoragePort, spaceId: string, requestId: string): ReviewDecisionRecord;
export declare function reconstructReviewDecisionView(storage: StoragePort, spaceId: string, requestId: string): ReviewDecisionView;
export declare function parseReviewDecisionReference(operation: string, raw: unknown): ReviewDecisionResultReference;
export declare function validateStoredReviewDecisionReference(storage: StoragePort, operation: string, spaceId: string, raw: unknown): void;
//# sourceMappingURL=review-decision-records.d.ts.map