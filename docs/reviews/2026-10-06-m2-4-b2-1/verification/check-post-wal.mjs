// Independent PR07 material + mutable metadata snapshot barrier. Dormant before parent freeze.
import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {fixture} from './post-fixture.mjs';
const dir=await mkdtemp(path.join(os.tmpdir(),'detuned-pr-wal-'));let f,writer;const results=[];
try{
 f=await fixture({file:path.join(dir,'wal.db')});assert.equal(f.db.pragma('journal_mode = WAL',{simple:true}),'wal');writer=new Database(path.join(dir,'wal.db'));assert.equal(writer.pragma('journal_mode',{simple:true}),'wal');
 const doc=f.document();const original=f.storage.getPostRevision.bind(f.storage);let fired=false;
 f.storage.getPostRevision=(pid,revision)=>{const row=original(pid,revision);if(pid===f.pid&&revision===1&&!fired){fired=true;assert.equal(f.db.inTransaction,true);writer.transaction(()=>{writer.prepare('INSERT INTO post_revisions(post_id,revision,title,summary,body,tags,structured,content_hash,editor_id,created_at) SELECT post_id,2,?,summary,body,tags,structured,content_hash,editor_id,created_at FROM post_revisions WHERE post_id=? AND revision=1').run('writer new title',pid);writer.prepare("UPDATE posts SET current_revision=2,lifecycle='withdrawn' WHERE id=?").run(pid);})();assert.equal(writer.prepare('SELECT current_revision FROM posts WHERE id=?').get(pid).current_revision,2);}return row;};
 const first=(await f.call('GET',f.route)).json();assert(fired);assert.equal(first.data.post_kind,'note');assert.equal(first.data.lifecycle,'active');assert.equal(first.data.has_newer_revision,false);assert.deepEqual(JSON.parse(first.data.chunk),doc);assert.deepEqual(first.data.ref,{space_id:f.sid,post_id:f.pid,revision:1});
 const next=(await f.call('GET',f.route)).json();assert.equal(next.data.lifecycle,'withdrawn');assert.equal(next.data.has_newer_revision,true);assert.deepEqual(JSON.parse(next.data.chunk),doc);results.push({id:'PR07',wal_two_connections:true,barrier:'after fixed revision read',first_old_material_active_old_head:true,next_old_material_withdrawn_new_head:true});
 console.log(JSON.stringify({passes:true,results,fixture_origin:'independent synthetic writer state transition, no developer assertion helpers'},null,2));
}catch(e){console.log(JSON.stringify({passes:false,results,error:{message:e.message,stack:e.stack}},null,2));process.exitCode=1;}finally{if(writer?.open)writer.close();if(f)await f.close();await rm(dir,{recursive:true,force:true});}
