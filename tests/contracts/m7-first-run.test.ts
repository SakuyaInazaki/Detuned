import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,mkdir,symlink,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
function launch(dir:string,port:number,extra:string[]=[]){const child=spawn(process.execPath,['scripts/first-run.mjs','--dir',dir,'--port',String(port),...extra],{env:{PATH:process.env.PATH??'/usr/bin:/bin',DETUNED_TOKEN:'SECRET_AMBIENT',DETUNED_BASE_URL:'http://127.0.0.1:1',NODE_OPTIONS:'--stack-trace-limit=15'},stdio:['ignore','pipe','pipe']});let out='',err='';const done=new Promise<any>((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,out,err}));});child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);return{child,done,output:()=>out};}
async function port(){const server=net.createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const p=(server.address() as net.AddressInfo).port;await new Promise<void>(r=>server.close(()=>r()));return p;}
const safeLaunch=launch;
it('M7.16 first-run binds its child then prepares two ordinary actors and closes on Ctrl-C',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'detuned-first-run-')),dir=path.join(root,'new');let run:ReturnType<typeof launch>|undefined;
 try{run=safeLaunch(dir,await port());const deadline=Date.now()+20000;while(!run.output().includes('\n')){if(Date.now()>deadline)throw Error('Owned startup deadline');await new Promise(r=>setTimeout(r,25));}
 const ready=JSON.parse(run.output().trim());expect(ready).toMatchObject({ok:true,foreground:true,participants:[{label:'author'},{label:'skeptic'}]});expect(ready.ready_url).toBe(ready.base_url+'/api/v1/health/ready');
 const secret=(await readFile(path.join(dir,'admin.token'),'utf8')).trim();expect(run.output()).not.toContain(secret);expect(run.output()).not.toContain('SECRET_AMBIENT');run.child.kill('SIGINT');const closed=await run.done;expect(closed).toMatchObject({code:0,signal:null});expect(closed.err).toContain('Detuned 服务已完整关闭。');
 }finally{run?.child.kill('SIGINT');await run?.done;await rm(root,{recursive:true,force:true});}
},30000);
it('M7.16 occupied foreign port receives zero requests and no setup directory',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'detuned-occupied-'));let requests=0;const foreign=http.createServer((_q,res)=>{requests++;res.end('{}');});await new Promise<void>(r=>foreign.listen(0,'127.0.0.1',r));
 try{const dir=path.join(root,'new'),run=safeLaunch(dir,(foreign.address() as net.AddressInfo).port),result=await run.done;expect(result.code).toBe(1);expect(result.out).toBe('');expect(requests).toBe(0);await expect(readFile(path.join(dir,'participants/receipt.json'))).rejects.toMatchObject({code:'ENOENT'});expect(await readFile(path.join(dir,'admin.token'),'utf8')).not.toBe('');}
 finally{await new Promise<void>(r=>foreign.close(()=>r()));await rm(root,{recursive:true,force:true});}
},20000);
it('M7.16 existing paths and symlink ancestors fail without replacing data',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'detuned-run-paths-'));
 try{let index=0;for(const [p,extra] of [[0,[]],[65536,[]],[3000,['--participant','only']],[3000,['--participant','same','--participant','same']],[3000,['--participant','bad/label','--participant','other']]] as Array<[number,string[]]>){const dir=path.join(root,'invalid-'+index++),r=await safeLaunch(dir,p,extra).done;expect(r.code).toBe(1);expect(r.out).toBe('');await expect(lstat(dir)).rejects.toMatchObject({code:'ENOENT'});}
 await mkdir(path.join(root,'real'));await symlink(path.join(root,'real'),path.join(root,'alias'));for(const dir of [path.join(root,'real'),path.join(root,'alias/new')]){const r=await safeLaunch(dir,3000).done;expect(r.code).toBe(1);expect(r.out).toBe('');}await expect(readFile(path.join(root,'real/admin.token'))).rejects.toMatchObject({code:'ENOENT'});}
 finally{await rm(root,{recursive:true,force:true});}
},15000);
