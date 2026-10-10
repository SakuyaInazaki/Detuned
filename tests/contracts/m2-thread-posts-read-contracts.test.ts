import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { FormatRegistry } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { CONTEXT_BYTES, THREAD_POST_LIMIT, THREAD_POSTS_CURSOR_ERROR_MESSAGE, DETUNED_TOOLS, ThreadPostsPageSchema, ThreadPostsEnvelopeSchema, ThreadPostsReadQuerySchema, ThreadPostsReadCursorPayloadSchema, ToolReadParamsSchema, serializeThreadPostsEnvelope, threadPostsEnvelopeBytes, generateOpenApiSpec } from '@detuned/protocol';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient, UserAbortError } from '@detuned/client';

describe('M2.4-B.2.2 bounded thread metadata transport', () => {
  let db: Database.Database, app: ReturnType<typeof buildApp>, storage: SqliteStorage;
  let token: string, sid: string, tid: string;
  let requestId = '真实"\\🙂';
  const headers = () => ({ authorization: `Bearer ${token}` });
  const route = (query = '') => `/api/v1/spaces/${sid}/threads/${tid}/posts${query ? `?${query}` : ''}`;
  let previousDateFormat: ((value: string) => boolean) | undefined;
  beforeEach(async ({ task }) => {
    previousDateFormat = FormatRegistry.Get('date-time');
    FormatRegistry.Set('date-time', value => /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)));
    requestId = '真实"\\🙂';
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db);
    // D07/D08 seed twenty writes before another mutation; their read-contract fixtures use an explicit budget.
    const writeRateLimits = /^(D07|D08):/.test(task.name) ? { per_minute: 60000, burst: 10000 } : undefined;
    app = buildApp({ storage, writeRateLimits }); app.addHook('onRequest', (req, _reply, done) => { req.id = requestId; done(); }); await app.ready();
    const space = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'space' }, payload: { slug: 'thread-read', objective: 'directory', rules: [] } });
    expect(space.statusCode).toBe(201); sid = space.json().data.space.id;
    const thread = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'thread' }, payload: { title: '目录"\\🙂' } });
    expect(thread.statusCode).toBe(201); tid = thread.json().data.thread.id;
    for (let i = 0; i < 18; i++) {
      const post = await app.inject({ method: 'POST', url: route(), headers: { ...headers(), 'idempotency-key': `post-${i}` }, payload: { kind: 'note', title: `p${i}`, summary: 'summary', body: 'SECRET BODY', tags: [], structured: {} } });
      expect(post.statusCode).toBe(201);
    }
  });
  afterEach(async () => { vi.unstubAllGlobals(); if (previousDateFormat) FormatRegistry.Set('date-time', previousDateFormat); else FormatRegistry.Delete('date-time'); await app?.close(); db?.close(); });

  it('D01: raw 4K/64K/default envelopes reconstruct exactly the sorted metadata directory', async () => {
    const expected = storage.listPostsInThread(tid, 100).posts;
    for (const budget of [4096, 65536, undefined]) {
      let cursor: string | undefined; const ids: string[] = []; let count = 0;
      do {
        const q = new URLSearchParams({ limit: '100', ...(budget === undefined ? {} : { max_bytes: String(budget) }), ...(cursor ? { cursor } : {}) });
        const res = await app.inject({ method: 'GET', url: route(q.toString()), headers: headers() });
        expect(res.statusCode, res.payload).toBe(200); const envelope = res.json(); const page = { data: envelope.data, meta: envelope.meta };
        expect(Buffer.byteLength(res.payload)).toBeLessThanOrEqual(budget ?? 12288);
        expect(res.payload).toBe(serializeThreadPostsEnvelope(requestId, page));
        expect(threadPostsEnvelopeBytes(requestId, page)).toBe(Buffer.byteLength(res.payload));
        expect(Value.Check(ThreadPostsEnvelopeSchema, envelope)).toBe(true);
        expect(res.payload).not.toContain('SECRET BODY'); expect(envelope.request_id).toBe(requestId);
        ids.push(...page.data.posts.map((post: { id: string }) => post.id));
        cursor = page.meta.next_cursor ?? undefined; expect(++count).toBeLessThan(30);
      } while (cursor);
      expect(ids).toEqual(expected.map(post => post.id)); if (budget === 4096) expect(count).toBeGreaterThan(1);
    }
  });

  it('D02: limit continuation differs from budget truncation and old bare cursor still works', async () => {
    const first = await app.inject({ method: 'GET', url: route('limit=1'), headers: headers() });
    expect(first.statusCode).toBe(200); expect(first.json().meta).toMatchObject({ truncated: false, next_cursor: expect.any(String) });
    const next = await app.inject({ method: 'GET', url: route(`limit=100&max_bytes=4096&cursor=${encodeURIComponent(first.json().meta.next_cursor)}`), headers: headers() });
    expect(next.statusCode).toBe(200); expect(next.json().data.posts[0].id).not.toBe(first.json().data.posts[0].id);
    const old = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/threads/${tid}?limit=1`, headers: headers() });
    expect(old.statusCode).toBe(200); expect(old.json().meta.next_cursor).toBe(old.json().data.posts[0].id);
    const oldNext = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/threads/${tid}?limit=1&cursor=${encodeURIComponent(old.json().meta.next_cursor)}`, headers: headers() });
    expect(oldNext.json().data.posts[0].id).not.toBe(old.json().data.posts[0].id);
    const invalid = await app.inject({ method: 'GET', url: route(`cursor=${old.json().meta.next_cursor}`), headers: headers() }); expect(invalid.statusCode).toBe(400);
  });

  it('D03: strict transport rejects ignored parameters and exact full envelope boundary returns 422', async () => {
    for (const q of ['limit=0', 'limit=101', 'limit=1bad', 'limit=1&limit=2', 'max_bytes=4095', 'max_bytes=65537', 'cursor=', 'revision=1', 'cursor=' + 'x'.repeat(4097)]) {
      const res = await app.inject({ method: 'GET', url: route(q), headers: headers() }); expect(res.statusCode, q).toBe(400);
    }
    const first = await app.inject({ method: 'GET', url: route('limit=1&max_bytes=4096'), headers: headers() });
    const base = Buffer.byteLength(first.payload); requestId += 'x'.repeat(4096 - base);
    const fit = await app.inject({ method: 'GET', url: route('limit=1&max_bytes=4096'), headers: headers() });
    expect(fit.statusCode).toBe(200); expect(Buffer.byteLength(fit.payload)).toBe(4096);
    requestId += 'x'; const fail = await app.inject({ method: 'GET', url: route('limit=1&max_bytes=4096'), headers: headers() }); expect(fail.statusCode).toBe(422);
  });

  it('D04: whole schemas enforce all three metadata branches and strict cursor purpose', async () => {
    const res = await app.inject({ method: 'GET', url: route('limit=1'), headers: headers() });
    const data = res.json().data;
    for (const meta of [{ truncated: true, next_cursor: 'signed' }, { truncated: false, next_cursor: 'signed' }, { truncated: false, next_cursor: null }]) expect(Value.Check(ThreadPostsPageSchema, { data, meta })).toBe(true);
    expect(Value.Check(ThreadPostsPageSchema, { data: { ...data, posts: [] }, meta: { truncated: false, next_cursor: null } })).toBe(true);
    for (const invalid of [
      { data, meta: { truncated: true, next_cursor: null } }, { data, meta: { truncated: false, next_cursor: '' } },
      { data: { ...data, posts: [] }, meta: { truncated: false, next_cursor: 'signed' } },
      { data: { ...data, posts: [] }, meta: { truncated: true, next_cursor: 'signed' } },
      { data: { ...data, body: 'content' }, meta: { truncated: false, next_cursor: null } },
    ]) expect(Value.Check(ThreadPostsPageSchema, invalid)).toBe(false);
    expect(Value.Check(ThreadPostsPageSchema, { data: { ...data, thread: { ...data.thread, title: 'x'.repeat(200) } }, meta: { truncated: false, next_cursor: null } })).toBe(true);
    const payload = { v: 1, purpose: 'thread_posts_read', actor_id: 'a', space_id: sid, thread_id: tid, sort: 'id_asc', after_id: 'missing-row', exp: 1 };
    expect(Value.Check(ThreadPostsReadCursorPayloadSchema, payload)).toBe(true);
    for (const invalid of [{ ...payload, extra: 1 }, { ...payload, sort: 'created_at' }, { ...payload, purpose: 'post_revision_read' }, { ...payload, after_id: '' }]) expect(Value.Check(ThreadPostsReadCursorPayloadSchema, invalid)).toBe(false);
  });

  it('D05: client and tool dispatch retain full page, query and signal; old thread stays data-only', async () => {
    const requests: { url: URL; signal: AbortSignal | null | undefined }[] = [];
    vi.stubGlobal('fetch', async (input: string, init: RequestInit) => {
      const url = new URL(input); requests.push({ url, signal: init.signal });
      const res = await app.inject({ method: 'GET', url: url.pathname + url.search, headers: headers() });
      return new Response(res.payload, { status: res.statusCode, headers: { 'content-type': 'application/json' } });
    });
    const client = new DetunedClient({ baseUrl: 'http://localhost', token, maxRetries: 0 });
    const controller = new AbortController();
    const page = await client.getThreadPosts(sid, tid, { limit: 1, max_bytes: 4096 }, { signal: controller.signal });
    expect(page.meta.next_cursor).toBeTruthy(); expect(requests[0]!.url.searchParams.get('limit')).toBe('1'); expect(requests[0]!.signal).toBeInstanceOf(AbortSignal);
    const tool = await client.callTool('forum_read', { kind: 'thread_posts', space_id: sid, id: tid, limit: 1 }); expect(tool).toHaveProperty('meta.next_cursor');
    const old = await client.callTool('forum_read', { kind: 'thread', space_id: sid, id: tid }); expect(old).toHaveProperty('posts'); expect(old).not.toHaveProperty('meta');
    controller.abort(); await expect(client.getThreadPosts(sid, tid, {}, { signal: controller.signal })).rejects.toBeInstanceOf(UserAbortError);
    const valid = { kind: 'thread_posts', space_id: sid, id: tid, limit: 1, max_bytes: 4096 };
    expect(Value.Check(ToolReadParamsSchema, valid)).toBe(true);
    for (const invalid of [{ ...valid, revision: 1 }, { ...valid, limit: 101 }, { ...valid, kind: 'thread' }]) {
      expect(Value.Check(ToolReadParamsSchema, invalid)).toBe(false); await expect(client.callTool('forum_read', invalid)).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(DETUNED_TOOLS.map(t => t.name)).toEqual(['forum_context', 'forum_search', 'forum_read', 'forum_publish', 'forum_relate', 'forum_subscribe', 'forum_poll', 'forum_ack', 'forum_review']);
  });

  it('D07: directory current head leads to fixed stored content without aggregating or drifting', async () => {
    const first = await app.inject({ method: 'GET', url: route('limit=1'), headers: headers() });
    const post = first.json().data.posts[0]; const revision = post.current_revision;
    const revised = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/posts/${post.id}/revisions`, headers: { ...headers(), 'idempotency-key': 'revise' }, payload: { expected_revision: revision, title: 'new', summary: 'new summary', body: 'NEW BODY', tags: [], structured: {} } });
    expect(revised.statusCode).toBe(201);
    const fixed = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${post.id}/revisions/${revision}?max_bytes=4096`, headers: headers() });
    expect(fixed.statusCode).toBe(200); expect(JSON.parse(fixed.json().data.chunk).body).toBe('SECRET BODY'); expect(fixed.json().data.has_newer_revision).toBe(true);
    const current = await app.inject({ method: 'GET', url: route('limit=1'), headers: headers() });
    expect(current.json().data.posts[0].current_revision).toBe(revision + 1);
    expect(current.payload).not.toContain('NEW BODY'); expect(current.payload).not.toContain('SECRET BODY');
  });

  it('D08: string cursor business validation follows current access and thread ownership with fixed errors', async () => {
    const readerToken = 'test-reader-token-only-in-memory'; const now = new Date().toISOString();
    storage.createActor({ id: 'reader', kind: 'human', display_name: 'reader', created_at: now, disabled_at: null });
    storage.createCredential({ id: 'reader-credential', actor_id: 'reader', token_hash: createHash('sha256').update(readerToken).digest('hex'), allowed_space_ids: [sid], capabilities: ['read'], created_at: now, expires_at: null, revoked_at: null });
    const noReadToken = 'test-no-read-token-only-in-memory';
    storage.createActor({ id: 'no-read', kind: 'human', display_name: 'no-read', created_at: now, disabled_at: null });
    storage.createCredential({ id: 'no-read-credential', actor_id: 'no-read', token_hash: createHash('sha256').update(noReadToken).digest('hex'), allowed_space_ids: [sid], capabilities: ['write'], created_at: now, expires_at: null, revoked_at: null });
    storage.upsertMembership({ space_id: sid, actor_id: 'no-read', role: 'observer', active: true, reviewer_eligible: false, independence_group: null });
    const otherSpace = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'other-space' }, payload: { slug: 'other-directory', objective: 'other', rules: [] } });
    expect(otherSpace.statusCode).toBe(201); const otherSid = otherSpace.json().data.space.id;
    const failures: string[] = [];
    for (const cursor of ['', '   ', 'x'.repeat(4097)]) {
      const query = 'cursor=' + encodeURIComponent(cursor);
      const valid = await app.inject({ method: 'GET', url: route(query), headers: headers() });
      if (valid.statusCode !== 400 || valid.json().error?.message !== THREAD_POSTS_CURSOR_ERROR_MESSAGE) failures.push(`authorized cursor length ${cursor.length}: ${valid.statusCode}/${valid.json().error?.message}`);
      for (const target of [
        { url: route(query), headers: { authorization: `Bearer ${readerToken}` }, expected: 404, label: 'nonmember' },
        { url: route(query), headers: { authorization: `Bearer ${noReadToken}` }, expected: 403, label: 'no-read-capability' },
        { url: `/api/v1/spaces/${otherSid}/threads/${tid}/posts?${query}`, headers: headers(), expected: 404, label: 'crossspace' },
        { url: `/api/v1/spaces/${sid}/threads/missing/posts?${query}`, headers: headers(), expected: 404, label: 'missing' },
      ]) {
        const response = await app.inject({ method: 'GET', url: target.url, headers: target.headers });
        if (response.statusCode !== target.expected) failures.push(`${target.label} cursor length ${cursor.length}: expected ${target.expected}, actual ${response.statusCode}`);
      }
    }
    for (const query of ['cursor=x&cursor=y', 'unknown=x']) {
      const response = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/threads/missing/posts?${query}`, headers: headers() });
      expect(response.statusCode).toBe(400);
    }
    expect(failures).toEqual([]);
  });

  it('D06: OpenAPI merges new GET with unchanged POST and restores exact cursor policy', () => {
    type Operation = { requestBody?: unknown; parameters?: { name: string; schema: unknown }[]; responses: Record<string, { content?: Record<string, { schema: unknown }> }> };
    const spec = generateOpenApiSpec() as { paths: Record<string, { get?: Operation; post?: Operation }> }; const path = spec.paths['/spaces/{space_id}/threads/{id}/posts']!;
    expect(path.post!.requestBody).toBeDefined(); const get = path.get!;
    expect(get.requestBody).toBeUndefined();
    expect(get.parameters!.find(p => p.name === 'limit')!.schema).toEqual({ type: 'integer', ...THREAD_POST_LIMIT });
    expect(get.parameters!.find(p => p.name === 'max_bytes')!.schema).toEqual({ type: 'integer', ...CONTEXT_BYTES });
    expect(get.parameters!.find(p => p.name === 'cursor')!.schema).toEqual(ThreadPostsReadQuerySchema.properties.cursor);
    expect(get.responses['200']!.content!['application/json']!.schema).toEqual(ThreadPostsEnvelopeSchema);
  });
});
