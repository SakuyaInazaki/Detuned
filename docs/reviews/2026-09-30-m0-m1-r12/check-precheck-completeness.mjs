// Review-only: deterministic HTTP fixtures and owned temporary SQLite files.
// Extends the already required raw-input and historical-time boundaries; no external attacker is implied.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual as equal } from 'node:util';
import { buildApp } from '../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase } from '../../../packages/storage-sqlite/dist/index.js';
import { extractResultRef, IdempotencyService, CryptoHasher } from '../../../packages/core/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const dir = mkdtempSync(join(tmpdir(), 'detuned-r12-review-'));
const db = new Database(join(dir, 'source.sqlite'));
const boot = bootstrapDatabase(db);
let instant = Date.parse('2026-09-29T06:00:00.000Z');
const clock = { now: () => new Date(instant), nowIso: () => new Date(instant).toISOString() };
const app = buildApp({ storage: new SqliteStorage(db), clock });
const probes = [];
let serial = 0;
const note = body => ({ kind: 'note', title: 'R10 note', summary: 'Synthetic fixture', body });
async function send(target, method, path, body, key = `p-${++serial}`) {
  const response = await target.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(body === undefined ? {} : { payload: body }) });
  return { status: response.statusCode, body: response.json() };
}
function data(result) {
  if (result.status >= 400) throw new Error(`Fixture setup failed: ${result.status} ${result.body.error?.code}`);
  return result.body.data;
}
function snapshot(database) {
  const schema = database.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
  return { schema, rows: schema.filter(x => x.type === 'table').map(({ name }) => [name,
    database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(r => JSON.stringify(r)).sort()]) };
}
function clone(name, logicalV1 = false) {
  const path = join(dir, `${name}.sqlite`); writeFileSync(path, db.serialize());
  const database = new Database(path);
  if (logicalV1) database.exec('DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
  return { path, database };
}
function setRef(database, key, value) {
  if (database.prepare('UPDATE idempotency_records SET result_ref=? WHERE key=?').run(JSON.stringify(value), key).changes !== 1)
    throw new Error(`Expected one result row for ${key}`);
}
function readRef(database, key) {
  return JSON.parse(database.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(key).result_ref);
}
function attempt(fn) {
  try { fn(); return { rejected: false }; }
  catch (e) { return { rejected: true, code: e.code ?? null }; }
}
async function withApp(database, fn) {
  const child = buildApp({ storage: new SqliteStorage(database), clock });
  try { await child.ready(); return await fn(child); }
  finally { await child.close(); }
}
function record(id, description, observed, passes) { probes.push({ id, description, observed, passes }); }

try {
  await app.ready();
  const space = data(await send(app, 'POST', '/spaces', { slug: 'r10-space', objective: 'B.4-2 boundaries', rules: [] })).space.id;
  const threadBody = { title: 'R10 original thread' };
  const originalThread = data(await send(app, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create'));
  const thread = originalThread.thread.id;
  const otherThread = data(await send(app, 'POST', `/spaces/${space}/threads`, { title: 'Other thread' })).thread.id;
  const target = data(await send(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, note('target'))).post.id;
  const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
  const nested = data(await send(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
  const relation = nested.relations[0];
  const otherNested = data(await send(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, { ...nestedBody, body: 'other source' }));
  const wrongSourceRelation = otherNested.relations[0];
  const foreignPost = data(await send(app, 'POST', `/spaces/${space}/threads/${otherThread}/posts`, note('other thread post')));
  const baseRef = readRef(db, 'nested-post');
  instant += 60000;
  const patch2Body = { expected_version: 1, title: 'R10 thread v2' };
  const patch2 = data(await send(app, 'PATCH', `/spaces/${space}/threads/${thread}`, patch2Body, 'patch2'));
  instant += 60000;
  data(await send(app, 'PATCH', `/spaces/${space}/threads/${thread}`, { expected_version: 2, title: 'R10 thread v3' }, 'patch3'));
  data(await send(app, 'POST', `/spaces/${space}/relations/${relation.id}/resolve`, {
    expected_version: 1, reason_ref: { post_id: target, revision: 1 },
  }));

  const relationBody = { source_ref: { post_id: nested.post.id, revision: 1 }, target_ref: { post_id: target, revision: 1 }, type: 'challenges' };
  const reusedRelation = data(await send(app, 'POST', `/spaces/${space}/relations`, relationBody, 'relation-reuse'));

  // V01: Typed precheck must validate all facts knowable before a missing-history marker.
  {
    const observations = [];
    const cases = [
      ['missing_post_revision', { ...baseRef, revision: 999, relations: undefined }],
      ['wrong_relation_source', { ...baseRef, relations: undefined, relation_ids: [wrongSourceRelation.id] }],
      ['nonexistent_nested_relation', { ...baseRef, relations: undefined, relation_ids: ['rel_r12_missing'] }],
    ];
    for (const [variant, ref] of cases) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        setRef(database, 'nested-post', ref);
        const before = snapshot(database);
        const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        const kind = readRef(database, 'nested-post').kind;
        database.close(); database = new Database(fixture.path);
        observations.push({ variant, rejected: outcome.rejected, resulting_kind: kind, unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('V01', 'Typed ID-only compatibility cannot hide missing revisions or known relation ownership errors', observations,
      observations.every(x => x.rejected && x.unchanged_after_reopen));
  }

  // V02: The legacy path must check provided ID-only fields and known entities before degradation.
  {
    const observations = [];
    const cases = [
      ['legacy_non_array_relation_ids', { $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: 'not-an-array' }],
      ['legacy_wrong_thread_before_marker', { $ref: 'post', post_id: foreignPost.post.id, revision: 1, relation_ids: [relation.id] }],
      ['legacy_duplicate_relation_ids', { $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id, relation.id] }],
    ];
    for (const [variant, ref] of cases) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        setRef(database, 'nested-post', ref);
        const before = snapshot(database);
        const online = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
        const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        const normalized = readRef(database, 'nested-post');
        database.close(); database = new Database(fixture.path);
        observations.push({ variant, online_status: online.status, online_relations_count: online.body.data?.relations?.length ?? null,
          migration_rejected: outcome.rejected, resulting_kind: normalized.kind ?? null, unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('V02', 'Legacy explicit malformed arrays and known contradictions must not be discarded or persisted as markers', observations,
      observations.every(x => x.online_status === 422 && x.migration_rejected && x.unchanged_after_reopen));
  }

  // V03: A null array is still an explicitly malformed business output, not an omitted array.
  async function executeResultProbe(name, relations) {
    const fixture = clone(name); let database = fixture.database;
    try {
      const storage = new SqliteStorage(database);
      const idem = new IdempotencyService(storage, new CryptoHasher(), clock);
      const post = { ...nested.post, id: `pst_r12_${name}`, current_revision: 1 };
      const revision = { ...nested.revision, post_id: post.id, revision: 1 };
      const before = snapshot(database); let original; let retry;
      const outcome = attempt(() => { original = idem.executeIdempotent(boot.adminActorId, space, `post.create:${thread}`, name, { fixture: name }, 201, tx => {
        tx.createPost(post, revision);
        tx.appendEvent(space, { id: `evt_r12_${name}`, space_id: space, type: 'post.created', object_id: post.id,
          revision: 1, visibility: 'space', actor_id: boot.adminActorId, created_at: clock.nowIso() });
        return { post, revision, relations };
      }); });
      if (!outcome.rejected) retry = idem.executeIdempotent(boot.adminActorId, space, `post.create:${thread}`, name, { fixture: name }, 201, () => { throw new Error('Replay must not execute action'); });
      const counts = {
        business: database.prepare('SELECT count(*) AS n FROM posts WHERE id=?').get(post.id).n,
        events: database.prepare('SELECT count(*) AS n FROM events WHERE id=?').get(`evt_r12_${name}`).n,
        results: database.prepare('SELECT count(*) AS n FROM idempotency_records WHERE key=?').get(name).n,
      };
      database.close(); database = new Database(fixture.path);
      return { rejected: outcome.rejected, counts, unchanged_after_reopen: equal(before, snapshot(database)),
        exact_retry: original && retry ? equal(original.data, retry.data) : null };
    } finally { database.close(); }
  }
  {
    const obs = await executeResultProbe('null_relations', null);
    record('V03', 'Explicit null relation output fails and rolls back business/events/results', obs,
      obs.rejected && obs.unchanged_after_reopen && Object.values(obs.counts).every(x => x === 0));
  }

  // V04: Selecting one of two contradictory supplied timestamps must not hide the conflict.
  {
    const fixture = clone('v1-time-conflict'); let database = fixture.database;
    try {
      const ref = { ...originalThread, thread: { ...originalThread.thread, updated_at: '1999-01-01T00:00:00.000Z' } };
      setRef(database, 'thread-create', ref);
      const before = snapshot(database);
      const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      const normalized = readRef(database, 'thread-create');
      database.close(); database = new Database(fixture.path);
      const replay = outcome.rejected ? null : await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create'));
      const obs = { migration_rejected: outcome.rejected, supplied_created_at: ref.thread.created_at, supplied_updated_at: ref.thread.updated_at,
        resulting_kind: normalized.kind ?? null, replay_status: replay?.status ?? null, replay_updated_at: replay?.body.data?.thread?.updated_at ?? null,
        unchanged_after_reopen: equal(before, snapshot(database)) };
      record('V04', 'Explicit v1 updated_at conflicting with the historical snapshot is refused atomically', obs,
        outcome.rejected && obs.unchanged_after_reopen);
    } finally { database.close(); }
  }

  // V05: Supported legal ID-only references can still become markers; complete inputs still replay.
  {
    const fixture = clone('legal-paired-inputs'); let database = fixture.database;
    let legacy;
    try {
      setRef(database, 'nested-post', { $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id] });
      setRef(database, 'thread-create', originalThread);
      setRef(database, 'patch2', patch2);
      openAndCoordinateDatabase(database, 'serve');
      database.close(); database = new Database(fixture.path);
      openAndCoordinateDatabase(database, 'serve');
      const before = snapshot(database);
      legacy = await withApp(database, async child => {
        const post = await send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post');
        const threadResponse = await send(child, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create');
        const patchResponse = await send(child, 'PATCH', `/spaces/${space}/threads/${thread}`, patch2Body, 'patch2');
        return { id_only_controlled_422: post.status === 422 && post.body.error?.code === 'RESYNC_REQUIRED',
          complete_thread_exact: threadResponse.status === 201 && equal(threadResponse.body.data, originalThread),
          complete_patch_exact: patchResponse.status === 200 && equal(patchResponse.body.data, patch2) };
      });
      legacy.no_replay_writes = equal(before, snapshot(database));
    } finally { database.close(); }
    const fresh = await executeResultProbe('empty_relations', []);
    record('V05', 'Legal old inputs, complete history and empty relation arrays remain supported', { ...legacy, valid_fresh_exact: !fresh.rejected && fresh.exact_retry },
      Object.values(legacy).every(x => x === true) && !fresh.rejected && fresh.exact_retry);
  }
  const output = { reviewed_date: '2026-09-30', runtime: process.version,
    fixture_note: 'Review-only synthetic stored-data corruption and internal action fault injection in owned temp SQLite files. V04 mutates an explicit timestamp of an HTTP-generated complete response. V05 has paired positive controls. No real credentials, models or network calls.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }); }
