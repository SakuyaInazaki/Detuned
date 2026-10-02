import { ContextQuery, ContextResponseData } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
export declare class ContextService {
    private readonly storage;
    private readonly tokenSigner;
    private readonly authService;
    private readonly tokenSecret;
    constructor(storage: StoragePort, tokenSigner: TokenSignerPort, authService: AuthService, tokenSecret: string);
    getContext(auth: AuthenticatedContext, spaceId: string, query: ContextQuery): {
        data: ContextResponseData;
        truncated: boolean;
    };
}
//# sourceMappingURL=context-service.d.ts.map