import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const require=createRequire(path.join(root,'package.json')),Database=require('better-sqlite3');
const source=JSON.parse(await readFile(path.join(here,'old-schema3-review-runtime-manifest.json'),'utf8'));
for(const item of source.files){const b=await readFile(path.join(here,item.snapshot_path));assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);}
const frozen=path.join(here,'old-schema3-review-runtime');
const core=await import(pathToFileURL(path.join(frozen,'packages/core/dist/index.js')).href);
const sqlite=await import(pathToFileURL(path.join(frozen,'packages/storage-sqlite/dist/index.js')).href);
const review=await import(pathToFileURL(path.join(frozen,'modules/review/dist/index.js')).href);
const directory=await mkdtemp(path.join(tmpdir(),'detuned-old3-review-oracle-'));let db;
const receipt={kind:'actual frozen M6B schema3 original service extraction',source_manifest_sha256:createHash('sha256').update(await readFile(path.join(here,'old-schema3-review-runtime-manifest.json'))).digest('hex'),stages:[],cleanup_removed:false};
try{
 db=new Database(path.join(directory,'forum.sqlite'));db.pragma('journal_mode=WAL');sqlite.bootstrapDatabase(db);
 assert.equal(db.prepare('SELECT max(version) n FROM schema_migrations').get().n,3);
 const storage=new sqlite.SqliteStorage(db),hasher=new core.CryptoHasher(),idGen=new core.CryptoIdGenerator();
 let now='2026-10-09T00:00:00.000Z';const clock={now:()=>new Date(now),nowIso:()=>now};
 const auth=new core.AuthService(storage,hasher,clock),idem=new core.IdempotencyService(storage,hasher,clock);
 const sid='spc-old3-review-fixture',tid='thd-old3-review-fixture',ids={author:'act-old3-author',one:'act-old3-one',two:'act-old3-two',observer:'act-old3-observer'};
 const credentials=new Map();
 for(const [name,id] of Object.entries(ids)){
  storage.createActor({id,kind:'human',display_name:'synthetic '+name,created_at:now,disabled_at:null});
  const token=randomBytes(32).toString('hex');credentials.set(id,token);
  storage.createCredential({id:'cred-owned-'+name,actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[sid],capabilities:name==='observer'?['read']:['read','write'],created_at:now,expires_at:null,revoked_at:null});
 }
 const policy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
 storage.createSpace({id:sid,slug:'old3-review-fixture',current_revision:1,policy_revision:1,acl_epoch:1,created_at:now},{space_id:sid,revision:1,objective:'Synthetic original schema3 response oracle',rules:['Immutable historical rule'],review_policy:policy,check_profiles:{},pinned_refs:[],editor_id:ids.author,created_at:now});
 for(const [name,id] of Object.entries(ids))storage.upsertMembership({space_id:sid,actor_id:id,role:name==='author'?'owner':'observer',active:true,reviewer_eligible:name==='one'||name==='two',independence_group:name==='one'?'old3-one':name==='two'?'old3-two':'old3-other'});
 storage.createThread({id:tid,space_id:sid,title:'Synthetic original schema3 study',version:1,state:'open',creator_id:ids.author,created_at:now,updated_at:now});
 const context=()=>auth.authenticateToken(credentials.get(ids.author));
 const posts=new core.PostService(storage,idGen,clock,hasher,auth,idem);
 const created=posts.createPost(context(),sid,tid,{kind:'claim',title:'Original schema3 fixture claim',summary:'Synthetic research seed; no user material',body:'This body is a public synthetic regression recipe.',tags:['old3-oracle'],structured:{statement:'A repeatable synthetic claim',assumptions:['Controlled fixture'],scope:'Original schema3 extraction',falsification_plan:'Compare exact response and compact reference'}},'old3-owned-post');
 const req={target_ref:{post_id:created.post.id,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:[ids.one,ids.two],expected_policy_revision:1,reproduction_instructions:'Replay exact original schema3 service output'};
 const service=new review.ReviewRequestService(storage,auth,idem,clock,idGen,new review.ReviewModule(storage,hasher,clock,idGen,auth));
 const first=service.createRequest(context(),sid,req,'old3-owned-create');
 assert.equal(Object.hasOwn(first,'submitted_count'),false);
 const createRef=db.prepare("SELECT result_ref FROM idempotency_records WHERE key='old3-owned-create'").get().result_ref;
 now='2026-10-09T00:01:00.000Z';const cancelPayload={expected_version:1,reason:'Synthetic original cancellation'};
 const cancelled=service.cancelRequest(context(),sid,first.id,cancelPayload,'old3-owned-cancel');
 const cancelRef=db.prepare("SELECT result_ref FROM idempotency_records WHERE key='old3-owned-cancel'").get().result_ref;
 assert.equal(Object.hasOwn(cancelled,'submitted_count'),false);
 assert.deepEqual(service.createRequest(context(),sid,req,'old3-owned-create'),first);
 assert.deepEqual(service.cancelRequest(context(),sid,first.id,cancelPayload,'old3-owned-cancel'),cancelled);
 const collecting=service.createRequest(context(),sid,req,'old3-owned-collecting');
 const collectingRef=db.prepare("SELECT result_ref FROM idempotency_records WHERE key='old3-owned-collecting'").get().result_ref;
 const rows={};
 const tables=['schema_migrations','actors','spaces','space_revisions','memberships','threads','thread_versions','posts','post_revisions','snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','idempotency_records','events'];
 for(const table of tables)rows[table]=db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all();
 // The exact snapshot/assignment history and synthetic research rows contain no credential/secret tables.
 const fixture={fixture_version:1,source_schema_version:3,source_runtime:'frozen original M6B built service, not schema4 relabelled',source_manifest_sha256:receipt.source_manifest_sha256,source_sql_sha256:createHash('sha256').update(await readFile(path.join(here,'before-files/packages/storage-sqlite/src/schema.sql'))).digest('hex'),recipe:{kind:'private trusted actor/space/thread seed; original PostService and ReviewRequestService operations',clock_start:'2026-10-09T00:00:00.000Z',space_id:sid,thread_id:tid,actors:ids,credentials:'excluded; tests mint independent private credentials',instance_secret:'excluded; new owned databases create their own'},rows,oracle:{create:{actor_id:ids.author,space_id:sid,key:'old3-owned-create',payload:req,response:first,result_ref:createRef},cancel:{actor_id:ids.author,space_id:sid,request_id:first.id,key:'old3-owned-cancel',payload:cancelPayload,response:cancelled,result_ref:cancelRef},collecting:{actor_id:ids.author,space_id:sid,key:'old3-owned-collecting',payload:req,response:collecting,result_ref:collectingRef}}};
 assert.equal(Object.hasOwn(rows,'credentials'),false);assert.equal(Object.hasOwn(rows,'instance_metadata'),false);
 const raw=JSON.stringify(fixture,null,2)+'\n';for(const token of credentials.values())assert.equal(raw.includes(token),false);assert.equal(raw.includes(storage.getInstanceSecret()),false);
 await writeFile(path.join(root,'tests/fixtures/historical-v3-review-history.json'),raw);
 receipt.stages.push({stage:'original create and cancel responses plus refs extracted',create_has_count:false,cancel_has_count:false,original_replays_deep_equal:true,request_rows:rows.review_requests.length,version_rows:rows.review_request_versions.length,assignment_rows:rows.review_assignments.length,snapshot_rows:rows.snapshots.length,fixture_bytes:Buffer.byteLength(raw),fixture_sha256:createHash('sha256').update(raw).digest('hex')});
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.error_name=error?.name;receipt.error_code=typeof error?.code==='string'&&/^[A-Z_]{1,40}$/.test(error.code)?error.code:'ERROR';throw error;}
finally{db?.close();await rm(directory,{recursive:true,force:true});receipt.cleanup_removed=true;await writeFile(path.join(here,'old3-oracle-first-receipt.json'),JSON.stringify(receipt,null,2)+'\n');}
process.stdout.write(JSON.stringify({status:receipt.status,stages:receipt.stages,cleanup_removed:receipt.cleanup_removed})+'\n');
