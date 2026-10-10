// Review-only. All writes target owned temporary file databases; no model or network calls.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase as currentCoordinate, classifyDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import { validateResultRef, extractResultRef } from '../../../../../packages/core/dist/index.js';

// M6.2-A: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-r7-'));
const db = new Database(join(directory, 'source.sqlite'));
const boot = bootstrapDatabase(db);
let instant = Date.parse('2026-09-29T01:00:00.000Z');
const clock = { now: () => new Date(instant), nowIso: () => new Date(instant).toISOString() };
const app = buildApp({ storage: new SqliteStorage(db), clock });
const probes = [];
let serial = 0;
const note = body => ({ kind: 'note', title: 'R7 synthetic note', summary: 'Review fixture', body });
const record = (id, description, expected, observed, passes) => probes.push({ id, description, expected, observed, passes });
async function send(method, path, payload, key = `r7-${++serial}`, targetApp = app, token = boot.adminToken) {
  const res = await targetApp.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${token}`, 'idempotency-key': key,
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
  if (logicalV1) database.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
  return { database, path };
}
function snapshot(database) {
  const schema = database.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all();
  return { schema, rows: schema.filter(r => r.type === 'table').map(({ name }) => [name,
    database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(r => JSON.stringify(r)).sort()]) };
}
function setRef(database, key, value) {
  const n = database.prepare('UPDATE idempotency_records SET result_ref=? WHERE key=?').run(JSON.stringify(value), key).changes;
  if (n !== 1) throw new Error(`Fixture expected one reference for ${key}`);
}
async function inApp(database, action) {
  const child = buildApp({ storage: new SqliteStorage(database), clock });
  try { await child.ready(); return await action(child); }
  finally { await child.close(); }
}
function rejected(action) { try { action(); return false; } catch { return true; } }

try {
  await app.ready();
  const space = data(await send('POST', '/spaces', { slug: 'r7-space', objective: 'R4-B.2 review', rules: [] })).space.id;
  const threadBody = { title: 'R7 initial title' };
  const originalThread = data(await send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread'));
  const thread = originalThread.thread.id;
  const p1 = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, note('source'), 'source-post'));
  const p2 = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, note('target')));
  const relationBody = { source_ref: { post_id: p1.post.id, revision: 1 }, target_ref: { post_id: p2.post.id, revision: 1 }, type: 'challenges' };
  const created = data(await send('POST', `/spaces/${space}/relations`, relationBody, 'relation-first'));
  const resolveBody = { expected_version: 1, reason_ref: { post_id: p1.post.id, revision: 1 } };
  const resolved = data(await send('POST', `/spaces/${space}/relations/${created.id}/resolve`, resolveBody, 'resolve-first'));
  // A second legitimate create key deduplicates to the already-resolved relation.
  const reused = data(await send('POST', `/spaces/${space}/relations`, relationBody, 'relation-reuse'));
  if (reused.version !== 2 || reused.state !== 'resolved') throw new Error('Dedup fixture did not take the reuse path');

  // J01: faithful compact shape emitted by the uncommitted R4-B implementation.
  {
    const fixture = clone('old-reused-relation'); let database = fixture.database;
    try {
      setRef(database, 'relation-reuse', { v: 1, kind: 'relation.create', relation_id: reused.id });
      const refused = rejected(() => openAndCoordinateDatabase(database, 'init'));
      database.close(); database = new Database(fixture.path);
      const replay = refused ? null : await inApp(database, child => send('POST', `/spaces/${space}/relations`, relationBody, 'relation-reuse', child));
      record('J01', 'Migration preserves the result of a relation.create that reused an existing v2 relation',
        'original v2/resolved, or explicit refusal if the historical result cannot be proven',
        { upgrade_rejected: refused, original_version: reused.version, original_state: reused.state,
          replay_status: replay?.status ?? null, replay_version: replay?.body.data?.version ?? null, replay_state: replay?.body.data?.state ?? null },
        refused || (replay.status >= 400 && Boolean(replay.body.error?.code)) || (replay.status === 201 && isDeepStrictEqual(reused, replay.body.data)));
    } finally { database.close(); }
  }

  // J02: same current-instance loss, all entry paths; output only booleans about secrets.
  {
    const observations = [];
    for (const [name, mutation, entry] of [
      ['bootstrap_missing_table', 'DROP TABLE instance_metadata', 'bootstrap'],
      ['serve_empty_metadata', 'DELETE FROM instance_metadata', 'serve'],
      ['serve_missing_table_control', 'DROP TABLE instance_metadata', 'serve'],
    ]) {
      const fixture = clone(name); let database = fixture.database;
      try {
        const oldSecret = database.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get().value;
        database.exec(mutation); const before = snapshot(database);
        const classification = classifyDatabase(database).kind;
        const refused = rejected(() => entry === 'bootstrap' ? bootstrapDatabase(database) : openAndCoordinateDatabase(database, entry));
        database.close(); database = new Database(fixture.path);
        const hasMeta = Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get());
        const newSecret = hasMeta ? database.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get()?.value : undefined;
        observations.push({ name, classification, rejected: refused, secret_replaced: newSecret !== undefined && newSecret !== oldSecret, unchanged: isDeepStrictEqual(before, snapshot(database)) });
      } finally { database.close(); }
    }
    const childDir = join(directory, 'cli-init-loss'); mkdirSync(childDir);
    const path = join(childDir, 'detuned.sqlite'); writeFileSync(path, db.serialize());
    let database = new Database(path);
    const oldSecret = database.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get().value;
    database.exec('DROP TABLE instance_metadata'); const before = snapshot(database); database.close();
    const child = spawnSync(process.execPath, [join(root, 'packages/cli/dist/index.js'), '--json', 'init', '--data-dir', childDir], { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
    let output; try { output = JSON.parse(child.stdout); } catch { output = {}; }
    database = new Database(path);
    try {
      const hasMeta = Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get());
      const newSecret = hasMeta ? database.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get()?.value : undefined;
      observations.push({ name: 'real_cli_init_missing_table', exit: child.status, reports_success: output.success === true,
        rejected: child.status !== null && child.status !== 0 && !output.success, secret_replaced: newSecret !== undefined && newSecret !== oldSecret,
        unchanged: isDeepStrictEqual(before, snapshot(database)), lock_left: existsSync(join(childDir, 'detuned.lock')), timed_out: child.error?.code === 'ETIMEDOUT' });
    } finally { database.close(); }
    record('J02', 'Current instance material loss is refused consistently by bootstrap, init and serve',
      'all refuse and preserve logical state without changing the secret', observations,
      observations.every(r => r.rejected && r.unchanged && !r.secret_replaced && !r.timed_out && !r.lock_left));
  }

  // J03: names are unchanged; a required column is missing.
  {
    const fixture = clone('missing-required-column'); let database = fixture.database;
    try {
      database.exec('ALTER TABLE post_revisions RENAME COLUMN body TO r7_missing_body');
      const before = snapshot(database); const classification = classifyDatabase(database).kind;
      const refused = rejected(() => openAndCoordinateDatabase(database, 'init'));
      database.close(); database = new Database(fixture.path);
      const unchanged = isDeepStrictEqual(before, snapshot(database));
      record('J03', 'A current schema with all table names but a missing required column is rejected',
        { rejected: true, unchanged: true }, { classification, rejected: refused, unchanged }, refused && unchanged);
    } finally { database.close(); }
  }

  // J04: a real historical direct Thread result already contains the exact modification time.
  {
    instant += 60000;
    const patchBody = { expected_version: 1, title: 'R7 version 2' };
    const originalPatch = data(await send('PATCH', `/spaces/${space}/threads/${thread}`, patchBody, 'patch-version-2'));
    instant += 60000;
    data(await send('PATCH', `/spaces/${space}/threads/${thread}`, { expected_version: 2, title: 'R7 version 3' }));
    const fixture = clone('old-thread-patch-time', true); let database = fixture.database;
    let timeObservation;
    try {
      setRef(database, 'patch-version-2', originalPatch);
      const refused = rejected(() => openAndCoordinateDatabase(database, 'init'));
      database.close(); database = new Database(fixture.path);
      const replay = refused ? null : await inApp(database, child => send('PATCH', `/spaces/${space}/threads/${thread}`, patchBody, 'patch-version-2', child));
      timeObservation = { upgrade_rejected: refused, status: replay?.status ?? null, original_updated_at: originalPatch.updated_at,
        replay_updated_at: replay?.body.data?.updated_at ?? null, recovered_exactly: isDeepStrictEqual(replay?.body.data, originalPatch) };
    } finally { database.close(); }
    const conflict = clone('same-title-conflicting-state'); database = conflict.database;
    let conflictObservation;
    try {
      database.prepare("UPDATE thread_versions SET state='archived' WHERE thread_id=? AND version=1").run(thread);
      setRef(database, 'original-thread', originalThread); const before = snapshot(database);
      const refused = rejected(() => openAndCoordinateDatabase(database, 'init'));
      database.close(); database = new Database(conflict.path);
      conflictObservation = { rejected: refused, unchanged: isDeepStrictEqual(before, snapshot(database)) };
    } finally { database.close(); }
    record('J04', 'Migration recovers known historical timestamps and detects non-title snapshot conflicts',
      'exactly recover the known old patch result; reject conflicting immutable state atomically',
      { time: timeObservation, state_conflict: conflictObservation },
      timeObservation.status === 200 && timeObservation.recovered_exactly && conflictObservation.rejected && conflictObservation.unchanged);
  }

  // J05: persisted-reference integrity fixtures, not a public API that allows database tampering.
  {
    const privateSpace = data(await send('POST', '/spaces', { slug: 'r7-private', objective: 'Synthetic private space', rules: [] })).space.id;
    const privateThread = data(await send('POST', `/spaces/${privateSpace}/threads`, { title: 'R7_SYNTHETIC_PRIVATE_TITLE' })).thread;
    const actor = data(await send('POST', '/admin/actors', { kind: 'agent', display_name: 'R7 scoped writer' })).id;
    data(await send('POST', `/spaces/${space}/memberships`, { actor_id: actor, role: 'contributor' }));
    const token = data(await send('POST', '/admin/credentials', { actor_id: actor, allowed_space_ids: [space], capabilities: ['read', 'write'] })).token;
    const scopedBody = { title: 'R7 scoped original' };
    data(await send('POST', `/spaces/${space}/threads`, scopedBody, 'scoped-create', app, token));
    const secondRel = data(await send('POST', `/spaces/${space}/relations`, { source_ref: { post_id: p2.post.id, revision: 1 }, target_ref: { post_id: p1.post.id, revision: 1 }, type: 'challenges' }));
    const secondResolution = data(await send('POST', `/spaces/${space}/relations/${secondRel.id}/resolve`, resolveBody));
    const fixture = clone('scope-and-resolution'); const database = fixture.database;
    try {
      setRef(database, 'scoped-create', { v: 1, kind: 'thread.create', thread_id: privateThread.id, thread_version: 1 });
      const oldRef = JSON.parse(database.prepare("SELECT result_ref FROM idempotency_records WHERE key='resolve-first'").get().result_ref);
      setRef(database, 'resolve-first', { ...oldRef, resolution_id: secondResolution.resolution.id });
      const upgradeRejected = rejected(() => openAndCoordinateDatabase(database, 'init'));
      const observed = await inApp(database, async child => {
        const denied = await send('GET', `/spaces/${privateSpace}/threads/${privateThread.id}`, undefined, undefined, child, token);
        const scopeReplay = await send('POST', `/spaces/${space}/threads`, scopedBody, 'scoped-create', child, token);
        const wrongResolution = await send('POST', `/spaces/${space}/relations/${created.id}/resolve`, resolveBody, 'resolve-first', child);
        return { upgrade_rejected: upgradeRejected, direct_private_read_status: denied.status, scoped_replay_status: scopeReplay.status,
          private_thread_returned: scopeReplay.body.data?.thread?.id === privateThread.id, resolution_replay_status: wrongResolution.status,
          mismatched_resolution_returned: wrongResolution.body.data?.resolution?.relation_id === secondRel.id };
      });
      record('J05', 'Reconstruction validates space ownership and resolution-to-relation binding',
        'mismatched references rejected in migration and never exposed by replay', observed,
        observed.upgrade_rejected && observed.direct_private_read_status >= 400 && observed.scoped_replay_status >= 400 && !observed.private_thread_returned && observed.resolution_replay_status >= 400 && !observed.mismatched_resolution_returned);
    } finally { database.close(); }
  }

  // J06: newly introduced nested refs and the unreplayable branch must follow the same strict schema.
  {
    const base = { v: 1, kind: 'post', post_id: p1.post.id, revision: 1 };
    const bad = [
      ['fractional_nested_version', { ...base, relations: [{ id: created.id, version: 1.5, state: 'open' }] }],
      ['unsafe_top_level_revision', { ...base, revision: Number.MAX_SAFE_INTEGER + 1 }],
      ['nested_extra_field', { ...base, relations: [{ id: created.id, version: 1, state: 'open', unrelated: 'not-an-id-or-version' }] }],
      ['unreplayable_wrong_op_and_extra', { v: 1, kind: 'unreplayable', op: 'unknown.operation', reason: 'unregistered_reason', unrelated: true }],
    ];
    const validation = bad.map(([name, ref]) => ({ name, rejected: rejected(() => validateResultRef(`post.create:${thread}`, ref)) }));
    const encoderRejects = rejected(() => extractResultRef('thread.create_unregistered', originalThread));
    const fixture = clone('unreplayable-content'); let database = fixture.database;
    let migration;
    try {
      setRef(database, 'original-thread', { v: 1, kind: 'unreplayable', op: 'thread.create', reason: 'historical_thread_version_unrecoverable', body: 'R7_SYNTHETIC_CACHED_BODY' });
      const before = snapshot(database); const refused = rejected(() => openAndCoordinateDatabase(database, 'init'));
      database.close(); database = new Database(fixture.path);
      migration = { rejected: refused, unchanged: isDeepStrictEqual(before, snapshot(database)), cached_body_retained: database.prepare("SELECT result_ref FROM idempotency_records WHERE key='original-thread'").get().result_ref.includes('R7_SYNTHETIC_CACHED_BODY') };
    } finally { database.close(); }
    record('J06', 'Encoding, validation and unreplayable migration have no bypasses for invalid fields or content',
      'all invalid encodings rejected; illegal cached record aborts migration atomically',
      { validation, unknown_operation_encoder_rejected: encoderRejects, migration },
      validation.every(r => r.rejected) && encoderRejects && migration.rejected && migration.unchanged);
  }

  // J07: positive control for the live reuse path and fixed new nested relation snapshots.
  {
    const replayReuse = await send('POST', `/spaces/${space}/relations`, relationBody, 'relation-reuse');
    const withRef = { ...note('new nested challenge'), refs: [{ target_ref: { post_id: p2.post.id, revision: 1 }, type: 'challenges' }] };
    const first = data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, withRef, 'new-nested-post'));
    data(await send('POST', `/spaces/${space}/relations/${first.relations[0].id}/resolve`, resolveBody));
    const replayPost = await send('POST', `/spaces/${space}/threads/${thread}/posts`, withRef, 'new-nested-post');
    record('J07', 'Current-format reuse and newly encoded nested relation snapshots remain correct',
      { reused_version: 2, reused_state: 'resolved', nested_version: 1, nested_state: 'open' },
      { reused_status: replayReuse.status, reused_version: replayReuse.body.data?.version, reused_state: replayReuse.body.data?.state,
        nested_status: replayPost.status, nested_version: replayPost.body.data?.relations?.[0]?.version, nested_state: replayPost.body.data?.relations?.[0]?.state },
      replayReuse.status === 201 && isDeepStrictEqual(replayReuse.body.data, reused) && replayPost.status === 201 && isDeepStrictEqual(replayPost.body.data.relations, first.relations));
  }
} finally {
  await app.close(); db.close(); rmSync(directory, { recursive: true, force: true });
}

console.log(JSON.stringify({ reviewed_date: '2026-09-29', runtime: process.version,
  fixture_note: 'Owned temporary file DBs. J01/J04 reproduce known historical result shapes; J02-J06 also include deliberate integrity failures. J05 assumes persisted-reference corruption and is not an unauthenticated remote exploit. J07 uses ordinary valid HTTP requests. No old binary or model was executed.',
  probes, passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length }, null, 2));
process.exitCode = probes.every(p => p.passes) ? 0 : 1;
