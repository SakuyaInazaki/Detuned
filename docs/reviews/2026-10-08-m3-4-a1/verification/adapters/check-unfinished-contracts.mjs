// Review-only probe. Run after pnpm build; no real instance, host, model, or network is used.
// Exit 1 means an invariant failed. Setup errors throw instead of counting as product failures.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, isDatabaseInitialized } from '../../../../../packages/storage-sqlite/dist/index.js';
import { DetunedClient } from '../../../../../packages/client/dist/index.js';

const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-r4-'));
const db = new Database(join(directory, 'review.sqlite'));
const boot = bootstrapDatabase(db);
const app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
const results = [];
let serial = 0;
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const record = (id, description, expected, observed, passes) => results.push({ id, description, expected, observed, passes });
async function send(method, path, payload, key = `r4-${++serial}`, targetApp = app) {
  const response = await targetApp.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(payload === undefined ? {} : { payload }) });
  return { status: response.statusCode, body: response.json() };
}
function data(response) {
  if (response.status >= 400) throw new Error(`Fixture setup failed: ${response.status} ${response.body.error?.code}`);
  return response.body.data;
}
const note = body => ({ kind: 'note', title: 'R4 synthetic note', summary: 'Review fixture', body });
function recordSnapshot(database) {
  return {
    records: database.prepare('SELECT * FROM idempotency_records ORDER BY actor_id, space_id, operation, key').all(),
    migrations: database.prepare('SELECT * FROM schema_migrations ORDER BY version').all(),
    metadata: database.prepare('SELECT * FROM instance_metadata ORDER BY key').all(),
  };
}

try {
  await app.ready();
  const space = data(await send('POST', '/spaces', { slug: 'review-r4', objective: 'Temporary R4 review', rules: [] })).space.id;
  const thread = data(await send('POST', `/spaces/${space}/threads`, { title: 'R4 thread' })).thread.id;
  const post = (body, key) => send('POST', `/spaces/${space}/threads/${thread}/posts`, note(body), key).then(data);
  const source = await post('R4 source');
  const target = await post('R4 target');
  const reason = await post('R4 reason');
  const seedA = await post('R4_LEGACY_A', 'legacy-a');
  const seedB = await post('R4_LEGACY_B', 'legacy-b');

  // U01: Exact fa1b35c full-response format, with a deterministic SQLite write fault.
  // This is a logical format fixture, not a claim of running the old application binary.
  const migrationPath = join(directory, 'migration-fault.sqlite');
  writeFileSync(migrationPath, db.serialize());
  let migrationDb = new Database(migrationPath);
  try {
    migrationDb.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(JSON.stringify(seedA), 'legacy-a');
    migrationDb.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(JSON.stringify(seedB), 'legacy-b');
    migrationDb.exec(`CREATE TRIGGER r4_migration_fault BEFORE UPDATE ON idempotency_records
      WHEN OLD.key = 'legacy-b' BEGIN SELECT RAISE(ABORT, 'R4 migration write fault'); END`);
    const before = recordSnapshot(migrationDb);
    let rejected = false;
    try { bootstrapDatabase(migrationDb); } catch { rejected = true; }
    migrationDb.close();
    migrationDb = new Database(migrationPath);
    const after = recordSnapshot(migrationDb);
    const cachedA = after.records.find(row => row.key === 'legacy-a').result_ref;
    const cachedB = after.records.find(row => row.key === 'legacy-b').result_ref;
    const observed = {
      rejected, records_and_metadata_unchanged: isDeepStrictEqual(before, after),
      first_record_converted: !cachedA.includes('R4_LEGACY_A'),
      second_record_still_contains_body: cachedB.includes('R4_LEGACY_B'),
      migration_versions: after.migrations.map(row => row.version),
    };
    record('U01', 'A migration write failure aborts the upgrade and rolls back earlier conversions, including after reopen',
      { rejected: true, records_and_metadata_unchanged: true }, observed,
      rejected && isDeepStrictEqual(before, after));
  } finally { migrationDb.close(); }

  // U02: c4f041f's exact relation result-reference shape omits state/version.
  // Its immutable resolution row DOES contain the version, so correct reconstruction is possible.
  const relation = data(await send('POST', `/spaces/${space}/relations`, {
    source_ref: { post_id: source.post.id, revision: 1 },
    target_ref: { post_id: target.post.id, revision: 1 }, type: 'challenges',
  }));
  const resolveBody = { expected_version: 1, reason_ref: { post_id: reason.post.id, revision: 1 } };
  const firstResolve = data(await send('POST', `/spaces/${space}/relations/${relation.id}/resolve`, resolveBody, 'legacy-resolve'));
  data(await send('POST', `/spaces/${space}/relations/${relation.id}/reopen`, {
    expected_version: 2, reason_ref: { post_id: reason.post.id, revision: 1 },
  }));
  const oldReference = { $ref: 'relation', relation_id: relation.id, resolution_id: firstResolve.resolution.id };
  const replayPath = join(directory, 'legacy-ref.sqlite');
  writeFileSync(replayPath, db.serialize());
  let replayDb = new Database(replayPath);
  let replayApp;
  try {
    replayDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'legacy-resolve'").run(JSON.stringify(oldReference));
    bootstrapDatabase(replayDb);
    replayDb.close();
    replayDb = new Database(replayPath);
    replayApp = buildApp({ storage: new SqliteStorage(replayDb) });
    await replayApp.ready();
    const replay = await send('POST', `/spaces/${space}/relations/${relation.id}/resolve`, resolveBody, 'legacy-resolve', replayApp);
    const observed = {
      status: replay.status, relation_version: replay.body.data?.relation?.version,
      relation_state: replay.body.data?.relation?.state, resolution_version: replay.body.data?.resolution?.version,
      same_resolution_id: replay.body.data?.resolution?.id === firstResolve.resolution.id,
    };
    record('U02', 'Upgraded c4f041f resolve references preserve the original operation version after a later reopen',
      { status: 200, relation_version: 2, relation_state: 'resolved', resolution_version: 2, same_resolution_id: true }, observed,
      observed.status === 200 && observed.relation_version === 2 && observed.relation_state === 'resolved' &&
      observed.resolution_version === 2 && observed.same_resolution_id);
  } finally {
    if (replayApp) await replayApp.close();
    replayDb.close();
  }

  // U03: Revocation is an authentication state change, not permission to bootstrap a second time.
  const revokedDb = new Database(join(directory, 'revoked.sqlite'));
  try {
    bootstrapDatabase(revokedDb);
    const credentialsBefore = revokedDb.prepare('SELECT count(*) AS n FROM credentials').get().n;
    revokedDb.prepare('UPDATE credentials SET revoked_at = ?').run('2026-09-28T00:00:00.000Z');
    const initializedBeforeRetry = isDatabaseInitialized(revokedDb);
    let secondBootstrap;
    try { secondBootstrap = bootstrapDatabase(revokedDb); } catch { /* Explicit recovery-required rejection is safe. */ }
    const credentialsAfter = revokedDb.prepare('SELECT count(*) AS n FROM credentials').get().n;
    const observed = {
      initialized_after_revocation: initializedBeforeRetry,
      extra_credentials: credentialsAfter - credentialsBefore,
      returned_new_admin_token: Boolean(secondBootstrap?.adminToken),
      reported_new_instance: secondBootstrap?.isNewInstance ?? null,
    };
    record('U03', 'Revoking all credentials preserves initialization and never implicitly creates an administrator credential',
      { initialized_after_revocation: true, extra_credentials: 0, returned_new_admin_token: false }, observed,
      initializedBeforeRetry && credentialsAfter === credentialsBefore && !secondBootstrap?.adminToken);
  } finally { revokedDb.close(); }

  // U04: Unknown/corrupt result references must not be returned as a successful business response.
  const unknownBody = { title: 'R4 unknown result format' };
  data(await send('POST', `/spaces/${space}/threads`, unknownBody, 'unknown-ref'));
  const originalRef = db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'unknown-ref'").get().result_ref;
  try {
    db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'unknown-ref'").run(
      JSON.stringify({ $ref: 'future_result_kind', ref_version: 999, object_id: 'synthetic' }));
    const replay = await send('POST', `/spaces/${space}/threads`, unknownBody, 'unknown-ref');
    const observed = { status: replay.status, raw_unknown_reference_returned: replay.body.data?.$ref === 'future_result_kind', error_code: replay.body.error?.code ?? null };
    record('U04', 'An unknown idempotency reference kind/version is rejected instead of returned with HTTP 201',
      'structured non-success error, no raw reference as data', observed,
      replay.status >= 400 && Boolean(replay.body.error?.code) && !replay.body.data);
  } finally { db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'unknown-ref'").run(originalRef); }

  // U05: The public relation request schema exists but must actually guard writes.
  const countBefore = db.prepare('SELECT count(*) AS n FROM relations').get().n;
  const eventsBefore = db.prepare('SELECT count(*) AS n FROM events').get().n;
  const invalid = await send('POST', `/spaces/${space}/relations`, {
    source_ref: { post_id: source.post.id, revision: 1 }, target_ref: { post_id: target.post.id, revision: 1 },
    type: 'not_a_relation_type',
  }, 'invalid-relation');
  const invalidObserved = {
    status: invalid.status, returned_type: invalid.body.data?.type ?? null,
    extra_relation_rows: db.prepare('SELECT count(*) AS n FROM relations').get().n - countBefore,
    extra_event_rows: db.prepare('SELECT count(*) AS n FROM events').get().n - eventsBefore,
    idempotency_rows: db.prepare("SELECT count(*) AS n FROM idempotency_records WHERE key = 'invalid-relation'").get().n,
  };
  record('U05', 'Invalid relation enums are rejected at the HTTP boundary without committing business state',
    { status: '4xx', extra_relation_rows: 0, extra_event_rows: 0, idempotency_rows: 0 }, invalidObserved,
    invalid.status >= 400 && invalid.status < 500 && invalidObserved.extra_relation_rows === 0 &&
    invalidObserved.extra_event_rows === 0 && invalidObserved.idempotency_rows === 0);

  // U06: Native Response JSON parsing, with fetch replaced to avoid any network access.
  const savedFetch = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('{"data":', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });
    let outcome;
    let result;
    try { result = await client.request({ method: 'GET', path: '/fixture' }); outcome = 'resolved'; }
    catch { outcome = 'rejected'; }
    record('U06', 'A truncated HTTP 200 JSON body cannot be reported as successful undefined data',
      { outcome: 'rejected', calls: 1 }, { outcome, data_is_undefined: result?.data === undefined, calls },
      outcome === 'rejected' && calls === 1);
  } finally { globalThis.fetch = savedFetch; }

  // U07: Positive evidence beyond the previous single-revision redaction probe.
  const many = await post('R4 many revisions 1');
  for (let revision = 2; revision <= 25; revision++) {
    data(await send('POST', `/spaces/${space}/posts/${many.post.id}/revisions`, {
      expected_revision: revision - 1, title: 'R4 revision', summary: 'Many revisions fixture',
      body: `R4 many revisions ${revision}`, tags: ['r4-synthetic-tag'],
    }));
  }
  const redacted = data(await send('POST', `/spaces/${space}/redactions`, { target_type: 'post', target_id: many.post.id, reason: 'R4 audit coverage' }));
  const audit = db.prepare('SELECT affected_revisions FROM redactions WHERE id = ?').get(redacted.redaction_id);
  const affected = JSON.parse(audit.affected_revisions);
  const rows = db.prepare('SELECT title, summary, body, tags, structured FROM post_revisions WHERE post_id = ?').all(many.post.id);
  const complete = isDeepStrictEqual(affected, Array.from({ length: 25 }, (_, i) => i + 1));
  const sanitized = rows.every(row => row.title === '[REDACTED]' && row.summary === '[REDACTED]' && row.body === '[REDACTED]' && row.tags === '[]' && row.structured === '{}');
  record('U07', 'Redaction audit and sanitization cover 25 revisions, beyond the default page size',
    { affected_revisions: 25, complete: true, sanitized: true }, { affected_revisions: affected.length, complete, sanitized }, complete && sanitized);

  // U08: Inject faults AFTER content/audit changes, at both event and idempotency insertion.
  const rollbackOutcomes = [];
  for (const stage of ['event', 'idempotency']) {
    const item = await post(`R4 rollback ${stage}`);
    const key = `redaction-fault-${stage}`;
    const state = () => ({
      post: db.prepare('SELECT * FROM posts WHERE id = ?').get(item.post.id),
      revisions: db.prepare('SELECT * FROM post_revisions WHERE post_id = ? ORDER BY revision').all(item.post.id),
      fts: db.prepare('SELECT * FROM post_fts WHERE post_id = ?').all(item.post.id),
      audits: db.prepare('SELECT * FROM redactions WHERE target_id = ?').all(item.post.id),
      events: db.prepare('SELECT * FROM events WHERE object_id = ? ORDER BY seq').all(item.post.id),
      idem: db.prepare('SELECT * FROM idempotency_records WHERE key = ?').all(key),
    });
    const before = state();
    if (stage === 'event') {
      db.exec(`CREATE TRIGGER r4_redaction_fault BEFORE INSERT ON events
        WHEN NEW.type = 'post.redacted' AND NEW.object_id = ${quote(item.post.id)}
        BEGIN SELECT RAISE(ABORT, 'R4 event fault'); END`);
    } else {
      db.exec(`CREATE TRIGGER r4_redaction_fault BEFORE INSERT ON idempotency_records
        WHEN NEW.key = ${quote(key)} BEGIN SELECT RAISE(ABORT, 'R4 idempotency fault'); END`);
    }
    try {
      const response = await send('POST', `/spaces/${space}/redactions`, { target_type: 'post', target_id: item.post.id, reason: 'R4 transaction test' }, key);
      rollbackOutcomes.push({ stage, status: response.status, all_state_unchanged: isDeepStrictEqual(before, state()) });
    } finally { db.exec('DROP TRIGGER r4_redaction_fault'); }
  }
  record('U08', 'Failed redaction event/result insertion rolls back content, FTS, audit, event, and result',
    'both injected failures reject with all inspected state unchanged', rollbackOutcomes,
    rollbackOutcomes.every(outcome => outcome.status >= 500 && outcome.all_state_unchanged));

  const output = {
    reviewed_date: '2026-09-28', reviewed_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runtime: process.version, mode: 'owned temporary file SQLite + Fastify inject + native Response fixture; no model/host/network',
    legacy_fixture_note: 'Logical fixtures with fa1b35c full JSON and c4f041f exact reference shapes checked against git show; not full old-binary upgrade runs',
    probes: results, passed: results.filter(result => result.passes).length, failed: results.filter(result => !result.passes).length,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally {
  await app.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
