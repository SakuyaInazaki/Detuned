import { DetunedError, ErrorCode, LivenessEnvelopeSchema, ReadinessEnvelopeSchema, OperationsDiagnosticsEnvelopeSchema } from '@detuned/protocol';
import { validateAllowedQueryParams, validateNoBody } from '../utils/query.js';
export const operationsRoutes = async (app, { service }) => {
    const validate = (req) => { validateAllowedQueryParams(req.query, []); validateNoBody(req.body, 'Operations read'); };
    app.get('/health/live', { schema: { response: { 200: LivenessEnvelopeSchema } } }, async (req) => { validate(req); return { api_version: '1', request_id: req.id, data: { status: 'alive' } }; });
    app.get('/health/ready', { schema: { response: { 200: ReadinessEnvelopeSchema } } }, async (req) => { validate(req); if (!service.getReadiness())
        throw new DetunedError(ErrorCode.SERVICE_NOT_READY, '服务尚未就绪。', 503, true, { ready: false }); return { api_version: '1', request_id: req.id, data: { status: 'ready' } }; });
    app.get('/admin/diagnostics', { schema: { response: { 200: OperationsDiagnosticsEnvelopeSchema } } }, async (req) => { validate(req); return { api_version: '1', request_id: req.id, data: service.getDiagnostics(req.auth) }; });
};
//# sourceMappingURL=operations.js.map