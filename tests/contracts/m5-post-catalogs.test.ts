import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { createHash } from 'node:crypto';

let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>;
let token: string, sid: string, tid: string, pid: string, actor: string;
let milliseconds = Date.parse('2026-10-09T00:00:00.000Z');
let requestId = '目录"\\🙂';
const clock = { now: () => new Date(milliseconds), nowIso: () => new Date(milliseconds).toISOString() };
const headers = () => ({ authorization: `Bearer ${token}` });
const revisions = (query = '') => `/api/v1/spaces/${sid}/posts/${pid}/revisions/catalog${query ? '?' + query : ''}`;
const artifacts = (revision = 1, query = '') => `/api/v1/spaces/${sid}/posts/${pid}/revisions/${revision}/artifacts${query ? '?' + query : ''}`;
async function get(url: string) { return app.inject({ url, headers: headers() }); }
beforeEach(async () => {
  milliseconds = Date.parse('2026-10-09T00:00:00.000Z'); requestId = '目录"\\🙂';
  db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db);
  app = buildApp({ storage, clock }); app.addHook('onRequest', (req, _reply, done) => { req.id = requestId; done(); }); await app.ready();
  const created = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 's' }, payload: { slug: 'catalogs', objective: 'o', rules: [] } });
  expect(created.statusCode).toBe(201); sid = created.json().data.space.id;
  const thread = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 't' }, payload: { title: 'catalog' } });
  expect(thread.statusCode).toBe(201); tid = thread.json().data.thread.id;
  const post = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads/${tid}/posts`, headers: { ...headers(), 'idempotency-key': 'p' }, payload: { kind: 'note', title: 'title', summary: 's', body: 'PRIVATE CONTENT SENTINEL' } });
  expect(post.statusCode).toBe(201); pid = post.json().data.post.id; actor = storage.findPostById(pid)!.author_id;
});
afterEach(async () => { vi.restoreAllMocks(); await app.close(); db.close(); });
function revisionSeed(count: number) {
  for (let revision = 2; revision <= count; revision++) db.prepare(`INSERT INTO post_revisions
    SELECT post_id,?,title,summary,?,tags,structured,content_hash,editor_id,created_at FROM post_revisions WHERE post_id=? AND revision=1`)
    .run(revision, 'PRIVATE CONTENT SENTINEL'.repeat(6000), pid);
  db.prepare('UPDATE posts SET current_revision=? WHERE id=?').run(count, pid);
}
function artifactSeed(id: string, opts: { state?: 'ready' | 'missing' | 'redacted'; space?: string; visibility?: string; bytes?: number; mime?: string; purpose?: string } = {}) {
  db.prepare(`INSERT INTO artifacts(id,space_id,owner_id,visibility,sha256,bytes,mime,storage_key,state,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id, opts.space ?? sid, actor, opts.visibility ?? 'space', 'a'.repeat(64), opts.bytes ?? 2,
      opts.mime ?? 'application/octet-stream', `objects/${id}`, opts.state ?? 'ready', clock.nowIso());
  storage.createRevisionArtifact(pid, 1, id, opts.purpose ?? 'evidence');
}

it('PC01 narrow revision SQL excludes large content, preserves legacy full endpoint, and paginates complete UTF8 envelopes without loss', async () => {
  revisionSeed(60);
  const fullRead = vi.spyOn(storage, 'getPostRevision').mockImplementation(() => { throw new Error('Directory must not load content'); });
  const fullList = vi.spyOn(storage, 'listPostRevisions').mockImplementation(() => { throw new Error('Directory must not load content'); });
  let cursor: string | undefined; const seen: number[] = []; let pages = 0;
  do {
    const q = new URLSearchParams({ limit: '100', max_bytes: '4096', ...(cursor ? { cursor } : {}) });
    const res = await get(revisions(q.toString())); expect(res.statusCode, res.body).toBe(200);
    expect(Buffer.byteLength(res.body)).toBeLessThanOrEqual(4096); expect(res.body).not.toContain('PRIVATE CONTENT');
    const e = res.json(); expect(e.request_id).toBe(requestId); expect(e.data.current_revision).toBe(60);
    for (const item of e.data.revisions) expect(Object.keys(item).sort()).toEqual(['content_hash', 'created_at', 'editor_id', 'revision']);
    seen.push(...e.data.revisions.map((r: { revision: number }) => r.revision));
    cursor = e.meta.next_cursor ?? undefined; expect(++pages).toBeLessThan(20);
  } while (cursor);
  expect(seen).toEqual(Array.from({ length: 60 }, (_, i) => 60 - i)); expect(pages).toBeGreaterThan(1);
  expect(fullRead).not.toHaveBeenCalled(); expect(fullList).not.toHaveBeenCalled(); fullRead.mockRestore(); fullList.mockRestore();
  const legacy = await get(`/api/v1/spaces/${sid}/posts/${pid}/revisions?limit=1`);
  expect(legacy.statusCode).toBe(200); expect(legacy.json().data[0].body).toContain('PRIVATE CONTENT SENTINEL');
  expect(legacy.json().meta.next_cursor).toBe('60');
});

it('PC02 artifact directory filters before projection, preserves missing declarations and historical purposes, and emits strict tombstones', async () => {
  const other = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'other' }, payload: { slug: 'other', objective: 'o', rules: [] } });
  artifactSeed('a-ready', { purpose: '' }); artifactSeed('b-missing', { state: 'missing', bytes: 30000000, purpose: 'custom old purpose' });
  artifactSeed('c-redacted', { state: 'redacted', mime: 'OLD PRIVATE MIME', bytes: 12345, purpose: 'OLD PRIVATE PURPOSE' });
  artifactSeed('d-private', { visibility: 'sealed' }); artifactSeed('e-cross', { space: other.json().data.space.id });
  const fullRead = vi.spyOn(storage, 'getPostRevision').mockImplementation(() => { throw new Error('Must use narrow existence'); });
  const res = await get(artifacts()); expect(res.statusCode, res.body).toBe(200);
  const items = res.json().data.artifacts; expect(items.map((a: { id: string }) => a.id)).toEqual(['a-ready', 'b-missing', 'c-redacted']);
  expect(items[0].purpose).toBe(''); expect(items[1]).toMatchObject({ state: 'missing', bytes: 30000000, purpose: 'custom old purpose' });
  expect(items[2]).toEqual({ id: 'c-redacted', state: 'redacted' });
  for (const probe of ['OLD PRIVATE', 'd-private', 'e-cross', 'content_url', 'storage_key', 'visibility']) expect(res.body).not.toContain(probe);
  expect(res.json().meta).toEqual({ truncated: false, next_cursor: null }); expect(fullRead).not.toHaveBeenCalled();
});

it('PC03 trimmed artifact pages continue from last delivered id; count paging and single-item budget failure are distinct', async () => {
  for (let i = 0; i < 14; i++) artifactSeed(`a-${String(i).padStart(2, '0')}`, { mime: '中🙂'.repeat(120) });
  let cursor: string | undefined; const seen: string[] = []; let pageCount = 0;
  do {
    const res = await get(artifacts(1, new URLSearchParams({ limit: '100', max_bytes: '4096', ...(cursor ? { cursor } : {}) }).toString()));
    expect(res.statusCode, res.body).toBe(200); expect(Buffer.byteLength(res.body)).toBeLessThanOrEqual(4096);
    const e = res.json(); if (pageCount === 0) expect(e.meta.truncated).toBe(true);
    seen.push(...e.data.artifacts.map((a: { id: string }) => a.id)); cursor = e.meta.next_cursor ?? undefined;
    expect(++pageCount).toBeLessThan(30);
  } while (cursor);
  expect(seen).toEqual(Array.from({ length: 14 }, (_, i) => `a-${String(i).padStart(2, '0')}`));
  const count = await get(artifacts(1, 'limit=1&max_bytes=65536')); expect(count.json().meta).toMatchObject({ truncated: false, next_cursor: expect.any(String) });
  db.prepare('UPDATE artifacts SET mime=? WHERE id=?').run('中'.repeat(5000), 'a-00');
  expect((await get(artifacts(1, 'max_bytes=4096'))).statusCode).toBe(422);
  requestId = '中'.repeat(5000); expect((await get(revisions('max_bytes=4096'))).statusCode).toBe(422);
});

it('PC04 signed cursors bind purpose/actor/post/exact revision, preserve expiry, and use current credential authorization', async () => {
  revisionSeed(3); artifactSeed('a'); artifactSeed('b');
  const first = (await get(revisions('limit=1'))).json(); const cursor = first.meta.next_cursor;
  // Public continuation behavior verifies retained exp without exposing its signing secret.
  const decode = (s: string) => JSON.parse(Buffer.from(s.split('.')[0]!, 'base64url').toString());
  const original = decode(cursor); milliseconds += 10000;
  const second = await get(revisions(new URLSearchParams({ limit: '1', cursor }).toString()));
  expect(second.statusCode).toBe(200); expect(decode(second.json().meta.next_cursor).exp).toBe(original.exp);
  expect((await get(artifacts(1, new URLSearchParams({ cursor }).toString()))).statusCode).toBe(400);
  const aCursor = (await get(artifacts(1, 'limit=1'))).json().meta.next_cursor;
  expect((await get(artifacts(2, new URLSearchParams({ cursor: aCursor }).toString()))).statusCode).toBe(400);
  expect((await get(revisions('cursor=not-signed'))).statusCode).toBe(400);
  const otherToken = 'private-test-other-actor-token';
  db.prepare("INSERT INTO actors SELECT 'other-actor',kind,display_name,created_at,disabled_at FROM actors WHERE id=?").run(actor);
  db.prepare("INSERT INTO credentials SELECT 'other-credential','other-actor',?,allowed_space_ids,capabilities,expires_at,revoked_at,created_at FROM credentials WHERE actor_id=? LIMIT 1")
    .run(createHash('sha256').update(otherToken).digest('hex'), actor);
  expect((await app.inject({ url: revisions(new URLSearchParams({ cursor }).toString()), headers: { authorization: `Bearer ${otherToken}` } })).statusCode).toBe(400);
  db.prepare("INSERT INTO posts SELECT 'other-post',space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at FROM posts WHERE id=?").run(pid);
  const otherPostUrl = `/api/v1/spaces/${sid}/posts/other-post/revisions/catalog?` + new URLSearchParams({ cursor });
  expect((await get(otherPostUrl)).statusCode).toBe(400);
  milliseconds += 86400001; expect((await get(revisions(new URLSearchParams({ cursor }).toString()))).statusCode).toBe(400);
  db.prepare('UPDATE credentials SET revoked_at=? WHERE actor_id=?').run(clock.nowIso(), actor);
  expect((await get(revisions())).statusCode).toBe(401);
});

it('PC05 fixed-ref existence, redaction and malformed query checks fail without serving material', async () => {
  expect((await get(artifacts(99))).statusCode).toBe(404);
  expect((await get(`/api/v1/spaces/${sid}/posts/not-found/revisions/catalog`)).statusCode).toBe(404);
  expect((await get(artifacts())).json().data.artifacts).toEqual([]);
  for (const q of ['unknown=x', 'limit=0', 'limit=1.2', 'max_bytes=4095', 'cursor=', `cursor=${'x'.repeat(4097)}`]) {
    expect((await get(revisions(q))).statusCode, q).toBe(400); expect((await get(artifacts(1, q))).statusCode, q).toBe(400);
  }
  db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(pid);
  for (const url of [revisions(), artifacts()]) { const res = await get(url); expect(res.statusCode).toBe(410); expect(res.body).not.toContain('PRIVATE CONTENT'); }
});
