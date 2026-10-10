import {mkdtemp,rm,writeFile,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const require=createRequire(path.join(root,'package.json')),Database=require('better-sqlite3');
const digest=b=>createHash('sha256').update(b).digest('hex');
const manifests=['old-schema4-review-runtime-manifest.json','old-schema4-blob-helper-manifest.json'];
const sources=[];
for(const name of manifests){const raw=await readFile(path.join(here,name));const manifest=JSON.parse(raw);sources.push({path:name,sha256:digest(raw)});for(const f of manifest.files)assert.equal(digest(await readFile(path.join(here,f.snapshot_path))),f.sha256);}
const frozen=path.join(here,'old-schema4-review-runtime');
const load=async p=>import(pathToFileURL(path.join(frozen,p)).href);
const core=await load('packages/core/dist/index.js'),sqlite=await load('packages/storage-sqlite/dist/index.js'),review=await load('modules/review/dist/index.js'),protocol=await load('packages/protocol/dist/index.js');
const {ArtifactFileStore}=await load('packages/server/dist/artifact-files.js');
const directory=await mkdtemp(path.join(tmpdir(),'detuned-old4-review-oracle-'));
let db;const receipt={kind:'genuine frozen original M6.2-A schema4 API oracle, not schema5 relabelled',sources,stages:[],cleanup_removed:false};
const fixturePath=path.join(root,'tests/fixtures/historical-v4-review-history.json');
try{
 db=new Database(path.join(directory,'detuned.sqlite'));db.pragma('journal_mode=WAL');sqlite.bootstrapDatabase(db);
 assert.equal(db.prepare('SELECT max(version) n FROM schema_migrations').get().n,4);
 const storage=new sqlite.SqliteStorage(db),hasher=new core.CryptoHasher(),idGen=new core.CryptoIdGenerator();
 let now='2026-10-09T00:00:00.000Z';const clock={now:()=>new Date(now),nowIso:()=>now};
 const auth=new core.AuthService(storage,hasher,clock),idem=new core.IdempotencyService(storage,hasher,clock);
 const sid='spc-old4-review-fixture',tid='thd-old4-review-fixture',actors={author:'act-old4-author',one:'act-old4-one',two:'act-old4-two',reader:'act-old4-reader'};
 const tokens=new Map();
 for(const [name,id] of Object.entries(actors)){
  storage.createActor({id,kind:'human',display_name:'synthetic old4 '+name,created_at:now,disabled_at:null});
  const token=randomBytes(32).toString('hex');tokens.set(id,token);
  storage.createCredential({id:'cred-owned-old4-'+name,actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[sid],capabilities:name==='reader'?['read']:['read','write'],created_at:now,expires_at:null,revoked_at:null});
 }
 const policy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
 storage.createSpace({id:sid,slug:'old4-review-fixture',current_revision:1,policy_revision:1,acl_epoch:1,created_at:now},{space_id:sid,revision:1,objective:'Synthetic original schema4 historical oracle',rules:['Frozen old4 rule'],review_policy:policy,check_profiles:{},pinned_refs:[],editor_id:actors.author,created_at:now});
 for(const [name,id] of Object.entries(actors))storage.upsertMembership({space_id:sid,actor_id:id,role:name==='author'?'owner':'observer',active:true,reviewer_eligible:name==='one'||name==='two',independence_group:'old4-group-'+name});
 storage.createThread({id:tid,space_id:sid,title:'Synthetic original4 history',version:1,state:'open',creator_id:actors.author,created_at:now,updated_at:now});
 const context=(id=actors.author)=>auth.authenticateToken(tokens.get(id));
 const posts=new core.PostService(storage,idGen,clock,hasher,auth,idem);
 const target=posts.createPost(context(),sid,tid,{kind:'claim',title:'Original schema4 fixture claim',summary:'Synthetic regression material',body:'Public synthetic body, not user research.',structured:{statement:'Repeatable synthetic claim',assumptions:['Owned private fixture'],scope:'Original schema4 API capture',falsification_plan:'Compare exact migrated history'}},'old4-owned-post');
 const requests=new review.ReviewRequestService(storage,auth,idem,clock,idGen,new review.ReviewModule(storage,hasher,clock,idGen,auth)),submissions=new review.ReviewSubmissionService(storage,auth,idem,clock,idGen);
 const blobs=await ArtifactFileStore.create(directory),artifacts=new core.ArtifactService(storage,blobs,auth,idem,idGen,clock,protocol.DEFAULT_ARTIFACT_LIMITS);
 const payload={target_ref:{post_id:target.post.id,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:[actors.one,actors.two],expected_policy_revision:1,reproduction_instructions:'Synthetic original4 replay recipe'};
 const ref=key=>db.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(key).result_ref;
 const oracle={requests:[],submissions:[],uploads:[],assignment_reads:[]};
 const create=scenario=>{const key='old4-owned-create-'+scenario,response=requests.createRequest(context(),sid,payload,key);assert.equal(Object.hasOwn(response,'submitted_count'),false);assert.deepEqual(requests.createRequest(context(),sid,payload,key),response);const row={scenario,actor_id:actors.author,space_id:sid,key,payload,response,result_ref:ref(key)};oracle.requests.push(row);return row;};
 const cancelled=create('cancelled');now='2026-10-09T00:01:00.000Z';
 const cancelPayload={expected_version:1,reason:'Original schema4 synthetic cancellation'},cancelKey='old4-owned-cancel',cancelResponse=requests.cancelRequest(context(),sid,cancelled.response.id,cancelPayload,cancelKey);
 assert.equal(Object.hasOwn(cancelResponse,'submitted_count'),false);assert.deepEqual(requests.cancelRequest(context(),sid,cancelled.response.id,cancelPayload,cancelKey),cancelResponse);
 oracle.cancel={actor_id:actors.author,space_id:sid,request_id:cancelled.response.id,key:cancelKey,payload:cancelPayload,response:cancelResponse,result_ref:ref(cancelKey)};
 const collecting=create('collecting'),sealed=create('sealed'),revealed=create('revealed');
 const getAssignment=(scenario,request,actor)=>{const response=submissions.getOwnAssignment(context(actor),sid,request.response.id);oracle.assignment_reads.push({scenario,actor_id:actor,request_id:request.response.id,response});return response;};
 const physical=[];
 async function upload(scenario,assignment,actor,role){
  const key='old4-owned-upload-'+scenario+'-'+role,text='Synthetic original4 '+scenario+' '+role+' evidence.\n';
  const staged=await blobs.stage((async function*(){yield Buffer.from(text);})(),protocol.DEFAULT_ARTIFACT_LIMITS.max_file_bytes);
  const response=await artifacts.createForReview(context(actor),sid,assignment.id,{staged,mime:'text/plain',metadata:{}},key);
  assert.equal(response.visibility,'review_assignment');assert.equal(response.sha256,digest(Buffer.from(text)));assert.equal(response.bytes,Buffer.byteLength(text));
  const content=await artifacts.getContent(context(actor),sid,response.id);let actual=Buffer.alloc(0);try{for await(const b of content.chunks)actual=Buffer.concat([actual,Buffer.from(b)]);}finally{await content.dispose();}
  assert.equal(digest(actual),response.sha256);assert.equal(actual.toString(),text);
  oracle.uploads.push({scenario,role,actor_id:actor,space_id:sid,assignment_id:assignment.id,key,mime:'text/plain',metadata:{},response,result_ref:ref(key)});
  physical.push({artifact_id:response.id,text_utf8:text,sha256:response.sha256,bytes:response.bytes});return response;
 }
 function submit(scenario,request,actor,evidence=[]){
  const session='ses-old4-'+scenario+'-'+actor;
  storage.createSession({id:session,space_id:sid,actor_id:actor,client_name:'old4-oracle',client_version:'1',harness_session_id:null,metadata:{},created_at:now});
  const body={snapshot_sha256:request.response.snapshot_sha256,reviewer_session_id:session,completion_status:'complete',verdict:'accept',coverage:'Synthetic original4 complete coverage',checks_performed:'No required external checks in frozen fixture policy',evidence_refs:evidence,pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Synthetic independent group record'}};
  const key='old4-owned-submit-'+scenario+'-'+actor,response=submissions.submit(context(actor),sid,request.response.id,body,key);
  assert.deepEqual(submissions.submit(context(actor),sid,request.response.id,body,key),response);
  assert.equal(Object.hasOwn(response,'revealed_at'),false);
  oracle.submissions.push({scenario,actor_id:actor,space_id:sid,request_id:request.response.id,key,payload:body,response,result_ref:ref(key)});return response;
 }
 now='2026-10-09T00:02:00.000Z';
 const sealedAssignment=getAssignment('sealed',sealed,actors.one),sealedBlob=await upload('sealed',sealedAssignment,actors.one,'cited');
 const sealedAck=submit('sealed',sealed,actors.one,[{kind:'artifact',artifact_id:sealedBlob.id}]);
 assert.throws(()=>submissions.getSubmission(context(actors.reader),sid,sealedAck.submission_id),{code:'NOT_FOUND'});
 const revealAssignment=getAssignment('revealed',revealed,actors.one),revealBlob=await upload('revealed',revealAssignment,actors.one,'cited'),unusedBlob=await upload('revealed',revealAssignment,actors.one,'unused');
 const revealAck=submit('revealed',revealed,actors.one,[{kind:'artifact',artifact_id:revealBlob.id}]);getAssignment('revealed',revealed,actors.two);
 now='2026-10-09T00:03:00.000Z';const lastAck=submit('revealed',revealed,actors.two,[{kind:'post',post_id:target.post.id,revision:1}]);
 for(const row of oracle.requests)row.current_read={actor_id:actors.reader,response:requests.getRequest(context(actors.reader),sid,row.response.id)};
 oracle.submission_reads=[{actor_id:actors.one,submission_id:sealedAck.submission_id,response:submissions.getSubmission(context(actors.one),sid,sealedAck.submission_id)},{actor_id:actors.reader,submission_id:revealAck.submission_id,response:submissions.getSubmission(context(actors.reader),sid,revealAck.submission_id)},{actor_id:actors.reader,submission_id:lastAck.submission_id,response:submissions.getSubmission(context(actors.reader),sid,lastAck.submission_id)}];
 oracle.revealed_artifact_read={actor_id:actors.reader,response:await artifacts.getMetadata(context(actors.reader),sid,revealBlob.id)};
 await assert.rejects(()=>artifacts.getMetadata(context(actors.reader),sid,unusedBlob.id),{code:'NOT_FOUND'});
 assert.equal(oracle.requests.find(x=>x.scenario==='sealed').current_read.response.changed_by,null);
 assert.equal(oracle.requests.find(x=>x.scenario==='sealed').current_read.response.submitted_count,1);
 assert.equal(oracle.requests.find(x=>x.scenario==='revealed').current_read.response.phase,'revealed');
 assert.equal(oracle.requests.find(x=>x.scenario==='revealed').current_read.response.submitted_count,2);
 const tables=['schema_migrations','actors','spaces','space_revisions','memberships','sessions','threads','thread_versions','posts','post_revisions','artifacts','snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','idempotency_records','events'],rows={};
 for(const table of tables)rows[table]=db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all();
 assert.equal(rows.review_requests.length,4);assert.equal(rows.review_submissions.length,3);assert.equal(rows.artifacts.length,3);
 const fixture={fixture_version:1,source_schema_version:4,source_runtime:'genuine original M6.2-A built APIs; not future schema5 or current data relabelled',sources,source_sql_sha256:digest(await readFile(path.join(here,'before-files/packages/storage-sqlite/src/schema.sql'))),recipe:{kind:'trusted synthetic actor/space/thread rows; true original PostService, ReviewRequestService, ReviewSubmissionService, ArtifactService and ArtifactFileStore writes',clock_start:'2026-10-09T00:00:00.000Z',space_id:sid,thread_id:tid,actors,credentials:'excluded; mint fresh private tokens when loading fixture',instance_secret:'excluded; each owned database has a private independent secret'},rows,physical_artifacts:physical,oracle};
 const raw=JSON.stringify(fixture,null,2)+'\n';for(const token of tokens.values())assert.equal(raw.includes(token),false);assert.equal(raw.includes(storage.getInstanceSecret()),false);assert.equal(Object.hasOwn(rows,'credentials'),false);assert.equal(Object.hasOwn(rows,'instance_metadata'),false);
 await writeFile(fixturePath,raw,{flag:'wx'});
 receipt.stages.push({stage:'actual_original4_api_oracle',request_count:4,submission_count:3,artifact_count:3,assignment_count:rows.review_assignments.length,cancelled:1,collecting_empty:1,collecting_sealed:1,revealed:1,create_cancel_ack_has_no_count:true,submission_replay_exact:true,private_unused_reader_hidden:true,original4_physical_sha_verified:true,fixture_sha256:digest(raw),fixture_bytes:Buffer.byteLength(raw)});
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.error_name=error?.name;receipt.error_code=typeof error?.code==='string'&&/^[A-Z_]{1,40}$/.test(error.code)?error.code:'ERROR';process.exitCode=1;}
finally{db?.close();await rm(directory,{recursive:true,force:true});try{await access(directory);}catch{receipt.cleanup_removed=true;}await writeFile(path.join(here,'old4-oracle-first-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});}
process.stdout.write(JSON.stringify(receipt)+'\n');
