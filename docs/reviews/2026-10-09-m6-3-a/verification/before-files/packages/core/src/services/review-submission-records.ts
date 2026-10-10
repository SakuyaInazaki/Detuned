import { DetunedError, ErrorCode, isCreateReviewSubmission, type ReviewSubmissionRecord, type ReviewSubmissionAcknowledgement } from '@detuned/protocol';
import { type StoragePort } from '../ports/storage.js';
import { reviewResync, validatePersistedReviewRequestBinding } from './review-request-records.js';

/** Intrinsic stored binding only. Online callers must separately apply current ACL and privacy. */
export function validateReviewSubmissionRecords(storage:StoragePort,spaceId:string,submissionId:string):ReviewSubmissionRecord {
  const submission=storage.findReviewSubmissionById(submissionId);
  if(!submission||submission.id!==submissionId||!isCreateReviewSubmission(submission.payload))throw reviewResync();
  const assignment=storage.findReviewAssignmentById(submission.assignment_id);
  const request=storage.findReviewRequestById(submission.request_id);
  if(!assignment||!request||request.space_id!==spaceId||assignment.request_id!==request.id||
    assignment.reviewer_actor_id!==submission.reviewer_actor_id||submission.payload.reviewer_session_id!==submission.reviewer_session_id||
    submission.payload.snapshot_sha256!==submission.snapshot_sha256||!Number.isSafeInteger(submission.request_version)||submission.request_version<2)throw reviewResync();
  const snapshot=storage.findReviewSnapshotById(request.snapshot_id),session=storage.findSessionById(submission.reviewer_session_id);
  const version=storage.findReviewRequestVersion(request.id,submission.request_version);
  if(!snapshot||snapshot.space_id!==spaceId||snapshot.manifest_sha256!==submission.snapshot_sha256||!session||
    session.actor_id!==submission.reviewer_actor_id||session.space_id!==spaceId||(!Number.isFinite(Date.parse(session.created_at))||!Number.isFinite(Date.parse(request.created_at))||Date.parse(session.created_at)<Date.parse(request.created_at))||
    !version||!['collecting','revealed'].includes(version.phase)||version.changed_by!==submission.reviewer_actor_id||
    version.changed_at!==submission.submitted_at||version.reason!==null||version.submitted_count<1||
    storage.findReviewSubmissionByAssignmentId(assignment.id)?.id!==submission.id||
    storage.findReviewSubmissionBySessionId(session.id)?.id!==submission.id||
    (submission.payload.verdict==='accept'&&submission.payload.pending_requirements.length!==0)||
    typeof submission.submitted_at!=='string'||!Number.isFinite(Date.parse(submission.submitted_at))||
    (submission.revealed_at!==null&&(typeof submission.revealed_at!=='string'||!Number.isFinite(Date.parse(submission.revealed_at)))))throw reviewResync();
  if(submission.revealed_at!==null){
    const all=storage.listReviewSubmissions(request.id),last=all.reduce((a,b)=>a.request_version>b.request_version?a:b);
    const reveal=storage.findReviewRequestVersion(request.id,last.request_version);
    if(all.length!==storage.listReviewAssignments(request.id).length||!reveal||reveal.phase!=='revealed'||
      reveal.changed_at!==submission.revealed_at||all.some(s=>s.revealed_at!==reveal.changed_at))throw reviewResync();
  }
  validatePersistedReviewRequestBinding(storage,spaceId,request.id,version.version,snapshot.id,snapshot.manifest_sha256,version.phase as 'collecting'|'revealed');
  return structuredClone(submission);
}
export interface ReviewSubmissionResultReference {
  v:1;kind:'review.submission';submission_id:string;assignment_id:string;request_id:string;request_version:number;snapshot_id:string;manifest_sha256:string;
}
export function validateStoredReviewSubmissionReference(storage:StoragePort,operation:string,spaceId:string,raw:unknown):void {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw reviewResync();
  const r=raw as Record<string,unknown>,keys=['v','kind','submission_id','assignment_id','request_id','request_version','snapshot_id','manifest_sha256'];
  if(Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k))||r.v!==1||r.kind!=='review.submission'||
    typeof r.submission_id!=='string'||typeof r.request_id!=='string'||operation!==`review.submission.create:${r.request_id}`)throw reviewResync();
  const submission=validateReviewSubmissionRecords(storage,spaceId,r.submission_id),request=storage.findReviewRequestById(submission.request_id)!;
  if(r.assignment_id!==submission.assignment_id||r.request_id!==submission.request_id||r.request_version!==submission.request_version||
    r.snapshot_id!==request.snapshot_id||r.manifest_sha256!==submission.snapshot_sha256)throw reviewResync();
}
export function reviewSubmissionAcknowledgement(submission:ReviewSubmissionRecord):ReviewSubmissionAcknowledgement {
  return {submission_id:submission.id,request_id:submission.request_id,assignment_id:submission.assignment_id,
    reviewer_actor_id:submission.reviewer_actor_id,snapshot_sha256:submission.snapshot_sha256,submitted_at:submission.submitted_at};
}
/** Online post-evidence privacy only; old readable revisions remain valid. */
export function assertReviewSubmissionPostEvidencePrivacy(storage:StoragePort,spaceId:string,submission:ReviewSubmissionRecord):void {
  for(const ref of submission.payload.evidence_refs){if(ref.kind!=='post')continue;
    const post=storage.findPostById(ref.post_id);
    if(!post||post.space_id!==spaceId||!storage.getPostRevisionMetadata(ref.post_id,ref.revision)){
      throw new DetunedError(ErrorCode.NOT_FOUND,'Review material does not exist or is not accessible.',404);
    }
    if(post.lifecycle==='redacted')throw new DetunedError(ErrorCode.CONTENT_REDACTED,'Review material has been redacted.',410);
  }
}
