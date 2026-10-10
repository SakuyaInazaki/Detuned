import assert from 'node:assert/strict';
import { readdir, readFile, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { makeHarness } from './real-harness-factory.mjs';
import { filePart, metadataPart, end, rawUpload, boundary, assertNoStoragePath } from './probe-multipart.mjs';
import { DirectoryLock } from '../../../../packages/storage-sqlite/dist/index.js';
const results=[];
const wait=async fn=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('bounded condition not reached');};
async function check(id,fn,options={}) { let h;const started_at=new Date().toISOString();try{h=await makeHarness(options);await fn(h);results.push({id,passes:true,started_at,finished_at:new Date().toISOString()});}catch(e){results.push({id,passes:false,started_at,finished_at:new Date().toISOString(),error:{name:e.name,message:e.message,stack:e.stack},snapshot:h?.snapshot()});}finally{console.error(`Completed ${id}: ${results.at(-1)?.passes}`);await h?.close();}}
const api=async(h,method,url,payload,token=h.token,key)=>{const r=await fetch(new URL(url,h.app.listeningOrigin),{method,headers:{authorization:`Bearer ${token}`,...(payload!==undefined?{'content-type':'application/json'}:{}),...(key?{'idempotency-key':key}:{})},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});let body;const text=await r.text();try{body=JSON.parse(text);}catch{body=text;}return {status:r.status,body,headers:Object.fromEntries(r.headers)};};
await check('P01-trailing-parts-interruption',async h=>{
 const before=h.snapshot();
 for(const chunks of [[filePart('valid'),metadataPart('{"visibility":"review_assignment"}'),end],[filePart('valid'),metadataPart('{'),end],[filePart('valid')]]){
  const r=await rawUpload({url:h.uploadUrl,token:h.token,key:'bad-tail',chunks}).result;assert(r.status>=400);assert.deepEqual(h.snapshot(),before);await h.assertNoOwnCandidates();
 }
 const incomplete=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x"\r\nContent-Type: text/plain\r\n\r\nongoing`);
 const u=rawUpload({url:h.uploadUrl,token:h.token,key:'disconnect',chunks:[incomplete],pauseAfter:0});await u.paused;
 await wait(async()=> (await readdir(path.join(h.dir,'artifacts/staging'))).length===1);u.abort();await u.observed;
 await wait(async()=> (await readdir(path.join(h.dir,'artifacts/staging'))).length===0);assert.deepEqual(h.snapshot(),before);await h.assertNoOwnCandidates();
});
await check('P02-restart-replay-and-contract',async h=>{
 const first=await h.upload('stable evidence','replay');assert.equal(first.status,201);assertNoStoragePath(first.body);const before=h.snapshot();await h.restart();
 const again=await h.upload('stable evidence','replay');assert.equal(again.status,201);assert.deepEqual(again.body.data,first.body.data);assert.deepEqual(h.snapshot(),before);
 assert.equal((await h.upload('changed evidence','replay')).status,409);assert.deepEqual(h.snapshot(),before);await h.assertNoOwnCandidates();
 const data=first.body.data;const content=await api(h,'GET',data.content_url);assert.equal(content.body,'stable evidence');assert.equal(content.headers['x-content-type-options'],'nosniff');assert(content.headers['content-disposition'].startsWith('attachment;'));
 const {generateOpenApiSpec}=await import('../../../../packages/protocol/dist/index.js');const spec=generateOpenApiSpec();assert.equal(Object.values(spec.paths).reduce((n,ms)=>n+Object.keys(ms).length,0),35);assert(spec.paths['/spaces/{space_id}/artifacts'].post.requestBody.content['multipart/form-data']);
});
await check('P03-concurrent-quota-slots',async h=>{
 console.error('P03 quota start');const both=await Promise.all([h.upload('12345678','quota-a'),h.upload('12345678','quota-b')]);assert.deepEqual(both.map(r=>r.status).sort(),[201,429]);assert.equal(h.storage.getArtifactBytesInSpace(h.sid),8);await h.assertNoOwnCandidates();
 console.error('P03 quota complete');const requests=[];try{
  for(let i=0;i<4;i++)requests.push(rawUpload({url:h.uploadUrl,token:h.token,key:`slot-${i}`,chunks:[Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x"\r\nContent-Type: text/plain\r\n\r\nx`)],pauseAfter:0}));
  console.error('P03 waiting paused');await Promise.all(requests.map(r=>r.paused));console.error('P03 paused');await wait(async()=> (await readdir(path.join(h.dir,'artifacts/staging'))).length===4);
  console.error('P03 four staged');assert.equal((await h.upload('x','fifth')).status,429);console.error('P03 fifth rejected');
 }finally{requests.forEach(r=>r.abort());await Promise.all(requests.map(r=>r.observed));}
 await wait(async()=> (await readdir(path.join(h.dir,'artifacts/staging'))).length===0);
 assert.equal((await h.upload('x','after-failure')).status,201);await h.assertNoOwnCandidates();
},{artifactLimits:{max_file_bytes:64,max_space_bytes:9}});
await check('P04-revoke-during-upload',async h=>{
 for(const mode of ['credential','membership']){
  const actor=(await api(h,'POST','/api/v1/admin/actors',{kind:'agent',display_name:mode})).body.data.id;
  const credential=(await api(h,'POST','/api/v1/admin/credentials',{actor_id:actor,allowed_space_ids:['*'],capabilities:['read','write']})).body.data;
  assert.equal((await api(h,'POST',`/api/v1/spaces/${h.sid}/memberships`,{actor_id:actor,role:'contributor'})).status,201);
  const u=rawUpload({url:h.uploadUrl,token:credential.token,key:`revoke-${mode}`,chunks:[filePart('long'),metadataPart('{}'),end],pauseAfter:0});await u.paused;
  await wait(async()=> (await readdir(path.join(h.dir,'artifacts/staging'))).length===1);
  if(mode==='credential')assert.equal((await api(h,'POST',`/api/v1/admin/credentials/${credential.credential_id}/revoke`)).status,200);
  else assert.equal((await api(h,'DELETE',`/api/v1/spaces/${h.sid}/memberships/${actor}`)).status,200);
  const before=h.snapshot();u.resume();const r=await u.result;assert([401,403,404].includes(r.status));assert.deepEqual(h.snapshot(),before);await h.assertNoOwnCandidates();
 }
});
await check('P05-ownership-symlink-db-failure-gc',async h=>{
 const original=await h.upload('keep','keep');assert.equal(original.status,201);const row=h.storage.findArtifactById(original.body.data.id);const object=path.join(h.dir,'artifacts/objects',row.storage_key);const sentinel=await readFile(object);
 const stage=await h.blobs.stage((async function*(){yield Buffer.from('collision');})(),100);await assert.rejects(h.blobs.publish(stage,row.storage_key));assert.deepEqual(await readFile(object),sentinel);await h.blobs.discardStage(stage);
 const external=path.join(h.dir,'external-sentinel');await writeFile(external,'untouched');await symlink(external,path.join(h.dir,'artifacts/objects','symlink_probe'));await assert.rejects(h.blobs.open('symlink_probe'));assert.equal(await readFile(external,'utf8'),'untouched');
 h.db.exec("CREATE TRIGGER independent_fail_artifact BEFORE INSERT ON artifacts BEGIN SELECT RAISE(ABORT, 'independent failure'); END");const before=h.snapshot();assert.equal((await h.upload('fail','db-fail')).status,500);assert.deepEqual(h.snapshot(),before);assert.deepEqual(await readFile(object),sentinel);h.db.exec('DROP TRIGGER independent_fail_artifact');
 // Remove our symlink itself, then GC under the same DirectoryLock boundary used by CLI.
 const {unlink}=await import('node:fs/promises');await unlink(path.join(h.dir,'artifacts/objects','symlink_probe'));
 await h.blobs.stage((async function*(){yield Buffer.from('orphan');})(),100);await writeFile(path.join(h.dir,'artifacts/objects','orphan_probe'),'orphan');
 const lock=new DirectoryLock(h.dir);lock.acquire();try{const second=new DirectoryLock(h.dir);assert.throws(()=>second.acquire());await h.blobs.cleanupOrphans(h.storage.listArtifactStorageKeys());}finally{lock.release();}
 assert.deepEqual(await readFile(object),sentinel);await h.assertNoOwnCandidates();
});
await check('P06-ready-reference-three-writes',async h=>{
 const artifact=(await h.upload('evidence','ref')).body.data;const prefix=`/api/v1/spaces/${h.sid}`;
 const thread=await api(h,'POST',`${prefix}/threads`,{title:'initial',initial_post:{kind:'note',title:'t',summary:'s',body:'b',artifact_ids:[artifact.id]}},h.token,'initial');assert.equal(thread.status,201);
 const tid=thread.body.data.thread.id;const post=await api(h,'POST',`${prefix}/threads/${tid}/posts`,{kind:'note',title:'t',summary:'s',body:'b',artifact_ids:[artifact.id]},h.token,'post');assert.equal(post.status,201);
 const pid=post.body.data.post.id;assert.equal((await api(h,'POST',`${prefix}/posts/${pid}/revisions`,{expected_revision:1,title:'v2',summary:'s',body:'b',artifact_ids:[artifact.id]},h.token,'revision')).status,201);
 assert.equal(h.db.prepare('SELECT count(*) n FROM revision_artifacts').get().n,3);
 for(const kind of ['duplicate','cross-space','redacted']){
  let ids=[artifact.id],expected=400;
  if(kind==='duplicate')ids=[artifact.id,artifact.id];
  if(kind==='cross-space'){const other=await api(h,'POST','/api/v1/spaces',{slug:'other',objective:'o',rules:[]},h.token,'other');h.db.prepare('UPDATE artifacts SET space_id=? WHERE id=?').run(other.body.data.space.id,artifact.id);expected=404;}
  if(kind==='redacted'){h.db.prepare("UPDATE artifacts SET space_id=?,state='redacted' WHERE id=?").run(h.sid,artifact.id);expected=410;}
  const before=h.snapshot();const bad=await api(h,'POST',`${prefix}/threads/${tid}/posts`,{kind:'note',title:'bad',summary:'s',body:'b',artifact_ids:ids},h.token,`bad-${kind}`);assert.equal(bad.status,expected);assert.deepEqual(h.snapshot(),before);
 }
});
console.log(JSON.stringify({runtime:process.version,probes:results,summary:{passed:results.filter(r=>r.passes).length,total:results.length}},null,2));
process.exitCode=results.every(r=>r.passes)?0:1;
