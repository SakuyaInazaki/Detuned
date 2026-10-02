import { Actor, Credential, Membership, SpaceRole } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';
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
    constructor(storage: StoragePort, hasher: HasherPort, clock: ClockPort);
    authenticateToken(rawToken: string): AuthenticatedContext;
    requireInstanceAdmin(auth: AuthenticatedContext): void;
    requireSpaceAccess(auth: AuthenticatedContext, spaceId: string, minimumRole?: SpaceRole): SpaceAuthContext;
}
//# sourceMappingURL=auth-service.d.ts.map