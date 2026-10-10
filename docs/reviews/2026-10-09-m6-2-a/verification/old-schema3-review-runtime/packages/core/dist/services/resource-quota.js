import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Fixed public diagnostic: native FULL can also mean real disk or temporary storage exhaustion. */
export function resourceQuotaError(scope) {
    return new DetunedError(ErrorCode.QUOTA_EXCEEDED, '存储资源达到运行额度或无法继续分配。', 507, false, { scope });
}
/** Call only after leaving the driver transaction; never catch FULL and continue its SQL. */
export function mapStorageFullError(error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'SQLITE_FULL') {
        return resourceQuotaError('storage');
    }
    return error;
}
//# sourceMappingURL=resource-quota.js.map