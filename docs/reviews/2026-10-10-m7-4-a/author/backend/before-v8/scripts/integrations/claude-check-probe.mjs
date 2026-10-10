#!/usr/bin/env node
// Optional fixed installed-native experiment; importing the fixture helpers starts no host.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {DetunedClient} from '../../packages/client/dist/index.js';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const FIXED_BINARY='/Users/sakimi/.local/share/claude/versions/2.1.282';
const FIXED_SHA='fcfd837103965c64de34a6b9b94370d77a347ea71819715a27d5f0ef01775ea4';
export const nativeCheckNames=Object.freeze(['forum_ack','forum_context','forum_poll','forum_publish','forum_read','forum_relate','forum_review','forum_search','forum_subscribe']);
// Dedicated finite HTTP fixture shared by the two approved native harnesses.
export async function prepareOrdinaryCheckFixture(admin,url){
 const maintainer=await admin.createActor({kind:'agent',display_name:'Native check maintainer'}),verifier=await admin.createActor({kind:'service',display_name:'Native fixed verifier'}),reviewer=await admin.createActor({kind:'agent',display_name:'Native independent reviewer'}),config='a'.repeat(64);
 const policy={enabled:true,required_reviewers:1,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:false,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:['native-fixed'],allow_open_objections:false};
 const space=(await admin.createSpace({slug:'native-checks',objective:'Finite ordinary native check branches',rules:[],review_policy:policy,check_profiles:{'native-fixed':{verifier_actor_ids:[verifier.id],config_sha256:config,description:'Fixed native transport fixture, not algorithm certification'}}},'native-space')).data.space.id;
 const deniedSpace=(await admin.createSpace({slug:'native-denied',objective:'Scope denial',rules:[]},'native-denied')).data.space.id;
 await admin.createMembership(space,{actor_id:maintainer.id,role:'maintainer'});await admin.createMembership(space,{actor_id:reviewer.id,role:'observer',reviewer_eligible:true,independence_group:'native-independent'});
 const credential=await admin.createCredential({actor_id:maintainer.id,allowed_space_ids:[space],capabilities:['read','write']}),ordinary=new DetunedClient({baseUrl:url,token:credential.token,maxRetries:0,timeoutMs:2000});
 const thread=(await ordinary.createThread(space,{title:'Fixed check material'},'native-thread')).data.thread.id;
 const post=(await ordinary.createPost(space,thread,{kind:'claim',title:'Native fixed claim',summary:'Transport fixture',body:'Fixed harmless material',structured:{statement:'Finite fixture',assumptions:[],scope:'Native ordinary check transport',falsification_plan:'Strict binding and authorization'}},'native-claim')).data.post;
 const request=await ordinary.createReviewRequest(space,{target_ref:{post_id:post.id,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[maintainer.id],reviewer_actor_ids:[reviewer.id],expected_policy_revision:1,reproduction_instructions:'Native transport fixture only'},'native-request');
 return{admin,url,space,deniedSpace,ordinary,token:credential.token,actorId:maintainer.id,verifierId:verifier.id,postId:post.id,request,config};
}
export async function exerciseOrdinaryCheckBranches(call,f,requestCount,observe=()=>{}){
 observe('matrix-invalid');
 const invalidBefore=requestCount();
 for(const args of [
  {op:'check_invalidate',space_id:f.space,run_id:'absent',expected_version:1,reason:'😀'.repeat(501),request_key:'bad-reason'},
  {op:'check_create',space_id:f.space,request_id:f.request.id,snapshot_id:f.request.snapshot_id,check_name:'native-fixed',verifier_id:f.verifierId,expected_request_version:1,request_key:'bad-extra',extra:true},
  {op:'check_create',space_id:f.space,request_id:f.request.id,request_key:'bad-shape'},
  {op:'check_issue_credential',space_id:f.space,run_id:'absent'},
  {op:'check_receipt_submit',space_id:f.space,run_id:'absent'},
  {op:'check_artifact_upload',space_id:f.space,run_id:'absent'},
 ]){const result=await call('forum_review',args);assert.equal(result.ok,false);assert.equal(result.code,'VALIDATION_ERROR');}
 assert.equal(requestCount(),invalidBefore,'Invalid calls must not prepare capabilities/me/session or HTTP');
 observe('matrix-create');
 const created=await call('forum_review',{op:'check_create',space_id:f.space,request_id:f.request.id,snapshot_id:f.request.snapshot_id,check_name:'native-fixed',verifier_id:f.verifierId,expected_request_version:f.request.version,request_key:'native-create'});assert.equal(created.ok,true);const run=created.value;assert.deepEqual(run,await f.ordinary.getCheckRun(f.space,run.id));
 observe('matrix-log-receipt');
 const issued=await f.admin.issueCheckRunCredential(f.space,run.id,{}),verify=new DetunedClient({baseUrl:f.url,token:issued.token,maxRetries:0,timeoutMs:2000});const artifact=await verify.uploadCheckArtifact(f.space,run.id,new Blob(['Finite native transport log\n'],{type:'text/plain'}),{},'native-log');
 const instant=new Date().toISOString();const receipt=await verify.submitCheckReceipt(f.space,run.id,{receipt_id:'native.receipt',observed_snapshot_sha256:run.snapshot_sha256,observed_check_config_sha256:f.config,result:'pass',environment:'Finite native transport fixture; not an algorithm run',tool_versions:{fixture:'1'},execution_steps:'Verify native read/write branches against real domain facts.',started_at:instant,finished_at:instant,exit_code:0,logs_artifact_id:artifact.id},'native-receipt');
 const cases=[['check_run',{id:run.id},()=>f.ordinary.getCheckRun(f.space,run.id)],['check_snapshot',{id:run.id},()=>f.ordinary.getCheckSnapshot(f.space,run.id)],['check_post_revision',{id:f.postId,run_id:run.id,revision:1},()=>f.ordinary.getCheckPostRevision(f.space,run.id,f.postId,1)],['check_receipt',{id:run.id},()=>f.ordinary.getCheckReceipt(f.space,run.id)],['check_artifact',{id:artifact.id,run_id:run.id},()=>f.ordinary.getCheckArtifact(f.space,run.id,artifact.id)],['required_checks',{id:f.request.id},()=>f.ordinary.getRequiredChecks(f.space,f.request.id)]];
 observe('matrix-reads');
 for(const[kind,args,oracle]of cases){const value=await call('forum_read',{kind,space_id:f.space,...args});assert.equal(value.ok,true);assert.deepEqual(value.value,await oracle());if(kind==='check_artifact'){assert.equal('chunk'in value.value,false);assert.equal('content'in value.value,false);}}
 observe('matrix-scope');
 const denied=await call('forum_read',{kind:'check_run',space_id:f.deniedSpace,id:run.id});assert.equal(denied.ok,false);assert.ok(['NOT_FOUND','FORBIDDEN'].includes(denied.code));
 const noHttp=requestCount();for(const args of [{kind:'check_artifact',space_id:f.space,id:artifact.id,run_id:run.id,file_path:'/absent'},{kind:'check_artifact_content',space_id:f.space,id:artifact.id,run_id:run.id},{kind:'check_credentials',space_id:f.space,id:run.id}]){const value=await call('forum_read',args);assert.equal(value.ok,false);assert.equal(value.code,'VALIDATION_ERROR');}assert.equal(requestCount(),noHttp);
 observe('matrix-invalidate');
 const latest=await f.ordinary.getCheckRun(f.space,run.id),invalidated=await call('forum_review',{op:'check_invalidate',space_id:f.space,run_id:run.id,expected_version:latest.version,reason:'😀'.repeat(500),request_key:'native-invalidate'});assert.equal(invalidated.ok,true);assert.equal(invalidated.value.invalidation_reason,'😀'.repeat(500));assert.deepEqual(await f.ordinary.getCheckReceipt(f.space,run.id),receipt);
 return{invalid_before_prepare_http:0,actor_id:f.actorId,space_id:f.space,request_id:f.request.id,snapshot_id:f.request.snapshot_id,created_run_id:run.id,reads:cases.map(([kind])=>kind),reason_500:true,scope_denied:true,artifact_metadata_only:true,receipt_id:receipt.receipt_id};
}
const safeFailure=()=>({status:'failed',code:'NATIVE_PROBE_FAILED'});
async function publishReport(output,value){const staging=output+'.stage-'+process.pid;let handle;try{handle=await fs.open(staging,'wx',0o600);await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();await handle.close();handle=null;await fs.link(staging,output);}finally{if(handle)await handle.close();await fs.unlink(staging).catch(()=>{});}}
// Observe both callback failures and later asynchronous stream errors. No host is launched.
export function createNativeInputWriter(child){
 if(!child.stdin)throw Error('Native input is unavailable');let failure;const pending=new Set();
 const fail=()=>{failure??=Object.assign(Error('Native input failed'),{code:'NATIVE_INPUT_FAILED'});for(const reject of pending)reject(failure);pending.clear();};
 child.stdin.on('error',fail);
 return Object.freeze({assertHealthy(){if(failure)throw failure;},write(text){return new Promise((resolve,reject)=>{if(failure){reject(failure);return;}const rejectWrite=error=>{pending.delete(rejectWrite);reject(error);};pending.add(rejectWrite);try{child.stdin.write(text,error=>{if(error){fail();return;}pending.delete(rejectWrite);failure?reject(failure):resolve();});}catch{fail();}});}});
}
async function hashFixedBinary(file){const digest=createHash('sha256');for await(const chunk of createReadStream(file,{highWaterMark:65536}))digest.update(chunk);return digest.digest('hex');}
export async function runClaudeCheckProbe({binary,output}){
 assert.equal(await fs.realpath(binary),FIXED_BINARY);const stat=await fs.stat(binary);assert.equal(stat.isFile(),true);assert.equal(stat.size,222245312);assert.equal(await hashFixedBinary(binary),FIXED_SHA);
 try{await fs.lstat(output);throw Error('Output exists');}catch(error){if(error.code!=='ENOENT')throw error;}
 const owned=await fs.mkdtemp(path.join(tmpdir(),'detuned-claude-checks-'));let app,db,native,forbidden,originalFailure;const children=new Map();const requests=[];
 const report={status:'passed',version_path:'2.1.282',binary_sha256:FIXED_SHA,model_calls:0,input_mode:'wrapped',tools:[],guard:{},checks:{},cleanup:{}};
 const track=child=>{const state={error:false,promise:null};state.promise=new Promise(resolve=>{child.on('error',()=>{state.error=true;});child.once('close',(code,signal)=>{state.closed=true;state.code=code;state.signal=signal;resolve(state);});});children.set(child,state);return child;};
 const close=async(child,group=false)=>{const state=children.get(child);if(!state.closed){try{if(group)process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}const timer=setTimeout(()=>{if(!state.closed){try{group?process.kill(-child.pid,'SIGKILL'):child.kill('SIGKILL');}catch{}}},1000);try{await state.promise;}finally{clearTimeout(timer);}}return state;};
 let cancelled=false;const ensure=()=>{if(cancelled)throw Error('Probe cancelled');};const cancel=()=>{cancelled=true;for(const[child,state]of children)if(!state.closed){try{child===native?process.kill(-child.pid,'SIGTERM'):child.kill('SIGTERM');}catch{}}};const timer=setTimeout(cancel,60000);process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
 try{
 const require=createRequire(path.join(repo,'package.json')),Database=require('better-sqlite3');const{bootstrapDatabase,SqliteStorage}=await import('../../packages/storage-sqlite/dist/index.js');const{buildApp,ArtifactFileStore}=await import('../../packages/server/dist/index.js');
 db=new Database(path.join(owned,'forum.sqlite'));const bootstrap=bootstrapDatabase(db);const storage=new SqliteStorage(db,{dataDir:owned}),blobs=await ArtifactFileStore.create(owned);app=buildApp({storage,artifactBlobs:blobs,writeRateLimits:{per_minute:60000,burst:10000}});app.addHook('onRequest',async req=>{requests.push({method:req.method,path:req.url.split('?')[0]});});await app.listen({host:'127.0.0.1',port:0});const port=app.server.address().port,url=`http://127.0.0.1:${port}`,admin=new DetunedClient({baseUrl:url,token:bootstrap.adminToken,maxRetries:0,timeoutMs:2000}),fixture=await prepareOrdinaryCheckFixture(admin,url);
 const tokenfile=path.join(owned,'forum-token'),settings=path.join(owned,'settings.json'),mcp=path.join(owned,'mcp.json');await fs.writeFile(tokenfile,fixture.token,{mode:0o600});await fs.writeFile(settings,'{}',{mode:0o600});await fs.writeFile(mcp,JSON.stringify({mcpServers:{detuned:{command:process.execPath,args:[path.join(repo,'packages/mcp/dist/index.js')],env:{DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:tokenfile,DETUNED_MCP_INPUT_MODE:'wrapped'}}}}),{mode:0o600});
 forbidden=createServer((_q,s)=>s.end('owned negative'));await new Promise(resolve=>forbidden.listen(0,'127.0.0.1',resolve));const sentinel=path.join(owned,'forbidden-sentinel');await fs.writeFile(sentinel,'negative');const home=process.env.HOME;assert.equal(typeof home,'string');assert.ok(!home.includes('"')&&!owned.includes('"'));const profile=path.join(owned,'guard.sb');const policy=`(version 1)\n(allow default)\n(deny network*)\n(allow network-outbound (remote ip "localhost:${port}"))\n(deny mach-lookup)\n(deny file-read* file-write* (subpath "${home}/.codex") (subpath "${home}/.claude") (literal "${home}/.claude.json") (subpath "${home}/.config") (subpath "${home}/Library/Keychains") (subpath "/Library/Keychains") (subpath "${home}/Library/Application Support/Codex") (subpath "${home}/Library/Application Support/Claude"))\n(deny file-write*)\n(allow file-write* (subpath "${owned}"))\n(deny file-read* file-write* (literal "${sentinel}"))\n`;await fs.writeFile(profile,policy,{mode:0o600});report.profile_sha256=sha(Buffer.from(policy));
 const checkfile=path.join(owned,'guard-check.cjs');await fs.writeFile(checkfile,`const http=require('node:http'),fs=require('node:fs');const get=p=>new Promise(r=>{const q=http.get({host:'127.0.0.1',port:p,path:'/api/v1/health/live'},s=>{s.resume();s.on('end',()=>r('allowed'));});q.on('error',e=>r(e.code));});(async()=>{let sentinel;try{fs.readFileSync(${JSON.stringify(sentinel)});sentinel='allowed';}catch(e){sentinel=e.code;}console.log(JSON.stringify({allowed:await get(${port}),forbidden:await get(${forbidden.address().port}),sentinel}));})()`);
 const guard=track(spawn('/usr/bin/sandbox-exec',['-f',profile,process.execPath,checkfile],{cwd:owned,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin'},stdio:['ignore','pipe','ignore']}));let guardText='';guard.stdout.setEncoding('utf8');guard.stdout.on('data',text=>{guardText+=text;if(guardText.length>4096)guard.kill('SIGKILL');});const gt=setTimeout(()=>guard.kill('SIGKILL'),3000);const gs=await children.get(guard).promise;clearTimeout(gt);assert.equal(gs.code,0);report.guard=JSON.parse(guardText);assert.equal(report.guard.allowed,'allowed');assert.ok(['EPERM','EACCES'].includes(report.guard.forbidden));assert.ok(['EPERM','EACCES'].includes(report.guard.sentinel));
 ensure();native=track(spawn('/usr/bin/sandbox-exec',['-f',profile,binary,'--bare','-p','--input-format','stream-json','--output-format','stream-json','--verbose','--setting-sources','','--settings',settings,'--strict-mcp-config','--mcp-config',mcp,'--no-session-persistence'],{cwd:owned,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin',CI:'true',HOME:home,CLAUDE_CODE_TMPDIR:path.join(owned,'tmp'),CLAUDE_CONFIG_DIR:path.join(owned,'state')},detached:true,stdio:['pipe','pipe','pipe']}));native.stderr.resume();const input=createNativeInputWriter(native);let lines='',bytes=0,serial=0;const responses=new Map();native.stdout.setEncoding('utf8');native.stdout.on('data',text=>{bytes+=Buffer.byteLength(text);if(bytes>1048576){cancel();return;}lines+=text;let i;while((i=lines.indexOf('\n'))>=0){const line=lines.slice(0,i);lines=lines.slice(i+1);try{const value=JSON.parse(line);if(value.type==='control_response')responses.set(value.response?.request_id,value);}catch{}}});
 const control=async request=>{ensure();const id='native-'+(++serial);assert.equal(children.get(native).closed,undefined);await input.write(JSON.stringify({type:'control_request',request_id:id,request})+'\n');const deadline=Date.now()+15000;while(!cancelled&&!responses.has(id)&&!children.get(native).closed&&Date.now()<deadline){input.assertHealthy();await new Promise(resolve=>setTimeout(resolve,20));}input.assertHealthy();const value=responses.get(id);responses.delete(id);if(!value)throw Error('Control deadline');return value;};
 assert.equal((await control({subtype:'initialize'})).response?.subtype,'success');let server;for(let n=0;n<40;n++){const response=await control({subtype:'mcp_status'});server=response.response?.response?.mcpServers?.find(item=>item.name==='detuned');if(server?.status==='connected')break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(server?.status,'connected');report.tools=server.tools.map(tool=>tool.name).sort();assert.deepEqual(report.tools,nativeCheckNames);report.initialize=true;report.catalogue_exact=true;
 const call=async(name,args)=>{const response=(await control({subtype:'mcp_call',tool:'mcp__detuned__'+name,arguments:{input:args}})).response;if(response?.subtype!=='success'){let code;try{code=JSON.parse(response?.error).error?.code;}catch{}return{ok:false,code};}const value=response.response?.structuredContent?.result;return{ok:true,value};};
 report.checks=await exerciseOrdinaryCheckBranches(call,fixture,()=>requests.length);
 const pending=(await fixture.ordinary.subscribe(fixture.space,{consumer_key:'native-pending',start:'beginning'},'native-subscribe')).data.consumer;const batch=(await fixture.ordinary.poll(fixture.space,pending.id,{limit:1})).data;assert.ok(batch.batch_id);const beforeAck=requests.filter(r=>r.path.endsWith('/ack')).length;
 const waiting=(await fixture.ordinary.subscribe(fixture.space,{consumer_key:'native-waiting',start:'now'},'native-waiting')).data.consumer;
 const inFlight=call('forum_poll',{space_id:fixture.space,consumer_id:waiting.id,limit:1,wait_ms:25000});const observed=inFlight.then(()=>undefined,()=>undefined);const waitDeadline=Date.now()+3000;while(!requests.some(r=>r.path.endsWith('/consumers/'+waiting.id+'/poll'))&&Date.now()<waitDeadline)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(requests.some(r=>r.path.endsWith('/consumers/'+waiting.id+'/poll')));native.stdin.end();await close(native,true);await observed;
 const resumed=(await fixture.ordinary.poll(fixture.space,pending.id,{limit:1})).data;assert.deepEqual(resumed,batch);assert.equal(requests.filter(r=>r.path.endsWith('/ack')).length,beforeAck);report.checks.ack_delta=0;report.checks.pending_unchanged=true;report.checks.cancelled=true;report.native_close={code:children.get(native).code,signal:children.get(native).signal};
 }catch(error){originalFailure=error;}finally{
 clearTimeout(timer);process.off('SIGINT',cancel);process.off('SIGTERM',cancel);let cleanupFailure;
 const attempt=async(action,done)=>{try{await action();done();}catch(error){cleanupFailure??=error;}};
 report.cleanup={children_closed:false,forbidden_closed:false,app_closed:false,db_closed:false,private_directory_removed:false};
 for(const child of children.keys())await attempt(()=>close(child,child===native),()=>{});
 report.cleanup.children_closed=[...children.values()].every(state=>state.closed===true);
 if(forbidden)await attempt(()=>new Promise((resolve,reject)=>forbidden.close(error=>error?reject(error):resolve())),()=>{report.cleanup.forbidden_closed=true;});
 if(app)await attempt(()=>app.close(),()=>{report.cleanup.app_closed=true;});
 if(db)await attempt(()=>{db.close();},()=>{report.cleanup.db_closed=true;});
 await attempt(()=>fs.rm(owned,{recursive:true,force:true}),()=>{report.cleanup.private_directory_removed=true;});
 if(originalFailure||cleanupFailure){try{await publishReport(output,{...safeFailure(),version_path:'2.1.282',binary_sha256:FIXED_SHA,cleanup:report.cleanup});}catch{}throw originalFailure??cleanupFailure;}
 }
 await publishReport(output,report);return report;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){try{const args=process.argv.slice(2);assert.equal(args.length,4);const values=new Map();for(let i=0;i<args.length;i+=2){assert.ok(['--binary','--output'].includes(args[i]));assert.ok(!values.has(args[i]));values.set(args[i],args[i+1]);}assert.equal(values.size,2);const report=await runClaudeCheckProbe({binary:values.get('--binary'),output:path.resolve(values.get('--output'))});process.stdout.write(JSON.stringify({status:report.status,tools:report.tools.length})+'\n');}catch{process.stderr.write('NATIVE_PROBE_FAILED\n');process.exitCode=1;}}
