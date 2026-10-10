import { DetunedError, ErrorCode, CreateActorRequestSchema, CreateCredentialRequestSchema, CreateMembershipRequestSchema, PatchMembershipRequestSchema, CreateRedactionRequestSchema, } from '@detuned/protocol';
import { validateNoBody } from '../utils/query.js';
export const adminRoutes = async (app) => {
    const adminService = app.adminService;
    const redactionService = app.redactionService;
    app.post('/admin/actors', { schema: { body: CreateActorRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const actor = adminService.createActor(auth, req.body);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: actor,
        };
    });
    app.post('/admin/credentials', { schema: { body: CreateCredentialRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const data = adminService.createCredential(auth, req.body);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data,
        };
    });
    app.post('/spaces/:space_id/memberships', { schema: { body: CreateMembershipRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id } = req.params;
        const membership = adminService.createMembership(auth, space_id, req.body);
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
        const updated = adminService.patchMembership(auth, space_id, actor_id, req.body);
        return {
            api_version: '1',
            request_id: req.id,
            data: updated,
        };
    });
    app.delete('/spaces/:space_id/memberships/:actor_id', async (req) => {
        validateNoBody(req.body, 'Delete membership');
        const auth = req.auth;
        const { space_id, actor_id } = req.params;
        const data = adminService.deactivateMembership(auth, space_id, actor_id);
        return {
            api_version: '1',
            request_id: req.id,
            data,
        };
    });
    app.post('/admin/credentials/:id/revoke', async (req) => {
        validateNoBody(req.body, 'Revoke credential');
        const auth = req.auth;
        const { id } = req.params;
        const data = adminService.revokeCredential(auth, id);
        return {
            api_version: '1',
            request_id: req.id,
            data,
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