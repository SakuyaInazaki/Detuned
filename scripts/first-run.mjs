#!/usr/bin/env node
// Explicit foreground supervisor. Own child handles are the only signal targets.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url)),cli=path.join(repo,'packages/cli/dist/index.js');
let stage='arguments',directory,serve,serveClosed,serveExit,complete=false,interrupted=false,active;
const stop=new AbortController();
function cancel(){interrupted=true;stop.abort();active?.kill('SIGINT');}
function options(args){
 const values=new Map(),participants=[];
 for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--dir','--port','--participant'].includes(key)||!value||value.startsWith('--'))throw Error('Options');if(key==='--participant')participants.push(value);else{if(values.has(key))throw Error('Repeated option');values.set(key,value);}}
 const dir=values.get('--dir'),text=values.get('--port')??'3000';
 if(!dir||!path.isAbsolute(dir)||dir.split(path.sep).some(p=>p==='.'||p==='..')||!/^\d+$/.test(text))throw Error('Directory or port');
 const port=Number(text);if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Port');
 const labels=participants.length?participants:['author','skeptic'];
 if(labels.length<2||labels.length>8||new Set(labels).size!==labels.length||labels.some(x=>!(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/).test(x)))throw Error('Participants');
 return{dir:path.resolve(dir),port,labels};
}
async function newDirectory(dir){
 let current=path.parse(dir).root;
 for(const component of path.relative(current,path.dirname(dir)).split(path.sep).filter(Boolean)){current=path.join(current,component);const stat=await fs.lstat(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Unsafe parent');}
 if(dir===repo.slice(0,-1)||dir.startsWith(repo))throw Error('Use a directory outside source');
 await fs.mkdir(dir,{mode:0o700});
}
function spawnCli(args,env){return spawn(process.execPath,[cli,...args],{cwd:directory,env,stdio:['ignore','pipe','pipe']});}
async function run(args,env,timeout){
 if(stop.signal.aborted)throw Error('Canceled');
 const child=spawnCli(args,env);active=child;let stdout='',overflow=false,timedOut=false,timer,killTimer;
 const outcome=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
 child.stdout.on('data',chunk=>{if(stdout.length+chunk.length>262144){overflow=true;child.kill('SIGINT');}else stdout+=chunk;});child.stderr.on('data',()=>{});
 timer=setTimeout(()=>{timedOut=true;child.kill('SIGINT');killTimer=setTimeout(()=>child.kill('SIGKILL'),2000);},timeout);
 try{const result=await outcome;if(timedOut||overflow||result.code!==0||result.signal!==null||stop.signal.aborted)throw Error('Command failed');return JSON.parse(stdout);}
 finally{clearTimeout(timer);clearTimeout(killTimer);if(active===child)active=undefined;}
}
async function main(){
 const config=options(process.argv.slice(2));stage='directory';await newDirectory(config.dir);directory=config.dir;
 await fs.mkdir(path.join(directory,'home'),{mode:0o700});await fs.mkdir(path.join(directory,'tmp'),{mode:0o700});await fs.mkdir(path.join(directory,'cache'),{mode:0o700});
 const env={PATH:path.dirname(process.execPath)+':/usr/bin:/bin',HOME:path.join(directory,'home'),TMPDIR:path.join(directory,'tmp'),XDG_CACHE_HOME:path.join(directory,'cache')};
 process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
 stage='init';const init=await run(['--json','init','--data-dir',path.join(directory,'data')],env,10000);
 if(init.is_new_instance!==true||typeof init.admin_actor_id!=='string'||typeof init.admin_token!=='string'||!init.admin_token)throw Error('Fresh bootstrap required');
 await fs.writeFile(path.join(directory,'bootstrap.json'),JSON.stringify(init)+'\n',{flag:'wx',mode:0o600});
 const tokenFile=path.join(directory,'admin.token');await fs.writeFile(tokenFile,init.admin_token+'\n',{flag:'wx',mode:0o600});
 if(stop.signal.aborted)throw Error('Canceled');
 const url=`http://127.0.0.1:${config.port}`;
 stage='serve';serve=spawnCli(['serve','--data-dir',path.join(directory,'data'),'--host','127.0.0.1','--port',String(config.port),'--no-request-logs'],env);
 let startup='',resolveReady,rejectReady;
 const started=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 serveClosed=new Promise((resolve,reject)=>{serve.once('error',error=>{rejectReady(error);reject(error);});serve.once('close',(code,signal)=>{serveExit={code,signal};rejectReady(Error('Serve closed'));resolve(serveExit);});});
 void serveClosed.catch(()=>{});
 serve.stdout.on('data',()=>{});serve.stderr.on('data',chunk=>{startup=(startup+chunk).slice(-65536);if(startup.includes('Detuned 服务已完整关闭。'))complete=true;if(startup.split('\n').includes(`Detuned 服务已启动: ${url}`)&&serve.exitCode===null&&serve.signalCode===null)resolveReady();});
 let startupTimer;const canceled=new Promise((_,reject)=>stop.signal.addEventListener('abort',()=>reject(Error('Canceled')),{once:true}));void canceled.catch(()=>{});
 try{await Promise.race([started,canceled,new Promise((_,reject)=>{startupTimer=setTimeout(()=>reject(Error('Startup deadline')),10000);})]);}finally{clearTimeout(startupTimer);}
 // Never contact a port before our own child's successful listen marker.
 stage='ready';const readyAbort=new AbortController(),readyTimer=setTimeout(()=>readyAbort.abort(),10000);
 const abortReady=()=>readyAbort.abort();stop.signal.addEventListener('abort',abortReady,{once:true});void serveClosed.then(abortReady,abortReady);
 try{
  const meResponse=await fetch(url+'/api/v1/me',{headers:{Authorization:`Bearer ${init.admin_token}`},signal:readyAbort.signal});
  if(!meResponse.ok)throw Error('Identity refused');const me=await meResponse.json();
  if(me.data?.actor?.id!==init.admin_actor_id||!me.data?.capabilities?.includes('admin'))throw Error('Instance binding failed');
  const ready=await fetch(url+'/api/v1/health/ready',{signal:readyAbort.signal});if(!ready.ok)throw Error('Not ready');await ready.arrayBuffer();
 }finally{clearTimeout(readyTimer);stop.signal.removeEventListener('abort',abortReady);}
 if(serveExit||stop.signal.aborted)throw Error('Server ended');
 stage='setup';const inputFile=path.join(directory,'space.json');await fs.writeFile(inputFile,JSON.stringify({slug:'local-research',objective:'Local collaboration',rules:[]}),{flag:'wx',mode:0o600});
 const onServeEnd=()=>active?.kill('SIGINT');void serveClosed.then(onServeEnd,onServeEnd);
 const result=await run(['--url',url,'--token-file',tokenFile,'--json','setup','--input',inputFile,...config.labels.flatMap(label=>['--participant',label]),'--output',path.join(directory,'participants')],env,30000);
 await fs.writeFile(path.join(directory,'setup-result.json'),JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});
 if(serveExit||stop.signal.aborted)throw Error('Server ended');
 process.stdout.write(JSON.stringify({ok:true,base_url:url,ready_url:url+'/api/v1/health/ready',space_id:result.space_id,participants:result.participants.map(({label,actor_id,token_file})=>({label,actor_id,token_file})),setup_result_file:path.join(directory,'setup-result.json'),participants_directory:path.join(directory,'participants'),foreground:true,stop:'Ctrl-C; wait for complete shutdown'})+'\n');
 stage='running';await Promise.race([canceled,serveClosed.then(()=>{throw Error('Server ended');})]);
}
let failed=false;
try{await main();}catch{if(interrupted&&stage!=='running')failed=true;if(!interrupted){failed=true;process.stderr.write(`Detuned first run failed at ${stage}. Existing data, credentials and receipts are retained; inspect privately and use a new directory for a new run.\n`);}}
finally{
 if(active){active.kill('SIGINT');failed=true;}
 if(serve){
  if(!serveExit)serve.kill('SIGINT');let closeTimer,forceTimer,reapTimer,forced=false;
  try{await Promise.race([serveClosed,new Promise((_,reject)=>{closeTimer=setTimeout(()=>{forced=true;serve.kill('SIGTERM');forceTimer=setTimeout(()=>{serve.kill('SIGKILL');reapTimer=setTimeout(()=>reject(Error('Child close unconfirmed')),2000);},2000);},8000);})]);if(forced||serveExit?.code!==0||serveExit?.signal!==null||!complete)failed=true;}
  catch{failed=true;}finally{clearTimeout(closeTimer);clearTimeout(forceTimer);clearTimeout(reapTimer);}
  if(!failed)process.stderr.write('Detuned 服务已完整关闭。\n');else process.stderr.write('Detuned first run did not complete a verified clean shutdown.\n');
 }
 process.off('SIGINT',cancel);process.off('SIGTERM',cancel);
 process.exitCode=failed?1:0;
}
