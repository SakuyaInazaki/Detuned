// Only execute after stable freeze/build. Deterministic WAL callback barrier; no sleeps.
import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
import {HmacTokenSigner} from '../../../../packages/core/dist/index.js';
const dir=await mkdtemp(path.join(os.tmpdir(),'detuned-context-snapshot-'));const file=path.join(dir,'test.sqlite');let db,writer,app;const results=[];let sid,n=0,now=Date.parse('2030-01-01T00:00:00Z');const secret='context-independent-snapshot-secret';const clock={now:()=>new Date(now),nowIso:()=>new Date(now).toISOString()};
async function call(method,url,payload,status=200){const r=await app.inject({method,url,headers:{authorization:`Bearer ${token}`,'idempotency-key':`snapshot-${++n}`},...(payload===undefined?{}:{payload})});assert.equal(r.statusCode,status,r.body);return r.json();}
let token;
try{
 db=new Database(file);assert.equal(db.pragma('journal_mode = WAL',{simple:true}),'wal');token=bootstrapDatabase(db).adminToken;
 const storage=new SqliteStorage(db);app=buildApp({storage,clock,tokenSecret:secret});sid=(await call('POST','/api/v1/spaces',{slug:'snapshot',objective:'old objective',rules:['old rules']},201)).data.space.id;
 writer=new Database(file);assert.equal(writer.pragma('journal_mode',{simple:true}),'wal');const ws=new SqliteStorage(writer),oldSeq=storage.getLatestEventSeq(sid);let fired=false,committedEvent;
 const original=storage.getSpaceRevision.bind(storage);storage.getSpaceRevision=(space,revision)=>{const row=original(space,revision);if(space===sid&&!fired){fired=true;assert.equal(db.inTransaction,true,'reader snapshot must begin before rules');writer.transaction(()=>{
 writer.prepare("INSERT INTO space_revisions(space_id,revision,objective,rules,review_policy,check_profiles,pinned_refs,editor_id,created_at) SELECT space_id,revision+1,'new objective',?,review_policy,check_profiles,pinned_refs,editor_id,created_at FROM space_revisions WHERE space_id=? AND revision=?").run(JSON.stringify(['new rules']),sid,revision);
 writer.prepare('UPDATE spaces SET current_revision=current_revision+1 WHERE id=?').run(sid);
 committedEvent=ws.appendEvent(sid,{id:'barrier-event',type:'space.updated',object_id:sid,revision:revision+1,visibility:'public',actor_id:row.editor_id,created_at:clock.nowIso()});
 })();assert.equal(ws.getLatestEventSeq(sid),oldSeq+1);}return row;};
 const first=await call('GET',`/api/v1/spaces/${sid}/context`);assert(fired);assert.deepEqual(first.data.rules,['old rules']);assert.equal(first.data.objective,'old objective');const signer=new HmacTokenSigner(),payload=signer.verify(first.data.checkpoint_token,secret,now/1000);assert.equal(payload.seq,oldSeq);assert.equal(payload.exp,now/1000+86400);assert(!first.data.recent_activity.some(e=>e.object_id===sid&&e.occurred_at===committedEvent.created_at&&e.type==='space.updated'));
 const next=await call('GET',`/api/v1/spaces/${sid}/context`);assert.deepEqual(next.data.rules,['new rules']);assert.equal(signer.verify(next.data.checkpoint_token,secret,now/1000).seq,oldSeq+1);
 const sub=await call('POST',`/api/v1/spaces/${sid}/subscriptions`,{consumer_key:'after-context',start:'context_checkpoint',checkpoint_token:first.data.checkpoint_token},201);
 const poll=await call('POST',`/api/v1/spaces/${sid}/consumers/${sub.data.consumer.id}/poll`,{limit:100});assert(poll.data.events.some(e=>e.id===committedEvent.id));results.push({id:'CX07',wal:true,barrier:'after old rule read before seq',old_seq:oldSeq,current_seq:oldSeq+1,delivered_event:committedEvent.id});
 now=payload.exp*1000;await call('POST',`/api/v1/spaces/${sid}/subscriptions`,{consumer_key:'exact-expiry',start:'context_checkpoint',checkpoint_token:first.data.checkpoint_token},201);
 now+=1000;const expired=await call('POST',`/api/v1/spaces/${sid}/subscriptions`,{consumer_key:'after-expiry',start:'context_checkpoint',checkpoint_token:first.data.checkpoint_token},422);assert.equal(expired.error.code,'VALIDATION_ERROR');results.push({id:'CX08',clock_exp_equal:201,clock_exp_plus_one:422,token_ttl_seconds:86400});
 console.log(JSON.stringify({passes:true,results},null,2));
}catch(e){console.log(JSON.stringify({passes:false,results,error:{name:e.name,message:e.message,stack:e.stack}},null,2));process.exitCode=1;}finally{if(app)await app.close();if(writer?.open)writer.close();if(db?.open)db.close();await rm(dir,{recursive:true,force:true});}
