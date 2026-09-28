// Review-only counterexamples for fa1b35c. No user data, sockets, models, or global configuration.
// Run after pnpm build. Exit 1 means an expected product guarantee is still violated.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { buildApp } from '../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, SCHEMA_SQL } from '../../../packages/storage-sqlite/dist/index.js';
import activatePi from '../../../packages/adapter-pi/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-r2-'));
const db = new Database(join(directory, 'review.sqlite'));
const boot = bootstrapDatabase(db);
const storage = new SqliteStorage(db);
const app = buildApp({ storage });
const admin = boot.adminToken;
const results = [];
let serial = 0;
function record(id, description, expected, observed, passes) {
  results.push({ id, description, expected, observed, passes });
}
async function send(method, path, token, payload, key = `r2-${++serial}`) {
  const headers = { authorization: `Bearer ${token}`, 'idempotency-key': key };
  const res = await app.inject({ method, url: `/api/v1${path}`, headers, ...(payload === undefined ? {} : { payload }) });
  return { status: res.statusCode, body: res.json(), raw: res.payload };
}
function data(res) {
  if (res.status >= 400) throw new Error(`Fixture failed: ${res.status} ${res.body.error?.code}`);
  return res.body.data;
}
async function actor(name) {
  return data(await send('POST', '/admin/actors', admin, { kind: 'agent', display_name: name })).id;
}
async function credential(actor_id, space, capabilities) {
  return data(await send('POST', '/admin/credentials', admin, { actor_id, allowed_space_ids: [space], capabilities })).token;
}
const note = (body = 'Synthetic R2 fixture') => ({ kind: 'note', title: 'R2 note', summary: 'R2 fixture', body });

try {
  await app.ready();
  const space = data(await send('POST', '/spaces', admin, { slug: 'review-r2', objective: 'R2', rules: [] })).space.id;
  const writer = await actor('R2 writer');
  const reader = await actor('R2 reader');
  for (const [who, role] of [[writer, 'contributor'], [reader, 'observer']]) {
    data(await send('POST', `/spaces/${space}/memberships`, admin, { actor_id: who, role }));
  }
  const writeToken = await credential(writer, space, ['read', 'write']);
  const readToken = await credential(reader, space, ['read']);
  const noCapToken = await credential(writer, space, []);
  const t = data(await send('POST', `/spaces/${space}/threads`, writeToken, { title: 'R2 thread' })).thread.id;
  async function post(payload = note(), key) {
    return data(await send('POST', `/spaces/${space}/threads/${t}/posts`, writeToken, payload, key));
  }
  async function redact(id) {
    return send('POST', `/spaces/${space}/redactions`, admin, { target_type: 'post', target_id: id, reason: 'Synthetic R2 redaction' });
  }

  const inlinePayload = { title: 'R2 nested replay', initial_post: note('R2_NESTED_REDACTION_MARKER') };
  const inline = data(await send('POST', `/spaces/${space}/threads`, writeToken, inlinePayload, 'nested-replay'));
  data(await redact(inline.initial_post.post.id));
  const replay = await send('POST', `/spaces/${space}/threads`, writeToken, inlinePayload, 'nested-replay');
  record('S01', 'Redacted initial_post cannot reappear through thread.create replay', false,
    { status: replay.status, leaked: replay.raw.includes('R2_NESTED_REDACTION_MARKER') },
    !replay.raw.includes('R2_NESTED_REDACTION_MARKER'));

  const taggedPayload = { ...note(), tags: ['R2_PRIVATE_TAG'] };
  const tagged = await post(taggedPayload, 'tag-replay');
  data(await redact(tagged.post.id));
  const tagReplay = await send('POST', `/spaces/${space}/threads/${t}/posts`, writeToken, taggedPayload, 'tag-replay');
  record('S02', 'Redacted tags cannot reappear through post.create replay', false,
    { status: tagReplay.status, leaked: tagReplay.raw.includes('R2_PRIVATE_TAG') },
    !tagReplay.raw.includes('R2_PRIVATE_TAG'));

  const source = await post();
  const target1 = await post();
  const target2 = await post();
  const reason = await post();
  const challenges = [];
  for (const target of [target1, target2]) {
    challenges.push(data(await send('POST', `/spaces/${space}/relations`, writeToken, {
      source_ref: { post_id: source.post.id, revision: 1 },
      target_ref: { post_id: target.post.id, revision: 1 }, type: 'challenges',
    })));
  }
  const resolutionPayload = { expected_version: 1, reason_ref: { post_id: reason.post.id, revision: 1 } };
  data(await send('POST', `/spaces/${space}/relations/${challenges[0].id}/resolve`, writeToken, resolutionPayload, 'resolve-two-targets'));
  const resolveSecond = await send('POST', `/spaces/${space}/relations/${challenges[1].id}/resolve`, writeToken, resolutionPayload, 'resolve-two-targets');
  const secondState = storage.findRelationById(challenges[1].id).state;
  record('S03', 'Relation resolve idempotency must account for URL target', 'second target resolved, or an explicit conflict; never false success',
    { status: resolveSecond.status, returned_first_relation: resolveSecond.body.data?.relation.id === challenges[0].id, second_state: secondState },
    resolveSecond.status === 409 || (resolveSecond.status === 200 && resolveSecond.body.data?.relation.id === challenges[1].id && secondState === 'resolved'));

  const future = storage.getLatestEventSeq(space) + 10000;
  const payload = Buffer.from(JSON.stringify({ space_id: space, seq: future, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const sig = createHmac('sha256', 'detuned-dev-secret-key-min-32-bytes-long!').update(payload).digest('base64url');
  const forged = await send('POST', `/spaces/${space}/subscriptions`, writeToken, { consumer_key: 'forged-checkpoint', start: 'context_checkpoint', checkpoint_token: `${payload}.${sig}` });
  record('S04', 'Public development secret must not authorize a future checkpoint', '400/403/409/422 with no consumer beyond latest event',
    { status: forged.status, ack_ahead_of_latest: forged.body.data?.consumer.ack_seq > storage.getLatestEventSeq(space) },
    [400, 403, 409, 422].includes(forged.status));

  const ctx = data(await send('GET', `/spaces/${space}/context`, writeToken));
  const crossActor = await send('POST', `/spaces/${space}/subscriptions`, readToken, {
    consumer_key: 'foreign-checkpoint', start: 'context_checkpoint', checkpoint_token: ctx.checkpoint_token,
  });
  record('S05', 'Context checkpoint is bound to the requesting actor', '400/403/409/422', crossActor.status, [400, 403, 409, 422].includes(crossActor.status));

  const filtered = data(await send('POST', `/spaces/${space}/subscriptions`, readToken, {
    consumer_key: 'thread-relations', start: 'now', thread_ids: [t], event_types: ['relation.created'],
  }));
  const relation = data(await send('POST', `/spaces/${space}/relations`, writeToken, {
    source_ref: { post_id: source.post.id, revision: 1 },
    target_ref: { post_id: reason.post.id, revision: 1 }, type: 'challenges',
  }));
  const poll = data(await send('POST', `/spaces/${space}/consumers/${filtered.consumer.id}/poll`, readToken, { limit: 100 }));
  const delivered = poll.events.some(e => e.type === 'relation.created' && e.object_id === relation.id);
  record('S06', 'Thread filter retains a relation whose two endpoints are inside the subscribed thread', true, delivered, delivered);

  const noRead = await send('GET', `/spaces/${space}/context`, noCapToken);
  record('S07', 'Membership alone cannot bypass empty credential capabilities', '403', noRead.status, noRead.status === 403);

  const chinese = await send('POST', `/spaces/${space}/threads/${t}/posts`, writeToken, { ...note(), title: '图'.repeat(60) });
  record('S08', 'A legal 60-codepoint Chinese title is accepted', '201 (180 UTF-8 bytes is not over the 160-codepoint title limit)', chinese.status, chinese.status === 201);

  const badFailure = await send('POST', `/spaces/${space}/threads/${t}/posts`, writeToken, {
    ...note(), kind: 'failure', structured: {
      attempt: 'fixture', category: 'banana', assumptions: [], tested_scope: 'fixture only',
      expected: 'fixture', observed: 'fixture', ruled_out: 'this fixture only',
    },
  });
  record('S09', 'Accepted failure kind validates category and mandatory evidence/scope fields (M2.2 coverage)', '400/422', badFailure.status, [400, 422].includes(badFailure.status));

  const atomic = await post(note('R2_ATOMIC_ORIGINAL'));
  db.exec("CREATE TRIGGER r2_fail_redaction BEFORE INSERT ON redactions BEGIN SELECT RAISE(ABORT, 'synthetic r2 audit failure'); END");
  const failedRedact = await redact(atomic.post.id);
  db.exec('DROP TRIGGER r2_fail_redaction');
  const auditRows = db.prepare('SELECT count(*) AS n FROM redactions WHERE target_id = ?').get(atomic.post.id).n;
  const atomicState = storage.findPostById(atomic.post.id).lifecycle;
  const originalStillPresent = storage.getPostRevision(atomic.post.id, 1).body === 'R2_ATOMIC_ORIGINAL';
  record('S10', 'Failed redaction audit insert rolls back content and lifecycle changes', { status: 500, lifecycle: 'active', original_preserved: true, audit_rows: 0 },
    { status: failedRedact.status, lifecycle: atomicState, original_preserved: originalStillPresent, audit_rows: auditRows },
    failedRedact.status === 500 && atomicState === 'active' && originalStillPresent && auditRows === 0);

  const bootDb = new Database(join(directory, 'bootstrap.sqlite'));
  let firstBootThrew = false;
  let retryBoot;
  let credentials;
  try {
    bootDb.exec(SCHEMA_SQL);
    bootDb.exec("CREATE TRIGGER r2_fail_credential BEFORE INSERT ON credentials BEGIN SELECT RAISE(ABORT, 'synthetic r2 credential failure'); END");
    try { bootstrapDatabase(bootDb); } catch { firstBootThrew = true; }
    bootDb.exec('DROP TRIGGER r2_fail_credential');
  } finally { bootDb.close(); }
  const reopenedBootDb = new Database(join(directory, 'bootstrap.sqlite'));
  try {
    retryBoot = bootstrapDatabase(reopenedBootDb);
    credentials = reopenedBootDb.prepare('SELECT count(*) AS n FROM credentials').get().n;
  } finally { reopenedBootDb.close(); }
  record('S11', 'Bootstrap can recover after failure between admin actor and credential creation, including reopen', 'retry produces an admin credential and usable first token',
    { first_boot_threw: firstBootThrew, retry_is_new: retryBoot.isNewInstance, retry_has_token: Boolean(retryBoot.adminToken), credential_count: credentials },
    firstBootThrew && retryBoot.isNewInstance && Boolean(retryBoot.adminToken) && credentials === 1);

  const registered = new Map();
  activatePi({ registerTool(tool) { registered.set(tool.name, tool); }, registerCommand() {}, on() {} });
  const savedFetch = globalThis.fetch;
  let threw = false;
  let value;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Synthetic Pi fixture', retryable: false } }), { status: 403, headers: { 'content-type': 'application/json' } });
    try { value = await registered.get('forum_context').execute('r2-tool-error', { space_id: space }, new AbortController().signal); }
    catch { threw = true; }
  } finally { globalThis.fetch = savedFetch; }
  record('S12', 'Pi execute must throw for failure per the official extension contract', 'promise rejects',
    { threw, resolved_with_isError: value?.isError === true }, threw);

  const output = {
    reviewed_date: '2026-09-28', reviewed_commit: 'fa1b35c', runtime: process.version,
    mode: 'owned temporary file SQLite + Fastify inject; Pi registration/fetch fixture only',
    sqlite_journal_mode: db.pragma('journal_mode', { simple: true }),
    probes: results, passed: results.filter(r => r.passes).length, failed: results.filter(r => !r.passes).length,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally {
  await app.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
