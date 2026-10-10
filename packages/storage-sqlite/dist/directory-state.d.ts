export type MaintenanceErrorCode = 'INVALID_OPTIONS' | 'OFFLINE_REQUIRED' | 'INVALID_SOURCE' | 'INVALID_BACKUP' | 'INCOMPLETE_DIRECTORY' | 'DESTINATION_EXISTS' | 'MAINTENANCE_FAILED';
export declare class MaintenanceError extends Error {
    readonly code: MaintenanceErrorCode;
    constructor(code: MaintenanceErrorCode, message: string, options?: ErrorOptions);
}
export declare const BACKUP_MANIFEST_FILE = "backup-manifest.json";
/** Canonical parent avoids aliases assigning different readiness gates to one target. */
export declare function maintenanceTarget(dataDir: string): {
    directory: string;
    parent: string;
    marker: string;
};
/** Invoke before directory creation and again while holding DirectoryLock, before opening SQLite. */
export declare function assertDataDirReady(dataDir: string): void;
//# sourceMappingURL=directory-state.d.ts.map