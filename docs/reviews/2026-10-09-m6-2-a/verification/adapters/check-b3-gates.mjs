// Review-only: owned temporary file databases and synthetic data; no model/network calls.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase as currentCoordinate, classifyDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import { extractResultRef, validateResultRef } from '../../../../../packages/core/dist/index.js';

// M6.2-A: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const dir = mkdtempSync(join(tmpdir(), 'detuned-r8-review-'));
const db = new Database(join(dir, 'source.sqlite'));
const boot = bootstrapDatabase(db);
let instant = Date.parse('2026-09-29T04:00:00.000Z');
const clock = { now: () => new Date(instant), nowIso: () => new Date(instant).toISOString() };
const app = buildApp({ storage: new SqliteStorage(db), clock });
const probes = [];
let serial = 0;
const note = body => ({ kind: 'note', title: 'R8 note', summary: 'Synthetic fixture', body });
async function send(method, path, body, key = `r8-${++serial}`, targetApp = app) {
  const response = await targetApp.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(body === undefined ? {} : { payload: body }) });
  return { status: response.statusCode, body: response.json() };
}
function data(result) {
  if (result.status >= 400) throw new Error(`Fixture setup failed: ${result.status}, ${result.body.error?.code}`);
  return result.body.data;
}
function clone(name, logicalV1 = false) {
  const path = join(dir, `${name}.sqlite`); writeFileSync(path, db.serialize());
  const database = new Database(path);
  if (logicalV1) database.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
  return { database, path };
}
function snapshot(database) {
  const schema = database.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
  return { schema, rows: schema.filter(x => x.type === 'table').map(({ name }) => [name,
    database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(r => JSON.stringify(r)).sort()]) };
}
function counts(database) {
  return Object.fromEntries(['spaces', 'space_revisions', 'threads', 'posts', 'relations', 'events', 'idempotency_records'].map(t =>
    [t, database.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));
}
function setRef(database, key, value) {
  if (database.prepare('UPDATE idempotency_records SET result_ref=? WHERE key=?').run(JSON.stringify(value), key).changes !== 1)
    throw new Error(`Expected one record for ${key}`);
}
function attempt(action) {
  try { action(); return { rejected: false }; }
  catch (e) { return { rejected: true, code: e.code ?? null }; }
}
async function withApp(database, action) {
  const child = buildApp({ storage: new SqliteStorage(database), clock });
  try { await child.ready(); return await action(child); }
  finally { await child.close(); }
}
function record(id, description, expected, observed, passes) { probes.push({ id, description, expected, observed, passes }); }

try {
  await app.ready();
  const spaceBody = { slug: 'r8-space', objective: 'B.3 review', rules: [] };
  const originalSpace = data(await send('POST', '/spaces', spaceBody, 'create-space'));
  const space = originalSpace.space.id;
  const threadBody = { title: 'R8 thread' };
  const originalThread = data(await send('POST', `/spaces/${space}/threads`, threadBody, 'create-thread'));
  const thread = originalThread.thread.id;
  const initialBody = { title: 'R8 with initial', initial_post: note('own initial') };
  const initial = data(await send('POST', `/spaces/${space}/threads`, initialBody, 'with-initial'));
  const foreignPost = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, note('same space, other thread')));
  const targetPost = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, note('target')));
  const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: targetPost.post.id, revision: 1 }, type: 'challenges' }] };
  const nested = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
  if (nested.relations?.length !== 1) throw new Error('Nested fixture setup failed');
  const relation = nested.relations[0];
  const resolveBody = { expected_version: 1, reason_ref: { post_id: targetPost.post.id, revision: 1 } };
  const resolution = data(await send('POST', `/spaces/${space}/relations/${relation.id}/resolve`, resolveBody, 'resolve-relation'));

  // L01: no corruption or historical conversion, just a normal same-key retry.
  {
    const before = counts(db);
    const replay = await send('POST', '/spaces', spaceBody, 'create-space');
    const fixture = clone('normal-space-retry'); let database = fixture.database;
    let reopened;
    try {
      openAndCoordinateDatabase(database, 'serve'); database.close(); database = new Database(fixture.path);
      reopened = await withApp(database, child => send('POST', '/spaces', spaceBody, 'create-space', child));
    } finally { database.close(); }
    record('L01', 'Normal space.create retry uses instance scope and returns the original result',
      { status: 201, reopened_status: 201, same_result: true, no_extra_writes: true },
      { status: replay.status, error: replay.body.error?.code ?? null, reopened_status: reopened.status,
        same_result: isDeepStrictEqual(replay.body.data, originalSpace), no_extra_writes: isDeepStrictEqual(before, counts(db)) },
      replay.status === 201 && reopened.status === 201 && isDeepStrictEqual(replay.body.data, originalSpace) && isDeepStrictEqual(before, counts(db)));
  }

  // L02: the current codec accepts this legacy-style variant and creates a persistent marker.
  // This exact variant is not claimed to be output from a historical released binary.
  {
    instant += 60000;
    const patch2 = { expected_version: 1, title: 'R8 thread v2' };
    data(await send('PATCH', `/spaces/${space}/threads/${thread}`, patch2, 'patch2'));
    instant += 60000;
    data(await send('PATCH', `/spaces/${space}/threads/${thread}`, { expected_version: 2, title: 'R8 thread v3' }, 'patch3'));
    const fixture = clone('unrecoverable-patch', true); let database = fixture.database;
    try {
      setRef(database, 'patch2', { $ref: 'thread', thread_id: thread, thread_version: 2 });
      const before = snapshot(database);
      const first = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      const marker = JSON.parse(database.prepare("SELECT result_ref FROM idempotency_records WHERE key='patch2'").get().result_ref);
      const unchangedOnRefusal = isDeepStrictEqual(before, snapshot(database));
      database.close(); database = new Database(fixture.path);
      const second = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      record('L02', 'An accepted migration must not write a marker rejected by the next startup',
        'consistent atomic refusal, or successful migration followed by successful restart with a valid marker',
        { first_rejected: first.rejected, marker_kind: marker.kind ?? null, marker_op_includes_target: marker.op?.includes(':') ?? false,
          second_rejected: second.rejected, second_error: second.code, unchanged_if_first_refused: unchangedOnRefusal },
        first.rejected ? unchangedOnRefusal : !second.rejected);
    } finally { database.close(); }
  }

  // L03: required uniqueness is removed without changing any table/column names.
  {
    const fixture = clone('lost-primary-key'); const database = fixture.database;
    try {
      database.exec('CREATE TABLE r8_idem_copy AS SELECT * FROM idempotency_records; DROP TABLE idempotency_records; ALTER TABLE r8_idem_copy RENAME TO idempotency_records');
      const before = snapshot(database);
      const classification = classifyDatabase(database).kind;
      const outcome = attempt(() => openAndCoordinateDatabase(database, 'init'));
      const unchanged = isDeepStrictEqual(before, snapshot(database));
      const duplicate = attempt(() => database.exec('INSERT INTO idempotency_records SELECT * FROM idempotency_records LIMIT 1'));
      record('L03', 'Current schema lacking the idempotency primary key is rejected before mutation',
        { rejected: true, unchanged: true },
        { classification, rejected: outcome.rejected, unchanged, duplicate_key_insert_accepted: !duplicate.rejected },
        outcome.rejected && unchanged);
    } finally { database.close(); }
  }

  // L04: recognized historical post refs kept only relation IDs, not the operation version.
  {
    const fixture = clone('old-nested-relations'); let database = fixture.database;
    try {
      setRef(database, 'nested-post', { $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id] });
      const upgrade = attempt(() => openAndCoordinateDatabase(database, 'init'));
      database.close(); database = new Database(fixture.path);
      const replay = upgrade.rejected ? null : await withApp(database, child => send('POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post', child));
      record('L04', 'Old nested relation results are recovered accurately or explicitly refused',
        'original v1/open, or explicit non-success; never current v2/resolved as original',
        { upgrade_rejected: upgrade.rejected, original_version: relation.version, original_state: relation.state,
          replay_status: replay?.status ?? null, replay_version: replay?.body.data?.relations?.[0]?.version ?? null,
          replay_state: replay?.body.data?.relations?.[0]?.state ?? null },
        upgrade.rejected || (replay.status >= 400 && Boolean(replay.body.error?.code)) ||
          (replay.status === 201 && replay.body.data.relations[0].version === relation.version && replay.body.data.relations[0].state === relation.state));
    } finally { database.close(); }
  }

  // L05: title and state match, but another immutable historical field conflicts.
  {
    const fixture = clone('history-time-conflict'); const database = fixture.database;
    try {
      database.prepare("UPDATE thread_versions SET created_at='1999-01-01T00:00:00.000Z' WHERE thread_id=? AND version=1").run(thread);
      setRef(database, 'create-thread', originalThread);
      const before = snapshot(database);
      const upgrade = attempt(() => openAndCoordinateDatabase(database, 'init'));
      const replay = upgrade.rejected ? null : await withApp(database, child => send('POST', `/spaces/${space}/threads`, threadBody, 'create-thread', child));
      record('L05', 'Historical conflicts include operation timestamps, not only title and state',
        { rejected: true, unchanged: true },
        { rejected: upgrade.rejected, unchanged: isDeepStrictEqual(before, snapshot(database)), original_updated_at: originalThread.thread.updated_at,
          replay_status: replay?.status ?? null, replay_updated_at: replay?.body.data?.thread?.updated_at ?? null },
        upgrade.rejected && isDeepStrictEqual(before, snapshot(database)));
    } finally { database.close(); }
  }

  // L06: same-space entity mismatches are integrity failures too.
  {
    const observations = [];
    for (const kind of ['initial_post_wrong_thread', 'resolution_version_mismatch']) {
      const fixture = clone(kind); const database = fixture.database;
      try {
        if (kind === 'initial_post_wrong_thread') {
          setRef(database, 'with-initial', { v: 1, kind: 'thread.create', thread_id: initial.thread.id, thread_version: 1,
            initial_post_id: foreignPost.post.id, initial_post_revision: 1 });
        } else {
          setRef(database, 'resolve-relation', { v: 1, kind: 'relation.resolve', relation_id: relation.id,
            relation_version: 99, relation_state: 'resolved', resolution_id: resolution.resolution.id });
        }
        const upgrade = attempt(() => openAndCoordinateDatabase(database, 'init'));
        const replay = await withApp(database, child => kind === 'initial_post_wrong_thread'
          ? send('POST', `/spaces/${space}/threads`, initialBody, 'with-initial', child)
          : send('POST', `/spaces/${space}/relations/${relation.id}/resolve`, resolveBody, 'resolve-relation', child));
        const mismatched = kind === 'initial_post_wrong_thread'
          ? replay.body.data?.initial_post?.post?.thread_id !== replay.body.data?.thread?.id
          : replay.body.data?.relation?.version !== replay.body.data?.resolution?.version;
        observations.push({ kind, migration_rejected: upgrade.rejected, status: replay.status,
          mismatched_result_returned: replay.status < 400 && mismatched });
      } finally { database.close(); }
    }
    record('L06', 'Migration and replay reject same-space initial-post and resolution/version mismatches',
      'migration rejects; replay is non-success and never returns a mismatched result', observations,
      observations.every(x => x.migration_rejected && x.status >= 400 && !x.mismatched_result_returned));
  }

  // L07: encoding and early migration exits must use the same validation as replay.
  {
    let badEncoded;
    const encoded = attempt(() => { badEncoded = JSON.parse(extractResultRef('thread.create', { thread: { ...originalThread.thread, version: 0 } })); });
    const fixture = clone('unknown-operation-compact-relation'); const database = fixture.database;
    let migrated;
    try {
      database.prepare("UPDATE idempotency_records SET operation='unknown.operation', result_ref=? WHERE key='resolve-relation'")
        .run(JSON.stringify({ v: 1, kind: 'relation.create', relation_id: relation.id }));
      const before = snapshot(database);
      const upgrade = attempt(() => openAndCoordinateDatabase(database, 'init'));
      migrated = { rejected: upgrade.rejected, unchanged: isDeepStrictEqual(before, snapshot(database)) };
    } finally { database.close(); }
    const unpaired = attempt(() => validateResultRef('thread.create', { v: 1, kind: 'thread.create', thread_id: thread, thread_version: 1, initial_post_revision: 1 }));
    record('L07', 'Encoder, partial legacy conversion and paired fields have no validation bypass',
      'invalid encoder result and unpaired fields rejected; unknown operation aborts migration atomically',
      { encoder_rejected: encoded.rejected, encoded_version: badEncoded?.thread_version ?? null,
        unpaired_fields_rejected: unpaired.rejected, migration: migrated },
      encoded.rejected && unpaired.rejected && migrated.rejected && migrated.unchanged);
  }

  // L08 positive: ordinary new thread retry, plus accurate full legacy create with two restarts.
  {
    const ordinary = await send('POST', `/spaces/${space}/threads`, threadBody, 'create-thread');
    const fixture = clone('supported-full-thread-result', true); let database = fixture.database;
    try {
      setRef(database, 'create-thread', originalThread);
      openAndCoordinateDatabase(database, 'serve'); database.close(); database = new Database(fixture.path);
      openAndCoordinateDatabase(database, 'serve');
      const replay = await withApp(database, child => send('POST', `/spaces/${space}/threads`, threadBody, 'create-thread', child));
      const observed = { normal_status: ordinary.status, normal_exact: isDeepStrictEqual(ordinary.body.data, originalThread),
        full_legacy_status: replay.status, full_legacy_exact: isDeepStrictEqual(replay.body.data, originalThread) };
      record('L08', 'Normal thread retries and recoverable full legacy results remain supported',
        { normal_status: 201, full_legacy_status: 201, both_exact: true }, observed,
        ordinary.status === 201 && replay.status === 201 && observed.normal_exact && observed.full_legacy_exact);
    } finally { database.close(); }
  }

  const output = { reviewed_date: '2026-09-29', runtime: process.version,
    fixture_note: 'L01 uses ordinary HTTP requests. L02 uses a legacy-style variant accepted by the current codec, not a proven historical emitted shape. L04 uses an actual historical Post ref shape. L03/L05/L06/L07 intentionally corrupt owned test data. L08 is a supported positive control. No old binary or model was run.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally {
  await app.close(); db.close(); rmSync(dir, { recursive: true, force: true });
}
