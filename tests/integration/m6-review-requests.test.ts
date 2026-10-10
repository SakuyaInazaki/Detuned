import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService} from '@detuned/core';
import {ReviewModule,ReviewRequestService} from '@detuned/module-review';
import {CancelReviewRequestSchema,ToolReviewCancelOpSchema,DETUNED_TOOLS,type CreateReviewRequest} from '@detuned/protocol';
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
it('RR01 fixed assignment/version and compact replay survive cancellation and later policy changes',()=>{
 const first=create(),afterCreate=counts();expect(first.reviewer_actor_ids).toEqual(['r1','r2']);expect(first.phase).toBe('collecting');expect(create()).toEqual(first);expect(counts()).toEqual(afterCreate);
 const cancelled=service.cancelRequest(auth,sid,first.id,{expected_version:1,reason:'stop'},'cancel');expect(cancelled).toMatchObject({version:2,phase:'cancelled',reason:'stop'});
 db.prepare("INSERT INTO space_revisions SELECT space_id,2,objective,rules,json_set(review_policy,'$.enabled',json('false')),check_profiles,pinned_refs,editor_id,created_at FROM space_revisions WHERE space_id=? AND revision=1").run(sid);
 db.prepare('UPDATE spaces SET current_revision=2,policy_revision=2 WHERE id=?').run(sid);
 const stable=counts();expect(create()).toEqual(first);expect(service.cancelRequest(auth,sid,first.id,{expected_version:1,reason:'stop'},'cancel')).toEqual(cancelled);expect(counts()).toEqual(stable);
 expect(service.getRequest(auth,sid,first.id)).toEqual({...cancelled,submitted_count:0});expect(()=>create('fresh')).toThrow(expect.objectContaining({code:'REVISION_CONFLICT'}));
 const refs=db.prepare("SELECT result_ref FROM idempotency_records WHERE operation LIKE 'review.request.%'").all() as {result_ref:string}[];expect(refs).toHaveLength(2);for(const row of refs){expect(JSON.parse(row.result_ref)).toMatchObject({v:1,manifest_sha256:first.snapshot_sha256});expect(row.result_ref).not.toContain('statement');}
});
it('RR02 qualification, payload conflict, expected-version and fresh cancelled action reject without mutation',()=>{
 req.reviewer_actor_ids=['r1',auth.actor.id];expect(()=>create()).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));expect(counts().review_requests).toBe(0);req.reviewer_actor_ids=['r1','r2'];
 const first=create();req.reproduction_instructions='changed';expect(()=>create()).toThrow(expect.objectContaining({statusCode:409}));req.reproduction_instructions='run';
 expect(()=>service.cancelRequest(auth,sid,first.id,{expected_version:2,reason:'stop'},'badversion')).toThrow(expect.objectContaining({code:'REVISION_CONFLICT'}));
 service.cancelRequest(auth,sid,first.id,{expected_version:1,reason:'stop'},'cancel');expect(()=>service.cancelRequest(auth,sid,first.id,{expected_version:2,reason:'again'},'freshcancel')).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
});
it('RR03 every write and typed result roll back when event append fails; next fresh round remains contiguous',()=>{
 const before=counts(),append=vi.spyOn(storage,'appendEvent').mockImplementation(()=>{throw new Error('controlled transaction failure');});expect(()=>create()).toThrow('controlled transaction failure');expect(counts()).toEqual(before);append.mockRestore();
 const one=create(),two=create('second');expect([one.round,two.round]).toEqual([1,2]);expect(counts().snapshots).toBe(2);expect(counts().review_assignments).toBe(4);
});
it('RR04 historical material reads stay detached but redaction and revoked credential gate replay',()=>{
 const first=create(),snap=service.getSnapshot(auth,sid,first.snapshot_id);snap.manifest.target.assumptions.push('local');expect(service.getSnapshot(auth,sid,first.snapshot_id).manifest.target.assumptions).toEqual(['a']);
 db.prepare('UPDATE posts SET current_revision=2 WHERE id=?').run(pid);expect(create()).toEqual(first);expect(service.getSnapshot(auth,sid,first.snapshot_id).manifest.target.ref.revision).toBe(1);
 db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(pid);expect(()=>create()).toThrow(expect.objectContaining({code:'CONTENT_REDACTED'}));expect(()=>service.getSnapshot(auth,sid,first.snapshot_id)).toThrow(expect.objectContaining({code:'CONTENT_REDACTED'}));
 db.prepare('UPDATE credentials SET revoked_at=? WHERE id=?').run(clock.nowIso(),auth.credential.id);expect(()=>service.getRequest(auth,sid,first.id)).toThrow(expect.objectContaining({code:'UNAUTHENTICATED'}));
});
it('RR05 persisted manifest/hash/items and compact references fail safely instead of restoring corrupt material',()=>{
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.distinct_independence_groups',json('true')) WHERE space_id=?").run(sid);
 const first=create(),snapshot=storage.findReviewSnapshotById(first.snapshot_id)!;
 db.prepare("UPDATE review_assignments SET reviewer_actor_id=? WHERE request_id=? AND reviewer_actor_id='r1'").run(auth.actor.id,first.id);
 expect(()=>service.getRequest(auth,sid,first.id)).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED',statusCode:409}));expect(()=>create()).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED',statusCode:409}));
 db.prepare("UPDATE review_assignments SET reviewer_actor_id='r1' WHERE request_id=? AND reviewer_actor_id=?").run(first.id,auth.actor.id);
 db.prepare("UPDATE review_assignments SET group_at_assignment='r2' WHERE request_id=? AND reviewer_actor_id='r1'").run(first.id);expect(()=>create()).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED',statusCode:409}));
 db.prepare("UPDATE review_assignments SET group_at_assignment='  ' WHERE request_id=? AND reviewer_actor_id='r1'").run(first.id);expect(()=>service.getRequest(auth,sid,first.id)).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED',statusCode:409}));
 db.prepare("UPDATE review_assignments SET group_at_assignment='r1' WHERE request_id=? AND reviewer_actor_id='r1'").run(first.id);
 db.prepare("UPDATE snapshots SET manifest_json='{}' WHERE id=?").run(first.snapshot_id);expect(()=>service.getSnapshot(auth,sid,first.snapshot_id)).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED'}));
 db.prepare('UPDATE snapshots SET manifest_json=? WHERE id=?').run(snapshot.manifest_json,first.snapshot_id);
 db.prepare("UPDATE snapshot_items SET sha256=? WHERE snapshot_id=? AND item_type='target_post'").run('b'.repeat(64),first.snapshot_id);expect(()=>create()).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED'}));
 db.prepare("UPDATE snapshot_items SET sha256=? WHERE snapshot_id=? AND item_type='target_post'").run(JSON.parse(snapshot.manifest_json).target.content_hash,first.snapshot_id);
 db.prepare("UPDATE idempotency_records SET result_ref=json_set(result_ref,'$.unexpected','private') WHERE operation='review.request.create'").run();expect(()=>create()).toThrow(expect.objectContaining({code:'RESYNC_REQUIRED',statusCode:409}));
});
it('RR06 requester-only cancellation, current membership and reopened immutable history retain their authority',()=>{
 const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);
 storage.createActor({id:'other',kind:'human',display_name:'other',created_at:clock.nowIso(),disabled_at:null});
 storage.upsertMembership({space_id:sid,actor_id:'other',role:'contributor',active:true,reviewer_eligible:false,independence_group:null});
 storage.createCredential({id:'other-credential',actor_id:'other',token_hash:hasher.sha256('owned-other'),allowed_space_ids:[sid],capabilities:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});
 const other=as.authenticateToken('owned-other');
 expect(()=>service.createRequest(other,sid,req,'other-create')).toThrow(expect.objectContaining({code:'FORBIDDEN'}));
 const first=create();
 // Being target author later is not authority to cancel someone else's request.
 db.prepare('UPDATE posts SET author_id=? WHERE id=?').run('other',pid);
 expect(()=>service.cancelRequest(other,sid,first.id,{expected_version:1,reason:'stop'},'other-cancel')).toThrow(expect.objectContaining({code:'FORBIDDEN'}));
 storage.upsertMembership({...storage.getMembership(sid,'other')!,role:'maintainer'});
 const cancelled=service.cancelRequest(other,sid,first.id,{expected_version:1,reason:'maintenance'},'maintenance');expect(cancelled.changed_by).toBe('other');
 const reopened=new Database(db.serialize());
 try{const ss=new SqliteStorage(reopened),aa=new AuthService(ss,hasher,clock),builder=new ReviewModule(ss,hasher,clock,new CryptoIdGenerator(),aa),rr=new ReviewRequestService(ss,aa,new IdempotencyService(ss,hasher,clock),clock,new CryptoIdGenerator(),builder);
  expect(rr.getRequest(other,sid,first.id)).toEqual({...cancelled,submitted_count:0});expect(rr.getSnapshot(other,sid,first.snapshot_id).manifest_sha256).toBe(first.snapshot_sha256);
  expect(rr.cancelRequest(other,sid,first.id,{expected_version:1,reason:'maintenance'},'maintenance')).toEqual(cancelled);
  ss.upsertMembership({...ss.getMembership(sid,'other')!,active:false});expect(()=>rr.getRequest(other,sid,first.id)).toThrow(expect.objectContaining({code:'NOT_FOUND',statusCode:404}));
 }finally{reopened.close();}
});

it('RR07 active cancel tool derives the strict DTO without placing transport keys in its body',()=>{
 const body={expected_version:1,reason:'stop'},tool={space_id:'s',request_key:'k',op:'cancel',request_id:'r',...body};
 expect(Value.Check(CancelReviewRequestSchema,body)).toBe(true);expect(Value.Check(ToolReviewCancelOpSchema,tool)).toBe(true);
 const {expected_version:ignored,...missing}=tool;void ignored;expect(Value.Check(ToolReviewCancelOpSchema,missing)).toBe(false);
 expect(Value.Check(ToolReviewCancelOpSchema,{...tool,reason:'  '})).toBe(false);
 expect(Value.Check(CancelReviewRequestSchema,{...body,request_key:'k'})).toBe(false);
 expect(ToolReviewCancelOpSchema.properties.expected_version).toBe(CancelReviewRequestSchema.properties.expected_version);
 expect(ToolReviewCancelOpSchema.properties.reason).toBe(CancelReviewRequestSchema.properties.reason);
 expect(DETUNED_TOOLS.map(t=>t.name)).toContain('forum_review');
});
