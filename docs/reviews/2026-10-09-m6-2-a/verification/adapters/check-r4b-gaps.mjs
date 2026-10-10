// Review-only: owned file databases, Fastify inject, two local CLI failure paths.
// Run after pnpm build. Exit 1 means a product invariant failed; setup failures throw.
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase as currentCoordinate, isDatabaseInitialized } from '../../../../../packages/storage-sqlite/dist/index.js';

// M6.2-A: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-r5-'));
const db = new Database(join(directory, 'source.sqlite'));
const boot = bootstrapDatabase(db);
const storage = new SqliteStorage(db);
const app = buildApp({ storage });
const results = [];
let serial = 0;
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const record = (id, description, expected, observed, passes) => results.push({ id, description, expected, observed, passes });
const note = body => ({ kind: 'note', title: 'R5 note', summary: 'Synthetic review fixture', body });
async function send(method, path, payload, key = `r5-${++serial}`, targetApp = app) {
  const response = await targetApp.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(payload === undefined ? {} : { payload }) });
  return { status: response.statusCode, body: response.json() };
}
function data(response) {
  if (response.status >= 400) throw new Error(`Fixture setup failed: ${response.status} ${response.body.error?.code}`);
  return response.body.data;
}
function hasTable(database, name) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}
function maxVersion(database) {
  return database.prepare('SELECT max(version) AS version FROM schema_migrations').get().version;
}
function logicalSnapshot(database) {
  const tables = database.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").all();
  return { tables, rows: tables.map(({ name }) => [name, database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(row => JSON.stringify(row)).sort()]) };
}
// Logical v1 structure with the exact old reference shape under examination.
// Other data come from the current HTTP fixture, so this is not a historical-binary upgrade run.
function logicalV1(name) {
  const path = join(directory, `${name}.sqlite`);
  writeFileSync(path, db.serialize());
  const database = new Database(path);
  database.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
  return { path, database };
}
async function onUpgradedApp(database, action) {
  const child = buildApp({ storage: new SqliteStorage(database) });
  try { await child.ready(); return await action(child); }
  finally { await child.close(); }
}

try {
  await app.ready();
  const spaceResult = data(await send('POST', '/spaces', { slug: 'r5-space', objective: 'R4-B review', rules: [] }));
  const space = spaceResult.space.id;
  const threadBody = { title: 'R5 original title' };
  const originalThread = data(await send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread'));
  const thread = originalThread.thread.id;
  const post = (body, key) => send('POST', `/spaces/${space}/threads/${thread}/posts`, note(body), key).then(data);
  const source = await post('R5 source');
  const target = await post('R5 target');
  const reason = await post('R5 reason');
  const relationBody = { source_ref: { post_id: source.post.id, revision: 1 }, target_ref: { post_id: target.post.id, revision: 1 }, type: 'challenges' };
  const originalRelation = data(await send('POST', `/spaces/${space}/relations`, relationBody, 'original-relation'));
  data(await send('POST', `/spaces/${space}/relations/${originalRelation.id}/resolve`, { expected_version: 1, reason_ref: { post_id: reason.post.id, revision: 1 } }));
  const replayRelation = await send('POST', `/spaces/${space}/relations`, relationBody, 'original-relation');
  record('G01', 'A fresh relation.create retry preserves its original result after resolve',
    { status: 201, version: 1, state: 'open' },
    { status: replayRelation.status, version: replayRelation.body.data?.version, state: replayRelation.body.data?.state },
    replayRelation.status === 201 && replayRelation.body.data?.version === originalRelation.version && replayRelation.body.data?.state === originalRelation.state);

  data(await send('PATCH', `/spaces/${space}/threads/${thread}`, { expected_version: 1, title: 'R5 later title' }));

  // G02: c4f041f did not save the old title in this reference. Recovery needs evidence, not current state.
  {
    const fixture = logicalV1('missing-history');
    let database = fixture.database;
    try {
      database.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'original-thread'").run(JSON.stringify({ $ref: 'thread', thread_id: thread }));
      bootstrapDatabase(database);
      database.close();
      database = new Database(fixture.path);
      const response = await onUpgradedApp(database, child => send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread', child));
      const originalResultPreserved = isDeepStrictEqual(response.body.data?.thread, originalThread.thread);
      record('G02', 'A missing old thread version never attaches the current title to version 1',
        'explicit non-success if history cannot be recovered, or a verifiably original result',
        { status: response.status, version: response.body.data?.thread?.version, title: response.body.data?.thread?.title, original_result_preserved: originalResultPreserved, error_code: response.body.error?.code ?? null },
        (response.status >= 400 && Boolean(response.body.error?.code)) || (response.status === 201 && originalResultPreserved));
    } finally { database.close(); }
  }

  // G03: Install a real SQLite trigger after migration creates the history table.
  // The db.exec wrapper only installs the fault; SQL writes still run through SQLite.
  {
    const fixture = logicalV1('history-write-fault');
    let database = fixture.database;
    try {
      database.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'original-thread'").run(JSON.stringify(originalThread));
      const before = logicalSnapshot(database);
      let faultHits = 0;
      let installed = false;
      database.function('r5_mark_fault', () => { faultHits++; return 1; });
      const nativeExec = database.exec.bind(database);
      database.exec = sql => {
        const returned = nativeExec(sql);
        if (!installed && /CREATE TABLE IF NOT EXISTS thread_versions/.test(sql)) {
          installed = true;
          nativeExec(`CREATE TEMP TRIGGER r5_history_fault BEFORE INSERT ON thread_versions
            WHEN NEW.thread_id = ${quote(thread)} AND NEW.version = 1
            BEGIN SELECT r5_mark_fault(); SELECT RAISE(ABORT, 'R5 history insert fault'); END`);
        }
        return returned;
      };
      let rejected = false;
      try { bootstrapDatabase(database); } catch { rejected = true; }
      database.exec = nativeExec;
      database.close();
      database = new Database(fixture.path);
      const unchanged = isDeepStrictEqual(before, logicalSnapshot(database));
      const oldVersionExists = hasTable(database, 'thread_versions') && Boolean(database.prepare('SELECT 1 FROM thread_versions WHERE thread_id=? AND version=1').get(thread));
      record('G03', 'A failed immutable-history INSERT aborts and rolls back the complete upgrade after reopen',
        { fault_hits: 1, rejected: true, logical_state_unchanged: true },
        { fault_hits: faultHits, rejected, logical_state_unchanged: unchanged, schema_version: maxVersion(database), old_history_row_exists: oldVersionExists },
        faultHits === 1 && rejected && unchanged);
    } finally { database.close(); }
  }

  // G04: A real parse failure must not leave a content-bearing old record behind a success marker.
  {
    const fixture = logicalV1('corrupt-json');
    const database = fixture.database;
    try {
      const broken = '{"thread":{"id":"synthetic"},"body":"R5_CORRUPT_BODY"';
      database.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'original-thread'").run(broken);
      const before = logicalSnapshot(database);
      let rejected = false;
      try { bootstrapDatabase(database); } catch { rejected = true; }
      const retained = database.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'original-thread'").get().result_ref.includes('R5_CORRUPT_BODY');
      const unchanged = isDeepStrictEqual(before, logicalSnapshot(database));
      record('G04', 'Malformed historical JSON stops migration and leaves an unchanged database for diagnosis',
        { rejected: true, logical_state_unchanged: true },
        { rejected, logical_state_unchanged: unchanged, schema_version: maxVersion(database), malformed_content_cache_retained: retained },
        rejected && unchanged);
    } finally { database.close(); }
  }

  // G05: An unrelated, nonempty SQLite database is neither an empty instance nor a supported old schema.
  {
    const database = new Database(join(directory, 'foreign-schema.sqlite'));
    try {
      database.exec("CREATE TABLE unrelated_notes(id INTEGER PRIMARY KEY, body TEXT); INSERT INTO unrelated_notes VALUES(1,'R5 unrelated data');");
      const before = logicalSnapshot(database);
      let rejected = false;
      let response;
      try { response = openAndCoordinateDatabase(database, 'init'); } catch { rejected = true; }
      const after = logicalSnapshot(database);
      record('G05', 'Unknown nonempty schemas are refused before creating Detuned tables or credentials',
        { rejected: true, logical_state_unchanged: true, issued_admin_token: false },
        { rejected, logical_state_unchanged: isDeepStrictEqual(before, after), added_tables: after.tables.length - before.tables.length, issued_admin_token: Boolean(response?.adminToken) },
        rejected && isDeepStrictEqual(before, after) && !response?.adminToken);
    } finally { database.close(); }
  }

  // G06: Versioned TypeScript aliases cannot validate persisted JSON at runtime.
  {
    const original = db.prepare("SELECT result_ref FROM idempotency_records WHERE key='original-thread'").get().result_ref;
    const cases = [
      ['invalid_version_zero', { v: 0, kind: 'thread.create', thread_id: thread, thread_version: 1 }],
      ['missing_thread_version', { v: 1, kind: 'thread.create', thread_id: thread }],
      ['wrong_operation_kind', { v: 1, kind: 'space', space_id: space, revision: 1 }],
    ];
    const outcomes = [];
    try {
      for (const [name, ref] of cases) {
        db.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='original-thread'").run(JSON.stringify(ref));
        const response = await send('POST', `/spaces/${space}/threads`, threadBody, 'original-thread');
        outcomes.push({ name, status: response.status, returned_thread: Boolean(response.body.data?.thread), returned_space: Boolean(response.body.data?.space), error_code: response.body.error?.code ?? null });
      }
    } finally { db.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='original-thread'").run(original); }
    record('G06', 'Typed result references validate version, required fields, and operation-kind binding',
      'each malformed or incompatible reference returns a structured non-success', outcomes,
      outcomes.every(item => item.status >= 400 && Boolean(item.error_code)));
  }

  // G07: c4f041f/71aefc1 cached direct Relation and Post returns, not only nested response envelopes.
  {
    const item = await post('R5 legacy withdraw');
    const withdrawBody = { expected_revision: 1, reason: 'R5 synthetic withdrawal' };
    const withdrawn = data(await send('POST', `/spaces/${space}/posts/${item.post.id}/withdraw`, withdrawBody, 'original-withdraw'));
    const fixture = logicalV1('direct-entity-results');
    const database = fixture.database;
    try {
      database.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='original-relation'").run(JSON.stringify(originalRelation));
      database.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='original-withdraw'").run(JSON.stringify(withdrawn));
      bootstrapDatabase(database);
      const responses = await onUpgradedApp(database, async child => ({
        relation: await send('POST', `/spaces/${space}/relations`, relationBody, 'original-relation', child),
        withdraw: await send('POST', `/spaces/${space}/posts/${item.post.id}/withdraw`, withdrawBody, 'original-withdraw', child),
      }));
      const kinds = database.prepare("SELECT key, result_ref FROM idempotency_records WHERE key IN ('original-relation','original-withdraw') ORDER BY key").all().map(row => ({ key: row.key, kind: JSON.parse(row.result_ref).kind }));
      record('G07', 'Recoverable direct-entity historical results remain replayable after migration',
        { relation_status: 201, relation_version: 1, withdraw_status: 200 },
        { relation_status: responses.relation.status, relation_version: responses.relation.body.data?.version ?? null, withdraw_status: responses.withdraw.status, migrated_kinds: kinds },
        responses.relation.status === 201 && responses.relation.body.data?.version === 1 && responses.withdraw.status === 200 && responses.withdraw.body.data?.id === item.post.id);
    } finally { database.close(); }
  }

  // G08: Use actual historical DDL for a minimal fa1b35c instance without instance_metadata.
  {
    const schemaSource = execFileSync('git', ['show', 'fa1b35c:packages/storage-sqlite/src/schema.ts'], { cwd: root, encoding: 'utf8' });
    const first = schemaSource.indexOf('`');
    const last = schemaSource.lastIndexOf('`');
    if (first < 0 || last <= first || schemaSource.includes('${')) throw new Error('Historical DDL extraction needs review');
    const database = new Database(join(directory, 'actual-old-ddl.sqlite'));
    try {
      database.exec(schemaSource.slice(first + 1, last));
      database.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(1,?)').run('2026-09-28T00:00:00.000Z');
      const oldStorage = new SqliteStorage(database);
      oldStorage.createActor(storage.findActorById(boot.adminActorId));
      const credentialId = db.prepare('SELECT id FROM credentials WHERE actor_id=?').get(boot.adminActorId).id;
      oldStorage.createCredential(storage.findCredentialById(credentialId));
      if (hasTable(database, 'instance_metadata')) throw new Error('Historical DDL unexpectedly contains instance_metadata');
      const countBefore = database.prepare('SELECT count(*) AS n FROM credentials').get().n;
      let rejected = false;
      let error;
      let response;
      try { response = currentCoordinate(database, 'serve'); } catch (err) { rejected = true; error = err.message; }
      const extra = database.prepare('SELECT count(*) AS n FROM credentials').get().n - countBefore;
      record('G08', 'Ordinary serve refuses a recognized old initialized schema without issuing identity or migrating',
        { rejected: true, initialized: false, extra_credentials: 0, issued_admin_token: false },
        { rejected, error: error ?? null, initialized: isDatabaseInitialized(database), schema_version: maxVersion(database), extra_credentials: extra, issued_admin_token: Boolean(response?.adminToken) },
        rejected && !isDatabaseInitialized(database) && maxVersion(database) === 1 && extra === 0 && !response?.adminToken);
    } finally { database.close(); }
  }

  // G09: Real CLI children; the missing-secret path should fail before any listen call.
  // A 5-second timeout kills only the child owned by this probe if it unexpectedly keeps running.
  {
    const cliDirectory = join(directory, 'bad-secret-cli');
    mkdirSync(cliDirectory);
    const database = new Database(join(cliDirectory, 'detuned.sqlite'));
    bootstrapDatabase(database);
    database.prepare("DELETE FROM instance_metadata WHERE key='token_secret'").run();
    database.close();
    const cli = join(root, 'packages/cli/dist/index.js');
    const initRun = spawnSync(process.execPath, [cli, '--json', 'init', '--data-dir', cliDirectory], { cwd: root, encoding: 'utf8', timeout: 5000 });
    const serveRun = spawnSync(process.execPath, [cli, '--json', 'serve', '--data-dir', cliDirectory, '--port', '0'], { cwd: root, encoding: 'utf8', timeout: 5000 });
    let initOutput;
    let serveOutput;
    try { initOutput = JSON.parse(initRun.stdout); } catch {}
    try { serveOutput = JSON.parse(serveRun.stdout); } catch {}
    const leftLock = existsSync(join(cliDirectory, 'detuned.lock'));
    const observed = {
      init_exit: initRun.status, init_reports_success: Boolean(initOutput?.success),
      serve_exit: serveRun.status, serve_has_structured_error: Boolean(serveOutput?.error),
      lock_left_after_exit: leftLock, timed_out: Boolean(initRun.error || serveRun.error),
    };
    record('G09', 'Missing persistent secret fails both CLI entry points with diagnostics and releases the directory lock',
      { init_reports_success: false, both_nonzero_exit: true, serve_has_structured_error: true, lock_left_after_exit: false }, observed,
      initRun.status !== null && initRun.status !== 0 && serveRun.status !== null && serveRun.status !== 0 && !initOutput?.success && Boolean(serveOutput?.error) && !leftLock && !initRun.error && !serveRun.error);
  }

  const baseline = JSON.parse(readFileSync(new URL('../../../2026-09-28-m0-m1-r5/baseline.json', import.meta.url), 'utf8'));
  const output = {
    reviewed_date: '2026-09-28', reviewed_head: baseline.head, reviewed_state: 'HEAD plus uncommitted implementation; see baseline.json hashes',
    runtime: process.version, mode: 'temporary file SQLite, Fastify inject, SQLite write faults, native CLI failure paths; no model calls',
    fixture_note: 'G02/G03/G04/G07 use logical v1 fixtures; G08 executes historical fa1b35c DDL with synthetic actor/credential data. No complete old-binary run is claimed.',
    probes: results, passed: results.filter(item => item.passes).length, failed: results.filter(item => !item.passes).length,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally {
  await app.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
