import { type Static } from '@sinclair/typebox';
export declare const FileSampleSchema: import("@sinclair/typebox").TObject<{
    applicable: import("@sinclair/typebox").TBoolean;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
    bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type FileSample = Static<typeof FileSampleSchema>;
export declare const StorageOperationalStatusSchema: import("@sinclair/typebox").TObject<{
    database: import("@sinclair/typebox").TObject<{
        page_size: import("@sinclair/typebox").TInteger;
        page_count: import("@sinclair/typebox").TInteger;
        free_pages: import("@sinclair/typebox").TInteger;
        max_pages: import("@sinclair/typebox").TInteger;
        allocated_bytes: import("@sinclair/typebox").TString;
        max_allocated_bytes: import("@sinclair/typebox").TString;
        journal_mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"wal">, import("@sinclair/typebox").TLiteral<"delete">, import("@sinclair/typebox").TLiteral<"truncate">, import("@sinclair/typebox").TLiteral<"persist">, import("@sinclair/typebox").TLiteral<"memory">, import("@sinclair/typebox").TLiteral<"off">, import("@sinclair/typebox").TLiteral<"unknown">]>;
        wal: import("@sinclair/typebox").TObject<{
            applicable: import("@sinclair/typebox").TBoolean;
            busy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
            log_frames: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
            checkpointed_frames: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
        }>;
    }>;
    files: import("@sinclair/typebox").TObject<{
        database: import("@sinclair/typebox").TObject<{
            applicable: import("@sinclair/typebox").TBoolean;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
            bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        }>;
        wal: import("@sinclair/typebox").TObject<{
            applicable: import("@sinclair/typebox").TBoolean;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
            bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        }>;
    }>;
    data_directory: import("@sinclair/typebox").TObject<{
        configured: import("@sinclair/typebox").TBoolean;
        available: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
    }>;
    artifacts: import("@sinclair/typebox").TObject<{
        objects_observed: import("@sinclair/typebox").TInteger;
        bytes_observed: import("@sinclair/typebox").TString;
        complete: import("@sinclair/typebox").TBoolean;
    }>;
}>;
export type StorageOperationalStatus = Static<typeof StorageOperationalStatusSchema>;
export declare const OperationsDiagnosticsSchema: import("@sinclair/typebox").TObject<{
    lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"running">, import("@sinclair/typebox").TLiteral<"draining">]>;
    ready: import("@sinclair/typebox").TBoolean;
    database: import("@sinclair/typebox").TObject<{
        page_size: import("@sinclair/typebox").TInteger;
        page_count: import("@sinclair/typebox").TInteger;
        free_pages: import("@sinclair/typebox").TInteger;
        max_pages: import("@sinclair/typebox").TInteger;
        allocated_bytes: import("@sinclair/typebox").TString;
        max_allocated_bytes: import("@sinclair/typebox").TString;
        journal_mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"wal">, import("@sinclair/typebox").TLiteral<"delete">, import("@sinclair/typebox").TLiteral<"truncate">, import("@sinclair/typebox").TLiteral<"persist">, import("@sinclair/typebox").TLiteral<"memory">, import("@sinclair/typebox").TLiteral<"off">, import("@sinclair/typebox").TLiteral<"unknown">]>;
        wal: import("@sinclair/typebox").TObject<{
            applicable: import("@sinclair/typebox").TBoolean;
            busy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
            log_frames: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
            checkpointed_frames: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
        }>;
    }>;
    files: import("@sinclair/typebox").TObject<{
        database: import("@sinclair/typebox").TObject<{
            applicable: import("@sinclair/typebox").TBoolean;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
            bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        }>;
        wal: import("@sinclair/typebox").TObject<{
            applicable: import("@sinclair/typebox").TBoolean;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
            bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        }>;
    }>;
    data_directory: import("@sinclair/typebox").TObject<{
        configured: import("@sinclair/typebox").TBoolean;
        available: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
    }>;
    artifacts: import("@sinclair/typebox").TObject<{
        objects_observed: import("@sinclair/typebox").TInteger;
        bytes_observed: import("@sinclair/typebox").TString;
        complete: import("@sinclair/typebox").TBoolean;
    }>;
}>;
export type OperationsDiagnostics = Static<typeof OperationsDiagnosticsSchema>;
export declare const OperationsDiagnosticsEnvelopeSchema: import("@sinclair/typebox").TObject<{
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
    data: import("@sinclair/typebox").TObject<{
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"running">, import("@sinclair/typebox").TLiteral<"draining">]>;
        ready: import("@sinclair/typebox").TBoolean;
        database: import("@sinclair/typebox").TObject<{
            page_size: import("@sinclair/typebox").TInteger;
            page_count: import("@sinclair/typebox").TInteger;
            free_pages: import("@sinclair/typebox").TInteger;
            max_pages: import("@sinclair/typebox").TInteger;
            allocated_bytes: import("@sinclair/typebox").TString;
            max_allocated_bytes: import("@sinclair/typebox").TString;
            journal_mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"wal">, import("@sinclair/typebox").TLiteral<"delete">, import("@sinclair/typebox").TLiteral<"truncate">, import("@sinclair/typebox").TLiteral<"persist">, import("@sinclair/typebox").TLiteral<"memory">, import("@sinclair/typebox").TLiteral<"off">, import("@sinclair/typebox").TLiteral<"unknown">]>;
            wal: import("@sinclair/typebox").TObject<{
                applicable: import("@sinclair/typebox").TBoolean;
                busy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
                log_frames: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
                checkpointed_frames: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
            }>;
        }>;
        files: import("@sinclair/typebox").TObject<{
            database: import("@sinclair/typebox").TObject<{
                applicable: import("@sinclair/typebox").TBoolean;
                state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
                bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            }>;
            wal: import("@sinclair/typebox").TObject<{
                applicable: import("@sinclair/typebox").TBoolean;
                state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"regular">, import("@sinclair/typebox").TLiteral<"missing">, import("@sinclair/typebox").TLiteral<"unavailable">, import("@sinclair/typebox").TLiteral<"not_applicable">]>;
                bytes: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            }>;
        }>;
        data_directory: import("@sinclair/typebox").TObject<{
            configured: import("@sinclair/typebox").TBoolean;
            available: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
        }>;
        artifacts: import("@sinclair/typebox").TObject<{
            objects_observed: import("@sinclair/typebox").TInteger;
            bytes_observed: import("@sinclair/typebox").TString;
            complete: import("@sinclair/typebox").TBoolean;
        }>;
    }>;
    meta: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export declare const LivenessEnvelopeSchema: import("@sinclair/typebox").TObject<{
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
    data: import("@sinclair/typebox").TObject<{
        status: import("@sinclair/typebox").TLiteral<"alive">;
    }>;
    meta: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export declare const ReadinessEnvelopeSchema: import("@sinclair/typebox").TObject<{
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
    data: import("@sinclair/typebox").TObject<{
        status: import("@sinclair/typebox").TLiteral<"ready">;
    }>;
    meta: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export type LivenessData = Static<typeof LivenessEnvelopeSchema>['data'];
export type ReadinessData = Static<typeof ReadinessEnvelopeSchema>['data'];
//# sourceMappingURL=operations.d.ts.map