import { CreateWebSessionRequestSchema, WebSessionQuerySchema, WEB_AUTH_INPUT_POLICY, WEB_AUTH_PATH, DetunedError, ErrorCode } from '@detuned/protocol';
import { validateAllowedQueryParams } from '../utils/query.js';
import { bearerToken, checkWebRequest, readWebCookie, readCsrf, sessionCookie } from '../web-auth.js';
function emptyQuery(query) { try {
    validateAllowedQueryParams(query, []);
}
catch {
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid web authentication query.', 400);
} }
export const authRoutes = async (app, { service, config }) => {
    app.post(WEB_AUTH_PATH, { schema: { body: CreateWebSessionRequestSchema, querystring: WebSessionQuerySchema }, attachValidation: true }, async (req, reply) => {
        emptyQuery(req.query);
        if (req.validationError) {
            const errors = req.validationError.validation;
            const absentBodyOnly = req.body === undefined && req.validationError.validationContext === 'body' && errors?.length === 1 && errors[0]?.keyword === 'type' && errors[0]?.instancePath === '' && errors[0]?.params.type === 'object';
            if (!absentBodyOnly)
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid web login body.', 400);
        }
        checkWebRequest(req, config, true);
        const result = service.login(bearerToken(req), readWebCookie(req));
        reply.code(201).header('cache-control', 'no-store').header('set-cookie', sessionCookie(result.secret, config));
        return { api_version: '1', request_id: req.id, data: result.data };
    });
    app.get(WEB_AUTH_PATH, { schema: { querystring: WebSessionQuerySchema }, attachValidation: true }, async (req, reply) => { emptyQuery(req.query); if (req.validationError)
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid web authentication query.', 400); const secret = readWebCookie(req); if (!secret)
        throw new DetunedError(ErrorCode.UNAUTHENTICATED, 'Web session unavailable.', 401); const result = service.get(secret); reply.header('cache-control', 'no-store'); return { api_version: '1', request_id: req.id, data: result.data }; });
    app.delete(WEB_AUTH_PATH, { schema: { querystring: WebSessionQuerySchema }, attachValidation: true }, async (req, reply) => { emptyQuery(req.query); if (req.validationError)
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid web authentication query.', 400); if (WEB_AUTH_INPUT_POLICY.logout_body === 'absent' && req.body !== undefined)
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Web logout does not accept a body.', 400); checkWebRequest(req, config, true); const secret = readWebCookie(req); if (!secret)
        throw new DetunedError(ErrorCode.UNAUTHENTICATED, 'Web session unavailable.', 401); service.logout(secret, readCsrf(req)); reply.header('cache-control', 'no-store').header('set-cookie', sessionCookie(undefined, config)).code(204).send(); });
};
//# sourceMappingURL=auth.js.map