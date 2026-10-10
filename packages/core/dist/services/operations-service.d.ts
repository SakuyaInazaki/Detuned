import { type OperationsDiagnostics } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
/** Health is a sampled hint; administrator diagnostics never confer research permissions. */
export declare class OperationsService {
    private readonly storage;
    private readonly auth;
    private draining;
    constructor(storage: StoragePort, auth: AuthService);
    beginDraining(): void;
    getReadiness(): boolean;
    getDiagnostics(context: AuthenticatedContext): OperationsDiagnostics;
}
//# sourceMappingURL=operations-service.d.ts.map