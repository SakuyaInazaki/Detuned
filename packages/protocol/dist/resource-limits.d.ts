import { type Static } from '@sinclair/typebox';
export declare const ResourceLimitsSchema: import("@sinclair/typebox").TObject<{
    database_max_bytes: import("@sinclair/typebox").TInteger;
    artifact_max_total_bytes: import("@sinclair/typebox").TInteger;
    artifact_max_objects: import("@sinclair/typebox").TInteger;
}>;
export type ResourceLimits = Static<typeof ResourceLimitsSchema>;
export declare const DEFAULT_RESOURCE_LIMITS: Readonly<ResourceLimits>;
/** Runtime configuration diagnostics never echo untrusted values. */
export declare function resolveResourceLimits(overrides?: Partial<ResourceLimits>): ResourceLimits;
//# sourceMappingURL=resource-limits.d.ts.map