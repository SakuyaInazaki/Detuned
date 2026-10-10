import Database from 'better-sqlite3';
import { constants } from 'node:fs';
import { lstat, realpath, chmod, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { bootstrapDatabase, classifyDatabase } from './bootstrap.js';
import { DirectoryLock } from './lock.js';
import { assertDataDirReady, maintenanceTarget, MaintenanceError } from './directory-state.js';
import { prepareMaintenanceStage, publishMaintenanceDirectory, copyMaintenanceFile, resetRestoredIdentity } from './offline-backup.js';
export class UpgradeError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'UpgradeError';
    }
}
const bad = () => { throw new UpgradeError('INVALID_SOURCE', 'Source is not a valid initialized schema 1 or 2 instance or its registered attachments are invalid.'); };
async function regularDirectory(file) { const stat = await lstat(file); if (!stat.isDirectory() || stat.isSymbolicLink())
    bad(); return realpath(file); }
function validateDB(db, legacy) { const classification = classifyDatabase(db); if (legacy ? (classification.kind !== 'supported_legacy' || ![1, 2].includes(classification.maxVersion ?? 0)) : classification.kind !== 'current_initialized')
    bad(); if (db.prepare('PRAGMA foreign_key_check').get())
    bad(); const integrity = db.prepare('PRAGMA integrity_check').get(); if (integrity.integrity_check !== 'ok')
    bad(); }
async function copyArtifacts(db, source, stage, check, hook) {
    const total = db.prepare('SELECT count(*) AS n FROM artifacts').get().n;
    if (total > 10000)
        bad();
    const keys = new Set(), files = [];
    let last = '';
    let rootsChecked = false, seen = 0;
    for (;;) {
        check();
        const row = db.prepare('SELECT id,storage_key,state,sha256,bytes FROM artifacts WHERE id>? ORDER BY id LIMIT 1').get(last);
        if (!row)
            break;
        last = row.id;
        seen++;
        if (typeof row.id !== 'string' || !row.id || Buffer.byteLength(row.id) > 512 || typeof row.storage_key !== 'string' || typeof row.sha256 !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(row.storage_key) || keys.has(row.storage_key) || !['ready', 'redacted', 'missing'].includes(row.state) || !/^[0-9a-f]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || row.bytes > 25 * 1024 * 1024)
            bad();
        keys.add(row.storage_key);
        if (!rootsChecked) {
            try {
                await regularDirectory(path.join(source, 'artifacts'));
                await regularDirectory(path.join(source, 'artifacts', 'objects'));
                rootsChecked = true;
            }
            catch (e) {
                if (e.code !== 'ENOENT')
                    throw e;
            }
        }
        const relative = path.join('artifacts', 'objects', row.storage_key), file = path.join(source, relative);
        let exists = true;
        try {
            const st = await lstat(file);
            if (!st.isFile() || st.isSymbolicLink())
                bad();
        }
        catch (e) {
            if (e.code === 'ENOENT')
                exists = false;
            else
                throw e;
        }
        if (!exists) {
            if (row.state === 'ready')
                bad();
            continue;
        }
        if (!rootsChecked)
            bad();
        const copied = await copyMaintenanceFile(file, path.join(stage, relative), { atStage: hook });
        if (copied.sha256 !== row.sha256 || copied.bytes !== row.bytes)
            bad();
        files.push(relative);
    }
    if (seen !== total)
        bad();
    return files;
}
export async function upgradeOffline(options) {
    if (options.offline !== true)
        throw new UpgradeError('OFFLINE_REQUIRED', 'Offline upgrade requires explicit offline mode.');
    const timeout = options.timeoutMs ?? 120000, name = typeof options.adminName === 'string' ? options.adminName.trim() : '';
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 120000 || !name || [...name].length > 128 || typeof options.dataDir !== 'string' || !options.dataDir.trim() || typeof options.outputDir !== 'string' || !options.outputDir.trim())
        throw new UpgradeError('INVALID_OPTIONS', 'Upgrade requires source, a new output directory, administrator name and timeout in 1–120000ms.');
    const started = performance.now();
    let readinessUnlinked = false;
    const check = () => { if (readinessUnlinked)
        return; if (performance.now() - started >= timeout)
        throw new UpgradeError('UPGRADE_TIMEOUT', 'Offline upgrade timed out.'); if (options.signal?.aborted)
        throw new UpgradeError('UPGRADE_CANCELLED', 'Offline upgrade was cancelled.'); };
    const hook = (s) => { if (s === 'readiness-unlinked')
        readinessUnlinked = true; check(); options.hooks?.atStage?.(s); check(); };
    let sourceDB, stagedDB, lock, stage;
    try {
        check();
        const source = await regularDirectory(path.resolve(options.dataDir));
        assertDataDirReady(source);
        const target = maintenanceTarget(options.outputDir);
        if (target.directory === source || target.directory.startsWith(source + path.sep) || source.startsWith(target.directory + path.sep))
            throw new UpgradeError('INVALID_OPTIONS', 'Upgrade destination must be separate from source.');
        for (const [file, code] of [[target.directory, 'DESTINATION_EXISTS'], [target.marker, 'INCOMPLETE_DIRECTORY']]) {
            try {
                await lstat(file);
                throw new UpgradeError(code, 'Upgrade destination already exists or is incomplete; nothing was replaced.');
            }
            catch (e) {
                if (e.code !== 'ENOENT')
                    throw e;
            }
        }
        lock = new DirectoryLock(source);
        lock.acquire();
        assertDataDirReady(source);
        hook('after-source-lock');
        const dbFile = path.join(source, 'detuned.sqlite'), stat = await lstat(dbFile);
        if (!stat.isFile() || stat.isSymbolicLink())
            bad();
        sourceDB = new Database(dbFile, { readonly: true, fileMustExist: true, timeout: 0 });
        validateDB(sourceDB, true);
        const sourceVersion = classifyDatabase(sourceDB).maxVersion;
        stage = await prepareMaintenanceStage(target.parent);
        const stagedFile = path.join(stage, 'detuned.sqlite');
        await sourceDB.backup(stagedFile, { progress: () => { hook('backup-step'); return 100; } });
        check();
        await chmod(stagedFile, 0o600);
        stagedDB = new Database(stagedFile, { fileMustExist: true });
        validateDB(stagedDB, true);
        const files = await copyArtifacts(stagedDB, source, stage, check, hook);
        hook('after-copy');
        sourceDB.close();
        sourceDB = undefined;
        hook('before-migrate');
        bootstrapDatabase(stagedDB);
        hook('after-migrate');
        validateDB(stagedDB, false);
        // Recheck copied attachments against the migrated registry without collecting all rows.
        let last = '';
        for (;;) {
            check();
            const row = stagedDB.prepare('SELECT id,storage_key,sha256,bytes,state FROM artifacts WHERE id>? ORDER BY id LIMIT 1').get(last);
            if (!row)
                break;
            last = row.id;
            const file = path.join(stage, 'artifacts', 'objects', row.storage_key);
            try {
                const copied = await copyMaintenanceFile(file, undefined, { atStage: hook }, true);
                if (copied.sha256 !== row.sha256 || copied.bytes !== row.bytes)
                    bad();
            }
            catch (e) {
                if (e.code === 'ENOENT' && row.state !== 'ready')
                    continue;
                throw e;
            }
        }
        const identity = resetRestoredIdentity(stagedDB, name, { atStage: () => hook('credential-reset') });
        validateDB(stagedDB, false);
        const checkpoint = stagedDB.pragma('wal_checkpoint(TRUNCATE)');
        if (checkpoint[0]?.busy !== 0 || (checkpoint[0].log !== -1 && checkpoint[0].log !== checkpoint[0].checkpointed))
            throw new UpgradeError('UPGRADE_FAILED', 'Upgrade checkpoint did not complete.');
        stagedDB.close();
        stagedDB = undefined;
        const fd = await open(stagedFile, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            hook('file-sync');
            await fd.sync();
        }
        finally {
            await fd.close();
        }
        await publishMaintenanceDirectory(stage, target, ['detuned.sqlite', ...files], { atStage: hook });
        return { data_dir: target.directory, source_data_dir: source, source_schema_version: sourceVersion, schema_version: 3, upgrade_id: 'upg_' + randomBytes(16).toString('hex'), admin_actor_id: identity.adminActorId, admin_token: identity.adminToken };
    }
    catch (e) {
        if (e instanceof UpgradeError)
            throw e;
        if (e instanceof MaintenanceError) {
            const code = e.code === 'DESTINATION_EXISTS' ? 'DESTINATION_EXISTS' : e.code === 'INCOMPLETE_DIRECTORY' ? 'INCOMPLETE_DIRECTORY' : 'UPGRADE_FAILED';
            throw new UpgradeError(code, e.message.replace('Retain the original backup and restore it', 'Retain the original old instance and upgrade it'));
        }
        throw new UpgradeError('UPGRADE_FAILED', 'Offline copy upgrade failed; keep the original instance and retry to another new directory.');
    }
    finally {
        sourceDB?.close();
        stagedDB?.close();
        lock?.release();
        if (stage)
            await rm(stage, { recursive: true, force: true }).catch(() => { });
    }
}
//# sourceMappingURL=offline-upgrade.js.map