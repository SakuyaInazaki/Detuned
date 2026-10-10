import {it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService} from '@detuned/core';
import {ReviewModule,ReviewRequestService} from '@detuned/module-review';
import {isPostReviewRequestsPage,validateToolParams,type CreateReviewRequest} from '@detuned/protocol';
import {DetunedClient} from '@detuned/client';
const clock={now:()=>new Date('2026-10-09T00:00:00Z'),nowIso:()=> '2026-10-09T00:00:00.000Z'};
async function fixture(){
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;const storage=new SqliteStorage(db);const app=buildApp({storage,clock});await app.ready();const headers={authorization:`Bearer ${token}`};
 async function create(url:string,payload:Record<string,unknown>,key:string){const response=await app.inject({method:'POST',url,headers:{...headers,'idempotency-key':key},payload});expect(response.statusCode,response.body).toBe(201);return response.json<{data:Record<string,{id:string}>}>().data;}
 const space=(await create('/api/v1/spaces',{slug:'review-catalog',objective:'o',rules:[]},'space')).space;if(!space)throw Error('Missing space');const sid=space.id;
 const thread=(await create(`/api/v1/spaces/${sid}/threads`,{title:'t'},'thread')).thread;if(!thread)throw Error('Missing thread');
 const post=(await create(`/api/v1/spaces/${sid}/threads/${thread.id}/posts`,{kind:'claim',title:'c',summary:'s',body:'original',structured:{statement:'claim',assumptions:[],scope:'s',falsification_plan:'f'}},'post')).post;if(!post)throw Error('Missing post');const pid=post.id;
 for(const id of ['r1','r2']){storage.createActor({id,kind:'human',display_name:id,created_at:clock.nowIso(),disabled_at:null});storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});}
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.required_checks',json('[]')) WHERE space_id=?").run(sid);
 const h=new CryptoHasher(),authService=new AuthService(storage,h,clock),auth=authService.authenticateToken(token),ids=new CryptoIdGenerator();
 const service=new ReviewRequestService(storage,authService,new IdempotencyService(storage,h,clock),clock,ids,new ReviewModule(storage,h,clock,ids,authService));
 const req:CreateReviewRequest={target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['r1','r2'],expected_policy_revision:1,reproduction_instructions:'run'};
 for(let i=0;i<3;i++){const created=service.createRequest(auth,sid,req,'create'+i);if(i<2)service.cancelRequest(auth,sid,created.id,{expected_version:1,reason:'cancel'},'cancel'+i);}
 return {db,storage,app,sid,pid,headers,close:async()=>{await app.close();db.close();}};
}
it('RC01 real SQLite HTTP all-round seek keeps terminal history and full wire budget',async()=>{const f=await fixture();try{
 const endpoint=`/api/v1/spaces/${f.sid}/posts/${f.pid}/review-requests`;const first=await f.app.inject({method:'GET',url:endpoint+'?limit=2&max_bytes=4096',headers:f.headers});expect(first.statusCode,first.body).toBe(200);expect(Buffer.byteLength(first.body)).toBeLessThanOrEqual(4096);expect(first.headers['cache-control']).toBe('private, no-store');
 const wire=first.json<{data:unknown;meta:unknown}>();const page={data:wire.data,meta:wire.meta};if(!isPostReviewRequestsPage(page))throw Error('Invalid page');expect(page.data.map(r=>r.round)).toEqual([3,2]);expect(page.meta.truncated).toBe(false);expect(page.meta.next_cursor).not.toBeNull();
 const next=await f.app.inject({method:'GET',url:endpoint+'?limit=1&max_bytes=65536&cursor='+encodeURIComponent(page.meta.next_cursor!),headers:f.headers});expect(next.statusCode,next.body).toBe(200);expect(next.json<{data:{round:number;phase:string}[];meta:{next_cursor:null}}>().data).toMatchObject([{round:1,phase:'cancelled'}]);expect(next.json<{meta:{next_cursor:null}}>().meta.next_cursor).toBeNull();
 for(const query of ['unknown=x','limit=51','max_bytes=1','cursor=bad']){const bad=await f.app.inject({method:'GET',url:endpoint+'?'+query,headers:f.headers});expect(bad.statusCode).toBe(400);expect(bad.headers['cache-control']).toBe('private, no-store');}
 }finally{await f.close();}});
it('RC02 strict wholepage dates/order/meta and tool constraints reject malformed catalogs',()=>{
 const row={request_id:'r',snapshot_id:'s',space_id:'x',target_post_id:'p',round:2,target_revision:1,created_at:clock.nowIso(),phase:'collecting',verification_status:'pending',current_validity:'current',validity_reasons:[]};
 expect(isPostReviewRequestsPage({data:[row],meta:{truncated:false,next_cursor:null}})).toBe(true);
 for(const value of [{data:[row,row],meta:{truncated:false,next_cursor:null}},{data:[],meta:{truncated:false,next_cursor:'x'}},{data:[{...row,created_at:'bad'}],meta:{truncated:false,next_cursor:null}},{data:[row],meta:{truncated:true,next_cursor:null}}])expect(isPostReviewRequestsPage(value)).toBe(false);
 expect(validateToolParams('forum_read',{space_id:'x',kind:'review_requests',id:'p',limit:20,max_bytes:4096})).toBe(true);expect(validateToolParams('forum_read',{space_id:'x',kind:'review_requests',id:'p',limit:51})).toBe(false);
});
it('RC03 client directory query rejects before transport',async()=>{const client=new DetunedClient({baseUrl:'http://127.0.0.1:1'});await expect(client.getPostReviewRequests('s','p',{limit:51})).rejects.toMatchObject({code:'VALIDATION_ERROR'});});
