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
 receipt.http=[];
 const {Client}=await import(path.join(repo,'packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js'));
 const {StdioClientTransport}=await import(path.join(repo,'packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js'));
 const sdk=new Client({name:'private-claude-diagnostic',version:'1'},{capabilities:{}});
 const transport=new StdioClientTransport({command:process.execPath,args:[path.join(repo,'packages/mcp/dist/index.js')],env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin',DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:tokenfile},stderr:'pipe'});
 let stderr='';transport.stderr?.on('data',x=>{stderr+=x;});await sdk.connect(transport);const listed=await sdk.listTools();
 receipt.snapshot={tool_count:listed.tools.length,tools:listed.tools.map(x=>({name:x.name,root_keys:Object.keys(x.inputSchema),type:x.inputSchema.type})),http_count:receipt.http.length};
 await sdk.close();receipt.cleanup.sdk_closed=true;receipt.no_user_prompt=true;
}catch(e){receipt.failure=e.message==='Installed help flags unavailable.'?e.message:'Probe could not complete safely.';}
finally{if(child&&child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGKILL');}catch{}await new Promise(r=>child.on('close',r));}if(forbidden)await new Promise(r=>forbidden.close(r));if(app){await app.close();receipt.cleanup.app_closed=true;}if(db){db.close();receipt.cleanup.db_closed=true;}await rm(owned,{recursive:true,force:true});receipt.cleanup.private_removed=true;await writeFile(path.join(base,'bridge-list-snapshot.json'),JSON.stringify(receipt,null,2)+'\n');}
console.log(JSON.stringify({completed:!receipt.failure,exact_eight:receipt.exact_eight??false,context:receipt.context??null,cleanup:receipt.cleanup}));
