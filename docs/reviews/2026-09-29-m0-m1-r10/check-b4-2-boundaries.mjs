// Review-only: deterministic HTTP fixtures and owned temporary SQLite files.
// Deliberately damaged references test the B.4-2 contract; no external attacker is implied.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual as equal } from 'node:util';
import { buildApp } from '../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase } from '../../../packages/storage-sqlite/dist/index.js';
import { extractResultRef } from '../../../packages/core/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const dir = mkdtempSync(join(tmpdir(), 'detuned-r10-review-'));
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

  // P01: an existing same-space relationship is insufficient to prove ownership/history.
  {
    const observations = [];
    for (const variant of ['wrong_source_post', 'future_nested_version']) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        const rel = variant === 'wrong_source_post' ? wrongSourceRelation : relation;
        const version = variant === 'future_nested_version' ? 999 : rel.version;
        setRef(database, 'nested-post', { ...baseRef, relation_ids: [rel.id], relations: [{ id: rel.id, version, state: rel.state }] });
        const before = snapshot(database);
        const online = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
        const migrated = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        database.close(); database = new Database(fixture.path);
        observations.push({ variant, online_status: online.status, migration_rejected: migrated.rejected,
          returned_wrong_source: online.status < 400 && online.body.data?.relations?.[0]?.source_post_id !== online.body.data?.post?.id,
          returned_version: online.body.data?.relations?.[0]?.version ?? null,
          unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('P01', 'Nested refs must bind to the result source and to a provable historical version', observations,
      observations.every(x => x.online_status === 422 && x.migration_rejected && x.unchanged_after_reopen));
  }

  // P02: unreplayable is for valid insufficient history, not a substitute for validating damaged input.
  {
    const observations = [];
    const cases = [
      ['typed_post_cached_body', 'nested-post', { ...baseRef, relations: undefined, body: 'synthetic forbidden cache' }],
      ['typed_post_duplicate_ids', 'nested-post', { ...baseRef, relations: undefined, relation_ids: [relation.id, relation.id] }],
      ['known_operation_wrong_kind', 'thread-create', { v: 1, kind: 'relation.create', relation_id: relation.id }],
      ['invalid_thread_version_zero', 'patch2', { v: 1, kind: 'thread.patch', thread_id: thread, thread_version: 0 }],
      ['wrong_thread_target', 'patch2', { v: 1, kind: 'thread.patch', thread_id: otherThread, thread_version: 99 }],
    ];
    for (const [variant, key, ref] of cases) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        setRef(database, key, ref);
        const before = snapshot(database);
        const migrated = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        const afterKind = readRef(database, key).kind;
        database.close(); database = new Database(fixture.path);
        observations.push({ variant, migration_rejected: migrated.rejected, resulting_kind: afterKind,
          unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('P02', 'Every migration early return validates the original operation, shape and known entity bindings', observations,
      observations.every(x => x.migration_rejected && x.unchanged_after_reopen));
  }

  // P03: supported legacy online replay must pass the same checks/projection as migration.
  {
    const wrongFixture = clone('legacy-wrong-thread'); const wrongDb = wrongFixture.database;
    let wrong;
    try {
      setRef(wrongDb, 'nested-post', { $ref: 'post', post_id: foreignPost.post.id, revision: 1, relation_ids: [] });
      const before = snapshot(wrongDb);
      const replay = await withApp(wrongDb, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
      const migrated = attempt(() => openAndCoordinateDatabase(wrongDb, 'serve'));
      wrong = { online_status: replay.status, returned_wrong_thread: replay.status < 400 && replay.body.data?.post?.thread_id !== thread,
        migration_rejected: migrated.rejected, no_mutation: equal(before, snapshot(wrongDb)) };
    } finally { wrongDb.close(); }
    const timeFixture = clone('legacy-thread-time'); const timeDb = timeFixture.database;
    let timestamps;
    try {
      setRef(timeDb, 'thread-create', originalThread);
      const before = await withApp(timeDb, child => send(child, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create'));
      openAndCoordinateDatabase(timeDb, 'serve');
      const after = await withApp(timeDb, child => send(child, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create'));
      timestamps = { original_updated_at: originalThread.thread.updated_at, online_status: before.status,
        online_updated_at: before.body.data?.thread?.updated_at, after_migration_status: after.status,
        after_migration_exact: equal(after.body.data, originalThread), online_exact: equal(before.body.data, originalThread) };
    } finally { timeDb.close(); }
    record('P03', 'Legacy online replay does not bypass target binding or replace historical updated_at', { wrong_target: wrong, timestamps },
      wrong.online_status === 422 && wrong.migration_rejected && wrong.no_mutation && timestamps.online_status === 201 &&
      timestamps.after_migration_status === 201 && timestamps.online_exact && timestamps.after_migration_exact);
  }

  // P04: missing historical timestamps must never be synthesized from migration wall time.
  {
    const fixture = clone('missing-historical-time', true); let database = fixture.database;
    try {
      setRef(database, 'thread-create', originalThread);
      const missingTime = { ...patch2 }; delete missingTime.created_at; delete missingTime.updated_at;
      setRef(database, 'patch2', missingTime);
      const before = snapshot(database);
      const migrated = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      const persisted = !migrated.rejected
        ? database.prepare('SELECT created_at FROM thread_versions WHERE thread_id=? AND version=2').get(thread)?.created_at ?? null : null;
      database.close(); database = new Database(fixture.path);
      const replay = migrated.rejected ? null : await withApp(database, child => send(child, 'PATCH', `/spaces/${space}/threads/${thread}`, patch2Body, 'patch2'));
      const obs = { migration_rejected: migrated.rejected, unchanged_if_refused: equal(before, snapshot(database)),
        original_updated_at: patch2.updated_at, persisted_version_time: persisted,
        replay_status: replay?.status ?? null, replay_updated_at: replay?.body.data?.updated_at ?? null };
      record('P04', 'A missing timestamp is recovered from evidence or refused, never replaced with wall time', obs,
        migrated.rejected ? obs.unchanged_if_refused : replay.status === 422 ||
          (replay.status === 200 && replay.body.data.updated_at === patch2.updated_at));
    } finally { database.close(); }
  }

  // P05: validating a manufactured valid ref must not hide malformed new business results.
  {
    const observations = [];
    for (const [variant, op, result] of [
      ['invalid_relation_state', 'relation.create', { ...relation, state: 'not-a-state' }],
      ['non_numeric_relation_version', 'relation.create', { ...relation, version: '2' }],
      ['invalid_nested_state', `post.create:${thread}`, { ...nested, relations: [{ ...relation, state: 'not-a-state' }] }],
    ]) {
      let encoded;
      const outcome = attempt(() => { encoded = JSON.parse(extractResultRef(op, result)); });
      observations.push({ variant, rejected: outcome.rejected,
        encoded_state: encoded?.relation_state ?? encoded?.relations?.[0]?.state ?? null,
        encoded_version: encoded?.relation_version ?? encoded?.relations?.[0]?.version ?? null });
    }
    record('P05', 'The new encoder rejects malformed required states/versions rather than defaulting them', observations,
      observations.every(x => x.rejected));
  }

  // Positive controls: fixed modern nested snapshots and recoverable full legacy results.
  {
    const direct = await send(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post');
    const fixture = clone('valid-full-history', true); let database = fixture.database;
    try {
      setRef(database, 'thread-create', originalThread);
      setRef(database, 'patch2', patch2);
      setRef(database, 'nested-post', nested);
      const first = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      database.close(); database = new Database(fixture.path);
      const second = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      const before = snapshot(database);
      const legacy = await withApp(database, async child => ({
        post: await send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'),
        thread: await send(child, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create'),
        patch: await send(child, 'PATCH', `/spaces/${space}/threads/${thread}`, patch2Body, 'patch2'),
      }));
      const obs = { modern_status: direct.status, modern_exact: equal(direct.body.data, nested),
        first_start_succeeds: !first.rejected, second_start_succeeds: !second.rejected,
        full_legacy_post_exact: legacy.post.status === 201 && equal(legacy.post.body.data, nested),
        full_legacy_thread_exact: legacy.thread.status === 201 && equal(legacy.thread.body.data, originalThread),
        full_legacy_patch_exact: legacy.patch.status === 200 && equal(legacy.patch.body.data, patch2),
        no_replay_mutation: equal(before, snapshot(database)) };
      record('P06', 'Modern and recoverable full legacy results still replay exactly after later changes and restart', obs,
        obs.modern_status === 201 && Object.entries(obs).filter(([key]) => key !== 'modern_status').every(([, v]) => v === true));
    } finally { database.close(); }
  }
  const output = { reviewed_date: '2026-09-29', runtime: process.version,
    fixture_note: 'Owned synthetic data. P01/P02/P03 contain deliberately inconsistent refs. P04 is an accepted missing-time legacy-style variant, not a proven released-binary output. P05 supplies malformed encoder inputs. P06 is a positive control. No model/network calls or real credentials.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }); }
