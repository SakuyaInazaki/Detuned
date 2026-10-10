import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArtifactService, AuthService, CryptoHasher, CryptoIdGenerator, IdempotencyService, PostService, SpaceService, ThreadService, WriteRateLimiter, type BlobStorePort } from '@detuned/core';
import { DEFAULT_ARTIFACT_LIMITS, DEFAULT_RESOURCE_LIMITS, type ResourceLimits } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { ArtifactFileStore } from '@detuned/server';

const MiB = 1048576;
const roots: string[] = [], databases = new Set<Database.Database>();
const limits: ResourceLimits = { ...DEFAULT_RESOURCE_LIMITS, database_max_bytes: MiB };
function open(filename: string) { const db = new Database(filename); databases.add(db); return db; }
function close(db: Database.Database) { db.close(); databases.delete(db); }
function fixture(config: ResourceLimits = limits) {
  const root = mkdtempSync(join(tmpdir(), 'detuned-resource-')); roots.push(root); const filename = join(root, 'detuned.sqlite');
  const db = open(filename), boot = bootstrapDatabase(db), storage = new SqliteStorage(db);
  const clock = { now: () => new Date('2030-01-01T00:00:00Z'), nowIso: () => '2030-01-01T00:00:00.000Z' };
  const hash = new CryptoHasher(), ids = new CryptoIdGenerator(), meter = new WriteRateLimiter(clock, { per_minute: 60000, burst: 10000 });
  const authService = new AuthService(storage, hash, clock, meter), auth = authService.authenticateToken(boot.adminToken!);
  const idem = new IdempotencyService(storage, hash, clock, meter), spaces = new SpaceService(storage, ids, clock, authService, idem);
  const sid = spaces.createSpace(auth, { slug: 'resources', objective: 'o', rules: [] }, 'space').space.id;
  const tid = new ThreadService(storage, ids, clock, hash, authService, idem).createThread(auth, sid, { title: 't' }, 'thread').thread.id;
  const posts = new PostService(storage, ids, clock, hash, authService, idem);
  storage.configureResourceLimits(config);
  return { root, filename, db, storage, clock, hash, ids, authService, auth, idem, sid, tid, posts };
}
function errorOf(fn: () => unknown): any { try { fn(); } catch (e) { return e; } throw Error('expected rejection'); }
function count(db: Database.Database, table: string): number { return (db.prepare(`SELECT count(*) n FROM ${table}`).get() as {n:number}).n; }
function register(f: ReturnType<typeof fixture>, id: string, bytes: number, state: 'ready'|'redacted'|'missing') {
  f.storage.createArtifact({ id, space_id: f.sid, owner_id: f.auth.actor.id, visibility: 'space', review_assignment_id: null, check_run_id: null, sha256: '0'.repeat(64), bytes, mime: 'application/octet-stream', storage_key: id, state, created_at: f.clock.nowIso() });
}
async function staged(blobs: BlobStorePort, value = 'a') { return blobs.stage((async function* () { yield Buffer.from(value); })(), DEFAULT_ARTIFACT_LIMITS.max_file_bytes); }
function service(f: ReturnType<typeof fixture>, blobs: BlobStorePort, config = limits) {
  return new ArtifactService(f.storage, blobs, f.authService, f.idem, f.ids, f.clock, DEFAULT_ARTIFACT_LIMITS, config);
}
afterEach(() => { for (const db of databases) db.close(); databases.clear(); for (const root of roots) rmSync(root,{recursive:true,force:true}); roots.length = 0; });

describe('M3.4-A.2 runtime connection and registered artifact quotas', () => {
  it('reapplies a nonpersistent main page cap per connection and floors using actual page size', () => {
    const f = fixture({ ...limits, database_max_bytes: MiB + 123 });
    const pageSize = f.db.pragma('page_size',{simple:true}) as number;
    expect(f.db.pragma('max_page_count',{simple:true})).toBe(Math.floor((MiB+123)/pageSize));
    const other = open(f.filename); expect(other.pragma('max_page_count',{simple:true})).not.toBe(Math.floor((MiB+123)/pageSize));
    new SqliteStorage(other).configureResourceLimits(limits); expect(other.pragma('max_page_count',{simple:true})).toBe(Math.floor(MiB/pageSize)); close(other); close(f.db);
    const reopened = open(f.filename); expect(reopened.pragma('max_page_count',{simple:true})).not.toBe(Math.floor(MiB/pageSize));
    new SqliteStorage(reopened).configureResourceLimits(limits); expect(reopened.pragma('max_page_count',{simple:true})).toBe(Math.floor(MiB/pageSize));
  });

  it('refuses an existing oversized database rather than accepting SQLite silently enlarged cap', () => {
    const f = fixture(); f.db.pragma('max_page_count=10000'); f.db.exec('CREATE TABLE quota_oversize(value BLOB)');
    f.db.prepare('INSERT INTO quota_oversize VALUES(zeroblob(?))').run(2*MiB);
    const pageCount = f.db.pragma('page_count',{simple:true}) as number, target = MiB/(f.db.pragma('page_size',{simple:true}) as number);
    expect(pageCount).toBeGreaterThan(target); expect(f.db.pragma(`max_page_count=${target}`,{simple:true})).toBe(pageCount);
    expect(errorOf(() => f.storage.configureResourceLimits(limits))).toMatchObject({ code:'QUOTA_EXCEEDED',statusCode:507,retryable:false,details:{scope:'database'} });
    expect(count(f.db,'quota_oversize')).toBe(1);
  });

  it('naturally reaches real FULL through at most 32 legal research writes and leaves the failed write atomic', () => {
    const f = fixture(); const body = 'x'.repeat(65536); let successful = 0, failure: any;
    const initialEvents = count(f.db,'events'), initialKeys = count(f.db,'idempotency_records');
    for (let i = 0; i < 32; i++) {
      try { f.posts.createPost(f.auth,f.sid,f.tid,{kind:'note',title:`post ${i}`,summary:'s',body},`natural-${i}`); successful++; }
      catch (e) { failure = e; break; }
    }
    expect(successful).toBeGreaterThan(0); expect(successful).toBeLessThan(32);
    expect(failure).toMatchObject({code:'QUOTA_EXCEEDED',statusCode:507,retryable:false,details:{scope:'storage'}});
    expect(count(f.db,'posts')).toBe(successful); expect(count(f.db,'post_revisions')).toBe(successful);
    expect(count(f.db,'events')).toBe(initialEvents+successful); expect(count(f.db,'idempotency_records')).toBe(initialKeys+successful);
    expect(f.db.inTransaction).toBe(false); expect(f.storage.transaction(()=>42)).toBe(42); expect(f.db.pragma('integrity_check',{simple:true})).toBe('ok');
  });

  it.each(['createPost','appendEvent','createIdempotencyRecord'] as const)('test injection triggers real allocation FULL at %s and rolls back the whole business transaction', method => {
    const f = fixture(); f.db.exec('CREATE TABLE quota_fault(payload BLOB)');
    const eventCount = count(f.db,'events'), keys = count(f.db,'idempotency_records');
    const original = f.storage[method].bind(f.storage); (f.storage as any)[method] = (...args: any[]) => {
      f.db.prepare('INSERT INTO quota_fault VALUES(zeroblob(?))').run(2*MiB); return (original as any)(...args);
    };
    try {
      expect(errorOf(()=>f.posts.createPost(f.auth,f.sid,f.tid,{kind:'note',title:'injected',summary:'s'},'fault'))).toMatchObject({code:'QUOTA_EXCEEDED',statusCode:507,retryable:false,details:{scope:'storage'}});
      expect(f.db.inTransaction).toBe(false); expect(count(f.db,'posts')).toBe(0); expect(count(f.db,'post_revisions')).toBe(0); expect(count(f.db,'quota_fault')).toBe(0);
      expect(count(f.db,'events')).toBe(eventCount); expect(count(f.db,'idempotency_records')).toBe(keys); expect(f.storage.transaction(()=>42)).toBe(42);
    } finally { (f.storage as any)[method] = original; }
  });

  it('cleans real staged and published files after injected allocation FULL at artifact event commit', async () => {
    const f = fixture(); f.db.exec('CREATE TABLE quota_fault(payload BLOB)'); const blobs = await ArtifactFileStore.create(f.root), artifacts = service(f,blobs);
    const original = f.storage.appendEvent.bind(f.storage); f.storage.appendEvent = () => { f.db.prepare('INSERT INTO quota_fault VALUES(zeroblob(?))').run(2*MiB); throw Error('unreachable'); };
    try {
      await expect(artifacts.create(f.auth,f.sid,{staged:await staged(blobs),metadata:{visibility:'space'},mime:'text/plain'},'artifact-fault')).rejects.toMatchObject({code:'QUOTA_EXCEEDED',statusCode:507});
      expect(count(f.db,'artifacts')).toBe(0); expect(f.db.inTransaction).toBe(false);
      expect(await readdir(join(f.root,'artifacts','objects'))).toEqual([]); expect(await readdir(join(f.root,'artifacts','staging'))).toEqual([]);
    } finally { f.storage.appendEvent = original; }
  });

  it('counts ready/redacted/missing and rejects oversized declaration totals with BigInt instead of SQLite SUM overflow', () => {
    const f = fixture(); for(let i=0;i<1100;i++)register(f,`huge-${String(i).padStart(4,'0')}`,Number.MAX_SAFE_INTEGER,'missing');
    expect(errorOf(()=>f.db.prepare('SELECT SUM(bytes) FROM artifacts').get()).message).toContain('integer overflow');
    const usage = f.storage.getArtifactUsage(10000); expect(usage).toEqual({objects:1100,bytes:1100n*BigInt(Number.MAX_SAFE_INTEGER)});
    expect(errorOf(()=>f.storage.configureResourceLimits(limits))).toMatchObject({code:'QUOTA_EXCEEDED',statusCode:507,details:{scope:'instance_artifacts'}});
    expect(count(f.db,'artifacts')).toBe(1100);
    const small = fixture(); register(small,'a',2,'ready');register(small,'b',3,'redacted');register(small,'c',4,'missing');
    expect(small.storage.getArtifactUsage(10000)).toEqual({objects:3,bytes:9n}); expect(small.storage.getArtifactUsage(1).objects).toBe(2);
    expect(errorOf(()=>small.storage.configureResourceLimits({...limits,artifact_max_objects:2})).statusCode).toBe(507);
    // Iterators are released, including malformed-row rejection.
    small.db.prepare('UPDATE artifacts SET bytes=-1 WHERE id=?').run('a'); expect(errorOf(()=>small.storage.getArtifactUsage(10000)).statusCode).toBe(507);
    small.db.prepare('UPDATE artifacts SET bytes=2 WHERE id=?').run('a'); expect(small.storage.getArtifactUsage(10000).bytes).toBe(9n);
  });

  it.each(['bytes','objects'] as const)('serializes two real file publications competing for last global %s allowance, with replay and restart', async kind => {
    const config = {...limits,artifact_max_total_bytes:kind==='bytes'?1:100,artifact_max_objects:kind==='objects'?1:100};
    const f = fixture(config), real = await ArtifactFileStore.create(f.root); let arrivals=0, release!:()=>void; const barrier = new Promise<void>(r=>{release=r;});
    const blobs: BlobStorePort = { stage: real.stage.bind(real), discardStage: real.discardStage.bind(real), discardPublished: real.discardPublished.bind(real), exists: real.exists.bind(real), open: real.open.bind(real), publish: async(s,k)=>{await real.publish(s,k);if(++arrivals===2)release();await barrier;} };
    const artifacts = service(f,blobs,config), inputs = await Promise.all([staged(real),staged(real)]);
    const results = await Promise.allSettled(inputs.map((input,i)=>artifacts.create(f.auth,f.sid,{staged:input,metadata:{visibility:'space'},mime:'text/plain'},`race-${i}`)));
    expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1); expect(results.filter(x=>x.status==='rejected')).toHaveLength(1);
    const rejected = results.find(x=>x.status==='rejected') as PromiseRejectedResult; expect(rejected.reason).toMatchObject({code:'QUOTA_EXCEEDED',statusCode:507,retryable:false,details:{scope:'instance_artifacts'}});
    const winner = results.findIndex(x=>x.status==='fulfilled'), result = results[winner] as PromiseFulfilledResult<any>;
    const replay = await service(f,real,config).create(f.auth,f.sid,{staged:await staged(real),metadata:{visibility:'space'},mime:'text/plain'},`race-${winner}`);
    expect(replay.id).toBe(result.value.id); expect(await readdir(join(f.root,'artifacts','objects'))).toHaveLength(1); expect(f.storage.getArtifactUsage(10000)).toEqual({objects:1,bytes:1n});
    close(f.db); const reopened = open(f.filename), storage = new SqliteStorage(reopened); storage.configureResourceLimits(config); expect(storage.getArtifactUsage(10000)).toEqual({objects:1,bytes:1n});
  });
});
