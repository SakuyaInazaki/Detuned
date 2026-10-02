import { FastifyPluginAsync } from 'fastify';
import {
  CreateRelationRequest,
  CreateRelationRequestSchema,
  ResolveRelationRequest,
  ResolveRelationRequestSchema,
  ReopenRelationRequest,
  ReopenRelationRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { RelationService, AuthenticatedContext } from '@detuned/core';

export const relationRoutes: FastifyPluginAsync = async (app) => {
  const relationService = (app as any).relationService as RelationService;

  app.post(
    '/spaces/:space_id/relations',
    { schema: { body: CreateRelationRequestSchema } },
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
      const body = req.body as CreateRelationRequest;

      const relation = relationService.createRelation(auth, space_id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: relation,
      };
    }
  );

  app.post(
    '/spaces/:space_id/relations/:id/resolve',
    { schema: { body: ResolveRelationRequestSchema } },
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
      const body = req.body as ResolveRelationRequest;

      const result = relationService.resolveChallenge(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.post(
    '/spaces/:space_id/relations/:id/reopen',
    { schema: { body: ReopenRelationRequestSchema } },
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
      const body = req.body as ReopenRelationRequest;

      const result = relationService.reopenChallenge(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );
};
