// Fixed private-IPC acceptance worker. No command execution or persisted credentials.
import {createRequire} from 'node:module';
import {createServer,request as httpRequest} from 'node:http';
import {buildApp} from '../../packages/server/dist/index.js';
import {SqliteStorage} from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url));
const Database=require('better-sqlite3');
const [mode,path]=process.argv.slice(2);
if(!process.send||!['server','client','drop-proxy','store-worker'].includes(mode))throw Error('Fixed private IPC worker only');
let cleanup=async()=>{};
process.on('message',m=>{if(m.type==='close')void cleanup().then(()=>process.exit(0));});
if(mode==='server'){
 const db=new Database(path,{fileMustExist:true});const app=buildApp({storage:new SqliteStorage(db)});let posts=0,holdMe=false,releaseMe;
 app.addHook('onRequest',async req=>{if(req.method==='POST')posts++;});
 app.addHook('onSend',async(req,_reply,payload)=>{if(holdMe&&req.url==='/api/v1/me'){holdMe=false;await new Promise(resolve=>{releaseMe=resolve;process.send({type:'me-pending'});});}return payload;});
 const url=await app.listen({host:'127.0.0.1',port:0});cleanup=async()=>{await app.close();db.close();};
 process.on('message',m=>{if(m.type==='hold-me'){holdMe=true;process.send({type:'result',id:m.id});}if(m.type==='release-me')releaseMe?.();if(m.type==='stats')process.send({type:'result',id:m.id,posts});});process.send({type:'ready',url,pid:process.pid});
}else if(mode==='drop-proxy'){
 let upstream,dropped=false;
 const server=createServer((req,res)=>{const out=httpRequest(new URL(req.url,upstream),{method:req.method,headers:req.headers},r=>{const chunks=[];r.on('data',x=>chunks.push(x));r.on('end',()=>{if(req.method==='POST'&&r.statusCode===201&&!dropped){dropped=true;process.send({type:'dropped',status:r.statusCode});res.destroy();return;}res.writeHead(r.statusCode,r.headers);res.end(Buffer.concat(chunks));});});out.on('error',()=>{if(!res.destroyed){res.writeHead(502);res.end('{}');}});req.pipe(out);});
 cleanup=async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};process.on('message',m=>{if(m.type==='configure'){upstream=m.url;server.listen(0,'127.0.0.1',()=>process.send({type:'ready',pid:process.pid,url:`http://127.0.0.1:${server.address().port}`}));}});
}else{
 process.on('message',m=>{if(m.type!=='run')return;void(async()=>{try{
  if(mode==='store-worker'){const {FileRequestKeyStore}=await import('../../packages/client/dist/node.js');const store=await FileRequestKeyStore.create(m.directory);const key=await store.getOrCreate(m.scope,m.logicalId);process.send({type:'result',id:m.id,key,pid:process.pid});return;}
  const {DetunedClient}=await import('../../packages/client/dist/index.js');
  let store;if(m.directory){const {FileRequestKeyStore}=await import('../../packages/client/dist/node.js');store=await FileRequestKeyStore.create(m.directory);}
  const client=new DetunedClient({baseUrl:m.url,token:m.token,maxRetries:0,timeoutMs:5000,...(store?{requestKeyStore:store}:{})});
  const opts={...(m.logicalId!==undefined?{logicalOperationId:m.logicalId}:{}),...(m.cancel?{signal:AbortSignal.abort()}: {})};
  const result=m.operation==='relation'?await client.createRelation(m.space,m.body,m.key,opts):await client.createPost(m.space,m.thread,m.body,m.key,opts);
  process.send({type:'result',id:m.id,result,pid:process.pid});
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code,status:e.statusCode,message:e.message,pid:process.pid});}})();});process.send({type:'ready',pid:process.pid});
}
