// Genuine existing GET thread behavior; no future helper/service import.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import Database from '../../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import { buildApp } from '../../../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';

const db = new Database(':memory:');
const { adminToken } = bootstrapDatabase(db);
const storage = new SqliteStorage(db), app = buildApp({ storage });
const headers = { authorization: `Bearer ${adminToken}` };
async function create(url, payload, key) {
  const result = await app.inject({ method: 'POST', url, payload, headers: { ...headers, 'idempotency-key': key } });
  assert.equal(result.statusCode, 201); return result.json().data;
}
try {
  const sid = (await create('/api/v1/spaces', { slug: 'directory-before', objective: 'before', rules: [] }, 'space')).space.id;
  const tid = (await create(`/api/v1/spaces/${sid}/threads`, { title: 'metadata directory' }, 'thread')).thread.id;
  for (let i = 0; i < 60; i++) await create(`/api/v1/spaces/${sid}/threads/${tid}/posts`, { kind: 'note', title: `post ${i}`, summary: 's', body: 'old body' }, `post-${i}`);
  const path = `/api/v1/spaces/${sid}/threads/${tid}`;
  const full = await app.inject({ method: 'GET', url: path + '?limit=100', headers });
  assert.equal(full.statusCode, 200);
  const content = full.json(), expected = storage.listPostsInThread(tid, 100).posts;
  assert.equal(content.data.posts.length, 60); assert.deepEqual(content.data.posts, expected);
  assert(Buffer.byteLength(full.body) > 4096); assert.equal(content.meta.next_cursor, null);
  const first = await app.inject({ method: 'GET', url: path + '?limit=7', headers });
  assert.equal(first.statusCode, 200);
  const firstPage = first.json(), rawCursor = firstPage.meta.next_cursor;
  assert.equal(rawCursor, firstPage.data.posts.at(-1).id);
  const next = await app.inject({ method: 'GET', url: path + `?limit=100&cursor=${encodeURIComponent(rawCursor)}`, headers });
  assert.equal(next.statusCode, 200);
  assert.deepEqual([...firstPage.data.posts, ...next.json().data.posts], expected);
  const bounded = await app.inject({ method: 'GET', url: path + '?limit=100&max_bytes=4096', headers });
  assert.equal(bounded.statusCode, 400); assert.equal(bounded.json().error.code, 'VALIDATION_ERROR');
  const observed = {
    stage: 'before', source: 'existing B.2.1-accepted dist; public HTTP; isolated in-memory SQLite',
    full_status: full.statusCode, limit: 100, metadata_items: content.data.posts.length,
    actual_compact_http_bytes: Buffer.byteLength(full.body), target_budget: 4096, exceeds_budget: true,
    returned_metadata_exact: true, no_body_fields: content.data.posts.every(post => !('body' in post)),
    full_meta: content.meta, raw_cursor_equals_last_sent_id: true, first_page_count: firstPage.data.posts.length,
    second_page_count: next.json().data.posts.length, static_collection_join_exact: true,
    existing_budget_query_status: bounded.statusCode, existing_budget_query_error: bounded.json().error.code,
    limitation: 'Existing directory returns exact complete metadata/raw keyset pages but rejects max_bytes and has no bounded signed-directory contract.',
  };
  await writeFile(new URL('before.json', import.meta.url), JSON.stringify(observed, null, 2) + '\n');
  console.log(JSON.stringify(observed, null, 2));
} finally { await app.close(); db.close(); }
