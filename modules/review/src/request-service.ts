import { createHash } from 'node:crypto';
import { type CreateReviewRequest, type CancelReviewRequest, type ReviewRequestView, type ReviewRequestReadView, type ReviewAssignmentRecord,
  type ReviewRequestRecord, type ReviewRequestVersionRecord, type ReviewSnapshotManifestData,
  isCreateReviewRequest, isCancelReviewRequest, DetunedError, ErrorCode } from '@detuned/protocol';
import { type StoragePort, type ClockPort, type IdGeneratorPort, AuthService,
  type AuthenticatedContext, IdempotencyService, readReviewSnapshotRecords, reconstructReviewRequestView,
  reviewSnapshotItems, reviewResync } from '@detuned/core';
import { type ReviewModule } from './index.js';
import { canonicalizeReviewJson } from './canonical-json.js';
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
const invalid=()=>new DetunedError(ErrorCode.VALIDATION_ERROR,'Formal review request requirements are not satisfied.',400);
const missing=()=>new DetunedError(ErrorCode.NOT_FOUND,'Review material does not exist or is not accessible.',404);
const forbidden=()=>new DetunedError(ErrorCode.FORBIDDEN,'This review request operation requires its requester or space maintenance authority.',403);

/** Internal only: fixed assignments and collecting/cancelled heads, no submissions or public endpoint. */
export class ReviewRequestService {
  constructor(private readonly storage:StoragePort,private readonly authService:AuthService,
    private readonly idempotency:IdempotencyService,private readonly clock:ClockPort,
    private readonly idGen:IdGeneratorPort,private readonly builder:ReviewModule){}

  private readAuth(auth:AuthenticatedContext,spaceId:string,write=false){
    const current=this.authService.refreshContext(auth);
    return this.authService.requireSpaceAccess(current,spaceId,write?'contributor':'observer');
  }
  private target(auth:AuthenticatedContext,spaceId:string,postId:string){
    const current=this.readAuth(auth,spaceId,true),post=this.storage.findPostById(postId);
    if(!post||post.space_id!==spaceId)throw missing();
    if(post.lifecycle==='redacted')throw new DetunedError(ErrorCode.CONTENT_REDACTED,'Review material has been redacted.',410);
    if(post.author_id!==current.actor.id&&current.spaceRole!=='maintainer'&&current.spaceRole!=='owner')throw forbidden();
    return current;
  }
  private cancelAuth(auth:AuthenticatedContext,spaceId:string,requestId:string){
    const current=this.readAuth(auth,spaceId,true),head=this.storage.findReviewRequestById(requestId);
    if(!head||head.space_id!==spaceId)throw missing();
    // Privacy is checked before ownership and version errors; no stored manifest can restore redacted material.
    reconstructReviewRequestView(this.storage,spaceId,requestId);
    if(head.requested_by!==current.actor.id&&current.spaceRole!=='maintainer'&&current.spaceRole!=='owner')throw forbidden();
    return {current,head};
  }

  createRequest(auth:AuthenticatedContext,spaceId:string,req:CreateReviewRequest,requestKey:string):ReviewRequestView{
    return this.storage.transaction(tx=>{
      this.readAuth(auth,spaceId,true);
      if(!isCreateReviewRequest(req))throw invalid();
      const current=this.target(auth,spaceId,req.target_ref.post_id);
      return this.idempotency.executeIdempotent(current.actor.id,spaceId,'review.request.create',requestKey,req,201,()=>{
        const {manifest,manifestHash}=this.builder.generateSnapshotManifest(current,spaceId,req);
        const policy=manifest.review_policy;
        if(!policy.enabled||!policy.exclude_contributors||!policy.distinct_actors||!policy.seal_until_all_submitted||!policy.invalidate_on_revision||
          req.reviewer_actor_ids.length!==policy.required_reviewers)throw invalid();
        const reviewers=[...req.reviewer_actor_ids].sort(cmp),groups=new Set<string>();
        const assignments:ReviewAssignmentRecord[]=reviewers.map(reviewer_actor_id=>{
          const actor=tx.findActorById(reviewer_actor_id),member=tx.getMembership(spaceId,reviewer_actor_id);
          if(!actor||actor.disabled_at||!['human','agent'].includes(actor.kind)||!member||!member.active||!member.reviewer_eligible||manifest.contributors.includes(reviewer_actor_id))throw invalid();
          if(policy.distinct_independence_groups){const group=member.independence_group;
            if(typeof group!=='string'||!/\S/.test(group)||groups.has(group))throw invalid();groups.add(group);}
          return {id:this.idGen.generateId('ras'),request_id:'',reviewer_actor_id,group_at_assignment:member.independence_group};
        });
        const now=this.clock.nowIso(),snapshotId=this.idGen.generateId('snp'),requestId=this.idGen.generateId('rrq');
        const round=tx.getNextReviewRequestRound(spaceId,req.target_ref.post_id);
        if(!Number.isSafeInteger(round)||round<1)throw reviewResync();
        const canonical=canonicalizeReviewJson(manifest);
        if(createHash('sha256').update(canonical,'utf8').digest('hex')!==manifestHash)throw reviewResync();
        tx.createReviewSnapshot({id:snapshotId,space_id:spaceId,manifest_json:canonical,manifest_sha256:manifestHash,
          target_ref:{...manifest.target.ref},policy_revision:manifest.policy_revision,rules_revision:manifest.rules_revision,created_by:current.actor.id,created_at:now},
          reviewSnapshotItems(snapshotId,manifest));
        const record:ReviewRequestRecord={id:requestId,space_id:spaceId,target_ref:{...req.target_ref},snapshot_id:snapshotId,round,
          phase:'collecting',version:1,submitted_count:0,requested_by:current.actor.id,created_at:now,changed_by:current.actor.id,changed_at:now,reason:null};
        const version:ReviewRequestVersionRecord={request_id:requestId,version:1,phase:'collecting',submitted_count:0,changed_by:current.actor.id,changed_at:now,reason:null};
        tx.createReviewRequest(record,version,assignments.map(a=>({...a,request_id:requestId})));
        tx.appendEvent(spaceId,{id:this.idGen.generateId('evt'),space_id:spaceId,type:'review.requested',object_id:requestId,
          revision:1,visibility:'public',actor_id:current.actor.id,created_at:now});
        return reconstructReviewRequestView(tx,spaceId,requestId,1);
      },()=>{this.target(auth,spaceId,req.target_ref.post_id);}).data;
    });
  }

  getRequest(auth:AuthenticatedContext,spaceId:string,requestId:string):ReviewRequestReadView{
    return this.storage.readSnapshot(()=>{this.readAuth(auth,spaceId);const view=reconstructReviewRequestView(this.storage,spaceId,requestId);const head=this.storage.findReviewRequestById(requestId)!;return {...view,submitted_count:head.submitted_count,changed_by:head.phase==='collecting'&&head.submitted_count>0?null:view.changed_by};});
  }
  getSnapshot(auth:AuthenticatedContext,spaceId:string,snapshotId:string):
    {snapshot_id:string;space_id:string;manifest_sha256:string;manifest:ReviewSnapshotManifestData;created_by:string;created_at:string}{
    return this.storage.readSnapshot(()=>{
      this.readAuth(auth,spaceId);const {record,manifest}=readReviewSnapshotRecords(this.storage,spaceId,snapshotId);
      try{if(canonicalizeReviewJson(manifest)!==record.manifest_json)throw reviewResync();}catch{throw reviewResync();}
      return {snapshot_id:record.id,space_id:record.space_id,manifest_sha256:record.manifest_sha256,manifest,created_by:record.created_by,created_at:record.created_at};
    });
  }
  cancelRequest(auth:AuthenticatedContext,spaceId:string,requestId:string,req:CancelReviewRequest,requestKey:string):ReviewRequestView{
    return this.storage.transaction(tx=>{
      const {current}=this.cancelAuth(auth,spaceId,requestId);
      if(!isCancelReviewRequest(req))throw invalid();
      return this.idempotency.executeIdempotent(current.actor.id,spaceId,`review.request.cancel:${requestId}`,requestKey,req,200,()=>{
        const {head}=this.cancelAuth(auth,spaceId,requestId);
        if(head.version!==req.expected_version)throw new DetunedError(ErrorCode.REVISION_CONFLICT,'Review request version has changed.',409);
        if(head.phase!=='collecting'&&head.phase!=='revealed')throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Only collecting or revealed review requests can be cancelled.',400);
        const now=this.clock.nowIso(),version=head.version+1;
        tx.updateReviewRequest({...head,phase:'cancelled',version,changed_by:current.actor.id,changed_at:now,reason:req.reason},
          {request_id:requestId,version,phase:'cancelled',submitted_count:head.submitted_count,changed_by:current.actor.id,changed_at:now,reason:req.reason});
        tx.appendEvent(spaceId,{id:this.idGen.generateId('evt'),space_id:spaceId,type:'review.cancelled',object_id:requestId,
          revision:version,visibility:'public',actor_id:current.actor.id,created_at:now});
        return reconstructReviewRequestView(tx,spaceId,requestId,version);
      },()=>{this.cancelAuth(auth,spaceId,requestId);}).data;
    });
  }
}
