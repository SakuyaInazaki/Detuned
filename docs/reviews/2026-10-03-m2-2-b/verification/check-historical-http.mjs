// Run only after explicit stable build. Real old success captured from hash-verified prior dist.
import assert from 'node:assert/strict';import {readFile,copyFile,mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,openAndCoordinateDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
const f=JSON.parse(await readFile(new URL('../../2026-10-03-m2-2-a/verification/historical-fixture.json',import.meta.url),'utf8'));
const added=JSON.parse(await readFile(new URL('../../2026-10-03-m2-2-a/verification/historical-additional-fixtures.json',import.meta.url),'utf8'));
const token=JSON.parse(await readFile(f.temporary_credentials,'utf8')).token;
const dir=await mkdtemp(path.join(os.tmpdir(),'detuned-m22a-replay-')),file=path.join(dir,'test.db');await copyFile(f.temporary_database,file);
let db,app;const results=[];
const start=()=>{db=new Database(file);openAndCoordinateDatabase(db,'serve');app=buildApp({storage:new SqliteStorage(db)});};
const stop=async()=>{if(app)await app.close();if(db?.open)db.close();};
const snapshot=()=>Object.fromEntries(['threads','posts','post_revisions','revision_artifacts','relations','events','idempotency_records'].map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));
const call=async(url,payload,key)=>{const r=await app.inject({method:'POST',url,headers:{authorization:`Bearer ${token}`,...(key!==undefined?{'idempotency-key':key}:{})},payload});return{status:r.statusCode,body:r.json()};};
const expectedData = c => { const expected = structuredClone(c.response.body.data); for (const post of [expected.post, expected.initial_post?.post]) { if (post) post.current_revision = db.prepare('SELECT current_revision FROM posts WHERE id=?').get(post.id).current_revision; } return expected; };
const cases=[{entry:'initial',url:`/api/v1/spaces/${f.space_id}/threads`,payload:f.payload,key:f.key,response:f.response,idempotency_record:f.idempotency_record},...added.cases.filter(c=>c.response.status===201)];
try{
 start();for(const c of cases){const before=snapshot();const original=db.prepare('SELECT * FROM idempotency_records WHERE key=?').get(c.key);assert.equal(original.request_hash,c.idempotency_record.request_hash);
  const replay=await call(c.url,c.payload,c.key);assert.equal(replay.status,201);assert.deepEqual(replay.body.data,expectedData(c));assert.deepEqual(snapshot(),before);
  const fresh=await call(c.url,c.payload,c.key+'-new');
  let currentRevisionValidation;
  if(c.entry==='revision') {
    // Same raw new-key retry is stale because the historical success already advanced revision.
    assert.equal(fresh.status,409);assert.equal(fresh.body.error.code,'REVISION_CONFLICT');assert.deepEqual(snapshot(),before);
    const postId=c.url.split('/').at(-2);const current=db.prepare('SELECT current_revision FROM posts WHERE id=?').get(postId).current_revision;
    const currentPayload={...c.payload,expected_revision:current};
    const corrected=await call(c.url,currentPayload,c.key+'-new-current');assert.equal(corrected.status,400);assert.equal(corrected.body.error.code,'VALIDATION_ERROR');assert.deepEqual(snapshot(),before);
    currentRevisionValidation={status:corrected.status,expected_revision:current,only_changed_field:'expected_revision',structured_unchanged:true};
  } else {assert.equal(fresh.status,400);assert.equal(fresh.body.error.code,'VALIDATION_ERROR');assert.deepEqual(snapshot(),before);}
  const changed=await call(c.url,{...c.payload,title:'changed request'},c.key);assert.equal(changed.status,409);assert.deepEqual(snapshot(),before);
  results.push({entry:c.entry,original_key_status:replay.status,new_key_status:fresh.status,current_revision_validation:currentRevisionValidation,changed_payload_status:changed.status,raw_hash_unchanged:true});
 }
 await stop();start();for(const c of cases){const r=await call(c.url,c.payload,c.key);assert.equal(r.status,201);assert.deepEqual(r.body.data,expectedData(c));}
 const post=f.response.body.data.initial_post.post.id;const redact=await call(`/api/v1/spaces/${f.space_id}/redactions`,{target_type:'post',target_id:post,reason:'independent redaction'},'independent-redaction');assert.equal(redact.status,201);
 const redacted=await call(cases[0].url,cases[0].payload,cases[0].key);assert.equal(redacted.status,201);assert.equal(redacted.body.data.initial_post.post.lifecycle,'redacted');assert(!JSON.stringify(redacted.body.data.initial_post.revision).includes('old attempt'));
 const credential=db.prepare('SELECT id FROM credentials LIMIT 1').get().id;assert.equal((await call(`/api/v1/admin/credentials/${credential}/revoke`,undefined,undefined)).status,200);
 assert.equal((await call(cases[0].url,cases[0].payload,cases[0].key)).status,401);
 console.log(JSON.stringify({passes:true,cases:results,restart_replays:cases.length,redaction_replay_status:redacted.status,revoked_replay_status:401},null,2));
}catch(e){console.log(JSON.stringify({passes:false,cases:results,error:{name:e.name,message:e.message,stack:e.stack},snapshot:db?.open?snapshot():undefined},null,2));process.exitCode=1;}finally{await stop();await rm(dir,{recursive:true,force:true});}
