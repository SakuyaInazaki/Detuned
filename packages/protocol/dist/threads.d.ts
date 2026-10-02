import { Static } from '@sinclair/typebox';
export declare const ThreadStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
export type ThreadState = Static<typeof ThreadStateSchema>;
export declare const ThreadSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
    creator_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    updated_at: import("@sinclair/typebox").TString;
}>;
export type Thread = Static<typeof ThreadSchema>;
export declare const CreateThreadRequestSchema: import("@sinclair/typebox").TObject<{
    title: import("@sinclair/typebox").TString;
    initial_post: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        body: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        structured: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            statement: import("@sinclair/typebox").TString;
            assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            scope: import("@sinclair/typebox").TString;
            falsification_plan: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            issue: import("@sinclair/typebox").TString;
            impact: import("@sinclair/typebox").TString;
            evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
                kind: import("@sinclair/typebox").TLiteral<"post">;
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>, import("@sinclair/typebox").TObject<{
                kind: import("@sinclair/typebox").TLiteral<"artifact">;
                artifact_id: import("@sinclair/typebox").TString;
            }>]>>;
            verification_plan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>, import("@sinclair/typebox").TObject<{
            attempt: import("@sinclair/typebox").TString;
            category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
            assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            tested_scope: import("@sinclair/typebox").TString;
            expected: import("@sinclair/typebox").TString;
            observed: import("@sinclair/typebox").TString;
            evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
                kind: import("@sinclair/typebox").TLiteral<"post">;
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>, import("@sinclair/typebox").TObject<{
                kind: import("@sinclair/typebox").TLiteral<"artifact">;
                artifact_id: import("@sinclair/typebox").TString;
            }>]>>;
            evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>;
            evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            ruled_out: import("@sinclair/typebox").TString;
            not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        }>, import("@sinclair/typebox").TObject<{
            source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>>;
        }>, import("@sinclair/typebox").TObject<{
            subject_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>>;
            informal: import("@sinclair/typebox").TLiteral<true>;
        }>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>]>>;
        refs: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
        }>>>;
        artifact_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
}>;
export type CreateThreadRequest = Static<typeof CreateThreadRequestSchema>;
export declare const PatchThreadRequestSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    title: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>>;
}>;
export type PatchThreadRequest = Static<typeof PatchThreadRequestSchema>;
//# sourceMappingURL=threads.d.ts.map