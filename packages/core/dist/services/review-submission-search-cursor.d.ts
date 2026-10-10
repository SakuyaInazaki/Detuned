import { type NormalizedReviewSubmissionSearchQuery } from '@detuned/protocol';
import { type SearchCursorDependencies } from './search-cursor.js';
export declare function readPublicReviewSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedReviewSubmissionSearchQuery): {
    before?: string;
    exp: number;
};
export declare function createPublicReviewSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedReviewSubmissionSearchQuery, before: string, exp: number): string;
//# sourceMappingURL=review-submission-search-cursor.d.ts.map