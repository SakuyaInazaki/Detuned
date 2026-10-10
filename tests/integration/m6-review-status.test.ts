import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService,ReviewFinalizationService,ReviewStatusService} from '@detuned/module-review';
import {type CreateReviewRequest,type CreateReviewSubmission} from '@detuned/protocol';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,service:ReviewRequestService;
let adminToken:string;
let auth:ReturnType<AuthService['authenticateToken']>,sid:string,pid:string,req:CreateReviewRequest;
const clock={now:()=>new Date('2026-10-09T00:00:00Z'),nowIso:()=> '2026-10-09T00:00:00.000Z'};
beforeEach(async()=>{
 db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;adminToken=token;storage=new SqliteStorage(db);app=buildApp({storage,clock});await app.ready();
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
it('RV01 collecting status does not reveal evidence health or submitter, and uses frozen required checks',()=>{
 const first=create(),one=reviewer('r1');one.submission.submit(one.ctx,sid,first.id,body(first.snapshot_sha256,one.sessionId),'submit');
 const s=services(),status=s.status.getStatus(auth,sid,first.id);
 expect(status).toEqual({request_id:first.id,snapshot_id:first.snapshot_id,phase:'collecting',verification_status:'not_required',current_validity:'current',validity_reasons:[]});
 expect(Object.keys(status)).toHaveLength(6);expect(service.getRequest(auth,sid,first.id).changed_by).toBeNull();
 db.prepare("INSERT INTO space_revisions SELECT space_id,2,objective,rules,json_set(review_policy,'$.required_checks',json('[\"later\"]')),check_profiles,pinned_refs,editor_id,created_at FROM space_revisions WHERE space_id=? AND revision=1").run(sid);
 db.prepare('UPDATE spaces SET current_revision=2,policy_revision=2 WHERE id=?').run(sid);
 expect(s.status.getStatus(auth,sid,first.id)).toMatchObject({verification_status:'not_required',current_validity:'superseded',validity_reasons:['policy_superseded']});
});
it('RV02 real redaction makes safe status invalidated/stale, material reads still 410, current ACL still first',async()=>{
 const first=create(),s=services();
 const response=await app.inject({method:'POST',url:`/api/v1/spaces/${sid}/redactions`,headers:{authorization:`Bearer ${adminToken}`,'idempotency-key':'redact'},payload:{target_type:'post',target_id:pid,reason:'remove'}});
 expect(response.statusCode,response.body).toBe(201);
 expect(s.status.getStatus(auth,sid,first.id)).toMatchObject({phase:'stale',current_validity:'invalidated',validity_reasons:['target_redacted']});
 expect(()=>service.getSnapshot(auth,sid,first.snapshot_id)).toThrow(expect.objectContaining({code:'CONTENT_REDACTED'}));
});
it('RV03 snapshot metadata corruption is not reported as current and cannot be silently repaired',()=>{
 const first=create(),s=services();db.prepare("UPDATE snapshots SET manifest_sha256=? WHERE id=?").run('f'.repeat(64),first.snapshot_id);
 expect(()=>s.status.getStatus(auth,sid,first.id)).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED'}));
});
