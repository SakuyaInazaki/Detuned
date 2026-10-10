import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,access,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const require=createRequire(path.join(root,'package.json')),Database=require('better-sqlite3');
const v=path.join(root,'docs/reviews/2026-10-09-m7-1-a/verification');
const capture=path.join(v,'capture');
const output=process.argv[2]?path.resolve(process.argv[2]):here;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=async p=>digest(await readFile(p));
const base=JSON.parse(await readFile(path.join(v,'baseline.json'),'utf8'));
assert.equal(Object.keys(base.product_source_config_test_hashes).length,393);assert.equal(Object.keys(base.dist_hashes).length,535);
for(const [p,h] of Object.entries(base.product_source_config_test_hashes))if(p!=='.gitignore')assert.equal(await hash(path.join(root,p)),h,'Accepted source changed: '+p);
for(const [p,h] of Object.entries(base.dist_hashes))assert.equal(await hash(path.join(root,p)),h,'Accepted built changed: '+p);
assert(!existsSync(path.join(output,'database.sqlite'))&&!existsSync(path.join(output,'manifest.json')),'Refuse existing fixture output');
await access(output);await access(capture);
const {buildApp}=await import(pathToFileURL(path.join(root,'packages/server/dist/index.js')));
const {SqliteStorage,bootstrapDatabase,CURRENT_SCHEMA_VERSION,classifyDatabase}=await import(pathToFileURL(path.join(root,'packages/storage-sqlite/dist/index.js')));
assert.equal(CURRENT_SCHEMA_VERSION,5);
const directory=await mkdtemp(path.join(tmpdir(),'detuned-m7-v5-capture-'));
await writeFile(path.join(capture,'owned-running.json'),JSON.stringify({pid:process.pid,directory,stage:'generation'})+'\n');
let db,app,archive;const secrets=[];let tick=Date.parse('2026-10-09T16:00:00.000Z'),seq=0;
const clock={now:()=>new Date(tick),nowIso:()=>new Date(tick).toISOString()};
const statuses=[];
try{
 db=new Database(path.join(directory,'source.sqlite'));db.pragma('foreign_keys=ON');db.pragma('journal_mode=WAL');const boot=bootstrapDatabase(db),token=boot.adminToken;assert.equal(typeof token,'string');secrets.push(token);const storage=new SqliteStorage(db);const oldSecret=storage.getInstanceSecret();secrets.push(oldSecret);
 app=buildApp({storage,clock});await app.ready();
 async function call(method,route,payload,bearer=token,status=method==='POST'?201:200,key){tick+=60000;const r=await app.inject({method,url:'/api/v1'+route,headers:{authorization:'Bearer '+bearer,...(key?{'idempotency-key':key}:{})},...(payload===undefined?{}:{payload})});assert.equal(r.statusCode,status,'Capture HTTP '+route+' code '+r.json().error?.code);statuses.push({method,route,status:r.statusCode});return r.json().data;}
 const policy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
 const sid=(await call('POST','/spaces',{slug:'m7-v5-baseline',objective:'Synthetic immutable V5 source',rules:[],review_policy:policy},token,201,'v5-space')).space.id;
 const tid=(await call('POST',`/spaces/${sid}/threads`,{title:'V5 capture'},token,201,'v5-thread')).thread.id;
 const claim={statement:'Synthetic V5 fixed claim',assumptions:['Local fixture only'],scope:'No model or blob',falsification_plan:'Independent migration preservation'};
 const target=(await call('POST',`/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'Fixed V5 target',summary:'Synthetic',body:'Retain original V5 material',structured:claim},token,201,'v5-target')).post.id;
 const reviewers=[];
 for(const name of ['one','two']){const actor=await call('POST','/admin/actors',{kind:'human',display_name:'V5 reviewer '+name});await call('POST',`/spaces/${sid}/memberships`,{actor_id:actor.id,role:'observer',reviewer_eligible:true,independence_group:'v5-group-'+name});const cred=await call('POST','/admin/credentials',{actor_id:actor.id,allowed_space_ids:[sid],capabilities:['read','write']});secrets.push(cred.token);reviewers.push({id:actor.id,token:cred.token});}
 const request=await call('POST',`/spaces/${sid}/review-requests`,{target_ref:{post_id:target,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:reviewers.map(x=>x.id),expected_policy_revision:1,reproduction_instructions:'Synthetic source with no external execution'},token,201,'v5-request');
 const submissions=[];
 for(const actor of reviewers){const session=await call('POST',`/spaces/${sid}/sessions`,{client_name:'m7-v5-capture',client_version:'1'},actor.token);const body={snapshot_sha256:request.snapshot_sha256,reviewer_session_id:session.id,completion_status:'complete',verdict:'accept',coverage:'Fixed V5 independently reviewed material',checks_performed:'Synthetic inspection; no external execution',evidence_refs:[],pending_requirements:[],limitations:['Local test fixture'],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Distinct fixture actor/group'}};submissions.push(await call('POST',`/spaces/${sid}/review-requests/${request.id}/submissions`,body,actor.token,201,'v5-submit-'+actor.id));}
 const decision=await call('POST',`/spaces/${sid}/review-requests/${request.id}/finalize`,{expected_version:3},token,200,'v5-finalize');assert.equal(decision.outcome,'accepted');
 const subscribed=await call('POST',`/spaces/${sid}/subscriptions`,{consumer_key:'v5-pending',start:'beginning',thread_ids:[tid]},token);const polled=await call('POST',`/spaces/${sid}/consumers/${subscribed.consumer.id}/poll`,{limit:1,wait_ms:0},token,200);assert(polled.events.length>0);assert(polled.batch_id);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(classifyDatabase(db).maxVersion,5);
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(x=>x.name);
 const businessTables=tables.filter(x=>x!=='credentials'&&x!=='instance_metadata');
 const rows=()=>Object.fromEntries(businessTables.map(name=>[name,db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
 const original=rows();assert.equal(original.artifacts.length,0);assert.equal(original.revision_artifacts.length,0);assert.equal(original.review_decisions.length,1);assert.equal(original.review_submissions.length,2);assert(original.review_submissions.every(x=>x.revealed_at!==null));assert.equal(original.events.filter(x=>x.type==='review.revealed').length,1);assert.equal(original.events.filter(x=>x.type==='review.finalized').length,1);
 const consumer=original.consumers.find(x=>x.id===subscribed.consumer.id),batch=original.delivery_batches.find(x=>x.id===consumer.active_batch_id);assert(batch);assert.equal(batch.acked_at,null);assert.equal(consumer.ack_seq,0);assert(JSON.parse(batch.event_ids).length>0);
 const credentialHashes=db.prepare('SELECT token_hash FROM credentials').all().map(x=>x.token_hash);secrets.push(...credentialHashes);
 assert(!tables.some(t=>db.prepare('PRAGMA foreign_key_list("'+t+'")').all().some(x=>x.table==='credentials')));
 await app.close();app=undefined;db.pragma('wal_checkpoint(TRUNCATE)');db.transaction(()=>{db.prepare('DELETE FROM credentials').run();db.prepare("DELETE FROM instance_metadata WHERE key='token_secret'").run();})();assert.deepEqual(rows(),original);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.pragma('wal_checkpoint(TRUNCATE)');
 const tempArchive=path.join(directory,'archive.sqlite');db.prepare('VACUUM INTO ?').run(tempArchive);db.close();db=undefined;
 archive=new Database(tempArchive,{readonly:true});assert.equal(archive.prepare('SELECT count(*) n FROM credentials').get().n,0);assert.equal(archive.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get(),undefined);assert.deepEqual(archive.prepare('PRAGMA integrity_check').all(),[{integrity_check:'ok'}]);assert.deepEqual(archive.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(classifyDatabase(archive).kind,'corrupt');
 for(const name of businessTables)assert.deepEqual(archive.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all(),original[name]);
 const archiveBytes=await readFile(tempArchive);for(const secret of secrets)assert(!archiveBytes.includes(Buffer.from(secret)),'Secret scan failed');
 const sourceproof={source_count:393,dist_count:535,source_sha256:base.product_source_config_test_hashes,dist_sha256:base.dist_hashes,baseline_sha256:await hash(path.join(v,'baseline.json')),schema:5,generator_sha256:await hash(fileURLToPath(import.meta.url)),runtime:{node:process.version,sqlite:archive.prepare('SELECT sqlite_version() v').get().v,better_sqlite3:require('better-sqlite3/package.json').version},imported_built:['packages/server/dist/index.js','packages/storage-sqlite/dist/index.js'],no_build:true};
 const tableFacts=Object.fromEntries([...businessTables,'credentials','instance_metadata'].map(t=>{const data=archive.prepare('SELECT * FROM "'+t+'" ORDER BY rowid').all();return [t,{count:data.length,rows_sha256:digest(JSON.stringify(data))}];}));
 const manifest={format_version:1,generated_at:new Date().toISOString(),source_kind:'Actual accepted built schema5 HTTP handlers/services via app.inject, not TCP/model or SQL fabricated formal state',runtime:sourceproof.runtime,source_baseline_sha256:sourceproof.baseline_sha256,sourceproof_sha256:digest(JSON.stringify(sourceproof,null,2)+'\n'),generator_sha256:sourceproof.generator_sha256,archive:{file:'database.sqlite',bytes:archiveBytes.length,sha256:digest(archiveBytes)},schema_version:5,migrations:archive.prepare('SELECT * FROM schema_migrations ORDER BY version').all(),schema_sql_sha256:await hash(path.join(root,'packages/storage-sqlite/src/schema.sql')),table_facts:tableFacts,fixture:{space_id:sid,thread_id:tid,target_ref:{post_id:target,revision:1},author_actor_id:boot.adminActorId,reviewer_actor_ids:reviewers.map(x=>x.id),request,snapshot_sha256:request.snapshot_sha256,submissions,decision,consumer,batch},sanitization:{all_credentials_removed:true,token_secret_removed:true,known_token_hash_secret_scan_passed:true,business_rows_exact:true,foreign_key_check:[],integrity_check:'ok',artifact_rows:0,no_blob_store_created:true,archive_classification:'corrupt: deliberately no runtime token_secret; copy hydration required'},hydration:'Copy archive; raw SQLite insert fresh token_secret before coordinator; optional fresh bounded credentials for retained actor IDs. Do not init/bootstrap original or alter business/formal history.',reproducibility:'Normal tests copy checked-in archive+manifest. Generator/current accepted V5 built only for explicit capture; no old Git/tmp/model dependency. Random IDs/time/bootstrap mean semantic, not byte-identical regeneration.'};
 const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');for(const secret of secrets)assert(!manifestBytes.includes(Buffer.from(secret)),'Manifest secret scan failed');archive.close();archive=undefined;
 await writeFile(path.join(capture,'sourceproof.json'),JSON.stringify(sourceproof,null,2)+'\n');await writeFile(path.join(capture,'http-statuses.json'),JSON.stringify(statuses,null,2)+'\n');await rename(tempArchive,path.join(output,'database.sqlite'));await writeFile(path.join(output,'manifest.json'),manifestBytes,{flag:'wx'});console.log(JSON.stringify({state:'captured_sanitized',archive_sha256:manifest.archive.sha256,schema:5,decision:'accepted',submissions:2,pending_batch:true,artifacts:0,secrets_removed:true,http_calls:statuses.length}));
}finally{
 if(app)await app.close();if(archive?.open)archive.close();if(db?.open)db.close();await rm(directory,{recursive:true,force:true});await writeFile(path.join(capture,'cleanup.json'),JSON.stringify({pid:process.pid,owned_directory:directory,removed:!existsSync(directory),app_closed:true,databases_closed:true,operations:'Only own capture directory removed; no old temp/VM/daemon/global scan'},null,2)+'\n');await rm(path.join(capture,'owned-running.json'),{force:true});
}
