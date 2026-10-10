import { constants } from 'node:fs';
import { lstat, realpath, open, mkdir, mkdtemp, rm, unlink, opendir } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import { classifyDatabase } from './bootstrap.js';
import { DirectoryLock } from './lock.js';
import { SqliteStorage } from './sqlite-storage.js';
import { assertDataDirReady, maintenanceTarget, MaintenanceError, BACKUP_MANIFEST_FILE } from './directory-state.js';
const MAX_ARTIFACTS = 10000, MAX_MANIFEST = 8 * 1024 * 1024, MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;
const HEX = /^[0-9a-f]{64}$/, STORAGE_KEY = /^[A-Za-z0-9_-]{1,160}$/;
const fault = (hooks, stage) => { hooks?.atStage?.(stage); };
function failure(code, message) { throw new MaintenanceError(code, message); }
function exact(value, keys) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.sort().join(',');
}
function safeSize(value) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function inside(candidate, root) { return candidate === root || candidate.startsWith(root + path.sep); }
async function realDirectory(directory, code, privateMode = false) {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (privateMode && ((stat.mode & 0o777) !== 0o700 || stat.uid !== process.getuid?.())))
        failure(code, 'Directory is not a real private directory.');
    return realpath(directory);
}
async function syncDir(directory, hooks) {
    fault(hooks, 'directory-sync');
    const fd = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        await fd.sync();
    }
    finally {
        await fd.close();
    }
}
async function absent(file) {
    try {
        await lstat(file);
        return false;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return true;
        throw error;
    }
}
async function newTarget(output, source) {
    const target = maintenanceTarget(output);
    if (inside(target.directory, source) || inside(source, target.directory))
        throw new MaintenanceError('INVALID_OPTIONS', 'Maintenance destination must be separate from its source.');
    if (!await absent(target.directory))
        throw new MaintenanceError('DESTINATION_EXISTS', 'Maintenance destination already exists; no material was replaced.');
    if (!await absent(target.marker))
        throw new MaintenanceError('INCOMPLETE_DIRECTORY', 'An incomplete destination reservation exists; inspect it before manual cleanup.');
    return target;
}
function validateDatabase(db, code) {
    const classification = classifyDatabase(db);
    if (classification.kind !== 'current_initialized' || db.prepare('SELECT max(version) AS version FROM schema_migrations').get().version !== 2)
        failure(code, 'Only an initialized, valid current schema 2 database is supported.');
    const integrity = db.pragma('integrity_check');
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== 'ok' || db.pragma('foreign_key_check').length !== 0)
        failure(code, 'SQLite integrity or foreign key validation failed.');
}
function artifactRows(db, code) {
    const count = db.prepare('SELECT count(*) AS count FROM artifacts').get().count;
    if (count > MAX_ARTIFACTS)
        failure(code, 'Artifact inventory exceeds the supported maintenance limit.');
    const rows = db.prepare('SELECT id,storage_key,state,bytes,sha256 FROM artifacts ORDER BY id COLLATE BINARY').all();
    const ids = new Set(), keys = new Set();
    for (const row of rows) {
        if (typeof row.id !== 'string' || !row.id || Buffer.byteLength(row.id) > 512 || !STORAGE_KEY.test(row.storage_key) ||
            !['ready', 'redacted', 'missing'].includes(row.state) || !safeSize(row.bytes) || row.bytes > MAX_ARTIFACT_BYTES || !HEX.test(row.sha256) || ids.has(row.id) || keys.has(row.storage_key))
            failure(code, 'Invalid or duplicate registered artifact inventory.');
        ids.add(row.id);
        keys.add(row.storage_key);
    }
    return rows;
}
/** Reads through a no-follow fd; a copied file is complete and synced before it returns. */
export async function copyMaintenanceFile(source, destination, hooks, privateSource = false) {
    fault(hooks, 'copy');
    const input = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
    let output;
    try {
        const stat = await input.stat();
        if (!stat.isFile() || !safeSize(stat.size) || (privateSource && ((stat.mode & 0o777) !== 0o600 || stat.uid !== process.getuid?.())))
            throw new Error('Invalid maintenance file.');
        if (destination)
            output = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        const hash = createHash('sha256');
        let bytes = 0;
        const buffer = Buffer.alloc(64 * 1024);
        for (;;) {
            const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
            if (!bytesRead)
                break;
            bytes += bytesRead;
            if (!Number.isSafeInteger(bytes) || bytes > stat.size)
                throw new Error('Maintenance file changed while reading.');
            const chunk = buffer.subarray(0, bytesRead);
            hash.update(chunk);
            if (output) {
                let offset = 0;
                while (offset < bytesRead) {
                    const written = await output.write(chunk, offset, bytesRead - offset);
                    if (!written.bytesWritten)
                        throw new Error('Maintenance copy made no progress.');
                    offset += written.bytesWritten;
                }
            }
        }
        if (bytes !== stat.size)
            throw new Error('Maintenance file changed while reading.');
        if (output) {
            fault(hooks, 'file-sync');
            await output.sync();
        }
        return { bytes, sha256: hash.digest('hex') };
    }
    finally {
        await input.close();
        if (output)
            await output.close();
    }
}
export async function prepareMaintenanceStage(parent) {
    const stage = await mkdtemp(path.join(parent, '.detuned-maintenance-stage-'));
    await mkdir(path.join(stage, 'artifacts'), { mode: 0o700 });
    await mkdir(path.join(stage, 'artifacts', 'objects'), { mode: 0o700 });
    return stage;
}
async function writeManifest(stage, manifest, hooks) {
    fault(hooks, 'manifest');
    const text = JSON.stringify(manifest);
    if (Buffer.byteLength(text) > MAX_MANIFEST)
        throw new Error('Manifest exceeds the supported byte limit.');
    const fd = await open(path.join(stage, BACKUP_MANIFEST_FILE), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
        await fd.writeFile(text);
        fault(hooks, 'file-sync');
        await fd.sync();
    }
    finally {
        await fd.close();
    }
}
async function syncTree(root, hooks) {
    await syncDir(path.join(root, 'artifacts', 'objects'), hooks);
    await syncDir(path.join(root, 'artifacts'), hooks);
    await syncDir(root, hooks);
}
async function reserve(target, hooks) {
    fault(hooks, 'reservation');
    const fd = await open(target.marker, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
        await fd.writeFile(JSON.stringify({ version: 1, directory: target.directory, status: 'incomplete' }));
        await fd.sync();
    }
    finally {
        await fd.close();
    }
    await syncDir(target.parent, hooks);
}
export async function publishMaintenanceDirectory(stage, target, files, hooks) {
    await reserve(target, hooks);
    let lock;
    try {
        try {
            await mkdir(target.directory, { mode: 0o700 });
        }
        catch (error) {
            if (error.code === 'EEXIST') {
                // We own only the reservation, never this concurrently-created directory.
                await unlink(target.marker);
                await syncDir(target.parent);
                throw new MaintenanceError('DESTINATION_EXISTS', 'Destination appeared during publication; it was not touched.');
            }
            throw error;
        }
        fault(hooks, 'destination-created');
        lock = new DirectoryLock(target.directory);
        lock.acquire();
        await mkdir(path.join(target.directory, 'artifacts'), { mode: 0o700 });
        await mkdir(path.join(target.directory, 'artifacts', 'objects'), { mode: 0o700 });
        for (const file of files) {
            fault(hooks, 'publication');
            await copyMaintenanceFile(path.join(stage, file), path.join(target.directory, file), hooks, true);
        }
        await syncTree(target.directory, hooks);
        fault(hooks, 'readiness');
        await unlink(target.marker);
        try {
            fault(hooks, 'readiness-unlinked');
            await syncDir(target.parent, hooks);
        }
        catch (error) {
            try {
                fault(hooks, 'readiness-gate-restoring');
                await reserve(target);
            }
            catch {
                throw new MaintenanceError('MAINTENANCE_FAILED', 'Target data was fully written, but publication durability is unconfirmed and the startup gate could not be rebuilt. The target may be startable; do not use it. Retain the original backup and restore it to another new directory.');
            }
            throw error;
        }
    }
    finally {
        lock?.release();
    }
}
function parseManifest(text) {
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        failure('INVALID_BACKUP', 'Backup manifest is not valid JSON.');
    }
    if (!exact(value, ['format', 'version', 'schemaVersion', 'createdAt', 'database', 'artifacts']) || value.format !== 'detuned-physical-backup' || value.version !== 1 || value.schemaVersion !== 2 || typeof value.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt)) || !Array.isArray(value.artifacts) || value.artifacts.length > MAX_ARTIFACTS)
        failure('INVALID_BACKUP', 'Unsupported or malformed backup manifest.');
    if (!exact(value.database, ['path', 'bytes', 'sha256']) || value.database.path !== 'detuned.sqlite' || !safeSize(value.database.bytes) || typeof value.database.sha256 !== 'string' || !HEX.test(value.database.sha256))
        failure('INVALID_BACKUP', 'Invalid database manifest entry.');
    const ids = new Set(), keys = new Set(), paths = new Set();
    for (const entry of value.artifacts) {
        if (!exact(entry, ['id', 'storageKey', 'path', 'state', 'present', 'bytes', 'sha256']) || typeof entry.id !== 'string' || !entry.id || Buffer.byteLength(entry.id) > 512 || typeof entry.storageKey !== 'string' || !STORAGE_KEY.test(entry.storageKey) || entry.path !== `artifacts/objects/${entry.storageKey}` || !['ready', 'redacted', 'missing'].includes(entry.state) || typeof entry.present !== 'boolean' || (entry.state === 'ready' && !entry.present) || !safeSize(entry.bytes) || entry.bytes > MAX_ARTIFACT_BYTES || typeof entry.sha256 !== 'string' || !HEX.test(entry.sha256) || ids.has(entry.id) || keys.has(entry.storageKey) || paths.has(entry.path))
            failure('INVALID_BACKUP', 'Invalid or duplicate artifact manifest entry.');
        ids.add(entry.id);
        keys.add(entry.storageKey);
        paths.add(entry.path);
    }
    return value;
}
async function boundedManifest(root) {
    const fd = await open(path.join(root, BACKUP_MANIFEST_FILE), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const stat = await fd.stat();
        if (!stat.isFile() || stat.size > MAX_MANIFEST || (stat.mode & 0o777) !== 0o600 || stat.uid !== process.getuid?.())
            failure('INVALID_BACKUP', 'Backup manifest is not a private bounded file.');
        const bytes = Buffer.alloc(stat.size + 1);
        let offset = 0;
        while (offset < bytes.length) {
            const read = await fd.read(bytes, offset, bytes.length - offset, null);
            if (!read.bytesRead)
                break;
            offset += read.bytesRead;
        }
        if (offset !== stat.size)
            failure('INVALID_BACKUP', 'Backup manifest changed while reading.');
        return parseManifest(bytes.subarray(0, offset).toString('utf8'));
    }
    finally {
        await fd.close();
    }
}
async function validateLayout(root, manifest) {
    const allowedFiles = new Set([BACKUP_MANIFEST_FILE, 'detuned.sqlite', ...manifest.artifacts.filter(row => row.present).map(row => row.path)]);
    const allowedDirs = new Set(['artifacts', 'artifacts/objects']);
    let count = 0;
    const walk = async (directory, relative) => {
        const entries = await opendir(directory);
        for await (const entry of entries) {
            if (++count > MAX_ARTIFACTS + 4)
                failure('INVALID_BACKUP', 'Backup directory inventory exceeds its bound.');
            const name = relative ? `${relative}/${entry.name}` : entry.name;
            const stat = await lstat(path.join(root, name));
            if (stat.isSymbolicLink() || stat.uid !== process.getuid?.())
                failure('INVALID_BACKUP', 'Backup contains linked or unowned material.');
            if (stat.isDirectory() && allowedDirs.has(name) && (stat.mode & 0o777) === 0o700)
                await walk(path.join(root, name), name);
            else if (stat.isFile() && allowedFiles.delete(name) && (stat.mode & 0o777) === 0o600) { /* expected file */ }
            else
                failure('INVALID_BACKUP', 'Backup contains an unexpected path or non-private material.');
        }
    };
    await walk(root, '');
    if (allowedFiles.size)
        failure('INVALID_BACKUP', 'Backup is missing declared files.');
}
function matchInventory(rows, manifest) {
    if (rows.length !== manifest.artifacts.length)
        failure('INVALID_BACKUP', 'Backup and database artifact inventories differ.');
    const entries = new Map(manifest.artifacts.map(entry => [entry.id, entry]));
    for (const row of rows) {
        const entry = entries.get(row.id);
        if (!entry || entry.storageKey !== row.storage_key || entry.bytes !== row.bytes || entry.sha256 !== row.sha256 || entry.state !== row.state)
            failure('INVALID_BACKUP', 'Artifact manifest does not match registered database material.');
    }
}
export async function backupOffline(options) {
    if (options.offline !== true)
        throw new MaintenanceError('OFFLINE_REQUIRED', 'Backup requires explicit offline mode.');
    let lock, db, stage;
    try {
        const source = await realDirectory(path.resolve(options.dataDir), 'INVALID_SOURCE');
        assertDataDirReady(source);
        const target = await newTarget(options.outputDir, source);
        lock = new DirectoryLock(source);
        lock.acquire();
        assertDataDirReady(source);
        const sourceDB = path.join(source, 'detuned.sqlite');
        const sourceStat = await lstat(sourceDB);
        if (!sourceStat.isFile() || sourceStat.isSymbolicLink())
            failure('INVALID_SOURCE', 'Source database is not a normal file.');
        db = new Database(sourceDB, { fileMustExist: true, timeout: 0 });
        validateDatabase(db, 'INVALID_SOURCE');
        fault(options.hooks, 'checkpoint');
        const checkpoint = db.pragma('wal_checkpoint(TRUNCATE)');
        if (checkpoint.length !== 1 || checkpoint[0]?.busy !== 0 || (checkpoint[0].log !== -1 && checkpoint[0].log !== checkpoint[0].checkpointed))
            throw new MaintenanceError('MAINTENANCE_FAILED', 'WAL checkpoint did not complete; backup was not published.');
        db.close();
        db = undefined;
        stage = await prepareMaintenanceStage(target.parent);
        const database = { path: 'detuned.sqlite', ...await copyMaintenanceFile(sourceDB, path.join(stage, 'detuned.sqlite'), options.hooks) };
        const stagedDB = new Database(path.join(stage, 'detuned.sqlite'), { readonly: true, fileMustExist: true });
        let rows;
        try {
            validateDatabase(stagedDB, 'INVALID_SOURCE');
            rows = artifactRows(stagedDB, 'INVALID_SOURCE');
        }
        finally {
            stagedDB.close();
        }
        const artifacts = [];
        if (rows.length) {
            for (const directory of [path.join(source, 'artifacts'), path.join(source, 'artifacts', 'objects')]) {
                if (!await absent(directory))
                    await realDirectory(directory, 'INVALID_SOURCE');
            }
        }
        for (const row of rows) {
            const relative = `artifacts/objects/${row.storage_key}`, file = path.join(source, relative);
            const present = !await absent(file);
            if (!present && row.state === 'ready')
                failure('INVALID_SOURCE', 'A ready registered artifact file is missing.');
            if (present) {
                const copied = await copyMaintenanceFile(file, path.join(stage, relative), options.hooks);
                if (copied.bytes !== row.bytes || copied.sha256 !== row.sha256)
                    failure('INVALID_SOURCE', 'Registered artifact bytes or hash do not match.');
            }
            artifacts.push({ id: row.id, storageKey: row.storage_key, state: row.state, present, path: relative, bytes: row.bytes, sha256: row.sha256 });
        }
        const manifest = { format: 'detuned-physical-backup', version: 1, schemaVersion: 2, createdAt: new Date().toISOString(), database, artifacts };
        await writeManifest(stage, manifest, options.hooks);
        await syncTree(stage, options.hooks);
        await publishMaintenanceDirectory(stage, target, [BACKUP_MANIFEST_FILE, 'detuned.sqlite', ...artifacts.filter(row => row.present).map(row => row.path)], options.hooks);
        return { backupDir: target.directory, manifest };
    }
    catch (error) {
        if (error instanceof MaintenanceError)
            throw error;
        throw new MaintenanceError('MAINTENANCE_FAILED', 'Offline backup failed; inspect any incomplete destination reservation before manual cleanup.', { cause: error });
    }
    finally {
        db?.close();
        lock?.release();
        if (stage)
            await rm(stage, { recursive: true, force: true }).catch(() => { });
    }
}
export async function restoreBackup(options) {
    let stage;
    try {
        const source = await realDirectory(path.resolve(options.backupDir), 'INVALID_BACKUP', true);
        const sourceTarget = maintenanceTarget(source);
        if (!await absent(sourceTarget.marker))
            throw new MaintenanceError('INCOMPLETE_DIRECTORY', 'Backup publication is incomplete.');
        const target = await newTarget(options.dataDir, source);
        const manifest = await boundedManifest(source);
        await validateLayout(source, manifest);
        stage = await prepareMaintenanceStage(target.parent);
        for (const entry of [manifest.database, ...manifest.artifacts.filter(row => row.present)]) {
            const copied = await copyMaintenanceFile(path.join(source, entry.path), path.join(stage, entry.path), options.hooks, true);
            if (copied.bytes !== entry.bytes || copied.sha256 !== entry.sha256)
                failure('INVALID_BACKUP', 'Backup file bytes or hash do not match its manifest.');
        }
        const db = new Database(path.join(stage, 'detuned.sqlite'), { fileMustExist: true });
        let adminActorId, adminToken;
        try {
            validateDatabase(db, 'INVALID_BACKUP');
            matchInventory(artifactRows(db, 'INVALID_BACKUP'), manifest);
            // New target only: do not mutate or migrate the source backup.
            db.pragma('journal_mode = DELETE');
            db.pragma('synchronous = FULL');
            db.pragma('foreign_keys = ON');
            ({ adminActorId, adminToken } = resetRestoredIdentity(db, 'Local recovery administrator', options.hooks));
            const checkpoint = db.pragma('wal_checkpoint(TRUNCATE)');
            if (checkpoint[0]?.busy !== 0)
                throw new Error('Restored database checkpoint did not complete.');
            db.pragma('journal_mode = DELETE');
            validateDatabase(db, 'INVALID_BACKUP');
        }
        finally {
            db.close();
        }
        const fd = await open(path.join(stage, 'detuned.sqlite'), constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            fault(options.hooks, 'file-sync');
            await fd.sync();
        }
        finally {
            await fd.close();
        }
        await syncTree(stage, options.hooks);
        await publishMaintenanceDirectory(stage, target, ['detuned.sqlite', ...manifest.artifacts.filter(row => row.present).map(row => row.path)], options.hooks);
        return { dataDir: target.directory, adminActorId, adminToken };
    }
    catch (error) {
        if (error instanceof MaintenanceError)
            throw error;
        throw new MaintenanceError('MAINTENANCE_FAILED', 'Backup restore failed; incomplete results must not be served. Restore the unchanged backup to another new directory if the one-time credential output was lost.', { cause: error });
    }
    finally {
        if (stage)
            await rm(stage, { recursive: true, force: true }).catch(() => { });
    }
}
/** Isolation of a private restored/migrated instance; all changes commit together. */
export function resetRestoredIdentity(db, adminName, hooks) {
    const storage = new SqliteStorage(db), adminActorId = `act_recovery_${randomBytes(12).toString('hex')}`, adminToken = `detuned_adm_${randomBytes(24).toString('hex')}`, now = new Date().toISOString();
    db.transaction(() => { db.prepare('UPDATE credentials SET revoked_at = ? WHERE revoked_at IS NULL').run(now); db.prepare("UPDATE instance_metadata SET value = ? WHERE key = 'token_secret'").run(randomBytes(32).toString('hex')); storage.createActor({ id: adminActorId, kind: 'human', display_name: adminName, created_at: now, disabled_at: null }); storage.createCredential({ id: `cred_recovery_${randomBytes(12).toString('hex')}`, actor_id: adminActorId, token_hash: createHash('sha256').update(adminToken).digest('hex'), allowed_space_ids: ['*'], capabilities: ['read', 'write', 'admin'], expires_at: null, revoked_at: null, created_at: now }); fault(hooks, 'recovery-transaction'); })();
    return { adminActorId, adminToken };
}
//# sourceMappingURL=offline-backup.js.map