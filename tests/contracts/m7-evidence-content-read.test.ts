import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {DetunedClient} from '@detuned/client';
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function transport(bytes:Uint8Array,mime='text/plain'){
 const metadata={id:'artifact',space_id:'space',owner_id:'actor',visibility:'space',sha256:digest(bytes),bytes:bytes.length,mime,state:'ready',created_at:'2026-11-06T00:00:00.000Z',content_url:'https://PRIVATE_NEVER_FETCH.invalid'};
 const fetcher=vi.fn(async(url:unknown)=>String(url).endsWith('/content')?new Response(bytes,{headers:{'content-type':mime,'content-length':String(bytes.length)}}):new Response(JSON.stringify({api_version:'1',request_id:'metadata',data:metadata}),{headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetcher);return {fetcher,metadata};
}
afterEach(()=>vi.unstubAllGlobals());
it('M7.11 UTF8 evidence pages preserve full bytes/hash and actual JSON budget',async()=>{
 const text='图😀"\\\n'.repeat(3000),bytes=new TextEncoder().encode(text);transport(bytes);const c=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});let offset=0,joined='',hash:string|undefined;
 do{const page=await c.callTool('forum_read',{kind:'artifact_content',space_id:'space',id:'artifact',max_bytes:4096,offset,...(hash?{expected_sha256:hash}:{})});expect(Buffer.byteLength(JSON.stringify(page,null,2))).toBeLessThanOrEqual(4096);expect(page.integrity_verified).toBe(true);expect(page.offset).toBe(offset);hash=page.sha256;joined+=page.content;if(page.complete){expect(page.next_offset).toBeNull();break;}expect(page.next_offset).toBeGreaterThan(offset);offset=page.next_offset;}while(true);
 expect(joined).toBe(text);expect(hash).toBe(digest(bytes));
});
it('M7.11 binary requires explicit base64 and independent decoded pages reconstruct bytes',async()=>{
 const bytes=new Uint8Array(12000).map((_,i)=>i%256);transport(bytes,'application/octet-stream');const c=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});await expect(c.callTool('forum_read',{kind:'artifact_content',space_id:'space',id:'artifact'})).rejects.toBeDefined();
 const decoded:Buffer[]=[];let offset=0;do{const page=await c.callTool('forum_read',{kind:'artifact_content',space_id:'space',id:'artifact',encoding:'base64',offset,...(offset?{expected_sha256:digest(bytes)}:{}),max_bytes:4096});decoded.push(Buffer.from(page.content,'base64'));if(page.complete)break;offset=page.next_offset;}while(true);expect(Buffer.concat(decoded)).toEqual(Buffer.from(bytes));
});
it('M7.11 oversize metadata and wrong continuation hashes reject before content fetch',async()=>{
 const bytes=new Uint8Array(1048577);const {fetcher}=transport(bytes);const c=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});await expect(c.callTool('forum_read',{kind:'artifact_content',space_id:'space',id:'artifact'})).rejects.toBeDefined();expect(fetcher.mock.calls.some(call=>String(call[0]).endsWith('/content'))).toBe(false);
 transport(new TextEncoder().encode('small'));await expect(c.callTool('forum_read',{kind:'artifact_content',space_id:'space',id:'artifact',offset:1,expected_sha256:'0'.repeat(64)})).rejects.toBeDefined();
});
it('M7.11 open question view rejects an invalid whole page instead of trusting partial items',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({api_version:'1',request_id:'view',data:[{type:'question',post_id:'PRIVATE_BAD'}]}),{headers:{'content-type':'application/json'}})));
 const c=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});await expect(c.getView('space','open-questions')).rejects.toMatchObject({name:'ClientProtocolError'});
});
it('M7.11 BOM and UTF8 boundaries remain exact and continuation hashes prevent content IO',async()=>{
 const text='\ufeff起\ufeff😀'.repeat(1800),bytes=new TextEncoder().encode(text);const t=transport(bytes);const c=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});let offset=0,joined='';do{const page=await c.readArtifactContent('space','artifact',{offset,max_bytes:4096,...(offset?{expected_sha256:digest(bytes)}:{})});joined+=page.content;if(page.complete)break;offset=page.next_offset!;}while(true);expect(new TextEncoder().encode(joined)).toEqual(bytes);expect(t.fetcher.mock.calls.every(call=>String(call[0]).startsWith('http://controlled.invalid/api/v1/spaces/space/artifacts/artifact'))).toBe(true);
 const wrong=transport(bytes);await expect(c.readArtifactContent('space','artifact',{offset:3,expected_sha256:'0'.repeat(64)})).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(wrong.fetcher.mock.calls.some(call=>String(call[0]).endsWith('/content'))).toBe(false);
 await expect(c.readArtifactContent('space','artifact',{offset:4,expected_sha256:digest(bytes)})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
});
it('M7.11 the one MiB boundary is readable and corrupt complete blobs never produce a page',async()=>{
 const bytes=new Uint8Array(1048576).fill(65);transport(bytes);const c=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});const page=await c.readArtifactContent('space','artifact',{encoding:'base64',max_bytes:4096});expect(page.total_bytes).toBe(1048576);expect(page.complete).toBe(false);expect(page.integrity_verified).toBe(true);
 const t=transport(new TextEncoder().encode('valid'));t.metadata.sha256='0'.repeat(64);await expect(c.readArtifactContent('space','artifact')).rejects.toMatchObject({name:'ClientProtocolError'});
});
