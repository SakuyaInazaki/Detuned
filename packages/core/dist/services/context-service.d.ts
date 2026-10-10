import { ContextQuery, ContextPage } from '@detuned/protocol';
import { ClockPort } from '../ports/clock.js';
import { StoragePort } from '../ports/storage.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
export declare class ContextService {
    private readonly storage;
    private readonly tokenSigner;
    private readonly authService;
    private readonly tokenSecret;
    private readonly clock;
    constructor(storage: StoragePort, tokenSigner: TokenSignerPort, authService: AuthService, tokenSecret: string, clock?: ClockPort);
    getContext(auth: AuthenticatedContext, spaceId: string, query: ContextQuery, budget: {
        request_id: string;
    }): ContextPage;
}
//# sourceMappingURL=context-service.d.ts.map