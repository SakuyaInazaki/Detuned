import { serializePostRevisionCatalogEnvelope, serializePostRevisionArtifactsEnvelope, serializePostRevisionContentEnvelope, CONTEXT_BYTES, LIST_LIMIT, REVISION_QUERY, integerQueryOptions, isNonblankString } from '@detuned/protocol';
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
        if (!isNonblankString(key)) {
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
        const rev = parseIntegerQuery(query?.revision, 'revision', integerQueryOptions(REVISION_QUERY));
        const result = postService.getPost(auth, space_id, id, rev);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    const catalogService = app.postCatalogReadService;
    function catalogQuery(query) {
        validateAllowedQueryParams(query, ['limit', 'max_bytes', 'cursor']);
        return { limit: parseIntegerQuery(query.limit, 'limit', integerQueryOptions(LIST_LIMIT)),
            max_bytes: parseIntegerQuery(query.max_bytes, 'max_bytes', integerQueryOptions(CONTEXT_BYTES)),
            cursor: parseStringQuery(query.cursor, 'cursor', { allowEmpty: true }) };
    }
    app.get('/spaces/:space_id/posts/:id/revisions/catalog', async (req, reply) => {
        const { space_id, id } = req.params;
        const page = catalogService.getRevisions(req.auth, space_id, id, catalogQuery(req.query), { request_id: req.id });
        return reply.type('application/json; charset=utf-8').send(serializePostRevisionCatalogEnvelope(req.id, page));
    });
    app.get('/spaces/:space_id/posts/:id/revisions/:revision/artifacts', async (req, reply) => {
        const { space_id, id, revision: rawRevision } = req.params;
        const revision = parseIntegerQuery(rawRevision, 'revision', { required: true, min: 1, max: Number.MAX_SAFE_INTEGER });
        const page = catalogService.getArtifacts(req.auth, space_id, id, revision, catalogQuery(req.query), { request_id: req.id });
        return reply.type('application/json; charset=utf-8').send(serializePostRevisionArtifactsEnvelope(req.id, page));
    });
    app.get('/spaces/:space_id/posts/:id/revisions/:revision', async (req, reply) => {
        const auth = req.auth;
        const { space_id, id, revision: rawRevision } = req.params;
        const revision = parseIntegerQuery(rawRevision, 'revision', { required: true, min: 1, max: Number.MAX_SAFE_INTEGER });
        const query = req.query;
        validateAllowedQueryParams(query, ['max_bytes', 'cursor']);
        const maxBytes = parseIntegerQuery(query.max_bytes, 'max_bytes', integerQueryOptions(CONTEXT_BYTES));
        const cursor = parseStringQuery(query.cursor, 'cursor', { allowEmpty: true });
        const service = app.postRevisionReadService;
        const page = service.getRevision(auth, space_id, id, revision, { max_bytes: maxBytes, cursor }, { request_id: req.id });
        return reply.type('application/json; charset=utf-8').send(serializePostRevisionContentEnvelope(req.id, page));
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
        const limit = parseIntegerQuery(query?.limit, 'limit', integerQueryOptions(LIST_LIMIT)) ?? 20;
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
        if (!isNonblankString(key)) {
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
        if (!isNonblankString(key)) {
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