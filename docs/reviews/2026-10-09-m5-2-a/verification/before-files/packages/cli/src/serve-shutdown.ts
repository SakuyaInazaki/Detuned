import { performance } from 'node:perf_hooks';
import { DetunedError, ErrorCode } from '@detuned/protocol';
export function parseShutdownTimeout(value: unknown): number {
 if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1000||Number(value)>120000) throw new DetunedError(ErrorCode.VALIDATION_ERROR,'关闭等待参数必须为1000–120000的安全整数。',400);
 return Number(value);
}
export interface ServeShutdownDependencies {
 beginDraining():void; closeApp():Promise<void>; closeDatabase():void; releaseLock():void;
 disposeLogs():void; reportFailure():void; exit(code:number):void;
}
/** One owned close task; failed or expired phases never advance to DB/lock cleanup. */
export function createServeShutdown(deps:ServeShutdownDependencies,timeoutMs:number){
 let task:Promise<void>|undefined;let requestedExitCode=0;let expired=false;let timer:ReturnType<typeof setTimeout>|undefined;
 let attached:NodeJS.Process|undefined;
 const dispose=()=>{if(timer){clearTimeout(timer);timer=undefined;}if(attached){attached.removeListener('SIGINT',onSignal);attached.removeListener('SIGTERM',onSignal);attached=undefined;}deps.disposeLogs();};
 const fail=()=>{expired=true;try{deps.reportFailure();}catch{}try{dispose();}catch{}deps.exit(1);};
 const shutdown=(exitCode=0):Promise<void>=>{
  if(exitCode!==0)requestedExitCode=1;
  if(task)return task;
  let resolveTask!:()=>void;task=new Promise<void>(resolve=>{resolveTask=resolve;});
  const deadline=performance.now()+timeoutMs;
  const withinBudget=()=>{if(expired)return false;if(performance.now()>=deadline){fail();return false;}return true;};
  timer=setTimeout(()=>{fail();resolveTask();},timeoutMs);
  try{deps.beginDraining();}catch{fail();resolveTask();return task;}
  void (async()=>{
   try{await deps.closeApp();if(!withinBudget())return;deps.closeDatabase();if(!withinBudget())return;deps.releaseLock();if(!withinBudget())return;dispose();deps.exit(requestedExitCode);}catch{if(!expired)fail();}finally{resolveTask();}
  })();
  return task;
 };
 const onSignal=()=>{void shutdown();};
 return{shutdown,attachSignals(target:NodeJS.Process=process){if(attached)return;attached=target;target.on('SIGINT',onSignal);target.on('SIGTERM',onSignal);},dispose};
}
