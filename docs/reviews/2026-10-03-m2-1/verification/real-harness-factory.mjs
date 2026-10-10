// Preparation only: imports runtime artifacts inside the factory after final build.
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { filePart, metadataPart, end, rawUpload } from './probe-multipart.mjs';
const root = new URL('../../../../', import.meta.url);
export async function makeHarness(options = {}) {
  const [{ default: Database }, { buildApp }, { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase }, { ArtifactFileStore }] = await Promise.all([
    import(new URL('packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js', root)),
    import(new URL('packages/server/dist/app.js', root)),
    import(new URL('packages/storage-sqlite/dist/index.js', root)),
    import(new URL('packages/server/dist/artifact-files.js', root)),
  ]);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'detuned-m21-independent-'));
  let db, app, token, sid, storage, blobs;
  const activeRequests = new Map();
  const sockets = new Set();
  const teardown = [];
  const start = async () => {
    db = new Database(path.join(dir, 'detuned.db'));
    if (!token) token = bootstrapDatabase(db).adminToken;
    else openAndCoordinateDatabase(db, 'serve');
    storage = new SqliteStorage(db);
    blobs = await ArtifactFileStore.create(dir);
    app = buildApp({ storage, artifactBlobs: blobs, ...options });
    app.server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
    app.addHook('onRequest', async req => { activeRequests.set(req.id, { method: req.method, url: req.url }); });
    app.addHook('onResponse', async req => { activeRequests.delete(req.id); });
    await app.listen({ host: '127.0.0.1', port: 0 });
  };
  const closeServer = async () => { if (app) {
    const state = { active_requests: [...activeRequests.values()], socket_count: sockets.size };
    teardown.push(state); console.error('Independent teardown: ' + JSON.stringify(state));
    app.server.closeAllConnections(); await app.close(); activeRequests.clear(); sockets.clear();
  } if (db?.open) db.close(); };
  try {
    await start();
    const response = await fetch(`${app.listeningOrigin}/api/v1/spaces`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': 'independent-seed' }, body: JSON.stringify({ slug: 'independent-m21', objective: 'finite verification', rules: [] }) });
    assert.equal(response.status, 201); sid = (await response.json()).data.space.id;
    return {
      get uploadUrl() { return `${app.listeningOrigin}/api/v1/spaces/${sid}/artifacts`; }, get token() { return token; }, get db() { return db; }, get storage() { return storage; }, get blobs() { return blobs; }, get sid() { return sid; }, get app() { return app; }, dir, teardown, get lifecycle() { return { active_requests: [...activeRequests.values()], socket_count: sockets.size }; },
      snapshot() { return Object.fromEntries(['artifacts', 'revision_artifacts', 'events', 'idempotency_records'].map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()])); },
      async upload(bytes, key) { return rawUpload({ url: this.uploadUrl, token, key, chunks: [filePart(bytes), metadataPart('{"visibility":"space"}'), end] }).result; },
      async restart() { await closeServer(); await start(); },
      async assertNoOwnCandidates() { assert.deepEqual(await readdir(path.join(dir, 'artifacts/staging')), []); const live = new Set(db.prepare('SELECT storage_key FROM artifacts').all().map(x => x.storage_key)); assert((await readdir(path.join(dir, 'artifacts/objects'))).every(key => live.has(key))); },
      async close() { await closeServer(); await rm(dir, { recursive: true, force: true }); },
    };
  } catch (error) { await closeServer(); await rm(dir, { recursive: true, force: true }); throw error; }
}
// Controlled-barrier, quota/slot, identity and reference helpers are wired after reading
// the frozen formal suite; missing helpers must fail explicitly rather than claim pass.
