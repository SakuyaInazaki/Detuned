import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { copyFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { buildApp } from '@detuned/server';
import type { Thread, Post, PostRevision, Relation } from '@detuned/protocol';
import { SqliteStorage, openAndCoordinateDatabase } from '@detuned/storage-sqlite';

const directory = new URL('../fixtures/history-b8dacd5/', import.meta.url);
type PostResult = { post: Post; revision: PostRevision; relations?: Relation[] };
type CreateResult = PostResult | { thread: Thread; initial_post: PostResult };
const postResult = (data: CreateResult): PostResult => 'initial_post' in data ? data.initial_post : data;
type Case = { entry: 'initial' | 'newpost' | 'revision'; url: string; payload: Record<string, unknown>; key: string; response_data: CreateResult; idempotency_record: Record<string, unknown> };
type Expected = { actor_id: string; space_id: string; generated_clock: string; cases: Case[]; final_post_heads: Record<string, number>; business_snapshot: Record<string, unknown[]> };
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const tables = ['actors', 'memberships', 'spaces', 'space_revisions', 'threads', 'thread_versions', 'posts', 'post_revisions', 'revision_artifacts', 'relations', 'events', 'idempotency_records'];

describe('H-R1 persistent real b8dacd5 HTTP history compatibility', () => {
  let dir: string, db: Database.Database, app: ReturnType<typeof buildApp>, expected: Expected, token: string, credentialId: string;
  const snapshot = () => Object.fromEntries(tables.map(name => [name, db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()]));
  const start = () => {
    db = new Database(join(dir, 'runtime.db'));
    openAndCoordinateDatabase(db, 'serve');
    const clock = { now: () => new Date(expected.generated_clock), nowIso: () => expected.generated_clock };
    app = buildApp({ storage: new SqliteStorage(db), clock });
  };
  const stop = async () => { if (app) await app.close(); if (db?.open) db.close(); };
  const call = async (url: string, payload: Record<string, unknown> | undefined, key?: string) => {
    const r = await app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}`, ...(key === undefined ? {} : { 'idempotency-key': key }) }, ...(payload === undefined ? {} : { payload }) });
    return { status: r.statusCode, body: r.json() };
  };
  // The only dynamic field in these creation replay results is the post's current head.
  // Fixed revision content/hash/editor/time and thread creation version stay exact.
  const replayData = (c: Case) => {
    const data = structuredClone(c.response_data);
    const post = postResult(data).post;
    post.current_revision = expected.final_post_heads[post.id];
    return data;
  };
  beforeEach(() => {
    expected = JSON.parse(readFileSync(new URL('expected.json', directory), 'utf8'));
    dir = mkdtempSync(join(tmpdir(), 'detuned-hr1-test-'));
    copyFileSync(new URL('legacy.db', directory), join(dir, 'runtime.db'));
    // Explicit test-only authentication setup: archive has no token/hash or persistent secret.
    const setup = new Database(join(dir, 'runtime.db'));
    token = randomBytes(32).toString('hex'); credentialId = `cred_hr1_${randomBytes(8).toString('hex')}`;
    setup.prepare("INSERT INTO instance_metadata(key,value) VALUES('token_secret',?)").run(randomBytes(32).toString('hex'));
    setup.prepare('INSERT INTO credentials(id,actor_id,token_hash,allowed_space_ids,capabilities,created_at,expires_at,revoked_at) VALUES(?,?,?,?,?,?,?,?)').run(credentialId, expected.actor_id, digest(Buffer.from(token)), JSON.stringify(['*']), JSON.stringify(['read', 'write', 'admin']), expected.generated_clock, null, null);
    setup.close(); start();
  });
  afterEach(async () => { await stop(); if (dir) rmSync(dir, { recursive: true, force: true }); });

  it('loads a hash-bound credential-free archive with the actual old HTTP business records', () => {
    const provenance = JSON.parse(readFileSync(new URL('provenance.json', directory), 'utf8'));
    expect(provenance.source_commit).toBe('b8dacd56779a007a2e7045b682bca0c036fdfc44');
    expect(provenance.actual_http_statuses).toEqual([201, 201, 201]);
    for (const [file, hash] of Object.entries(provenance.fixture_sha256)) expect(digest(readFileSync(new URL(file, directory)))).toBe(hash);
    const archive = new Database(new URL('legacy.db', directory).pathname, { readonly: true });
    try {
      expect(archive.prepare('SELECT count(*) AS n FROM credentials').get()).toEqual({ n: 0 });
      expect(archive.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get()).toBeUndefined();
    } finally { archive.close(); }
    expect(snapshot()).toEqual(expected.business_snapshot);
  });

  it.each(['initial', 'newpost', 'revision'] as const)('%s replays exact fixed result, rejects fresh bad writes and conflicts without duplicate business', async entry => {
    const c = expected.cases.find(x => x.entry === entry)!;
    const before = snapshot();
    expect(db.prepare('SELECT * FROM idempotency_records WHERE key=?').get(c.key)).toEqual(c.idempotency_record);
    const old = await call(c.url, c.payload, c.key);
    expect(old.status).toBe(201); expect(old.body.data).toEqual(replayData(c)); expect(snapshot()).toEqual(before);
    const fresh = await call(c.url, c.payload, `${c.key}-fresh`);
    expect(fresh.status).toBe(entry === 'revision' ? 409 : 400);
    expect(fresh.body.error.code).toBe(entry === 'revision' ? 'REVISION_CONFLICT' : 'VALIDATION_ERROR');
    expect(snapshot()).toEqual(before);
    if (entry === 'revision') {
      const corrected = await call(c.url, { ...c.payload, expected_revision: expected.final_post_heads[postResult(c.response_data).post.id] }, `${c.key}-fresh-current`);
      expect(corrected.status).toBe(400); expect(corrected.body.error.code).toBe('VALIDATION_ERROR'); expect(snapshot()).toEqual(before);
    }
    const changed = await call(c.url, { ...c.payload, title: 'different payload' }, c.key);
    expect(changed.status).toBe(409); expect(changed.body.error.code).toBe('IDEMPOTENCY_CONFLICT'); expect(snapshot()).toEqual(before);
  });

  it('replays all three old keys after a current-server close and reopen without altering business/hash/ref', async () => {
    const before = snapshot(); await stop(); start();
    for (const c of expected.cases) { const r = await call(c.url, c.payload, c.key); expect(r.status).toBe(201); expect(r.body.data).toEqual(replayData(c)); }
    expect(snapshot()).toEqual(before);
  });

  it('replays current redaction tombstones for all three fixed references without restoring content', async () => {
    const unique = [...new Set(expected.cases.map(c => postResult(c.response_data).post.id))];
    for (const id of unique) expect((await call(`/api/v1/spaces/${expected.space_id}/redactions`, { target_type: 'post', target_id: id, reason: 'H-R1 test redaction' }, `hr1-redact-${id}`)).status).toBe(201);
    const before = snapshot();
    for (const c of expected.cases) {
      const r = await call(c.url, c.payload, c.key); expect(r.status).toBe(201);
      const result = c.entry === 'initial' ? r.body.data.initial_post : r.body.data;
      const original = postResult(c.response_data);
      expect(result.post).toEqual({ ...original.post, current_revision: expected.final_post_heads[original.post.id], lifecycle: 'redacted' });
      expect(result.revision.post_id).toBe(original.revision.post_id); expect(result.revision.revision).toBe(original.revision.revision);
      expect(result.revision).toEqual({ ...original.revision, title: '[REDACTED]', summary: '[REDACTED]', body: '[REDACTED]', tags: [], structured: {}, content_hash: 'redacted' });
      expect(db.prepare('SELECT content_hash FROM post_revisions WHERE post_id=? AND revision=?').get(original.revision.post_id, original.revision.revision)).toEqual({ content_hash: original.revision.content_hash });
      expect(snapshot()).toEqual(before);
    }
  });

  it('checks current credential revocation before every old-key replay', async () => {
    expect((await call(`/api/v1/admin/credentials/${credentialId}/revoke`, undefined)).status).toBe(200);
    const before = snapshot();
    for (const c of expected.cases) { const r = await call(c.url, c.payload, c.key); expect(r.status).toBe(401); expect(r.body.error.code).toBe('UNAUTHENTICATED'); }
    expect(snapshot()).toEqual(before);
  });
});
