import { Static } from '@sinclair/typebox';
import { ReviewPolicySchema } from './spaces.js';
export declare const ReviewPhaseSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
export type ReviewPhase = Static<typeof ReviewPhaseSchema>;
export declare const ReviewVerdictSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
export type ReviewVerdict = Static<typeof ReviewVerdictSchema>;
export declare const ReviewCompletionStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"complete">, import("@sinclair/typebox").TLiteral<"provisional">]>;
export type ReviewCompletionStatus = Static<typeof ReviewCompletionStatusSchema>;
export declare const CreateReviewRequestSchema: import("@sinclair/typebox").TObject<{
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    dependency_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>>;
    artifact_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        source_artifact_id: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    declared_contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_policy_revision: import("@sinclair/typebox").TInteger;
    reproduction_instructions: import("@sinclair/typebox").TString;
}>;
export type CreateReviewRequest = Static<typeof CreateReviewRequestSchema>;
export declare function isCreateReviewRequest(value: unknown): value is CreateReviewRequest;
export declare const CreateReviewSubmissionSchema: import("@sinclair/typebox").TObject<{
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TLiteral<"complete">;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TLiteral<"post">;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TObject<{
        participated_in_material: import("@sinclair/typebox").TLiteral<false>;
        exposed_to_other_reviews: import("@sinclair/typebox").TLiteral<false>;
        statement: import("@sinclair/typebox").TString;
    }>;
}>;
export type CreateReviewSubmission = Static<typeof CreateReviewSubmissionSchema>;
export declare function isCreateReviewSubmission(value: unknown): value is CreateReviewSubmission;
export declare const CheckRunResultSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pass">, import("@sinclair/typebox").TLiteral<"fail">, import("@sinclair/typebox").TLiteral<"error">]>;
export type CheckRunResult = Static<typeof CheckRunResultSchema>;
export declare const SubmitCheckReceiptSchema: import("@sinclair/typebox").TObject<{
    receipt_id: import("@sinclair/typebox").TString;
    observed_snapshot_sha256: import("@sinclair/typebox").TString;
    observed_check_config_sha256: import("@sinclair/typebox").TString;
    result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pass">, import("@sinclair/typebox").TLiteral<"fail">, import("@sinclair/typebox").TLiteral<"error">]>;
    environment: import("@sinclair/typebox").TString;
    execution_steps: import("@sinclair/typebox").TString;
    tool_versions: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>;
    started_at: import("@sinclair/typebox").TString;
    finished_at: import("@sinclair/typebox").TString;
    exit_code: import("@sinclair/typebox").TInteger;
    logs_artifact_id: import("@sinclair/typebox").TString;
}>;
export type SubmitCheckReceipt = Static<typeof SubmitCheckReceiptSchema>;
export declare function isCheckInstant(value: unknown): value is string;
export declare function isSubmitCheckReceipt(value: unknown): value is SubmitCheckReceipt;
export declare const CreateCheckRunSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    check_name: import("@sinclair/typebox").TString;
    verifier_id: import("@sinclair/typebox").TString;
    expected_request_version: import("@sinclair/typebox").TInteger;
}>;
export type CreateCheckRun = Static<typeof CreateCheckRunSchema>;
export declare const InvalidateCheckRunSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
}>;
export type InvalidateCheckRun = Static<typeof InvalidateCheckRunSchema>;
export type CheckRunState = 'pending' | 'pass' | 'fail' | 'error' | 'invalidated';
export interface CheckRunRecord {
    id: string;
    request_id: string;
    snapshot_id: string;
    snapshot_sha256: string;
    check_name: string;
    attempt: number;
    verifier_actor_id: string;
    check_config_sha256: string;
    created_request_version: number;
    state: CheckRunState;
    version: number;
    created_by: string;
    created_at: string;
    changed_by: string;
    changed_at: string;
    invalidation_reason: string | null;
}
export interface CheckRunVersionRecord {
    check_run_id: string;
    version: number;
    observed_request_version: number;
    state: CheckRunState;
    receipt_id: string | null;
    changed_by: string;
    changed_at: string;
    invalidation_reason: string | null;
}
export interface CheckReceiptRecord extends SubmitCheckReceipt {
    check_run_id: string;
    verifier_actor_id: string;
    received_at: string;
    run_version: number;
}
export interface CheckRunCredentialRecord {
    credential_id: string;
    check_run_id: string;
    created_at: string;
}
export declare const FinalizeReviewRequestSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
}>;
export type FinalizeReviewRequest = Static<typeof FinalizeReviewRequestSchema>;
export declare const CancelReviewRequestSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
}>;
export type CancelReviewRequest = Static<typeof CancelReviewRequestSchema>;
export declare function isSnapshotReviewPolicy(value: unknown): value is Static<typeof ReviewPolicySchema>;
export declare const ReviewSnapshotRecordSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    manifest_json: import("@sinclair/typebox").TString;
    manifest_sha256: import("@sinclair/typebox").TString;
    policy_revision: import("@sinclair/typebox").TInteger;
    rules_revision: import("@sinclair/typebox").TInteger;
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    created_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type ReviewSnapshotRecord = Static<typeof ReviewSnapshotRecordSchema>;
export declare const ReviewSnapshotItemRecordSchema: import("@sinclair/typebox").TObject<{
    snapshot_id: import("@sinclair/typebox").TString;
    item_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_post">, import("@sinclair/typebox").TLiteral<"dependency_post">, import("@sinclair/typebox").TLiteral<"artifact">, import("@sinclair/typebox").TLiteral<"space_rules">]>;
    item_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    sha256: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewSnapshotItemRecord = Static<typeof ReviewSnapshotItemRecordSchema>;
export declare const ReviewRequestRecordSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    snapshot_id: import("@sinclair/typebox").TString;
    round: import("@sinclair/typebox").TInteger;
    phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
    version: import("@sinclair/typebox").TInteger;
    submitted_count: import("@sinclair/typebox").TInteger;
    requested_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    changed_by: import("@sinclair/typebox").TString;
    changed_at: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewRequestRecord = Static<typeof ReviewRequestRecordSchema>;
export declare const ReviewRequestVersionRecordSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
    submitted_count: import("@sinclair/typebox").TInteger;
    changed_by: import("@sinclair/typebox").TString;
    changed_at: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewRequestVersionRecord = Static<typeof ReviewRequestVersionRecordSchema>;
export declare const ReviewAssignmentRecordSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    reviewer_actor_id: import("@sinclair/typebox").TString;
    group_at_assignment: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewAssignmentRecord = Static<typeof ReviewAssignmentRecordSchema>;
export declare const ReviewRequestViewSchema: import("@sinclair/typebox").TObject<{
    snapshot_sha256: import("@sinclair/typebox").TString;
    rules_revision: import("@sinclair/typebox").TInteger;
    policy_revision: import("@sinclair/typebox").TInteger;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    snapshot_id: import("@sinclair/typebox").TString;
    round: import("@sinclair/typebox").TInteger;
    phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
    version: import("@sinclair/typebox").TInteger;
    requested_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    changed_by: import("@sinclair/typebox").TString;
    changed_at: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewRequestView = Static<typeof ReviewRequestViewSchema>;
export declare function isCancelReviewRequest(value: unknown): value is CancelReviewRequest;
export declare const ReviewSnapshotManifestSchema: import("@sinclair/typebox").TObject<{
    manifest_version: import("@sinclair/typebox").TLiteral<1>;
    space_id: import("@sinclair/typebox").TString;
    target: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            post_id: import("@sinclair/typebox").TString;
        }>;
        content_hash: import("@sinclair/typebox").TString;
        statement: import("@sinclair/typebox").TString;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        scope: import("@sinclair/typebox").TString;
        falsification_plan: import("@sinclair/typebox").TString;
    }>;
    dependencies: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            post_id: import("@sinclair/typebox").TString;
        }>;
        content_hash: import("@sinclair/typebox").TString;
    }>>;
    artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        artifact_id: import("@sinclair/typebox").TString;
        sha256: import("@sinclair/typebox").TString;
        bytes: import("@sinclair/typebox").TInteger;
    }>>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        source_artifact_id: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    rules_revision: import("@sinclair/typebox").TInteger;
    policy_revision: import("@sinclair/typebox").TInteger;
    review_policy: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        required_reviewers: import("@sinclair/typebox").TInteger;
        exclude_contributors: import("@sinclair/typebox").TBoolean;
        distinct_actors: import("@sinclair/typebox").TBoolean;
        distinct_independence_groups: import("@sinclair/typebox").TBoolean;
        seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
        invalidate_on_revision: import("@sinclair/typebox").TBoolean;
        required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        allow_open_objections: import("@sinclair/typebox").TBoolean;
    }>;
    check_profiles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        check_name: import("@sinclair/typebox").TString;
        config_sha256: import("@sinclair/typebox").TString;
        verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        description: import("@sinclair/typebox").TString;
    }>>;
    contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reproduction_instructions: import("@sinclair/typebox").TString;
}>;
export type ReviewSnapshotManifestData = Static<typeof ReviewSnapshotManifestSchema>;
export declare function isReviewSnapshotManifest(value: unknown): value is ReviewSnapshotManifestData;
export declare const ReviewRequestReadViewSchema: import("@sinclair/typebox").TObject<{
    changed_by: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    submitted_count: import("@sinclair/typebox").TInteger;
    snapshot_sha256: import("@sinclair/typebox").TString;
    rules_revision: import("@sinclair/typebox").TInteger;
    policy_revision: import("@sinclair/typebox").TInteger;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    snapshot_id: import("@sinclair/typebox").TString;
    round: import("@sinclair/typebox").TInteger;
    phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
    version: import("@sinclair/typebox").TInteger;
    requested_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    changed_at: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewRequestReadView = Static<typeof ReviewRequestReadViewSchema>;
export declare const ReviewSubmissionRecordSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    assignment_id: import("@sinclair/typebox").TString;
    reviewer_actor_id: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    payload: import("@sinclair/typebox").TObject<{
        snapshot_sha256: import("@sinclair/typebox").TString;
        reviewer_session_id: import("@sinclair/typebox").TString;
        completion_status: import("@sinclair/typebox").TLiteral<"complete">;
        verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
        coverage: import("@sinclair/typebox").TString;
        checks_performed: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            post_id: import("@sinclair/typebox").TString;
            kind: import("@sinclair/typebox").TLiteral<"post">;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        independence_statement: import("@sinclair/typebox").TObject<{
            participated_in_material: import("@sinclair/typebox").TLiteral<false>;
            exposed_to_other_reviews: import("@sinclair/typebox").TLiteral<false>;
            statement: import("@sinclair/typebox").TString;
        }>;
    }>;
    request_version: import("@sinclair/typebox").TInteger;
    submitted_at: import("@sinclair/typebox").TString;
    revealed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ReviewSubmissionRecord = Static<typeof ReviewSubmissionRecordSchema>;
export declare const ReviewSubmissionAcknowledgementSchema: import("@sinclair/typebox").TObject<{
    submission_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    assignment_id: import("@sinclair/typebox").TString;
    reviewer_actor_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    submitted_at: import("@sinclair/typebox").TString;
}>;
export type ReviewSubmissionAcknowledgement = Static<typeof ReviewSubmissionAcknowledgementSchema>;
export declare const ReviewSubmissionViewSchema: import("@sinclair/typebox").TObject<{
    submission_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    assignment_id: import("@sinclair/typebox").TString;
    reviewer_actor_id: import("@sinclair/typebox").TString;
    request_version: import("@sinclair/typebox").TInteger;
    submitted_at: import("@sinclair/typebox").TString;
    revealed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TLiteral<"complete">;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TLiteral<"post">;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TObject<{
        participated_in_material: import("@sinclair/typebox").TLiteral<false>;
        exposed_to_other_reviews: import("@sinclair/typebox").TLiteral<false>;
        statement: import("@sinclair/typebox").TString;
    }>;
}>;
export type ReviewSubmissionView = Static<typeof ReviewSubmissionViewSchema>;
export declare const ReviewDecisionRecordSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    review_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    check_receipt_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">]>;
    rationale: import("@sinclair/typebox").TString;
    request_version: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
}>;
export type ReviewDecisionRecord = Static<typeof ReviewDecisionRecordSchema>;
export declare const ReviewDecisionViewSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    review_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    check_receipt_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">]>;
    rationale: import("@sinclair/typebox").TString;
    request_version: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
}>;
export type ReviewDecisionView = ReviewDecisionRecord;
export declare const ReviewValidityReasonSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>;
export type ReviewValidityReason = Static<typeof ReviewValidityReasonSchema>;
export declare const REVIEW_VALIDITY_REASON_ORDER: readonly ReviewValidityReason[];
export declare const ReviewValidityFactsSchema: import("@sinclair/typebox").TObject<{
    current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
    validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
}>;
export type ReviewValidityFacts = Static<typeof ReviewValidityFactsSchema>;
export declare const ReviewStatusViewSchema: import("@sinclair/typebox").TObject<{
    current_validity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"invalidated">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"current">]>;
    validity_reasons: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"target_redacted">, import("@sinclair/typebox").TLiteral<"dependency_redacted">, import("@sinclair/typebox").TLiteral<"artifact_redacted">, import("@sinclair/typebox").TLiteral<"target_withdrawn">, import("@sinclair/typebox").TLiteral<"dependency_withdrawn">, import("@sinclair/typebox").TLiteral<"artifact_unavailable">, import("@sinclair/typebox").TLiteral<"published_review_evidence_redacted">, import("@sinclair/typebox").TLiteral<"published_review_evidence_unavailable">, import("@sinclair/typebox").TLiteral<"check_invalidated">, import("@sinclair/typebox").TLiteral<"check_log_redacted">, import("@sinclair/typebox").TLiteral<"check_log_unavailable">, import("@sinclair/typebox").TLiteral<"target_superseded">, import("@sinclair/typebox").TLiteral<"dependency_superseded">, import("@sinclair/typebox").TLiteral<"policy_superseded">, import("@sinclair/typebox").TLiteral<"open_challenges">]>>;
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
    verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
}>;
export type ReviewStatusView = Static<typeof ReviewStatusViewSchema>;
export declare function isFinalizeReviewRequest(value: unknown): value is FinalizeReviewRequest;
/** Strict public read data, distinct from internal persistence records. */
export declare const ReviewSnapshotViewSchema: import("@sinclair/typebox").TObject<{
    snapshot_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    manifest_sha256: import("@sinclair/typebox").TString;
    manifest: import("@sinclair/typebox").TObject<{
        manifest_version: import("@sinclair/typebox").TLiteral<1>;
        space_id: import("@sinclair/typebox").TString;
        target: import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                revision: import("@sinclair/typebox").TInteger;
                post_id: import("@sinclair/typebox").TString;
            }>;
            content_hash: import("@sinclair/typebox").TString;
            statement: import("@sinclair/typebox").TString;
            assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            scope: import("@sinclair/typebox").TString;
            falsification_plan: import("@sinclair/typebox").TString;
        }>;
        dependencies: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                revision: import("@sinclair/typebox").TInteger;
                post_id: import("@sinclair/typebox").TString;
            }>;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            artifact_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
        }>>;
        code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            repository: import("@sinclair/typebox").TString;
            commit: import("@sinclair/typebox").TString;
            source_artifact_id: import("@sinclair/typebox").TString;
            reproduction_instructions: import("@sinclair/typebox").TString;
        }>>;
        rules_revision: import("@sinclair/typebox").TInteger;
        policy_revision: import("@sinclair/typebox").TInteger;
        review_policy: import("@sinclair/typebox").TObject<{
            enabled: import("@sinclair/typebox").TBoolean;
            required_reviewers: import("@sinclair/typebox").TInteger;
            exclude_contributors: import("@sinclair/typebox").TBoolean;
            distinct_actors: import("@sinclair/typebox").TBoolean;
            distinct_independence_groups: import("@sinclair/typebox").TBoolean;
            seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
            invalidate_on_revision: import("@sinclair/typebox").TBoolean;
            required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            allow_open_objections: import("@sinclair/typebox").TBoolean;
        }>;
        check_profiles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            check_name: import("@sinclair/typebox").TString;
            config_sha256: import("@sinclair/typebox").TString;
            verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            description: import("@sinclair/typebox").TString;
        }>>;
        contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>;
    created_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type ReviewSnapshotView = Static<typeof ReviewSnapshotViewSchema>;
export declare const OwnReviewAssignmentViewSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    reviewer_actor_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
}>;
export type OwnReviewAssignmentView = Static<typeof OwnReviewAssignmentViewSchema>;
export declare const ReviewSubmissionsViewSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    submissions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        submission_id: import("@sinclair/typebox").TString;
        request_id: import("@sinclair/typebox").TString;
        assignment_id: import("@sinclair/typebox").TString;
        reviewer_actor_id: import("@sinclair/typebox").TString;
        request_version: import("@sinclair/typebox").TInteger;
        submitted_at: import("@sinclair/typebox").TString;
        revealed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        snapshot_sha256: import("@sinclair/typebox").TString;
        reviewer_session_id: import("@sinclair/typebox").TString;
        completion_status: import("@sinclair/typebox").TLiteral<"complete">;
        verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
        coverage: import("@sinclair/typebox").TString;
        checks_performed: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            post_id: import("@sinclair/typebox").TString;
            kind: import("@sinclair/typebox").TLiteral<"post">;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        independence_statement: import("@sinclair/typebox").TObject<{
            participated_in_material: import("@sinclair/typebox").TLiteral<false>;
            exposed_to_other_reviews: import("@sinclair/typebox").TLiteral<false>;
            statement: import("@sinclair/typebox").TString;
        }>;
    }>>;
}>;
export type ReviewSubmissionsView = Static<typeof ReviewSubmissionsViewSchema>;
export declare const PostReviewRequestsQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type PostReviewRequestsQuery = Static<typeof PostReviewRequestsQuerySchema>;
export declare const ReviewRoundSummarySchema: import("@sinclair/typebox").TObject<{
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
}>;
export type ReviewRoundSummary = Static<typeof ReviewRoundSummarySchema>;
export declare const PostReviewRequestsPageSchema: import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
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
    }>>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
}>;
export type PostReviewRequestsPage = Static<typeof PostReviewRequestsPageSchema>;
export declare const PostReviewRequestsEnvelopeSchema: import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
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
    }>>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
}>;
export declare const PostReviewRequestsCursorSchema: import("@sinclair/typebox").TObject<{
    v: import("@sinclair/typebox").TLiteral<1>;
    purpose: import("@sinclair/typebox").TLiteral<"post_review_requests">;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    post_id: import("@sinclair/typebox").TString;
    sort: import("@sinclair/typebox").TLiteral<"round_desc">;
    after_round: import("@sinclair/typebox").TInteger;
    exp: import("@sinclair/typebox").TInteger;
}>;
export declare function isPostReviewRequestsCursor(value: unknown): value is Static<typeof PostReviewRequestsCursorSchema>;
export declare function validatePostReviewRequestsQuery(value: unknown): asserts value is PostReviewRequestsQuery;
export declare function serializePostReviewRequestsEnvelope(requestId: string, page: PostReviewRequestsPage): string;
export declare function postReviewRequestsEnvelopeBytes(requestId: string, page: PostReviewRequestsPage): number;
/** Scoped check HTTP views exclude persistence-only audit and credential bindings. */
export declare const CheckRunViewSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    check_name: import("@sinclair/typebox").TString;
    attempt: import("@sinclair/typebox").TInteger;
    verifier_actor_id: import("@sinclair/typebox").TString;
    check_config_sha256: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"error" | "pass" | "fail" | "pending" | "invalidated">[]>;
    version: import("@sinclair/typebox").TInteger;
    created_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    changed_by: import("@sinclair/typebox").TString;
    changed_at: import("@sinclair/typebox").TString;
    invalidation_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type CheckRunView = Static<typeof CheckRunViewSchema>;
export declare const CheckReceiptViewSchema: import("@sinclair/typebox").TObject<{
    check_run_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    verifier_actor_id: import("@sinclair/typebox").TString;
    received_at: import("@sinclair/typebox").TString;
    run_version: import("@sinclair/typebox").TInteger;
    receipt_id: import("@sinclair/typebox").TString;
    observed_snapshot_sha256: import("@sinclair/typebox").TString;
    observed_check_config_sha256: import("@sinclair/typebox").TString;
    result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pass">, import("@sinclair/typebox").TLiteral<"fail">, import("@sinclair/typebox").TLiteral<"error">]>;
    environment: import("@sinclair/typebox").TString;
    execution_steps: import("@sinclair/typebox").TString;
    tool_versions: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>;
    started_at: import("@sinclair/typebox").TString;
    finished_at: import("@sinclair/typebox").TString;
    exit_code: import("@sinclair/typebox").TInteger;
    logs_artifact_id: import("@sinclair/typebox").TString;
}>;
export type CheckReceiptView = Static<typeof CheckReceiptViewSchema>;
export declare const CheckSnapshotViewSchema: import("@sinclair/typebox").TObject<{
    check_run_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    manifest_sha256: import("@sinclair/typebox").TString;
    manifest: import("@sinclair/typebox").TObject<{
        manifest_version: import("@sinclair/typebox").TLiteral<1>;
        space_id: import("@sinclair/typebox").TString;
        target: import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                revision: import("@sinclair/typebox").TInteger;
                post_id: import("@sinclair/typebox").TString;
            }>;
            content_hash: import("@sinclair/typebox").TString;
            statement: import("@sinclair/typebox").TString;
            assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            scope: import("@sinclair/typebox").TString;
            falsification_plan: import("@sinclair/typebox").TString;
        }>;
        dependencies: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            ref: import("@sinclair/typebox").TObject<{
                revision: import("@sinclair/typebox").TInteger;
                post_id: import("@sinclair/typebox").TString;
            }>;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            artifact_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
        }>>;
        code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            repository: import("@sinclair/typebox").TString;
            commit: import("@sinclair/typebox").TString;
            source_artifact_id: import("@sinclair/typebox").TString;
            reproduction_instructions: import("@sinclair/typebox").TString;
        }>>;
        rules_revision: import("@sinclair/typebox").TInteger;
        policy_revision: import("@sinclair/typebox").TInteger;
        review_policy: import("@sinclair/typebox").TObject<{
            enabled: import("@sinclair/typebox").TBoolean;
            required_reviewers: import("@sinclair/typebox").TInteger;
            exclude_contributors: import("@sinclair/typebox").TBoolean;
            distinct_actors: import("@sinclair/typebox").TBoolean;
            distinct_independence_groups: import("@sinclair/typebox").TBoolean;
            seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
            invalidate_on_revision: import("@sinclair/typebox").TBoolean;
            required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            allow_open_objections: import("@sinclair/typebox").TBoolean;
        }>;
        check_profiles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            check_name: import("@sinclair/typebox").TString;
            config_sha256: import("@sinclair/typebox").TString;
            verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            description: import("@sinclair/typebox").TString;
        }>>;
        contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>;
    created_by: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type CheckSnapshotView = Static<typeof CheckSnapshotViewSchema>;
export declare const CheckPostRevisionViewSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    check_run_id: import("@sinclair/typebox").TString;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    body: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    structured: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
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
    }>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>]>;
    content_hash: import("@sinclair/typebox").TString;
    editor_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type CheckPostRevisionView = Static<typeof CheckPostRevisionViewSchema>;
export declare const IssueCheckRunCredentialRequestSchema: import("@sinclair/typebox").TObject<{
    ttl_seconds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type IssueCheckRunCredentialRequest = Static<typeof IssueCheckRunCredentialRequestSchema>;
export declare const IssueCheckRunCredentialDataSchema: import("@sinclair/typebox").TObject<{
    credential_id: import("@sinclair/typebox").TString;
    token: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TString;
}>;
export type IssueCheckRunCredentialData = Static<typeof IssueCheckRunCredentialDataSchema>;
export declare const RequiredChecksViewSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    request_version: import("@sinclair/typebox").TInteger;
    verification_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"not_required">, import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"passed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"error">]>;
    checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        check_name: import("@sinclair/typebox").TString;
        run: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            space_id: import("@sinclair/typebox").TString;
            request_id: import("@sinclair/typebox").TString;
            snapshot_id: import("@sinclair/typebox").TString;
            snapshot_sha256: import("@sinclair/typebox").TString;
            check_name: import("@sinclair/typebox").TString;
            attempt: import("@sinclair/typebox").TInteger;
            verifier_actor_id: import("@sinclair/typebox").TString;
            check_config_sha256: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"error" | "pass" | "fail" | "pending" | "invalidated">[]>;
            version: import("@sinclair/typebox").TInteger;
            created_by: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            changed_by: import("@sinclair/typebox").TString;
            changed_at: import("@sinclair/typebox").TString;
            invalidation_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        }>, import("@sinclair/typebox").TNull]>;
        receipt_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export type RequiredChecksView = Static<typeof RequiredChecksViewSchema>;
export declare function isIssueCheckRunCredentialRequest(value: unknown): value is IssueCheckRunCredentialRequest;
export declare const CheckSpaceParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
}>;
export declare const CheckRunParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
}>;
export declare const CheckPostParamsSchema: import("@sinclair/typebox").TObject<{
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
}>;
export declare const CheckRequestParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
}>;
export declare const CheckArtifactParamsSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
}>;
//# sourceMappingURL=review.d.ts.map