import { ThreadPostsPage, ThreadPostsReadQuery } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
/** Dynamic metadata directory: one consistent read snapshot per request, no cross-page frozen set. */
export declare class ThreadPostsReadService {
    private readonly storage;
    private readonly signer;
    private readonly authService;
    private readonly secret;
    private readonly clock;
    constructor(storage: StoragePort, signer: TokenSignerPort, authService: AuthService, secret: string, clock: ClockPort);
    getPosts(auth: AuthenticatedContext, spaceId: string, threadId: string, query: ThreadPostsReadQuery, budget: {
        request_id: string;
    }): ThreadPostsPage;
}
//# sourceMappingURL=thread-posts-read-service.d.ts.map