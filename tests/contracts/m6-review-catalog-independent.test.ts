import {spawn} from 'node:child_process';
import {ReviewPostCatalogService,ReviewStatusService} from '@detuned/module-review';
import {afterEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {request as httpRequest,createServer,type IncomingHttpHeaders} from 'node:http';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,PostService,RedactionService,HmacTokenSigner,type BlobStorePort} from '@detuned/core';
import {buildApp} from '@detuned/server';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {DetunedClient,ClientProtocolError,UserAbortError} from '@detuned/client';
import {isPostReviewRequestsPage,type ReviewPolicy,type ReviewRequestView,type CreateReviewSubmission,type CreateReviewRequest,type PostReviewRequestsPage} from '@detuned/protocol';

const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(cleanups.length)await cleanups.pop()!();});
class Clock {value=Date.parse('2026-10-09T12:00:00.000Z');now(){return new Date(this.value);}nowIso(){return this.now().toISOString();}tick(){this.value+=1000;}}
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const tables=['artifacts','snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','events','idempotency_records'];
interface Wire {status:number;headers:IncomingHttpHeaders;body:unknown;bytes:number}
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
   r.on('end',()=>{try{resolve({status:r.statusCode??0,headers:r.headers,body:raw?JSON.parse(raw):undefined,bytes:Buffer.byteLength(raw)});}catch{reject(new Error('Owned HTTP JSON decode failed.'));}});
  });
  q.on('error',()=>reject(new Error('Owned HTTP request failed.')));q.setTimeout(5000,()=>q.destroy());q.end(bytes);
 });
}
async function fixture(override:Partial<ReviewPolicy>={},web=false){
 const dir=await mkdtemp(path.join(tmpdir(),'detuned-review-catalog-independent-')),db=new Database(path.join(dir,'forum.sqlite'));db.pragma('journal_mode=WAL');const bootstrap=bootstrapDatabase(db);if(!bootstrap.adminToken)throw new Error('Owned bootstrap unavailable.');
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


const endpoint=(f:Fixture,post=f.target.id,space=f.sid)=>`/api/v1/spaces/${space}/posts/${post}/review-requests`;
async function rounds(f:Fixture,n:number,dependencies:CreateReviewRequest['dependency_refs']=[]) {
 const result:ReviewRequestView[]=[];
 for(let i=0;i<n;i++){f.clock.value+=60000;const r=await f.client().createReviewRequest(f.sid,{...f.requestBody,dependency_refs:dependencies},'catalog-create-'+i);result.push(r);if(i<n-1)await f.client().cancelReviewRequest(f.sid,r.id,{expected_version:1,reason:'Owned terminal round'},'catalog-cancel-'+i);}
 return result;
}
function page(r:Wire):PostReviewRequestsPage {const root=object(r.body),value={data:root.data,meta:root.meta};if(!isPostReviewRequestsPage(value))throw new Error('Owned real catalog shape invalid.');return value;}
function secret(f:Fixture){return text(object(f.db.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get()).value);}
async function cli(f:Fixture,args:string[]){const tokenPath=path.join(f.dir,'ordinary-token');await writeFile(tokenPath,f.tokens.get(f.actors.author)!,{mode:0o600});return new Promise<{status:number|null;out:string;err:string}>((resolve,reject)=>{const child=spawn(process.execPath,['packages/cli/dist/index.js','--url',f.url,'--token-file',tokenPath,'--json',...args],{env:{PATH:process.env.PATH,CI:'1'}});let out='',err='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Owned catalog CLI deadline.'));},10000);child.stdout.on('data',b=>out+=String(b));child.stderr.on('data',b=>err+=String(b));child.stdin.end();child.once('error',()=>{clearTimeout(timer);reject(new Error('Owned catalog CLI start failed.'));});child.once('close',status=>{clearTimeout(timer);resolve({status,out,err});});});}

it('DC01 real multi-round seek and whole UTF8 envelope budget retain all history across byte trimming, tools and CLI',async()=>{
 const f=await fixture();await rounds(f,14);const before=f.counts();const seen:number[]=[];let cursor:string|undefined;let cuts=0;
 do{const r=await f.raw(f.actors.author,'GET',endpoint(f)+'?limit=14&max_bytes=4096'+(cursor?'&cursor='+encodeURIComponent(cursor):''));expect(r.status).toBe(200);expect(r.bytes).toBeLessThanOrEqual(4096);expect(r.headers['cache-control']).toBe('private, no-store');const p=page(r);if(p.meta.truncated)cuts++;seen.push(...p.data.map(row=>row.round));cursor=p.meta.next_cursor??undefined;}while(cursor);
 expect(seen).toEqual(Array.from({length:14},(_,i)=>14-i));expect(cuts).toBeGreaterThan(0);expect(new Set(seen).size).toBe(14);expect(f.counts()).toEqual(before);
 const first=await f.client().getPostReviewRequests(f.sid,f.target.id,{limit:1,max_bytes:65536});expect(first.meta.truncated).toBe(false);expect(first.meta.next_cursor!==null).toBe(true);
 const next=await f.client().getPostReviewRequests(f.sid,f.target.id,{limit:3,max_bytes:4096,cursor:first.meta.next_cursor!});expect(next.data.map(r=>r.round)).toEqual([13,12,11]);
 const viaTool=await f.client().callTool('forum_read',{space_id:f.sid,kind:'review_requests',id:f.target.id,limit:2,max_bytes:4096});expect(viaTool).toEqual(await f.client().getPostReviewRequests(f.sid,f.target.id,{limit:2,max_bytes:4096}));
 const command=await cli(f,['review','rounds',f.sid,f.target.id,'--limit','2','--max-bytes','4096']);expect(command.status).toBe(0);expect(isPostReviewRequestsPage(JSON.parse(command.out))).toBe(true);expect(object(JSON.parse(command.out)).data).toEqual(first.data.concat(next.data.slice(0,1)));
 const service=new ReviewPostCatalogService(f.storage,new AuthService(f.storage,f.hasher,f.clock),new ReviewStatusService(f.storage,new AuthService(f.storage,f.hasher,f.clock)),new HmacTokenSigner(),secret(f),f.clock);
 expect(()=>service.getRequests(f.context(),f.sid,f.target.id,{max_bytes:4096},{request_id:'研究🧪'.repeat(1000)})).toThrowError(expect.objectContaining({code:'QUERY_TOO_BROAD',statusCode:422}));
},30000);

it('DC02 signed actor/space/post/secret/purpose/sort/expiry domains and current ACL are checked on every real continuation; safe redacted status is not material',async()=>{
 const f=await fixture();const dependency=f.posts.createPost(f.context(),f.sid,f.tid,{kind:'note',title:'Dependency',summary:'Owned',body:'Private fixture dependency'},'dependency').post;const requests=await rounds(f,3,[{post_id:dependency.id,revision:1}]);const latest=requests.at(-1);if(!latest)throw new Error('Owned collecting request absent.');const evidence=await f.client(f.actors.one).uploadReviewArtifact(f.sid,latest.id,new Blob(['Owned sealed evidence'],{type:'text/plain'}),{},'catalog-sealed-upload');await f.submit(latest,f.actors.one,[{kind:'artifact',artifact_id:evidence.id}]);const first=await f.client().getPostReviewRequests(f.sid,f.target.id,{limit:1});const cursor=first.meta.next_cursor!;const signer=new HmacTokenSigner(),payload=object(signer.verify(cursor,secret(f),Math.floor(f.clock.now().getTime()/1000)));
 for(const bad of [cursor.slice(0,-1)+(cursor.endsWith('A')?'B':'A'),signer.sign({...payload,purpose:'other'},secret(f)),signer.sign({...payload,sort:'round_asc'},secret(f)),signer.sign({...payload,space_id:f.other},secret(f)),signer.sign({...payload,post_id:dependency.id},secret(f)),signer.sign(payload,'owned-different-instance-secret')])await error(()=>f.client().getPostReviewRequests(f.sid,f.target.id,{cursor:bad}),'VALIDATION_ERROR',400);
 await error(()=>f.client(f.actors.reader).getPostReviewRequests(f.sid,f.target.id,{cursor}),'VALIDATION_ERROR',400);await error(()=>f.client().getPostReviewRequests(f.other,f.target.id,{cursor}),'NOT_FOUND',404);await error(()=>f.client().getPostReviewRequests(f.sid,dependency.id,{cursor}),'VALIDATION_ERROR',400);
 f.clock.value+=5000;const continued=await f.client().getPostReviewRequests(f.sid,f.target.id,{limit:1,cursor});expect(object(signer.verify(continued.meta.next_cursor!,secret(f),Math.floor(f.clock.now().getTime()/1000))).exp).toBe(payload.exp);
 f.member(f.actors.author,false);await error(()=>f.client().getPostReviewRequests(f.sid,f.target.id,{cursor}),'NOT_FOUND',404);f.member(f.actors.author,true);
 f.redact.createRedaction(f.context(),f.sid,{target_type:'post',target_id:dependency.id,reason:'Owned real dependency redaction'},'dependency-redaction');const safe=await f.client().getPostReviewRequests(f.sid,f.target.id,{});expect(safe.data.every(r=>r.validity_reasons.includes('dependency_redacted'))).toBe(true);
 const expected=['request_id','snapshot_id','space_id','target_post_id','round','target_revision','created_at','phase','verification_status','current_validity','validity_reasons'].sort();for(const row of safe.data)expect(Object.keys(row).sort()).toEqual(expected);
 f.clock.value=(Number(payload.exp)+1)*1000;await error(()=>f.client().getPostReviewRequests(f.sid,f.target.id,{cursor}),'VALIDATION_ERROR',400);
 f.redact.createRedaction(f.context(),f.sid,{target_type:'post',target_id:f.target.id,reason:'Owned real target redaction'},'target-redaction');await error(()=>f.client().getPostReviewRequests(f.sid,f.target.id,{}),'CONTENT_REDACTED',410);
},30000);

it('DC03 real cookie early Origin errors, strict query errors and successful directory reads remain private/no-store with zero DB side effects',async()=>{
 const f=await fixture({},true);await rounds(f,2);const before=f.counts();const login=await wire(f.url,'POST','/auth/session',{origin:f.url,authorization:'Bearer '+f.tokens.get(f.actors.author)});expect(login.status).toBe(201);const cookie=login.headers['set-cookie']?.[0]?.split(';')[0];if(!cookie)throw new Error('Owned cookie absent.');
 const denied=await wire(f.url,'GET',endpoint(f),{cookie,origin:'http://owned-other-origin.invalid'});expect(denied.status).toBe(403);expect(denied.headers['cache-control']).toBe('private, no-store');
 for(const suffix of ['?unknown=x','?limit=0','?limit=51','?max_bytes=4095','?cursor=']){const r=await wire(f.url,'GET',endpoint(f)+suffix,{cookie});expect(r.status).toBe(400);expect(r.headers['cache-control']).toBe('private, no-store');}
 const good=await wire(f.url,'GET',endpoint(f),{cookie});expect(good.status).toBe(200);expect(page(good).data).toHaveLength(2);expect(good.headers['cache-control']).toBe('private, no-store');expect(f.counts()).toEqual(before);
},30000);

it('DC04 controlled transport invalid pages are rejected without conflating them with backend results and abort remains explicit',async()=>{
 const f=await fixture();await rounds(f,2);const good=await f.client().getPostReviewRequests(f.sid,f.target.id,{limit:2});let mode='good';let arrived:(()=>void)|undefined;
 const server=createServer((req,res)=>{arrived?.();arrived=undefined;if(mode==='wait')return;let value:unknown=good;const row=good.data[0]!;
  if(mode==='parent')value={...good,data:[{...row,space_id:f.other}]};if(mode==='post')value={...good,data:[{...row,target_post_id:'other-post'}]};if(mode==='date')value={...good,data:[{...row,created_at:'2026-02-30T00:00:00.000Z'}]};if(mode==='extra')value={...good,data:[{...row,opinion:'sealed private text'}]};if(mode==='order')value={...good,data:[...good.data].reverse()};if(mode==='duplicate')value={...good,data:[row,row]};if(mode==='emptyCursor')value={data:[],meta:{truncated:false,next_cursor:'bad'}};if(mode==='meta')value={...good,meta:{truncated:true,next_cursor:null}};
  res.writeHead(200,{'content-type':'application/json'});res.end((mode==='bytes'?' '.repeat(1048577):'')+JSON.stringify({api_version:'1',request_id:'controlled-catalog',...object(value)}));
 });await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Owned controlled listener absent.');const client=new DetunedClient({baseUrl:'http://127.0.0.1:'+address.port,timeoutMs:5000});
 try{expect(await client.getPostReviewRequests(f.sid,f.target.id,{limit:2})).toEqual(good);for(const next of ['parent','post','date','extra','order','duplicate','emptyCursor','meta','bytes']){mode=next;await expect(client.getPostReviewRequests(f.sid,f.target.id,{limit:2})).rejects.toBeInstanceOf(ClientProtocolError);}mode='good';await expect(client.getPostReviewRequests(f.sid,f.target.id,{limit:1})).rejects.toBeInstanceOf(ClientProtocolError);
  mode='wait';const reached=new Promise<void>(resolve=>{arrived=resolve;}),controller=new AbortController(),pending=client.getPostReviewRequests(f.sid,f.target.id,{},{signal:controller.signal}).catch(e=>e);await reached;controller.abort();expect(await pending instanceof UserAbortError).toBe(true);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
},30000);
