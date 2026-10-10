import { type ReviewValidityFacts } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
/** Caller holds the original material mutation transaction. Never applies online privacy to redacted material. */
export declare function markReviewRequestsStale(storage: StoragePort, spaceId: string, change: {
    kind: 'post' | 'artifact' | 'policy';
    objectId: string;
    actorId: string;
    changedAt: string;
}): void;
/** Metadata facts only. Caller refreshes current read ACL and holds one read snapshot.
 * Public material redaction does not prevent safe status. No blob IO or sealed evidence inspection. */
export declare function readReviewValidityFacts(storage: StoragePort, spaceId: string, requestId: string): ReviewValidityFacts;
//# sourceMappingURL=review-lifecycle.d.ts.map