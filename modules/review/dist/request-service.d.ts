import { type CreateReviewRequest, type CancelReviewRequest, type ReviewRequestView, type ReviewRequestReadView, type ReviewSnapshotManifestData } from '@detuned/protocol';
import { type StoragePort, type ClockPort, type IdGeneratorPort, AuthService, type AuthenticatedContext, IdempotencyService } from '@detuned/core';
import { type ReviewModule } from './index.js';
/** Internal only: fixed assignments and collecting/cancelled heads, no submissions or public endpoint. */
export declare class ReviewRequestService {
    private readonly storage;
    private readonly authService;
    private readonly idempotency;
    private readonly clock;
    private readonly idGen;
    private readonly builder;
    constructor(storage: StoragePort, authService: AuthService, idempotency: IdempotencyService, clock: ClockPort, idGen: IdGeneratorPort, builder: ReviewModule);
    private readAuth;
    private target;
    private cancelAuth;
    createRequest(auth: AuthenticatedContext, spaceId: string, req: CreateReviewRequest, requestKey: string): ReviewRequestView;
    getRequest(auth: AuthenticatedContext, spaceId: string, requestId: string): ReviewRequestReadView;
    getSnapshot(auth: AuthenticatedContext, spaceId: string, snapshotId: string): {
        snapshot_id: string;
        space_id: string;
        manifest_sha256: string;
        manifest: ReviewSnapshotManifestData;
        created_by: string;
        created_at: string;
    };
    cancelRequest(auth: AuthenticatedContext, spaceId: string, requestId: string, req: CancelReviewRequest, requestKey: string): ReviewRequestView;
}
//# sourceMappingURL=request-service.d.ts.map