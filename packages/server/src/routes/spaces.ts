import { FastifyPluginAsync } from 'fastify';
import {
  CreateSpaceRequest,
  CreateSpaceRequestSchema,
  PatchSpaceRequest,
  PatchSpaceRequestSchema,
  CreateSessionRequest,
  CreateSessionRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { SpaceService, ContextService, AuthenticatedContext } from '@detuned/core';
import { parseIntegerQuery, parseStringQuery, validateAllowedQueryParams } from '../utils/query.js';

export const spaceRoutes: FastifyPluginAsync = async (app) => {
  const spaceService = (app as any).spaceService as SpaceService;
  const contextService = (app as any).contextService as ContextService;
  const storage = (app as any).storage;

  app.get('/spaces', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const query = req.query as { limit?: unknown; cursor?: unknown };
    validateAllowedQueryParams(query, ['limit', 'cursor']);
    const limit = parseIntegerQuery(query?.limit, 'limit', { min: 1, max: 100, defaultValue: 20 }) ?? 20;
    const cursor = parseStringQuery(query?.cursor, 'cursor');

    const result = storage.listVisibleSpaces(
      auth.actor.id,
      limit,
      cursor,
      auth.credential.allowed_space_ids
    );
    return {
      api_version: '1',
      request_id: req.id,
      data: result.spaces,
      meta: {
        truncated: false,
        next_cursor: result.next_cursor,
      },
    };
  });

  app.post(
    '/spaces',
    { schema: { body: CreateSpaceRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const key = (req.headers['idempotency-key'] as string) ?? (req.headers['Idempotency-Key'] as string);
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreateSpaceRequest;

      const result = spaceService.createSpace(auth, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.patch(
    '/spaces/:space_id',
    { schema: { body: PatchSpaceRequestSchema } },
    async (req) => {
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
      const body = req.body as PatchSpaceRequest;

      const result = spaceService.patchSpace(auth, space_id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.post(
    '/spaces/:space_id/sessions',
    { schema: { body: CreateSessionRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id } = req.params as { space_id: string };
      const body = req.body as CreateSessionRequest;

      const session = spaceService.createSession(auth, space_id, body);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: session,
      };
    }
  );

  app.get('/spaces/:space_id/context', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    const query = req.query as { max_bytes?: unknown; focus_thread_id?: unknown };
    validateAllowedQueryParams(query, ['max_bytes', 'focus_thread_id']);

    const maxBytes = parseIntegerQuery(query?.max_bytes, 'max_bytes', { min: 4096, max: 65536, defaultValue: 12288 }) ?? 12288;
    const focusThreadId = parseStringQuery(query?.focus_thread_id, 'focus_thread_id');
    const { data, truncated } = contextService.getContext(auth, space_id, {
      max_bytes: maxBytes,
      focus_thread_id: focusThreadId,
    });

    return {
      api_version: '1',
      request_id: req.id,
      data,
      meta: {
        truncated,
        next_cursor: null,
      },
    };
  });
};
