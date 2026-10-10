import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootstrapDatabase, classifyDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { POST_CREATED_ORDER_INDEX, POST_CREATED_SORT_KEY_SQL } from '../../packages/storage-sqlite/src/post-created-order-index.js';

const databases: Database.Database[] = [];
const directories: string[] = [];
const fresh = (file = ':memory:') => { const db = new Database(file); databases.push(db); const boot = bootstrapDatabase(db); return { db, boot, storage: new SqliteStorage(db) }; };
const index = (db: Database.Database) => db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(POST_CREATED_ORDER_INDEX);
function seed(db: Database.Database, actor: string) {
  const date = '2026-10-09T00:00:00.000Z';
  db.prepare('INSERT INTO spaces(id,slug,created_at) VALUES(?,?,?)').run('s','s',date);
  db.prepare('INSERT INTO threads(id,space_id,title,creator_id,created_at,updated_at) VALUES(?,?,?,?,?,?)').run('t','s','t',actor,date,date);
  const add = db.prepare("INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) VALUES(?,'s','t',?,'note',1,'active',?)");
  for (const [id,t] of [['c',date],['b',date],['a','2026-10-08T00:00:00.000Z'],['z','2026-02-30T00:00:00.000Z']]) add.run(id,actor,t);
}
afterEach(() => { for (const db of databases.splice(0)) if (db.open) db.close(); for (const dir of directories.splice(0)) rmSync(dir,{recursive:true,force:true}); });

describe('E2 runtime-only creation sort index', () => {
  it('I01 startup creates optional index after quotas, reopened current and historical runtime accept it', async () => {
    const dir = mkdtempSync(join(tmpdir(),'detuned-order-index-')); directories.push(dir); const file = join(dir,'db.sqlite');
    const { db, storage, boot } = fresh(file); seed(db,boot.adminActorId!);
    expect(index(db)).toBeUndefined(); expect(storage.listPostsInThreadByCreatedAt('t',20).posts.map(p=>p.id)).toEqual(['a','b','c','z']);
    const app = buildApp({storage}); await app.ready(); expect(index(db)).toBeDefined(); await app.close();
    const sql = index(db); const rows = db.prepare('SELECT * FROM posts ORDER BY id').all(); db.close();
    const reopened = new Database(file); databases.push(reopened); const again = new SqliteStorage(reopened); again.configureResourceLimits({ database_max_bytes:1073741824,artifact_max_total_bytes:4294967296,artifact_max_objects:10000 }); again.prepareRuntimeReadIndexes();
    expect(index(reopened)).toEqual(sql); expect(classifyDatabase(reopened).kind).toBe('current_initialized'); expect(reopened.prepare('SELECT * FROM posts ORDER BY id').all()).toEqual(rows);
    // Fixed real schema1 runtime can still read this current extra-index database; no migration is invoked.
    const historical = await import(new URL('../fixtures/runtime-fa1b35c/runtime.mjs',import.meta.url).href);
    const old = new historical.SqliteStorage(reopened); expect(old.listPostsInThread('t',20).posts.map((p:{id:string})=>p.id)).toEqual(['a','b','c','z']);
  });

  it('I02 reserved wrong-definition collision rejects startup without dropping or changing data', () => {
    const { db, storage, boot } = fresh(); seed(db,boot.adminActorId!); db.exec(`CREATE INDEX ${POST_CREATED_ORDER_INDEX} ON posts(id)`);
    const original = index(db); const rows = db.prepare('SELECT * FROM posts').all();
    expect(()=>buildApp({storage})).toThrow('Runtime read index preparation failed');
    expect(index(db)).toEqual(original); expect(db.prepare('SELECT * FROM posts').all()).toEqual(rows); expect(db.inTransaction).toBe(false);
  });

  it('I03 real page-allocation FULL rolls back index and preserves original cap/data', () => {
    const { db, storage, boot } = fresh(); seed(db,boot.adminActorId!); db.exec('VACUUM');
    storage.configureResourceLimits({database_max_bytes:1048576,artifact_max_total_bytes:4294967296,artifact_max_objects:10000});
    // Private native-limit fixture tightens an already configured main cap to existing pages, forcing the first new index page to allocate FULL.
    const pages = db.pragma('page_count',{simple:true}) as number; db.pragma(`max_page_count=${pages}`);
    const rows = db.prepare('SELECT * FROM posts').all();
    expect(()=>storage.prepareRuntimeReadIndexes()).toThrow(expect.objectContaining({code:'QUOTA_EXCEEDED',statusCode:507,retryable:false}));
    expect(index(db)).toBeUndefined(); expect(db.inTransaction).toBe(false); expect(db.pragma('max_page_count',{simple:true})).toBe(pages); expect(db.prepare('SELECT * FROM posts').all()).toEqual(rows);
  });

  it('I04 constructor/read/readonly/legacy leave source unindexed; query plan uses exact expression index', async () => {
    const { db, storage, boot } = fresh(); seed(db,boot.adminActorId!);
    storage.readSnapshot(()=>storage.listPostsInThreadByCreatedAt('t',2)); expect(index(db)).toBeUndefined();
    storage.prepareRuntimeReadIndexes();
    const plan = db.prepare(`EXPLAIN QUERY PLAN SELECT id FROM posts WHERE thread_id=? ORDER BY (${POST_CREATED_SORT_KEY_SQL} IS NULL),${POST_CREATED_SORT_KEY_SQL},id LIMIT 2`).all('t');
    expect(JSON.stringify(plan)).toContain(POST_CREATED_ORDER_INDEX); expect(JSON.stringify(plan)).not.toContain('TEMP B-TREE');
    expect(storage.listPostsInThreadByCreatedAt('t',2,{key:'2026-10-09T00:00:00.000Z',id:'b'}).posts.map(p=>p.id)).toEqual(['c','z']);
    const dir = mkdtempSync(join(tmpdir(),'detuned-readonly-order-')); directories.push(dir); const file = join(dir,'db.sqlite'); const source=fresh(file); source.db.close();
    const read = new Database(file,{readonly:true,fileMustExist:true}); databases.push(read); const readStorage=new SqliteStorage(read); expect(index(read)).toBeUndefined(); expect(()=>readStorage.prepareRuntimeReadIndexes()).toThrow('Runtime read index preparation failed'); expect(index(read)).toBeUndefined();
    const historical = await import(new URL('../fixtures/runtime-fa1b35c/runtime.mjs',import.meta.url).href);
    const legacy=new Database(':memory:'); databases.push(legacy); historical.bootstrapDatabase(legacy); const legacyStorage=new SqliteStorage(legacy); expect(classifyDatabase(legacy).kind).toBe('supported_legacy'); expect(()=>legacyStorage.prepareRuntimeReadIndexes()).toThrow('Runtime read index preparation failed'); expect(index(legacy)).toBeUndefined();
  });
});
