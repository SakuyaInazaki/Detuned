import {expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage,classifyDatabase} from '@detuned/storage-sqlite';
import {prepareRelationReadIndexes,RELATION_READ_INDEXES,RELATION_SOURCE_INDEX,RELATION_TARGET_INDEX} from '../../packages/storage-sqlite/src/relation-read-indexes.js';
it('M7.10-A derived relation indexes are exact, repeatable and collision-safe',()=>{
 const db=new Database(':memory:');try{bootstrapDatabase(db);const storage=new SqliteStorage(db);for(const [name] of RELATION_READ_INDEXES)expect(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(name)).toBeUndefined();storage.prepareRuntimeReadIndexes();storage.prepareRuntimeReadIndexes();for(const [name,sql] of RELATION_READ_INDEXES)expect(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(name)).toEqual({sql});expect(classifyDatabase(db).kind).toBe('current_initialized');
 db.exec(`DROP INDEX ${RELATION_TARGET_INDEX};CREATE INDEX ${RELATION_TARGET_INDEX} ON relations(id)`);const before=db.prepare('SELECT * FROM relations').all();expect(()=>prepareRelationReadIndexes(db)).toThrow(expect.objectContaining({code:'TEMPORARILY_UNAVAILABLE'}));expect(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(RELATION_TARGET_INDEX)).toEqual({sql:`CREATE INDEX ${RELATION_TARGET_INDEX} ON relations(id)`});expect(db.prepare('SELECT * FROM relations').all()).toEqual(before);expect(db.inTransaction).toBe(false);
 }finally{db.close();}
});
it('M7.10-A forward/reverse seeks use their anchor indexes without a per-branch temporary sort',()=>{
 const db=new Database(':memory:');try{bootstrapDatabase(db);prepareRelationReadIndexes(db);
 for(const [side,index] of [['source',RELATION_SOURCE_INDEX],['target',RELATION_TARGET_INDEX]]){const rows=db.prepare(`EXPLAIN QUERY PLAN SELECT r.id FROM relations r INDEXED BY ${index} WHERE r.space_id=? AND r.${side}_post_id=? AND r.${side}_revision=? AND r.id>? ORDER BY r.id ASC LIMIT ?`).all('space','post',1,'after',3);expect(JSON.stringify(rows)).toContain(index);expect(JSON.stringify(rows)).not.toContain('TEMP B-TREE');}
 }finally{db.close();}
});
