import {within} from './run-support.mjs';
import {performance} from 'node:perf_hooks';

// Join every worker before the caller closes HTTP, the server or evidence files.
// One controller spans a worker's poll -> ledger -> ACK chain, including the gap
// between poll completion and starting ACK.
export async function catchupAll(clients, {controllers,stopped,onFailure,step,timeoutMs=5000,durationMs=120000}) {
  const deadline=performance.now()+durationMs, group=new Set();
  const results=await Promise.allSettled(clients.map(async client=>{
    const controller=new AbortController();group.add(controller);controllers.add(controller);
    try{
      for(let batch=0;performance.now()<deadline;batch++){
        if(stopped()||controller.signal.aborted)throw new Error(stopped()||'catchup_cancelled');
        const timer=setTimeout(()=>controller.abort(),timeoutMs);
        try{
          const done=await step(client,controller.signal,batch);
          if(stopped()||controller.signal.aborted)throw new Error(stopped()||'catchup_cancelled');
          if(done)return;
        }finally{clearTimeout(timer);}
      }
      throw new Error('catchup_deadline');
    }catch(error){
      onFailure(error);
      for(const sibling of group)sibling.abort();
      throw error;
    }finally{controllers.delete(controller);group.delete(controller);}
  }));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
}

// Observe close immediately after spawn: exit alone does not prove stdio was reaped.
export function observeChild(child) {
  return new Promise(resolve => {
    let spawnError;
    child.once('error', error => {spawnError=error.code??error.name;});
    child.once('close', (code,signal) => {
      resolve({code,signal,...(spawnError?{error:spawnError}:{})});
    });
  });
}

export async function closeServer(child, completion, {graceMs=10000,termMs=2000,killMs=2000}={}) {
  let result=await within(completion,0);
  let forced=false;
  if(!result){
    if(child.connected)try{child.send({type:'close'},()=>{});}catch{}
    result=await within(completion,graceMs);
  }
  if(!result){
    forced=true;
    child.kill('SIGTERM');
    result=await within(completion,termMs);
  }
  if(!result){
    child.kill('SIGKILL');
    result=await within(completion,killMs);
  }
  return {
    closed:result!==null,
    forced,
    ...(result??{code:null,signal:null}),
    success:!!result&&!forced&&result.code===0&&!result.signal&&!result.error,
  };
}

export function httpConcurrency() {
  let active=0,peak=0;
  const phases=new Map();
  return {
    begin(phase) {
      const row=phases.get(phase)??{active:0,peak:0};
      phases.set(phase,row);
      active++;
      peak=Math.max(peak,active);
      row.active++;
      row.peak=Math.max(row.peak,row.active);
      let ended=false;
      return () => {
        if(!ended){
          ended=true;
          active--;
          row.active--;
        }
      };
    },
    snapshot() {
      return {
        scope:'fetch_start_through_complete_response_body',
        peak,
        active,
        by_phase:Object.fromEntries([...phases].map(([phase,row])=>[phase,{...row}])),
      };
    },
  };
}
