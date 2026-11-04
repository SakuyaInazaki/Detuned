import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
// @ts-expect-error repository runtime helper is plain ESM
import {observeChild,closeServer,httpConcurrency,catchupAll} from '../../scripts/scale/run-lifecycle.mjs';

function deferred<T=void>() {
 let resolve!: (value:T|PromiseLike<T>)=>void;
 const promise=new Promise<T>(done=>{resolve=done;});
 return {promise,resolve};
}
it('completes normal catchup and starts no poll when already stopped',async()=>{
 const controllers=new Set<AbortController>(),polls=[0,0];
 let failure:string|null=null;
 const options={controllers,stopped:()=>failure,onFailure:(e:Error)=>{failure??=e.message;},step:async(client:number,signal:AbortSignal)=>{
  expect(signal.aborted).toBe(false);return ++polls[client]===2;
 }};
 await catchupAll([0,1],options);expect(polls).toEqual([2,2]);expect(controllers.size).toBe(0);
 failure='SIGTERM';await expect(catchupAll([0,1],options)).rejects.toThrow('SIGTERM');
 expect(polls).toEqual([2,2]);expect(controllers.size).toBe(0);
});
it('cancels catchup between delivery and ACK and joins all workers before returning',async()=>{
 const controllers=new Set<AbortController>(),delivered=deferred(),release=deferred();
 let failure:string|null=null,polls=0,acks=0;
 const running=catchupAll([0],{controllers,stopped:()=>failure,onFailure:(e:Error)=>{failure??=e.message;},step:async(_client:number,signal:AbortSignal)=>{
  polls++;delivered.resolve();await release.promise;
  // The production consumer checks the same signal after writing its delivery ledger.
  signal.throwIfAborted();acks++;return false;
 }});
 await delivered.promise;failure='SIGTERM';for(const controller of controllers)controller.abort();release.resolve();
 await expect(running).rejects.toThrow();
 expect({polls,acks,active:controllers.size}).toEqual({polls:1,acks:0,active:0});
});
it('stops catchup siblings on failure and waits for their cancellation cleanup',async()=>{
 const controllers=new Set<AbortController>(),started=deferred(),cleanup=deferred();
 let failure:string|null=null,cleaned=false,settled=false,polls=0;
 const running=catchupAll([0,1],{controllers,stopped:()=>failure,onFailure:(e:Error)=>{failure??=e.message;},step:async(client:number,signal:AbortSignal)=>{
  polls++;
  if(client===0){await started.promise;throw new Error('catchup invariant');}
  started.resolve();await new Promise<void>(resolve=>signal.addEventListener('abort',()=>resolve(),{once:true}));
  await cleanup.promise;cleaned=true;signal.throwIfAborted();return false;
 }});
 void running.then(()=>{settled=true;},()=>{settled=true;});
 // Sibling cancellation is observable before releasing its delayed finalizer.
 await started.promise;await new Promise<void>(resolve=>setTimeout(resolve,0));
 expect(settled).toBe(false);expect(controllers.size).toBe(1);
 cleanup.resolve();await expect(running).rejects.toThrow('catchup invariant');
 expect({polls,cleaned,active:controllers.size}).toEqual({polls:2,cleaned:true,active:0});
});
it('retains an ACK already committed before cancellation without starting another poll',async()=>{
 const controllers=new Set<AbortController>(),committed=deferred(),reply=deferred();
 let failure:string|null=null,polls=0,acks=0;
 const running=catchupAll([0],{controllers,stopped:()=>failure,onFailure:(e:Error)=>{failure??=e.message;},step:async()=>{
  polls++;acks++;committed.resolve();await reply.promise;return false;
 }});
 await committed.promise;failure='SIGINT';for(const controller of controllers)controller.abort();reply.resolve();
 await expect(running).rejects.toThrow('SIGINT');
 expect({polls,acks,active:controllers.size}).toEqual({polls:1,acks:1,active:0});
});
it('observes actual close and rejects forced server shutdown instead of reporting success',async()=>{
 const child=spawn(process.execPath,['-e',"process.on('message',()=>process.exit(0));process.send('ready');"],{stdio:['ignore','ignore','ignore','ipc']});
 const completion=observeChild(child);await new Promise(resolve=>child.once('message',resolve));
 expect(await closeServer(child,completion,{graceMs:1000})).toMatchObject({closed:true,forced:false,code:0,success:true});
 const stuck=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});process.on('message',()=>{});process.send('ready');setInterval(()=>{},1000);"],{stdio:['ignore','ignore','ignore','ipc']});
 const stuckCompletion=observeChild(stuck);await new Promise(resolve=>stuck.once('message',resolve));
 try{expect(await closeServer(stuck,stuckCompletion,{graceMs:40,termMs:40,killMs:1000})).toMatchObject({closed:true,forced:true,signal:'SIGKILL',success:false});}
 finally{if(stuck.exitCode===null&&stuck.signalCode===null)stuck.kill('SIGKILL');await stuckCompletion;}
});
it('counts overlapping HTTP bodies and releases rejected or completed attempts exactly once',()=>{
 const c=httpConcurrency(),a=c.begin('measure'),b=c.begin('measure'),d=c.begin('setup');
 expect(c.snapshot()).toMatchObject({peak:3,active:3,by_phase:{measure:{peak:2,active:2}}});
 a();a();b();d();expect(c.snapshot()).toMatchObject({peak:3,active:0,by_phase:{measure:{peak:2,active:0},setup:{peak:1,active:0}}});
});
