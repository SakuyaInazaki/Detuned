import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export class MaintenanceError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.code = code;
        this.name = 'MaintenanceError';
    }
}
export const BACKUP_MANIFEST_FILE = 'backup-manifest.json';
/** Canonical parent avoids aliases assigning different readiness gates to one target. */
export function maintenanceTarget(dataDir) {
    const requested = path.resolve(dataDir);
    const parent = fs.realpathSync(path.dirname(requested));
    const name = path.basename(requested);
    const directory = path.join(parent, name);
    const marker = path.join(parent, `.detuned-incomplete-${createHash('sha256').update(directory).digest('hex')}`);
    return { directory, parent, marker };
}
/** Invoke before directory creation and again while holding DirectoryLock, before opening SQLite. */
export function assertDataDirReady(dataDir) {
    let target;
    try {
        target = maintenanceTarget(dataDir);
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return;
        throw new MaintenanceError('INCOMPLETE_DIRECTORY', 'Cannot check data directory readiness.', { cause: error });
    }
    for (const file of [target.marker, path.join(target.directory, BACKUP_MANIFEST_FILE)]) {
        try {
            fs.lstatSync(file);
            throw new MaintenanceError('INCOMPLETE_DIRECTORY', 'Directory is an incomplete maintenance result or a physical backup; do not initialize or serve it.');
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
    }
}
//# sourceMappingURL=directory-state.js.map