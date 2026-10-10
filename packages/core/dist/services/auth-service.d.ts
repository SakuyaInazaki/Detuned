import { Actor, MeResponse, Credential, Membership, SpaceRole } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';
import { WriteRateLimiter } from './write-rate-limiter.js';
export interface AuthenticatedContext {
    actor: Actor;
    credential: Credential;
}
export interface SpaceAuthContext extends AuthenticatedContext {
    membership: Membership;
    spaceRole: SpaceRole;
}
export declare class AuthService {
    private readonly storage;
    private readonly hasher;
    private readonly clock;
    readonly writeRateLimiter: WriteRateLimiter;
    constructor(storage: StoragePort, hasher: HasherPort, clock: ClockPort, writeRateLimiter?: WriteRateLimiter);
    authenticateToken(rawToken: string): AuthenticatedContext;
    /** Reload persisted identity and credential before an asynchronous operation commits. */
    refreshContext(auth: AuthenticatedContext): AuthenticatedContext;
    getMe(auth: AuthenticatedContext): MeResponse;
    requireOrdinaryAccess(auth: AuthenticatedContext): void;
    private validateVerificationCredential;
    requireInstanceAdmin(auth: AuthenticatedContext): void;
    requireSpaceAccess(auth: AuthenticatedContext, spaceId: string, minimumRole?: SpaceRole, operation?: 'read' | 'write'): SpaceAuthContext;
}
//# sourceMappingURL=auth-service.d.ts.map