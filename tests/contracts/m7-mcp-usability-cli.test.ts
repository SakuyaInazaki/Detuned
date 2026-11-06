import {expect,it} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const entry='packages/cli/dist/index.js';
function start(args:string[]){
 const env={...process.env};delete env.DETUNED_TOKEN;delete env.DETUNED_TOKEN_FILE;
 const child=spawn(process.execPath,[entry,...args],{env,stdio:['ignore','pipe','pipe']});let out='',err='';
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);
 const closed=new Promise<{code:number|null;out:string;err:string}>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CLI timeout'));},15000);child.once('error',reject);child.once('close',code=>{clearTimeout(timer);resolve({code,out,err});});});
 return{child,closed,stderr:()=>err};
}
it('M7.10-B help names mandatory consumer and ACK flags and view choices',async()=>{
 for(const [args,flags] of [
  [['subscribe','--help'],['--space','--consumer-key']],
  [['poll','--help'],['--space','--consumer-id']],
  [['ack','--help'],['--space','--consumer-id','--batch-id','--next-cursor']],
 ] as [string[],string[]][]){const result=await start(args).closed;expect(result.code).toBe(0);for(const flag of flags){const line=result.out.split('\n').find(line=>line.includes(flag));expect(line).toContain('必需');}}
 const health=await start(['health','--help']).closed;expect(health.out).toContain('health live');expect(health.out).toContain('health ready');
 const view=await start(['view','--help']).closed;for(const name of ['findings','failures','open-questions'])expect(view.out).toContain(name);
});
it('M7.10-B migrate help matches supported legacy and current schema',async()=>{
 const result=await start(['migrate','--help']).closed;expect(result.code).toBe(0);expect(result.out).toContain('schema1–5');expect(result.out).toContain('schema6');expect(result.out).not.toContain('schema3目录');
});
it('M7.10-B serve reports successful shutdown only after actual close',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'detuned-m710-close-'));let running:ReturnType<typeof start>|undefined;
 try{
  expect((await start(['--json','init','--data-dir',path.join(dir,'data')]).closed).code).toBe(0);
  running=start(['serve','--data-dir',path.join(dir,'data'),'--host','127.0.0.1','--port','0']);
  for(let i=0;i<100&&!running.stderr().includes('服务已启动');i++)await new Promise(r=>setTimeout(r,20));
  expect(running.stderr()).toContain('服务已启动');expect(running.stderr()).not.toContain('服务已完整关闭');
  running.child.kill('SIGINT');const result=await running.closed;expect(result.code).toBe(0);expect(result.err).toContain('Detuned 服务已完整关闭。');
  const failure=await start(['serve','--data-dir',path.join(dir,'absent'),'--port','invalid']).closed;expect(failure.code).toBe(2);expect(failure.err).not.toContain('服务已完整关闭');
 }finally{if(running&&running.child.exitCode===null)running.child.kill('SIGKILL');await rm(dir,{recursive:true,force:true});}
});
