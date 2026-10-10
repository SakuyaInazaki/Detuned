import Database from 'better-sqlite3';
export declare const CURRENT_SCHEMA_VERSION = 6;
export interface BootstrapResult {
    isNewInstance: boolean;
    adminToken: string | null;
    adminActorId: string | null;
}
export type DatabaseClassification = 'blank' | 'supported_legacy' | 'current_initialized' | 'corrupt' | 'future' | 'unknown';
export interface ClassificationResult {
    kind: DatabaseClassification;
    maxVersion?: number;
    reason?: string;
}
export declare function classifyDatabase(db: Database.Database): ClassificationResult;
export declare function isDatabaseInitialized(db: Database.Database): boolean;
export declare function migrateIdempotencyRecords(db: Database.Database): void;
export declare function bootstrapDatabase(db: Database.Database, adminDisplayName?: string): BootstrapResult;
export declare function openAndCoordinateDatabase(db: Database.Database, mode: 'init' | 'serve'): BootstrapResult;
//# sourceMappingURL=bootstrap.d.ts.map