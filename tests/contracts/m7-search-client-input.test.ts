import {afterEach,expect,it,vi} from 'vitest';
import {DetunedClient} from '@detuned/client';
import {DetunedError,type SearchQuery} from '@detuned/protocol';

const client=()=>new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});
const page=()=>new Response(JSON.stringify({api_version:'1',request_id:'search-input',data:[],meta:{truncated:false,next_cursor:null}}),{headers:{'content-type':'application/json'}});
afterEach(()=>vi.unstubAllGlobals());

it.each([
 ['missing query',undefined],['null query',null],['missing q',{}],['null q',{q:null}],['numeric q',{q:42}],
 ['blank q',{q:'  '}],['oversize q',{q:'😀'.repeat(257)}],
 ['review source',{q:'marker',source:'review_submissions',request_id:'request'}],
 ['request filter',{q:'marker',request_id:'request'}],['target filter',{q:'marker',target_post_id:'post'}],
 ['unknown field',{q:'marker',limti:1}],
 ['raw duplicate tag budget',{q:'marker',tags:Array.from({length:100},()=> 'x'.repeat(100))}],
 ['unique tag count',{q:'marker',tags:Array.from({length:101},(_,i)=>String(i))}],
] as const)('M7.8-S posts search rejects %s before HTTP',async(_name,query)=>{
 const fetcher=vi.fn(async(_input: RequestInfo | URL, _init?: RequestInit)=>page());vi.stubGlobal('fetch',fetcher);
 const error=await client().search('space',query as unknown as SearchQuery).then(()=>undefined,(error:unknown)=>error);
 expect(error).toBeInstanceOf(DetunedError);
 expect(error).toMatchObject({code:'VALIDATION_ERROR',statusCode:400,retryable:false});
 expect(fetcher).not.toHaveBeenCalled();
});

it('M7.8-S valid posts retain trimming, omitted defaults and exact original tags',async()=>{
 const fetcher=vi.fn(async(_input: RequestInfo | URL, _init?: RequestInit)=>page());vi.stubGlobal('fetch',fetcher);
 const c=client();
 await expect(c.search('space',{q:'  needle  '})).resolves.toMatchObject({data:[],meta:{truncated:false,next_cursor:null}});
 await c.search('space',{q:'😀'.repeat(256),tags:[' z ','a,b',' z ',''],limit:1,cursor:'opaque'});
 await c.search('space',{q:'needle',tags:[]});
 await c.callTool('forum_search',{space_id:'space',source:'posts',q:' needle '});
 const urls=fetcher.mock.calls.map(call=>new URL(String(call[0])));
 expect([...urls[0]!.searchParams]).toEqual([['q','needle']]);
 expect(urls[1]!.searchParams.get('q')).toBe('😀'.repeat(256));
 expect(urls[1]!.searchParams.get('tags_json')).toBe(JSON.stringify([' z ','a,b',' z ','']));
 expect(urls[1]!.searchParams.get('limit')).toBe('1');expect(urls[1]!.searchParams.get('cursor')).toBe('opaque');
 expect(urls[2]!.searchParams.get('tags_json')).toBe('[]');
 expect([...urls[3]!.searchParams]).toEqual([['q','needle']]);
});

it('M7.8-S dedicated review search keeps explicit source and request filter',async()=>{
 const fetcher=vi.fn(async(_input: RequestInfo | URL, _init?: RequestInit)=>page());vi.stubGlobal('fetch',fetcher);
 await expect(client().searchPublicReviewSubmissions('space',{source:'review_submissions',q:' marker ',request_id:'request'})).resolves.toMatchObject({data:[],meta:{truncated:false,next_cursor:null}});
 const url=new URL(String(fetcher.mock.calls[0]![0]));
 expect(url.searchParams.get('source')).toBe('review_submissions');expect(url.searchParams.get('request_id')).toBe('request');expect(url.searchParams.get('q')).toBe('marker');
 expect(fetcher).toHaveBeenCalledTimes(1);
});
