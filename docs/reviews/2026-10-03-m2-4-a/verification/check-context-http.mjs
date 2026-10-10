// Execute only after final implementation freeze + unified build.
import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
import {DetunedClient} from '../../../../packages/client/dist/index.js';
const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;const app=buildApp({storage:new SqliteStorage(db)});let sid,tid,n=0;const results=[];
async function call(method,url,payload,status=200){const r=await app.inject({method,url,headers:{authorization:`Bearer ${token}`,'idempotency-key':`cx-${++n}`},...(payload===undefined?{}:{payload})});assert.equal(r.statusCode,status,`${url}: ${r.body}`);return {raw:r.body,json:r.json(),bytes:Buffer.byteLength(r.body)};}
const get=async budget=>call('GET',`/api/v1/spaces/${sid}/context${budget===undefined?'':`?max_bytes=${budget}`}`);
const post=async(kind,structured)=> (await call('POST',`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind,title:'材料😀"\\',summary:'摘要😀"\\',body:'body',...(structured?{structured}:{})},201)).json.data.post;
const snap=()=>Object.fromEntries(['spaces','space_revisions','posts','post_revisions','events','idempotency_records','delivery_batches','consumers'].map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));
try{
 sid=(await call('POST','/api/v1/spaces',{slug:'context-independent',objective:'目标😀"\\\n',rules:['规则😀"\\\n']},201)).json.data.space.id;
 tid=(await call('POST',`/api/v1/spaces/${sid}/threads`,{title:'fixture'},201)).json.data.thread.id;
 for(const budget of [4096,65536,undefined]){const before=snap(),r=await get(budget);assert(r.bytes<=(budget??12288));assert.deepEqual(snap(),before);assert(r.json.request_id);assert.equal(r.json.meta.next_cursor,null);results.push({id:'CX01',budget:budget??12288,actual_complete_bytes:r.bytes});}
 for(const invalid of ['4095','65537','1.2','','x'])await call('GET',`/api/v1/spaces/${sid}/context?max_bytes=${invalid}`,undefined,400);
 await call('GET',`/api/v1/spaces/${sid}/context?focus_thread_id=missing`,undefined,400);results.push({id:'CX02-09',pass:true});
 const source=await post('note'),summary=await post('summary',{source_refs:[{post_id:source.id,revision:1}]});
 // Explicit historic storage fixture, not fabricated old HTTP success.
 db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=? AND revision=1').run(JSON.stringify({source_refs:Array.from({length:50},()=>({post_id:source.id,revision:1}))}),summary.id);
 db.prepare('UPDATE space_revisions SET pinned_refs=? WHERE space_id=?').run(JSON.stringify([{post_id:summary.id,revision:1}]),sid);
 const large=await get(65536),small=await get(4096);assert.equal(large.json.data.pinned_summaries[0].source_refs.length,50);assert.equal(large.json.meta.truncated,false);assert.equal(small.json.meta.truncated,true);assert.equal(small.json.data.pinned_summaries.length,0);assert(small.bytes<=4096);results.push({id:'CX04',whole_pin_removed:true,large_control_sources:50,actual_small_bytes:small.bytes});
 const original=db.prepare('SELECT objective,rules FROM space_revisions WHERE space_id=?').get(sid);
 db.prepare('UPDATE space_revisions SET objective=? WHERE space_id=?').run('界'.repeat(2000),sid);
 const rejected=await call('GET',`/api/v1/spaces/${sid}/context?max_bytes=4096`,undefined,422);assert.equal(rejected.json.error.code,'QUERY_TOO_BROAD');assert((await get(65536)).bytes<=65536);
 db.prepare('UPDATE space_revisions SET objective=? WHERE space_id=?').run('界'.repeat(30000),sid);await call('GET',`/api/v1/spaces/${sid}/context?max_bytes=65536`,undefined,422);
 db.prepare('UPDATE space_revisions SET objective=?,rules=? WHERE space_id=?').run(original.objective,original.rules,sid);results.push({id:'CX03',mandatory_oversize:422});
 const before=snap(),anon=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/context?focus_thread_id=missing`});assert.equal(anon.statusCode,401);assert.deepEqual(snap(),before);results.push({id:'CX06',pass:true});
 await app.listen({host:'127.0.0.1',port:0});const client=new DetunedClient({baseUrl:`http://127.0.0.1:${app.server.address().port}`,token});const page=await client.callTool('forum_context',{space_id:sid,max_bytes:4096});assert(page.data.space_id===sid);assert.equal(page.meta.truncated,true);assert.equal(page.meta.next_cursor,null);results.push({id:'CX05',shared_client_tool_meta:true});
 console.log(JSON.stringify({passes:true,results,separate:['priority multi-array formal/source review','two-connection snapshot/checkpoint independent probe','fixedclock subscription boundary','full regressions/integrity'],limits:['SDK external wrapper outside HTTP bytes','historical oversized fixtures explicitly storage-written']},null,2));
}catch(e){console.log(JSON.stringify({passes:false,results,error:{name:e.name,message:e.message,stack:e.stack}},null,2));process.exitCode=1;}finally{await app.close();db.close();}
