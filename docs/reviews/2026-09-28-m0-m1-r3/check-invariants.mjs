// Review-only: owned temporary file databases, Fastify inject, controlled fetch fixtures.
// Run after pnpm build. Exit 1 denotes unmet product invariants, not a harness error.
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildApp } from '../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../packages/storage-sqlite/dist/index.js';
import { DetunedClient } from '../../../packages/client/dist/index.js';
import activatePi from '../../../packages/adapter-pi/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-r3-'));
const db = new Database(join(directory, 'review.sqlite'));
const boot = bootstrapDatabase(db);
const storage = new SqliteStorage(db);
const app = buildApp({ storage });
const results = [];
let serial = 0;
function record(id, description, expected, observed, passes) {
  results.push({ id, description, expected, observed, passes });
}
async function send(method, path, token, payload, key = `r3-${++serial}`) {
  const res = await app.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${token}`, 'idempotency-key': key,
  }, ...(payload === undefined ? {} : { payload }) });
  return { status: res.statusCode, body: res.json() };
}
function data(r) {
  if (r.status >= 400) throw new Error(`Fixture setup failed: ${r.status} ${r.body.error?.code}`);
  return r.body.data;
}
function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
const admin = boot.adminToken;
const note = body => ({ kind: 'note', title: 'R3 note', summary: 'Review fixture', body: body ?? 'Synthetic note' });
try {
  await app.ready();
  const spacePayload = { slug: 'review-r3', objective: 'R3 fixture', rules: [] };
  const firstSpace = data(await send('POST', '/spaces', admin, spacePayload, 'space-original'));
  const space = firstSpace.space.id;
  const writer = data(await send('POST', '/admin/actors', admin, { kind: 'agent', display_name: 'R3 writer' })).id;
  data(await send('POST', `/spaces/${space}/memberships`, admin, { actor_id: writer, role: 'contributor' }));
  async function credential(allowed_space_ids) {
    return data(await send('POST', '/admin/credentials', admin, { actor_id: writer, allowed_space_ids, capabilities: ['read', 'write'] })).token;
  }
  const token = await credential([space]);
  const emptyScopeToken = await credential([]);
  const threadPayload = { title: 'R3 original title' };
  const originalThread = data(await send('POST', `/spaces/${space}/threads`, token, threadPayload, 'thread-original')).thread;
  const thread = originalThread.id;
  async function post(payload = note(), key) {
    return data(await send('POST', `/spaces/${space}/threads/${thread}/posts`, token, payload, key));
  }
  const source = await post();
  const target = await post();
  const reason = await post();
  const rel = data(await send('POST', `/spaces/${space}/relations`, token, {
    source_ref: { post_id: source.post.id, revision: 1 }, target_ref: { post_id: target.post.id, revision: 1 }, type: 'challenges',
  }));
  const resolvePayload = { expected_version: 1, reason_ref: { post_id: reason.post.id, revision: 1 } };
  const firstResolution = data(await send('POST', `/spaces/${space}/relations/${rel.id}/resolve`, token, resolvePayload, 'resolve-original'));
  const sameResolution = data(await send('POST', `/spaces/${space}/relations/${rel.id}/resolve`, token, resolvePayload, 'resolve-original'));
  record('T01', 'An immediate resolve retry preserves its immutable resolution result', 'same resolution.id and version',
    { first_has_resolution: Boolean(firstResolution.resolution), replay_has_resolution: Boolean(sameResolution.resolution), replay_relation_version: sameResolution.relation.version },
    Boolean(firstResolution.resolution) && isDeepStrictEqual(firstResolution.resolution, sameResolution.resolution) && firstResolution.relation.version === sameResolution.relation.version);

  data(await send('PATCH', `/spaces/${space}/threads/${thread}`, token, { expected_version: 1, title: 'R3 changed title' }));
  const replayThread = data(await send('POST', `/spaces/${space}/threads`, token, threadPayload, 'thread-original')).thread;
  record('T02', 'Thread create replay does not silently become a newer operation version', { version: 1, original_title: true },
    { version: replayThread.version, original_title: replayThread.title === originalThread.title },
    replayThread.version === 1 && replayThread.title === originalThread.title);

  // Faithful legacy result shape: fa1b35c stored JSON.stringify(result), including SpaceRevision object.
  db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE operation = 'space.create' AND key = 'space-original'").run(JSON.stringify(firstSpace));
  const legacySpaceReplay = await send('POST', '/spaces', admin, spacePayload, 'space-original');
  record('T03', 'Legacy full-JSON space.create result can be replayed after upgrade', '201 with original space/revision',
    { status: legacySpaceReplay.status, error_code: legacySpaceReplay.body.error?.code ?? null },
    legacySpaceReplay.status === 201 && legacySpaceReplay.body.data?.revision?.revision === 1);

  const listed = data(await send('GET', '/spaces', emptyScopeToken));
  const direct = await send('GET', `/spaces/${space}/context`, emptyScopeToken);
  record('T04', 'An empty allowed-space set has the same deny semantics in enumeration and direct access', 'empty list and 403/404 direct read',
    { listed_spaces: listed.length, direct_context_status: direct.status }, listed.length === 0 && [403, 404].includes(direct.status));

  const redactionTarget = await post();
  const redactionPayload = { target_type: 'post', target_id: redactionTarget.post.id, reason: 'Synthetic R3 redaction' };
  const redact1 = data(await send('POST', `/spaces/${space}/redactions`, admin, redactionPayload, 'redact-retry'));
  const redact2 = data(await send('POST', `/spaces/${space}/redactions`, admin, redactionPayload, 'redact-retry'));
  const auditCount = db.prepare('SELECT count(*) AS n FROM redactions WHERE target_id = ?').get(redactionTarget.post.id).n;
  const eventCount = db.prepare("SELECT count(*) AS n FROM events WHERE object_id = ? AND type = 'post.redacted'").get(redactionTarget.post.id).n;
  record('T05', 'Redaction retry commits exactly one audit/result and one invalidation event', { same_id: true, audit_rows: 1, event_rows: 1 },
    { same_id: redact1.redaction_id === redact2.redaction_id, audit_rows: auditCount, event_rows: eventCount },
    redact1.redaction_id === redact2.redaction_id && auditCount === 1 && eventCount === 1);

  // A genuine historical fa1b35c v1 fixture: verified DDL, compatible rows, no instance_metadata, original full JSON result.
  const legacyPost = await post(note('R3_LEGACY_CACHE_MARKER'), 'legacy-post');
  const legacyPath = join(directory, 'legacy.sqlite');
  let legacyDb = new Database(legacyPath);
  try {
    const historicalSql = readFileSync(new URL('../../../tests/fixtures/historical-v1-schema.sql', import.meta.url), 'utf8');
    legacyDb.exec(historicalSql);
    legacyDb.pragma('foreign_keys = ON');
    legacyDb.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)').run('2026-09-28T00:00:00.000Z');
    for (const table of ['actors', 'credentials', 'spaces', 'space_revisions', 'memberships', 'threads', 'posts', 'post_revisions', 'events']) {
      const columns = legacyDb.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      const quoted = columns.map(c => `"${c}"`).join(',');
      const insert = legacyDb.prepare(`INSERT INTO ${table}(${quoted}) VALUES(${columns.map(() => '?').join(',')})`);
      for (const row of db.prepare(`SELECT ${quoted} FROM ${table}`).all()) insert.run(...columns.map(c => row[c]));
    }
    const recordRow = db.prepare("SELECT * FROM idempotency_records WHERE key = 'legacy-post'").get();
    recordRow.result_ref = JSON.stringify(legacyPost);
    const fields = Object.keys(recordRow);
    legacyDb.prepare(`INSERT INTO idempotency_records(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`).run(...fields.map(c => recordRow[c]));

    const preValid = !legacyDb.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get() &&
      !legacyDb.prepare("SELECT 1 FROM sqlite_master WHERE name='thread_versions'").get() &&
      legacyDb.pragma('foreign_key_check').length === 0;

    const credsBefore = legacyDb.prepare('SELECT count(*) AS n FROM credentials').get().n;
    const upgraded = bootstrapDatabase(legacyDb);
    const credsAfter = legacyDb.prepare('SELECT count(*) AS n FROM credentials').get().n;
    const cache = legacyDb.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'legacy-post'").get().result_ref;
    record('T06', 'An already initialized v1 upgrade preserves credentials and migrates old content caches',
      { extra_credentials: 0, returned_new_admin_token: false, cached_body: false },
      { extra_credentials: credsAfter - credsBefore, returned_new_admin_token: Boolean(upgraded.adminToken), cached_body: cache.includes('R3_LEGACY_CACHE_MARKER') },
      preValid && credsAfter === credsBefore && !upgraded.adminToken && !cache.includes('R3_LEGACY_CACHE_MARKER'));
  } finally { legacyDb.close(); }

  const futureDb = new Database(join(directory, 'future-bootstrap.sqlite'));
  try {
    futureDb.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES(999, '2026-09-28T00:00:00.000Z')");
    const tablesBefore = futureDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n;
    let rejected = false;
    try { bootstrapDatabase(futureDb); } catch { rejected = true; }
    const tablesAfter = futureDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n;
    record('T07', 'Unsupported schema version is rejected before any DDL mutation', { rejected: true, added_tables: 0 },
      { rejected, added_tables: tablesAfter - tablesBefore }, rejected && tablesAfter === tablesBefore);
  } finally { futureDb.close(); }

  const consumer = data(await send('POST', `/spaces/${space}/subscriptions`, token, { consumer_key: 'acl-test', start: 'beginning' })).consumer;
  const batch = data(await send('POST', `/spaces/${space}/consumers/${consumer.id}/poll`, token, { limit: 1 }));
  data(await send('PATCH', `/spaces/${space}/memberships/${writer}`, admin, { role: 'observer' }));
  const stalePoll = await send('POST', `/spaces/${space}/consumers/${consumer.id}/poll`, token, { limit: 1 });
  const beforeAck = storage.findConsumerById(consumer.id);
  const staleAck = await send('POST', `/spaces/${space}/consumers/${consumer.id}/ack`, token, { batch_id: batch.batch_id, next_cursor: batch.next_cursor });
  const afterAck = storage.findConsumerById(consumer.id);
  const consumerUnchanged = isDeepStrictEqual(beforeAck, afterAck);
  record('T08', 'ACL epoch invalidation applies consistently to poll and ack', 'both 409 RESYNC_REQUIRED without advancing ack',
    { poll_status: stalePoll.status, poll_error: stalePoll.body.error?.code, ack_status: staleAck.status, consumer_unchanged: consumerUnchanged },
    stalePoll.status === 409 && staleAck.status === 409 && staleAck.body.error?.code === 'RESYNC_REQUIRED' && consumerUnchanged);

  const registered = new Map();
  activatePi({ registerTool(t) { registered.set(t.name, t); }, registerCommand() {}, on() {} });
  const savedFetch = globalThis.fetch;
  try {
    const begun = gate();
    const finish = gate();
    let fetchSignal;
    let fetchCalls = 0;
    const ctl = new AbortController();
    globalThis.fetch = async (_url, opts) => {
      fetchCalls++;
      fetchSignal = opts.signal;
      begun.release();
      await finish.promise;
      if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return new Response(JSON.stringify({ data: { fixture: true } }), { status: 200 });
    };
    const running = registered.get('forum_context').execute('r3-flight', { space_id: space }, ctl.signal).then(() => 'resolved', () => 'rejected');
    await begun.promise;
    ctl.abort();
    const forwarded = fetchSignal.aborted;
    finish.release();
    const outcome = await running;
    record('T09', 'Pi cancellation while a request is running reaches fetch and rejects without retry', { fetch_aborted: true, outcome: 'rejected', calls: 1 },
      { fetch_aborted: forwarded, outcome, calls: fetchCalls }, forwarded && outcome === 'rejected' && fetchCalls === 1);

    const readingBody = gate();
    const finishBody = gate();
    const bodyCtl = new AbortController();
    let bodyFetchSignal;
    globalThis.fetch = async (_url, opts) => {
      bodyFetchSignal = opts.signal;
      return { ok: true, status: 200, json: async () => {
        readingBody.release();
        await finishBody.promise;
        if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        return { data: { fixture: true } };
      } };
    };
    const client = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });
    const reading = client.request({ method: 'GET', path: '/fixture', signal: bodyCtl.signal }).then(() => 'resolved', () => 'rejected');
    await readingBody.promise;
    bodyCtl.abort();
    const bodyForwarded = bodyFetchSignal.aborted;
    finishBody.release();
    const bodyOutcome = await reading;
    record('T10', 'HTTP cancellation remains active until response body parsing completes', { fetch_aborted: true, outcome: 'rejected' },
      { fetch_aborted: bodyForwarded, outcome: bodyOutcome }, bodyForwarded && bodyOutcome === 'rejected');
  } finally { globalThis.fetch = savedFetch; }

  const out = { reviewed_date: '2026-09-28', reviewed_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runtime: process.version, mode: 'temporary SQLite + Fastify inject + controlled Pi/fetch fixtures; no model/host run',
    legacy_fixture_note: 'Logical v1 fixture, missing instance_metadata and containing exact prior full-JSON result shapes; not a complete prior-version binary upgrade run',
    probes: results, passed: results.filter(r => r.passes).length, failed: results.filter(r => !r.passes).length };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  process.exitCode = out.failed ? 1 : 0;
} finally {
  await app.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
