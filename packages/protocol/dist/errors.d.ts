import { Static } from '@sinclair/typebox';
export declare const ErrorCode: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly REVISION_CONFLICT: "REVISION_CONFLICT";
    readonly IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT";
    readonly ACK_INVALID: "ACK_INVALID";
    readonly RESYNC_REQUIRED: "RESYNC_REQUIRED";
    readonly SNAPSHOT_STALE: "SNAPSHOT_STALE";
    readonly REVIEW_INCOMPLETE: "REVIEW_INCOMPLETE";
    readonly OPEN_OBJECTIONS: "OPEN_OBJECTIONS";
    readonly CONTENT_REDACTED: "CONTENT_REDACTED";
    readonly PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE";
    readonly QUERY_TOO_BROAD: "QUERY_TOO_BROAD";
    readonly CHECK_MISMATCH: "CHECK_MISMATCH";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly QUOTA_EXCEEDED: "QUOTA_EXCEEDED";
    readonly STORAGE_BUSY: "STORAGE_BUSY";
    readonly TEMPORARILY_UNAVAILABLE: "TEMPORARILY_UNAVAILABLE";
};
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
export declare const ErrorCodeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"VALIDATION_ERROR">, import("@sinclair/typebox").TLiteral<"UNAUTHENTICATED">, import("@sinclair/typebox").TLiteral<"FORBIDDEN">, import("@sinclair/typebox").TLiteral<"NOT_FOUND">, import("@sinclair/typebox").TLiteral<"REVISION_CONFLICT">, import("@sinclair/typebox").TLiteral<"IDEMPOTENCY_CONFLICT">, import("@sinclair/typebox").TLiteral<"ACK_INVALID">, import("@sinclair/typebox").TLiteral<"RESYNC_REQUIRED">, import("@sinclair/typebox").TLiteral<"SNAPSHOT_STALE">, import("@sinclair/typebox").TLiteral<"REVIEW_INCOMPLETE">, import("@sinclair/typebox").TLiteral<"OPEN_OBJECTIONS">, import("@sinclair/typebox").TLiteral<"CONTENT_REDACTED">, import("@sinclair/typebox").TLiteral<"PAYLOAD_TOO_LARGE">, import("@sinclair/typebox").TLiteral<"QUERY_TOO_BROAD">, import("@sinclair/typebox").TLiteral<"CHECK_MISMATCH">, import("@sinclair/typebox").TLiteral<"RATE_LIMITED">, import("@sinclair/typebox").TLiteral<"QUOTA_EXCEEDED">, import("@sinclair/typebox").TLiteral<"STORAGE_BUSY">, import("@sinclair/typebox").TLiteral<"TEMPORARILY_UNAVAILABLE">]>;
export declare const ApiErrorDetailSchema: import("@sinclair/typebox").TObject<{
    code: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"VALIDATION_ERROR">, import("@sinclair/typebox").TLiteral<"UNAUTHENTICATED">, import("@sinclair/typebox").TLiteral<"FORBIDDEN">, import("@sinclair/typebox").TLiteral<"NOT_FOUND">, import("@sinclair/typebox").TLiteral<"REVISION_CONFLICT">, import("@sinclair/typebox").TLiteral<"IDEMPOTENCY_CONFLICT">, import("@sinclair/typebox").TLiteral<"ACK_INVALID">, import("@sinclair/typebox").TLiteral<"RESYNC_REQUIRED">, import("@sinclair/typebox").TLiteral<"SNAPSHOT_STALE">, import("@sinclair/typebox").TLiteral<"REVIEW_INCOMPLETE">, import("@sinclair/typebox").TLiteral<"OPEN_OBJECTIONS">, import("@sinclair/typebox").TLiteral<"CONTENT_REDACTED">, import("@sinclair/typebox").TLiteral<"PAYLOAD_TOO_LARGE">, import("@sinclair/typebox").TLiteral<"QUERY_TOO_BROAD">, import("@sinclair/typebox").TLiteral<"CHECK_MISMATCH">, import("@sinclair/typebox").TLiteral<"RATE_LIMITED">, import("@sinclair/typebox").TLiteral<"QUOTA_EXCEEDED">, import("@sinclair/typebox").TLiteral<"STORAGE_BUSY">, import("@sinclair/typebox").TLiteral<"TEMPORARILY_UNAVAILABLE">]>;
    message: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TBoolean;
    details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type ApiErrorDetail = Static<typeof ApiErrorDetailSchema>;
export declare const ApiErrorResponseSchema: import("@sinclair/typebox").TObject<{
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
    error: import("@sinclair/typebox").TObject<{
        code: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"VALIDATION_ERROR">, import("@sinclair/typebox").TLiteral<"UNAUTHENTICATED">, import("@sinclair/typebox").TLiteral<"FORBIDDEN">, import("@sinclair/typebox").TLiteral<"NOT_FOUND">, import("@sinclair/typebox").TLiteral<"REVISION_CONFLICT">, import("@sinclair/typebox").TLiteral<"IDEMPOTENCY_CONFLICT">, import("@sinclair/typebox").TLiteral<"ACK_INVALID">, import("@sinclair/typebox").TLiteral<"RESYNC_REQUIRED">, import("@sinclair/typebox").TLiteral<"SNAPSHOT_STALE">, import("@sinclair/typebox").TLiteral<"REVIEW_INCOMPLETE">, import("@sinclair/typebox").TLiteral<"OPEN_OBJECTIONS">, import("@sinclair/typebox").TLiteral<"CONTENT_REDACTED">, import("@sinclair/typebox").TLiteral<"PAYLOAD_TOO_LARGE">, import("@sinclair/typebox").TLiteral<"QUERY_TOO_BROAD">, import("@sinclair/typebox").TLiteral<"CHECK_MISMATCH">, import("@sinclair/typebox").TLiteral<"RATE_LIMITED">, import("@sinclair/typebox").TLiteral<"QUOTA_EXCEEDED">, import("@sinclair/typebox").TLiteral<"STORAGE_BUSY">, import("@sinclair/typebox").TLiteral<"TEMPORARILY_UNAVAILABLE">]>;
        message: import("@sinclair/typebox").TString;
        retryable: import("@sinclair/typebox").TBoolean;
        details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>;
}>;
export type ApiErrorResponse = Static<typeof ApiErrorResponseSchema>;
export declare class DetunedError extends Error {
    readonly code: ErrorCodeType;
    readonly statusCode: number;
    readonly retryable: boolean;
    readonly details?: Record<string, unknown>;
    constructor(code: ErrorCodeType, message: string, statusCode: number, retryable?: boolean, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map