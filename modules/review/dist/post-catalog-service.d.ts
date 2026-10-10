import { type PostReviewRequestsQuery, type PostReviewRequestsPage } from '@detuned/protocol';
import { AuthService, type AuthenticatedContext, type StoragePort, type TokenSignerPort, type ClockPort } from '@detuned/core';
import { ReviewStatusService } from './status-service.js';
export declare class ReviewPostCatalogService {
    private readonly storage;
    private readonly auth;
    private readonly status;
    private readonly signer;
    private readonly secret;
    private readonly clock;
    constructor(storage: StoragePort, auth: AuthService, status: ReviewStatusService, signer: TokenSignerPort, secret: string, clock: ClockPort);
    getRequests(context: AuthenticatedContext, spaceId: string, postId: string, query: PostReviewRequestsQuery, budget: {
        request_id: string;
    }): PostReviewRequestsPage;
}
//# sourceMappingURL=post-catalog-service.d.ts.map