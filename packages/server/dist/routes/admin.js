import { randomBytes, createHash } from 'node:crypto';
import { DetunedError, ErrorCode, CreateActorRequestSchema, CreateCredentialRequestSchema, CreateMembershipRequestSchema, PatchMembershipRequestSchema, CreateRedactionRequestSchema, } from '@detuned/protocol';
export const adminRoutes = async (app) => {
    const authService = app.authService;
    const storage = app.storage;
    const idGen = app.idGen;
    const clock = app.clock;
    const redactionService = app.redactionService;
    app.post('/admin/actors', { schema: { body: CreateActorRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        authService.requireInstanceAdmin(auth);
        const body = req.body;
        const actorId = idGen.generateId('act');
        const now = clock.nowIso();
        const actor = {
            id: actorId,
            kind: body.kind,
            display_name: body.display_name,
            created_at: now,
            disabled_at: null,
        };
        storage.createActor(actor);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: actor,
        };
    });
    app.post('/admin/credentials', { schema: { body: CreateCredentialRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        authService.requireInstanceAdmin(auth);
        const body = req.body;
        const actor = storage.findActorById(body.actor_id);
        if (!actor) {
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Actor 不存在。', 404);
        }
        const rawToken = `detuned_tok_${randomBytes(24).toString('hex')}`;
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        const credId = idGen.generateId('crd');
        const now = clock.nowIso();
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
        storage.createCredential(credential);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: {
                credential_id: credId,
                actor_id: body.actor_id,
                token: rawToken, // Returned only once at creation!
            },
        };
    });
    const validRoles = ['observer', 'contributor', 'maintainer', 'owner'];
    app.post('/spaces/:space_id/memberships', { schema: { body: CreateMembershipRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id } = req.params;
        authService.requireSpaceAccess(auth, space_id, 'owner');
        const body = req.body;
        const actor = storage.findActorById(body.actor_id);
        if (!actor) {
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Actor 不存在。', 404);
        }
        const membership = {
            space_id,
            actor_id: body.actor_id,
            role: body.role,
            active: true,
            reviewer_eligible: body.reviewer_eligible ?? true,
            independence_group: body.independence_group ?? null,
        };
        storage.upsertMembership(membership);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: membership,
        };
    });
    app.patch('/spaces/:space_id/memberships/:actor_id', { schema: { body: PatchMembershipRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, actor_id } = req.params;
        authService.requireSpaceAccess(auth, space_id, 'owner');
        const existing = storage.getMembership(space_id, actor_id);
        if (!existing) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '成员关系不存在。', 404);
        }
        const body = req.body;
        const updated = {
            space_id,
            actor_id,
            role: body.role ?? existing.role,
            active: body.active !== undefined ? body.active : existing.active,
            reviewer_eligible: body.reviewer_eligible !== undefined ? body.reviewer_eligible : existing.reviewer_eligible,
            independence_group: body.independence_group !== undefined ? body.independence_group : existing.independence_group,
        };
        storage.upsertMembership(updated);
        return {
            api_version: '1',
            request_id: req.id,
            data: updated,
        };
    });
    app.delete('/spaces/:space_id/memberships/:actor_id', async (req) => {
        const auth = req.auth;
        const { space_id, actor_id } = req.params;
        authService.requireSpaceAccess(auth, space_id, 'owner');
        const existing = storage.getMembership(space_id, actor_id);
        if (!existing) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '成员关系不存在。', 404);
        }
        storage.upsertMembership({
            ...existing,
            active: false,
        });
        return {
            api_version: '1',
            request_id: req.id,
            data: { deactivated: true },
        };
    });
    app.post('/admin/credentials/:id/revoke', async (req) => {
        const auth = req.auth;
        authService.requireInstanceAdmin(auth);
        if (req.body !== undefined && req.body !== null) {
            if (typeof req.body !== 'object' ||
                Array.isArray(req.body) ||
                Object.keys(req.body).length > 0) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Revoke 操作不接受请求体参数。', 400);
            }
        }
        const { id } = req.params;
        const cred = storage.findCredentialById(id);
        if (!cred) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '凭据不存在。', 404);
        }
        storage.revokeCredential(id, clock.nowIso());
        return {
            api_version: '1',
            request_id: req.id,
            data: { revoked: true },
        };
    });
    app.post('/spaces/:space_id/redactions', { schema: { body: CreateRedactionRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const result = redactionService.createRedaction(auth, space_id, body, key);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: result.data,
        };
    });
};
//# sourceMappingURL=admin.js.map