import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync, renameSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService, CryptoHasher, OperationsService } from '@detuned/core';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
const roots:string[]=[], dbs:Database.Database[]=[];
function fixture(memory=false) {
  const root=mkdtempSync(join(tmpdir(),'detuned-ops-'));roots.push(root);
  const db=new Database(memory ? ':memory:' : join(root,'detuned.sqlite'));dbs.push(db);
  const boot=bootstrapDatabase(db), storage=new SqliteStorage(db,{dataDir:root});
  const auth=new AuthService(storage,new CryptoHasher(),{now:()=>new Date(),nowIso:()=>new Date().toISOString()});
  return {root,db,storage,auth,ctx:auth.authenticateToken(boot.adminToken!),ops:new OperationsService(storage,auth)};
}
afterEach(()=>{for(const db of dbs)if(db.open)db.close();dbs.length=0;for(const root of roots)rmSync(root,{recursive:true,force:true});roots.length=0;});
describe('M3.4-B.1 readiness and administrator samples',()=>{
  it('checks actual metadata and configured directory while distinguishing unconfigured',()=>{
    const f=fixture();expect(f.ops.getReadiness()).toBe(true);
    expect(new SqliteStorage(f.db).sampleOperationalStatus().data_directory).toEqual({configured:false,available:null});
    f.db.prepare("UPDATE instance_metadata SET value='false' WHERE key='initialized'").run();expect(f.ops.getReadiness()).toBe(false);
    f.db.prepare("UPDATE instance_metadata SET value='true' WHERE key='initialized'").run();
    const missing=new SqliteStorage(f.db,{dataDir:join(f.root,'absent')});expect(missing.checkReadiness()).toBe(false);
    expect(missing.sampleOperationalStatus().data_directory.available).toBe(false);
  });
  it('refreshes credentials before administrator authorization',()=>{
    const f=fixture();expect(f.ops.getDiagnostics(f.ctx).ready).toBe(true);
    const nonadmin={...f.ctx,credential:{...f.ctx.credential,capabilities:[]}};
    // Persisted identity wins over caller-provided authorization fields.
    expect(f.ops.getDiagnostics(nonadmin).ready).toBe(true);
    f.db.prepare("UPDATE credentials SET capabilities='[]' WHERE id=?").run(f.ctx.credential.id);
    expect(()=>f.ops.getDiagnostics(f.ctx)).toThrow(/管理员/);
    f.db.prepare('UPDATE credentials SET revoked_at=? WHERE id=?').run(new Date().toISOString(),f.ctx.credential.id);
    expect(()=>f.ops.getDiagnostics(f.ctx)).toThrow(/失效/);
  });
  it('samples pages and physical WAL without advancing checkpoint under a reader',()=>{
    const f=fixture();f.db.pragma('wal_autocheckpoint=0');f.db.pragma('wal_checkpoint(TRUNCATE)');
    const reader=new Database(f.db.name,{readonly:true});dbs.push(reader);reader.exec('BEGIN');reader.prepare('SELECT count(*) FROM actors').get();
    f.db.prepare("UPDATE actors SET display_name='changed' WHERE id=?").run(f.ctx.actor.id);
    const wal=readFileSync(f.db.name+'-wal');
    const before=f.db.pragma('wal_checkpoint(NOOP)') as any[];
    const sample=f.ops.getDiagnostics(f.ctx);const after=f.db.pragma('wal_checkpoint(NOOP)') as any[];
    expect(after).toEqual(before);expect(readFileSync(f.db.name+'-wal')).toEqual(wal);
    expect(sample.database.wal.log_frames).toBeGreaterThan(sample.database.wal.checkpointed_frames!);
    expect(BigInt(sample.database.allocated_bytes)).toBe(BigInt(sample.database.page_size)*BigInt(sample.database.page_count));
    expect(sample.files.wal.state).toBe('regular');reader.exec('ROLLBACK');reader.close();
    // Explicit test-only checkpoint after release is distinct from diagnostic observation.
    const done=f.db.pragma('wal_checkpoint(TRUNCATE)') as any[];expect(done[0].busy).toBe(0);
  });
  it('uses exact decimal bytes and bounded observed artifact usage',()=>{
    const f=fixture();const n=Number.MAX_SAFE_INTEGER;
    // Private tiny metadata rows, no attachment bytes or FK bypass.
    f.db.prepare("INSERT INTO spaces(id,slug,created_at) VALUES ('ops_space','ops-space','2030-01-01')").run();
    const insert=f.db.prepare("INSERT INTO artifacts(id,space_id,owner_id,sha256,bytes,mime,storage_key,state,created_at) VALUES (?,'ops_space',?,'hash',?,'application/octet-stream',?,'missing','2030-01-01')");
    f.db.transaction(()=>{for(let i=0;i<10002;i++)insert.run(`artifact_${String(i).padStart(5,'0')}`,f.ctx.actor.id,n,`key_${i}`);})();
    const sample=f.ops.getDiagnostics(f.ctx);expect(sample.artifacts).toEqual({objects_observed:10001,bytes_observed:(BigInt(n)*10001n).toString(),complete:false});
  });
  it('keeps draining explicit and memory file samples inapplicable',()=>{
    const f=fixture(true);const sample=f.ops.getDiagnostics(f.ctx);expect(sample.files.database.state).toBe('not_applicable');expect(sample.files.wal.state).toBe('not_applicable');
    f.ops.beginDraining();f.ops.beginDraining();expect(f.ops.getReadiness()).toBe(false);expect(f.ops.getDiagnostics(f.ctx).lifecycle).toBe('draining');
  });
  it('refuses linked files and safely hides database errors',()=>{
    const f=fixture();const original=f.db.name, saved=original+'.saved';renameSync(original,saved);symlinkSync(saved,original);
    expect(f.storage.sampleOperationalStatus().files.database.state).toBe('unavailable');
    f.db.close();expect(f.storage.checkReadiness()).toBe(false);
    f.auth.refreshContext=()=>f.ctx;
    expect(()=>f.ops.getDiagnostics(f.ctx)).toThrow('运行统计暂不可用。');
  });
});
