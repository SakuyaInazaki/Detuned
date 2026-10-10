// Fixed private management acceptance modes; IPC never evaluates SQL/functions/commands.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import http from 'node:http';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
import {SqliteStorage,bootstrapDatabase,DirectoryLock} from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,dir]=process.argv.slice(2);if(!process.send||!['server','proxy','client'].includes(mode))throw Error('Fixed private management mode required');
let close=async()=>{};process.on('message',m=>{if(m.type==='close')void close().then(()=>process.exit(0));});
if(mode==='server'){
 let db,app,lock,requests=0;const logs=[];
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){lock=new DirectoryLock(dir);lock.acquire();db=new Database(join(dir,'detuned.sqlite'));const boot=bootstrapDatabase(db);app=buildApp({storage:new SqliteStorage(db,{dataDir:dir}),artifactBlobs:await ArtifactFileStore.create(dir),writeRateLimits:{per_minute:60000,burst:10000},requestLogSink:entry=>logs.push(entry)});app.addHook('onRequest',async()=>{requests++;});const url=await app.listen({host:'127.0.0.1',port:0});close=async()=>{await app.close();db.close();lock.releaseStrict();};process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;}
  if(m.operation==='stats'){const counts={};for(const table of ['actors','credentials','memberships','posts','artifacts','events','idempotency_records','redactions'])counts[table]=db.prepare(`SELECT count(*) n FROM ${table}`).get().n;const memberships=db.prepare('SELECT space_id,actor_id,role,active FROM memberships ORDER BY space_id,actor_id').all();const revoked=db.prepare('SELECT count(*) n FROM credentials WHERE revoked_at IS NOT NULL').get().n;process.send({type:'result',id:m.id,result:{requests,counts,memberships,revoked}});return;}
  if(m.operation==='log-check'){const text=JSON.stringify(logs);process.send({type:'result',id:m.id,result:{entries:logs.length,hasSecret:m.secrets.some(x=>text.includes(x)),hasTokenHash:text.includes('token_hash')}});return;}
  throw Error('Unknown fixed server operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else if(mode==='proxy'){
 let server,requests=0,committed=0;const sockets=new Set();
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){if(!['drop-after-commit','retryable'].includes(m.policy))throw Error('Fixed policy required');const target=new URL(m.url);if(target.hostname!=='127.0.0.1')throw Error('Private loopback required');server=http.createServer((req,res)=>{requests++;
   if(m.policy==='retryable'){req.resume();res.writeHead(503,{'content-type':'application/json','retry-after':'0'});res.end(JSON.stringify({api_version:'1',request_id:'private-retryable',error:{code:'TEMPORARILY_UNAVAILABLE',message:'private unavailable',retryable:true}}));return;}
   const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers:req.headers},answer=>{answer.resume();answer.once('end',()=>{if(answer.statusCode>=200&&answer.statusCode<300)committed++;process.send({type:'committed',status:answer.statusCode});res.destroy();});});upstream.on('error',()=>res.destroy());req.pipe(upstream);
  });server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(done=>server.listen(0,'127.0.0.1',done));close=async()=>{for(const s of sockets)s.destroy();await new Promise(done=>server.close(done));};process.send({type:'result',id:m.id,url:'http://127.0.0.1:'+server.address().port,result:{}});return;}
  if(m.operation==='stats'){process.send({type:'result',id:m.id,result:{requests,committed}});return;}throw Error('Unknown fixed proxy operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else{
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{const client=new DetunedClient({baseUrl:m.url,token:m.token,timeoutMs:5000});if(m.operation==='actor')await client.createActor({kind:'agent',display_name:'committed actor'});else if(m.operation==='credential')await client.createCredential({actor_id:m.actor,allowed_space_ids:[m.space],capabilities:['read','write']});else throw Error('Unknown fixed client operation');process.send({type:'result',id:m.id,result:{resolved:true}});}catch(e){process.send({type:'result',id:m.id,result:{resolved:false,name:e.name,code:e.code}});}})();});
}
process.send({type:'ready'});
