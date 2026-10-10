import { CONTEXT_BYTES, serializeThreadPostsEnvelope, LIST_LIMIT, THREAD_POST_LIMIT, THREAD_STATES, integerQueryOptions, isNonblankString } from '@detuned/protocol';
import { CreateThreadRequestSchema, PatchThreadRequestSchema, DetunedError, ErrorCode, } from '@detuned/protocol';
import { parseIntegerQuery, parseStringQuery, validateAllowedQueryParams } from '../utils/query.js';
export const threadRoutes = async (app) => {
    const threadService = app.threadService;
    const authService = app.authService;
    const storage = app.storage;
    const threadPostsReadService = app.threadPostsReadService;
    app.get('/spaces/:space_id/threads/:id/posts', async (req, reply) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const query = req.query;
        validateAllowedQueryParams(query, ['limit', 'max_bytes', 'cursor', 'sort']);
        const limit = parseIntegerQuery(query.limit, 'limit', integerQueryOptions(THREAD_POST_LIMIT));
        const max_bytes = parseIntegerQuery(query.max_bytes, 'max_bytes', integerQueryOptions(CONTEXT_BYTES));
        const cursor = parseStringQuery(query.cursor, 'cursor', { allowEmpty: true });
        const sort = parseStringQuery(query.sort, 'sort');
        const page = threadPostsReadService.getPosts(auth, space_id, id, { limit, max_bytes, cursor, sort }, { request_id: req.id });
        return reply.type('application/json').send(serializeThreadPostsEnvelope(req.id, page));
    });
    app.get('/spaces/:space_id/threads', async (req) => {
        const auth = req.auth;
        const { space_id } = req.params;
        authService.requireSpaceAccess(auth, space_id, 'observer');
        const query = req.query;
        validateAllowedQueryParams(query, ['state', 'limit', 'cursor']);
        const limit = parseIntegerQuery(query?.limit, 'limit', integerQueryOptions(LIST_LIMIT)) ?? 20;
        const state = parseStringQuery(query?.state, 'state', { allowedValues: new Set(THREAD_STATES) });
        const cursor = parseStringQuery(query?.cursor, 'cursor');
        const result = storage.listThreads(space_id, state, limit, cursor);
        return {
            api_version: '1',
            request_id: req.id,
            data: result.threads,
            meta: {
                truncated: false,
                next_cursor: result.next_cursor,
            },
        };
    });
    app.post('/spaces/:space_id/threads', { schema: { body: CreateThreadRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
        if (!isNonblankString(key)) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const result = threadService.createThread(auth, space_id, body, key);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.get('/spaces/:space_id/threads/:id', async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        authService.requireSpaceAccess(auth, space_id, 'observer');
        const thread = storage.findThreadById(id);
        if (!thread || thread.space_id !== space_id) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在。', 404);
        }
        const query = req.query;
        validateAllowedQueryParams(query, ['limit', 'cursor']);
        const limit = parseIntegerQuery(query?.limit, 'limit', integerQueryOptions(THREAD_POST_LIMIT)) ?? 50;
        const cursor = parseStringQuery(query?.cursor, 'cursor');
        const postsResult = storage.listPostsInThread(id, limit, cursor);
        return {
            api_version: '1',
            request_id: req.id,
            data: {
                thread,
                posts: postsResult.posts,
            },
            meta: {
                truncated: false,
                next_cursor: postsResult.next_cursor,
            },
        };
    });
    app.patch('/spaces/:space_id/threads/:id', { schema: { body: PatchThreadRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const key = req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
        if (!isNonblankString(key)) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少必需的 Idempotency-Key 请求头。', 400);
        }
        const body = req.body;
        const updated = threadService.patchThread(auth, space_id, id, body, key);
        return {
            api_version: '1',
            request_id: req.id,
            data: updated,
        };
    });
};
//# sourceMappingURL=threads.js.map