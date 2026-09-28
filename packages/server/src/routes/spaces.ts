import { FastifyPluginAsync } from 'fastify';
import {
  CreateSpaceRequest,
  CreateSpaceRequestSchema,
  PatchSpaceRequest,
  PatchSpaceRequestSchema,
  CreateSessionRequest,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { SpaceService, ContextService, AuthenticatedContext } from '@detuned/core';

export const spaceRoutes: FastifyPluginAsync = async (app) => {
  const spaceService = (app as any).spaceService as SpaceService;
  const contextService = (app as any).contextService as ContextService;
  const storage = (app as any).storage;

  app.get('/spaces', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const query = req.query as { limit?: string; cursor?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const result = storage.listVisibleSpaces(
      auth.actor.id,
      limit,
      query.cursor,
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
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
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
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
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

  app.post('/spaces/:space_id/sessions', async (req, reply) => {
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
  });

  app.get('/spaces/:space_id/context', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    const query = req.query as { max_bytes?: string; focus_thread_id?: string };

    const maxBytes = query.max_bytes ? parseInt(query.max_bytes, 10) : 12288;
    const { data, truncated } = contextService.getContext(auth, space_id, {
      max_bytes: maxBytes,
      focus_thread_id: query.focus_thread_id,
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
