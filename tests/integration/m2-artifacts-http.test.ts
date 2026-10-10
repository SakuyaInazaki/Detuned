import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtemp, rm, readdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { FastifyInstance } from 'fastify';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { buildApp, ArtifactFileStore } from '@detuned/server';

const boundary = 'detuned-m2-test-boundary';
const file = (data = 'evidence', mime = 'text/plain; charset=utf-8', name = '../../unsafe-name') =>
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n${data}\r\n`;
const field = (value: string, name = 'metadata', mime = 'application/json') =>
  `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: ${mime}\r\n\r\n${value}\r\n`;
const form = (...parts: string[]) => parts.join('') + `--${boundary}--\r\n`;

async function waitUntil(check: () => Promise<boolean>) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('condition not reached');
}

describe('M2.1 HTTP artifact transport with real SQLite and FS', () => {
  let root: string;
  let db: Database.Database;
  let storage: SqliteStorage;
  let blobs: ArtifactFileStore;
  let app: FastifyInstance;
  let token: string;
  let spaceId: string;
  const headers = () => ({ authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${boundary}` });
  const endpoint = () => `/api/v1/spaces/${spaceId}/artifacts`;
  const upload = (payload: string, key = 'upload-key') => app.inject({ method: 'POST', url: endpoint(), headers: { ...headers(), 'idempotency-key': key }, payload });
  const artifactCount = () => (db.prepare('SELECT count(*) AS n FROM artifacts').get() as { n: number }).n;
  const stageFiles = () => readdir(path.join(root, 'artifacts/staging'));
  const objectFiles = () => readdir(path.join(root, 'artifacts/objects'));
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'detuned-artifacts-http-'));
    db = new Database(':memory:');
    token = bootstrapDatabase(db).adminToken!;
    storage = new SqliteStorage(db);
    blobs = await ArtifactFileStore.create(root);
    app = buildApp({ storage, artifactBlobs: blobs, artifactLimits: { max_file_bytes: 128 } });
    const space = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'create-space' }, payload: { slug: 'artifact-test', objective: 'test', rules: [] } });
    expect(space.statusCode).toBe(201);
    spaceId = space.json().data.space.id;
  });
  afterEach(async () => { vi.restoreAllMocks(); await app.close(); db.close(); await rm(root, { recursive: true, force: true }); });

  it('accepts either field order, returns safe metadata/download headers and permits ready attachment references', async () => {
    const capabilities = await app.inject({ method: 'GET', url: '/api/v1/capabilities' });
    expect(capabilities.json().data.modules_enabled).toContain('artifacts');
    expect(capabilities.json().data.limits.max_artifact_bytes).toBe(128);
    const created = await upload(form(file(), field('{"visibility":"space"}')));
    expect(created.statusCode).toBe(201);
    const artifact = created.json().data;
    expect(artifact).toMatchObject({ bytes: 8, mime: 'text/plain', visibility: 'space', state: 'ready' });
    expect(artifact.storage_key).toBeUndefined();
    expect(JSON.stringify(artifact)).not.toContain('unsafe-name');
    const metadata = await app.inject({ method: 'GET', url: `${endpoint()}/${artifact.id}`, headers: { authorization: `Bearer ${token}` } });
    expect(metadata.json().data).toEqual(artifact);
    const content = await app.inject({ method: 'GET', url: artifact.content_url, headers: { authorization: `Bearer ${token}` } });
    expect(content.body).toBe('evidence');
    expect(content.headers).toMatchObject({ 'content-type': 'text/plain', 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store', 'content-disposition': `attachment; filename="${artifact.id}"` });
    const second = await upload(form(field('{}'), file('second')), 'second-key');
    expect(second.statusCode).toBe(201);
    const thread = await app.inject({ method: 'POST', url: `/api/v1/spaces/${spaceId}/threads`, headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'thread-with-artifact' }, payload: {
      title: 'evidence', initial_post: { kind: 'note', title: 'evidence', summary: 's', body: 'b', artifact_ids: [artifact.id], structured: { evidence_refs: [{ kind: 'artifact', artifact_id: artifact.id }] } },
    } });
    expect(thread.statusCode).toBe(201);
    expect((db.prepare('SELECT count(*) AS n FROM revision_artifacts').get() as { n: number }).n).toBe(1);
    expect(await stageFiles()).toEqual([]);
  });

  it('validates every trailing part before committing and cleans staging on malformed forms', async () => {
    const cases = [
      form(file(), field('{')),
      form(file(), field('{"visibility":"review_assignment"}')),
      form(file(), field('{"filename":"bad"}')),
      form(file(), field('{}', 'unknown')),
      form(file(), field('{}'), field('{}')),
      form(file(), file('second-file')),
      form(field('{}')),
      form(file(), field(' '.repeat(4097))),
      file('no-final-boundary'),
    ];
    for (let i = 0; i < cases.length; i++) {
      const response = await upload(cases[i], `bad-${i}`);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(artifactCount()).toBe(0);
      expect(await stageFiles()).toEqual([]);
      expect(await objectFiles()).toEqual([]);
      expect((db.prepare("SELECT count(*) AS n FROM events WHERE type='artifact.created'").get() as { n: number }).n).toBe(0);
    }
  });

  it('normalizes bounded metadata JSON errors to400 for text/plain and application/json with no rejected-upload residue', async () => {
    const committedState = async () => ({
      artifacts: db.prepare('SELECT * FROM artifacts ORDER BY id').all(),
      events: db.prepare("SELECT * FROM events WHERE type='artifact.created' ORDER BY seq").all(),
      idempotency: db.prepare("SELECT * FROM idempotency_records WHERE operation='artifact.create' ORDER BY key").all(),
      blobs: await objectFiles(),
    });
    for (const mime of ['text/plain', 'application/json']) {
      // Legal JSON padding tests the raw field byte boundary, not parsed object size.
      const atLimit = '{}' + ' '.repeat(4094);
      expect(Buffer.byteLength(atLimit)).toBe(4096);
      const accepted = await upload(form(file(), field(atLimit, 'metadata', mime)), `boundary-ok-${mime}`);
      expect(accepted.statusCode).toBe(201);
      const beforeReject = await committedState();
      for (const value of [atLimit + ' ', '{']) {
        const rejected = await upload(form(file(), field(value, 'metadata', mime)), `boundary-rejected-${mime}-${value.length}`);
        expect(rejected.statusCode).toBe(400);
        expect(rejected.json().error).toMatchObject({ code: 'VALIDATION_ERROR', retryable: false });
        expect(await committedState()).toEqual(beforeReject);
        expect(await stageFiles()).toEqual([]);
      }
    }
    // Local normalization must not change the separate file-size policy.
    expect((await upload(form(file('x'.repeat(129))), 'r1-file-limit')).statusCode).toBe(413);
  });

  it('rejects oversize and missing key without ready objects, then accepts a new valid upload', async () => {
    expect((await upload(form(file('x'.repeat(129))))).statusCode).toBe(413);
    const noKey = await app.inject({ method: 'POST', url: endpoint(), headers: headers(), payload: form(file()) });
    expect(noKey.statusCode).toBe(400);
    expect(artifactCount()).toBe(0);
    expect(await stageFiles()).toEqual([]);
    expect(await objectFiles()).toEqual([]);
    expect((await upload(form(file('x'.repeat(128))), 'exact-configured-limit')).statusCode).toBe(201);
    expect((await upload(form(file()), 'valid-after-error')).statusCode).toBe(201);
  });

  it('DB failure removes its published blob and same-key retry leaves one blob/charge/event', async () => {
    const transaction = vi.spyOn(storage, 'transaction').mockImplementationOnce(() => { throw new Error('injected DB transaction failure'); });
    const failed = await upload(form(file()), 'db-failure');
    expect(failed.statusCode).toBe(500);
    expect(artifactCount()).toBe(0);
    expect(await stageFiles()).toEqual([]);
    expect(await objectFiles()).toEqual([]);
    transaction.mockRestore();
    const one = await upload(form(file()), 'stable-key');
    const two = await upload(form(file()), 'stable-key');
    expect(two.statusCode).toBe(201);
    expect(two.json().data).toEqual(one.json().data);
    expect(artifactCount()).toBe(1);
    expect(storage.getArtifactBytesInSpace(spaceId)).toBe(8);
    expect((await objectFiles()).length).toBe(1);
    expect((db.prepare("SELECT count(*) AS n FROM events WHERE type='artifact.created'").get() as { n: number }).n).toBe(1);
    expect((await upload(form(file('changed')), 'stable-key')).statusCode).toBe(409);
    expect((await objectFiles()).length).toBe(1);
  });

  it('missing files stay ready in DB but return404; redacted returns410 after ACL and new requests reflect revoked membership', async () => {
    const created = await upload(form(file()));
    const artifact = created.json().data;
    const row = storage.findArtifactById(artifact.id)!;
    await unlink(path.join(root, 'artifacts/objects', row.storage_key));
    for (const url of [`${endpoint()}/${artifact.id}`, artifact.content_url]) {
      expect((await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(404);
    }
    expect(storage.findArtifactById(artifact.id)!.state).toBe('ready');
    storage.updateArtifactState(artifact.id, 'redacted');
    expect((await app.inject({ method: 'GET', url: artifact.content_url, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(410);
    const actor = await app.inject({ method: 'POST', url: '/api/v1/admin/actors', headers: { authorization: `Bearer ${token}` }, payload: { kind: 'agent', display_name: 'reader' } });
    const actorId = actor.json().data.id;
    const credential = await app.inject({ method: 'POST', url: '/api/v1/admin/credentials', headers: { authorization: `Bearer ${token}` }, payload: { actor_id: actorId, allowed_space_ids: ['*'], capabilities: ['read', 'write'] } });
    const readerToken = credential.json().data.token;
    await app.inject({ method: 'POST', url: `/api/v1/spaces/${spaceId}/memberships`, headers: { authorization: `Bearer ${token}` }, payload: { actor_id: actorId, role: 'observer' } });
    expect((await app.inject({ method: 'GET', url: artifact.content_url, headers: { authorization: `Bearer ${readerToken}` } })).statusCode).toBe(410);
    await app.inject({ method: 'DELETE', url: `/api/v1/spaces/${spaceId}/memberships/${actorId}`, headers: { authorization: `Bearer ${token}` } });
    expect((await app.inject({ method: 'GET', url: artifact.content_url, headers: { authorization: `Bearer ${readerToken}` } })).statusCode).toBe(404);
  });

  it('a missing backend is explicit500 without side effects and buildApp never performs GC', async () => {
    await blobs.stage((async function* () { yield Buffer.from('orphan'); })(), 10);
    const prior = await stageFiles();
    const noBackend = buildApp({ storage, artifactLimits: { max_file_bytes: 32 } });
    try {
      const cap = await noBackend.inject({ method: 'GET', url: '/api/v1/capabilities' });
      expect(cap.json().data.modules_enabled).not.toContain('artifacts');
      expect(cap.json().data.limits.max_artifact_bytes).toBe(26214400);
      const response = await noBackend.inject({ method: 'POST', url: endpoint(), headers: { ...headers(), 'idempotency-key': 'not-configured' }, payload: form(file()) });
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toMatchObject({ code: 'TEMPORARILY_UNAVAILABLE', retryable: false });
      for (const suffix of ['/art_absent', '/art_absent/content']) {
        const unavailable = await noBackend.inject({ method: 'GET', url: endpoint() + suffix, headers: { authorization: `Bearer ${token}` } });
        expect(unavailable.statusCode).toBe(500);
        expect(unavailable.json().error.code).toBe('TEMPORARILY_UNAVAILABLE');
      }
      expect(artifactCount()).toBe(0);
      expect(await stageFiles()).toEqual(prior);
    } finally { await noBackend.close(); }
  });

  it('holds four upload leases through parsing, rejects the fifth, and releases all after real disconnects', async () => {
    await app.listen({ port: 0, host: '127.0.0.1' });
    const port = (app.server.address() as { port: number }).port;
    const requests: http.ClientRequest[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        const req = http.request({ host: '127.0.0.1', port, path: endpoint(), method: 'POST', headers: { ...headers(), 'idempotency-key': `pending-${i}` } });
        req.on('error', () => {});
        requests.push(req);
        req.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="ignored"\r\nContent-Type: text/plain\r\n\r\nx`);
      }
      await waitUntil(async () => (await stageFiles()).length === 4);
      expect((await upload(form(file()), 'fifth')).statusCode).toBe(429);
      for (const req of requests) req.destroy();
      await waitUntil(async () => (await stageFiles()).length === 0);
      expect(artifactCount()).toBe(0);
      expect(await objectFiles()).toEqual([]);
      expect((await upload(form(file()), 'after-disconnect')).statusCode).toBe(201);
    } finally { for (const req of requests) req.destroy(); }
  });
});
