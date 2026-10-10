import { type CheckRunRecord, type CheckReceiptRecord } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
export declare function readCheckRun(storage: StoragePort, spaceId: string, id: string, version?: number): CheckRunRecord;
export declare function readCheckReceipt(storage: StoragePort, spaceId: string, runId: string): CheckReceiptRecord;
export declare function assertCheckOnlinePrivacy(storage: StoragePort, spaceId: string, run: CheckRunRecord): void;
export declare function readRequiredCheckFacts(storage: StoragePort, spaceId: string, requestId: string): {
    checks: {
        name: string;
        run: CheckRunRecord | null;
        receipt: CheckReceiptRecord | null;
    }[];
    verification_status: "not_required" | "failed" | "error" | "passed" | "pending";
};
export interface CheckResultReference {
    v: 1;
    kind: 'check.run' | 'check.receipt' | 'artifact.check';
    run_id: string;
    run_version: number;
    artifact_id?: string;
}
export declare function parseCheckResultReference(operation: string, raw: unknown): CheckResultReference;
export declare function reconstructCheckResult(storage: StoragePort, spaceId: string, operation: string, raw: unknown, online?: boolean): unknown;
export declare function assertCheckReceiptPrivacy(storage: StoragePort, spaceId: string, receipt: CheckReceiptRecord): void;
//# sourceMappingURL=check-records.d.ts.map