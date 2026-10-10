// R20 independent C01/C02/C03 checks. In-memory DB, controlled fetch; no model/network.
import { createRequire } from 'node:module';
import { getEventListeners } from 'node:events';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import { DetunedClient, UserAbortError, TimeoutError } from '../../../../../packages/client/dist/index.js';
import { DetunedError } from '../../../../../packages/protocol/dist/index.js';
import activate from '../../../../../packages/adapter-pi/dist/index.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const probes = [];
const savedFetch = globalThis.fetch;
const realSetTimeout = globalThis.setTimeout;
const savedRandom = Math.random;
const envelope = (data = {}, extra = {}) => ({ api_version: '1', request_id: 'r20-local', data, ...extra });
const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const describeError = e => ({ name: e.name, code: e.code ?? null, status: e.statusCode ?? null,
  isUserAbort: e instanceof UserAbortError, isTimeout: e instanceof TimeoutError,
  isDetunedError: e instanceof DetunedError, message: e.message });
const outcome = async fn => { try { return { resolved: true, value: await fn() }; }
  catch (e) { return { resolved: false, error: describeError(e) }; } };
async function probe(id, name, fn) {
  try { probes.push({ id, name, ...await fn() }); }
  catch (e) { probes.push({ id, name, passes: false, probe_error: describeError(e) }); }
  finally { globalThis.fetch = savedFetch; globalThis.setTimeout = realSetTimeout; Math.random = savedRandom; }
}

await probe('AC01', 'C01 query/body/reference validation rejects without side effects', async () => {
  const db = new Database(':memory:');
  const boot = bootstrapDatabase(db);
  const app = buildApp({ storage: new SqliteStorage(db) });
  const headers = { authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': 'r20-fixture' };
  const inject = (method, url, payload, moreHeaders = {}) => app.inject({ method, url,
    headers: { ...headers, ...moreHeaders }, ...(payload === undefined ? {} : { payload }) });
  try {
    const sp = await inject('POST', '/api/v1/spaces', { slug: 'r20-local', objective: 'review', rules: [] });
    if (sp.statusCode !== 201) throw new Error('space fixture failed');
    const sid = sp.json().data.space.id;
    const th = await inject('POST', `/api/v1/spaces/${sid}/threads`, { title: 'positive', initial_post:
      { kind: 'note', title: 'n', summary: 's', body: 'r20 alpha' } }, { 'idempotency-key': 'r20-thread' });
    const pid = th.json().data.initial_post.post.id;
    const before = () => ({ relations: db.prepare('SELECT count(*) n FROM relations').get().n,
      events: db.prepare('SELECT count(*) n FROM events').get().n,
      idempotency: db.prepare('SELECT count(*) n FROM idempotency_records').get().n,
      memberships: db.prepare('SELECT count(*) n FROM memberships').get().n });
    const cases = [];
    for (const [name, method, url, payload, hdr] of [
      ['unknown_query', 'GET', '/api/v1/spaces?bogus=1'],
      ['duplicate_cursor', 'GET', '/api/v1/spaces?cursor=a&cursor=b'],
      ['duplicate_tags', 'GET', `/api/v1/spaces/${sid}/search?q=alpha&tags=a&tags=b`],
      ['invalid_state', 'GET', `/api/v1/spaces/${sid}/threads?state=not_a_state`],
      ['explicit_empty_revision', 'GET', `/api/v1/spaces/${sid}/posts/${pid}?revision=`],
      ['missing_actor_reference', 'POST', `/api/v1/spaces/${sid}/memberships`, { actor_id: 'r20-missing-actor', role: 'contributor' }],
      ['malformed_json', 'POST', `/api/v1/spaces/${sid}/threads`, '{', { 'content-type': 'application/json', 'idempotency-key': 'r20-bad-json' }],
    ]) {
      const snapshot = before();
      const res = await inject(method, url, payload, hdr);
      cases.push({ name, status: res.statusCode, code: res.json().error?.code ?? null,
        state_unchanged: JSON.stringify(snapshot) === JSON.stringify(before()),
        passes: res.statusCode >= 400 && res.statusCode < 500 && JSON.stringify(snapshot) === JSON.stringify(before()) });
    }
    const actor = await inject('POST', '/api/v1/admin/actors', { kind: 'agent', display_name: 'R20 local' });
    const cred = await inject('POST', '/api/v1/admin/credentials', { actor_id: actor.json().data.id });
    const cid = cred.json().data.credential_id;
    const revoke = await inject('POST', `/api/v1/admin/credentials/${cid}/revoke`, { unrecognized_business_field: true });
    const revoked = db.prepare('SELECT revoked_at FROM credentials WHERE id=?').get(cid).revoked_at !== null;
    cases.push({ name: 'revoke_unknown_body', status: revoke.statusCode, credential_revoked: revoked,
      passes: revoke.statusCode >= 400 && revoke.statusCode < 500 && !revoked });
    const positive = await inject('GET', '/api/v1/spaces?limit=1', undefined,
      { accept: 'application/json', 'user-agent': 'r20-local', host: 'localhost' });
    const sub = await inject('POST', `/api/v1/spaces/${sid}/subscriptions`, { consumer_key: 'r20-poll', start: 'now' });
    const consumerId = sub.json().data.consumer.id;
    globalThis.fetch = async (url, init) => {
      const res = await app.inject({ method: init.method, url: new URL(url).pathname,
        headers: init.headers, ...(init.body === undefined ? {} : { payload: init.body }) });
      return new Response(res.body, { status: res.statusCode });
    };
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', token: boot.adminToken, maxRetries: 0 });
    const defaultPoll = await outcome(() => client.poll(sid, consumerId));
    const explicitPoll = await outcome(() => client.poll(sid, consumerId, {}));
    cases.push({ name: 'client_poll_omitted_optional_query', resolved: defaultPoll.resolved,
      error: defaultPoll.error, explicit_empty_object_resolved: explicitPoll.resolved,
      passes: defaultPoll.resolved && explicitPoll.resolved });
    return { passes: cases.every(c => c.passes) && positive.statusCode === 200, cases, positive_status: positive.statusCode };
  } finally { await app.close(); db.close(); }
});

await probe('AC02', 'C02 validates known successful envelope fields', async () => {
  const client = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0, timeoutMs: 0 });
  const cases = [];
  for (const [name, input] of [
    ['wrong_api_version', envelope({}, { api_version: '999' })],
    ['null_request_id', envelope({}, { request_id: null })],
    ['object_request_id', envelope({}, { request_id: {} })],
    ['error_and_data', envelope(null, { error: { code: 'FORBIDDEN', message: 'denied', retryable: false } })],
  ]) {
    globalThis.fetch = async () => response(input);
    const r = await outcome(() => client.getCapabilities());
    cases.push({ name, ...r, passes: !r.resolved });
  }
  globalThis.fetch = async () => response(envelope(false, { future_extension: 1 }));
  const positive = await outcome(() => client.request({ method: 'GET', path: '/test' }));
  return { passes: cases.every(c => c.passes) && positive.resolved && positive.value.data === false,
    cases, positive };
});

await probe('AC03', 'C02 preserves server errors independently of message wording', async () => {
  const cases = [];
  for (const message of ['revision conflict', 'transaction aborted because revision changed']) {
    globalThis.fetch = async () => response({ api_version: '1', request_id: 'r20', error:
      { code: 'REVISION_CONFLICT', message, retryable: false, details: { current_revision: 2 } } }, 409);
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0, timeoutMs: 0 });
    const r = await outcome(() => client.request({ method: 'POST', path: '/test', requestKey: 'r20-key' }));
    cases.push({ message, ...r, passes: !r.resolved && r.error.code === 'REVISION_CONFLICT' && !r.error.isUserAbort });
  }
  return { passes: cases.every(c => c.passes), cases };
});

await probe('AC04', 'C02 network/status retry policy and Retry-After', async () => {
  const cases = [];
  // Record scheduled delays; accelerate waiting only. No outbound HTTP is performed.
  let delays = [];
  globalThis.setTimeout = (fn, delay, ...args) => { delays.push(delay); return realSetTimeout(fn, 0, ...args); };
  Math.random = () => 0;
  for (const mode of ['fetch_cause_econnrefused', 'retry_after_503', 'retryable_400']) {
    delays = [];
    let calls = 0;
    const keys = [];
    globalThis.fetch = async (_url, opts) => {
      calls++; keys.push(opts.headers['Idempotency-Key']);
      if (calls === 1) {
        if (mode === 'fetch_cause_econnrefused') throw new TypeError('fetch failed', { cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) });
        if (mode === 'retry_after_503') return response({ error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true } }, 503, { 'Retry-After': '60' });
        return response({ error: { code: 'VALIDATION_ERROR', message: 'bad input', retryable: true } }, 400);
      }
      return response(envelope({ ok: true }));
    };
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 1, timeoutMs: 0 });
    const r = await outcome(() => client.request({ method: 'POST', path: '/test', requestKey: 'r20-stable-key' }));
    const passes = mode === 'fetch_cause_econnrefused' ? r.resolved && calls === 2 :
      mode === 'retry_after_503' ? (calls === 1 && !r.resolved) || (calls === 2 && delays.some(d => d >= 60000)) :
      calls === 1 && !r.resolved;
    cases.push({ mode, calls, keys, scheduled_delays_ms: [...delays], ...r, passes });
  }
  return { passes: cases.every(c => c.passes), cases };
});

await probe('AC05', 'C02 cancellation phases, final listener cleanup, and timeout positive controls', async () => {
  const cases = [];
  for (const phase of ['before_request', 'headers', 'body', 'backoff', 'timeout']) {
    const ctl = new AbortController();
    let reachedResolve;
    const reached = new Promise(resolve => { reachedResolve = resolve; });
    let calls = 0;
    let backoffReached = false;
    globalThis.setTimeout = (fn, delay, ...args) => {
      const timer = realSetTimeout(fn, delay, ...args);
      if (phase === 'backoff' && delay >= 1000 && delay < 2000) { backoffReached = true; queueMicrotask(() => reachedResolve()); }
      return timer;
    };
    globalThis.fetch = async (_url, opts) => {
      calls++;
      if (phase === 'backoff') return response({ error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true } }, 503);
      const waitForAbort = () => new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('controlled cancellation', 'AbortError')), { once: true });
        reachedResolve();
      });
      if (phase === 'body') return { ok: true, status: 200, json: waitForAbort };
      return waitForAbort();
    };
    if (phase === 'before_request') ctl.abort();
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: phase === 'timeout' ? 5 : 0, maxRetries: 1 });
    const p = outcome(() => client.getCapabilities({ signal: ctl.signal }));
    if (!['before_request', 'timeout'].includes(phase)) { await reached; ctl.abort(); }
    const r = await p;
    const listeners = getEventListeners(ctl.signal, 'abort').length;
    cases.push({ phase, calls, backoffReached, final_abort_listeners: listeners, ...r,
      passes: !r.resolved && (phase === 'timeout' ? r.error.isTimeout : r.error.isUserAbort) &&
        calls === (phase === 'before_request' ? 0 : 1) && listeners === 0 });
    globalThis.setTimeout = realSetTimeout;
  }
  return { passes: cases.every(c => c.passes), cases };
});

await probe('AC06', 'C03 registered Pi command/tool controlled positive and failure paths', async () => {
  const tools = new Map(); const commands = new Map();
  // No real credentials/config are read by this controlled activation.
  const envKeys = ['DETUNED_BASE_URL', 'DETUNED_TOKEN', 'DETUNED_TOKEN_FILE'];
  const previous = Object.fromEntries(envKeys.map(k => [k, process.env[k]]));
  const oldLog = console.log; const oldError = console.error;
  const outputs = []; const notifications = [];
  try {
    process.env.DETUNED_BASE_URL = 'http://unused.invalid';
    delete process.env.DETUNED_TOKEN; delete process.env.DETUNED_TOKEN_FILE;
    activate({ registerTool(t) { tools.set(t.name, t); }, registerCommand(n, c) { commands.set(n, c); }, on() { return () => undefined; } });
    console.log = (...args) => outputs.push({ channel: 'log', text: args.join(' ') });
    console.error = (...args) => outputs.push({ channel: 'error', text: args.join(' ') });
    const cases = [];
    for (const hasUI of [true, false]) for (const name of ['forum-check', 'forum-status']) {
      globalThis.fetch = async url => response(envelope(url.endsWith('/me') ?
        { actor: { id: 'local-actor', display_name: 'Local' }, visible_spaces: [] } : { api_version: '1', server_version: 'test' }));
      const a = outputs.length, b = notifications.length;
      await commands.get(name).handler('', { mode: hasUI ? 'tui' : 'json', hasUI,
        ui: { notify: (...args) => notifications.push(args) } });
      cases.push({ hasUI, name, outputs: outputs.slice(a), notifications: notifications.slice(b),
        passes: hasUI ? notifications.length === b + 1 && outputs.length === a : outputs.length === a + 1 && notifications.length === b });
    }
    // Approved M4.4-B adapter: reach the same malformed BUSINESS JSON after legal shared preflight.
    const toolHttpStages = [];
    globalThis.fetch = async url => {
      const stage = new URL(url).pathname.split('/').at(-1); toolHttpStages.push(stage);
      if (stage === 'capabilities') return response(envelope({ api_version: '1', server_version: 'test' }));
      if (stage === 'me') return response(envelope({ actor: { id: 'local-actor', kind: 'agent', display_name: 'Local', created_at: '2026-10-09T00:00:00Z', disabled_at: null }, capabilities: ['read'], allowed_space_ids: ['local-space'], visible_spaces: [] }));
      if (stage === 'sessions') return response(envelope({ id: 'local-session', actor_id: 'local-actor', space_id: 'local-space', client_name: 'detuned-pi', client_version: '0.1.0', harness_session_id: null, metadata: {}, created_at: '2026-10-09T00:00:00Z' }));
      return new Response('{"data":', { status: 200 });
    };
    const toolResult = await outcome(() => tools.get('forum_context').execute('r20-tool', { space_id: 'local-space' }, new AbortController().signal));
    return { passes: cases.every(c => c.passes) && !toolResult.resolved && JSON.stringify(toolHttpStages) === JSON.stringify(['capabilities', 'me', 'sessions', 'context']), cases, malformed_json_tool: toolResult, malformed_json_http_stages: toolHttpStages,
      scope: 'registered extension callbacks only; not real host certification' };
  } finally {
    console.log = oldLog; console.error = oldError;
    for (const [k, v] of Object.entries(previous)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

const result = { probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failed ? 1 : 0;
