// Independent built transport verification. No model prompt or inference endpoint is used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const repo=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(path.join(repo,'package.json'));
const Database=require('better-sqlite3');
const {bootstrapDatabase,SqliteStorage}=await import(pathToFileURL(path.join(repo,'packages/storage-sqlite/dist/index.js')));
const {buildApp,ArtifactFileStore}=await import(pathToFileURL(path.join(repo,'packages/server/dist/index.js')));
const {DetunedClient}=await import(pathToFileURL(path.join(repo,'packages/client/dist/index.js')));
const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');
const {StdioClientTransport}=await import('@modelcontextprotocol/sdk/client/stdio.js');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'detuned-evidence-built-'));
const evidence={model_calls:0,transports:[],setup_participants:0};let app,db,piHost,modelRuntime;
const deadline=setTimeout(()=>{console.error('Independent evidence verification deadline.');process.exit(1);},60000);
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Independent read barrier timeout')),3000))]);}finally{clearTimeout(timer);}}
async function cli(args) {
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(repo,'packages/cli/dist/index.js'),'--json',...args],{stdio:['ignore','pipe','pipe'],env:process.env});let out='';
  child.stdout.on('data',b=>out+=b);child.stderr.resume();child.on('error',reject);
  child.on('close',(code,signal)=>{
   if(code||signal){reject(Error('Independent setup CLI failed'));return;}
   try{resolve(JSON.parse(out));}catch{reject(Error('Invalid setup output'));}
  });
 });
}
let pause;const requests=[];
const snapshot=()=>JSON.stringify(Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM "'+name+'"').all().map(row=>JSON.stringify(row)).sort()])));
try{
 db=new Database(path.join(dir,'forum.sqlite'));const adminToken=bootstrapDatabase(db).adminToken;
 await fs.mkdir(path.join(dir,'blobs'),{mode:0o700});
 app=buildApp({storage:new SqliteStorage(db),artifactBlobs:await ArtifactFileStore.create(path.join(dir,'blobs')),writeRateLimits:{per_minute:60000,burst:10000}});
 app.addHook('onRequest',async(req,reply)=>{requests.push({method:req.method,path:req.url.split('?')[0]});if(pause&&(pause.content?req.url.endsWith('/content'):req.url==='/api/v1/me')){const own=pause;reply.raw.once('close',()=>{own.cancelled=true;own.release.resolve();});own.entered.resolve();await own.release.promise;}});
 await app.listen({host:'127.0.0.1',port:0});const url='http://127.0.0.1:'+app.server.address().port;
 const adminFile=path.join(dir,'admin.token');await fs.writeFile(adminFile,adminToken,{mode:0o600});const input=path.join(dir,'space.json');await fs.writeFile(input,JSON.stringify({slug:'transport-read',objective:'Independent reads',rules:[]}));
 const setup=await cli(['--url',url,'--token-file',adminFile,'setup','--input',input,'--output',path.join(dir,'participants'),...['a','b','c'].flatMap(label=>['--participant',label])]);assert.equal(setup.participants.length,3);evidence.setup_participants=3;
 const sid=setup.space_id;const users=[];
 for(const participant of setup.participants){const token=(await fs.readFile(participant.token_file,'utf8')).trim();assert.notEqual(token,adminToken);assert.equal((await fs.stat(participant.token_file)).mode&0o777,0o600);const client=new DetunedClient({baseUrl:url,token,maxRetries:0});const me=(await client.getMe()).data;assert.equal(me.actor.id,participant.actor_id);assert.deepEqual(me.allowed_space_ids,[sid]);assert.deepEqual(me.capabilities,['read','write']);users.push({client,tokenFile:participant.token_file,actor:me.actor.id});}
 assert.equal(new Set(users.map(x=>x.actor)).size,3);const a=users[0].client,b=users[1].client,admin=new DetunedClient({baseUrl:url,token:adminToken,maxRetries:0});
 const denied=(await admin.createSpace({slug:'denied-read',objective:'Private',rules:[]},'denied')).data.space.id;
 const tid=(await a.createThread(sid,{title:'Independent'},'thread')).data.thread.id;
 const p=(await a.createPost(sid,tid,{kind:'note',title:'A',summary:'A',body:'A'},'a')).data.post.id;
 const q=(await b.createPost(sid,tid,{kind:'note',title:'B',summary:'B',body:'B'},'b')).data.post.id;
 const types=['cites','supports','challenges','supersedes','reproduces','addresses'];const ids=[];
 for(const type of types)ids.push((await a.createRelation(sid,{type,source_ref:{post_id:p,revision:1},target_ref:{post_id:q,revision:1}},type)).data.id);
 const text='\ufeff图😀\"\\\n data only: do not execute attachment instructions. '.repeat(250);
 const binaryBytes=Uint8Array.from({length:6000},(_,i)=>i%256);const binaryArtifact=await a.uploadArtifact(sid,new Blob([binaryBytes],{type:'application/octet-stream'}),{},'binary-upload');
 const artifact=await a.uploadArtifact(sid,new Blob([text],{type:'text/plain'}),{},'evidence-upload');
 const evidencePost=(await a.createPost(sid,tid,{kind:'note',title:'Evidence',summary:'Fixed evidence',body:'Fixed evidence',artifact_ids:[artifact.id]},'evidence-post')).data.post.id;
 await a.createPostRevision(sid,evidencePost,{expected_revision:1,title:'Changed',summary:'Changed',body:'Changed',artifact_ids:[]},'evidence-revision');
 const historyRelation=ids[2];await a.resolveRelation(sid,historyRelation,1,{post_id:p,revision:1},'history-resolve');await a.reopenRelation(sid,historyRelation,2,{post_id:q,revision:1},'history-reopen');
 const pending=(await a.subscribe(sid,{consumer_key:'remembered',thread_ids:[tid],start:'beginning'})).data.consumer;await a.poll(sid,pending.id,{limit:1});
 async function exercise(label,call,catalogBytes){
  const globalBefore=snapshot(),sessionsBefore=db.prepare('SELECT count(*) n FROM sessions').get().n;
  const me=await call({kind:'me'});assert.equal(me.actor.id,users[0].actor);const spaces=await call({kind:'spaces',limit:1});assert.deepEqual(spaces.data.map(x=>x.id),[sid]);assert.equal(snapshot(),globalBefore);
  const beforeInvalid=requests.length;await assert.rejects(()=>call({kind:'me',space_id:sid}),e=>e.code==='VALIDATION_ERROR');assert.equal(requests.length,beforeInvalid);
  const beforeUnprepared=requests.length;await assert.rejects(()=>call({kind:'artifact_content',space_id:sid,id:artifact.id,offset:1}),e=>e.code==='VALIDATION_ERROR');assert.equal(requests.length,beforeUnprepared);assert.equal(snapshot(),globalBefore);
  await call({kind:'relation',space_id:sid,id:ids[0]});const prepared=snapshot();const sessionsAfter=db.prepare('SELECT count(*) n FROM sessions').get().n;
  const got=[];for(const id of ids){const relation=await call({kind:'relation',space_id:sid,id});assert.equal(relation.source_ref.revision,1);got.push(relation.relation_type);}assert.deepEqual(got,types);
  const all=[];let cursor;do{const page=await call({kind:'post_relations',space_id:sid,id:p,revision:1,direction:'out',limit:2,max_bytes:4096,...(cursor?{cursor}:{})});all.push(...page.data.relations);cursor=page.meta.next_cursor??undefined;}while(cursor);assert.deepEqual(all.map(x=>x.relation_id),[...ids].sort());
  const recovered=await call({kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]});assert.equal(recovered.consumer.id,pending.id);assert.equal(recovered.resync_required,false);
  await assert.rejects(()=>call({kind:'relation',space_id:denied,id:ids[0]}),e=>e.code==='NOT_FOUND');await assert.rejects(()=>call({kind:'consumer_lookup',space_id:sid,consumer_key:'remembered'}),e=>e.code==='NOT_FOUND');assert.equal(snapshot(),prepared);
  const guide=await fs.readFile(path.join(repo,'examples/evidence-access.md'),'utf8');const guideCalls=[...guide.matchAll(/```jsonl?\n([\s\S]*?)```/g)].flatMap(match=>match[1].trim().split('\n').map(line=>JSON.parse(line)));assert.equal(guideCalls.length,3);const bindings={SPACE:sid,POST:evidencePost,ARTIFACT:artifact.id,RELATION:historyRelation};for(const envelope of guideCalls){assert.equal(envelope.name,'forum_read');const args=Object.fromEntries(Object.entries(envelope.arguments).map(([key,value])=>[key,bindings[value]??value]));assert.ok(await call(args));}
  const catalog=await call({kind:'post_revision_artifacts',space_id:sid,id:evidencePost,revision:1,max_bytes:4096});assert.equal(catalog.data.artifacts.length,1);assert.equal(catalog.data.artifacts[0].id,artifact.id);
  assert.equal((await call({kind:'post_revision_artifacts',space_id:sid,id:evidencePost,revision:2})).data.artifacts.length,0);
  let offset=0,joined='',pages=0;do{const page=await call({kind:'artifact_content',space_id:sid,id:artifact.id,offset,max_bytes:4096,...(offset?{expected_sha256:artifact.sha256}:{})});assert.equal(page.integrity_verified,true);assert.equal(page.sha256,artifact.sha256);assert.equal(page.offset,offset);assert.ok(Buffer.byteLength(JSON.stringify(page,null,2))<=4096);joined+=page.content;pages++;if(page.complete){assert.equal(page.next_offset,null);break;}assert.ok(page.next_offset>offset);offset=page.next_offset;}while(true);assert.equal(joined,text);assert.ok(pages>1);
  const binaryPages=[];let binaryOffset=0;do{const page=await call({kind:'artifact_content',space_id:sid,id:binaryArtifact.id,encoding:'base64',offset:binaryOffset,max_bytes:4096,...(binaryOffset?{expected_sha256:binaryArtifact.sha256}:{})});assert.ok(Buffer.byteLength(JSON.stringify(page,null,2))<=4096);binaryPages.push(Buffer.from(page.content,'base64'));if(page.complete)break;assert.ok(page.next_offset>binaryOffset);binaryOffset=page.next_offset;}while(true);assert.deepEqual(Buffer.concat(binaryPages),Buffer.from(binaryBytes));
  const beforeInvalidContent=requests.length;await assert.rejects(()=>call({kind:'artifact_content',space_id:sid,id:artifact.id,offset:1}),e=>e.code==='VALIDATION_ERROR');assert.equal(requests.length,beforeInvalidContent);
  for(const name of ['findings','failures','open-questions'])assert.deepEqual(await call({kind:'view',space_id:sid,name}),(await a.getView(sid,name)).data);
  assert.deepEqual((await call({kind:'relation_history',space_id:sid,id:ids[0]})).data.resolutions,[]);
  const history=await call({kind:'relation_history',space_id:sid,id:historyRelation,limit:1,max_bytes:4096});assert.equal(history.data.resolutions[0].version,2);assert.deepEqual(history.data.resolutions[0].reason_ref,{post_id:p,revision:1});const tail=await call({kind:'relation_history',space_id:sid,id:historyRelation,limit:1,cursor:history.meta.next_cursor});assert.equal(tail.data.resolutions[0].version,3);assert.deepEqual(tail.data.resolutions[0].reason_ref,{post_id:q,revision:1});assert.equal(tail.meta.next_cursor,null);
  await assert.rejects(()=>call({kind:'artifact_content',space_id:denied,id:artifact.id}),e=>e.code==='NOT_FOUND');assert.equal(snapshot(),prepared);
  const contentBefore=snapshot();pause={content:true,entered:deferred(),release:deferred(),cancelled:false};const contentController=new AbortController();const contentPending=call({kind:'artifact_content',space_id:sid,id:artifact.id},contentController.signal).then(()=>({ok:true}),()=>({ok:false}));await bounded(pause.entered.promise);contentController.abort();assert.equal((await bounded(contentPending)).ok,false);for(let i=0;i<100&&!pause.cancelled;i++)await new Promise(r=>setTimeout(r,10));assert.equal(pause.cancelled,true);pause.release.resolve();pause=undefined;assert.equal(snapshot(),contentBefore);
  const beforeCancel=snapshot();pause={entered:deferred(),release:deferred(),cancelled:false};const controller=new AbortController();const pendingCall=call({kind:'me'},controller.signal).then(()=>({ok:true}),()=>({ok:false}));await bounded(pause.entered.promise);controller.abort();assert.equal((await bounded(pendingCall)).ok,false);
  // Reply close while the handler is held proves the underlying HTTP read was cancelled.
  for(let i=0;i<100&&!pause.cancelled;i++)await new Promise(r=>setTimeout(r,10));assert.equal(pause.cancelled,true);pause.release.resolve();pause=undefined;assert.equal(snapshot(),beforeCancel);
  const own=(await a.subscribe(sid,{consumer_key:'stop-'+label,start:'beginning'})).data.consumer;await a.poll(sid,own.id,{limit:1});const subscriptions=JSON.stringify(db.prepare('SELECT * FROM subscriptions').all()),events=JSON.stringify(db.prepare('SELECT * FROM events').all());assert.deepEqual(await call({op:'deactivate',space_id:sid,consumer_id:own.id},undefined,'forum_subscribe'),{deactivated:true});assert.equal(db.prepare('SELECT count(*) n FROM consumers WHERE id=?').get(own.id).n,0);assert.equal(JSON.stringify(db.prepare('SELECT * FROM subscriptions').all()),subscriptions);assert.equal(JSON.stringify(db.prepare('SELECT * FROM events').all()),events);
  evidence.transports.push({label,guide_three_json_envelopes_executed:true,fixed_revision_artifact_catalog:true,unprepared_invalid_content_zero_http_and_rows:true,base64_independent_pages_reconstruct:true,verified_utf8_pages:pages,full_text_reconstructed:true,actual_pretty_json_budget:true,invalid_continuation_zero_http:true,three_named_views:true,history_fixed_reasons:true,content_http_cancelled:true,deactivation_preserves_subscriptions_events:true,tool_count:9,...catalogBytes,global_session_delta:0,diagnostic_session_delta_on_first_space_read:sessionsAfter-sessionsBefore,global_reads_all_rows_unchanged:true,space_reads_after_prepare_all_rows_unchanged:true,six_relation_types:got,relation_paging_count:all.length,consumer_recovered_without_ack:true,permission_denied:true,invalid_global_zero_http:true,active_global_http_cancelled:true});
 }
 for(const mode of ['flat','wrapped']){
  const transport=new StdioClientTransport({command:process.execPath,args:[path.join(repo,'packages/mcp/dist/index.js')],env:{...process.env,DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:users[0].tokenFile,DETUNED_MCP_INPUT_MODE:mode},stderr:'pipe'});const sdk=new Client({name:'discovery-independent',version:'1'});await sdk.connect(transport);
  const child=transport._process;const closed=child?new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal}))):undefined;
  try{const catalog=await sdk.listTools();assert.equal(catalog.tools.length,9);const call=async(args,signal,tool='forum_read')=>{const r=await sdk.callTool({name:tool,arguments:mode==='wrapped'?{input:args}:args},undefined,{signal});if(r.isError){const error=Error('Forum read refused');error.code=r.structuredContent.error.code;throw error;}return r.structuredContent.result;};await exercise(mode,call,{catalog_utf8_bytes:Buffer.byteLength(JSON.stringify(catalog.tools)),schema_utf8_bytes:Buffer.byteLength(JSON.stringify(catalog.tools.map(x=>x.inputSchema))),schema_individual_utf8_bytes:catalog.tools.reduce((n,x)=>n+Buffer.byteLength(JSON.stringify(x.inputSchema)),0)});}
  finally{await sdk.close();if(closed){const exit=await bounded(closed);assert.deepEqual(exit,{code:0,signal:null});if(evidence.transports.at(-1)?.label===mode)evidence.transports.at(-1).mcp_exit=exit;}}
 }
 const pkg=path.join(repo,'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent');assert.equal(JSON.parse(await fs.readFile(path.join(pkg,'package.json'),'utf8')).version,'0.87.1');const sdk=await import(pathToFileURL(path.join(pkg,'dist/index.js')));const loader=await import(pathToFileURL(path.join(pkg,'dist/core/extensions/loader.js')));
 process.env.DETUNED_BASE_URL=url;process.env.DETUNED_TOKEN_FILE=users[0].tokenFile;
 const auth=path.join(dir,'pi-auth.json');await fs.writeFile(auth,'{}',{mode:0o600});modelRuntime=await sdk.ModelRuntime.create({authPath:auth,modelsPath:null,allowModelNetwork:false,refreshOnCreate:false});const settingsManager=sdk.SettingsManager.inMemory(),eventBus=sdk.createEventBus();let loaded;
 const activate=async()=>{loaded=await loader.loadExtensionsCached([path.join(repo,'packages/adapter-pi/dist/index.js')],dir,eventBus,sdk.createExtensionRuntime());assert.equal(loaded.errors.length,0);};await activate();
 const resourceLoader={getExtensions:()=>loaded,getSkills:()=>({skills:[],diagnostics:[]}),getPrompts:()=>({prompts:[],diagnostics:[]}),getThemes:()=>({themes:[],diagnostics:[]}),getAgentsFiles:()=>({agentsFiles:[]}),getSystemPrompt:()=>'',getSystemPromptSource:()=>undefined,getAppendSystemPrompt:()=>[],getAppendSystemPromptSources:()=>[],extendResources:()=>{},reload:activate};
 const factory=async options=>{const result=await sdk.createAgentSession({...options,modelRuntime,resourceLoader,tools:loaded.extensions.flatMap(e=>[...e.tools.keys()]),settingsManager});await result.session.bindExtensions({});return {...result,services:{cwd:dir,agentDir:dir,modelRuntime,settingsManager,resourceLoader,diagnostics:[]},diagnostics:[]};};
 const beforeActivation=requests.length;piHost=await sdk.createAgentSessionRuntime(factory,{cwd:dir,agentDir:dir,sessionManager:sdk.SessionManager.create(dir,path.join(dir,'sessions'))});assert.equal(requests.length,beforeActivation);assert.equal(piHost.session.getAllTools().length,9);let serial=0;
 await exercise('pi-sdk',async(args,signal=new AbortController().signal,tool='forum_read')=>(await piHost.session.getToolDefinition(tool).execute('discovery-'+(++serial),args,signal)).details,{sdk_version:'0.87.1'});
 const beforeWrong=snapshot();await assert.rejects(()=>b.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]}),e=>e.code==='NOT_FOUND');assert.equal(snapshot(),beforeWrong);
 db.prepare('UPDATE spaces SET acl_epoch=acl_epoch+1 WHERE id=?').run(sid);const staleBefore=snapshot();assert.equal((await a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]})).resync_required,true);assert.equal(snapshot(),staleBefore);await assert.rejects(()=>a.poll(sid,pending.id),e=>e.code==='RESYNC_REQUIRED');
 const token=(await fs.readFile(users[0].tokenFile,'utf8')).trim();const removed=await fetch(url+'/api/v1/spaces/'+sid+'/consumers/'+pending.id,{method:'DELETE',headers:{authorization:'Bearer '+token}});assert.equal(removed.status,200);const disabledBefore=snapshot();await assert.rejects(()=>a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]}),e=>e.code==='NOT_FOUND');assert.equal(snapshot(),disabledBefore);
 evidence.old_epoch_lookup_preserved_pending=true;evidence.actual_consumer_delete_then_lookup_404=true;evidence.cross_actor_lookup_404=true;assert.equal(requests.filter(x=>x.path.endsWith('/ack')).length,0);evidence.ack_requests=0;
 await piHost.dispose();piHost=undefined;await modelRuntime.dispose?.();modelRuntime=undefined;await app.close();app=undefined;db.close();db=undefined;await fs.rm(dir,{recursive:true,force:true});evidence.cleanup={host_disposed:true,app_closed:true,private_directory_removed:true};evidence.passed=true;console.log(JSON.stringify(evidence));
}catch(error){console.error(JSON.stringify({fixture:'Independent evidence transport verification failed',name:error.name,code:error.code,frames:String(error.stack).split('\n').filter(line=>/^\s*at /.test(line)).slice(0,3)}));process.exitCode=1;}
finally{clearTimeout(deadline);pause?.release.resolve();if(piHost)await piHost.dispose().catch(()=>{});await modelRuntime?.dispose?.();if(app)await app.close().catch(()=>{});if(db)db.close();await fs.rm(dir,{recursive:true,force:true});}
