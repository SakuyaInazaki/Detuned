import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,chmod,symlink,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
import {createPiNativeEnvironment} from '../helpers/pi-native-environment.js';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const script=path.join(repo,'scripts/mcp-probe.mjs');
const gone=(pid:number)=>{try{process.kill(pid,0);return false;}catch(error:any){return error.code==='ESRCH';}};
async function fixture(run:(f:any)=>Promise<void>) {
 const isolated=await createPiNativeEnvironment(),db=new Database(':memory:');const adminToken=bootstrapDatabase(db).adminToken!;
 const app=buildApp({storage:new SqliteStorage(db)});let active:number|undefined;const observed=new Set<number>();let requests=0;
 app.addHook('onRequest',async()=>{requests++;if(active&&process.platform==='linux'){const children=(await readFile(`/proc/${active}/task/${active}/children`,'utf8')).trim().split(/\s+/).filter(Boolean).map(Number);expect(children).toHaveLength(1);children.forEach(pid=>observed.add(pid));}});
 try {
  const url=await app.listen({host:'127.0.0.1',port:0});const c=new DetunedClient({baseUrl:url,token:adminToken,maxRetries:0});
  const sid=(await c.createSpace({slug:'probe',objective:'read only',rules:[]},'probe-space')).data.space.id;
  const made=await c.createActor({kind:'agent',display_name:'ordinary'});await c.createMembership(sid,{actor_id:made.id,role:'contributor'});
  const credential=await c.createCredential({actor_id:made.id,allowed_space_ids:[sid],capabilities:['read','write']});
  const tokenFile=path.join(isolated.root,'PRIVATE_TOKEN_PATH.token');await writeFile(tokenFile,credential.token,{mode:0o600});
  const snapshot=()=>JSON.stringify(Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row:any)=>[row.name,db.prepare('SELECT * FROM "'+row.name+'"').all().map(x=>JSON.stringify(x)).sort()])));
  const execute=async(args:string[],entry=script)=>new Promise<{code:number|null;signal:string|null;out:string;err:string}>((resolve,reject)=>{
   const child=spawn(process.execPath,[entry,...args],{env:{...isolated.env,DETUNED_TOKEN:'PRIVATE_ENV_NEVER_USE'},stdio:['ignore','pipe','pipe']});active=child.pid;let out='',err='';const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Probe fixture deadline'));},15000);
   child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.on('error',reject);child.on('close',(code,signal)=>{clearTimeout(timeout);active=undefined;resolve({code,signal,out,err});});
  });
  await run({root:isolated.root,url,tokenFile,snapshot,execute,requests:()=>requests,observed});
 } finally {await app.close();db.close();await isolated.remove();}
}
it('M7.12 project stdio probe verifies exact nine tools and global reads in both modes with zero database writes',async()=>{
 await fixture(async(f:any)=>{const before=f.snapshot();for(const mode of ['flat','wrapped']){const r=await f.execute(['--url',f.url,'--token-file',f.tokenFile,'--input-mode',mode]);expect(r.code).toBe(0);expect(r.signal).toBeNull();expect(r.err).toBe('');expect(JSON.parse(r.out)).toMatchObject({ok:true,input_mode:mode,tool_count:9,me_valid:true,spaces_valid:true,spaces_returned:1,bridge_exit:{code:0,signal:null},bridge_requested_signals:[]});expect(r.out).not.toContain('PRIVATE');expect(f.snapshot()).toBe(before);}if(process.platform==='linux')expect(f.observed.size).toBe(2);for(const pid of f.observed)expect(gone(pid)).toBe(true);});
});
it('M7.12 probe rejects unsafe local input before HTTP and wrong credentials without partial stdout or secret details',async()=>{
 await fixture(async(f:any)=>{const before=f.snapshot(),count=f.requests();for(const extra of [['--token','PRIVATE_ARGUMENT'],['--timeout-ms','1abc'],['--input-mode','PRIVATE_MODE']]){const r=await f.execute(['--url',f.url,'--token-file',f.tokenFile,...extra]);expect(r.code).toBe(1);expect(r.out).toBe('');expect(r.err).not.toContain('PRIVATE');}await chmod(f.tokenFile,0o644);let r=await f.execute(['--url',f.url,'--token-file',f.tokenFile]);expect(r.code).toBe(1);expect(r.out).toBe('');expect(r.err).not.toContain('PRIVATE');expect(f.requests()).toBe(count);await chmod(f.tokenFile,0o600);await writeFile(f.tokenFile,'PRIVATE_INVALID_TOKEN\n');r=await f.execute(['--url',f.url,'--token-file',f.tokenFile]);expect(r.code).toBe(1);expect(r.out).toBe('');expect(r.err).toContain('failed at me');expect(r.err).not.toContain('PRIVATE');expect(f.snapshot()).toBe(before);for(const pid of f.observed)expect(gone(pid)).toBe(true);});
});
async function shadow(root:string,body:string) {
 const dir=path.join(root,'shadow');await mkdir(path.join(dir,'scripts'),{recursive:true});await mkdir(path.join(dir,'packages/mcp/dist'),{recursive:true});
 await symlink(path.join(repo,'node_modules'),path.join(dir,'node_modules'));await symlink(path.join(repo,'packages/protocol'),path.join(dir,'packages/protocol'));
 await copyFile(script,path.join(dir,'scripts/mcp-probe.mjs'));await writeFile(path.join(dir,'packages/mcp/dist/index.js'),body);return path.join(dir,'scripts/mcp-probe.mjs');
}
for(const variant of ['exit','timeout'])it(`M7.12 probe ${variant} observes its actual SDK child exit and never forwards hostile bridge stderr`,async()=>{
 await fixture(async(f:any)=>{const pidFile=path.join(f.root,'owned-child.pid');const entry=await shadow(f.root,`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(pidFile)},String(process.pid));process.stderr.write('PRIVATE_BRIDGE_STDERR'.repeat(20000));${variant==='exit'?'setTimeout(()=>process.exit(7),100);':'setInterval(()=>{},1000);'}`);const before=f.snapshot(),count=f.requests();const r=await f.execute(['--url',f.url,'--token-file',f.tokenFile,'--timeout-ms','1000'],entry);expect(r.code).toBe(1);expect(r.signal).toBeNull();expect(r.out).toBe('');expect(r.err).not.toContain('PRIVATE');expect(r.err.length).toBeLessThan(200);expect(f.requests()).toBe(count);expect(f.snapshot()).toBe(before);const pid=Number(await readFile(pidFile,'utf8'));expect(Number.isSafeInteger(pid)).toBe(true);expect(gone(pid)).toBe(true);});
});

it('M7.12 probe rejects a completed bridge that ignores EOF and converts requested TERM to exit zero',async()=>{
 await fixture(async(f:any)=>{
  const pidFile=path.join(f.root,'owned-child.pid'),termFile=path.join(f.root,'requested-term'),readsFile=path.join(f.root,'completed-reads');
  const source=`import fs from 'node:fs';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {DetunedClient} from ${JSON.stringify(pathToFileURL(path.join(repo,'packages/client/dist/index.js')).href)};
import {resolveLocalToken} from ${JSON.stringify(pathToFileURL(path.join(repo,'packages/client/dist/node.js')).href)};
import {getMcpTools} from ${JSON.stringify(pathToFileURL(path.join(repo,'packages/mcp/dist/tool-validation.js')).href)};
fs.writeFileSync(${JSON.stringify(pidFile)},String(process.pid));
const client=new DetunedClient({baseUrl:process.env.DETUNED_BASE_URL,token:resolveLocalToken({tokenFile:process.env.DETUNED_TOKEN_FILE}),maxRetries:0});
const server=new Server({name:'controlled-eof-bridge',version:'1'},{capabilities:{tools:{}}});let reads=0;
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:getMcpTools()}));
server.setRequestHandler(CallToolRequestSchema,async request=>{const result=await client.callTool('forum_read',request.params.arguments);fs.writeFileSync(${JSON.stringify(readsFile)},String(++reads));return {content:[],structuredContent:{result}};});
process.on('SIGTERM',()=>{fs.writeFileSync(${JSON.stringify(termFile)},'SIGTERM');process.exit(0);});
setInterval(()=>{},1000);await server.connect(new StdioServerTransport());`;
  const entry=await shadow(f.root,source),before=f.snapshot(),count=f.requests();const r=await f.execute(['--url',f.url,'--token-file',f.tokenFile],entry);
  expect(r.code).toBe(1);expect(r.signal).toBeNull();expect(r.out).toBe('');expect(r.err).toContain('failed at close');expect(r.err).not.toContain('PRIVATE');
  expect(await readFile(readsFile,'utf8')).toBe('2');expect(await readFile(termFile,'utf8')).toBe('SIGTERM');expect(f.requests()-count).toBe(2);expect(f.snapshot()).toBe(before);
  const pid=Number(await readFile(pidFile,'utf8'));expect(Number.isSafeInteger(pid)).toBe(true);expect(gone(pid)).toBe(true);
 });
});
