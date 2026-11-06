import {expect,it} from 'vitest';
import {mkdtemp,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
import {FileRequestKeyStore} from '@detuned/client/node';
it('M7.9-A private key directory explains actual owner/0700 constraints without path',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'M79_PRIVATE_PATH_'));
 try{await chmod(directory,0o755);const error=await FileRequestKeyStore.create(directory).catch(error=>error);expect(error.code).toBe('STORE_ERROR');expect(error.message).toContain('0700');expect(error.message).not.toContain(directory);}finally{await rm(directory,{recursive:true,force:true});}
});
it('M7.9-A future expected revision is a neutral mismatch and preserves conflict metadata',async()=>{
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;const app=buildApp({storage:new SqliteStorage(db)});
 try{const url=await app.listen({host:'127.0.0.1',port:0});const c=new DetunedClient({baseUrl:url,token,maxRetries:0});const sid=(await c.createSpace({slug:'message-test',objective:'test',rules:[]},'s')).data.space.id;const tid=(await c.createThread(sid,{title:'t'},'t')).data.thread.id;const post=(await c.createPost(sid,tid,{kind:'note',title:'n',summary:'s',body:'b'},'p')).data.post;
 const error=await c.createPostRevision(sid,post.id,{expected_revision:2,title:'n',summary:'s',body:'changed'},'bad').catch(error=>error);
 expect(error).toMatchObject({code:'REVISION_CONFLICT',statusCode:409,details:{current_revision:1}});expect(error.message).not.toContain('已有新修订');expect(error.message).toContain('不一致');expect((await c.getPost(sid,post.id)).data.revision.revision).toBe(1);
 }finally{await app.close();db.close();}
});
