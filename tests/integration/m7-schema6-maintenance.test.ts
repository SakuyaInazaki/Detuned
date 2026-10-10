import {it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,mkdir,copyFile,readFile,rm} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {upgradeOffline,backupOffline,restoreBackup,classifyDatabase,verifyDatabaseStructure} from '@detuned/storage-sqlite';
import {validateSpaceExportLine} from '@detuned/protocol';
const source=new URL('../fixtures/m7-schema5-baseline/database.sqlite',import.meta.url);
const manifest=new URL('../fixtures/m7-schema5-baseline/manifest.json',import.meta.url);
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const history=['sessions','snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','consumers','delivery_batches','events','idempotency_records'];
function rows(db:Database.Database){return Object.fromEntries(history.map(t=>[t,db.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));}
async function hydrate(dir:string){
 const original=await readFile(source),m=JSON.parse(await readFile(manifest,'utf8'));expect(hash(original)).toBe(m.archive.sha256);
 await mkdir(dir);const file=path.join(dir,'detuned.sqlite');await copyFile(source,file);
 const db=new Database(file);try{db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('token_secret',randomBytes(32).toString('hex'));expect(classifyDatabase(db)).toMatchObject({kind:'supported_legacy',maxVersion:5});expect(verifyDatabaseStructure(db,5).valid).toBe(true);return{before:rows(db),file,originalHash:hash(original)};}finally{db.close();}
}
it('SM601 genuine secret-free V5 copy upgrades to6 preserving formal and pending consumer history, then physical restore',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'detuned-m7-maintenance-'));try{
  const src=path.join(root,'v5'),h=await hydrate(src),hydratedHash=hash(await readFile(h.file)),target=path.join(root,'v6');
  expect(await upgradeOffline({dataDir:src,outputDir:target,offline:true,adminName:'Local M7 maintenance administrator'})).toMatchObject({source_schema_version:5,schema_version:6});
  expect(hash(await readFile(h.file))).toBe(hydratedHash);expect(hash(await readFile(source))).toBe(h.originalHash);
  const db=new Database(path.join(target,'detuned.sqlite'));try{
   expect(classifyDatabase(db)).toMatchObject({kind:'current_initialized',maxVersion:6});expect(verifyDatabaseStructure(db,6).valid).toBe(true);expect(db.pragma('foreign_key_check')).toEqual([]);expect(rows(db)).toEqual(h.before);
   for(const t of ['check_runs','check_run_versions','check_receipts','check_run_credentials'])expect(db.prepare(`SELECT count(*) n FROM ${t}`).get()).toEqual({n:0});
  }finally{db.close();}
  const backup=path.join(root,'backup');expect((await backupOffline({dataDir:target,outputDir:backup,offline:true})).manifest.schemaVersion).toBe(6);
  const restored=path.join(root,'restored');await restoreBackup({backupDir:backup,dataDir:restored});const recovered=new Database(path.join(restored,'detuned.sqlite'));try{expect(rows(recovered)).toEqual(h.before);expect(classifyDatabase(recovered)).toMatchObject({kind:'current_initialized',maxVersion:6});expect(recovered.prepare('SELECT count(*) n FROM credentials WHERE revoked_at IS NULL').get()).toEqual({n:1});}finally{recovered.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});
it('SM602 failed offline5→6 migration leaves genuine hydrated source byte-identical and permits a new destination retry',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'detuned-m7-upgrade-fault-'));try{
  const src=path.join(root,'v5'),h=await hydrate(src),before=hash(await readFile(h.file));
  await expect(upgradeOffline({dataDir:src,outputDir:path.join(root,'failed'),offline:true,adminName:'Local M7 administrator',hooks:{atStage(stage){if(stage==='after-migrate')throw new Error('owned controlled migration fault');}}})).rejects.toMatchObject({code:'UPGRADE_FAILED'});
  expect(hash(await readFile(h.file))).toBe(before);expect(hash(await readFile(source))).toBe(h.originalHash);
  expect(await upgradeOffline({dataDir:src,outputDir:path.join(root,'retry'),offline:true,adminName:'Local M7 administrator'})).toMatchObject({source_schema_version:5,schema_version:6});
 }finally{await rm(root,{recursive:true,force:true});}
});
it('SM603 logical header6 adds only supported version, retains legacy5 and excluded formal family',()=>{
 const h={type:'header',format:'detuned-space-export',version:2,export_id:'exp_00000000-0000-0000-0000-000000000001',created_at:'2026-10-09T00:00:00.000Z',source:{space_id:'owned',schema_version:6,snapshot_event_seq:'0',space_revision:1},identity_semantics:'source_actor_ids_only',scope:'public_research',formal_review_status:'excluded',formal_check_status:'excluded',hash_algorithm:'sha256-chain-v1'};
 expect(validateSpaceExportLine(h)).toBe(true);expect(validateSpaceExportLine({...h,source:{...h.source,schema_version:5}})).toBe(true);expect(validateSpaceExportLine({...h,source:{...h.source,schema_version:7}})).toBe(false);expect(validateSpaceExportLine({...h,formal_check_status:'passed'})).toBe(false);expect(validateSpaceExportLine({type:'check_receipt',receipt_id:'forbidden'})).toBe(false);
});
