// Fixed private server/client acceptance modes; no arbitrary SQL, shell or function IPC.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readdir} from 'node:fs/promises';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import * as storage from '../../packages/storage-sqlite/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);if(!process.send||!['server','client'].includes(mode))throw Error('Fixed resource-limit mode required');
let close=async()=>{};process.on('message',m=>{if(m.type==='close')void close().then(()=>process.exit(0));});
if(mode==='server'){
 let db,app,lock,port,published=0,discardedPublished=0;
 const objects=async()=>{const list=async path=>{try{const entries=await readdir(path,{withFileTypes:true});return(await Promise.all(entries.map(e=>e.isDirectory()?list(join(path,e.name)):[join(path,e.name)]))).flat();}catch(e){if(e.code==='ENOENT')return[];throw e;}};return list(join(directory,'artifacts'));};
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='initialize'){storage.assertDataDirReady(directory);lock=new storage.DirectoryLock(directory);lock.acquire();db=new Database(join(directory,'detuned.sqlite'));const boot=storage.bootstrapDatabase(db);port=new storage.SqliteStorage(db);const blobs=await ArtifactFileStore.create(directory),originalPublish=blobs.publish.bind(blobs),originalDiscard=blobs.discardPublished.bind(blobs);blobs.publish=async(...args)=>{await originalPublish(...args);published++;};blobs.discardPublished=async(...args)=>{await originalDiscard(...args);discardedPublished++;};app=buildApp({storage:port,artifactBlobs:blobs,writeRateLimits:{per_minute:60000,burst:10000},resourceLimits:m.limits});const url=await app.listen({host:'127.0.0.1',port:0});close=async()=>{await app.close();db.close();lock.release();};process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;}
  if(m.operation==='logical-snapshot'){const snapshot={};for(const table of ['spaces','space_revisions','threads','thread_versions','posts','post_revisions','actors','credentials','memberships','artifacts'])snapshot[table]=createHash('sha256').update(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).digest('hex');process.send({type:'result',id:m.id,result:snapshot});return;}
  if(m.operation==='inspect-closed'){const read=new Database(join(directory,'detuned.sqlite'),{readonly:true});try{const snapshot={};for(const table of ['spaces','space_revisions','threads','thread_versions','posts','post_revisions','actors','credentials','memberships','artifacts'])snapshot[table]=createHash('sha256').update(JSON.stringify(read.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).digest('hex');process.send({type:'result',id:m.id,result:snapshot});}finally{read.close();}return;}
  if(m.operation==='stats'){const counts={};for(const table of ['posts','post_revisions','events','idempotency_records','artifacts'])counts[table]=db.prepare(`SELECT count(*) n FROM ${table}`).get().n;process.send({type:'result',id:m.id,result:{counts,published,discardedPublished,pageCount:db.pragma('page_count',{simple:true}),maxPageCount:db.pragma('max_page_count',{simple:true}),pageSize:db.pragma('page_size',{simple:true}),files:await objects()}});return;}
  if(m.operation==='seed-missing'){for(let i=0;i<1025;i++)port.createArtifact({id:'art_missing_independent_'+i,space_id:m.space,owner_id:m.actor,visibility:'space',review_assignment_id:null,check_run_id:null,sha256:'0'.repeat(64),bytes:Number.MAX_SAFE_INTEGER,mime:'application/octet-stream',storage_key:'blob_missing_independent_'+i,state:'missing',created_at:new Date().toISOString()});process.send({type:'result',id:m.id,result:{rows:1025,bytesEach:Number.MAX_SAFE_INTEGER,manualFixture:true}});return;}
  if(m.operation==='arm-artifact-full'){db.exec("CREATE TEMP TRIGGER independent_full_after_publish BEFORE INSERT ON main.artifacts BEGIN INSERT INTO instance_metadata(key,value) VALUES ('independent_full_marker',zeroblob(2097152)); END");process.send({type:'result',id:m.id,result:{armed:true,scope:'test-only real allocation in existing metadata during artifact registration; schema TEMP only'}});return;}
  throw Error('Unknown fixed server operation');
 }catch(e){if(m.operation==='initialize'){try{await app?.close();db?.close();lock?.release();}catch{}}process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else{
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(m.operation==='shared-write'){const realFetch=globalThis.fetch;let calls=0;globalThis.fetch=async(...a)=>{calls++;return realFetch(...a);};try{const client=new DetunedClient({baseUrl:m.url,token:m.token,timeoutMs:5000,maxRetries:3});await client.createPost(m.space,m.thread,m.body,m.key);process.send({type:'result',id:m.id,result:{resolved:true,calls}});}catch(e){process.send({type:'result',id:m.id,result:{resolved:false,calls,code:e.code,retryable:e.retryable}});}finally{globalThis.fetch=realFetch;}return;}
  let body,headers={authorization:'Bearer '+m.token,'idempotency-key':m.key??'resource-independent-'+m.id};
  if(m.operation==='upload'){body=new FormData();body.append('file',new Blob([new Uint8Array(m.bytes).fill(65)],{type:'text/plain'}),'material.txt');}
  else if(m.operation==='request'){if(m.body!==undefined){headers['content-type']='application/json';body=JSON.stringify(m.body);}}
  else throw Error('Unknown fixed client operation');
  const response=await fetch(m.url+'/api/v1'+m.path,{method:m.method??'GET',headers,body,signal:AbortSignal.timeout(10000)});process.send({type:'result',id:m.id,status:response.status,body:await response.json()});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}
process.send({type:'ready'});
