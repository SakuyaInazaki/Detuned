import { type CreateReviewSubmission, type ReviewSubmissionView, type ReviewSubmissionAcknowledgement, type ReviewSubmissionsView } from '@detuned/protocol';
import { type StoragePort, type ClockPort, type IdGeneratorPort, type AuthenticatedContext, AuthService, IdempotencyService } from '@detuned/core';
/** Internal sealed submission business. No public transport or formal decision projection. */
export declare class ReviewSubmissionService {
    private readonly storage;
    private readonly authService;
    private readonly idempotency;
    private readonly clock;
    private readonly idGen;
    constructor(storage: StoragePort, authService: AuthService, idempotency: IdempotencyService, clock: ClockPort, idGen: IdGeneratorPort);
    private auth;
    private assignment;
    getOwnAssignment(auth: AuthenticatedContext, spaceId: string, requestId: string): {
        id: string;
        request_id: string;
        reviewer_actor_id: string;
        snapshot_id: string;
        snapshot_sha256: string;
    };
    private freshMaterials;
    private evidence;
    submit(auth: AuthenticatedContext, spaceId: string, requestId: string, req: CreateReviewSubmission, key: string): ReviewSubmissionAcknowledgement;
    listVisibleSubmissions(auth: AuthenticatedContext, spaceId: string, requestId: string): ReviewSubmissionsView;
    getSubmission(auth: AuthenticatedContext, spaceId: string, submissionId: string): ReviewSubmissionView;
}
//# sourceMappingURL=submission-service.d.ts.map