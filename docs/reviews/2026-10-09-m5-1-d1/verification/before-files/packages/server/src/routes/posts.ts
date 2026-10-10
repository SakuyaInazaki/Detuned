import { serializePostRevisionContentEnvelope, CONTEXT_BYTES, LIST_LIMIT, REVISION_QUERY, integerQueryOptions, isNonblankString } from '@detuned/protocol';
import { FastifyPluginAsync } from 'fastify';
import {
  CreatePostRequest,
  CreatePostRequestSchema,
  CreatePostRevisionRequest,
  CreatePostRevisionRequestSchema,
  WithdrawPostRequest,
  WithdrawPostRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { PostRevisionReadService, PostService, AuthenticatedContext, AuthService } from '@detuned/core';
import { parseIntegerQuery, parseStringQuery, validateAllowedQueryParams } from '../utils/query.js';

export const postRoutes: FastifyPluginAsync = async (app) => {
  const postService = (app as any).postService as PostService;
  const authService = (app as any).authService as AuthService;
  const storage = (app as any).storage;

  app.post(
    '/spaces/:space_id/threads/:id/posts',
    { schema: { body: CreatePostRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
      if (!isNonblankString(key)) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreatePostRequest;

      const result = postService.createPost(auth, space_id, id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.get('/spaces/:space_id/posts/:id', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    const query = req.query as { revision?: unknown };
    validateAllowedQueryParams(query, ['revision']);
    const rev = parseIntegerQuery(query?.revision, 'revision', integerQueryOptions(REVISION_QUERY));

    const result = postService.getPost(auth, space_id, id, rev);
    return {
      api_version: '1',
      request_id: req.id,
      data: result,
    };
  });

  app.get('/spaces/:space_id/posts/:id/revisions/:revision', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id, revision: rawRevision } = req.params as { space_id: string; id: string; revision: string };
    const revision = parseIntegerQuery(rawRevision, 'revision', { required: true, min: 1, max: Number.MAX_SAFE_INTEGER })!;
    const query = req.query as { max_bytes?: unknown; cursor?: unknown };
    validateAllowedQueryParams(query, ['max_bytes', 'cursor']);
    const maxBytes = parseIntegerQuery(query.max_bytes, 'max_bytes', integerQueryOptions(CONTEXT_BYTES));
    const cursor = parseStringQuery(query.cursor, 'cursor', { allowEmpty: true });
    const service = (app as any).postRevisionReadService as PostRevisionReadService;
    const page = service.getRevision(auth, space_id, id, revision, { max_bytes: maxBytes, cursor }, { request_id: req.id });
    return reply.type('application/json; charset=utf-8').send(serializePostRevisionContentEnvelope(req.id, page));
  });

  app.get('/spaces/:space_id/posts/:id/revisions', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    authService.requireSpaceAccess(auth, space_id, 'observer');

    const post = storage.findPostById(id);
    if (!post || post.space_id !== space_id) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '帖子不存在。', 404);
    }

    const query = req.query as { limit?: unknown; cursor?: unknown };
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

  app.post(
    '/spaces/:space_id/posts/:id/revisions',
    { schema: { body: CreatePostRevisionRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
      if (!isNonblankString(key)) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreatePostRevisionRequest;

      const result = postService.createRevision(auth, space_id, id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.post(
    '/spaces/:space_id/posts/:id/withdraw',
    { schema: { body: WithdrawPostRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
      if (!isNonblankString(key)) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as WithdrawPostRequest;

      const post = postService.withdrawPost(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: post,
      };
    }
  );
};
