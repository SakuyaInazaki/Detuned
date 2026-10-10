import assert from 'node:assert/strict';
import {mkdtemp, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import Database from 'better-sqlite3';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {bootstrapDatabase, SqliteStorage} from '../../../../packages/storage-sqlite/dist/index.js';
import {HmacTokenSigner} from '../../../../packages/core/dist/index.js';

// Only owned fixture state; no ambient profiles, accounts, models or external services.
const evidence = new URL('.', import.meta.url);
const receiptName = process.argv[2] ?? 'independent-catalog-first.receipt.json';
assert.match(receiptName, /^[a-z0-9-]+\.receipt\.json$/);
const receipt = {scope: 'Real SQLite and loopback HTTP catalog checks', checks: [], cleanup: null};
const owned = await mkdtemp('/private/tmp/detuned-catalog-independent-');
let db, app, base, admin;
const clock = {value: Date.parse('2026-11-01T00:00:00Z'), now() {return new Date(this.value);}, nowIso() {return this.now().toISOString();}};
const logs = [], selects = [];
let captureSelects = false, key = 0;
function ok(value, label) {assert.equal(Boolean(value), true, label);}
async function request(route, token, query = {}, method = 'GET', body) {
  const url = new URL('/api/v1' + route, base);
  for (const [name, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(name, String(value));
  const response = await fetch(url, {method, headers: {authorization: `Bearer ${token}`, ...(method === 'GET' ? {} : {'idempotency-key': 'private-catalog-' + ++key}), ...(body === undefined ? {} : {'content-type': 'application/json'})}, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(5000)});
  const wire = await response.text();
  return {status: response.status, wire, bytes: Buffer.byteLength(wire, 'utf8'), json: JSON.parse(wire)};
}
async function seed(route, body, method = 'POST', token = admin) {
  clock.value += 60000; // Controlled refill, retaining default production budgets.
  const r = await request(route, token, {}, method, body);
  ok(r.status < 300, 'legal HTTP fixture seed'); return r.json.data;
}
async function group(name, run) {const details = await run(); receipt.checks.push({name, passed: true, details});}
function error(r, status, code) {ok(r.status === status && r.json.error?.code === code, 'fixed expected HTTP error');}
function catalog(post, space) {return `/spaces/${space}/posts/${post}/revisions/catalog`;}
function artifacts(post, space, rev) {return `/spaces/${space}/posts/${post}/revisions/${rev}/artifacts`;}
function publicKeys(value, names) {ok(Object.keys(value).sort().join(',') === names.sort().join(','), 'exact public projection keys');}

try {
  db = new Database(path.join(owned, 'forum.sqlite'));
  admin = bootstrapDatabase(db).adminToken; ok(typeof admin === 'string', 'fresh private bootstrap');
  const storage = new SqliteStorage(db), signer = new HmacTokenSigner();
  const secret = storage.getInstanceSecret();
  const originalPrepare = db.prepare.bind(db);
  db.prepare = function(sql) {if (captureSelects && /^\s*SELECT\b/i.test(sql) && /post_revisions/i.test(sql)) selects.push(sql); return originalPrepare(sql);};
  app = buildApp({storage, clock, requestLogSink: record => {logs.push(record);}});
  await app.listen({host: '127.0.0.1', port: 0});
  const address = app.server.address(); ok(address && typeof address !== 'string', 'private listener');
  base = `http://127.0.0.1:${address.port}`;
  const s = (await seed('/spaces', {slug: 'catalog-private', objective: 'Private catalog verification', rules: []})).space.id;
  const other = (await seed('/spaces', {slug: 'catalog-other', objective: 'Other private space', rules: []})).space.id;
  const thread = (await seed(`/spaces/${s}/threads`, {title: 'Catalog private thread'})).thread.id;
  const identities = [];
  for (const role of ['contributor', 'observer', 'observer']) {
    const actor = (await seed('/admin/actors', {kind: 'human', display_name: 'Private catalog ' + role})).id;
    await seed(`/spaces/${s}/memberships`, {actor_id: actor, role});
    const c = await seed('/admin/credentials', {actor_id: actor, allowed_space_ids: [s], capabilities: ['read', 'write']});
    identities.push({actor, token: c.token, credential: c.credential_id});
  }
  const [writer, observer, peer] = identities;
  const material = {kind: 'note', title: 'Private catalog source', summary: 'Metadata only', body: 'Ordinary research ' + '研究🧪'.repeat(3000)};
  const post = (await seed(`/spaces/${s}/threads/${thread}/posts`, material, 'POST', writer.token)).post.id;
  const second = (await seed(`/spaces/${s}/threads/${thread}/posts`, {...material, title: 'Other catalog source'}, 'POST', writer.token)).post.id;
  for (let revision = 2; revision <= 24; revision++) await seed(`/spaces/${s}/posts/${post}/revisions`, {expected_revision: revision - 1, title: material.title, summary: material.summary, body: material.body}, 'POST', writer.token);

  // Synthetic historical registration/associations only, not upload/download proof.
  // Mimics fields that legitimate import preserves and malformed private/cross-space links.
  const addArtifact = (postId, revision, state, purpose, visibility = 'space', space = s, bytes = 0, mime = 'application/octet-stream') => {
    const id = randomUUID();
    db.prepare('INSERT INTO artifacts(id,space_id,owner_id,visibility,sha256,bytes,mime,storage_key,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, space, writer.actor, visibility, 'a'.repeat(64), bytes, mime, 'owned-unread-' + id, state, clock.nowIso());
    db.prepare('INSERT INTO revision_artifacts(post_id,revision,artifact_id,purpose) VALUES(?,?,?,?)').run(postId, revision, id, purpose);
    return id;
  };
  const visible = new Set(), hidden = new Set();
  for (let i = 0; i < 24; i++) visible.add(addArtifact(post, 1, i % 2 ? 'missing' : 'ready', '历史🧪'.repeat(40) + i));
  const hugeMissing = addArtifact(post, 1, 'missing', '', 'space', s, 33554432); visible.add(hugeMissing);
  const custom = addArtifact(post, 1, 'missing', 'custom historical meaning'); visible.add(custom);
  const tombstone = addArtifact(post, 1, 'redacted', 'Secret residual purpose', 'space', s, 4567, 'private-residual/mime'); visible.add(tombstone);
  db.prepare('UPDATE artifacts SET sha256=? WHERE id=?').run('b'.repeat(64), tombstone);
  hidden.add(addArtifact(post, 1, 'ready', 'Must not be revealed', 'review'));
  hidden.add(addArtifact(post, 1, 'ready', 'Other space', 'space', other));
  addArtifact(second, 1, 'missing', '历史'.repeat(3000)); // One item exceeds 4096 UTF-8 budget.
  const initialTime = clock.value;
  const oldGet = storage.getPostRevision, oldList = storage.listPostRevisions;
  storage.getPostRevision = () => {throw new Error('Catalog attempted full revision read');};
  storage.listPostRevisions = () => {throw new Error('Catalog attempted old full revision list');};
  captureSelects = true;
  let revCursor, artCursor;
  await group('wire UTF-8 budget, metadata-only revision pagination and precise cursor tail', async () => {
    const seen = []; let cursor, pages = 0;
    do {
      const r = await request(catalog(post, s), observer.token, {limit: 100, max_bytes: 4096, cursor});
      ok(r.status === 200 && r.bytes <= 4096, 'complete actual revision wire budget');
      publicKeys(r.json.data, ['post_id', 'current_revision', 'revisions']);
      ok(r.json.api_version === '1' && typeof r.json.request_id === 'string' && r.json.data.current_revision === 24, 'wire envelope and current head');
      for (const item of r.json.data.revisions) {publicKeys(item, ['revision', 'editor_id', 'created_at', 'content_hash']); seen.push(item.revision);}
      cursor = r.json.meta.next_cursor; pages++;
      if (pages === 1) {revCursor = cursor; ok(r.json.meta.truncated === true && typeof cursor === 'string', 'byte trimming supplies signed cursor');}
    } while (cursor && pages < 20);
    ok(!cursor && seen.join(',') === Array.from({length: 24}, (_, i) => 24 - i).join(','), 'no gaps, duplicates or hidden-tail skips');
    ok(selects.length > 0 && selects.every(sql => !/\bSELECT\s+(?:\w+\.)?\*|\b(title|summary|body|tags|structured|session_id)\b/i.test(sql)), 'actual SQL only narrow metadata projection');
    return {pages, revisions: seen.length, full_wire_max_bytes: 4096, old_full_methods_not_called: true, select_projection_count: selects.length, observed_parameterized_selects: [...new Set(selects)]};
  });
  await group('artifact dynamic pages, historical public fields, redacted tombstone and invisible links', async () => {
    const found = new Map(); let cursor, pages = 0, byteTrimmed = false, maxWire = 0;
    do {
      const r = await request(artifacts(post, s, 1), observer.token, {limit: 100, max_bytes: 4096, cursor});
      ok(r.status === 200 && r.bytes <= 4096, 'actual multibyte artifact envelope within budget');
      publicKeys(r.json, ['api_version', 'request_id', 'data', 'meta']);
      publicKeys(r.json.data, ['ref', 'artifacts']); publicKeys(r.json.data.ref, ['post_id', 'revision']);
      publicKeys(r.json.meta, ['truncated', 'next_cursor']);
      ok(!r.wire.includes('Secret residual purpose') && !r.wire.includes('private-residual/mime') && !r.wire.includes('b'.repeat(64)) && [...hidden].every(id => !r.wire.includes(id)), 'complete wire hides residual and invisible metadata');
      maxWire = Math.max(maxWire, r.bytes); byteTrimmed ||= r.json.meta.truncated;
      ok(r.json.data.ref.post_id === post && r.json.data.ref.revision === 1, 'fixed association ref');
      for (const item of r.json.data.artifacts) {ok(!found.has(item.id), 'no artifact duplicates'); found.set(item.id, item);}
      cursor = r.json.meta.next_cursor; if (++pages === 1) artCursor = cursor;
    } while (cursor && pages < 30);
    ok(!cursor && byteTrimmed && found.size === visible.size && [...visible].every(id => found.has(id)) && [...hidden].every(id => !found.has(id)), 'filtered association pages complete with no disclosure');
    for (const item of found.values()) publicKeys(item, item.state === 'redacted' ? ['id', 'state'] : ['id', 'state', 'owner_id', 'sha256', 'bytes', 'mime', 'created_at', 'purpose']);
    ok(found.get(hugeMissing).bytes === 33554432 && found.get(hugeMissing).purpose === '' && found.get(custom).purpose === 'custom historical meaning', 'historical size and purpose preserved');
    ok(found.get(tombstone).state === 'redacted' && Object.keys(found.get(tombstone)).length === 2, 'redacted no residual hash/mime/purpose');
    error(await request(artifacts(second, s, 1), observer.token, {max_bytes: 4096}), 422, 'QUERY_TOO_BROAD');
    error(await request(artifacts(post, s, 999), observer.token), 404, 'NOT_FOUND');
    return {pages, items: found.size, invisible_associations: hidden.size, max_wire_bytes: maxWire, historical_import_fixture: true, download_not_attempted: true};
  });
  await group('cursor domains, count continuation, TTL boundary and original expiry retained', async () => {
    const start = await request(catalog(post, s), observer.token, {limit: 2});
    ok(start.status === 200 && start.json.meta.truncated === false && start.json.meta.next_cursor, 'count-only continuation differs from byte truncation');
    const token = start.json.meta.next_cursor, now = Math.floor(clock.value / 1000);
    const payload = signer.verify(token, secret, now); ok(payload && payload.exp === now + 86400, 'first TTL');
    error(await request(catalog(post, s), peer.token, {cursor: token}), 400, 'VALIDATION_ERROR');
    error(await request(catalog(second, s), observer.token, {cursor: token}), 400, 'VALIDATION_ERROR');
    error(await request(artifacts(post, s, 1), observer.token, {cursor: revCursor}), 400, 'VALIDATION_ERROR');
    error(await request(catalog(post, s), observer.token, {cursor: artCursor}), 400, 'VALIDATION_ERROR');
    error(await request(artifacts(post, s, 2), observer.token, {cursor: artCursor}), 400, 'VALIDATION_ERROR');
    for (const patch of [{space_id: other}, {purpose: 'other-purpose'}]) error(await request(catalog(post, s), observer.token, {cursor: signer.sign({...payload, ...patch}, secret)}), 400, 'VALIDATION_ERROR');
    clock.value += 1000;
    const continued = await request(catalog(post, s), observer.token, {limit: 2, cursor: token});
    const next = signer.verify(continued.json.meta.next_cursor, secret, Math.floor(clock.value / 1000)); ok(next.exp === payload.exp, 'continuation does not renew TTL');
    clock.value = payload.exp * 1000;
    ok((await request(catalog(post, s), observer.token, {cursor: token})).status === 200, 'expiry equality accepted');
    clock.value += 1000; error(await request(catalog(post, s), observer.token, {cursor: token}), 400, 'VALIDATION_ERROR');
    clock.value = initialTime;
    return {actor_post_space_purpose_revision_binding: true, count_page_cursor: true, ttl_seconds: 86400, exp_equality_valid: true, expiry_not_renewed: true};
  });
  await group('strict query, current ACL/credential and redacted post residual hash', async () => {
    for (const route of [catalog(post, s), artifacts(post, s, 1)]) {
      for (const query of [{unknown: 'x'}, {limit: 0}, {max_bytes: 4095}, {cursor: 'bad'}]) error(await request(route, observer.token, query), 400, 'VALIDATION_ERROR');
      error(await request(route.replace(s, other), observer.token), 404, 'NOT_FOUND');
    }
    await seed(`/spaces/${s}/memberships/${observer.actor}`, undefined, 'DELETE');
    const denied = await request(catalog(post, s), observer.token, {cursor: revCursor}); error(denied, 404, 'NOT_FOUND');
    await seed(`/admin/credentials/${peer.credential}/revoke`, undefined);
    error(await request(artifacts(post, s, 1), peer.token, {cursor: artCursor}), 401, 'UNAUTHENTICATED');
    db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(second);
    const residualHash = db.prepare('SELECT content_hash FROM post_revisions WHERE post_id=?').get(second).content_hash;
    ok(residualHash !== 'redacted', 'residual hash remains in owned historical fixture');
    for (const route of [catalog(second, s), artifacts(second, s, 1)]) {const r = await request(route, writer.token); error(r, 410, 'CONTENT_REDACTED'); ok(!r.wire.includes('content_hash') && !r.wire.includes(residualHash), 'redacted complete wire has no residual metadata leak');}
    return {current_membership: true, current_credential: true, redacted_post: 410, strict_query: true};
  });
  captureSelects = false; storage.getPostRevision = oldGet; storage.listPostRevisions = oldList;
  await group('existing full revisions remains complete, directory GETs have no writes or credential logs', async () => {
    const counts = () => Object.fromEntries(['posts','post_revisions','revision_artifacts','events','idempotency_records','sessions'].map(table => [table, db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n]));
    const before = JSON.stringify(counts());
    const full = await request(`/spaces/${s}/posts/${post}/revisions`, writer.token, {limit: 100});
    ok(full.status === 200 && full.json.data.length === 24 && full.json.data.every(item => item.body === material.body && typeof item.structured === 'object'), 'legacy full revision body contract');
    ok((await request(catalog(post, s), writer.token)).status === 200 && (await request(artifacts(post, s, 1), writer.token)).status === 200, 'positive current human reads');
    ok(JSON.stringify(counts()) === before, 'GET directories and legacy read no DB writes');
    const text = JSON.stringify(logs); ok([admin, ...identities.map(i => i.token)].every(token => !text.includes(token)), 'private credentials absent from server logs');
    return {full_revisions: 24, original_body_utf8_bytes: Buffer.byteLength(material.body), read_db_counts_unchanged: true, credential_log_leak: false};
  });
} catch (err) {
  receipt.failure = {message: err instanceof Error ? err.message : 'Independent probe failure'};
  process.exitCode = 1;
} finally {
  let appClosed = false, dbClosed = false, tempAbsent = false;
  try {if (app) {let timer; try {await Promise.race([app.close(), new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('App cleanup deadline')), 15000);})]);} finally {clearTimeout(timer);}} appClosed = true;} catch {process.exitCode = 1;}
  try {if (db?.open) db.close(); dbClosed = true;} catch {process.exitCode = 1;}
  try {await rm(owned, {recursive: true, force: true}); try {await stat(owned);} catch (e) {if (e.code === 'ENOENT') tempAbsent = true;} } catch {process.exitCode = 1;}
  receipt.cleanup = {app_closed: appClosed, db_closed: dbClosed, temp_absent: tempAbsent};
  await writeFile(new URL(receiptName, evidence), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify(receipt));
}
