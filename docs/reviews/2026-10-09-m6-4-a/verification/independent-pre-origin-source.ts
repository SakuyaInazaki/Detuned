import {afterEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {request as httpRequest,createServer,type IncomingHttpHeaders} from 'node:http';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,PostService,RedactionService,type BlobStorePort} from '@detuned/core';
import {buildApp} from '@detuned/server';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {DetunedClient,ClientProtocolError,UserAbortError} from '@detuned/client';
import type {ReviewPolicy,ReviewRequestView,CreateReviewSubmission,CreateReviewRequest} from '@detuned/protocol';

const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(cleanups.length)await cleanups.pop()!();});
class Clock {value=Date.parse('2026-10-09T12:00:00.000Z');now(){return new Date(this.value);}nowIso(){return this.now().toISOString();}tick(){this.value+=1000;}}
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const tables=['artifacts','snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','events','idempotency_records'];
interface Wire {status:number;headers:IncomingHttpHeaders;body:unknown}
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Owned HTTP fixture object absent.');return v as Record<string,unknown>;};
const text=(v:unknown):string=>{if(typeof v!=='string')throw new Error('Owned HTTP fixture string absent.');return v;};
const data=(r:Wire)=>object(object(r.body).data);
const code=(r:Wire)=>object(object(r.body).error).code;
async function error(run:()=>Promise<unknown>,expected:string,status?:number){let value:unknown;try{await run();}catch(e){value=e;}const e=value as {code?:unknown;statusCode?:unknown}|undefined;expect(e?.code).toBe(expected);if(status!==undefined)expect(e?.statusCode).toBe(status);}
async function wire(url:string,method:string,route:string,headers:Record<string,string>={},body?:unknown):Promise<Wire>{
 const bytes=body===undefined?undefined:JSON.stringify(body);
 return new Promise((resolve,reject)=>{
  const q=httpRequest(new URL(route,url),{method,headers:{...headers,...(bytes===undefined?{}:{'content-type':'application/json','content-length':String(Buffer.byteLength(bytes))})}},r=>{
   let raw='';r.setEncoding('utf8');r.on('data',b=>{raw+=String(b);});
   r.on('end',()=>{try{resolve({status:r.statusCode??0,headers:r.headers,body:raw?JSON.parse(raw):undefined});}catch{reject(new Error('Owned HTTP JSON decode failed.'));}});
  });
  q.on('error',()=>reject(new Error('Owned HTTP request failed.')));q.setTimeout(5000,()=>q.destroy());q.end(bytes);
 });
}
async function fixture(override:Partial<ReviewPolicy>={},web=false){
 const dir=await mkdtemp(path.join(tmpdir(),'detuned-review-http-independent-')),db=new Database(path.join(dir,'forum.sqlite'));db.pragma('journal_mode=WAL');const bootstrap=bootstrapDatabase(db);if(!bootstrap.adminToken)throw new Error('Owned bootstrap unavailable.');
 let closeApp:()=>Promise<void>=async()=>{};cleanups.push(async()=>{await closeApp();if(db.open)db.close();await rm(dir,{recursive:true,force:true});});
 const storage=new SqliteStorage(db),clock=new Clock(),hasher=new CryptoHasher(),ids=new CryptoIdGenerator(),auth=new AuthService(storage,hasher,clock),idem=new IdempotencyService(storage,hasher,clock);
 const sid='spc-http-review-owned',other='spc-http-review-other',tid='thd-http-review-owned';const actors={author:'act-http-author',one:'act-http-one',two:'act-http-two',reader:'act-http-reader',readonly:'act-http-readonly'};const tokens=new Map<string,string>();
 for(const [name,id] of Object.entries(actors)){const token=randomBytes(32).toString('hex');tokens.set(id,token);storage.createActor({id,kind:'human',display_name:id,created_at:clock.nowIso(),disabled_at:null});storage.createCredential({id:'cred-'+id,actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[sid,other],capabilities:name==='reader'||name==='readonly'?['read']:['read','write'],created_at:clock.nowIso(),expires_at:null,revoked_at:null});}
 for(const s of [sid,other]){storage.createSpace({id:s,slug:s,current_revision:1,policy_revision:1,acl_epoch:1,created_at:clock.nowIso()},{space_id:s,revision:1,objective:'Synthetic real HTTP review',rules:['Owned rule'],review_policy:{...policy,...override},check_profiles:{local:{verifier_actor_ids:[actors.reader],config_sha256:'a'.repeat(64),description:'No actual receipt'}},pinned_refs:[],editor_id:actors.author,created_at:clock.nowIso()});for(const [name,id] of Object.entries(actors))storage.upsertMembership({space_id:s,actor_id:id,role:name==='author'?'owner':'observer',active:true,reviewer_eligible:name==='one'||name==='two'||name==='readonly',independence_group:'group-'+name});}
 storage.createThread({id:tid,space_id:sid,title:'HTTP research fixture',version:1,state:'open',creator_id:actors.author,created_at:clock.nowIso(),updated_at:clock.nowIso()});
 const context=(actor=actors.author)=>auth.authenticateToken(tokens.get(actor)!);const posts=new PostService(storage,ids,clock,hasher,auth,idem),redact=new RedactionService(storage,ids,clock,auth,idem);
 const target=posts.createPost(context(),sid,tid,{kind:'claim',title:'HTTP owned target',summary:'Owned claim',body:'Owned public research body',structured:{statement:'Claim for independent HTTP verification',assumptions:['Synthetic'],scope:'local',falsification_plan:'counterexample'}},'owned-target').post;
 const blobs=await ArtifactFileStore.create(dir);let observe:(()=>void)|undefined;
 const port:BlobStorePort={stage:async(chunks,max,signal)=>{observe?.();observe=undefined;return blobs.stage(chunks,max,signal);},publish:(s,k)=>blobs.publish(s,k),discardStage:s=>blobs.discardStage(s),discardPublished:k=>blobs.discardPublished(k),exists:k=>blobs.exists(k),open:k=>blobs.open(k)};
 const opts={storage,clock,artifactBlobs:port};let app=buildApp(opts);closeApp=()=>app.close();await app.listen({host:'127.0.0.1',port:0});let address=app.server.address();if(!address||typeof address==='string')throw new Error('Owned listener absent.');const url='http://127.0.0.1:'+address.port;
 if(web){await app.close();app=buildApp({...opts,webOrigin:url,allowInsecureLoopback:true});await app.listen({host:'127.0.0.1',port:address.port});}
 const client=(actor=actors.author)=>new DetunedClient({baseUrl:url,token:tokens.get(actor),timeoutMs:5000});const admin=new DetunedClient({baseUrl:url,token:bootstrap.adminToken,timeoutMs:5000});
 const requestBody:CreateReviewRequest={target_ref:{post_id:target.id,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:[actors.one,actors.two],expected_policy_revision:1,reproduction_instructions:'Owned independent HTTP recipe'};
 const make=()=>client().createReviewRequest(sid,requestBody,'request-create');
 const counts=()=>Object.fromEntries(tables.map(t=>[t,(db.prepare('SELECT count(*) n FROM '+t).get() as {n:number}).n]));
 const revision=()=>posts.createRevision(context(),sid,target.id,{expected_revision:1,title:'Changed HTTP target',summary:'Changed',body:'Changed real material',structured:storage.getPostRevision(target.id,1)!.structured},'owned-revision');
 const member=(actor:string,active:boolean)=>storage.upsertMembership({...storage.getMembership(sid,actor)!,active});
 const prepare=async(r:ReviewRequestView,actor:string,refs:CreateReviewSubmission['evidence_refs']=[])=>{clock.tick();const s=await client(actor).createSession(sid,{client_name:'independent-http',client_version:'1'});return {snapshot_sha256:r.snapshot_sha256,reviewer_session_id:s.data.id,completion_status:'complete',verdict:'accept',coverage:'Full synthetic coverage',checks_performed:'No external check receipt',evidence_refs:refs,pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Separate ordinary group'}} satisfies CreateReviewSubmission;};
 const submit=async(r:ReviewRequestView,actor:string,refs:CreateReviewSubmission['evidence_refs']=[])=>client(actor).submitReview(sid,r.id,await prepare(r,actor,refs),'submit-'+actor);
 const reveal=async(r:ReviewRequestView)=>{await submit(r,actors.one);await submit(r,actors.two);};
 const raw=(actor:string|undefined,method:string,route:string,body?:unknown,headers:Record<string,string>={})=>wire(url,method,route,{...(actor?{authorization:'Bearer '+tokens.get(actor)}:{}),...headers},body);
 const artifactFiles=async()=>({stage:await readdir(path.join(dir,'artifacts/staging')),objects:await readdir(path.join(dir,'artifacts/objects'))});
 return {dir,db,storage,clock,hasher,sid,other,tid,actors,tokens,context,posts,redact,target,app,url,client,admin,requestBody,make,counts,revision,member,prepare,submit,reveal,raw,artifactFiles,watchStage:()=>new Promise<void>(resolve=>{observe=resolve;})};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
const route=(f:Fixture,id:string,suffix='')=>`/api/v1/spaces/${f.sid}/review-requests/${id}${suffix}`;

it('H01 real HTTP/shared-client twelve entrances preserve independent sessions, sealed rows, reveal and immutable exact replay',async()=>{
 const f=await fixture(),r=await f.make();expect(Object.hasOwn(r,'submitted_count')).toBe(false);expect((await f.client().getReviewSnapshot(f.sid,r.snapshot_id)).manifest_sha256).toBe(r.snapshot_sha256);
 const own=await f.client(f.actors.one).getOwnReviewAssignment(f.sid,r.id);expect(own).toMatchObject({request_id:r.id,reviewer_actor_id:f.actors.one,snapshot_sha256:r.snapshot_sha256});
 const file=new Blob(['Owned short private bytes'],{type:'text/plain'}),art=await f.client(f.actors.one).uploadReviewArtifact(f.sid,r.id,file,{},'private-upload');expect(art.visibility).toBe('review_assignment');
 const first=await f.client(f.actors.one).submitReview(f.sid,r.id,await f.prepare(r,f.actors.one,[{kind:'artifact',artifact_id:art.id}]),'first-review');
 expect((await f.client(f.actors.one).getReviewSubmission(f.sid,first.submission_id)).revealed_at).toBeNull();expect((await f.client(f.actors.two).listReviewSubmissions(f.sid,r.id)).submissions).toEqual([]);
 const hidden=await f.client(f.actors.reader).getReviewRequest(f.sid,r.id);expect(hidden).toMatchObject({submitted_count:1,changed_by:null});
 await f.submit(r,f.actors.two);expect((await f.client(f.actors.reader).listReviewSubmissions(f.sid,r.id)).submissions.map(s=>s.reviewer_actor_id)).toEqual([f.actors.one,f.actors.two]);
 const head=await f.client().getReviewRequest(f.sid,r.id),decision=await f.client().finalizeReviewRequest(f.sid,r.id,{expected_version:head.version},'finalize');expect(decision.outcome).toBe('accepted');expect(await f.client(f.actors.reader).getReviewDecision(f.sid,r.id)).toEqual(decision);expect((await f.client(f.actors.reader).getReviewStatus(f.sid,r.id)).verification_status).toBe('not_required');
 const before=f.counts();expect(await f.make()).toEqual(r);expect(await f.client().finalizeReviewRequest(f.sid,r.id,{expected_version:head.version},'finalize')).toEqual(decision);expect(await f.client(f.actors.one).uploadReviewArtifact(f.sid,r.id,file,{},'private-upload')).toEqual(art);expect(f.counts()).toEqual(before);
 // The twelfth cancel entrance has a separate still-collecting request, not an invalid accepted-phase cancellation.
 const second=await f.client().createReviewRequest(f.sid,{...f.requestBody,target_ref:{post_id:f.target.id,revision:1}},'another-round');const cancelled=await f.client().cancelReviewRequest(f.sid,second.id,{expected_version:second.version,reason:'Owned cancellation'},'cancel');expect(cancelled.phase).toBe('cancelled');const c=f.counts();expect(await f.client().cancelReviewRequest(f.sid,second.id,{expected_version:second.version,reason:'Owned cancellation'},'cancel')).toEqual(cancelled);expect(f.counts()).toEqual(c);
},30000);

it('H02 real authorization, strict carriers and cookie CSRF reject mutations while private reads and failures stay no-store',async()=>{
 const f=await fixture({},true),r=await f.make(),first=await f.submit(r,f.actors.one);const before=f.counts();
 const denied=await f.raw(undefined,'GET',route(f,r.id));expect(denied.status).toBe(401);expect(denied.headers['cache-control']).toBe('private, no-store');
 await error(()=>f.client(f.actors.reader).getReviewSubmission(f.sid,first.submission_id),'NOT_FOUND',404);await error(()=>f.admin.getReviewSubmission(f.sid,first.submission_id),'NOT_FOUND',404);
 expect((await f.admin.listReviewSubmissions(f.sid,r.id)).submissions).toEqual([]);await error(()=>f.client().getReviewRequest(f.other,r.id),'NOT_FOUND',404);
 const deniedBody:CreateReviewSubmission={snapshot_sha256:r.snapshot_sha256,reviewer_session_id:'ses-owned-readonly-denied',completion_status:'complete',verdict:'accept',coverage:'Owned complete coverage',checks_performed:'Owned checklist',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Owned group'}};await error(()=>f.client(f.actors.readonly).submitReview(f.sid,r.id,deniedBody,'readonly'),'FORBIDDEN',403);
 for(const [method,url,body] of [['POST',route(f,r.id,'/cancel'),{expected_version:r.version,unknown:true}],['GET',route(f,r.id)+'?unknown=1',undefined],['POST',route(f,r.id,'/submissions'),{snapshot_sha256:r.snapshot_sha256,actor_id:f.actors.one}]] as const){const x=await f.raw(f.actors.author,method,url,body,{'idempotency-key':'strict-denied'});expect(x.status).toBe(400);expect(x.headers['cache-control']).toBe('private, no-store');}
 const forged=new FormData();forged.append('metadata',JSON.stringify({visibility:'space',review_assignment_id:'forged'}));forged.append('file',new Blob(['not admitted']),'own.txt');const forgedResponse=await fetch(f.url+route(f,r.id,'/artifacts'),{method:'POST',headers:{authorization:'Bearer '+f.tokens.get(f.actors.one),'idempotency-key':'forged-scope'},body:forged});expect(forgedResponse.status).toBe(400);await forgedResponse.arrayBuffer();expect(f.counts()).toEqual(before);
 const login=await wire(f.url,'POST','/auth/session',{origin:f.url,authorization:'Bearer '+f.tokens.get(f.actors.author)});expect(login.status).toBe(201);const cookie=login.headers['set-cookie']?.[0]?.split(';')[0];if(!cookie)throw new Error('Owned cookie absent.');const csrf=text(data(login).csrf_token);
 const get=await wire(f.url,'GET',route(f,r.id),{cookie});expect(get.status).toBe(200);expect(get.headers['cache-control']).toBe('private, no-store');
 const noCsrf=await wire(f.url,'POST',route(f,r.id,'/cancel'),{cookie,origin:f.url,'idempotency-key':'cookie-cancel'},{expected_version:2,reason:'Owned cookie cancellation'});console.info(JSON.stringify({checkpoint:'H02-cookie-csrf-rejection',status:noCsrf.status,cache_control:noCsrf.headers['cache-control']}));expect(noCsrf.status).toBe(403);expect(noCsrf.headers['cache-control']).toBe('private, no-store');expect(f.counts()).toEqual(before);
 const accepted=await wire(f.url,'POST',route(f,r.id,'/cancel'),{cookie,origin:f.url,'x-detuned-csrf':csrf,'idempotency-key':'cookie-cancel'},{expected_version:2,reason:'Owned cookie cancellation'});expect(accepted.status).toBe(200);expect(accepted.headers['cache-control']).toBe('private, no-store');
 expect((await wire(f.url,'DELETE','/auth/session',{cookie,origin:f.url,'x-detuned-csrf':csrf})).status).toBe(204);
},30000);

it('H03 revealed cancellation preserves only explicitly cited private evidence and redaction remains private to ordinary reads',async()=>{
 const f=await fixture(),r=await f.make(),blob=new Blob(['Original owned evidence'],{type:'text/plain'});
 const cited=await f.client(f.actors.one).uploadReviewArtifact(f.sid,r.id,blob,{},'cited'),unused=await f.client(f.actors.one).uploadReviewArtifact(f.sid,r.id,new Blob(['unused'],{type:'text/plain'}),{},'unused');
 const first=await f.submit(r,f.actors.one,[{kind:'artifact',artifact_id:cited.id}]);await error(()=>f.client(f.actors.reader).downloadArtifact(f.sid,cited.id),'NOT_FOUND',404);await f.submit(r,f.actors.two);const current=await f.client().getReviewRequest(f.sid,r.id);await f.client().cancelReviewRequest(f.sid,r.id,{expected_version:current.version,reason:'Cancel after reveal'},'after-reveal');
 expect((await f.client(f.actors.reader).listReviewSubmissions(f.sid,r.id)).submissions).toHaveLength(2);const downloaded=await f.client(f.actors.reader).downloadArtifact(f.sid,cited.id);expect(f.hasher.sha256(Buffer.from(downloaded.bytes))).toBe(cited.sha256);expect(downloaded.bytes.byteLength).toBe(cited.bytes);await error(()=>f.client(f.actors.reader).getArtifact(f.sid,unused.id),'NOT_FOUND',404);
 const metadata=await f.raw(f.actors.reader,'GET',`/api/v1/spaces/${f.sid}/artifacts/${cited.id}`);expect(metadata.headers['cache-control']).toBe('private, no-store');f.redact.createRedaction(f.context(),f.sid,{target_type:'artifact',target_id:cited.id,reason:'Owned genuine redaction'},'redact');
 await error(()=>f.client(f.actors.reader).getReviewSubmission(f.sid,first.submission_id),'CONTENT_REDACTED',410);expect((await f.client(f.actors.reader).getReviewStatus(f.sid,r.id)).current_validity).toBe('invalidated');
 const sealed=await fixture(),s=await sealed.make();await sealed.submit(s,sealed.actors.one);await sealed.client().cancelReviewRequest(sealed.sid,s.id,{expected_version:2,reason:'Cancel sealed'},'sealed-cancel');expect((await sealed.client(sealed.actors.reader).listReviewSubmissions(sealed.sid,s.id)).submissions).toEqual([]);const stale=await fixture(),old=await stale.make();await stale.submit(old,stale.actors.one);stale.revision();expect((await stale.client(stale.actors.reader).listReviewSubmissions(stale.sid,old.id)).submissions).toEqual([]);
},30000);

it('H04 real stale/incomplete/version/check-required failures and revoked authority preserve historical response boundaries',async()=>{
 const f=await fixture(),r=await f.make();const before=f.counts();await error(()=>f.client().finalizeReviewRequest(f.sid,r.id,{expected_version:99},'wrong-version'),'REVISION_CONFLICT',409);await error(()=>f.client().finalizeReviewRequest(f.sid,r.id,{expected_version:1},'not-ready'),'REVIEW_INCOMPLETE',409);expect(f.counts()).toEqual(before);
 f.revision();const stale=f.counts(),staleBody=await f.prepare(r,f.actors.one);await error(()=>f.client(f.actors.one).submitReview(f.sid,r.id,staleBody,'stale-submit'),'SNAPSHOT_STALE',409);const afterSession=f.counts();expect({...afterSession}).toEqual(stale); // counts intentionally exclude ordinary sessions.
 f.member(f.actors.author,false);await error(()=>f.make(),'NOT_FOUND',404);
 const pending=await fixture({required_checks:['local']}),p=await pending.make();await pending.reveal(p);const c=pending.counts();await error(()=>pending.client().finalizeReviewRequest(pending.sid,p.id,{expected_version:3},'cannot-invent-check'),'REVIEW_INCOMPLETE',409);expect(pending.counts()).toEqual(c);expect((await pending.client().getReviewStatus(pending.sid,p.id)).verification_status).toBe('pending');
},30000);

function streamUpload(f:Fixture,r:ReviewRequestView,actor:string,key:string){
 const boundary='owned-independent-boundary',head=`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="owned.txt"\r\nContent-Type: text/plain\r\n\r\n`,tail=`\r\n--${boundary}--\r\n`;
 let req!:ReturnType<typeof httpRequest>;
 const done=new Promise<Wire>(resolve=>{req=httpRequest(new URL(route(f,r.id,'/artifacts'),f.url),{method:'POST',headers:{authorization:'Bearer '+f.tokens.get(actor),'idempotency-key':key,'content-type':'multipart/form-data; boundary='+boundary}},res=>{let raw='';res.setEncoding('utf8');res.on('data',b=>{raw+=String(b);});res.on('end',()=>{let body:unknown;try{body=raw?JSON.parse(raw):undefined;}catch{body=undefined;}resolve({status:res.statusCode??0,headers:res.headers,body});});});req.on('error',()=>resolve({status:0,headers:{},body:undefined}));req.setTimeout(5000,()=>req.destroy());req.write(head+'owned first chunk');});
 return {done,finish:()=>req.end(tail),abort:()=>req.destroy()};
}
it('H05 actual multipart stream races revalidate current membership/material, abort cleanly and drain without committing',async()=>{
 for(const change of ['membership','revision','abort','drain'] as const){const f=await fixture(),r=await f.make();const before=f.counts(),files=await f.artifactFiles(),entered=f.watchStage(),stream=streamUpload(f,r,f.actors.one,'stream-'+change);await entered;
  if(change==='membership'){f.member(f.actors.one,false);stream.finish();const result=await stream.done;expect(result.status).toBe(404);expect(code(result)).toBe('NOT_FOUND');}
  else if(change==='revision'){f.revision();const mutation=f.counts();stream.finish();const result=await stream.done;expect(result.status).toBe(409);expect(code(result)).toBe('SNAPSHOT_STALE');expect(f.counts()).toEqual(mutation);}
  else if(change==='abort'){stream.abort();expect((await stream.done).status).toBe(0);await f.app.close();}
  else{await f.app.close();expect((await stream.done).status).toBe(0);}
  if(change!=='revision')expect(f.counts()).toEqual(before);expect(await f.artifactFiles()).toEqual(files);expect(f.app.runtimeResources.activeCount).toBe(0);
 }
 const f=await fixture(),r=await f.make(),denied=streamUpload(f,r,f.actors.reader,'nonmember-stream');denied.finish();expect((await denied.done).status).toBe(403);expect((await f.artifactFiles()).stage).toEqual([]);
},30000);

it('H06 controlled bad HTTP responses cannot substitute ID/parent/date/unknown fields or exceed bounded JSON; abort stays explicit',async()=>{
 const f=await fixture(),r=await f.make();const good=await f.client().getReviewRequest(f.sid,r.id),assignment=await f.client(f.actors.one).getOwnReviewAssignment(f.sid,r.id);let mode='good';let admitted:(()=>void)|undefined;
 const server=createServer((req,res)=>{admitted?.();admitted=undefined;if(mode==='wait')return;let value:unknown=req.url?.endsWith('/assignment')?assignment:good;
  if(mode==='id')value={...good,id:'wrong-request'};if(mode==='parent')value={...assignment,request_id:'wrong-parent'};if(mode==='date')value={...good,created_at:'2026-02-30T12:00:00.000Z'};if(mode==='unknown')value={...good,unrecognized:true};
  res.writeHead(200,{'content-type':'application/json'});res.end((mode==='bytes'?' '.repeat(1048577):'')+JSON.stringify({api_version:'1',request_id:'owned-response',data:value}));
 });await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const a=server.address();if(!a||typeof a==='string')throw new Error('Owned controlled listener absent.');const client=new DetunedClient({baseUrl:'http://127.0.0.1:'+a.port,timeoutMs:5000});
 try{expect(await client.getReviewRequest(f.sid,r.id)).toEqual(good);for(const next of ['id','date','unknown','bytes']){mode=next;let caught:unknown;try{await client.getReviewRequest(f.sid,r.id);}catch(e){caught=e;}expect(caught instanceof ClientProtocolError).toBe(true);}mode='parent';await expect(client.getOwnReviewAssignment(f.sid,r.id)).rejects.toBeInstanceOf(ClientProtocolError);
  mode='wait';const arrived=new Promise<void>(resolve=>{admitted=resolve;}),controller=new AbortController(),pending=client.getReviewRequest(f.sid,r.id,{signal:controller.signal});const observed=pending.catch(e=>e);await arrived;controller.abort();expect(await observed instanceof UserAbortError).toBe(true);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
},30000);
