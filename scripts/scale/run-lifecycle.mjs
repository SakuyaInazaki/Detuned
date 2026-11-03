import {within} from './run-support.mjs';

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
