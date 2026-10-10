import {afterEach, expect, it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes, createHash} from 'node:crypto';
import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {bootstrapDatabase, SqliteStorage, openAndCoordinateDatabase} from '@detuned/storage-sqlite';
import {AuthService, CryptoHasher, CryptoIdGenerator, IdempotencyService, EventService, HmacTokenSigner, RedactionService} from '@detuned/core';
import {ReviewModule, ReviewRequestService} from '@detuned/module-review';
import {canonicalizeReviewJson} from '../../modules/review/src/canonical-json.js';
import type {CreateReviewRequest, ReviewPolicy} from '@detuned/protocol';

// Private trusted research/session seeds. No HTTP/CLI claim, no model or deployed runtime.
// DI04 alone uses genuine independent processes and final built production modules.
const root=fileURLToPath(new URL('../../',import.meta.url));
const disposers:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(disposers.length)await disposers.pop()!();});
const firstTime='2026-10-09T00:00:00.000Z';
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,
 distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const tables=['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','events','idempotency_records'];
async function fixture(){
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-review-request-independent-'));
 const dbFile=path.join(directory,'forum.sqlite');let db=new Database(dbFile);db.pragma('journal_mode=WAL');db.pragma('busy_timeout=5000');
 disposers.push(async()=>{if(db.open)db.close();await rm(directory,{recursive:true,force:true});});
 bootstrapDatabase(db);let time=firstTime;const clock={now:()=>new Date(time),nowIso:()=>time};
 const sid='spc-review-independent',otherSid='spc-other-independent',thread='thd-review-independent',otherThread='thd-unrelated';
 const ids={author:'act-author',maintainer:'act-maintainer',reader:'act-reader',one:'act-reviewer-one',two:'act-reviewer-two',editor:'act-historical-editor'};
 const hasher=new CryptoHasher(),idGen=new CryptoIdGenerator();let storage=new SqliteStorage(db),auth=new AuthService(storage,hasher,clock);
 const tokens=new Map<string,string>();
 for(const [name,id] of Object.entries(ids)){
  storage.createActor({id,kind:name==='one'?'agent':'human',display_name:id,created_at:firstTime,disabled_at:null});
  const token=randomBytes(32).toString('hex');tokens.set(id,token);
  storage.createCredential({id:'cred-'+name,actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[sid,otherSid],capabilities:name==='reader'?['read']:['read','write'],created_at:firstTime,expires_at:null,revoked_at:null});
 }
 for(const space of [sid,otherSid]){
  storage.createSpace({id:space,slug:space,current_revision:1,policy_revision:1,acl_epoch:1,created_at:firstTime},{space_id:space,revision:1,objective:'owned evidence',rules:['owned rule'],review_policy:structuredClone(policy),check_profiles:{},pinned_refs:[],editor_id:ids.author,created_at:firstTime});
  for(const [name,id] of Object.entries(ids))storage.upsertMembership({space_id:space,actor_id:id,role:name==='maintainer'?'maintainer':name==='reader'?'observer':'contributor',active:true,reviewer_eligible:name==='one'||name==='two'||name==='editor',independence_group:name==='one'?'group-one':name==='two'?'group-two':'group-other'});
 }
 for(const id of [thread,otherThread])storage.createThread({id,space_id:sid,title:id,version:1,state:'open',creator_id:ids.author,created_at:firstTime,updated_at:firstTime});
 storage.createPost({id:'pst-claim',space_id:sid,thread_id:thread,author_id:ids.author,kind:'claim',current_revision:1,lifecycle:'active',created_at:firstTime},{post_id:'pst-claim',revision:1,title:'claim',summary:'owned summary',body:'PRIVATE-RESEARCH-BODY',tags:[],structured:{statement:'owned claim',assumptions:['one assumption'],scope:'owned scope',falsification_plan:'owned test'},content_hash:'a'.repeat(64),editor_id:ids.editor,created_at:firstTime});
 storage.createArtifact({id:'art-evidence',space_id:sid,owner_id:ids.author,visibility:'space',review_assignment_id:null,check_run_id:null,sha256:'b'.repeat(64),bytes:7,mime:'application/octet-stream',storage_key:'PRIVATE-STORAGE',state:'ready',created_at:firstTime});
 for(let i=1;i<=2;i++)storage.createSession({id:'ses-same-actor-'+i,actor_id:ids.one,space_id:sid,client_name:'independent',client_version:'1',harness_session_id:null,metadata:{},created_at:firstTime});
 let service=new ReviewRequestService(storage,auth,new IdempotencyService(storage,hasher,clock),clock,idGen,new ReviewModule(storage,hasher,clock,idGen,auth));
 const request:CreateReviewRequest={target_ref:{post_id:'pst-claim',revision:1},dependency_refs:[],artifact_ids:['art-evidence'],code_refs:[],declared_contributors:[],reviewer_actor_ids:[ids.one,ids.two],expected_policy_revision:1,reproduction_instructions:'owned reproduction'};
 const context=(id=ids.author)=>auth.authenticateToken(tokens.get(id)!);
 const counts=()=>Object.fromEntries(tables.map(t=>[t,(db.prepare('SELECT count(*) AS n FROM '+t).get() as {n:number}).n]));
 return {directory,dbFile,get db(){return db;},get storage(){return storage;},get auth(){return auth;},get service(){return service;},sid,otherSid,thread,otherThread,ids,request,clock,hasher,idGen,context,tokens,counts,
  advance:()=>{time='2026-10-09T00:01:00.000Z';},
  reopen:()=>{db.close();db=new Database(dbFile);db.pragma('busy_timeout=5000');storage=new SqliteStorage(db);auth=new AuthService(storage,hasher,clock);service=new ReviewRequestService(storage,auth,new IdempotencyService(storage,hasher,clock),clock,idGen,new ReviewModule(storage,hasher,clock,idGen,auth));}};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function rejected(run:()=>unknown,code:string,status:number){try{run();throw new Error('Expected review refusal');}catch(error){expect(error).toMatchObject({code,statusCode:status});expect((error as Error).message.includes('PRIVATE')).toBe(false);}}
function create(f:Fixture,key='independent-create',actor=f.ids.author,request=f.request){return f.service.createRequest(f.context(actor),f.sid,request,key);}

it('DI01 real current membership, contributor history, group and same-actor sessions cannot fabricate reviewer eligibility',async()=>{
 const f=await fixture(),before=f.counts();
 expect((f.db.prepare('SELECT count(*) AS n FROM sessions WHERE actor_id=?').get(f.ids.one) as {n:number}).n).toBe(2);
 rejected(()=>create(f,'duplicate',f.ids.author,{...f.request,reviewer_actor_ids:[f.ids.one,f.ids.one]}),'VALIDATION_ERROR',400);
 rejected(()=>create(f,'sessions',f.ids.author,{...f.request,reviewer_actor_ids:['ses-same-actor-1','ses-same-actor-2']}),'VALIDATION_ERROR',400);
 rejected(()=>create(f,'contributor',f.ids.author,{...f.request,reviewer_actor_ids:[f.ids.editor,f.ids.two]}),'VALIDATION_ERROR',400);
 const member=f.storage.getMembership(f.sid,f.ids.two)!;f.storage.upsertMembership({...member,independence_group:'group-one'});
 rejected(()=>create(f,'group'),'VALIDATION_ERROR',400);f.storage.upsertMembership({...member,reviewer_eligible:false});
 rejected(()=>create(f,'eligible'),'VALIDATION_ERROR',400);f.storage.upsertMembership(member);
 f.db.prepare('UPDATE actors SET disabled_at=? WHERE id=?').run(firstTime,f.ids.one);rejected(()=>create(f,'disabled'),'VALIDATION_ERROR',400);f.db.prepare('UPDATE actors SET disabled_at=NULL WHERE id=?').run(f.ids.one);
 rejected(()=>create(f,'unrelated',f.ids.two),'FORBIDDEN',403);expect(f.counts()).toEqual(before);
 const view=create(f);expect(view.reviewer_actor_ids).toEqual([f.ids.one,f.ids.two]);expect(view.phase).toBe('collecting');expect(f.storage.listReviewAssignments(view.id).map(x=>x.group_at_assignment)).toEqual(['group-one','group-two']);
});
it('DI02 actual SQLite last-stage idempotency failure rolls every review object and event back, then commits one compact replayable result',async()=>{
 const f=await fixture(),before=f.counts();
 f.db.exec("CREATE TRIGGER owned_review_rollback BEFORE INSERT ON idempotency_records WHEN NEW.operation='review.request.create' BEGIN SELECT RAISE(ABORT,'owned transaction barrier'); END;");
 try{expect(()=>create(f)).toThrow();expect(f.counts()).toEqual(before);}finally{f.db.exec('DROP TRIGGER owned_review_rollback');}
 const first=create(f),after=f.counts();expect(after).toEqual({snapshots:1,snapshot_items:3,review_requests:1,review_request_versions:1,review_assignments:2,events:1,idempotency_records:1});
 expect(create(f)).toEqual(first);expect(f.counts()).toEqual(after);
 const ref=(f.db.prepare("SELECT result_ref FROM idempotency_records WHERE operation='review.request.create'").get() as {result_ref:string}).result_ref;
 expect(ref.includes('PRIVATE')).toBe(false);expect(ref.includes('manifest_json')).toBe(false);
 expect(f.storage.listReviewSnapshotItems(first.snapshot_id).map(x=>[x.item_type,x.revision])).toEqual(expect.arrayContaining([['target_post',1],['artifact',0],['space_rules',1]]));
});
it('DI03 current requester-only cancel and immutable historical replay survive later policy, cancellation and real database reopen',async()=>{
 const f=await fixture(),creator=f.ids.maintainer,first=create(f,'history',creator);f.advance();
 rejected(()=>f.service.cancelRequest(f.context(),f.sid,first.id,{expected_version:1,reason:'not my request'},'author-cancel'),'FORBIDDEN',403);
 const cancel=f.service.cancelRequest(f.context(creator),f.sid,first.id,{expected_version:1,reason:'owned cancellation'},'cancel-key');expect(cancel.version).toBe(2);expect(cancel.phase).toBe('cancelled');
 const space=f.storage.findSpaceById(f.sid)!,revision=f.storage.getSpaceRevision(f.sid,1)!;f.storage.updateSpace({...space,current_revision:2,policy_revision:2},{...revision,revision:2,review_policy:{...policy,enabled:false}});
 f.storage.upsertMembership({...f.storage.getMembership(f.sid,f.ids.one)!,reviewer_eligible:false,independence_group:'current-group-changed'});f.storage.upsertMembership({...f.storage.getMembership(f.sid,f.ids.two)!,independence_group:'current-group-changed'});const counts=f.counts();f.reopen();
 expect(create(f,'history',creator)).toEqual(first);
 expect(f.service.cancelRequest(f.context(creator),f.sid,first.id,{expected_version:1,reason:'owned cancellation'},'cancel-key')).toEqual(cancel);expect(f.counts()).toEqual(counts);
 expect(f.service.getRequest(f.context(f.ids.reader),f.sid,first.id)).toEqual(cancel);
 rejected(()=>create(f,'history',creator,{...f.request,reproduction_instructions:'changed owned payload'}),'IDEMPOTENCY_CONFLICT',409);
 rejected(()=>f.service.cancelRequest(f.context(creator),f.sid,first.id,{expected_version:2,reason:'fresh second cancel'},'new-key'),'VALIDATION_ERROR',400);
});

const raceWorker=`import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import readline from 'node:readline';
const lines=readline.createInterface({input:process.stdin})[Symbol.asyncIterator]();let db;let stage='input';
try{const input=JSON.parse((await lines.next()).value);const require=createRequire(input.root+'/package.json');const Database=require('better-sqlite3');
const core=await import(pathToFileURL(input.root+'/packages/core/dist/index.js').href);const sqlite=await import(pathToFileURL(input.root+'/packages/storage-sqlite/dist/index.js').href);const review=await import(pathToFileURL(input.root+'/modules/review/dist/index.js').href);
stage='construct';db=new Database(input.dbFile);db.pragma('busy_timeout=5000');const storage=new sqlite.SqliteStorage(db),hasher=new core.CryptoHasher(),clock={now:()=>new Date(input.now),nowIso:()=>input.now},idGen=new core.CryptoIdGenerator(),auth=new core.AuthService(storage,hasher,clock);const service=new review.ReviewRequestService(storage,auth,new core.IdempotencyService(storage,hasher,clock),clock,idGen,new review.ReviewModule(storage,hasher,clock,idGen,auth));
process.stdout.write('READY\\n');await lines.next();stage='create';const view=service.createRequest(auth.authenticateToken(input.token),input.sid,input.request,input.key);process.stdout.write(JSON.stringify({id:view.id,snapshot_id:view.snapshot_id,round:view.round,phase:view.phase,version:view.version})+'\\n');
}catch(error){process.stdout.write(JSON.stringify({stage,error_code:typeof error?.code==='string'&&/^[A-Z_]{1,40}$/.test(error.code)?error.code:'ERROR'})+'\\n');process.exitCode=1;}finally{db?.close();process.stdin.destroy();}`;
async function concurrent(f:Fixture,keys:string[]){
 const worker=path.join(f.directory,'owned-race.mjs');await writeFile(worker,raceWorker);const children:ChildProcessWithoutNullStreams[]=[];let readyTimer:ReturnType<typeof setTimeout>|undefined,finishTimer:ReturnType<typeof setTimeout>|undefined;
 try{
  const jobs=keys.map(key=>{
   const child=spawn(process.execPath,[worker],{cwd:f.directory,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH??''}});children.push(child);let text='',stderrBytes=0;let readyResolve!:()=>void;const ready=new Promise<void>(resolve=>{readyResolve=resolve;});
   child.stdout.on('data',b=>{text+=b.toString();if(text.includes('READY\n'))readyResolve();});child.stderr.on('data',b=>{stderrBytes+=b.length;});
   const ended=new Promise<{exit:number|null;signal:NodeJS.Signals|null}>(resolve=>{child.once('close',(exit,signal)=>resolve({exit,signal}));child.once('error',()=>resolve({exit:null,signal:null}));});
   child.stdin.write(JSON.stringify({root,dbFile:f.dbFile,token:f.tokens.get(f.ids.author),sid:f.sid,request:f.request,key,now:firstTime})+'\n');return {child,ready,ended,output:()=>text,stderr:()=>stderrBytes};
  });
  await Promise.race([Promise.all(jobs.map(j=>j.ready)),new Promise<never>((_,reject)=>{readyTimer=setTimeout(()=>reject(new Error('Owned race readiness deadline')),8000);readyTimer.unref();})]);
  clearTimeout(readyTimer);
  for(const j of jobs)j.child.stdin.end('GO\n');
  const results=await Promise.race([Promise.all(jobs.map(async j=>{const ended=await j.ended;expect(ended).toEqual({exit:0,signal:null});expect(j.stderr()).toBe(0);return JSON.parse(j.output().split('\n').find(s=>s.startsWith('{'))!) as {id:string;round:number;snapshot_id:string;phase:string;version:number};})),new Promise<never>((_,reject)=>{finishTimer=setTimeout(()=>reject(new Error('Owned race completion deadline')),8000);finishTimer.unref();})]);clearTimeout(finishTimer);return results;
 }finally{clearTimeout(readyTimer);clearTimeout(finishTimer);await Promise.all(children.map(async child=>{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await new Promise<void>(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},2000);child.once('close',()=>{clearTimeout(timer);resolve();});});}}));}
}
it('DI04 actual two-process SQLite races share one key result and reserve distinct target rounds without duplicate side effects',async()=>{
 const f=await fixture();const same=await concurrent(f,['race-same','race-same']);expect(same[0]).toEqual(same[1]);expect(f.counts()).toEqual({snapshots:1,snapshot_items:3,review_requests:1,review_request_versions:1,review_assignments:2,events:1,idempotency_records:1});
 const separate=await concurrent(f,['round-left','round-right']);expect(new Set(separate.map(x=>x.id)).size).toBe(2);expect(separate.map(x=>x.round).sort()).toEqual([2,3]);
 expect(f.counts()).toEqual({snapshots:3,snapshot_items:9,review_requests:3,review_request_versions:3,review_assignments:6,events:3,idempotency_records:3});
},20000);
it('DI05 current privacy and ACL override corrupt stored raw/hash/items/ref without repairing or exposing material',async()=>{
 const f=await fixture(),view=create(f),snapshot=f.storage.findReviewSnapshotById(view.snapshot_id)!;
 const requireResync=()=>rejected(()=>f.service.getSnapshot(f.context(f.ids.reader),f.sid,view.snapshot_id),'RESYNC_REQUIRED',409);
 f.db.prepare('UPDATE snapshots SET manifest_json=?,manifest_sha256=? WHERE id=?').run(snapshot.manifest_json+' ',createHash('sha256').update(snapshot.manifest_json+' ').digest('hex'),snapshot.id);requireResync();
 f.db.prepare('UPDATE snapshots SET manifest_json=?,manifest_sha256=? WHERE id=?').run(snapshot.manifest_json,'0'.repeat(64),snapshot.id);requireResync();
 f.db.prepare('UPDATE snapshots SET manifest_json=?,manifest_sha256=? WHERE id=?').run(snapshot.manifest_json,snapshot.manifest_sha256,snapshot.id);
 const item=f.storage.listReviewSnapshotItems(snapshot.id).find(x=>x.item_type==='space_rules')!;
 f.db.prepare("DELETE FROM snapshot_items WHERE snapshot_id=? AND item_type='space_rules'").run(snapshot.id);requireResync();
 f.db.prepare('INSERT INTO snapshot_items(snapshot_id,item_type,item_id,revision,sha256) VALUES(?,?,?,?,?)').run(item.snapshot_id,item.item_type,item.item_id,item.revision,item.sha256);
 const row=f.db.prepare("SELECT result_ref FROM idempotency_records WHERE key='independent-create'").get() as {result_ref:string};const corrupt=JSON.parse(row.result_ref);corrupt.snapshot_id='snp-missing';f.db.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='independent-create'").run(JSON.stringify(corrupt));rejected(()=>create(f),'RESYNC_REQUIRED',409);f.db.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='independent-create'").run(row.result_ref);
 // F01: self-consistent canonical raw/hash/ref still cannot freeze a contributor as reviewer.
 const changedManifest=JSON.parse(snapshot.manifest_json);changedManifest.contributors.push(f.ids.one);changedManifest.contributors.sort();
 const changedRaw=canonicalizeReviewJson(changedManifest),changedHash=createHash('sha256').update(changedRaw).digest('hex');
 f.db.prepare('UPDATE snapshots SET manifest_json=?,manifest_sha256=? WHERE id=?').run(changedRaw,changedHash,snapshot.id);
 f.db.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='independent-create'").run(JSON.stringify({...JSON.parse(row.result_ref),manifest_sha256:changedHash}));
 const requestResync=()=>{rejected(()=>f.service.getRequest(f.context(f.ids.reader),f.sid,view.id),'RESYNC_REQUIRED',409);rejected(()=>create(f),'RESYNC_REQUIRED',409);};requestResync();
 f.db.prepare('UPDATE snapshots SET manifest_json=?,manifest_sha256=? WHERE id=?').run(snapshot.manifest_json,snapshot.manifest_sha256,snapshot.id);
 f.db.prepare("UPDATE idempotency_records SET result_ref=? WHERE key='independent-create'").run(row.result_ref);
 for(const group of ['group-one',' ']){f.db.prepare('UPDATE review_assignments SET group_at_assignment=? WHERE request_id=? AND reviewer_actor_id=?').run(group,view.id,f.ids.two);requestResync();}
 f.db.prepare('UPDATE review_assignments SET group_at_assignment=? WHERE request_id=? AND reviewer_actor_id=?').run('group-two',view.id,f.ids.two);
 rejected(()=>f.service.getRequest(f.context(f.ids.reader),f.otherSid,view.id),'NOT_FOUND',404);
 f.db.prepare("UPDATE snapshots SET manifest_json='PRIVATE-CORRUPTION' WHERE id=?").run(snapshot.id);const member=f.storage.getMembership(f.sid,f.ids.reader)!;f.storage.upsertMembership({...member,active:false});rejected(()=>f.service.getSnapshot(f.context(f.ids.reader),f.sid,view.snapshot_id),'NOT_FOUND',404);f.storage.upsertMembership(member);f.db.prepare('UPDATE snapshots SET manifest_json=? WHERE id=?').run(snapshot.manifest_json,snapshot.id);
 f.db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id='pst-claim'").run();rejected(()=>f.service.getSnapshot(f.context(f.ids.reader),f.sid,view.snapshot_id),'CONTENT_REDACTED',410);rejected(()=>create(f),'CONTENT_REDACTED',410);f.db.prepare("UPDATE posts SET lifecycle='active' WHERE id='pst-claim'").run();
 f.db.prepare("UPDATE artifacts SET visibility='review_assignment' WHERE id='art-evidence'").run();rejected(()=>f.service.getRequest(f.context(f.ids.reader),f.sid,view.id),'NOT_FOUND',404);
});
it('DI06 real public review metadata delivery matches target thread only and never auto-acknowledges or includes body/group',async()=>{
 const f=await fixture(),view=create(f);f.service.cancelRequest(f.context(),f.sid,view.id,{expected_version:1,reason:'PRIVATE-CANCELLATION-REASON'},'event-cancel');
 const events=new EventService(f.storage,f.idGen,f.clock,new HmacTokenSigner(),f.auth,f.storage.getInstanceSecret());const actor=f.context(f.ids.reader);
 const matching=events.subscribe(actor,f.sid,{consumer_key:'matching',start:'beginning',thread_ids:[f.thread],event_types:['review.requested','review.cancelled']});
 const unrelated=events.subscribe(actor,f.sid,{consumer_key:'unrelated',start:'beginning',thread_ids:[f.otherThread],event_types:['review.requested','review.cancelled']});
 const delivered=events.poll(actor,f.sid,matching.consumer.id,{limit:20});expect(delivered.events.map(x=>[x.type,x.object_id,x.revision])).toEqual([['review.requested',view.id,1],['review.cancelled',view.id,2]]);expect(events.poll(actor,f.sid,unrelated.consumer.id,{limit:20}).events).toEqual([]);
 expect(JSON.stringify(delivered.events).includes('PRIVATE')).toBe(false);expect(JSON.stringify(delivered.events).includes('group-one')).toBe(false);
 expect(f.storage.findConsumerById(matching.consumer.id)!.ack_seq).toBe(0);expect(events.poll(actor,f.sid,matching.consumer.id,{limit:20}).events).toEqual(delivered.events);
});

// M01 is exercised independently of DI05; three separate real file databases, sequentially.
it('DI07 legitimate target dependency or artifact redaction must not prevent ordinary schema3 reopen, while reads and replay remain gone',async()=>{
 const outcomes:Array<{variant:string;reopened:boolean;error_code?:string}>=[];
 for(const variant of ['target','dependency','artifact'] as const){
  const f=await fixture();f.storage.upsertMembership({...f.storage.getMembership(f.sid,f.ids.maintainer)!,role:'owner'});
  const head=f.storage.findPostById('pst-claim')!,rev=f.storage.getPostRevision('pst-claim',1)!;
  for(const id of ['pst-dependency','pst-safe'])f.storage.createPost({...head,id},{...rev,post_id:id,editor_id:f.ids.author});
  const req={...f.request,dependency_refs:[{post_id:'pst-dependency',revision:1}]};const affected=create(f,'m01-affected',f.ids.author,req);
  const safe=create(f,'m01-safe',f.ids.author,{...f.request,target_ref:{post_id:'pst-safe',revision:1},artifact_ids:[]});
  const redactions=new RedactionService(f.storage,f.idGen,f.clock,f.auth,new IdempotencyService(f.storage,f.hasher,f.clock));
  redactions.createRedaction(f.context(f.ids.maintainer),f.sid,{target_type:variant==='artifact'?'artifact':'post',target_id:variant==='artifact'?'art-evidence':variant==='dependency'?'pst-dependency':'pst-claim',reason:'owned M01 redaction'},'m01-redact');
  f.reopen();
  try{openAndCoordinateDatabase(f.db,'serve');outcomes.push({variant,reopened:true});}
  catch(error){outcomes.push({variant,reopened:false,error_code:(error as {code?:string}).code??'ERROR'});continue;}
  rejected(()=>f.service.getSnapshot(f.context(f.ids.reader),f.sid,affected.snapshot_id),'CONTENT_REDACTED',410);
  rejected(()=>f.service.getRequest(f.context(f.ids.reader),f.sid,affected.id),'CONTENT_REDACTED',410);
  rejected(()=>create(f,'m01-affected',f.ids.author,req),'CONTENT_REDACTED',410);
  expect(f.service.getRequest(f.context(f.ids.reader),f.sid,safe.id)).toEqual(safe);
  expect(f.service.getSnapshot(f.context(f.ids.reader),f.sid,safe.snapshot_id).snapshot_id).toBe(safe.snapshot_id);
 }
 await writeFile(path.join(root,'docs/reviews/2026-10-09-m6-1-b/verification/DI07-first-observations.json'),JSON.stringify({outcomes,privacy_checks_only_after_successful_reopen:true},null,2)+'\n');
 expect(outcomes).toEqual(['target','dependency','artifact'].map(variant=>({variant,reopened:true})));
},5000);
