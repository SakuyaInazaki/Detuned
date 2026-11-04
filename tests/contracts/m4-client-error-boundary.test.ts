import {afterEach,expect,it,vi} from 'vitest';
import {DetunedClient,UserAbortError} from '@detuned/client';
import {DetunedError} from '@detuned/protocol';
import {downloadArtifactBytes} from '../../packages/client/src/artifact-transfer.js';
import activate,{type PiExtensionContext} from '../../packages/adapter-pi/src/index.js';

const marker='PRIVATE_MALFORMED_ERROR_MARKER';
const payload=(error:unknown,extra:Record<string,unknown>={})=>({api_version:'1',request_id:'error-boundary',error,...extra});
const bad=[
 payload({message:marker}),
 payload({details:{private:marker}}),
 payload({code:{private:marker},message:marker,retryable:false}),
 payload({code:42,message:marker,retryable:false}),
 payload({code:'UNRECOGNIZED_FUTURE_CODE',message:marker,retryable:false}),
 payload({code:'FORBIDDEN',message:{private:marker},retryable:false}),
 payload({code:'FORBIDDEN',message:marker,retryable:'false'}),
 payload({code:'FORBIDDEN',message:marker,retryable:false,details:[marker]}),
 payload({code:'FORBIDDEN',message:marker,retryable:false,details:null}),
 payload({code:'FORBIDDEN',message:marker,retryable:false},{api_version:'2'}),
 payload({code:'FORBIDDEN',message:marker,retryable:false},{request_id:{private:marker}}),
 payload({code:'FORBIDDEN',message:marker,retryable:false},{request_id:''}),
 payload({code:'FORBIDDEN',message:null,retryable:false}),
];
const response=(body:unknown,status=409)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const failure=async(promise:Promise<unknown>)=>promise.then(()=>{throw Error('Expected rejection');},(error:unknown)=>error);
afterEach(()=>vi.unstubAllGlobals());

it('malformed JSON errors retain HTTP fallback without reflecting invalid public fields',async()=>{
 for(const body of bad){
  const fetcher=vi.fn(async()=>response(body));vi.stubGlobal('fetch',fetcher);
  const error=await failure(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0}).getCapabilities());
  expect(error).toBeInstanceOf(DetunedError);
  expect(error).toMatchObject({code:'VALIDATION_ERROR',statusCode:409,retryable:false,details:undefined});
  expect(JSON.stringify(error)+String(error)).not.toContain(marker);
  expect(fetcher).toHaveBeenCalledTimes(1);
 }
});

it('registered Pi tools redact malformed upstream errors while preserving trusted business metadata',async()=>{
 const tools=new Map<string,{execute:(id:string,args:unknown)=>Promise<unknown>}>();
 activate({on(){},registerCommand(){},registerTool(tool: {name:string;execute:(id:string,args:unknown)=>Promise<unknown>}){tools.set(tool.name,tool);}} as unknown as PiExtensionContext);
 const fetcher=vi.fn(async()=>response(bad[0]));vi.stubGlobal('fetch',fetcher);
 const error=await failure(tools.get('forum_context')!.execute('malformed',{space_id:'space'}));
 expect(error).toMatchObject({code:'VALIDATION_ERROR',statusCode:409,message:'[VALIDATION_ERROR] HTTP 409 请求失败'});
 expect(JSON.stringify(error)+String(error)).not.toContain(marker);
 expect(fetcher).toHaveBeenCalledTimes(1);
});

it('artifact content errors use the same validated public fields and safe fallback',async()=>{
 for(const body of bad){
  vi.stubGlobal('fetch',vi.fn(async()=>response(body)));
  const metadata={id:'artifact',space_id:'space',bytes:1,mime:'text/plain',sha256:'a'.repeat(64),state:'ready',visibility:'space',owner_id:'actor',created_at:'2026-10-10T00:00:00.000Z',content_url:'http://controlled.invalid/content'} as const;
  const error=await failure(downloadArtifactBytes('http://controlled.invalid',undefined,'space','artifact',1000,undefined,async()=>metadata));
  expect(error).toMatchObject({code:'VALIDATION_ERROR',statusCode:409,retryable:false,details:undefined});
  expect(JSON.stringify(error)+String(error)).not.toContain(marker);
 }
});

it('valid public and legacy errors preserve metadata and ignore unknown response fields',async()=>{
 for(const extra of [{api_version:'1',request_id:'valid'},{ }]){
  const body={...extra,error:{code:'REVISION_CONFLICT',message:'ARBITRARY public message',retryable:false,details:{current_revision:3}},private_root:marker};
  vi.stubGlobal('fetch',vi.fn(async()=>response(body)));
  expect(await failure(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0}).getCapabilities())).toMatchObject({code:'REVISION_CONFLICT',message:'ARBITRARY public message',statusCode:409,retryable:false,details:{current_revision:3}});
 }
});

it('safe status fallback retains gateway retries and Retry-After; cancellation still wins',async()=>{
 const fetcher=vi.fn(async()=>response(bad[0],503));vi.stubGlobal('fetch',fetcher);
 fetcher.mockImplementationOnce(async()=>new Response(JSON.stringify(bad[0]),{status:503,headers:{'retry-after':'0'}}));
 fetcher.mockImplementationOnce(async()=>new Response(JSON.stringify({api_version:'1',request_id:'ok',data:{api_version:'1'}})));
 await expect(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:1}).getCapabilities()).resolves.toBeDefined();
 expect(fetcher).toHaveBeenCalledTimes(2);
 const controller=new AbortController();
 vi.stubGlobal('fetch',vi.fn(async()=>{controller.abort();return response(bad[0]);}));
 await expect(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:1}).getCapabilities({signal:controller.signal})).rejects.toBeInstanceOf(UserAbortError);
});

it('non-JSON gateway text never leaks while original HTTP status retryability is retained',async()=>{
 for(const status of [401,403,429,503]){
  const fetcher=vi.fn(async()=>new Response('<html>'+marker+'</html>',{status}));vi.stubGlobal('fetch',fetcher);
  const error=await failure(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0}).getCapabilities());
  expect(error).toMatchObject({statusCode:status,retryable:status===429||status===503,code:status===429?'RATE_LIMITED':status>=500?'TEMPORARILY_UNAVAILABLE':'VALIDATION_ERROR',details:undefined});
  expect(JSON.stringify(error)+String(error)).not.toContain(marker);
  expect(fetcher).toHaveBeenCalledTimes(1);
 }
});
