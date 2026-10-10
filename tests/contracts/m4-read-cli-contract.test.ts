import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
import type {ClockPort,OperationsService} from '@detuned/core';
import {parsePageLimit} from '../../packages/cli/src/read-options.js';

const built = it.skipIf(process.env.DETUNED_SOURCE_ONLY === '1');
function cli(url:string,args:string[],token?:string) {
 return new Promise<{code:number|null,out:string,err:string}>((resolve,reject)=>{
  const env={...process.env};delete env.DETUNED_TOKEN;delete env.DETUNED_TOKEN_FILE;
  const child=spawn(process.execPath,['packages/cli/dist/index.js','--url',url,...token?['--token',token]:[],...args],{env});
  let out='',err='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('CLI watchdog exceeded'));},10000);
  child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);
  child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);resolve({code,out,err});});
 });
}
async function fixture() {
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;const instant=new Date();const clock={now:()=>new Date(instant),nowIso:()=>instant.toISOString()} satisfies ClockPort;const app=buildApp({storage:new SqliteStorage(db),clock}) as ReturnType<typeof buildApp> & {operationsService:OperationsService};let requests=0;app.addHook('onRequest',async()=>{requests++;});
 await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw new Error('missing address');const url=`http://127.0.0.1:${address.port}`;const client=new DetunedClient({baseUrl:url,token});
 const space=(await client.createSpace({slug:'cli-reading',objective:'read',rules:[]},'space')).data.space.id;
 const thread=(await client.createThread(space,{title:'Unicode 研究🙂'},'thread')).data.thread.id;
 const posts:string[]=[];for(let i=0;i<2;i++)posts.push((await client.createPost(space,thread,{kind:'note',title:'needle research '+i,summary:'needle summary',body:'needle 正文🙂',tags:['read'],structured:{}},'post'+i)).data.post.id);
 return {app,db,token,url,client,space,thread,posts,requests:()=>requests,close:async()=>{await app.close();db.close();}};
}
it('RD B01: page limit rejects nonintegers/out of range without echo and accepts bounded integers',()=>{
 for(const value of ['0','101','NaN','1.5','20tail','private-token-text','9007199254740992'])expect(()=>parsePageLimit(value)).toThrow('limit 必须为1–100的整数。');
 expect(parsePageLimit('1')).toBe(1);expect(parsePageLimit('100')).toBe(100);
});
built('RD B02: real CLI read groups preserve pages and existing subcommands use shared HTTP',async()=>{
 const f=await fixture();try{
  const calls:[string[],unknown][]=[[['me'],(await f.client.getMe()).data],[['capabilities'],(await f.client.getCapabilities()).data],[['space','list','--limit','1'],await f.client.listSpaces(1)],[['thread','list',f.space,'--state','open','--limit','1'],await f.client.listThreads(f.space,'open',1)],[['post','revisions',f.space,f.posts[0]!, '--limit','1'],await f.client.listPostRevisions(f.space,f.posts[0]!,1)],[['view',f.space,'findings'],(await f.client.getView(f.space,'findings')).data]];
  for(const [args,expected] of calls){const result=await cli(f.url,args,f.token);expect(result.code).toBe(0);expect(JSON.parse(result.out)).toEqual(expected);}
  const old=await cli(f.url,['thread','posts',f.space,f.thread,'--limit','1'],f.token);expect(old.code).toBe(0);expect(JSON.parse(old.out).meta).toHaveProperty('next_cursor');
 }finally{await f.close();}
},60000);
built('RD B03: search legacy data and explicit page/cursor/thread match HTTP and local invalid options send no request',async()=>{
 const f=await fixture();try{
  const args=['search','--space',f.space,'--query','needle','--limit','1','--thread',f.thread,'--tags','read'];const expected=await f.client.search(f.space,{q:'needle',limit:1,thread_id:f.thread,tags:['read']});
  expect(JSON.parse((await cli(f.url,args,f.token)).out)).toEqual(expected.data);
  const page=JSON.parse((await cli(f.url,[...args,'--page'],f.token)).out);expect(page).toEqual(expected);expect(page.meta.next_cursor).toBeTruthy();
  const next=await cli(f.url,[...args,'--cursor',page.meta.next_cursor],f.token);expect(next.code).toBe(0);expect(JSON.parse(next.out)).toEqual(await f.client.search(f.space,{q:'needle',limit:1,thread_id:f.thread,tags:['read'],cursor:page.meta.next_cursor}));
  for(const bad of [['search','--space',f.space,'--query','needle','--limit','private-token-text'],['space','list','--limit','20tail'],['thread','list',f.space,'--state','private-token-text'],['post','revisions',f.space,f.posts[0]!,'--limit','101'],['view',f.space,'private-token-text']]){const before=f.requests();const result=await cli(f.url,bad,f.token);expect(result.code).toBe(2);expect(result.err+result.out).not.toContain('private-token-text');expect(f.requests()).toBe(before);}
 }finally{await f.close();}
},90000);
built('RD B04: anonymous CLI health, authenticated diagnostics and fixed readiness/identity error exits',async()=>{
 const f=await fixture();try{
  for(const name of ['live','ready']){const result=await cli(f.url,['health',name]);expect(result.code).toBe(0);expect(JSON.parse(result.out)).toEqual({status:name==='live'?'alive':'ready'});}
  const diagnostics=await cli(f.url,['diagnostics'],f.token);expect(diagnostics.code).toBe(0);expect(JSON.parse(diagnostics.out).database.allocated_bytes).toMatch(/^\d+$/);
  const actor=(await f.client.request<any>({method:'POST',path:'/admin/actors',body:{kind:'human',display_name:'ordinary reader'}})).data;
  const credential=(await f.client.request<any>({method:'POST',path:'/admin/credentials',body:{actor_id:actor.id}})).data;
  const forbidden=await cli(f.url,['--json','diagnostics'],credential.token);expect(forbidden.code).toBe(3);expect(JSON.parse(forbidden.out).error.code).toBe('FORBIDDEN');expect(forbidden.out).not.toContain('allocated_bytes');
  const unauth=await cli(f.url,['--json','me']);expect(unauth.code).toBe(3);expect(JSON.parse(unauth.out).error.code).toBe('UNAUTHENTICATED');
  f.app.operationsService.beginDraining();const ready=await cli(f.url,['--json','health','ready']);expect(ready.code).toBe(1);expect(JSON.parse(ready.out).error.code).toBe('SERVICE_NOT_READY');
 }finally{await f.close();}
},60000);
