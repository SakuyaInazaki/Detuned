// Fixed private IPC modes for independent export acceptance. Never execute commands from IPC.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {buildApp,ArtifactFileStore} from '../../packages/server/dist/index.js';
import {SqliteStorage,DirectoryLock,openAndCoordinateDatabase} from '../../packages/storage-sqlite/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [mode,directory]=process.argv.slice(2);
if(!process.send||!['server','client','raw-stream-fixture'].includes(mode))throw Error('Fixed private IPC export fixture only');
const send=m=>process.send(m);let cleanup=async()=>{};
process.on('message',m=>{if(m.type==='close')void cleanup().then(()=>process.exit(0));});
if(mode==='server'){
 const lock=new DirectoryLock(directory);lock.acquire();const db=new Database(join(directory,'detuned.sqlite'),{fileMustExist:true});openAndCoordinateDatabase(db,'serve');const storage=new SqliteStorage(db),blobs=await ArtifactFileStore.create(directory),app=buildApp({storage,artifactBlobs:blobs});
 const service=app.spaceExportService;if(!service)throw Error('Export service decorator not available');
 let armed=false,paused=false,sessionSerial=0,maxHeap=process.memoryUsage().heapUsed,samples=0;
 const sample=setInterval(()=>{samples++;maxHeap=Math.max(maxHeap,process.memoryUsage().heapUsed);},20);sample.unref();
 const original=service.open.bind(service);service.open=(...args)=>{const session=original(...args),number=++sessionSerial;if(armed){armed=false;paused=true;send({type:'barrier',number});const next=session.nextLine.bind(session);let first=true;session.nextLine=()=>{if(first){first=false;return next();}return paused?{kind:'pending'}:next();};}return session;};
 process.on('message',m=>{
  if(m.type==='arm'){armed=true;send({type:'result',id:m.id});}
  if(m.type==='release'){paused=false;send({type:'result',id:m.id});}
  if(m.type==='begin-samples'){samples=0;maxHeap=process.memoryUsage().heapUsed;send({type:'result',id:m.id,heap:maxHeap});}
  if(m.type==='stats')send({type:'result',id:m.id,active:service.activeCount,heap:process.memoryUsage().heapUsed,maxHeap,samples});
  if(m.type==='seed-large'){const stamp=new Date().toISOString(),body='材料🙂'.repeat(6553)+'xxxxxx';const post=db.prepare("INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) VALUES(?,?,?,?,'note',1,'active',?)"),revision=db.prepare('INSERT INTO post_revisions VALUES(?,1,?,?,?,?,?,?,?,?)');for(let i=0;i<640;i++){db.transaction(()=>{const id='independent-large-'+i;post.run(id,m.space,m.thread,m.actor,stamp);revision.run(id,'bounded row '+i,'large',body,'[]','{}',createHash('sha256').update(body).digest('hex'),m.actor,stamp);})();}send({type:'result',id:m.id,rows:640,bodyBytes:Buffer.byteLength(body)*640});}
 });
 const url=await app.listen({host:'127.0.0.1',port:0});cleanup=async()=>{clearInterval(sample);await app.close();db.close();lock.release();};send({type:'ready',pid:process.pid,url});
}else if(mode==='client'){
 let release=()=>{},abort=()=>{};
 process.on('message',m=>{
  if(m.type==='release-sink')release();if(m.type==='abort')abort();if(m.type!=='run')return;
  void(async()=>{try{
   if(m.operation==='request'){const response=await fetch(m.url+'/api/v1'+m.path,{method:m.method??'GET',headers:{authorization:'Bearer '+m.token,...m.body===undefined?{}:{'content-type':'application/json'},'idempotency-key':'independent-'+m.id},...(m.body===undefined?{}:{body:JSON.stringify(m.body)}),signal:AbortSignal.timeout(15000)});send({type:'result',id:m.id,status:response.status,body:await response.json()});return;}
   if(m.operation!=='export')throw Error('Invalid fixed client operation');const controller=new AbortController();abort=()=>controller.abort();let lines=[],count=0,bytes=0,maxHeap=process.memoryUsage().heapUsed,samples=0,first=true;const sampler=setInterval(()=>{samples++;maxHeap=Math.max(maxHeap,process.memoryUsage().heapUsed);},20);sampler.unref();
   try{const client=new DetunedClient({baseUrl:m.url,token:m.token,timeoutMs:15000});const result=await client.exportSpace(m.space,{signal:controller.signal,timeoutMs:m.timeoutMs??15000,sink:async line=>{count++;bytes+=line.length;if(m.collect)lines.push(JSON.parse(Buffer.from(line).toString('utf8')));if(first&&m.pauseSink){first=false;send({type:'sink-barrier',id:m.id});await new Promise(r=>{release=r;});}if(m.slowSink)await new Promise(r=>setImmediate(r));}});send({type:'result',id:m.id,complete:true,result,lines,count,bytes,maxHeap,samples});}catch(e){send({type:'result',id:m.id,complete:false,error:e.name,code:e.code,count,bytes,lines,maxHeap,samples});}finally{clearInterval(sampler);}
  }catch(e){send({type:'result',id:m.id,error:e.name,code:e.code});}})();
 });send({type:'ready',pid:process.pid});
}else{
 let strategy='valid',requests=0;const header={type:'header',format:'detuned-space-export',version:1,export_id:'exp_00000000-0000-4000-8000-000000000000',created_at:'2026-10-06T00:00:00.000Z',source:{space_id:'raw-space',schema_version:2,snapshot_event_seq:'0',space_revision:1},identity_semantics:'source_actor_ids_only',scope:'public_research',formal_review_status:'not_enabled',formal_check_status:'not_enabled',hash_algorithm:'sha256-chain-v1'};
 const strategies=['valid','wrong-header','truncate','extra','hash','count','sequence','bad-utf8','crlf','empty','oversize'];
 const server=createServer((req,res)=>{requests++;const h={...header,...strategy==='wrong-header'?{version:2}:{}};const line=Buffer.from(JSON.stringify(h)+'\n'),record=Buffer.from(JSON.stringify({type:'record',seq:strategy==='sequence'?2:1,kind:'space',data:{id:'raw-space',slug:'raw',current_revision:1,policy_revision:1,created_at:header.created_at}})+'\n');let digest=createHash('sha256').update(Buffer.alloc(32)).update(line).digest();digest=createHash('sha256').update(digest).update(record).digest();const end=Buffer.from(JSON.stringify({type:'end',complete:true,record_count:strategy==='count'?2:1,bytes_before_end:line.length+record.length,chain_sha256:strategy==='hash'?'f'.repeat(64):digest.toString('hex')})+'\n');res.writeHead(200,{'content-type':'application/x-ndjson; charset=utf-8'});if(strategy==='oversize'){res.end(Buffer.alloc(1048577,97));return;}if(strategy==='bad-utf8'){res.end(Buffer.from([0xff,10]));return;}if(strategy==='empty'){res.end('\n');return;}let data=Buffer.concat([line,record,...strategy==='truncate'?[]:[end],...strategy==='extra'?[line]:[]]);if(strategy==='crlf')data=Buffer.from(data.toString('utf8').replaceAll('\n','\r\n'));res.end(data);});
 process.on('message',m=>{if(m.type==='strategy'){if(!strategies.includes(m.strategy))throw Error('Unsupported fixed raw strategy');strategy=m.strategy;send({type:'result',id:m.id,requests});}});await new Promise(r=>server.listen(0,'127.0.0.1',r));cleanup=async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));};send({type:'ready',pid:process.pid,url:'http://127.0.0.1:'+server.address().port});
}
