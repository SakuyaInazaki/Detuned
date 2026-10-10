// Independent current HTTP sample; no author test imports/assertions or old temporary inputs.
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {readFile,copyFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),fixture=join(root,'tests/fixtures/history-b8dacd5');
const require=createRequire(join(root,'package.json'));
const Database=require('better-sqlite3');
const {buildApp}=await import(pathToFileURL(join(root,'packages/server/dist/index.js')));
const {SqliteStorage,openAndCoordinateDatabase}=await import(pathToFileURL(join(root,'packages/storage-sqlite/dist/index.js')));
const expected=JSON.parse(await readFile(join(fixture,'expected.json'),'utf8')),provenance=JSON.parse(await readFile(join(fixture,'provenance.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>x===null?'null':Array.isArray(x)?'['+x.map(canonical).join(',')+']':typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
for(const [name,digest]of Object.entries(provenance.fixture_sha256))assert.equal(sha(await readFile(join(fixture,name))),digest);
const dir=await mkdtemp(join(tmpdir(),'detuned-hr1-independent-'));let db,app;const observations=[];
const fixed=c=>c.entry==='initial'?c.response_data.initial_post:c.response_data;
const fingerprint=()=>canonical(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all().map(canonical).sort()]));
const token=randomBytes(32).toString('hex'),credential='cred_independent_'+randomBytes(8).toString('hex');
const start=()=>{db=new Database(join(dir,'runtime.db'));openAndCoordinateDatabase(db,'serve');app=buildApp({storage:new SqliteStorage(db),clock:{now:()=>new Date(expected.generated_clock),nowIso:()=>expected.generated_clock}});};
const stop=async()=>{if(app)await app.close();if(db?.open)db.close();};
const send=async(url,payload,key)=>{const r=await app.inject({method:'POST',url,headers:{authorization:`Bearer ${token}`,...(key?{'idempotency-key':key}:{})},...(payload===undefined?{}:{payload})});return {status:r.statusCode,body:r.json()};};
function exact(c,data){const actual=c.entry==='initial'?data.initial_post:data,old=fixed(c);assert.deepEqual(actual.revision,old.revision);assert.deepEqual(actual.post,{...old.post,current_revision:expected.final_post_heads[old.post.id]});if(c.entry==='initial')assert.deepEqual(data.thread,c.response_data.thread);if(old.relations!==undefined)assert.deepEqual(actual.relations,old.relations);}
if(process.argv.includes('--restart-child')){
 const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());
 try{db=new Database(input.database);openAndCoordinateDatabase(db,'serve');app=buildApp({storage:new SqliteStorage(db),clock:{now:()=>new Date(expected.generated_clock),nowIso:()=>expected.generated_clock}});const before=fingerprint();for(const c of expected.cases){const r=await app.inject({method:'POST',url:c.url,headers:{authorization:`Bearer ${input.token}`,'idempotency-key':c.key},payload:c.payload});assert.equal(r.statusCode,201);exact(c,r.json().data);}assert.equal(fingerprint(),before);console.log(JSON.stringify({fresh_child_process:true,replayed_cases:3,all_tables_unchanged:true}));}finally{await stop();await rm(dir,{recursive:true,force:true});}
 process.exit(0);
}

try{
 await copyFile(join(fixture,'legacy.db'),join(dir,'runtime.db'));db=new Database(join(dir,'runtime.db'));
 assert.equal(db.prepare('SELECT count(*) n FROM credentials').get().n,0);assert.equal(db.prepare("SELECT count(*) n FROM instance_metadata WHERE key='token_secret'").get().n,0);
 for(const c of expected.cases){assert.equal(sha(canonical(c.payload)),c.idempotency_record.request_hash);assert.deepEqual(db.prepare('SELECT * FROM idempotency_records WHERE key=?').get(c.key),c.idempotency_record);const rev=fixed(c).revision,raw=db.prepare('SELECT * FROM post_revisions WHERE post_id=? AND revision=?').get(rev.post_id,rev.revision);assert.equal(raw.content_hash,rev.content_hash);assert.equal(sha(`${raw.title}\n${raw.summary}\n${raw.body}\n${canonical(JSON.parse(raw.structured))}`),raw.content_hash);assert.equal(raw.structured,JSON.stringify(rev.structured));assert.equal(db.prepare('SELECT current_revision FROM posts WHERE id=?').get(rev.post_id).current_revision,expected.final_post_heads[rev.post_id]);const ref=JSON.parse(c.idempotency_record.result_ref);assert.equal(ref.kind==='thread.create'?ref.initial_post_id:ref.post_id,rev.post_id);assert.equal(ref.kind==='thread.create'?ref.initial_post_revision:ref.revision,rev.revision);}
 db.prepare("INSERT INTO instance_metadata(key,value) VALUES('token_secret',?)").run(randomBytes(32).toString('hex'));db.prepare('INSERT INTO credentials(id,actor_id,token_hash,allowed_space_ids,capabilities,created_at,expires_at,revoked_at) VALUES(?,?,?,?,?,?,?,?)').run(credential,expected.actor_id,sha(token),JSON.stringify(['*']),JSON.stringify(['read','write','admin']),expected.generated_clock,null,null);db.close();start();
 for(const c of expected.cases){const before=fingerprint(),r=await send(c.url,c.payload,c.key);assert.equal(r.status,201);exact(c,r.body.data);const fresh=await send(c.url,c.payload,c.key+'-independent-new');assert.equal(fresh.status,c.entry==='revision'?409:400);assert.equal(fresh.body.error.code,c.entry==='revision'?'REVISION_CONFLICT':'VALIDATION_ERROR');if(c.entry==='revision'){const current=await send(c.url,{...c.payload,expected_revision:expected.final_post_heads[fixed(c).post.id]},c.key+'-independent-current');assert.equal(current.status,400);assert.equal(current.body.error.code,'VALIDATION_ERROR');}const changed=await send(c.url,{...c.payload,title:'independent changed body'},c.key);assert.equal(changed.status,409);assert.equal(changed.body.error.code,'IDEMPOTENCY_CONFLICT');assert.equal(fingerprint(),before);observations.push({entry:c.entry,replay:201,fresh:fresh.status,changed:409,all_tables_unchanged:true,raw_hash_and_canonical_request_verified:true});}
 const beforeRestart=fingerprint();await stop();const child=JSON.parse(execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--restart-child'],{input:JSON.stringify({database:join(dir,'runtime.db'),token}),encoding:'utf8'}));assert.equal(child.fresh_child_process,true);start();for(const c of expected.cases){const r=await send(c.url,c.payload,c.key);assert.equal(r.status,201);exact(c,r.body.data);}assert.equal(fingerprint(),beforeRestart);observations.push({restart_replay:true,fresh_child_process:true,all_tables_unchanged:true});
 for(const id of new Set(expected.cases.map(c=>fixed(c).post.id)))assert.equal((await send(`/api/v1/spaces/${expected.space_id}/redactions`,{target_type:'post',target_id:id,reason:'independent historical tombstone'},'independent-redact-'+id)).status,201);
 const redacted=fingerprint();for(const c of expected.cases){const r=await send(c.url,c.payload,c.key);assert.equal(r.status,201);const actual=c.entry==='initial'?r.body.data.initial_post:r.body.data,original=fixed(c).revision;assert.equal(actual.post.lifecycle,'redacted');assert.deepEqual(actual.revision,{...original,title:'[REDACTED]',summary:'[REDACTED]',body:'[REDACTED]',tags:[],structured:{},content_hash:'redacted'});assert.equal(db.prepare('SELECT content_hash FROM post_revisions WHERE post_id=? AND revision=?').get(original.post_id,original.revision).content_hash,original.content_hash);}assert.equal(fingerprint(),redacted);observations.push({tombstone_replay:true,raw_hash_preserved:true,all_tables_unchanged:true});
 assert.equal((await send(`/api/v1/admin/credentials/${credential}/revoke`)).status,200);const revoked=fingerprint();for(const c of expected.cases){const r=await send(c.url,c.payload,c.key);assert.equal(r.status,401);assert.equal(r.body.error.code,'UNAUTHENTICATED');}assert.equal(fingerprint(),revoked);observations.push({revocation_before_all_replays:true,all_tables_unchanged:true});
 const report={source:'independent current dist HTTP inject over persistent new real b8dacd5 archive',original_lost_fixture_recovered:false,observations};await writeFile(new URL('history-independent-http.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await stop();await rm(dir,{recursive:true,force:true});}
