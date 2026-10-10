// One authorized local failure-cleanup experiment; not a load benchmark.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {open,readFile,writeFile,stat} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {join} from 'node:path';
const base='docs/reviews/2026-10-06-m2-4-c2/implementation/load';
const privateRoot='/private/tmp/detuned-c2-load-fault-private-v3-a2',out='/private/tmp/detuned-c2-load-fault-v3-a2';
const args=['scripts/scale/run-verified.mjs','--manifest','/private/tmp/detuned-c2-seed-smoke-20261006-v3-a1/manifest.json','--runtime',join(privateRoot,'runtime.json'),'--out',out,'--mode','smoke'];
const stdout=await open(join(base,'fault-wrapper-v2.stdout.log'),'wx',0o600),stderr=await open(join(base,'fault-wrapper-v2.stderr.log'),'wx',0o600);
const child=spawn(process.execPath,args,{stdio:['ignore',stdout.fd,stderr.fd],detached:true});await stdout.close();await stderr.close();
const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let runnerPID,serverPID,live,cancelledAt;const record={kind:'real_owned_SIGSTOP_TERM_fallback_not_load_smoke',command:[process.execPath,...args],wrapper_pid:child.pid,started_utc:new Date().toISOString()};
function absent(pid){try{return execFileSync('ps',['-p',String(pid),'-o','pid=,ppid=,pgid=,comm='],{encoding:'utf8'}).trim()==='';}catch(e){if(e.status===1)return true;throw e;}}
try{
 const deadline=performance.now()+8000;
 while(performance.now()<deadline){
  try{
   const config=JSON.parse((await readFile(join(out,'run-config.jsonl'),'utf8')).trim());serverPID=config.server_pid;
   const row=execFileSync('ps',['-p',String(serverPID),'-o','pid=,ppid=,pgid='],{encoding:'utf8'}).trim().split(/\s+/).map(Number);
   assert.equal(row[0],serverPID);runnerPID=row[1];assert.equal(row[2],runnerPID);assert.ok(Number.isSafeInteger(runnerPID)&&runnerPID>1);
   const runner=execFileSync('ps',['-p',String(runnerPID),'-o','pid=,ppid=,pgid='],{encoding:'utf8'}).trim().split(/\s+/).map(Number);assert.deepEqual(runner,[runnerPID,child.pid,runnerPID]);
   live=JSON.parse(await readFile(join(privateRoot,'live.json'),'utf8'));
   const operations=await readFile(join(out,'operations.jsonl'),'utf8');if(!operations.includes('"type":"gate_start"')){await sleep(10);continue;}
   record.runner_pid=runnerPID;record.server_pid=serverPID;record.verified_group_parent=runner;record.phase_before_fault='preflight';break;
  }catch(e){if(e.code!=='ENOENT')throw e;}await sleep(10);
 }
 assert.ok(record.runner_pid,'owned group discovered before deadline');
 try{await stat(join(privateRoot,'preflight.ok'));throw new Error('preflight already released before fault');}catch(e){if(e.code!=='ENOENT')throw e;}
 process.kill(-runnerPID,'SIGSTOP');record.sigstop_utc=new Date().toISOString();cancelledAt=performance.now();child.kill('SIGTERM');record.wrapper_cancel_utc=new Date().toISOString();
 let timer;const result=await Promise.race([exited,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('wrapper failed to exit within 12s')),12000);})]).finally(()=>clearTimeout(timer));record.wrapper_exit=result;record.cancel_to_exit_ms=performance.now()-cancelledAt;
 assert.notEqual(result.code,0);assert.ok(record.cancel_to_exit_ms<=12000);
 const status=JSON.parse(await readFile(join(out,'automatic-gates.json'),'utf8'));assert.equal(status.success,false);assert.ok(status.events.some(e=>e.action==='sigkill_owned_process_group_after_5s'&&e.pid===runnerPID));assert.ok(!status.events.some(e=>e.action==='gate_released_atomically'));
 for(const phase of ['preflight','postflight']){try{await stat(join(privateRoot,phase+'.ok'));throw new Error('failure published successful gate');}catch(e){if(e.code!=='ENOENT')throw e;}}
 assert.ok(absent(runnerPID));assert.ok(absent(serverPID));assert.ok(absent(child.pid));
 for(const e of status.events)if(e.action==='spawn_fixed_script')assert.ok(absent(e.pid));
 try{await fetch(new URL('/api/v1/capabilities',live.base_url),{signal:AbortSignal.timeout(1000)});throw new Error('leftover listener');}catch(e){assert.equal(e.cause?.code,'ECONNREFUSED');}
 record.success=true;record.killed_after5s=status.events.filter(e=>e.action==='sigkill_owned_process_group_after_5s');record.all_owned_processes_absent=true;record.loopback_listener='ECONNREFUSED';record.measure_window_started=false;
}catch(e){record.success=false;record.error=e.message;throw e;}
finally{
 // Only PIDs/group proven above to be created by this experiment; never unrelated processes.
 if(runnerPID&&!absent(runnerPID)){try{process.kill(-runnerPID,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}}
 if(child.exitCode===null){try{child.kill('SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}}
 await writeFile(join(base,'fault-experiment-v2.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
}
console.log(JSON.stringify({success:record.success,cancel_to_exit_ms:record.cancel_to_exit_ms,wrapper_exit:record.wrapper_exit,all_owned_processes_absent:record.all_owned_processes_absent}));
