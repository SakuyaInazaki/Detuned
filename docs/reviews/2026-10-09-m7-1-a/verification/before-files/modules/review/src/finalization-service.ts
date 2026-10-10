import { type FinalizeReviewRequest,type ReviewDecisionView,type ReviewDecisionRecord,isFinalizeReviewRequest,DetunedError,ErrorCode } from '@detuned/protocol';
import { AuthService,type AuthenticatedContext,type StoragePort,type ClockPort,type IdGeneratorPort,IdempotencyService,
  reconstructReviewRequestView,readReviewSnapshotRecords,reconstructReviewDecisionView,assertReviewSnapshotCurrent,
  validateReviewSubmissionRecords,assertStoredSubmissionEvidencePrivacy,assertStoredSubmissionEvidenceReady,reviewResync } from '@detuned/core';
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
const incomplete=()=>new DetunedError(ErrorCode.REVIEW_INCOMPLETE,'Formal review is not complete and eligible for a decision.',409);
/** Internal finalization only. Required checks remain pending until real M7 records exist. */
export class ReviewFinalizationService {
  constructor(private readonly storage:StoragePort,private readonly authService:AuthService,private readonly idempotency:IdempotencyService,
    private readonly clock:ClockPort,private readonly idGen:IdGeneratorPort){}
  private authorize(auth:AuthenticatedContext,spaceId:string,requestId:string){
    const current=this.authService.requireSpaceAccess(this.authService.refreshContext(auth),spaceId,'contributor','write');
    const head=this.storage.findReviewRequestById(requestId);
    if(!head||head.space_id!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Review request does not exist or is not accessible.',404);
    reconstructReviewRequestView(this.storage,spaceId,requestId);
    if(head.requested_by!==current.actor.id&&current.spaceRole!=='maintainer'&&current.spaceRole!=='owner')
      throw new DetunedError(ErrorCode.FORBIDDEN,'This review operation requires its requester or space maintenance authority.',403);
    return {current,head};
  }
  finalizeRequest(auth:AuthenticatedContext,spaceId:string,requestId:string,req:FinalizeReviewRequest,key:string):ReviewDecisionView {
    if(!isFinalizeReviewRequest(req))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Formal review finalization input is invalid.',400);
    return this.storage.transaction(tx=>{
      const {current}=this.authorize(auth,spaceId,requestId);
      return this.idempotency.executeIdempotent(current.actor.id,spaceId,`review.request.finalize:${requestId}`,key,req,200,()=>{
        const {head}=this.authorize(auth,spaceId,requestId);
        if(head.version!==req.expected_version)throw new DetunedError(ErrorCode.REVISION_CONFLICT,'Review request version has changed.',409);
        if(head.phase==='stale')throw new DetunedError(ErrorCode.SNAPSHOT_STALE,'Review material is no longer current and available.',409);
        if(['accepted','changes_requested','rejected','cancelled'].includes(head.phase))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'This review request cannot be finalized.',400);
        if(head.phase!=='revealed')throw incomplete();
        const records=readReviewSnapshotRecords(tx,spaceId,head.snapshot_id),policy=records.manifest.review_policy;
        assertReviewSnapshotCurrent(tx,records);
        const assignments=tx.listReviewAssignments(head.id).sort((a,b)=>cmp(a.reviewer_actor_id,b.reviewer_actor_id));
        if(assignments.length!==policy.required_reviewers||head.submitted_count!==assignments.length)throw incomplete();
        const groups=new Set<string>();
        const submissions=assignments.map(assignment=>{
          const actor=tx.findActorById(assignment.reviewer_actor_id),membership=tx.getMembership(spaceId,assignment.reviewer_actor_id);
          if(!actor||actor.disabled_at||!['human','agent'].includes(actor.kind)||!membership||!membership.active||!membership.reviewer_eligible||records.manifest.contributors.includes(actor.id))throw incomplete();
          if(policy.distinct_independence_groups){const group=membership.independence_group;if(typeof group!=='string'||!/\S/.test(group)||groups.has(group))throw incomplete();groups.add(group);}
          const row=tx.findReviewSubmissionByAssignmentId(assignment.id);if(!row||row.revealed_at===null)throw incomplete();
          const submission=validateReviewSubmissionRecords(tx,spaceId,row.id);
          assertStoredSubmissionEvidencePrivacy(tx,spaceId,submission);assertStoredSubmissionEvidenceReady(tx,spaceId,submission);
          return submission;
        });
        const outcome=submissions.some(s=>s.payload.verdict==='reject')?'rejected':submissions.some(s=>s.payload.verdict==='changes_requested')?'changes_requested':'accepted';
        if(outcome==='accepted'){
          const open=[records.manifest.target,...records.manifest.dependencies].some(e=>tx.listOpenChallenges(spaceId,e.ref.post_id).length>0);
          if(open&&!policy.allow_open_objections)throw new DetunedError(ErrorCode.OPEN_OBJECTIONS,'Open objections prevent acceptance.',409);
          if(policy.required_checks.length>0)throw incomplete();
        }
        const version=head.version+1,now=this.clock.nowIso();if(!Number.isSafeInteger(version))throw reviewResync();
        const decision:ReviewDecisionRecord={id:this.idGen.generateId('rde'),request_id:head.id,actor_id:current.actor.id,
          snapshot_sha256:records.record.manifest_sha256,review_ids:submissions.map(s=>s.id),check_receipt_ids:[],outcome,
          rationale:outcome==='rejected'?'A complete review reports rejection.':outcome==='changes_requested'?'A complete review requests changes.':'All complete reviews accept; no required checks or blocking objections remain.',
          request_version:version,created_at:now};
        tx.updateReviewRequest({...head,phase:outcome,version,changed_by:current.actor.id,changed_at:now,reason:null},
          {request_id:head.id,version,phase:outcome,submitted_count:head.submitted_count,changed_by:current.actor.id,changed_at:now,reason:null});
        tx.createReviewDecision(decision);
        tx.appendEvent(spaceId,{id:this.idGen.generateId('evt'),space_id:spaceId,type:'review.finalized',object_id:head.id,
          revision:version,visibility:'public',actor_id:current.actor.id,created_at:now});
        return reconstructReviewDecisionView(tx,spaceId,head.id);
      },()=>{this.authorize(auth,spaceId,requestId);}).data;
    });
  }
  getDecision(auth:AuthenticatedContext,spaceId:string,requestId:string):ReviewDecisionView {
    return this.storage.readSnapshot(()=>{
      this.authService.requireSpaceAccess(this.authService.refreshContext(auth),spaceId,'observer','read');
      return reconstructReviewDecisionView(this.storage,spaceId,requestId);
    });
  }
}
