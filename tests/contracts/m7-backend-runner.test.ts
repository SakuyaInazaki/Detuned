import {afterEach,expect,it} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
async function fixture(body:string,name='pnpm.mjs'){const root=await mkdtemp(path.join(tmpdir(),'detuned-backend-runner-'));roots.push(root);const entry=path.join(root,name);await writeFile(entry,body);return {root,entry};}
function run(action:string,entry?:string,extra:Record<string,string>={}){
 const env:NodeJS.ProcessEnv={...process.env,npm_config_user_agent:'pnpm/11.7.0',...extra,PATH:'/controlled-no-global-pnpm'};delete env.npm_execpath;if(entry!==undefined)env.npm_execpath=entry;
 const child=spawn(process.execPath,['scripts/backend.mjs',action],{env,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 const closed=new Promise<{code:number|null;signal:NodeJS.Signals|null;stdout:string;stderr:string}>((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});
 return {child,closed};
}
it.each(['build','typecheck','lint'])('backend %s uses the supplied Node pnpm entry with exact serial package scope',async action=>{
 const {root,entry}=await fixture('import {writeFileSync} from "node:fs";writeFileSync(process.env.RECORD,JSON.stringify(process.argv.slice(2)));');
 const record=path.join(root,'args.json');const result=await run(action,entry,{RECORD:record}).closed;expect(result.code).toBe(0);expect(result.signal).toBeNull();
 expect(JSON.parse(await readFile(record,'utf8'))).toEqual(['--workspace-concurrency=1',...['protocol','core','client','storage-sqlite','module-review','server','cli','mcp','adapter-pi'].flatMap(name=>['--filter',`@detuned/${name}`]),'-r','run',action]);
});
it('backend runner rejects missing, relative and non-file entries without reflecting their values',async()=>{
 const {root,entry}=await fixture('throw Error("must not execute");');
 for(const value of [undefined,'PRIVATE-relative',root,path.join(root,'PRIVATE-missing')]){const result=await run('build',value).closed;expect(result.code).toBe(1);expect(result.stderr).toContain('npm_execpath');expect(result.stderr).not.toContain('PRIVATE');}
 const result=await run('PRIVATE-action',entry).closed;expect(result.code).toBe(1);expect(result.stderr).not.toContain('PRIVATE');
});
it('backend runner preserves a failing package-manager exit code',async()=>{
 const {entry}=await fixture('process.exitCode=37;');expect((await run('build',entry).closed).code).toBe(37);
});
it('backend runner accepts an extensionless Node shim and refuses a non-pnpm invocation',async()=>{
 const {entry}=await fixture('process.exitCode=0;','pnpm');expect((await run('build',entry).closed).code).toBe(0);
 const result=await run('build',entry,{npm_config_user_agent:'npm/10.9.3'}).closed;expect(result.code).toBe(1);expect(result.stderr).toContain('pnpm invocation');
});
it('backend runner forwards termination to its owned child and exits by the same signal',async()=>{
 const {root,entry}=await fixture('import {writeFileSync} from "node:fs";process.on("SIGTERM",()=>{writeFileSync(process.env.RECORD,"terminated");process.exit(0);});console.log("ready");setInterval(()=>{},1000);');
 const record=path.join(root,'signal.txt');const {child,closed}=run('build',entry,{RECORD:record});
 try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture did not become ready')),2000);child.stdout.on('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(Error('Fixture exited before ready'));});});child.kill('SIGTERM');const result=await closed;expect(result.code).toBeNull();expect(result.signal).toBe('SIGTERM');expect(await readFile(record,'utf8')).toBe('terminated');}
 finally{child.kill('SIGTERM');}
});
