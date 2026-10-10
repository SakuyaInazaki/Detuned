// Fixed private modes, with explicit test-only barriers; no arbitrary SQL/functions/shell IPC.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {readFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {Writable} from 'node:stream';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import * as storage from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);if(!process.send||!['server','client','writer'].includes(mode))throw Error('Fixed operations worker mode');
let close=async()=>{};process.on('message',m=>{if(m.type==='close')void close().then(()=>process.exit(0));});
if(mode==='server'){
 let db,reader,app,lock,throwSink=false,sinkAttempts=0;const logs=[];
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
 if(m.operation==='initialize'){storage.assertDataDirReady(directory);lock=new storage.DirectoryLock(directory);lock.acquire();db=new Database(join(directory,'detuned.sqlite'));const boot=storage.bootstrapDatabase(db);app=buildApp({storage:new storage.SqliteStorage(db,{dataDir:directory}),artifactBlobs:await ArtifactFileStore.create(directory),writeRateLimits:{per_minute:60000,burst:10000},requestLogSink:entry=>{sinkAttempts++;if(throwSink)throw Error('PRIVATE_SINK_FAILURE_MARKER');logs.push(entry);if(entry.outcome==='aborted')process.send({type:'terminal-aborted',requestId:entry.request_id});}});app.addHook('onRequest',(req,_reply,done)=>{if(req.headers['x-private-barrier']==='partial')process.send({type:'partial-seen',requestId:req.id});done();});const url=await app.listen({host:'127.0.0.1',port:0});close=async()=>{reader?.close();await app.close();db.close();lock.release();};process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;}
 if(m.operation==='logs'){await new Promise(done=>setImmediate(done));process.send({type:'result',id:m.id,result:{logs,sinkAttempts}});return;}
 if(m.operation==='sink-throw'){throwSink=true;process.send({type:'result',id:m.id,result:{enabled:true}});return;}
 if(m.operation==='directory-hide'){await rename(directory,directory+'.unavailable');process.send({type:'result',id:m.id,result:{hidden:true}});return;}
 if(m.operation==='directory-restore'){await rename(directory+'.unavailable',directory);process.send({type:'result',id:m.id,result:{restored:true}});return;}
 if(m.operation==='schema-bad'){db.prepare('UPDATE schema_migrations SET version=999 WHERE version=2').run();process.send({type:'result',id:m.id,result:{changed:true}});return;}
 if(m.operation==='schema-restore'){db.prepare('UPDATE schema_migrations SET version=2 WHERE version=999').run();process.send({type:'result',id:m.id,result:{restored:true}});return;}
 if(m.operation==='reader-hold'){reader=new Database(join(directory,'detuned.sqlite'),{readonly:true});reader.exec('BEGIN');reader.prepare('SELECT id FROM spaces LIMIT 1').get();process.send({type:'result',id:m.id,result:{held:true}});return;}
 if(m.operation==='wal-snapshot'){const frames=db.pragma('main.wal_checkpoint(NOOP)')[0],bytes=await readFile(join(directory,'detuned.sqlite-wal'));process.send({type:'result',id:m.id,result:{frames,walBytes:bytes.length,walHash:createHash('sha256').update(bytes).digest('hex')}});return;}
 if(m.operation==='post-count'){process.send({type:'result',id:m.id,result:{posts:db.prepare('SELECT count(*) n FROM posts').get().n}});return;}
 throw Error('Unknown fixed server operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else if(mode==='client'){
 let partial;
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
 if(m.operation==='abort-partial'){partial.destroy();process.send({type:'result',id:m.id,result:{aborted:true}});return;}
 if(m.operation==='start-partial'){partial=http.request(m.url+'/api/v1/spaces',{method:'POST',headers:{authorization:'Bearer '+m.token,'content-type':'application/json','content-length':'4096','x-private-barrier':'partial'}});partial.on('error',()=>{});partial.write('{');process.send({type:'result',id:m.id,result:{started:true}});return;}
 if(m.operation!=='request')throw Error('Unknown fixed client operation');const response=await fetch(m.url+'/api/v1'+m.path,{method:m.method??'GET',headers:{...m.token?{authorization:'Bearer '+m.token}:{},...m.body===undefined?{}:{'content-type':'application/json'},'idempotency-key':'operations-independent-'+m.id,...m.headers},...m.body===undefined?{}:{body:JSON.stringify(m.body)},signal:AbortSignal.timeout(10000)});process.send({type:'result',id:m.id,status:response.status,body:await response.json()});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});close=async()=>{partial?.destroy();};
}else{
 process.on('message',m=>{if(m.type!=='run'||m.operation!=='slow-writer')return;void(async()=>{try{
 const {createRequestLogWriter}=await import('../../packages/cli/dist/request-log-writer.js');const chunks=[],callbacks=[];const stream=new Writable({highWaterMark:1,write(chunk,_encoding,done){chunks.push(chunk.toString());callbacks.push(done);}}),before=['drain','error','close'].map(k=>stream.listenerCount(k));const writer=createRequestLogWriter(stream);for(let i=0;i<1000;i++)writer.write({event:'request_completed',sequence:i,filler:'x'.repeat(800)});const peak={bytes:writer.pendingBytes,entries:writer.pendingEntries};for(let i=0;i<1000&&(callbacks.length||writer.pendingEntries);i++){callbacks.shift()?.();await new Promise(done=>setImmediate(done));}const pending={bytes:writer.pendingBytes,entries:writer.pendingEntries};stream.emit('error',Error('PRIVATE_WRITER_FAILURE'));writer.close();process.send({type:'result',id:m.id,result:{peak,pending,before,after:['drain','error','close'].map(k=>stream.listenerCount(k)),destroyed:stream.destroyed,summaries:chunks.map(c=>JSON.parse(c)).filter(c=>c.event==='request_log_dropped')}});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}
process.send({type:'ready'});
