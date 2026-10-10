// Preparation only. Execute after explicit final freeze/build with local loopback authorization.
import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
import {DetunedClient} from '../../../../packages/client/dist/index.js';
import {HmacTokenSigner,SearchService,AuthService,CryptoHasher,SystemClock} from '../../../../packages/core/dist/index.js';
const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;const secret='independent-search-fixture-secret';const app=buildApp({storage:new SqliteStorage(db),tokenSecret:secret});let sid,tid,n=0;const results=[];
async function call(method,url,payload,status=200){const r=await app.inject({method,url,headers:{authorization:`Bearer ${token}`,'idempotency-key':`sq-${++n}`},...(payload===undefined?{}:{payload})});assert.equal(r.statusCode,status,`${url}: ${r.body}`);return r.json();}
const search=async(q,opts={},status=200)=>call('GET',`/api/v1/spaces/${sid}/search?${new URLSearchParams({q,...opts})}`,undefined,status);
const publish=async(title,tags=[]) => (await call('POST',`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'note',title,summary:'search fixture',body:title,tags},201)).data.post;
const ids=r=>r.data.map(x=>x.post_id);const mark=(id,extra={})=>results.push({id,pass:true,...extra});
try{
 sid=(await call('POST','/api/v1/spaces',{slug:'search-independent',objective:'search',rules:[]},201)).data.space.id;
 tid=(await call('POST',`/api/v1/spaces/${sid}/threads`,{title:'fixture'},201)).data.thread.id;
 for(const q of ['图','失败','零权边','😀','😀图','😀图边','%','_','\\','a%','a_','a\\','"','OR','"OR"']){const p=await publish(`literal ${q} marker`);assert(ids(await search(q)).includes(p.id),`missing literal ${q}`);}
 const plain=await publish('plain decoy without special markers');for(const q of ['%','_','\\'])assert(!ids(await search(q)).includes(plain.id));const tagged=await publish('tag only query',['图','失败','零权边']);for(const q of ['图','失败','零权边'])assert(ids(await search(q)).includes(tagged.id));assert.equal((await search(' 😀 '.trim())).data.length>0,true);mark('SQ01-02',{literal_matrix:true});
 const good=[];for(let i=0;i<5;i++)good.push(await publish(`page marker ${i}`,['Case','a,b','共同']));
 await publish('page marker wrongcase',['case','a,b','共同']);await publish('page marker partial',['Case']);
 const queryTags=['共同','Case','a,b'];let r=await search('page marker',{tags_json:JSON.stringify(queryTags),limit:'2'});const firstCursor=r.meta.next_cursor;assert(firstCursor);const seen=[...ids(r)];
 while(r.meta.next_cursor){r=await search('page marker',{tags_json:JSON.stringify([...queryTags,'Case'].reverse()),limit:'1',cursor:r.meta.next_cursor});seen.push(...ids(r));}
 assert.deepEqual(seen,good.map(x=>x.id).sort().reverse());assert.equal(new Set(seen).size,5);assert.equal(r.meta.next_cursor,null);mark('SQ03-04',{all_tags_exact:true,limit_not_bound:true,id_desc:true});
 assert.equal((await search('page marker',{tags_json:'[]'})).data.length,7);
 await search('page marker',{tags:'Case,共同',tags_json:'[]'},400);
 const csv=await search('page marker',{tags:'Case,共同'});assert.equal(csv.data.length,5);
 for(const change of [{q:'other'},{tags_json:'["Case"]'},{thread_id:'other-thread'},{kind:'claim'}])await search(change.q??'page marker',{tags_json:JSON.stringify(queryTags),limit:'2',cursor:firstCursor,...change},400);
 for(const cursor of [good[0].id,firstCursor.slice(0,-1)+(firstCursor.endsWith('x')?'y':'x')]){const bad=await search('page marker',{tags_json:JSON.stringify(queryTags),cursor},400);assert.equal(bad.error.code,'VALIDATION_ERROR');assert.equal(bad.error.retryable,false);}
 const payload=JSON.parse(Buffer.from(firstCursor.split('.')[0],'base64url').toString());assert.equal(payload.purpose,'search');assert.equal(payload.sort,'id_desc');
 const signer=new HmacTokenSigner();for(const altered of [{...payload,exp:1},{...payload,v:999},{...payload,actor_id:'another-actor'},{...payload,space_id:'another-space'}])await search('page marker',{tags_json:JSON.stringify(queryTags),cursor:signer.sign(altered,secret)},400);
 const anon=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/search?q=x&cursor=invalid`});assert.equal(anon.statusCode,401);mark('SQ05-06');
 for(const term of ['短','uniqueoldphrase']){const p=await publish(term);assert(ids(await search(term)).includes(p.id));await call('POST',`/api/v1/spaces/${sid}/posts/${p.id}/revisions`,{expected_revision:1,title:'replacement',summary:'replacement',body:'replacement'},201);assert(!ids(await search(term)).includes(p.id));}
 for(const term of ['撤','withdrawphrase']){const p=await publish(term);await call('POST',`/api/v1/spaces/${sid}/posts/${p.id}/withdraw`,{expected_revision:1,reason:'fixture'},200);assert(!ids(await search(term)).includes(p.id));}
 for(const term of ['删','redactphrase']){const p=await publish(term);await call('POST',`/api/v1/spaces/${sid}/redactions`,{target_type:'post',target_id:p.id,reason:'fixture'},201);assert(!ids(await search(term)).includes(p.id));}mark('SQ07');
 // Independently inject only the approved SearchService limits; real SQLite data.
 const hasher=new CryptoHasher(),clock=new SystemClock(),storage=new SqliteStorage(db);
 const authService=new AuthService(storage,hasher,clock),auth=authService.authenticateToken(token);
 const bounded=limits=>new SearchService(storage,authService,{signer:new HmacTokenSigner(),secret,clock,hasher},limits);
 const throwsBroad=fn=>assert.throws(fn,e=>e.code==='QUERY_TOO_BROAD'&&e.statusCode===422);
 const narrow=await publish('budgetz marker',['budget-narrow']);
 throwsBroad(()=>bounded({max_candidates:2,max_response_bytes:262144}).search(auth,sid,{q:'z'}));
 assert.deepEqual(bounded({max_candidates:2,max_response_bytes:262144}).search(auth,sid,{q:'z',tags:['budget-narrow']}).items.map(x=>x.post_id),[narrow.id]);
 throwsBroad(()=>bounded({max_candidates:2,max_response_bytes:262144}).search(auth,sid,{q:'page marker'}));
 throwsBroad(()=>bounded({max_candidates:5000,max_response_bytes:1}).search(auth,sid,{q:'budgetz'}));
 mark('SQ08',{short_candidate_overflow:422,long_matching_overflow:422,items_byte_overflow:422,narrow_full_match:true,VM_CPU_bound_claimed:false});
 // Real network, not inject: legal encoded URL exceeds default Node header threshold.
 await app.listen({host:'127.0.0.1',port:0});const base=`http://127.0.0.1:${app.server.address().port}`;
 const client=new DetunedClient({baseUrl:base,token});const hugeTag='汉'.repeat(2700);assert(Buffer.byteLength(JSON.stringify([hugeTag]))<=8192);
 const native=await client.search(sid,{q:'page marker',tags:[hugeTag],limit:1});assert.deepEqual(native.data,[]);assert.equal(native.meta.next_cursor,null);mark('native-app-client',{encoded_url_over_16KiB:true,tags_json:true});
 console.log(JSON.stringify({passes:true,results,pending_separate:['SQ09 formal/current29/integrity'],limits:['SQLite ASCII/nonASCII branch case behavior audited separately','no 100k performance or hard context budget claim']},null,2));
}catch(e){console.log(JSON.stringify({passes:false,results,error:{name:e.name,message:e.message,stack:e.stack}},null,2));process.exitCode=1;}finally{await app.close();db.close();}
