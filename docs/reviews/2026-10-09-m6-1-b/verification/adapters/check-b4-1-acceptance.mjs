// Review-only. Owned temporary SQLite files, synthetic credentials, Fastify injection.
// N01 injects a response-layer failure after commit; it is not a TCP disconnect test.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual as equal } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase as currentCoordinate } from '../../../../../packages/storage-sqlite/dist/index.js';

// M6.1-B: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const dir = mkdtempSync(join(tmpdir(), 'detuned-r9-review-'));
const sourcePath = join(dir, 'source.sqlite');
const db = new Database(sourcePath);
const boot = bootstrapDatabase(db);
const clock = { now: () => new Date('2026-09-29T05:00:00.000Z'), nowIso: () => '2026-09-29T05:00:00.000Z' };
const app = buildApp({ storage: new SqliteStorage(db), clock });
const probes = [];
let serial = 0;
async function send(target, method, path, body, key = `n-${++serial}`) {
  const response = await target.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(body === undefined ? {} : { payload: body }) });
  return { status: response.statusCode, body: response.json() };
}
function data(result) {
  if (result.status >= 400) throw new Error(`Setup failed: ${result.status} ${result.body.error?.code}`);
  return result.body.data;
}
function snapshot(database) {
  const schema = database.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
  return { schema, rows: schema.filter(x => x.type === 'table').map(({ name }) => [name,
    database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(r => JSON.stringify(r)).sort()]) };
}
function counts(database) {
  return Object.fromEntries(['spaces', 'memberships', 'events', 'idempotency_records'].map(t =>
    [t, database.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));
}
function setRef(database, key, ref) {
  if (database.prepare('UPDATE idempotency_records SET result_ref=? WHERE key=?').run(JSON.stringify(ref), key).changes !== 1)
    throw new Error(`Expected one result row: ${key}`);
}
function readRef(database, key) {
  return JSON.parse(database.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(key).result_ref);
}
function attempt(fn) {
  try { fn(); return { rejected: false, code: null }; }
  catch (e) { return { rejected: true, code: e.code ?? null }; }
}
async function withApp(database, fn) {
  const child = buildApp({ storage: new SqliteStorage(database), clock });
  try { await child.ready(); return await fn(child); }
  finally { await child.close(); }
}
function record(id, description, observed, passes) { probes.push({ id, description, observed, passes }); }

let faultHits = 0, committedVisible = false, originalAfterCommit;
app.addHook('onSend', async (request, reply, payload) => {
  if (request.method === 'POST' && request.url === '/api/v1/spaces' &&
      request.headers['idempotency-key'] === 'lost-response' && reply.statusCode === 201 && faultHits === 0) {
    faultHits++;
    originalAfterCommit = JSON.parse(String(payload)).data;
    const reader = new Database(sourcePath, { readonly: true });
    try {
      committedVisible = !db.inTransaction &&
        reader.prepare('SELECT count(*) AS n FROM spaces WHERE id=?').get(originalAfterCommit.space.id).n === 1 &&
        reader.prepare("SELECT count(*) AS n FROM idempotency_records WHERE key='lost-response'").get().n === 1 &&
        reader.prepare('SELECT count(*) AS n FROM events').get().n > 0;
    } finally { reader.close(); }
    throw new Error('R9 deterministic response failure after durable commit');
  }
  return payload;
});

try {
  await app.ready();
  const spaceBody = { slug: 'r9-response-loss', objective: 'Response fault recovery', rules: [] };
  const failed = await send(app, 'POST', '/spaces', spaceBody, 'lost-response');
  const afterCommit = counts(db);
  const replay = await send(app, 'POST', '/spaces', spaceBody, 'lost-response');
  const sameCounts = equal(afterCommit, counts(db));
  // Close the real app/connection, then restart the original file via the coordinator.
  await app.close(); db.close();
  let reopenedDb = new Database(sourcePath);
  let reopened;
  try {
    openAndCoordinateDatabase(reopenedDb, 'serve');
    reopened = await withApp(reopenedDb, child => send(child, 'POST', '/spaces', spaceBody, 'lost-response'));
    const obs = { fault_hits: faultHits, committed_visible_from_other_connection: committedVisible,
      first_status: failed.status, retry_status: replay.status, reopened_status: reopened.status,
      retry_exact: equal(replay.body.data, originalAfterCommit), reopened_exact: equal(reopened.body.data, originalAfterCommit),
      no_extra_writes: sameCounts && equal(afterCommit, counts(reopenedDb)) };
    record('N01', 'A real response-layer failure after commit recovers the complete original space result', obs,
      obs.fault_hits === 1 && obs.committed_visible_from_other_connection && obs.first_status === 500 &&
      obs.retry_status === 201 && obs.reopened_status === 201 && obs.retry_exact && obs.reopened_exact && obs.no_extra_writes);
  } finally { reopenedDb.close(); }

  // Remaining independent fixtures are derived from the committed source file.
  // The original closed DB cannot serialize, so establish a fresh fixture source.
  const fixtureSource = new Database(sourcePath);
  const fixtureApp = buildApp({ storage: new SqliteStorage(fixtureSource), clock });
  const fixtureClone = name => {
    const path = join(dir, `${name}.sqlite`); writeFileSync(path, fixtureSource.serialize());
    return { path, database: new Database(path) };
  };
  try {
    await fixtureApp.ready();
    const space = originalAfterCommit.space.id;
    const thread = data(await send(fixtureApp, 'POST', `/spaces/${space}/threads`, { title: 'N thread' })).thread.id;
    const patchBody = { expected_version: 1, title: 'N thread v2' };
    data(await send(fixtureApp, 'PATCH', `/spaces/${space}/threads/${thread}`, patchBody, 'thread-patch'));
    const operation = `thread.patch:${thread}`;
    const marker = { v: 1, kind: 'unreplayable', op: operation, reason: 'historical_thread_version_unrecoverable' };

    const accepted = [];
    for (const form of ['full', 'family']) {
      const fixture = fixtureClone(`marker-${form}`); let database = fixture.database;
      try {
        setRef(database, 'thread-patch', { ...marker, op: form === 'full' ? operation : 'thread.patch' });
        const starts = []; let stable = true, previous;
        for (let n = 0; n < 3; n++) {
          starts.push(attempt(() => openAndCoordinateDatabase(database, 'serve')));
          if (previous) stable = stable && equal(previous, snapshot(database));
          previous = snapshot(database);
          database.close(); database = new Database(fixture.path);
        }
        const canonical = readRef(database, 'thread-patch').op === operation;
        const beforeReplay = snapshot(database);
        const result = await withApp(database, child => send(child, 'PATCH', `/spaces/${space}/threads/${thread}`, patchBody, 'thread-patch'));
        accepted.push({ form, all_three_starts_succeed: starts.every(x => !x.rejected), canonical_full_operation: canonical,
          stable_after_first_start: stable, status: result.status, error: result.body.error?.code,
          replay_no_mutation: equal(beforeReplay, snapshot(database)) });
      } finally { database.close(); }
    }
    record('N02', 'Full target markers and legacy family markers survive three starts and replay safely', accepted,
      accepted.every(x => x.all_three_starts_succeed && x.canonical_full_operation && x.stable_after_first_start &&
        x.status === 422 && x.error === 'RESYNC_REQUIRED' && x.replay_no_mutation));

    const invalid = [];
    for (const [label, ref] of [
      ['wrong_target', { ...marker, op: 'thread.patch:thd_other' }],
      ['unknown_operation', { ...marker, op: 'unknown.op' }],
      ['unknown_reason', { ...marker, reason: 'unknown_reason' }],
      ['extra_body', { ...marker, body: 'synthetic forbidden content' }],
    ]) {
      const fixture = fixtureClone(label); let database = fixture.database;
      try {
        // Require a real schema upgrade so rollback is more than a pure validator check.
        database.exec('DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
        setRef(database, 'thread-patch', ref);
        const before = snapshot(database);
        const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        database.close(); database = new Database(fixture.path);
        invalid.push({ label, ...outcome, unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('N03', 'Invalid marker migration refuses atomically, including after closing and reopening', invalid,
      invalid.every(x => x.rejected && x.unchanged_after_reopen));

    const note = body => ({ kind: 'note', title: 'N note', summary: 'Synthetic review fixture', body });
    const post1 = data(await send(fixtureApp, 'POST', `/spaces/${space}/threads/${thread}/posts`, note('source'))).post.id;
    const post2 = data(await send(fixtureApp, 'POST', `/spaces/${space}/threads/${thread}/posts`, note('target'))).post.id;
    const relationBody = { source_ref: { post_id: post1, revision: 1 }, target_ref: { post_id: post2, revision: 1 }, type: 'challenges' };
    const relation = data(await send(fixtureApp, 'POST', `/spaces/${space}/relations`, relationBody, 'relation-create')).id;
    {
      const fixture = fixtureClone('relation-marker'); let database = fixture.database;
      try {
        setRef(database, 'relation-create', { v: 1, kind: 'relation.create', relation_id: relation });
        const starts = []; let stable = true, previous;
        for (let n = 0; n < 3; n++) {
          starts.push(attempt(() => openAndCoordinateDatabase(database, 'serve')));
          if (previous) stable = stable && equal(previous, snapshot(database));
          previous = snapshot(database);
          database.close(); database = new Database(fixture.path);
        }
        const ref = readRef(database, 'relation-create');
        const before = snapshot(database);
        const replay = await withApp(database, child => send(child, 'POST', `/spaces/${space}/relations`, relationBody, 'relation-create'));
        const obs = { all_three_starts_succeed: starts.every(x => !x.rejected), stable_after_first_start: stable,
          marker_kind: ref.kind, marker_op: ref.op, status: replay.status, error: replay.body.error?.code,
          replay_no_mutation: equal(before, snapshot(database)) };
        record('N04', 'Migrated relation.create unreplayable marker remains valid across three starts', obs,
          obs.all_three_starts_succeed && obs.stable_after_first_start && obs.marker_kind === 'unreplayable' &&
          obs.marker_op === 'relation.create' && obs.status === 422 && obs.error === 'RESYNC_REQUIRED' && obs.replay_no_mutation);
      } finally { database.close(); }
    }

    const otherSpace = data(await send(fixtureApp, 'POST', '/spaces', { slug: 'r9-other-space', objective: 'Other scope', rules: [] })).space.id;
    const spacePatch = { expected_revision: 1, objective: 'Revised objective' };
    const originalPatch = data(await send(fixtureApp, 'PATCH', `/spaces/${space}`, spacePatch, 'space-patch'));
    const goodPatch = await send(fixtureApp, 'PATCH', `/spaces/${space}`, spacePatch, 'space-patch');
    {
      const fixture = fixtureClone('cross-space'); let database = fixture.database;
      try {
        setRef(database, 'space-patch', { v: 1, kind: 'space', space_id: otherSpace, revision: 1 });
        const before = snapshot(database);
        const bad = await withApp(database, child => send(child, 'PATCH', `/spaces/${space}`, spacePatch, 'space-patch'));
        const upgrade = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        database.close(); database = new Database(fixture.path);
        const obs = { normal_status: goodPatch.status, normal_exact: equal(goodPatch.body.data, originalPatch),
          cross_space_status: bad.status, cross_space_error: bad.body.error?.code, migration_rejected: upgrade.rejected,
          no_mutation_after_reopen: equal(before, snapshot(database)) };
        record('N05', 'Instance-scoped create fix preserves space.patch binding to an actual existing space', obs,
          obs.normal_status === 200 && obs.normal_exact && obs.cross_space_status === 422 &&
          obs.cross_space_error === 'RESYNC_REQUIRED' && obs.migration_rejected && obs.no_mutation_after_reopen);
      } finally { database.close(); }
    }
  } finally { await fixtureApp.close(); fixtureSource.close(); }
  const output = { reviewed_date: '2026-09-29', runtime: process.version,
    fixture_note: 'Synthetic controlled response failure and marker fixtures; no TCP disconnect, old binary, model or real credentials. Snapshots include metadata and credentials but output exposes only comparison booleans.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally {
  await app.close(); if (db.open) db.close(); rmSync(dir, { recursive: true, force: true });
}
