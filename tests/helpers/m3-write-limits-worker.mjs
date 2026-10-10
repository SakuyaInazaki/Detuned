// Fixed private IPC modes for local write-limit acceptance; no arbitrary command/function or SQL execution surface.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import * as storage from '../../packages/storage-sqlite/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);if(!process.send||!['server','client'].includes(mode))throw Error('Fixed private write-limit worker only');
let close=async()=>{};process.on('message',m=>{if(m.type==='close')void close().then(()=>process.exit(0));});
if(mode==='server'){
 let now=Date.now(),db,app,lock;const clock={now:()=>new Date(now),nowIso:()=>new Date(now).toISOString()};
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){storage.assertDataDirReady(directory);lock=new storage.DirectoryLock(directory);lock.acquire();db=new Database(join(directory,'detuned.sqlite'));const boot=storage.bootstrapDatabase(db);app=buildApp({storage:new storage.SqliteStorage(db),artifactBlobs:await ArtifactFileStore.create(directory),clock,...m.limits?{writeRateLimits:m.limits}:{}});const url=await app.listen({host:'127.0.0.1',port:0});close=async()=>{await app.close();db.close();lock.release();};process.send({type:'result',id:m.id,url,result:boot});return;}
  if(m.operation==='advance'){if(!Number.isSafeInteger(m.delta))throw Error('Fixed integer clock delta required');now+=m.delta;process.send({type:'result',id:m.id,result:{now}});return;}
  if(m.operation==='stats'){const counts={};for(const table of ['posts','post_revisions','events','idempotency_records','sessions','subscriptions','consumers','actors'])counts[table]=db.prepare(`SELECT count(*) n FROM ${table}`).get().n;process.send({type:'result',id:m.id,result:counts});return;}
  throw Error('Unknown fixed server operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else{
 const releases=new Map();process.on('message',m=>{if(m.type==='release')releases.get(m.id)?.();});
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='shared-write'){
   const realFetch=globalThis.fetch,keys=[],statuses=[];globalThis.fetch=async(...args)=>{const response=await realFetch(...args);keys.push(new Headers(args[1]?.headers).get('idempotency-key'));statuses.push(response.status);if(response.status===429&&m.barrier){await new Promise(done=>{releases.set(m.id,done);process.send({type:'rate-blocked',id:m.id,retryAfter:response.headers.get('retry-after')});});releases.delete(m.id);}return response;};
   try{const client=new DetunedClient({baseUrl:m.url,token:m.token,timeoutMs:5000,maxRetries:2,maxRetryAfterMs:m.maxRetryAfterMs??3000});const result=await client.createPost(m.space,m.thread,m.body,m.key);process.send({type:'result',id:m.id,result,keys,statuses});}catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code,statusCode:e.statusCode,keys,statuses});}finally{globalThis.fetch=realFetch;}return;
  }
  if(m.operation!=='request')throw Error('Unknown fixed client operation');const response=await fetch(m.url+'/api/v1'+m.path,{method:m.method??'GET',headers:{authorization:'Bearer '+m.token,...m.body===undefined?{}:{'content-type':'application/json'},'idempotency-key':m.key??'limits-independent-'+m.id},...m.body===undefined?{}:{body:JSON.stringify(m.body)},signal:AbortSignal.timeout(10000)});process.send({type:'result',id:m.id,status:response.status,retryAfter:response.headers.get('retry-after'),body:await response.json()});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}
process.send({type:'ready',pid:process.pid});
