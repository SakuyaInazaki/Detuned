import {it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';

const proposal={statement:'TTL candidate',assumptions:['fixed window'],scope:'same key',falsification_plan:'compare timestamps'};
const failure={attempt:'TTL comparison',category:'counterexample',assumptions:[],tested_scope:'same key',expected:'equal',observed:'different',ruled_out:'equivalence',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'No fixed evidence in this fixture',not_ruled_out:[],retry_when:[]};
function record(value:unknown):Record<string,any>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Expected fixture record');return value as Record<string,any>;}
function result(value:unknown){expect(record(value).isError).not.toBe(true);return record(record(value).structuredContent).result;}
function invalid(value:unknown){expect(value).toMatchObject({isError:true,structuredContent:{error:{code:'VALIDATION_ERROR'}}});}

it.each(['flat','wrapped'] as const)('M7.14 %s real SDK publish preserves typed content and rejects malformed envelopes without guessing intent',async mode=>{
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-fable-')),db=new Database(':memory:');
 const token=bootstrapDatabase(db).adminToken!,storage=new SqliteStorage(db),app=buildApp({storage,writeRateLimits:{per_minute:60000,burst:10000}});
 let sdk:Client|undefined;
 try{
  await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw Error('Missing owned address');
  const url=`http://127.0.0.1:${address.port}`,admin=new DetunedClient({baseUrl:url,token});
  const space=(await admin.createSpace({slug:'fable',objective:'Owned typed transport',rules:[]},'space')).data.space.id;
  const thread=(await admin.createThread(space,{title:'TTL'},'thread')).data.thread.id;
  const actor=await admin.createActor({kind:'agent',display_name:'Author'});await admin.createMembership(space,{actor_id:actor.id,role:'contributor'});
  const credential=await admin.createCredential({actor_id:actor.id,allowed_space_ids:[space],capabilities:['read','write']});
  const tokenFile=path.join(directory,'token');await writeFile(tokenFile,credential.token,{mode:0o600});
  const transport=new StdioClientTransport({command:process.execPath,args:['packages/mcp/dist/index.js'],env:{PATH:process.env.PATH??'/usr/bin:/bin',DETUNED_BASE_URL:url,DETUNED_TOKEN_FILE:tokenFile,DETUNED_MCP_INPUT_MODE:mode},stderr:'pipe'});
  sdk=new Client({name:'fable-owned',version:'1'},{capabilities:{}});await sdk.connect(transport);
  const call=(name:string,input:Record<string,unknown>)=>sdk!.callTool({name,arguments:mode==='wrapped'?{input}:input});
  const base={space_id:space,op:'post',thread_id:thread,title:'TTL',summary:'Owned',body:'The actual plain body.'};
  for(const [kind,structured] of [['proposal',proposal],['failure',failure]] as const){
   const input={...base,kind,structured,request_key:kind},before=JSON.stringify(input),created=result(await call('forum_publish',input));
   expect(JSON.stringify(input)).toBe(before);expect(created.post.kind).toBe(kind);expect(created.revision.body).toBe(base.body);expect(created.revision.structured).toEqual(structured);
   expect(storage.findPostById(created.post.id)?.kind).toBe(kind);expect(storage.getPostRevision(created.post.id,1)).toMatchObject({body:base.body,structured});
   const read=result(await call('forum_read',{space_id:space,kind:'post',id:created.post.id,revision:1}));expect(read.revision.body).toBe(base.body);
   invalid(await call('forum_read',{space_id:space,kind:'post',id:created.post.id,revision:'1'}));
  }
  const counts=()=>['posts','post_revisions','events','idempotency_records'].map(table=>db.prepare(`SELECT count(*) n FROM ${table}`).get());
  const before=counts();
  for(const bad of [
   {...base,kind:'proposal',structured:{},request_key:'invalid-typed'},
   {...base,kind:'proposal',structured:proposal,body:{thread_id:thread,title:'Nested'},request_key:'object-body'},
   {space_id:space,op:'post',request_key:'nested-fields',kind:'proposal',body:JSON.stringify({thread_id:thread,title:'Nested',structured:proposal})},
   {...base,kind:'proposal',structured:proposal,input:{kind:'note'},request_key:'extra'},
  ])invalid(await call('forum_publish',bad));
  const good={...base,kind:'proposal',structured:proposal,request_key:'wrong-envelope'};
  invalid(await sdk.callTool({name:'forum_publish',arguments:mode==='flat'?{input:good}:{input:good,kind:'note'}}));expect(counts()).toEqual(before);
  invalid(await call('forum_review',{space_id:space,op:'finalize',request_key:'bad-version',request_id:'absent',expected_version:'1'}));
  // Integer passes tool validation, then fails at the service's missing request boundary.
  expect(await call('forum_review',{space_id:space,op:'finalize',request_key:'integer-version',request_id:'absent',expected_version:1})).toMatchObject({isError:true,structuredContent:{error:{code:'NOT_FOUND'}}});
  const claim=result(await call('forum_publish',{...base,kind:'claim',structured:proposal,request_key:'claim'}));
  const reviewers=[];for(const label of ['One','Two']){const reviewer=await admin.createActor({kind:'agent',display_name:label});await admin.createMembership(space,{actor_id:reviewer.id,role:'observer',reviewer_eligible:true,independence_group:label});reviewers.push(reviewer.id);}
  const request=result(await call('forum_review',{space_id:space,op:'request',request_key:'request',target_ref:{post_id:claim.post.id,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:reviewers,expected_policy_revision:1,reproduction_instructions:'Compare the fixed timestamps.'}));
  invalid(await call('forum_review',{space_id:space,op:'cancel',request_key:'cancel-string',request_id:request.id,expected_version:'1',reason:'Owned fixture'}));
  expect(result(await call('forum_review',{space_id:space,op:'cancel',request_key:'cancel-integer',request_id:request.id,expected_version:1,reason:'Owned fixture'}))).toMatchObject({phase:'cancelled',version:2});
  const jsonBody=JSON.stringify({thread_id:thread,kind:'proposal',structured:proposal}),note=result(await call('forum_publish',{...base,kind:'note',body:jsonBody,request_key:'literal-note'}));
  expect(note.post.kind).toBe('note');expect(storage.getPostRevision(note.post.id,1)?.body).toBe(jsonBody);
 }finally{await sdk?.close();await app.close();db.close();await rm(directory,{recursive:true,force:true});}
},30000);
