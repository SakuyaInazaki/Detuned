import { type CreateReviewSubmission, type ReviewSubmissionRecord, type ReviewSubmissionView,
  type ReviewSubmissionAcknowledgement, type ReviewSubmissionsView, isCreateReviewSubmission, DetunedError, ErrorCode } from '@detuned/protocol';
import { type StoragePort, type ClockPort, type IdGeneratorPort, type AuthenticatedContext, AuthService,
  IdempotencyService, readReviewSnapshotRecords, reconstructReviewRequestView, validateReviewSubmissionRecords,
  reviewSubmissionAcknowledgement, assertReviewSnapshotCurrent, assertReviewSubmissionPostEvidencePrivacy, assertStoredSubmissionEvidencePrivacy, assertStoredSubmissionEvidenceReady,
  assertReviewEvidenceArtifact, assertReviewSubmissionReadPrivacy, reviewResync } from '@detuned/core';
const missing=()=>new DetunedError(ErrorCode.NOT_FOUND,'Review material does not exist or is not accessible.',404);
const invalid=()=>new DetunedError(ErrorCode.VALIDATION_ERROR,'Formal review submission requirements are not satisfied.',400);
const stale=()=>new DetunedError(ErrorCode.SNAPSHOT_STALE,'Review material is no longer current and available.',409);

/** Internal sealed submission business. No public transport or formal decision projection. */
export class ReviewSubmissionService {
  constructor(private readonly storage:StoragePort,private readonly authService:AuthService,
    private readonly idempotency:IdempotencyService,private readonly clock:ClockPort,private readonly idGen:IdGeneratorPort){}
  private auth(auth:AuthenticatedContext,spaceId:string,write=false){
    return this.authService.requireSpaceAccess(this.authService.refreshContext(auth),spaceId,'observer',write?'write':'read');
  }
  private assignment(auth:AuthenticatedContext,spaceId:string,requestId:string,fresh:boolean,operation:'read'|'write'='write'){
    const current=this.auth(auth,spaceId,operation==='write'),head=this.storage.findReviewRequestById(requestId);
    if(!head||head.space_id!==spaceId)throw missing();
    reconstructReviewRequestView(this.storage,spaceId,requestId);
    const assignment=this.storage.findReviewAssignment(requestId,current.actor.id);
    if(!assignment)throw missing();
    if(fresh){
      const member=this.storage.getMembership(spaceId,current.actor.id);
      if(!['human','agent'].includes(current.actor.kind)||!member||!member.active||!member.reviewer_eligible)throw invalid();
      const {manifest}=readReviewSnapshotRecords(this.storage,spaceId,head.snapshot_id);
      if(manifest.contributors.includes(current.actor.id))throw invalid();
      if(manifest.review_policy.distinct_independence_groups){
        const groups=this.storage.listReviewAssignments(requestId).map(a=>this.storage.getMembership(spaceId,a.reviewer_actor_id)?.independence_group);
        if(groups.some(g=>typeof g!=='string'||!/\S/.test(g))||new Set(groups).size!==groups.length)throw invalid();
      }
    }
    return {current,head,assignment};
  }
  getOwnAssignment(auth:AuthenticatedContext,spaceId:string,requestId:string){
    return this.storage.readSnapshot(()=>{const {head,assignment}=this.assignment(auth,spaceId,requestId,false,'read');
      const snapshot=this.storage.findReviewSnapshotById(head.snapshot_id)!;
      return {id:assignment.id,request_id:head.id,reviewer_actor_id:assignment.reviewer_actor_id,snapshot_id:snapshot.id,snapshot_sha256:snapshot.manifest_sha256};});
  }
  private freshMaterials(spaceId:string,snapshotId:string){
    const records=readReviewSnapshotRecords(this.storage,spaceId,snapshotId);
    assertReviewSnapshotCurrent(this.storage,records);
    return records.record;
  }

  private evidence(spaceId:string,assignmentId:string,req:CreateReviewSubmission){
    for(const ref of req.evidence_refs){
      if(ref.kind==='artifact'){const artifact=assertReviewEvidenceArtifact(this.storage,spaceId,assignmentId,ref.artifact_id);if(artifact.state!=='ready')throw stale();}
      else {const p=this.storage.findPostById(ref.post_id);if(!p||p.space_id!==spaceId)throw missing();
        if(p.lifecycle==='redacted')throw new DetunedError(ErrorCode.CONTENT_REDACTED,'Review material has been redacted.',410);
        if(!this.storage.getPostRevisionMetadata(ref.post_id,ref.revision))throw missing();}
    }
  }
  submit(auth:AuthenticatedContext,spaceId:string,requestId:string,req:CreateReviewSubmission,key:string):ReviewSubmissionAcknowledgement{
    return this.storage.transaction(tx=>{
      const initial=this.assignment(auth,spaceId,requestId,false);
      if(!isCreateReviewSubmission(req)||(req.verdict==='accept'&&req.pending_requirements.length!==0))throw invalid();
      return this.idempotency.executeIdempotent(initial.current.actor.id,spaceId,`review.submission.create:${requestId}`,key,req,201,()=>{
        const {current,head,assignment}=this.assignment(auth,spaceId,requestId,true);
        if(head.phase==='stale')throw stale();
        if(head.phase!=='collecting'||tx.findReviewSubmissionByAssignmentId(assignment.id))throw invalid();
        const snapshot=this.freshMaterials(spaceId,head.snapshot_id);
        if(req.snapshot_sha256!==snapshot.manifest_sha256)throw stale();
        const session=tx.findSessionById(req.reviewer_session_id);
        if(!session||session.actor_id!==current.actor.id||session.space_id!==spaceId||(!Number.isFinite(Date.parse(session.created_at))||!Number.isFinite(Date.parse(head.created_at))||Date.parse(session.created_at)<Date.parse(head.created_at))||tx.findReviewSubmissionBySessionId(session.id))throw invalid();
        this.evidence(spaceId,assignment.id,req);
        const previous=tx.listReviewSubmissions(requestId),count=head.submitted_count+1;
        if(previous.length!==head.submitted_count||count>tx.listReviewAssignments(requestId).length)throw reviewResync();
        const final=count===tx.listReviewAssignments(requestId).length;
        if(final)for(const old of previous){assertReviewSubmissionPostEvidencePrivacy(tx,spaceId,old);assertStoredSubmissionEvidencePrivacy(tx,spaceId,old);assertStoredSubmissionEvidenceReady(tx,spaceId,old);}
        const now=this.clock.nowIso(),version=head.version+1;
        const submission:ReviewSubmissionRecord={id:this.idGen.generateId('rsb'),request_id:requestId,assignment_id:assignment.id,
          reviewer_actor_id:current.actor.id,reviewer_session_id:session.id,snapshot_sha256:snapshot.manifest_sha256,payload:structuredClone(req),
          request_version:version,submitted_at:now,revealed_at:null};
        tx.updateReviewRequest({...head,version,submitted_count:count,phase:final?'revealed':'collecting',changed_by:current.actor.id,changed_at:now,reason:null},
          {request_id:requestId,version,submitted_count:count,phase:final?'revealed':'collecting',changed_by:current.actor.id,changed_at:now,reason:null});
        tx.createReviewSubmission(submission);
        tx.appendEvent(spaceId,{id:this.idGen.generateId('evt'),space_id:spaceId,type:'review.submitted',object_id:submission.id,
          revision:version,visibility:'review_assignment',actor_id:current.actor.id,created_at:now});
        if(final){tx.revealReviewSubmissions(requestId,now);tx.appendEvent(spaceId,{id:this.idGen.generateId('evt'),space_id:spaceId,
          type:'review.revealed',object_id:requestId,revision:version,visibility:'public',actor_id:current.actor.id,created_at:now});}
        return reviewSubmissionAcknowledgement(submission);
      },()=>{this.assignment(auth,spaceId,requestId,true);}).data;
    });
  }
  listVisibleSubmissions(auth:AuthenticatedContext,spaceId:string,requestId:string):ReviewSubmissionsView {
    return this.storage.readSnapshot(() => {
      const current=this.auth(auth,spaceId),head=this.storage.findReviewRequestById(requestId);
      if(!head||head.space_id!==spaceId)throw missing();
      reconstructReviewRequestView(this.storage,spaceId,requestId);
      readReviewSnapshotRecords(this.storage,spaceId,head.snapshot_id);
      const roster=this.storage.listReviewAssignments(requestId).sort((a,b)=>a.reviewer_actor_id<b.reviewer_actor_id?-1:a.reviewer_actor_id>b.reviewer_actor_id?1:0);
      const submissions:ReviewSubmissionView[]=[];
      for(const assignment of roster){
        const row=this.storage.findReviewSubmissionByAssignmentId(assignment.id);
        if(row&&(row.reviewer_actor_id===current.actor.id||row.revealed_at!==null))
          submissions.push(this.getSubmission(current,spaceId,row.id));
      }
      return {request_id:requestId,submissions};
    });
  }
  getSubmission(auth:AuthenticatedContext,spaceId:string,submissionId:string):ReviewSubmissionView{
    return this.storage.readSnapshot(()=>{
      const current=this.auth(auth,spaceId),stored=this.storage.findReviewSubmissionById(submissionId);
      if(!stored||this.storage.findReviewRequestById(stored.request_id)?.space_id!==spaceId||(stored.reviewer_actor_id!==current.actor.id&&stored.revealed_at===null))throw missing();
      const s=validateReviewSubmissionRecords(this.storage,spaceId,submissionId);
      assertReviewSubmissionReadPrivacy(this.storage,spaceId,s);
      return {...structuredClone(s.payload),submission_id:s.id,request_id:s.request_id,assignment_id:s.assignment_id,reviewer_actor_id:s.reviewer_actor_id,
        request_version:s.request_version,submitted_at:s.submitted_at,revealed_at:s.revealed_at};
    });
  }
}
