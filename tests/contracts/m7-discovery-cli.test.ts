import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
function cli(url:string,token:string,args:string[]){return new Promise<{code:number|null,out:string}>((resolve,reject)=>{const env={...process.env};delete env.DETUNED_TOKEN;delete env.DETUNED_TOKEN_FILE;const child=spawn(process.execPath,['packages/cli/dist/index.js','--json','--url',url,'--token',token,...args],{env,stdio:['ignore','pipe','pipe']});let out='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('discovery CLI timeout'));},10000);child.stdout.setEncoding('utf8');child.stdout.on('data',x=>out+=x);child.stderr.resume();child.on('error',reject);child.on('close',code=>{clearTimeout(timer);resolve({code,out});});});}
it('M7.10-B relation and fixed post relation CLI reuse guarded HTTP reads',async()=>{
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;const app=buildApp({storage:new SqliteStorage(db)});await app.listen({host:'127.0.0.1',port:0});const url=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;const client=new DetunedClient({baseUrl:url,token,maxRetries:0});
 try{const space=(await client.createSpace({slug:'discovery-cli',objective:'reads',rules:[]},'space')).data.space.id;const thread=(await client.createThread(space,{title:'relations'},'thread')).data.thread.id;const target=(await client.createPost(space,thread,{kind:'note',title:'target',summary:'target',body:'target'},'target')).data.post.id;const created=(await client.createPost(space,thread,{kind:'note',title:'source',summary:'source',body:'source',refs:[{type:'cites',target_ref:{post_id:target,revision:1}}]},'source')).data;const id=created.relations[0].id;
 const one=await cli(url,token,['relation','read',space,id]);expect(one.code).toBe(0);expect(JSON.parse(one.out)).toEqual(await client.getRelation(space,id));
 const page=await cli(url,token,['post','relations',space,target,'--revision','1','--direction','in','--limit','1','--max-bytes','4096']);expect(page.code).toBe(0);expect(JSON.parse(page.out).data).toEqual((await client.getPostRelations(space,target,1,{direction:'in',limit:1,max_bytes:4096})).data);
 }finally{await app.close();db.close();}
});
it('M7.10-B consumer lookup CLI reads exact key/filter identity and never recreates deleted consumer',async()=>{
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;const app=buildApp({storage:new SqliteStorage(db)});await app.listen({host:'127.0.0.1',port:0});const url=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;const client=new DetunedClient({baseUrl:url,token,maxRetries:0});
 try{const space=(await client.createSpace({slug:'lookup-cli',objective:'reads',rules:[]},'space')).data.space.id;const subscription=(await client.subscribe(space,{consumer_key:'reader',start:'beginning'})).data;const before=db.prepare('SELECT * FROM consumers').all();const result=await cli(url,token,['consumer','lookup',space,'--consumer-key','reader']);expect(result.code).toBe(0);expect(JSON.parse(result.out).consumer.id).toBe(subscription.consumer.id);expect(db.prepare('SELECT * FROM consumers').all()).toEqual(before);await client.deactivateConsumer(space,subscription.consumer.id);const missing=await cli(url,token,['consumer','lookup',space,'--consumer-key','reader']);expect(missing.code).not.toBe(0);expect(JSON.parse(missing.out).error.code).toBe('NOT_FOUND');expect(db.prepare('SELECT * FROM consumers').all()).toEqual([]);
 }finally{await app.close();db.close();}
});
