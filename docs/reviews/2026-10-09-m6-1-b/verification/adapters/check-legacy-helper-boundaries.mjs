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

// M6.1-B: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const dir = mkdtempSync(join(tmpdir(), 'detuned-r14-review-'));
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
  if (logicalV1) database.exec('DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
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


  // X01: Check the explicit alias-conflict rules added in this implementation.
  {
    const cases = [
      ['initial_revision_null_alias', 'initial-thread', { ...initial, initial_post_revision: null }, initialBody, `/spaces/${space}/threads`],
      ['initial_revision_conflict', 'initial-thread', { ...initial, initial_post_revision: 2 }, initialBody, `/spaces/${space}/threads`],
      ['initial_id_null_alias', 'initial-thread', { ...initial, initial_post_id: null }, initialBody, `/spaces/${space}/threads`],
      ['initial_relations_conflict', 'initial-thread', { ...initial, relations: [], initial_post: { ...initial.initial_post, relations: [initialRelation] } }, initialBody, `/spaces/${space}/threads`],
      ['post_relation_state_alias_conflict', 'nested-post', { ...nested, relations: [{ ...nested.relations[0], relation_state: 'resolved' }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
      ['post_relation_version_alias_null', 'nested-post', { ...nested, relations: [{ ...nested.relations[0], relation_version: null }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
      ['post_relation_version_alias_conflict', 'nested-post', { ...nested, relations: [{ ...nested.relations[0], relation_version: 2 }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
    ];
    const observed = [];
    for (const args of cases) observed.push(await inspectBad(...args));
    record('X01', 'Explicit invalid/conflicting aliases reject in HTTP and migration without writes', observed,
      observed.every(x => x.online_status === 422 && x.online_read_only && x.migration_rejected && x.unchanged_after_reopen));
  }

  // X02: Omitting a field and explicitly providing [] must remain distinguishable.
  {
    const cases = [
      ['explicit_empty', { ...initial, initial_post: { ...initial.initial_post, relations: [] } }],
      ['complete_relation', { ...initial, initial_post: { ...initial.initial_post, relations: [initialRelation] } }],
      ['equal_aliases', { ...initial, initial_post_id: initial.initial_post.post.id, initial_post_revision: 1,
        relation_ids: [initialRelation.id], relations: [{ id: initialRelation.id, relation_version: initialRelation.version, relation_state: initialRelation.state }],
        initial_post: { ...initial.initial_post, relation_ids: [initialRelation.id], relations: [initialRelation] } }],
    ];
    const observed = [];
    for (const [variant, ref] of cases) {
      const fixture = clone(variant); let database = fixture.database;
      try {
        const expected = { ...initial, initial_post: { ...initial.initial_post, relations: variant === 'explicit_empty' ? [] : [initialRelation] } };
        setRef(database, 'initial-thread', ref);
        const before = snapshot(database);
        const online = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread'));
        const onlineReadOnly = equal(before, snapshot(database));
        openAndCoordinateDatabase(database, 'serve');
        database.close(); database = new Database(fixture.path);
        openAndCoordinateDatabase(database, 'serve');
        const beforeReplay = snapshot(database);
        const replay = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads`, initialBody, 'initial-thread'));
        observed.push({ variant, online_exact: online.status === 201 && equal(online.body.data, expected),
          online_read_only: onlineReadOnly, migrated_exact: replay.status === 201 && equal(replay.body.data, expected),
          replay_read_only: equal(beforeReplay, snapshot(database)) });
      } finally { database.close(); }
    }
    record('X02', 'Legal empty/full relation arrays and equivalent aliases preserve complete output across restart', observed,
      observed.every(x => x.online_exact && x.online_read_only && x.migrated_exact && x.replay_read_only));
  }

  // X03: Missing one historical field must not erase a provided version that is provably impossible.
  {
    const future = { id: relation.id, version: relation.version + 1000 };
    const secondary = data(await send(app, 'POST', `/spaces/${space}/relations`, {
      source_ref: { post_id: nested.post.id, revision: 1 }, target_ref: { post_id: foreignPost.post.id, revision: 1 }, type: 'supports'
    }, 'secondary-relation'));
    const typedRelationRef = readRef(db, 'relation-reuse');
    const cases = [
      ['post_partial_future_version', 'nested-post', { ...nested, relations: [future] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
      ['initial_partial_future_version', 'initial-thread', { ...initial, initial_post: { ...initial.initial_post,
        relations: [{ id: initialRelation.id, version: initialRelation.version + 1000 }] } }, initialBody, `/spaces/${space}/threads`],
      ['mixed_full_future_and_partial_relation', 'nested-post', { ...nested, relations: [{ ...future, state: 'open' }, { id: secondary.id }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
      ['typed_relation_partial_future_version', 'relation-reuse', { ...typedRelationRef, relation_version: reusedRelation.version + 1000, relation_state: undefined }, relationBody, `/spaces/${space}/relations`],
      ['legacy_relation_partial_future_version', 'relation-reuse', { ...reusedRelation, version: reusedRelation.version + 1000, state: undefined }, relationBody, `/spaces/${space}/relations`],
    ];
    const observed = [];
    for (const args of cases) observed.push(await inspectBad(...args));
    const completeFutureControl = await inspectBad('complete_future_control', 'nested-post', { ...nested, relations: [{ ...future, state: 'open' }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`);
    const control = clone('valid-partial-history'); let database = control.database;
    let controlPass;
    try {
      setRef(database, 'nested-post', { ...nested, relations: [{ id: relation.id, version: 1 }] });
      openAndCoordinateDatabase(database, 'serve');
      database.close(); database = new Database(control.path);
      openAndCoordinateDatabase(database, 'serve');
      const before = snapshot(database);
      const response = await withApp(database, child => send(child, 'POST', `/spaces/${space}/threads/${thread}/posts`, nestedBody, 'nested-post'));
      controlPass = readRef(database, 'nested-post').kind === 'unreplayable' && response.status === 422 && equal(before, snapshot(database));
    } finally { database.close(); }
    record('X03', 'Known future version contradictions reject before legal missing-state fallback; valid partial history remains controlled',
      { invalid_cases: observed, complete_future_control: completeFutureControl, legal_partial_control: controlPass },
      controlPass && completeFutureControl.migration_rejected && completeFutureControl.unchanged_after_reopen && observed.every(x => x.online_status === 422 && x.online_read_only && x.migration_rejected && x.unchanged_after_reopen));
  }
  const output = { reviewed_date: '2026-10-01', runtime: process.version,
    fixture_note: 'Review-only synthetic stored-result variants in owned temporary SQLite databases with HTTP-generated fixtures and fixed clock. No real data, external services or models.',
    probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }); }
