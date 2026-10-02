import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SystemClock, CryptoIdGenerator, CryptoHasher, HmacTokenSigner, AuthService, IdempotencyService, SpaceService, ThreadService, PostService, RelationService, EventService, ContextService, SearchService, RedactionService, } from '@detuned/core';
import { DetunedError, ErrorCode } from '@detuned/protocol';
import { metaRoutes } from './routes/meta.js';
import { spaceRoutes } from './routes/spaces.js';
import { threadRoutes } from './routes/threads.js';
import { postRoutes } from './routes/posts.js';
import { relationRoutes } from './routes/relations.js';
import { eventRoutes } from './routes/events.js';
import { searchRoutes } from './routes/search.js';
import { adminRoutes } from './routes/admin.js';
export function buildApp(options) {
    const clock = options.clock ?? new SystemClock();
    const idGen = options.idGen ?? new CryptoIdGenerator();
    const hasher = options.hasher ?? new CryptoHasher();
    const tokenSigner = options.tokenSigner ?? new HmacTokenSigner();
    const tokenSecret = options.tokenSecret ??
        (typeof options.storage.getInstanceSecret === 'function'
            ? options.storage.getInstanceSecret()
            : (() => {
                throw new Error('实例未提供持久密钥且存储接口未实现 getInstanceSecret。');
            })());
    const authService = new AuthService(options.storage, hasher, clock);
    const idempotency = new IdempotencyService(options.storage, hasher, clock);
    const spaceService = new SpaceService(options.storage, idGen, clock, authService, idempotency);
    const threadService = new ThreadService(options.storage, idGen, clock, hasher, authService, idempotency);
    const postService = new PostService(options.storage, idGen, clock, hasher, authService, idempotency);
    const relationService = new RelationService(options.storage, idGen, clock, authService, idempotency);
    const eventService = new EventService(options.storage, idGen, clock, tokenSigner, authService, tokenSecret);
    const contextService = new ContextService(options.storage, tokenSigner, authService, tokenSecret);
    const searchService = new SearchService(options.storage, authService);
    const redactionService = new RedactionService(options.storage, idGen, clock, authService, idempotency);
    const app = Fastify({
        logger: false,
        ajv: {
            customOptions: {
                removeAdditional: false,
                useDefaults: true,
                coerceTypes: false,
                allErrors: true,
            },
        },
    });
    // Attach services to app instance
    app.storage = options.storage;
    app.clock = clock;
    app.idGen = idGen;
    app.hasher = hasher;
    app.tokenSigner = tokenSigner;
    app.tokenSecret = tokenSecret;
    app.authService = authService;
    app.spaceService = spaceService;
    app.threadService = threadService;
    app.postService = postService;
    app.relationService = relationService;
    app.eventService = eventService;
    app.contextService = contextService;
    app.searchService = searchService;
    app.redactionService = redactionService;
    app.register(cors);
    // Global Error Handler
    app.setErrorHandler((error, req, reply) => {
        if (error instanceof DetunedError) {
            reply.status(error.statusCode).send({
                api_version: '1',
                request_id: req.id,
                error: {
                    code: error.code,
                    message: error.message,
                    retryable: error.retryable,
                    details: error.details,
                },
            });
            return;
        }
        const anyErr = error;
        if (anyErr?.validation) {
            reply.status(400).send({
                api_version: '1',
                request_id: req.id,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: anyErr.message ?? '请求验证错误。',
                    retryable: false,
                    details: { issues: anyErr.validation },
                },
            });
            return;
        }
        if (typeof anyErr?.statusCode === 'number' &&
            anyErr.statusCode >= 400 &&
            anyErr.statusCode < 500) {
            const statusCode = anyErr.statusCode;
            const code = statusCode === 404
                ? ErrorCode.NOT_FOUND
                : statusCode === 401
                    ? ErrorCode.UNAUTHENTICATED
                    : statusCode === 403
                        ? ErrorCode.FORBIDDEN
                        : statusCode === 413
                            ? ErrorCode.PAYLOAD_TOO_LARGE
                            : ErrorCode.VALIDATION_ERROR;
            reply.status(statusCode).send({
                api_version: '1',
                request_id: req.id,
                error: {
                    code,
                    message: anyErr.message ?? '客户端请求错误。',
                    retryable: false,
                    details: anyErr.details,
                },
            });
            return;
        }
        reply.status(500).send({
            api_version: '1',
            request_id: req.id,
            error: {
                code: ErrorCode.TEMPORARILY_UNAVAILABLE,
                message: '服务器内部错误。',
                retryable: true,
            },
        });
    });
    // Auth Hook
    app.addHook('preHandler', async (req) => {
        // Skip auth for capabilities endpoint
        if (req.url.endsWith('/capabilities')) {
            return;
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '缺少或无效的 Authorization Bearer Token。', 401);
        }
        const token = authHeader.substring(7);
        const auth = authService.authenticateToken(token);
        req.auth = auth;
    });
    // Register API v1 routes
    app.register(async (v1) => {
        v1.register(metaRoutes);
        v1.register(spaceRoutes);
        v1.register(threadRoutes);
        v1.register(postRoutes);
        v1.register(relationRoutes);
        v1.register(eventRoutes);
        v1.register(searchRoutes);
        v1.register(adminRoutes);
    }, { prefix: '/api/v1' });
    return app;
}
//# sourceMappingURL=app.js.map