import { DetunedError } from '@detuned/protocol';
export type ResourceQuotaScope = 'database' | 'instance_artifacts' | 'storage';
/** Fixed public diagnostic: native FULL can also mean real disk or temporary storage exhaustion. */
export declare function resourceQuotaError(scope: ResourceQuotaScope): DetunedError;
/** Call only after leaving the driver transaction; never catch FULL and continue its SQL. */
export declare function mapStorageFullError(error: unknown): unknown;
//# sourceMappingURL=resource-quota.d.ts.map