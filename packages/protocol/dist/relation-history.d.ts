import { type Static } from '@sinclair/typebox';
export declare const RelationHistoryQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type RelationHistoryQuery = Static<typeof RelationHistoryQuerySchema>;
export declare const RelationHistoryItemSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    reason_status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
    reason_has_newer_revision: import("@sinclair/typebox").TBoolean;
    resolution_id: import("@sinclair/typebox").TString;
    relation_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
    resolver_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
} | {
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    reason_status: import("@sinclair/typebox").TLiteral<"redacted">;
    reason_has_newer_revision: import("@sinclair/typebox").TNull;
    resolution_id: import("@sinclair/typebox").TString;
    relation_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
    resolver_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
} | {
    reason_ref: import("@sinclair/typebox").TNull;
    reason_status: import("@sinclair/typebox").TLiteral<"unavailable">;
    reason_has_newer_revision: import("@sinclair/typebox").TNull;
    resolution_id: import("@sinclair/typebox").TString;
    relation_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
    resolver_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>[]>;
export type RelationHistoryItem = Static<typeof RelationHistoryItemSchema>;
export declare const RelationHistoryPageSchema: import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        relation_id: import("@sinclair/typebox").TString;
        resolutions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
            reason_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            reason_status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
            reason_has_newer_revision: import("@sinclair/typebox").TBoolean;
            resolution_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
            resolver_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
        } | {
            reason_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            reason_status: import("@sinclair/typebox").TLiteral<"redacted">;
            reason_has_newer_revision: import("@sinclair/typebox").TNull;
            resolution_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
            resolver_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
        } | {
            reason_ref: import("@sinclair/typebox").TNull;
            reason_status: import("@sinclair/typebox").TLiteral<"unavailable">;
            reason_has_newer_revision: import("@sinclair/typebox").TNull;
            resolution_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
            resolver_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
        }>[]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
}>;
export type RelationHistoryPage = Static<typeof RelationHistoryPageSchema>;
export declare function validateRelationHistoryQuery(value: unknown): asserts value is RelationHistoryQuery;
export declare function isRelationHistoryPage(value: unknown, relationId: string, query?: RelationHistoryQuery): value is RelationHistoryPage;
//# sourceMappingURL=relation-history.d.ts.map