import { FastifyPluginAsync } from 'fastify';
import {
  DetunedError,
  ErrorCode,
  CreateActorRequest,
  CreateActorRequestSchema,
  CreateCredentialRequest,
  CreateCredentialRequestSchema,
  CreateMembershipRequest,
  CreateMembershipRequestSchema,
  PatchMembershipRequest,
  PatchMembershipRequestSchema,
  CreateRedactionRequest,
  CreateRedactionRequestSchema,
} from '@detuned/protocol';
import { AdminService, AuthenticatedContext } from '@detuned/core';
import { validateNoBody } from '../utils/query.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminService = (app as any).adminService as AdminService;
  const redactionService = (app as any).redactionService;

  app.post(
    '/admin/actors',
    { schema: { body: CreateActorRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const actor = adminService.createActor(auth, req.body as CreateActorRequest);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: actor,
      };
    }
  );

  app.post(
    '/admin/credentials',
    { schema: { body: CreateCredentialRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const data = adminService.createCredential(auth, req.body as CreateCredentialRequest);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data,
      };
    }
  );

  app.post(
    '/spaces/:space_id/memberships',
    { schema: { body: CreateMembershipRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id } = req.params as { space_id: string };
      const membership = adminService.createMembership(auth, space_id, req.body as CreateMembershipRequest);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: membership,
      };
    }
  );

  app.patch(
    '/spaces/:space_id/memberships/:actor_id',
    { schema: { body: PatchMembershipRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, actor_id } = req.params as { space_id: string; actor_id: string };
      const updated = adminService.patchMembership(auth, space_id, actor_id, req.body as PatchMembershipRequest);
      return {
        api_version: '1',
        request_id: req.id,
        data: updated,
      };
    }
  );

  app.delete('/spaces/:space_id/memberships/:actor_id', async (req) => {
    validateNoBody(req.body, 'Delete membership');
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, actor_id } = req.params as { space_id: string; actor_id: string };
    const data = adminService.deactivateMembership(auth, space_id, actor_id);

    return {
      api_version: '1',
      request_id: req.id,
      data,
    };
  });

  app.post('/admin/credentials/:id/revoke', async (req) => {
    validateNoBody(req.body, 'Revoke credential');
    const auth = (req as any).auth as AuthenticatedContext;
    const { id } = req.params as { id: string };
    const data = adminService.revokeCredential(auth, id);
    return {
      api_version: '1',
      request_id: req.id,
      data,
    };
  });

  app.post(
    '/spaces/:space_id/redactions',
    { schema: { body: CreateRedactionRequestSchema } },
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

      const body = req.body as CreateRedactionRequest;

      const result = redactionService.createRedaction(auth, space_id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result.data,
      };
    }
  );
};
