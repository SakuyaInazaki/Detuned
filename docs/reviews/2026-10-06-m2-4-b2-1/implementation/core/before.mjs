// Existing public GET only: no new service/helper import and no repository credential.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import Database from '../../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';

const db = new Database(':memory:');
const { adminToken } = bootstrapDatabase(db);
const storage = new SqliteStorage(db);
const app = buildApp({ storage });
const headers = { authorization: `Bearer ${adminToken}` };
async function create(url, payload, key) {
  const response = await app.inject({ method: 'POST', url, headers: { ...headers, 'idempotency-key': key }, payload });
  assert.equal(response.statusCode, 201);
  return response.json().data;
}
try {
  const space = await create('/api/v1/spaces', { slug: 'post-content-before', objective: 'before', rules: [] }, 'space');
  const sid = space.space.id;
  const thread = await create(`/api/v1/spaces/${sid}/threads`, { title: 'large body' }, 'thread');
  const input = { kind: 'note', title: 'stored title', summary: 'stored summary', body: '中🙂"\\\n'.repeat(5000), tags: ['original'], structured: { historical_extra: [42, { raw: 'unchanged' }] } };
  const created = await create(`/api/v1/spaces/${sid}/threads/${thread.thread.id}/posts`, input, 'post');
  const postId = created.post.id;
  const response = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${postId}?revision=1`, headers });
  assert.equal(response.statusCode, 200);
  const result = response.json();
  const stored = storage.getPostRevision(postId, 1);
  const document = ({ title, summary, body, tags, structured }) => ({ title, summary, body, tags, structured });
  assert.deepEqual(document(result.data.revision), document(stored));
  assert.deepEqual(document(stored), document(input));
  const actualBytes = Buffer.byteLength(response.body);
  assert(actualBytes > 4096);
  assert.equal(result.meta, undefined);
  assert.equal(result.data.revision.body, input.body);
  const observed = {
    stage: 'before', source: 'existing B.1-accepted dist, existing public full-post GET; isolated in-memory SQLite',
    existing_status: response.statusCode, requested_revision: 1, actual_compact_http_bytes: actualBytes,
    target_page_budget: 4096, exceeds_target_budget: actualBytes > 4096,
    full_body_returned: true, body_utf8_bytes: Buffer.byteLength(input.body),
    stored_five_fields_exact: true, returned_stored_five_fields_exact: true,
    projection_document_sha256: createHash('sha256').update(JSON.stringify(document(stored))).digest('hex'),
    existing_meta_present: result.meta !== undefined,
    scope: 'Old fixed revision full read preserves material but has no bounded content-page behavior; new route/tool/CLI before owned by protocol unit.',
  };
  await writeFile(new URL('before.json', import.meta.url), JSON.stringify(observed, null, 2) + '\n');
  console.log(JSON.stringify(observed, null, 2));
} finally {
  await app.close();
  db.close();
}
