#!/usr/bin/env node
// Fixed trusted repository test-process orchestration; never executes forum/config commands.
import { spawn } from 'node:child_process';
import { open, readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { sha, sleep, within } from './run-support.mjs';
const raw=process.argv.slice(2),options={};
for(let i=0;i<raw.length;i+=2){const key=raw[i]?.replace(/^--/,'');if(!raw[i]?.startsWith('--')||raw[i+1]===undefined||Object.hasOwn(options,key))throw new Error('Unique --manifest --runtime --out --mode required');options[key]=raw[i+1];}
if(Object.keys(options).some(k=>!['manifest','runtime','out','mode'].includes(k))||!options.manifest||!options.runtime||!options.out||!['smoke','full'].includes(options.mode))throw new Error('Only manifest/runtime/out/mode scalar paths are accepted');
const runtime=resolve(options.runtime),privateRoot=dirname(runtime),out=resolve(options.out);
if((await stat(runtime)).mode&0o077)throw new Error('Private runtime permissions must be 0600 or stricter');
const automation=join(privateRoot,'automatic-gates');await mkdir(automation,{mode:0o700,recursive:false});
const started=performance.now(),startUTC=new Date().toISOString();const events=[];let runner,gateChild,runExit=null,runEnded=false,stopped=false,failure=null,offset=0;
const seen=new Set(),ownGroups=new Set(),terminations=new Map();
const event=x=>events.push({schema_version:1,t_ms:performance.now()-started,utc:new Date().toISOString(),...x});
function validOwned(pid){return Number.isSafeInteger(pid)&&pid>1&&ownGroups.has(pid);}
function groupAlive(pid){if(!validOwned(pid))return false;try{process.kill(-pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;event({action:'owned_group_probe_error',pid,observation:e.code==='EPERM'?'unknown_permission':'unknown_error',code:e.code??e.name});return true;}}
function clearTermination(pid){const t=terminations.get(pid);if(t){clearTimeout(t.timer);t.resolve();terminations.delete(pid);}ownGroups.delete(pid);}
function stopOwned(child){
 const pid=child?.pid;if(!validOwned(pid)||terminations.has(pid))return;
 event({action:'terminate_owned_process_group',pid});
 try{process.kill(-pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH'){failure??='owned_group_term_error';event({action:'owned_group_term_error',pid,code:e.code??e.name});}clearTermination(pid);return;}
 let done;const promise=new Promise(resolve=>{done=resolve;});
 const timer=setTimeout(async()=>{
  try{
   if(groupAlive(pid)){event({action:'sigkill_owned_process_group_after_5s',pid});process.kill(-pid,'SIGKILL');}
   const until=performance.now()+2000;while(groupAlive(pid)&&performance.now()<until)await sleep(25);
   if(groupAlive(pid)){failure??='owned_group_reap_timeout';event({action:'owned_group_reap_timeout',pid});}
   else event({action:'owned_group_gone',pid});
  }catch(e){if(e.code!=='ESRCH'){failure??='owned_group_cleanup_error';event({action:'owned_group_cleanup_error',pid,code:e.code??e.name});}}
  finally{clearTermination(pid);}
 },5000);
 terminations.set(pid,{timer,resolve:done,promise});
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopped=true;failure??=signal;stopOwned(gateChild);stopOwned(runner);});
async function fixedProcess(script,args,prefix){
 const stdoutPath=join(automation,prefix+'.stdout.log'),stderrPath=join(automation,prefix+'.stderr.log');const stdout=await open(stdoutPath,'wx',0o600),stderr=await open(stderrPath,'wx',0o600);
 let child;try{child=spawn(process.execPath,[fileURLToPath(new URL(script,import.meta.url)),...args],{stdio:['ignore',stdout.fd,stderr.fd],detached:true});}finally{await stdout.close();await stderr.close();}
 const completion=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>{if(!terminations.has(child.pid)||!groupAlive(child.pid))clearTermination(child.pid);resolve({exit_code:code,signal});});});
 ownGroups.add(child.pid);event({action:'spawn_fixed_script',script,pid:child.pid,args_without_secrets:args});return {child,completion,stdoutPath,stderrPath};
}
async function runGate(phase){
 if(seen.has(phase))throw new Error('Duplicate gate');seen.add(phase);
 const folder=join(automation,phase);await mkdir(folder,{mode:0o700,recursive:false});
 // Verifier's own .ok stays private here until the fixed child has really exited zero.
 const liveText=await readFile(join(privateRoot,'live.json'),'utf8');const clone=join(folder,'live.json');await writeFile(clone,liveText,{mode:0o600,flag:'wx'});
 const output=join(folder,'result.json');event({action:'gate_observed',phase});
 const processInfo=await fixedProcess('verify-gate.mjs',[clone,phase,output],phase);gateChild=processInfo.child;
 const result=await processInfo.completion;gateChild=null;
 event({action:'gate_process_exit',phase,...result,stdout_sha256:sha(await readFile(processInfo.stdoutPath,'utf8')),stderr_sha256:sha(await readFile(processInfo.stderrPath,'utf8'))});
 if(result.exit_code!==0||stopped||runEnded){failure??=`${phase}_fixed_verifier_failed`;stopped=true;stopOwned(runner);return;}
 const report=JSON.parse(await readFile(output,'utf8'));await stat(join(folder,phase+'.ok'));
 // Same-filesystem rename publishes the verified sentinel atomically, never before exit0.
 const temp=join(privateRoot,`.${phase}.ok-verified`);await writeFile(temp,'fixed repository verifier exited zero\n',{mode:0o600,flag:'wx'});await rename(temp,join(privateRoot,phase+'.ok'));
 event({action:'gate_released_atomically',phase,audit:report.audit,report_sha256:sha(await readFile(output,'utf8'))});
}
try{
 for(const phase of ['preflight','postflight']){try{await stat(join(privateRoot,phase+'.ok'));throw new Error('Fresh runtime must have no prior gate sentinel');}catch(e){if(e.code!=='ENOENT')throw e;}}
 const p=await fixedProcess('run.mjs',['--manifest',resolve(options.manifest),'--runtime',runtime,'--out',out,'--mode',options.mode,'--gated','true'],'runner');runner=p.child;
 p.completion.then(result=>{runExit=result;runEnded=true;event({action:'runner_exit',...result});if(gateChild)stopOwned(gateChild);}).catch(e=>{failure=e.message;runEnded=true;stopOwned(gateChild);});
 while(!runEnded&&!stopped){
  try{
   const file=await open(join(out,'operations.jsonl'),'r');let bytes;
   try{const s=await file.stat();bytes=Buffer.alloc(Math.max(0,s.size-offset));await file.read(bytes,0,bytes.length,offset);}finally{await file.close();}
   const complete=bytes.lastIndexOf(10)+1;offset+=complete;
   for(const line of bytes.subarray(0,complete).toString().split('\n').filter(Boolean)){const record=JSON.parse(line);if(record.type==='gate_start')await runGate(record.gate);}
  }catch(e){if(e.code!=='ENOENT')throw e;}
  if(!runEnded&&!stopped)await sleep(100);
 }
 if(stopped)stopOwned(runner);
 if(await within(p.completion,8000)===null){failure??='runner_exit_timeout';stopOwned(runner);}
 if(runExit?.exit_code!==0)failure??='frozen_runner_nonzero';
 if(seen.size!==2)failure??='both_gates_not_observed';
}catch(e){failure??=e.message;stopped=true;stopOwned(gateChild);stopOwned(runner);}
finally{
 if(runner&&!runEnded){stopOwned(runner);await within(new Promise(resolve=>runner.once('exit',resolve)),8000);}
 if(terminations.size)await within(Promise.all([...terminations.values()].map(x=>x.promise)),8000);
 for(const pid of [...terminations.keys()]){failure??='owned_cleanup_deadline';clearTermination(pid);}
 const status={schema_version:1,mode:options.mode,started_utc:startUTC,origin_performance_ms:started,elapsed_ms:performance.now()-started,runner_result:runExit,success:!failure&&runExit?.exit_code===0, failure,events,private_artifacts:automation};
 // No live tokens, checkpoint/cursor strings or raw verifier result/error are made public.
 try{await writeFile(join(out,'automatic-gates.json'),JSON.stringify(status,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(join(automation,'status.json'),JSON.stringify(status,null,2)+'\n',{flag:'wx',mode:0o600});}
 process.stdout.write(JSON.stringify({out,success:status.success,runner_result:runExit,failure})+'\n');if(!status.success)process.exitCode=1;
}
