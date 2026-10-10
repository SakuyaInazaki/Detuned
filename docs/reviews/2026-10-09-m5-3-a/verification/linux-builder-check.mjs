// One phase per disposable owned builder container; no install/build repetition.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),value=n=>{const i=process.argv.indexOf(n);return i<0?undefined:process.argv[i+1];};
const phase=value('--phase'),out=value('--evidence');assert.ok(['typecheck','lint','core','core-targeted','d01'].includes(phase)&&out);
const binding=JSON.parse(await readFile(path.join(here,'execution-binding.json'),'utf8'));
assert.ok(binding.parent_execution_approved&&binding.cold_build_window_released);assert.match(binding.builder_image_id,/^sha256:[a-f0-9]{64}$/);
const env={PATH:process.env.PATH??'/usr/bin:/bin',DOCKER_CONFIG:binding.docker_config,DOCKER_HOST:binding.docker_host};
const repo=path.resolve(here,'../../../..'),name=`detuned-m53-d-linux-${phase}-${randomBytes(5).toString('hex')}`,docker=binding.docker_cli;
const receipt={phase,image_id:binding.builder_image_id,container:name,actual_gate_uid:1000,cold_install_or_build_repeated:false,commands:[],inputs:[]};
const hash=b=>createHash('sha256').update(b).digest('hex');
async function run(args,limit=20000,logs=false,input){
 const start=Date.now();return await new Promise((resolve,reject)=>{
  const child=spawn(docker,args,{env,stdio:['pipe','pipe','pipe']});let stdout='',stderr='',timeout=false;
  const so=logs?createWriteStream(out+'.stdout.log',{flags:'wx'}):undefined,se=logs?createWriteStream(out+'.stderr.log',{flags:'wx'}):undefined;
  child.stdout.on('data',b=>{if(so)so.write(b);else stdout+=b;});child.stderr.on('data',b=>{if(se)se.write(b);else stderr+=b;});
  const timer=setTimeout(()=>{timeout=true;child.kill('SIGKILL');},limit);
  child.on('error',()=>{clearTimeout(timer);reject(Error('Owned Docker launch failed.'));});
  child.on('close',async(code,signal)=>{clearTimeout(timer);await Promise.all([so,se].filter(Boolean).map(s=>new Promise(r=>s.end(r))));receipt.commands.push({argv:args,exit:code,signal,timeout,elapsed_ms:Date.now()-start,stderr_sha256:hash(logs?await readFile(out+'.stderr.log'):stderr)});resolve({code,stdout,timeout});});
  child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}
async function must(args,limit=20000,logs=false){const r=await run(args,limit,logs);assert.equal(r.code,0);assert.equal(r.timeout,false);return r;}
async function copy(f,target){const bytes=await readFile(path.join(repo,f));receipt.inputs.push({path:f,sha256:hash(bytes)});await must(['cp',path.join(repo,f),`${name}:${target}`]);}
let created=false;
await writeFile(out+'.ledger.json',JSON.stringify({kind:'container',name,registered_before_use:true})+'\n',{flag:'wx'});
try{
 await must(['create','--name',name,'--network','none','--entrypoint','node',binding.builder_image_id,'-e','setInterval(()=>{},1000)']);created=true;await must(['start',name]);
 if(phase==='core'){
  const folder='/app/docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures';
  await must(['exec',name,'node','-e',`require('node:fs').mkdirSync('${folder}',{recursive:true})`]);
  for(const f of ['legacy-post-service.js','legacy-thread-service.ts'])await copy('docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/'+f,folder+'/'+f);
 }
 if(phase==='d01'){
  await must(['exec',name,'node','-e',"require('node:fs').mkdirSync('/app/scripts/integrations/deployment',{recursive:true})"]);
  for(const f of ['d01-recovery.mjs','d01-worker.mjs'])await copy('scripts/integrations/deployment/'+f,'/app/scripts/integrations/deployment/'+f);
  await copy('docs/reviews/2026-10-09-m5-3-a/verification/d01-smoke-oracle.mjs','/tmp/d01-smoke-oracle.mjs');
 }
 const repaired=['tests/contracts/m5-web-auth-independent.test.ts','tests/contracts/m4-mcp-wrapped-independent.test.ts','tests/contracts/r4-c-contracts.test.ts'];
 if(phase==='core-targeted')for(const f of repaired)await copy(f,'/app/'+f);
 // Only a disposable container filesystem; no host volume/user material is mounted.
 await must(['exec','--user','0:0',name,'chown','-R','1000:1000','/app'],120000);
 const command=phase==='d01'?['node','--import','/tmp/d01-smoke-oracle.mjs','scripts/integrations/deployment/d01-recovery.mjs','--repo-root','/app','--receipt','/tmp/d01-safe-receipt.json','--smoke-20']:phase==='core-targeted'?['pnpm','test',...repaired]:['pnpm',phase==='core'?'test':phase];
 const result=await run(['exec','--user','1000:1000','-e','HOME=/tmp','-e','CI=1',name,...command],phase==='core'?300000:phase==='d01'?180000:60000,true);
 receipt.exit_code=result.code;receipt.timed_out=result.timeout;
 if(phase==='d01'){
  const safe=await must(['exec',name,'node','-e',"process.stdout.write(require('node:fs').readFileSync('/tmp/d01-safe-receipt.json'))"]);
  const report=JSON.parse(safe.stdout);receipt.d01=report;assert.equal(report.status,'passed');assert.equal(report.checks.smoke_20,true);assert.equal(report.cleanup.owned_children_remaining,0);
  const oracle=await must(['exec',name,'node','-e',"process.stdout.write(require('node:fs').readFileSync('/tmp/d01-independent-smoke-oracle.json'))"]);
  receipt.independent_smoke_oracle=JSON.parse(oracle.stdout);assert.equal(receipt.independent_smoke_oracle.status,'passed');
 }
 assert.equal(result.code,0);assert.equal(result.timeout,false);receipt.status='passed';
}catch{receipt.status='failed';process.exitCode=1;}
finally{
 const removed=await run(['rm','-f',name]);receipt.cleanup={created,owned_container_removed:removed.code===0,owned_VM_retained:true};
 await writeFile(out+'.receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 process.stdout.write(JSON.stringify({phase,status:receipt.status,exit_code:receipt.exit_code,cleanup:receipt.cleanup})+'\n');
}
