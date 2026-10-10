import { type PostRevisionCatalogQuery, type RevisionArtifactsQuery, type PostRevisionCatalogPage, type PostRevisionArtifactsPage } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
/** Dynamic directories: one synchronous snapshot per page, never a full content read. */
export declare class PostCatalogReadService {
    private readonly storage;
    private readonly signer;
    private readonly authService;
    private readonly secret;
    private readonly clock;
    constructor(storage: StoragePort, signer: TokenSignerPort, authService: AuthService, secret: string, clock: ClockPort);
    private currentPost;
    private timing;
    getRevisions(auth: AuthenticatedContext, spaceId: string, postId: string, query: PostRevisionCatalogQuery, budget: {
        request_id: string;
    }): PostRevisionCatalogPage;
    getArtifacts(auth: AuthenticatedContext, spaceId: string, postId: string, revision: number, query: RevisionArtifactsQuery, budget: {
        request_id: string;
    }): PostRevisionArtifactsPage;
}
//# sourceMappingURL=post-catalog-read-service.d.ts.map