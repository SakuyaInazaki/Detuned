import { SpaceRevisionPage, SpaceRevisionReadQuery } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
/** Fixed objective/rules projection, not an export of private or future configuration. */
export declare class SpaceRevisionReadService {
    private readonly storage;
    private readonly signer;
    private readonly authService;
    private readonly secret;
    private readonly clock;
    constructor(storage: StoragePort, signer: TokenSignerPort, authService: AuthService, secret: string, clock: ClockPort);
    getRevision(auth: AuthenticatedContext, spaceId: string, revision: number, query: SpaceRevisionReadQuery, budget: {
        request_id: string;
    }): SpaceRevisionPage;
}
//# sourceMappingURL=space-revision-read-service.d.ts.map