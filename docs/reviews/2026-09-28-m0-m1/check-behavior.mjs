// Review-only probes. Uses an owned temporary directory and Fastify injection.
// Run after `pnpm build`; no model calls, user data, or listening socket required.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildApp } from '../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase, DirectoryLock } from '../../../packages/storage-sqlite/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-'));
const db = new Database(join(directory, 'review.sqlite'));
const boot = bootstrapDatabase(db);
const storage = new SqliteStorage(db);
const app = buildApp({ storage });
const results = [];
let serial = 0;

function record(id, description, expected, observed, passes) {
  results.push({ id, description, expected, observed, passes });
}
async function send(method, path, token, payload, key = `review-${++serial}`) {
  const headers = { authorization: `Bearer ${token}` };
  if (key !== null) headers['idempotency-key'] = key;
  const res = await app.inject({ method, url: `/api/v1${path}`, headers, ...(payload === undefined ? {} : { payload }) });
  let body;
  try { body = res.json(); } catch { body = {}; }
  return { status: res.statusCode, body, raw: res.payload };
}
function data(res) {
  if (res.status >= 400) throw new Error(`Fixture failed: ${res.status} ${res.body.error?.code}`);
  return res.body.data;
}
const admin = boot.adminToken;
async function actor(name) {
  return data(await send('POST', '/admin/actors', admin, { kind: 'agent', display_name: name })).id;
}
async function credential(actor_id, allowed_space_ids, capabilities) {
  return data(await send('POST', '/admin/credentials', admin, { actor_id, allowed_space_ids, capabilities })).token;
}
async function membership(space, who, role) {
  return data(await send('POST', `/spaces/${space}/memberships`, admin, { actor_id: who, role }));
}
async function thread(space, token, title, initial_post) {
  return data(await send('POST', `/spaces/${space}/threads`, token, { title, ...(initial_post ? { initial_post } : {}) }));
}
const note = (body = 'Synthetic review fixture') => ({ kind: 'note', title: 'Review note', summary: 'Review fixture', body });

try {
  await app.ready();
  const spaceA = data(await send('POST', '/spaces', admin, { slug: 'review-a', objective: 'A', rules: [] })).space.id;
  const spaceB = data(await send('POST', '/spaces', admin, { slug: 'review-b', objective: 'B', rules: [] })).space.id;
  const writer = await actor('review-writer');
  await membership(spaceA, writer, 'contributor');
  await membership(spaceB, writer, 'contributor');
  const writeToken = await credential(writer, [spaceA, spaceB], ['read', 'write']);
  const readToken = await credential(writer, [spaceA], ['read']);
  const scopedToken = await credential(writer, [spaceA], ['read', 'write']);

  const ro = await send('POST', `/spaces/${spaceA}/threads`, readToken, { title: 'Read token must not write' });
  record('R01', 'Read-only capability cannot create a thread', '403', ro.status, ro.status === 403);

  const listed = data(await send('GET', '/spaces', scopedToken));
  const me = data(await send('GET', '/me', scopedToken));
  const leaked = { spaces: listed.some(s => s.id === spaceB), me: me.visible_spaces.some(s => s.id === spaceB) };
  record('R02', 'A-scoped token must not enumerate B', { spaces: false, me: false }, leaked, !leaked.spaces && !leaked.me);

  const unknown = await send('POST', `/spaces/${spaceA}/threads`, writeToken, { title: 'Unknown field', extra_unknown_field: true });
  record('R03a', 'HTTP rejects unknown schema properties', '400/422', unknown.status, [400, 422].includes(unknown.status));
  const oversize = await send('POST', `/spaces/${spaceA}/threads`, writeToken, { title: 'x'.repeat(161) });
  record('R03b', 'HTTP enforces title length <= 160', '400/422', oversize.status, [400, 422].includes(oversize.status));
  const t1 = (await thread(spaceA, writeToken, 'Thread one')).thread.id;
  const t2 = (await thread(spaceA, writeToken, 'Thread two')).thread.id;
  const noStructured = await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, { kind: 'claim', title: 'Incomplete claim', summary: 'No scope', body: 'No structured claim fields' });
  record('R03c', 'Claim without required structured fields is rejected', '400/422', noStructured.status, [400, 422].includes(noStructured.status));

  const target = data(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, note())).post.id;
  const inline = await thread(spaceA, writeToken, 'Initial post references', { ...note(), refs: [{ type: 'cites', target_ref: { post_id: target, revision: 1 } }] });
  const refCount = db.prepare('SELECT count(*) AS n FROM relations WHERE source_post_id = ?').get(inline.initial_post.post.id).n;
  record('R04', 'initial_post persists its declared relation', 1, refCount, refCount === 1);

  const payload = note('REVIEW_REDACTION_MARKER');
  const first = data(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, payload, 'same-key-two-targets'));
  const second = await send('POST', `/spaces/${spaceA}/threads/${t2}/posts`, writeToken, payload, 'same-key-two-targets');
  const rightTarget = second.status === 201 && second.body.data.post.thread_id === t2 && second.body.data.post.id !== first.post.id;
  record('R05a', 'Idempotency scope includes target thread', 'new post in thread two', { status: second.status, reused_first_post: second.body.data?.post.id === first.post.id }, rightTarget);
  const noKey1 = await send('POST', `/spaces/${spaceA}/threads`, writeToken, { title: 'Missing key' }, null);
  const noKey2 = await send('POST', `/spaces/${spaceA}/threads`, writeToken, { title: 'Missing key' }, null);
  record('R05b', 'Writes require a durable idempotency key', 'both 400/422', [noKey1.status, noKey2.status], [noKey1, noKey2].every(r => [400, 422].includes(r.status)));

  const redact = await send('POST', `/spaces/${spaceA}/redactions`, admin, { target_type: 'post', target_id: first.post.id, reason: 'Synthetic review probe' });
  data(redact);
  const normalRead = await send('GET', `/spaces/${spaceA}/posts/${first.post.id}`, writeToken);
  const history = await send('GET', `/spaces/${spaceA}/posts/${first.post.id}/revisions`, writeToken);
  const replay = await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, payload, 'same-key-two-targets');
  record('R06', 'Redaction covers revision listing and idempotent replay', { normal: 410, history_leak: false, replay_leak: false }, { normal: normalRead.status, history_leak: history.raw.includes('REVIEW_REDACTION_MARKER'), replay_leak: replay.raw.includes('REVIEW_REDACTION_MARKER') }, normalRead.status === 410 && !history.raw.includes('REVIEW_REDACTION_MARKER') && !replay.raw.includes('REVIEW_REDACTION_MARKER'));

  const ownerA = await actor('review-owner-a');
  await membership(spaceA, ownerA, 'owner');
  const ownerAToken = await credential(ownerA, [spaceA], ['read', 'write']);
  const tb = (await thread(spaceB, writeToken, 'Space B private thread')).thread.id;
  const victim = data(await send('POST', `/spaces/${spaceB}/threads/${tb}/posts`, writeToken, note())).post.id;
  const crossRedact = await send('POST', `/spaces/${spaceA}/redactions`, ownerAToken, { target_type: 'post', target_id: victim, reason: 'Synthetic cross-space probe' });
  const victimState = storage.findPostById(victim).lifecycle;
  record('R07', 'A owner cannot redact B post through A route', { status: 404, lifecycle: 'active' }, { status: crossRedact.status, lifecycle: victimState }, crossRedact.status === 404 && victimState === 'active');

  const consumer = data(await send('POST', `/spaces/${spaceA}/subscriptions`, writeToken, { consumer_key: 'forged-cursor', start: 'beginning', event_types: [] })).consumer;
  const polled = data(await send('POST', `/spaces/${spaceA}/consumers/${consumer.id}/poll`, writeToken, { limit: 1 }));
  const future = storage.getLatestEventSeq(spaceA) + 10000;
  const cursorBody = Buffer.from(JSON.stringify({ consumer_id: consumer.id, batch_id: polled.batch_id, through_seq: future, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const signature = createHmac('sha256', 'detuned-dev-secret-key-min-32-bytes-long!').update(cursorBody).digest('base64url');
  const forgedAck = await send('POST', `/spaces/${spaceA}/consumers/${consumer.id}/ack`, writeToken, { batch_id: polled.batch_id, next_cursor: `${cursorBody}.${signature}` });
  record('R08', 'ACK cannot advance beyond persisted delivery batch', '409 ACK_INVALID and no future ack_seq', { status: forgedAck.status, ack_is_future: storage.findConsumerById(consumer.id).ack_seq > storage.getLatestEventSeq(spaceA) }, forgedAck.status === 409 && storage.findConsumerById(consumer.id).ack_seq <= storage.getLatestEventSeq(spaceA));

  const filtered = data(await send('POST', `/spaces/${spaceA}/subscriptions`, writeToken, { consumer_key: 'different-filter', start: 'now', event_types: ['post.created'], thread_ids: [t2] }));
  record('R09a', 'New filters do not silently reuse a different subscription', { event_types: ['post.created'], thread_ids: [t2] }, { event_types: filtered.subscription.event_types, thread_filter_matches: filtered.subscription.thread_ids.includes(t2) }, filtered.subscription.event_types.length === 1 && filtered.subscription.event_types[0] === 'post.created' && filtered.subscription.thread_ids.includes(t2));
  const otherActor = await actor('thread-filter-reader');
  await membership(spaceA, otherActor, 'observer');
  const otherToken = await credential(otherActor, [spaceA], ['read']);
  const threadSub = data(await send('POST', `/spaces/${spaceA}/subscriptions`, otherToken, { consumer_key: 'only-t2', start: 'now', event_types: ['post.created'], thread_ids: [t2] }));
  const outside = data(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, note())).post.id;
  const filteredPoll = data(await send('POST', `/spaces/${spaceA}/consumers/${threadSub.consumer.id}/poll`, otherToken, { limit: 100 }));
  const wrongThread = filteredPoll.events.some(e => e.object_id === outside);
  record('R09b', 'Thread-filtered subscription excludes other thread posts', false, wrongThread, !wrongThread);

  const migrationRows = db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n;
  record('R10', 'Fresh initialized DB records applied migration version', '>= 1', migrationRows, migrationRows >= 1);

  const lockDirectory = join(directory, 'dead-lock');
  const lockModuleUrl = new URL('../../../packages/storage-sqlite/dist/lock.js', import.meta.url).href;
  const childSource = `import { DirectoryLock } from ${JSON.stringify(lockModuleUrl)}; new DirectoryLock(process.argv[1]).acquire();`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', childSource, lockDirectory], { encoding: 'utf8' });
  if (child.status !== 0) throw new Error(`Lock fixture child failed: ${child.stderr}`);
  const retryLock = new DirectoryLock(lockDirectory);
  let recovered = false;
  try { retryLock.acquire(); recovered = true; } catch {} finally { retryLock.release(); }
  record('R11', 'Lock can recover after owning process is gone', true, recovered, recovered);

  const wal = db.pragma('journal_mode', { simple: true });
  const output = { reviewed_date: '2026-09-28', runtime: process.version, sqlite_journal_mode: wal, mode: 'file-backed temporary SQLite + Fastify inject', probes: results, passed: results.filter(r => r.passes).length, failed: results.filter(r => !r.passes).length };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output.failed ? 1 : 0;
} finally {
  await app.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
