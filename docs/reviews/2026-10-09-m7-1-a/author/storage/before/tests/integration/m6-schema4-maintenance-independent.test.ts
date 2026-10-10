import {afterEach, expect, it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp, mkdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomBytes} from 'node:crypto';
import {SqliteStorage, classifyDatabase, openAndCoordinateDatabase, upgradeOffline, backupOffline, restoreBackup} from '@detuned/storage-sqlite';
import {AuthService, CryptoHasher, CryptoIdGenerator, IdempotencyService, ArtifactService} from '@detuned/core';
import {ReviewModule, ReviewRequestService, ReviewSubmissionService} from '@detuned/module-review';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {DEFAULT_ARTIFACT_LIMITS, type CreateReviewRequest, type CancelReviewRequest, type ReviewRequestView, type CreateReviewSubmission} from '@detuned/protocol';

// This fixture is actual schema3 original service history, not a current4 database relabelled.
// Credentials and instance secret were intentionally excluded; each test mints private values.
const repo=fileURLToPath(new URL('../../',import.meta.url));
type Row=Record<string,string|number|null>;
interface History {
 source_schema_version:number;source_sql_sha256:string;source_manifest_sha256:string;
 recipe:{space_id:string;actors:{author:string;one:string;two:string;observer:string}};
 rows:Record<string,Row[]>;
 oracle:{create:{actor_id:string;space_id:string;key:string;payload:CreateReviewRequest;response:ReviewRequestView;result_ref:string};
  cancel:{actor_id:string;space_id:string;request_id:string;key:string;payload:CancelReviewRequest;response:ReviewRequestView;result_ref:string};
  collecting:{actor_id:string;space_id:string;key:string;payload:CreateReviewRequest;response:ReviewRequestView;result_ref:string}};
}
const cleanup:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(cleanup.length)await cleanup.pop()!();});
const now='2026-10-09T00:10:00.000Z',clock={now:()=>new Date(now),nowIso:()=>now};
const digest=async(file:string)=>createHash('sha256').update(await readFile(file)).digest('hex');
async function source3(){
 const root=await mkdtemp(path.join(tmpdir(),'detuned-schema4-maint-independent-'));
 cleanup.push(()=>rm(root,{recursive:true,force:true}));const source=path.join(root,'source');await mkdir(source,{mode:0o700});
 const raw=await readFile(path.join(repo,'tests/fixtures/historical-v3-review-history.json'),'utf8');
 expect(createHash('sha256').update(raw).digest('hex')).toBe('e161eb770633a7af147de76605930c9c805dd0a46b28685883e0f8d075265cdb');
 const history=JSON.parse(raw) as History,sql=await readFile(path.join(repo,'tests/fixtures/historical-v3-schema.sql'),'utf8');
 expect(createHash('sha256').update(sql).digest('hex')).toBe(history.source_sql_sha256);expect(history.source_schema_version).toBe(3);
 expect(Object.hasOwn(history.rows,'credentials')).toBe(false);expect(Object.hasOwn(history.rows,'instance_metadata')).toBe(false);
 const file=path.join(source,'detuned.sqlite'),db=new Database(file);db.pragma('foreign_keys=ON');db.exec(sql);
 try{
  const insert=db.transaction(()=>{for(const [table,rows] of Object.entries(history.rows))for(const row of rows){
   expect(/^[a-z_][a-z0-9_]*$/.test(table)).toBe(true);const keys=Object.keys(row);expect(keys.every(k=>/^[a-z_][a-z0-9_]*$/.test(k))).toBe(true);
   db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]!));
  }});insert();
  db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('initialized','true');
  db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('token_secret',randomBytes(32).toString('hex'));
  expect(classifyDatabase(db)).toMatchObject({kind:'supported_legacy',maxVersion:3});
  expect(()=>openAndCoordinateDatabase(db,'serve')).toThrow();expect(()=>openAndCoordinateDatabase(db,'init')).toThrow();
 }finally{db.close();}
 return {root,source,file,history};
}
function services(db:Database.Database,h:History){
 const storage=new SqliteStorage(db),hasher=new CryptoHasher(),ids=new CryptoIdGenerator(),auth=new AuthService(storage,hasher,clock),idem=new IdempotencyService(storage,hasher,clock);
 const tokens=new Map<string,string>();
 for(const [name,id] of Object.entries(h.recipe.actors)){
  const token=randomBytes(32).toString('hex');tokens.set(id,token);
  storage.createCredential({id:ids.generateId('cre'),actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[h.recipe.space_id],capabilities:name==='observer'?['read']:['read','write'],created_at:now,revoked_at:null,expires_at:null});
 }
 const context=(id=h.recipe.actors.author)=>auth.authenticateToken(tokens.get(id)!);
 return {storage,hasher,ids,auth,idem,tokens,context,requests:new ReviewRequestService(storage,auth,idem,clock,ids,new ReviewModule(storage,hasher,clock,ids,auth)),submissions:new ReviewSubmissionService(storage,auth,idem,clock,ids)};
}
const rows=(db:Database.Database,table:string)=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();

it('MD01 genuine original schema3 history upgrades only a new stage, backfills assignment IDs/count zero, and exactly replays original create/cancel bytes without count',async()=>{
 const f=await source3(),sourceHash=await digest(f.file),destination=path.join(f.root,'upgraded');
 await upgradeOffline({dataDir:f.source,outputDir:destination,offline:true,adminName:'owned stage administrator'});
 expect(await digest(f.file)).toBe(sourceHash);
 const db=new Database(path.join(destination,'detuned.sqlite'));cleanup.push(async()=>{if(db.open)db.close();});
 expect(classifyDatabase(db)).toMatchObject({kind:'current_initialized',maxVersion:5});
 const s=services(db,f.history),sid=f.history.recipe.space_id;
 for(const [key,original] of Object.entries(f.history.oracle)){
  const actual=key==='cancel'?s.requests.cancelRequest(s.context(),sid,f.history.oracle.cancel.request_id,f.history.oracle.cancel.payload,original.key):s.requests.createRequest(s.context(),sid,(original as History['oracle']['create']).payload,original.key);
  expect(actual).toEqual(original.response);expect(Object.hasOwn(actual,'submitted_count')).toBe(false);
  expect((db.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(original.key) as {result_ref:string}).result_ref).toBe(original.result_ref);
 }
 expect(rows(db,'review_requests').every(x=>(x as Row).submitted_count===0)).toBe(true);
 expect(rows(db,'review_request_versions').every(x=>(x as Row).submitted_count===0)).toBe(true);
 const assignments=s.storage.listReviewAssignments(f.history.oracle.collecting.response.id);
 expect(assignments).toHaveLength(2);expect(assignments.every(a=>typeof a.id==='string'&&a.id.length>0)).toBe(true);expect(new Set(assignments.map(a=>a.id)).size).toBe(2);
 expect(s.requests.getRequest(s.context(),sid,f.history.oracle.collecting.response.id)).toMatchObject({submitted_count:0});
 expect(await digest(f.file)).toBe(sourceHash);
});

it('MD02 current schema5 physical backup and restore preserve sealed/revealed submissions, sessions, immutable versions and unused private blobs, with fresh identity isolation',async()=>{
 const f=await source3(),directory=path.join(f.root,'schema4');await upgradeOffline({dataDir:f.source,outputDir:directory,offline:true,adminName:'owned fixture administrator'});
 const db=new Database(path.join(directory,'detuned.sqlite'));db.pragma('journal_mode=WAL');cleanup.push(async()=>{if(db.open)db.close();});
 const s=services(db,f.history),sid=f.history.recipe.space_id,actors=f.history.recipe.actors;
 const blobs=await ArtifactFileStore.create(directory),artifacts=new ArtifactService(s.storage,blobs,s.auth,s.idem,s.ids,clock,DEFAULT_ARTIFACT_LIMITS);
 const body=(hash:string,actor:string,n:number):CreateReviewSubmission=>({snapshot_sha256:hash,reviewer_session_id:`session-${actor}-${n}`,completion_status:'complete',verdict:'accept',coverage:'sealed owned coverage',checks_performed:'owned checks',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'owned independence'}});
 for(const actor of [actors.one,actors.two])for(const n of [1,2])s.storage.createSession({id:`session-${actor}-${n}`,space_id:sid,actor_id:actor,client_name:'owned maintenance',client_version:'1',harness_session_id:null,metadata:{},created_at:now});
 const upload=async(assignment:string,key:string)=>{const staged=await blobs.stage((async function*(){yield Buffer.from(key+' owned bytes');})(),1000);return artifacts.createForReview(s.context(actors.one),sid,assignment,{staged,mime:'text/plain',metadata:{}},key);};
 const collecting=f.history.oracle.collecting.response,one=s.submissions.getOwnAssignment(s.context(actors.one),sid,collecting.id);
 const cited=await upload(one.id,'cited'),unused=await upload(one.id,'unused');
 const first=body(collecting.snapshot_sha256,actors.one,1);first.evidence_refs=[{kind:'artifact',artifact_id:cited.id}];
 const revealedAck=s.submissions.submit(s.context(actors.one),sid,collecting.id,first,'first');
 s.submissions.submit(s.context(actors.two),sid,collecting.id,body(collecting.snapshot_sha256,actors.two,1),'last');
 const second=s.requests.createRequest(s.context(),sid,f.history.oracle.create.payload,'sealed-round');
 const sealedAck=s.submissions.submit(s.context(actors.one),sid,second.id,body(second.snapshot_sha256,actors.one,2),'sealed-only');
 const tables=['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','sessions','events','artifacts','idempotency_records'];
 const before=Object.fromEntries(tables.map(t=>[t,rows(db,t)]));const oldSecret=s.storage.getInstanceSecret();
 const objectInventory=await Promise.all([cited,unused].map(async a=>{const row=s.storage.findArtifactById(a.id)!;return {id:a.id,key:row.storage_key,hash:await digest(path.join(directory,'artifacts','objects',row.storage_key))};}));
 db.pragma('wal_checkpoint(TRUNCATE)');db.close();
 const backup=path.join(f.root,'backup4'),restored=path.join(f.root,'restored4');
 const receipt=await backupOffline({dataDir:directory,outputDir:backup,offline:true});expect(receipt.manifest.schemaVersion).toBe(5);expect(receipt.manifest.artifacts).toHaveLength(2);
 const backupHash=await digest(path.join(backup,'detuned.sqlite'));await restoreBackup({backupDir:backup,dataDir:restored});expect(await digest(path.join(backup,'detuned.sqlite'))).toBe(backupHash);
 const recovered=new Database(path.join(restored,'detuned.sqlite'));cleanup.push(async()=>{if(recovered.open)recovered.close();});
 expect(classifyDatabase(recovered)).toMatchObject({kind:'current_initialized',maxVersion:5});for(const [t,value] of Object.entries(before))expect(rows(recovered,t)).toEqual(value);
 const restoredStorage=new SqliteStorage(recovered),restoredAuth=new AuthService(restoredStorage,s.hasher,clock);
 expect(restoredStorage.getInstanceSecret()!==oldSecret).toBe(true);expect(()=>restoredAuth.authenticateToken(s.tokens.get(actors.one)!)).toThrow();
 for(const object of objectInventory)expect(await digest(path.join(restored,'artifacts','objects',object.key))).toBe(object.hash);
 const r=services(recovered,f.history),readArtifacts=new ArtifactService(r.storage,await ArtifactFileStore.create(restored),r.auth,r.idem,r.ids,clock,DEFAULT_ARTIFACT_LIMITS);
 expect(r.submissions.getSubmission(r.context(actors.observer),sid,revealedAck.submission_id).revealed_at).not.toBeNull();
 expect(()=>r.submissions.getSubmission(r.context(actors.observer),sid,sealedAck.submission_id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
 expect(await readArtifacts.getMetadata(r.context(actors.observer),sid,cited.id)).toMatchObject({visibility:'review_assignment',review_assignment_id:one.id});
 await expect(readArtifacts.getMetadata(r.context(actors.observer),sid,unused.id)).rejects.toMatchObject({code:'NOT_FOUND'});
 expect(r.requests.getRequest(r.context(actors.observer),sid,second.id)).toMatchObject({phase:'collecting',submitted_count:1,changed_by:null});
});
