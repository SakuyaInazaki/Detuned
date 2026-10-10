// Independent guard-only experiment. Never launches the Claude binary.
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const repo='/Users/sakimi/Desktop/Detuned',source=path.join(repo,'scripts/integrations/claude-check-probe.mjs');
const sourceSHA='e733a5ad1cf5963fa525910364b99c2602480c42855b8c137abaea16c48805b6',binary='/Users/sakimi/.local/share/claude/versions/2.1.282',binarySHA='fcfd837103965c64de34a6b9b94370d77a347ea71819715a27d5f0ef01775ea4';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function streamedHash(file){const d=createHash('sha256');for await(const b of createReadStream(file,{highWaterMark:65536}))d.update(b);return d.digest('hex');}
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--output');const output=path.resolve(args[1]);assert.equal(path.dirname(output),path.join(repo,'docs/reviews/2026-10-10-m7-4-a/verification'));
let allocated,owned,allowed,forbidden,child,childState,timeout,originalFailure;let allowedHits=0,forbiddenHits=0;
const report={status:'pending',source_sha256:sourceSHA,binary_sha256:binarySHA,binary_launched:false,model_calls:0,guard:{},cleanup:{}};
try{
 const actual=await fs.readFile(source,'utf8');assert.equal(hash(actual),sourceSHA);
 assert.equal(await fs.realpath(binary),binary);const info=await fs.stat(binary);assert.equal(info.isFile(),true);assert.equal(info.size,222245312);assert.equal(await streamedHash(binary),binarySHA);
 const home=process.env.HOME;assert.equal(home,'/Users/sakimi');const template=actual.match(/const policy=`([^`]+)`;await fs\.writeFile\(profile,policy/);assert.ok(template);report.policy_template_sha256=hash(template[1]);
 allocated=await fs.mkdtemp(path.join(tmpdir(),'detuned-claude-guard-only-'));owned=await fs.realpath(allocated);const ownedStat=await fs.lstat(owned);report.canonical={allocated_alias_changed:allocated!==owned,owned_realpath_equal:await fs.realpath(owned)===owned,no_symlink:!ownedStat.isSymbolicLink(),directory:ownedStat.isDirectory(),mode0700:(ownedStat.mode&0o777)===0o700,current_uid:ownedStat.uid===process.getuid()};assert.ok(report.canonical.owned_realpath_equal&&report.canonical.no_symlink&&report.canonical.directory&&report.canonical.mode0700&&report.canonical.current_uid);
 allowed=createServer((_req,res)=>{allowedHits++;res.end('owned-allowed');});forbidden=createServer((_req,res)=>{forbiddenHits++;res.end('owned-forbidden');});
 await new Promise((resolve,reject)=>{allowed.once('error',reject);allowed.listen(0,'127.0.0.1',resolve);});await new Promise((resolve,reject)=>{forbidden.once('error',reject);forbidden.listen(0,'127.0.0.1',resolve);});
 const port=allowed.address().port,forbiddenPort=forbidden.address().port,sentinel=path.join(owned,'forbidden-sentinel');await fs.writeFile(sentinel,'owned-negative',{mode:0o600});report.canonical.sentinel_realpath_equal=await fs.realpath(sentinel)===sentinel;assert.equal(report.canonical.sentinel_realpath_equal,true);
 // Exact A-v2 literal, evaluated only for its four approved runtime parameters.
 const substitutions={home,owned,port:String(port),sentinel};const rendered=template[1].replace(/\$\{(home|owned|port|sentinel)\}/g,(_all,key)=>substitutions[key]);assert.equal(rendered.includes('${'),false);const policy=JSON.parse('"'+rendered.replaceAll('"','\\"')+'"');
 report.profile_sha256=hash(policy);const profile=path.join(owned,'guard.sb');await fs.writeFile(profile,policy,{mode:0o600});report.canonical.profile_realpath_equal=await fs.realpath(profile)===profile;assert.equal(report.canonical.profile_realpath_equal,true);
 const program=path.join(owned,'guard-check.cjs');await fs.writeFile(program,`const http=require('node:http'),fs=require('node:fs');const get=p=>new Promise(resolve=>{const q=http.get({host:'127.0.0.1',port:p,path:'/api/v1/health/live'},s=>{s.resume();s.on('end',()=>resolve('allowed'));});q.on('error',e=>resolve(e.code));q.setTimeout(1000,()=>q.destroy(Object.assign(Error('deadline'),{code:'GUARD_TIMEOUT'})));});(async()=>{let sentinel;try{fs.readFileSync(${JSON.stringify(sentinel)});sentinel='allowed';}catch(e){sentinel=e.code;}console.log(JSON.stringify({allowed:await get(${port}),forbidden:await get(${forbiddenPort}),sentinel}));})().catch(()=>process.exit(1));`,{mode:0o600});
 child=spawn('/usr/bin/sandbox-exec',['-f',profile,process.execPath,program],{cwd:owned,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});let stdout='',stderr='',expired=false;
 childState={closed:false,error:false};const close=new Promise(resolve=>{child.once('error',()=>{childState.error=true;});child.once('close',(code,signal)=>{Object.assign(childState,{closed:true,code,signal});resolve();});});
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>4096)child.kill('SIGKILL');});child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>4096)child.kill('SIGKILL');});timeout=setTimeout(()=>{expired=true;child.kill('SIGKILL');},3000);await close;clearTimeout(timeout);
 report.hits={allowed:allowedHits,forbidden:forbiddenHits};report.child_close={code:childState.code,signal:childState.signal};report.child_observation={error:childState.error,expired,stderr_bytes:Buffer.byteLength(stderr)};assert.deepEqual({code:childState.code,signal:childState.signal,error:childState.error,expired},{code:0,signal:null,error:false,expired:false});assert.equal(stderr,'');report.guard=JSON.parse(stdout);assert.equal(report.guard.allowed,'allowed');assert.ok(['EPERM','EACCES'].includes(report.guard.forbidden));assert.ok(['EPERM','EACCES'].includes(report.guard.sentinel));assert.equal(allowedHits,1);assert.equal(forbiddenHits,0);report.hits={allowed:allowedHits,forbidden:forbiddenHits};report.child_close={code:childState.code,signal:childState.signal};report.status='passed';
}catch(error){originalFailure={name:error.name,code:typeof error.code==='string'?error.code:null};report.status='failed';report.failure=originalFailure;process.exitCode=1;}
finally{
 if(timeout)clearTimeout(timeout);const failures=[];
 if(child&&!childState.closed){try{const close=new Promise(resolve=>child.once('close',resolve));child.kill('SIGKILL');await close;}catch{failures.push('child');}}
 report.cleanup.child_closed=!child||childState.closed;
 for(const [name,server]of [['allowed',allowed],['forbidden',forbidden]]){try{if(server?.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));report.cleanup[name+'_closed']=true;}catch{failures.push(name);}}
 try{const cleanupRoot=owned??allocated;if(cleanupRoot)await fs.rm(cleanupRoot,{recursive:true,force:true});let absent=!cleanupRoot;if(cleanupRoot){try{await fs.lstat(cleanupRoot);}catch(error){if(error.code!=='ENOENT')throw error;absent=true;}}assert.equal(absent,true);report.cleanup.private_directory_removed=true;report.cleanup.private_directory_absent=absent;report.cleanup.allocated_fallback_used=Boolean(allocated&&!owned);}catch{failures.push('private_directory');}
 if(failures.length){report.cleanup.failures=failures;report.status='failed';process.exitCode=1;}
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}
process.stdout.write(JSON.stringify({status:report.status,binary_launched:false})+'\n');
