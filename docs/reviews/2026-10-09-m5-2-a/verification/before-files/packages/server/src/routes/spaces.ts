import { serializeContextEnvelope, serializeSpaceRevisionEnvelope } from '@detuned/protocol';
import { LIST_LIMIT, CONTEXT_BYTES, integerQueryOptions, isNonblankString } from '@detuned/protocol';
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
import { SpaceService, ContextService, SpaceRevisionReadService, AuthenticatedContext } from '@detuned/core';
import { parseIntegerQuery, parseStringQuery, validateAllowedQueryParams } from '../utils/query.js';

export const spaceRoutes: FastifyPluginAsync = async (app) => {
  const spaceService = (app as any).spaceService as SpaceService;
  const contextService = (app as any).contextService as ContextService;
  const storage = (app as any).storage;

  app.get('/spaces', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const query = req.query as { limit?: unknown; cursor?: unknown };
    validateAllowedQueryParams(query, ['limit', 'cursor']);
    const limit = parseIntegerQuery(query?.limit, 'limit', integerQueryOptions(LIST_LIMIT)) ?? 20;
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
      if (!isNonblankString(key)) {
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
      if (!isNonblankString(key)) {
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

  app.get('/spaces/:space_id/revisions/:revision', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, revision: rawRevision } = req.params as { space_id: string; revision: string };
    const revision = parseIntegerQuery(rawRevision, 'revision', { required: true, min: 1, max: Number.MAX_SAFE_INTEGER })!;
    const query = req.query as { max_bytes?: unknown; cursor?: unknown };
    validateAllowedQueryParams(query, ['max_bytes', 'cursor']);
    const maxBytes = parseIntegerQuery(query.max_bytes, 'max_bytes', integerQueryOptions(CONTEXT_BYTES));
    const cursor = parseStringQuery(query.cursor, 'cursor', { allowEmpty: true });
    const service = (app as any).spaceRevisionReadService as SpaceRevisionReadService;
    const page = service.getRevision(auth, space_id, revision, { max_bytes: maxBytes, cursor }, { request_id: req.id });
    return reply.type('application/json; charset=utf-8').send(serializeSpaceRevisionEnvelope(req.id, page));
  });

  app.get('/spaces/:space_id/context', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    const query = req.query as { max_bytes?: unknown; focus_thread_id?: unknown };
    validateAllowedQueryParams(query, ['max_bytes', 'focus_thread_id']);

    const maxBytes = parseIntegerQuery(query?.max_bytes, 'max_bytes', integerQueryOptions(CONTEXT_BYTES)) ?? 12288;
    const focusThreadId = parseStringQuery(query?.focus_thread_id, 'focus_thread_id', { allowEmpty: true });
    const page = contextService.getContext(auth, space_id, {
      max_bytes: maxBytes,
      focus_thread_id: focusThreadId,
    }, { request_id: req.id });

    // Send the same compact encoding used by core; transport never trims facts.
    return reply.type('application/json; charset=utf-8').send(serializeContextEnvelope(req.id, page));
  });
};
