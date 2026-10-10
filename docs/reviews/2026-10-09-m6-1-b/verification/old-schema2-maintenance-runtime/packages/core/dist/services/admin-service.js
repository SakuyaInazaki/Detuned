import { randomBytes, createHash } from 'node:crypto';
import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Administration authorization and mutation belong to the shared business layer. */
export class AdminService {
    storage;
    idGen;
    clock;
    authService;
    limiter;
    constructor(storage, idGen, clock, authService, limiter = authService.writeRateLimiter) {
        this.storage = storage;
        this.idGen = idGen;
        this.clock = clock;
        this.authService = authService;
        this.limiter = limiter;
    }
    createActor(auth, body) {
        this.authService.requireInstanceAdmin(auth);
        this.limiter.admit(auth.actor.id);
        const actorId = this.idGen.generateId('act');
        const now = this.clock.nowIso();
        const actor = {
            id: actorId,
            kind: body.kind,
            display_name: body.display_name,
            created_at: now,
            disabled_at: null,
        };
        this.storage.createActor(actor);
        return actor;
    }
    createCredential(auth, body) {
        this.authService.requireInstanceAdmin(auth);
        const actor = this.storage.findActorById(body.actor_id);
        if (!actor) {
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Actor 不存在。', 404);
        }
        this.limiter.admit(auth.actor.id);
        const rawToken = `detuned_tok_${randomBytes(24).toString('hex')}`;
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        const credId = this.idGen.generateId('crd');
        const now = this.clock.nowIso();
        const credential = {
            id: credId,
            actor_id: body.actor_id,
            token_hash: tokenHash,
            allowed_space_ids: body.allowed_space_ids ?? ['*'],
            capabilities: body.capabilities ?? ['read', 'write'],
            expires_at: body.expires_at ?? null,
            revoked_at: null,
            created_at: now,
        };
        this.storage.createCredential(credential);
        return { credential_id: credId, actor_id: body.actor_id, token: rawToken };
    }
    createMembership(auth, space_id, body) {
        this.authService.requireSpaceAccess(auth, space_id, 'owner');
        const actor = this.storage.findActorById(body.actor_id);
        if (!actor) {
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Actor 不存在。', 404);
        }
        this.limiter.admit(auth.actor.id);
        const membership = {
            space_id,
            actor_id: body.actor_id,
            role: body.role,
            active: true,
            reviewer_eligible: body.reviewer_eligible ?? true,
            independence_group: body.independence_group ?? null,
        };
        this.storage.upsertMembership(membership);
        return membership;
    }
    patchMembership(auth, space_id, actor_id, body) {
        this.authService.requireSpaceAccess(auth, space_id, 'owner');
        const existing = this.storage.getMembership(space_id, actor_id);
        if (!existing) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '成员关系不存在。', 404);
        }
        this.limiter.admit(auth.actor.id);
        const updated = {
            space_id,
            actor_id,
            role: body.role ?? existing.role,
            active: body.active !== undefined ? body.active : existing.active,
            reviewer_eligible: body.reviewer_eligible !== undefined ? body.reviewer_eligible : existing.reviewer_eligible,
            independence_group: body.independence_group !== undefined ? body.independence_group : existing.independence_group,
        };
        this.storage.upsertMembership(updated);
        return updated;
    }
    deactivateMembership(auth, space_id, actor_id) {
        this.authService.requireSpaceAccess(auth, space_id, 'owner');
        const existing = this.storage.getMembership(space_id, actor_id);
        if (!existing) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '成员关系不存在。', 404);
        }
        this.limiter.admit(auth.actor.id);
        this.storage.upsertMembership({
            ...existing,
            active: false,
        });
        return { deactivated: true };
    }
    revokeCredential(auth, id) {
        this.authService.requireInstanceAdmin(auth);
        const cred = this.storage.findCredentialById(id);
        if (!cred) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '凭据不存在。', 404);
        }
        this.limiter.admit(auth.actor.id);
        this.storage.revokeCredential(id, this.clock.nowIso());
        return { revoked: true };
    }
}
//# sourceMappingURL=admin-service.js.map