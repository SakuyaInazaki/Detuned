import {afterEach,expect,it,vi} from 'vitest';
import {DetunedClient,ClientProtocolError} from '@detuned/client';
import {THREAD_POST_LIMIT} from '@detuned/protocol';
const date='2026-11-06T00:00:00.000Z';
function response(count:number){return new Response(JSON.stringify({api_version:'1',request_id:'directory',data:{thread:{id:'thread',space_id:'space',title:'t',version:1,state:'open',creator_id:'actor',created_at:date,updated_at:date},posts:Array.from({length:count},(_,i)=>({id:`post-${i}`,space_id:'space',thread_id:'thread',author_id:'actor',kind:'note',current_revision:1,lifecycle:'active',created_at:date}))},meta:{truncated:false,next_cursor:null}}),{headers:{'content-type':'application/json'}});}
afterEach(()=>vi.unstubAllGlobals());
it('default thread directory accepts canonical default pages at 21 and 50 items',async()=>{
 expect(THREAD_POST_LIMIT.default).toBe(50);
 for(const count of [21,50]){const fetcher=vi.fn(async()=>response(count));vi.stubGlobal('fetch',fetcher);const result=await new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0}).getThreadPosts('space','thread');expect(result.data.posts).toHaveLength(count);expect(fetcher).toHaveBeenCalledTimes(1);}
});
it('explicit thread directory limit remains a strict response correlation',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(21)));await expect(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0}).getThreadPosts('space','thread',{limit:20})).rejects.toBeInstanceOf(ClientProtocolError);
});
it('canonical default cannot accept a response beyond fifty posts',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>response(51)));await expect(new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0}).getThreadPosts('space','thread')).rejects.toBeInstanceOf(ClientProtocolError);
});
