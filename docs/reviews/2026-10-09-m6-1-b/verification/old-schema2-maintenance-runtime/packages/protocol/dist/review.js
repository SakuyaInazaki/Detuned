import { Value } from '@sinclair/typebox/value';
import { Type } from '@sinclair/typebox';
import { ReviewPolicySchema } from './spaces.js';
import { PostRefSchema, EvidenceRefSchema } from './common.js';
export const ReviewPhaseSchema = Type.Union([
    Type.Literal('collecting'),
    Type.Literal('revealed'),
    Type.Literal('accepted'),
    Type.Literal('changes_requested'),
    Type.Literal('rejected'),
    Type.Literal('stale'),
    Type.Literal('cancelled'),
]);
export const ReviewVerdictSchema = Type.Union([
    Type.Literal('accept'),
    Type.Literal('changes_requested'),
    Type.Literal('reject'),
]);
export const ReviewCompletionStatusSchema = Type.Union([
    Type.Literal('complete'),
    Type.Literal('provisional'),
]);
const nonBlank = (maxLength) => Type.String({ minLength: 1, maxLength, pattern: '\\S' });
const snapshotRef = Type.Object({ ...PostRefSchema.properties, revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) }, { additionalProperties: false });
export const CreateReviewRequestSchema = Type.Object({
    target_ref: snapshotRef,
    dependency_refs: Type.Array(snapshotRef, { maxItems: 32, uniqueItems: true }),
    artifact_ids: Type.Array(Type.String({ minLength: 1 }), { maxItems: 64, uniqueItems: true }),
    code_refs: Type.Array(Type.Object({
        repository: nonBlank(2048),
        commit: Type.String({ pattern: '^(?:[0-9a-f]{40}|[0-9a-f]{64})(?![\\s\\S])' }),
        source_artifact_id: Type.String({ minLength: 1 }),
        reproduction_instructions: nonBlank(16000),
    }, { additionalProperties: false }), { maxItems: 16 }),
    declared_contributors: Type.Array(Type.String({ minLength: 1 }), { maxItems: 128, uniqueItems: true }),
    reviewer_actor_ids: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 5, uniqueItems: true }),
    expected_policy_revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
    reproduction_instructions: nonBlank(16000),
}, { additionalProperties: false });
export function isCreateReviewRequest(value) {
    return Value.Check(CreateReviewRequestSchema, value);
}
export const CreateReviewSubmissionSchema = Type.Object({
    snapshot_sha256: Type.String({ minLength: 64, maxLength: 64 }),
    reviewer_session_id: Type.String({ minLength: 1 }),
    completion_status: ReviewCompletionStatusSchema,
    verdict: ReviewVerdictSchema,
    coverage: Type.String({ minLength: 1 }),
    checks_performed: Type.String({ minLength: 1 }),
    evidence_refs: Type.Array(EvidenceRefSchema),
    pending_requirements: Type.Array(Type.String()),
    limitations: Type.Array(Type.String()),
    independence_statement: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
export const CheckRunResultSchema = Type.Union([
    Type.Literal('pass'),
    Type.Literal('fail'),
    Type.Literal('error'),
]);
export const SubmitCheckReceiptSchema = Type.Object({
    receipt_id: Type.String({ minLength: 1 }),
    observed_snapshot_sha256: Type.String({ minLength: 64, maxLength: 64 }),
    observed_check_config_sha256: Type.String({ minLength: 64, maxLength: 64 }),
    result: CheckRunResultSchema,
    environment: Type.String({ minLength: 1 }),
    execution_steps: Type.String({ minLength: 1 }),
    exit_code: Type.Integer(),
    logs_artifact_id: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
export const FinalizeReviewRequestSchema = Type.Object({
    expected_phase: Type.Optional(ReviewPhaseSchema),
}, { additionalProperties: false });
export const CancelReviewRequestSchema = Type.Object({
    reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false });
export function isSnapshotReviewPolicy(value) {
    return Value.Check(ReviewPolicySchema, value);
}
//# sourceMappingURL=review.js.map