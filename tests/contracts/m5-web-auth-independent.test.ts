import {it, expect} from 'vitest';
import {request as httpRequest, createServer, type IncomingHttpHeaders} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import Database from 'better-sqlite3';
import {buildApp} from '@detuned/server';
import {bootstrapDatabase, SqliteStorage} from '@detuned/storage-sqlite';
import {DetunedClient, UserAbortError} from '@detuned/client';

const origin = 'https://web.detuned.test';
const authority = 'web.detuned.test';
type JsonObject = Record<string, unknown>;
type HttpResult = {status: number; headers: IncomingHttpHeaders; body: unknown};
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Private fixture object expected.');
  return value as JsonObject;
}
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Private fixture string expected.'); return value; }
function data(result: HttpResult) { return object(object(result.body).data); }
function errorCode(result: HttpResult) { return object(object(result.body).error).code; }
async function request(url: string, method: string, route: string, headers: Record<string, string | string[]> | string[] = {}, body?: unknown): Promise<HttpResult> {
  const bytes = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const wireHeaders = Array.isArray(headers) ? ['host', authority, ...headers, ...(bytes === undefined ? [] : ['content-type', 'application/json', 'content-length', String(Buffer.byteLength(bytes))])] : {host: authority, ...headers, ...(bytes === undefined ? {} : {'content-type': 'application/json', 'content-length': String(Buffer.byteLength(bytes))})};
    const req = httpRequest(new URL(route, url), {method, headers: wireHeaders}, res => {
      let raw = ''; res.setEncoding('utf8'); res.on('data', chunk => { raw += String(chunk); });
      res.on('end', () => { try { resolve({status: res.statusCode ?? 0, headers: res.headers, body: raw ? JSON.parse(raw) : undefined}); } catch { reject(new Error('Private HTTP response was not JSON.')); } });
      res.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('Private HTTP deadline.'))); req.on('error', reject); req.end(bytes);
  });
}
class Clock {
  value = Date.parse('2026-11-01T00:00:00.000Z');
  now() { return new Date(this.value); }
  nowIso() { return this.now().toISOString(); }
  advance(ms: number) { this.value += ms; }
}
type Identity = {actor: string; credential: string; token: string};
async function fixture(webOrigin: string | null = origin, insecure = false) {
  const owned = await mkdtemp(path.join(tmpdir(), 'detuned-web-auth-independent-'));
  const db = new Database(path.join(owned, 'forum.sqlite')); const admin = bootstrapDatabase(db).adminToken;
  if (!admin) throw new Error('Private fresh bootstrap unavailable.');
  const clock = new Clock(), logs: unknown[] = [];
  const options = {storage: new SqliteStorage(db), clock, requestLogSink: (entry: unknown) => { logs.push(entry); }, ...(webOrigin === null ? {} : {webOrigin, allowInsecureLoopback: insecure})};
  let app = buildApp(options), url = '';
  let seedKey = 0;
  const host = webOrigin === null ? authority : new URL(webOrigin).host;
  async function seed(method: 'POST' | 'PATCH' | 'DELETE', route: string, body?: JsonObject) {
    // Restore the existing actor write bucket with a controlled clock; defaults remain enabled.
    clock.advance(60000);
    const r = await app.inject({method, url: '/api/v1' + route, headers: {host, authorization: 'Bearer ' + admin, 'idempotency-key': 'private-seed-' + ++seedKey}, ...(body === undefined ? {} : {payload: body})});
    expect(r.statusCode).toBeLessThan(300); return object(object(r.json()).data);
  }
  const listen = async () => { await app.listen({host: '127.0.0.1', port: 0}); const a = app.server.address(); if (!a || typeof a === 'string') throw new Error('Private listener unavailable.'); url = `http://127.0.0.1:${a.port}`; };
  try {
    const space = text(object((await seed('POST', '/spaces', {slug: 'private-web', objective: 'Private HTTP authentication', rules: []})).space).id);
    const hidden = text(object((await seed('POST', '/spaces', {slug: 'private-hidden', objective: 'Private inaccessible space', rules: []})).space).id);
    const thread = text(object((await seed('POST', `/spaces/${space}/threads`, {title: 'Private web thread'})).thread).id);
    async function identity(kind: 'human' | 'agent' | 'service', role: 'observer' | 'contributor', expiresAt?: string): Promise<Identity> {
      const actor = text((await seed('POST', '/admin/actors', {kind, display_name: 'Private ' + kind})).id);
      await seed('POST', `/spaces/${space}/memberships`, {actor_id: actor, role});
      const c = await seed('POST', '/admin/credentials', {actor_id: actor, allowed_space_ids: [space], capabilities: ['read', 'write'], ...(expiresAt ? {expires_at: expiresAt} : {})});
      return {actor, credential: text(c.credential_id), token: text(c.token)};
    }
    const contributor = await identity('human', 'contributor'), observer = await identity('human', 'observer');
    const agent = await identity('agent', 'contributor'), service = await identity('service', 'contributor');
    await listen(); logs.length = 0;
    const call = (method: string, route: string, headers: Record<string, string | string[]> = {}, body?: unknown) => request(url, method, route, {host, ...headers}, body);
    const login = (who: Identity, previous?: string) => call('POST', '/auth/session', {origin: webOrigin ?? origin, authorization: 'Bearer ' + who.token, ...(previous ? {cookie: previous} : {})});
    return {owned, db, clock, logs, space, hidden, thread, contributor, observer, agent, service, seed, identity, call, login,
      get url() { return url; },
      restart: async () => { await app.close(); app = buildApp(options); await listen(); },
      close: async () => { await app.close(); db.close(); await rm(owned, {recursive: true, force: true}); }};
  } catch (error) { await app.close(); db.close(); await rm(owned, {recursive: true, force: true}); throw error; }
}
function session(r: HttpResult) {
  expect(r.status).toBe(201); expect(r.headers['cache-control']).toBe('no-store');
  const header = r.headers['set-cookie']?.[0]; if (!header) throw new Error('Private session cookie absent.');
  const cookie = header.split(';')[0]!; expect(cookie).toMatch(/^detuned_session=[A-Za-z0-9_-]{43}$/);
  return {cookie, header, csrf: text(data(r).csrf_token), expires: text(data(r).expires_at), me: object(data(r).me)};
}
function state(f: Awaited<ReturnType<typeof fixture>>) {
  return Object.fromEntries(['actors', 'credentials', 'sessions', 'posts', 'post_revisions', 'events', 'idempotency_records'].map(table => [table, object(f.db.prepare(`SELECT count(*) n FROM ${table}`).get()).n]));
}
const note = {kind: 'note', title: 'Private authorized write', summary: 'HTTP fixture', body: 'Independent web body'};

it('M5 independent real cookie identity keeps contributor/observer ACL, hidden scope, nonhuman rejection and auth-only state separation', async () => {
  const f = await fixture();
  try {
    const before = state(f), human = session(await f.login(f.contributor));
    expect(human.header).toContain('HttpOnly'); expect(human.header).toContain('SameSite=Strict'); expect(human.header).toContain('Path=/'); expect(human.header).toContain('Secure'); expect(human.header).not.toContain('Domain=');
    expect(human.me.capabilities).toEqual(['read', 'write']); expect(human.me.allowed_space_ids).toEqual([f.space]);
    expect(object(human.me.actor).id).toBe(f.contributor.actor); expect(state(f)).toEqual(before);
    const restore = await f.call('GET', '/auth/session', {cookie: human.cookie}); expect(restore.status).toBe(200); expect(restore.headers['cache-control']).toBe('no-store'); expect(data(restore)).toEqual(data(await f.call('GET', '/auth/session', {cookie: human.cookie})));
    const hidden = await f.call('GET', `/api/v1/spaces/${f.hidden}/context`, {cookie: human.cookie}); expect(hidden.status).toBe(404); expect(errorCode(hidden)).toBe('NOT_FOUND');
    expect((await f.call('POST', '/api/v1/admin/actors', {cookie: human.cookie, origin, 'x-detuned-csrf': human.csrf}, {kind: 'human', display_name: 'Cannot mint'})).status).toBe(403);
    const readOnly = session(await f.login(f.observer));
    expect((await f.call('POST', `/api/v1/spaces/${f.space}/threads/${f.thread}/posts`, {cookie: readOnly.cookie, origin, 'x-detuned-csrf': readOnly.csrf, 'idempotency-key': 'observer-denied'}, note)).status).toBe(403);
    for (const who of [f.agent, f.service]) { const denied = await f.login(who); expect(denied.status).toBe(403); expect(denied.headers['set-cookie']).toBeUndefined(); }
    expect(state(f)).toEqual(before);
    const published = await f.call('POST', `/api/v1/spaces/${f.space}/threads/${f.thread}/posts`, {cookie: human.cookie, origin, 'x-detuned-csrf': human.csrf, 'idempotency-key': 'human-positive'}, note);
    expect(published.status).toBe(201); expect(object(data(published).post).author_id).toBe(f.contributor.actor);
    expect(object(f.db.prepare('SELECT count(*) n FROM sessions').get()).n).toBe(0);
  } finally { await f.close(); }
}, 30000);

it('M5 independent persisted credential revoke/expiry, actor disable and membership withdrawal affect an already issued cookie immediately', async () => {
  const f = await fixture();
  try {
    const revoked = session(await f.login(f.contributor)); await f.seed('POST', `/admin/credentials/${f.contributor.credential}/revoke`);
    expect((await f.call('GET', '/auth/session', {cookie: revoked.cookie})).status).toBe(401);
    const expiring = await f.identity('human', 'contributor');
    const expired = session(await f.login(expiring));
    // Independent persisted-authority fault, equivalent to an elapsed credential deadline.
    f.db.prepare('UPDATE credentials SET expires_at=? WHERE id=?').run(f.clock.nowIso(), expiring.credential); f.clock.advance(1);
    expect((await f.call('GET', '/api/v1/me', {cookie: expired.cookie})).status).toBe(401);
    const member = await f.identity('human', 'contributor'), current = session(await f.login(member));
    await f.seed('DELETE', `/spaces/${f.space}/memberships/${member.actor}`);
    expect((await f.call('GET', `/api/v1/spaces/${f.space}/context`, {cookie: current.cookie})).status).toBe(404);
    const me = await f.call('GET', '/auth/session', {cookie: current.cookie}); expect(me.status).toBe(200); expect(object(data(me).me).visible_spaces).toEqual([]);
    f.db.prepare('UPDATE actors SET disabled_at=? WHERE id=?').run(f.clock.nowIso(), member.actor);
    expect((await f.call('GET', '/auth/session', {cookie: current.cookie})).status).toBe(401);
    expect(object(f.db.prepare('SELECT count(*) n FROM posts').get()).n).toBe(0); expect(object(f.db.prepare('SELECT count(*) n FROM sessions').get()).n).toBe(0);
  } finally { await f.close(); }
}, 30000);

it('M5 independent failed replacement and full target credential preserve old login; TTL is absolute and restart forgets cookies without losing forum identity', async () => {
  const f = await fixture();
  try {
    const old = session(await f.login(f.contributor)), before = state(f);
    const invalid = await f.call('POST', '/auth/session', {origin, cookie: old.cookie, authorization: 'Bearer PRIVATE_INVALID_LOGIN'}); expect(invalid.status).toBe(401);
    expect((await f.call('GET', '/auth/session', {cookie: old.cookie})).status).toBe(200);
    const targetSessions = []; for (let i = 0; i < 8; i++) targetSessions.push(session(await f.login(f.observer)));
    const full = await f.login(f.observer, old.cookie); expect(full.status).toBe(429); expect(errorCode(full)).toBe('RATE_LIMITED'); expect(full.headers['retry-after']).toBe('1'); expect(full.headers['set-cookie']).toBeUndefined();
    expect((await f.call('GET', '/auth/session', {cookie: old.cookie})).status).toBe(200);
    for (const s of targetSessions) expect((await f.call('GET', '/auth/session', {cookie: s.cookie})).status).toBe(200);
    f.clock.advance(1800000 - 1); expect((await f.call('GET', '/auth/session', {cookie: old.cookie})).status).toBe(200);
    f.clock.advance(1); expect((await f.call('GET', '/auth/session', {cookie: old.cookie})).status).toBe(401);
    const fresh = session(await f.login(f.contributor)); await f.restart();
    expect((await f.call('GET', '/auth/session', {cookie: fresh.cookie})).status).toBe(401);
    expect((await f.call('GET', '/api/v1/me', {authorization: 'Bearer ' + f.contributor.token})).status).toBe(200); expect(state(f)).toEqual(before);
  } finally { await f.close(); }
}, 30000);

it('M5 independent real duplicate/malformed carriers, hostile Host/Origin and CSRF cannot mutate or log authentication secrets; verified logout reliably revokes', async () => {
  const f = await fixture();
  try {
    const s = session(await f.login(f.contributor)), before = state(f), route = `/api/v1/spaces/${f.space}/threads/${f.thread}/posts`;
    const base = {cookie: s.cookie, origin, 'x-detuned-csrf': s.csrf, 'idempotency-key': 'denied-carrier'};
    const invalid: Record<string, string | string[]>[] = [
      {...base, host: 'hostile.detuned.test'}, {...base, origin: 'https://hostile.detuned.test'}, {...base, origin: [origin, origin]},
      {...base, cookie: s.cookie + '; ' + s.cookie}, {...base, cookie: 'detuned_session=%PRIVATE_BAD_COOKIE'}, {...base, cookie: [s.cookie, s.cookie]},
      {...base, cookie: 'detuned_session=' + 'a'.repeat(9000)}, {...base, 'x-detuned-csrf': 'a'.repeat(43)}, {...base, 'x-detuned-csrf': [s.csrf, s.csrf]},
      {...base, authorization: 'Bearer ' + f.contributor.token},
    ];
    for (const headers of invalid) { const r = await f.call('POST', route, headers, note); expect([400, 403]).toContain(r.status); expect(JSON.stringify(r.body)).not.toContain(f.contributor.token); expect(JSON.stringify(r.body)).not.toContain(s.csrf); }
    const duplicateRawCookie = await request(f.url, 'POST', route, ['cookie', s.cookie, 'cookie', s.cookie, 'origin', origin, 'x-detuned-csrf', s.csrf, 'idempotency-key', 'duplicate-raw-cookie'], note);
    expect(duplicateRawCookie.status).toBe(400);
    const {origin: omittedOrigin, ...withoutOrigin} = base; const {'x-detuned-csrf': omittedCsrf, ...withoutCsrf} = base; void omittedOrigin; void omittedCsrf;
    expect((await f.call('POST', route, withoutOrigin, note)).status).toBe(403); expect((await f.call('POST', route, withoutCsrf, note)).status).toBe(403);
    const hostile: Record<string, string>[] = [{host: 'hostile.detuned.test'}, {origin: 'https://hostile.detuned.test'}];
    for (const headers of hostile) expect((await f.call('GET', '/api/v1/capabilities', headers)).status).toBe(403);
    const failedDelete = await f.call('DELETE', '/auth/session', {cookie: s.cookie, origin}); expect(failedDelete.status).toBe(403);
    expect((await f.call('GET', '/auth/session', {cookie: s.cookie})).status).toBe(200); expect(state(f)).toEqual(before);
    const unknownLoginQuery = await f.call('POST', '/auth/session?unknown=PRIVATE_QUERY', {origin, authorization: 'Bearer ' + f.contributor.token}); expect(unknownLoginQuery.status).toBe(400);
    const unknownGetQuery = await f.call('GET', '/auth/session?unknown=PRIVATE_QUERY', {cookie: s.cookie});
    const invalidDeleteBody = await f.call('DELETE', '/auth/session', {cookie: s.cookie, origin, 'x-detuned-csrf': s.csrf}, {unknown: 'PRIVATE_LOGOUT_BODY'});
    const retainedAfterBadDelete = await f.call('GET', '/auth/session', {cookie: s.cookie});
    console.log('Independent root auth carriers:', JSON.stringify({post_query: unknownLoginQuery.status, get_query: unknownGetQuery.status, delete_nonempty_body: invalidDeleteBody.status, cookie_after_bad_delete: retainedAfterBadDelete.status}));
    expect([unknownGetQuery.status, invalidDeleteBody.status, retainedAfterBadDelete.status]).toEqual([400, 400, 200]);
    const unknownDeleteQuery = await f.call('DELETE', '/auth/session?unknown=PRIVATE_QUERY', {cookie: s.cookie, origin, 'x-detuned-csrf': s.csrf}); expect(unknownDeleteQuery.status).toBe(400);
    expect((await f.call('GET', '/auth/session', {cookie: s.cookie})).status).toBe(200);
    const logout = await f.call('DELETE', '/auth/session', {cookie: s.cookie, origin, 'x-detuned-csrf': s.csrf}); expect(logout.status).toBe(204); expect(logout.headers['cache-control']).toBe('no-store'); expect(logout.headers['set-cookie']?.[0]).toContain('Max-Age=0');
    expect((await f.call('GET', '/auth/session', {cookie: s.cookie})).status).toBe(401);
    const logged = JSON.stringify(f.logs); for (const secret of [f.contributor.token, s.csrf, s.cookie.split('=')[1]!, 'PRIVATE_BAD_COOKIE']) expect(logged).not.toContain(secret);
  } finally { await f.close(); }
}, 30000);

it('M5 independent client root auth uses only one login/logout attempt across actual upstream commits and observes entered-request cancellation safely', async () => {
  const f = await fixture(); const requests: {method: string; route: string; authorization?: string; csrf?: string}[] = [];
  let cookie = '', csrf = '', fault: 'none' | 'status' | 'hang' = 'none', entered = false, disconnected = false;
  const proxy = createServer(async (req, res) => {
    requests.push({method: req.method ?? '', route: req.url ?? '', authorization: req.headers.authorization, csrf: typeof req.headers['x-detuned-csrf'] === 'string' ? req.headers['x-detuned-csrf'] : undefined});
    if (fault === 'hang') { entered = true; res.once('close', () => { disconnected = true; }); req.resume(); return; }
    try {
      const headers = {origin, ...(cookie ? {cookie} : {}), ...(req.headers.authorization ? {authorization: req.headers.authorization} : {}), ...(req.headers['x-detuned-csrf'] ? {'x-detuned-csrf': String(req.headers['x-detuned-csrf'])} : {})};
      const upstream = await f.call(req.method ?? 'GET', req.url ?? '/', headers);
      if (upstream.headers['set-cookie']?.[0]) cookie = upstream.headers['set-cookie'][0].includes('Max-Age=0') ? '' : upstream.headers['set-cookie'][0].split(';')[0]!;
      const failing = fault === 'status' && req.method !== 'GET';
      res.writeHead(failing ? 503 : upstream.status, {'content-type': 'application/json'});
      res.end(failing ? JSON.stringify({api_version: '1', request_id: 'private-fault', error: {code: 'TEMPORARILY_UNAVAILABLE', message: 'Private transport response lost.', retryable: true}}) : upstream.body === undefined ? undefined : JSON.stringify(upstream.body));
    } catch { res.writeHead(500); res.end(); }
  });
  async function barrier(predicate: () => boolean) { const end = performance.now() + 5000; while (!predicate()) { if (performance.now() >= end) throw new Error('Private client barrier deadline.'); await new Promise<void>(resolve => setImmediate(resolve)); } }
  try {
    await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve)); const a = proxy.address(); if (!a || typeof a === 'string') throw new Error('Private proxy unavailable.');
    const client = new DetunedClient({baseUrl: `http://127.0.0.1:${a.port}`, token: 'PRIVATE_DEFAULT_BEARER', maxRetries: 3, browserSession: {getCsrfToken: () => csrf}});
    const first = await client.createWebSession(f.contributor.token); csrf = first.csrf_token; expect((await client.getWebSession()).me.actor.id).toBe(f.contributor.actor);
    expect(requests.map(x => x.route)).toEqual(['/auth/session', '/auth/session']); expect(requests[0]?.authorization).toBe('Bearer ' + f.contributor.token); expect(requests[1]?.authorization).toBeUndefined();
    fault = 'status'; await expect(client.createWebSession(f.contributor.token)).rejects.toMatchObject({code: 'TEMPORARILY_UNAVAILABLE'}); expect(requests.filter(x => x.method === 'POST')).toHaveLength(2);
    fault = 'none'; csrf = (await client.getWebSession()).csrf_token;
    fault = 'status'; await expect(client.deleteWebSession()).rejects.toMatchObject({code: 'TEMPORARILY_UNAVAILABLE'}); expect(requests.filter(x => x.method === 'DELETE')).toHaveLength(1); expect(requests.find(x => x.method === 'DELETE')?.csrf).toBe(csrf);
    fault = 'none'; await expect(client.getWebSession()).rejects.toMatchObject({code: 'UNAUTHENTICATED'});
    fault = 'hang'; const abort = new AbortController(); const cancelled = client.createWebSession(f.contributor.token, {signal: abort.signal}).then(() => undefined, (error: unknown) => error);
    await barrier(() => entered); abort.abort(); const error = await cancelled; expect(error).toBeInstanceOf(UserAbortError); expect(String(error)).not.toContain(f.contributor.token); await barrier(() => disconnected); expect(requests.filter(x => x.method === 'POST')).toHaveLength(3);
    expect(object(f.db.prepare('SELECT count(*) n FROM sessions').get()).n).toBe(0);
  } finally { proxy.closeAllConnections(); await new Promise<void>(resolve => proxy.close(() => resolve())); await f.close(); }
}, 30000);

it('M5 independent disabled Web preserves Bearer, explicit loopback HTTP cookie is scoped, and invalid built CLI Web config precedes mkdir/listen', async () => {
  const f = await fixture(null); const local = await fixture('http://127.0.0.1:4444', true);
  try {
    expect((await f.call('GET', '/api/v1/me', {authorization: 'Bearer ' + f.contributor.token})).status).toBe(200);
    expect((await f.call('POST', `/api/v1/spaces/${f.space}/threads/${f.thread}/posts`, {authorization: 'Bearer ' + f.contributor.token, 'idempotency-key': 'disabled-bearer'}, note)).status).toBe(201);
    const login = await f.login(f.contributor); expect(login.status).toBeGreaterThanOrEqual(400); expect(login.headers['set-cookie']).toBeUndefined();
    const loopback = session(await local.login(local.contributor)); expect(loopback.header).not.toContain('; Secure'); expect(loopback.header).toContain('HttpOnly');
    const bad = [['--web-origin', 'http://example.test', '--web-allow-insecure-loopback'], ['--web-origin', 'http://127.0.0.1:4444'], ['--web-origin', origin + '/path'], ['--web-origin', 'https://name:PRIVATE_CONFIG_SECRET@web.detuned.test'], ['--web-origin', 'http://127.0.0.1:4444', '--web-allow-insecure-loopback', '--host', '0.0.0.0']];
    for (let i = 0; i < bad.length; i++) {
      const dir = path.join(f.owned, 'invalid-' + i); const child = spawn(process.execPath, ['packages/cli/dist/index.js', '--json', 'serve', '--data-dir', dir, '--port', '0', ...bad[i]!], {env: {PATH: process.env.PATH ?? '/usr/bin:/bin'}, stdio: ['ignore', 'pipe', 'pipe']});
      let out = '', err = '', killed = false; child.stdout.on('data', x => { out += String(x); }); child.stderr.on('data', x => { err += String(x); });
      const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 5000); const exit = await new Promise<number | null>(resolve => child.once('close', resolve)); clearTimeout(timer);
      expect(killed).toBe(false); expect(exit).not.toBe(0); expect(out + err).not.toContain('PRIVATE_CONFIG_SECRET'); expect(out + err).not.toContain(dir); await expect(stat(dir)).rejects.toMatchObject({code: 'ENOENT'});
    }
  } finally { await local.close(); await f.close(); }
}, 30000);

it('M5 independent anonymous login budget charges trusted credential/body failures once, excludes hostile origins and refills with controlled time', async () => {
  const f = await fixture();
  try {
    const before = state(f);
    for (let i = 0; i < 22; i++) expect((await f.call('POST', '/auth/session', {origin: 'https://hostile.detuned.test'})).status).toBe(403);
    const missing = await f.call('POST', '/auth/session', {origin}); expect(missing.status).toBe(401); expect(missing.headers['cache-control']).toBe('no-store');
    const badBody = await f.call('POST', '/auth/session', {origin, authorization: 'Bearer ' + f.contributor.token}, 'PRIVATE_INVALID_BODY'); expect(badBody.status).toBe(400);
    for (let i = 0; i < 18; i++) expect((await f.call('POST', '/auth/session', {origin, authorization: 'Bearer PRIVATE_INVALID_TOKEN'})).status).toBe(401);
    const blocked = await f.login(f.contributor); expect(blocked.status).toBe(429); expect(errorCode(blocked)).toBe('RATE_LIMITED'); expect(blocked.headers['retry-after']).toBe('1'); expect(blocked.headers['set-cookie']).toBeUndefined(); expect(state(f)).toEqual(before);
    f.clock.advance(499); expect((await f.login(f.contributor)).status).toBe(429); f.clock.advance(1); session(await f.login(f.contributor));
    expect((await f.login(f.contributor)).status).toBe(429); expect((await f.call('GET', '/api/v1/me', {authorization: 'Bearer ' + f.contributor.token})).status).toBe(200); expect(state(f)).toEqual(before);
  } finally { await f.close(); }
}, 30000);
