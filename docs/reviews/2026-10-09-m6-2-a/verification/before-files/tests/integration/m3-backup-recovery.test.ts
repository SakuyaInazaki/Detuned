import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile, readFile, readdir, stat, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { chmodSync } from 'node:fs';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage, DirectoryLock, backupOffline, restoreBackup, assertDataDirReady, maintenanceTarget, type BackupManifest, type MaintenanceStage } from '../../packages/storage-sqlite/src/index.js';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'detuned-backup-')); roots.push(root);
  const source = path.join(root, 'source'); await mkdir(source, { mode: 0o700 });
  const db = new Database(path.join(source, 'detuned.sqlite')); const initial = bootstrapDatabase(db);
  const storage = new SqliteStorage(db); const actor = initial.adminActorId!;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO spaces(id,slug,current_revision,policy_revision,acl_epoch,created_at) VALUES(?,?,1,1,1,?)').run('space', 'space', now);
  await mkdir(path.join(source, 'artifacts'), { mode: 0o700 }); await mkdir(path.join(source, 'artifacts', 'objects'), { mode: 0o700 });
  const add = async (id: string, state: 'ready' | 'redacted' | 'missing', present: boolean) => {
    const body = Buffer.from('artifact-' + id); const key = 'object_' + id;
    storage.createArtifact({ id, space_id: 'space', owner_id: actor, visibility: 'space', review_assignment_id: null, check_run_id: null, sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length, mime: 'application/octet-stream', storage_key: key, state, created_at: now });
    if (present) await writeFile(path.join(source, 'artifacts', 'objects', key), body, { mode: 0o600 });
  };
  await add('ready', 'ready', true); await add('redacted', 'redacted', true); await add('missing', 'missing', false);
  await writeFile(path.join(source, 'artifacts', 'objects', 'orphan'), 'exclude');
  await mkdir(path.join(source, 'artifacts', 'staging'), { mode: 0o700 }); await writeFile(path.join(source, 'artifacts', 'staging', 'stage'), 'exclude');
  const secret = storage.getInstanceSecret(); db.close();
  return { root, source, initial, secret, backup: path.join(root, 'backup'), restored: path.join(root, 'restored') };
}
async function manifest(directory: string): Promise<BackupManifest> { return JSON.parse(await readFile(path.join(directory, 'backup-manifest.json'), 'utf8')); }
async function rewrite(directory: string, edit: (value: BackupManifest) => void) { const value = await manifest(directory); edit(value); await writeFile(path.join(directory, 'backup-manifest.json'), JSON.stringify(value)); }
describe('M3.3-A offline physical maintenance', () => {
  it('backs up exact registered material and restores with isolated recovery credentials', async () => {
    const f = await fixture(); const result = await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true });
    expect(result.manifest.artifacts.map(row => [row.id, row.state, row.present])).toEqual([['missing', 'missing', false], ['ready', 'ready', true], ['redacted', 'redacted', true]]);
    expect(await readdir(f.backup)).toEqual(['artifacts', 'backup-manifest.json', 'detuned.sqlite']);
    expect(await readdir(path.join(f.backup, 'artifacts', 'objects'))).toEqual(['object_ready', 'object_redacted']);
    const originalBackup = await readFile(path.join(f.backup, 'detuned.sqlite'));
    const recovered = await restoreBackup({ backupDir: f.backup, dataDir: f.restored });
    expect(() => assertDataDirReady(f.restored)).not.toThrow(); expect(() => assertDataDirReady(f.backup)).toThrow();
    const db = new Database(path.join(f.restored, 'detuned.sqlite')); const storage = new SqliteStorage(db);
    expect(storage.getInstanceSecret()).not.toBe(f.secret);
    const oldHash = createHash('sha256').update(f.initial.adminToken!).digest('hex');
    expect(storage.findCredentialByTokenHash(oldHash)?.revoked_at).not.toBeNull();
    const newHash = createHash('sha256').update(recovered.adminToken).digest('hex'); const credential = storage.findCredentialByTokenHash(newHash)!;
    expect(credential.actor_id).toBe(recovered.adminActorId); expect(credential.capabilities).toEqual(['read', 'write', 'admin']);
    expect(recovered.adminActorId).not.toBe(f.initial.adminActorId); expect(storage.findActorById(recovered.adminActorId)?.kind).toBe('human');
    expect(db.prepare('SELECT state FROM artifacts ORDER BY id').all()).toEqual([{ state: 'missing' }, { state: 'ready' }, { state: 'redacted' }]); db.close();
    expect(await readFile(path.join(f.backup, 'detuned.sqlite'))).toEqual(originalBackup);
    expect((await stat(f.backup)).mode & 0o777).toBe(0o700); expect((await stat(path.join(f.restored, 'detuned.sqlite'))).mode & 0o777).toBe(0o600);
    expect(await readFile(path.join(f.backup, 'backup-manifest.json'), 'utf8')).not.toContain(recovered.adminToken);
  });
  it('requires offline mode, rejects active cooperative writers and never overwrites destinations', async () => {
    const f = await fixture();
    await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: false as true })).rejects.toMatchObject({ code: 'OFFLINE_REQUIRED' });
    const lock = new DirectoryLock(f.source); lock.acquire();
    try { await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true })).rejects.toMatchObject({ code: 'MAINTENANCE_FAILED' }); } finally { lock.release(); }
    await mkdir(f.backup); await writeFile(path.join(f.backup, 'existing'), 'original');
    await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true })).rejects.toMatchObject({ code: 'DESTINATION_EXISTS' });
    expect(await readFile(path.join(f.backup, 'existing'), 'utf8')).toBe('original');
    await expect(backupOffline({ dataDir: f.source, outputDir: path.join(f.source, 'nested'), offline: true })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  });
  it('rejects ready missing or corrupt bytes without publishing a backup', async () => {
    for (const corrupt of [false, true]) {
      const f = await fixture(); const file = path.join(f.source, 'artifacts', 'objects', 'object_ready');
      if (corrupt) await writeFile(file, 'corrupt'); else await rm(file);
      await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true })).rejects.toMatchObject({ code: 'INVALID_SOURCE' });
      expect(await readdir(f.root)).toEqual(['source']);
    }
  });
  it('rejects manifest shape, traversal, duplicates, wrong versions and hidden inventory without changing backup', async () => {
    const cases: ((value: BackupManifest) => void)[] = [
      value => { (value as any).extra = true; }, value => { value.version = 2 as 1; }, value => { value.schemaVersion = 4 as 3; },
      value => { value.database.path = '../detuned.sqlite'; }, value => { value.artifacts.push(value.artifacts[0]!); },
      value => { value.artifacts = value.artifacts.filter(row => row.id !== 'ready'); }, value => { value.artifacts.find(row => row.id === 'ready')!.present = false; },
    ];
    for (const edit of cases) {
      const f = await fixture(); await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true }); await rewrite(f.backup, edit);
      const before = await readFile(path.join(f.backup, 'detuned.sqlite'));
      await expect(restoreBackup({ backupDir: f.backup, dataDir: f.restored })).rejects.toMatchObject({ code: 'INVALID_BACKUP' });
      expect(await readFile(path.join(f.backup, 'detuned.sqlite'))).toEqual(before); expect(await readdir(f.root)).toEqual(['backup', 'source']);
    }
  });
  it('rejects links, extra paths and checksum tampering', async () => {
    for (const kind of ['link', 'extra', 'hash']) {
      const f = await fixture(); await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true });
      if (kind === 'link') { const file = path.join(f.backup, 'artifacts', 'objects', 'object_ready'); await rm(file); await symlink(path.join(f.source, 'artifacts', 'objects', 'object_ready'), file); }
      else if (kind === 'extra') await writeFile(path.join(f.backup, 'extra'), 'not declared', { mode: 0o600 });
      else await rewrite(f.backup, value => { value.database.sha256 = '0'.repeat(64); });
      await expect(restoreBackup({ backupDir: f.backup, dataDir: f.restored })).rejects.toMatchObject({ code: 'INVALID_BACKUP' });
    }
  });
  it('preserves incomplete reservations and rejects runtime entry at publication faults', async () => {
    for (const phase of ['destination-created', 'publication', 'readiness'] as MaintenanceStage[]) {
      const f = await fixture(); await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true });
      await expect(restoreBackup({ backupDir: f.backup, dataDir: f.restored, hooks: { atStage(stage) { if (stage === phase) throw new Error('injected'); } } })).rejects.toMatchObject({ code: 'MAINTENANCE_FAILED' });
      expect(() => assertDataDirReady(f.restored)).toThrow(); expect(await stat(maintenanceTarget(f.restored).marker)).toBeDefined();
      expect(await readdir(f.root)).not.toContain('.detuned-maintenance-stage');
    }
  });
  it('fails before publication at copy, manifest, checkpoint and recovery transaction boundaries', async () => {
    for (const phase of ['checkpoint', 'copy', 'manifest', 'recovery-transaction'] as MaintenanceStage[]) {
      const f = await fixture();
      if (phase === 'recovery-transaction') {
        await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true });
        await expect(restoreBackup({ backupDir: f.backup, dataDir: f.restored, hooks: { atStage(stage) { if (stage === phase) throw new Error('injected'); } } })).rejects.toMatchObject({ code: 'MAINTENANCE_FAILED' });
        expect(await readdir(f.root)).toEqual(['backup', 'source']);
      } else {
        await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true, hooks: { atStage(stage) { if (stage === phase) throw new Error('injected'); } } })).rejects.toMatchObject({ code: 'MAINTENANCE_FAILED' });
        expect(await readdir(f.root)).toEqual(['source']);
      }
    }
  });
  it('keeps legacy directory gate compatibility but refuses incomplete source and physical backup as source', async () => {
    const f = await fixture(); expect(() => assertDataDirReady(f.source)).not.toThrow(); expect(() => assertDataDirReady(path.join(f.root, 'missing', 'nested'))).not.toThrow();
    await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true });
    await expect(backupOffline({ dataDir: f.backup, outputDir: path.join(f.root, 'again'), offline: true })).rejects.toMatchObject({ code: 'INCOMPLETE_DIRECTORY' });
    await writeFile(maintenanceTarget(f.source).marker, 'incomplete');
    await expect(backupOffline({ dataDir: f.source, outputDir: path.join(f.root, 'again'), offline: true })).rejects.toMatchObject({ code: 'INCOMPLETE_DIRECTORY' });
  });
  it('accepts a current DELETE journal source and refuses an unfinished WAL checkpoint', async () => {
    const f = await fixture();
    const plain = new Database(path.join(f.source, 'detuned.sqlite')); plain.pragma('journal_mode=DELETE'); plain.close();
    await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true })).resolves.toMatchObject({ backupDir: maintenanceTarget(f.backup).directory });
    const busy = await fixture();
    const writer = new Database(path.join(busy.source, 'detuned.sqlite')); writer.pragma('journal_mode=WAL'); writer.pragma('wal_autocheckpoint=0');
    writer.prepare("UPDATE spaces SET slug='before-reader' WHERE id='space'").run();
    const reader = new Database(path.join(busy.source, 'detuned.sqlite')); reader.exec('BEGIN'); reader.prepare('SELECT * FROM spaces').all();
    writer.prepare("UPDATE spaces SET slug='after-reader' WHERE id='space'").run();
    try {
      await expect(backupOffline({ dataDir: busy.source, outputDir: busy.backup, offline: true })).rejects.toMatchObject({ code: 'MAINTENANCE_FAILED' });
      expect(await readdir(busy.root)).toEqual(['source']);
    } finally { reader.exec('ROLLBACK'); reader.close(); writer.close(); }
  });
  it('rejects non-current, corrupt and foreign-key-invalid source databases without publishing', async () => {
    for (const kind of ['future', 'legacy', 'corrupt', 'fk']) {
      const f = await fixture(); const db = new Database(path.join(f.source, 'detuned.sqlite'));
      if (kind === 'future') db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(4,?)').run(new Date().toISOString());
      else if (kind === 'legacy') { db.exec('DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions'); db.exec('DROP TABLE instance_metadata'); db.exec('DELETE FROM schema_migrations WHERE version>1'); }
      else if (kind === 'corrupt') db.exec('DROP TABLE credentials');
      else { db.pragma('foreign_keys=OFF'); db.prepare("UPDATE artifacts SET owner_id='absent-owner' WHERE id='ready'").run(); }
      db.close(); const before = await readFile(path.join(f.source, 'detuned.sqlite'));
      await expect(backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true })).rejects.toMatchObject({ code: 'INVALID_SOURCE' });
      expect(await readdir(f.root)).toEqual(['source']); expect(await readFile(path.join(f.source, 'detuned.sqlite'))).toEqual(before);
    }
  });

  it('reports complete but uncertain delivery when post-unlink sync and startup-gate rebuilding both fail', async () => {
    const f = await fixture(); await backupOffline({ dataDir: f.source, outputDir: f.backup, offline: true });
    const before = await readFile(path.join(f.backup, 'detuned.sqlite'));
    let pastReadiness = false;
    try {
      await expect(restoreBackup({ backupDir: f.backup, dataDir: f.restored, hooks: { atStage(stage) {
        if (stage === 'readiness') pastReadiness = true;
        else if (pastReadiness && stage === 'directory-sync') { chmodSync(f.root, 0o500); throw new Error('injected final parent sync failure'); }
      } } })).rejects.toMatchObject({ code: 'MAINTENANCE_FAILED', message: expect.stringContaining('target may be startable; do not use it') });
    } finally { chmodSync(f.root, 0o700); }
    expect(() => assertDataDirReady(f.restored)).not.toThrow();
    expect(await readdir(f.root)).not.toContain(path.basename(maintenanceTarget(f.restored).marker));
    const db = new Database(path.join(f.restored, 'detuned.sqlite'), { readonly: true, fileMustExist: true });
    try {
      expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
      expect(db.prepare('SELECT count(*) AS n FROM credentials WHERE revoked_at IS NULL').get()).toEqual({ n: 1 });
      expect(db.prepare("SELECT count(*) AS n FROM actors WHERE kind='human' AND id<>?").get(f.initial.adminActorId)).toEqual({ n: 1 });
    } finally { db.close(); }
    expect(await readFile(path.join(f.backup, 'detuned.sqlite'))).toEqual(before);
  });

});
