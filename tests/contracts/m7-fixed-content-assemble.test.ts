import {afterEach,expect,it,vi} from 'vitest';
import {ClientProtocolError,DetunedClient,TimeoutError,UserAbortError} from '@detuned/client';
const document={title:'历史标题',summary:'s',body:'图😀\\\n'.repeat(1200),tags:['tag'],structured:{legacy_shape:true}};
const json=JSON.stringify(document),encoder=new TextEncoder();
const base={ref:{space_id:'space',post_id:'post',revision:1},post_kind:'failure',lifecycle:'active',has_newer_revision:false,encoding:'json'};
function pages(){const split=json.indexOf('图',Math.floor(json.length/2));const first=json.slice(0,split),second=json.slice(split),end=encoder.encode(first).length;return [{data:{...base,chunk:first,start_byte:0,end_byte:end,complete:false},meta:{truncated:true,next_cursor:'cursor'}},{data:{...base,chunk:second,start_byte:end,end_byte:encoder.encode(json).length,complete:true},meta:{truncated:false,next_cursor:null}}];}
function serve(values:unknown[]){const fetcher=vi.fn(async()=>new Response(JSON.stringify({api_version:'1',request_id:'controlled',...values.shift() as object}),{headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetcher);return fetcher;}
const client=(timeoutMs=1000)=>new DetunedClient({baseUrl:'http://controlled.invalid',timeoutMs,maxRetries:0});
afterEach(()=>vi.unstubAllGlobals());
it('M7.12 assembles complete UTF8 JSON with exact bytes and historical structured wire data',async()=>{
 const fetcher=serve(pages());const result=await client().assemblePostRevisionContent('space','post',1,{max_bytes:12288});expect(result).toEqual({...base,content:document,bytes:encoder.encode(json).length,pages:2});expect(fetcher.mock.calls).toHaveLength(2);expect(String(fetcher.mock.calls[1]![0])).toContain('cursor=cursor');
});
it.each(['ref','kind','lifecycle','newer','offset','bytes','complete','cursor','unknown','unicode'])('M7.12 rejects malformed or inconsistent %s pages without partial output',async mode=>{
 const list=pages();const second=list[1]!.data as any;
 if(mode==='ref')second.ref={...base.ref,revision:2};if(mode==='kind')second.post_kind='note';if(mode==='lifecycle')second.lifecycle='withdrawn';if(mode==='newer')second.has_newer_revision=true;if(mode==='offset')second.start_byte++;if(mode==='bytes')second.end_byte++;if(mode==='complete')list[1]!.meta.next_cursor='unexpected';if(mode==='cursor'){second.complete=false;list[1]!.meta={truncated:true,next_cursor:'cursor'};}if(mode==='unknown')second.PRIVATE_UNKNOWN='PRIVATE_VALUE';if(mode==='unicode')second.chunk='\ud800';
 serve(list);await expect(client().assemblePostRevisionContent('space','post',1)).rejects.toBeInstanceOf(ClientProtocolError);
});
it('M7.12 refuses incomplete JSON, document shape drift and unknown query before fetching',async()=>{
 for(const raw of ['{"title":',JSON.stringify({...document,PRIVATE_UNKNOWN:'PRIVATE_VALUE'}),JSON.stringify({...document,body:1})]){serve([{data:{...base,chunk:raw,start_byte:0,end_byte:encoder.encode(raw).length,complete:true},meta:{truncated:false,next_cursor:null}}]);await expect(client().assemblePostRevisionContent('space','post',1)).rejects.toBeInstanceOf(ClientProtocolError);}
 const fetcher=serve([]);await expect(client().assemblePostRevisionContent('space','post',1,{cursor:'PRIVATE_CURSOR'} as any)).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(fetcher).not.toHaveBeenCalled();
 for(const [space,post,revision] of [[null,'post',1],['space',42,1],['space','post',0]] as const)await expect(client().assemblePostRevisionContent(space as any,post as any,revision)).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(fetcher).not.toHaveBeenCalled();
});
it('M7.12 later permission failure and caller abort never return partial content',async()=>{
 const first=pages()[0]!;let n=0;vi.stubGlobal('fetch',vi.fn(async()=>++n===1?new Response(JSON.stringify({api_version:'1',request_id:'first',...first})):new Response(JSON.stringify({api_version:'1',request_id:'denied',error:{code:'NOT_FOUND',message:'Unavailable',retryable:false}}),{status:404})));await expect(client().assemblePostRevisionContent('space','post',1)).rejects.toMatchObject({code:'NOT_FOUND',statusCode:404});
 const controller=new AbortController();const fetcher=serve([]);controller.abort();await expect(client().assemblePostRevisionContent('space','post',1,{}, {signal:controller.signal})).rejects.toBeInstanceOf(UserAbortError);expect(fetcher).not.toHaveBeenCalled();
});
it('M7.12 total deadline covers all pages instead of resetting at each request',async()=>{
 const list=pages();vi.stubGlobal('fetch',vi.fn(async()=>{await new Promise(resolve=>setTimeout(resolve,30));return new Response(JSON.stringify({api_version:'1',request_id:'slow',...list.shift()}));}));await expect(client(45).assemblePostRevisionContent('space','post',1)).rejects.toBeInstanceOf(TimeoutError);
});
it('M7.12 refuses cumulative content over one MiB and more than 512 advancing pages',async()=>{
 for(const chunk of ['x'.repeat(60000),'x']){let offset=0,calls=0;vi.stubGlobal('fetch',vi.fn(async()=>{calls++;const start=offset;offset+=chunk.length;return new Response(JSON.stringify({api_version:'1',request_id:'bounded',data:{...base,chunk,start_byte:start,end_byte:offset,complete:false},meta:{truncated:true,next_cursor:'page-'+calls}}));}));await expect(client(10000).assemblePostRevisionContent('space','post',1,{max_bytes:65536})).rejects.toBeInstanceOf(ClientProtocolError);expect(calls).toBeLessThanOrEqual(chunk.length===1?512:18);}
});
it('M7.12 bounds the entire HTTP envelope including request id and ignored fields and disposes oversized bodies',async()=>{
 for(const field of ['request_id','ignored_envelope_field']){let cancelled=false;const raw=JSON.stringify({...document,body:'tiny'}),data={...base,chunk:raw,start_byte:0,end_byte:encoder.encode(raw).length,complete:true};const payload=encoder.encode(JSON.stringify({api_version:'1',request_id:'small',data,meta:{truncated:false,next_cursor:null},[field]:'x'.repeat(5000)}));
 const fetcher=vi.fn(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(payload);},cancel(){cancelled=true;}})));vi.stubGlobal('fetch',fetcher);
 await expect(client().assemblePostRevisionContent('space','post',1,{max_bytes:4096})).rejects.toBeInstanceOf(ClientProtocolError);expect(fetcher).toHaveBeenCalledTimes(1);expect(cancelled).toBe(true);
 }
});
