import { type FinalizeReviewRequest, type ReviewDecisionView } from '@detuned/protocol';
import { AuthService, type AuthenticatedContext, type StoragePort, type ClockPort, type IdGeneratorPort, IdempotencyService } from '@detuned/core';
/** Internal finalization only. Required checks remain pending until real M7 records exist. */
export declare class ReviewFinalizationService {
    private readonly storage;
    private readonly authService;
    private readonly idempotency;
    private readonly clock;
    private readonly idGen;
    constructor(storage: StoragePort, authService: AuthService, idempotency: IdempotencyService, clock: ClockPort, idGen: IdGeneratorPort);
    private authorize;
    finalizeRequest(auth: AuthenticatedContext, spaceId: string, requestId: string, req: FinalizeReviewRequest, key: string): ReviewDecisionView;
    getDecision(auth: AuthenticatedContext, spaceId: string, requestId: string): ReviewDecisionView;
}
//# sourceMappingURL=finalization-service.d.ts.map