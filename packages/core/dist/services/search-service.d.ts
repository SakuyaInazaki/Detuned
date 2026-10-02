import { SearchQuery, SearchResultItem, ViewName } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
export declare class SearchService {
    private readonly storage;
    private readonly authService;
    constructor(storage: StoragePort, authService: AuthService);
    search(auth: AuthenticatedContext, spaceId: string, query: SearchQuery): {
        items: SearchResultItem[];
        next_cursor: string | null;
    };
    getView(auth: AuthenticatedContext, spaceId: string, name: ViewName): {
        view: string;
        items: any[];
    };
}
//# sourceMappingURL=search-service.d.ts.map