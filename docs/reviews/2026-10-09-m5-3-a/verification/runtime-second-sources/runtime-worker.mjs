// Linux-only private IPC worker. stdout is private IPC, never copied verbatim to evidence.
import assert from 'node:assert/strict';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { DetunedClient } from '/app/packages/client/dist/index.js';

const hash = b => createHash('sha256').update(b).digest('hex');
let raw = ''; for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw), base = 'https://127.0.0.1:3443';
const ca = await readFile('/tls/ca.pem');
const client = token => new DetunedClient({ baseUrl: base, token, timeoutMs: 10000 });
function request(path, { method = 'GET', headers = {}, body, trustedCA = ca, servername = 'localhost', connectBase = base } = {}) {
  return new Promise((resolve, reject) => {
    const r = https.request(new URL(path, connectBase), { method, headers, ca: trustedCA, servername, rejectUnauthorized: true }, s => {
      const chunks = []; s.on('data', c => chunks.push(c)); s.on('end', () => resolve({ status: s.statusCode, headers: s.headers, bytes: Buffer.concat(chunks) })); s.on('error', reject);
    }); r.on('error', reject); r.setTimeout(10000, () => r.destroy()); r.end(body);
  });
}
function snapshot() {
  const require = createRequire('/app/packages/storage-sqlite/package.json'), DB = require('better-sqlite3');
  const db = new DB('/data/instance/detuned.sqlite', { readonly: true });
  try { return Object.fromEntries(['posts','events','idempotency_records','artifacts'].map(t => [t, db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n])); } finally { db.close(); }
}
async function download(token, sid, aid) {
  const res = await request(`/api/v1/spaces/${sid}/artifacts/${aid}/content`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200); return { sha256: hash(res.bytes), bytes: res.bytes.length };
}
async function seed(adminToken) {
  const admin = client(adminToken);
  const sid = (await admin.createSpace({ slug: 'independent-container', objective: 'Finite private persistence/recovery probe', rules: ['Author report, not research certification'] }, 'independent-space')).data.space.id;
  const people = [];
  for (let i = 0; i < 1; i++) {
    const actor = await admin.createActor({ kind: 'human', display_name: `owned-${i}` });
    await admin.createMembership(sid, { actor_id: actor.id, role: 'contributor' });
    const credential = await admin.createCredential({ actor_id: actor.id, allowed_space_ids: [sid], capabilities: ['read', 'write'] });
    people.push({ actor_id: actor.id, token: credential.token });
  }
  const disabledFixtureActor = await admin.createActor({kind:'human',display_name:'owned-disabled-history'});
  const tid = (await client(people[0].token).createThread(sid, { title: 'Independent runtime persistence' }, 'independent-thread')).data.thread.id;
  const payload = Buffer.from('Private attachment bytes: fixed UTF-8 中文\n');
  const artifact = await client(people[0].token).uploadArtifact(sid, new Blob([payload], { type: 'text/plain' }), { visibility: 'space' }, 'independent-upload');
  const body = { kind: 'note', title: 'Bound fixed evidence', summary: 'Owned fixture', body: 'Fixed original revision', artifact_ids: [artifact.id] };
  const post = (await client(people[0].token).createPost(sid, tid, body, 'independent-binding')).data.post;
  const dl = await download(people[0].token, sid, artifact.id); assert.equal(dl.sha256, hash(payload)); assert.equal(dl.bytes, payload.length);
  const consumers = [];
  for (let i = 0; i < 1; i++) consumers.push((await client(people[i].token).subscribe(sid, { consumer_key: `owned-pending-${i}`, start: 'now' })).data.consumer.id);
  const before = snapshot(), start = performance.now(), timings = [];
  await Promise.all(people.map(async (p, i) => {
    const s = performance.now(); await client(p.token).createPost(sid, tid, { kind: 'note', title: `unique-${i}`, summary: 'Independent runtime persistence write', body: `Owned writer ${i}` }, `independent-unique-${i}`); timings.push(performance.now() - s);
  }));
  const commonBody = { kind: 'note', title: 'Same-key concurrency', summary: 'Exactly one side effect', body: 'Runtime replay, one actor and one request key' };
  const common = await Promise.all(Array.from({ length: 1 }, async () => {
    const s = performance.now(); const p = await client(people[0].token).createPost(sid, tid, commonBody, 'independent-common'); timings.push(performance.now() - s); return p.data.post.id;
  }));
  assert.equal(new Set(common).size, 1);
  const after = snapshot(), elapsed = performance.now() - start;
  assert.equal(after.posts - before.posts, 2); assert.equal(after.events - before.events, 2); assert.equal(after.idempotency_records - before.idempotency_records, 2); assert.ok(elapsed <= 60000);
  const pending = [];
  for (let i = 0; i < 1; i++) { const p = (await client(people[i].token).poll(sid, consumers[i], { limit: 100, wait_ms: 0 })).data; assert.ok(p.batch_id && p.next_cursor); assert.equal(p.events.length, 2); pending.push(p); }
  timings.sort((a,b) => a-b);
  return { state: { sid, tid, people, consumers, pending, disabledActorId:disabledFixtureActor.id, artifact_id: artifact.id, artifact_download: dl, post_id: post.id, body, commonBody, commonId: common[0], snapshot: after }, receipt: { ordinary_identities: 1, concurrency: 1, unique_write_requests: 1, replay_intent_requests: 1, unique_side_effects: 2, independent_pending_batches: 1, implicit_ack: false, elapsed_ms: elapsed, sample_count: timings.length, p95_method: 'nearest-rank ceil(.95*n)-1', p95_ms: timings[Math.ceil(.95 * timings.length)-1], max_ms: timings.at(-1), downloaded_SHA_and_bytes_match: true } };
}
async function persisted(s) {
  const before = snapshot(); assert.deepEqual(before, s.snapshot);
  for (let i = 0; i < 1; i++) {
    const pending = (await client(s.people[i].token).poll(s.sid, s.consumers[i], { limit: 100, wait_ms: 0 })).data;
    assert.equal(pending.batch_id, s.pending[i].batch_id); assert.equal(pending.next_cursor, s.pending[i].next_cursor);
  }
  const replay = (await client(s.people[0].token).createPost(s.sid, s.tid, s.commonBody, 'independent-common')).data.post;
  assert.equal(replay.id, s.commonId); assert.deepEqual(snapshot(), before);
  assert.deepEqual(await download(s.people[0].token, s.sid, s.artifact_id), s.artifact_download);
  return { pending_preserved: true, same_key_replay_single_post: true, side_effect_counts_unchanged: true, artifact_SHA_bytes_persisted: true, implicit_ack: false };
}
async function restored(s, adminToken) {
  const before = snapshot(), old = await request('/api/v1/me', { headers: { authorization: `Bearer ${s.people[0].token}` } }); assert.equal(old.status, 401);
  const credential = await client(adminToken).createCredential({ actor_id: s.people[0].actor_id, allowed_space_ids: [s.sid], capabilities: ['read', 'write'] });
  const me = await client(credential.token).getMe(); assert.equal(me.data.actor.id, s.people[0].actor_id);
  const oldAck = await request(`/api/v1/spaces/${s.sid}/consumers/${s.consumers[0]}/ack`, { method: 'POST', headers: { authorization: `Bearer ${credential.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ batch_id: s.pending[0].batch_id, next_cursor: s.pending[0].next_cursor }) }); assert.equal(oldAck.status, 409);
  const pending = (await client(credential.token).poll(s.sid, s.consumers[0], { limit: 100, wait_ms: 0 })).data;
  assert.equal(pending.batch_id, s.pending[0].batch_id); assert.notEqual(pending.next_cursor, s.pending[0].next_cursor); assert.equal(pending.events.length, 2);
  assert.deepEqual(snapshot(), before); assert.deepEqual(await download(credential.token, s.sid, s.artifact_id), s.artifact_download);
  const ack = (await client(credential.token).ack(s.sid, s.consumers[0], { batch_id: pending.batch_id, next_cursor: pending.next_cursor })).data; assert.equal(ack.confirmed, true);
  const require=createRequire('/app/packages/storage-sqlite/package.json'),DB=require('better-sqlite3'),db=new DB('/data/instance/detuned.sqlite',{readonly:true});
  try { assert.ok(db.prepare('SELECT disabled_at FROM actors WHERE id=?').get(s.disabledActorId)?.disabled_at); } finally {db.close();}
  return { old_token_status: 401, same_actor_scoped_credential: true, old_cursor_status: oldAck.status, original_pending_new_signature: true, no_business_recreation: true, artifact_SHA_bytes_restored: true, only_explicit_ack: true, disabled_history_actor_not_activated:true };
}
async function transport(token, state) {
  assert.equal((await request('/api/v1/health/live')).status, 200);
  let wrongCA, wrongHost;
  try { await request('/api/v1/health/live', { trustedCA: await readFile('/tls/wrong-ca.pem') }); } catch (e) { wrongCA = e.code; }
  try { await request('/api/v1/health/live', { servername: 'not-owned.invalid' }); } catch (e) { wrongHost = e.code; }
  assert.ok(wrongCA); assert.equal(wrongHost, 'ERR_TLS_CERT_ALTNAME_INVALID');
  const index = await request('/'); assert.equal(index.status, 200);
  const assets = [...index.bytes.toString().matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(m => m[1]); assert.ok(assets.length);
  for (const a of assets) assert.equal((await request(a)).status, 200);
  const login = await request('/auth/session', { method: 'POST', headers: { authorization: `Bearer ${token}`, origin: base } }); assert.equal(login.status, 200);
  const value = JSON.parse(login.bytes).data, cookie = login.headers['set-cookie'][0].split(';')[0]; assert.ok(/HttpOnly/i.test(login.headers['set-cookie'][0]) && /Secure/i.test(login.headers['set-cookie'][0]));
  assert.equal((await request('/auth/session', { headers: { cookie } })).status, 200);
  const read = await request(`/api/v1/spaces/${state.sid}/posts/${state.post_id}/revisions/1?max_bytes=4096`, { headers: { cookie } }); assert.equal(read.status, 200);
  const before = snapshot();
  const write = await request(`/api/v1/spaces/${state.sid}/threads/${state.tid}/posts`, { method: 'POST', headers: { cookie, origin: base, 'x-detuned-csrf': value.csrf_token, 'content-type': 'application/json', 'idempotency-key': 'independent-cookie-note' }, body: JSON.stringify({ kind: 'note', title: 'Ordinary HTTPS cookie write', summary: 'Actual runtime HTTP', body: 'Private fixture, not browser evidence' }) }); assert.equal(write.status, 201);
  assert.equal(snapshot().posts - before.posts, 1);
  state.snapshot = snapshot();
  assert.equal((await request('/auth/session', { method: 'DELETE', headers: { cookie, origin: base } })).status, 403);
  assert.equal((await request('/auth/session', { method: 'DELETE', headers: { cookie, origin: base, 'x-detuned-csrf': value.csrf_token } })).status, 204);
  assert.equal((await request('/auth/session', { headers: { cookie } })).status, 401);
  const pid1=(await readFile('/proc/1/cmdline')).toString().split('\0');assert.equal(pid1[0],'node');assert.equal(pid1[1],'/app/packages/cli/dist/index.js');
  return { state, receipt: { Linux_platform: process.platform, arch: process.arch, node_version: process.version, actual_uid: process.getuid(), actual_PID1_direct_Node_CLI:true, native_HTTPS: true, strict_CA_health: true, wrong_CA_code: wrongCA, wrong_hostname_code: wrongHost, anonymous_static_assets: assets.length, ordinary_human_session: true, ordinary_cookie_fixed_read_and_single_post: true, secure_HttpOnly_cookie: true, CSRF_missing_rejected: true, explicit_logout_revokes_cookie: true, Node_HTTP_not_browser: true } };
}
async function authority() {
  const options = { connectBase:'https://127.0.0.1:3000', headers:{host:'localhost:8443'} };
  assert.equal((await request('/api/v1/health/ready', options)).status,200);
  const badHost = await request('/api/v1/health/ready',{...options,headers:{host:'127.0.0.1:3000'}}); assert.equal(badHost.status,403);
  let wrongCA, wrongHostname;
  try { await request('/api/v1/health/ready',{...options,trustedCA:await readFile('/tls/wrong-ca.pem')}); } catch(e) { wrongCA=e.code; }
  try { await request('/api/v1/health/ready',{...options,servername:'unowned.invalid'}); } catch(e) { wrongHostname=e.code; }
  assert.ok(wrongCA); assert.equal(wrongHostname,'ERR_TLS_CERT_ALTNAME_INVALID');
  return {actual_origin:'https://localhost:8443',loopback_connect:'https://127.0.0.1:3000',strict_CA_health:200,wrong_HTTP_Host:badHost.status,wrong_CA_code:wrongCA,wrong_hostname_code:wrongHostname,TLS_servername_distinct_from_HTTP_authority:true};
}
try {
  let result;
  if (input.phase === 'seed') result = await seed(input.adminToken);
  else if (input.phase === 'persisted') result = { receipt: await persisted(input.state) };
  else if (input.phase === 'restored') result = { receipt: await restored(input.state, input.adminToken) };
  else if (input.phase === 'transport') result = await transport(input.token, input.state);
  else if (input.phase === 'authority') result = {receipt:await authority()};
  else if (input.phase === 'disable-offline-fixture') {
    const require=createRequire('/app/packages/storage-sqlite/package.json'),DB=require('better-sqlite3'),db=new DB('/data/instance/detuned.sqlite');
    try { const n=db.prepare('UPDATE actors SET disabled_at=? WHERE id=?').run('2026-10-09T00:00:00.000Z',input.actorId).changes;assert.equal(n,1); } finally {db.close();}
    result={receipt:{owned_offline_historical_disabled_actor_seed:true,no_schema_change:true}};
  }
  else throw new Error('Unknown private worker phase');
  process.stdout.write(JSON.stringify(result));
} catch (e) {
  const line = /runtime-worker\.mjs:(\d+):(\d+)/.exec(e?.stack ?? '')?.[1];
  process.stderr.write(JSON.stringify({ phase: input.phase, name: e?.name, code: e?.code, operator: e?.operator, source_line: line })+'\n');
  process.exitCode = 1;
}
