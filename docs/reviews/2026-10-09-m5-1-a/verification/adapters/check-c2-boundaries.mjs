// R22: finite checks of C.2 requirements. No models, outbound HTTP, or persistent DB.
import { createRequire } from 'node:module';
import { getEventListeners } from 'node:events';
import { isDeepStrictEqual } from 'node:util';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import { DetunedClient } from '../../../../../packages/client/dist/index.js';
import { generateOpenApiSpec, DETUNED_TOOLS } from '../../../../../packages/protocol/dist/index.js';
import activate from '../../../../../packages/adapter-pi/dist/index.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const serverRequire = createRequire(new URL('../../../../../packages/server/dist/app.js', import.meta.url));
const fastifyRequire = createRequire(serverRequire.resolve('fastify'));
const compilerRequire = createRequire(fastifyRequire.resolve('@fastify/ajv-compiler'));
const Ajv = compilerRequire('ajv');
const piPackage = realpathSync(new URL('../../../../../packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json', import.meta.url));
const { validateToolArguments } = await import(new URL('../pi-ai/dist/utils/validation.js', pathToFileURL(piPackage)));
const original = { fetch: globalThis.fetch, setTimeout, clearTimeout, now: Date.now,
  random: Math.random, log: console.log, error: console.error };
const apiV1Operations = spec => Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).filter(([method, op]) => ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method) &&
    (op.servers ?? methods.servers ?? spec.servers ?? []).some(server => new URL(server.url, 'http://contract.invalid').pathname.replace(/\/$/, '') === '/api/v1'))
    .map(([method, op]) => ({ path, method, op })));
const probes = [];
const envelope = data => ({ api_version: '1', request_id: 'r22-controlled', data });
const conflict = { api_version: '1', request_id: 'r22-controlled', error: {
  code: 'REVISION_CONFLICT', message: 'transaction aborted because revision changed',
  retryable: false, details: { current_revision: 2 } } };
const busy = { api_version: '1', request_id: 'r22-controlled', error: {
  code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true } };
const response = (json, status = 200, headers = {}) => new Response(JSON.stringify(json), { status, headers });
const info = e => ({ name: e.name, code: e.code ?? null, status: e.statusCode ?? null,
  retryable: e.retryable ?? null, message: e.message, details: e.details ?? null,
  cause_name: e.cause?.name ?? null, cause_code: e.cause?.code ?? e.cause?.cause?.code ?? null });
async function outcome(fn) {
  try { return { resolved: true, value: await fn() }; }
  catch (e) { return { resolved: false, error: info(e) }; }
}
async function probe(id, name, fn) {
  try { probes.push({ id, name, ...await fn() }); }
  catch (e) { probes.push({ id, name, passes: false, probe_error: info(e) }); }
  finally {
    globalThis.fetch = original.fetch; globalThis.setTimeout = original.setTimeout;
    globalThis.clearTimeout = original.clearTimeout; Date.now = original.now;
    Math.random = original.random; console.log = original.log; console.error = original.error;
  }
}

await probe('AE01', 'Cancellation and timeout still win when pending body fulfills after the signal fires', async () => {
  const cases = [];
  for (const mode of ['user', 'timeout']) {
    for (const status of [200, 409]) {
      const timers = new Map(); let nextId = 1; let calls = 0; let requestSignal;
      globalThis.setTimeout = (fn, delay) => { const id = nextId++; timers.set(id, { fn, delay }); return id; };
      globalThis.clearTimeout = id => timers.delete(id);
      const ctl = new AbortController();
      globalThis.fetch = async (_url, options) => {
        calls++; requestSignal = options.signal;
        return { ok: status === 200, status, headers: new Headers(), json: async () => {
          // Controlled body continuation: this promise fulfills, rather than throwing AbortError.
          await Promise.resolve();
          if (mode === 'user') ctl.abort();
          else {
            const pending = [...timers][0];
            if (!pending) throw new Error('No request timeout was armed');
            timers.delete(pending[0]); pending[1].fn();
          }
          return status === 200 ? envelope({ ok: true }) : conflict;
        } };
      };
      const client = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 1000, maxRetries: 0 });
      const result = await outcome(() => client.getCapabilities({ signal: ctl.signal }));
      const expected = mode === 'user' ? 'UserAbortError' : 'TimeoutError';
      cases.push({ mode, http_status: status, calls, request_signal_aborted: requestSignal.aborted,
        external_signal_aborted: ctl.signal.aborted, remaining_timers: timers.size,
        external_listeners: getEventListeners(ctl.signal, 'abort').length, result,
        passes: !result.resolved && result.error.name === expected && calls === 1 &&
          timers.size === 0 && getEventListeners(ctl.signal, 'abort').length === 0 });
    }
  }
  return { passes: cases.every(c => c.passes), cases,
    limit: 'Controlled scheduling check, not a claim of a reproduced real-host race.' };
});

await probe('AE02', 'Transport classification and retry allowlist apply through native Response body consumption', async () => {
  const cases = [];
  globalThis.setTimeout = (fn, _delay, ...args) => original.setTimeout(fn, 0, ...args);
  const reset = new TypeError('terminated', { cause: Object.assign(new Error('socket closed'), { code: 'UND_ERR_SOCKET' }) });
  const abort = new DOMException('upstream stopped', 'AbortError');
  const expired = new TypeError('fetch failed', { cause: Object.assign(new Error('certificate expired'), { code: 'CERT_HAS_EXPIRED' }) });
  const brokenBody = error => new Response(new ReadableStream({ start(controller) { controller.error(error); } }), { status: 200 });
  for (const [name, phase, firstError, retries, expectedName, expectedCalls] of [
    ['body_socket_final_classification', 'body', reset, 0, 'ClientTransportError', 1],
    ['body_unsolicited_abort', 'body', abort, 0, 'ClientTransportError', 1],
    ['body_socket_retry_recovers', 'body', reset, 1, null, 2],
    ['permanent_tls_does_not_retry', 'headers', expired, 1, 'ClientTransportError', 1],
  ]) {
    let calls = 0; const keys = [];
    globalThis.fetch = async (_url, opts) => {
      calls++; keys.push(opts.headers['Idempotency-Key']);
      if (calls > 1 && phase === 'body') return response(envelope({ recovered: true }));
      if (phase === 'headers') throw firstError;
      return brokenBody(firstError);
    };
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: retries });
    const result = await outcome(() => client.request({ method: 'POST', path: '/test', requestKey: 'r22-stable' }));
    const classificationOK = expectedName ? !result.resolved && result.error.name === expectedName : result.resolved;
    const retryFlagOK = name === 'permanent_tls_does_not_retry' ? result.error?.retryable === false : true;
    const causeOK = name === 'body_socket_final_classification' ? result.error?.cause_code === 'UND_ERR_SOCKET' : true;
    cases.push({ name, calls, keys, result, passes: classificationOK && retryFlagOK && causeOK &&
      calls === expectedCalls && keys.every(k => k === 'r22-stable') });
  }
  // Positive control: complete malformed JSON is a protocol failure and must not be retried.
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{', { status: 200 }); };
  const result = await outcome(() => new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 }).getCapabilities());
  cases.push({ name: 'complete_bad_json_positive', calls, result,
    passes: !result.resolved && result.error.name === 'ClientProtocolError' && calls === 1 });
  return { passes: cases.every(c => c.passes), cases };
});

await probe('AE03', 'OpenAPI constraints, authentication and optional inputs agree with live route contracts', async () => {
  const db = new Database(':memory:'); const boot = bootstrapDatabase(db);
  const app = buildApp({ storage: new SqliteStorage(db) }); const routes = [];
  app.addHook('onRoute', r => routes.push({ method: r.method, path: r.url, schema: r.schema }));
  const spec = generateOpenApiSpec();
  const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false });
  const call = (method, url, payload, key) => app.inject({ method, url,
    headers: { authorization: `Bearer ${boot.adminToken}`, ...(key ? { 'idempotency-key': key } : {}) },
    ...(payload === undefined ? {} : { payload }) });
  try {
    await app.ready();
    const space = await call('POST', '/api/v1/spaces', { slug: 'r22', objective: 'review', rules: [] }, 'r22-space');
    if (space.statusCode !== 201) throw new Error('Space fixture failed');
    const sid = space.json().data.space.id;
    const cases = [];
    for (const [name, path, location, parameter, value, url] of [
      ['limit_lower_bound', '/spaces', 'query', 'limit', 0, '/api/v1/spaces?limit=0'],
      ['search_kind_enum', '/spaces/{space_id}/search', 'query', 'kind', 'bogus', `/api/v1/spaces/${sid}/search?q=x&kind=bogus`],
    ]) {
      const schema = spec.paths[path].get.parameters.find(p => p.in === location && p.name === parameter).schema;
      const valid = ajv.compile(schema)(value); const r = await call('GET', url);
      cases.push({ name, schema, openapi_accepts: valid, http_status: r.statusCode,
        http_code: r.json().error?.code ?? null, passes: valid === (r.statusCode < 400) });
    }
    const cap = await app.inject({ method: 'GET', url: '/api/v1/capabilities' });
    const security = spec.paths['/capabilities'].get.security ?? spec.security;
    const permitsAnonymous = security === undefined || security.length === 0 || security.some(s => Object.keys(s).length === 0);
    cases.push({ name: 'anonymous_capabilities', effective_security: security, http_status: cap.statusCode,
      passes: permitsAnonymous && cap.statusCode === 200 });
    const sub = await call('POST', `/api/v1/spaces/${sid}/subscriptions`, { consumer_key: 'r22', start: 'now' });
    const subRequiresKey = spec.paths['/spaces/{space_id}/subscriptions'].post.parameters.some(p => p.in === 'header' && p.name.toLowerCase() === 'idempotency-key' && p.required);
    cases.push({ name: 'subscribe_without_key', openapi_key_required: subRequiresKey, http_status: sub.statusCode,
      passes: !subRequiresKey && sub.statusCode === 201 });
    if (sub.statusCode !== 201) throw new Error('Subscription fixture failed');
    const cid = sub.json().data.consumer.id;
    const poll = await call('POST', `/api/v1/spaces/${sid}/consumers/${cid}/poll`);
    const bodyRequired = spec.paths['/spaces/{space_id}/consumers/{id}/poll'].post.requestBody.required === true;
    cases.push({ name: 'poll_without_body', openapi_body_required: bodyRequired, http_status: poll.statusCode,
      http_code: poll.json().error?.code ?? null, passes: bodyRequired === (poll.statusCode >= 400) });
    const pollObject = await call('POST', `/api/v1/spaces/${sid}/consumers/${cid}/poll`, {});
    cases.push({ name: 'poll_empty_object_positive', http_status: pollObject.statusCode, passes: pollObject.statusCode === 200 });
    // Compare the complete current route set and all body definitions, not just numeric counts.
    const live = routes.filter(r => r.path.startsWith('/api/v1/') && r.method !== 'HEAD');
    const routeRows = live.map(r => {
      const path = r.path.slice('/api/v1'.length).replace(/:([^/]+)/g, '{$1}');
      const method = String(r.method).toLowerCase(); const op = spec.paths[path]?.[method];
      const published = op?.requestBody?.content?.['application/json']?.schema;
      return { method, path, exists: !!op, has_body: !!r.schema?.body,
        body_schema_equal: isDeepStrictEqual(JSON.parse(JSON.stringify(published ?? null)), JSON.parse(JSON.stringify(r.schema?.body ?? null))) };
    });
    const publishedSet = apiV1Operations(spec).map(({method, path}) => `${method} ${path}`).sort();
    const liveSet = routeRows.map(r => `${r.method} ${r.path}`).sort();
    return { passes: cases.every(c => c.passes) && isDeepStrictEqual(liveSet, publishedSet) && routeRows.every(r => r.body_schema_equal),
      cases, route_sets_equal: isDeepStrictEqual(liveSet, publishedSet), route_count: liveSet.length,
      body_count: routeRows.filter(r => r.has_body).length, route_body_comparison: routeRows };
  } finally { await app.close(); db.close(); }
});

await probe('AE04', 'Pi union schemas preserve valid write inputs; registered command and error positive controls', async () => {
  const savedEnv = { base: process.env.DETUNED_BASE_URL, token: process.env.DETUNED_TOKEN };
  const commands = new Map(); const tools = new Map();
  process.env.DETUNED_BASE_URL = 'http://unused.invalid'; process.env.DETUNED_TOKEN = 'r22-dummy-not-a-credential';
  try {
    activate({ registerTool(t) { tools.set(t.name, t); }, registerCommand(n, c) { commands.set(n, c); }, on() {} });
    const cases = [];
    for (const name of ['forum-check', 'forum-status']) for (const hasUI of [true, false]) for (const fails of [false, true]) {
      const notifications = []; const logs = []; const errors = [];
      console.log = (...v) => logs.push(v); console.error = (...v) => errors.push(v);
      globalThis.fetch = async () => fails ? response(conflict, 409) : response(envelope(name === 'forum-check' ?
        { server_version: 'r22', api_version: '1' } : { actor: { display_name: 'Reviewer', id: 'a-r22' }, visible_spaces: [] }));
      await commands.get(name).handler('', { hasUI, ui: { notify: (...v) => notifications.push(v) } });
      const message = name === 'forum-check' ? (fails ? `Detuned 连通性测试失败: ${conflict.error.message}` : 'Detuned API 正常。版本: r22, API: v1') :
        (fails ? `Detuned 未连接或认证失败: ${conflict.error.message}` : 'Detuned 已连接。当前身份: Reviewer (a-r22), 可见空间: 0');
      const expected = hasUI ? [[message, fails ? 'error' : 'info']] : [[`[${name}] ${message}`]];
      const actual = hasUI ? notifications : fails ? errors : logs;
      cases.push({ name, hasUI, fails, notifications, logs, errors, passes: isDeepStrictEqual(actual, expected) &&
        (hasUI ? logs.length === 0 && errors.length === 0 : notifications.length === 0 && (fails ? logs : errors).length === 0) });
    }
    const schemaPreserved = DETUNED_TOOLS.every(t => isDeepStrictEqual(JSON.parse(JSON.stringify(t.schema)), JSON.parse(JSON.stringify(tools.get(t.name)?.parameters))));
    const schemaCases = [];
    const base = { space_id: 'sp-r22', request_key: 'r22-key' };
    const ref = { post_id: 'p-r22', revision: 1 };
    const validWrites = [
      ['forum_publish', { ...base, op: 'thread', title: 'r22 thread' }],
      ['forum_publish', { ...base, op: 'post', thread_id: 'th-r22', kind: 'note', title: 'r22 post', summary: 'review', body: 'text' }],
      ['forum_publish', { ...base, op: 'revision', post_id: 'p-r22', expected_revision: 1, title: 'r22 revision', summary: 'review', body: 'text' }],
      ['forum_publish', { ...base, op: 'withdraw', post_id: 'p-r22', expected_revision: 1, reason: 'review' }],
      ['forum_relate', { ...base, op: 'create', source_ref: ref, target_ref: { post_id: 'p-r22-b', revision: 1 }, type: 'cites' }],
      ['forum_relate', { ...base, op: 'resolve', relation_id: 'rel-r22', expected_version: 1, reason_ref: ref }],
      ['forum_relate', { ...base, op: 'reopen', relation_id: 'rel-r22', expected_version: 1, reason_ref: ref }],
    ];
    const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false, allErrors: true });
    for (const [name, args] of validWrites) {
      const declared = DETUNED_TOOLS.find(t => t.name === name);
      const registered = tools.get(name);
      const originalValid = ajv.compile(declared.schema)(structuredClone(args));
      const validate = ajv.compile(registered.parameters);
      const adaptedValid = validate(structuredClone(args));
      const sdkOriginal = await outcome(() => validateToolArguments({ ...registered, parameters: declared.schema }, { type: 'toolCall', id: 'r22-args', name, arguments: args }));
      const sdkAdapted = await outcome(() => validateToolArguments(registered, { type: 'toolCall', id: 'r22-args', name, arguments: args }));
      schemaCases.push({ tool: name, op: args.op, original_accepts: originalValid, adapted_accepts: adaptedValid,
        adapted_first_error: validate.errors?.[0] ?? null,
        installed_pi_validator_original: sdkOriginal, installed_pi_validator_adapted: sdkAdapted,
        passes: originalValid && adaptedValid && sdkOriginal.resolved && sdkAdapted.resolved });
    }
    const context = tools.get('forum_context');
    globalThis.fetch = async () => new Response('{', { status: 200 });
    const badJSON = await outcome(() => context.execute('r22-json', { space_id: 'sp-r22' }));
    globalThis.fetch = async () => response(conflict, 409);
    const business = await outcome(() => context.execute('r22-conflict', { space_id: 'sp-r22' }));
    return { passes: cases.every(c => c.passes) && schemaCases.every(c => c.passes) && badJSON.error?.name === 'ClientProtocolError' &&
      business.error?.name === 'DetunedError' && business.error?.code === 'REVISION_CONFLICT' && business.error?.details?.current_revision === 2,
      command_cases: cases, all_tool_schemas_structurally_equal: schemaPreserved, schema_cases: schemaCases,
      tool_count: tools.size, bad_json: badJSON, business_conflict: business };
  } finally {
    if (savedEnv.base === undefined) delete process.env.DETUNED_BASE_URL; else process.env.DETUNED_BASE_URL = savedEnv.base;
    if (savedEnv.token === undefined) delete process.env.DETUNED_TOKEN; else process.env.DETUNED_TOKEN = savedEnv.token;
  }
});

await probe('AE05', 'Finite Retry-After positive controls: HTTP-date, invalid fallback, and date over budget', async () => {
  const now = Date.UTC(2026, 9, 2, 0, 0, 0); Date.now = () => now; Math.random = () => 0;
  const cases = [];
  for (const [name, header, expectedDelay, expectedCalls] of [
    ['http_date', new Date(now + 5000).toUTCString(), 5000, 2],
    ['invalid_header', 'not-a-date-or-seconds', 1000, 2],
    ['date_over_budget', new Date(now + 121000).toUTCString(), null, 1],
  ]) {
    const delays = []; let calls = 0;
    globalThis.setTimeout = (fn, delay, ...args) => { delays.push(delay); return original.setTimeout(fn, 0, ...args); };
    globalThis.fetch = async () => { calls++; return calls === 1 ? response(busy, 503, { 'Retry-After': header }) : response(envelope({ ok: true })); };
    const result = await outcome(() => new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 }).getCapabilities());
    cases.push({ name, header, calls, scheduled_delays_ms: delays, result,
      passes: calls === expectedCalls && isDeepStrictEqual(delays, expectedDelay === null ? [] : [expectedDelay]) &&
        (expectedCalls === 2 ? result.resolved : result.error?.name === 'DetunedError') });
  }
  return { passes: cases.every(c => c.passes), cases,
    limit: 'Checks computed delay and budget only; AD04 separately checks chronological wait behavior.' };
});

console.log(JSON.stringify({ reviewed_date: '2026-10-02', runtime: process.version, probes,
  summary: { passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length } }, null, 2));
process.exitCode = probes.every(p => p.passes) ? 0 : 1;
