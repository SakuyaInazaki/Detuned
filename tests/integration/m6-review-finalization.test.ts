import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,extractResultRef} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService,ReviewFinalizationService,ReviewStatusService} from '@detuned/module-review';
import {FinalizeReviewRequestSchema,ToolReviewFinalizeOpSchema,type CreateReviewRequest,type CreateReviewSubmission} from '@detuned/protocol';
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
const counts=()=>Object.fromEntries(['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_decisions','events','idempotency_records'].map(t=>[t,(db.prepare(`SELECT count(*) n FROM ${t}`).get() as {n:number}).n]));

function reviewer(id:string){
 const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);
 storage.createCredential({id:`credential-${id}`,actor_id:id,token_hash:hasher.sha256(`owned-${id}`),allowed_space_ids:[sid],capabilities:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});
 const ctx=as.authenticateToken(`owned-${id}`),sessionId=`session-${id}`;
 storage.createSession({id:sessionId,space_id:sid,actor_id:id,client_name:'owned-test',client_version:'1',harness_session_id:null,metadata:{},created_at:clock.nowIso()});
 return {ctx,submission:new ReviewSubmissionService(storage,as,new IdempotencyService(storage,hasher,clock),clock,new CryptoIdGenerator()),sessionId};
}
const body=(hash:string,session:string):CreateReviewSubmission=>({snapshot_sha256:hash,reviewer_session_id:session,completion_status:'complete',verdict:'accept',coverage:'scope',checks_performed:'checked',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}});

function services(){const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);return {
 finalize:new ReviewFinalizationService(storage,as,new IdempotencyService(storage,hasher,clock),clock,new CryptoIdGenerator()),
 status:new ReviewStatusService(storage,as)};}
function reveal(verdict:'accept'|'reject'|'changes_requested'='accept'){
 const first=create(),one=reviewer('r1'),two=reviewer('r2');
 one.submission.submit(one.ctx,sid,first.id,body(first.snapshot_sha256,one.sessionId),'submit-one');
 two.submission.submit(two.ctx,sid,first.id,{...body(first.snapshot_sha256,two.sessionId),verdict},'submit-two');
 return first;
}

it('RF01 strict finalization DTO/tool and stable immutable decision, compact and replay',()=>{
 expect(Value.Check(FinalizeReviewRequestSchema,{expected_version:3})).toBe(true);
 expect(Value.Check(FinalizeReviewRequestSchema,{})).toBe(false);
 expect(Value.Check(ToolReviewFinalizeOpSchema,{space_id:sid,request_id:'r',request_key:'k',op:'finalize',expected_version:3})).toBe(true);
 const first=reveal(),s=services(),decision=s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize');
 expect(decision).toMatchObject({outcome:'accepted',request_version:4,check_receipt_ids:[]});
 expect(decision.review_ids).toEqual(['r1','r2'].map(id=>storage.findReviewAssignment(first.id,id)).map(a=>{if(!a)throw Error('fixture assignment missing');return storage.findReviewSubmissionByAssignmentId(a.id)?.id;}));
 const raw=JSON.parse(extractResultRef(`review.request.finalize:${first.id}`,decision,storage));expect(raw).toMatchObject({kind:'review.decision',request_version:4,snapshot_id:first.snapshot_id});expect(Object.keys(raw)).toHaveLength(7);
 const before=counts();storage.upsertMembership({...storage.getMembership(sid,'r1')!,reviewer_eligible:false});
 expect(s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize')).toEqual(decision);expect(counts()).toEqual(before);
 expect(s.finalize.getDecision(auth,sid,first.id)).toEqual(decision);
 expect(()=>s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:4},'new')).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
});
it('RF02 current reviewer qualification and fresh version reject without writes; replay still checks finalizer permission',()=>{
 const first=reveal(),s=services(),before=counts(),member=storage.getMembership(sid,'r1');if(!member)throw Error('fixture member missing');
 storage.upsertMembership({...member,reviewer_eligible:false});
 expect(()=>s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize')).toThrow(expect.objectContaining({code:'REVIEW_INCOMPLETE'}));
 expect(counts()).toEqual(before);storage.upsertMembership(member);
 const decision=s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize');
 const r1=new AuthService(storage,new CryptoHasher(),clock).authenticateToken('owned-r1');expect(()=>s.finalize.finalizeRequest(r1,sid,first.id,{expected_version:3},'finalize')).toThrow(expect.objectContaining({code:'FORBIDDEN'}));
 expect(s.finalize.getDecision(auth,sid,first.id)).toEqual(decision);
});
it('RF03 negative verdict wins required checks',()=>{
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.required_checks',json('[\"reproduce\"]')),check_profiles=? WHERE space_id=?").run(JSON.stringify({reproduce:{config_sha256:'a'.repeat(64),verifier_actor_ids:[],description:'configured'}}),sid);
 const first=reveal('reject'),s=services();expect(s.status.getStatus(auth,sid,first.id).verification_status).toBe('pending');
 expect(s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize').outcome).toBe('rejected');
});
it('RF04 failure between version and decision rolls back head, decision, event and idempotency',()=>{
 const first=reveal(),s=services(),before=counts();
 db.exec("CREATE TRIGGER fail_decision BEFORE INSERT ON review_decisions BEGIN SELECT RAISE(ABORT,'owned test'); END");
 expect(()=>s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize')).toThrow();expect(counts()).toEqual(before);
 expect(storage.findReviewDecisionByRequestId(first.id)).toBeNull();expect(service.getRequest(auth,sid,first.id).phase).toBe('revealed');
 db.exec('DROP TRIGGER fail_decision');expect(s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'finalize').outcome).toBe('accepted');
});
it('RF05 revealed cancellation preserves published submission while old confirmations remain exact',()=>{
 const first=reveal();const all=storage.listReviewSubmissions(first.id);const result=service.cancelRequest(auth,sid,first.id,{expected_version:3,reason:'stop'},'cancel');
 expect(result.phase).toBe('cancelled');expect(storage.listReviewSubmissions(first.id)).toEqual(all);
 expect(service.createRequest(auth,sid,req,'create')).toEqual(first);
 expect(service.cancelRequest(auth,sid,first.id,{expected_version:3,reason:'stop'},'cancel')).toEqual(result);
});

it('RF06 all accept cannot fake required check success and failed fresh version preserves revealed',()=>{
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.required_checks',json('[\"reproduce\"]')),check_profiles=? WHERE space_id=?").run(JSON.stringify({reproduce:{config_sha256:'a'.repeat(64),verifier_actor_ids:[],description:'configured'}}),sid);
 const first=reveal(),s=services(),before=counts();
 expect(()=>s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:2},'bad-version')).toThrow(expect.objectContaining({code:'REVISION_CONFLICT'}));
 expect(()=>s.finalize.finalizeRequest(auth,sid,first.id,{expected_version:3},'pending')).toThrow(expect.objectContaining({code:'REVIEW_INCOMPLETE'}));
 expect(counts()).toEqual(before);expect(s.status.getStatus(auth,sid,first.id)).toMatchObject({phase:'revealed',verification_status:'pending'});
});
