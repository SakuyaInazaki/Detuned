import { type MaintenanceStage } from './offline-backup.js';
export type UpgradeErrorCode = 'INVALID_OPTIONS' | 'OFFLINE_REQUIRED' | 'INVALID_SOURCE' | 'INCOMPLETE_DIRECTORY' | 'DESTINATION_EXISTS' | 'UPGRADE_CANCELLED' | 'UPGRADE_TIMEOUT' | 'UPGRADE_FAILED';
export declare class UpgradeError extends Error {
    readonly code: UpgradeErrorCode;
    constructor(code: UpgradeErrorCode, message: string);
}
export type UpgradeStage = MaintenanceStage | 'after-source-lock' | 'backup-step' | 'after-copy' | 'before-migrate' | 'after-migrate' | 'credential-reset';
export interface UpgradeOptions {
    dataDir: string;
    outputDir: string;
    offline: true;
    adminName: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    hooks?: {
        atStage?: (stage: UpgradeStage) => void;
    };
}
export declare function upgradeOffline(options: UpgradeOptions): Promise<{
    data_dir: string;
    source_data_dir: string;
    source_schema_version: 1 | 2 | 3 | 4 | 5;
    schema_version: 6;
    upgrade_id: string;
    admin_actor_id: string;
    admin_token: string;
}>;
//# sourceMappingURL=offline-upgrade.d.ts.map