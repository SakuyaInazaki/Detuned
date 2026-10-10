#!/usr/bin/env node
// Isolated local HTTP load; no product modules are changed and no credentials are logged.
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fork } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { cpus, totalmem, platform, release, loadavg } from 'node:os';
import { DetunedClient } from '../../packages/client/dist/index.js';
import { sha, decode, sleep, rng, block, journal, size, disk, percentile, postBody, within } from './run-support.mjs';

const args=process.argv.slice(2), options={};
for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith('--')||args[i+1]===undefined)throw new Error('Usage: run.mjs --manifest FILE --runtime PRIVATE_FILE --out NEW_DIR --mode smoke|full');options[args[i].slice(2)]=args[i+1];}
if(Object.keys(options).some(k=>!['manifest','runtime','out','mode','gated'].includes(k))||!options.manifest||!options.runtime||!options.out||!['smoke','full'].includes(options.mode)||options.gated!==undefined&&!['true','false'].includes(options.gated))throw new Error('Required manifest/runtime/out/mode; no secret CLI arguments');
const rawManifest=await readFile(options.manifest,'utf8'), manifest=JSON.parse(rawManifest);
const runtimeStat=await stat(options.runtime);if((runtimeStat.mode&0o077)!==0)throw new Error('Private runtime must have mode 0600 or stricter');
const runtime=JSON.parse(await readFile(options.runtime,'utf8'));
const out=resolve(options.out);await mkdir(out,{recursive:false,mode:0o700});
const db=resolve(runtime.db_path), space=manifest.space_id;
const init=JSON.parse(await readFile(join(dirname(resolve(options.runtime)),'initialization.json'),'utf8'));
if(db!==join(dirname(resolve(options.runtime)),'runtime.db')||init.runtime_database!==db||init.kind!=='fixture_initialization_before_real_HTTP'||init.admin_credentials!==0)throw new Error('Only a fresh run-prepare isolated runtime is accepted');
const seedArchive=resolve(dirname(resolve(options.manifest)),manifest.database_file);
const seedArchiveBytes=(await stat(seedArchive)).size;
if(init.seed_database!==seedArchive||seedArchiveBytes!==manifest.database_bytes)throw new Error('Seed archive path/bytes must match manifest and preparation');
if(!space||!Array.isArray(manifest.clients)||manifest.clients.length!==20||runtime.tokens?.length!==20)throw new Error('Need one space and exactly 20 actors/tokens');
if(new Set(manifest.clients.map(c=>c.actor_id)).size!==20||new Set(manifest.clients.map(c=>c.write_thread_id)).size!==20)throw new Error('Actors and write targets must be distinct');
if(options.mode==='full'&&(manifest.profile!=='full'||manifest.counts?.posts<100000||manifest.counts?.events<1000000))throw new Error('Full mode requires the full 100k/1M seed manifest');
const mode=options.mode, duration=mode==='full'?600000:10000,warmup=mode==='full'?30000:2000;
const runId=`c2-${mode}-${Date.now().toString(36)}`;
const names=['requests','operations','consumer-ledger','write-ledger','resources'];
const logs=Object.fromEntries(await Promise.all(names.map(async n=>[n,await journal(join(out,n+'.jsonl'))])));
const origin=performance.now(), als=new AsyncLocalStorage(), nativeFetch=globalThis.fetch;
const samples=[], opSamples=[], recent=[], counts={}, pending=new Set();let phase='setup', failure=null, measurementStart=null, lastResource=null, ended=false;
const now=()=>performance.now()-origin;
const stop=reason=>{failure??=reason;};
let child, baseUrl, timer, serverLog,serverEnvironment;
const resourcePaths=[db,db+'-wal',db+'-shm',...names.map(n=>join(out,n+'.jsonl'))];
async function resource(){
  const free=await disk(dirname(db));const sizes=await Promise.all(resourcePaths.map(async p=>({file:p===db?'db':p.startsWith(db)?p.slice(db.length):p.split('/').at(-1),bytes:await size(p)})));
  const runtimeBytes=sizes.reduce((n,x)=>n+x.bytes,0),combinedBytes=seedArchiveBytes+runtimeBytes;
  await logs.resources.write({schema_version:1,phase,t_ms:now(),seed_archive_bytes:seedArchiveBytes,runtime_files_bytes:runtimeBytes,combined_bytes:combinedBytes,runner_pid:process.pid,runner_rss:process.memoryUsage().rss,server:lastResource,free_bytes:free,files:sizes});
  if(free<6*1024**3)stop('disk_free_below_6GiB');
  if(combinedBytes>8*1024**3)stop('seed_and_runtime_files_above_8GiB');
}
function tracked(p){pending.add(p);p.finally(()=>pending.delete(p)).catch(()=>{});return p;}
const controllers=new Set();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stop(signal);for(const c of controllers)c.abort();});
function fatalError(e){return /invariant|budget|replay|chunk|ownership/.test(e.message);}
// A cloned response is consumed once for measurement; client receives an equivalent buffered Response.
globalThis.fetch=async(url,init={})=>{
  const c=als.getStore()??{client:null,op:'setup',op_id:'setup',attempt:0};
  const start=now();const headers=new Headers(init.headers);const requestId=`${runId}-${c.client??'s'}-${c.op_id}-${++c.attempt}`;headers.set('x-request-id',requestId);
  const parsedURL=new URL(url),endpoint=parsedURL.pathname,q=parsedURL.searchParams.get('q');const queryChars=q===null?null:Array.from(q).length;const requestBytes=Buffer.byteLength(typeof init.body==='string'?init.body:'');
  let record={schema_version:1,phase,client:c.client,logical_op:c.op,op_id:c.op_id,attempt:c.attempt,method:init.method??'GET',endpoint,request_id_sent:requestId,start_ms:start,request_bytes:requestBytes,expected_status:c.expected_status??200,replay:c.replay??false,query_category:c.query_category??null,query_chars:queryChars,short_chinese_query:q!==null&&queryChars>=1&&queryChars<=3&&/[\u3400-\u9fff]/u.test(q),request_url_bytes:Buffer.byteLength(String(url)),max_bytes:parsedURL.searchParams.has('max_bytes')?Number(parsedURL.searchParams.get('max_bytes')):null,cursor_sha256:parsedURL.searchParams.has('cursor')?sha(parsedURL.searchParams.get('cursor')):null,retry_attempt:c.retry_attempt??0};
  try{
    const res=await nativeFetch(url,{...init,headers});const raw=await res.text();let json;try{json=JSON.parse(raw);}catch{}
    const retryAfter=res.headers.get('retry-after');if(retryAfter)c.retry_after_ms=/^\d+$/.test(retryAfter)?Number(retryAfter)*1000:Math.max(0,Date.parse(retryAfter)-Date.now());
    const searchLimit=c.op==='search'&&res.status===422&&json?.error?.code==='QUERY_TOO_BROAD';
    record={...record,classification:searchLimit?'search_limit':res.ok?'success':res.status===c.expected_status?'expected_conflict':'unexpected_error',end_ms:now(),latency_ms:now()-start,status:res.status,code:json?.error?.code??null,response_bytes:Buffer.byteLength(raw),request_id:json?.request_id??null};
    if(c.cap&&res.ok&&record.response_bytes>c.cap){await logs.requests.write({...record,classification:'budget_invariant'});stop('budget_invariant');throw new Error('budget invariant exceeded');}
    c.last_request_id=json?.request_id??null;
    samples.push(record);if(phase==='measure')recent.push({t:now(),bad:!res.ok&&res.status!==c.expected_status&&!searchLimit});
    await logs.requests.write(record);
    return new Response(raw,{status:res.status,statusText:res.statusText,headers:res.headers});
  }catch(e){
    if(!record.end_ms){record={...record,end_ms:now(),latency_ms:now()-start,status:null,code:e.code??e.name,response_bytes:0};samples.push(record);if(phase==='measure')recent.push({t:now(),bad:true});await logs.requests.write(record);}
    throw e;
  }
};
async function request(fn,context){
  for(let attempt=0;attempt<2;attempt++){
    context.retry_attempt=attempt;context.retry_after_ms=null;
    try{return await fn();}catch(e){
      const retryable=e.isTimeout||e.retryable||e.kind==='transport';
      if(attempt||!retryable||context.signal.aborted||[400,401,403,404,409,413,422].includes(e.statusCode))throw e;
      // Retry-After captured by transport wrapper below; excessive delay never retried.
      const wait=context.retry_after_ms??250;if(wait>2000)throw e;
      await sleep(wait);if(context.signal.aborted)throw e;
    }
  }
}
const clients=manifest.clients.map((m,i)=>({ ...m,index:i,api:null,random:rng(`detuned-c2-load-v1:${i}`),schedule:[],intent:0,kindCounts:{},missed:0,missedByPhase:{},revision:m.current_revision,refs:[],consumer:null,ackSeq:null,delivered:new Map()}));
function choose(random,a){if(!a?.length)throw new Error('Manifest missing candidate pool');return a[Math.floor(random()*a.length)];}
async function consume(c,ctx){
  const r=await request(()=>c.api.poll(space,c.consumer,{limit:100,wait_ms:0},{signal:ctx.signal}),ctx);const d=r.data;
  if(!d.batch_id){if(d.events.length||d.next_cursor!==null)throw new Error('poll invariant: no batch with data');await logs['consumer-ledger'].write({schema_version:1,phase,client:c.index,op_id:ctx.op_id,type:'empty_poll',consumer_id:c.consumer,ack_seq:c.ackSeq,request_id:ctx.last_request_id,has_more:d.has_more});return d;}
  const payload=decode(d.next_cursor);if(payload.batch_id!==d.batch_id||payload.consumer_id!==c.consumer)throw new Error('batch ownership invariant');
  const eventList=d.events.map(e=>({id:e.id,seq:e.seq,type:e.type,object_id:e.object_id,revision:e.revision}));
  const fingerprint=sha(eventList);const prior=c.delivered.get(d.batch_id);if(prior&&prior!==fingerprint)throw new Error('redelivery invariant changed');c.delivered.set(d.batch_id,fingerprint);
  await logs['consumer-ledger'].write({schema_version:1,phase,client:c.index,op_id:ctx.op_id,type:'delivery',consumer_id:c.consumer,batch_id:d.batch_id,from_seq:c.ackSeq,through_seq:payload.through_seq,cursor_sha256:sha(d.next_cursor),events:eventList,redelivery:!!prior,has_more:d.has_more,request_id:ctx.last_request_id});
  if(ctx.signal.aborted)throw new Error('cancelled before ack');
  const ack=await request(()=>c.api.ack(space,c.consumer,{batch_id:d.batch_id,next_cursor:d.next_cursor},{signal:ctx.signal}),ctx);
  if(!ack.data.confirmed||ack.data.acknowledged_batch_id!==d.batch_id)throw new Error('ack invariant');c.ackSeq=payload.through_seq;
  await logs['consumer-ledger'].write({schema_version:1,phase,client:c.index,op_id:ctx.op_id,type:'ack',consumer_id:c.consumer,batch_id:d.batch_id,through_seq:c.ackSeq,request_id:ctx.last_request_id,confirmed:true});return d;
}
async function content(c,ctx,type,ref,budget){
  let cursor,parts=[],end=0;
  for(let page=0;page<64;page++){
    ctx.cap=budget;
    const p=await request(()=>type==='space'?c.api.getSpaceRevision(space,ref.revision,{max_bytes:budget,cursor},{signal:ctx.signal}):c.api.getPostRevisionContent(space,ref.post_id,ref.revision,{max_bytes:budget,cursor},{signal:ctx.signal}),ctx);
    if(p.data.start_byte!==end||p.data.end_byte<=end&&!(p.data.complete&&end===0))throw new Error('chunk invariant');
    if(p.data.ref.space_id!==space||p.data.ref.revision!==ref.revision||type==='post'&&p.data.ref.post_id!==ref.post_id)throw new Error('fixed ref invariant');
    end=p.data.end_byte;parts.push(p.data.chunk);
    if(p.data.complete){const joined=parts.join('');if(Buffer.byteLength(joined)!==end)throw new Error('chunk UTF8 invariant');JSON.parse(joined);if(ref.document_sha256&&sha(joined)!==ref.document_sha256)throw new Error('fixed document invariant');return;}
    cursor=p.meta.next_cursor;if(!cursor)throw new Error('cursor invariant');
  }
  throw new Error('chain_incomplete_64pages');
}
async function operation(c,kind,index){
  const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),20000);
  const ctx={client:c.index,op:kind,op_id:`${c.index}-${index}`,attempt:0,signal:controller.signal};
  const started=now(),opPhase=phase;let outcome='success',code=null;
  try{await als.run(ctx,async()=>{
    const n=c.kindCounts[kind]=(c.kindCounts[kind]??0)+1;const budget=[4096,12288,65536][(n-1)%3];
    if(kind==='context'){
      ctx.cap=budget;const focus=n%2===0?choose(c.random,c.random()<0.8?manifest.threads.open:manifest.threads.archived):undefined;
      const r=await request(()=>c.api.getContext(space,{max_bytes:budget,focus_thread_id:focus},{signal:ctx.signal}),ctx);if(focus&&r.data.focus_thread?.id!==focus||!focus&&Object.hasOwn(r.data,'focus_thread'))throw new Error('focus invariant');
    }else if(kind==='read'){
      const r=c.random();if(r<0.5){let cursor;for(let page=0;page<3;page++){ctx.cap=budget;const p=await request(()=>c.api.getThreadPosts(space,chooseThread(c),{limit:50,max_bytes:budget,cursor},{signal:ctx.signal}),ctx);if(p.data.posts[0])c.refs.push({space_id:space,post_id:p.data.posts[0].id,revision:p.data.posts[0].current_revision});cursor=p.meta.next_cursor;if(!cursor)break;}}
      else if(r<0.85){const ref=c.refs.length&&c.random()<0.5?choose(c.random,c.refs):choose(c.random,manifest.post_refs);await content(c,ctx,'post',ref,budget);}
      else await content(c,ctx,'space',manifest.space_ref,budget);
    }else if(kind==='search'){
      const zh=c.random()<0.6;const category=zh?['zh1','zh2','zh3'][Math.floor(c.random()*3)]:'en';const q=choose(c.random,manifest.queries[category][c.random()<0.8?'hit':'miss']);ctx.query_category=category;
      const thread=c.random()<0.5?choose(c.random,manifest.threads.open):undefined;let cursor;
      for(let page=0;page<2;page++){const p=await request(()=>c.api.search(space,{q,thread_id:thread,limit:20,cursor},{signal:ctx.signal}),ctx);cursor=p.meta.next_cursor;if(!cursor)break;}
    }else if(kind==='create'||kind==='revision'){
      const key=`${runId}-${ctx.op_id}`;const body=postBody(ctx.op_id,c.random()<0.8?1024:8192,kind==='create'&&c.random()<0.2);
      const conflict=kind==='revision'&&c.random()<0.1;if(kind==='revision'){delete body.kind;body.expected_revision=conflict?c.revision-1:c.revision;ctx.expected_status=conflict?409:200;}
      const fn=()=>kind==='create'?c.api.createPost(space,c.write_thread_id,body,key,{signal:ctx.signal}):c.api.createPostRevision(space,c.revision_post_id,body,key,{signal:ctx.signal});
      let r;try{r=await request(fn,ctx);if(conflict)throw new Error('expected conflict invariant');}catch(e){if(conflict&&e.statusCode===409){outcome='expected_conflict';code=e.code;await logs['write-ledger'].write({schema_version:1,phase,client:c.index,op_id:ctx.op_id,key,payload_sha256:sha(body),expected_revision:body.expected_revision,request_id:ctx.last_request_id,outcome,status:409});return;}throw e;}
      if(kind==='revision')c.revision=r.data.revision?.revision??r.data.current_revision??r.data.post?.current_revision;
      if(!Number.isInteger(c.revision))throw new Error('revision response invariant');
      const responseSha=sha(r.data);await logs['write-ledger'].write({schema_version:1,phase,client:c.index,op_id:ctx.op_id,key,payload_sha256:sha(body),expected_revision:body.expected_revision??null,result_sha256:sha(r.data),ref:{space_id:space,post_id:r.data.post?.id??r.data.id,revision:r.data.revision?.revision??r.data.current_revision},request_id:ctx.last_request_id,replay:false});
      if(c.random()<0.05){ctx.replay=true;const replay=await request(fn,ctx);if(sha(replay.data)!==responseSha)throw new Error('replay invariant');await logs['write-ledger'].write({schema_version:1,phase,client:c.index,op_id:ctx.op_id,key,payload_sha256:sha(body),result_sha256:sha(replay.data),ref:{space_id:space,post_id:replay.data.post?.id??replay.data.id,revision:replay.data.revision?.revision??replay.data.current_revision},request_id:ctx.last_request_id,replay:true});}
    }else await consume(c,ctx);
  });}catch(e){outcome=kind==='search'&&e.statusCode===422&&e.code==='QUERY_TOO_BROAD'?'search_limit':'error';code=e.code??e.name;if(fatalError(e))stop(e.message);}
  finally{clearTimeout(timer);controllers.delete(controller);counts[kind]=(counts[kind]??0)+1;const record={schema_version:1,phase:opPhase,finish_phase:phase,client:c.index,op_id:ctx.op_id,logical_op:kind,start_ms:started,end_ms:now(),latency_ms:now()-started,outcome,code,query_category:ctx.query_category??null,attempts:ctx.attempt};opSamples.push(record);await logs.operations.write(record);}
}
function chooseThread(c){return c.readThread??=choose(c.random,manifest.threads.open);}
async function gate(label){
  if(options.gated!=='true')return;phase=label;const start=now();await logs.operations.write({schema_version:1,type:'gate_start',gate:label,t_ms:start});
  const file=join(dirname(resolve(options.runtime)),label+'.ok');
  while(now()-start<120000&&!failure){try{await stat(file);await logs.operations.write({schema_version:1,type:'gate_end',gate:label,t_ms:now(),elapsed_ms:now()-start,timeout:false});return;}catch(e){if(e.code!=='ENOENT')throw e;}await sleep(100);}
  await logs.operations.write({schema_version:1,type:'gate_end',gate:label,t_ms:now(),timeout:true});throw new Error(failure??label+'_gate_timeout');
}
async function initialize(label){
  await Promise.all(clients.map(c=>als.run({client:c.index,op:'initialize',op_id:`${label}-${c.index}`,attempt:0,cap:12288},async()=>{
    const page=await c.api.getContext(space,{max_bytes:12288});const checkpoint=decode(page.data.checkpoint_token);const requestId=als.getStore().last_request_id;
    if(checkpoint.actor_id!==c.actor_id||checkpoint.space_id!==space)throw new Error('checkpoint ownership invariant');
    const sub=await c.api.subscribe(space,{consumer_key:`${runId}-${label}-${c.index}`,start:'context_checkpoint',checkpoint_token:page.data.checkpoint_token},`${runId}-${label}-sub-${c.index}`);
    if(sub.data.consumer.ack_seq!==checkpoint.seq)throw new Error('checkpoint consumer invariant');c.consumer=sub.data.consumer.id;c.ackSeq=checkpoint.seq;c.delivered.clear();
    await logs['consumer-ledger'].write({schema_version:1,phase,client:c.index,type:'initialize',actor_id:c.actor_id,session_id:c.session_id,consumer_id:c.consumer,consumer_key:`${runId}-${label}-${c.index}`,checkpoint_sha256:sha(page.data.checkpoint_token),checkpoint:{actor_id:checkpoint.actor_id,space_id:checkpoint.space_id,seq:checkpoint.seq},context_request_id:requestId,subscribe_request_id:als.getStore().last_request_id,initial_ack_seq:c.ackSeq,filters:{thread_ids:[],event_types:[]}});
  })));
}
async function window(ms){
  const start=performance.now(),end=start+ms;
  await Promise.all(clients.map(async c=>{
    let tick=0,busy=null;
    while(performance.now()<end&&!failure){const due=start+c.index*25+tick*500;if(due>=end){await sleep(end-performance.now());break;}while(performance.now()<due)await sleep(due-performance.now());if(performance.now()>=end||failure)break;const skipped=Math.max(0,Math.floor((performance.now()-due)/500));if(skipped){tick+=skipped;c.missed+=skipped;c.missedByPhase[phase]=(c.missedByPhase[phase]??0)+skipped;}tick++;if(busy){c.missed++;c.missedByPhase[phase]=(c.missedByPhase[phase]??0)+1;continue;}
      if(!c.schedule.length)c.schedule=block(c.random);const kind=c.schedule.pop();const p=tracked(operation(c,kind,++c.intent));busy=p;p.finally(()=>{busy=null;}).catch(()=>{});
    }
  }));
}
try{
  if(await disk(dirname(db))<6*1024**3)throw new Error('disk_free_below_6GiB');
  child=fork(new URL('./run-server.mjs',import.meta.url),[db,space],{stdio:['ignore','pipe','pipe','ipc']});
  serverLog=await journal(join(out,'server-log.jsonl'));child.stderr.on('data',b=>void serverLog.write({stream:'stderr',text:b.toString()}));child.stdout.on('data',b=>void serverLog.write({stream:'stdout',text:b.toString()}));
  baseUrl=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('server start timeout')),10000);child.on('message',m=>{if(m.type==='resource')lastResource=m;if(m.type==='ready'){serverEnvironment=m.environment;clearTimeout(t);resolve(m.url);}});child.once('exit',code=>reject(new Error(`server exit ${code}`)));});
  for(const c of clients)c.api=new DetunedClient({baseUrl,token:runtime.tokens[c.index],maxRetries:0,timeoutMs:5000});
  await Promise.all(clients.map(c=>als.run({client:c.index,op:'credential_check',op_id:`me-${c.index}`,attempt:0},async()=>{const me=await c.api.getMe();if(me.data.actor.id!==c.actor_id||me.data.capabilities.includes('admin')||!me.data.capabilities.includes('read')||!me.data.capabilities.includes('write'))throw new Error('load credential ownership invariant');}))); 
  const config=await journal(join(out,'run-config.jsonl'));await config.write({schema_version:1,run_id:runId,mode,manifest_sha256:sha(rawManifest),space_id:space,clients:20,target_logical_rate:40,warmup_ms:warmup,measure_ms:duration,drain_ms:30000,catchup_ms:120000,seed:'detuned-c2-load-v1',server_pid:child.pid,node:process.version,lock_wait:'not_observed',longpoll_wait_ms:0,environment:{platform:platform(),release:release(),logical_cpu_count:cpus().length,cpu_model:cpus()[0]?.model,memory_total_bytes:totalmem(),load_average:loadavg(),server_sqlite:serverEnvironment,resource_control:'actual_host_uncontrolled',ssd:'not_verified'},runner_sha256:Object.fromEntries(await Promise.all(['run.mjs','run-support.mjs','run-server.mjs','run-prepare.mjs'].map(async file=>[file,sha(await readFile(new URL(file,import.meta.url),'utf8'))]))),manifest_counts:manifest.counts,seed_archive_bytes:seedArchiveBytes,combined_capacity_limit_bytes:8*1024**3,ratios:{context:20,read:20,search:20,create:10,revision:10,poll:20}});await config.close();
  timer=setInterval(()=>void tracked(resource()).catch(e=>stop(e.message)),1000);
  await writeFile(join(dirname(resolve(options.runtime)),'live.json'),JSON.stringify({schema_version:1,base_url:baseUrl,server_pid:child.pid,tokens:runtime.tokens,db_path:db,manifest:resolve(options.manifest),run_output:out})+'\n',{flag:'wx',mode:0o600});
  await gate('preflight');phase='warmup';await initialize('warmup');await window(warmup);await Promise.allSettled([...pending]);
  if(failure)throw new Error(failure);phase='setup';await initialize('measure');
  for(const c of clients){c.schedule=[];c.kindCounts={};}
  phase='measure';measurementStart=now();await logs.operations.write({type:'window_start',schema_version:1,t_ms:measurementStart,duration_ms:duration});
  const errorTimer=setInterval(()=>{const cutoff=now()-10000;while(recent[0]?.t<cutoff)recent.shift();if(now()-measurementStart>=10000&&recent.length&&recent.filter(x=>x.bad).length/recent.length>0.05)stop('unexpected_error_rate_above_5percent_10second_window');},1000);
  await window(duration);clearInterval(errorTimer);const measurementEnd=now();await logs.operations.write({type:'window_end',schema_version:1,t_ms:measurementEnd,elapsed_ms:measurementEnd-measurementStart});
  phase='drain';await within(Promise.allSettled([...pending]),30000);if(pending.size){stop('drain_timeout');for(const c of controllers)c.abort();await Promise.allSettled([...pending]);}
  if(failure)throw new Error(failure);
  const terminal=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('highwater timeout')),5000);const handler=m=>{if(m.type==='highwater'){clearTimeout(t);child.off('message',handler);resolve(m.seq);}};child.on('message',handler);child.send({type:'highwater'});});
  phase='catchup';const deadline=performance.now()+120000;
  await Promise.all(clients.map(async c=>{let batches=0;while(performance.now()<deadline){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);const ctx={client:c.index,op:'catchup',op_id:`catchup-${c.index}-${batches++}`,attempt:0,signal:controller.signal};try{const p=await als.run(ctx,()=>consume(c,ctx));if(!p.batch_id&&!p.has_more){if(c.ackSeq<terminal)throw new Error('catchup invariant below terminal');await logs['consumer-ledger'].write({schema_version:1,phase,client:c.index,type:'terminal',consumer_id:c.consumer,ack_seq:c.ackSeq,target_highwater:terminal,highwater_source:'server_readonly_MAX_space_seq_after_drain'});return;}}finally{clearTimeout(timeout);}}throw new Error('catchup_deadline');}));
  await gate('postflight');ended=true;
}catch(e){stop(e.message);await logs.operations.write({type:'fatal',schema_version:1,phase,t_ms:now(),message:e.message});}
finally{
  clearInterval(timer);for(const c of controllers)c.abort();await Promise.allSettled([...pending]);
  if(child?.connected){child.send({type:'close'});await within(new Promise(r=>child.once('exit',r)),10000);if(child.exitCode===null)child.kill('SIGTERM');}
  if(serverLog)await serverLog.close();globalThis.fetch=nativeFetch;
  const measured=samples.filter(s=>s.phase==='measure'), successful=measured.filter(s=>s.status>=200&&s.status<300);
  const percentiles=rows=>({n:rows.length,p50:percentile(rows.map(s=>s.latency_ms),.5),p95:percentile(rows.map(s=>s.latency_ms),.95),p99:percentile(rows.map(s=>s.latency_ms),.99)});
  const logical=opSamples.filter(o=>o.phase==='measure');
  const summary={schema_version:1,run_id:runId,mode,complete:ended&&!failure,failure,measurement_start_ms:measurementStart,measure_target_ms:duration,logical_operations:{all:percentiles(logical),success:percentiles(logical.filter(o=>o.outcome==='success')),by_kind:Object.fromEntries(['context','read','search','create','revision','poll'].map(kind=>[kind,{all:percentiles(logical.filter(o=>o.logical_op===kind)),success:percentiles(logical.filter(o=>o.logical_op===kind&&o.outcome==='success')),outcomes:logical.filter(o=>o.logical_op===kind).reduce((a,o)=>(a[o.outcome]=(a[o.outcome]??0)+1,a),{})}]))},all_attempts:percentiles(measured),success_attempts:percentiles(successful),endpoints:Object.fromEntries([...new Set(measured.map(s=>s.endpoint))].map(endpoint=>[endpoint,{all:percentiles(measured.filter(s=>s.endpoint===endpoint)),success:percentiles(successful.filter(s=>s.endpoint===endpoint))}])),short_search:{all:percentiles(measured.filter(s=>s.short_chinese_query)),success:percentiles(successful.filter(s=>s.short_chinese_query)),limited:percentiles(measured.filter(s=>s.short_chinese_query&&s.classification==='search_limit'))},requests:measured.length,success:successful.length,unexpected_errors:measured.filter(s=>s.status===null||s.status>=400&&s.status!==s.expected_status&&s.classification!=='search_limit').length,ordinary_http_ms:{p50:percentile(successful.map(s=>s.latency_ms),.5),p95:percentile(successful.map(s=>s.latency_ms),.95),p99:percentile(successful.map(s=>s.latency_ms),.99)},clients:clients.map(c=>({client:c.index,actor_id:c.actor_id,missed_ticks:c.missed,missed_ticks_by_phase:c.missedByPhase,measure_intents:logical.filter(o=>o.client===c.index).length,measure_logical_rate:logical.filter(o=>o.client===c.index).length/(duration/1000),intents:c.intent,kind_counts:c.kindCounts,consumer_id:c.consumer,final_ack_seq:c.ackSeq})),lock_wait:'not_observed'};
  const output=await journal(join(out,'summary.jsonl'));await output.write(summary);await output.close();await Promise.all(Object.values(logs).map(l=>l.close()));
  process.stdout.write(JSON.stringify({run_id:runId,out,complete:summary.complete,failure})+'\n');if(!summary.complete)process.exitCode=1;
}
