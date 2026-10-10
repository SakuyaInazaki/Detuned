// Review-only probes for the already specified R4-B invariants. No product changes.
// All mutations use owned temporary databases. No model calls or network listeners.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase as currentCoordinate, classifyDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import { validateResultRef } from '../../../../../packages/core/dist/index.js';

// M6.1-B: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-r6-'));
const db = new Database(join(directory, 'source.sqlite'));
const boot = bootstrapDatabase(db);
let instant = Date.parse('2026-09-28T01:00:00.000Z');
const clock = { now: () => new Date(instant), nowIso: () => new Date(instant).toISOString() };
const app = buildApp({ storage: new SqliteStorage(db), clock });
const probes = [];
let serial = 0;
const note = body => ({ kind: 'note', title: 'R6 synthetic note', summary: 'Review fixture', body });
const record = (id, description, expected, observed, passes) => probes.push({ id, description, expected, observed, passes });
async function send(method, path, payload, key = `r6-${++serial}`, targetApp = app) {
  const res = await targetApp.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(payload === undefined ? {} : { payload }) });
  return { status: res.statusCode, body: res.json() };
}
function data(res) {
  if (res.status >= 400) throw new Error(`Fixture setup failed: ${res.status} ${res.body.error?.code}`);
  return res.body.data;
}
function clone(name, logicalV1 = false) {
  const path = join(directory, `${name}.sqlite`);
  writeFileSync(path, db.serialize());
  const database = new Database(path);
  if (logicalV1) database.exec('DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
  return { database, path };
}
function snapshot(database) {
  const schema = database.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all();
  return { schema, rows: schema.filter(r => r.type === 'table').map(({ name }) => [name,
    database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(r => JSON.stringify(r)).sort()]) };
}
function setRef(database, key, value) {
  const changed = database.prepare('UPDATE idempotency_records SET result_ref=? WHERE key=?').run(JSON.stringify(value), key).changes;
  if (changed !== 1) throw new Error(`Fixture expected exactly one reference for ${key}`);
}
async function inApp(database, action) {
  const child = buildApp({ storage: new SqliteStorage(database), clock });
  try { await child.ready(); return await action(child); }
  finally { await child.close(); }
}
function rejectUpgrade(database, mode = 'init') {
  try { openAndCoordinateDatabase(database, mode); return false; }
  catch { return true; }
}

try {
  await app.ready();
  const space = data(await send('POST', '/spaces', { slug: 'r6-space', objective: 'R4-B.1 review', rules: [] })).space.id;
  const threadBody = { title: 'R6 original title' };
  const originalThread = data(await send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread'));
  const thread = originalThread.thread.id;
  const post = (body, key) => send('POST', `/spaces/${space}/threads/${thread}/posts`, note(body), key).then(data);
  const source = await post('source', 'source-post');
  const target = await post('target');
  const relationBody = { source_ref: { post_id: source.post.id, revision: 1 }, target_ref: { post_id: target.post.id, revision: 1 }, type: 'challenges' };
  const originalRelation = data(await send('POST', `/spaces/${space}/relations`, relationBody, 'original-relation'));
  data(await send('POST', `/spaces/${space}/relations/${originalRelation.id}/resolve`, { expected_version: 1, reason_ref: { post_id: source.post.id, revision: 1 } }));

  // H01: the prior R4-B encoding plus a legacy $ref codec shape defined in c4f041f.
  // c4f041f's native relation.create returned a direct entity; do not claim this
  // second variant is an actual old-binary relation.create output.
  {
    const observations = [];
    for (const [name, ref] of [
      ['previous_v1', { v: 1, kind: 'relation.create', relation_id: originalRelation.id }],
      ['legacy_dollar_ref', { $ref: 'relation', relation_id: originalRelation.id }],
    ]) {
      const fixture = clone(`relation-${name}`);
      let database = fixture.database;
      try {
        setRef(database, 'original-relation', ref);
        const rejected = rejectUpgrade(database);
        database.close(); database = new Database(fixture.path);
        const response = rejected ? null : await inApp(database, child => send('POST', `/spaces/${space}/relations`, relationBody, 'original-relation', child));
        const preserved = isDeepStrictEqual(response?.body.data, originalRelation);
        observations.push({ format: name, upgrade_rejected: rejected, status: response?.status ?? null,
          version: response?.body.data?.version ?? null, state: response?.body.data?.state ?? null,
          safe: rejected || (response.status >= 400 && Boolean(response.body.error?.code)) || (response.status === 201 && preserved) });
      } finally { database.close(); }
    }
    record('H01', 'Upgrading known old relation.create references never substitutes the current state',
      'recover exactly the original result, or explicitly refuse when evidence is insufficient', observations, observations.every(r => r.safe));
  }

  // H02: ordinary valid HTTP operations, with a controlled clock; no stored-reference corruption.
  {
    instant += 60000;
    data(await send('PATCH', `/spaces/${space}/threads/${thread}`, { expected_version: 1, title: 'R6 later title' }));
    const replay = await send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread');
    const referencedBody = { ...note('post with a challenge'), refs: [{ target_ref: { post_id: target.post.id, revision: 1 }, type: 'challenges' }] };
    const original = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, referencedBody, 'nested-relation'));
    const nestedRel = original.relations[0];
    data(await send('POST', `/spaces/${space}/relations/${nestedRel.id}/resolve`, { expected_version: 1, reason_ref: { post_id: source.post.id, revision: 1 } }));
    const repeated = await send('POST', `/spaces/${space}/threads/${thread}/posts`, referencedBody, 'nested-relation');
    record('H02', 'Fresh thread times and nested relation versions remain tied to the original operation',
      { thread_updated_at: originalThread.thread.updated_at, nested_relation_version: nestedRel.version, nested_relation_state: nestedRel.state },
      { thread_status: replay.status, thread_version: replay.body.data?.thread?.version, thread_updated_at: replay.body.data?.thread?.updated_at,
        post_status: repeated.status, nested_relation_version: repeated.body.data?.relations?.[0]?.version, nested_relation_state: repeated.body.data?.relations?.[0]?.state },
      replay.status === 201 && replay.body.data.thread.updated_at === originalThread.thread.updated_at && repeated.status === 201 && isDeepStrictEqual(repeated.body.data.relations, original.relations));
  }

  // H03: loss of metadata in an already current v2 instance is not a legacy upgrade.
  {
    const fixture = clone('lost-current-metadata');
    let database = fixture.database;
    try {
      const secret = database.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get().value;
      database.exec('DROP TABLE instance_metadata');
      const before = snapshot(database);
      const classification = classifyDatabase(database).kind;
      const rejected = rejectUpgrade(database, 'serve');
      database.close(); database = new Database(fixture.path);
      const hasMetadata = Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get());
      const secretChanged = hasMetadata && database.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get()?.value !== secret;
      const unchanged = isDeepStrictEqual(before, snapshot(database));
      record('H03', 'A current instance with lost metadata is refused without generating a replacement secret',
        { rejected: true, logical_state_unchanged: true, secret_replaced: false },
        { classification, rejected, logical_state_unchanged: unchanged, secret_replaced: secretChanged }, rejected && unchanged && !secretChanged);
    } finally { database.close(); }
  }

  // H04: table names and max(version) alone cannot certify the current schema.
  {
    const observations = [];
    for (const [name, mutation] of [
      ['missing_post_revisions', 'DROP TABLE post_revisions'],
      ['version_gap_2_without_1', 'DELETE FROM schema_migrations WHERE version=1'],
    ]) {
      const fixture = clone(name);
      let database = fixture.database;
      try {
        database.exec(mutation);
        const before = snapshot(database);
        const classification = classifyDatabase(database).kind;
        const rejected = rejectUpgrade(database);
        database.close(); database = new Database(fixture.path);
        observations.push({ name, classification, rejected, logical_state_unchanged: isDeepStrictEqual(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('H04', 'Missing required schema or contradictory migration markers fail before mutation',
      'both fixtures rejected with unchanged logical state', observations, observations.every(r => r.rejected && r.logical_state_unchanged));
  }

  // H05: migrate-then-commit must validate the output, operation binding and version guard.
  {
    const observations = [];
    for (const [name, key, ref] of [
      ['future_ref_disguised_as_legacy', 'source-post', { v: 99, $ref: 'post', post_id: source.post.id, revision: 1 }],
      ['post_result_in_thread_operation', 'original-thread', source],
    ]) {
      const fixture = clone(name, true);
      let database = fixture.database;
      try {
        setRef(database, key, ref);
        const before = snapshot(database);
        const rejected = rejectUpgrade(database);
        database.close(); database = new Database(fixture.path);
        const row = database.prepare('SELECT operation,result_ref FROM idempotency_records WHERE key=?').get(key);
        const after = JSON.parse(row.result_ref);
        let valid = true; try { validateResultRef(row.operation, after); } catch { valid = false; }
        observations.push({ name, rejected, logical_state_unchanged: isDeepStrictEqual(before, snapshot(database)), schema_version: database.prepare('SELECT max(version) AS v FROM schema_migrations').get().v,
          result_version: after.v ?? null, result_kind: after.kind ?? null, output_passes_current_validator: valid });
      } finally { database.close(); }
    }
    record('H05', 'Unsupported references and incompatible legacy results abort the complete upgrade',
      'both rejected without committing transformed data', observations, observations.every(r => r.rejected && r.logical_state_unchanged));
  }

  // H06: the runtime boundary must cover optional fields, unknown operations, and content copies.
  {
    const base = { v: 1, kind: 'thread.create', thread_id: thread, thread_version: 1 };
    const observations = [];
    for (const [name, operation, ref] of [
      ['unknown_operation', 'unknown.operation', base],
      ['similar_but_unregistered_operation', 'thread.patch_unregistered', { v: 1, kind: 'thread.patch', thread_id: thread, thread_version: 1 }],
      ['negative_initial_revision', 'thread.create', { ...base, initial_post_id: source.post.id, initial_post_revision: -1 }],
      ['non_array_relation_ids', 'thread.create', { ...base, relation_ids: 'not-an-array' }],
      ['nested_cached_body', 'thread.create', { ...base, extra: { body: 'R6_SYNTHETIC_CACHED_BODY' } }],
    ]) {
      let rejected = false; try { validateResultRef(operation, ref); } catch { rejected = true; }
      observations.push({ name, rejected });
    }
    record('H06', 'Reference validation rejects unregistered operations, invalid optional fields and extra cached content',
      'all invalid references rejected', observations, observations.every(r => r.rejected));
  }

  // H07: corruption fixtures demonstrate missing target/completeness checks, not an HTTP DB-write exploit.
  {
    const second = data(await send('POST', `/spaces/${space}/threads`, { title: 'R6 second thread' })).thread;
    const patchBody = { expected_version: 1, title: 'R6 second changed' };
    data(await send('PATCH', `/spaces/${space}/threads/${second.id}`, patchBody, 'patch-target'));
    const fixture = clone('reference-targets');
    const database = fixture.database;
    try {
      setRef(database, 'patch-target', { v: 1, kind: 'thread.patch', thread_id: thread, thread_version: 1 });
      setRef(database, 'source-post', { v: 1, kind: 'post', post_id: source.post.id, revision: 1, relation_ids: ['rel_r6_missing'] });
      const observed = await inApp(database, async child => {
        const wrongTarget = await send('PATCH', `/spaces/${space}/threads/${second.id}`, patchBody, 'patch-target', child);
        const missingRelation = await send('POST', `/spaces/${space}/threads/${thread}/posts`, note('source'), 'source-post', child);
        return { wrong_target_status: wrongTarget.status, returned_wrong_thread: wrongTarget.body.data?.id === thread,
          missing_relation_status: missingRelation.status, returned_relations: missingRelation.body.data?.relations?.length ?? null };
      });
      record('H07', 'Replay checks the operation target and does not silently drop missing associated records',
        'structured non-success for both corrupted references', observed,
        observed.wrong_target_status >= 400 && observed.wrong_target_status < 500 && observed.missing_relation_status >= 400 && observed.missing_relation_status < 500);
    } finally { database.close(); }
  }

  // H08: two contradictory immutable snapshots cannot be silently resolved by first row wins.
  {
    const fixture = clone('conflicting-history');
    let database = fixture.database;
    try {
      database.prepare('UPDATE thread_versions SET title=? WHERE thread_id=? AND version=1').run('R6 contradictory history', thread);
      setRef(database, 'original-thread', originalThread);
      const before = snapshot(database);
      const rejected = rejectUpgrade(database);
      database.close(); database = new Database(fixture.path);
      const response = rejected ? null : await inApp(database, child => send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread', child));
      const unchanged = isDeepStrictEqual(before, snapshot(database));
      record('H08', 'Conflicting history for the same immutable key rejects migration instead of discarding the old evidence',
        { rejected: true, logical_state_unchanged: true },
        { rejected, logical_state_unchanged: unchanged, replay_status: response?.status ?? null, replay_title: response?.body.data?.thread?.title ?? null }, rejected && unchanged);
    } finally { database.close(); }
  }

  // H09: real CLI diagnostics, with synthetic marker only. Never print cached raw records here.
  {
    const childDir = join(directory, 'cli-diagnostic'); mkdirSync(childDir);
    const path = join(childDir, 'detuned.sqlite'); writeFileSync(path, db.serialize());
    const database = new Database(path);
    const marker = 'R6_SYNTHETIC_PRIVATE_BODY_DO_NOT_LOG';
    try { setRef(database, 'original-thread', { legacy_unknown: true, body: marker }); }
    finally { database.close(); }
    const observations = [];
    for (const json of [true, false]) {
      const child = spawnSync(process.execPath, [join(root, 'packages/cli/dist/index.js'), ...(json ? ['--json'] : []), 'init', '--data-dir', childDir],
        { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
      observations.push({ format: json ? 'json' : 'text', exit: child.status, timed_out: child.error?.code === 'ETIMEDOUT',
        raw_body_in_stdout: child.stdout.includes(marker), raw_body_in_stderr: child.stderr.includes(marker), lock_left: existsSync(join(childDir, 'detuned.lock')) });
    }
    record('H09', 'Migration diagnostics identify the record without copying old body content to CLI output',
      'nonzero exit, no body marker in stdout/stderr, no remaining lock', observations,
      observations.every(r => r.exit !== null && r.exit !== 0 && !r.timed_out && !r.raw_body_in_stdout && !r.raw_body_in_stderr && !r.lock_left));
  }

  // H10: positive checks for two original B06 fault stages, independently observed this turn.
  {
    const observations = [];
    for (const stage of ['version', 'metadata']) {
      const fixture = clone(`fault-${stage}`, true);
      let database = fixture.database;
      try {
        const before = snapshot(database);
        let hits = 0;
        database.function('r6_fault_hit', () => { hits++; return 1; });
        const table = stage === 'version' ? 'schema_migrations' : 'instance_metadata';
        const condition = stage === 'version' ? 'NEW.version = 2' : "NEW.key = 'initialized'";
        database.exec(`CREATE TEMP TRIGGER r6_fail BEFORE INSERT ON ${table} WHEN ${condition}
          BEGIN SELECT r6_fault_hit(); SELECT RAISE(ABORT, 'R6 controlled migration fault'); END;`);
        const rejected = rejectUpgrade(database);
        database.close(); database = new Database(fixture.path);
        observations.push({ stage, fault_hits: hits, rejected, logical_state_unchanged: isDeepStrictEqual(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('H10', 'Version-marker and metadata SQL failures both roll back the whole upgrade after reopen',
      'both triggers hit, upgrade rejected, full logical snapshot unchanged', observations,
      observations.every(r => r.fault_hits === 1 && r.rejected && r.logical_state_unchanged));
  }
} finally {
  await app.close(); db.close(); rmSync(directory, { recursive: true, force: true });
}

console.log(JSON.stringify({ reviewed_date: '2026-09-28', runtime: process.version,
  fixture_note: 'H01 uses exact old reference shapes with current file DB fixtures; H02 is ordinary HTTP with a controlled clock. H03-H09 include deliberate integrity/corruption fixtures. H10 injects native SQLite failures. No old binary, external service, real model, or real user database was used.',
  probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length }, null, 2));
process.exitCode = probes.every(p => p.passes) ? 0 : 1;
