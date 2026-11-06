// Controlled CLI children test supervisor lifecycle only, never real service certification.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
const source=fileURLToPath(new URL('../../scripts/first-run.mjs',import.meta.url));
const secret='FIXTURE_ONLY_NOT_A_REAL_CREDENTIAL';
const fakeCli=String.raw`
import {writeFileSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const config=JSON.parse(await fs.readFile(fileURLToPath(new URL('../../../config.json',import.meta.url)),'utf8'));
const args=process.argv.slice(2),stage=args.includes('init')?'init':args.includes('serve')?'serve':'setup';
await fs.writeFile(path.join(config.root,stage+'.pid'),String(process.pid));
await fs.appendFile(path.join(config.root,'calls'),stage+'\n');
if(process.env.DETUNED_TOKEN)throw Error('Ambient credential crossed boundary');
const option=key=>args[args.indexOf(key)+1];
if(stage==='init'){
 await fs.mkdir(option('--data-dir'),{recursive:true,mode:0o700});
 await fs.writeFile(path.join(option('--data-dir'),'initialized'),'fixture data retained');
 if(config.mode==='init-cancel'){
  process.on('SIGINT',()=>process.exit(2));
  await fs.writeFile(path.join(config.root,'init-entered'),'ready');
  process.stdout.write(config.secret);setInterval(()=>{},1000);
 }else if(config.mode==='init-deadline-success'){
  const result={is_new_instance:true,admin_actor_id:'fixture-admin',admin_token:config.secret};
  process.on('exit',code=>writeFileSync(path.join(config.root,'deadline-child-exit-code'),String(code)));
  process.on('SIGINT',async()=>{
   await fs.writeFile(path.join(config.root,'deadline-exit0.json'),JSON.stringify(result),{mode:0o600});
   process.stdout.write(JSON.stringify(result)+'\n',()=>process.exit(0));
  });
  await fs.writeFile(path.join(config.root,'init-entered'),'ready');setInterval(()=>{},1000);
 }else process.stdout.write(JSON.stringify({is_new_instance:true,admin_actor_id:'fixture-admin',admin_token:config.secret})+'\n');
}else if(stage==='serve'){
 const port=Number(option('--port')),server=http.createServer((req,res)=>{
  if(req.url==='/api/v1/me'){
   if(req.headers.authorization!=='Bearer '+config.secret){res.statusCode=401;res.end('{}');return;}
   res.end(JSON.stringify({data:{actor:{id:'fixture-admin'},capabilities:['admin']}}));
  }else if(req.url==='/api/v1/health/ready')res.end('{}');
  else {res.statusCode=404;res.end('{}');}
 });
 const finish=()=>server.close(()=>{process.stderr.write('Detuned 服务已完整关闭。\n');process.exit(0);});
 process.on('SIGINT',config.mode==='forced'?()=>{}:finish);process.on('SIGTERM',config.mode==='forced'?()=>{}:finish);
 server.listen(port,'127.0.0.1',async()=>{await fs.writeFile(path.join(config.root,'serve-entered'),'ready');process.stderr.write('Detuned 服务已启动: http://127.0.0.1:'+port+'\n');});
}else{
 const output=option('--output');await fs.mkdir(output,{mode:0o700});
 await fs.writeFile(path.join(output,'actor-author.token'),config.secret,{mode:0o600});
 await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({version:1,status:'unknown',steps:[{operation:'credential.create',participant:'author',status:'completed'},{operation:'actor.create',participant:'skeptic',status:'unknown'}],participants:[{label:'author',actor_id:'fixture-author',credential_id:'fixture-credential',token_file:path.join(output,'actor-author.token')}]}),{mode:0o600});
 if(config.mode==='setup-cancel'){
  process.on('SIGINT',()=>process.exit(2));await fs.writeFile(path.join(config.root,'setup-entered'),'ready');setInterval(()=>{},1000);
 }else if(config.mode==='setup-fail'){process.stderr.write(config.secret);process.exitCode=1;}
 else process.stdout.write(JSON.stringify({space_id:'fixture-space',participants:[{label:'author',actor_id:'fixture-author',token_file:path.join(output,'actor-author.token')}]})+'\n');
}
`;
async function waitUntil(check,label,timeout=10000){const end=Date.now()+timeout;while(!await check()){if(Date.now()>end)throw Error('Lifecycle barrier timed out: '+label);await new Promise(resolve=>setTimeout(resolve,20));}}
async function exists(file){try{await readFile(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
function alive(pid){try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}}
async function freePort(){const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function fixture(mode,body){
 const root=await mkdtemp(path.join(tmpdir(),'detuned-supervisor-lifecycle-')),tree=path.join(root,'fixture'),runDir=path.join(root,'run');
 await mkdir(path.join(tree,'scripts'),{recursive:true});await mkdir(path.join(tree,'packages/cli/dist'),{recursive:true});
 await copyFile(source,path.join(tree,'scripts/first-run.mjs'));assert.deepEqual(await readFile(source),await readFile(path.join(tree,'scripts/first-run.mjs')));
 await writeFile(path.join(tree,'package.json'),'{'+'"type":"module"'+'}');await writeFile(path.join(tree,'config.json'),JSON.stringify({root,mode,secret}));const cli=path.join(tree,'packages/cli/dist/index.js');await writeFile(cli,fakeCli);
 const sentinel=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',env:{PATH:process.env.PATH??'/usr/bin:/bin'}}),sentinelClosed=new Promise(resolve=>sentinel.once('close',resolve));
 const child=spawn(process.execPath,[path.join(tree,'scripts/first-run.mjs'),'--dir',runDir,'--port',String(await freePort())],{stdio:['ignore','pipe','pipe'],env:{PATH:path.dirname(process.execPath)+':/usr/bin:/bin',DETUNED_TOKEN:'AMBIENT_FIXTURE_CREDENTIAL'}});
 let out='',err='',closed=false;
 child.stdout.on('data',value=>out+=value);child.stderr.on('data',value=>err+=value);
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>{closed=true;resolve({code,signal,out,err});});});
 const timer=setTimeout(()=>child.kill('SIGKILL'),25000);
 async function pid(stage){return Number(await readFile(path.join(root,stage+'.pid'),'utf8'));}
 try{await body({root,runDir,child,done,pid,output:()=>out,sentinel});assert.equal(alive(sentinel.pid),true,'Unrelated owned sentinel must remain alive');}
 finally{
  clearTimeout(timer);if(!closed){child.kill('SIGINT');await Promise.race([done,new Promise(resolve=>setTimeout(resolve,1500))]).catch(()=>{});if(!closed)child.kill('SIGKILL');}
  await done.catch(()=>{});
  // Cleanup may signal only our recorded fixture CLI argv, never names or process groups.
  try{
   for(const stage of ['init','setup','serve']){const file=path.join(root,stage+'.pid');if(await exists(file)){const target=await pid(stage);if(alive(target)){let cmd;try{cmd=await readFile('/proc/'+target+'/cmdline','utf8');}catch(error){if(error.code==='ENOENT'&&!alive(target))continue;throw error;}assert.ok(cmd.split('\0').includes(cli),'Refuse a PID whose fixture identity changed');process.kill(target,'SIGKILL');await waitUntil(()=>!alive(target),'owned CLI reap',3000);}}}
  }finally{sentinel.kill('SIGKILL');await sentinelClosed;await rm(root,{recursive:true,force:true});}
 }
}
function safe(result){assert.equal(result.out.includes(secret),false);assert.equal(result.err.includes(secret),false);assert.equal((result.out+result.err).includes('AMBIENT_FIXTURE_CREDENTIAL'),false);}
test('init cancellation retains own partial data and reaps the only active child',async()=>fixture('init-cancel',async f=>{
 await waitUntil(()=>exists(path.join(f.root,'init-entered')),'init entered');const pid=await f.pid('init');f.child.kill('SIGINT');const result=await f.done;assert.equal(result.code,1);assert.equal(result.signal,null);safe(result);assert.equal(alive(pid),false);assert.equal(await readFile(path.join(f.runDir,'data/initialized'),'utf8'),'fixture data retained');assert.equal(await readFile(path.join(f.root,'calls'),'utf8'),'init\n');
}));
test('setup cancellation or failure retains unknown receipt and credentials without retry',async()=>{for(const mode of ['setup-cancel','setup-fail'])await fixture(mode,async f=>{
 if(mode==='setup-cancel'){await waitUntil(()=>exists(path.join(f.root,'setup-entered')),'setup entered');f.child.kill('SIGINT');}
 const result=await f.done;assert.equal(result.code,1);assert.equal(result.signal,null);safe(result);assert.equal(alive(await f.pid('serve')),false);assert.equal(alive(await f.pid('setup')),false);assert.equal(await readFile(path.join(f.runDir,'data/initialized'),'utf8'),'fixture data retained');assert.ok(await readFile(path.join(f.runDir,'participants/actor-author.token'),'utf8')===secret,'Retained fixture credential mismatch');const receipt=JSON.parse(await readFile(path.join(f.runDir,'participants/receipt.json'),'utf8'));assert.equal(receipt.status,'unknown');assert.equal(receipt.steps.at(-1).status,'unknown');assert.equal(receipt.participants[0].actor_id,'fixture-author');assert.equal((await readFile(path.join(f.root,'calls'),'utf8')).split('\n').filter(value=>value==='setup').length,1);assert.equal(result.err.includes('Detuned 服务已完整关闭。'),false);
 });});
test('serve ignoring INT and TERM is actually killed and never reported clean',async()=>fixture('forced',async f=>{
 await waitUntil(()=>f.output().includes('\n'),'supervisor ready');const ready=JSON.parse(f.output().trim());assert.equal(ready.ok,true);const pid=await f.pid('serve');assert.equal(alive(pid),true);f.child.kill('SIGINT');const result=await f.done;assert.equal(result.code,1);assert.equal(result.signal,null);safe(result);assert.equal(alive(pid),false);assert.match(result.err,/did not complete a verified clean shutdown/);assert.equal(result.err.includes('Detuned 服务已完整关闭。'),false);
}));

test('init deadline rejects valid JSON and exit zero after timeout without continuing serve',async()=>fixture('init-deadline-success',async f=>{
 await waitUntil(()=>exists(path.join(f.root,'init-entered')),'init deadline entered');
 const pid=await f.pid('init');let outcome;void f.done.then(value=>{outcome=value;});
 // No external signal: the original supervisor's real ten-second init deadline fires.
 await waitUntil(()=>exists(path.join(f.root,'deadline-exit0.json')),'real init deadline signal',15000);
 const returned=JSON.parse(await readFile(path.join(f.root,'deadline-exit0.json'),'utf8'));
 await waitUntil(()=>exists(path.join(f.root,'deadline-child-exit-code')),'fixture zero exit');assert.equal(await readFile(path.join(f.root,'deadline-child-exit-code'),'utf8'),'0');
 assert.equal(returned.is_new_instance,true);assert.equal(returned.admin_actor_id,'fixture-admin');assert.ok(returned.admin_token===secret,'Fixture must return the same valid bootstrap shape as normal init');
 await waitUntil(async()=>outcome!==undefined||await exists(path.join(f.root,'serve-entered')),'parent reject or forbidden next stage',5000);
 assert.equal(await exists(path.join(f.root,'serve-entered')),false,'Timed-out init must not advance to serve');
 const result=await f.done;assert.equal(result.code,1);assert.equal(result.signal,null);safe(result);assert.equal(result.out,'');assert.match(result.err,/failed at init/);
 assert.equal(alive(pid),false);assert.equal(await readFile(path.join(f.runDir,'data/initialized'),'utf8'),'fixture data retained');
 assert.equal(await readFile(path.join(f.root,'calls'),'utf8'),'init\n');assert.equal(await exists(path.join(f.runDir,'participants/receipt.json')),false);
}));
