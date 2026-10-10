import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { ArtifactFileStore } from '@detuned/server';
import { SqliteStorage, bootstrapDatabase, DirectoryLock } from '@detuned/storage-sqlite';
import { AuthService, CryptoHasher, SystemClock, SpaceService, CryptoIdGenerator, IdempotencyService } from '@detuned/core';

const cli = fileURLToPath(new URL('../../packages/cli/dist/index.js', import.meta.url));
const blobChunks = async function* (value: string) { yield Buffer.from(value); };
function start(root: string, extra: string[] = []) {
  const child = spawn(process.execPath, [cli, 'serve', '--data-dir', root, '--host', '127.0.0.1', '--port', '0', ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout!.on('data', (data) => { stdout += data.toString(); });
  child.stderr!.on('data', (data) => { stderr += data.toString(); });
  const exited = new Promise<number | null>((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  return { child, exited, output: () => ({ stdout, stderr }) };
}
async function waitStarted(run: ReturnType<typeof start>) {
  for (let i = 0; i < 200; i++) {
    if (run.output().stderr.includes('Detuned 服务已启动')) return;
    if (run.child.exitCode !== null) throw new Error(`CLI exited before listen: ${run.output().stderr}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`CLI startup timeout: ${run.output().stderr}`);
}

describe('M2.1 CLI locked startup artifact lifecycle', () => {
  let root: string;
  let children: ChildProcess[];
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'detuned-artifacts-cli-'));
    children = [];
    const db = new Database(path.join(root, 'detuned.sqlite'));
    bootstrapDatabase(db);
    db.close();
  });
  afterEach(async () => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
    await rm(root, { recursive: true, force: true });
  });
  it('cleans crash-window orphans after locked DB coordination, preserves referenced blobs and prints actual limits', async () => {
    const blobs = await ArtifactFileStore.create(root);
    const live = await blobs.stage(blobChunks('live'), 100);
    await blobs.publish(live, 'live_blob');
    const orphan = await blobs.stage(blobChunks('orphan'), 100);
    await blobs.publish(orphan, 'orphan_blob');
    await blobs.stage(blobChunks('staging'), 100);
    const db = new Database(path.join(root, 'detuned.sqlite'));
    const storage = new SqliteStorage(db);
    const clock = new SystemClock();
    const auth = new AuthService(storage, new CryptoHasher(), clock);
    // Seed an existing referenced object without invoking an HTTP upload in the child.
    const actorId = (db.prepare("SELECT id FROM actors WHERE kind='human' LIMIT 1").get() as { id: string }).id;
    const credential = (db.prepare('SELECT * FROM credentials LIMIT 1').get() as any);
    const context = { actor: storage.findActorById(actorId)!, credential: storage.findCredentialById(credential.id)! };
    const spaces = new SpaceService(storage, new CryptoIdGenerator(), clock, auth, new IdempotencyService(storage, new CryptoHasher(), clock));
    const space = spaces.createSpace(context, { slug: 'cli-artifact', objective: 'test', rules: [] }, 'cli-space');
    storage.createArtifact({ id: 'art_live', space_id: space.space.id, owner_id: actorId, visibility: 'space', review_assignment_id: null, check_run_id: null, sha256: live.sha256, bytes: live.bytes, mime: 'text/plain', storage_key: 'live_blob', state: 'ready', created_at: clock.nowIso() });
    db.close();
    const run = start(root, ['--artifact-max-file-bytes', '1024', '--artifact-max-space-bytes', '1', '--artifact-max-uploads', '2']);
    children.push(run.child);
    await waitStarted(run);
    expect(run.output().stderr).toContain('file=1024 space=1 uploads=2');
    expect(await readdir(path.join(root, 'artifacts/staging'))).toEqual([]);
    expect(await readdir(path.join(root, 'artifacts/objects'))).toEqual(['live_blob']);
    expect(await readFile(path.join(root, 'artifacts/objects/live_blob'), 'utf8')).toBe('live');
    run.child.kill('SIGTERM');
    expect(await run.exited).toBe(0);
    expect(await readdir(root)).not.toContain('detuned.lock');
  });
  it('never cleans objects when another process owns DirectoryLock', async () => {
    const blobs = await ArtifactFileStore.create(root);
    const staged = await blobs.stage(blobChunks('pending'), 100);
    const lock = new DirectoryLock(root);
    lock.acquire();
    try {
      const run = start(root);
      children.push(run.child);
      expect(await run.exited).not.toBe(0);
      expect(await readdir(path.join(root, 'artifacts/staging'))).toEqual([staged.stage_key]);
      expect(run.output().stderr).toContain('锁定');
    } finally { lock.release(); }
  });
  it('never cleans when database coordination fails and releases its acquired lock', async () => {
    const blobs = await ArtifactFileStore.create(root);
    const staged = await blobs.stage(blobChunks('pending'), 100);
    const db = new Database(path.join(root, 'detuned.sqlite'));
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(999, new Date().toISOString());
    db.close();
    const run = start(root);
    children.push(run.child);
    expect(await run.exited).not.toBe(0);
    expect(await readdir(path.join(root, 'artifacts/staging'))).toEqual([staged.stage_key]);
    expect(await readdir(root)).not.toContain('detuned.lock');
  });
  it('rejects invalid configuration before initializing artifact directories or starting listen', async () => {
    for (const extra of [
      ['--artifact-max-file-bytes', '26214401'], ['--artifact-max-space-bytes', '9007199254740992'],
      ['--artifact-max-uploads', '65'], ['--artifact-max-uploads', '0'], ['--artifact-max-file-bytes', '10oops'],
    ]) {
      const run = start(root, extra);
      children.push(run.child);
      expect(await run.exited).not.toBe(0);
      expect(await readdir(root)).not.toContain('artifacts');
      expect(await readdir(root)).not.toContain('detuned.lock');
    }
  });
});
