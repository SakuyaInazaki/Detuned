// Owned client process: credentials enter only private IPC, never argv/stdout.
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const [repo]=process.argv.slice(2);
const {DetunedClient}=await import(pathToFileURL(path.join(repo,'packages/client/dist/index.js')));
const {FileRequestKeyStore}=await import(pathToFileURL(path.join(repo,'packages/client/dist/node.js')));
let client;
process.on('message',m=>{void(async()=>{try{
 if(m.type==='configure'){client=new DetunedClient({baseUrl:m.url,token:m.token,maxRetries:0,timeoutMs:10000,requestKeyStore:await FileRequestKeyStore.create(m.store)});process.send({id:m.id,ok:true,pid:process.pid});return;}
 if(m.type==='close'){process.send({id:m.id,ok:true});process.disconnect();return;}
 assert.ok(client);
 let result;
 if(m.type==='discover'){
  const found=await client.search(m.space,{q:m.query,limit:20});const failure=found.data.find(x=>x.kind==='failure');assert.ok(failure);
  const read=async(ref)=>{let cursor,text='',offset=0;do{const p=await client.getPostRevisionContent(m.space,ref.post_id,ref.revision,{max_bytes:4096,cursor});assert.equal(p.data.start_byte,offset);offset=p.data.end_byte;text+=p.data.chunk;assert.ok(Buffer.byteLength(text)<=1048576);cursor=p.meta.next_cursor;}while(cursor);return JSON.parse(text);};
  const ref={post_id:failure.post_id,revision:failure.revision??failure.current_revision};const f=await read(ref);const sources=f.structured.evidence_refs.filter(x=>x.kind==='post').map(({post_id,revision})=>({post_id,revision}));assert.equal(sources.length,2);const documents=await Promise.all(sources.map(read));
  result=await client.createPost(m.space,failure.thread_id,{kind:'proposal',title:'D01出队确认与松弛',summary:'已知修正规则，非正式评审',body:'固定三点图最短距离a=2,b=1。出队时确认最小暂定距离并逐边松弛；原反例依然有效。',structured:{statement:'最小距离出队确认并松弛',assumptions:['非负权'],scope:'有限非负权图，固定三点反例',falsification_plan:'复核三点、零权边、平行边和不可达点'},refs:[sources[0],ref].map(target_ref=>({type:'cites',target_ref}))},undefined,{logicalOperationId:'d01-improvement'});
  result={created:result.data,failure_ref:ref,sources,documents};
 }else{const allowed=['createPost','subscribe','poll','ack','getPostRevisionContent','getArtifact','downloadArtifact','getMe'];assert.ok(allowed.includes(m.method));result=await client[m.method](...m.args);}
 process.send({id:m.id,ok:true,result});
 }catch(e){process.send({id:m.id,ok:false,error:{name:e?.name,code:e?.code,status:e?.statusCode}});}})();});
process.send({type:'ready',pid:process.pid});
