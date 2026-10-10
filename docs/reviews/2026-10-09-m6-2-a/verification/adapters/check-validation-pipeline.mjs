// Review-only: deterministic HTTP fixtures and owned temporary SQLite files.
// Extends the already required raw-input and historical-time boundaries; no external attacker is implied.
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
const dir = mkdtempSync(join(tmpdir(), 'detuned-r11-review-'));
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
  if (logicalV1) database.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
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

  // Q01: All known fields/bindings must be checked BEFORE loss of evidence into a marker.
  {
    const cases = [
      ['missing_required_revision', 'nested-post', { v: 1, kind: 'post', post_id: nested.post.id, relation_ids: [relation.id] }],
      ['wrong_post_thread_with_id_only_relations', 'nested-post', { v: 1, kind: 'post', post_id: foreignPost.post.id, revision: 1, relation_ids: [relation.id] }],
      ['compact_relation_missing_entity', 'relation-reuse', { v: 1, kind: 'relation.create', relation_id: 'rel_r11_nonexistent' }],
      ['relations_without_initial_post', 'thread-create', { v: 1, kind: 'thread.create', thread_id: thread, thread_version: 1, relation_ids: [relation.id] }],
    ];
    const observations = [];
    for (const [variant, key, ref] of cases) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        setRef(database, key, ref);
        const before = snapshot(database);
        const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        const resultingKind = readRef(database, key).kind;
        database.close(); database = new Database(fixture.path);
        observations.push({ variant, rejected: outcome.rejected, resulting_kind: resultingKind, unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('Q01', 'Incomplete prevalidation still converts damaged typed refs into accepted markers', observations,
      observations.every(x => x.rejected && x.unchanged_after_reopen));
  }

  // Q02: Legacy results may contain body, but illegal supplied versions/states are not missing history.
  {
    const observations = [];
    for (const [variant, ref] of [
      ['legacy_invalid_nested_state', { ...nested, relations: [{ ...relation, state: 'not-a-state' }] }],
      ['legacy_invalid_supplied_revision', { ...nested, revision: 'not-a-revision' }],
    ]) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        setRef(database, 'nested-post', ref);
        const before = snapshot(database);
        const online = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
        const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
        const normalized = readRef(database, 'nested-post');
        database.close(); database = new Database(fixture.path);
        observations.push({ variant, online_status: online.status, online_version: online.body.data?.revision?.revision ?? null,
          online_nested_state: online.body.data?.relations?.[0]?.state ?? null, migration_rejected: outcome.rejected,
          normalized_revision: normalized.revision ?? null, normalized_state: normalized.relations?.[0]?.state ?? null,
          unchanged_after_reopen: equal(before, snapshot(database)) });
      } finally { database.close(); }
    }
    record('Q02', 'Legacy normalizers must reject malformed supplied values before defaulting or coercing them', observations,
      observations.every(x => x.online_status === 422 && x.migration_rejected && x.unchanged_after_reopen));
  }

  // Q03: created_at is the thread's birth time, not the time of a later patch.
  {
    const fixture = clone('patch-missing-update-time', true); let database = fixture.database;
    try {
      setRef(database, 'thread-create', originalThread);
      const missingUpdated = { ...patch2 }; delete missingUpdated.updated_at;
      setRef(database, 'patch2', missingUpdated);
      const before = snapshot(database);
      const outcome = attempt(() => openAndCoordinateDatabase(database, 'serve'));
      const storedTime = outcome.rejected ? null : database.prepare('SELECT created_at FROM thread_versions WHERE thread_id=? AND version=2').get(thread)?.created_at ?? null;
      database.close(); database = new Database(fixture.path);
      const replay = outcome.rejected ? null : await withApp(database, child => send(child, 'PATCH', `/spaces/${space}/threads/${thread}`, patch2Body, 'patch2'));
      const obs = { migration_rejected: outcome.rejected, unchanged_if_refused: equal(before, snapshot(database)),
        thread_created_at: patch2.created_at, real_patch_updated_at: patch2.updated_at,
        persisted_version_time: storedTime, replay_status: replay?.status ?? null, replay_updated_at: replay?.body.data?.updated_at ?? null };
      record('Q03', 'Missing historical patch updated_at may be refused, but cannot borrow thread created_at', obs,
        outcome.rejected ? obs.unchanged_if_refused : replay.status === 422 || (replay.status === 200 && replay.body.data.updated_at === patch2.updated_at));
    } finally { database.close(); }
  }

  // Fault injection at the real action -> result boundary, with real SQL business/event writes.
  async function freshActionProbe(name, mode) {
    const fixture = clone(name); let database = fixture.database;
    try {
      const storage = new SqliteStorage(database);
      const idempotency = new IdempotencyService(storage, new CryptoHasher(), clock);
      const post = { ...nested.post, id: `pst_r11_${name}`, current_revision: 1 };
      const revision = { ...nested.revision, post_id: post.id, revision: 1 };
      const relations = mode === 'bad_array' ? 'not-an-array' : mode === 'bad_source' ? [relation] : [];
      const returned = { post, revision, relations };
      const before = snapshot(database); let first; let replay;
      const outcome = attempt(() => { first = idempotency.executeIdempotent(boot.adminActorId, space, `post.create:${thread}`, name, { fixture: name }, 201, tx => {
        tx.createPost(post, revision);
        tx.appendEvent(space, { id: `evt_r11_${name}`, space_id: space, type: 'post.created', object_id: post.id,
          revision: 1, visibility: 'space', actor_id: boot.adminActorId, created_at: clock.nowIso() });
        return returned;
      }); });
      if (!outcome.rejected) replay = idempotency.executeIdempotent(boot.adminActorId, space, `post.create:${thread}`, name, { fixture: name }, 201, () => { throw new Error('Replay executed action'); });
      const businessCount = database.prepare('SELECT count(*) AS n FROM posts WHERE id=?').get(post.id).n;
      const eventCount = database.prepare('SELECT count(*) AS n FROM events WHERE id=?').get(`evt_r11_${name}`).n;
      const resultCount = database.prepare('SELECT count(*) AS n FROM idempotency_records WHERE key=?').get(name).n;
      database.close(); database = new Database(fixture.path);
      return { rejected: outcome.rejected, error_code: outcome.code, business_rows: businessCount, event_rows: eventCount, result_rows: resultCount,
        unchanged_after_reopen: equal(before, snapshot(database)), exact_replay: first && replay ? equal(first.data, replay.data) : null };
    } finally { database.close(); }
  }

  // Q04: malformed optional fields must not vanish before validators see them.
  {
    const encoderCases = [
      ['non_array_relations', `post.create:${thread}`, { ...nested, relations: 'not-an-array' }],
      ['malformed_initial_post', 'thread.create', { ...originalThread, initial_post: { post: {}, revision: 1 } }],
    ];
    const encoder = encoderCases.map(([variant, operation, result]) => ({ variant, ...attempt(() => extractResultRef(operation, result)) }));
    const transaction = await freshActionProbe('malformed_result', 'bad_array');
    record('Q04', 'Invalid action output is rejected before persistence, with business/events/results rolled back', { encoder, transaction },
      encoder.every(x => x.rejected) && transaction.rejected && transaction.unchanged_after_reopen);
  }

  // Q05: confirm the already-added semantic guard and ordinary legitimate writes remain effective.
  {
    const badSource = await freshActionProbe('wrong_source_result', 'bad_source');
    const goodOutput = await freshActionProbe('valid_result', 'valid');
    const modern = await send(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post');
    const fixture = clone('valid-legacy-input'); let database = fixture.database;
    let legacy;
    try {
      setRef(database, 'nested-post', nested);
      const online = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
      openAndCoordinateDatabase(database, 'serve');
      database.close(); database = new Database(fixture.path);
      openAndCoordinateDatabase(database, 'serve');
      const before = snapshot(database);
      const migrated = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
      legacy = { direct_exact: online.status === 201 && equal(online.body.data, nested),
        after_restart_exact: migrated.status === 201 && equal(migrated.body.data, nested), no_replay_writes: equal(before, snapshot(database)) };
    } finally { database.close(); }
    const observations = { semantic_failure_rolls_back: badSource.rejected && badSource.unchanged_after_reopen,
      valid_fresh_action_and_replay: !goodOutput.rejected && goodOutput.exact_replay && goodOutput.business_rows === 1 && goodOutput.event_rows === 1 && goodOutput.result_rows === 1,
      modern_nested_history_exact: modern.status === 201 && equal(modern.body.data, nested),
      relation_create_can_reuse_resolved_v2: reusedRelation.id === relation.id && reusedRelation.version === 2 && reusedRelation.state === 'resolved', ...legacy };
    record('Q05', 'Positive controls prevent accepting fixes that reject legal writes or break semantic rollback', observations,
      Object.values(observations).every(x => x === true));
  }
  const output = { reviewed_date: '2026-09-30', runtime: process.version,
    fixture_note: 'Owned synthetic HTTP data/temp SQLite; Q01/Q02 damage stored inputs, Q03 removes only updated_at from a generated legacy-style response (not asserted to be released-binary output), Q04 injects invalid internal action output, Q05 has paired controls. No real credentials, model calls or network.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }); }
