import type { StoragePort } from '../ports/storage.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
export declare function authorizeCheck(storage: StoragePort, authService: AuthService, auth: AuthenticatedContext, spaceId: string, runId: string, fresh?: boolean, verifierOnly?: boolean): {
    current: AuthenticatedContext;
    run: import("@detuned/protocol").CheckRunRecord;
};
//# sourceMappingURL=check-authorization.d.ts.map