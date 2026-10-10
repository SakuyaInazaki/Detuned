import { type Static } from '@sinclair/typebox';
export declare const WriteRateLimitsSchema: import("@sinclair/typebox").TObject<{
    per_minute: import("@sinclair/typebox").TInteger;
    burst: import("@sinclair/typebox").TInteger;
}>;
export type WriteRateLimits = Static<typeof WriteRateLimitsSchema>;
export declare const DEFAULT_WRITE_RATE_LIMITS: Readonly<WriteRateLimits>;
/** Strict local configuration; diagnostic never echoes untrusted values. */
export declare function resolveWriteRateLimits(overrides?: Partial<WriteRateLimits>): WriteRateLimits;
//# sourceMappingURL=write-limits.d.ts.map