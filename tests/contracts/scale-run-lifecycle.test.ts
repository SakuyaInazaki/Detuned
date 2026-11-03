import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
// @ts-expect-error repository runtime helper is plain ESM
import {observeChild,closeServer,httpConcurrency} from '../../scripts/scale/run-lifecycle.mjs';
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
