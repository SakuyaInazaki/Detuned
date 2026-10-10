#!/usr/bin/env node
// Optional fixed installed-native experiment; importing the fixture helpers starts no host.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReadStream,constants as fsConstants} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,fork,execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {DetunedClient} from '../../packages/client/dist/index.js';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const FIXED_BINARY='/opt/homebrew/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex';
const FIXED_SHA='80a3933d11a9d13ef806aa24f7bb8afc9169cfe4e9b09d6da6a92922cbde9cff';
import {nativeCheckNames,prepareOrdinaryCheckFixture,exerciseOrdinaryCheckBranches,createNativeInputWriter} from './claude-check-probe.mjs';
const safeFailure=()=>({status:'failed',code:'NATIVE_PROBE_FAILED'});
async function publishReport(output,value){const staging=output+'.stage-'+process.pid;let handle;try{handle=await fs.open(staging,'wx',0o600);await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();await handle.close();handle=null;await fs.link(staging,output);}finally{if(handle)await handle.close();await fs.unlink(staging).catch(()=>{});}}
async function hashFixedBinary(file){const digest=createHash('sha256');for await(const chunk of createReadStream(file,{highWaterMark:65536}))digest.update(chunk);return digest.digest('hex');}

// Actual production launcher: import-safe factory, fixed built entry, no arbitrary entry/code/env.
export function createTrustedCodexMcpLauncher({privateRoot,workEnd}){
 assert.equal(typeof privateRoot,'string');assert.ok(path.isAbsolute(privateRoot)&&!privateRoot.includes('\0'));assert.ok(Number.isSafeInteger(workEnd)&&workEnd>0);
 const registrationPrefix=path.join(privateRoot,'mcp-pid-'),ackPrefix=path.join(privateRoot,'mcp-ack-'),entry=path.join(repo,'packages/mcp/dist/index.js');
 return `const workEnd=${workEnd},ackEnd=Math.min(Date.now()+3000,workEnd);let deadline=setTimeout(()=>process.exit(1),Math.max(0,ackEnd-Date.now()));const fs=await import('node:fs/promises');const registration=${JSON.stringify(registrationPrefix)}+process.pid,staging=${JSON.stringify(path.join(privateRoot,'.mcp-pid-'))}+process.pid+'.stage';let handle;try{handle=await fs.open(staging,'wx',0o600);await handle.writeFile(String(process.pid));await handle.sync();await handle.close();handle=null;await fs.link(staging,registration);await fs.unlink(staging);}finally{if(handle)await handle.close();}let accepted=false;while(Date.now()<ackEnd){try{if(await fs.readFile(${JSON.stringify(ackPrefix)}+process.pid,'utf8')===String(process.pid)){accepted=true;break;}}catch{}await new Promise(r=>setTimeout(r,20));}if(!accepted)throw Error('Ownership not acknowledged');clearTimeout(deadline);deadline=setTimeout(()=>process.exit(1),Math.max(0,workEnd-Date.now()));deadline.unref();process.argv[1]=${JSON.stringify(entry)};await import(${JSON.stringify(pathToFileURL(entry).href)});`;
}

// Exact policy shared with D's independent guard; paths are trusted owned inputs only.
export function codexSandboxPolicy({home,owned,port,sentinel}) {
 assert.equal(typeof home,'string');assert.ok(Number.isSafeInteger(port)&&port>0&&port<=65535);
 for(const value of [home,owned,sentinel])assert.ok(typeof value==='string'&&path.isAbsolute(value)&&!/["\\\n\r]/.test(value));
 return `(version 1)\n(allow default)\n(deny network*)\n(allow network-outbound (remote ip "localhost:${port}"))\n(deny mach-lookup)\n(deny file-read* file-write* (subpath "${home}/.codex") (subpath "${home}/.claude") (literal "${home}/.claude.json") (subpath "${home}/.agents") (subpath "${home}/.pi") (subpath "${home}/.dsh") (subpath "${home}/.config") (subpath "${home}/Library/Keychains") (subpath "/Library/Keychains") (subpath "${home}/Library/Application Support/Codex") (subpath "${home}/Library/Application Support/Claude"))\n(deny file-write*)\n(allow file-write* (subpath "${owned}"))\n(deny file-read* file-write* (literal "${sentinel}"))\n`;
}
const safeError=error=>{
 const result={};if(['Error','AssertionError','TypeError','RangeError','SyntaxError','TimeoutError','DetunedError'].includes(error?.name))result.name=error.name;
 if(['ERR_ASSERTION','NATIVE_INPUT_FAILED','NATIVE_PROBE_DEADLINE','CANCELLED','EPERM','EACCES','EPIPE','ENOENT','ECONNRESET','ECONNREFUSED','ETIMEDOUT','VALIDATION_ERROR','NOT_FOUND','FORBIDDEN'].includes(error?.code))result.code=error.code;
 return result;
};
async function runNativeWorker({binary,owned}) {
 let app,db,native,forbidden,originalFailure,cleanupFailure,cancelled=false;const children=new Map(),sockets=new Map(),requests=[],flights=new Set();
 const end=workerStarted+75000,totalEnd=workerStarted+85000;
 const diagnostics={stages:[],methods:{},catalogue:{responses:0,last:null},startup:{count:0,last:null,states:{starting:0,ready:0,failed:0,cancelled:0,unknown:0}},guard:{allowed_hits:0,forbidden_hits:0},native:{actual_spawn:false,actual_close:null}};
 const report={status:'passed',fixed_version:'0.144.6',binary_sha256:FIXED_SHA,tools:[],checks:{},cleanup:{},diagnostics};
 const labels=new Set(['setup-begin','setup-done','guard-begin','guard-close','guard-pass','native-spawn-begin','native-actual-spawn','initialize-response','initialized-sent','thread-response','catalogue','matrix-invalid','matrix-create','matrix-log-receipt','matrix-reads','matrix-scope','matrix-invalidate','matrix-done','poll-begin','poll-close','catch','cleanup-begin','children-cleanup-done','business-cleanup-drain-begin','business-cleanup-drain-done','socket-cleanup-close-done','app-cleanup-done','db-cleanup-done','cleanup-done']);
 const stage=label=>{assert.ok(labels.has(label));if(diagnostics.stages.length<64)diagnostics.stages.push(label);if(process.connected)try{process.send({type:'progress',diagnostics},()=>{});}catch{}};
 const gate=()=>{if(Date.now()>=end)throw Object.assign(Error('Probe deadline'),{code:'NATIVE_PROBE_DEADLINE'});if(cancelled)throw Object.assign(Error('Probe cancelled'),{code:'CANCELLED'});};
 const track=child=>{const state={closed:false,error:false};state.promise=new Promise(resolve=>{child.on('error',()=>{state.error=true;});child.once('close',(code,signal)=>{Object.assign(state,{closed:true,code,signal});resolve(state);});});children.set(child,state);return child;};
 const kill=(child,signal)=>{if(Number.isSafeInteger(child.pid)&&child.pid>1)try{child.kill(signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
 const cancel=()=>{cancelled=true;for(const[child,state]of children)if(!state.closed){try{kill(child,'SIGTERM');}catch{}setTimeout(()=>{if(!state.closed)try{kill(child,'SIGKILL');}catch{}},1000).unref();}};
 const close=async child=>{const state=children.get(child);if(!state.closed){kill(child,'SIGTERM');const timer=setTimeout(()=>{if(!state.closed)try{kill(child,'SIGKILL');}catch{}},1000);try{await withinDeadline(state.promise,totalEnd-Date.now());}finally{clearTimeout(timer);}}assert.ok(state.closed);return state;};
 const bounded=async promise=>{const task=Promise.resolve(promise);flights.add(task);task.then(()=>flights.delete(task),()=>flights.delete(task));gate();const value=await withinDeadline(task,end-Date.now());gate();return value;};
 const workTimer=setTimeout(cancel,Math.max(0,end-Date.now()));const hardTimer=setTimeout(()=>{cancel();process.exit(1);},Math.max(0,totalEnd-Date.now()));
 process.once('disconnect',cancel);process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
 try {
 stage('setup-begin');gate();
 const require=createRequire(path.join(repo,'package.json')),Database=require('better-sqlite3');
 const {bootstrapDatabase,SqliteStorage}=await bounded(import('../../packages/storage-sqlite/dist/index.js'));
 const {buildApp,ArtifactFileStore}=await bounded(import('../../packages/server/dist/index.js'));
 db=new Database(path.join(owned,'forum.sqlite'));const bootstrap=bootstrapDatabase(db);const storage=new SqliteStorage(db,{dataDir:owned}),blobs=await bounded(ArtifactFileStore.create(owned));
 app=buildApp({storage,artifactBlobs:blobs,writeRateLimits:{per_minute:60000,burst:10000}});
 app.server.on('connection',socket=>{const closed=new Promise(resolve=>socket.once('close',()=>{sockets.delete(socket);resolve();}));sockets.set(socket,closed);});
 app.addHook('onRequest',async req=>{requests.push({method:req.method,path:req.url.split('?')[0]});if(req.url.split('?')[0]==='/api/v1/health/live')diagnostics.guard.allowed_hits++;});
 await bounded(app.listen({host:'127.0.0.1',port:0}));const port=app.server.address().port,url=`http://127.0.0.1:${port}`;
 const admin=new DetunedClient({baseUrl:url,token:bootstrap.adminToken,maxRetries:0,timeoutMs:2000}),fixture=await bounded(prepareOrdinaryCheckFixture(admin,url));
 const cwd=path.join(owned,'empty-cwd'),codexProbeStateDir=path.join(owned,'codex-state'),sqlite=path.join(owned,'native-sqlite'),logs=path.join(owned,'native-logs');
 for(const directory of [cwd,codexProbeStateDir,sqlite,logs])await bounded(fs.mkdir(directory,{mode:0o700}));
 await bounded(fs.writeFile(path.join(codexProbeStateDir,'config.toml'),`cli_auth_credentials_store = "file"\nsqlite_home = ${JSON.stringify(sqlite)}\nlog_dir = ${JSON.stringify(logs)}\n`,{flag:'wx',mode:0o600}));
 const tokenfile=path.join(owned,'forum-token');await bounded(fs.writeFile(tokenfile,fixture.token,{flag:'wx',mode:0o600}));
 const launcher=path.join(owned,'mcp-launcher.mjs');
 await bounded(fs.writeFile(launcher,createTrustedCodexMcpLauncher({privateRoot:owned,workEnd:end}),{flag:'wx',mode:0o600}));
 stage('setup-done');gate();
 forbidden=createServer((_req,response)=>{diagnostics.guard.forbidden_hits++;response.end('owned negative');});await bounded(new Promise(resolve=>forbidden.listen(0,'127.0.0.1',resolve)));
 const sentinel=path.join(owned,'forbidden-sentinel');await bounded(fs.writeFile(sentinel,'negative',{flag:'wx',mode:0o600}));const home=process.env.HOME;
 const profile=path.join(owned,'guard.sb'),policy=codexSandboxPolicy({home,owned,port,sentinel});await bounded(fs.writeFile(profile,policy,{flag:'wx',mode:0o600}));report.profile_sha256=sha(Buffer.from(policy));
 const guardfile=path.join(owned,'guard-check.cjs');await bounded(fs.writeFile(guardfile,`const http=require('node:http'),fs=require('node:fs');const get=port=>new Promise(r=>{const q=http.get({host:'127.0.0.1',port,path:'/api/v1/health/live'},s=>{s.resume();s.on('end',()=>r('allowed'));});q.on('error',e=>r(e.code));});(async()=>{let sentinel;try{fs.readFileSync(${JSON.stringify(sentinel)});sentinel='allowed';}catch(e){sentinel=e.code;}console.log(JSON.stringify({allowed:await get(${port}),forbidden:await get(${forbidden.address().port}),sentinel}));})();`,{flag:'wx',mode:0o600}));
 stage('guard-begin');gate();const guard=track(spawn('/usr/bin/sandbox-exec',['-f',profile,process.execPath,guardfile],{cwd,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin'},stdio:['ignore','pipe','ignore']}));
 let guardText='',guardExpired=false;guard.stdout.setEncoding('utf8');guard.stdout.on('data',text=>{guardText+=text;if(Buffer.byteLength(guardText)>4096)kill(guard,'SIGKILL');});
 const gt=setTimeout(()=>{guardExpired=true;kill(guard,'SIGKILL');},3000);let gs;try{gs=await bounded(children.get(guard).promise);}finally{clearTimeout(gt);}
 diagnostics.guard.actual_close={code:Number.isSafeInteger(gs.code)?gs.code:null,signal:['SIGTERM','SIGKILL','SIGABRT','SIGSEGV'].includes(gs.signal)?gs.signal:null,expired:guardExpired,spawn_error:gs.error};stage('guard-close');
 const parsed=JSON.parse(guardText);for(const key of ['allowed','forbidden','sentinel'])if(['allowed','EPERM','EACCES'].includes(parsed[key]))diagnostics.guard[key]=parsed[key];
 assert.equal(gs.code,0);assert.equal(parsed.allowed,'allowed');assert.ok(['EPERM','EACCES'].includes(parsed.forbidden));assert.ok(['EPERM','EACCES'].includes(parsed.sentinel));stage('guard-pass');
 stage('native-spawn-begin');gate();native=track(spawn('/usr/bin/sandbox-exec',['-f',profile,binary,'-c','cli_auth_credentials_store="file"','-c',`sqlite_home=${JSON.stringify(sqlite)}`,'-c',`log_dir=${JSON.stringify(logs)}`,'app-server','--stdio'],{cwd,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin',CI:'true',HOME:home,CODEX_HOME:codexProbeStateDir},detached:false,stdio:['pipe','pipe','pipe']}));
 native.once('spawn',()=>{diagnostics.native.actual_spawn=true;stage('native-actual-spawn');});native.stderr.resume();await bounded(registerNative(native));
 const writer=createNativeInputWriter(native),responses=new Map();let buffer='',bytes=0,serial=0,ownedThreadId;const pendingStartup=[];
 const recordStartup=params=>{
  if(params?.name!=='detuned'||typeof ownedThreadId!=='string'||params.threadId!==ownedThreadId||diagnostics.startup.count>=40)return;
  const status=['starting','ready','failed','cancelled'].includes(params.status)?params.status:'unknown';
  const failureReason=params.failureReason===undefined||params.failureReason===null?'none':params.failureReason==='reauthenticationRequired'?'reauthenticationRequired':'unknown';
  diagnostics.startup.count++;diagnostics.startup.states[status]++;diagnostics.startup.last={status,failure_reason:failureReason};
 };
 native.stdout.setEncoding('utf8');native.stdout.on('data',text=>{bytes+=Buffer.byteLength(text);if(bytes>1048576){cancel();return;}buffer+=text;let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);try{const value=JSON.parse(line);if(Number.isSafeInteger(value.id)&&value.id===serial)responses.set(value.id,value);
   if(value.method==='mcpServer/startupStatus/updated'&&value.params?.name==='detuned'){
    if(ownedThreadId===undefined){if(pendingStartup.length<40&&typeof value.params.threadId==='string')pendingStartup.push({name:'detuned',threadId:value.params.threadId,status:['starting','ready','failed','cancelled'].includes(value.params.status)?value.params.status:'unknown',failureReason:value.params.failureReason===undefined||value.params.failureReason===null?null:value.params.failureReason==='reauthenticationRequired'?'reauthenticationRequired':'unknown'});}
    else recordStartup(value.params);
   }
  }catch{cancel();}}});
 const valueShape=value=>value===undefined?'absent':value===null?'null':Array.isArray(value)?'array':typeof value==='object'?'object':'other';
 const summarizeCatalogue=status=>{
  const data=Array.isArray(status?.data)?status.data:[],matches=data.filter(value=>value?.name==='detuned'),tools=matches[0]?.tools;
  const values=valueShape(tools)==='object'?Object.values(tools):[],present=new Set();let unexpectedCount=0;
  for(const tool of values){if(typeof tool?.name==='string'&&nativeCheckNames.includes(tool.name))present.add(tool.name);else unexpectedCount++;}
  return {response_shape:valueShape(status),data_shape:valueShape(status?.data),data_count:data.length,detuned_match_count:matches.length,tools_shape:valueShape(tools),tool_count:values.length,present_expected:nativeCheckNames.filter(name=>present.has(name)),missing_expected:nativeCheckNames.filter(name=>!present.has(name)),unexpected_count:unexpectedCount,next_cursor_present:status?.nextCursor!==undefined&&status?.nextCursor!==null};
 };
 const methods=new Set(['initialize','initialized','thread/start','mcpServerStatus/list','mcpServer/tool/call']);
 const rpc=async(method,params)=>{gate();assert.ok(methods.has(method)&&method!=='initialized');const id=++serial;diagnostics.methods[method]=(diagnostics.methods[method]??0)+1;await bounded(writer.write(JSON.stringify({id,method,params})+'\n'));const deadline=Math.min(Date.now()+15000,end);while(!responses.has(id)&&!children.get(native).closed&&Date.now()<deadline){gate();writer.assertHealthy();await pause(20);}gate();writer.assertHealthy();const response=responses.get(id);responses.delete(id);if(!response)throw Object.assign(Error('RPC deadline'),{code:'NATIVE_PROBE_DEADLINE'});if(response.error){diagnostics.rpc_rejected=true;if(Number.isSafeInteger(response.error.code))diagnostics.rpc_error_code=response.error.code;throw Error('RPC rejected');}assert.ok(response.result!==undefined);return response.result;};
 await rpc('initialize',{clientInfo:{name:'private-detuned-probe',version:'1'},capabilities:{experimentalApi:true}});stage('initialize-response');diagnostics.methods.initialized=1;await bounded(writer.write(JSON.stringify({method:'initialized'})+'\n'));stage('initialized-sent');
 const started=await rpc('thread/start',{cwd,ephemeral:true,config:{mcp_servers:{detuned:{command:process.execPath,args:[launcher],env:{DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:tokenfile,DETUNED_MCP_INPUT_MODE:'wrapped'}}}}});assert.equal(typeof started.thread?.id,'string');const threadId=started.thread.id;ownedThreadId=threadId;for(const notification of pendingStartup)recordStartup(notification);pendingStartup.length=0;stage('thread-response');
 let server;for(let attempt=0;attempt<40;attempt++){const status=await rpc('mcpServerStatus/list',{threadId,detail:'toolsAndAuthOnly'});diagnostics.catalogue.responses++;diagnostics.catalogue.last=summarizeCatalogue(status);server=status.data?.find(value=>value.name==='detuned');if(server&&Object.keys(server.tools??{}).length)break;await bounded(pause(100));}
 const names=Object.values(server?.tools??{}).map(tool=>tool.name).sort();assert.deepEqual(names,nativeCheckNames);report.tools=[...nativeCheckNames];stage('catalogue');
 const call=async(name,args)=>{const response=await rpc('mcpServer/tool/call',{threadId,server:'detuned',tool:name,arguments:{input:args}});if(response.isError){let code=response.structuredContent?.error?.code;if(!code)for(const part of response.content??[])if(part.type==='text')try{code=JSON.parse(part.text).error?.code;}catch{}return{ok:false,code};}assert.ok(response.structuredContent&&'result'in response.structuredContent);return{ok:true,value:response.structuredContent.result};};
 report.checks=await bounded(exerciseOrdinaryCheckBranches(call,fixture,()=>requests.length,stage));stage('matrix-done');stage('poll-begin');
 const pending=(await bounded(fixture.ordinary.subscribe(fixture.space,{consumer_key:'codex-pending',start:'beginning'},'codex-subscribe'))).data.consumer;
 const batch=(await bounded(fixture.ordinary.poll(fixture.space,pending.id,{limit:1}))).data;assert.ok(batch.batch_id);const beforeAck=requests.filter(value=>value.path.endsWith('/ack')).length;
 const waiting=(await bounded(fixture.ordinary.subscribe(fixture.space,{consumer_key:'codex-waiting',start:'now'},'codex-waiting'))).data.consumer;
 const flight=call('forum_poll',{space_id:fixture.space,consumer_id:waiting.id,limit:1,wait_ms:25000}),settled=flight.then(()=>undefined,()=>undefined);
 const waitUntil=Math.min(end,Date.now()+3000);while(!requests.some(value=>value.path.endsWith('/consumers/'+waiting.id+'/poll'))&&Date.now()<waitUntil)await bounded(pause(20));assert.ok(requests.some(value=>value.path.endsWith('/consumers/'+waiting.id+'/poll')));
 native.stdin.end();await close(native);await bounded(settled);stage('poll-close');
 assert.deepEqual((await bounded(fixture.ordinary.poll(fixture.space,pending.id,{limit:1}))).data,batch);assert.equal(requests.filter(value=>value.path.endsWith('/ack')).length,beforeAck);report.checks.ack_delta=0;report.checks.pending_unchanged=true;report.checks.cancelled=true;
 }catch(error){originalFailure=error;diagnostics.error=safeError(error);stage('catch');}finally{
 cancelled=true;stage('cleanup-begin');const attempt=async(action,done)=>{try{await withinDeadline(Promise.resolve().then(action),totalEnd-Date.now());done();}catch(error){cleanupFailure??=error;}};
 report.cleanup={flights_settled:false,children_closed:false,forbidden_closed:forbidden===undefined,app_closed:app===undefined,db_closed:db===undefined};
 for(const child of children.keys())await attempt(()=>close(child),()=>{});report.cleanup.children_closed=[...children.values()].every(value=>value.closed);if(report.cleanup.children_closed)stage('children-cleanup-done');
 await attempt(()=>Promise.allSettled([...flights]),()=>{report.cleanup.flights_settled=flights.size===0;});
 if(native){const state=children.get(native);diagnostics.native.actual_close=state.closed?{code:Number.isSafeInteger(state.code)?state.code:null,signal:['SIGTERM','SIGKILL','SIGABRT','SIGSEGV'].includes(state.signal)?state.signal:null,spawn_error:state.error}:null;}
 if(forbidden)await attempt(()=>new Promise((resolve,reject)=>forbidden.close(error=>error?reject(error):resolve())),()=>{report.cleanup.forbidden_closed=true;});
 if(app)await attempt(async()=>{assert.equal(report.cleanup.flights_settled,true);stage('business-cleanup-drain-begin');app.detunedBeginDraining();await app.runtimeResources.waitForIdle();assert.equal(app.runtimeResources.activeCount,0);diagnostics.active_count=0;stage('business-cleanup-drain-done');const remaining=[...sockets.entries()];for(const[socket]of remaining)socket.destroy();await Promise.all(remaining.map(([,closed])=>closed));assert.equal(sockets.size,0);diagnostics.open_connections=0;stage('socket-cleanup-close-done');await app.close();},()=>{report.cleanup.app_closed=true;stage('app-cleanup-done');});
 if(db)await attempt(()=>db.close(),()=>{report.cleanup.db_closed=true;stage('db-cleanup-done');});
 clearTimeout(workTimer);clearTimeout(hardTimer);process.off('disconnect',cancel);process.off('SIGINT',cancel);process.off('SIGTERM',cancel);stage('cleanup-done');
 if(originalFailure||cleanupFailure){report.status='failed';report.code='NATIVE_PROBE_FAILED';diagnostics.error=safeError(originalFailure??cleanupFailure);}
 }
 return report;
}

let workerStarted=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function withinDeadline(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const error=Error('Native probe deadline');error.code='NATIVE_PROBE_DEADLINE';reject(error);},Math.max(0,ms));})]);}finally{clearTimeout(timer);}}
async function queryOwnedProcess(pid,phase=()=>{}){phase('query-pid');assert.ok(Number.isSafeInteger(pid)&&pid>1);phase('query-exec');const value=await new Promise((resolve,reject)=>execFile('/bin/ps',['-p',String(pid),'-o','uid=,pgid='],{timeout:1000,maxBuffer:128},(error,stdout)=>error?reject(error):resolve(stdout)));const match=/^\s*(\d+)\s+(\d+)\s*$/.exec(value);phase('query-format');assert.ok(match);const uid=Number(match[1]),pgid=Number(match[2]);phase('query-uid');assert.equal(uid,process.getuid());phase('query-pgid');assert.ok(Number.isSafeInteger(pgid)&&pgid>1);return pgid;}
// This helper proves facts only: it never acknowledges, imports or signals a candidate.
export async function proveCodexMcpOwnership({candidatePID,nativePID,workerPGID},phase=()=>{}) {
 phase('query-pid');for(const value of [candidatePID,nativePID,workerPGID])assert.ok(Number.isSafeInteger(value)&&value>1);
 phase('query-exec');const text=await new Promise((resolve,reject)=>execFile('/bin/ps',['-p',String(candidatePID),'-o','uid=,ppid=,pgid='],{timeout:1000,maxBuffer:128},(error,stdout)=>error?reject(error):resolve(stdout)));
 phase('query-format');const match=/^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(text);assert.ok(match);
 const uid=Number(match[1]),ppid=Number(match[2]),pgid=Number(match[3]);phase('query-uid');assert.equal(uid,process.getuid());
 phase('query-parent');assert.ok(Number.isSafeInteger(ppid)&&ppid>1);assert.equal(ppid,nativePID);
 phase('query-pgid');assert.ok(Number.isSafeInteger(pgid)&&pgid>1);phase('group-match');assert.ok(pgid===workerPGID||pgid===candidatePID);
 return Object.freeze({pid:candidatePID,uid,ppid,pgid,placement:pgid===workerPGID?'worker':'independent'});
}
async function registerNative(child){await withinDeadline(new Promise((resolve,reject)=>{const listener=value=>{if(value?.type==='native_ack'){process.off('message',listener);resolve();}else if(value?.type==='abort'){process.off('message',listener);reject(Error('Ownership aborted'));}};process.on('message',listener);process.send({type:'native_register',pid:child.pid},error=>{if(error){process.off('message',listener);reject(Error('Ownership IPC failed'));}});}),3000);}
export async function runCodexCheckProbe({binary,output,onOwnership}){
 const began=Date.now(),workEnd=began+75000,end=began+85000,emergencyEnd=began+90000;let allocatedRoot,privateRoot,initializer,initializerSettled=false,worker,workerState,workerPID,workerPGID,nativePID,report,liveDiagnostics,originalFailure,ownershipFailure,mcpWatch;let finished=false,terminal=false,bootstrapSent=false,forkPidPresent=false,forkPidValid=false,mcpConfirmed=false,mcpAcknowledged=false,mcpCandidateObserved=false,mcpSameGroup=false,mcpParentVerified=false,mcpPlacement='unconfirmed',mcpPhase='not-received';const registrationTasks=new Set(),mcpCandidates=new Set(),confirmedMcpGroups=new Set(),mcpRows=new Map();let mcpCoverage=true,mcpCoverageReason='complete';
 const gate=()=>{if(terminal||Date.now()>=workEnd){const error=Error('Supervisor terminal');error.code='NATIVE_PROBE_DEADLINE';throw error;}};
 const observe=async value=>{gate();if(onOwnership)await withinDeadline(Promise.race([Promise.resolve().then(()=>{gate();return onOwnership(Object.freeze(value));}),interrupted]),end-Date.now());gate();};
 const groupExists=pgid=>{assert.ok(Number.isSafeInteger(pgid)&&pgid>1);try{process.kill(-pgid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
 const stopGroup=async pgid=>{if(pgid===undefined)return;assert.ok(Number.isSafeInteger(pgid)&&pgid>1);try{process.kill(-pgid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}const grace=Math.min(Date.now()+1000,emergencyEnd);while(groupExists(pgid)&&Date.now()<grace)await pause(20);if(groupExists(pgid)){try{process.kill(-pgid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}}while(groupExists(pgid)&&Date.now()<emergencyEnd)await pause(20);assert.equal(groupExists(pgid),false);};
 const coverageFailure=reason=>{mcpCoverage=false;mcpCoverageReason=reason;throw Error('MCP registration coverage incomplete');};
 const discoverMcp=async authorize=>{
  let directory;try{try{directory=await fs.opendir(privateRoot);}catch{coverageFailure('directory-read');}let entries=0;const seen=new Set();while(true){let entry;try{entry=await directory.read();}catch{coverageFailure('directory-read');}if(!entry)break;if(++entries>256)coverageFailure('directory-limit');if(!entry.name.startsWith('mcp-pid'))continue;
   const match=/^mcp-pid-([1-9][0-9]{0,9})$/.exec(entry.name);if(!match)coverageFailure('registration-name');const pid=Number(match[1]);if(!Number.isSafeInteger(pid)||pid<=1)coverageFailure('registration-name');seen.add(pid);
   if(!mcpCandidates.has(pid)){if(mcpCandidates.size>=64)coverageFailure('candidate-limit');mcpCandidates.add(pid);mcpRows.set(pid,{observed:false,proven:false,confirmedObserver:false,authorized:false,acknowledged:false});}
   let handle;try{handle=await fs.open(path.join(privateRoot,entry.name),fsConstants.O_RDONLY|fsConstants.O_NOFOLLOW);const info=await handle.stat();if(!info.isFile()||info.uid!==process.getuid()||(info.mode&0o777)!==0o600||info.size<1||info.size>10)coverageFailure('registration-file');const stored=mcpRows.get(pid);if(stored.registration&&(stored.registration.dev!==info.dev||stored.registration.ino!==info.ino))coverageFailure('registration-changed');stored.registration={dev:info.dev,ino:info.ino};const buffer=Buffer.alloc(11),read=await handle.read(buffer,0,11,0);if(read.bytesRead!==info.size||buffer.subarray(0,read.bytesRead).toString('utf8')!==match[1])coverageFailure('registration-content');}catch(error){if(mcpCoverage){mcpCoverage=false;mcpCoverageReason='registration-read';}throw error;}finally{if(handle)try{await handle.close();}catch{coverageFailure('registration-close');}}
   const row=mcpRows.get(pid);if(row.acknowledged||!authorize)continue;gate();mcpPhase='candidate-observe';await observe({stage:'mcp_spawned',privateRoot,workerPID:worker.pid,workerPGID,nativePID,mcpPID:pid});row.observed=true;mcpCandidateObserved=true;gate();
   const proof=await proveCodexMcpOwnership({candidatePID:pid,nativePID,workerPGID},value=>{mcpPhase=value;});row.proven=true;row.proof=proof;gate();mcpPhase='confirmed-observe';await observe({stage:'mcp_registered',privateRoot,workerPID:worker.pid,workerPGID,nativePID,mcpPID:pid,mcpPGID:proof.pgid,mcpParentPID:proof.ppid,mcpPlacement:proof.placement});row.confirmedObserver=true;gate();confirmedMcpGroups.add(proof.pgid);row.authorized=true;mcpPhase='ack-write';await fs.writeFile(path.join(privateRoot,'mcp-ack-'+pid),String(pid),{flag:'wx',mode:0o600});row.acknowledged=true;gate();mcpPhase='acknowledged';
  }if([...mcpCandidates].some(pid=>!seen.has(pid)))coverageFailure('registration-missing');}catch(error){if(mcpCoverage&&!authorize){mcpCoverage=false;mcpCoverageReason='discovery-failed';}throw error;}finally{if(directory)try{await directory.close();}catch{coverageFailure('directory-close');}}
 };
 let rejectSignal;const interrupted=new Promise((_,reject)=>{rejectSignal=reject;});const onSignal=()=>{terminal=true;rejectSignal(Error('Supervisor interrupted'));};process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
 let deadline;try{
  initializer=(async()=>{gate();const canonicalBinary=await fs.realpath(binary);gate();assert.equal(canonicalBinary,FIXED_BINARY);const stat=await fs.stat(binary);gate();assert.ok(stat.isFile());assert.equal(stat.size,260472144);const binaryHash=await hashFixedBinary(binary);gate();assert.equal(binaryHash,FIXED_SHA);try{await fs.lstat(output);gate();throw Error('Output exists');}catch(error){if(error.code!=='ENOENT')throw error;}gate();
   gate();allocatedRoot=await fs.mkdtemp(path.join(tmpdir(),'detuned-codex-checks-'));gate();privateRoot=await fs.realpath(allocatedRoot);gate();const rootInfo=await fs.lstat(privateRoot);gate();assert.ok(rootInfo.isDirectory()&&!rootInfo.isSymbolicLink());assert.equal(rootInfo.mode&0o777,0o700);assert.equal(rootInfo.uid,process.getuid());await observe({stage:'root_registered',privateRoot});gate();
   gate();worker=fork(fileURLToPath(import.meta.url),['--binary',binary,'--output',output],{detached:true,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin',CI:'true',HOME:process.env.HOME},stdio:['ignore','ignore','ignore','ipc']});forkPidPresent=worker.pid!==undefined;forkPidValid=Number.isSafeInteger(worker.pid)&&worker.pid>1;workerPID=forkPidValid?worker.pid:undefined;workerState={closed:false};workerState.promise=new Promise(resolve=>{worker.on('error',error=>{workerState.error=true;originalFailure??=error;terminal=true;rejectSignal(error);});worker.once('close',(code,signal)=>{Object.assign(workerState,{closed:true,code,signal});resolve();});});
   worker.on('message',message=>{if(message?.type==='progress'){liveDiagnostics=message.diagnostics;return;}if(message?.type==='result'){report=message.report;return;}if(message?.type!=='native_register')return;
    const registration=(async()=>{gate();assert.equal(nativePID,undefined);const pid=message.pid;assert.ok(Number.isSafeInteger(pid)&&pid>1);const actualGroup=await queryOwnedProcess(pid);gate();assert.equal(actualGroup,workerPGID);nativePID=pid;await observe({stage:'native_registered',privateRoot,workerPID:worker.pid,workerPGID,nativePID});gate();worker.send({type:'native_ack'});
     mcpWatch=(async()=>{while(!finished&&!workerState.closed&&Date.now()<end){gate();await discoverMcp(true);await pause(20);}})();mcpWatch.catch(error=>{ownershipFailure??=error;if(worker.connected)worker.send({type:'abort'});});
    })();registrationTasks.add(registration);registration.then(()=>registrationTasks.delete(registration),error=>{registrationTasks.delete(registration);ownershipFailure??=error;if(worker.connected)worker.send({type:'abort'});});
   });
   assert.ok(forkPidValid);await observe({stage:'worker_spawned',privateRoot,workerPID});gate();const actualWorkerGroup=await queryOwnedProcess(workerPID);gate();assert.equal(actualWorkerGroup,workerPID);workerPGID=actualWorkerGroup;await observe({stage:'worker_registered',privateRoot,workerPID,workerPGID});gate();bootstrapSent=true;worker.send({type:'bootstrap',binary,privateRoot,began});
  })();initializer=initializer.catch(async error=>{if(terminal&&allocatedRoot&&!worker){await withinDeadline(fs.rm(privateRoot??allocatedRoot,{recursive:true,force:true}),Math.max(1,emergencyEnd-Date.now())).catch(()=>{});}throw error;});initializer.then(()=>{initializerSettled=true;},()=>{initializerSettled=true;});
  await withinDeadline(Promise.race([(async()=>{await initializer;gate();
   deadline=setTimeout(()=>{if(worker.connected)worker.send({type:'abort'});},Math.max(0,workEnd-Date.now()));await workerState.promise;finished=true;if(mcpWatch)await mcpWatch;if(ownershipFailure)throw ownershipFailure;assert.equal(workerState.code,0);assert.equal(workerState.signal,null);assert.ok(report);if(report.status!=='passed')throw Error('Native worker reported failure');
  })(),interrupted]),end-Date.now());
 }catch(error){originalFailure??=error;terminal=true;}finally{
  terminal=true;rejectSignal(Error('Supervisor cleanup'));finished=true;clearTimeout(deadline);process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);let cleanupFailure;
  const attempt=async action=>{try{await withinDeadline(action(),emergencyEnd-Date.now());}catch(error){cleanupFailure??=error;}};
  if(worker?.connected)await attempt(()=>new Promise((resolve,reject)=>worker.send({type:'abort'},error=>error?reject(error):resolve())));
  if(registrationTasks.size)await attempt(()=>Promise.allSettled([...registrationTasks]));if(mcpWatch)await attempt(()=>mcpWatch.catch(()=>{}));
  for(const pgid of new Set([...confirmedMcpGroups,...(workerPGID===undefined?[]:[workerPGID])]))await attempt(()=>stopGroup(pgid));
  if(worker&&!workerState.closed){await attempt(async()=>{if(forkPidValid)worker.kill('SIGTERM');await withinDeadline(workerState.promise,Math.min(1000,emergencyEnd-Date.now())).catch(()=>{});if(!workerState.closed){if(forkPidValid)worker.kill('SIGKILL');await workerState.promise;}});}
  if(initializer)await attempt(()=>initializer.catch(()=>{}));if(registrationTasks.size)await attempt(()=>Promise.allSettled([...registrationTasks]));if(mcpWatch)await attempt(()=>mcpWatch.catch(()=>{}));if(privateRoot)await attempt(()=>discoverMcp(false));
  const workerClosed=initializerSettled&&(worker===undefined||workerState?.closed===true);let nativeClosed=false,groupProbe='unknown',groupProbeCode;
  if(initializerSettled){if(worker===undefined){nativeClosed=true;groupProbe='not_created';}else if(workerPGID===undefined){groupProbe='not_confirmed';}else{await attempt(async()=>{try{nativeClosed=!groupExists(workerPGID);groupProbe=nativeClosed?'absent':'present';}catch(error){nativeClosed=false;groupProbe='unknown';if(['EPERM','EACCES','ESRCH'].includes(error.code))groupProbeCode=error.code;throw error;}});}}
  let confirmedMcpGroupsAbsent=false,mcpGroupProbe='unknown';
  await attempt(async()=>{for(const pgid of confirmedMcpGroups){if(groupExists(pgid)){mcpGroupProbe='present';throw Error('Confirmed MCP group remains');}}confirmedMcpGroupsAbsent=true;mcpGroupProbe=confirmedMcpGroups.size?'absent':'not-confirmed';});
  // Candidate existence checks never authorize a signal or a different process group.
  let mcpCandidatesAbsent=false,mcpCandidateProbe='unknown',mcpCandidateProbeCode;
  await attempt(async()=>{for(const pid of mcpCandidates){assert.ok(Number.isSafeInteger(pid)&&pid>1);let absent=false;while(Date.now()<emergencyEnd){try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH'){absent=true;break;}if(['EPERM','EACCES'].includes(error.code))mcpCandidateProbeCode=error.code;throw error;}await pause(Math.min(20,Math.max(0,emergencyEnd-Date.now())));}if(!absent){mcpCandidateProbe='present';throw Error('MCP candidate remains');}}mcpCandidatesAbsent=true;mcpCandidateProbe=mcpCandidates.size?'absent':'not-received';});
  let removed=false;const rootSafeToRemove=mcpCoverage&&workerClosed&&(nativeClosed||!bootstrapSent)&&mcpCandidatesAbsent&&confirmedMcpGroupsAbsent;
  if((privateRoot??allocatedRoot)&&rootSafeToRemove)await attempt(async()=>{const cleanupRoot=privateRoot??allocatedRoot;await fs.rm(cleanupRoot,{recursive:true,force:true});try{await fs.lstat(cleanupRoot);throw Error('Private root remains');}catch(error){if(error.code!=='ENOENT')throw error;}removed=true;});
  const rows=[...mcpRows.values()],candidateCount=mcpCandidates.size,observedCount=rows.filter(row=>row.observed).length,provenCount=rows.filter(row=>row.proven).length,confirmedObserverCount=rows.filter(row=>row.confirmedObserver).length,acknowledgedCount=rows.filter(row=>row.acknowledged).length,authorizedCount=rows.filter(row=>row.authorized).length;
  const all=count=>mcpCoverage&&candidateCount>0&&count===candidateCount;mcpCandidateObserved=all(observedCount);mcpParentVerified=all(provenCount);mcpConfirmed=all(authorizedCount);mcpAcknowledged=all(acknowledgedCount);mcpSameGroup=all(provenCount)&&rows.every(row=>row.proof.placement==='worker');mcpPlacement=!all(provenCount)?'unconfirmed':rows.every(row=>row.proof.placement==='worker')?'worker':rows.every(row=>row.proof.placement==='independent')?'independent':'mixed';
  report??={...safeFailure(),diagnostics:liveDiagnostics??{stages:[]},cleanup:{}};report.diagnostics??={stages:[]};report.diagnostics.supervision={work_budget_ms:75000,total_budget_ms:90000,initializer_settled:initializerSettled,fork_pid_present:forkPidPresent,fork_pid_valid:forkPidValid,bootstrap_sent:bootstrapSent,group_probe:groupProbe,...(groupProbeCode?{group_probe_code:groupProbeCode}:{}),worker_registered:workerPGID!==undefined,native_registered:nativePID!==undefined,mcp_candidate_received:mcpCandidates.size>0,mcp_candidate_count:candidateCount,mcp_candidate_observed_count:observedCount,mcp_proven_count:provenCount,mcp_confirmed_observer_count:confirmedObserverCount,mcp_authorized_count:authorizedCount,mcp_acknowledged_count:acknowledgedCount,mcp_candidate_coverage_verified:mcpCoverage,mcp_coverage_reason:mcpCoverageReason,mcp_candidate_observed:mcpCandidateObserved,mcp_registered:mcpConfirmed,mcp_acknowledged:mcpAcknowledged,mcp_same_worker_group:mcpSameGroup,mcp_parent_verified:mcpParentVerified,mcp_placement:mcpPlacement,confirmed_mcp_group_count:confirmedMcpGroups.size,mcp_group_probe:mcpGroupProbe,mcp_phase:mcpPhase,mcp_candidate_probe:mcpCandidateProbe,...(mcpCandidateProbeCode?{mcp_candidate_probe_code:mcpCandidateProbeCode}:{})};report.cleanup={...report.cleanup,worker_closed:workerClosed,worker_group_closed:nativeClosed,mcp_candidate_coverage_verified:mcpCoverage,mcp_candidates_absent:mcpCandidatesAbsent,confirmed_mcp_groups_absent:confirmedMcpGroupsAbsent,private_directory_removed:removed};
  if(originalFailure||cleanupFailure||!workerClosed||!nativeClosed||!mcpCandidatesAbsent||!confirmedMcpGroupsAbsent||!removed){report.status='failed';report.code='NATIVE_PROBE_FAILED';report.diagnostics??={stages:[]};report.diagnostics.supervisor_failed=true;report.diagnostics.deadline_exceeded=Date.now()>=workEnd;const cause=originalFailure??cleanupFailure;if(['Error','AssertionError','TypeError','RangeError'].includes(cause?.name))report.diagnostics.supervisor_error_name=cause.name;if(['ERR_ASSERTION','NATIVE_PROBE_DEADLINE','CANCELLED','EPERM','EACCES','ESRCH','ENOENT'].includes(cause?.code))report.diagnostics.supervisor_error_code=cause.code;}
  if(privateRoot??allocatedRoot)await attempt(()=>publishReport(output,report));if(!originalFailure&&cleanupFailure)originalFailure=cleanupFailure;
 }
 if(originalFailure||report?.status!=='passed')throw Error('Native probe failed');return report;
}
async function workerEntry(){let abort=false;process.on('message',value=>{if(value?.type==='abort'){abort=true;process.emit('SIGTERM');}});const bootstrap=await withinDeadline(new Promise(resolve=>process.once('message',resolve)),3000);assert.equal(bootstrap.type,'bootstrap');workerStarted=bootstrap.began;const owned=bootstrap.privateRoot;assert.equal(await fs.realpath(owned),owned);const info=await fs.lstat(owned);assert.ok(info.isDirectory()&&!info.isSymbolicLink());assert.equal(info.mode&0o777,0o700);assert.equal(info.uid,process.getuid());if(abort)throw Error('Worker aborted');const report=await runNativeWorker({binary:bootstrap.binary,owned});await new Promise((resolve,reject)=>process.send({type:'result',report},error=>error?reject(error):resolve()));if(process.connected)process.disconnect();process.exitCode=report.status==='passed'?0:1;}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(process.send){try{await workerEntry();}catch{process.exitCode=1;if(process.connected)process.disconnect();}}else try{const args=process.argv.slice(2);assert.equal(args.length,4);const values=new Map();for(let i=0;i<args.length;i+=2){assert.ok(['--binary','--output'].includes(args[i]));assert.ok(!values.has(args[i]));values.set(args[i],args[i+1]);}assert.equal(values.size,2);const report=await runCodexCheckProbe({binary:values.get('--binary'),output:path.resolve(values.get('--output'))});process.stdout.write(JSON.stringify({status:report.status,tools:report.tools.length})+'\n');}catch{process.stderr.write('NATIVE_PROBE_FAILED\n');process.exitCode=1;}}
