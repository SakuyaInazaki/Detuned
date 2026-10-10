import { Type } from '@sinclair/typebox';
import { DetunedError, ErrorCode } from './errors.js';
export const WriteRateLimitsSchema = Type.Object({ per_minute: Type.Integer({ minimum: 1, maximum: 60000 }), burst: Type.Integer({ minimum: 1, maximum: 10000 }) }, { additionalProperties: false });
export const DEFAULT_WRITE_RATE_LIMITS = Object.freeze({ per_minute: 60, burst: 20 });
/** Strict local configuration; diagnostic never echoes untrusted values. */
export function resolveWriteRateLimits(overrides) {
    const invalid = () => { throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Write rate limits require per_minute 1–60000 and burst 1–10000 as safe integers.', 400); };
    if (overrides !== undefined && (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides) || Reflect.ownKeys(overrides).some(key => key !== 'per_minute' && key !== 'burst')))
        invalid();
    const limits = { ...DEFAULT_WRITE_RATE_LIMITS, ...overrides };
    if (!Number.isSafeInteger(limits.per_minute) || limits.per_minute < 1 || limits.per_minute > 60000 || !Number.isSafeInteger(limits.burst) || limits.burst < 1 || limits.burst > 10000)
        invalid();
    return limits;
}
//# sourceMappingURL=write-limits.js.map