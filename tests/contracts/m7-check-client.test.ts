import { afterEach, expect, it, vi } from 'vitest';
import { DetunedClient, ClientProtocolError, UserAbortError, RequestKeyError } from '@detuned/client';
import { canonicalizeReviewJson, type SubmitCheckReceipt, type ReviewSnapshotManifestData } from '@detuned/protocol';
import type { RequestKeyScope } from '../../packages/client/src/request-key.js';

// Controlled transport contracts; real HTTP/SQLite authorization is D's independent suite.
const date='2026-10-10T00:00:00Z', hash='a'.repeat(64), space='space/ 空', runId='run/ 空', artifactId='log/ 空';
const root=`http://checks.invalid/api/v1/spaces/${encodeURIComponent(space)}`;
const runPath=`${root}/check-runs/${encodeURIComponent(runId)}`;
const run={id:runId,space_id:space,request_id:'request',snapshot_id:'snapshot',snapshot_sha256:hash,check_name:'check',attempt:1,verifier_actor_id:'verifier',check_config_sha256:hash,state:'pending',version:1,created_by:'admin',created_at:date,changed_by:'admin',changed_at:date,invalidation_reason:null};
const receiptInput:SubmitCheckReceipt={receipt_id:'receipt',observed_snapshot_sha256:hash,observed_check_config_sha256:hash,result:'pass',environment:'local',tool_versions:{checker:'1'},execution_steps:'fixed check',started_at:date,finished_at:date,exit_code:0,logs_artifact_id:artifactId};
const receipt={...receiptInput,space_id:space,check_run_id:runId,verifier_actor_id:'verifier',received_at:date,run_version:2};
const post={space_id:space,check_run_id:runId,post_id:'post/ 空',revision:2,title:'title',summary:'summary',body:'body',tags:[],structured:{},content_hash:hash,editor_id:'author',created_at:date};
const response=(data:unknown)=>new Response(JSON.stringify({api_version:'1',request_id:'transport',data}),{headers:{'content-type':'application/json'}});
const client=()=>new DetunedClient({baseUrl:'http://checks.invalid',token:'controlled-verify',maxRetries:0});
async function sha(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)),x=>x.toString(16).padStart(2,'0')).join('');}
const metadata=(digest:string,bytes:number)=>({id:artifactId,space_id:space,owner_id:'verifier',visibility:'space',sha256:digest,bytes,mime:'text/plain',state:'ready',created_at:date,content_url:`/api/v1/spaces/${encodeURIComponent(space)}/check-runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/content`});
afterEach(()=>vi.unstubAllGlobals());

it('MC01 run/fixed-post wrappers encode targets and reject whole-object scope, history and revision corruption',async()=>{
 const seen:string[]=[];vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>{seen.push(String(url));return response(String(url).includes('/posts/')?post:run);}));
 const c=client();expect(await c.getCheckRun(space,runId)).toEqual(run);expect(await c.getCheckPostRevision(space,runId,post.post_id,2)).toEqual(post);
 expect(seen).toEqual([runPath,`${runPath}/posts/${encodeURIComponent(post.post_id)}/revisions/2`]);
 for(const value of [{...run,id:'other'},{...run,space_id:'other'},{...run,created_request_version:1},{...run,changed_at:'2026-02-31T00:00:00Z'},{...run,state:'invalidated'}]){
  vi.stubGlobal('fetch',vi.fn(async()=>response(value)));await expect(c.getCheckRun(space,runId)).rejects.toBeInstanceOf(ClientProtocolError);
 }
 vi.stubGlobal('fetch',vi.fn(async()=>response({...post,revision:1})));await expect(c.getCheckPostRevision(space,runId,post.post_id,2)).rejects.toBeInstanceOf(ClientProtocolError);
});

it('MC02 snapshot computes actual shared JCS SHA and rejects changed payload, hash, scope and illegal Unicode',async()=>{
 const manifest:ReviewSnapshotManifestData={manifest_version:1,space_id:space,target:{ref:{post_id:'post',revision:1},content_hash:hash,statement:'claim',assumptions:[],scope:'scope',falsification_plan:'falsify'},dependencies:[],artifacts:[],code_refs:[],rules_revision:1,policy_revision:1,review_policy:{enabled:true,required_reviewers:1,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:false,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false},check_profiles:[],contributors:['author'],reproduction_instructions:'fixed'};
 const view={snapshot_id:'snapshot',space_id:space,check_run_id:runId,manifest,manifest_sha256:await sha(new TextEncoder().encode(canonicalizeReviewJson(manifest))),created_by:'admin',created_at:date};
 const c=client();vi.stubGlobal('fetch',vi.fn(async()=>response(view)));expect(await c.getCheckSnapshot(space,runId)).toEqual(view);
 for(const value of [{...view,manifest_sha256:hash},{...view,manifest:{...manifest,reproduction_instructions:'changed'}},{...view,check_run_id:'other'},{...view,manifest:{...manifest,reproduction_instructions:'\ud800'}},{...view,extra:true}]){
  vi.stubGlobal('fetch',vi.fn(async()=>response(value)));await expect(c.getCheckSnapshot(space,runId)).rejects.toBeInstanceOf(ClientProtocolError);
 }
});

it('MC03 directory preserves nulls and rejects a bad later item, duplicate/order/status and cross-request fields',async()=>{
 const directory={space_id:space,request_id:'request',snapshot_id:'snapshot',request_version:2,verification_status:'pending',checks:[{check_name:'a',run:null,receipt_id:null},{check_name:'check',run,receipt_id:null}]};
 const c=client();const fetcher=vi.fn(async(_url:unknown)=>response(directory));vi.stubGlobal('fetch',fetcher);expect(await c.getRequiredChecks(space,'request')).toEqual(directory);expect(String(fetcher.mock.calls[0]?.[0])).toBe(`${root}/review-requests/request/check-runs`);
 for(const value of [{...directory,checks:[directory.checks[0],{...directory.checks[1],run:{...run,request_id:'other'}}]},{...directory,checks:[directory.checks[0],directory.checks[0]]},{...directory,checks:[directory.checks[1],directory.checks[0]]},{...directory,verification_status:'passed'},{...directory,checks:[{check_name:'a',run:null,receipt_id:'receipt'}]},{...directory,checks:Array(33).fill(directory.checks[0])}]){
  vi.stubGlobal('fetch',vi.fn(async()=>response(value)));await expect(c.getRequiredChecks(space,'request')).rejects.toBeInstanceOf(ClientProtocolError);
 }
});

it('MC04 issuer rejects any key options before HTTP and never retries plaintext issuance',async()=>{
 const fetcher=vi.fn(async()=>new Response(JSON.stringify({api_version:'1',error:{code:'TEMPORARILY_UNAVAILABLE',message:'retry'}}),{status:503,headers:{'content-type':'application/json','retry-after':'0'}}));vi.stubGlobal('fetch',fetcher);
 const c=new DetunedClient({baseUrl:'http://checks.invalid',maxRetries:4});
 for(const opts of [{requestKey:'key'},{request_key:'key'},{logicalOperationId:undefined}])await expect(c.issueCheckRunCredential(space,runId,{},opts as never)).rejects.toBeInstanceOf(ClientProtocolError);
 await expect(c.issueCheckRunCredential(space,runId,{request_key:'key'} as never)).rejects.toBeInstanceOf(ClientProtocolError);expect(fetcher).not.toHaveBeenCalled();
 await expect(c.issueCheckRunCredential(space,runId)).rejects.toBeDefined();expect(fetcher).toHaveBeenCalledTimes(1);
 const issued={credential_id:'cred',token:'once-only-controlled',expires_at:date};vi.stubGlobal('fetch',vi.fn(async(url:unknown,init:RequestInit)=>{expect(String(url)).toBe(`${runPath}/credentials`);expect(new Headers(init.headers).has('idempotency-key')).toBe(false);return response(issued);}));expect(await c.issueCheckRunCredential(space,runId,{ttl_seconds:60})).toEqual(issued);
});

it('MC05 receipt auto-key is per call, stable across retry, with no identity discovery and response input binding',async()=>{
 const keys:string[]=[];let attempt=0;vi.stubGlobal('fetch',vi.fn(async(url:unknown,init:RequestInit)=>{expect(String(url)).toBe(`${runPath}/receipt`);keys.push(new Headers(init.headers).get('idempotency-key')!);if(attempt++===0)return new Response(JSON.stringify({api_version:'1',error:{code:'TEMPORARILY_UNAVAILABLE',message:'retry'}}),{status:503,headers:{'content-type':'application/json','retry-after':'0'}});return response(receipt);}));
 const c=new DetunedClient({baseUrl:'http://checks.invalid',maxRetries:1});expect(await c.submitCheckReceipt(space,runId,receiptInput)).toEqual(receipt);expect(await c.submitCheckReceipt(space,runId,receiptInput)).toEqual(receipt);expect(keys[0]).toBe(keys[1]);expect(keys[2]).not.toBe(keys[1]);
 for(const value of [{...receipt,check_run_id:'other'},{...receipt,observed_snapshot_sha256:'b'.repeat(64)},{...receipt,environment:'changed'},{...receipt,result:'pass',exit_code:1},{...receipt,private:true}]){
  vi.stubGlobal('fetch',vi.fn(async()=>response(value)));await expect(c.submitCheckReceipt(space,runId,receiptInput,'explicit')).rejects.toBeInstanceOf(ClientProtocolError);
 }
 vi.stubGlobal('fetch',vi.fn(async()=>response(receipt)));expect(await c.getCheckReceipt(space,runId)).toEqual(receipt);
});

it('MC06 verify logicalOperationId fails before Blob snapshot, HTTP or persistent identity preparation',async()=>{
 let sliced=0;class ObservedBlob extends Blob {override slice(start?:number,end?:number,contentType?:string){sliced++;return super.slice(start,end,contentType);}}
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const store={getOrCreate:vi.fn()};const c=new DetunedClient({baseUrl:'http://checks.invalid',requestKeyStore:store});
 for(const logicalOperationId of ['intent',undefined]){
  await expect(c.uploadCheckArtifact(space,runId,new ObservedBlob(['data']),{},undefined,{logicalOperationId} as never)).rejects.toBeInstanceOf(RequestKeyError);
  await expect(Promise.resolve().then(()=>c.submitCheckReceipt(space,runId,receiptInput,undefined,{logicalOperationId} as never))).rejects.toBeInstanceOf(RequestKeyError);
 }
 expect(sliced).toBe(0);expect(fetcher).not.toHaveBeenCalled();expect(store.getOrCreate).not.toHaveBeenCalled();
});

it('MC07 scoped upload and download share immutable retries, exact encoded path and integrity checks',async()=>{
 const bytes=new TextEncoder().encode('run log'),meta=metadata(await sha(bytes),bytes.length);const forms:FormData[]=[],keys:string[]=[];let upload=0;const paths:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:unknown,init:RequestInit)=>{paths.push(String(url));if(init.method==='POST'){forms.push(init.body as FormData);keys.push(new Headers(init.headers).get('idempotency-key')!);if(upload++===0)return new Response(JSON.stringify({api_version:'1',error:{code:'TEMPORARILY_UNAVAILABLE',message:'retry'}}),{status:503,headers:{'content-type':'application/json','retry-after':'0'}});return response(meta);}if(String(url).endsWith('/content')){expect(init.redirect).toBe('error');return new Response(bytes,{headers:{'content-length':String(bytes.length),'content-type':'text/plain'}});}return response(meta);}));
 const c=new DetunedClient({baseUrl:'http://checks.invalid',maxRetries:1});expect(await c.uploadCheckArtifact(space,runId,new Blob([bytes],{type:'text/plain'}),{},'log-key')).toEqual(meta);expect(forms[0]).not.toBe(forms[1]);expect(keys).toEqual(['log-key','log-key']);for(const form of forms)expect(await (form.get('file') as Blob).text()).toBe('run log');
 expect((await c.downloadCheckArtifact(space,runId,artifactId)).bytes).toEqual(bytes);expect(paths.at(-1)).toBe(`http://checks.invalid${meta.content_url}`);
 for(const content_url of ['https://hostile.invalid/log',`/api/v1/spaces/${encodeURIComponent(space)}/artifacts/${encodeURIComponent(artifactId)}/content`,meta.content_url.replace('/check-runs/','/wrong/')]){
  const mocked=vi.fn(async()=>response({...meta,content_url}));vi.stubGlobal('fetch',mocked);await expect(c.downloadCheckArtifact(space,runId,artifactId)).rejects.toBeInstanceOf(ClientProtocolError);expect(mocked).toHaveBeenCalledTimes(1);
 }
 vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/content')?new Response(new TextEncoder().encode('bad log'),{headers:{'content-length':String(bytes.length),'content-type':'text/plain'}}):response(meta)));await expect(c.downloadCheckArtifact(space,runId,artifactId)).rejects.toBeInstanceOf(ClientProtocolError);
});

it('MC08 download abort disposes late response body and rejects declared size/MIME/EOF mismatches',async()=>{
 const bytes=new TextEncoder().encode('log'),meta=metadata(await sha(bytes),bytes.length),c=client();
 for(const result of [()=>new Response(bytes,{headers:{'content-length':'4','content-type':'text/plain'}}),()=>new Response(bytes,{headers:{'content-length':'3','content-type':'application/octet-stream'}}),()=>new Response(bytes.slice(0,2),{headers:{'content-length':'3','content-type':'text/plain'}})]){
  vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/content')?result():response(meta)));await expect(c.downloadCheckArtifact(space,runId,artifactId)).rejects.toBeInstanceOf(ClientProtocolError);
 }
 let finish!:(value:Response)=>void,cancelled=0,disposed!:()=>void;const disposal=new Promise<void>(resolve=>{disposed=resolve;});const ac=new AbortController();vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>{if(!String(url).endsWith('/content'))return response(meta);ac.abort();return new Promise<Response>(resolve=>{finish=resolve;});}));
 const pending=c.downloadCheckArtifact(space,runId,artifactId,{signal:ac.signal});await expect(pending).rejects.toBeInstanceOf(UserAbortError);finish(new Response(new ReadableStream({cancel(){cancelled++;disposed();}})));await disposal;expect(cancelled).toBe(1);
});

it('MC09 ordinary create/invalidate retain persistent target scope and original key on controlled body conflict',async()=>{
 const scopes:RequestKeyScope[]=[],keyByScope=new Map<string,string>(),bodyByKey=new Map<string,string>(),keys:string[]=[];let me=0;
 const store={async getOrCreate(scope:RequestKeyScope,intent:string){scopes.push(scope);const id=JSON.stringify([scope,intent]);let key=keyByScope.get(id);if(!key){key=`persistent-${keyByScope.size}`;keyByScope.set(id,key);}return key;}};
 vi.stubGlobal('fetch',vi.fn(async(url:unknown,init:RequestInit)=>{
  if(String(url).endsWith('/me')){me++;return response({actor:{id:'admin'}});}
  const key=new Headers(init.headers).get('idempotency-key')!,body=JSON.parse(String(init.body));keys.push(key);const previous=bodyByKey.get(key);
  if(previous!==undefined&&previous!==String(init.body))return new Response(JSON.stringify({api_version:'1',request_id:'transport',error:{code:'IDEMPOTENCY_CONFLICT',message:'changed body',retryable:false}}),{status:409,headers:{'content-type':'application/json'}});
  bodyByKey.set(key,String(init.body));return response(String(url).endsWith('/invalidate')?{...run,state:'invalidated',version:2,invalidation_reason:body.reason}:{...run,request_id:body.request_id});
 }));
 const c=new DetunedClient({baseUrl:'http://checks.invalid',maxRetries:0,requestKeyStore:store}),body={request_id:'request',snapshot_id:'snapshot',check_name:'check',verifier_id:'verifier',expected_request_version:1};
 expect(await c.createCheckRun(space,body,undefined,{logicalOperationId:'create'})).toEqual(run);
 expect(await c.createCheckRun(space,body,undefined,{logicalOperationId:'create'})).toEqual(run);
 await expect(c.createCheckRun(space,{...body,expected_request_version:2},undefined,{logicalOperationId:'create'})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 expect((await c.createCheckRun(space,{...body,request_id:'other-request'},undefined,{logicalOperationId:'create'})).request_id).toBe('other-request');
 expect((await c.invalidateCheckRun(space,runId,{expected_version:1,reason:'new issue'},undefined,{logicalOperationId:'invalidate'})).state).toBe('invalidated');
 expect(keys[0]).toBe(keys[1]);expect(keys[2]).toBe(keys[0]);expect(keys[3]).not.toBe(keys[0]);expect(keys[4]).not.toBe(keys[0]);
 expect(scopes.map(s=>[s.operation,s.target])).toEqual([['check.run.create','request'],['check.run.create','request'],['check.run.create','request'],['check.run.create','other-request'],['check.run.invalidate',runId]]);expect(me).toBe(5);
});
