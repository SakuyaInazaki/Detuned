import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '../../../../../packages/storage-sqlite/dist/index.js';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { DetunedClient } from '../../../../../packages/client/dist/index.js';
import { spawnSync } from 'node:child_process';

const db = new Database(':memory:');
const token = bootstrapDatabase(db).adminToken;
const app = buildApp({ storage: new SqliteStorage(db) });
const headers = { authorization: `Bearer ${token}` };
const observations = [];
try {
  await app.ready();
  const space = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers, 'idempotency-key': 'before-space' }, payload: { slug: 'b21-before', objective: 'read fixed post content', rules: [] } });
  assert.equal(space.statusCode, 201);
  const sid = space.json().data.space.id;
  const thread = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers, 'idempotency-key': 'before-thread' }, payload: { title: 'before', initial_post: { kind: 'note', title: 'valid large note', summary: 'valid stored full body', body: '正文🙂\"\\\n'.repeat(1800), tags: ['before'], structured: {} } } });
  assert.equal(thread.statusCode, 201);
  const id = thread.json().data.initial_post.post.id;
  const fixed = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${id}/revisions/1?max_bytes=4096`, headers });
  assert.equal(fixed.statusCode, 404);
  observations.push({ name: 'new_fixed_route_missing', status: fixed.statusCode, body: fixed.json() });
  const old = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${id}?revision=1`, headers });
  assert.equal(old.statusCode, 200);
  const fullBytes = Buffer.byteLength(old.payload);
  assert.ok(fullBytes > 4096);
  assert.equal(old.json().data.revision.body, '正文🙂\"\\\n'.repeat(1800));
  observations.push({ name: 'legal_old_full_get_exceeds_4k', status: old.statusCode, actual_body_bytes: fullBytes, has_page_meta: Boolean(old.json().meta), revision: old.json().data.revision.revision });
  const client = new DetunedClient({ baseUrl: 'http://127.0.0.1:1', token, maxRetries: 0 });
  try { await client.callTool('forum_read', { kind: 'post_revision', space_id: sid, id, revision: 1, max_bytes: 4096 }); assert.fail('new kind unexpectedly accepted'); }
  catch (error) { assert.equal(error.code, 'VALIDATION_ERROR'); assert.equal(error.statusCode, 400); observations.push({ name: 'new_tool_kind_missing', code: error.code, status: error.statusCode, message: error.message }); }
  const cli = spawnSync(process.execPath, ['packages/cli/dist/index.js', 'post', 'read', sid, id, '--revision', '1', '--max-bytes', '4096'], { cwd: process.cwd(), env: { ...process.env, DETUNED_TOKEN: '', DETUNED_TOKEN_FILE: '', DETUNED_BASE_URL: 'http://127.0.0.1:1' }, encoding: 'utf8' });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /unknown command ['"]post['"]/);
  observations.push({ name: 'new_cli_entry_missing', exit_code: cli.status, stdout: cli.stdout, stderr: cli.stderr });
  console.log(JSON.stringify({ observations, status: 'four baseline limitations actually observed; no new behavior implemented' }, null, 2));
} finally { await app.close(); db.close(); }
