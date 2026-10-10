// Fixed private acceptance modes. Trusted seams live only in this helper, never product env/API.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {readdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import * as storage from '../../packages/storage-sqlite/dist/index.js';
import {createServeShutdown} from '../../packages/cli/dist/serve-shutdown.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);if(!process.send||!['server','client'].includes(mode))throw Error('Fixed private shutdown mode');
let close=async()=>process.exit(0);process.on('message',m=>{if(m.type==='close')void close();});
if(mode==='server'){
 let db,app,lock,shutdown,profile='normal',armed=false,opened=0,disposed=0,closedHandles=0,firstNext=0,unhandled=0,failureReportArgs=null;const gates=new Map(),phases=[],logs=[],ten=[];
 process.on('unhandledRejection',()=>unhandled++);
 const held=(name)=>new Promise(done=>{gates.set(name,done);process.send({type:'entered',name});});
 const signalPhase=()=>process.send({type:'draining',result:{dbOpen:db.open,lockPresent:existsSync(join(directory,'detuned.lock')),active:app.runtimeResources.activeCount,phases:[...phases]}});
 const rows=()=>{const result={};for(const table of ['posts','post_revisions','artifacts','events','idempotency_records'])result[table]=db.prepare(`SELECT count(*) n FROM ${table}`).get().n;return result;};
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
 if(m.operation==='initialize'){
 profile=m.profile??'normal';lock=new storage.DirectoryLock(directory);lock.acquire();db=new Database(join(directory,'detuned.sqlite'));const boot=storage.bootstrapDatabase(db),port=new storage.SqliteStorage(db,{dataDir:directory}),blobs=await ArtifactFileStore.create(directory);const original={publish:blobs.publish.bind(blobs),stage:blobs.stage.bind(blobs),open:blobs.open.bind(blobs),exists:blobs.exists.bind(blobs)};
 blobs.publish=async(...args)=>{await original.publish(...args);if(armed&&profile==='publish')await held('publish');};
 blobs.stage=async(...args)=>{if(armed&&profile==='all')process.send({type:'entered',name:'upload'});return original.stage(...args);};
 blobs.exists=async(...args)=>{if(armed&&profile==='exists')await held('exists');return original.exists(...args);};
 blobs.open=async(...args)=>{if(armed&&profile==='late-open')await held('late-open');const handle=await original.open(...args);if(!handle)return null;opened++;let release,done=false;const gate=new Promise(resolve=>release=resolve);if(armed&&['all','reject-dispose'].includes(profile))process.send({type:'entered',name:'download'});let disposal;return{chunks:{async *[Symbol.asyncIterator](){firstNext++;if(armed&&['all','reject-dispose'].includes(profile))await gate;if(!done)yield*handle.chunks;}},dispose:()=>disposal??=(async()=>{disposed++;if(armed&&profile==='reject-dispose')throw Error('PRIVATE_DISPOSER_SQL_PATH_TOKEN');await handle.dispose();done=true;release();if(handle.chunks.closed)closedHandles++;phases.push('fd-closed');})()};};
 app=buildApp({storage:port,artifactBlobs:blobs,writeRateLimits:{per_minute:60000,burst:10000},requestLogSink:r=>logs.push(r)});
 const poll=app.eventService.pollWithWait.bind(app.eventService);app.eventService.pollWithWait=(...args)=>{if(armed&&profile==='all')process.send({type:'entered',name:'poll'});return poll(...args);};
 const openExport=app.spaceExportService.open.bind(app.spaceExportService);app.spaceExportService.open=(...args)=>{const session=openExport(...args);if(!(armed&&profile==='all'))return session;let header=true;return{nextLine(){if(header){header=false;const line=session.nextLine();process.send({type:'entered',name:'export'});return line;}return{kind:'pending'};},close(){session.close();phases.push('export-closed');}};};
 app.addHook('onRequest',async req=>{if(req.headers['x-private-ten']==='yes'){await new Promise(done=>{ten.push(done);if(ten.length===10)process.send({type:'ten-entered',count:10});});}});
 shutdown=createServeShutdown({beginDraining(){phases.push('begin');app.detunedBeginDraining();phases.push('cancelled');signalPhase();},async closeApp(){phases.push('app-close-start');if(profile==='app-fail')throw Error('PRIVATE_APP_SQL_PATH_TOKEN');await app.close();phases.push('app-closed');},closeDatabase(){phases.push('db-close-start');if(profile==='db-fail')throw Error('PRIVATE_DB_SQL_PATH_TOKEN');db.close();phases.push('db-closed');},releaseLock(){phases.push('lock-release-start');if(profile==='lock-fail')throw Error('PRIVATE_LOCK_SQL_PATH_TOKEN');lock.releaseStrict();phases.push('lock-released');},disposeLogs(){phases.push('logs-disposed');},reportFailure(){failureReportArgs=arguments.length;process.stderr.write('Controlled service shutdown failed safely.\n');},exit(code){let counts=null;try{if(db.open)counts=rows();}catch{}process.send({type:'shutdown-result',result:{code,phases,opened,disposed,closedHandles,firstNext,unhandled,failureReportArgs,counts,active:app.runtimeResources.activeCount,dbOpen:db.open,lockPresent:existsSync(join(directory,'detuned.lock'))}},()=>process.exit(code));}},m.timeoutMs??5000);shutdown.attachSignals();close=()=>shutdown.shutdown();const url=await app.listen({host:'127.0.0.1',port:0});process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;
 }
 if(m.operation==='arm'){armed=true;if(profile==='timeout')app.runtimeResources.acquire(()=>phases.push('held-cancelled'));process.send({type:'result',id:m.id,result:{armed:true}});return;}
 if(m.operation==='release'){gates.get(m.name)?.();gates.delete(m.name);if(m.name==='ten'){for(const done of ten)done();ten.length=0;}process.send({type:'result',id:m.id,result:{released:true}});return;}
 if(m.operation==='stats'){process.send({type:'result',id:m.id,result:{counts:rows(),active:app.runtimeResources.activeCount,opened,disposed,closedHandles,firstNext,logs}});return;}
 if(m.operation==='audit'){const audits=db.prepare('SELECT target_type,target_id,affected_revisions FROM redactions WHERE target_id IN (?,?) ORDER BY target_type').all(m.post,m.artifact);process.send({type:'result',id:m.id,result:audits});return;}
 if(m.operation==='orphan'){await writeFile(join(directory,'artifacts/objects/blob_shutdown_private_orphan'),'owned orphan');process.send({type:'result',id:m.id,result:{created:true}});return;}
 if(m.operation==='inspect'){const read=new Database(join(directory,'detuned.sqlite'),{readonly:true});try{const result={};for(const table of ['artifacts','events','idempotency_records'])result[table]=read.prepare(`SELECT count(*) n FROM ${table}`).get().n;process.send({type:'result',id:m.id,result:{counts:result,objects:await readdir(join(directory,'artifacts/objects')),stage:await readdir(join(directory,'artifacts/staging'))}});}finally{read.close();}return;}
 throw Error('Unknown fixed operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}else{
 const requests=[];close=async()=>{for(const req of requests)req.destroy();process.exit(0);};
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
 if(m.operation==='slow-multipart'){const boundary='detuned-private-shutdown';const req=http.request(m.url+'/api/v1'+m.path,{method:'POST',headers:{authorization:'Bearer '+m.token,'idempotency-key':'slow-multipart-owned','content-type':'multipart/form-data; boundary='+boundary,'transfer-encoding':'chunked'}});requests.push(req);req.on('error',()=>{});req.on('response',res=>res.resume());req.write('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="small.txt"\r\nContent-Type: text/plain\r\n\r\nsmall partial');process.send({type:'result',id:m.id,result:{started:true}});return;}
 if(m.operation==='request'||m.operation==='upload'){
 const headers={authorization:'Bearer '+m.token,'idempotency-key':m.key??'shutdown-independent-'+m.id,...m.headers};let body;
 if(m.operation==='upload'){body=new FormData();body.append('file',new Blob([m.text??'tiny owned attachment'],{type:'text/plain'}),'tiny.txt');}else if(m.body!==undefined){headers['content-type']='application/json';body=JSON.stringify(m.body);}
 const response=await fetch(m.url+'/api/v1'+m.path,{method:m.method??'GET',headers,body,signal:AbortSignal.timeout(15000)});const text=await response.text();let parsed;try{parsed=JSON.parse(text);}catch{}process.send({type:'result',id:m.id,status:response.status,body:parsed,text});return;
 }
 throw Error('Unknown fixed client operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
}
process.send({type:'ready'});
