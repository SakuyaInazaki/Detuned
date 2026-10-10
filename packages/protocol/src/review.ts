import { PostRevisionSchema } from './posts.js';
import addFormats from 'ajv-formats';
import {DetunedError,ErrorCode} from './errors.js';
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

const checkText = (max:number) => Type.String({minLength:1, 'x-max-codepoints':max});
export const SubmitCheckReceiptSchema = Type.Object({
  receipt_id: Type.String({pattern:'^[A-Za-z0-9._:-]{1,128}$'}),
  observed_snapshot_sha256: Type.String({pattern:'^[0-9a-f]{64}$'}),
  observed_check_config_sha256: Type.String({pattern:'^[0-9a-f]{64}$'}),
  result: CheckRunResultSchema, environment: checkText(8000), execution_steps: checkText(16000),
  tool_versions: Type.Record(Type.String({minLength:1}),checkText(512),{minProperties:1,maxProperties:32}),
  started_at: Type.String(), finished_at: Type.String(), exit_code: Type.Integer(), logs_artifact_id:Type.String({minLength:1}),
},{additionalProperties:false});
export type SubmitCheckReceipt = Static<typeof SubmitCheckReceiptSchema>;
const checkDateFormat:unknown=addFormats.default.get('date-time','full');
export function isCheckInstant(value:unknown):value is string {if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return false;if(typeof checkDateFormat==='function')return checkDateFormat(value)===true;if(checkDateFormat instanceof RegExp)return checkDateFormat.test(value);if(checkDateFormat&&typeof checkDateFormat==='object'&&'validate' in checkDateFormat){const v=checkDateFormat.validate;return typeof v==='function'&&v(value)===true;}return false;}
export function isSubmitCheckReceipt(value:unknown):value is SubmitCheckReceipt {
  try { if(!Value.Check(SubmitCheckReceiptSchema,value))return false;
    const cp=(s:string,max:number)=>[...s].length<=max;
    return cp(value.environment,8000)&&cp(value.execution_steps,16000)&&(Object.getPrototypeOf(value.tool_versions)===Object.prototype||Object.getPrototypeOf(value.tool_versions)===null)&&Object.entries(value.tool_versions).every(([k,v])=>[...k].length>=1&&cp(k,128)&&[...v].length>=1&&cp(v,512))&&
      isCheckInstant(value.started_at)&&isCheckInstant(value.finished_at)&&Date.parse(value.started_at)<=Date.parse(value.finished_at)&&
      (value.result!=='pass'||value.exit_code===0)&&Number.isSafeInteger(value.exit_code)&&new TextEncoder().encode(JSON.stringify(value)).length<=65536;
  }catch{return false;}
}
export const CreateCheckRunSchema=Type.Object({request_id:Type.String({minLength:1}),snapshot_id:Type.String({minLength:1}),check_name:Type.String({minLength:1}),verifier_id:Type.String({minLength:1}),expected_request_version:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER})},{additionalProperties:false});
export type CreateCheckRun=Static<typeof CreateCheckRunSchema>;
export const InvalidateCheckRunSchema=Type.Object({expected_version:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER}),reason:checkText(500)},{additionalProperties:false});
export type InvalidateCheckRun=Static<typeof InvalidateCheckRunSchema>;
export type CheckRunState='pending'|'pass'|'fail'|'error'|'invalidated';
export interface CheckRunRecord {id:string;request_id:string;snapshot_id:string;snapshot_sha256:string;check_name:string;attempt:number;verifier_actor_id:string;check_config_sha256:string;created_request_version:number;state:CheckRunState;version:number;created_by:string;created_at:string;changed_by:string;changed_at:string;invalidation_reason:string|null;}
export interface CheckRunVersionRecord {check_run_id:string;version:number;observed_request_version:number;state:CheckRunState;receipt_id:string|null;changed_by:string;changed_at:string;invalidation_reason:string|null;}
export interface CheckReceiptRecord extends SubmitCheckReceipt {check_run_id:string;verifier_actor_id:string;received_at:string;run_version:number;}
export interface CheckRunCredentialRecord {credential_id:string;check_run_id:string;created_at:string;}

export const FinalizeReviewRequestSchema = Type.Object({
  expected_version: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
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

export const ReviewDecisionRecordSchema = Type.Object({
  id: reviewId, request_id: reviewId, actor_id: reviewId, snapshot_sha256: reviewHash,
  review_ids: Type.Array(reviewId, { minItems: 1, maxItems: 5, uniqueItems: true }),
  check_receipt_ids: Type.Array(reviewId, { maxItems: 32, uniqueItems:true }),
  outcome: Type.Union([Type.Literal('accepted'), Type.Literal('changes_requested'), Type.Literal('rejected')]),
  rationale: Type.String({ minLength: 1, maxLength: 2000 }), request_version: reviewPositive,
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export type ReviewDecisionRecord = Static<typeof ReviewDecisionRecordSchema>;
export const ReviewDecisionViewSchema = ReviewDecisionRecordSchema;
export type ReviewDecisionView = ReviewDecisionRecord;
export const ReviewValidityReasonSchema = Type.Union([
  Type.Literal('target_redacted'), Type.Literal('dependency_redacted'), Type.Literal('artifact_redacted'),
  Type.Literal('target_withdrawn'), Type.Literal('dependency_withdrawn'), Type.Literal('artifact_unavailable'),
  Type.Literal('published_review_evidence_redacted'), Type.Literal('published_review_evidence_unavailable'),
  Type.Literal('check_invalidated'),Type.Literal('check_log_redacted'),Type.Literal('check_log_unavailable'),
  Type.Literal('target_superseded'), Type.Literal('dependency_superseded'), Type.Literal('policy_superseded'), Type.Literal('open_challenges'),
]);
export type ReviewValidityReason = Static<typeof ReviewValidityReasonSchema>;
export const REVIEW_VALIDITY_REASON_ORDER: readonly ReviewValidityReason[] = [
  'target_redacted','dependency_redacted','artifact_redacted','target_withdrawn','dependency_withdrawn','artifact_unavailable',
  'published_review_evidence_redacted','published_review_evidence_unavailable','check_invalidated','check_log_redacted','check_log_unavailable','target_superseded','dependency_superseded','policy_superseded','open_challenges',
];
export const ReviewValidityFactsSchema = Type.Object({
  current_validity: Type.Union([Type.Literal('invalidated'),Type.Literal('superseded'),Type.Literal('challenged'),Type.Literal('current')]),
  validity_reasons: Type.Array(ReviewValidityReasonSchema, { maxItems: 15, uniqueItems: true }),
}, { additionalProperties: false });
export type ReviewValidityFacts = Static<typeof ReviewValidityFactsSchema>;
export const ReviewStatusViewSchema = Type.Object({
  request_id: reviewId, snapshot_id: reviewId, phase: ReviewPhaseSchema,
  verification_status: Type.Union([Type.Literal('not_required'),Type.Literal('pending'),Type.Literal('passed'),Type.Literal('failed'),Type.Literal('error')]),
  ...ReviewValidityFactsSchema.properties,
}, { additionalProperties: false });
export type ReviewStatusView = Static<typeof ReviewStatusViewSchema>;
export function isFinalizeReviewRequest(value: unknown): value is FinalizeReviewRequest { return Value.Check(FinalizeReviewRequestSchema,value); }

/** Strict public read data, distinct from internal persistence records. */
export const ReviewSnapshotViewSchema = Type.Object({
  snapshot_id: reviewId, space_id: reviewId, manifest_sha256: reviewHash, manifest: ReviewSnapshotManifestSchema,
  created_by: reviewId, created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export type ReviewSnapshotView = Static<typeof ReviewSnapshotViewSchema>;
export const OwnReviewAssignmentViewSchema = Type.Object({
  id: reviewId, request_id: reviewId, reviewer_actor_id: reviewId, snapshot_id: reviewId, snapshot_sha256: reviewHash,
}, { additionalProperties: false });
export type OwnReviewAssignmentView = Static<typeof OwnReviewAssignmentViewSchema>;
export const ReviewSubmissionsViewSchema = Type.Object({
  request_id: reviewId, submissions: Type.Array(ReviewSubmissionViewSchema, { maxItems: 5 }),
}, { additionalProperties: false });
export type ReviewSubmissionsView = Static<typeof ReviewSubmissionsViewSchema>;

export const PostReviewRequestsQuerySchema = Type.Object({
 limit:Type.Optional(Type.Integer({minimum:1,maximum:50})),
 max_bytes:Type.Optional(Type.Integer({minimum:4096,maximum:65536})),
 cursor:Type.Optional(Type.String({minLength:1,maxLength:4096})),
},{additionalProperties:false});
export type PostReviewRequestsQuery = Static<typeof PostReviewRequestsQuerySchema>;
export const ReviewRoundSummarySchema = Type.Object({
 ...ReviewStatusViewSchema.properties,space_id:reviewId,target_post_id:reviewId,
 round:reviewPositive,target_revision:reviewPositive,created_at:Type.String({format:'date-time'}),
},{additionalProperties:false});
export type ReviewRoundSummary = Static<typeof ReviewRoundSummarySchema>;
export const PostReviewRequestsPageSchema = Type.Object({data:Type.Array(ReviewRoundSummarySchema,{maxItems:50}),
 meta:Type.Object({truncated:Type.Boolean(),next_cursor:Type.Union([Type.String({minLength:1,maxLength:4096}),Type.Null()])},{additionalProperties:false})},{additionalProperties:false});
export type PostReviewRequestsPage = Static<typeof PostReviewRequestsPageSchema>;
export const PostReviewRequestsEnvelopeSchema = Type.Object({api_version:Type.Literal('1'),request_id:Type.String(),...PostReviewRequestsPageSchema.properties},{additionalProperties:false});
export const PostReviewRequestsCursorSchema = Type.Object({v:Type.Literal(1),purpose:Type.Literal('post_review_requests'),actor_id:reviewId,space_id:reviewId,post_id:reviewId,sort:Type.Literal('round_desc'),after_round:reviewPositive,exp:reviewPositive},{additionalProperties:false});
export function isPostReviewRequestsCursor(value:unknown):value is Static<typeof PostReviewRequestsCursorSchema>{return Value.Check(PostReviewRequestsCursorSchema,value);}
export function validatePostReviewRequestsQuery(value:unknown):asserts value is PostReviewRequestsQuery {
 if(!Value.Check(PostReviewRequestsQuerySchema,value))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid review directory query.',400);
}
export function serializePostReviewRequestsEnvelope(requestId:string,page:PostReviewRequestsPage):string{return JSON.stringify({api_version:'1',request_id:requestId,...page});}
export function postReviewRequestsEnvelopeBytes(requestId:string,page:PostReviewRequestsPage):number{return new TextEncoder().encode(serializePostReviewRequestsEnvelope(requestId,page)).byteLength;}

/** Scoped check HTTP views exclude persistence-only audit and credential bindings. */
export const CheckRunViewSchema=Type.Object({
 id:reviewId,space_id:reviewId,request_id:reviewId,snapshot_id:reviewId,snapshot_sha256:reviewHash,
 check_name:reviewId,attempt:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER}),verifier_actor_id:reviewId,check_config_sha256:reviewHash,
 state:Type.Union((['pending','pass','fail','error','invalidated'] as const).map(v=>Type.Literal(v))),version:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER}),
 created_by:reviewId,created_at:Type.String({format:'date-time'}),changed_by:reviewId,changed_at:Type.String({format:'date-time'}),invalidation_reason:Type.Union([checkText(500),Type.Null()]),
},{additionalProperties:false});
export type CheckRunView=Static<typeof CheckRunViewSchema>;
export const CheckReceiptViewSchema=Type.Object({...SubmitCheckReceiptSchema.properties,check_run_id:reviewId,space_id:reviewId,verifier_actor_id:reviewId,received_at:Type.String({format:'date-time'}),run_version:Type.Integer({minimum:2,maximum:Number.MAX_SAFE_INTEGER})},{additionalProperties:false});
export type CheckReceiptView=Static<typeof CheckReceiptViewSchema>;
export const CheckSnapshotViewSchema=Type.Object({...ReviewSnapshotViewSchema.properties,check_run_id:reviewId},{additionalProperties:false});
export type CheckSnapshotView=Static<typeof CheckSnapshotViewSchema>;
export const CheckPostRevisionViewSchema=Type.Object({...PostRevisionSchema.properties,space_id:reviewId,check_run_id:reviewId},{additionalProperties:false});
export type CheckPostRevisionView=Static<typeof CheckPostRevisionViewSchema>;
export const IssueCheckRunCredentialRequestSchema=Type.Object({ttl_seconds:Type.Optional(Type.Integer({minimum:60,maximum:86400}))},{additionalProperties:false});
export type IssueCheckRunCredentialRequest=Static<typeof IssueCheckRunCredentialRequestSchema>;
export const IssueCheckRunCredentialDataSchema=Type.Object({credential_id:reviewId,token:Type.String({minLength:1}),expires_at:Type.String({format:'date-time'})},{additionalProperties:false});
export type IssueCheckRunCredentialData=Static<typeof IssueCheckRunCredentialDataSchema>;
export const RequiredChecksViewSchema=Type.Object({space_id:reviewId,request_id:reviewId,snapshot_id:reviewId,request_version:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER}),verification_status:ReviewStatusViewSchema.properties.verification_status,checks:Type.Array(Type.Object({check_name:reviewId,run:Type.Union([CheckRunViewSchema,Type.Null()]),receipt_id:Type.Union([reviewId,Type.Null()])},{additionalProperties:false}),{maxItems:32})},{additionalProperties:false});
export type RequiredChecksView=Static<typeof RequiredChecksViewSchema>;
export function isIssueCheckRunCredentialRequest(value:unknown):value is IssueCheckRunCredentialRequest{return Value.Check(IssueCheckRunCredentialRequestSchema,value);}

export const CheckSpaceParamsSchema=Type.Object({space_id:reviewId},{additionalProperties:false});
export const CheckRunParamsSchema=Type.Object({space_id:reviewId,run_id:reviewId},{additionalProperties:false});
export const CheckPostParamsSchema=Type.Object({...CheckRunParamsSchema.properties,post_id:reviewId,revision:Type.String({pattern:'^[1-9][0-9]*$'})},{additionalProperties:false});
export const CheckRequestParamsSchema=Type.Object({space_id:reviewId,request_id:reviewId},{additionalProperties:false});
export const CheckArtifactParamsSchema=Type.Object({...CheckRunParamsSchema.properties,id:reviewId},{additionalProperties:false});
