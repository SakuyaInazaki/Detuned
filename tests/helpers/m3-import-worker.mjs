// Fixed private IPC modes for independent logical-import acceptance; no arbitrary commands/functions.
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
import {chmodSync} from 'node:fs';
import {open} from 'node:fs/promises';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import * as storage from '../../packages/storage-sqlite/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);
if(!process.send||!['server','client','import-worker'].includes(mode))throw Error('Fixed private IPC logical import only');
let cleanup=async()=>{};process.on('message',m=>{if(m.type==='close')void cleanup().then(()=>process.exit(0));});
if(mode==='server'){
 storage.assertDataDirReady(directory);const lock=new storage.DirectoryLock(directory);lock.acquire();storage.assertDataDirReady(directory);const db=new Database(join(directory,'detuned.sqlite'),{fileMustExist:true});storage.openAndCoordinateDatabase(db,'serve');const s=new storage.SqliteStorage(db),blobs=await ArtifactFileStore.create(directory),app=buildApp({storage:s,artifactBlobs:blobs});let downloads=0;app.addHook('onRequest',async req=>{if(req.url.split('?')[0].endsWith('/content'))downloads++;});process.on('message',m=>{if(m.type==='download-stats')process.send({type:'result',id:m.id,downloads});});const url=await app.listen({host:'127.0.0.1',port:0});cleanup=async()=>{await app.close();db.close();lock.release();};process.send({type:'ready',pid:process.pid,url});
}else{
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(mode==='import-worker'){
   const allowed=['input-opened','record','validation','import-transaction','reservation','destination-created','publication','file-sync','directory-sync','readiness','readiness-unlinked','readiness-gate-restoring'];if(m.faultStage&&!allowed.includes(m.faultStage)||m.cancelStage&&!allowed.includes(m.cancelStage))throw Error('Invalid fixed stage');const controller=new AbortController(),counts={};const hooks={atStage:stage=>{counts[stage]=(counts[stage]??0)+1;if(m.doubleFault&&stage==='readiness-unlinked'){chmodSync(dirname(m.dataDir),0o500);throw Error('Injected final parent sync failure');}if(stage===m.cancelStage)controller.abort();if(stage===m.faultStage&&counts[stage]===(m.faultAfter??1))throw Error('Injected '+stage);}};try{const result=await storage.importSpace({inputPath:m.inputPath,dataDir:m.dataDir,adminName:'Independent recovery administrator',timeoutMs:15000,signal:controller.signal,hooks});process.send({type:'result',id:m.id,result,counts});}catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code,message:e.message,counts});}finally{if(m.doubleFault)chmodSync(dirname(m.dataDir),0o700);}return;
  }
  if(m.operation==='export'){const file=await open(m.inputPath,'wx',0o600);try{const client=new DetunedClient({baseUrl:m.url,token:m.token,timeoutMs:15000});const result=await client.exportSpace(m.space,{sink:line=>file.writeFile(line),timeoutMs:15000});await file.sync();process.send({type:'result',id:m.id,result});}finally{await file.close();}return;}
  if(m.operation==='upload'){const form=new FormData();form.append('file',new Blob([m.bytes],{type:'text/plain'}),'evidence.txt');const response=await fetch(m.url+'/api/v1/spaces/'+encodeURIComponent(m.space)+'/artifacts',{method:'POST',headers:{authorization:'Bearer '+m.token,'idempotency-key':'independent-import-upload-'+m.id},body:form,signal:AbortSignal.timeout(15000)});process.send({type:'result',id:m.id,status:response.status,body:await response.json()});return;}
  if(m.operation!=='request')throw Error('Invalid fixed client operation');const response=await fetch(m.url+'/api/v1'+m.path,{method:m.method??'GET',headers:{authorization:'Bearer '+m.token,...m.body===undefined?{}:{'content-type':'application/json'},'idempotency-key':'independent-import-'+m.id},...(m.body===undefined?{}:{body:JSON.stringify(m.body)}),signal:AbortSignal.timeout(15000)});process.send({type:'result',id:m.id,status:response.status,body:await response.json()});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});process.send({type:'ready',pid:process.pid});
}
