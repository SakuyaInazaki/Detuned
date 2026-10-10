import { Type } from '@sinclair/typebox';
import { DetunedError, ErrorCode } from './errors.js';
const MAX_BYTES = 1099511627776;
export const ResourceLimitsSchema = Type.Object({ database_max_bytes: Type.Integer({ minimum: 1048576, maximum: MAX_BYTES }), artifact_max_total_bytes: Type.Integer({ minimum: 1, maximum: MAX_BYTES }), artifact_max_objects: Type.Integer({ minimum: 1, maximum: 10000 }) }, { additionalProperties: false });
export const DEFAULT_RESOURCE_LIMITS = Object.freeze({ database_max_bytes: 1073741824, artifact_max_total_bytes: 4294967296, artifact_max_objects: 10000 });
/** Runtime configuration diagnostics never echo untrusted values. */
export function resolveResourceLimits(overrides) {
    const invalid = () => { throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Resource limits require bounded positive safe integers for database_max_bytes, artifact_max_total_bytes and artifact_max_objects.', 400); };
    if (overrides !== undefined && (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides) || Reflect.ownKeys(overrides).some(key => !['database_max_bytes', 'artifact_max_total_bytes', 'artifact_max_objects'].includes(String(key)) || typeof key !== 'string')))
        invalid();
    const limits = { ...DEFAULT_RESOURCE_LIMITS, ...overrides };
    if (!Number.isSafeInteger(limits.database_max_bytes) || limits.database_max_bytes < 1048576 || limits.database_max_bytes > MAX_BYTES || !Number.isSafeInteger(limits.artifact_max_total_bytes) || limits.artifact_max_total_bytes < 1 || limits.artifact_max_total_bytes > MAX_BYTES || !Number.isSafeInteger(limits.artifact_max_objects) || limits.artifact_max_objects < 1 || limits.artifact_max_objects > 10000)
        invalid();
    return limits;
}
//# sourceMappingURL=resource-limits.js.map