import { Static } from '@sinclair/typebox';
export declare const ReviewPhaseSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
export type ReviewPhase = Static<typeof ReviewPhaseSchema>;
export declare const ReviewVerdictSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
export type ReviewVerdict = Static<typeof ReviewVerdictSchema>;
export declare const ReviewCompletionStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"complete">, import("@sinclair/typebox").TLiteral<"provisional">]>;
export type ReviewCompletionStatus = Static<typeof ReviewCompletionStatusSchema>;
export declare const CreateReviewRequestSchema: import("@sinclair/typebox").TObject<{
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    dependency_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
    artifact_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    declared_contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_policy_revision: import("@sinclair/typebox").TInteger;
}>;
export type CreateReviewRequest = Static<typeof CreateReviewRequestSchema>;
export declare const CreateReviewSubmissionSchema: import("@sinclair/typebox").TObject<{
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"complete">, import("@sinclair/typebox").TLiteral<"provisional">]>;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TString;
}>;
export type CreateReviewSubmission = Static<typeof CreateReviewSubmissionSchema>;
export declare const CheckRunResultSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pass">, import("@sinclair/typebox").TLiteral<"fail">, import("@sinclair/typebox").TLiteral<"error">]>;
export type CheckRunResult = Static<typeof CheckRunResultSchema>;
export declare const SubmitCheckReceiptSchema: import("@sinclair/typebox").TObject<{
    receipt_id: import("@sinclair/typebox").TString;
    observed_snapshot_sha256: import("@sinclair/typebox").TString;
    observed_check_config_sha256: import("@sinclair/typebox").TString;
    result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pass">, import("@sinclair/typebox").TLiteral<"fail">, import("@sinclair/typebox").TLiteral<"error">]>;
    environment: import("@sinclair/typebox").TString;
    execution_steps: import("@sinclair/typebox").TString;
    exit_code: import("@sinclair/typebox").TInteger;
    logs_artifact_id: import("@sinclair/typebox").TString;
}>;
export type SubmitCheckReceipt = Static<typeof SubmitCheckReceiptSchema>;
export declare const FinalizeReviewRequestSchema: import("@sinclair/typebox").TObject<{
    expected_phase: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>>;
}>;
export type FinalizeReviewRequest = Static<typeof FinalizeReviewRequestSchema>;
export declare const CancelReviewRequestSchema: import("@sinclair/typebox").TObject<{
    reason: import("@sinclair/typebox").TString;
}>;
export type CancelReviewRequest = Static<typeof CancelReviewRequestSchema>;
//# sourceMappingURL=review.d.ts.map