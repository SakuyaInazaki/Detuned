import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
async function fixture(run:(f:any)=>Promise<void>){
 const dir=await mkdtemp(path.join(tmpdir(),'detuned-write-probe-')),db=new Database(':memory:'),admin=bootstrapDatabase(db).adminToken!,app=buildApp({storage:new SqliteStorage(db)});
 let requests=0,delayReadback=false;app.addHook('onRequest',async req=>{requests++;if(delayReadback&&req.method==='GET'&&req.url.includes('/posts/')){delayReadback=false;await new Promise(resolve=>setTimeout(resolve,1500));}});
 try{const url=await app.listen({host:'127.0.0.1',port:0}),client=new DetunedClient({baseUrl:url,token:admin,maxRetries:0});
 const space=(await client.createSpace({slug:'probe',objective:'Owned explicit write',rules:[]},'space')).data.space.id;
 const thread=(await client.createThread(space,{title:'Owned probe'},'thread')).data.thread.id;
 const actor=await client.createActor({kind:'agent',display_name:'ordinary'});await client.createMembership(space,{actor_id:actor.id,role:'contributor'});
 const credential=await client.createCredential({actor_id:actor.id,allowed_space_ids:[space],capabilities:['read','write']});
 const ordinary=path.join(dir,'ordinary.token'),adminFile=path.join(dir,'admin.token');await writeFile(ordinary,credential.token,{mode:0o600});await writeFile(adminFile,admin,{mode:0o600});
 const execute=(extra:string[],token=ordinary)=>new Promise<any>((resolve,reject)=>{const env={PATH:process.env.PATH??'/usr/bin:/bin',HOME:dir,TMPDIR:dir};const child=spawn(process.execPath,['scripts/mcp-probe.mjs','--url',url,'--token-file',token,...extra],{env,stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Owned probe timeout'));},15000);child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.once('error',reject);child.once('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,out,err});});});
 await run({dir,db,url,space,thread,ordinary,adminFile,execute,delayNextReadback:()=>{delayReadback=true;},requests:()=>requests});
 }finally{await app.close();db.close();await rm(dir,{recursive:true,force:true});}
}
it('M7.16 explicit bridge write and fixed readback replay one retained note in both modes',async()=>fixture(async f=>{
 for(const mode of ['flat','wrapped']){const args=['--input-mode',mode,'--write-space',f.space,'--write-thread',f.thread,'--request-key','owned-'+mode];let post='';for(let n=0;n<2;n++){const r=await f.execute(args);expect(r.code,r.err).toBe(0);const result=JSON.parse(r.out);expect(result).toMatchObject({ok:true,bridge_exit:{code:0,signal:null},bridge_requested_signals:[],write:{retained:true,readback_valid:true,post_ref:{revision:1}}});if(post)expect(result.write.post_ref.post_id).toBe(post);post=result.write.post_ref.post_id;}}
 expect(f.db.prepare('SELECT count(*) n FROM posts').get()).toEqual({n:2});expect(f.db.prepare('SELECT count(*) n FROM post_revisions').get()).toEqual({n:2});
}),30000);
it('M7.16 write opt-in rejects incomplete options before HTTP and admin or wrong-space identity before writes',async()=>fixture(async f=>{
 const before=f.requests();for(const args of [['--write-space',f.space],['--write-thread',f.thread,'--request-key','key'],['--write-space',f.space,'--write-thread',f.thread,'--request-key',' ']]){const r=await f.execute(args);expect(r.code).toBe(1);expect(r.out).toBe('');}expect(f.requests()).toBe(before);
 for(const [space,token] of [[f.space,f.adminFile],['unallowed-space',f.ordinary]]){const r=await f.execute(['--write-space',space,'--write-thread',f.thread,'--request-key','key'],token);expect(r.code).toBe(1);expect(r.out).toBe('');expect(r.err).not.toContain(token);}
 expect(f.db.prepare('SELECT count(*) n FROM posts').get()).toEqual({n:0});
}),30000);

it('M7.16 a timed-out fixed readback retains the committed note and same-key retry recovers it',async()=>fixture(async f=>{
 const args=['--write-space',f.space,'--write-thread',f.thread,'--request-key','unknown-result'];f.delayNextReadback();
 const interrupted=await f.execute([...args,'--timeout-ms','1000']);expect(interrupted.code).toBe(1);expect(interrupted.out).toBe('');expect(interrupted.err).toContain('Retain the original write key');
 expect(f.db.prepare('SELECT count(*) n FROM posts').get()).toEqual({n:1});const id=f.db.prepare('SELECT id FROM posts').get().id;
 const recovered=await f.execute(args);expect(recovered.code,recovered.err).toBe(0);expect(JSON.parse(recovered.out).write).toMatchObject({post_ref:{post_id:id,revision:1},retained:true,readback_valid:true});
 expect(f.db.prepare('SELECT count(*) n FROM posts').get()).toEqual({n:1});expect(f.db.prepare('SELECT count(*) n FROM post_revisions').get()).toEqual({n:1});
}),20000);
