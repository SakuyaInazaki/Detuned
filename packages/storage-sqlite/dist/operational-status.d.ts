import Database from 'better-sqlite3';
import type { StorageOperationalStatus } from '@detuned/protocol';
export interface OperationalOptions {
    dataDir?: string;
}
export declare function directoryAvailable(dataDir: string): boolean;
/** Point checks supplement startup classification; they are not a full integrity audit. */
export declare function checkSqliteReadiness(db: Database.Database, options: OperationalOptions): boolean;
export declare function sampleSqliteStatus(db: Database.Database, options: OperationalOptions, usage: {
    objects: number;
    bytes: bigint;
}): StorageOperationalStatus;
//# sourceMappingURL=operational-status.d.ts.map