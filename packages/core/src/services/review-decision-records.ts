import { readCheckRun,readCheckReceipt } from './check-records.js';
import { isDeepStrictEqual } from 'node:util';
import { DetunedError,ErrorCode,type ReviewDecisionRecord,type ReviewDecisionView } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
import { readIntrinsicReviewRequestRecords,readReviewSnapshotRecords,reconstructReviewRequestView,reviewResync } from './review-request-records.js';
import { validateReviewSubmissionRecords } from './review-submission-records.js';
import { assertStoredSubmissionEvidencePrivacy } from './review-artifact-access.js';
export interface ReviewDecisionResultReference {
  v:1;kind:'review.decision';decision_id:string;request_id:string;request_version:number;snapshot_id:string;manifest_sha256:string;
}
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
/** Intrinsic immutable decision binding, safe for maintenance after legitimate redaction. */
export function readIntrinsicReviewDecision(storage:StoragePort,spaceId:string,requestId:string):ReviewDecisionRecord {
  try{
  const {head,record}=readIntrinsicReviewRequestRecords(storage,spaceId,requestId),decision=storage.findReviewDecisionByRequestId(requestId);
  if(!decision||decision.request_id!==requestId||typeof decision.id!=='string'||!decision.id||
    typeof decision.actor_id!=='string'||!decision.actor_id||decision.snapshot_sha256!==record.manifest_sha256||
    !Number.isSafeInteger(decision.request_version)||decision.request_version<2||decision.request_version>head.version||
    !['accepted','changes_requested','rejected'].includes(decision.outcome)||typeof decision.rationale!=='string'||!decision.rationale||decision.rationale.length>2000||
    typeof decision.created_at!=='string'||!Number.isFinite(Date.parse(decision.created_at))||!Array.isArray(decision.check_receipt_ids)||decision.check_receipt_ids.length>32||new Set(decision.check_receipt_ids).size!==decision.check_receipt_ids.length)throw reviewResync();
  const keys=['id','request_id','actor_id','snapshot_sha256','review_ids','check_receipt_ids','outcome','rationale','request_version','created_at'];
  if(Object.keys(decision).length!==keys.length||Object.keys(decision).some(key=>!keys.includes(key)))throw reviewResync();
  const version=storage.findReviewRequestVersion(requestId,decision.request_version),assignments=storage.listReviewAssignments(requestId).sort((a,b)=>cmp(a.reviewer_actor_id,b.reviewer_actor_id));
  const submissions=assignments.map(a=>storage.findReviewSubmissionByAssignmentId(a.id));
  if(submissions.some(s=>!s)||!Array.isArray(decision.review_ids)||
    !isDeepStrictEqual(decision.review_ids,submissions.map(s=>s?.id))||!version||version.phase!==decision.outcome||version.changed_by!==decision.actor_id||
    version.changed_at!==decision.created_at||version.reason!==null||version.submitted_count!==assignments.length)throw reviewResync();
  for(const submission of submissions){if(!submission||submission.revealed_at===null)throw reviewResync();validateReviewSubmissionRecords(storage,spaceId,submission.id);}
  const expected=submissions.some(s=>s?.payload.verdict==='reject')?'rejected':submissions.some(s=>s?.payload.verdict==='changes_requested')?'changes_requested':'accepted';
  const {manifest}=readIntrinsicReviewRequestRecords(storage,spaceId,requestId);
  if(expected!=='accepted'){if(decision.outcome!==expected||decision.check_receipt_ids.length!==0)throw reviewResync();}
  else {
    const atDecision=manifest.review_policy.required_checks.map(name=>{const row=storage.findLatestCheckRun(requestId,name);if(!row)return {name,run:null,receipt:null};const v=storage.findCheckRunVersionBeforeRequestVersion(row.id,decision.request_version);if(!v)throw reviewResync();const run=readCheckRun(storage,spaceId,row.id,v.version);const receipt=['pass','fail','error'].includes(run.state)?readCheckReceipt(storage,spaceId,run.id):null;return {name,run,receipt};});
    if(decision.outcome==='accepted'){if(atDecision.some(c=>c.run?.state!=='pass')||!isDeepStrictEqual(decision.check_receipt_ids,atDecision.map(c=>c.receipt!.receipt_id)))throw reviewResync();}
    else if(decision.outcome==='changes_requested'){const failed=atDecision.filter(c=>c.run?.state==='fail');if(failed.length===0||!isDeepStrictEqual(decision.check_receipt_ids,failed.map(c=>c.receipt!.receipt_id)))throw reviewResync();}
    else throw reviewResync();
  }

  return structuredClone(decision);
  }catch(error){if(error instanceof SyntaxError)throw reviewResync();throw error;}
}
export function reconstructReviewDecisionView(storage:StoragePort,spaceId:string,requestId:string):ReviewDecisionView {
  const head=storage.findReviewRequestById(requestId);
  if(!head||head.space_id!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Review material does not exist or is not accessible.',404);
  reconstructReviewRequestView(storage,spaceId,requestId);
  if(!storage.findReviewDecisionByRequestId(requestId))throw new DetunedError(ErrorCode.NOT_FOUND,'Review decision does not exist or is not accessible.',404);
  const decision=readIntrinsicReviewDecision(storage,spaceId,requestId);
  readReviewSnapshotRecords(storage,spaceId,head.snapshot_id);
  for(const submission of storage.listReviewSubmissions(requestId))assertStoredSubmissionEvidencePrivacy(storage,spaceId,submission);
  return decision;
}
export function parseReviewDecisionReference(operation:string,raw:unknown):ReviewDecisionResultReference {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw reviewResync();
  const r=raw as Record<string,unknown>,keys=['v','kind','decision_id','request_id','request_version','snapshot_id','manifest_sha256'];
  if(Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k))||r.v!==1||r.kind!=='review.decision'||
    ['decision_id','request_id','snapshot_id'].some(k=>typeof r[k]!=='string'||!r[k])||!Number.isSafeInteger(r.request_version)||(r.request_version as number)<2||
    typeof r.manifest_sha256!=='string'||r.manifest_sha256.length!==64||!/^[0-9a-f]+$/.test(r.manifest_sha256)||operation!==`review.request.finalize:${r.request_id}`)throw reviewResync();
  return r as unknown as ReviewDecisionResultReference;
}
export function validateStoredReviewDecisionReference(storage:StoragePort,operation:string,spaceId:string,raw:unknown):void {
  const ref=parseReviewDecisionReference(operation,raw),decision=readIntrinsicReviewDecision(storage,spaceId,ref.request_id),head=storage.findReviewRequestById(ref.request_id);
  if(!head||decision.id!==ref.decision_id||decision.request_version!==ref.request_version||head.snapshot_id!==ref.snapshot_id||decision.snapshot_sha256!==ref.manifest_sha256)throw reviewResync();
}
