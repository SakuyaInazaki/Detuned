import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '../../../../../packages/storage-sqlite/dist/index.js';
import {buildApp} from '../../../../../packages/server/dist/index.js';
import {DetunedClient} from '../../../../../packages/client/dist/index.js';
import {spawnSync} from 'node:child_process';
const db=new Database(':memory:'),token=bootstrapDatabase(db).adminToken,app=buildApp({storage:new SqliteStorage(db)}),headers={authorization:`Bearer ${token}`};
try {
 await app.ready();
 const space=await app.inject({method:'POST',url:'/api/v1/spaces',headers:{...headers,'idempotency-key':'space'},payload:{slug:'focus-before',objective:'o',rules:[]}});assert.equal(space.statusCode,201);const sid=space.json().data.space.id;
 const thread=await app.inject({method:'POST',url:`/api/v1/spaces/${sid}/threads`,headers:{...headers,'idempotency-key':'thread'},payload:{title:'own focus'}});assert.equal(thread.statusCode,201);const tid=thread.json().data.thread.id;
 const focused=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/context?focus_thread_id=${tid}`,headers});assert.equal(focused.statusCode,400);
 const baseUrl=await app.listen({host:'127.0.0.1',port:0}),client=new DetunedClient({baseUrl,token,maxRetries:0});let tool;
 try {await client.callTool('forum_context',{space_id:sid,focus_thread_id:tid});assert.fail('focus unexpectedly works');}catch(e){assert.equal(e.statusCode,400);tool={status:e.statusCode,code:e.code,message:e.message};}
 const cli=spawnSync(process.execPath,['packages/cli/dist/index.js','context','--help'],{encoding:'utf8'});assert.equal(cli.status,0);assert.match(cli.stdout,/暂不支持/);
 console.log(JSON.stringify({own_thread_http:{status:focused.statusCode,body:focused.json()},actual_http_tool:tool,cli_help:{exit:cli.status,stdout:cli.stdout,stderr:cli.stderr}},null,2));
}finally{await app.close();db.close();}
