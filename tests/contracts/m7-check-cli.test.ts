import {afterEach,beforeEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createServer} from 'node:http';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import type {CheckRunView,SubmitCheckReceipt} from '@detuned/protocol';
const built=it.skipIf(process.env.DETUNED_SOURCE_ONLY==='1');
// Captured issuer stdout stays in memory. Never use raw stdout/headers/token in assertion diagnostics.
function cli(args:string[],input='',bearer=token){return new Promise<{code:number|null;out:string;err:string}>((resolve,reject)=>{const child=spawn(process.execPath,['packages/cli/dist/index.js','--url',url,'--token',bearer,'--json','check',...args],{env:{PATH:process.env.PATH,CI:'1'}});let out='',err='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Owned CLI watchdog exceeded'));},10000);child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.stdin.on('error',()=>{});child.stdin.end(input);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('close',code=>{clearTimeout(timer);resolve({code,out,err})});});}
async function success(args:string[],body?:unknown,bearer=token){const result=await cli(args,body===undefined?'':JSON.stringify(body),bearer);expect(result.code).toBe(0);expect(result.err.length).toBe(0);return JSON.parse(result.out);}
async function create(){run=await success(['create',sid,'--request-key','cli-create'],{request_id:request.id,snapshot_id:request.snapshot_id,check_name:'local',verifier_id:'http-verifier',expected_request_version:request.version});}
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,dir:string,url:string,token:string,sid:string,pid:string,request:any,run:CheckRunView,verify:string;
const now='2026-10-10T00:00:00.000Z',clock={now:()=>new Date(now),nowIso:()=>now};
async function http(method:string,path:string,body?:unknown,key?:string,bearer=token){const response=await fetch(url+'/api/v1'+path,{method,headers:{authorization:'Bearer '+bearer,...(body!==undefined?{'content-type':'application/json'}:{}),...(key!==undefined?{'idempotency-key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:response.status,headers:response.headers,body:await response.json()};}
async function write(path:string,body:unknown,key:string,method='POST'){const r=await http(method,path,body,key);expect(r.status).toBe(method==='POST'?201:200);return r.body.data;}
beforeEach(async()=>{
 db=new Database(':memory:');token=bootstrapDatabase(db).adminToken!;storage=new SqliteStorage(db);dir=await mkdtemp(join(tmpdir(),'detuned-check-http-'));app=buildApp({storage,clock,artifactBlobs:await ArtifactFileStore.create(dir)});url=await app.listen({host:'127.0.0.1',port:0});
 sid=(await write('/spaces',{slug:'check-http',objective:'o',rules:[]},'space')).space.id;
 const tid=(await write(`/spaces/${sid}/threads`,{title:'t'},'thread')).thread.id;
 pid=(await write(`/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'c',summary:'s',body:'fixed material',structured:{statement:'s',assumptions:[],scope:'s',falsification_plan:'f'}},'post')).post.id;
 // Identity fixtures only. All request/run/receipt/log transitions use genuine HTTP services.
 for(const id of ['http-r1','http-r2','http-verifier']){storage.createActor({id,kind:id==='http-verifier'?'service':'human',display_name:id,created_at:now,disabled_at:null});if(id!=='http-verifier')storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});}
 const rev=storage.getSpaceRevision(sid,1)!;await write(`/spaces/${sid}`,{expected_revision:1,review_policy:{...rev.review_policy,required_checks:['local']},check_profiles:{local:{verifier_actor_ids:['http-verifier'],config_sha256:'a'.repeat(64),description:'local'}}},'policy','PATCH');
 request=await write(`/spaces/${sid}/review-requests`,{target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['http-r1','http-r2'],expected_policy_revision:storage.findSpaceById(sid)!.policy_revision,reproduction_instructions:'run'},'request');

});
afterEach(async()=>{await app.close();db.close();await rm(dir,{recursive:true,force:true});});
function receipt(logId:string):SubmitCheckReceipt{return {receipt_id:'http-receipt',observed_snapshot_sha256:run.snapshot_sha256,observed_check_config_sha256:run.check_config_sha256,result:'pass',environment:'HTTP fixture',tool_versions:{node:'owned'},execution_steps:'bounded local fixture',started_at:now,finished_at:now,exit_code:0,logs_artifact_id:logId};}

built('CC01 real TCP twelve CLI operations retain scope, stdin keys and no-clobber private downloads',async()=>{
 await create();const issued=await success(['credential',sid,run.id],{});
 // Safe projections only: a failed assertion cannot print the once-only secret.
 expect(Object.keys(issued).sort()).toEqual(['credential_id','expires_at','token']);expect(typeof issued.token==='string'&&issued.token.length>0).toBe(true);verify=issued.token;
 expect((await success(['read',sid,run.id],undefined,verify)).id).toBe(run.id);
 expect((await success(['snapshot',sid,run.id],undefined,verify)).check_run_id).toBe(run.id);
 expect((await success(['post',sid,run.id,pid,'1'],undefined,verify)).body).toBe('fixed material');
 const file=join(dir,'log.txt');await writeFile(file,'CLI bounded log');const artifact=await success(['artifact-upload',sid,run.id,file,'--mime','text/plain','--request-key','cli-log'],undefined,verify);
 expect((await success(['artifact',sid,run.id,artifact.id],undefined,verify)).sha256).toBe(artifact.sha256);
 const output=join(dir,'download.txt');const summary=await success(['artifact-download',sid,run.id,artifact.id,'--output',output],undefined,verify);expect(Object.keys(summary).sort()).toEqual(['artifact_id','bytes','mime','sha256']);expect(await readFile(output,'utf8')).toBe('CLI bounded log');expect((await stat(output)).mode&0o777).toBe(0o600);
 const existing=await cli(['artifact-download',sid,run.id,artifact.id,'--output',output],'',verify);expect(existing.code===0).toBe(false);expect(await readFile(output,'utf8')).toBe('CLI bounded log');
 const payload={...receipt(artifact.id),request_key:'cli-receipt'};const submitted=await success(['receipt-submit',sid,run.id],payload,verify);expect(submitted.result).toBe('pass');expect((await success(['receipt-submit',sid,run.id],payload,verify)).receipt_id).toBe(submitted.receipt_id);expect((await success(['receipt',sid,run.id],undefined,verify)).receipt_id).toBe(submitted.receipt_id);
 expect((await success(['required',sid,request.id])).verification_status).toBe('passed');expect((await success(['invalidate',sid,run.id],{expected_version:2,reason:'withdraw',request_key:'cli-invalidate'})).state).toBe('invalidated');
 expect((await success(['receipt-submit',sid,run.id],payload,verify)).receipt_id).toBe(submitted.receipt_id);
},60000);
built('CC02 prohibited key option presence rejects empty and half pairs before missing input/file/token and zero HTTP',async()=>{
 const seen:string[]=[];const server=createServer((req,res)=>{seen.push(req.url??'');res.writeHead(500);res.end();});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Owned listener missing');const real=url;url=`http://127.0.0.1:${address.port}`;
 try{for(const op of ['credential','receipt-submit','artifact-upload'])for(const flags of [['--request-key-dir',''],['--logical-operation-id',''],['--request-key-dir',join(dir,'never'),'--logical-operation-id','intent'],...(op==='credential'?[['--request-key','']]:[])]){
 const args=[op,'space','run',...(op==='artifact-upload'?[join(dir,'missing')]:['--input',join(dir,'missing')]),...flags];const result=await cli(args,'','');expect(result.code).toBe(2);expect(JSON.parse(result.out).error.code).toBe('VALIDATION_ERROR');expect(result.out.includes('missing')).toBe(false);
 }expect(seen.length).toBe(0);expect(await stat(join(dir,'never')).then(()=>true,()=>false)).toBe(false);
 }finally{url=real;await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
},60000);
built('CC03 ordinary persistent create and invalidate retain stable target-scoped keys and stripped transport fields',async()=>{
 const keys=join(dir,'keys');const body={request_id:request.id,snapshot_id:request.snapshot_id,check_name:'local',verifier_id:'http-verifier',expected_request_version:request.version};
 const args=['create',sid,'--request-key-dir',keys,'--logical-operation-id','create-intent'];run=await success(args,body);expect((await success(args,body)).id).toBe(run.id);expect(storage.getNextCheckRunAttempt(request.id,'local')).toBe(2);
 const invalid=['invalidate',sid,run.id,'--request-key-dir',keys,'--logical-operation-id','invalidate-intent'];const input={expected_version:1,reason:'explicit'};expect((await success(invalid,input)).version).toBe(2);expect((await success(invalid,input)).version).toBe(2);
 const conflict=await cli(invalid,JSON.stringify({...input,reason:'different'}));expect(conflict.code).toBe(4);
},40000);
built('CC04 local revision and input safety never issue a check request or expose raw malformed JSON',async()=>{
 for(const revision of ['0','01','-1','9007199254740992']){const r=await cli(['post',sid,'run',pid,revision]);expect(r.code).toBe(2);}
 for(const op of ['create','receipt-submit','credential','invalidate']){const r=await cli([op,sid,...(op==='create'?[]:['run'])],'{PRIVATE_INPUT');expect(r.code).toBe(2);expect((r.out+r.err).includes('PRIVATE_INPUT')).toBe(false);}
 expect(storage.getNextCheckRunAttempt(request.id,'local')).toBe(1);
},40000);

built('CC05 controlled unavailable issuer is attempted once; unknown credential body is refused without transport',async()=>{
 let attempts=0;const server=createServer((req,res)=>{attempts++;req.resume();res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({api_version:'1',request_id:'controlled',error:{code:'TEMPORARILY_UNAVAILABLE',message:'Unavailable',retryable:true}}));});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Owned listener missing');const real=url;url=`http://127.0.0.1:${address.port}`;
 try{const unknown=await cli(['credential','space','run'],JSON.stringify({request_key:'not-permitted'}));expect(unknown.code===0).toBe(false);expect(attempts).toBe(0);
 const unavailable=await cli(['credential','space','run'],'{}');expect(unavailable.code===0).toBe(false);expect(attempts).toBe(1);expect((unavailable.out+unavailable.err).includes(token)).toBe(false);
 }finally{url=real;await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
},30000);
