import { Value } from '@sinclair/typebox/value';
import { Type, Static } from '@sinclair/typebox';
import { ReviewPolicySchema } from './spaces.js';
import { PostRefSchema } from './common.js';

export const ReviewPhaseSchema = Type.Union([
  Type.Literal('collecting'),
  Type.Literal('revealed'),
  Type.Literal('accepted'),
  Type.Literal('changes_requested'),
  Type.Literal('rejected'),
  Type.Literal('stale'),
  Type.Literal('cancelled'),
]);

export type ReviewPhase = Static<typeof ReviewPhaseSchema>;

export const ReviewVerdictSchema = Type.Union([
  Type.Literal('accept'),
  Type.Literal('changes_requested'),
  Type.Literal('reject'),
]);

export type ReviewVerdict = Static<typeof ReviewVerdictSchema>;

export const ReviewCompletionStatusSchema = Type.Union([
  Type.Literal('complete'),
  Type.Literal('provisional'),
]);

export type ReviewCompletionStatus = Static<typeof ReviewCompletionStatusSchema>;

const nonBlank = (maxLength: number) => Type.String({ minLength: 1, maxLength, pattern: '\\S' });
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

export type CreateReviewRequest = Static<typeof CreateReviewRequestSchema>;
export function isCreateReviewRequest(value: unknown): value is CreateReviewRequest {
  return Value.Check(CreateReviewRequestSchema, value);
}

export const CreateReviewSubmissionSchema = Type.Object({
  snapshot_sha256: Type.String({ pattern: '^[0-9a-f]{64}$' }),
  reviewer_session_id: Type.String({ minLength: 1 }),
  completion_status: Type.Literal('complete'), verdict: ReviewVerdictSchema,
  coverage: nonBlank(16000), checks_performed: nonBlank(16000),
  evidence_refs: Type.Array(Type.Union([Type.Object({ kind: Type.Literal('post'), ...snapshotRef.properties }, { additionalProperties: false }), Type.Object({ kind: Type.Literal('artifact'), artifact_id: Type.String({ minLength: 1 }) }, { additionalProperties: false })]), { maxItems: 64, uniqueItems: true }),
  pending_requirements: Type.Array(nonBlank(2000), { maxItems: 32 }),
  limitations: Type.Array(nonBlank(2000), { maxItems: 32 }),
  independence_statement: Type.Object({ participated_in_material: Type.Literal(false),
    exposed_to_other_reviews: Type.Literal(false), statement: nonBlank(8000) }, { additionalProperties: false }),
}, { additionalProperties: false });
export type CreateReviewSubmission = Static<typeof CreateReviewSubmissionSchema>;
export function isCreateReviewSubmission(value: unknown): value is CreateReviewSubmission {
  return Value.Check(CreateReviewSubmissionSchema, value) && (value.verdict !== 'accept' || value.pending_requirements.length === 0);
}

export const CheckRunResultSchema = Type.Union([
  Type.Literal('pass'),
  Type.Literal('fail'),
  Type.Literal('error'),
]);

export type CheckRunResult = Static<typeof CheckRunResultSchema>;

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

export type SubmitCheckReceipt = Static<typeof SubmitCheckReceiptSchema>;

export const FinalizeReviewRequestSchema = Type.Object({
  expected_phase: Type.Optional(ReviewPhaseSchema),
}, { additionalProperties: false });

export type FinalizeReviewRequest = Static<typeof FinalizeReviewRequestSchema>;

export const CancelReviewRequestSchema = Type.Object({
  expected_version: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  reason: nonBlank(500),
}, { additionalProperties: false });

export type CancelReviewRequest = Static<typeof CancelReviewRequestSchema>;

export function isSnapshotReviewPolicy(value: unknown): value is Static<typeof ReviewPolicySchema> {
  return Value.Check(ReviewPolicySchema, value);
}

const reviewId = Type.String({ minLength: 1 });
const reviewPositive = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const reviewHash = Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' });
export const ReviewSnapshotRecordSchema = Type.Object({
  id: reviewId, space_id: reviewId, manifest_json: Type.String(), manifest_sha256: reviewHash,
  policy_revision: reviewPositive, rules_revision: reviewPositive, target_ref: snapshotRef,
  created_by: reviewId, created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export type ReviewSnapshotRecord = Static<typeof ReviewSnapshotRecordSchema>;
export const ReviewSnapshotItemRecordSchema = Type.Object({
  snapshot_id: reviewId,
  item_type: Type.Union([Type.Literal('target_post'), Type.Literal('dependency_post'), Type.Literal('artifact'), Type.Literal('space_rules')]),
  item_id: reviewId, revision: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  sha256: Type.Union([reviewHash, Type.Null()]),
}, { additionalProperties: false });
export type ReviewSnapshotItemRecord = Static<typeof ReviewSnapshotItemRecordSchema>;
export const ReviewRequestRecordSchema = Type.Object({
  id: reviewId, space_id: reviewId, target_ref: snapshotRef, snapshot_id: reviewId,
  round: reviewPositive, phase: ReviewPhaseSchema, version: reviewPositive, submitted_count: Type.Integer({ minimum: 0, maximum: 5 }),
  requested_by: reviewId, created_at: Type.String({ format: 'date-time' }),
  changed_by: reviewId, changed_at: Type.String({ format: 'date-time' }), reason: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });
export type ReviewRequestRecord = Static<typeof ReviewRequestRecordSchema>;
export const ReviewRequestVersionRecordSchema = Type.Object({
  request_id: reviewId, version: reviewPositive, phase: ReviewPhaseSchema, submitted_count: Type.Integer({ minimum: 0, maximum: 5 }),
  changed_by: reviewId, changed_at: Type.String({ format: 'date-time' }), reason: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });
export type ReviewRequestVersionRecord = Static<typeof ReviewRequestVersionRecordSchema>;
export const ReviewAssignmentRecordSchema = Type.Object({
  id: reviewId, request_id: reviewId, reviewer_actor_id: reviewId, group_at_assignment: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });
export type ReviewAssignmentRecord = Static<typeof ReviewAssignmentRecordSchema>;
const { submitted_count: internalSubmittedCount, ...baseRequestProperties } = ReviewRequestRecordSchema.properties;
void internalSubmittedCount;
export const ReviewRequestViewSchema = Type.Object({
  ...baseRequestProperties, snapshot_sha256: reviewHash,
  rules_revision: reviewPositive, policy_revision: reviewPositive,
  reviewer_actor_ids: Type.Array(reviewId, { minItems: 1, maxItems: 5, uniqueItems: true }),
}, { additionalProperties: false });
export type ReviewRequestView = Static<typeof ReviewRequestViewSchema>;
export function isCancelReviewRequest(value: unknown): value is CancelReviewRequest {
  return Value.Check(CancelReviewRequestSchema, value);
}

export const ReviewSnapshotManifestSchema = Type.Object({
  manifest_version: Type.Literal(1), space_id: reviewId,
  target: Type.Object({ ref: snapshotRef, content_hash: reviewHash, statement: nonBlank(5000),
    assumptions: Type.Array(Type.String({ maxLength: 1000 })), scope: nonBlank(1000), falsification_plan: nonBlank(2000) }, { additionalProperties: false }),
  dependencies: Type.Array(Type.Object({ ref: snapshotRef, content_hash: reviewHash }, { additionalProperties: false }), { maxItems: 32 }),
  artifacts: Type.Array(Type.Object({ artifact_id: reviewId, sha256: reviewHash,
    bytes: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }) }, { additionalProperties: false }), { maxItems: 64 }),
  code_refs: CreateReviewRequestSchema.properties.code_refs,
  rules_revision: reviewPositive, policy_revision: reviewPositive, review_policy: ReviewPolicySchema,
  check_profiles: Type.Array(Type.Object({ check_name: Type.String({ minLength: 1, pattern: '\\S' }), config_sha256: reviewHash,
    verifier_actor_ids: Type.Array(reviewId, { maxItems: 128, uniqueItems: true }), description: Type.String() }, { additionalProperties: false }), { maxItems: 32 }),
  contributors: Type.Array(reviewId, { maxItems: 4096, uniqueItems: true }), reproduction_instructions: nonBlank(16000),
}, { additionalProperties: false });
export type ReviewSnapshotManifestData = Static<typeof ReviewSnapshotManifestSchema>;
export function isReviewSnapshotManifest(value: unknown): value is ReviewSnapshotManifestData {
  return Value.Check(ReviewSnapshotManifestSchema, value);
}

export const ReviewRequestReadViewSchema = Type.Object({ ...ReviewRequestViewSchema.properties,
  changed_by: Type.Union([reviewId, Type.Null()]), submitted_count: Type.Integer({ minimum: 0, maximum: 5 }),
}, { additionalProperties: false });
export type ReviewRequestReadView = Static<typeof ReviewRequestReadViewSchema>;
export const ReviewSubmissionRecordSchema = Type.Object({
  id: reviewId, request_id: reviewId, assignment_id: reviewId, reviewer_actor_id: reviewId,
  reviewer_session_id: reviewId, snapshot_sha256: reviewHash, payload: CreateReviewSubmissionSchema,
  request_version: reviewPositive, submitted_at: Type.String({ format: 'date-time' }),
  revealed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
}, { additionalProperties: false });
export type ReviewSubmissionRecord = Static<typeof ReviewSubmissionRecordSchema>;
export const ReviewSubmissionAcknowledgementSchema = Type.Object({
  submission_id: reviewId, request_id: reviewId, assignment_id: reviewId, reviewer_actor_id: reviewId,
  snapshot_sha256: reviewHash, submitted_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export type ReviewSubmissionAcknowledgement = Static<typeof ReviewSubmissionAcknowledgementSchema>;
export const ReviewSubmissionViewSchema = Type.Object({ ...CreateReviewSubmissionSchema.properties,
  submission_id: reviewId, request_id: reviewId, assignment_id: reviewId, reviewer_actor_id: reviewId,
  request_version: reviewPositive, submitted_at: Type.String({ format: 'date-time' }),
  revealed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
}, { additionalProperties: false });
export type ReviewSubmissionView = Static<typeof ReviewSubmissionViewSchema>;
