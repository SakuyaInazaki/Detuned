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
const owned=await mkdtemp('/private/tmp/detuned-claude-wrapped-');await writeFile(path.join(owned,'settings.json'),'{}',{mode:0o600});
let db,app,child,forbidden;const receipt={version:'2.1.282',environment_keys:['PATH','CI','HOME (unchanged inherited value)','CLAUDE_CODE_TMPDIR (owned)','CLAUDE_CONFIG_DIR (owned)'],messages:[],http:[],cleanup:{},input_mode:'wrapped',control_kind:'installed-internal-not-public-SDK'};
try{
 db=new Database(path.join(owned,'forum.sqlite'));const admin=bootstrapDatabase(db).adminToken;
 app=buildApp({storage:new SqliteStorage(db,{dataDir:owned})});app.addHook('onRequest',async r=>{receipt.http.push({method:r.method,route:r.routeOptions.url??'unknown'});});
 await app.listen({host:'127.0.0.1',port:0});const port=app.server.address().port;const url=`http://127.0.0.1:${port}`;
 const client=new DetunedClient({baseUrl:url,token:admin});const space=(await client.createSpace({slug:'claude-owned',objective:'isolated host probe',rules:[]},'claude-space')).data.space.id;
 const actor=await client.createActor({kind:'agent',display_name:'Private Claude fixture'});await client.createMembership(space,{actor_id:actor.id,role:'contributor'});
 const credential=await client.createCredential({actor_id:actor.id,allowed_space_ids:[space],capabilities:['read','write']});const thread=app.threadService.createThread(app.authService.authenticateToken(credential.token),space,{title:'Owned wrapped fixture'},'m45b-fixture-thread').thread.id;const tokenfile=path.join(owned,'token');await writeFile(tokenfile,credential.token,{mode:0o600});
 await writeFile(path.join(owned,'mcp.json'),JSON.stringify({mcpServers:{detuned:{command:process.execPath,args:[path.join(repo,'packages/mcp/dist/index.js')],env:{DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:tokenfile,DETUNED_MCP_INPUT_MODE:'wrapped'}}}}),{mode:0o600});
 receipt.fixture={actor_id:actor.id,space_id:space,thread_id:thread};receipt.dist_hashes={};for(const file of ['index.js','bridge.js','tool-validation.js'])receipt.dist_hashes[file]=createHash('sha256').update(await readFile(path.join(repo,'packages/mcp/dist',file))).digest('hex');receipt.http=[];const postsBefore=db.prepare('SELECT count(*) n FROM posts WHERE thread_id=?').get(thread).n;const sessionsBefore=db.prepare('SELECT count(*) n FROM sessions').get().n;
 // The guard profile must include this listener only; preparation enforces policy and private sentinel checks.
 forbidden=createServer((q,s)=>s.end('owned negative'));await new Promise(r=>forbidden.listen(0,'127.0.0.1',r));
 const sentinel=path.join(owned,'forbidden-sentinel');await writeFile(sentinel,'owned sentinel');
 const profile=path.join(owned,'guard.sb');const template=await readFile(path.join(repo,'docs/reviews/2026-10-09-m4-5-a/author/codex/stdio-guard-second.sb'),'utf8');
 const policy=template.replace('localhost:50538',`localhost:${port}`).replaceAll('/private/tmp/detuned-codex-stdio-beHEt1',owned);
 if(!policy.includes('(deny mach-lookup)')||!policy.includes('(deny network*)'))throw new Error('Guard policy incomplete.');await writeFile(profile,policy);await writeFile(path.join(base,'wrapped-guard.sb'),policy);
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
 const names=Array.isArray(servers)?servers.flatMap(s=>(s.tools??[]).map(t=>t.name)):[];const expected=['ack','context','poll','publish','read','relate','search','subscribe'].map(x=>'forum_'+x).sort();receipt.exact_eight=JSON.stringify(names.slice().sort())===JSON.stringify(expected);
 if(!receipt.exact_eight)throw new Error('Wrapped discovery did not expose exact eight tools.');
 const safe=x=>JSON.parse(JSON.stringify(x).replaceAll(credential.token,'REDACTED').replaceAll(admin,'REDACTED'));
 const invoke=async(id,tool,args)=>{const r=await control(id,{subtype:'mcp_call',tool:'mcp__detuned__forum_'+tool,arguments:args});const response=safe(r??null);const checkpoint=r?.response?.response?.structuredContent?.result?.data?.checkpoint_token;const digest=createHash('sha256').update(JSON.stringify(response)).digest('hex');return{received:!!r,success:r?.response?.subtype==='success',response:typeof checkpoint==='string'?JSON.parse(JSON.stringify(response).replaceAll(checkpoint,'REDACTED_CHECKPOINT')):response,original_response_sha256:digest,http_after:receipt.http.length};};
 receipt.context=await invoke('context-1','context',{input:{space_id:space}});if(!receipt.context.success)throw new Error('Context failed.');
 receipt.read=await invoke('read-1','read',{input:{kind:'space',space_id:space,revision:1}});if(!receipt.read.success)throw new Error('Read failed.');
 receipt.publish=await invoke('publish-1','publish',{input:{op:'post',space_id:space,thread_id:thread,kind:'note',title:'Wrapped native note',summary:'Private native fixture',body:'Private wrapped body',request_key:'m45b-native-note-1'}});if(!receipt.publish.success)throw new Error('Publish failed.');
 const beforeInvalid=receipt.http.length;
 receipt.invalid_outer=await invoke('bad-outer','context',{input:{space_id:space},unknown:true});
 receipt.invalid_inner=await invoke('bad-inner','context',{input:{space_id:space,unknown:true}});
 receipt.invalid_zero_http=receipt.http.length===beforeInvalid;
 const responsePostId=receipt.publish.response?.response?.response?.structuredContent?.result?.post?.id;receipt.published_post_id=typeof responsePostId==='string'?responsePostId:null;
 const post=typeof responsePostId==='string'?db.prepare('SELECT id,author_id,space_id,thread_id,current_revision FROM posts WHERE id=?').get(responsePostId):null;receipt.post_count_delta=db.prepare('SELECT count(*) n FROM posts WHERE thread_id=?').get(thread).n-postsBefore;receipt.post_identity_match=!!post&&post.author_id===actor.id&&post.space_id===space&&post.thread_id===thread&&post.current_revision===1&&receipt.post_count_delta===1;receipt.post_oracle=post??null;
 receipt.fixed_request_key_present=!!db.prepare("SELECT key FROM idempotency_records WHERE actor_id=? AND space_id=? AND operation=? AND key=?").get(actor.id,space,'post.create:'+thread,'m45b-native-note-1');


 }
 receipt.ordinary_actor_sessions=db.prepare('SELECT actor_id,space_id FROM sessions').all().every(x=>x.actor_id===actor.id&&x.space_id===space);receipt.session_delta=db.prepare('SELECT count(*) n FROM sessions').get().n-sessionsBefore;receipt.raw_stderr_bytes=Buffer.byteLength(rawErr);receipt.raw_stderr_sha256=createHash('sha256').update(rawErr).digest('hex');receipt.stderr=rawErr.replaceAll(credential.token,'REDACTED').replaceAll(admin,'REDACTED').replaceAll(actor.id,'REDACTED').replaceAll(space,'REDACTED');receipt.no_user_prompt=true;
 child.stdin.end();for(let n=0;n<40&&!ended;n++)await new Promise(r=>setTimeout(r,25));if(!ended){receipt.cleanup.term=true;process.kill(-child.pid,'SIGTERM');for(let n=0;n<40&&!ended;n++)await new Promise(r=>setTimeout(r,25));}if(!ended){receipt.cleanup.kill=true;process.kill(-child.pid,'SIGKILL');}if(!ended)await new Promise(r=>child.on('close',r));receipt.cleanup.child_reaped=true;receipt.exit=child.exitCode;receipt.signal=child.signalCode;receipt.stderr_requires_private_review=rawErr.length>0;
}catch(e){receipt.failure=e.message==='Installed help flags unavailable.'?e.message:'Probe could not complete safely.';}
finally{if(child&&child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGKILL');}catch{}await new Promise(r=>child.on('close',r));}if(forbidden)await new Promise(r=>forbidden.close(r));if(app){await app.close();receipt.cleanup.app_closed=true;}if(db){db.close();receipt.cleanup.db_closed=true;}await rm(owned,{recursive:true,force:true});receipt.cleanup.private_removed=true;await writeFile(path.join(base,'wrapped-receipt.json'),JSON.stringify(receipt,null,2)+'\n');}
console.log(JSON.stringify({completed:!receipt.failure,exact_eight:receipt.exact_eight??false,context:receipt.context?{received:receipt.context.received,success:receipt.context.success,http_after:receipt.context.http_after}:null,cleanup:receipt.cleanup}));
