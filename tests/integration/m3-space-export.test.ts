import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { setImmediate as immediate } from 'node:timers/promises';
import { bootstrapDatabase, SqliteStorage } from '../../packages/storage-sqlite/src/index.js';
import { AuthService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, RedactionService, IdempotencyService, SpaceExportService, type SpaceExportSession } from '../../packages/core/src/index.js';
import { validateSpaceExportLine } from '../../packages/protocol/src/index.js';
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture(memory = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'detuned-export-'));
  const db = new Database(memory ? ':memory:' : path.join(root, 'forum.sqlite'));
  const boot = bootstrapDatabase(db); const storage = new SqliteStorage(db), clock = new SystemClock(), hash = new CryptoHasher(), ids = new CryptoIdGenerator();
  const authService = new AuthService(storage, hash, clock), auth = authService.authenticateToken(boot.adminToken!);
  const idempotency = new IdempotencyService(storage, hash, clock), spaces = new SpaceService(storage, ids, clock, authService, idempotency);
  const sid = spaces.createSpace(auth, { slug: 'export', objective: 'objective', rules: ['rules'] }, 'space').space.id;
  const threads = new ThreadService(storage, ids, clock, hash, authService, idempotency);
  const tid = threads.createThread(auth, sid, { title: 'thread' }, 'thread').thread.id;
  const posts = new PostService(storage, ids, clock, hash, authService, idempotency);
  const pid = posts.createPost(auth, sid, tid, { kind: 'note', title: 'post', summary: 'summary', body: 'oldbody' }, 'post').post.id;
  const service = new SpaceExportService(storage, authService, clock);
  cleanup.push(async () => { service.closeAll(); db.close(); await rm(root, { recursive: true, force: true }); });
  return { root, db, storage, clock, authService, auth, sid, tid, pid, posts, spaces, service, ids, idempotency };
}
async function lines(session: SpaceExportSession) {
  const output: string[] = [];
  for (;;) { const next = session.nextLine(); if (next.kind === 'done') return output; if (next.kind === 'line') output.push(next.line); else await immediate(); }
}
const parsed = (wire: string[]) => wire.map(line => JSON.parse(line));
describe('M3.3-B.1 independent snapshot export', () => {
  it('delivers strict white records and an exact hash-chain completion while excluding internals', async () => {
    const f = await fixture(); const wire = await lines(f.service.open(f.auth, f.sid)); const output = parsed(wire);
    expect(output.every(validateSpaceExportLine)).toBe(true);
    expect(output[0]).toMatchObject({ type: 'header', source: { space_id: f.sid, schema_version: 6 }, formal_review_status: 'excluded' });
    const end = output.at(-1); expect(end.type).toBe('end');
    let chain = Buffer.alloc(32); let bytes = 0;
    for (const line of wire.slice(0, -1)) { chain = createHash('sha256').update(chain).update(line).digest(); bytes += Buffer.byteLength(line); }
    expect(end.chain_sha256).toBe(chain.toString('hex')); expect(end.bytes_before_end).toBe(bytes); expect(end.record_count).toBe(output.length - 2);
    for (const forbidden of ['token_hash','token_secret','session_id','storage_key','consumer_key','request_hash','disabled_at','allowed_space_ids']) expect(wire.join('')).not.toContain(forbidden);
    expect(output.filter(line => line.type === 'record').map(line => line.seq)).toEqual(Array.from({ length: end.record_count }, (_, n) => n + 1));
    expect(f.service.activeCount).toBe(0);
  });
  it('orders resolution history by stable id while preserving relation, version, references and chain', async () => {
    const f = await fixture(); const now = f.clock.nowIso(), ref = JSON.stringify({ post_id: f.pid, revision: 1 });
    const rel = f.db.prepare("INSERT INTO relations(id,space_id,source_post_id,source_revision,target_post_id,target_revision,type,state,version,creator_id,created_at) VALUES(?,?,?,1,?,1,?,'resolved',3,?,?)");
    rel.run('rel_z',f.sid,f.pid,f.pid,'supports',f.auth.actor.id,now); rel.run('rel_a',f.sid,f.pid,f.pid,'challenges',f.auth.actor.id,now);
    const ins = f.db.prepare('INSERT INTO relation_resolutions(id,relation_id,version,resolver_id,reason_ref,action,created_at) VALUES(?,?,?,?,?,?,?)');
    ins.run('resolution_a','rel_z',3,f.auth.actor.id,ref,'resolve',now); ins.run('resolution_z','rel_a',2,f.auth.actor.id,ref,'reopen',now);
    const wire = await lines(f.service.open(f.auth,f.sid)); const output = parsed(wire);
    expect(output.filter(x => x.kind === 'relation_resolution').map(x => [x.data.id,x.data.relation_id,x.data.version,x.data.reason_ref])).toEqual([['resolution_a','rel_z',3,{post_id:f.pid,revision:1}],['resolution_z','rel_a',2,{post_id:f.pid,revision:1}]]);
    let chain = Buffer.alloc(32); for (const line of wire.slice(0,-1)) chain = createHash('sha256').update(chain).update(line).digest();
    expect(output.at(-1).chain_sha256).toBe(chain.toString('hex')); expect(output.every(validateSpaceExportLine)).toBe(true);
  });
  it('holds one reader snapshot while a different live WAL writer commits a newer revision', async () => {
    const f = await fixture(); const session = f.service.open(f.auth, f.sid); const header = session.nextLine(); expect(header.kind).toBe('line');
    const writer = new Database(path.join(f.root, 'forum.sqlite')); const live = new SqliteStorage(writer);
    try {
      const auth = new AuthService(live, new CryptoHasher(), f.clock).refreshContext(f.auth);
      new PostService(live, f.ids, f.clock, new CryptoHasher(), new AuthService(live, new CryptoHasher(), f.clock), new IdempotencyService(live, new CryptoHasher(), f.clock))
        .createRevision(auth, f.sid, f.pid, { expected_revision: 1, title: 'new', summary: 'new', body: 'newbody' }, 'new-revision');
      const rest = parsed(await lines(session));
      expect(rest.filter(line => line.kind === 'post_revision')).toHaveLength(1); expect(rest.find(line => line.kind === 'post_revision').data.body).toBe('oldbody');
      expect(rest.find(line => line.kind === 'post').data.current_revision).toBe(1); expect(rest.at(-1).type).toBe('end');
      expect(live.findPostById(f.pid)?.current_revision).toBe(2);
    } finally { writer.close(); }
  });
  it('invalidates after an already-delivered post is redacted and never issues an end', async () => {
    const f = await fixture(); const session = f.service.open(f.auth, f.sid); let sawBody = false;
    while (!sawBody) { const next = session.nextLine(); if (next.kind === 'line') sawBody = JSON.parse(next.line).kind === 'post_revision'; }
    new RedactionService(f.storage, f.ids, f.clock, f.authService, f.idempotency).createRedaction(f.auth, f.sid, { target_type: 'post', target_id: f.pid, reason: 'remove' }, 'redaction');
    expect(() => session.nextLine()).toThrowError(expect.objectContaining({ code: 'EXPORT_INVALIDATED', statusCode: 409 }));
    expect(f.service.activeCount).toBe(0);
  });
  it('checks live credentials, actor disablement and ACL epoch at every line', async () => {
    for (const change of ['credential', 'actor', 'epoch']) {
      const f = await fixture(); const session = f.service.open(f.auth, f.sid); session.nextLine();
      if (change === 'credential') f.storage.revokeCredential(f.auth.credential.id, f.clock.nowIso());
      else if (change === 'actor') f.storage.updateActor({ ...f.auth.actor, disabled_at: f.clock.nowIso() });
      else f.storage.upsertMembership({ ...f.storage.getMembership(f.sid, f.auth.actor.id)!, reviewer_eligible: false });
      expect(() => session.nextLine()).toThrowError(expect.objectContaining({ code: change === 'epoch' ? 'EXPORT_INVALIDATED' : 'UNAUTHENTICATED' }));
      expect(f.service.activeCount).toBe(0);
    }
  });
  it('projects preexisting redaction tombstones, known references and private artifact links without old content', async () => {
    const f = await fixture();
    const other = f.spaces.createSpace(f.auth, { slug: 'other', objective: 'outside', rules: [] }, 'other').space.id;
    const extraPost = f.posts.createPost(f.auth, f.sid, f.tid, { kind: 'note', title: 'visible', summary: 's', body: 'b' }, 'visible').post.id;
    f.db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify({ user_note: 'preserved', source_refs: [{ post_id: f.pid, revision: 1 }, { post_id: 'OUTSIDE_SECRET_ID', revision: 1 }], evidence_refs: [{ kind: 'artifact', artifact_id: 'PRIVATE_SECRET_ID' }] }), extraPost);
    f.db.prepare('UPDATE space_revisions SET pinned_refs=? WHERE space_id=?').run(JSON.stringify([{ post_id: f.pid, revision: 1 }, { post_id: 'OUTSIDE_SECRET_ID', revision: 1 }]), f.sid);
    const now = f.clock.nowIso();
    f.storage.createArtifact({ id: 'public-missing', space_id: f.sid, owner_id: f.auth.actor.id, visibility: 'space', review_assignment_id: null, check_run_id: null, sha256: 'a'.repeat(64), bytes: 42, mime: 'secret-mime', storage_key: 'secret-key', state: 'missing', created_at: now });
    f.storage.createArtifact({ id: 'PRIVATE_SECRET_ID', space_id: f.sid, owner_id: f.auth.actor.id, visibility: 'review_assignment', review_assignment_id: 'private', check_run_id: null, sha256: 'b'.repeat(64), bytes: 42, mime: 'private-mime', storage_key: 'private-key', state: 'ready', created_at: now });
    new RedactionService(f.storage, f.ids, f.clock, f.authService, f.idempotency).createRedaction(f.auth, f.sid, { target_type: 'post', target_id: f.pid, reason: 'remove' }, 'redaction');
    const wire = await lines(f.service.open(f.auth, f.sid)); const output = parsed(wire);
    expect(wire.join('')).not.toContain('oldbody'); expect(wire.join('')).not.toContain('OUTSIDE_SECRET_ID'); expect(wire.join('')).not.toContain('PRIVATE_SECRET_ID'); expect(wire.join('')).not.toContain(other);
    expect(output.find(line => line.kind === 'post_revision' && line.data.post_id === f.pid).data).toEqual({ post_id: f.pid, revision: 1, tombstone: true });
    const projected = output.find(line => line.kind === 'post_revision' && line.data.post_id === extraPost).data;
    expect(projected.projected).toBe(true); expect(projected).not.toHaveProperty('source_content_hash'); expect(projected.structured.user_note).toBe('preserved');
    expect(output.find(line => line.kind === 'artifact').data).toEqual({ id: 'public-missing', space_id: f.sid, state: 'missing', tombstone: true });
  });
  it('enforces raw, encoded line, total wire and record limits without a completion footer', async () => {
    for (const limits of [{ max_raw_bytes: 10 }, { max_line_bytes: 10 }, { max_total_bytes: 10 }, { max_records: 0 }]) {
      const f = await fixture(); const service = new SpaceExportService(f.storage, f.authService, f.clock, { limits });
      const session = service.open(f.auth, f.sid);
      await expect(lines(session)).rejects.toMatchObject({ code: 'EXPORT_LIMIT_EXCEEDED', statusCode: 422 }); expect(service.activeCount).toBe(0);
    }
  });
  it('limits active readers and releases a stalled reader on deadline without needing another next call', async () => {
    const f = await fixture(); let end!: (error: unknown) => void; const deadline = new Promise(resolve => { end = resolve; });
    const service = new SpaceExportService(f.storage, f.authService, f.clock, { limits: { max_active: 1, deadline_ms: 20 } });
    const session = service.open(f.auth, f.sid, { onError: end }); session.nextLine();
    expect(() => service.open(f.auth, f.sid)).toThrowError(expect.objectContaining({ code: 'RATE_LIMITED' }));
    expect(await deadline).toMatchObject({ code: 'EXPORT_LIMIT_EXCEEDED' }); expect(service.activeCount).toBe(0);
    session.close(); session.close();
  });
  it('leaves in-memory constructor and ordinary reads available but refuses only new export', async () => {
    const f = await fixture(true); expect(f.storage.findPostById(f.pid)?.id).toBe(f.pid);
    expect(() => f.service.open(f.auth, f.sid)).toThrowError(expect.objectContaining({ code: 'EXPORT_UNAVAILABLE', statusCode: 503, retryable: false })); expect(f.service.activeCount).toBe(0);
  });
  it('refuses a file-backed DELETE journal reader without changing source mode', async () => {
    const f = await fixture(); f.db.pragma('journal_mode=DELETE');
    expect(() => f.service.open(f.auth, f.sid)).toThrowError(expect.objectContaining({ code: 'EXPORT_UNAVAILABLE', statusCode: 503, retryable: false }));
    expect(f.db.pragma('journal_mode', { simple: true })).toBe('delete'); expect(f.service.activeCount).toBe(0);
  });

  it('keeps SQLite event watermarks above 2^53 exact as decimal text for snapshot and redaction guard', async () => {
    const f = await fixture();
    const append = f.db.prepare('INSERT INTO events(id,space_id,seq,type,object_id,revision,visibility,actor_id,created_at) VALUES(?,?,?,?,?,1,?,?,?)');
    append.run('large-normal', f.sid, '9007199254740993', 'post.created', f.pid, 'public', f.auth.actor.id, f.clock.nowIso());
    const session = f.service.open(f.auth, f.sid); const first = session.nextLine();
    expect(first.kind).toBe('line'); if (first.kind !== 'line') throw new Error('Missing header');
    expect(JSON.parse(first.line).source.snapshot_event_seq).toBe('9007199254740993');
    expect(f.storage.getExportEventSeq(f.sid)).toBe('9007199254740993');
    append.run('large-redaction', f.sid, '9007199254740994', 'post.redacted', f.pid, 'public', f.auth.actor.id, f.clock.nowIso());
    expect(() => session.nextLine()).toThrowError(expect.objectContaining({ code: 'EXPORT_INVALIDATED' }));
    expect(f.service.activeCount).toBe(0);
  });

});
