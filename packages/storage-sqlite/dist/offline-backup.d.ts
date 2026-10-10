import Database from 'better-sqlite3';
import { maintenanceTarget } from './directory-state.js';
export type MaintenanceStage = 'checkpoint' | 'copy' | 'file-sync' | 'manifest' | 'recovery-transaction' | 'reservation' | 'destination-created' | 'publication' | 'directory-sync' | 'readiness' | 'readiness-unlinked' | 'readiness-gate-restoring';
export interface MaintenanceHooks {
    atStage?: (stage: MaintenanceStage) => void;
}
export interface BackupFile {
    path: string;
    bytes: number;
    sha256: string;
}
export interface BackupArtifact extends BackupFile {
    id: string;
    storageKey: string;
    state: 'ready' | 'redacted' | 'missing';
    present: boolean;
}
export interface BackupManifest {
    format: 'detuned-physical-backup';
    version: 1;
    schemaVersion: 2 | 3 | 4 | 5 | 6;
    createdAt: string;
    database: BackupFile;
    artifacts: BackupArtifact[];
}
export interface BackupOptions {
    dataDir: string;
    outputDir: string;
    offline: true;
    hooks?: MaintenanceHooks;
}
export interface RestoreOptions {
    backupDir: string;
    dataDir: string;
    hooks?: MaintenanceHooks;
}
/** Reads through a no-follow fd; a copied file is complete and synced before it returns. */
export declare function copyMaintenanceFile(source: string, destination: string | undefined, hooks?: MaintenanceHooks, privateSource?: boolean): Promise<{
    bytes: number;
    sha256: string;
}>;
export declare function prepareMaintenanceStage(parent: string): Promise<string>;
export declare function publishMaintenanceDirectory(stage: string, target: ReturnType<typeof maintenanceTarget>, files: string[], hooks?: MaintenanceHooks): Promise<void>;
export declare function backupOffline(options: BackupOptions): Promise<{
    backupDir: string;
    manifest: BackupManifest;
}>;
export declare function restoreBackup(options: RestoreOptions): Promise<{
    dataDir: string;
    adminActorId: string;
    adminToken: string;
}>;
/** Isolation of a private restored/migrated instance; all changes commit together. */
export declare function resetRestoredIdentity(db: Database.Database, adminName: string, hooks?: MaintenanceHooks): {
    adminActorId: string;
    adminToken: string;
};
//# sourceMappingURL=offline-backup.d.ts.map