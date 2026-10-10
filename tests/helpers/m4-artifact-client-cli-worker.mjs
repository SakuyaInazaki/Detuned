// Fixed private artifact acceptance modes; no arbitrary SQL/functions/commands IPC.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
import {SqliteStorage,bootstrapDatabase,DirectoryLock} from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);
if(!process.send||!['server','raw','client'].includes(mode))throw Error('Fixed private artifact mode required');
let close=async()=>{};process.on('message',m=>{if(m.type==='close')void close().then(()=>process.exit(0));});
if(mode==='server'){
 let db,app,lock,requests=0;
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){
   lock=new DirectoryLock(directory);lock.acquire();db=new Database(join(directory,'detuned.sqlite'));const boot=bootstrapDatabase(db);
   app=buildApp({storage:new SqliteStorage(db,{dataDir:directory}),artifactBlobs:await ArtifactFileStore.create(directory),writeRateLimits:{per_minute:60000,burst:10000}});
   app.addHook('onRequest',async()=>{requests++;});const url=await app.listen({host:'127.0.0.1',port:0});
   close=async()=>{await app.close();db.close();lock.releaseStrict();};process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;
  }
  if(m.operation==='stats'){
   const counts={};for(const table of ['artifacts','events','idempotency_records'])counts[table]=db.prepare(`SELECT count(*) n FROM ${table}`).get().n;
   process.send({type:'result',id:m.id,result:{requests,counts,objects:await readdir(join(directory,'artifacts/objects')),staging:await readdir(join(directory,'artifacts/staging'))}});return;
  }
  throw Error('Unknown fixed server operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else if(mode==='raw'){
 let server,policy='good',url,counts={metadata:0,content:0,trap:0};const active=new Set();
 const bytes=Buffer.from([0,255,1,2,195,169,0,42]);const digest=createHash('sha256').update(bytes).digest('hex');
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){
   if(!['good','wrong-hash','truncated','pending'].includes(m.policy))throw Error('Unknown fixed raw policy');policy=m.policy;
   server=http.createServer((req,res)=>{
    if(req.url==='/private-content-url-trap'){counts.trap++;res.writeHead(418);res.end();return;}
    if(req.url==='/api/v1/spaces/space_raw/artifacts/art_raw'){
     counts.metadata++;res.setHeader('content-type','application/json');res.end(JSON.stringify({api_version:'1',request_id:'raw-private-artifact',data:{id:'art_raw',space_id:'space_raw',owner_id:'act_raw',visibility:'space',sha256:policy==='wrong-hash'?'0'.repeat(64):digest,bytes:bytes.length,mime:'application/octet-stream',state:'ready',created_at:new Date().toISOString(),content_url:url+'/private-content-url-trap'}}));return;
    }
    if(req.url==='/api/v1/spaces/space_raw/artifacts/art_raw/content'){
     counts.content++;active.add(res);res.once('close',()=>{active.delete(res);process.send?.({type:'content-closed'});});res.writeHead(200,{'content-type':'application/octet-stream','content-length':String(bytes.length)});res.flushHeaders();
     if(policy==='pending'||policy==='truncated'){res.write(bytes.subarray(0,4),()=>{process.send?.({type:'content-entered'});if(policy==='truncated')res.destroy();});return;}
     res.end(bytes);return;
    }
    res.writeHead(404);res.end();
   });await new Promise(done=>server.listen(0,'127.0.0.1',done));url='http://127.0.0.1:'+server.address().port;
   close=async()=>{for(const res of active)res.destroy();server.closeAllConnections();await new Promise(done=>server.close(done));};process.send({type:'result',id:m.id,url,result:{bytes:[...bytes],sha256:digest}});return;
  }
  if(m.operation==='stats'){process.send({type:'result',id:m.id,result:{counts,active:active.size}});return;}
  throw Error('Unknown fixed raw operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else{
 let controller;const downloads=new Set();close=async()=>{controller?.abort();await Promise.allSettled(downloads);};
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='abort'){controller?.abort();process.send({type:'result',id:m.id,result:{aborted:true}});return;}
  if(m.operation!=='download')throw Error('Unknown fixed client operation');controller=new AbortController();const client=new DetunedClient({baseUrl:m.url,timeoutMs:m.timeoutMs??5000});
  const task=client.downloadArtifact('space_raw','art_raw',{signal:controller.signal});downloads.add(task);
  try{const result=await task;process.send({type:'result',id:m.id,result:{resolved:true,bytes:result.bytes.length,sha256:result.metadata.sha256}});}catch(e){process.send({type:'result',id:m.id,result:{resolved:false,name:e.name}});}finally{downloads.delete(task);}
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}
process.send({type:'ready'});
