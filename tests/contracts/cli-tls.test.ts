import {expect,it} from 'vitest';
import {mkdtemp,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import https from 'node:https';
import {readFile} from 'node:fs/promises';
const exec=promisify(execFile);
const built=process.env.DETUNED_SOURCE_ONLY!=='1';
function run(args:string[]):Promise<{code:number|null;out:string;err:string}>{return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['packages/cli/dist/index.js','--json',...args],{env:{PATH:process.env.PATH}});let out='',err='';
 const timer=setTimeout(()=>child.kill('SIGKILL'),10000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
 child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);resolve({code,out,err});});
});}
it.skipIf(!built)('TLS CLI01: paired flags and unreadable PEM files fail safely before creating the data directory',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'detuned-cli-tls-'));const data=path.join(root,'untouched');
 try{for(const flags of [['--tls-cert-file',path.join(root,'private-cert-marker')],['--tls-key-file',path.join(root,'private-key-marker')],['--tls-cert-file',path.join(root,'private-cert-marker'),'--tls-key-file',path.join(root,'private-key-marker')]]){
  const result=await run(['serve','--data-dir',data,...flags]);expect(result.code).toBe(2);expect(result.out).toContain('VALIDATION_ERROR');expect(result.out+result.err).not.toMatch(/private-(cert|key)-marker/);await expect(lstat(data)).rejects.toMatchObject({code:'ENOENT'});
 }}finally{await rm(root,{recursive:true,force:true});}
},40000);
it.skipIf(!built)('TLS CLI02: HTTPS Web rejects HTTP origin before data access',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'detuned-cli-tls-'));const cert=path.join(root,'cert.pem'),key=path.join(root,'key.pem'),data=path.join(root,'untouched');
 try{await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',cert],{timeout:10000});
  const result=await run(['serve','--data-dir',data,'--tls-cert-file',cert,'--tls-key-file',key,'--web-origin','http://localhost:3000','--web-allow-insecure-loopback']);expect(result.code).toBe(2);expect(result.out).toContain('VALIDATION_ERROR');expect(result.out+result.err).not.toContain(key);await expect(lstat(data)).rejects.toMatchObject({code:'ENOENT'});
 }finally{await rm(root,{recursive:true,force:true});}
},25000);
it.skipIf(!built)('TLS CLI03: API-only TLS advertises HTTPS, serves trusted health and closes on SIGTERM',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'detuned-cli-tls-'));const cert=path.join(root,'cert.pem'),key=path.join(root,'key.pem'),data=path.join(root,'data');let child:ReturnType<typeof spawn>|undefined;let reaped=false;
 try{await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',cert],{timeout:10000});expect((await run(['init','--data-dir',data])).code).toBe(0);
  child=spawn(process.execPath,['packages/cli/dist/index.js','serve','--data-dir',data,'--port','0','--tls-cert-file',cert,'--tls-key-file',key,'--no-request-logs'],{env:{PATH:process.env.PATH}});
  const closed=new Promise<number|null>((resolve,reject)=>{child!.once('error',reject);child!.once('close',code=>{reaped=true;resolve(code);});});
  const port=await new Promise<number>((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(new Error('TLS startup exceeded test budget')),10000);child!.stderr!.on('data',b=>{text+=b;const match=/https:\/\/127\.0\.0\.1:(\d+)/.exec(text);if(match){clearTimeout(timer);resolve(Number(match[1]));}});child!.once('close',()=>{clearTimeout(timer);reject(new Error('TLS process closed before readiness'));});});
  const ca=await readFile(cert);const status=await new Promise<number|undefined>((resolve,reject)=>{const req=https.get({hostname:'127.0.0.1',port,path:'/api/v1/health/live',ca},res=>{res.resume();res.once('end',()=>resolve(res.statusCode));});req.once('error',reject);req.setTimeout(5000,()=>req.destroy(new Error('Health exceeded test budget')));});expect(status).toBe(200);
  child.kill('SIGTERM');const timer=setTimeout(()=>child?.kill('SIGKILL'),12000);try{expect(await closed).toBe(0);}finally{clearTimeout(timer);}
 }finally{if(child&&!reaped){child.kill('SIGKILL');await new Promise<void>(resolve=>child!.once('close',()=>resolve()));}await rm(root,{recursive:true,force:true});}
},45000);
