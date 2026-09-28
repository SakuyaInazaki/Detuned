import { FastifyPluginAsync } from 'fastify';
import { randomBytes, createHash } from 'node:crypto';
import { DetunedError, ErrorCode, ActorKind, SpaceRole } from '@detuned/protocol';
import { AuthService, AuthenticatedContext } from '@detuned/core';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const authService = (app as any).authService as AuthService;
  const storage = (app as any).storage;
  const idGen = (app as any).idGen;
  const clock = (app as any).clock;

  app.post('/admin/actors', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    authService.requireInstanceAdmin(auth);

    const body = req.body as { kind: ActorKind; display_name: string };
    if (!body.kind || !body.display_name) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 kind 或 display_name。', 400);
    }

    const actorId = idGen.generateId('act');
    const now = clock.nowIso();
    const actor = {
      id: actorId,
      kind: body.kind,
      display_name: body.display_name,
      created_at: now,
      disabled_at: null,
    };

    storage.createActor(actor);
    reply.status(201);
    return {
      api_version: '1',
      request_id: req.id,
      data: actor,
    };
  });

  app.post('/admin/credentials', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    authService.requireInstanceAdmin(auth);

    const body = req.body as {
      actor_id: string;
      allowed_space_ids?: string[];
      capabilities?: any[];
      expires_at?: string;
    };

    if (!body.actor_id) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 actor_id。', 400);
    }

    const actor = storage.findActorById(body.actor_id);
    if (!actor) {
      throw new DetunedError(ErrorCode.NOT_FOUND, 'Actor 不存在。', 404);
    }

    const rawToken = `detuned_tok_${randomBytes(24).toString('hex')}`;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const credId = idGen.generateId('crd');
    const now = clock.nowIso();

    const credential = {
      id: credId,
      actor_id: body.actor_id,
      token_hash: tokenHash,
      allowed_space_ids: body.allowed_space_ids ?? ['*'],
      capabilities: body.capabilities ?? ['read', 'write'],
      expires_at: body.expires_at ?? null,
      revoked_at: null,
      created_at: now,
    };

    storage.createCredential(credential);

    reply.status(201);
    return {
      api_version: '1',
      request_id: req.id,
      data: {
        credential_id: credId,
        actor_id: body.actor_id,
        token: rawToken, // Returned only once at creation!
      },
    };
  });

  app.post('/spaces/:space_id/memberships', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    authService.requireSpaceAccess(auth, space_id, 'owner');

    const body = req.body as {
      actor_id: string;
      role: SpaceRole;
      reviewer_eligible?: boolean;
      independence_group?: string;
    };

    if (!body.actor_id || !body.role) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 actor_id 或 role。', 400);
    }

    const membership = {
      space_id,
      actor_id: body.actor_id,
      role: body.role,
      active: true,
      reviewer_eligible: body.reviewer_eligible ?? true,
      independence_group: body.independence_group ?? null,
    };

    storage.upsertMembership(membership);
    reply.status(201);
    return {
      api_version: '1',
      request_id: req.id,
      data: membership,
    };
  });

  app.post('/spaces/:space_id/redactions', async (req, reply) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    authService.requireSpaceAccess(auth, space_id, 'owner');

    const body = req.body as {
      target_type: 'post' | 'artifact';
      target_id: string;
      reason: string;
    };

    if (!body.target_type || !body.target_id || !body.reason) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        '缺少 target_type, target_id 或 reason。',
        400
      );
    }

    const redactionId = idGen.generateId('red');
    const now = clock.nowIso();

    storage.createRedaction({
      id: redactionId,
      space_id,
      target_type: body.target_type,
      target_id: body.target_id,
      affected_revisions: [1],
      operator_id: auth.actor.id,
      reason: body.reason,
      created_at: now,
    });

    reply.status(201);
    return {
      api_version: '1',
      request_id: req.id,
      data: { redaction_id: redactionId },
    };
  });
};
