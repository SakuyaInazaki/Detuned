import assert from 'node:assert/strict';
// This module has no filesystem/database/product imports. All discovery comes from HTTP.
export async function sessionJourney({baseURL,token,space_id,query},request=async(method,url,body)=>{
 const response=await fetch(new URL(url,baseURL),{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 return {status:response.status,text:await response.text()};
}){
 const records=[],documents=[],root=`/api/v1/spaces/${encodeURIComponent(space_id)}`;
 const call=async(method,url,body,budget)=>{const r=await request(method,url,body);assert.equal(r.status,200,`${method} ${url}: ${r.text}`);const data=JSON.parse(r.text);if(budget)assert.ok(Buffer.byteLength(r.text)<=budget,'actual envelope budget');records.push({method,url,status:r.status,response_bytes:Buffer.byteLength(r.text),response:data});return data;};
 const fixed=async(url,budget=4096)=>{let cursor,offset=0,text='',ref,pages=0;do{const p=await call('GET',`${url}?${new URLSearchParams({max_bytes:String(budget),...(cursor?{cursor}: {})})}`,undefined,budget);assert.equal(p.data.start_byte,offset);assert.equal(p.data.end_byte,offset+Buffer.byteLength(p.data.chunk));assert.equal(p.data.complete,p.meta.next_cursor===null);assert.equal(p.meta.truncated,!p.data.complete);ref??=p.data.ref;assert.deepEqual(p.data.ref,ref);text+=p.data.chunk;offset=p.data.end_byte;cursor=p.meta.next_cursor;assert.ok(++pages<=256,'bounded complete chain');}while(cursor);const content=JSON.parse(text);documents.push({url,ref,pages,bytes:offset,content});return content;};
 const contexts=[];for(const budget of [4096,12288,65536])contexts.push(await call('GET',`${root}/context?max_bytes=${budget}`,undefined,budget));
 assert.ok(contexts.every(p=>!Object.hasOwn(p.data,'focus_thread')));
 const initial=contexts[0];const sr=initial.data.space_revision_ref;await fixed(`${root}/revisions/${sr.revision}`);
 const search=[];let cursor;do{const p=await call('GET',`${root}/search?${new URLSearchParams({q:query,limit:'100',...(cursor?{cursor}:{})})}`);search.push(...p.data);cursor=p.meta.next_cursor;assert.ok(search.length<=1000,'bounded task discovery');}while(cursor);
 const hits=search.filter(x=>x.kind==='failure');assert.ok(hits.length,'task failure must be discoverable');
 const threadIds=[...new Set(hits.map(x=>x.thread_id))];const seen=new Set();
 for(const tid of threadIds){await call('GET',`${root}/context?${new URLSearchParams({focus_thread_id:tid,max_bytes:'4096'})}`,undefined,4096);let pagecursor;do{const p=await call('GET',`${root}/threads/${encodeURIComponent(tid)}/posts?${new URLSearchParams({max_bytes:'4096',limit:'100',...(pagecursor?{cursor:pagecursor}:{})})}`,undefined,4096);for(const post of p.data.posts){assert.ok(!seen.has(post.id),'static directory duplicate');seen.add(post.id);if(post.kind==='failure'||post.kind==='summary'){const doc=await fixed(`${root}/posts/${encodeURIComponent(post.id)}/revisions/${post.current_revision}`);if(post.kind==='summary')for(const source of doc.structured?.source_refs??[])await fixed(`${root}/posts/${encodeURIComponent(source.post_id)}/revisions/${source.revision}`);}}pagecursor=p.meta.next_cursor;assert.ok(seen.size<=10000,'bounded task thread');}while(pagecursor);}
 return {format_version:1,session_inputs:{space_id,query},initial_checkpoint:initial.data.checkpoint_token,records,documents,discovered_failure_ids:hits.map(x=>x.post_id)};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 let input='';for await(const chunk of process.stdin)input+=chunk;const options=JSON.parse(input);assert.deepEqual(Object.keys(options).sort(),['baseURL','query','space_id','token']);const result=await sessionJourney(options);process.stdout.write(JSON.stringify(result));
}
