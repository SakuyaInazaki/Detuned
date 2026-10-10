import { PublicReviewSubmissionSearchItemSchema, SearchResponseMetaSchema, SEARCH_LIMITS, isUnicodeReviewId, compareReviewSubmissionIds, type ReviewSubmissionSearchQuery, type PublicReviewSubmissionSearchPage } from './search.js';
import { FindingViewItemSchema, FailureViewItemSchema, type FindingViewItem, type FailureViewItem } from './search.js';
import {ReviewRoundSummarySchema,type PostReviewRequestsPage} from './review.js';
import { isReadableArtifactMetadata, type ReviewArtifactMetadata } from './artifacts.js';
import {
 ReviewRequestViewSchema, ReviewRequestReadViewSchema, ReviewSnapshotViewSchema, OwnReviewAssignmentViewSchema,
 ReviewSubmissionAcknowledgementSchema, ReviewSubmissionViewSchema, ReviewSubmissionsViewSchema,
 ReviewDecisionViewSchema, ReviewStatusViewSchema,
 type ReviewRequestView, type ReviewRequestReadView, type ReviewSnapshotView, type OwnReviewAssignmentView,
 type ReviewSubmissionAcknowledgement, type ReviewSubmissionView, type ReviewSubmissionsView,
 type ReviewDecisionView, type ReviewStatusView,
} from './review.js';
import { PostRevisionMetadataSchema, PostRevisionCatalogPageSchema, PostRevisionArtifactsPageSchema, RevisionArtifactCatalogItemSchema, RevisionArtifactCatalogReadySchema, RevisionArtifactCatalogMissingSchema, RevisionArtifactCatalogRedactedSchema, type PostRevisionCatalogPage, type PostRevisionArtifactsPage } from './post-catalogs.js';
import { Type } from '@sinclair/typebox';
import { WebSessionResponseSchema, type WebSessionResponse } from './web-auth.js';
import addFormats from 'ajv-formats';
import { Value } from '@sinclair/typebox/value';
import { ActorSchema, MeResponseSchema, type MeResponse } from './actors.js';
import { SessionSchema, type Session } from './spaces.js';

// These are the three known format locations, not a general schema walker.
// Preserve every other public constraint; formats are checked with the locked
// full validator below instead of mutating TypeBox's process-global registry.
const { format: actorCreatedFormat, ...actorCreated } = ActorSchema.properties.created_at;
const { format: actorDisabledFormat, ...actorDisabled } = ActorSchema.properties.disabled_at.anyOf[0];
const { format: sessionCreatedFormat, ...sessionCreated } = SessionSchema.properties.created_at;
const meCheckSchema = {
  ...MeResponseSchema,
  properties: {
    ...MeResponseSchema.properties,
    actor: {
      ...ActorSchema,
      properties: {
        ...ActorSchema.properties,
        created_at: actorCreated,
        disabled_at: { ...ActorSchema.properties.disabled_at, anyOf: [actorDisabled, ActorSchema.properties.disabled_at.anyOf[1]] },
      },
    },
  },
};
const sessionCheckSchema = { ...SessionSchema, properties: { ...SessionSchema.properties, created_at: sessionCreated } };
const dateTime: unknown = addFormats.default.get('date-time', 'full');
function validDate(value: string): boolean {
  if (typeof dateTime === 'function') return dateTime(value) === true;
  if (dateTime instanceof RegExp) return dateTime.test(value);
  if (typeof dateTime !== 'object' || dateTime === null || !('validate' in dateTime)) return false;
  const validate = dateTime.validate;
  return typeof validate === 'function' ? validate(value) === true : validate instanceof RegExp && validate.test(value);
}

export function isMeResponse(value: unknown): value is MeResponse {
  return Value.Check(meCheckSchema, value)
    && actorCreatedFormat === 'date-time' && actorDisabledFormat === 'date-time'
    && validDate(value.actor.created_at)
    && (value.actor.disabled_at === null || validDate(value.actor.disabled_at));
}

export function isSession(value: unknown): value is Session {
  return Value.Check(sessionCheckSchema, value)
    && sessionCreatedFormat === 'date-time' && validDate(value.created_at);
}

// Known web response format locations: nested me actor dates (isMeResponse)
// and expires_at. The structural derivative keeps all public constraints.
const { format: webExpiryFormat, ...webExpiry } = WebSessionResponseSchema.properties.expires_at;
const webCheckSchema = { ...WebSessionResponseSchema, properties: { ...WebSessionResponseSchema.properties,
  me: Type.Unknown(), expires_at: webExpiry } };
export function isWebSessionResponse(value: unknown): value is WebSessionResponse {
  return Value.Check(webCheckSchema, value) && isMeResponse(value.me)
    && webExpiryFormat === 'date-time' && validDate(value.expires_at);
}

// Catalog format locations are only revision.created_at and ready/missing
// artifact.created_at. Keep public schemas intact and every other constraint.
const { format: revisionMetadataFormat, ...revisionMetadataDate } = PostRevisionMetadataSchema.properties.created_at;
const revisionMetadataCheck = { ...PostRevisionMetadataSchema, properties: { ...PostRevisionMetadataSchema.properties, created_at: revisionMetadataDate } };
const revisionCatalogCheck = { ...PostRevisionCatalogPageSchema, anyOf: PostRevisionCatalogPageSchema.anyOf.map(page => ({
  ...page, properties: { ...page.properties, data: { ...page.properties.data, properties: { ...page.properties.data.properties,
    revisions: { ...page.properties.data.properties.revisions, items: revisionMetadataCheck },
  } } },
})) };
const { format: readyCatalogFormat, ...readyCatalogDate } = RevisionArtifactCatalogReadySchema.properties.created_at;
const { format: missingCatalogFormat, ...missingCatalogDate } = RevisionArtifactCatalogMissingSchema.properties.created_at;
const artifactCatalogItemsCheck = { ...RevisionArtifactCatalogItemSchema, anyOf: [
  { ...RevisionArtifactCatalogReadySchema, properties: { ...RevisionArtifactCatalogReadySchema.properties, created_at: readyCatalogDate } },
  { ...RevisionArtifactCatalogMissingSchema, properties: { ...RevisionArtifactCatalogMissingSchema.properties, created_at: missingCatalogDate } },
  RevisionArtifactCatalogRedactedSchema,
] };
const revisionArtifactsCheck = { ...PostRevisionArtifactsPageSchema, anyOf: PostRevisionArtifactsPageSchema.anyOf.map(page => ({
  ...page, properties: { ...page.properties, data: { ...page.properties.data, properties: { ...page.properties.data.properties,
    artifacts: { ...page.properties.data.properties.artifacts, items: artifactCatalogItemsCheck },
  } } },
})) };
export function isPostRevisionCatalogPage(value: unknown): value is PostRevisionCatalogPage {
  return Value.Check(revisionCatalogCheck, value) && revisionMetadataFormat === 'date-time'
    && value.data.revisions.every(revision => validDate(revision.created_at));
}
export function isPostRevisionArtifactsPage(value: unknown): value is PostRevisionArtifactsPage {
  return Value.Check(revisionArtifactsCheck, value) && readyCatalogFormat === 'date-time' && missingCatalogFormat === 'date-time'
    && value.data.artifacts.every(artifact => artifact.state === 'redacted' || validDate(artifact.created_at));
}

// Review wire dates are checked locally using the same full date-time validator.
// No public schema or process-global format registry is modified.
const reviewRequestCheck=Type.Object({...ReviewRequestViewSchema.properties,created_at:Type.String(),changed_at:Type.String()},{additionalProperties:false});
const reviewRequestReadCheck=Type.Object({...ReviewRequestReadViewSchema.properties,created_at:Type.String(),changed_at:Type.String()},{additionalProperties:false});
const reviewSnapshotCheck=Type.Object({...ReviewSnapshotViewSchema.properties,created_at:Type.String()},{additionalProperties:false});
const reviewAckCheck=Type.Object({...ReviewSubmissionAcknowledgementSchema.properties,submitted_at:Type.String()},{additionalProperties:false});
const reviewSubmissionCheck=Type.Object({...ReviewSubmissionViewSchema.properties,submitted_at:Type.String(),revealed_at:Type.Union([Type.String(),Type.Null()])},{additionalProperties:false});
const reviewSubmissionsCheck=Type.Object({...ReviewSubmissionsViewSchema.properties,submissions:Type.Array(reviewSubmissionCheck,{maxItems:5})},{additionalProperties:false});
const reviewDecisionCheck=Type.Object({...ReviewDecisionViewSchema.properties,created_at:Type.String()},{additionalProperties:false});
export function isReviewRequestView(value:unknown):value is ReviewRequestView {
 return Value.Check(reviewRequestCheck,value)&&validDate(value.created_at)&&validDate(value.changed_at);
}
export function isReviewRequestReadView(value:unknown):value is ReviewRequestReadView {
 return Value.Check(reviewRequestReadCheck,value)&&validDate(value.created_at)&&validDate(value.changed_at);
}
export function isReviewSnapshotView(value:unknown):value is ReviewSnapshotView {
 return Value.Check(reviewSnapshotCheck,value)&&validDate(value.created_at);
}
export function isOwnReviewAssignmentView(value:unknown):value is OwnReviewAssignmentView { return Value.Check(OwnReviewAssignmentViewSchema,value); }
export function isReviewSubmissionAcknowledgement(value:unknown):value is ReviewSubmissionAcknowledgement { return Value.Check(reviewAckCheck,value)&&validDate(value.submitted_at); }
export function isReviewSubmissionView(value:unknown):value is ReviewSubmissionView { return Value.Check(reviewSubmissionCheck,value)&&validDate(value.submitted_at)&&(value.revealed_at===null||validDate(value.revealed_at)); }
export function isReviewSubmissionsView(value:unknown):value is ReviewSubmissionsView { return Value.Check(reviewSubmissionsCheck,value)&&value.submissions.every(isReviewSubmissionView); }
export function isReviewDecisionView(value:unknown):value is ReviewDecisionView { return Value.Check(reviewDecisionCheck,value)&&validDate(value.created_at); }
export function isReviewStatusView(value:unknown):value is ReviewStatusView { return Value.Check(ReviewStatusViewSchema,value); }

export function isReviewArtifactMetadata(value:unknown):value is ReviewArtifactMetadata { return isReadableArtifactMetadata(value)&&value.visibility==='review_assignment'; }

const reviewRoundCheck=Type.Object({...ReviewRoundSummarySchema.properties,created_at:Type.String()},{additionalProperties:false});
const reviewRoundPageCheck=Type.Object({data:Type.Array(reviewRoundCheck,{maxItems:50}),meta:Type.Object({truncated:Type.Boolean(),next_cursor:Type.Union([Type.String({minLength:1,maxLength:4096}),Type.Null()])},{additionalProperties:false})},{additionalProperties:false});
export function isPostReviewRequestsPage(value:unknown):value is PostReviewRequestsPage {
 if(!Value.Check(reviewRoundPageCheck,value))return false;
 if(value.data.length===0&&(value.meta.truncated||value.meta.next_cursor!==null))return false;
 if(value.meta.truncated&&value.meta.next_cursor===null)return false;
 return value.data.every((row,i)=>validDate(row.created_at)&&(i===0||value.data[i-1]!.round>row.round));
}

// Derive only the two date-time paths locally; never mutate global FormatRegistry.
const knowledgeFormalReviewCheck = Type.Union([reviewRoundCheck, Type.Null()]);
const findingViewCheck = Type.Array(Type.Object({...FindingViewItemSchema.properties, created_at:Type.String(), formal_review:knowledgeFormalReviewCheck},{additionalProperties:false}),{maxItems:25});
const failureViewCheck = Type.Array(Type.Object({...FailureViewItemSchema.properties, created_at:Type.String(), formal_review:knowledgeFormalReviewCheck},{additionalProperties:false}),{maxItems:50});
function consistentKnowledgeItem(item: FindingViewItem | FailureViewItem, spaceId?: string): boolean {
  if (!validDate(item.created_at)) return false;
  const review = item.formal_review;
  if (review === null) return (item.formal_review_status === 'not_enabled' || item.formal_review_status === 'not_requested') && item.formal_check_status === item.formal_review_status;
  return validDate(review.created_at) && (spaceId === undefined || review.space_id === spaceId)
    && review.target_post_id === item.post_id && review.target_revision <= item.revision
    && item.formal_review_status === review.phase && item.formal_check_status === review.verification_status;
}
/** Whole typed arrays, including status consistency and optional requested-space binding. */
export function isFindingsView(value: unknown, spaceId?: string): value is FindingViewItem[] {
  return Value.Check(findingViewCheck,value) && value.every(item => consistentKnowledgeItem(item,spaceId));
}
export function isFailuresView(value: unknown, spaceId?: string): value is FailureViewItem[] {
  return Value.Check(failureViewCheck,value) && value.every(item => consistentKnowledgeItem(item,spaceId));
}

const publicReviewSearchItemCheck = Type.Object({ ...PublicReviewSubmissionSearchItemSchema.properties, submitted_at: Type.String(), revealed_at: Type.String() }, { additionalProperties: false });
const publicReviewSearchPageCheck = Type.Object({ data: Type.Array(publicReviewSearchItemCheck, { maxItems: 100 }), meta: SearchResponseMetaSchema }, { additionalProperties: false });
export function isPublicReviewSubmissionSearchPage(value: unknown, spaceId?: string, query?: ReviewSubmissionSearchQuery): value is PublicReviewSubmissionSearchPage {
  if (!Value.Check(publicReviewSearchPageCheck, value) || value.data.length > (query === undefined ? 100 : query.limit ?? 20)) return false;
  if (value.data.length === 0 && value.meta.next_cursor !== null) return false;
  if (query !== undefined && value.meta.next_cursor !== null && value.data.length !== (query.limit ?? 20)) return false;
  if (new TextEncoder().encode(JSON.stringify(value.data)).byteLength > SEARCH_LIMITS.response_bytes) return false;
  return value.data.every((item, index) =>
    [item.submission_id, item.space_id, item.request_id, item.snapshot_id, item.target_ref.post_id, item.reviewer_actor_id].every(isUnicodeReviewId)
    && validDate(item.submitted_at) && validDate(item.revealed_at) && Date.parse(item.revealed_at) >= Date.parse(item.submitted_at)
    && Array.from(item.snippet).length <= 320
    && (spaceId === undefined || item.space_id === spaceId)
    && (query?.request_id === undefined || item.request_id === query.request_id)
    && (query?.target_post_id === undefined || item.target_ref.post_id === query.target_post_id)
    && (index === 0 || compareReviewSubmissionIds(value.data[index - 1]!.submission_id, item.submission_id) > 0));
}

// Scoped check views: canonical schemas remain intact; strict instants are checked locally.
import { CheckRunViewSchema,CheckReceiptViewSchema,CheckSnapshotViewSchema,CheckPostRevisionViewSchema,IssueCheckRunCredentialDataSchema,RequiredChecksViewSchema,isSubmitCheckReceipt,isCheckInstant,
 type CheckRunView,type CheckReceiptView,type CheckSnapshotView,type CheckPostRevisionView,type IssueCheckRunCredentialData,type RequiredChecksView } from './review.js';
import { isArtifactMetadata,type ArtifactMetadata,type ReadableArtifactMetadata } from './artifacts.js';
import { canonicalizeReviewJson } from './review-canonical.js';
import type { TSchema } from '@sinclair/typebox';
function checkWireSchema<T extends TSchema>(schema:T):T {
 const clone={...schema};delete clone.format;
 if(schema.properties)clone.properties=Object.fromEntries(Object.entries(schema.properties).map(([k,v])=>[k,checkWireSchema(v as TSchema)]));
 if(schema.items)clone.items=checkWireSchema(schema.items as TSchema);
 for(const key of ['anyOf','allOf','oneOf'])if(Array.isArray(schema[key]))clone[key]=schema[key].map(checkWireSchema);
 return clone as T;
}
const checkRunWire=checkWireSchema(CheckRunViewSchema),checkReceiptWire=checkWireSchema(CheckReceiptViewSchema),checkSnapshotWire=checkWireSchema(CheckSnapshotViewSchema),checkPostWire=checkWireSchema(CheckPostRevisionViewSchema),checkIssueWire=checkWireSchema(IssueCheckRunCredentialDataSchema),checkDirectoryWire=checkWireSchema(RequiredChecksViewSchema);
export function isCheckRunView(value:unknown,spaceId:string,runId:string):value is CheckRunView {
 return Value.Check(checkRunWire,value)&&value.space_id===spaceId&&value.id===runId&&[value.id,value.space_id,value.request_id,value.snapshot_id,value.verifier_actor_id,value.created_by,value.changed_by].every(isUnicodeReviewId)&&!!value.check_name.trim()&&(value.state==='pending'?value.version===1&&value.changed_by===value.created_by&&value.changed_at===value.created_at:value.version>=2)&&isCheckInstant(value.created_at)&&isCheckInstant(value.changed_at)&&Date.parse(value.changed_at)>=Date.parse(value.created_at)&&((value.state==='invalidated')===(value.invalidation_reason!==null))&&(value.invalidation_reason===null||!!value.invalidation_reason.trim());
}
export function isCheckReceiptView(value:unknown,spaceId:string,runId:string):value is CheckReceiptView {
 if(!Value.Check(checkReceiptWire,value)||value.space_id!==spaceId||value.check_run_id!==runId||![value.space_id,value.check_run_id,value.verifier_actor_id,value.logs_artifact_id].every(isUnicodeReviewId)||!isCheckInstant(value.received_at))return false;
 const {space_id,check_run_id,verifier_actor_id,received_at,run_version,...input}=value;return isSubmitCheckReceipt(input);
}
export function isCheckSnapshotView(value:unknown,spaceId:string,runId:string):value is CheckSnapshotView {
 try {if(!Value.Check(checkSnapshotWire,value)||value.space_id!==spaceId||value.check_run_id!==runId||value.manifest.space_id!==spaceId||!isCheckInstant(value.created_at))return false;canonicalizeReviewJson(value.manifest);
 const checks=value.manifest.review_policy.required_checks,profiles=value.manifest.check_profiles;
 if(checks.length!==profiles.length||checks.some((name,i)=>!name.trim()||(i>0&&checks[i-1]!>=name)||profiles[i]!.check_name!==name))return false;
 return [value.snapshot_id,value.space_id,value.check_run_id,value.created_by].every(isUnicodeReviewId);}catch{return false;}
}
export function isCheckPostRevisionView(value:unknown,spaceId:string,runId:string,postId:string,revision:number):value is CheckPostRevisionView {
 return Value.Check(checkPostWire,value)&&value.space_id===spaceId&&value.check_run_id===runId&&value.post_id===postId&&value.revision===revision&&isCheckInstant(value.created_at)&&/^[0-9a-f]{64}$/.test(value.content_hash);
}
export function isIssueCheckRunCredentialData(value:unknown,_spaceId:string,_runId:string):value is IssueCheckRunCredentialData{return Value.Check(checkIssueWire,value)&&isCheckInstant(value.expires_at);}
export function checkArtifactContentPath(spaceId:string,runId:string,artifactId:string):string{return `/api/v1/spaces/${encodeURIComponent(spaceId)}/check-runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/content`;}
export function isCheckArtifactMetadata(value:unknown,spaceId:string,runId:string):value is ArtifactMetadata {
 try{return isArtifactMetadata(value)&&value.space_id===spaceId&&value.content_url===checkArtifactContentPath(spaceId,runId,value.id)&&/^[0-9a-f]{64}$/.test(value.sha256);}catch{return false;}
}
export function isReadableCheckArtifactMetadata(value:unknown,spaceId:string,runId:string):value is ReadableArtifactMetadata{return isCheckArtifactMetadata(value,spaceId,runId)&&value.state==='ready';}
export function isRequiredChecksView(value:unknown,spaceId:string,requestId:string):value is RequiredChecksView {
 if(!Value.Check(checkDirectoryWire,value)||value.space_id!==spaceId||value.request_id!==requestId)return false;
 let previous:string|undefined;
 for(const item of value.checks){if(!item.check_name.trim()||(previous!==undefined&&previous>=item.check_name))return false;previous=item.check_name;
  if(item.run){if(!isCheckRunView(item.run,spaceId,item.run.id)||item.run.request_id!==requestId||item.run.snapshot_id!==value.snapshot_id||item.run.check_name!==item.check_name)return false;
   if(['pass','fail','error'].includes(item.run.state)!==(item.receipt_id!==null))return false;
  }else if(item.receipt_id!==null)return false;
 }
 const status=value.checks.length===0?'not_required':value.checks.some(c=>c.run?.state==='fail')?'failed':value.checks.some(c=>c.run?.state==='error')?'error':value.checks.every(c=>c.run?.state==='pass')?'passed':'pending';return status===value.verification_status;
}
