import { Static } from '@sinclair/typebox';
export declare const SearchQuerySchema: import("@sinclair/typebox").TObject<{
    q: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>>;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type SearchQuery = Static<typeof SearchQuerySchema>;
export declare const SearchResultItemSchema: import("@sinclair/typebox").TObject<{
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type SearchResultItem = Static<typeof SearchResultItemSchema>;
export declare const ContextQuerySchema: import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ContextQuery = Static<typeof ContextQuerySchema>;
export declare const ContextResponseDataSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    slug: import("@sinclair/typebox").TString;
    objective: import("@sinclair/typebox").TString;
    rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    policy_revision: import("@sinclair/typebox").TInteger;
    pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
    }>>;
    blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        relation_id: import("@sinclair/typebox").TString;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        issue: import("@sinclair/typebox").TString;
        impact: import("@sinclair/typebox").TString;
    }>>;
    recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TString;
        attempt: import("@sinclair/typebox").TString;
        tested_scope: import("@sinclair/typebox").TString;
        evidence_state: import("@sinclair/typebox").TString;
    }>>;
    recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TString;
        object_id: import("@sinclair/typebox").TString;
        occurred_at: import("@sinclair/typebox").TString;
    }>>;
    checkpoint_token: import("@sinclair/typebox").TString;
}>;
export type ContextResponseData = Static<typeof ContextResponseDataSchema>;
export declare const ViewNameSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"failures">, import("@sinclair/typebox").TLiteral<"findings">, import("@sinclair/typebox").TLiteral<"open-questions">]>;
export type ViewName = Static<typeof ViewNameSchema>;
//# sourceMappingURL=search.d.ts.map