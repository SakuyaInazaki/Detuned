import { PostRevisionContentPage, PostRevisionReadQuery } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
/** Fixed stored content projection; current visibility and metadata are checked on every page. */
export declare class PostRevisionReadService {
    private readonly storage;
    private readonly signer;
    private readonly authService;
    private readonly secret;
    private readonly clock;
    constructor(storage: StoragePort, signer: TokenSignerPort, authService: AuthService, secret: string, clock: ClockPort);
    getRevision(auth: AuthenticatedContext, spaceId: string, postId: string, revision: number, query: PostRevisionReadQuery, budget: {
        request_id: string;
    }): PostRevisionContentPage;
}
//# sourceMappingURL=post-revision-read-service.d.ts.map