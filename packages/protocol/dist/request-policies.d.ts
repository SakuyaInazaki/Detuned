/** Existing HTTP input policies; these describe transport validation, not authorization. */
export declare const LIST_LIMIT: {
    readonly minimum: 1;
    readonly maximum: 100;
    readonly default: 20;
};
export declare const THREAD_POST_LIMIT: {
    readonly default: 50;
    readonly minimum: 1;
    readonly maximum: 100;
};
export declare const CONTEXT_BYTES: {
    readonly minimum: 4096;
    readonly maximum: 65536;
    readonly default: 12288;
};
export declare const REVISION_QUERY: {
    readonly minimum: 1;
};
export declare const THREAD_STATES: readonly ["open", "archived"];
export declare const VIEW_NAMES: readonly ["failures", "findings", "open-questions"];
export declare const NONBLANK_STRING_SCHEMA: {
    readonly type: "string";
    readonly pattern: "\\S";
};
export declare function isNonblankString(value: unknown): value is string;
export declare function integerQueryOptions(policy: {
    minimum?: number;
    maximum?: number;
    default?: number;
}): {
    min: number | undefined;
    max: number | undefined;
    defaultValue: number | undefined;
};
export declare const QUERY_TRANSPORT_POLICY: {
    readonly unknown_fields: "reject";
    readonly repeated_parameters: "reject; CSV values use one comma-separated parameter";
    readonly omitted: "use declared default, otherwise undefined; required parameters reject";
    readonly empty: "integer and scalar string reject; tags CSV accepts empty as []";
    readonly integer: "decimal digits only after trimming, safe integer, no body coercion";
};
export declare const NO_BODY_WRITE_POLICY: {
    readonly accepted: readonly ["undefined", "null", "{}"];
    readonly rejected: "nonempty objects, arrays and primitives";
};
export declare const EXPORT_QUERY_POLICY: {
    readonly format: "ndjson";
    readonly default_format: "ndjson";
    readonly reject_unknown: true;
    readonly reject_repeated: true;
};
export declare const ANONYMOUS_HTTP_ROUTES: readonly ["/api/v1/capabilities", "/api/v1/health/live", "/api/v1/health/ready"];
export declare const WEB_AUTH_INPUT_POLICY: {
    readonly login_body: "absent or strict empty object";
    readonly query: "strict empty";
    readonly logout_body: "absent";
    readonly logout_response: "204 without body";
};
//# sourceMappingURL=request-policies.d.ts.map