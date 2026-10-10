import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const repo='/Users/sakimi/Desktop/Detuned';
const pkg=path.join(repo,'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent');
const sdk=await import(pathToFileURL(path.join(pkg,'dist/index.js')));
const loader=await import(pathToFileURL(path.join(pkg,'dist/core/extensions/loader.js')));
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'detuned-pi-probe-'));
let session; const events=[]; const deadline=setTimeout(()=>{console.error('prototype deadline');process.exit(1);},60000);
try {
 const authPath=path.join(dir,'auth.json'); await fs.writeFile(authPath,'{}',{mode:0o600});
 const modelRuntime=await sdk.ModelRuntime.create({authPath,modelsPath:null,allowModelNetwork:false,refreshOnCreate:false});
 const eventBus=sdk.createEventBus();const runtime=sdk.createExtensionRuntime();
 const loaded=await loader.loadExtensions([path.join(repo,'packages/adapter-pi/dist/index.js')],dir,eventBus,runtime);
 const observer=await loader.loadExtensionFromFactory(pi=>{for(const name of ['session_start','session_before_switch','session_before_fork','session_shutdown']) pi.on(name,async e=>{events.push({type:e.type,reason:e.reason});});},dir,eventBus,runtime,'private-observer');
 loaded.extensions.push(observer);
 const resourceLoader={getExtensions:()=>loaded,getSkills:()=>({skills:[],diagnostics:[]}),getPrompts:()=>({prompts:[],diagnostics:[]}),getThemes:()=>({themes:[],diagnostics:[]}),getAgentsFiles:()=>({agentsFiles:[]}),getSystemPrompt:()=>'',getSystemPromptSource:()=>undefined,getAppendSystemPrompt:()=>[],getAppendSystemPromptSources:()=>[],extendResources:()=>{},reload:async()=>{}};
 const result=await sdk.createAgentSession({cwd:dir,agentDir:dir,modelRuntime,resourceLoader,tools:[],sessionManager:sdk.SessionManager.inMemory(dir),settingsManager:sdk.SettingsManager.inMemory()});session=result.session;
 await session.bindExtensions({});
 const registered=session.extensionRunner.getAllRegisteredTools(); const names=registered.map(t=>t.definition.name).sort();
 let toolError;try {await registered.find(t=>t.definition.name==='forum_context').definition.execute('probe',{space_id:'private-probe'},new AbortController().signal);}catch(e){toolError=e.constructor.name;}
 console.log(JSON.stringify({version:JSON.parse(await fs.readFile(path.join(pkg,'package.json'),'utf8')).version,loadErrors:loaded.errors.map(e=>e.error),names,toolError,events}));
}finally {clearTimeout(deadline);session?.dispose();await fs.rm(dir,{recursive:true,force:true});}
