import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArtifactService, AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, BlobStorePort, StagedBlob, AuthenticatedContext } from '@detuned/core';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase } from '@detuned/storage-sqlite';
import { normalizeArtifactMime, resolveArtifactLimits } from '@detuned/protocol';

// Controlled file port isolates core transaction/ownership rules. Unit B tests real filesystem durability.
class ControlledBlobs implements BlobStorePort {
  stages = new Map<string, Uint8Array>();
  objects = new Map<string, Uint8Array>();
  beforePublish?: () => void;
  collide = false;
  sequence = 0;
  async stage(chunks: AsyncIterable<Uint8Array>, maxBytes: number): Promise<StagedBlob> {
    const parts: Uint8Array[] = []; let bytes = 0;
    for await (const chunk of chunks) { bytes += chunk.length; if (bytes > maxBytes) throw new Error('size'); parts.push(chunk); }
    const data = Buffer.concat(parts); const stage_key = `stage-${++this.sequence}`;
    this.stages.set(stage_key, data);
    return { stage_key, bytes, sha256: new CryptoHasher().sha256(data) };
  }
  async publish(stage: StagedBlob, key: string) {
    this.beforePublish?.();
    if (this.collide || this.objects.has(key)) throw new Error('collision');
    this.objects.set(key, this.stages.get(stage.stage_key)!); this.stages.delete(stage.stage_key);
  }
  async discardStage(stage: StagedBlob) { this.stages.delete(stage.stage_key); }
  async discardPublished(key: string) { this.objects.delete(key); }
  async exists(key: string) { return this.objects.has(key); }
  async open(key: string) { const data = this.objects.get(key); return data ? { chunks: (async function* () { yield data; })(), dispose: async () => {} } : null; }
}

describe('M2.1 core artifact transaction and references', () => {
  let dir: string; let db: Database.Database; let storage: SqliteStorage;
  let authService: AuthService; let auth: AuthenticatedContext; let idem: IdempotencyService;
  let blobs: ControlledBlobs; let service: ArtifactService; let sid: string;
  const hasher = new CryptoHasher(); const ids = new CryptoIdGenerator(); const clock = new SystemClock();
  const resetServices = () => { storage = new SqliteStorage(db); authService = new AuthService(storage, hasher, clock); idem = new IdempotencyService(storage, hasher, clock); service = new ArtifactService(storage, blobs, authService, idem, ids, clock, { max_file_bytes: 25 * 1024 * 1024, max_space_bytes: 1024 }); };
  const staged = async (text = 'hello') => blobs.stage((async function* () { yield Buffer.from(text); })(), 26214400);
  const upload = async (key: string, text = 'hello') => service.create(auth, sid, { staged: await staged(text), mime: ' Text/Plain; charset=UTF-8 ', metadata: {} }, key);
  const counts = () => ({ artifacts: db.prepare('SELECT count(*) n FROM artifacts').get(), events: db.prepare("SELECT count(*) n FROM events WHERE type='artifact.created'").get(), keys: db.prepare("SELECT count(*) n FROM idempotency_records WHERE operation='artifact.create'").get() });
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'detuned-m2-core-')); db = new Database(join(dir, 'db.sqlite'));
    const boot = bootstrapDatabase(db); blobs = new ControlledBlobs(); resetServices();
    auth = authService.authenticateToken(boot.adminToken!);
    sid = new SpaceService(storage, ids, clock, authService, idem).createSpace(auth, { slug: 'm2-core', objective: 'contracts', rules: [] }, 'space').space.id;
  });
  afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  it('A01: typed replay returns same object, separate keys bill separate objects, private keys never enter DTO/events', async () => {
    const first = await upload('same'); const replay = await upload('same'); const other = await upload('other');
    expect(replay).toEqual(first); expect(other.id).not.toBe(first.id);
    expect(storage.getArtifactBytesInSpace(sid)).toBe(10); expect(blobs.objects.size).toBe(2); expect(blobs.stages.size).toBe(0);
    expect(first).not.toHaveProperty('storage_key'); expect(first.mime).toBe('text/plain');
    const refs = db.prepare("SELECT result_ref FROM idempotency_records WHERE operation='artifact.create'").all() as { result_ref: string }[];
    expect(JSON.parse(refs[0]!.result_ref)).toEqual({ v: 1, kind: 'artifact', artifact_id: first.id });
    const events = storage.listEventsAfter(sid, 0, 100).filter(e => e.type === 'artifact.created');
    expect(events).toHaveLength(2); expect(events[0]!.object_id).toBe(first.id); expect(events[0]!.revision).toBeNull();
    await expect(upload('same', 'changed')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
    expect(blobs.objects.size).toBe(2);
  });

  it('A02: quota checks all states and immediate transaction/DB failures leave no partial state', async () => {
    const first = await upload('first'); storage.updateArtifactState(first.id, 'redacted');
    service = new ArtifactService(storage, blobs, authService, idem, ids, clock, { max_file_bytes: 10, max_space_bytes: 5 });
    expect(storage.getArtifactBytesInSpace(sid)).toBe(5);
    storage.updateArtifactState(first.id, 'missing');
    expect(storage.getArtifactBytesInSpace(sid)).toBe(5);
    const before = counts(); await expect(upload('quota', 'x')).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(counts()).toEqual(before); expect(blobs.objects.size).toBe(1);
    service = new ArtifactService(storage, blobs, authService, idem, ids, clock, { max_file_bytes: 10, max_space_bytes: 100 });
    db.exec("CREATE TRIGGER fail_artifact_event BEFORE INSERT ON events WHEN NEW.type='artifact.created' BEGIN SELECT RAISE(ABORT,'controlled DB failure'); END");
    await expect(upload('db-fail')).rejects.toThrow('controlled DB failure');
    expect(counts()).toEqual(before); expect(blobs.objects.size).toBe(1);
  });

  it('A03: commit reloads credentials after publish and revoked snapshots cannot upload', async () => {
    blobs.beforePublish = () => storage.revokeCredential(auth.credential.id, clock.nowIso());
    const before = counts(); await expect(upload('revoked')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(counts()).toEqual(before); expect(blobs.objects.size).toBe(0);
    expect(() => service.authorizeUpload(auth, sid)).toThrow('失效');
  });

  it('A04: redaction survives restart coordination and replay rejects 410; missing physical file rejects 404 without DB state mutation', async () => {
    const first = await upload('redact'); storage.updateArtifactState(first.id, 'redacted');
    db.close(); db = new Database(join(dir, 'db.sqlite')); expect(() => openAndCoordinateDatabase(db, 'serve')).not.toThrow(); resetServices();
    await expect(upload('redact')).rejects.toMatchObject({ code: 'CONTENT_REDACTED', statusCode: 410 });
    const present = await upload('missing'); const record = storage.findArtifactById(present.id)!; blobs.objects.delete(record.storage_key);
    await expect(service.getMetadata(auth, sid, present.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(upload('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(storage.findArtifactById(present.id)!.state).toBe('ready');
  });

  it('A05: publish collision cannot delete an existing object and invalid inputs clean stages', async () => {
    const first = await upload('keep'); const existing = [...blobs.objects.keys()][0]!;
    blobs.collide = true; await expect(upload('collision')).rejects.toThrow('collision');
    expect(blobs.objects.has(existing)).toBe(true); expect(blobs.stages.size).toBe(0);
    blobs.collide = false;
    await expect(service.create(auth, sid, { staged: await staged(), mime: 'text/plain\r\nx:evil', metadata: {} }, 'mime')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(blobs.stages.size).toBe(0); expect((await service.getMetadata(auth, sid, first.id)).id).toBe(first.id);
    expect(() => resolveArtifactLimits({ max_space_bytes: 1, max_file_bytes: 2 })).not.toThrow();
    expect(() => resolveArtifactLimits({ max_file_bytes: 26214401 })).toThrow();
    expect(() => normalizeArtifactMime('text/plain\0')).toThrow();
  });

  it('A06: initial post, new post and revision link ready space artifacts, duplicate/unlisted/redacted evidence rolls back', async () => {
    const artifact = await upload('ref');
    const threads = new ThreadService(storage, ids, clock, hasher, authService, idem);
    const posts = new PostService(storage, ids, clock, hasher, authService, idem);
    const content = { kind: 'note' as const, title: 'evidence', summary: 's', body: 'b', artifact_ids: [artifact.id] };
    const thread = threads.createThread(auth, sid, { title: 'thread', initial_post: content }, 'thread-ref');
    const post = posts.createPost(auth, sid, thread.thread.id, content, 'post-ref');
    posts.createRevision(auth, sid, post.post.id, { ...content, expected_revision: 1 }, 'revision-ref');
    expect((db.prepare('SELECT count(*) n FROM revision_artifacts').get() as { n: number }).n).toBe(3);
    const before = (db.prepare('SELECT count(*) n FROM posts').get() as { n: number }).n;
    expect(() => posts.createPost(auth, sid, thread.thread.id, { ...content, artifact_ids: [artifact.id, artifact.id] }, 'duplicate')).toThrow('互异');
    expect(() => posts.createPost(auth, sid, thread.thread.id, { ...content, artifact_ids: [], structured: { evidence_refs: [{ kind: 'artifact', artifact_id: artifact.id }] } }, 'unlisted')).toThrow('同时');
    storage.updateArtifactState(artifact.id, 'redacted');
    expect(() => posts.createPost(auth, sid, thread.thread.id, content, 'redacted-ref')).toThrow('脱敏');
    expect((db.prepare('SELECT count(*) n FROM posts').get() as { n: number }).n).toBe(before);
  });
  it.each(['actor', 'expiry', 'membership'] as const)('A07: persisted %s changes during publish deny commit', async mode => {
    const actor = { ...auth.actor, id: ids.generateId('act'), disabled_at: null };
    storage.createActor(actor);
    const credential = { ...auth.credential, id: ids.generateId('cred'), actor_id: actor.id, token_hash: hasher.sha256(actor.id), capabilities: ['read', 'write'] as ('read' | 'write')[] };
    storage.createCredential(credential);
    storage.upsertMembership({ space_id: sid, actor_id: actor.id, role: 'contributor', active: true, reviewer_eligible: false, independence_group: null });
    auth = { actor, credential };
    service.authorizeUpload(auth, sid);
    blobs.beforePublish = () => {
      if (mode === 'actor') storage.updateActor({ ...actor, disabled_at: clock.nowIso() });
      if (mode === 'expiry') db.prepare('UPDATE credentials SET expires_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z', credential.id);
      if (mode === 'membership') storage.upsertMembership({ space_id: sid, actor_id: actor.id, role: 'contributor', active: false, reviewer_eligible: false, independence_group: null });
    };
    const before = counts(); await expect(upload('stale')).rejects.toBeDefined();
    expect(counts()).toEqual(before); expect(blobs.objects.size).toBe(0);
  });

});
