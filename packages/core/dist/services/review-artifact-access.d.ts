import { type Artifact, type ReviewSubmissionRecord } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
/** Caller refreshes authentication and checks current space read access before this scope gate. */
export declare function assertReviewArtifactReadAccess(storage: StoragePort, spaceId: string, actorId: string, artifact: Artifact): void;
/** Internal reveal/privacy check: no materials returned, no public read authorization bypass. */
export declare function assertStoredSubmissionEvidencePrivacy(storage: StoragePort, spaceId: string, submission: ReviewSubmissionRecord): void;
/** Fresh submission/reveal only; historical read/replay does not rejudge readiness. */
export declare function assertStoredSubmissionEvidenceReady(storage: StoragePort, spaceId: string, submission: ReviewSubmissionRecord): void;
/** Fresh evidence scope check; readiness is checked separately by the review service. */
export declare function assertReviewEvidenceArtifact(storage: StoragePort, spaceId: string, assignmentId: string, artifactId: string): Artifact;
/** Intrinsic private artifact metadata only; caller applies online assignment/current privacy. */
export declare function reconstructReviewArtifactResult(storage: StoragePort, spaceId: string, artifactId: string): import('@detuned/protocol').ReviewArtifactMetadata;
export declare function validateStoredReviewArtifactReference(storage: StoragePort, operation: string, spaceId: string, raw: unknown): void;
//# sourceMappingURL=review-artifact-access.d.ts.map