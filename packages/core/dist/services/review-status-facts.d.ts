import { type ReviewStatusView } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
/** Metadata only. Caller holds one read snapshot and has refreshed current space read ACL.
 * Safe status is independent of online material-content visibility; no sealed contents/blob IO. */
export declare function readReviewStatusFacts(storage: StoragePort, spaceId: string, requestId: string): ReviewStatusView;
//# sourceMappingURL=review-status-facts.d.ts.map