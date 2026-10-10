// Finite fresh typed/ref HTTP scenarios. Execute only after explicit final freeze/build.
import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;const app=buildApp({storage:new SqliteStorage(db)});const results=[];let seq=0,sid,thread,source;
const call=async(url,payload,key=`typed-${++seq}`)=>{const r=await app.inject({method:'POST',url,headers:{authorization:`Bearer ${token}`,'idempotency-key':key},payload});return{status:r.statusCode,body:r.json()};};
const snapshot=()=>Object.fromEntries(['threads','thread_versions','posts','post_revisions','relations','revision_artifacts','events','idempotency_records'].map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));
const failure=(patch={})=>({attempt:'bounded attempt',category:'budget_exhausted',assumptions:[],tested_scope:'this execution only',expected:'complete',observed:'budget exhausted',evidence_refs:[{kind:'post',post_id:source,revision:1}],evidence_state:'provided',ruled_out:'this run only',not_ruled_out:[],retry_when:[],...patch});
const content=(kind,structured)=>({kind,title:'typed',summary:'s',body:'b',structured});
async function write(entry,kind,structured,post){const body=content(kind,structured);if(entry==='initial')return call(`/api/v1/spaces/${sid}/threads`,{title:'new initial',initial_post:body});if(entry==='post')return call(`/api/v1/spaces/${sid}/threads/${thread}/posts`,body);const {kind:ignored,...revision}=body;return call(`/api/v1/spaces/${sid}/posts/${post}/revisions`,{...revision,expected_revision:db.prepare('SELECT current_revision FROM posts WHERE id=?').get(post).current_revision});}
async function invalid(entry,kind,structured,post,status=400){const before=snapshot();const r=await write(entry,kind,structured,post);assert.equal(r.status,status);assert.deepEqual(snapshot(),before);return r;}
try{
 const sp=await call('/api/v1/spaces',{slug:'typed-probe',objective:'scope',rules:[]});sid=sp.body.data.space.id;thread=(await call(`/api/v1/spaces/${sid}/threads`,{title:'source'})).body.data.thread.id;
 source=(await call(`/api/v1/spaces/${sid}/threads/${thread}/posts`,{kind:'note',title:'Source revision1',summary:'s',body:'SourceBody1'})).body.data.post.id;
 await call(`/api/v1/spaces/${sid}/posts/${source}/revisions`,{expected_revision:1,title:'Source revision2',summary:'s',body:'SourceBody2'});
 const good={proposal:{statement:' statement ',assumptions:[],scope:'scope',falsification_plan:'test'},claim:{statement:'claim',assumptions:[],scope:'scope',falsification_plan:'test'},failure:failure(),summary:{source_refs:[{post_id:source,revision:1}]}};
 for(const kind of Object.keys(good)){
  const seed=await write('post',kind,good[kind]);assert.equal(seed.status,201);const post=seed.body.data.post.id;
  for(const entry of ['initial','post','revision']){
   const ok=await write(entry,kind,good[kind],post);assert.equal(ok.status,201);
   const bad=structuredClone(good[kind]);if(kind==='proposal'||kind==='claim')bad.assumptions=[42];if(kind==='failure')delete bad.evidence_state;if(kind==='summary')bad.source_refs=[];
   await invalid(entry,kind,bad,post);results.push({kind,entry,valid:201,invalid:400,atomic:true});
  }
 }
 for(const entry of ['initial','post','revision']){
  const seed=await write('post','failure',failure());const post=seed.body.data.post.id;
  await invalid(entry,'failure',failure({evidence_refs:[]}),post);
  await invalid(entry,'failure',failure({evidence_state:'unverified',evidence_missing_reason:'   ',evidence_refs:[]}),post);
  assert.equal((await write(entry,'failure',failure({evidence_state:'unverified',evidence_missing_reason:'no external check yet',evidence_refs:[]}),post)).status,201);
  for(const ref of [{kind:'post',post_id:source,revision:999},{kind:'post',post_id:'post_absent',revision:1}])await invalid(entry,'failure',failure({evidence_refs:[ref]}),post,404);
 }
 // The exact old revision is retained even after target updates and withdrawal.
 const summary=await write('post','summary',good.summary);assert.equal(summary.status,201);const row=db.prepare('SELECT structured FROM post_revisions WHERE post_id=? AND revision=1').get(summary.body.data.post.id);assert.equal(JSON.parse(row.structured).source_refs[0].revision,1);
 assert.equal((await call(`/api/v1/spaces/${sid}/posts/${source}/withdraw`,{expected_revision:2,reason:'independent withdrawn'})).status,200);
 assert.equal((await write('post','summary',good.summary)).status,201);
 const other=(await call('/api/v1/spaces',{slug:'other',objective:'o',rules:[]})).body.data.space.id;const ot=(await call(`/api/v1/spaces/${other}/threads`,{title:'other'})).body.data.thread.id;const op=(await call(`/api/v1/spaces/${other}/threads/${ot}/posts`,{kind:'note',title:'other',summary:'s',body:'b'})).body.data.post.id;
 await invalid('post','summary',{source_refs:[{post_id:op,revision:1}]},undefined,404);
 assert.equal((await call(`/api/v1/spaces/${sid}/redactions`,{target_type:'post',target_id:source,reason:'independent redaction'})).status,201);
 await invalid('post','summary',good.summary,undefined,410);
 console.log(JSON.stringify({passes:true,matrix:results,conditions_three_entries:true,fixed_old_revision:true,withdrawn_old_allowed:true,cross_space_status:404,redacted_status:410},null,2));
}catch(e){console.log(JSON.stringify({passes:false,matrix:results,error:{name:e.name,message:e.message,stack:e.stack},snapshot:snapshot()},null,2));process.exitCode=1;}finally{await app.close();db.close();}
