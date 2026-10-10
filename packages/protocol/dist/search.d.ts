import { Static } from '@sinclair/typebox';
import { PostRef } from './common.js';
export declare const SEARCH_LIMITS: Readonly<{
    q_codepoints: 256;
    tags_json_bytes: 8192;
    unique_tags: 100;
    cursor_chars: 4096;
    candidates: 5000;
    response_bytes: 262144;
    cursor_ttl_seconds: 86400;
}>;
export declare const SearchQStringSchema: import("@sinclair/typebox").TString;
export declare const SearchTagsSchema: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
export declare const SearchCursorStringSchema: import("@sinclair/typebox").TString;
export declare const SearchFilterSchema: import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>>;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const SearchQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>>;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    q: import("@sinclair/typebox").TString;
}>;
export type SearchQuery = Static<typeof SearchQuerySchema>;
export interface NormalizedSearchQuery extends Omit<SearchQuery, 'tags' | 'limit'> {
    tags: string[];
    limit: number;
}
export declare const SEARCH_CURSOR_ERROR_MESSAGE = "\u641C\u7D22\u6E38\u6807\u65E0\u6548\uFF0C\u8BF7\u53BB\u6389 cursor \u91CD\u65B0\u83B7\u53D6\u7B2C\u4E00\u9875\u3002";
export declare function normalizeSearchQuery(query: SearchQuery): NormalizedSearchQuery;
export declare const SearchCursorPayloadSchema: import("@sinclair/typebox").TObject<{
    v: import("@sinclair/typebox").TLiteral<1>;
    purpose: import("@sinclair/typebox").TLiteral<"search">;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    query_hash: import("@sinclair/typebox").TString;
    sort: import("@sinclair/typebox").TLiteral<"id_desc">;
    before_id: import("@sinclair/typebox").TString;
    exp: import("@sinclair/typebox").TInteger;
}>;
export type SearchCursorPayload = Static<typeof SearchCursorPayloadSchema>;
export declare function isSearchCursorPayload(value: unknown): value is SearchCursorPayload;
export declare const SearchResultItemSchema: import("@sinclair/typebox").TObject<{
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type SearchResultItem = Static<typeof SearchResultItemSchema>;
export declare const SearchResponseDataSchema: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>>;
export declare const SearchResponseMetaSchema: import("@sinclair/typebox").TObject<{
    truncated: import("@sinclair/typebox").TLiteral<false>;
    next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export declare const SearchPageSchema: import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        thread_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        snippet: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
    }>>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<false>;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
}>;
export type SearchPage = Static<typeof SearchPageSchema>;
export declare const ContextQuerySchema: import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ContextQuery = Static<typeof ContextQuerySchema>;
export declare const SourceStatusSchema: import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
    ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
    has_newer_revision: import("@sinclair/typebox").TBoolean;
}> | import("@sinclair/typebox").TObject<{
    ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
    has_newer_revision: import("@sinclair/typebox").TNull;
}>)[]>;
export type SourceStatus = Static<typeof SourceStatusSchema>;
export declare const RelationProjectionSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
    relation_id: import("@sinclair/typebox").TString;
    relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    creator_id: import("@sinclair/typebox").TString;
    source_author_id: import("@sinclair/typebox").TString;
    target_author_id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
    version: import("@sinclair/typebox").TInteger;
}, never> & {
    source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
}>[]>;
export type RelationProjection = Static<typeof RelationProjectionSchema>;
export declare const ClaimMaterialSchema: import("@sinclair/typebox").TObject<{
    statement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
    scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    falsification_plan: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"statement" | "assumptions" | "scope" | "falsification_plan">[]>>;
}>;
export type ClaimMaterial = Static<typeof ClaimMaterialSchema>;
export declare const FailureMaterialSchema: import("@sinclair/typebox").TObject<{
    attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
    assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
    tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    expected: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    observed: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    evidence_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>, import("@sinclair/typebox").TNull]>;
    evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
    evidence_missing_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    not_ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
    retry_when: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
    missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"assumptions" | "evidence_refs" | "attempt" | "category" | "tested_scope" | "expected" | "observed" | "evidence_state" | "evidence_missing_reason" | "ruled_out" | "not_ruled_out" | "retry_when">[]>>;
}>;
export type FailureMaterial = Static<typeof FailureMaterialSchema>;
export declare const FindingViewItemSchema: import("@sinclair/typebox").TObject<{
    material: import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        falsification_plan: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"statement" | "assumptions" | "scope" | "falsification_plan">[]>>;
    }>;
    relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
        relation_id: import("@sinclair/typebox").TString;
        relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        creator_id: import("@sinclair/typebox").TString;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
        version: import("@sinclair/typebox").TInteger;
    }, never> & {
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    formal_review_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>]>;
    formal_check_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>]>;
    formal_review: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        target_post_id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TInteger;
        target_revision: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
        current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
        validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
        request_id: import("@sinclair/typebox").TString;
        snapshot_id: import("@sinclair/typebox").TString;
        phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
        verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
    }>, import("@sinclair/typebox").TNull]>;
    type: import("@sinclair/typebox").TLiteral<"claim">;
    kind: import("@sinclair/typebox").TLiteral<"claim">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type FindingViewItem = Static<typeof FindingViewItemSchema>;
export declare const FailureViewItemSchema: import("@sinclair/typebox").TObject<{
    material: import("@sinclair/typebox").TObject<{
        attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
        assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        expected: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        observed: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        evidence_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>, import("@sinclair/typebox").TNull]>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
        evidence_missing_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        not_ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        retry_when: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"assumptions" | "evidence_refs" | "attempt" | "category" | "tested_scope" | "expected" | "observed" | "evidence_state" | "evidence_missing_reason" | "ruled_out" | "not_ruled_out" | "retry_when">[]>>;
    }>;
    relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
        relation_id: import("@sinclair/typebox").TString;
        relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        creator_id: import("@sinclair/typebox").TString;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
        version: import("@sinclair/typebox").TInteger;
    }, never> & {
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    formal_review_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>]>;
    formal_check_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>]>;
    formal_review: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        target_post_id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TInteger;
        target_revision: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
        current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
        validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
        request_id: import("@sinclair/typebox").TString;
        snapshot_id: import("@sinclair/typebox").TString;
        phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
        verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
    }>, import("@sinclair/typebox").TNull]>;
    type: import("@sinclair/typebox").TLiteral<"failure">;
    kind: import("@sinclair/typebox").TLiteral<"failure">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type FailureViewItem = Static<typeof FailureViewItemSchema>;
export declare const QuestionViewItemSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"question">;
    kind: import("@sinclair/typebox").TLiteral<"question">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type QuestionViewItem = Static<typeof QuestionViewItemSchema>;
export declare const OpenChallengeViewItemSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
    relation_id: import("@sinclair/typebox").TString;
    relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    creator_id: import("@sinclair/typebox").TString;
    source_author_id: import("@sinclair/typebox").TString;
    target_author_id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
    version: import("@sinclair/typebox").TInteger;
}, "state" | "type" | "relation_type"> & {
    type: import("@sinclair/typebox").TLiteral<"open_challenge">;
    relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
    state: import("@sinclair/typebox").TLiteral<"open">;
} & {
    source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
}>[]>;
export type OpenChallengeViewItem = Static<typeof OpenChallengeViewItemSchema>;
export interface ViewItemByName {
    findings: FindingViewItem;
    failures: FailureViewItem;
    'open-questions': QuestionViewItem | OpenChallengeViewItem;
}
export type ViewResponseData<N extends ViewName> = ViewItemByName[N][];
export declare const VIEW_RESPONSE_DATA_SCHEMAS: {
    readonly findings: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        material: import("@sinclair/typebox").TObject<{
            statement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
            scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            falsification_plan: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"statement" | "assumptions" | "scope" | "falsification_plan">[]>>;
        }>;
        relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
            relation_id: import("@sinclair/typebox").TString;
            relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            creator_id: import("@sinclair/typebox").TString;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
            version: import("@sinclair/typebox").TInteger;
        }, never> & {
            source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
            target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        }>[]>>;
        report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
        formal_review_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>]>;
        formal_check_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>]>;
        formal_review: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            target_post_id: import("@sinclair/typebox").TString;
            round: import("@sinclair/typebox").TInteger;
            target_revision: import("@sinclair/typebox").TInteger;
            created_at: import("@sinclair/typebox").TString;
            current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
            validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
            request_id: import("@sinclair/typebox").TString;
            snapshot_id: import("@sinclair/typebox").TString;
            phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
            verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
        }>, import("@sinclair/typebox").TNull]>;
        type: import("@sinclair/typebox").TLiteral<"claim">;
        kind: import("@sinclair/typebox").TLiteral<"claim">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        thread_id: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        snippet: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
    }>>;
    readonly failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        material: import("@sinclair/typebox").TObject<{
            attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
            assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
            tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            expected: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            observed: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            evidence_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
                kind: import("@sinclair/typebox").TLiteral<"post">;
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>, import("@sinclair/typebox").TObject<{
                kind: import("@sinclair/typebox").TLiteral<"artifact">;
                artifact_id: import("@sinclair/typebox").TString;
            }>]>>, import("@sinclair/typebox").TNull]>;
            evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
            evidence_missing_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            not_ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
            retry_when: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"assumptions" | "evidence_refs" | "attempt" | "category" | "tested_scope" | "expected" | "observed" | "evidence_state" | "evidence_missing_reason" | "ruled_out" | "not_ruled_out" | "retry_when">[]>>;
        }>;
        relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
            relation_id: import("@sinclair/typebox").TString;
            relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            creator_id: import("@sinclair/typebox").TString;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
            version: import("@sinclair/typebox").TInteger;
        }, never> & {
            source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
            target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        }>[]>>;
        report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
        formal_review_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>]>;
        formal_check_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>]>;
        formal_review: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            target_post_id: import("@sinclair/typebox").TString;
            round: import("@sinclair/typebox").TInteger;
            target_revision: import("@sinclair/typebox").TInteger;
            created_at: import("@sinclair/typebox").TString;
            current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
            validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
            request_id: import("@sinclair/typebox").TString;
            snapshot_id: import("@sinclair/typebox").TString;
            phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
            verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
        }>, import("@sinclair/typebox").TNull]>;
        type: import("@sinclair/typebox").TLiteral<"failure">;
        kind: import("@sinclair/typebox").TLiteral<"failure">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        thread_id: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        snippet: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
    }>>;
    readonly 'open-questions': import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"question">;
        kind: import("@sinclair/typebox").TLiteral<"question">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        thread_id: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        snippet: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
        relation_id: import("@sinclair/typebox").TString;
        relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        creator_id: import("@sinclair/typebox").TString;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
        version: import("@sinclair/typebox").TInteger;
    }, "state" | "type" | "relation_type"> & {
        type: import("@sinclair/typebox").TLiteral<"open_challenge">;
        relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
        state: import("@sinclair/typebox").TLiteral<"open">;
    } & {
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>]>>;
};
export declare const ViewResponseDataSchema: import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
    material: import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        falsification_plan: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"statement" | "assumptions" | "scope" | "falsification_plan">[]>>;
    }>;
    relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
        relation_id: import("@sinclair/typebox").TString;
        relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        creator_id: import("@sinclair/typebox").TString;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
        version: import("@sinclair/typebox").TInteger;
    }, never> & {
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    formal_review_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>]>;
    formal_check_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>]>;
    formal_review: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        target_post_id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TInteger;
        target_revision: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
        current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
        validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
        request_id: import("@sinclair/typebox").TString;
        snapshot_id: import("@sinclair/typebox").TString;
        phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
        verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
    }>, import("@sinclair/typebox").TNull]>;
    type: import("@sinclair/typebox").TLiteral<"claim">;
    kind: import("@sinclair/typebox").TLiteral<"claim">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>> | import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
    material: import("@sinclair/typebox").TObject<{
        attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
        assumptions: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        expected: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        observed: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        evidence_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>, import("@sinclair/typebox").TNull]>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
        evidence_missing_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        not_ruled_out: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        retry_when: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"assumptions" | "evidence_refs" | "attempt" | "category" | "tested_scope" | "expected" | "observed" | "evidence_state" | "evidence_missing_reason" | "ruled_out" | "not_ruled_out" | "retry_when">[]>>;
    }>;
    relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
        relation_id: import("@sinclair/typebox").TString;
        relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        creator_id: import("@sinclair/typebox").TString;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
        version: import("@sinclair/typebox").TInteger;
    }, never> & {
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    formal_review_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>]>;
    formal_check_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_enabled">, import("@sinclair/typebox").TLiteral<"not_requested">, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>]>;
    formal_review: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        target_post_id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TInteger;
        target_revision: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
        current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
        validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
        request_id: import("@sinclair/typebox").TString;
        snapshot_id: import("@sinclair/typebox").TString;
        phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
        verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
    }>, import("@sinclair/typebox").TNull]>;
    type: import("@sinclair/typebox").TLiteral<"failure">;
    kind: import("@sinclair/typebox").TLiteral<"failure">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>> | import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"question">;
    kind: import("@sinclair/typebox").TLiteral<"question">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    thread_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    snippet: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<Omit<{
    relation_id: import("@sinclair/typebox").TString;
    relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"reproduces">]>;
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    creator_id: import("@sinclair/typebox").TString;
    source_author_id: import("@sinclair/typebox").TString;
    target_author_id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
    version: import("@sinclair/typebox").TInteger;
}, "state" | "type" | "relation_type"> & {
    type: import("@sinclair/typebox").TLiteral<"open_challenge">;
    relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
    state: import("@sinclair/typebox").TLiteral<"open">;
} & {
    source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
}>[]>]>>)[]>;
export declare const PinnedSummarySchema: import("@sinclair/typebox").TObject<{
    ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    has_newer_revision: import("@sinclair/typebox").TBoolean;
    source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
    }> | import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
        has_newer_revision: import("@sinclair/typebox").TNull;
    }>)[]>>, import("@sinclair/typebox").TNull]>;
    missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
}>;
export declare const RecentFailureSchema: import("@sinclair/typebox").TObject<{
    ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    title: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
    attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
    missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
    report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
}>;
export declare const BlockingObjectionSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
    version: import("@sinclair/typebox").TInteger;
    creator_id: import("@sinclair/typebox").TString;
    relation_id: import("@sinclair/typebox").TString;
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    source_author_id: import("@sinclair/typebox").TString;
    target_author_id: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"open_challenge">;
    relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
    state: import("@sinclair/typebox").TLiteral<"open">;
    source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
    source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
}>[]>;
export declare const ContextFocusThreadSchema: import("@sinclair/typebox").TObject<{
    title: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
    creator_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    updated_at: import("@sinclair/typebox").TString;
}>;
export type ContextFocusThread = Static<typeof ContextFocusThreadSchema>;
export declare const ContextIncludedDataSchema: import("@sinclair/typebox").TObject<{
    space_revision_ref: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    space_content_status: import("@sinclair/typebox").TLiteral<"included">;
    objective: import("@sinclair/typebox").TString;
    rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        title: import("@sinclair/typebox").TString;
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        creator_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
    }>>;
    space_id: import("@sinclair/typebox").TString;
    slug: import("@sinclair/typebox").TString;
    policy_revision: import("@sinclair/typebox").TInteger;
    pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
        source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
        }> | import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
            has_newer_revision: import("@sinclair/typebox").TNull;
        }>)[]>>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
    }>>;
    blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
        issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
        version: import("@sinclair/typebox").TInteger;
        creator_id: import("@sinclair/typebox").TString;
        relation_id: import("@sinclair/typebox").TString;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"open_challenge">;
        relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
        state: import("@sinclair/typebox").TLiteral<"open">;
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
        attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
        report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    }>>;
    recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TString;
        object_id: import("@sinclair/typebox").TString;
        occurred_at: import("@sinclair/typebox").TString;
    }>>;
    checkpoint_token: import("@sinclair/typebox").TString;
}>;
export declare const ContextOmittedDataSchema: import("@sinclair/typebox").TObject<{
    space_revision_ref: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    space_content_status: import("@sinclair/typebox").TLiteral<"omitted_for_budget">;
    objective: import("@sinclair/typebox").TNull;
    rules: import("@sinclair/typebox").TNull;
    focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        title: import("@sinclair/typebox").TString;
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        creator_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
    }>>;
    space_id: import("@sinclair/typebox").TString;
    slug: import("@sinclair/typebox").TString;
    policy_revision: import("@sinclair/typebox").TInteger;
    pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
        source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
        }> | import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
            has_newer_revision: import("@sinclair/typebox").TNull;
        }>)[]>>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
    }>>;
    blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
        issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
        version: import("@sinclair/typebox").TInteger;
        creator_id: import("@sinclair/typebox").TString;
        relation_id: import("@sinclair/typebox").TString;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"open_challenge">;
        relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
        state: import("@sinclair/typebox").TLiteral<"open">;
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
        attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
        report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    }>>;
    recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TString;
        object_id: import("@sinclair/typebox").TString;
        occurred_at: import("@sinclair/typebox").TString;
    }>>;
    checkpoint_token: import("@sinclair/typebox").TString;
}>;
export declare const ContextResponseDataSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    space_revision_ref: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    space_content_status: import("@sinclair/typebox").TLiteral<"included">;
    objective: import("@sinclair/typebox").TString;
    rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        title: import("@sinclair/typebox").TString;
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        creator_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
    }>>;
    space_id: import("@sinclair/typebox").TString;
    slug: import("@sinclair/typebox").TString;
    policy_revision: import("@sinclair/typebox").TInteger;
    pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
        source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
        }> | import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
            has_newer_revision: import("@sinclair/typebox").TNull;
        }>)[]>>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
    }>>;
    blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
        issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
        version: import("@sinclair/typebox").TInteger;
        creator_id: import("@sinclair/typebox").TString;
        relation_id: import("@sinclair/typebox").TString;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"open_challenge">;
        relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
        state: import("@sinclair/typebox").TLiteral<"open">;
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
        attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
        report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    }>>;
    recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TString;
        object_id: import("@sinclair/typebox").TString;
        occurred_at: import("@sinclair/typebox").TString;
    }>>;
    checkpoint_token: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    space_revision_ref: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    space_content_status: import("@sinclair/typebox").TLiteral<"omitted_for_budget">;
    objective: import("@sinclair/typebox").TNull;
    rules: import("@sinclair/typebox").TNull;
    focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        title: import("@sinclair/typebox").TString;
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        creator_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
    }>>;
    space_id: import("@sinclair/typebox").TString;
    slug: import("@sinclair/typebox").TString;
    policy_revision: import("@sinclair/typebox").TInteger;
    pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
        source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
        }> | import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
            has_newer_revision: import("@sinclair/typebox").TNull;
        }>)[]>>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
    }>>;
    blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
        issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
        version: import("@sinclair/typebox").TInteger;
        creator_id: import("@sinclair/typebox").TString;
        relation_id: import("@sinclair/typebox").TString;
        source_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        source_author_id: import("@sinclair/typebox").TString;
        target_author_id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"open_challenge">;
        relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
        state: import("@sinclair/typebox").TLiteral<"open">;
        source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
        source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
    }>[]>>;
    recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        title: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
        attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
        missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
        report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
    }>>;
    recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TString;
        object_id: import("@sinclair/typebox").TString;
        occurred_at: import("@sinclair/typebox").TString;
    }>>;
    checkpoint_token: import("@sinclair/typebox").TString;
}>]>;
export type ContextResponseData = Static<typeof ContextResponseDataSchema>;
export declare const ContextResponseMetaSchema: import("@sinclair/typebox").TObject<{
    truncated: import("@sinclair/typebox").TBoolean;
    next_cursor: import("@sinclair/typebox").TNull;
}>;
export declare const ContextPageSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        space_revision_ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        space_content_status: import("@sinclair/typebox").TLiteral<"included">;
        objective: import("@sinclair/typebox").TString;
        rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            title: import("@sinclair/typebox").TString;
            id: import("@sinclair/typebox").TString;
            space_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
            creator_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            updated_at: import("@sinclair/typebox").TString;
        }>>;
        space_id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        policy_revision: import("@sinclair/typebox").TInteger;
        pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            summary: import("@sinclair/typebox").TString;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
            source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
                has_newer_revision: import("@sinclair/typebox").TBoolean;
            }> | import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
                has_newer_revision: import("@sinclair/typebox").TNull;
            }>)[]>>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
        }>>;
        blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
            issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
            version: import("@sinclair/typebox").TInteger;
            creator_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"open_challenge">;
            relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
            state: import("@sinclair/typebox").TLiteral<"open">;
            source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
            target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        }>[]>>;
        recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
            attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
            report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
        }>>;
        recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TString;
            object_id: import("@sinclair/typebox").TString;
            occurred_at: import("@sinclair/typebox").TString;
        }>>;
        checkpoint_token: import("@sinclair/typebox").TString;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TNull;
    }>;
}>, import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        space_revision_ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        space_content_status: import("@sinclair/typebox").TLiteral<"omitted_for_budget">;
        objective: import("@sinclair/typebox").TNull;
        rules: import("@sinclair/typebox").TNull;
        focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            title: import("@sinclair/typebox").TString;
            id: import("@sinclair/typebox").TString;
            space_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
            creator_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            updated_at: import("@sinclair/typebox").TString;
        }>>;
        space_id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        policy_revision: import("@sinclair/typebox").TInteger;
        pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            summary: import("@sinclair/typebox").TString;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
            source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
                has_newer_revision: import("@sinclair/typebox").TBoolean;
            }> | import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
                has_newer_revision: import("@sinclair/typebox").TNull;
            }>)[]>>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
        }>>;
        blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
            issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
            version: import("@sinclair/typebox").TInteger;
            creator_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"open_challenge">;
            relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
            state: import("@sinclair/typebox").TLiteral<"open">;
            source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
            target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        }>[]>>;
        recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
            attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
            report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
        }>>;
        recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TString;
            object_id: import("@sinclair/typebox").TString;
            occurred_at: import("@sinclair/typebox").TString;
        }>>;
        checkpoint_token: import("@sinclair/typebox").TString;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<true>;
        next_cursor: import("@sinclair/typebox").TNull;
    }>;
}>]>;
export type ContextPage = Static<typeof ContextPageSchema>;
export declare const ContextEnvelopeSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        space_revision_ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        space_content_status: import("@sinclair/typebox").TLiteral<"included">;
        objective: import("@sinclair/typebox").TString;
        rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            title: import("@sinclair/typebox").TString;
            id: import("@sinclair/typebox").TString;
            space_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
            creator_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            updated_at: import("@sinclair/typebox").TString;
        }>>;
        space_id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        policy_revision: import("@sinclair/typebox").TInteger;
        pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            summary: import("@sinclair/typebox").TString;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
            source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
                has_newer_revision: import("@sinclair/typebox").TBoolean;
            }> | import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
                has_newer_revision: import("@sinclair/typebox").TNull;
            }>)[]>>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
        }>>;
        blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
            issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
            version: import("@sinclair/typebox").TInteger;
            creator_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"open_challenge">;
            relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
            state: import("@sinclair/typebox").TLiteral<"open">;
            source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
            target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        }>[]>>;
        recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
            attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
            report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
        }>>;
        recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TString;
            object_id: import("@sinclair/typebox").TString;
            occurred_at: import("@sinclair/typebox").TString;
        }>>;
        checkpoint_token: import("@sinclair/typebox").TString;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
} | {
    data: import("@sinclair/typebox").TObject<{
        space_revision_ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        space_content_status: import("@sinclair/typebox").TLiteral<"omitted_for_budget">;
        objective: import("@sinclair/typebox").TNull;
        rules: import("@sinclair/typebox").TNull;
        focus_thread: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            title: import("@sinclair/typebox").TString;
            id: import("@sinclair/typebox").TString;
            space_id: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
            creator_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            updated_at: import("@sinclair/typebox").TString;
        }>>;
        space_id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        policy_revision: import("@sinclair/typebox").TInteger;
        pinned_summaries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            summary: import("@sinclair/typebox").TString;
            has_newer_revision: import("@sinclair/typebox").TBoolean;
            source_refs: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<(import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"active" | "withdrawn">;
                has_newer_revision: import("@sinclair/typebox").TBoolean;
            }> | import("@sinclair/typebox").TObject<{
                ref: import("@sinclair/typebox").TObject<{
                    post_id: import("@sinclair/typebox").TString;
                    revision: import("@sinclair/typebox").TInteger;
                }>;
                status: import("@sinclair/typebox").TLiteral<"redacted" | "unavailable">;
                has_newer_revision: import("@sinclair/typebox").TNull;
            }>)[]>>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"source_refs">[]>>;
        }>>;
        blocking_objections: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
            issue: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            impact: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issue">, import("@sinclair/typebox").TLiteral<"impact">]>>;
            version: import("@sinclair/typebox").TInteger;
            creator_id: import("@sinclair/typebox").TString;
            relation_id: import("@sinclair/typebox").TString;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"open_challenge">;
            relation_type: import("@sinclair/typebox").TLiteral<"challenges">;
            state: import("@sinclair/typebox").TLiteral<"open">;
            source_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            target_status: import("@sinclair/typebox").TLiteral<"active" | "redacted" | "withdrawn">;
            source_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
            target_has_newer_revision: import("@sinclair/typebox").TNull | import("@sinclair/typebox").TBoolean;
        }>[]>>;
        recent_failures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            title: import("@sinclair/typebox").TString;
            category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>, import("@sinclair/typebox").TNull]>;
            attempt: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            tested_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
            evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>, import("@sinclair/typebox").TNull]>;
            missing_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"attempt" | "category" | "tested_scope" | "evidence_state">[]>>;
            report_kind: import("@sinclair/typebox").TLiteral<"author_report">;
        }>>;
        recent_activity: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TString;
            object_id: import("@sinclair/typebox").TString;
            occurred_at: import("@sinclair/typebox").TString;
        }>>;
        checkpoint_token: import("@sinclair/typebox").TString;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<true>;
        next_cursor: import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
}>[]>;
export type ContextEnvelope = {
    api_version: '1';
    request_id: string;
} & ContextPage;
export declare function buildContextEnvelope(requestId: string, page: ContextPage): ContextEnvelope;
export declare function serializeContextEnvelope(requestId: string, page: ContextPage): string;
export declare function contextEnvelopeBytes(requestId: string, page: ContextPage): number;
export declare const ViewNameSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"failures">, import("@sinclair/typebox").TLiteral<"findings">, import("@sinclair/typebox").TLiteral<"open-questions">]>;
export type ViewName = Static<typeof ViewNameSchema>;
/** Field-local historical shape guards: no defaults, authorization or lifecycle logic. */
export declare function isHistoricalMaterialField(kind: 'claim' | 'failure', field: string, value: unknown): boolean;
export declare function isPostRef(value: unknown): value is PostRef;
export declare function isPostRefArray(value: unknown): value is PostRef[];
export declare const ReviewSubmissionSearchFilterSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    target_post_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const ReviewSubmissionSearchQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    request_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    target_post_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    source: import("@sinclair/typebox").TLiteral<"review_submissions">;
    q: import("@sinclair/typebox").TString;
}>;
export type ReviewSubmissionSearchQuery = Static<typeof ReviewSubmissionSearchQuerySchema>;
export interface NormalizedReviewSubmissionSearchQuery extends Omit<ReviewSubmissionSearchQuery, 'limit'> {
    limit: number;
}
export declare const PostsSearchSourceQuerySchema: import("@sinclair/typebox").TObject<{
    source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<"posts">>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>>;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    q: import("@sinclair/typebox").TString;
}>;
export declare const SearchSourceQuerySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<"posts">>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>>;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    q: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    request_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    target_post_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    source: import("@sinclair/typebox").TLiteral<"review_submissions">;
    q: import("@sinclair/typebox").TString;
}>]>;
export type SearchSourceQuery = Static<typeof SearchSourceQuerySchema>;
export declare function validateSearchSourceQuery(value: unknown): asserts value is SearchSourceQuery;
export declare function foldReviewSearchText(value: string): string;
export declare function normalizeReviewSubmissionSearchQuery(query: ReviewSubmissionSearchQuery): NormalizedReviewSubmissionSearchQuery;
export declare const PublicReviewSubmissionSearchItemSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"review_submission">;
    submission_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    round: import("@sinclair/typebox").TInteger;
    reviewer_actor_id: import("@sinclair/typebox").TString;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    submitted_at: import("@sinclair/typebox").TString;
    revealed_at: import("@sinclair/typebox").TString;
    snippet: import("@sinclair/typebox").TString;
}>;
export type PublicReviewSubmissionSearchItem = Static<typeof PublicReviewSubmissionSearchItemSchema>;
export declare const PublicReviewSubmissionSearchPageSchema: import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"review_submission">;
        submission_id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        request_id: import("@sinclair/typebox").TString;
        snapshot_id: import("@sinclair/typebox").TString;
        target_ref: import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            post_id: import("@sinclair/typebox").TString;
        }>;
        round: import("@sinclair/typebox").TInteger;
        reviewer_actor_id: import("@sinclair/typebox").TString;
        verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
        submitted_at: import("@sinclair/typebox").TString;
        revealed_at: import("@sinclair/typebox").TString;
        snippet: import("@sinclair/typebox").TString;
    }>>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<false>;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
}>;
export type PublicReviewSubmissionSearchPage = Static<typeof PublicReviewSubmissionSearchPageSchema>;
export declare const ReviewSubmissionSearchCursorPayloadSchema: import("@sinclair/typebox").TObject<{
    v: import("@sinclair/typebox").TLiteral<1>;
    purpose: import("@sinclair/typebox").TLiteral<"review_submission_search">;
    source: import("@sinclair/typebox").TLiteral<"review_submissions">;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    query_hash: import("@sinclair/typebox").TString;
    sort: import("@sinclair/typebox").TLiteral<"submission_id_desc">;
    before_submission_id: import("@sinclair/typebox").TString;
    exp: import("@sinclair/typebox").TInteger;
}>;
export type ReviewSubmissionSearchCursorPayload = Static<typeof ReviewSubmissionSearchCursorPayloadSchema>;
export declare function isReviewSubmissionSearchCursorPayload(value: unknown): value is ReviewSubmissionSearchCursorPayload;
/** SQLite UTF-8 TEXT/BINARY order, shared by service and wire guards; no locale collation. */
export declare function compareReviewSubmissionIds(a: string, b: string): number;
export declare function isUnicodeReviewId(value: string): boolean;
//# sourceMappingURL=search.d.ts.map