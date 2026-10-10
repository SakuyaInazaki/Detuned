import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService, WriteRateLimiter, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, ThreadPostsReadService, PostRevisionReadService, RedactionService, HmacTokenSigner, AuthenticatedContext } from '@detuned/core';
import { ThreadPostsPage, threadPostsEnvelopeBytes, serializeThreadPostsEnvelope, THREAD_POSTS_CURSOR_ERROR_MESSAGE } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';

describe('M2.4-B.2.2 bounded dynamic thread posts metadata', () => {
  let db: Database.Database, storage: SqliteStorage, auth: AuthenticatedContext, as: AuthService;
  let spaces: SpaceService, threads: ThreadService, posts: PostService, read: ThreadPostsReadService, sid: string, tid: string;
  const ids = new CryptoIdGenerator(), clock = new SystemClock(), hash = new CryptoHasher(), signer = new HmacTokenSigner(), secret = 'thread-posts-test-secret';
  const requestId = '目录"\\中🙂';
  beforeEach(() => {
    db = new Database(':memory:'); storage = new SqliteStorage(db);
    const limiter = new WriteRateLimiter(clock, { per_minute: 60000, burst: 10000 });
    const boot = bootstrapDatabase(db); as = new AuthService(storage, hash, clock, limiter); auth = as.authenticateToken(boot.adminToken!);
    const idem = new IdempotencyService(storage, hash, clock, limiter);
    spaces = new SpaceService(storage, ids, clock, as, idem); threads = new ThreadService(storage, ids, clock, hash, as, idem);
    posts = new PostService(storage, ids, clock, hash, as, idem);
    sid = spaces.createSpace(auth, { slug: 'directory', objective: 'o', rules: [] }, 'space').space.id;
    tid = threads.createThread(auth, sid, { title: '目录"\\🙂' }, 'thread').thread.id;
    for (let i = 0; i < 60; i++) posts.createPost(auth, sid, tid, { kind: 'note', title: `title ${i}`, summary: 's', body: `private-body-${i}` }, `post-${i}`);
    read = new ThreadPostsReadService(storage, signer, as, secret, clock);
  });
  afterEach(() => db.close());

  function collect(limit = 100, maxBytes = 4096, change?: (n: number) => { limit: number; max_bytes: number }) {
    const expected = storage.listPostsInThread(tid, 100).posts;
    let cursor: string | undefined, count = 0;
    const all: typeof expected = [], pages: ThreadPostsPage[] = [];
    do {
      const query = change?.(count) ?? { limit, max_bytes: maxBytes };
      const page = read.getPosts(auth, sid, tid, { ...query, cursor }, { request_id: requestId });
      expect(page.data.thread.id).toBe(tid);
      expect(threadPostsEnvelopeBytes(requestId, page)).toBeLessThanOrEqual(query.max_bytes);
      expect(Buffer.byteLength(serializeThreadPostsEnvelope(requestId, page))).toBeLessThanOrEqual(query.max_bytes);
      expect(page.data.posts.length).toBeLessThanOrEqual(query.limit);
      expect(page.data.posts.every(post => !('body' in post) && !('summary' in post) && !('title' in post))).toBe(true);
      if (page.meta.next_cursor) {
        expect(page.data.posts.length).toBeGreaterThan(0);
        expect(signer.verify(page.meta.next_cursor, secret)!.after_id).toBe(page.data.posts.at(-1)!.id);
      }
      all.push(...page.data.posts); pages.push(page); cursor = page.meta.next_cursor ?? undefined;
      expect(++count).toBeLessThan(100);
    } while (cursor);
    expect(all).toEqual(expected); expect(new Set(all.map(p => p.id)).size).toBe(expected.length);
    return pages;
  }

  it('D01: budget tail trimming when storage has no cursor preserves every static item', () => {
    expect(storage.listPostsInThread(tid, 100).next_cursor).toBeNull();
    const pages = collect(); expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].meta.truncated).toBe(true); expect(pages[0].meta.next_cursor).not.toBeNull();
    expect(collect(100, 65536)).toHaveLength(1);
    const defaults = read.getPosts(auth, sid, tid, {}, { request_id: requestId });
    expect(defaults.data.posts.length).toBeLessThanOrEqual(50); expect(threadPostsEnvelopeBytes(requestId, defaults)).toBeLessThanOrEqual(12288);
  });

  it('D02: original storage limit cursor never skips trimmed tail, with changed limit and budget', () => {
    const original = storage.listPostsInThread(tid, 50); expect(original.next_cursor).not.toBeNull();
    const first = read.getPosts(auth, sid, tid, { limit: 50, max_bytes: 4096 }, { request_id: requestId });
    expect(first.meta.truncated).toBe(true);
    expect(signer.verify(first.meta.next_cursor!, secret)!.after_id).not.toBe(original.next_cursor);
    collect(50, 4096, n => n === 0 ? { limit: 50, max_bytes: 4096 } : n % 2 ? { limit: 1, max_bytes: 65536 } : { limit: 100, max_bytes: 4096 });
    const limited = collect(1, 65536); expect(limited[0].meta).toMatchObject({ truncated: false, next_cursor: expect.any(String) });
  });

  it('D03: empty thread is false/null and oversized mandatory metadata fails without empty continuation', () => {
    const empty = threads.createThread(auth, sid, { title: 'empty' }, 'empty').thread.id;
    expect(read.getPosts(auth, sid, empty, {}, { request_id: 'empty' }).data.posts).toEqual([]);
    expect(read.getPosts(auth, sid, empty, {}, { request_id: 'empty' }).meta).toEqual({ truncated: false, next_cursor: null });
    for (const thread of [empty, tid]) expect(() => read.getPosts(auth, sid, thread, { max_bytes: 4096 }, { request_id: '中'.repeat(5000) })).toThrow(expect.objectContaining({ code: 'QUERY_TOO_BROAD', statusCode: 422 }));
    db.prepare('UPDATE threads SET title=? WHERE id=?').run('中'.repeat(5000), tid);
    expect(() => read.getPosts(auth, sid, tid, { max_bytes: 4096 }, { request_id: 'huge-thread' })).toThrow(expect.objectContaining({ statusCode: 422 }));
  });

  it('D04: archived threads and withdrawn/redacted metadata remain visible without content projection', () => {
    const ordered = storage.listPostsInThread(tid, 100).posts;
    posts.withdrawPost(auth, sid, ordered[0].id, { expected_revision: 1, reason: 'withdraw' }, 'withdraw');
    new RedactionService(storage, ids, clock, as, new IdempotencyService(storage, hash, clock)).createRedaction(auth, sid, { target_type: 'post', target_id: ordered[1].id, reason: 'redact' }, 'redact');
    threads.patchThread(auth, sid, tid, { expected_version: 1, state: 'archived' }, 'archive');
    const page = read.getPosts(auth, sid, tid, { limit: 100, max_bytes: 65536 }, { request_id: 'states' });
    expect(page.data.thread).toMatchObject({ state: 'archived', version: 2 });
    expect(page.data.posts[0].lifecycle).toBe('withdrawn'); expect(page.data.posts[1].lifecycle).toBe('redacted');
    expect(JSON.stringify(page)).not.toContain('private-body-'); expect(page.data.posts).toHaveLength(60);
  });

  it('D05: strict signed bindings reject uniformly and nonexistent after_id remains a valid keyset bound', () => {
    const first = read.getPosts(auth, sid, tid, { limit: 1 }, { request_id: 'cursor' }), token = first.meta.next_cursor!, payload = signer.verify(token, secret)!;
    const changes = [{ v: 2 }, { purpose: 'post_revision_read' }, { actor_id: 'other' }, { space_id: 'other' }, { thread_id: 'other' }, { sort: 'created_at' }, { after_id: '' }, { exp: 0 }, { exp: Math.floor(Date.now() / 1000) + 172800 }, { unknown: true }];
    for (const patch of changes) expect(() => read.getPosts(auth, sid, tid, { cursor: signer.sign({ ...payload, ...patch }, secret) }, { request_id: 'cursor' })).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400, retryable: false, message: THREAD_POSTS_CURSOR_ERROR_MESSAGE }));
    for (const cursor of ['', ' ', token + 'x', 'x'.repeat(4097)]) expect(() => read.getPosts(auth, sid, tid, { cursor }, { request_id: 'cursor' })).toThrow(expect.objectContaining({ message: THREAD_POSTS_CURSOR_ERROR_MESSAGE, statusCode: 400 }));
    const absent = String(payload.after_id) + 'x'; expect(storage.findPostById(absent)).toBeNull();
    const page = read.getPosts(auth, sid, tid, { limit: 100, max_bytes: 65536, cursor: signer.sign({ ...payload, after_id: absent }, secret) }, { request_id: 'absent' });
    expect(page.data.posts).toEqual(storage.listPostsInThread(tid, 100, absent).posts);
    const high = read.getPosts(auth, sid, tid, { cursor: signer.sign({ ...payload, after_id: 'zzzz-no-row' }, secret) }, { request_id: 'high' });
    expect(high.data.posts).toEqual([]); expect(high.meta).toEqual({ truncated: false, next_cursor: null });
    const other = threads.createThread(auth, sid, { title: 'other' }, 'other').thread.id;
    expect(() => read.getPosts(auth, sid, other, { cursor: token }, { request_id: 'other' })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('D06: current identity, space membership/capability and thread ownership precede invalid cursor', () => {
    const actor = { id: 'act_reader', kind: 'human' as const, display_name: 'reader', created_at: clock.nowIso(), disabled_at: null }; storage.createActor(actor);
    const credential = { id: 'cred_reader', actor_id: actor.id, token_hash: hash.sha256('reader'), allowed_space_ids: [sid], capabilities: ['read' as const], created_at: clock.nowIso(), expires_at: null, revoked_at: null }; storage.createCredential(credential);
    const reader = { actor, credential }, member = { space_id: sid, actor_id: actor.id, role: 'observer' as const, active: true, reviewer_eligible: false, independence_group: null }; storage.upsertMembership(member);
    expect(read.getPosts(reader, sid, tid, { limit: 1 }, { request_id: 'reader' }).meta.next_cursor).not.toBeNull();
    storage.upsertMembership({ ...member, active: false }); expect(() => read.getPosts(reader, sid, tid, { cursor: 'bad' }, { request_id: 'reader' })).toThrow(expect.objectContaining({ statusCode: 404 }));
    storage.upsertMembership(member); db.prepare("UPDATE credentials SET capabilities='[\"write\"]' WHERE id=?").run(credential.id);
    expect(() => read.getPosts(reader, sid, tid, { cursor: 'bad' }, { request_id: 'reader' })).toThrow(expect.objectContaining({ statusCode: 403 }));
    db.prepare("UPDATE credentials SET capabilities='[\"read\"]' WHERE id=?").run(credential.id); storage.revokeCredential(credential.id, clock.nowIso());
    expect(() => read.getPosts(reader, sid, tid, { cursor: 'bad' }, { request_id: 'reader' })).toThrow(expect.objectContaining({ statusCode: 401 }));
    const foreign = spaces.createSpace(auth, { slug: 'foreign', objective: 'o', rules: [] }, 'foreign').space.id;
    expect(() => read.getPosts(auth, foreign, tid, { cursor: 'bad' }, { request_id: 'foreign' })).toThrow(expect.objectContaining({ statusCode: 404 }));
    expect(() => read.getPosts(auth, sid, 'missing', { cursor: 'bad' }, { request_id: 'missing' })).toThrow(expect.objectContaining({ statusCode: 404 }));
  });

  it('D07: two nonterminal pages inherit first expiry while clock, limit and budget change', () => {
    let now = Date.now(); const fake = { now: () => new Date(now), nowIso: () => new Date(now).toISOString() }, timed = new ThreadPostsReadService(storage, signer, as, secret, fake);
    const first = timed.getPosts(auth, sid, tid, { limit: 1, max_bytes: 4096 }, { request_id: 'ttl' }), exp = signer.verify(first.meta.next_cursor!, secret)!.exp as number;
    expect(exp).toBe(Math.floor(now / 1000) + 86400); now += 3600000;
    const second = timed.getPosts(auth, sid, tid, { limit: 2, max_bytes: 65536, cursor: first.meta.next_cursor! }, { request_id: 'ttl' });
    expect(second.meta.next_cursor).not.toBeNull(); expect(signer.verify(second.meta.next_cursor!, secret, Math.floor(now / 1000))!.exp).toBe(exp);
    now = exp * 1000; expect(timed.getPosts(auth, sid, tid, { cursor: second.meta.next_cursor! }, { request_id: 'equal' })).toBeDefined();
    now += 1000; expect(() => timed.getPosts(auth, sid, tid, { cursor: second.meta.next_cursor! }, { request_id: 'late' })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('D08: metadata revision ref reads fixed old content after head update, then redaction rejects content', () => {
    const post = read.getPosts(auth, sid, tid, { limit: 1 }, { request_id: 'ref' }).data.posts[0];
    const old = storage.getPostRevision(post.id, post.current_revision)!;
    posts.createRevision(auth, sid, post.id, { expected_revision: post.current_revision, title: 'new', summary: 'new', body: 'new-body' }, 'new');
    const content = new PostRevisionReadService(storage, signer, as, secret, clock).getRevision(auth, post.space_id, post.id, post.current_revision, {}, { request_id: 'content' });
    expect(content.data.has_newer_revision).toBe(true); expect(JSON.parse(content.data.chunk).body).toBe(old.body);
    new RedactionService(storage, ids, clock, as, new IdempotencyService(storage, hash, clock)).createRedaction(auth, sid, { target_type: 'post', target_id: post.id, reason: 'redact' }, 'redact');
    expect(() => new PostRevisionReadService(storage, signer, as, secret, clock).getRevision(auth, sid, post.id, post.current_revision, {}, { request_id: 'redacted' })).toThrow(expect.objectContaining({ statusCode: 410 }));
  });

  it('D09: validation/422/access errors and all successful pages perform no database writes', () => {
    const fingerprint = () => JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row: any) => [row.name, db.prepare(`SELECT * FROM "${row.name}"`).all()]));
    const before = fingerprint(); collect();
    for (const limit of [0, 101, 1.5, null, '1']) expect(() => read.getPosts(auth, sid, tid, { limit } as any, { request_id: 'bad' })).toThrow(expect.objectContaining({ statusCode: 400 }));
    for (const max_bytes of [4095, 65537, NaN, null, '4096']) expect(() => read.getPosts(auth, sid, tid, { max_bytes } as any, { request_id: 'bad' })).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => read.getPosts(auth, sid, tid, { cursor: 'bad' }, { request_id: 'bad' })).toThrow();
    expect(() => read.getPosts(auth, sid, 'missing', {}, { request_id: 'missing' })).toThrow();
    expect(() => read.getPosts(auth, sid, tid, { max_bytes: 4096 }, { request_id: '中'.repeat(5000) })).toThrow(expect.objectContaining({ statusCode: 422 }));
    expect(fingerprint()).toBe(before);
  });

  it('D10: WAL barrier keeps thread state/version and post head/lifecycle consistent within each page', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detuned-thread-snapshot-')), a = new Database(join(dir, 'forum.db'));
    const boot = bootstrapDatabase(a), sa = new SqliteStorage(a), b = new Database(join(dir, 'forum.db')), sb = new SqliteStorage(b);
    try {
      const aa = new AuthService(sa, hash, clock), ab = new AuthService(sb, hash, clock), admin = aa.authenticateToken(boot.adminToken!);
      const ia = new IdempotencyService(sa, hash, clock), ib = new IdempotencyService(sb, hash, clock);
      const space = new SpaceService(sa, ids, clock, aa, ia).createSpace(admin, { slug: 'wal', objective: 'o', rules: [] }, 'space').space.id;
      const thread = new ThreadService(sa, ids, clock, hash, aa, ia).createThread(admin, space, { title: 'old' }, 'thread').thread.id;
      const post = new PostService(sa, ids, clock, hash, aa, ia).createPost(admin, space, thread, { kind: 'note', title: 'old', summary: 's', body: 'old' }, 'post').post.id;
      const list = sa.listPostsInThread.bind(sa); let committed = false;
      sa.listPostsInThread = (id, limit, cursor) => {
        if (!committed) {
          committed = true;
          sb.transaction(() => {
            new ThreadService(sb, ids, clock, hash, ab, ib).patchThread(admin, space, thread, { expected_version: 1, state: 'archived', title: 'new' }, 'archive');
            const writer = new PostService(sb, ids, clock, hash, ab, ib);
            writer.createRevision(admin, space, post, { expected_revision: 1, title: 'new', summary: 's', body: 'new' }, 'revise');
            writer.withdrawPost(admin, space, post, { expected_revision: 2, reason: 'withdraw' }, 'withdraw');
          });
        }
        return list(id, limit, cursor);
      };
      const service = new ThreadPostsReadService(sa, signer, aa, secret, clock), old = service.getPosts(admin, space, thread, {}, { request_id: 'old' });
      expect(committed).toBe(true); expect(old.data.thread).toMatchObject({ state: 'open', version: 1, title: 'old' });
      expect(old.data.posts[0]).toMatchObject({ current_revision: 1, lifecycle: 'active' });
      const next = service.getPosts(admin, space, thread, {}, { request_id: 'next' });
      expect(next.data.thread).toMatchObject({ state: 'archived', version: 2, title: 'new' });
      expect(next.data.posts[0]).toMatchObject({ current_revision: 2, lifecycle: 'withdrawn' });
    } finally { b.close(); a.close(); rmSync(dir, { recursive: true, force: true }); }
  });
});
