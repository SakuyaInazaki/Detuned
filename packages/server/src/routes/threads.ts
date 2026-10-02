import { FastifyPluginAsync } from 'fastify';
import {
  CreateThreadRequest,
  CreateThreadRequestSchema,
  PatchThreadRequest,
  PatchThreadRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { ThreadService, AuthenticatedContext, AuthService } from '@detuned/core';
import { parseIntegerQuery, parseStringQuery, validateAllowedQueryParams } from '../utils/query.js';

export const threadRoutes: FastifyPluginAsync = async (app) => {
  const threadService = (app as any).threadService as ThreadService;
  const authService = (app as any).authService as AuthService;
  const storage = (app as any).storage;

  app.get('/spaces/:space_id/threads', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    authService.requireSpaceAccess(auth, space_id, 'observer');

    const query = req.query as { state?: unknown; limit?: unknown; cursor?: unknown };
    validateAllowedQueryParams(query, ['state', 'limit', 'cursor']);
    const limit = parseIntegerQuery(query?.limit, 'limit', { min: 1, max: 100, defaultValue: 20 }) ?? 20;
    const state = parseStringQuery(query?.state, 'state', { allowedValues: new Set(['open', 'archived']) });
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

  app.post(
    '/spaces/:space_id/threads',
    { schema: { body: CreateThreadRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id } = req.params as { space_id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.headers['Idempotency-Key'] as string);
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreateThreadRequest;

      const result = threadService.createThread(auth, space_id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.get('/spaces/:space_id/threads/:id', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    authService.requireSpaceAccess(auth, space_id, 'observer');

    const thread = storage.findThreadById(id);
    if (!thread || thread.space_id !== space_id) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '主题不存在。', 404);
    }

    const query = req.query as { limit?: unknown; cursor?: unknown };
    validateAllowedQueryParams(query, ['limit', 'cursor']);
    const limit = parseIntegerQuery(query?.limit, 'limit', { min: 1, max: 100, defaultValue: 50 }) ?? 50;
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

  app.patch(
    '/spaces/:space_id/threads/:id',
    { schema: { body: PatchThreadRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.headers['Idempotency-Key'] as string);
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as PatchThreadRequest;

      const updated = threadService.patchThread(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: updated,
      };
    }
  );
};
