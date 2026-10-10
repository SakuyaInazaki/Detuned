import { FastifyPluginAsync } from 'fastify';
import {
  CreateSubscriptionRequest,
  CreateSubscriptionRequestSchema,
  PollRequest,
  PollRequestSchema,
  AckRequest,
  AckRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { EventService, AuthenticatedContext } from '@detuned/core';
import { validateNoBody } from '../utils/query.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const eventService = (app as any).eventService as EventService;
  const resources = app.runtimeResources;

  app.post(
    '/spaces/:space_id/subscriptions',
    { schema: { body: CreateSubscriptionRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id } = req.params as { space_id: string };
      const body = req.body as CreateSubscriptionRequest;

      const result = eventService.subscribe(auth, space_id, body);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.post(
    '/spaces/:space_id/consumers/:id/poll',
    { schema: { body: PollRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const body = (req.body as PollRequest) ?? {};
      const controller = new AbortController();
      const onDisconnect = () => controller.abort();
      const onResponseClose = () => {
        if (!reply.raw.writableFinished) onDisconnect();
      };
      const unavailable = () => new DetunedError(
        ErrorCode.TEMPORARILY_UNAVAILABLE, '服务器正在关闭，请稍后重试。', 503, true
      );
      const finish = resources.acquire(onDisconnect);
      req.raw.on('aborted', onDisconnect);
      reply.raw.on('close', onResponseClose);
      if (req.raw.aborted || reply.raw.destroyed) onDisconnect();
      try {
        const result = await eventService.pollWithWait(auth, space_id, id, body, { signal: controller.signal });
        return { api_version: '1', request_id: req.id, data: result };
      } catch (error) {
        // A disconnected transport has no receiver; do not turn cancellation into a public 500.
        if (controller.signal.aborted && (req.raw.aborted || reply.raw.destroyed)) {
          reply.hijack();
          return;
        }
        if (controller.signal.aborted && resources.closing) throw unavailable();
        throw error;
      } finally {
        req.raw.removeListener('aborted', onDisconnect);
        reply.raw.removeListener('close', onResponseClose);
        finish();
      }
    }
  );

  app.post(
    '/spaces/:space_id/consumers/:id/ack',
    { schema: { body: AckRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const body = req.body as AckRequest;

      const result = eventService.ack(auth, space_id, id, body);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.delete('/spaces/:space_id/consumers/:id', async (req) => {
    validateNoBody(req.body, 'Deactivate consumer');
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };

    eventService.deactivateConsumer(auth, space_id, id);
    return {
      api_version: '1',
      request_id: req.id,
      data: { deactivated: true },
    };
  });
};
