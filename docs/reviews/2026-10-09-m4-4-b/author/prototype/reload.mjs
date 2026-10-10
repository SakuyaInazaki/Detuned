import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const repo='/Users/sakimi/Desktop/Detuned';
const pkg=path.join(repo,'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent');
const sdk=await import(pathToFileURL(path.join(pkg,'dist/index.js')));
const loader=await import(pathToFileURL(path.join(pkg,'dist/core/extensions/loader.js')));
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'detuned-pi-probe-'));
let app;let db;let session; let host; const events=[]; const deadline=setTimeout(()=>{console.error('prototype deadline');process.exit(1);},60000);
try {
 const require=createRequire(path.join(repo,'package.json')); const Database=require('better-sqlite3');
 const {bootstrapDatabase,SqliteStorage}=await import(pathToFileURL(path.join(repo,'packages/storage-sqlite/dist/index.js')));
 const {buildApp}=await import(pathToFileURL(path.join(repo,'packages/server/dist/index.js')));
 const {DetunedClient}=await import(pathToFileURL(path.join(repo,'packages/client/dist/index.js')));
 db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;app=buildApp({storage:new SqliteStorage(db)});let requests=0;app.addHook('onRequest',async()=>{requests++;});await app.listen({host:'127.0.0.1',port:0});
 const url='http://127.0.0.1:'+app.server.address().port;const client=new DetunedClient({baseUrl:url,token});const space=(await client.createSpace({slug:'private-pi',objective:'private fixture',rules:[]},'space')).data.space.id;
 process.env.DETUNED_BASE_URL=url;process.env.DETUNED_TOKEN=token;
 const beforeRequests=requests;
 const authPath=path.join(dir,'auth.json'); await fs.writeFile(authPath,'{}',{mode:0o600});
 const modelRuntime=await sdk.ModelRuntime.create({authPath,modelsPath:null,allowModelNetwork:false,refreshOnCreate:false});
 const eventBus=sdk.createEventBus();let loaded;let generation=0;
 const loadGeneration=async()=>{const gen=++generation;const runtime=sdk.createExtensionRuntime();loaded=await loader.loadExtensionsCached([path.join(repo,'packages/adapter-pi/dist/index.js')],dir,eventBus,runtime);const observer=await loader.loadExtensionFromFactory(pi=>{for(const name of ['session_start','session_shutdown'])pi.on(name,async e=>{events.push({type:e.type,reason:e.reason,generation:gen,phase:'enter'});await new Promise(r=>setImmediate(r));events.push({type:e.type,reason:e.reason,generation:gen,phase:'exit'});});},dir,eventBus,runtime,'private-observer-'+gen);loaded.extensions.push(observer);};await loadGeneration();
 const resourceLoader={getExtensions:()=>loaded,getSkills:()=>({skills:[],diagnostics:[]}),getPrompts:()=>({prompts:[],diagnostics:[]}),getThemes:()=>({themes:[],diagnostics:[]}),getAgentsFiles:()=>({agentsFiles:[]}),getSystemPrompt:()=>'',getSystemPromptSource:()=>undefined,getAppendSystemPrompt:()=>[],getAppendSystemPromptSources:()=>[],extendResources:()=>{},reload:loadGeneration};
 const settingsManager=sdk.SettingsManager.inMemory();
 const factory=async options=>{const result=await sdk.createAgentSession({...options,modelRuntime,resourceLoader,tools:loaded.extensions.flatMap(e=>[...e.tools.keys()]),settingsManager});await result.session.bindExtensions({});return {...result,services:{cwd:dir,agentDir:dir,modelRuntime,settingsManager,resourceLoader,diagnostics:[]},diagnostics:[]};};
 host=await sdk.createAgentSessionRuntime(factory,{cwd:dir,agentDir:dir,sessionManager:sdk.SessionManager.inMemory(dir)});session=host.session;
 const registered=session.extensionRunner.getAllRegisteredTools(); const names=registered.map(t=>t.definition.name).sort();
 assert.equal(names.length,8); assert.equal(requests,beforeRequests);session.setActiveToolsByName(names);assert.equal(session.getAllTools().length,8);
 const result=await session.getToolDefinition('forum_context').execute('probe',{space_id:space},new AbortController().signal);assert.ok(result.details);assert.equal(requests,beforeRequests+1); const toolError=null;

 const oldDefinition=session.getToolDefinition('forum_context');await session.reload();assert.equal(generation,2);assert.notEqual(session.getToolDefinition('forum_context'),oldDefinition);assert.equal(session.getAllTools().length,8);const after=await session.getToolDefinition('forum_context').execute('after-reload',{space_id:space},new AbortController().signal);assert.ok(after.details);assert.equal(requests,beforeRequests+2);assert.deepEqual(events.filter(e=>e.reason==='reload').map(e=>[e.phase,e.generation]),[['enter',1],['exit',1]]);
 await host.dispose();host=undefined;
 console.log(JSON.stringify({version:JSON.parse(await fs.readFile(path.join(pkg,'package.json'),'utf8')).version,loadErrors:loaded.errors.map(e=>e.error),names,toolError,generation,requests,events}));
}finally {clearTimeout(deadline);if(host)await host.dispose();session?.dispose();if(app)await app.close();if(db)db.close();await fs.rm(dir,{recursive:true,force:true});}
