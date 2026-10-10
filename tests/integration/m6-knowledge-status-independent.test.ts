import {afterEach,expect,it,vi} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,SearchService} from '@detuned/core';
import {DetunedClient,ClientProtocolError} from '@detuned/client';
import {isFindingsView,type CreateReviewSubmission,type ReviewPolicy,type ReviewRequestView} from '@detuned/protocol';

const cleanup:Array<()=>Promise<void>>=[];
afterEach(async()=>{vi.restoreAllMocks();while(cleanup.length)await cleanup.pop()!();});
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const claim={statement:'Independent knowledge claim',assumptions:['Synthetic fixture'],scope:'Local only',falsification_plan:'Read the counterexample'};
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Owned object absent');return v as Record<string,unknown>;};
const string=(v:unknown):string=>{if(typeof v!=='string')throw new Error('Owned string absent');return v;};
async function fixture(required=false){
 const dir=await mkdtemp(path.join(tmpdir(),'detuned-knowledge-independent-'));const db=new Database(path.join(dir,'forum.sqlite'));db.pragma('journal_mode=WAL');
 const token=bootstrapDatabase(db).adminToken!;const storage=new SqliteStorage(db);let milliseconds=Date.parse('2026-10-09T14:00:00.000Z');const clock={now:()=>new Date(milliseconds),nowIso:()=>new Date(milliseconds).toISOString()};
 const app=buildApp({storage,clock});cleanup.push(async()=>{await app.close();if(db.open)db.close();await rm(dir,{recursive:true,force:true});});await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw new Error('Owned listener absent');const url='http://127.0.0.1:'+address.port;
 let key=0;async function write(route:string,body:unknown,method='POST',ownedToken=token){milliseconds+=60000;const response=await fetch(url+'/api/v1'+route,{method,headers:{authorization:'Bearer '+ownedToken,'content-type':'application/json','idempotency-key':'knowledge-owned-'+ ++key},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});const payload:unknown=await response.json();if(!response.ok)throw new Error('Owned setup rejected '+response.status+' '+String(object(object(payload).error).code));return object(object(payload).data);}
 const sid=string(object((await write('/spaces',{slug:'knowledge-independent',objective:'Owned experiment',rules:[],review_policy:{...policy,required_checks:required?['local']:[]},check_profiles:required?{local:{verifier_actor_ids:[],config_sha256:'a'.repeat(64),description:'Pending only'}}:{}})).space).id);
 const tid=string(object((await write(`/spaces/${sid}/threads`,{title:'Owned knowledge'})).thread).id);
 const post=async(kind='claim')=>string(object((await write(`/spaces/${sid}/threads/${tid}/posts`,{kind,title:'Owned '+kind,summary:'Owned material',body:'Public body',structured:kind==='claim'?claim:{attempt:'Owned attempt',category:'test_failure',assumptions:[],tested_scope:'local',expected:'success',observed:'failure',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'No retained evidence',ruled_out:'No general exclusion',not_ruled_out:['Other variants'],retry_when:['New evidence']}})).post).id);
 const target=await post();const reviewers:Array<{id:string;token:string}>=[];
 for(const name of ['one','two','reader']){const id=string((await write('/admin/actors',{kind:'human',display_name:'Knowledge '+name})).id);await write(`/spaces/${sid}/memberships`,{actor_id:id,role:'observer',reviewer_eligible:name!=='reader',independence_group:'owned-'+name});const c=await write('/admin/credentials',{actor_id:id,allowed_space_ids:[sid],capabilities:name==='reader'?['read']:['read','write']});reviewers.push({id,token:string(c.token)});}
 const client=(ownedToken=token)=>new DetunedClient({baseUrl:url,token:ownedToken,timeoutMs:5000});
 const create=async(dependency?:string,revision=1)=>client().createReviewRequest(sid,{target_ref:{post_id:target,revision},dependency_refs:dependency?[{post_id:dependency,revision:1}]:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:reviewers.slice(0,2).map(r=>r.id),expected_policy_revision:storage.findSpaceById(sid)!.policy_revision,reproduction_instructions:'Owned independent HTTP recipe'},'request-'+ ++key);
 const submit=async(request:ReviewRequestView,index:number)=>{milliseconds+=60000;const c=client(reviewers[index]!.token),session=await c.createSession(sid,{client_name:'knowledge-independent',client_version:'1'});const body:CreateReviewSubmission={snapshot_sha256:request.snapshot_sha256,reviewer_session_id:session.data.id,completion_status:'complete',verdict:'accept',coverage:'SEALED_KNOWLEDGE_COVERAGE_'+index,checks_performed:'No external receipt',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Different actor and group'}};return c.submitReview(sid,request.id,body,'submit-'+ ++key);};
 const rows=()=>Object.fromEntries(['posts','post_revisions','relations','spaces','space_revisions','review_requests','review_request_versions','review_submissions','review_decisions','events','idempotency_records','subscriptions','consumers','delivery_batches'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
 const patch=async(body:Record<string,unknown>)=>write(`/spaces/${sid}`,{expected_revision:storage.findSpaceById(sid)!.current_revision,...body},'PATCH');
 const revise=async(id=target)=>write(`/spaces/${sid}/posts/${id}/revisions`,{expected_revision:storage.findPostById(id)!.current_revision,title:'Revised owned material',summary:'revision',body:'Later public body',structured:storage.getPostRevision(id,1)!.structured});
 return {dir,db,storage,clock,url,sid,tid,target,reviewers,token,client,write,post,create,submit,rows,patch,revise};
}

it('KN01 actual policy pointer survives pinned-only revision; missing, invalid and raw JSON policies fail safely without writes; disabled policy preserves round history',async()=>{
 const f=await fixture();expect((await f.client().getView(f.sid,'findings')).data[0]).toMatchObject({formal_review_status:'not_requested',formal_check_status:'not_requested',formal_review:null});
 await f.patch({pinned_refs:[]});expect(f.storage.findSpaceById(f.sid)).toMatchObject({current_revision:2,policy_revision:1});
 expect((await f.client().getView(f.sid,'findings')).data[0]!.formal_review_status).toBe('not_requested');
 const saved=f.db.prepare('SELECT review_policy FROM space_revisions WHERE space_id=? AND revision=1').get(f.sid) as {review_policy:string};
 for(const mode of ['missing','invalid','json']){
  if(mode==='missing')f.db.prepare('UPDATE spaces SET policy_revision=999 WHERE id=?').run(f.sid);else f.db.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=? AND revision=1').run(mode==='json'?'{bad':JSON.stringify({...policy,enabled:'yes'}),f.sid);
  const before=f.rows();await expect(f.client().getView(f.sid,'findings')).rejects.toMatchObject({code:'RESYNC_REQUIRED'});expect(f.rows()).toEqual(before);
  f.db.prepare('UPDATE spaces SET policy_revision=1 WHERE id=?').run(f.sid);f.db.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=? AND revision=1').run(saved.review_policy,f.sid);
 }
 await f.patch({review_policy:{...policy,enabled:false}});expect((await f.client().getView(f.sid,'findings')).data[0]).toMatchObject({formal_review_status:'not_enabled',formal_check_status:'not_enabled',formal_review:null});
 await f.patch({review_policy:policy});const r=await f.create();await f.patch({review_policy:{...policy,enabled:false}});const before=f.rows();expect((await f.client().getView(f.sid,'findings')).data[0]).toMatchObject({formal_review_status:'stale',formal_check_status:'not_required',formal_review:{request_id:r.id,target_revision:1,current_validity:'superseded'}});expect(f.rows()).toEqual(before);
});

it('KN02 real independent HTTP round accepted then latest cancellation/staleness supersedes it; frozen required checks stay pending',async()=>{
 const f=await fixture(),r=await f.create();await f.submit(r,0);await f.submit(r,1);await f.client().finalizeReviewRequest(f.sid,r.id,{expected_version:3},'owned-finalize');
 expect((await f.client().getView(f.sid,'findings')).data[0]).toMatchObject({formal_review_status:'accepted',formal_check_status:'not_required',formal_review:{request_id:r.id,target_revision:1,current_validity:'current'}});
 const next=await f.create();await f.client().cancelReviewRequest(f.sid,next.id,{expected_version:1,reason:'Owned cancellation'},'owned-cancel');expect((await f.client().getView(f.sid,'findings')).data[0]!.formal_review).toMatchObject({request_id:next.id,phase:'cancelled',round:2});
 const latest=await f.create();await f.revise();expect((await f.client().getView(f.sid,'findings')).data[0]).toMatchObject({revision:2,formal_review_status:'stale',formal_review:{request_id:latest.id,target_revision:1,current_validity:'superseded'}});
 expect(f.storage.findReviewDecisionByRequestId(r.id)).toMatchObject({outcome:'accepted'});
 const checks=await fixture(true),pending=await checks.create();await checks.submit(pending,0);await checks.submit(pending,1);await checks.patch({review_policy:policy,check_profiles:{}});expect((await checks.client().getView(checks.sid,'findings')).data[0]).toMatchObject({formal_check_status:'pending',formal_review:{request_id:pending.id,current_validity:'superseded'}});
});

it('KN03 ACL first, redacted dependency safe metadata and sealed absence; real second WAL connection commits during one outer view snapshot',async()=>{
 const f=await fixture(),dependency=await f.post('failure'),r=await f.create(dependency);await f.submit(r,0);
 const reader=f.client(f.reviewers[2]!.token);const subscription=await reader.subscribe(f.sid,{consumer_key:'owned-knowledge-ack',start:'beginning'});const consumerId=string(object(object(subscription.data).consumer).id);await reader.poll(f.sid,consumerId,{limit:50});expect(f.storage.findConsumerById(consumerId)!.ack_seq).toBe(0);
 const before=f.rows(),view=(await f.client(f.reviewers[2]!.token).getView(f.sid,'findings')).data;expect(JSON.stringify(view)).not.toContain('SEALED_KNOWLEDGE_COVERAGE');expect(f.rows()).toEqual(before);
 await f.write(`/spaces/${f.sid}/redactions`,{target_type:'post',target_id:dependency,reason:'Owned dependency redaction'});
 expect((await f.client().getView(f.sid,'findings')).data[0]!.formal_review).toMatchObject({current_validity:'invalidated',validity_reasons:['dependency_redacted']});
 f.storage.upsertMembership({...f.storage.getMembership(f.sid,f.reviewers[2]!.id)!,active:false});await expect(f.client(f.reviewers[2]!.token).getView(f.sid,'findings')).rejects.toMatchObject({code:'NOT_FOUND'});
 const g=await fixture();await g.post();const auth=new AuthService(g.storage,new CryptoHasher(),g.clock);const views=new SearchService(g.storage,auth);const second=new Database(path.join(g.dir,'forum.sqlite'));let commits=0;
 try{const original=g.storage.listPostReviewRequests.bind(g.storage);const spy=vi.spyOn(g.storage,'listPostReviewRequests').mockImplementation((...args)=>{if(!commits){second.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=? AND revision=1').run(JSON.stringify({...policy,enabled:false}),g.sid);commits++;}return original(...args);});
 const rowsBefore=g.rows();const result=views.getView(auth.authenticateToken(g.token),g.sid,'findings');expect(commits).toBe(1);expect(result.items).toHaveLength(2);if(!isFindingsView(result.items,g.sid))throw new Error('Owned findings absent');expect(result.items.every(item=>item.formal_review_status==='not_requested')).toBe(true);spy.mockRestore();
 const rowsAfter=g.rows();expect({...rowsAfter,space_revisions:rowsBefore.space_revisions}).toEqual(rowsBefore);const fresh=views.getView(auth.authenticateToken(g.token),g.sid,'findings').items;if(!isFindingsView(fresh,g.sid))throw new Error('Owned findings absent');expect(fresh.every(item=>item.formal_review_status==='not_enabled')).toBe(true);
 }finally{second.close();}
});

it('KN04 real HTTP/shared-client typed whole arrays versus separately labelled controlled bad transport responses',async()=>{
 const f=await fixture(),r=await f.create();const actual=await f.client().getView(f.sid,'findings');expect(actual.data).toHaveLength(1);expect(actual.data[0]!.formal_review).toMatchObject({request_id:r.id,space_id:f.sid,target_post_id:f.target});
 const failure=await f.post('failure');expect((await f.client().getView(f.sid,'failures')).data[0]).toMatchObject({post_id:failure,report_kind:'author_report',formal_review:null,formal_review_status:'not_requested'});
 const original=structuredClone(actual.data[0]!);const variants=[{...original,unexpected:true},{...original,formal_review_status:'accepted'},{...original,formal_review:{...original.formal_review!,space_id:'wrong-space'}},{...original,formal_review:{...original.formal_review!,target_post_id:'wrong-post'}},{...original,created_at:'not-a-date'}];
 // These mocks prove transport parsing only, independently of preceding real HTTP and SQLite evidence.
 for(const item of variants){const fakeFetch:typeof fetch=async()=>new Response(JSON.stringify({api_version:'1',request_id:'controlled-transport',data:[original,item]}),{status:200,headers:{'content-type':'application/json'}});const mock=vi.spyOn(globalThis,'fetch').mockImplementation(fakeFetch);try{const client=new DetunedClient({baseUrl:'http://controlled.invalid',timeoutMs:5000});await expect(client.getView(f.sid,'findings')).rejects.toBeInstanceOf(ClientProtocolError);}finally{mock.mockRestore();}}
});
