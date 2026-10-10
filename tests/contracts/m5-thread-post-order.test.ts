import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';
import { DETUNED_TOOLS, generateOpenApiSpec } from '@detuned/protocol';
import { Value } from '@sinclair/typebox/value';
import type { TSchema } from '@sinclair/typebox';

describe('M5 E2 recorded creation time directory', () => {
  let db: Database.Database, app: ReturnType<typeof buildApp>, sid: string, tid: string, token: string;
  let ids: string[]; let requestId: string | undefined;
  const headers = () => ({ authorization: `Bearer ${token}` });
  const route = (q = '') => `/api/v1/spaces/${sid}/threads/${tid}/posts${q ? `?${q}` : ''}`;
  beforeEach(async () => {
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!;
    requestId = undefined; app = buildApp({ storage: new SqliteStorage(db) }); app.addHook('onRequest', (req, _reply, done) => { if (requestId) req.id = requestId; done(); }); await app.ready();
    let res = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'space' }, payload: { slug: 'order', objective: 'time', rules: [] } });
    expect(res.statusCode).toBe(201); sid = res.json().data.space.id;
    res = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'thread' }, payload: { title: 'recorded time' } });
    expect(res.statusCode).toBe(201); tid = res.json().data.thread.id; ids = [];
    const dates = ['2026-10-09T00:00:00.001Z', '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z', '2026-02-30T00:00:00.000Z', '2026-10-09t00:00:00.000z', '2026-10-09T01:00:00.000+01:00', '2026-10-09T00:00:60.000Z', '2026-10-08T23:59:59.999Z'];
    for (let i = 0; i < dates.length; i++) {
      res = await app.inject({ method: 'POST', url: route(), headers: { ...headers(), 'idempotency-key': `post${i}` }, payload: { kind: 'note', title: `p${i}`, summary: 'summary', body: 'BODY MUST NOT APPEAR' } });
      expect(res.statusCode).toBe(201); const id = res.json().data.post.id as string; ids.push(id);
      // Explicit synthetic historical timestamp fixture; not an import workflow assertion.
      db.prepare('UPDATE posts SET created_at=? WHERE id=?').run(dates[i], id);
    }
  });
  afterEach(async () => { vi.unstubAllGlobals(); await app?.close(); db?.close(); });

  it('O01 canonical instants/ties first, all unknown historical dates last, no metadata mutation', async () => {
    const before = db.prepare('SELECT id,created_at FROM posts ORDER BY id').all();
    const expected = [ids[7], ...[ids[1]!, ids[2]!].sort(), ids[0], ...ids.slice(3, 7).sort()];
    const actual: string[] = []; let cursor: string | undefined;
    do {
      const res = await app.inject({ url: route(new URLSearchParams({ sort: 'created_at_asc', limit: '2', ...(cursor ? { cursor } : {}) }).toString()), headers: headers() });
      expect(res.statusCode, res.payload).toBe(200); expect(res.payload).not.toContain('sort_key'); expect(res.payload).not.toContain('BODY MUST NOT APPEAR');
      actual.push(...res.json().data.posts.map((p: { id: string }) => p.id)); cursor = res.json().meta.next_cursor ?? undefined;
    } while (cursor);
    expect(actual).toEqual(expected); expect(db.prepare('SELECT id,created_at FROM posts ORDER BY id').all()).toEqual(before);
    const old = await app.inject({ url: route(), headers: headers() }); expect(old.json().data.posts.map((p: { id: string }) => p.id)).toEqual([...ids].sort());
    const legacy = await app.inject({ url: `/api/v1/spaces/${sid}/threads/${tid}`, headers: headers() }); expect(legacy.statusCode).toBe(200);
  });

  it('O02 new cursors require explicit matching sort; old default cursor still works', async () => {
    const first = await app.inject({ url: route('sort=created_at_asc&limit=1'), headers: headers() }); const cursor = first.json().meta.next_cursor;
    for (const q of [`cursor=${encodeURIComponent(cursor)}`, `sort=id_asc&cursor=${encodeURIComponent(cursor)}`, 'sort=commit_order']) {
      expect((await app.inject({ url: route(q), headers: headers() })).statusCode).toBe(400);
    }
    const other = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'other' }, payload: { title: 'other' } });
    expect((await app.inject({ url: `/api/v1/spaces/${sid}/threads/${other.json().data.thread.id}/posts?sort=created_at_asc&cursor=${encodeURIComponent(cursor)}`, headers: headers() })).statusCode).toBe(400);
    const old = await app.inject({ url: route('limit=1'), headers: headers() });
    expect((await app.inject({ url: route(`cursor=${encodeURIComponent(old.json().meta.next_cursor)}`), headers: headers() })).statusCode).toBe(200);
    expect((await app.inject({ url: route(`sort=created_at_asc&cursor=${encodeURIComponent(old.json().meta.next_cursor)}`), headers: headers() })).statusCode).toBe(400);
  });

  it('O03 byte trimming advances from actual delivered row and rejects revoked credential', async () => {
    // Long valid existing IDs are unnecessary: actual request_id itself participates in the budget.
    requestId = '🙂'.repeat(700);
    const got: string[] = []; let cursor: string | undefined;
    do {
      const res = await app.inject({ url: route(new URLSearchParams({ sort: 'created_at_asc', max_bytes: '4096', limit: '100', ...(cursor ? { cursor } : {}) }).toString()), headers: headers() });
      expect(res.statusCode, res.payload).toBe(200); expect(Buffer.byteLength(res.payload)).toBeLessThanOrEqual(4096);
      got.push(...res.json().data.posts.map((p: { id: string }) => p.id)); cursor = res.json().meta.next_cursor ?? undefined;
    } while (cursor);
    expect(got.length).toBe(8); expect(new Set(got).size).toBe(8);
    db.prepare('UPDATE credentials SET revoked_at=?').run(new Date().toISOString());
    expect((await app.inject({ url: route('sort=created_at_asc'), headers: headers() })).statusCode).toBe(401);
  });

  it('O04 canonical tool/OpenAPI advertise sort and client callTool forwards unchanged', async () => {
    const read = DETUNED_TOOLS.find(t => t.name === 'forum_read')!;
    const validator = (value: unknown) => Value.Check(read.schema as TSchema, value);
    expect(validator({ kind: 'thread_posts', space_id: sid, id: tid, sort: 'created_at_asc' })).toBe(true);
    expect(validator({ kind: 'post', space_id: sid, id: ids[0], sort: 'created_at_asc' })).toBe(false);
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input)); const res = await app.inject({ url: url.pathname + url.search, headers: { authorization: String(new Headers(init?.headers).get('authorization')) } });
      return new Response(res.payload, { status: res.statusCode, headers: { 'content-type': 'application/json' } });
    });
    const client = new DetunedClient({ baseUrl: 'http://fixture', token });
    const page = await client.callTool('forum_read', { kind: 'thread_posts', space_id: sid, id: tid, sort: 'created_at_asc', limit: 1 }) as { data: { posts: { id: string }[] } };
    expect(page.data.posts[0]?.id).toBe(ids[7]);
    expect(JSON.stringify(generateOpenApiSpec())).toContain('created_at_asc');
  });
});
