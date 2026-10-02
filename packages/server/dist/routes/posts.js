import { CreatePostRequestSchema, CreatePostRevisionRequestSchema, WithdrawPostRequestSchema, DetunedError, ErrorCode, } from '@detuned/protocol';
import { parseIntegerQuery, parseStringQuery, validateAllowedQueryParams } from '../utils/query.js';
export const postRoutes = async (app) => {
    const postService = app.postService;
    const authService = app.authService;
    const storage = app.storage;
    app.post('/spaces/:space_id/threads/:id/posts', { schema: { body: CreatePostRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.body?.request_key;
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const result = postService.createPost(auth, space_id, id, body, key);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.get('/spaces/:space_id/posts/:id', async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const query = req.query;
        validateAllowedQueryParams(query, ['revision']);
        const rev = parseIntegerQuery(query?.revision, 'revision', { min: 1 });
        const result = postService.getPost(auth, space_id, id, rev);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.get('/spaces/:space_id/posts/:id/revisions', async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        authService.requireSpaceAccess(auth, space_id, 'observer');
        const post = storage.findPostById(id);
        if (!post || post.space_id !== space_id) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '帖子不存在。', 404);
        }
        const query = req.query;
        validateAllowedQueryParams(query, ['limit', 'cursor']);
        const limit = parseIntegerQuery(query?.limit, 'limit', { min: 1, max: 100, defaultValue: 20 }) ?? 20;
        const cursor = parseStringQuery(query?.cursor, 'cursor');
        const result = storage.listPostRevisions(id, limit, cursor);
        return {
            api_version: '1',
            request_id: req.id,
            data: result.revisions,
            meta: {
                truncated: false,
                next_cursor: result.next_cursor,
            },
        };
    });
    app.post('/spaces/:space_id/posts/:id/revisions', { schema: { body: CreatePostRevisionRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.body?.request_key;
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const result = postService.createRevision(auth, space_id, id, body, key);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.post('/spaces/:space_id/posts/:id/withdraw', { schema: { body: WithdrawPostRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.body?.request_key;
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const post = postService.withdrawPost(auth, space_id, id, body, key);
        return {
            api_version: '1',
            request_id: req.id,
            data: post,
        };
    });
};
//# sourceMappingURL=posts.js.map