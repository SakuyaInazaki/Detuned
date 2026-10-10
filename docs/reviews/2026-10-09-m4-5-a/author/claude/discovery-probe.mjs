// Fixed-version internal control experiment. No prompt/user/assistant messages.
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {bootstrapDatabase,SqliteStorage} from '../../../../../packages/storage-sqlite/dist/index.js';
import {buildApp} from '../../../../../packages/server/dist/index.js';
import {DetunedClient} from '../../../../../packages/client/dist/index.js';
const repo='/Users/sakimi/Desktop/Detuned';
const require=createRequire(path.join(repo,'package.json'));const Database=require('better-sqlite3');
const base=path.dirname(new URL(import.meta.url).pathname);
const owned=await mkdtemp('/private/tmp/detuned-claude-control-');await writeFile(path.join(owned,'settings.json'),'{}',{mode:0o600});
let db,app,child,forbidden;const receipt={version:'2.1.282',environment_keys:['PATH','CI','HOME (unchanged inherited value)','CLAUDE_CODE_TMPDIR (owned)','CLAUDE_CONFIG_DIR (owned)'],messages:[],http:[],cleanup:{},control_kind:'installed-internal-not-public-SDK'};
try{
 db=new Database(path.join(owned,'forum.sqlite'));const admin=bootstrapDatabase(db).adminToken;
 app=buildApp({storage:new SqliteStorage(db,{dataDir:owned})});app.addHook('onRequest',async r=>{receipt.http.push({method:r.method,route:r.routeOptions.url??'unknown'});});
 await app.listen({host:'127.0.0.1',port:0});const port=app.server.address().port;const url=`http://127.0.0.1:${port}`;
 const client=new DetunedClient({baseUrl:url,token:admin});const space=(await client.createSpace({slug:'claude-owned',objective:'isolated host probe',rules:[]},'claude-space')).data.space.id;
 const actor=await client.createActor({kind:'agent',display_name:'Private Claude fixture'});await client.createMembership(space,{actor_id:actor.id,role:'contributor'});
 const credential=await client.createCredential({actor_id:actor.id,allowed_space_ids:[space],capabilities:['read','write']});const tokenfile=path.join(owned,'token');await writeFile(tokenfile,credential.token,{mode:0o600});
 await writeFile(path.join(owned,'mcp.json'),JSON.stringify({mcpServers:{detuned:{command:process.execPath,args:[path.join(repo,'packages/mcp/dist/index.js')],env:{DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:tokenfile}}}}),{mode:0o600});
 receipt.http=[];const sessionsBefore=db.prepare('SELECT count(*) n FROM sessions').get().n;
 // The guard profile must include this listener only; preparation enforces policy and private sentinel checks.
 forbidden=createServer((q,s)=>s.end('owned negative'));await new Promise(r=>forbidden.listen(0,'127.0.0.1',r));
 const sentinel=path.join(owned,'forbidden-sentinel');await writeFile(sentinel,'owned sentinel');
 const profile=path.join(owned,'guard.sb');const template=await readFile(path.join(repo,'docs/reviews/2026-10-09-m4-5-a/author/codex/stdio-guard-second.sb'),'utf8');
 const policy=template.replace('localhost:50538',`localhost:${port}`).replaceAll('/private/tmp/detuned-codex-stdio-beHEt1',owned);
 if(!policy.includes('(deny mach-lookup)')||!policy.includes('(deny network*)'))throw new Error('Guard policy incomplete.');await writeFile(profile,policy);await writeFile(path.join(base,'discovery-guard.sb'),policy);
 const checkfile=path.join(owned,'guard-check.cjs');await writeFile(checkfile,`const http=require('node:http'),fs=require('node:fs');function get(port){return new Promise(r=>{const req=http.get({host:'127.0.0.1',port,path:'/api/v1/health/live'},s=>{s.resume();s.on('end',()=>r('allowed'));});req.on('error',e=>r(e.code));});}(async()=>{const allowed=await get(${port}),forbidden=await get(${forbidden.address().port});let sentinel;try{fs.readFileSync(${JSON.stringify(sentinel)});sentinel='allowed';}catch(e){sentinel=e.code;}console.log(JSON.stringify({allowed,forbidden,sentinel}));})()`);
 const check=spawn('/usr/bin/sandbox-exec',['-f',profile,process.execPath,checkfile],{cwd:owned,env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin'}});let checkOut='';check.stdout.setEncoding('utf8');check.stdout.on('data',x=>checkOut+=x);check.stderr.resume();const checkTimer=setTimeout(()=>check.kill('SIGKILL'),3000);const checkExit=await new Promise(r=>check.on('close',r));clearTimeout(checkTimer);receipt.guard={exit:checkExit,...JSON.parse(checkOut)};
 if(checkExit!==0||receipt.guard.allowed!=='allowed'||!['EPERM','EACCES'].includes(receipt.guard.forbidden)||!['EPERM','EACCES'].includes(receipt.guard.sentinel))throw new Error('Guard self-check failed.');
 receipt.http=[];receipt.profile_sha256=createHash('sha256').update(await readFile(profile)).digest('hex');
 const common=['/usr/bin/sandbox-exec','-f',profile,'/Users/sakimi/.local/bin/claude'];
 const env={PATH:'/opt/homebrew/bin:/usr/bin:/bin',CI:'true',HOME:process.env.HOME,CLAUDE_CODE_TMPDIR:path.join(owned,'tmp'),CLAUDE_CONFIG_DIR:path.join(owned,'state')};
 const help=spawn(common[0],[...common.slice(1),'--help'],{cwd:owned,env});let helpText='';help.stdout.setEncoding('utf8');help.stdout.on('data',x=>helpText+=x);let helpErr='';help.stderr.setEncoding('utf8');help.stderr.on('data',x=>{if(helpErr.length<65536)helpErr+=x;});const helpTimer=setTimeout(()=>help.kill('SIGKILL'),3000);const helpExit=await new Promise(r=>help.on('close',r));clearTimeout(helpTimer);
 const flags=['--bare','--input-format','--output-format','--verbose','--setting-sources','--settings','--strict-mcp-config','--mcp-config','--no-session-persistence'];receipt.help={exit:helpExit,stderr_bytes:Buffer.byteLength(helpErr),failure_category:helpErr.includes('Operation not permitted')?'os-denied':helpErr.includes('HOME')?'home-required':helpErr?'other-startup-error':null,flags:flags.map(flag=>({flag,present:helpText.includes(flag)}))};if(helpExit!==0||receipt.help.flags.some(x=>!x.present)) throw new Error('Installed help flags unavailable.');
 const argv=[...common.slice(1),'--bare','-p','--input-format','stream-json','--output-format','stream-json','--verbose','--setting-sources','','--settings',path.join(owned,'settings.json'),'--strict-mcp-config','--mcp-config',path.join(owned,'mcp.json'),'--no-session-persistence'];
 receipt.argv=argv.map(x=>x.startsWith(owned)?'<owned>/'+path.basename(x):x);child=spawn(common[0],argv,{cwd:owned,env,detached:true});receipt.pid=child.pid;
 let lines='',rawErr='',ended=false;const responses=new Map();child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stderr.on('data',x=>{if(rawErr.length<65536)rawErr+=x;});child.stdout.on('data',x=>{lines+=x;if(lines.length>1048576)child.kill('SIGTERM');let i;while((i=lines.indexOf('\n'))>=0){const line=lines.slice(0,i);lines=lines.slice(i+1);try{const v=JSON.parse(line);if(v.type==='control_response')responses.set(v.response?.request_id,v);receipt.messages.push({type:v.type,subtype:v.response?.subtype??v.subtype??null});}catch{receipt.invalid_json=true;}}});
 child.on('close',()=>ended=true);const deadline=Date.now()+25000;
 const control=async(id,request)=>{child.stdin.write(JSON.stringify({type:'control_request',request_id:id,request})+'\n');while(!responses.has(id)&&!ended&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25));return responses.get(id);};
 const init=await control('init-1',{subtype:'initialize'});receipt.initialize={received:!!init,success:init?.response?.subtype==='success'};
 if(receipt.initialize.success){let status,servers;const statusEnd=Math.min(deadline,Date.now()+20000);let polls=0;
 do{status=await control('status-'+(++polls),{subtype:'mcp_status'});servers=status?.response?.response?.mcpServers;const detuned=Array.isArray(servers)?servers.find(x=>x.name==='detuned'):undefined;
 if(!status||status.response?.subtype!=='success'||detuned?.status!=='pending')break;await new Promise(r=>setTimeout(r,250));}while(Date.now()<statusEnd&&!ended);
 receipt.status={polls,received:!!status,success:status?.response?.subtype==='success',payload_keys:Object.keys(status?.response?.response??{}),servers:Array.isArray(servers)?servers.map(s=>({name:s.name,status:s.status,keys:Object.keys(s),error:typeof s.error==='string'?s.error.replaceAll(credential.token,'REDACTED'):null,tool_count:s.tools?.length??null,tool_names:s.tools?.map(t=>t.name),tool_keys:s.tools?.[0]?Object.keys(s.tools[0]):[]})):null};
 const names=Array.isArray(servers)?servers.flatMap(s=>(s.tools??[]).map(t=>t.name)):[];const expected=['ack','context','poll','publish','read','relate','search','subscribe'].map(x=>'mcp__detuned__forum_'+x).sort();receipt.exact_eight=JSON.stringify(names.slice().sort())===JSON.stringify(expected);
 if(receipt.exact_eight&&servers.find(x=>x.name==='detuned')?.status==='connected'){const good=await control('call-1',{subtype:'mcp_call',tool:'mcp__detuned__forum_context',arguments:{space_id:space}});receipt.context={received:!!good,success:good?.response?.subtype==='success',response_keys:Object.keys(good?.response?.response??{}),control_error:good?.response?.error??null};
 if(receipt.context.success){const bad=await control('bad-1',{subtype:'mcp_call',tool:'mcp__detuned__forum_context',arguments:{space_id:space,unknown:true}});receipt.invalid={received:!!bad,subtype:bad?.response?.subtype??null,response_keys:Object.keys(bad?.response?.response??{}),control_error:bad?.response?.error??null};}}
 }
 receipt.session_delta=db.prepare('SELECT count(*) n FROM sessions').get().n-sessionsBefore;receipt.raw_stderr_bytes=Buffer.byteLength(rawErr);receipt.raw_stderr_sha256=createHash('sha256').update(rawErr).digest('hex');receipt.stderr=rawErr.replaceAll(credential.token,'REDACTED').replaceAll(admin,'REDACTED').replaceAll(actor.id,'REDACTED').replaceAll(space,'REDACTED');receipt.no_user_prompt=true;
 child.stdin.end();for(let n=0;n<40&&!ended;n++)await new Promise(r=>setTimeout(r,25));if(!ended){receipt.cleanup.term=true;process.kill(-child.pid,'SIGTERM');for(let n=0;n<40&&!ended;n++)await new Promise(r=>setTimeout(r,25));}if(!ended){receipt.cleanup.kill=true;process.kill(-child.pid,'SIGKILL');}if(!ended)await new Promise(r=>child.on('close',r));receipt.cleanup.child_reaped=true;receipt.exit=child.exitCode;receipt.signal=child.signalCode;receipt.stderr_requires_private_review=rawErr.length>0;
}catch(e){receipt.failure=e.message==='Installed help flags unavailable.'?e.message:'Probe could not complete safely.';}
finally{if(child&&child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGKILL');}catch{}await new Promise(r=>child.on('close',r));}if(forbidden)await new Promise(r=>forbidden.close(r));if(app){await app.close();receipt.cleanup.app_closed=true;}if(db){db.close();receipt.cleanup.db_closed=true;}await rm(owned,{recursive:true,force:true});receipt.cleanup.private_removed=true;await writeFile(path.join(base,'discovery-receipt.json'),JSON.stringify(receipt,null,2)+'\n');}
console.log(JSON.stringify({completed:!receipt.failure,exact_eight:receipt.exact_eight??false,context:receipt.context??null,cleanup:receipt.cleanup}));
