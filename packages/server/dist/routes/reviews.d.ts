import type { FastifyPluginAsync } from 'fastify';
import type { ReviewRequestService, ReviewSubmissionService, ReviewFinalizationService, ReviewStatusService, ReviewPostCatalogService } from '@detuned/module-review';
interface ReviewRouteOptions {
    requests: ReviewRequestService;
    submissions: ReviewSubmissionService;
    finalization: ReviewFinalizationService;
    status: ReviewStatusService;
    catalog: ReviewPostCatalogService;
}
export declare const reviewRoutes: FastifyPluginAsync<ReviewRouteOptions>;
export {};
//# sourceMappingURL=reviews.d.ts.map