// Review-only: deterministic HTTP fixtures and owned temporary SQLite files.
// Checks the already specified initial_post and explicit-invalid legacy input branches.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual as equal } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase as currentCoordinate } from '../../../../../packages/storage-sqlite/dist/index.js';
import { extractResultRef, IdempotencyService, CryptoHasher } from '../../../../../packages/core/dist/index.js';

// M6.2-A: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const dir = mkdtempSync(join(tmpdir(), 'detuned-r13-review-'));
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
  if (logicalV1) database.exec('DROP TABLE review_decisions; DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
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
function diffPaths(expected, actual, path = 'data') {
  if (equal(expected, actual)) return [];
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object' && !Array.isArray(expected) && !Array.isArray(actual)) {
    return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].flatMap(key => diffPaths(expected[key], actual[key], `${path}.${key}`));
  }
  return [path];
}


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


  const initialBody = { title: 'R13 initial post thread', initial_post: note('initial post') };
  const initial = data(await send(app, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread'));
  const immediateInitialRetry = await send(app, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread');
  const immediateDifference = diffPaths(initial, immediateInitialRetry.body.data);

  const initialRelation = data(await send(app, 'POST', `/spaces/${space}/relations`, {
    source_ref: { post_id: initial.initial_post.post.id, revision: 1 },
    target_ref: { post_id: target, revision: 1 }, type: 'challenges'
  }, 'initial-relation'));

  async function inspectBad(variant, key, ref, body, path) {
    const fixture = clone(variant); let database = fixture.database;
    try {
      setRef(database, key, ref);
      const before = snapshot(database);
      const online = await withApp(database, child => send(child, 'POST', path, body, key));
      const onlineReadOnly = equal(before, snapshot(database));
      const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      const normalized = readRef(database, key);
      database.close(); database = new Database(fixture.path);
      return { variant, online_status: online.status, online_error: online.body.error?.code ?? null,
        online_initial_post_present: !!online.body.data?.initial_post,
        online_initial_revision: online.body.data?.initial_post?.revision?.revision ?? null,
        online_read_only: onlineReadOnly, migration_rejected: outcome.rejected,
        resulting_kind: normalized.kind ?? null, unchanged_after_reopen: equal(before, snapshot(database)) };
    } finally { database.close(); }
  }

  // W01: Unlike the standalone Post branch, initial_post still loses provided bad values.
  {
    const cases = [
      ['initial_revision_string', { ...initial, initial_post: { ...initial.initial_post, revision: 'invalid-revision' } }],
      ['initial_post_null', { ...initial, initial_post: null }],
      ['initial_post_empty_object', { ...initial, initial_post: {} }],
      ['orphan_initial_revision_and_relations', { $ref: 'thread', thread_id: initial.thread.id, thread_version: 1,
        initial_post_revision: 1, relation_ids: [initialRelation.id] }],
    ];
    const observations = [];
    for (const [name, ref] of cases) observations.push(await inspectBad(name, 'initial-thread', ref, initialBody, `/spaces/${space}/threads`));
    record('W01', 'Legacy initial_post malformed envelopes, explicit revisions and orphan pairs must not disappear or default to v1', observations,
      observations.every(x => x.online_status === 422 && x.online_read_only && x.migration_rejected && x.unchanged_after_reopen));
  }

  // W02: Null is explicitly present in JSON; ?? must not erase it before validation.
  {
    const cases = [
      ['initial_relations_null', 'initial-thread', { ...initial, initial_post: { ...initial.initial_post, relations: null } }, initialBody, `/spaces/${space}/threads`],
      ['initial_relation_ids_null', 'initial-thread', { ...initial, initial_post: { ...initial.initial_post, relation_ids: null } }, initialBody, `/spaces/${space}/threads`],
      ['post_relation_state_null', 'nested-post', { ...nested, relations: [{ ...nested.relations[0], state: null }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
      ['post_relation_version_null', 'nested-post', { ...nested, relations: [{ ...nested.relations[0], version: null }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
    ];
    const observations = [];
    for (const args of cases) observations.push(await inspectBad(...args));
    record('W02', 'Explicit null legacy fields must fail before alias/default selection or missing-history markers', observations,
      observations.every(x => x.online_status === 422 && x.online_read_only && x.migration_rejected && x.unchanged_after_reopen));
  }

  // W03: Full valid envelopes, legitimate omission, and valid initial ID-only remain supported.
  {
    const fixture = clone('valid-legacy-controls'); let database = fixture.database;
    const observations = {};
    try {
      setRef(database, 'initial-thread', initial);
      setRef(database, 'thread-create', originalThread);
      setRef(database, 'nested-post', nested);
      const beforeOnline = snapshot(database);
      await withApp(database, async child => {
        const replay = await send(child, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread');
        observations.online_complete_initial_exact = replay.status === 201 && equal(replay.body.data, initial);
        observations.online_initial_diff_paths = diffPaths(initial, replay.body.data);
      });
      observations.online_read_only = equal(beforeOnline, snapshot(database));
      openAndCoordinateDatabase(database, 'serve');
      database.close(); database = new Database(fixture.path);
      openAndCoordinateDatabase(database, 'serve');
      const before = snapshot(database);
      await withApp(database, async child => {
        const a = await send(child, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread');
        const b = await send(child, 'POST', `/spaces/${space}/threads`, threadBody, 'thread-create');
        const c = await send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post');
        observations.migrated_complete_initial_exact = a.status === 201 && equal(a.body.data, initial);
        observations.migrated_initial_diff_paths = diffPaths(initial, a.body.data);
        observations.legal_no_initial_exact = b.status === 201 && equal(b.body.data, originalThread);
        observations.complete_post_exact = c.status === 201 && equal(c.body.data, nested);
      });
      observations.no_replay_writes = equal(before, snapshot(database));
    } finally { database.close(); }
    const idOnly = clone('valid-initial-id-only'); database = idOnly.database;
    try {
      setRef(database, 'initial-thread', { $ref: 'thread', thread_id: initial.thread.id, thread_version: 1,
        initial_post_id: initial.initial_post.post.id, initial_post_revision: 1, relation_ids: [initialRelation.id] });
      openAndCoordinateDatabase(database, 'serve');
      database.close(); database = new Database(idOnly.path);
      openAndCoordinateDatabase(database, 'serve');
      const before = snapshot(database);
      const replay = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread'));
      observations.valid_initial_id_only_controlled = replay.status === 422 && replay.body.error?.code === 'RESYNC_REQUIRED' && readRef(database, 'initial-thread').kind === 'unreplayable';
      observations.id_only_read_only = equal(before, snapshot(database));
    } finally { database.close(); }
    observations.fresh_retry_status = immediateInitialRetry.status;
    observations.fresh_retry_diff_paths = immediateDifference;
    observations.first_initial_fields = Object.keys(initial.initial_post).sort();
    observations.retry_initial_fields = Object.keys(immediateInitialRetry.body.data.initial_post).sort();
    record('W03', 'Legal paired controls preserve full initial result, omission, historical post and ID-only handling', observations,
      observations.online_complete_initial_exact && observations.migrated_complete_initial_exact && observations.legal_no_initial_exact && observations.complete_post_exact && observations.no_replay_writes && observations.valid_initial_id_only_controlled && observations.id_only_read_only && immediateInitialRetry.status === 201 && immediateDifference.length === 0);
  }
  const output = { reviewed_date: '2026-09-30', runtime: process.version,
    fixture_note: 'Synthetic stored-result corruption in owned temporary SQLite databases; HTTP-generated valid fixtures and fixed clock. No product edits, real data or model calls.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }); }
