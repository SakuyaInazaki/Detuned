// Versioned M2.1 compensation: original AD01–AD05 preserved; AD02 adds complete media-aware checks.
// R21 bounded checks of the requirements already written in R20/C.1.
// In-memory database; controlled fetch; no outbound HTTP and no model calls.
import { createRequire } from 'node:module';
import { getEventListeners } from 'node:events';
import { performance } from 'node:perf_hooks';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import { DetunedClient, UserAbortError, TimeoutError } from '../../../../../packages/client/dist/index.js';
import { DetunedError, generateOpenApiSpec, CreateSpaceRequestSchema } from '../../../../../packages/protocol/dist/index.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const serverRequire = createRequire(new URL('../../../../../packages/server/dist/app.js', import.meta.url));
const fastifyRequire = createRequire(serverRequire.resolve('fastify'));
const compilerRequire = createRequire(fastifyRequire.resolve('@fastify/ajv-compiler'));
const Ajv = compilerRequire('ajv');
const original = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout, random: Math.random };
const apiV1Operations = spec => Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).filter(([method, op]) => ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method) &&
    (op.servers ?? methods.servers ?? spec.servers ?? []).some(server => new URL(server.url, 'http://contract.invalid').pathname.replace(/\/$/, '') === '/api/v1'))
    .map(([method, op]) => ({ path, method, op })));
const probes = [];
const env = data => ({ api_version: '1', request_id: 'r21-controlled', data });
const busy = { api_version: '1', request_id: 'r21-controlled',
  error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true } };
const response = (json, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300,
  status, headers: new Headers(headers), json: async () => json });
const errorInfo = e => ({ name: e.name, code: e.code ?? null, status: e.statusCode ?? null,
  message: e.message, isUserAbort: e instanceof UserAbortError,
  isTimeout: e instanceof TimeoutError, isDetunedError: e instanceof DetunedError,
  kind: e.kind ?? null, isTransportError: e.isTransportError ?? null });
async function outcome(fn) {
  try { return { resolved: true, value: await fn() }; }
  catch (e) { return { resolved: false, error: errorInfo(e) }; }
}
async function probe(id, name, fn) {
  try { probes.push({ id, name, ...await fn() }); }
  catch (e) { probes.push({ id, name, passes: false, probe_error: errorInfo(e) }); }
  finally {
    globalThis.fetch = original.fetch; globalThis.setTimeout = original.setTimeout;
    globalThis.clearTimeout = original.clearTimeout; Math.random = original.random;
  }
}

await probe('AD01', 'C01 unknown write query and no-body delete inputs reject before mutation', async () => {
  const db = new Database(':memory:');
  const boot = bootstrapDatabase(db);
  const storage = new SqliteStorage(db);
  const app = buildApp({ storage });
  const inject = (method, url, payload, key = 'r21-key') => app.inject({ method, url,
    headers: { authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key },
    ...(payload === undefined ? {} : { payload }) });
  try {
    const sp = await inject('POST', '/api/v1/spaces', { slug: 'r21', objective: 'review', rules: [] });
    if (sp.statusCode !== 201) throw new Error('positive space fixture failed');
    const sid = sp.json().data.space.id;
    const actor = await inject('POST', '/api/v1/admin/actors', { kind: 'agent', display_name: 'temporary' });
    const aid = actor.json().data.id;
    const mem = await inject('POST', `/api/v1/spaces/${sid}/memberships`, { actor_id: aid, role: 'contributor' });
    if (mem.statusCode !== 201) throw new Error('membership fixture failed');
    const sub = await inject('POST', `/api/v1/spaces/${sid}/subscriptions`, { consumer_key: 'r21', start: 'now' });
    const cid = sub.json().data.consumer.id;
    const snapshot = () => ({ spaces: db.prepare('SELECT count(*) n FROM spaces').get().n,
      events: db.prepare('SELECT count(*) n FROM events').get().n,
      idempotency: db.prepare('SELECT count(*) n FROM idempotency_records').get().n,
      membership: db.prepare('SELECT * FROM memberships WHERE space_id=? AND actor_id=?').get(sid, aid),
      consumer: db.prepare('SELECT * FROM consumers WHERE id=?').get(cid) ?? null });
    const cases = [];
    for (const [name, method, path, body, key] of [
      ['create_space_unknown_query', 'POST', '/api/v1/spaces?bogus=1',
        { slug: 'r21-bogus', objective: 'review', rules: [] }, 'r21-bogus'],
      ['delete_membership_unknown_body', 'DELETE', `/api/v1/spaces/${sid}/memberships/${aid}`, { bogus: true }],
      ['delete_consumer_unknown_body', 'DELETE', `/api/v1/spaces/${sid}/consumers/${cid}`, { bogus: true }],
    ]) {
      const before = snapshot();
      const r = await inject(method, path, body, key);
      const after = snapshot();
      const unchanged = JSON.stringify(before) === JSON.stringify(after);
      cases.push({ name, status: r.statusCode, code: r.json().error?.code ?? null,
        state_unchanged: unchanged, before, after,
        passes: r.statusCode >= 400 && r.statusCode < 500 && unchanged });
    }
    const positive = await inject('GET', '/api/v1/spaces?limit=1');
    return { passes: cases.every(c => c.passes) && positive.statusCode === 200,
      cases, valid_query_status: positive.statusCode };
  } finally { await app.close(); db.close(); }
});

await probe('AD02', 'C01 OpenAPI body constraints agree with existing protocol and HTTP', async () => {
  const db = new Database(':memory:');
  const boot = bootstrapDatabase(db);
  const app = buildApp({ storage: new SqliteStorage(db) });
  const routes = [];
  app.addHook('onRoute', r => routes.push({ method: r.method, path: r.url, schema: r.schema }));
  try {
    await app.ready();
    const spec = generateOpenApiSpec();
    const schema = spec.paths['/spaces'].post.requestBody.content['application/json'].schema;
    const ajv = new Ajv({ coerceTypes: false, removeAdditional: false, useDefaults: true, strict: false });
    ajv.addFormat('binary', () => true);
    const specValidator = ajv.compile({ ...schema, components: spec.components ?? {} });
    const protocolValidator = ajv.compile(CreateSpaceRequestSchema);
    const cases = [];
    for (const [name, body] of [
      ['missing_required_fields', {}],
      ['wrong_field_type', { slug: 42, objective: 'review', rules: [] }],
      ['unknown_body_field', { slug: 'valid', objective: 'review', rules: [], bogus: 1 }],
      ['valid_body', { slug: 'valid', objective: 'review', rules: [] }],
    ]) {
      const specValid = specValidator(structuredClone(body));
      const protocolValid = protocolValidator(structuredClone(body));
      const r = await app.inject({ method: 'POST', url: '/api/v1/spaces',
        headers: { authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': `r21-${name}` }, payload: body });
      const httpValid = r.statusCode >= 200 && r.statusCode < 300;
      cases.push({ name, openapi_accepts: specValid, protocol_accepts: protocolValid,
        http_status: r.statusCode, passes: specValid === protocolValid && protocolValid === httpValid });
    }
    const operations = apiV1Operations(spec);
    const bodyOps = operations.filter(o => o.op.requestBody);
    const placeholderBodies = bodyOps.filter(o => JSON.stringify(o.op.requestBody.content['application/json']?.schema) === '{"type":"object"}');
    const actual = routes.filter(r => r.path.startsWith('/api/v1/') && r.method !== 'HEAD').map(r => ({ method: r.method.toLowerCase(), path: r.path.replace(/^\/api\/v1/, '').replace(/:([^/]+)/g, '{$1}'), schema: r.schema }));
    if (JSON.stringify(actual.map(r => `${r.method} ${r.path}`).sort()) !== JSON.stringify(operations.map(r => `${r.method} ${r.path}`).sort())) throw Error('Full operation set mismatch');
    const mediaSchemas = [];
    for (const route of actual) {
      const op = spec.paths[route.path][route.method];
      const jsonSchema = op.requestBody?.content['application/json']?.schema;
      if (JSON.stringify(jsonSchema ?? null) !== JSON.stringify(route.schema?.body ?? null)) throw Error(`JSON schema mismatch: ${route.method} ${route.path}`);
      const names = [...route.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1]).sort();
      if (JSON.stringify(names) !== JSON.stringify((op.parameters ?? []).filter(p => p.in === 'path').map(p => p.name).sort())) throw Error('Path parameters mismatch');
      for (const [media, content] of Object.entries(op.requestBody?.content ?? {})) {
        ajv.compile(content.schema);
        if (media !== 'application/json') {
          if (media !== 'multipart/form-data' || route.path !== '/spaces/{space_id}/artifacts') throw Error('Unexpected media type');
          if (JSON.stringify(content.schema.required) !== '["file"]' || content.schema.additionalProperties !== false || content.schema.properties.file.format !== 'binary' || content.schema.properties.metadata.type !== 'string') throw Error('Multipart schema shape mismatch');
        }
        mediaSchemas.push({method: route.method, path: route.path, media, direction: 'request'});
      }
      for (const [status, response] of Object.entries(op.responses ?? {})) {
        for (const [media, content] of Object.entries(response.content ?? {})) {
          ajv.compile(content.schema);
          if (media === 'application/octet-stream' && (route.path !== '/spaces/{space_id}/artifacts/{id}/content' || content.schema.format !== 'binary')) throw Error('Binary response contract mismatch');
          mediaSchemas.push({method: route.method, path: route.path, media, status, direction: 'response'});
        }
      }
    }
    return { passes: cases.every(c => c.passes), cases, media_schemas: mediaSchemas, operation_count: operations.length,
      body_operation_count: bodyOps.length, placeholder_body_count: placeholderBodies.length,
      openapi_space_body_schema: schema,
      actual_business_route_count: routes.filter(r => r.path.startsWith('/api/v1/') && r.method !== 'HEAD').length };
  } finally { await app.close(); db.close(); }
});

await probe('AD03', 'C02 unsolicited AbortError is not user cancellation and transport source is distinguishable', async () => {
  const client = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 0 });
  const ctl = new AbortController();
  globalThis.fetch = async () => { throw new DOMException('upstream stopped', 'AbortError'); };
  const unsolicited = await outcome(() => client.getCapabilities({ signal: ctl.signal }));
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: Object.assign(new Error('reset'), { code: 'ECONNRESET' }) }); };
  const transport = await outcome(() => client.getCapabilities());
  globalThis.fetch = async () => response(busy, 503);
  const server = await outcome(() => client.getCapabilities());
  globalThis.fetch = async () => response({ ...busy, error: { code: 'REVISION_CONFLICT',
    message: 'transaction aborted because revision changed', retryable: false, details: { current_revision: 2 } } }, 409);
  const conflict = await outcome(() => client.getCapabilities());
  const classification = e => JSON.stringify([e.name, e.kind, e.isTransportError, e.isDetunedError]);
  const transportDistinct = !transport.resolved && !server.resolved && classification(transport.error) !== classification(server.error);
  return { passes: !unsolicited.resolved && !unsolicited.error.isUserAbort && !unsolicited.error.isTimeout &&
      transportDistinct && conflict.error?.code === 'REVISION_CONFLICT',
    external_signal_aborted: ctl.signal.aborted, unsolicited, transport, server,
    stable_transport_classification_distinct: transportDistinct, business_error_positive: conflict };
});

await probe('AD04', 'C02 request timer/listener finish before Retry-After backoff starts', async () => {
  // Virtual time advances in order; unlike the old test, 30 s and 60 s are not both collapsed to 0 ms.
  const timers = new Map(); let nextId = 1; let now = 0;
  globalThis.setTimeout = (fn, delay, ...args) => {
    const id = nextId++; timers.set(id, { fn, args, at: now + Number(delay), delay: Number(delay) }); return id;
  };
  globalThis.clearTimeout = id => { timers.delete(id); };
  Math.random = () => 0;
  const flush = async () => { for (let i = 0; i < 24; i++) await Promise.resolve(); };
  const advance = async to => {
    for (;;) {
      const entry = [...timers].filter(([, t]) => t.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      const [id, t] = entry; timers.delete(id); now = t.at; t.fn(...t.args); await flush();
    }
    now = to; await flush();
  };
  const ctl = new AbortController(); let calls = 0; const attempts = []; let settled = false;
  globalThis.fetch = async (_url, opts) => {
    calls++; attempts.push({ at: now, signal: opts.signal, key: opts.headers['Idempotency-Key'] });
    return calls === 1 ? response(busy, 503, { 'Retry-After': '60' }) : response(env({ ok: true }));
  };
  const client = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 30000, maxRetries: 1 });
  const p = outcome(() => client.request({ method: 'POST', path: '/test', requestKey: 'stable-r21', signal: ctl.signal }));
  p.then(() => { settled = true; });
  try {
    await flush();
    const backoffStart = { time_ms: now, pending_timer_delays_ms: [...timers.values()].map(t => t.delay),
      external_abort_listeners: getEventListeners(ctl.signal, 'abort').length };
    await advance(30000);
    const at30s = { settled, calls, completed_attempt_signal_aborted: attempts[0]?.signal.aborted };
    await advance(60000);
    if (!settled) { ctl.abort(); await flush(); }
    const result = await p;
    const final = { remaining_timers: timers.size, external_abort_listeners: getEventListeners(ctl.signal, 'abort').length };
    return { passes: !backoffStart.pending_timer_delays_ms.includes(30000) &&
        backoffStart.external_abort_listeners <= 1 && at30s.completed_attempt_signal_aborted === false &&
        ((result.resolved && calls === 2) || (!result.resolved && calls === 1)) &&
        final.remaining_timers === 0 && final.external_abort_listeners === 0,
      backoff_start: backoffStart, at_30s: at30s, result, final,
      attempt_times_ms: attempts.map(a => a.at), request_keys: attempts.map(a => a.key) };
  } finally { ctl.abort(); timers.clear(); }
});

await probe('AD05', 'C02 oversized Retry-After must stop or wait safely, never overflow into an immediate retry', async () => {
  const ctl = new AbortController(); let calls = 0; const schedule = [];
  // This uses real Node timers: 2147484000 ms currently overflows into 1 ms.
  // A future correct long wait is cancelled by the independent 30 ms guard.
  const guard = original.setTimeout(() => ctl.abort(), 30);
  globalThis.setTimeout = (fn, delay, ...args) => {
    const timer = original.setTimeout(fn, delay, ...args);
    schedule.push({ requested_delay_ms: delay, observed_node_delay_ms: timer._idleTimeout });
    return timer;
  };
  globalThis.fetch = async () => { calls++; return calls === 1 ?
    response(busy, 503, { 'Retry-After': '2147484' }) : response(env({ ok: true })); };
  const client = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
  const start = performance.now();
  try {
    const result = await outcome(() => client.getCapabilities({ signal: ctl.signal }));
    return { passes: calls === 1 && !result.resolved, calls, elapsed_ms: performance.now() - start,
      server_minimum_delay_ms: 2147484000, scheduled: schedule, result,
      final_external_abort_listeners: getEventListeners(ctl.signal, 'abort').length };
  } finally { original.clearTimeout(guard); ctl.abort(); }
});

console.log(JSON.stringify({ reviewed_date: '2026-10-02', runtime: process.version, probes,
  summary: { passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length } }, null, 2));
process.exitCode = probes.every(p => p.passes) ? 0 : 1;
