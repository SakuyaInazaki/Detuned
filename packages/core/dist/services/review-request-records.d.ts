import { DetunedError, type ReviewSnapshotRecord, type ReviewSnapshotItemRecord, type ReviewSnapshotManifestData, type ReviewRequestView } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
export declare const reviewResync: () => DetunedError;
export declare function reviewSnapshotItems(snapshotId: string, manifest: ReviewSnapshotManifestData): ReviewSnapshotItemRecord[];
/** Online callers cannot opt out of the current material privacy gate. */
export declare function readReviewSnapshotRecords(storage: StoragePort, spaceId: string, snapshotId: string): {
    record: ReviewSnapshotRecord;
    manifest: ReviewSnapshotManifestData;
};
export declare function reconstructReviewRequestView(storage: StoragePort, spaceId: string, requestId: string, version?: number): ReviewRequestView;
/** Maintenance only: validates intrinsic frozen records and returns no material/body.
 * Redaction preserves original narrow hashes; never read or restore sanitized historical bodies. */
export declare function validatePersistedReviewRequestBinding(storage: StoragePort, spaceId: string, requestId: string, version: number, snapshotId: string, manifestSha256: string, phase: import('@detuned/protocol').ReviewPhase): void;
/** Fresh actions only. Caller first applies current authentication and online material privacy. */
export declare function assertReviewSnapshotCurrent(storage: StoragePort, records: {
    record: ReviewSnapshotRecord;
    manifest: ReviewSnapshotManifestData;
}): void;
/** Infrastructure/internal metadata only: intrinsic validation, not an online read authorization.
 * Callers never expose this manifest as a substitute for readReviewSnapshotRecords. */
export declare function readIntrinsicReviewRequestRecords(storage: StoragePort, spaceId: string, requestId: string): {
    head: import('@detuned/protocol').ReviewRequestRecord;
    record: ReviewSnapshotRecord;
    manifest: ReviewSnapshotManifestData;
};
//# sourceMappingURL=review-request-records.d.ts.map