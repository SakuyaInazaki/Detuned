import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetunedClient, ClientProtocolError, UserAbortError } from '@detuned/client';
import { validateRequestKeyScope, type RequestKeyScope } from '../../packages/client/src/request-key.js';
const date='2026-10-09T00:00:00Z', hash='a'.repeat(64);
const status={request_id:'request',snapshot_id:'snapshot',phase:'collecting',verification_status:'not_required',current_validity:'current',validity_reasons:[]};
const decision={id:'decision',request_id:'request',actor_id:'actor',snapshot_sha256:hash,review_ids:['submission'],check_receipt_ids:[],outcome:'accepted',rationale:'complete',request_version:3,created_at:date};
const response=(data:unknown)=>new Response(JSON.stringify({api_version:'1',request_id:'transport',data}),{headers:{'content-type':'application/json'}});
afterEach(()=>vi.unstubAllGlobals());
describe('review bounded client contracts',()=>{
 it('RC01 read wrappers encode paths and reject malformed/cross-request metadata without guessing identity',async()=>{
  const seen:string[]=[];vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>{seen.push(String(url));return response(status);}));
  const c=new DetunedClient({baseUrl:'http://review.invalid',maxRetries:0});
  expect(await c.getReviewStatus('space/x','request')).toEqual(status);expect(seen[0]).toContain('/spaces/space%2Fx/review-requests/request/status');
  for(const value of [{...status,request_id:'other'},{...status,private_payload:'marker'},{...status,validity_reasons:['unknown']}]){
   vi.stubGlobal('fetch',vi.fn(async()=>response(value)));await expect(c.getReviewStatus('space','request')).rejects.toBeInstanceOf(ClientProtocolError);
  }
  vi.stubGlobal('fetch',vi.fn(async()=>response({request_id:'request',submissions:[]})));expect(await c.listReviewSubmissions('space','request')).toEqual({request_id:'request',submissions:[]});
  vi.stubGlobal('fetch',vi.fn(async()=>response({...decision,created_at:'2026-02-31T00:00:00Z'})));await expect(c.getReviewDecision('space','request')).rejects.toBeInstanceOf(ClientProtocolError);
 });
 it('RC02 persistent request scopes retain request target and key across attempts and validate all five families',async()=>{
  const scopes:RequestKeyScope[]=[],keys:string[]=[];const body={expected_version:2};
  vi.stubGlobal('fetch',vi.fn(async(url:unknown,init:RequestInit)=>{
   if(String(url).endsWith('/me'))return response({actor:{id:'actor'}});
   keys.push(new Headers(init.headers).get('idempotency-key')!);expect(JSON.parse(String(init.body))).toEqual(body);return response(decision);
  }));
  const c=new DetunedClient({baseUrl:'http://review.invalid',token:'private-fixture',maxRetries:0,requestKeyStore:{async getOrCreate(scope){scopes.push(scope);return 'stable-key';}}});
  for(let i=0;i<2;i++)expect(await c.finalizeReviewRequest('space','request',body,undefined,{logicalOperationId:'intent'})).toEqual(decision);
  expect(keys).toEqual(['stable-key','stable-key']);expect(scopes.map(s=>[s.operation,s.spaceId,s.target])).toEqual([['review.request.finalize','space','request'],['review.request.finalize','space','request']]);
  for(const operation of ['review.request.create','review.request.cancel','review.request.finalize','review.submission.create','artifact.review.create']){
   const scope={serverNamespace:'http://review.invalid',actorId:'actor',spaceId:'space',operation,target:operation==='review.request.create'?null:'request'};
   expect(()=>validateRequestKeyScope(scope,'intent')).not.toThrow();expect(()=>validateRequestKeyScope({...scope,spaceId:null},'intent')).toThrow();
  }
 });
 it('RC03 bounded JSON rejects oversized responses and abort releases the response reader',async()=>{
  let cancelled=0;vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(1048577));},cancel(){cancelled++;}}))));
  const c=new DetunedClient({baseUrl:'http://review.invalid',maxRetries:0});await expect(c.getReviewStatus('space','request')).rejects.toBeInstanceOf(ClientProtocolError);expect(cancelled).toBe(1);
  const ac=new AbortController();vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({pull(){ac.abort();},cancel(){cancelled++;}}))));
  await expect(c.getReviewStatus('space','request',{signal:ac.signal})).rejects.toBeInstanceOf(UserAbortError);expect(cancelled).toBe(2);
 });
 it('RC04 private upload retries new immutable FormData with same explicit key, rejects nonempty metadata before HTTP',async()=>{
  const forms:FormData[]=[],keys:string[]=[];let attempt=0;
  const bytes=new TextEncoder().encode('review evidence');const digest=await crypto.subtle.digest('SHA-256',bytes);const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  vi.stubGlobal('fetch',vi.fn(async(url:unknown,init:RequestInit)=>{
   expect(String(url)).toContain('/review-requests/request/artifacts');forms.push(init.body as FormData);keys.push(new Headers(init.headers).get('idempotency-key')!);
   if(attempt++===0)return new Response(JSON.stringify({api_version:'1',error:{code:'TEMPORARILY_UNAVAILABLE',message:'retry'}}),{status:503,headers:{'content-type':'application/json','retry-after':'0'}});
   return response({id:'artifact',space_id:'space',owner_id:'actor',visibility:'review_assignment',review_assignment_id:'assignment',sha256:sha,bytes:bytes.length,mime:'text/plain',state:'ready',created_at:date,content_url:'/api/v1/spaces/space/artifacts/artifact/content'});
  }));
  const c=new DetunedClient({baseUrl:'http://review.invalid',maxRetries:1});expect((await c.uploadReviewArtifact('space','request',new Blob([bytes],{type:'text/plain'}),{},'upload-key')).id).toBe('artifact');
  expect(forms).toHaveLength(2);expect(forms[0]).not.toBe(forms[1]);expect(keys).toEqual(['upload-key','upload-key']);for(const f of forms){expect(f.get('metadata')).toBe('{}');expect(await (f.get('file') as Blob).text()).toBe('review evidence');}
  const before=attempt;await expect(c.uploadReviewArtifact('space','request',new Blob([]),{visibility:'space'} as never,'k')).rejects.toBeInstanceOf(ClientProtocolError);expect(attempt).toBe(before);
 });
});
