// One owned C process. Credentials travel only over private IPC.
import {DetunedClient} from '../../packages/client/dist/index.js';
let client;
process.on('message',message=>{void(async()=>{try{
 let result;if(message.type==='configure'){client=new DetunedClient({baseUrl:message.url,token:message.token,maxRetries:0,timeoutMs:2000});result={pid:process.pid};}
 else if(message.type==='close'){process.send({id:message.id,ok:true,result:{pid:process.pid}});process.disconnect();return;}
 else{if(!client)throw Error('Not configured');const s=message.spaceId;
 if(message.type==='discover'){const page=await client.search(s,{q:'D01三点反例',limit:20});const failure=page.data.find(item=>item.kind==='failure');if(!failure||failure.post_id!==message.failureId)throw Error('Missing fixed failure');const fixed=await client.getPostRevisionContent(s,failure.post_id,1,{max_bytes:65536});const document=JSON.parse(fixed.data.chunk);if(document.structured.expected!=='a=2,b=1')throw Error('Counterexample mismatch');result=(await client.createPost(s,message.threadId,{kind:'claim',title:'D01正确松弛',summary:'出队确认并松弛',body:'按最小暂定距离出队并松弛；三点a=2,b=1。',structured:{statement:'最小暂定距离出队并松弛',assumptions:['非负安全整数权重'],scope:'固定有限图',falsification_plan:'对照Bellman-Ford'},refs:[message.originalRef,{post_id:message.failureId,revision:1}].map(target_ref=>({type:'cites',target_ref}))},'d01-c-correct')).data.post;}
 else if(message.type==='subscribe')result=(await client.subscribe(s,{consumer_key:'d01-reviewed-C',start:'beginning'},'d01-subscribe')).data;
 else if(message.type==='poll')result=(await client.poll(s,message.consumerId,{limit:100,wait_ms:0})).data;
 else if(message.type==='ack')result=(await client.ack(s,message.consumerId,{batch_id:message.batchId,next_cursor:message.nextCursor})).data;
 else if(message.type==='readFixed')result=await client.getPostRevisionContent(s,message.postId,message.revision,{max_bytes:65536});
 else throw Error('Unknown worker operation');}
 if(process.connected)process.send({id:message.id,ok:true,result});
 }catch(error){if(process.connected)process.send({id:message.id,ok:false,error:{code:typeof error?.code==='string'?error.code:'WORKER_FAILED'}});}})();});
process.on('disconnect',()=>{process.exitCode=0;});process.send({type:'ready',pid:process.pid});
