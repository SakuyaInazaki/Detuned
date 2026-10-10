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
 let db,app,lock,requests=0,faultObserved=null;
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){lock=new DirectoryLock(dir);lock.acquire();db=new Database(join(dir,'detuned.sqlite'));const boot=bootstrapDatabase(db);app=buildApp({storage:new SqliteStorage(db,{dataDir:dir}),artifactBlobs:await ArtifactFileStore.create(dir),writeRateLimits:{per_minute:60000,burst:10000}});app.addHook('onRequest',async()=>{requests++;});const original=app.eventService.pollWithWait.bind(app.eventService);app.eventService.pollWithWait=(auth,space,consumer,body,opts)=>{const task=original(auth,space,consumer,body,opts);if(body.wait_ms>0){process.send({type:'poll-wait-entered',consumer,wait_ms:body.wait_ms});task.then(()=>process.send({type:'poll-settled',consumer}),()=>process.send({type:'poll-settled',consumer}));}return task;};const url=await app.listen({host:'127.0.0.1',port:0});close=async()=>{db.exec('DROP TRIGGER IF EXISTS temp.private_consumer_fault');await app.close();db.close();lock.releaseStrict();};process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;}
  if(m.operation==='stats'){const counts={};for(const table of ['sessions','subscriptions','consumers','delivery_batches','events','posts','idempotency_records'])counts[table]=db.prepare(`SELECT count(*) n FROM ${table}`).get().n;const consumers=db.prepare('SELECT id,subscription_id,consumer_key,ack_seq,active_batch_id,acl_epoch FROM consumers ORDER BY id').all(),batches=db.prepare('SELECT id,consumer_id,from_seq,through_seq,event_ids,acked_at FROM delivery_batches ORDER BY id').all(),events=db.prepare('SELECT id,space_id,seq FROM events ORDER BY seq').all(),posts=db.prepare('SELECT id,current_revision,lifecycle FROM posts ORDER BY id').all();process.send({type:'result',id:m.id,result:{requests,counts,consumers,batches,events,posts,faultObserved,activeResources:app.runtimeResources.activeCount}});return;}
  if(m.operation==='fault-install'){if(!/^csr_[0-9a-f-]{36}$/.test(m.consumer))throw Error('Fixed fixture consumer required');faultObserved=null;db.function('private_consumer_observe',count=>{faultObserved=count;return 0;});db.exec(`CREATE TEMP TRIGGER private_consumer_fault BEFORE DELETE ON consumers WHEN OLD.id = '${m.consumer}' BEGIN SELECT private_consumer_observe((SELECT count(*) FROM delivery_batches WHERE consumer_id=OLD.id)); SELECT RAISE(ABORT,'private-consumer-parent-delete'); END`);process.send({type:'result',id:m.id,result:{installed:true}});return;}
  if(m.operation==='fault-remove'){db.exec('DROP TRIGGER IF EXISTS temp.private_consumer_fault');process.send({type:'result',id:m.id,result:{removed:true}});return;}
  throw Error('Unknown fixed server operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else if(mode==='proxy'){
 let server,requests=0,committed=0;const sockets=new Set();
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){if(m.policy!=='drop-after-commit')throw Error('Fixed policy required');const target=new URL(m.url);if(target.hostname!=='127.0.0.1')throw Error('Private loopback required');server=http.createServer((req,res)=>{requests++;
   const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers:req.headers},answer=>{answer.resume();answer.once('end',()=>{if(answer.statusCode>=200&&answer.statusCode<300)committed++;process.send({type:'committed',status:answer.statusCode});res.destroy();});});upstream.on('error',()=>res.destroy());req.pipe(upstream);
  });server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(done=>server.listen(0,'127.0.0.1',done));close=async()=>{for(const s of sockets)s.destroy();await new Promise(done=>server.close(done));};process.send({type:'result',id:m.id,url:'http://127.0.0.1:'+server.address().port,result:{}});return;}
  if(m.operation==='stats'){process.send({type:'result',id:m.id,result:{requests,committed}});return;}throw Error('Unknown fixed proxy operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else{
 let controller;const tasks=new Set();close=async()=>{controller?.abort();await Promise.allSettled(tasks);};
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{if(m.operation==='abort'){controller?.abort();process.send({type:'result',id:m.id,result:{aborted:true}});return;}const client=new DetunedClient({baseUrl:m.url,token:m.token,timeoutMs:10000});let task;if(m.operation==='session')task=client.createSession(m.space,{client_name:'private independent',client_version:'1'});else if(m.operation==='poll'){controller=new AbortController();task=client.poll(m.space,m.consumer,{limit:1,wait_ms:5000},{signal:controller.signal});}else throw Error('Unknown fixed client operation');tasks.add(task);try{await task;process.send({type:'result',id:m.id,result:{resolved:true}});}catch(e){process.send({type:'result',id:m.id,result:{resolved:false,name:e.name,code:e.code}});}finally{tasks.delete(task);}}catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}
process.send({type:'ready'});
