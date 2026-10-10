import { type CreateActorRequest, type CreateCredentialRequest, type CreateMembershipRequest, type PatchMembershipRequest } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import type { IdGeneratorPort } from '../ports/id-generator.js';
import type { ClockPort } from '../ports/clock.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
import { WriteRateLimiter } from './write-rate-limiter.js';
/** Administration authorization and mutation belong to the shared business layer. */
export declare class AdminService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly authService;
    private readonly limiter;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, authService: AuthService, limiter?: WriteRateLimiter);
    createActor(auth: AuthenticatedContext, body: CreateActorRequest): {
        id: string;
        kind: "human" | "agent" | "service";
        display_name: string;
        created_at: string;
        disabled_at: null;
    };
    createCredential(auth: AuthenticatedContext, body: CreateCredentialRequest): {
        credential_id: string;
        actor_id: string;
        token: string;
    };
    createMembership(auth: AuthenticatedContext, space_id: string, body: CreateMembershipRequest): {
        space_id: string;
        actor_id: string;
        role: "owner" | "maintainer" | "contributor" | "observer";
        active: boolean;
        reviewer_eligible: boolean;
        independence_group: string | null;
    };
    patchMembership(auth: AuthenticatedContext, space_id: string, actor_id: string, body: PatchMembershipRequest): {
        space_id: string;
        actor_id: string;
        role: "owner" | "maintainer" | "contributor" | "observer";
        active: boolean;
        reviewer_eligible: boolean;
        independence_group: string | null;
    };
    deactivateMembership(auth: AuthenticatedContext, space_id: string, actor_id: string): {
        deactivated: boolean;
    };
    revokeCredential(auth: AuthenticatedContext, id: string): {
        revoked: boolean;
    };
}
//# sourceMappingURL=admin-service.d.ts.map