import { CreateSubscriptionRequestSchema, PollRequestSchema, AckRequestSchema, } from '@detuned/protocol';
export const eventRoutes = async (app) => {
    const eventService = app.eventService;
    app.post('/spaces/:space_id/subscriptions', { schema: { body: CreateSubscriptionRequestSchema } }, async (req, reply) => {
        const auth = req.auth;
        const { space_id } = req.params;
        const body = req.body;
        const result = eventService.subscribe(auth, space_id, body);
        reply.status(201);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.post('/spaces/:space_id/consumers/:id/poll', { schema: { body: PollRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const body = req.body ?? {};
        const result = eventService.poll(auth, space_id, id, body);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.post('/spaces/:space_id/consumers/:id/ack', { schema: { body: AckRequestSchema } }, async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        const body = req.body;
        const result = eventService.ack(auth, space_id, id, body);
        return {
            api_version: '1',
            request_id: req.id,
            data: result,
        };
    });
    app.delete('/spaces/:space_id/consumers/:id', async (req) => {
        const auth = req.auth;
        const { space_id, id } = req.params;
        eventService.deactivateConsumer(auth, space_id, id);
        return {
            api_version: '1',
            request_id: req.id,
            data: { deactivated: true },
        };
    });
};
//# sourceMappingURL=events.js.map