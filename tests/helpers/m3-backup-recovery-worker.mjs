// Fixed local acceptance modes; credentials and responses use private IPC only.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import * as storage from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);
if(!process.send||!['server','client','management-worker'].includes(mode))throw Error('Fixed private IPC acceptance worker only');
let cleanup=async()=>{};process.on('message',m=>{if(m.type==='close')void cleanup().then(()=>process.exit(0));});
if(mode==='server'){
 storage.assertDataDirReady(directory);const lock=new storage.DirectoryLock(directory);lock.acquire();storage.assertDataDirReady(directory);
 const db=new Database(join(directory,'detuned.sqlite'),{fileMustExist:true});storage.openAndCoordinateDatabase(db,'serve');const s=new storage.SqliteStorage(db),blobs=await ArtifactFileStore.create(directory);const app=buildApp({storage:s,artifactBlobs:blobs});const url=await app.listen({host:'127.0.0.1',port:0});cleanup=async()=>{await app.close();db.close();lock.release();};process.send({type:'ready',pid:process.pid,url});
}else{
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(mode==='management-worker'){
   const fn=m.operation==='backup'?storage.backupOffline:m.operation==='restore'?storage.restoreBackup:undefined;if(!fn)throw Error('Invalid fixed operation');
   const stages=[];const allowed=['checkpoint','copy','file-sync','manifest','recovery-transaction','reservation','destination-created','publication','directory-sync','readiness'];if(m.faultStage&&!allowed.includes(m.faultStage))throw Error('Invalid fixed fault stage');let count=0;const hooks={atStage:stage=>{stages.push(stage);if(stage===m.faultStage&&++count===(m.faultAfter??1))throw Error('injected '+stage);}};try{const result=await fn({...m.options,hooks});process.send({type:'result',id:m.id,result,stages,pid:process.pid});}catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code,stages,pid:process.pid});}return;
  }
  const response=await fetch(new URL(m.path,m.url),{method:m.method??'GET',headers:{authorization:'Bearer '+m.token,'content-type':'application/json',...(m.key?{'idempotency-key':m.key}:{})},...(m.body!==undefined?{body:JSON.stringify(m.body)}:{}),signal:AbortSignal.timeout(10000)});
  const data=await response.json();process.send({type:'result',id:m.id,status:response.status,body:data,pid:process.pid});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code,message:e.message,pid:process.pid});}})();});process.send({type:'ready',pid:process.pid});
}
