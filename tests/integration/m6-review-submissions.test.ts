import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,extractResultRef,EventService,HmacTokenSigner} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService} from '@detuned/module-review';
import {CancelReviewRequestSchema,ToolReviewCancelOpSchema,DETUNED_TOOLS,type CreateReviewRequest,type CreateReviewSubmission,CreateReviewSubmissionSchema,ToolReviewSubmitOpSchema} from '@detuned/protocol';
import {Value} from '@sinclair/typebox/value';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,service:ReviewRequestService;
let auth:ReturnType<AuthService['authenticateToken']>,sid:string,pid:string,req:CreateReviewRequest;
const clock={now:()=>new Date('2026-10-09T00:00:00Z'),nowIso:()=> '2026-10-09T00:00:00.000Z'};
beforeEach(async()=>{
 db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;storage=new SqliteStorage(db);app=buildApp({storage,clock});await app.ready();
 const headers={authorization:`Bearer ${token}`};
 async function post(url:string,payload:Record<string,unknown>,key:string){const r=await app.inject({method:'POST',url,headers:{...headers,'idempotency-key':key},payload});expect(r.statusCode,r.body).toBe(201);return r.json().data;}
 sid=(await post('/api/v1/spaces',{slug:'review-requests',objective:'o',rules:[]},'space')).space.id;
 const tid=(await post(`/api/v1/spaces/${sid}/threads`,{title:'t'},'thread')).thread.id;
 pid=(await post(`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'claim',summary:'s',body:'original',structured:{statement:'claim',assumptions:['a'],scope:'s',falsification_plan:'f'}},'claim')).post.id;
 for(const id of ['r1','r2']){storage.createActor({id,kind:'human',display_name:id,created_at:clock.nowIso(),disabled_at:null});storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});}
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.required_checks',json('[]')) WHERE space_id=?").run(sid);
 const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);auth=as.authenticateToken(token);
 service=new ReviewRequestService(storage,as,new IdempotencyService(storage,hasher,clock),clock,new CryptoIdGenerator(),new ReviewModule(storage,hasher,clock,new CryptoIdGenerator(),as));
 req={target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['r2','r1'],expected_policy_revision:1,reproduction_instructions:'run'};
});
afterEach(async()=>{vi.restoreAllMocks();await app.close();db.close();});
const create=(key='create')=>service.createRequest(auth,sid,req,key);
const counts=()=>Object.fromEntries(['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','events','idempotency_records'].map(t=>[t,(db.prepare(`SELECT count(*) n FROM ${t}`).get() as {n:number}).n]));

function reviewer(id:string){
 const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);
 storage.createCredential({id:`credential-${id}`,actor_id:id,token_hash:hasher.sha256(`owned-${id}`),allowed_space_ids:[sid],capabilities:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});
 const ctx=as.authenticateToken(`owned-${id}`),sessionId=`session-${id}`;
 storage.createSession({id:sessionId,space_id:sid,actor_id:id,client_name:'owned-test',client_version:'1',harness_session_id:null,metadata:{},created_at:clock.nowIso()});
 return {ctx,submission:new ReviewSubmissionService(storage,as,new IdempotencyService(storage,hasher,clock),clock,new CryptoIdGenerator()),sessionId};
}
const body=(hash:string,session:string):CreateReviewSubmission=>({snapshot_sha256:hash,reviewer_session_id:session,completion_status:'complete',verdict:'accept',coverage:'scope',checks_performed:'checked',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}});
it('RS01 sealed observer submissions reveal atomically and retain exact historical acknowledgement',()=>{
 const first=create(),r1=reviewer('r1'),r2=reviewer('r2'),b1=body(first.snapshot_sha256,r1.sessionId),b2=body(first.snapshot_sha256,r2.sessionId);
 const ack=r1.submission.submit(r1.ctx,sid,first.id,b1,'one');
 const compact=JSON.parse(extractResultRef(`review.submission.create:${first.id}`,ack,storage));expect(compact).toMatchObject({v:1,kind:'review.submission',submission_id:ack.submission_id,request_version:2,snapshot_id:first.snapshot_id});expect(Object.keys(compact)).toHaveLength(8);expect(()=>extractResultRef(`review.submission.create:${first.id}`,ack)).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED'}));
 expect(service.getRequest(auth,sid,first.id)).toMatchObject({phase:'collecting',submitted_count:1,changed_by:null});
 expect(()=>r2.submission.getSubmission(r2.ctx,sid,ack.submission_id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
 expect(r1.submission.getSubmission(r1.ctx,sid,ack.submission_id)).toMatchObject({coverage:'scope',revealed_at:null});
 expect(create()).toEqual(first);expect(r1.submission.submit(r1.ctx,sid,first.id,b1,'one')).toEqual(ack);
 expect(()=>r1.submission.submit(r1.ctx,sid,first.id,b1,'another')).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
 r2.submission.submit(r2.ctx,sid,first.id,b2,'two');
 expect(service.getRequest(auth,sid,first.id)).toMatchObject({phase:'revealed',submitted_count:2});
 expect(r1.submission.getOwnAssignment(r1.ctx,sid,first.id)).toMatchObject({reviewer_actor_id:'r1',snapshot_sha256:first.snapshot_sha256});
 expect(r2.submission.getSubmission(r2.ctx,sid,ack.submission_id).revealed_at).toBe(clock.nowIso());
 expect(r1.submission.submit(r1.ctx,sid,first.id,b1,'one')).toEqual(ack);expect(create()).toEqual(first);
 expect((db.prepare("SELECT count(*) n FROM events WHERE type='review.revealed'").get() as {n:number}).n).toBe(1);
 db.prepare("UPDATE credentials SET capabilities='[\"read\"]' WHERE id=?").run(r1.ctx.credential.id);
 expect(r1.submission.getOwnAssignment(r1.ctx,sid,first.id)).toMatchObject({reviewer_actor_id:'r1'});
});
it('RS02 failure after writes rolls back sealed payload, version, events and compact references',()=>{
 const first=create(),r=reviewer('r1'),before=counts();
 const append=vi.spyOn(storage,'appendEvent').mockImplementation(()=>{throw new Error('controlled rollback');});
 expect(()=>r.submission.submit(r.ctx,sid,first.id,body(first.snapshot_sha256,r.sessionId),'one')).toThrow('controlled rollback');append.mockRestore();
 expect(counts()).toEqual(before);expect(storage.listReviewSubmissions(first.id)).toEqual([]);expect(service.getRequest(auth,sid,first.id).submitted_count).toBe(0);
});
it('RS03 payload conflicts, revoked access and changed material fail without rewriting historical results',()=>{
 const first=create(),r=reviewer('r1'),b=body(first.snapshot_sha256,r.sessionId),ack=r.submission.submit(r.ctx,sid,first.id,b,'one');
 expect(()=>r.submission.submit(r.ctx,sid,first.id,{...b,coverage:'changed'},'one')).toThrow(expect.objectContaining({code:'IDEMPOTENCY_CONFLICT'}));
 storage.upsertMembership({...storage.getMembership(sid,'r1')!,reviewer_eligible:false});expect(r.submission.submit(r.ctx,sid,first.id,b,'one')).toEqual(ack);
 db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(pid);expect(()=>r.submission.submit(r.ctx,sid,first.id,b,'one')).toThrow(expect.objectContaining({code:'CONTENT_REDACTED'}));
});
it('RS04 strict inactive tool shares DTO and rejects provisional, whitespace, unsafe references and independence claims',()=>{
 const b=body('a'.repeat(64),'s');expect(Value.Check(CreateReviewSubmissionSchema,b)).toBe(true);
 const tool={...b,space_id:'s',request_key:'k',op:'submit',request_id:'r'};expect(Value.Check(ToolReviewSubmitOpSchema,tool)).toBe(true);
 for(const bad of [{...b,completion_status:'provisional'},{...b,coverage:' '},{...b,evidence_refs:[{kind:'post',post_id:'p',revision:Number.MAX_SAFE_INTEGER+1}]},{...b,independence_statement:{...b.independence_statement,participated_in_material:true}}])expect(Value.Check(CreateReviewSubmissionSchema,bad)).toBe(false);
 expect(ToolReviewSubmitOpSchema.properties.coverage).toBe(CreateReviewSubmissionSchema.properties.coverage);
});
it('RS05 redacted material blocks last reveal without exposing a prior sealed submission',()=>{
 const first=create(),r1=reviewer('r1'),r2=reviewer('r2'),b=body(first.snapshot_sha256,r1.sessionId);
 b.evidence_refs=[{kind:'post',post_id:pid,revision:1}];const ack=r1.submission.submit(r1.ctx,sid,first.id,b,'one');
 const before=counts();db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(pid);
 expect(()=>r2.submission.submit(r2.ctx,sid,first.id,body(first.snapshot_sha256,r2.sessionId),'two')).toThrow(expect.objectContaining({code:'CONTENT_REDACTED'}));
 expect(counts()).toEqual(before);expect(storage.findReviewSubmissionById(ack.submission_id)!.revealed_at).toBeNull();
});

it('RS06 own fixed assignment is a read while fresh submissions retain write and eligibility requirements',()=>{
 const first=create(),r=reviewer('r1'),fixed=r.submission.getOwnAssignment(r.ctx,sid,first.id);
 const h=new CryptoHasher(),as=new AuthService(storage,h,clock);
 storage.createCredential({id:'r1-read',actor_id:'r1',token_hash:h.sha256('owned-r1-read'),allowed_space_ids:[sid],capabilities:['read'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});
 const readonly=as.authenticateToken('owned-r1-read');
 expect(r.submission.getOwnAssignment(readonly,sid,first.id)).toEqual(fixed);
 expect(()=>r.submission.submit(readonly,sid,first.id,body(first.snapshot_sha256,r.sessionId),'readonly')).toThrow(expect.objectContaining({code:'FORBIDDEN'}));
 storage.upsertMembership({...storage.getMembership(sid,'r1')!,reviewer_eligible:false});
 expect(r.submission.getOwnAssignment(readonly,sid,first.id)).toEqual(fixed);
 expect(()=>r.submission.submit(r.ctx,sid,first.id,body(first.snapshot_sha256,r.sessionId),'ineligible')).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
 service.cancelRequest(auth,sid,first.id,{expected_version:1,reason:'stop'},'stop');expect(r.submission.getOwnAssignment(readonly,sid,first.id)).toEqual(fixed);
});

it('RS07 public polling filters wrongly public private-artifact events including existing pending batches',()=>{
 const request=create(),assignment=storage.listReviewAssignments(request.id)[0],h=new CryptoHasher(),as=new AuthService(storage,h,clock);
 if(!assignment)throw new Error('Owned fixture assignment is missing.');
 for(const [id,visibility] of [['private-event-art','review_assignment'],['public-event-art','space']] as const){
  storage.createArtifact({id,space_id:sid,owner_id:visibility==='space'?auth.actor.id:assignment.reviewer_actor_id,visibility,
   review_assignment_id:visibility==='space'?null:assignment.id,check_run_id:null,sha256:'a'.repeat(64),bytes:0,mime:'text/plain',storage_key:id,state:'redacted',created_at:clock.nowIso()});
 }
 for(const [id,type,object_id] of [['legacy-created','artifact.created','private-event-art'],['legacy-redacted','artifact.redacted','private-event-art'],['public-redacted','artifact.redacted','public-event-art']] as const){
  storage.appendEvent(sid,{id,space_id:sid,type,object_id,revision:1,visibility:'public',actor_id:auth.actor.id,created_at:clock.nowIso()});
 }
 const events=new EventService(storage,new CryptoIdGenerator(),clock,new HmacTokenSigner(),as,storage.getInstanceSecret());
 const consumer=events.subscribe(auth,sid,{consumer_key:'owned-private-events',start:'beginning'}).consumer;
 const first=events.poll(auth,sid,consumer.id,{limit:100});
 expect(first.events.some(e=>e.object_id==='private-event-art')).toBe(false);expect(first.events.some(e=>e.id==='public-redacted')).toBe(true);
 expect(storage.findConsumerById(consumer.id)!.ack_seq).toBe(0);
 db.prepare('UPDATE delivery_batches SET event_ids=? WHERE id=?').run(JSON.stringify(['legacy-created','legacy-redacted','public-redacted']),first.batch_id);
 const pending=events.poll(auth,sid,consumer.id,{limit:100});expect(pending.batch_id).toBe(first.batch_id);expect(pending.events.map(e=>e.id)).toEqual(['public-redacted']);expect(storage.findConsumerById(consumer.id)!.ack_seq).toBe(0);
});
