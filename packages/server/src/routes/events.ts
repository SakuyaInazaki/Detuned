import { FastifyPluginAsync } from 'fastify';
import { CreateSubscriptionRequest, PollRequest, AckRequest } from '@detuned/protocol';
import { EventService, AuthenticatedContext } from '@detuned/core';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const eventService = (app as any).eventService as EventService;

  app.post('/spaces/:space_id/subscriptions', async (req, reply) => {
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
  });

  app.post('/spaces/:space_id/consumers/:id/poll', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    const body = (req.body as PollRequest) ?? {};

    const result = eventService.poll(auth, space_id, id, body);
    return {
      api_version: '1',
      request_id: req.id,
      data: result,
    };
  });

  app.post('/spaces/:space_id/consumers/:id/ack', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    const body = req.body as AckRequest;

    const result = eventService.ack(auth, space_id, id, body);
    return {
      api_version: '1',
      request_id: req.id,
      data: result,
    };
  });

  app.delete('/spaces/:space_id/consumers/:id', async (req) => {
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
