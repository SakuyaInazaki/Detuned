import { type MaintenanceStage } from './offline-backup.js';
export type ImportErrorCode = 'INVALID_OPTIONS' | 'INVALID_INPUT' | 'IMPORT_CANCELLED' | 'IMPORT_TIMEOUT' | 'DESTINATION_EXISTS' | 'INCOMPLETE_DIRECTORY' | 'IMPORT_FAILED';
export declare class ImportError extends Error {
    readonly code: ImportErrorCode;
    constructor(code: ImportErrorCode, message: string);
}
export type ImportStage = MaintenanceStage | 'input-opened' | 'record' | 'validation' | 'import-transaction';
export interface ImportOptions {
    inputPath: string;
    dataDir: string;
    adminName: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    hooks?: {
        atStage?: (stage: ImportStage) => void;
    };
}
export declare function importSpace(options: ImportOptions): Promise<{
    data_dir: string;
    space_id: string;
    admin_actor_id: string;
    admin_token: string;
    import_id: string;
    record_count: number;
}>;
//# sourceMappingURL=logical-import.d.ts.map