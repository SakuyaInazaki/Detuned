import { CreateReviewRequestSchema, CreateReviewSubmissionSchema, CancelReviewRequestSchema, FinalizeReviewRequestSchema, DetunedError, ErrorCode, isNonblankString, serializePostReviewRequestsEnvelope } from '@detuned/protocol';
import { parseIntegerQuery, validateAllowedQueryParams } from '../utils/query.js';
const auth = (req) => req.auth;
const params = (req) => req.params;
function key(req) {
    const raw = req.raw.rawHeaders;
    let count = 0;
    for (let i = 0; i < raw.length; i += 2)
        if (raw[i]?.toLowerCase() === 'idempotency-key')
            count++;
    const value = req.headers['idempotency-key'];
    if (count !== 1 || typeof value !== 'string' || !isNonblankString(value))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少或重复的 Idempotency-Key 请求头。', 400);
    return value;
}
const envelope = (requestId, data) => ({ api_version: '1', request_id: requestId, data });
export const reviewRoutes = async (app, services) => {
    app.addHook('onRequest', async (_req, reply) => { reply.header('Cache-Control', 'private, no-store'); });
    app.addHook('preValidation', async (req) => { validateAllowedQueryParams(req.query, req.routeOptions.url?.endsWith('/posts/:id/review-requests') ? ['limit', 'max_bytes', 'cursor'] : []); });
    app.get('/spaces/:space_id/posts/:id/review-requests', async (req, reply) => {
        const { space_id, id } = params(req);
        const q = req.query;
        if (q.cursor !== undefined && (typeof q.cursor !== 'string' || q.cursor.length < 1 || q.cursor.length > 4096))
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid review directory cursor.', 400);
        const page = services.catalog.getRequests(auth(req), space_id, id, { limit: parseIntegerQuery(q.limit, 'limit', { min: 1, max: 50, defaultValue: 20 }), max_bytes: parseIntegerQuery(q.max_bytes, 'max_bytes', { min: 4096, max: 65536, defaultValue: 12288 }), cursor: q.cursor }, { request_id: req.id });
        return reply.type('application/json; charset=utf-8').send(serializePostReviewRequestsEnvelope(req.id, page));
    });
    app.post('/spaces/:space_id/review-requests', { schema: { body: CreateReviewRequestSchema } }, async (req, reply) => {
        const { space_id } = params(req);
        const value = services.requests.createRequest(auth(req), space_id, req.body, key(req));
        reply.code(201);
        return envelope(req.id, value);
    });
    app.get('/spaces/:space_id/review-requests/:id', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.requests.getRequest(auth(req), space_id, id)); });
    app.get('/spaces/:space_id/review-snapshots/:id', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.requests.getSnapshot(auth(req), space_id, id)); });
    app.get('/spaces/:space_id/review-requests/:id/assignment', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.submissions.getOwnAssignment(auth(req), space_id, id)); });
    app.post('/spaces/:space_id/review-requests/:id/submissions', { schema: { body: CreateReviewSubmissionSchema } }, async (req, reply) => {
        const { space_id, id } = params(req);
        const value = services.submissions.submit(auth(req), space_id, id, req.body, key(req));
        reply.code(201);
        return envelope(req.id, value);
    });
    app.get('/spaces/:space_id/review-submissions/:id', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.submissions.getSubmission(auth(req), space_id, id)); });
    app.get('/spaces/:space_id/review-requests/:id/submissions', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.submissions.listVisibleSubmissions(auth(req), space_id, id)); });
    app.post('/spaces/:space_id/review-requests/:id/finalize', { schema: { body: FinalizeReviewRequestSchema } }, async (req) => {
        const { space_id, id } = params(req);
        return envelope(req.id, services.finalization.finalizeRequest(auth(req), space_id, id, req.body, key(req)));
    });
    app.post('/spaces/:space_id/review-requests/:id/cancel', { schema: { body: CancelReviewRequestSchema } }, async (req) => {
        const { space_id, id } = params(req);
        return envelope(req.id, services.requests.cancelRequest(auth(req), space_id, id, req.body, key(req)));
    });
    app.get('/spaces/:space_id/review-requests/:id/status', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.status.getStatus(auth(req), space_id, id)); });
    app.get('/spaces/:space_id/review-requests/:id/decision', async (req) => { const { space_id, id } = params(req); return envelope(req.id, services.finalization.getDecision(auth(req), space_id, id)); });
};
//# sourceMappingURL=reviews.js.map