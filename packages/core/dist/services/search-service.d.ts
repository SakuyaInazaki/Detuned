import { SearchCursorDependencies } from './search-cursor.js';
import { SearchQuery, type ReviewSubmissionSearchQuery, type PublicReviewSubmissionSearchItem, SearchResultItem, ViewName, ViewResponseData } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
export declare class SearchService {
    private readonly storage;
    private readonly authService;
    private readonly cursorDependencies?;
    private readonly limits;
    constructor(storage: StoragePort, authService: AuthService, cursorDependencies?: SearchCursorDependencies | undefined, limits?: {
        max_candidates: number;
        max_response_bytes: number;
    });
    search(auth: AuthenticatedContext, spaceId: string, query: SearchQuery): {
        items: SearchResultItem[];
        next_cursor: string | null;
    };
    searchPublicReviewSubmissions(auth: AuthenticatedContext, spaceId: string, query: ReviewSubmissionSearchQuery): {
        items: PublicReviewSubmissionSearchItem[];
        next_cursor: string | null;
    };
    getView(auth: AuthenticatedContext, spaceId: string, name: ViewName): {
        view: string;
        items: ViewResponseData<ViewName>;
    };
    private reviewProjection;
}
//# sourceMappingURL=search-service.d.ts.map