// Fixed test-only modes. Configuration, credentials and responses travel over private IPC.
import {createRequire} from 'node:module';
import {createServer,request as httpRequest} from 'node:http';
import {buildApp} from '../../packages/server/dist/index.js';
import {SqliteStorage} from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url));
const Database=require('better-sqlite3');
const [mode,path]=process.argv.slice(2);
if(!process.send||!['server','client','drop-response-proxy'].includes(mode))throw new Error('Fixed private-IPC test worker only');
let close=async()=>{};let closing=false;
const stop=async()=>{if(closing)return;closing=true;await close();process.exit(0);};
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
if(mode==='server'){
 const db=new Database(path,{fileMustExist:true});const app=buildApp({storage:new SqliteStorage(db)});
 const url=await app.listen({host:'127.0.0.1',port:0});close=async()=>{await app.close();db.close();};
 process.on('message',m=>{if(m.type==='close')void stop();});process.send({type:'ready',pid:process.pid,url});
}else if(mode==='client'){
 const controllers=new Map();
 close=async()=>{for(const c of controllers.values())c.abort();};
 process.on('message',m=>{if(m.type==='close'){void stop();return;}if(m.type==='abort'){controllers.get(m.id)?.abort();return;}if(m.type==='d01'){void d01(m).catch(e=>process.send?.({type:'result',id:m.id,error:e.name,message:e.message,pid:process.pid}));return;}if(m.type!=='request')return;
  const controller=new AbortController();controllers.set(m.id,controller);const timer=setTimeout(()=>controller.abort(),m.timeout_ms??10000);
  void(async()=>{try{const response=await fetch(new URL(m.path,m.url),{method:m.method??'POST',headers:{authorization:`Bearer ${m.token}`,'content-type':'application/json',...(m.key?{'idempotency-key':m.key}:{})},...(m.body!==undefined?{body:JSON.stringify(m.body)}:{}),signal:controller.signal});const text=await response.text();process.send?.({type:'result',id:m.id,status:response.status,body:JSON.parse(text),pid:process.pid});}catch(e){process.send?.({type:'result',id:m.id,error:e.name,message:e.message,pid:process.pid});}finally{clearTimeout(timer);controllers.delete(m.id);}})();
 });process.send({type:'ready',pid:process.pid});
}else{
 let upstream;let dropped=false;
 const server=createServer((req,res)=>{const target=new URL(req.url,upstream);const out=httpRequest(target,{method:req.method,headers:req.headers},response=>{const chunks=[];response.on('data',x=>chunks.push(x));response.on('end',()=>{if(req.url.endsWith('/ack')&&!dropped){dropped=true;process.send?.({type:'ack_response_dropped',status:response.statusCode,pid:process.pid});res.destroy();return;}res.writeHead(response.statusCode??502,response.headers);res.end(Buffer.concat(chunks));});});out.setTimeout(10000,()=>out.destroy());out.on('error',()=>{if(!res.destroyed){res.writeHead(502);res.end('{}');}});req.pipe(out);});
 close=async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};
 process.on('message',m=>{if(m.type==='close'){void stop();return;}if(m.type==='configure'){upstream=m.url;server.listen(0,'127.0.0.1',()=>process.send({type:'ready',pid:process.pid,url:`http://127.0.0.1:${server.address().port}`}));}});
}

async function d01(m){
 const {url,token,space_id,query}=m.input;const root='/api/v1/spaces/'+space_id,records=[];
 if(Object.keys(m.input).sort().join(',')!=='query,space_id,token,url')throw new Error('D01 client accepts four connection/query inputs only');
 const call=async(method,path,body)=>{const response=await fetch(new URL(path,url),{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json','idempotency-key':'d01-client-'+records.length},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});const result=await response.json();if(response.status>=300)throw new Error('D01 HTTP status '+response.status);records.push({method,path,status:response.status});return result.data;};
 const search=await call('GET',root+'/search?'+new URLSearchParams({q:query,limit:'100'}));const hit=search.find(x=>x.kind==='failure');if(!hit)throw new Error('No discovered failure');
 const fixed=async(ref)=>{let text='',cursor;do{const r=await fetch(new URL(root+'/posts/'+ref.post_id+'/revisions/'+ref.revision+'?'+new URLSearchParams({max_bytes:'4096',...(cursor?{cursor}:{})}),url),{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});const page=await r.json();if(r.status!==200)throw new Error('Fixed content unavailable');records.push({method:'GET',path:root+'/posts/'+ref.post_id+'/revisions/'+ref.revision,status:r.status});text+=page.data.chunk;cursor=page.meta.next_cursor;}while(cursor);return {ref,content:JSON.parse(text)};};
 const meta=(await call('GET',root+'/posts/'+hit.post_id)).post;const failure=await fixed({post_id:meta.id,revision:meta.current_revision});const materials=[];for(const ref of failure.content.structured.evidence_refs.filter(x=>x.kind==='post'))materials.push(await fixed({post_id:ref.post_id,revision:ref.revision}));const proposal=materials.find(x=>x.content.structured.statement);if(!proposal)throw new Error('Original proposal not discovered');
 const refs=[proposal.ref,failure.ref];const created=await call('POST',root+'/threads/'+meta.thread_id+'/posts',{kind:'proposal',title:'D01恢复改进',summary:'已知Dijkstra修正，非研究认证',body:'非负权；最小暂定距离出队确认，逐边松弛；三点图a=2,b=1。',structured:{statement:'最小距离出队后确认而非首次发现固定',assumptions:['非负权'],scope:failure.content.structured.tested_scope,falsification_plan:'三点、零权与不可达反例'},refs:refs.map(target_ref=>({type:'cites',target_ref}))});
 process.send?.({type:'result',id:m.id,pid:process.pid,status:201,body:{data:{created,documents:[failure,...materials],records,input_keys:Object.keys(m.input).sort()}}});
}
