// Source preparation only; root release required. Exact draft blocks, own paths/port substitutions only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const repo='/Users/sakimi/Desktop/Detuned',v=path.join(repo,'docs/reviews/2026-10-10-m7-4-b/verification');
const draft=path.join(repo,'docs/reviews/2026-10-10-m7-4-b/author/review/readme-quickstart-draft.md');
const registry=process.argv[3];const registryParent=await fs.realpath(path.dirname(registry));const registryInfo=await fs.lstat(registryParent);assert.ok(registryInfo.isDirectory()&&!registryInfo.isSymbolicLink());assert.equal(registryInfo.uid,process.getuid());assert.equal(registryInfo.mode&0o777,0o700);assert.ok(/^detuned-doc-capture-[A-Za-z0-9_-]+$/.test(path.basename(registryParent)));
const output=process.argv[2];assert.equal(path.dirname(path.resolve(output)),v);
const PIN='e36ccb133d9684f9f028a92acd85999bc35f54d2934e9f12ebc09fd1a02d772a';
const safe={status:'pending',stage:'preflight',observations:{},cleanup:{}};let allocated,root,original,expired=false;const children=[];const began=Date.now(),workEnd=began+20000,finalEnd=began+23000;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const within=async(p,end)=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned deadline')),Math.max(0,end-Date.now()));})]);}finally{clearTimeout(timer);}};
const launch=(command,args)=>{const child=spawn(command,args,{cwd:repo,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin',CI:'true',HOME:process.env.HOME},detached:false,stdio:['ignore','pipe','pipe']});const row={child,closed:false,stdout:'',stderr:'',error:false,close:null};row.close=new Promise(resolve=>{child.on('error',()=>{row.error=true;});child.once('close',(code,signal)=>{row.closed=true;row.exit={code,signal};resolve();});});child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>{row.stdout+=x;});child.stderr.on('data',x=>{row.stderr+=x;});children.push(row);return row;};
const signal=(row,value)=>{if(!row.closed){assert.ok(Number.isSafeInteger(row.child.pid)&&row.child.pid>1);try{row.child.kill(value);}catch(e){if(e.code!=='ESRCH')throw e;}}};
const finish=async row=>{await within(row.close,workEnd);assert.equal(row.error,false);assert.deepEqual(row.exit,{code:0,signal:null});};
const stop=async row=>{signal(row,'SIGTERM');await within(row.close,workEnd);assert.deepEqual(row.exit,{code:0,signal:null});};
const timer=setTimeout(()=>{expired=true;for(const row of children){try{signal(row,'SIGTERM');}catch{safe.cleanup.unverified=true;}}},20000);
try{
 const text=await within(fs.readFile(draft,'utf8'),workEnd);assert.equal(createHash('sha256').update(text).digest('hex'),PIN);const blocks=[...text.matchAll(/```sh\n([\s\S]*?)```/g)].map(m=>m[1]);assert.equal(blocks.length,4);
 allocated=await within(fs.mkdtemp(path.join(tmpdir(),'detuned-readme-smoke-')),workEnd);root=await within(fs.realpath(allocated),workEnd);const info=await within(fs.lstat(root),workEnd);assert.equal(info.mode&0o777,0o700);assert.equal(info.uid,process.getuid());assert.ok(info.isDirectory()&&!info.isSymbolicLink());await within(fs.writeFile(registry,JSON.stringify({root}),{flag:'wx',mode:0o600}),workEnd);const local=path.join(root,'local');
 const substitute=(block,port)=>block.replaceAll('detunedLocalDir="$HOME/Detuned-local-new"',`detunedLocalDir=${JSON.stringify(local)}`).replaceAll('127.0.0.1:3000',`127.0.0.1:${port}`).replaceAll('--port 3000',`--port ${port}`);
 safe.stage='private_init';await finish(launch('/bin/sh',['-c',substitute(blocks[1],0)]));
 for(const name of ['bootstrap.json','admin.token']){const s=await within(fs.lstat(path.join(local,name)),workEnd);assert.ok(s.isFile());assert.equal(s.mode&0o777,0o600);}const bootstrap=JSON.parse(await within(fs.readFile(path.join(local,'bootstrap.json'),'utf8'),workEnd));const adminToken=await within(fs.readFile(path.join(local,'admin.token'),'utf8'),workEnd);assert.equal(adminToken.trim()===bootstrap.admin_token,true);safe.observations.private_bootstrap_and_plaintext_token=true;
 safe.stage='loopback_serve';const server=launch('/bin/sh',['-c',substitute(blocks[2],0).replace('node packages/cli/dist/index.js','exec node packages/cli/dist/index.js')]);let port;while(!port){if(server.closed)throw Error('Server early close');const match=/http:\/\/127\.0\.0\.1:([1-9][0-9]*)/.exec(server.stderr);if(match)port=Number(match[1]);else await within(pause(20),workEnd);}
 safe.stage='ordinary_setup';await finish(launch('/bin/sh',['-c',substitute(blocks[3],port)]));const space=JSON.parse(await within(fs.readFile(path.join(local,'space-result.json'),'utf8'),workEnd)).space.id;const actors=[];
 for(const label of ['a','b']){safe.stage=`ordinary_me_${label}`;const tokenFile=path.join(local,`actor-${label}.token`),s=await within(fs.lstat(tokenFile),workEnd);assert.ok(s.isFile());assert.equal(s.mode&0o777,0o600);const issued=JSON.parse(await within(fs.readFile(path.join(local,`credential-${label}-result.json`),'utf8'),workEnd));assert.equal((await within(fs.readFile(tokenFile,'utf8'),workEnd)).trim()===issued.token,true);const cli=launch(process.execPath,['packages/cli/dist/index.js','--url',`http://127.0.0.1:${port}`,'--token-file',tokenFile,'--json','me']);await finish(cli);const me=JSON.parse(cli.stdout);assert.ok(me.actor.id!==bootstrap.admin_actor_id);assert.deepEqual(me.capabilities,['read','write']);assert.deepEqual(me.allowed_space_ids,[space]);actors.push(me.actor.id);cli.stdout='';}
 assert.equal(new Set(actors).size,2);safe.observations.distinct_nonadmin_space_scoped_readwrite= true;safe.observations.ordinary_identities_verified=2;safe.stage='normal_serve_close';await stop(server);safe.observations.serve_actual_close_zero=true;safe.status='passed';
}catch(error){original=error;safe.status='failed';if(['Error','AssertionError','TypeError','SyntaxError','RangeError'].includes(error?.name))safe.error_name=error.name;if(['EPERM','EACCES','ENOENT','ERR_ASSERTION'].includes(error?.code))safe.error_code=error.code;}
finally{
 clearTimeout(timer);for(const row of children){try{signal(row,'SIGTERM');await within(Promise.race([row.close,pause(500)]),finalEnd);if(!row.closed)signal(row,'SIGKILL');await within(row.close,finalEnd);}catch{safe.cleanup.unverified=true;}}
 safe.cleanup.actual_children_closed=children.every(row=>row.closed);for(const row of children){row.stdout='';row.stderr='';}
 if(safe.cleanup.actual_children_closed){try{await within(fs.rm(root??allocated,{recursive:true,force:true}),finalEnd);try{await within(fs.lstat(root??allocated),finalEnd);throw Error('Root remains');}catch(error){if(error.code!=='ENOENT')throw error;}safe.cleanup.private_root_absent=true;}catch{safe.cleanup.unverified=true;}}else safe.cleanup.private_root_retained=true;
 safe.watchdog_expired=expired;if(original||expired||safe.cleanup.unverified||!safe.cleanup.actual_children_closed||!safe.cleanup.private_root_absent)safe.status='failed';
 await fs.writeFile(output,JSON.stringify(safe,null,2)+'\n',{flag:'wx',mode:0o600});
}
process.stdout.write(JSON.stringify({status:safe.status,stage:safe.stage})+'\n');process.exitCode=safe.status==='passed'?0:1;
