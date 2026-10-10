import {afterEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {SqliteStorage,classifyDatabase,openAndCoordinateDatabase,upgradeOffline,backupOffline,restoreBackup} from '@detuned/storage-sqlite';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,ArtifactService} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService,ReviewFinalizationService,ReviewStatusService} from '@detuned/module-review';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {DEFAULT_ARTIFACT_LIMITS,type CreateReviewRequest,type CancelReviewRequest,type ReviewRequestView,type ReviewRequestReadView,type CreateReviewSubmission,type ReviewSubmissionAcknowledgement,type ReviewSubmissionView} from '@detuned/protocol';
const repo=fileURLToPath(new URL('../../',import.meta.url)),cleanup:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(cleanup.length)await cleanup.pop()!();});
const now='2026-10-09T01:10:00.000Z',clock={now:()=>new Date(now),nowIso:()=>now};
type Row=Record<string,string|number|null>;
interface History {
 source_schema_version:number;source_sql_sha256:string;
 recipe:{space_id:string;actors:{author:string;one:string;two:string;reader:string}};
 rows:Record<string,Row[]>;physical_artifacts:Array<{artifact_id:string;text_utf8:string;sha256:string;bytes:number}>;
 oracle:{requests:Array<{scenario:string;actor_id:string;space_id:string;key:string;payload:CreateReviewRequest;response:ReviewRequestView;result_ref:string;current_read:{actor_id:string;response:ReviewRequestReadView}}>;cancel:{actor_id:string;space_id:string;request_id:string;key:string;payload:CancelReviewRequest;response:ReviewRequestView;result_ref:string};submissions:Array<{actor_id:string;space_id:string;request_id:string;key:string;payload:CreateReviewSubmission;response:ReviewSubmissionAcknowledgement;result_ref:string}>;submission_reads:Array<{actor_id:string;submission_id:string;response:ReviewSubmissionView}>};
}
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
async function fileHash(file:string){return digest(await readFile(file));}
const tableRows=(db:Database.Database,table:string)=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
async function source4(){
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-schema5-maint-independent-'));cleanup.push(()=>rm(directory,{recursive:true,force:true}));
 const source=path.join(directory,'source4');await mkdir(source,{mode:0o700});
 const raw=await readFile(path.join(repo,'tests/fixtures/historical-v4-review-history.json'),'utf8');expect(digest(raw)).toBe('6723085899305599a991905edf65aa226a983103c43e4fafdb6ad85ade0bc6ab');
 const history=JSON.parse(raw) as History,sql=await readFile(path.join(repo,'tests/fixtures/historical-v4-schema.sql'),'utf8');expect(digest(sql)).toBe(history.source_sql_sha256);expect(history.source_schema_version).toBe(4);
 expect(Object.hasOwn(history.rows,'credentials')).toBe(false);expect(Object.hasOwn(history.rows,'instance_metadata')).toBe(false);
 const file=path.join(source,'detuned.sqlite'),db=new Database(file);db.pragma('foreign_keys=ON');db.exec(sql);
 try{
  db.transaction(()=>{for(const [table,rows] of Object.entries(history.rows))for(const row of rows){expect(/^[a-z_][a-z0-9_]*$/.test(table)).toBe(true);const keys=Object.keys(row);expect(keys.every(k=>/^[a-z_][a-z0-9_]*$/.test(k))).toBe(true);db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]!));}})();
  db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('initialized','true');db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('token_secret',randomBytes(32).toString('hex'));
  expect(classifyDatabase(db)).toMatchObject({kind:'supported_legacy',maxVersion:4});expect(()=>openAndCoordinateDatabase(db,'serve')).toThrow();expect(()=>openAndCoordinateDatabase(db,'init')).toThrow();
 }finally{db.close();}
 const blobs=await ArtifactFileStore.create(source);
 for(const item of history.physical_artifacts){const record=history.rows.artifacts!.find(r=>r.id===item.artifact_id);expect(record).toBeDefined();if(!record)throw new Error('Synthetic original4 artifact row absent');const key=record.storage_key;expect(typeof key).toBe('string');if(typeof key!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(key))throw new Error('Invalid owned fixture storage key');
  const bytes=Buffer.from(item.text_utf8);expect(bytes.length).toBe(item.bytes);expect(digest(bytes)).toBe(item.sha256);
  const staged=await blobs.stage((async function*(){yield bytes;})(),1000);await blobs.publish(staged,key);expect(await fileHash(path.join(source,'artifacts','objects',key))).toBe(item.sha256);
 }
 return {directory,source,file,history};
}
function services(db:Database.Database,h:History){
 const storage=new SqliteStorage(db),hasher=new CryptoHasher(),ids=new CryptoIdGenerator(),auth=new AuthService(storage,hasher,clock),idem=new IdempotencyService(storage,hasher,clock),tokens=new Map<string,string>();
 for(const [name,id] of Object.entries(h.recipe.actors)){const token=randomBytes(32).toString('hex');tokens.set(id,token);storage.createCredential({id:ids.generateId('cre'),actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[h.recipe.space_id],capabilities:name==='reader'?['read']:['read','write'],created_at:now,expires_at:null,revoked_at:null});}
 const context=(id=h.recipe.actors.author)=>auth.authenticateToken(tokens.get(id)!);
 return {storage,hasher,ids,auth,idem,tokens,context,requests:new ReviewRequestService(storage,auth,idem,clock,ids,new ReviewModule(storage,hasher,clock,ids,auth)),submissions:new ReviewSubmissionService(storage,auth,idem,clock,ids),finals:new ReviewFinalizationService(storage,auth,idem,clock,ids),status:new ReviewStatusService(storage,auth)};
}
function exactHistoryReplay(db:Database.Database,h:History,s:ReturnType<typeof services>){
 for(const r of h.oracle.requests){expect(s.requests.createRequest(s.context(r.actor_id),r.space_id,r.payload,r.key)).toEqual(r.response);expect(Object.hasOwn(r.response,'submitted_count')).toBe(false);expect((db.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(r.key) as {result_ref:string}).result_ref).toBe(r.result_ref);expect(s.requests.getRequest(s.context(h.recipe.actors.reader),r.space_id,r.response.id)).toEqual(r.current_read.response);}
 const c=h.oracle.cancel;expect(s.requests.cancelRequest(s.context(c.actor_id),c.space_id,c.request_id,c.payload,c.key)).toEqual(c.response);expect((db.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(c.key) as {result_ref:string}).result_ref).toBe(c.result_ref);
 for(const r of h.oracle.submissions){expect(s.submissions.submit(s.context(r.actor_id),r.space_id,r.request_id,r.payload,r.key)).toEqual(r.response);expect((db.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(r.key) as {result_ref:string}).result_ref).toBe(r.result_ref);}
 for(const r of h.oracle.submission_reads)expect(s.submissions.getSubmission(s.context(r.actor_id),h.recipe.space_id,r.submission_id)).toEqual(r.response);
}
it('MS501 genuine original4 sealed and revealed history copies only into new5 with byte-exact compact and confirmation replay',async()=>{
 const f=await source4(),sourceHash=await fileHash(f.file),destination=path.join(f.directory,'stage5');
 await upgradeOffline({dataDir:f.source,outputDir:destination,offline:true,adminName:'owned stage administrator'});expect(await fileHash(f.file)).toBe(sourceHash);
 const db=new Database(path.join(destination,'detuned.sqlite'));cleanup.push(async()=>{if(db.open)db.close();});expect(classifyDatabase(db)).toMatchObject({kind:'current_initialized',maxVersion:6});
 const s=services(db,f.history);exactHistoryReplay(db,f.history,s);expect(tableRows(db,'review_decisions')).toEqual([]);
 for(const table of ['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','sessions','events','artifacts','idempotency_records'])expect(tableRows(db,table)).toEqual(f.history.rows[table]);
 expect(f.history.rows.review_requests!.map(r=>r.submitted_count)).toEqual([0,0,1,2]);expect(f.history.rows.review_assignments!.every(r=>typeof r.id==='string')).toBe(true);
 expect(await fileHash(f.file)).toBe(sourceHash);
});

it('MS502 new5 immutable decision backup restores seven formal tables, historical sessions and private physical evidence without old identity authority',async()=>{
 const f=await source4(),directory=path.join(f.directory,'current5');await upgradeOffline({dataDir:f.source,outputDir:directory,offline:true,adminName:'owned upgrade administrator'});
 const db=new Database(path.join(directory,'detuned.sqlite'));db.pragma('journal_mode=WAL');cleanup.push(async()=>{if(db.open)db.close();});const s=services(db,f.history),sid=f.history.recipe.space_id;
 const revealed=f.history.oracle.requests.find(r=>r.scenario==='revealed');if(!revealed)throw new Error('Original4 revealed request absent');
 const decision=s.finals.finalizeRequest(s.context(),sid,revealed.response.id,{expected_version:revealed.current_read.response.version},'owned-new5-finalize');expect(decision.outcome).toBe('accepted');
 const tables=['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','sessions','events','artifacts','idempotency_records'];const before=Object.fromEntries(tables.map(t=>[t,tableRows(db,t)])),oldSecret=s.storage.getInstanceSecret();
 db.pragma('wal_checkpoint(TRUNCATE)');db.close();const backup=path.join(f.directory,'backup5'),restored=path.join(f.directory,'restored5');
 const result=await backupOffline({dataDir:directory,outputDir:backup,offline:true});expect(result.manifest.schemaVersion).toBe(6);expect(result.manifest.artifacts).toHaveLength(3);const backupHash=await fileHash(path.join(backup,'detuned.sqlite'));
 await restoreBackup({backupDir:backup,dataDir:restored});expect(await fileHash(path.join(backup,'detuned.sqlite'))).toBe(backupHash);
 const recovered=new Database(path.join(restored,'detuned.sqlite'));cleanup.push(async()=>{if(recovered.open)recovered.close();});expect(classifyDatabase(recovered)).toMatchObject({kind:'current_initialized',maxVersion:6});for(const [table,value] of Object.entries(before))expect(tableRows(recovered,table)).toEqual(value);
 const restoredStorage=new SqliteStorage(recovered),restoredAuth=new AuthService(restoredStorage,s.hasher,clock);expect(restoredStorage.getInstanceSecret()!==oldSecret).toBe(true);expect(()=>restoredAuth.authenticateToken(s.tokens.get(f.history.recipe.actors.one)!)).toThrow();
 const r=services(recovered,f.history);expect(r.finals.getDecision(r.context(f.history.recipe.actors.reader),sid,revealed.response.id)).toEqual(decision);
 const artifacts=new ArtifactService(r.storage,await ArtifactFileStore.create(restored),r.auth,r.idem,r.ids,clock,DEFAULT_ARTIFACT_LIMITS);
 for(const item of f.history.physical_artifacts){const original=f.history.rows.artifacts!.find(a=>a.id===item.artifact_id);if(!original||typeof original.storage_key!=='string')throw new Error('Original artifact binding absent');expect(await fileHash(path.join(restored,'artifacts','objects',original.storage_key))).toBe(item.sha256);}
 const sealed=f.history.oracle.requests.find(x=>x.scenario==='sealed')!;expect(r.requests.getRequest(r.context(f.history.recipe.actors.reader),sid,sealed.response.id)).toMatchObject({phase:'collecting',submitted_count:1,changed_by:null});
 const sealedSubmission=f.history.oracle.submissions.find(x=>x.request_id===sealed.response.id)!;expect(()=>r.submissions.getSubmission(r.context(f.history.recipe.actors.reader),sid,sealedSubmission.response.submission_id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
 const unused=f.history.physical_artifacts.find(x=>x.text_utf8.includes('unused'))!;await expect(artifacts.getMetadata(r.context(f.history.recipe.actors.reader),sid,unused.artifact_id)).rejects.toMatchObject({code:'NOT_FOUND'});
});
