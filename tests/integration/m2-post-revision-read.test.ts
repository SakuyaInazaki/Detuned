import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, PostRevisionReadService, RedactionService, HmacTokenSigner, AuthenticatedContext } from '@detuned/core';
import { PostRevisionContentPage, PostRevision, encodePostRevisionContentDocument, postRevisionContentEnvelopeBytes, serializePostRevisionContentEnvelope, POST_REVISION_CURSOR_ERROR_MESSAGE } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';

describe('M2.4-B.2.1 fixed stored post revision content', () => {
  let db: Database.Database, storage: SqliteStorage, auth: AuthenticatedContext, as: AuthService;
  let spaces: SpaceService, posts: PostService, read: PostRevisionReadService, sid: string, tid: string, pid: string;
  const ids = new CryptoIdGenerator(), clock = new SystemClock(), hash = new CryptoHasher(), signer = new HmacTokenSigner(), secret = 'post-revision-test-secret';
  const requestId = '实际ID"\\中🙂';
  const document = ({ title, summary, body, tags, structured }: PostRevision) => ({ title, summary, body, tags, structured });
  beforeEach(() => {
    db = new Database(':memory:'); storage = new SqliteStorage(db);
    const boot = bootstrapDatabase(db); as = new AuthService(storage, hash, clock); auth = as.authenticateToken(boot.adminToken!);
    const idem = new IdempotencyService(storage, hash, clock);
    spaces = new SpaceService(storage, ids, clock, as, idem);
    sid = spaces.createSpace(auth, { slug: 'post-content', objective: 'objective', rules: [] }, 'space').space.id;
    tid = new ThreadService(storage, ids, clock, hash, as, idem).createThread(auth, sid, { title: 'thread' }, 'thread').thread.id;
    posts = new PostService(storage, ids, clock, hash, as, idem);
    pid = posts.createPost(auth, sid, tid, { kind: 'note', title: 'title', summary: 'summary', body: '中🙂"\\\n\t\0'.repeat(3000), tags: ['one'], structured: { original: true } }, 'post').post.id;
    read = new PostRevisionReadService(storage, signer, as, secret, clock);
  });
  afterEach(() => db.close());

  function joinPages(service = read, revision = 1, budget = 4096, afterFirst?: () => void) {
    let cursor: string | undefined, text = '', end = 0, count = 0;
    const pages: PostRevisionContentPage[] = [];
    do {
      const page = service.getRevision(auth, sid, pid, revision, { max_bytes: budget, cursor }, { request_id: requestId });
      expect(page.data.ref).toEqual({ space_id: sid, post_id: pid, revision });
      expect(page.data.start_byte).toBe(end); expect(page.data.end_byte).toBeGreaterThan(end);
      expect(Buffer.byteLength(page.data.chunk)).toBe(page.data.end_byte - end);
      expect(postRevisionContentEnvelopeBytes(requestId, page)).toBeLessThanOrEqual(budget);
      expect(Buffer.byteLength(serializePostRevisionContentEnvelope(requestId, page))).toBeLessThanOrEqual(budget);
      expect(page.meta.truncated).toBe(!page.data.complete);
      expect(page.data.chunk).not.toContain('\ufffd');
      text += page.data.chunk; end = page.data.end_byte; pages.push(page);
      if (++count === 1) afterFirst?.();
      cursor = page.meta.next_cursor ?? undefined; expect(count).toBeLessThan(100);
    } while (cursor);
    return { text, pages };
  }

  it('P01: 4K, 64K and default pages preserve stored Unicode, escaping and unique five-field order', () => {
    const expected = document(storage.getPostRevision(pid, 1)!);
    const small = joinPages(); expect(small.pages.length).toBeGreaterThan(2);
    expect(small.text).toBe(encodePostRevisionContentDocument(expected)); expect(JSON.parse(small.text)).toEqual(expected);
    expect(Object.keys(JSON.parse(small.text))).toEqual(['title', 'summary', 'body', 'tags', 'structured']);
    // Control-character double escaping makes the whole content exceed even 64K.
    expect(Buffer.byteLength(JSON.stringify(small.text))).toBeGreaterThan(65536);
    const large = joinPages(read, 1, 65536); expect(large.pages.length).toBeGreaterThan(1); expect(large.text).toBe(small.text);
    const first = read.getRevision(auth, sid, pid, 1, {}, { request_id: requestId });
    expect(postRevisionContentEnvelopeBytes(requestId, first)).toBeLessThanOrEqual(12288);
    expect(first.data).toMatchObject({ post_kind: 'note', lifecycle: 'active', has_newer_revision: false, encoding: 'json' });
  });

  it('P02: fixed document does not drift after head updates, while current metadata updates on the next page', () => {
    const expected = document(storage.getPostRevision(pid, 1)!);
    const result = joinPages(read, 1, 4096, () => posts.createRevision(auth, sid, pid, { expected_revision: 1, title: 'new', summary: 'new', body: 'new', structured: { newer: true } }, 'new'));
    expect(JSON.parse(result.text)).toEqual(expected);
    expect(result.pages[0].data.has_newer_revision).toBe(false);
    expect(result.pages.slice(1).every(page => page.data.has_newer_revision)).toBe(true);
    expect(result.pages.every(page => page.data.post_kind === 'note')).toBe(true);
  });

  it('P03: historical structured and JSON isolated surrogate remain exact without new-write validation', () => {
    const structured = { statement: 'old', assumptions: [42], extra: { lone: String.fromCharCode(0xd800), list: [null, false] } };
    db.prepare("UPDATE posts SET kind='proposal' WHERE id=?").run(pid);
    db.prepare('UPDATE post_revisions SET structured=?, body=? WHERE post_id=? AND revision=1').run(JSON.stringify(structured), '', pid);
    const expected = document(storage.getPostRevision(pid, 1)!);
    const result = joinPages(); expect(JSON.parse(result.text)).toEqual(expected);
    expect(JSON.parse(result.text).structured.extra.lone.charCodeAt(0)).toBe(0xd800);
    expect(result.pages[0].data.post_kind).toBe('proposal'); expect(expected.body).toBe('');
    expect(result.text).not.toContain('content_hash');
  });

  it('P04: empty body completes its nonempty JSON document and stored TEXT surrogate loss is not invented back', () => {
    const lone = String.fromCharCode(0xd800);
    db.prepare('UPDATE post_revisions SET body=? WHERE post_id=?').run(lone, pid);
    const stored = storage.getPostRevision(pid, 1)!;
    expect(stored.body).toBe('\ufffd');
    const page = read.getRevision(auth, sid, pid, 1, { max_bytes: 4096 }, { request_id: 'stored' });
    expect(page.data.complete).toBe(true); expect(JSON.parse(page.data.chunk)).toEqual(document(stored));
    db.prepare("UPDATE post_revisions SET body='' WHERE post_id=?").run(pid);
    const empty = read.getRevision(auth, sid, pid, 1, {}, { request_id: 'empty' });
    expect(empty.data.chunk.length).toBeGreaterThan(0); expect(empty.data.end_byte).toBeGreaterThan(0);
    expect(empty.meta).toEqual({ truncated: false, next_cursor: null }); expect(JSON.parse(empty.data.chunk).body).toBe('');
  });

  it('P05: withdrawn remains readable and redaction overrides both a valid and invalid old cursor', () => {
    const first = read.getRevision(auth, sid, pid, 1, { max_bytes: 4096 }, { request_id: 'lifecycle' });
    posts.withdrawPost(auth, sid, pid, { expected_revision: 1, reason: 'withdraw' }, 'withdraw');
    expect(read.getRevision(auth, sid, pid, 1, { cursor: first.meta.next_cursor! }, { request_id: 'withdrawn' }).data.lifecycle).toBe('withdrawn');
    const redactions = new RedactionService(storage, ids, clock, as, new IdempotencyService(storage, hash, clock));
    redactions.createRedaction(auth, sid, { target_type: 'post', target_id: pid, reason: 'redact' }, 'redact');
    for (const cursor of [first.meta.next_cursor!, 'bad']) expect(() => read.getRevision(auth, sid, pid, 1, { cursor }, { request_id: 'redacted' })).toThrow(expect.objectContaining({ code: 'CONTENT_REDACTED', statusCode: 410 }));
  });

  it('P06: strict signatures, payload bindings and signed UTF8 positions reject uniformly', () => {
    const first = read.getRevision(auth, sid, pid, 1, { max_bytes: 4096 }, { request_id: 'cursor' });
    const token = first.meta.next_cursor!, payload = signer.verify(token, secret)!;
    const bytes = Buffer.from(encodePostRevisionContentDocument(document(storage.getPostRevision(pid, 1)!)));
    const split = bytes.findIndex(byte => (byte & 0xc0) === 0x80);
    const changes = [{ v: 2 }, { purpose: 'space_revision_read' }, { actor_id: 'other' }, { space_id: 'other' }, { post_id: 'other' }, { revision: 2 }, { byte_offset: 0 }, { byte_offset: -1 }, { byte_offset: Number.MAX_SAFE_INTEGER + 1 }, { byte_offset: bytes.length }, { byte_offset: split }, { exp: 0 }, { exp: Math.floor(Date.now() / 1000) + 172800 }, { unknown: true }];
    for (const change of changes) expect(() => read.getRevision(auth, sid, pid, 1, { cursor: signer.sign({ ...payload, ...change }, secret) }, { request_id: 'cursor' })).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400, retryable: false, message: POST_REVISION_CURSOR_ERROR_MESSAGE }));
    for (const cursor of ['', ' ', 'x'.repeat(4097), token + 'x', '12']) expect(() => read.getRevision(auth, sid, pid, 1, { cursor }, { request_id: 'cursor' })).toThrow(expect.objectContaining({ message: POST_REVISION_CURSOR_ERROR_MESSAGE, statusCode: 400 }));
    const other = posts.createPost(auth, sid, tid, { kind: 'note', title: 'other', summary: 'other' }, 'other').post.id;
    expect(() => read.getRevision(auth, sid, other, 1, { cursor: token }, { request_id: 'other' })).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => read.getRevision(auth, sid, pid, 999, {}, { request_id: 'missing' })).toThrow(expect.objectContaining({ statusCode: 404 }));
  });

  it('P07: current identity, capabilities, membership and target space are checked before bad cursor', () => {
    const actor = { id: 'act_reader', kind: 'human' as const, display_name: 'reader', created_at: clock.nowIso(), disabled_at: null }; storage.createActor(actor);
    const credential = { id: 'cred_reader', actor_id: actor.id, token_hash: hash.sha256('reader'), allowed_space_ids: [sid], capabilities: ['read' as const], created_at: clock.nowIso(), expires_at: null, revoked_at: null }; storage.createCredential(credential);
    const reader = { actor, credential }, member = { space_id: sid, actor_id: actor.id, role: 'observer' as const, active: true, reviewer_eligible: false, independence_group: null }; storage.upsertMembership(member);
    const first = read.getRevision(reader, sid, pid, 1, { max_bytes: 4096 }, { request_id: 'reader' }); expect(first.data.complete).toBe(false);
    storage.upsertMembership({ ...member, active: false });
    expect(() => read.getRevision(reader, sid, pid, 1, { cursor: 'bad' }, { request_id: 'reader' })).toThrow(expect.objectContaining({ statusCode: 404 }));
    storage.upsertMembership(member); db.prepare("UPDATE credentials SET capabilities='[\"write\"]' WHERE id=?").run(credential.id);
    expect(() => read.getRevision(reader, sid, pid, 1, { cursor: 'bad' }, { request_id: 'reader' })).toThrow(expect.objectContaining({ statusCode: 403 }));
    db.prepare("UPDATE credentials SET capabilities='[\"read\"]' WHERE id=?").run(credential.id); storage.revokeCredential(credential.id, clock.nowIso());
    expect(() => read.getRevision(reader, sid, pid, 1, { cursor: 'bad' }, { request_id: 'reader' })).toThrow(expect.objectContaining({ statusCode: 401 }));
    const foreign = spaces.createSpace(auth, { slug: 'foreign', objective: 'o', rules: [] }, 'foreign').space.id;
    expect(() => read.getRevision(auth, foreign, pid, 1, { cursor: 'bad' }, { request_id: 'foreign' })).toThrow(expect.objectContaining({ statusCode: 404 }));
    expect(() => read.getRevision(auth, sid, 'missing', 1, { cursor: 'bad' }, { request_id: 'missing' })).toThrow(expect.objectContaining({ statusCode: 404 }));
  });

  it('P08: advancing clock between two nonterminal pages preserves original expiry and allows budget changes', () => {
    // Keep this TTL fixture large enough for two 4K pages but a final 64K tail.
    db.prepare('UPDATE post_revisions SET body=? WHERE post_id=?').run('中🙂'.repeat(3000), pid);
    let now = Date.now(); const fake = { now: () => new Date(now), nowIso: () => new Date(now).toISOString() };
    const timed = new PostRevisionReadService(storage, signer, as, secret, fake);
    const first = timed.getRevision(auth, sid, pid, 1, { max_bytes: 4096 }, { request_id: 'ttl' }); expect(first.data.complete).toBe(false);
    const exp = signer.verify(first.meta.next_cursor!, secret, Math.floor(now / 1000))!.exp as number;
    expect(exp).toBe(Math.floor(now / 1000) + 86400); now += 3600000;
    const second = timed.getRevision(auth, sid, pid, 1, { max_bytes: 4096, cursor: first.meta.next_cursor! }, { request_id: 'ttl' }); expect(second.data.complete).toBe(false);
    expect(signer.verify(second.meta.next_cursor!, secret, Math.floor(now / 1000))!.exp).toBe(exp);
    const last = timed.getRevision(auth, sid, pid, 1, { max_bytes: 65536, cursor: second.meta.next_cursor! }, { request_id: 'ttl' }); expect(last.data.complete).toBe(true);
    expect(JSON.parse(first.data.chunk + second.data.chunk + last.data.chunk)).toEqual(document(storage.getPostRevision(pid, 1)!));
    now = exp * 1000; expect(timed.getRevision(auth, sid, pid, 1, { cursor: second.meta.next_cursor! }, { request_id: 'ttl' })).toBeDefined();
    now += 1000; expect(() => timed.getRevision(auth, sid, pid, 1, { cursor: second.meta.next_cursor! }, { request_id: 'ttl' })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('P09: success, validation, access and minimum-metadata failures never write any database table', () => {
    const fingerprint = () => JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row: any) => [row.name, db.prepare(`SELECT * FROM "${row.name}"`).all()]));
    const before = fingerprint(); joinPages();
    for (const max_bytes of [4095, 65537, null, '4096', 4096.5, NaN]) expect(() => read.getRevision(auth, sid, pid, 1, { max_bytes } as any, { request_id: 'invalid' })).toThrow(expect.objectContaining({ statusCode: 400 }));
    for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) expect(() => read.getRevision(auth, sid, pid, revision, {}, { request_id: 'invalid' })).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => read.getRevision(auth, sid, pid, 1, { cursor: 'bad' }, { request_id: 'invalid' })).toThrow();
    expect(() => read.getRevision(auth, sid, 'missing', 1, {}, { request_id: 'missing' })).toThrow();
    expect(() => read.getRevision(auth, sid, pid, 1, { max_bytes: 4096 }, { request_id: '中'.repeat(5000) })).toThrow(expect.objectContaining({ statusCode: 422, code: 'QUERY_TOO_BROAD' }));
    expect(fingerprint()).toBe(before);
  });

  it('P10: two WAL connections preserve material and current lifecycle metadata in one controlled snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detuned-post-snapshot-'));
    const a = new Database(join(dir, 'forum.db')); const boot = bootstrapDatabase(a); const sa = new SqliteStorage(a);
    const b = new Database(join(dir, 'forum.db')); const sb = new SqliteStorage(b);
    try {
      const aa = new AuthService(sa, hash, clock), ab = new AuthService(sb, hash, clock), admin = aa.authenticateToken(boot.adminToken!);
      const ia = new IdempotencyService(sa, hash, clock), ib = new IdempotencyService(sb, hash, clock);
      const space = new SpaceService(sa, ids, clock, aa, ia).createSpace(admin, { slug: 'snapshot', objective: 'o', rules: [] }, 'space').space.id;
      const thread = new ThreadService(sa, ids, clock, hash, aa, ia).createThread(admin, space, { title: 't' }, 'thread').thread.id;
      const post = new PostService(sa, ids, clock, hash, aa, ia).createPost(admin, space, thread, { kind: 'note', title: 't', summary: 's', body: 'original' }, 'post').post.id;
      const get = sa.getPostRevision.bind(sa); let committed = false;
      sa.getPostRevision = (id, revision) => {
        if (!committed) { committed = true; new RedactionService(sb, ids, clock, ab, ib).createRedaction(admin, space, { target_type: 'post', target_id: post, reason: 'concurrent' }, 'redact'); }
        return get(id, revision);
      };
      const service = new PostRevisionReadService(sa, signer, aa, secret, clock);
      const page = service.getRevision(admin, space, post, 1, {}, { request_id: 'snapshot' });
      expect(committed).toBe(true); expect(page.data.lifecycle).toBe('active'); expect(JSON.parse(page.data.chunk).body).toBe('original');
      expect(sb.findPostById(post)!.lifecycle).toBe('redacted');
      expect(() => service.getRevision(admin, space, post, 1, { cursor: 'bad' }, { request_id: 'next' })).toThrow(expect.objectContaining({ statusCode: 410 }));
    } finally { b.close(); a.close(); rmSync(dir, { recursive: true, force: true }); }
  });
});
