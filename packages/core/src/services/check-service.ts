import { randomBytes } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Value } from '@sinclair/typebox/value';
import { CreateCheckRunSchema,InvalidateCheckRunSchema,isSubmitCheckReceipt,DetunedError,ErrorCode,type CreateCheckRun,type InvalidateCheckRun,type SubmitCheckReceipt,type CheckRunRecord,type CheckReceiptRecord } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import type { ClockPort } from '../ports/clock.js';
import type { IdGeneratorPort } from '../ports/id-generator.js';
import type { HasherPort } from '../ports/hasher.js';
import { AuthService,type AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
import { readReviewSnapshotRecords,assertReviewSnapshotCurrent,reviewResync } from './review-request-records.js';
import { authorizeCheck } from './check-authorization.js';
import { readCheckRun,readCheckReceipt,assertCheckReceiptPrivacy,readRequiredCheckFacts } from './check-records.js';
export class CheckService {
  constructor(private readonly storage:StoragePort,private readonly auth:AuthService,private readonly idempotency:IdempotencyService,private readonly clock:ClockPort,private readonly ids:IdGeneratorPort,private readonly hasher:HasherPort){}
  private maintainer(auth:AuthenticatedContext,spaceId:string){return this.auth.requireSpaceAccess(this.auth.refreshContext(auth),spaceId,'maintainer','write');}
  private event(run:CheckRunRecord,spaceId:string,type:'check.created'|'check.completed'|'check.invalidated',actorId:string){this.storage.appendEvent(spaceId,{id:this.ids.generateId('evt'),space_id:spaceId,type,object_id:run.id,revision:run.version,visibility:'public',actor_id:actorId,created_at:run.changed_at});}
  createRun(auth:AuthenticatedContext,spaceId:string,req:CreateCheckRun,key:string):CheckRunRecord {
    if(!Value.Check(CreateCheckRunSchema,req))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid check run input.',400);
    return this.storage.transaction(tx=>{
      const current=this.maintainer(auth,spaceId),head=tx.findReviewRequestById(req.request_id);
      if(!head||head.space_id!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Request does not exist or is not accessible.',404);
      readReviewSnapshotRecords(tx,spaceId,head.snapshot_id);
      return this.idempotency.executeIdempotent(current.actor.id,spaceId,`check.run.create:${head.id}`,key,req,201,()=>{
        const fresh=this.maintainer(auth,spaceId),request=tx.findReviewRequestById(head.id)!;
        if(request.version!==req.expected_request_version)throw new DetunedError(ErrorCode.REVISION_CONFLICT,'Request version has changed.',409);
        if(req.snapshot_id!==request.snapshot_id)throw new DetunedError(ErrorCode.CHECK_MISMATCH,'Snapshot does not match request.',409);
        if(!['collecting','revealed'].includes(request.phase))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Request cannot create a new check.',400);
        const records=readReviewSnapshotRecords(tx,spaceId,request.snapshot_id);assertReviewSnapshotCurrent(tx,records);
        const profile=records.manifest.check_profiles.find(p=>p.check_name===req.check_name),verifier=tx.findActorById(req.verifier_id);
        if(!profile||!profile.verifier_actor_ids.includes(req.verifier_id)||!verifier||verifier.disabled_at)throw new DetunedError(ErrorCode.FORBIDDEN,'Verifier is not allowed by the frozen profile.',403);
        const now=this.clock.nowIso(),attempt=tx.getNextCheckRunAttempt(request.id,req.check_name),version=request.version+1;
        if(!Number.isSafeInteger(attempt)||attempt<1||!Number.isSafeInteger(version))throw reviewResync();
        const run:CheckRunRecord={id:this.ids.generateId('chk'),request_id:request.id,snapshot_id:request.snapshot_id,snapshot_sha256:records.record.manifest_sha256,check_name:req.check_name,attempt,verifier_actor_id:req.verifier_id,check_config_sha256:profile.config_sha256,created_request_version:request.version,state:'pending',version:1,created_by:fresh.actor.id,created_at:now,changed_by:fresh.actor.id,changed_at:now,invalidation_reason:null};
        tx.updateReviewRequest({...request,version,changed_by:fresh.actor.id,changed_at:now,reason:null},{request_id:request.id,version,phase:request.phase,submitted_count:request.submitted_count,changed_by:fresh.actor.id,changed_at:now,reason:null});
        tx.createCheckRun(run,{check_run_id:run.id,version:1,observed_request_version:version,state:'pending',receipt_id:null,changed_by:run.changed_by,changed_at:now,invalidation_reason:null});this.event(run,spaceId,'check.created',fresh.actor.id);return run;
      }).data;
    });
  }
  getRequiredChecks(auth:AuthenticatedContext,spaceId:string,requestId:string){return this.storage.readSnapshot(()=>{
    const current=this.auth.refreshContext(auth);this.auth.requireOrdinaryAccess(current);this.auth.requireSpaceAccess(current,spaceId,'observer','read');
    const request=this.storage.findReviewRequestById(requestId);
    if(!request||request.space_id!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Request does not exist or is not accessible.',404);
    readReviewSnapshotRecords(this.storage,spaceId,request.snapshot_id);
    const facts=readRequiredCheckFacts(this.storage,spaceId,requestId);
    return {space_id:spaceId,request_id:requestId,snapshot_id:request.snapshot_id,request_version:request.version,verification_status:facts.verification_status,checks:facts.checks.map(c=>({check_name:c.name,run:c.run?this.publicRun(c.run,spaceId):null,receipt_id:c.receipt?.receipt_id??null}))};
  });}
  private publicRun(run:CheckRunRecord,spaceId:string){const {created_request_version,...view}=run;return {...view,space_id:spaceId};}
  getRun(auth:AuthenticatedContext,spaceId:string,runId:string):CheckRunRecord {return this.storage.readSnapshot(()=>authorizeCheck(this.storage,this.auth,auth,spaceId,runId).run);}
  getSnapshot(auth:AuthenticatedContext,spaceId:string,runId:string){return this.storage.readSnapshot(()=>{const {run}=authorizeCheck(this.storage,this.auth,auth,spaceId,runId);return readReviewSnapshotRecords(this.storage,spaceId,run.snapshot_id);});}
  getPostRevision(auth:AuthenticatedContext,spaceId:string,runId:string,postId:string,revision:number){return this.storage.readSnapshot(()=>{const {run}=authorizeCheck(this.storage,this.auth,auth,spaceId,runId),{manifest}=readReviewSnapshotRecords(this.storage,spaceId,run.snapshot_id);if(![manifest.target,...manifest.dependencies].some(e=>e.ref.post_id===postId&&e.ref.revision===revision))throw new DetunedError(ErrorCode.NOT_FOUND,'Material is not in the check snapshot.',404);const post=this.storage.getPostRevision(postId,revision);if(!post)throw reviewResync();return post;});}
  issueCredential(auth:AuthenticatedContext,spaceId:string,runId:string,ttlSeconds=3600):{credential_id:string;token:string;expires_at:string} {
    if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>86400)throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid verification credential lifetime.',400);
    return this.storage.transaction(tx=>{const maintainer=this.maintainer(auth,spaceId);const {run}=authorizeCheck(tx,this.auth,auth,spaceId,runId,true),actor=tx.findActorById(run.verifier_actor_id);if(!actor||actor.disabled_at)throw new DetunedError(ErrorCode.FORBIDDEN,'Verifier is disabled.',403);this.auth.writeRateLimiter.admit(maintainer.actor.id);const now=this.clock.nowIso(),expires_at=new Date(this.clock.now().getTime()+ttlSeconds*1000).toISOString(),token='detuned_vrf_'+randomBytes(24).toString('hex'),credential_id=this.ids.generateId('crd');for(const binding of tx.listCheckRunCredentials(runId))tx.revokeCredential(binding.credential_id,now);tx.createCredential({id:credential_id,actor_id:run.verifier_actor_id,token_hash:this.hasher.sha256(token),allowed_space_ids:[spaceId],capabilities:['verify'],expires_at,revoked_at:null,created_at:now});tx.createCheckRunCredential({credential_id,check_run_id:runId,created_at:now});return {credential_id,token,expires_at};});
  }
  submitReceipt(auth:AuthenticatedContext,spaceId:string,runId:string,req:SubmitCheckReceipt,key:string):CheckReceiptRecord {
    if(typeof key!=='string'||!key.trim())throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Receipt idempotency key is required.',400);
    if(!isSubmitCheckReceipt(req))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid or oversized check receipt.',400);
    return this.storage.transaction(tx=>{
      const {current,run}=authorizeCheck(tx,this.auth,auth,spaceId,runId,false,true);
      const existing=tx.findCheckReceiptByRunId(runId);
      if(existing){const {check_run_id,verifier_actor_id,received_at,run_version,...payload}=existing;if(existing.receipt_id===req.receipt_id&&isDeepStrictEqual(payload,req)){assertCheckReceiptPrivacy(tx,spaceId,existing);return readCheckReceipt(tx,spaceId,runId);}throw new DetunedError(ErrorCode.IDEMPOTENCY_CONFLICT,'Check receipt conflicts with an existing receipt.',409);}
      return this.idempotency.executeIdempotent(current.actor.id,spaceId,`check.receipt.create:${runId}`,key,req,201,()=>{
        authorizeCheck(tx,this.auth,auth,spaceId,runId,true,true);
        if(tx.findCheckReceiptById(req.receipt_id))throw new DetunedError(ErrorCode.IDEMPOTENCY_CONFLICT,'Check receipt conflicts with an existing receipt.',409);
        if(req.observed_snapshot_sha256!==run.snapshot_sha256||req.observed_check_config_sha256!==run.check_config_sha256)throw new DetunedError(ErrorCode.CHECK_MISMATCH,'Observed check hashes do not match the fixed check.',409);
        const log=tx.findArtifactById(req.logs_artifact_id);if(!log||log.space_id!==spaceId||log.check_run_id!==runId||log.owner_id!==current.actor.id||log.visibility!=='space'||log.state!=='ready')throw new DetunedError(ErrorCode.NOT_FOUND,'Check log does not exist or is not accessible.',404);
        const version=run.version+1,now=this.clock.nowIso();if(!Number.isSafeInteger(version))throw reviewResync();const receipt:CheckReceiptRecord={...structuredClone(req),check_run_id:runId,verifier_actor_id:current.actor.id,received_at:now,run_version:version};tx.createCheckReceipt(receipt);const completed={...run,state:req.result,version,changed_by:current.actor.id,changed_at:now};tx.updateCheckRun(completed,{check_run_id:runId,version,observed_request_version:tx.findReviewRequestById(run.request_id)!.version,state:req.result,receipt_id:req.receipt_id,changed_by:current.actor.id,changed_at:now,invalidation_reason:null});this.event(completed,spaceId,'check.completed',current.actor.id);return receipt;
      },()=>{authorizeCheck(tx,this.auth,auth,spaceId,runId,true,true);}).data;
    });
  }
  getReceipt(auth:AuthenticatedContext,spaceId:string,runId:string):CheckReceiptRecord {return this.storage.readSnapshot(()=>{authorizeCheck(this.storage,this.auth,auth,spaceId,runId);const receipt=readCheckReceipt(this.storage,spaceId,runId);assertCheckReceiptPrivacy(this.storage,spaceId,receipt);return receipt;});}
  invalidateRun(auth:AuthenticatedContext,spaceId:string,runId:string,req:InvalidateCheckRun,key:string):CheckRunRecord {
    if(!Value.Check(InvalidateCheckRunSchema,req)||!req.reason.trim()||[...req.reason].length>500)throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid check invalidation input.',400);
    return this.storage.transaction(tx=>{const current=this.maintainer(auth,spaceId),run=readCheckRun(tx,spaceId,runId);return this.idempotency.executeIdempotent(current.actor.id,spaceId,`check.run.invalidate:${runId}`,key,req,200,()=>{this.maintainer(auth,spaceId);const latest=readCheckRun(tx,spaceId,runId);if(latest.version!==req.expected_version)throw new DetunedError(ErrorCode.REVISION_CONFLICT,'Check version has changed.',409);const version=latest.version+1;if(!Number.isSafeInteger(version))throw reviewResync();const invalidated={...latest,state:'invalidated' as const,version,changed_by:current.actor.id,changed_at:this.clock.nowIso(),invalidation_reason:req.reason};tx.updateCheckRun(invalidated,{check_run_id:runId,version,observed_request_version:tx.findReviewRequestById(run.request_id)!.version,state:'invalidated',receipt_id:tx.findCheckReceiptByRunId(runId)?.receipt_id??null,changed_by:current.actor.id,changed_at:invalidated.changed_at,invalidation_reason:req.reason});this.event(invalidated,spaceId,'check.invalidated',current.actor.id);return invalidated;}).data;});
  }
}
