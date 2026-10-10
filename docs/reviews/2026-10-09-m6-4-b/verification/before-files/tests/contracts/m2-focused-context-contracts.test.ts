import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormatRegistry } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import Database from 'better-sqlite3';
import { ContextEnvelopeSchema, ContextFocusThreadSchema, serializeContextEnvelope, contextEnvelopeBytes, DETUNED_TOOLS, validateToolContextParams } from '@detuned/protocol';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient, UserAbortError } from '@detuned/client';

describe('M2.4-C.1 focused context transport', () => {
 let db: Database.Database, app: ReturnType<typeof buildApp>, storage: SqliteStorage, token: string, sid: string, tid: string;
 let requestId = '焦点"\\🙂'; let oldFormat: ((value: string) => boolean) | undefined;
 const headers = () => ({ authorization: `Bearer ${token}` });
 const route = (focus?: string, extra = '') => `/api/v1/spaces/${sid}/context?${new URLSearchParams({ ...(focus === undefined ? {} : { focus_thread_id: focus }) })}${extra}`;
 beforeEach(async () => {
  requestId = '焦点"\\🙂'; oldFormat = FormatRegistry.Get('date-time');
  FormatRegistry.Set('date-time', v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v);
  db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db); app = buildApp({ storage });
  app.addHook('onRequest', (req, _reply, done) => { req.id = requestId; done(); }); await app.ready();
  const space = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'space' }, payload: { slug: 'focused-context', objective: 'space objective', rules: ['rule'] } });
  expect(space.statusCode).toBe(201); sid = space.json().data.space.id;
  const thread = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'thread' }, payload: { title: 'focus' } });
  expect(thread.statusCode).toBe(201); tid = thread.json().data.thread.id;
 });
 afterEach(async () => { vi.unstubAllGlobals(); if (oldFormat) FormatRegistry.Set('date-time', oldFormat); else FormatRegistry.Delete('date-time'); await app?.close(); db?.close(); });
 it('F01: valid same-space focus adds mandatory full metadata and omission preserves the old shape', async () => {
  const focused = await app.inject({ method: 'GET', url: route(tid), headers: headers() });
  expect(focused.statusCode, focused.payload).toBe(200);
  const envelope = focused.json(); expect(envelope.data.focus_thread).toEqual(storage.findThreadById(tid));
  expect(Value.Check(ContextEnvelopeSchema, envelope)).toBe(true); expect(Value.Check(ContextFocusThreadSchema, envelope.data.focus_thread)).toBe(true);
  const old = await app.inject({ method: 'GET', url: route(), headers: headers() }); expect(old.statusCode).toBe(200); expect(old.json().data).not.toHaveProperty('focus_thread');
 });
 it('F02: real full envelope accounts focus metadata and request_id, mandatory overflow is 422', async () => {
  db.prepare('UPDATE threads SET title=? WHERE id=?').run('stored title beyond write length'.repeat(10), tid);
  for (const budget of [4096, 65536, 12288]) {
   const response = await app.inject({ method: 'GET', url: route(tid, `&max_bytes=${budget}`), headers: headers() });
   expect(response.statusCode, response.payload).toBe(200); const e = response.json(), page = { data: e.data, meta: e.meta };
   expect(e.data.focus_thread.title.length).toBeGreaterThan(160); expect(Value.Check(ContextEnvelopeSchema, e)).toBe(true);
   expect(response.payload).toBe(serializeContextEnvelope(requestId, page)); expect(contextEnvelopeBytes(requestId, page)).toBe(Buffer.byteLength(response.payload)); expect(Buffer.byteLength(response.payload)).toBeLessThanOrEqual(budget);
  }
  db.prepare('UPDATE threads SET title=? WHERE id=?').run('x', tid);
  const first = await app.inject({ method: 'GET', url: route(tid, '&max_bytes=4096'), headers: headers() });
  const firstPage = first.json();
  const minimum = { data: { ...firstPage.data, recent_activity: [], recent_failures: [], blocking_objections: [], pinned_summaries: [] }, meta: { truncated: false, next_cursor: null } };
  requestId += 'x'.repeat(4096 - contextEnvelopeBytes(requestId, minimum));
  const boundary = await app.inject({ method: 'GET', url: route(tid, '&max_bytes=4096'), headers: headers() }); expect(boundary.statusCode).toBe(200); expect(Buffer.byteLength(boundary.payload)).toBe(4095); expect(boundary.json().data.space_content_status).toBe('included'); expect(boundary.json().meta.truncated).toBe(true);
  requestId += 'x'; const omitted = await app.inject({ method: 'GET', url: route(tid, '&max_bytes=4096'), headers: headers() });
  expect(omitted.statusCode).toBe(200); expect(omitted.json().data.space_content_status).toBe('omitted_for_budget'); expect(omitted.json().data.focus_thread.id).toBe(tid);
  requestId = 'normal'; db.prepare('UPDATE threads SET title=? WHERE id=?').run('中'.repeat(3000), tid);
  expect((await app.inject({ method: 'GET', url: route(tid, '&max_bytes=4096'), headers: headers() })).statusCode).toBe(422);
 });
 it('F03: focus malformed/unknown/foreign transport and authorization errors retain separate policies', async () => {
  for (const q of ['focus_thread_id=', 'focus_thread_id=%20%20', 'focus_thread_id=x&focus_thread_id=y', 'unknown=x']) expect((await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/context?${q}`, headers: headers() })).statusCode).toBe(400);
  expect((await app.inject({ method: 'GET', url: route('missing'), headers: headers() })).statusCode).toBe(404);
  const other = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'other-space' }, payload: { slug: 'other-focus', objective: 'o', rules: [] } });
  expect((await app.inject({ method: 'GET', url: `/api/v1/spaces/${other.json().data.space.id}/context?focus_thread_id=${tid}`, headers: headers() })).statusCode).toBe(404);
  expect((await app.inject({ method: 'GET', url: route('missing') })).statusCode).toBe(401);
  db.prepare("UPDATE threads SET state='archived' WHERE id=?").run(tid);
  const archived = await app.inject({ method: 'GET', url: route(tid), headers: headers() }); expect(archived.statusCode).toBe(200); expect(archived.json().data.focus_thread.state).toBe('archived');
 });
 it('F04: focused failure window filters the thread before limit while no-focus keeps space scope', async () => {
  const other = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'noise' }, payload: { title: 'noise' } }); const otherId = other.json().data.thread.id;
  const wanted: string[] = [];
  for (let i = 0; i < 8; i++) {
   const post = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads/${i < 2 ? tid : otherId}/posts`, headers: { ...headers(), 'idempotency-key': `p${i}` }, payload: { kind: 'note', title: `p${i}`, summary: 's', body: 'private-body' } });
   expect(post.statusCode).toBe(201); const id = post.json().data.post.id;
   db.prepare("UPDATE posts SET kind='failure' WHERE id=?").run(id); if (i < 2) wanted.push(id);
  }
  const focused = await app.inject({ method: 'GET', url: route(tid), headers: headers() }); expect(focused.statusCode).toBe(200);
  expect(focused.json().data.recent_failures.map((f: { ref: { post_id: string } }) => f.ref.post_id)).toEqual(wanted.sort().reverse());
  expect(focused.payload).not.toContain('private-body');
  const space = await app.inject({ method: 'GET', url: route(), headers: headers() }); expect(space.json().data.recent_failures).toHaveLength(5); expect(space.json().data).not.toHaveProperty('focus_thread');
 });
 it('F05: full schemas reject null/partial focus metadata and keep omitted-rules correlation', async () => {
  const response = await app.inject({ method: 'GET', url: route(tid), headers: headers() }); const e = response.json();
  expect(Value.Check(ContextEnvelopeSchema, e)).toBe(true);
  for (const focus_thread of [null, { id: tid }, { ...e.data.focus_thread, body: 'body' }]) expect(Value.Check(ContextEnvelopeSchema, { ...e, data: { ...e.data, focus_thread } })).toBe(false);
  const omitted = { ...e, data: { ...e.data, space_content_status: 'omitted_for_budget', objective: null, rules: null }, meta: { truncated: true, next_cursor: null } };
  expect(Value.Check(ContextEnvelopeSchema, omitted)).toBe(true); expect(Value.Check(ContextEnvelopeSchema, { ...omitted, meta: { truncated: false, next_cursor: null } })).toBe(false);
 });
 it('F06: existing client/tool keeps full focused and no-focus pages, strict pure shape and cancellation', async () => {
  vi.stubGlobal('fetch', async (input: string) => { const url = new URL(input), r = await app.inject({ method: 'GET', url: url.pathname + url.search, headers: headers() }); return new Response(r.payload, { status: r.statusCode, headers: { 'content-type': 'application/json' } }); });
  const client = new DetunedClient({ baseUrl: 'http://localhost', token, maxRetries: 0 });
  const focused = await client.callTool('forum_context', { space_id: sid, focus_thread_id: tid, max_bytes: 4096 }); expect(focused.data.focus_thread.id).toBe(tid); expect(focused.meta.next_cursor).toBeNull();
  const old = await client.callTool('forum_context', { space_id: sid }); expect(old.data).not.toHaveProperty('focus_thread'); expect(old.meta.next_cursor).toBeNull();
  for (const focus_thread_id of ['', ' ', 1, null, ['x']]) await expect(client.callTool('forum_context', { space_id: sid, focus_thread_id })).rejects.toMatchObject({ statusCode: 400 });
  expect(() => validateToolContextParams({ space_id: sid, unknown: 'x' })).toThrow(); expect(() => validateToolContextParams({ space_id: sid })).not.toThrow();
  const c = new AbortController(); c.abort(); await expect(client.getContext(sid, { focus_thread_id: tid }, { signal: c.signal })).rejects.toBeInstanceOf(UserAbortError);
  expect(DETUNED_TOOLS).toHaveLength(8);
 });

});
