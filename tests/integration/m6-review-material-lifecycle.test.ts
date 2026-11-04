import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService} from '@detuned/core';
import {ReviewModule,ReviewRequestService} from '@detuned/module-review';
import {type CreateReviewRequest} from '@detuned/protocol';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,service:ReviewRequestService;
let token:string;
let auth:ReturnType<AuthService['authenticateToken']>,sid:string,pid:string,req:CreateReviewRequest;
const clock={now:()=>new Date('2026-10-09T00:00:00Z'),nowIso:()=> '2026-10-09T00:00:00.000Z'};
beforeEach(async()=>{

 db=new Database(':memory:');token=bootstrapDatabase(db).adminToken!;storage=new SqliteStorage(db);app=buildApp({storage,clock});await app.ready();
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


async function patch(url:string,payload:Record<string,unknown>,key:string){return app.inject({method:'PATCH',url,headers:{authorization:`Bearer ${token}`,'idempotency-key':key},payload});}
it('ML01 effective policy changes stale once but pinned-only does not',async()=>{
 const request=create();const current=storage.findSpaceById(sid)!;
 expect((await patch(`/api/v1/spaces/${sid}`,{expected_revision:current.current_revision,pinned_refs:[{post_id:pid,revision:1}]},'pin')).statusCode).toBe(200);
 expect(storage.findReviewRequestById(request.id)?.phase).toBe('collecting');
 const revision=storage.findSpaceById(sid)!.current_revision;
 expect((await patch(`/api/v1/spaces/${sid}`,{expected_revision:revision,rules:['Changed rules']},'rules')).statusCode).toBe(200);
 expect(storage.findReviewRequestById(request.id)).toMatchObject({phase:'stale',version:2});
 expect((db.prepare("SELECT count(*) n FROM events WHERE type='review.stale'").get() as {n:number}).n).toBe(1);
});
it('ML02 real post revision hook invalidates fixed snapshot in the same transaction',async()=>{
 const request=create();const r=await app.inject({method:'POST',url:`/api/v1/spaces/${sid}/posts/${pid}/revisions`,headers:{authorization:`Bearer ${token}`,'idempotency-key':'revise'},payload:{expected_revision:1,title:'claim',summary:'new',body:'Changed',structured:{statement:'claim',assumptions:['a'],scope:'s',falsification_plan:'f'}}});
 expect(r.statusCode,r.body).toBe(201);expect(storage.findReviewRequestById(request.id)).toMatchObject({phase:'stale',version:2});
});
it('ML03 stale event fault rolls back original rules mutation and request version',async()=>{
 const request=create(),space=storage.findSpaceById(sid)!,before=counts(),append=storage.appendEvent.bind(storage);
 const fault=vi.spyOn(storage,'appendEvent').mockImplementation((spaceId,event)=>{if(event.type==='review.stale')throw new Error('owned stale rollback');return append(spaceId,event);});
 const r=await patch(`/api/v1/spaces/${sid}`,{expected_revision:space.current_revision,rules:['attempted']},'rules-fault');fault.mockRestore();
 expect(r.statusCode).toBe(500);expect(storage.findSpaceById(sid)).toEqual(space);expect(storage.findReviewRequestById(request.id)).toMatchObject({phase:'collecting',version:1});expect(counts()).toEqual(before);
});

it('ML04 same policy content with fresh keys keeps collecting review current; mixed actual edits still stale it',async()=>{
 const created=await app.inject({method:'POST',url:`/api/v1/spaces/${sid}/review-requests`,headers:{authorization:`Bearer ${token}`,'idempotency-key':'noop-review'},payload:req});
 expect(created.statusCode,created.body).toBe(201);const request=created.json().data;
 const original=storage.getSpaceRevision(sid,1)!;
 const reversedPolicy=Object.fromEntries(Object.entries(original.review_policy).reverse());
 const unchanged=[{objective:original.objective},{rules:original.rules},{review_policy:reversedPolicy},{check_profiles:original.check_profiles},
  {pinned_refs:[{post_id:pid,revision:1}],objective:original.objective,rules:original.rules,review_policy:reversedPolicy,check_profiles:original.check_profiles}];
 const status=async()=>{const r=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/review-requests/${request.id}/status`,headers:{authorization:`Bearer ${token}`}});expect(r.statusCode,r.body).toBe(200);return r.json().data;};
 for(const [index,fields] of unchanged.entries()){
  const before=storage.findSpaceById(sid)!,body={expected_revision:before.current_revision,...fields},key='same-policy-'+index;
  const result=await patch(`/api/v1/spaces/${sid}`,body,key);expect(result.statusCode,result.body).toBe(200);
  expect(storage.findSpaceById(sid)).toMatchObject({current_revision:before.current_revision+1,policy_revision:1});
  expect(await status()).toMatchObject({phase:'collecting',current_validity:'current',validity_reasons:[]});
  const committed=counts();expect((await patch(`/api/v1/spaces/${sid}`,body,key)).statusCode).toBe(200);expect(counts()).toEqual(committed);
  expect((await patch(`/api/v1/spaces/${sid}`,body,key+'-stale-version')).statusCode).toBe(409);expect(counts()).toEqual(committed);
 }
 const current=storage.findSpaceById(sid)!;
 const changed=await patch(`/api/v1/spaces/${sid}`,{expected_revision:current.current_revision,objective:original.objective,rules:['A genuinely changed rule','Order matters']},'mixed-real-policy');
 expect(changed.statusCode,changed.body).toBe(200);expect(storage.findSpaceById(sid)).toMatchObject({current_revision:current.current_revision+1,policy_revision:current.current_revision+1});
 expect(await status()).toMatchObject({phase:'stale',current_validity:'superseded',validity_reasons:['policy_superseded']});
 const ordered=storage.findSpaceById(sid)!;
 expect((await patch(`/api/v1/spaces/${sid}`,{expected_revision:ordered.current_revision,rules:['Order matters','A genuinely changed rule']},'reordered-rules')).statusCode).toBe(200);
 expect(storage.findSpaceById(sid)!.policy_revision).toBe(ordered.current_revision+1);
 expect((db.prepare("SELECT count(*) n FROM events WHERE type='review.stale'").get() as {n:number}).n).toBe(1);
});
