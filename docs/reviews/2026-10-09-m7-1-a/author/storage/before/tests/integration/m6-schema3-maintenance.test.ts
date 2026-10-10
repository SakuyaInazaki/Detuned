import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { bootstrapDatabase, classifyDatabase, openAndCoordinateDatabase, SqliteStorage, upgradeOffline, backupOffline, restoreBackup } from '../../packages/storage-sqlite/src/index.js';
import { validateSpaceExportLine } from '@detuned/protocol';
const oldSql = readFileSync(new URL('../fixtures/historical-v2-schema.sql',import.meta.url),'utf8');
const tables = ['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions'];
function historical(db: Database.Database) {
  db.exec(oldSql);
  db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(1,'2026-10-09T00:00:00.000Z');
  db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(2,'2026-10-09T00:00:00.000Z');
  db.prepare('INSERT INTO instance_metadata VALUES (?,?)').run('initialized','true');
  db.prepare('INSERT INTO instance_metadata VALUES (?,?)').run('token_secret','private-test-secret');
  db.prepare('INSERT INTO actors(id,kind,display_name,created_at) VALUES (?,?,?,?)').run('a','human','Private fixture','2026-10-09T00:00:00.000Z');
}
describe('M6 schema3 maintenance',()=>{
  it('classifies exact historical2 and refuses ordinary init/serve without mutating it, while explicit stage bootstrap upgrades',()=>{
    const db=new Database(':memory:');try{historical(db);expect(classifyDatabase(db)).toMatchObject({kind:'supported_legacy',maxVersion:2});
      for(const mode of ['init','serve'] as const)expect(()=>openAndCoordinateDatabase(db,mode)).toThrow(/migrate/);
      expect(db.prepare('SELECT MAX(version) AS n FROM schema_migrations').get()).toEqual({n:2});
      bootstrapDatabase(db);expect(classifyDatabase(db)).toMatchObject({kind:'current_initialized',maxVersion:5});
      for(const table of tables)expect(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({n:0});
    }finally{db.close();}
  });
  it('creates fresh schema5 and rejects incomplete formal structure and future markers',()=>{
    const db=new Database(':memory:');try{bootstrapDatabase(db);expect(classifyDatabase(db).kind).toBe('current_initialized');db.exec('DROP TABLE review_assignments');expect(classifyDatabase(db).kind).toBe('corrupt');db.prepare('INSERT INTO schema_migrations VALUES(6,?)').run('2026-10-09T00:00:00.000Z');expect(classifyDatabase(db).kind).toBe('future');}finally{db.close();}
  });
  it('copies historical2 only to new schema5, preserving source bytes, and backs up/restores schema5',async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),'detuned-m6-maint-'));try{
      const source=path.join(root,'source');await mkdir(source,{mode:0o700});const sourceFile=path.join(source,'detuned.sqlite');const db=new Database(sourceFile);historical(db);db.close();
      const before=createHash('sha256').update(await readFile(sourceFile)).digest('hex');
      const output=path.join(root,'new');const result=await upgradeOffline({dataDir:source,outputDir:output,offline:true,adminName:'Private administrator'});expect(result).toMatchObject({source_schema_version:2,schema_version:5});expect(createHash('sha256').update(await readFile(sourceFile)).digest('hex')).toBe(before);
      const backup=path.join(root,'backup');expect((await backupOffline({dataDir:output,outputDir:backup,offline:true})).manifest).toMatchObject({version:1,schemaVersion:5});
      const target=path.join(root,'restore');await restoreBackup({backupDir:backup,dataDir:target});const restored=new Database(path.join(target,'detuned.sqlite'));try{expect(classifyDatabase(restored).kind).toBe('current_initialized');for(const table of tables)expect(restored.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({n:0});}finally{restored.close();}
    }finally{await rm(root,{recursive:true,force:true});}
  });
  it('keeps aggregate CRUD atomic and immutable versions/assignments intact through physical recovery',async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),'detuned-m6-history-'));let db:Database.Database|undefined;
    try {
      const source=path.join(root,'source');await mkdir(source,{mode:0o700});db=new Database(path.join(source,'detuned.sqlite'));const actor=bootstrapDatabase(db).adminActorId!;const store=new SqliteStorage(db);const now='2026-10-09T00:00:00.000Z';
      db.prepare('INSERT INTO spaces VALUES(?,?,1,1,1,?)').run('s','history',now);
      db.prepare('INSERT INTO threads VALUES(?,?,?,1,?,?,?,?)').run('t','s','Private thread','open',actor,now,now);
      db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,1,?,?)').run('p','s','t',actor,'claim','active',now);
      const snapshot={id:'snap',space_id:'s',manifest_json:'{"private_test_record":true}',manifest_sha256:'a'.repeat(64),policy_revision:1,rules_revision:1,target_ref:{post_id:'p',revision:1},created_by:actor,created_at:now};
      const item={snapshot_id:'snap',item_type:'target_post' as const,item_id:'p',revision:1,sha256:'b'.repeat(64)};
      expect(()=>store.createReviewSnapshot(snapshot,[item,item])).toThrow();expect(store.findReviewSnapshotById('snap')).toBeNull();
      store.createReviewSnapshot(snapshot,[item,{snapshot_id:'snap',item_type:'space_rules',item_id:'s',revision:1,sha256:null}]);
      const request={id:'r',space_id:'s',target_ref:{post_id:'p',revision:1},snapshot_id:'snap',round:1,phase:'collecting' as const,version:1,submitted_count:0,requested_by:actor,created_at:now,changed_by:actor,changed_at:now,reason:null};
      const version={request_id:'r',version:1,phase:'collecting' as const,submitted_count:0,changed_by:actor,changed_at:now,reason:null};const assignment={id:'assignment',request_id:'r',reviewer_actor_id:actor,group_at_assignment:'private-fixture'};
      expect(()=>store.createReviewRequest(request,version,[assignment,assignment])).toThrow();expect(store.findReviewRequestById('r')).toBeNull();
      store.createReviewRequest(request,version,[assignment]);
      db.exec("CREATE TRIGGER deny_review_version BEFORE INSERT ON review_request_versions WHEN NEW.version=2 BEGIN SELECT RAISE(ABORT,'private fault'); END");
      const changed={...request,phase:'cancelled' as const,version:2,reason:'Private cancellation'};const v2={...version,phase:'cancelled' as const,version:2,reason:changed.reason};
      expect(()=>store.updateReviewRequest(changed,v2)).toThrow();expect(store.findReviewRequestById('r')).toEqual(request);db.exec('DROP TRIGGER deny_review_version');store.updateReviewRequest(changed,v2);expect(store.findReviewRequestVersion('r',1)).toEqual(version);expect(store.listReviewAssignments('r')).toEqual([assignment]);
      db.close();db=undefined;const backup=path.join(root,'backup');await backupOffline({dataDir:source,outputDir:backup,offline:true});const output=path.join(root,'restored');await restoreBackup({backupDir:backup,dataDir:output});db=new Database(path.join(output,'detuned.sqlite'));const recovered=new SqliteStorage(db);expect(recovered.findReviewSnapshotById('snap')).toEqual(snapshot);expect(recovered.listReviewSnapshotItems('snap')).toHaveLength(2);expect(recovered.findReviewRequestById('r')).toEqual(changed);expect(recovered.findReviewRequestVersion('r',1)).toEqual(version);expect(recovered.findReviewRequestVersion('r',2)).toEqual(v2);expect(recovered.listReviewAssignments('r')).toEqual([assignment]);
    }finally{db?.close();await rm(root,{recursive:true,force:true});}
  });
  it('keeps correlated old/new export headers and rejects mixed version/status combinations',()=>{
    const header={type:'header',format:'detuned-space-export',version:1,export_id:'exp_00000000-0000-0000-0000-000000000001',created_at:'2026-10-09T00:00:00.000Z',source:{space_id:'s',schema_version:2,snapshot_event_seq:'0',space_revision:1},identity_semantics:'source_actor_ids_only',scope:'public_research',formal_review_status:'not_enabled',formal_check_status:'not_enabled',hash_algorithm:'sha256-chain-v1'};
    expect(validateSpaceExportLine(header)).toBe(true);const current={...header,version:2,source:{...header.source,schema_version:3},formal_review_status:'excluded',formal_check_status:'excluded'};expect(validateSpaceExportLine(current)).toBe(true);expect(validateSpaceExportLine({...current,version:1})).toBe(false);expect(validateSpaceExportLine({...header,source:current.source})).toBe(false);
  });
});
