import {it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {SqliteStorage,classifyDatabase,upgradeOffline,backupOffline,restoreBackup} from '@detuned/storage-sqlite';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,reconstructReviewRequestView} from '@detuned/core';
import {ReviewFinalizationService} from '@detuned/module-review';
import {validateSpaceExportLine,type ReviewRequestView} from '@detuned/protocol';
type Row=Record<string,string|number|null>;
interface Oracle {rows:Record<string,Row[]>;recipe:{space_id:string;actors:{author:string}};physical_artifacts:{artifact_id:string;text_utf8:string;sha256:string;bytes:number}[];oracle:{requests:{scenario:string;response:ReviewRequestView;current_read:unknown}[];cancel:{response:ReviewRequestView}}}
const oracle=JSON.parse(readFileSync(new URL('../fixtures/historical-v4-review-history.json',import.meta.url),'utf8')) as Oracle;
const oldSQL=readFileSync(new URL('../fixtures/historical-v4-schema.sql',import.meta.url),'utf8');
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
async function original4(directory:string){
 await mkdir(directory);const file=path.join(directory,'detuned.sqlite'),db=new Database(file);db.exec(oldSQL);db.pragma('foreign_keys = OFF');
 for(const [table,rows] of Object.entries(oracle.rows)){if(!rows.length)continue;const cols=Object.keys(rows[0]!);const insert=db.prepare(`INSERT INTO "${table}" (${cols.map(c=>'"'+c+'"').join(',')}) VALUES (${cols.map(()=>'?').join(',')})`);for(const row of rows)insert.run(...cols.map(c=>row[c]));}
 db.prepare('INSERT INTO instance_metadata VALUES(?,?)').run('initialized','true');db.prepare('INSERT INTO instance_metadata VALUES(?,?)').run('token_secret','owned-schema5-private-secret');db.pragma('foreign_keys = ON');
 const refs=db.prepare('SELECT actor_id,space_id,operation,key,result_ref FROM idempotency_records ORDER BY actor_id,space_id,operation,key').all();
 expect(classifyDatabase(db)).toMatchObject({kind:'supported_legacy',maxVersion:4});await mkdir(path.join(directory,'artifacts','objects'),{recursive:true});
 for(const material of oracle.physical_artifacts){const row=oracle.rows.artifacts!.find(r=>r.id===material.artifact_id)!;const bytes=Buffer.from(material.text_utf8);expect(sha(bytes)).toBe(material.sha256);expect(bytes.length).toBe(material.bytes);await writeFile(path.join(directory,'artifacts','objects',String(row.storage_key)),bytes,{mode:0o600});}
 db.close();return {file,refs};
}
it('SM501 genuine original4 history upgrades to5 preserving source and compact/base response bytes',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'detuned-schema5-'));try{const source=path.join(root,'old4'),old=await original4(source),sourceHash=sha(await readFile(old.file)),output=path.join(root,'new5');
 expect(await upgradeOffline({dataDir:source,outputDir:output,offline:true,adminName:'Owned schema5 admin'})).toMatchObject({source_schema_version:4,schema_version:5});expect(sha(await readFile(old.file))).toBe(sourceHash);
 const db=new Database(path.join(output,'detuned.sqlite'));try{const store=new SqliteStorage(db);expect(classifyDatabase(db)).toMatchObject({kind:'current_initialized',maxVersion:5});expect(db.prepare('SELECT actor_id,space_id,operation,key,result_ref FROM idempotency_records ORDER BY actor_id,space_id,operation,key').all()).toEqual(old.refs);
 for(const item of oracle.oracle.requests)expect(reconstructReviewRequestView(store,oracle.recipe.space_id,item.response.id,item.response.version)).toEqual(item.response);
 expect(reconstructReviewRequestView(store,oracle.recipe.space_id,oracle.oracle.cancel.response.id,oracle.oracle.cancel.response.version)).toEqual(oracle.oracle.cancel.response);
 expect(db.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual({n:0});expect(store.listReviewSubmissions(oracle.oracle.requests.find(r=>r.scenario==='revealed')!.response.id)).toHaveLength(2);
 }finally{db.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});
it('SM502 actual immutable decision and formal history survive physical backup/restore',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'detuned-schema5-decision-'));try{const source=path.join(root,'old4');await original4(source);const target=path.join(root,'new5');await upgradeOffline({dataDir:source,outputDir:target,offline:true,adminName:'Owned schema5 admin'});
 const db=new Database(path.join(target,'detuned.sqlite'));let decision:ReturnType<ReviewFinalizationService['finalizeRequest']>;try{const store=new SqliteStorage(db),hasher=new CryptoHasher(),clock={now:()=>new Date('2026-10-10T00:00:00Z'),nowIso:()=> '2026-10-10T00:00:00.000Z'},as=new AuthService(store,hasher,clock),token='owned-schema5-author';
 store.createCredential({id:'owned-schema5-author-credential',actor_id:oracle.recipe.actors.author,token_hash:hasher.sha256(token),allowed_space_ids:[oracle.recipe.space_id],capabilities:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});const auth=as.authenticateToken(token),request=oracle.oracle.requests.find(r=>r.scenario==='revealed')!,head=store.findReviewRequestById(request.response.id)!;
 const service=new ReviewFinalizationService(store,as,new IdempotencyService(store,hasher,clock),clock,new CryptoIdGenerator());decision=service.finalizeRequest(auth,oracle.recipe.space_id,head.id,{expected_version:head.version},'owned-finalize');expect(decision.outcome).toBe('accepted');expect(service.finalizeRequest(auth,oracle.recipe.space_id,head.id,{expected_version:head.version},'owned-finalize')).toEqual(decision);
 }finally{db.close();}
 const backup=path.join(root,'backup');expect((await backupOffline({dataDir:target,outputDir:backup,offline:true})).manifest.schemaVersion).toBe(5);const restored=path.join(root,'restored');await restoreBackup({backupDir:backup,dataDir:restored});const recovered=new Database(path.join(restored,'detuned.sqlite'));try{const store=new SqliteStorage(recovered);expect(store.findReviewDecisionByRequestId(decision.request_id)).toEqual(decision);expect(classifyDatabase(recovered)).toMatchObject({kind:'current_initialized',maxVersion:5});}finally{recovered.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});
it('SM503 wire2 admits only explicit3/4/5 excluded and preserves old wire1/source2 contract',()=>{
 const h={type:'header',format:'detuned-space-export',version:2,export_id:'exp_00000000-0000-0000-0000-000000000001',created_at:'2026-10-09T00:00:00.000Z',source:{space_id:'s',schema_version:5,snapshot_event_seq:'0',space_revision:1},identity_semantics:'source_actor_ids_only',scope:'public_research',formal_review_status:'excluded',formal_check_status:'excluded',hash_algorithm:'sha256-chain-v1'};
 for(const schema_version of [3,4,5])expect(validateSpaceExportLine({...h,source:{...h.source,schema_version}})).toBe(true);
 for(const schema_version of [2,6])expect(validateSpaceExportLine({...h,source:{...h.source,schema_version}})).toBe(false);expect(validateSpaceExportLine({...h,formal_review_status:'not_enabled'})).toBe(false);
 expect(validateSpaceExportLine({...h,version:1,source:{...h.source,schema_version:2},formal_review_status:'not_enabled',formal_check_status:'not_enabled'})).toBe(true);
});
