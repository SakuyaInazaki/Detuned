import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,stat,readdir,writeFile,symlink,chmod} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import {performance} from 'node:perf_hooks';
import Database from 'better-sqlite3';
import {buildApp,loadServerTlsOptions,ArtifactFileStore} from '../../../../packages/server/dist/index.js';
import {bootstrapDatabase,SqliteStorage,DirectoryLock} from '../../../../packages/storage-sqlite/dist/index.js';
import {privateTlsMaterial} from './tls-private-material.mjs';
const receipt={scope:'Independent real TLS CA/SAN/CLI/raw sockets/HTTP resources, no global trust/profile/models',checks:[],cleanup:[]};
const ok=(v,label)=>assert.equal(Boolean(v),true,label),defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const exists=file=>stat(file).then(()=>true,()=>false);
function bounded(promise,ms,label){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(label)),ms))]).finally(()=>clearTimeout(timer));}
function req(base,ca,route='/api/v1/health/live',options={}){
 return new Promise((resolve,reject)=>{
  const body=options.body===undefined?undefined:JSON.stringify(options.body),request=https.request(base+route,{ca,rejectUnauthorized:true,...options,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...options.headers}},response=>{
   const chunks=[];response.on('data',b=>chunks.push(b));response.once('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:response.statusCode,headers:response.headers,text,json:()=>JSON.parse(text)});});response.once('error',reject);
  });request.once('error',reject);request.setTimeout(5000,()=>request.destroy(new Error('Private HTTPS timeout')));request.end(body);
 });
}
let material;
async function isolated(label,run){
 const owned=await mkdtemp('/private/tmp/detuned-tls-case-');let db,app,lock;
 const f={owned,setDb:v=>db=v,setApp:v=>app=v,setLock:v=>lock=v};
 try{const details=await run(f);receipt.checks.push({name:label,passed:true,details});}
 finally{await app?.close();if(db?.open)db.close();if(lock){try{lock.releaseStrict();}catch{}}await rm(owned,{recursive:true,force:true});receipt.cleanup.push({name:label,app_closed:!app?.server.listening,db_closed:!db?.open,temp_absent:!(await exists(owned))});}
}
function child(args){
 const processChild=spawn(process.execPath,['packages/cli/dist/index.js',...args],{env:{PATH:process.env.PATH??'/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 const ready=defer();processChild.stdout.on('data',b=>stdout+=String(b));processChild.stderr.on('data',b=>{stderr+=String(b);const m=stderr.match(/https:\/\/127\.0\.0\.1:(\d+)/);if(m)ready.resolve(`https://127.0.0.1:${m[1]}`);});
 const done=new Promise((resolve,reject)=>{processChild.once('error',reject);processChild.once('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});
 return {child:processChild,done,ready:ready.promise,async terminate(){if(processChild.exitCode===null&&processChild.signalCode===null){processChild.kill('SIGKILL');await done;}}};
}
async function seed(f,base,admin){let key=0;
 const post=async(route,body,token=admin)=>{const r=await req(base,material.ca,'/api/v1'+route,{method:'POST',headers:{authorization:`Bearer ${token}`,'idempotency-key':`tls-private-${++key}`},body});ok(r.status<300,'Real legal private HTTPS seed');return r.json().data;};
 const space=(await post('/spaces',{slug:'tls-private',objective:'Private TLS research',rules:[]})).space.id;
 const actor=(await post('/admin/actors',{kind:'human',display_name:'Private TLS contributor'})).id;
 await post(`/spaces/${space}/memberships`,{actor_id:actor,role:'contributor'});
 const credentials=await post('/admin/credentials',{actor_id:actor,allowed_space_ids:[space],capabilities:['read','write']});
 const subscription=await post(`/spaces/${space}/subscriptions`,{consumer_key:'private-tls-longwait',start:'now'},credentials.token);
 return {space,token:credentials.token,consumer:subscription.consumer.id};
}
try{
 material=await privateTlsMaterial();
 await isolated('trusted private CA/hostname positives, actual wrong CA/hostname negatives and HTTPS header cap',async f=>{
  const db=new Database(path.join(f.owned,'forum.sqlite'));f.setDb(db);bootstrapDatabase(db);
  const app=buildApp({storage:new SqliteStorage(db),tls:{cert:material.cert,key:material.key}});f.setApp(app);await app.listen({host:'127.0.0.1',port:0});const base=`https://127.0.0.1:${app.server.address().port}`;
  const positive=await req(base,material.ca);ok(positive.status===200,'Explicit private CA success');
  let badCA,badHost;try{await req(base,material.wrongCa);}catch(e){badCA=e.code;}try{await req(base,material.ca,'/api/v1/health/live',{servername:'wrong-host.invalid'});}catch(e){badHost=e.code;}
  ok(typeof badCA==='string'&&badCA!=='ERR_TLS_CERT_ALTNAME_INVALID','Actual wrong CA rejected');ok(badHost==='ERR_TLS_CERT_ALTNAME_INVALID','Actual wrong hostname rejected');
  const twenty=await req(base,material.ca,'/api/v1/health/live',{headers:{'x-private-padding':'a'.repeat(20000)}});const sixtySix=await req(base,material.ca,'/api/v1/health/live',{headers:{'x-private-padding':'a'.repeat(66000)}});
  ok(twenty.status===200&&sixtySix.status===431,'HTTPS actual header budget');return {explicit_CA_health:200,wrong_CA_code:badCA,wrong_hostname_code:badHost,header20k:twenty.status,header66k:sixtySix.status};
 });
 await isolated('real CLI bounded safe pre-data-dir failures and repeated same-process loader FD closure',async f=>{
  const invalid=path.join(f.owned,'invalid.pem'),oversize=path.join(f.owned,'oversize.pem'),link=path.join(f.owned,'link.pem'),fifo=path.join(f.owned,'fifo.pem'),unreadable=path.join(f.owned,'unreadable.pem');
  await writeFile(invalid,'PRIVATE_INVALID_PEM_MARKER',{mode:0o600});await writeFile(oversize,Buffer.alloc(1048577,65),{mode:0o600});await symlink(material.files.cert,link);await promisify(execFile)('/usr/bin/mkfifo',[fifo]);await writeFile(unreadable,material.cert,{mode:0o600});await chmod(unreadable,0);
  const pair=(cert,key)=>['--tls-cert-file',cert,'--tls-key-file',key];
  const cases=[['singleflag',['--tls-cert-file',material.files.cert]],['missingfiles',pair(path.join(f.owned,'missing'),path.join(f.owned,'missing-key'))],['symlink',pair(link,material.files.key)],['FIFO',pair(material.files.cert,fifo)],['oversize',pair(oversize,material.files.key)],['badPEM',pair(invalid,material.files.key)],['mismatch',pair(material.files.cert,material.files.wrongKey)],['unreadable',pair(unreadable,material.files.key)],['HTTPweborigin',[...pair(material.files.cert,material.files.key),'--web-origin','http://127.0.0.1:12345','--web-allow-insecure-loopback']]];
  const results=[];
  for(const [label,flags]of cases){const data=path.join(f.owned,'untouched-'+label),c=child(['--json','serve','--data-dir',data,...flags]);try{const r=await bounded(c.done,10000,'Private CLI rejection deadline');ok(r.code===2&&r.signal===null,'Safe actual CLI rejection');ok(!(await exists(data)),'Rejected before data-dir creation');const out=r.stdout+r.stderr;ok(!out.includes(f.owned)&&!out.includes(material.owned)&&!out.includes('PRIVATE_INVALID_PEM_MARKER')&&!out.includes('BEGIN '),'No private path/PEM/native leak');ok(JSON.parse(r.stdout).error.code==='VALIDATION_ERROR','Fixed typed error');results.push({case:label,exit_code:r.code,data_dir_absent:true,safe_output:true});}finally{await c.terminate();}}
  await chmod(unreadable,0o600);
  const before=(await readdir('/dev/fd')).length;for(let i=0;i<24;i++){let error;try{await loadServerTlsOptions(material.files.cert,invalid);}catch(e){error=e;}ok(error?.code==='VALIDATION_ERROR','Safe repeated loader failure');}const after=(await readdir('/dev/fd')).length;ok(after===before,'Own process FD count stable after awaited loader failures');
  return {cases:results,repeated_loader_failures:24,own_FD_count_before:before,own_FD_count_after:after};
 });
 await isolated('actual TLS CLI SIGTERM drains raw no-ClientHello, completed TLS no-HTTP and partial HTTP sockets before DB/lock release',async f=>{
  const data=path.join(f.owned,'data');await mkdir(data);const db=new Database(path.join(data,'detuned.sqlite'));bootstrapDatabase(db);db.close();
  const c=child(['serve','--data-dir',data,'--host','127.0.0.1','--port','0','--no-request-logs','--shutdown-timeout-ms','3000','--tls-cert-file',material.files.cert,'--tls-key-file',material.files.key]);const sockets=[];
  try{
   const base=await bounded(Promise.race([c.ready,c.done.then(()=>{throw new Error('CLI exited before TLS readiness');})]),10000,'TLS CLI readiness deadline');ok((await req(base,material.ca)).status===200,'Actual TLS child ready');const port=Number(new URL(base).port);
   const raw=net.connect({host:'127.0.0.1',port});sockets.push(raw);await bounded(new Promise((resolve,reject)=>{raw.once('connect',resolve);raw.once('error',reject);}),3000,'Raw connect deadline');
   for(const partial of [false,true]){const socket=tls.connect({host:'127.0.0.1',port,ca:material.ca,rejectUnauthorized:true,servername:'localhost'});sockets.push(socket);await bounded(new Promise((resolve,reject)=>{socket.once('secureConnect',resolve);socket.once('error',reject);}),3000,'Private TLS connect deadline');if(partial)socket.write(`GET /api/v1/health/live HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n`);}
   const closed=sockets.map(socket=>new Promise(resolve=>{socket.on('error',()=>{});socket.once('close',resolve);}));const t=performance.now();const sigterm=c.child.kill('SIGTERM'),sigint=c.child.kill('SIGINT');const r=await bounded(c.done,5000,'TLS CLI shutdown deadline');await bounded(Promise.all(closed),1000,'Server did not close raw client sockets');
   ok(r.code===0&&r.signal===null,'Natural clean CLI exit');ok(!(await exists(path.join(data,'detuned.lock'))),'Strict lock absent');const lock=new DirectoryLock(data);lock.acquire();lock.releaseStrict();const reopened=new Database(path.join(data,'detuned.sqlite'));ok(reopened.prepare('SELECT max(version) n FROM schema_migrations').get().n===2,'Reopened unchanged schema');reopened.close();
   return {raw_no_ClientHello:true,secure_no_HTTP:true,partial_HTTP:true,client_closed_before_signal:false,sigterm_sent:sigterm,sigint_sent:sigint,exit_code:r.code,signal:r.signal,shutdown_ms:performance.now()-t,all_socket_close_events:true,actual_DB_reopen:true,actual_lock_reacquired:true};
  }finally{for(const socket of sockets)socket.destroy();await c.terminate();}
 });
 await isolated('TLS actual listen failure still closes DB and releases strict lock',async f=>{
  const data=path.join(f.owned,'data');await mkdir(data);const db=new Database(path.join(data,'detuned.sqlite'));bootstrapDatabase(db);db.close();
  const occupied=net.createServer();await new Promise((resolve,reject)=>{occupied.once('error',reject);occupied.listen(0,'127.0.0.1',resolve);});
  const c=child(['--json','serve','--data-dir',data,'--host','127.0.0.1','--port',String(occupied.address().port),'--no-request-logs','--tls-cert-file',material.files.cert,'--tls-key-file',material.files.key]);
  try{const r=await bounded(c.done,10000,'TLS listen failure deadline');ok(r.code===1&&r.signal===null,'Actual listen failure natural exit');ok(!(await exists(path.join(data,'detuned.lock'))),'Listen failure released strict lock');const lock=new DirectoryLock(data);lock.acquire();lock.releaseStrict();const reopened=new Database(path.join(data,'detuned.sqlite'));ok(reopened.prepare('SELECT max(version) n FROM schema_migrations').get().n===2,'Reopen after listen failure');reopened.close();ok(!(r.stdout+r.stderr).includes(material.owned),'TLS file paths not echoed');return {exit_code:r.code,signal:r.signal,strict_lock_reacquired:true,actual_DB_reopened:true};}
  finally{await c.terminate();await new Promise(resolve=>occupied.close(resolve));}
 });
 await isolated('actual TLS long poll and partial upload cancel, complete owned finally and stage cleanup before app/DB/lock',async f=>{
  const lock=new DirectoryLock(f.owned);lock.acquire();f.setLock(lock);const db=new Database(path.join(f.owned,'forum.sqlite'));f.setDb(db);const admin=bootstrapDatabase(db).adminToken;
  const blobs=await ArtifactFileStore.create(f.owned),trace=[];const originalStage=blobs.stage.bind(blobs);blobs.stage=async(...args)=>{try{return await originalStage(...args);}finally{trace.push('actual_stage_finally');}};
  const app=buildApp({storage:new SqliteStorage(db),artifactBlobs:blobs,tls:{cert:material.cert,key:material.key}});f.setApp(app);await app.listen({host:'127.0.0.1',port:0});const base=`https://127.0.0.1:${app.server.address().port}`,user=await seed(f,base,admin);
  const acquire=app.runtimeResources.acquire.bind(app.runtimeResources),entered=[defer(),defer()];let count=0;
  app.runtimeResources.acquire=cancel=>{const n=count++;trace.push('acquire'+n);const finish=acquire(()=>{trace.push('cancel'+n);cancel();});entered[n]?.resolve();return()=>{trace.push('route_finally'+n);finish();};};
  const before={artifacts:db.prepare('SELECT count(*) n FROM artifacts').get().n,events:db.prepare('SELECT count(*) n FROM events').get().n,ack:db.prepare('SELECT ack_seq FROM consumers WHERE id=?').get(user.consumer).ack_seq};
  const poll=req(base,material.ca,`/api/v1/spaces/${user.space}/consumers/${user.consumer}/poll`,{method:'POST',headers:{authorization:`Bearer ${user.token}`},body:{wait_ms:25000}}).then(r=>({status:r.status}),e=>({closed_code:e.code??'closed'}));await bounded(entered[0].promise,3000,'Actual poll resource not entered');
  const boundary='private-tls-upload';const upload=https.request(base+`/api/v1/spaces/${user.space}/artifacts`,{ca:material.ca,rejectUnauthorized:true,method:'POST',headers:{authorization:`Bearer ${user.token}`,'idempotency-key':'tls-private-unfinished-upload','content-type':`multipart/form-data; boundary=${boundary}`,'content-length':'100000'}});const uploadClosed=new Promise(resolve=>upload.once('close',resolve));upload.on('error',()=>{});upload.on('response',response=>response.resume());
  upload.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="private.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`+'a'.repeat(2048));await bounded(entered[1].promise,3000,'Actual upload resource not entered');
  // Bounded owned-directory observation proves staging started; no arbitrary delay or fabricated response.
  const start=performance.now();while((await readdir(path.join(f.owned,'artifacts/staging'))).length===0){if(performance.now()-start>3000)throw new Error('Actual upload stage not created');await new Promise(resolve=>setImmediate(resolve));}
  await bounded(app.close(),5000,'TLS busy app close deadline');trace.push('app_closed');await bounded(Promise.all([poll,uploadClosed]),1000,'Actual request sockets not closed');
  ok(app.runtimeResources.activeCount===0,'All route resources finished');ok(trace.indexOf('actual_stage_finally')<trace.indexOf('route_finally1')&&trace.indexOf('route_finally1')<trace.indexOf('app_closed'),'Actual stage and route finally before app close');ok(trace.indexOf('route_finally0')<trace.indexOf('app_closed'),'Poll finally before app close');
  ok((await readdir(path.join(f.owned,'artifacts/staging'))).length===0,'Actual partial stage removed');ok(db.prepare('SELECT count(*) n FROM artifacts').get().n===before.artifacts&&db.prepare('SELECT count(*) n FROM events').get().n===before.events&&db.prepare('SELECT ack_seq FROM consumers WHERE id=?').get(user.consumer).ack_seq===before.ack,'No artifact/event/ACK side effects');
  db.close();trace.push('DB_closed');lock.releaseStrict();f.setLock(undefined);trace.push('lock_released');return {actual_long_poll:true,actual_partial_upload_stage:true,trace,active_resources:0,staging_empty:true,business_unchanged:true,client_preclosed:false};
 });
}catch(error){receipt.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{if(material)receipt.certificate_cleanup=await material.close();await writeFile(new URL('tls-independent-first.receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
