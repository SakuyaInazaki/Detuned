import { CreateRelationRequestSchema, ResolveRelationRequestSchema, ReopenRelationRequestSchema, DetunedError, ErrorCode, } from '@detuned/protocol';
export const relationRoutes = async (app) => {
    const relationService = app.relationService;
    app.post('/spaces/:space_id/relations', { schema: { body: CreateRelationRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const relation = relationService.createRelation(auth, space_id, body, key);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: relation,
        };
    });
    app.post('/spaces/:space_id/relations/:id/resolve', { schema: { body: ResolveRelationRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const result = relationService.resolveChallenge(auth, space_id, id, body, key);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.post('/spaces/:space_id/relations/:id/reopen', { schema: { body: ReopenRelationRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const result = relationService.reopenChallenge(auth, space_id, id, body, key);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
};
//# sourceMappingURL=relations.js.map