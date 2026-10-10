import {afterEach,beforeEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {CryptoHasher} from '@detuned/core';
import {canonicalizeReviewJson,generateOpenApiSpec,isCheckRunView,isCheckSnapshotView,isCheckReceiptView,isRequiredChecksView,isCheckArtifactMetadata,type CheckRunView,type SubmitCheckReceipt} from '@detuned/protocol';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,dir:string,url:string,token:string,sid:string,pid:string,request:any,run:CheckRunView,verify:string;
const now='2026-10-10T00:00:00.000Z',clock={now:()=>new Date(now),nowIso:()=>now};
async function http(method:string,path:string,body?:unknown,key?:string,bearer=token){const response=await fetch(url+'/api/v1'+path,{method,headers:{authorization:'Bearer '+bearer,...(body!==undefined?{'content-type':'application/json'}:{}),...(key!==undefined?{'idempotency-key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:response.status,headers:response.headers,body:await response.json()};}
async function write(path:string,body:unknown,key:string,method='POST'){const r=await http(method,path,body,key);expect(r.status,JSON.stringify(r.body)).toBe(method==='POST'?201:200);return r.body.data;}
const base=()=>`/spaces/${encodeURIComponent(sid)}/check-runs/${encodeURIComponent(run.id)}`;
beforeEach(async()=>{
 db=new Database(':memory:');token=bootstrapDatabase(db).adminToken!;storage=new SqliteStorage(db);dir=await mkdtemp(join(tmpdir(),'detuned-check-http-'));app=buildApp({storage,clock,artifactBlobs:await ArtifactFileStore.create(dir)});url=await app.listen({host:'127.0.0.1',port:0});
 sid=(await write('/spaces',{slug:'check-http',objective:'o',rules:[]},'space')).space.id;
 const tid=(await write(`/spaces/${sid}/threads`,{title:'t'},'thread')).thread.id;
 pid=(await write(`/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'c',summary:'s',body:'fixed material',structured:{statement:'s',assumptions:[],scope:'s',falsification_plan:'f'}},'post')).post.id;
 // Identity fixtures only. All request/run/receipt/log transitions use genuine HTTP services.
 for(const id of ['http-r1','http-r2','http-verifier']){storage.createActor({id,kind:id==='http-verifier'?'service':'human',display_name:id,created_at:now,disabled_at:null});if(id!=='http-verifier')storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});}
 const rev=storage.getSpaceRevision(sid,1)!;await write(`/spaces/${sid}`,{expected_revision:1,review_policy:{...rev.review_policy,required_checks:['local']},check_profiles:{local:{verifier_actor_ids:['http-verifier'],config_sha256:'a'.repeat(64),description:'local'}}},'policy','PATCH');
 request=await write(`/spaces/${sid}/review-requests`,{target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['http-r1','http-r2'],expected_policy_revision:storage.findSpaceById(sid)!.policy_revision,reproduction_instructions:'run'},'request');
 run=await write(`/spaces/${sid}/check-runs`,{request_id:request.id,snapshot_id:request.snapshot_id,check_name:'local',verifier_id:'http-verifier',expected_request_version:request.version},'run');
 const issued=await http('POST',base()+'/credentials',{});expect(issued.status).toBe(201);expect(issued.headers.get('cache-control')).toBe('private, no-store');verify=issued.body.data.token;
});
afterEach(async()=>{await app.close();db.close();await rm(dir,{recursive:true,force:true});});
async function log(key='log',bytes='real bounded HTTP log'){const form=new FormData();form.append('file',new Blob([bytes],{type:'text/plain'}),'log.txt');form.append('metadata','{}');const response=await fetch(url+'/api/v1'+base()+'/artifacts',{method:'POST',headers:{authorization:'Bearer '+verify,'idempotency-key':key},body:form});expect(response.status,await response.clone().text()).toBe(201);return (await response.json()).data;}
function receipt(logId:string):SubmitCheckReceipt{return {receipt_id:'http-receipt',observed_snapshot_sha256:run.snapshot_sha256,observed_check_config_sha256:run.check_config_sha256,result:'pass',environment:'HTTP fixture',tool_versions:{node:'owned'},execution_steps:'bounded local fixture',started_at:now,finished_at:now,exit_code:0,logs_artifact_id:logId};}
it('CH01 real HTTP scoped reads, directory and streamed log/receipt replay preserve frozen identities',async()=>{
 const get=await http('GET',base(),undefined,undefined,verify);expect(get.status).toBe(200);expect(isCheckRunView(get.body.data,sid,run.id)).toBe(true);expect(get.body.data).not.toHaveProperty('created_request_version');
 const snapshot=await http('GET',base()+'/snapshot',undefined,undefined,verify);expect(snapshot.status).toBe(200);expect(isCheckSnapshotView(snapshot.body.data,sid,run.id)).toBe(true);expect(createHash('sha256').update(canonicalizeReviewJson(snapshot.body.data.manifest)).digest('hex')).toBe(snapshot.body.data.manifest_sha256);
 const post=await http('GET',base()+`/posts/${pid}/revisions/1`,undefined,undefined,verify);expect(post.status).toBe(200);expect(post.body.data.body).toBe('fixed material');
 const directory=await http('GET',`/spaces/${sid}/review-requests/${request.id}/check-runs`);expect(isRequiredChecksView(directory.body.data,sid,request.id)).toBe(true);expect(directory.body.data.checks).toEqual([{check_name:'local',run:get.body.data,receipt_id:null}]);
 const artifact=await log();expect(isCheckArtifactMetadata(artifact,sid,run.id)).toBe(true);const metadata=await http('GET',base()+'/artifacts/'+artifact.id,undefined,undefined,verify);expect(metadata.body.data).toEqual(artifact);
 const content=await fetch(url+artifact.content_url,{headers:{authorization:'Bearer '+verify}});expect(content.status).toBe(200);expect(await content.text()).toBe('real bounded HTTP log');
 expect(await log()).toEqual(artifact);const payload=receipt(artifact.id),submitted=await http('POST',base()+'/receipt',payload,'receipt',verify);expect(submitted.status).toBe(201);expect(isCheckReceiptView(submitted.body.data,sid,run.id)).toBe(true);expect((await http('POST',base()+'/receipt',payload,'receipt',verify)).body.data).toEqual(submitted.body.data);expect((await http('GET',base()+'/receipt',undefined,undefined,verify)).body.data).toEqual(submitted.body.data);
 const invalidated=await http('POST',base()+'/invalidate',{expected_version:2,reason:'explicit withdrawal'},'invalidate');expect(invalidated.status).toBe(200);expect(invalidated.body.data.state).toBe('invalidated');expect((await http('POST',base()+'/receipt',payload,'receipt',verify)).body.data).toEqual(submitted.body.data);
});
it('CH02 strict inputs and scope deny before new side effects, issuer rotation invalidates old token',async()=>{
 for(const path of [`/spaces/${sid}/review-requests/${request.id}/check-runs`,`/spaces/${sid}/review-requests/${request.id}/assignment`,`/spaces/${sid}`,`/spaces/${sid}/posts/${pid}`])expect((await http('GET',path,undefined,undefined,verify)).status).not.toBe(200);
 expect((await http('GET',base()+'?extra=1',undefined,undefined,verify)).status).toBe(400);
 for(const body of [{ttl_seconds:59},{ttl_seconds:86401},{unknown:1}])expect((await http('POST',base()+'/credentials',body)).status).toBe(400);
 expect((await http('POST',base()+'/credentials',{},'forbidden-key')).status).toBe(400);
 const issued=await http('POST',base()+'/credentials',{ttl_seconds:60});expect(issued.status).toBe(201);expect((await http('GET',base(),undefined,undefined,verify)).status).toBe(401);verify=issued.body.data.token;
 expect((await http('GET',base()+'/posts/outside/revisions/1',undefined,undefined,verify)).status).toBe(404);
 const artifact=await log();expect((await http('GET',`/spaces/${sid}/artifacts/${artifact.id}`,undefined,undefined,verify)).status).toBe(403);
 const payload=receipt(artifact.id);for(const body of [{...payload,extra:true},{...payload,exit_code:1},{...payload,environment:'界'.repeat(8000),execution_steps:'界'.repeat(16000)}])expect((await http('POST',base()+'/receipt',body,'bad',verify)).status).toBe(400);
 expect(storage.findCheckReceiptByRunId(run.id)).toBeNull();expect(storage.findCheckRunById(run.id)!.version).toBe(1);
});
it('CH03 whole DTO guards reject swapped scope, internal audit, inconsistent directory and foreign URL',async()=>{
 expect(isCheckRunView({...run,created_request_version:1},sid,run.id)).toBe(false);expect(isCheckRunView(run,'other',run.id)).toBe(false);expect(isCheckRunView({...run,version:2},sid,run.id)).toBe(false);
 // Clock regression is legal; request/run versions, not wall-clock order, carry causality.
 expect(isCheckRunView({...run,state:'invalidated',version:2,changed_at:'2026-10-09T23:59:59.000Z',invalidation_reason:'clock regression'},sid,run.id)).toBe(true);expect(isCheckRunView({...run,created_at:'2026-10-10'},sid,run.id)).toBe(false);
 const page=(await http('GET',`/spaces/${sid}/review-requests/${request.id}/check-runs`)).body.data;
 for(const bad of [{...page,extra:true},{...page,verification_status:'passed'},{...page,checks:[...page.checks,...page.checks]},{...page,checks:[{...page.checks[0],receipt_id:'forged'}]}])expect(isRequiredChecksView(bad,sid,request.id)).toBe(false);
 const artifact=await log();expect(isCheckArtifactMetadata({...artifact,content_url:'https://outside.test/log'},sid,run.id)).toBe(false);expect(isCheckArtifactMetadata(artifact,sid,'other')).toBe(false);
});
it('CH04 OpenAPI contains twelve scoped operations and credential issuance has no key header',()=>{
 const spec=generateOpenApiSpec();const paths=spec.paths;
 if(typeof paths!=='object'||paths===null||Array.isArray(paths))throw new Error('OpenAPI paths must be an object');
 const root='/spaces/{space_id}/check-runs',r=root+'/{run_id}';
 for(const path of [root,r,r+'/snapshot',r+'/posts/{post_id}/revisions/{revision}',r+'/credentials',r+'/receipt',r+'/invalidate',r+'/artifacts',r+'/artifacts/{id}',r+'/artifacts/{id}/content','/spaces/{space_id}/review-requests/{request_id}/check-runs'])expect(Object.hasOwn(paths,path)).toBe(true);
 const credentials=Reflect.get(paths,r+'/credentials');
 if(typeof credentials!=='object'||credentials===null)throw new Error('Missing credentials path');
 const post=Reflect.get(credentials,'post');if(typeof post!=='object'||post===null)throw new Error('Missing credentials operation');
 const parameters=Reflect.get(post,'parameters');if(!Array.isArray(parameters))throw new Error('Missing credentials parameters');
 expect(parameters.some(parameter=>typeof parameter==='object'&&parameter!==null&&Reflect.get(parameter,'name')==='Idempotency-Key')).toBe(false);
 const receipt=Reflect.get(paths,r+'/receipt');if(typeof receipt!=='object'||receipt===null)throw new Error('Missing receipt path');expect(Object.hasOwn(receipt,'post')).toBe(true);expect(Object.hasOwn(receipt,'get')).toBe(true);
});
it('CH05 controlled legal Unicode slash space ID preserves scoped URL and real log replay',async()=>{
 const revision=storage.getSpaceRevision(sid,storage.findSpaceById(sid)!.current_revision)!;const encoded='研究/space with gap';// Only identity is controlled; formal state is created through HTTP.
 storage.createSpace({id:encoded,slug:'encoded-http',current_revision:1,policy_revision:1,acl_epoch:1,created_at:now},{...revision,space_id:encoded,revision:1,editor_id:revision.editor_id,created_at:now});for(const id of ['http-r1','http-r2'])storage.upsertMembership({space_id:encoded,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});
 sid=encoded;const root='/spaces/'+encodeURIComponent(sid);const thread=(await write(root+'/threads',{title:'encoded'},'encoded-thread')).thread.id;
 pid=(await write(root+'/threads/'+thread+'/posts',{kind:'claim',title:'c',summary:'s',body:'material',structured:{statement:'s',assumptions:[],scope:'s',falsification_plan:'f'}},'encoded-post')).post.id;
 request=await write(root+'/review-requests',{target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['http-r1','http-r2'],expected_policy_revision:1,reproduction_instructions:'run'},'encoded-request');
 run=await write(root+'/check-runs',{request_id:request.id,snapshot_id:request.snapshot_id,check_name:'local',verifier_id:'http-verifier',expected_request_version:request.version},'encoded-run');verify=(await http('POST',base()+'/credentials',{})).body.data.token;
 const artifact=await log('encoded-log');expect(artifact.content_url).toContain(encodeURIComponent(encoded));expect(isCheckArtifactMetadata(artifact,sid,run.id)).toBe(true);expect(await log('encoded-log')).toEqual(artifact);const response=await fetch(url+artifact.content_url,{headers:{authorization:'Bearer '+verify}});expect(response.status).toBe(200);expect(await response.text()).toBe('real bounded HTTP log');
});
