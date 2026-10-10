import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { generateOpenApiSpec, CreateCredentialDataSchema, RevokeCredentialDataSchema, DeactivateMembershipDataSchema, RedactionResultSchema, ActorSchema, MembershipSchema, createApiEnvelopeSchema } from '@detuned/protocol';
import { DetunedClient, type RequestKeyScope } from '../../packages/client/src/index.js';
const json = (data: unknown) => new Response(JSON.stringify({ api_version: '1', request_id: 'fixture', data }));
const methods = [
  { name: 'actor', invoke: (c: DetunedClient, signal?: AbortSignal) => c.createActor({ kind: 'agent', display_name: 'source' }, { signal }), path: '/admin/actors', method: 'POST', body: true },
  { name: 'credential', invoke: (c: DetunedClient, signal?: AbortSignal) => c.createCredential({ actor_id: 'a', capabilities: ['read', 'write'], allowed_space_ids: ['s'] }, { signal }), path: '/admin/credentials', method: 'POST', body: true },
  { name: 'revoke', invoke: (c: DetunedClient, signal?: AbortSignal) => c.revokeCredential('id /?', { signal }), path: '/admin/credentials/id%20%2F%3F/revoke', method: 'POST', body: false },
  { name: 'member create', invoke: (c: DetunedClient, signal?: AbortSignal) => c.createMembership('s /?', { actor_id: 'a', role: 'contributor' }, { signal }), path: '/spaces/s%20%2F%3F/memberships', method: 'POST', body: true },
  { name: 'member patch', invoke: (c: DetunedClient, signal?: AbortSignal) => c.patchMembership('s /?', 'a /?', { active: false }, { signal }), path: '/spaces/s%20%2F%3F/memberships/a%20%2F%3F', method: 'PATCH', body: true },
  { name: 'member deactivate', invoke: (c: DetunedClient, signal?: AbortSignal) => c.deactivateMembership('s /?', 'a /?', { signal }), path: '/spaces/s%20%2F%3F/memberships/a%20%2F%3F', method: 'DELETE', body: false },
];
const client = (options = {}) => new DetunedClient({ baseUrl: 'https://forum.test', maxRetries: 3, ...options });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('M4.1-C existing administration shared client', () => {
  it('all six mutations use one attempt across fetch/body/HTTP retry branches and preserve request shape', async () => {
    vi.useFakeTimers();
    const failures = [
      () => { throw Object.assign(new Error('fixture reset'), { code: 'ECONNRESET' }); },
      () => { throw new DOMException('fixture abort', 'AbortError'); },
      () => new Response(new ReadableStream({ start(c) { c.error(Object.assign(new Error('fixture reset'), { code: 'ECONNRESET' })); } })),
      () => new Response(new ReadableStream({ start(c) { c.error(new DOMException('fixture abort', 'AbortError')); } })),
      () => new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'limited', retryable: true } }), { status: 429, headers: { 'retry-after': '0' } }),
      () => new Response(JSON.stringify({ error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'retryable', retryable: true } }), { status: 503, headers: { 'retry-after': '0' } }),
    ];
    for (const operation of methods) for (const failure of failures) {
      const fetch = vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe(`https://forum.test/api/v1${operation.path}`); expect(init.method).toBe(operation.method);
        expect(init.body !== undefined).toBe(operation.body); expect((init.headers as any)['Idempotency-Key']).toBeUndefined();
        return failure();
      }); vi.stubGlobal('fetch', fetch);
      const result = operation.invoke(client()); const assertion = expect(result).rejects.toBeInstanceOf(Error);
      await vi.runAllTimersAsync(); await assertion; expect(fetch, operation.name).toHaveBeenCalledTimes(1);
    }
  });

  it('all six mutations classify timeout and user abort without a second business attempt', async () => {
    vi.useFakeTimers();
    for (const operation of methods) {
      const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true })));
      vi.stubGlobal('fetch', fetch);
      const timed = operation.invoke(client({ timeoutMs: 50 })); const expected = expect(timed).rejects.toMatchObject({ name: 'TimeoutError' });
      await vi.advanceTimersByTimeAsync(50); await expected; expect(fetch).toHaveBeenCalledTimes(1);
      const abort = new AbortController(); const cancelled = operation.invoke(client(), abort.signal); const abortExpected = expect(cancelled).rejects.toMatchObject({ name: 'UserAbortError' });
      abort.abort(); await abortExpected; expect(fetch).toHaveBeenCalledTimes(2);
    }
  });

  it('old idempotent write and new redaction retain retry and the same explicit key', async () => {
    for (const invoke of [(c: DetunedClient) => c.createThread('space', { title: 'test' }, 'same'), (c: DetunedClient) => c.redact('space', { target_type: 'post', target_id: 'post', reason: 'test' }, 'same')]) {
      let calls = 0; const keys: string[] = [];
      vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
        keys.push((init.headers as any)['Idempotency-Key']);
        return ++calls === 1 ? new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'limited', retryable: true } }), { status: 429, headers: { 'retry-after': '0' } }) : json({ redaction_id: 'red' });
      })); await invoke(client()); expect(keys).toEqual(['same', 'same']);
    }
  });

  it('persistent redaction uses one null-target tuple and real server payload409, identity and cancellation guards', async () => {
    const db = new Database(':memory:'); const token = bootstrapDatabase(db).adminToken!;
    const app = buildApp({ storage: new SqliteStorage(db) });
    const scopes: RequestKeyScope[] = []; let seenKey: string | undefined;
    try {
      const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'setup' };
      const space = (await app.inject({ method: 'POST', url: '/api/v1/spaces', headers, payload: { slug: 'redaction-client', objective: 'test', rules: [] } })).json().data.space.id;
      const created = await app.inject({ method: 'POST', url: `/api/v1/spaces/${space}/threads`, headers, payload: { title: 'test', initial_post: { kind: 'note', title: 'test', summary: 'test', body: 'research marker' } } });
      expect(created.statusCode).toBe(201);
      const thread = created.json().data;
      vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
        seenKey = (init.headers as any)['Idempotency-Key'] ?? seenKey;
        const response = await app.inject({ method: init.method as 'GET' | 'POST', url: new URL(url).pathname, headers: init.headers as any, ...(init.body !== undefined ? { payload: String(init.body) } : {}) });
        const outgoing = new Headers();
        for (const [name, value] of Object.entries(response.headers)) if (value !== undefined) outgoing.set(name, Array.isArray(value) ? value.join(', ') : String(value));
        return new Response(response.body, { status: response.statusCode, headers: outgoing });
      }));
      const c = client({ token, requestKeyStore: { async getOrCreate(scope: RequestKeyScope) { scopes.push(scope); return 'redact-persistent'; } } });
      const body = { target_type: 'post' as const, target_id: thread.initial_post.post.id, reason: 'test' }; const opts = { logicalOperationId: 'same' };
      const result = await c.redact(space, body, undefined, opts);
      expect(await c.redact(space, body, undefined, opts)).toEqual(result);
      await expect(c.redact(space, { ...body, reason: 'changed' }, undefined, opts)).rejects.toMatchObject({ statusCode: 409 });
      expect(scopes).toHaveLength(3); expect(scopes[0]).toMatchObject({ spaceId: space, operation: 'admin.redaction', target: null }); expect(scopes[1]).toEqual(scopes[0]); expect(seenKey).toBe('redact-persistent');
      expect((db.prepare('SELECT count(*) AS n FROM redactions').get() as any).n).toBe(1);
      await expect(c.redact(space, body, '', opts)).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
      const changed = client({ token, requestKeyStore: { async getOrCreate() { changed.setToken('changed'); return 'key'; } } });
      await expect(changed.redact(space, body, undefined, opts)).rejects.toMatchObject({ code: 'IDENTITY_CHANGED' });
      let enter!: () => void; const entered = new Promise<void>(r => enter = r); let release!: (key: string) => void; const pending = new Promise<string>(r => release = r);
      const cancelled = client({ token, requestKeyStore: { getOrCreate() { enter(); return pending; } } }); const abort = new AbortController();
      const operation = cancelled.redact(space, body, undefined, { ...opts, signal: abort.signal }); void operation.catch(() => {});
      await entered; abort.abort(); await expect(operation).rejects.toMatchObject({ name: 'UserAbortError' }); release('late'); await pending;
      expect((db.prepare('SELECT count(*) AS n FROM redactions').get() as any).n).toBe(1);
    } finally { await app.close(); db.close(); }
  });

  it('public DTO/OpenAPI envelopes match all seven wire results without token_hash or false key requirements', () => {
    const spec = generateOpenApiSpec() as any;
    const cases = [
      ['/admin/actors', 'post', '201', ActorSchema], ['/admin/credentials', 'post', '201', CreateCredentialDataSchema],
      ['/admin/credentials/{id}/revoke', 'post', '200', RevokeCredentialDataSchema], ['/spaces/{space_id}/memberships', 'post', '201', MembershipSchema],
      ['/spaces/{space_id}/memberships/{actor_id}', 'patch', '200', MembershipSchema], ['/spaces/{space_id}/memberships/{actor_id}', 'delete', '200', DeactivateMembershipDataSchema],
      ['/spaces/{space_id}/redactions', 'post', '201', RedactionResultSchema],
    ] as const;
    for (const [path, method, status, schema] of cases) {
      const operation = spec.paths[path][method]; expect(operation.responses[status].content['application/json'].schema).toEqual(createApiEnvelopeSchema(schema));
      expect(operation.responses[status].content['application/json'].schema.additionalProperties).toBe(false);
      expect(JSON.stringify(operation.responses)).not.toContain('token_hash');
      const key = operation.parameters?.filter((p: any) => p.in === 'header' && p.name === 'Idempotency-Key') ?? [];
      expect(key).toHaveLength(path.endsWith('/redactions') ? 1 : 0);
    }
    expect(Object.keys(CreateCredentialDataSchema.properties)).toEqual(['credential_id', 'actor_id', 'token']);
    expect(CreateCredentialDataSchema.additionalProperties).toBe(false);
  });
});
