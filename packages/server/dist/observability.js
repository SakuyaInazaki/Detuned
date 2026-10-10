import { performance } from 'node:perf_hooks';
import { ErrorCode } from '@detuned/protocol';
const methods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE']);
const codes = new Set(Object.values(ErrorCode));
export function installRequestLogging(app, sink) {
    if (!sink)
        return;
    const states = new WeakMap();
    app.addHook('onRequest', (req, reply, done) => {
        const state = { start: performance.now(), done: false, id: typeof req.id === 'string' && req.id.length <= 64 ? req.id : 'unknown' };
        states.set(req, state);
        const finish = (outcome) => {
            if (state.done)
                return;
            state.done = true;
            reply.raw.removeListener('close', closed);
            req.raw.removeListener('aborted', aborted);
            const duration = performance.now() - state.start;
            const template = req.routeOptions.url;
            const status = reply.raw.headersSent && Number.isInteger(reply.statusCode) && reply.statusCode >= 100 && reply.statusCode <= 599 ? reply.statusCode : null;
            const actor = req.auth?.actor?.id;
            const entry = { event: 'request_completed', timestamp: new Date().toISOString(), method: methods.has(req.method) ? req.method : 'OTHER', route: !req.is404 && typeof template === 'string' && template.length <= 256 ? template : 'unknown', request_id: state.id, status_code: status, outcome, duration_ms: Number.isFinite(duration) ? Math.max(0, duration) : 0 };
            if (state.errorCode)
                entry.error_code = state.errorCode;
            if (typeof actor === 'string' && /^act_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(actor))
                entry.actor_id = actor;
            try {
                sink(entry);
            }
            catch { /* Observability cannot change business results. */ }
        };
        const closed = () => finish(reply.raw.writableFinished ? 'completed' : 'aborted');
        const aborted = () => finish('aborted');
        reply.raw.once('close', closed);
        req.raw.once('aborted', aborted);
        req.finishRequestLog = finish;
        done();
    });
    app.addHook('onError', (req, _reply, error, done) => { const state = states.get(req); const code = error.code; if (state && codes.has(code))
        state.errorCode = code; done(); });
    app.addHook('onResponse', (req, _reply, done) => { req.finishRequestLog?.('completed'); done(); });
}
//# sourceMappingURL=observability.js.map