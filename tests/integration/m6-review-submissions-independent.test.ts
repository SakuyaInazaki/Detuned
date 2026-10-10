import {afterEach, expect, it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {bootstrapDatabase, SqliteStorage, openAndCoordinateDatabase} from '@detuned/storage-sqlite';
import {AuthService, CryptoHasher, CryptoIdGenerator, IdempotencyService, PostService, ArtifactService, SpaceExportService, SearchService,
  RedactionService, EventService, HmacTokenSigner} from '@detuned/core';
import {ReviewModule, ReviewRequestService, ReviewSubmissionService} from '@detuned/module-review';
import {buildApp} from '@detuned/server';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {DEFAULT_ARTIFACT_LIMITS, CreateReviewSubmissionSchema, ToolReviewSubmitOpSchema, type CreateReviewSubmission, type CreateReviewRequest, type ReviewPolicy} from '@detuned/protocol';
import {Value} from '@sinclair/typebox/value';

// Trusted synthetic actor/thread seeds; actual business writes, SQLite files and blob pipeline.
// HTTP below is the real Fastify routing via inject, not a deployed/browser certification.
const repo=fileURLToPath(new URL('../../',import.meta.url));
const disposers:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(disposers.length)await disposers.pop()!();});
const now='2026-10-09T00:10:00.000Z';
const clock={now:()=>new Date(now),nowIso:()=>now};
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,
  distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const counted=['review_requests','review_request_versions','review_submissions','events','idempotency_records','artifacts'];
async function fixture(){
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-submission-independent-'));
 const dbFile=path.join(directory,'detuned.sqlite');const db=new Database(dbFile);
 db.pragma('journal_mode=WAL');db.pragma('busy_timeout=5000');bootstrapDatabase(db);
 disposers.push(async()=>{if(db.open)db.close();await rm(directory,{recursive:true,force:true});});
 const storage=new SqliteStorage(db),hasher=new CryptoHasher(),ids=new CryptoIdGenerator();
 const auth=new AuthService(storage,hasher,clock),idem=new IdempotencyService(storage,hasher,clock);
 const sid='spc-submission-owned',tid='thd-submission-owned',other='spc-submission-other';
 const actors={author:'act-submission-author',one:'act-submission-one',two:'act-submission-two',reader:'act-submission-reader'};
 const tokens=new Map<string,string>();
 for(const [name,id] of Object.entries(actors)){
  storage.createActor({id,kind:'human',display_name:id,created_at:now,disabled_at:null});
  const token=randomBytes(32).toString('hex');tokens.set(id,token);
  storage.createCredential({id:'cred-'+id,actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[sid,other],capabilities:name==='reader'?['read']:['read','write'],created_at:now,expires_at:null,revoked_at:null});
 }
 for(const space of [sid,other]){
  storage.createSpace({id:space,slug:space,current_revision:1,policy_revision:1,acl_epoch:1,created_at:now},
   {space_id:space,revision:1,objective:'Synthetic sealed review',rules:['synthetic rule'],review_policy:policy,check_profiles:{},pinned_refs:[],editor_id:actors.author,created_at:now});
  for(const [name,id] of Object.entries(actors))storage.upsertMembership({space_id:space,actor_id:id,role:name==='author'?'owner':'observer',active:true,reviewer_eligible:name==='one'||name==='two',independence_group:id});
 }
 storage.createThread({id:tid,space_id:sid,title:'Synthetic review',version:1,state:'open',creator_id:actors.author,created_at:now,updated_at:now});
 const context=(id=actors.author)=>auth.authenticateToken(tokens.get(id)!);
 const posts=new PostService(storage,ids,clock,hasher,auth,idem);
 const target=posts.createPost(context(),sid,tid,{kind:'claim',title:'Synthetic claim',summary:'test material',body:'public test body',
  structured:{statement:'repeatable claim',assumptions:['owned input'],scope:'synthetic test',falsification_plan:'counterexample'}},'claim');
 const requests=new ReviewRequestService(storage,auth,idem,clock,ids,new ReviewModule(storage,hasher,clock,ids,auth));
 const request={target_ref:{post_id:target.post.id,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],
  reviewer_actor_ids:[actors.one,actors.two],expected_policy_revision:1,reproduction_instructions:'Synthetic independent test'};
 const submissions=new ReviewSubmissionService(storage,auth,idem,clock,ids);
 for(const id of [actors.one,actors.two])for(const number of [1,2])storage.createSession({id:`ses-${id}-${number}`,space_id:sid,actor_id:id,client_name:'owned-independent',client_version:'1',harness_session_id:null,metadata:{},created_at:now});
 const blobs=await ArtifactFileStore.create(directory),artifacts=new ArtifactService(storage,blobs,auth,idem,ids,clock,DEFAULT_ARTIFACT_LIMITS);
 const counts=()=>Object.fromEntries(counted.map(t=>[t,(db.prepare('SELECT count(*) n FROM '+t).get() as {n:number}).n]));
 const create=(key='create')=>requests.createRequest(context(),sid,request,key);
 const body=(hash:string,id=actors.one,session=1):CreateReviewSubmission=>({snapshot_sha256:hash,reviewer_session_id:`ses-${id}-${session}`,completion_status:'complete',verdict:'accept',coverage:'SEALED-COVERAGE-ONLY',checks_performed:'SEALED-CHECKS-ONLY',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent synthetic reviewer'}});
 const upload=async(actor:string,assignment:string,key:string,text:string)=>{
  const staged=await blobs.stage((async function*(){yield Buffer.from(text);})(),DEFAULT_ARTIFACT_LIMITS.max_file_bytes);
  return artifacts.createForReview(context(actor),sid,assignment,{staged,mime:'text/plain',metadata:{}},key);
 };
 return {directory,dbFile,db,storage,hasher,ids,auth,idem,sid,tid,other,actors,tokens,context,requests,request,submissions,blobs,artifacts,posts,target,counts,create,body,upload};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function refused(run:()=>unknown,code:string){expect(run).toThrow(expect.objectContaining({code}));}
async function refusedAsync(run:()=>Promise<unknown>,code:string){await expect(run()).rejects.toMatchObject({code});}

it('SD01 sealed payload and cited or unused private blobs stay inaccessible across actual read/event/HTTP surfaces, then only cited evidence opens',async()=>{
 const f=await fixture(),request=f.create();
 const one=f.submissions.getOwnAssignment(f.context(f.actors.one),f.sid,request.id);
 const cited=await f.upload(f.actors.one,one.id,'cited','SEALED-ARTIFACT-CONTENT');
 const unused=await f.upload(f.actors.one,one.id,'unused','UNUSED-ARTIFACT-CONTENT');
 const body=f.body(request.snapshot_sha256);body.evidence_refs=[{kind:'artifact',artifact_id:cited.id}];
 const acknowledgement=f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'first');
 expect(f.requests.getRequest(f.context(f.actors.reader),f.sid,request.id)).toMatchObject({submitted_count:1,phase:'collecting',changed_by:null});
 expect(Object.hasOwn(acknowledgement,'revealed_at')).toBe(false);
 refused(()=>f.submissions.getSubmission(f.context(),f.sid,acknowledgement.submission_id),'NOT_FOUND');
 refused(()=>f.submissions.getSubmission(f.context(f.actors.two),f.sid,acknowledgement.submission_id),'NOT_FOUND');
 await refusedAsync(()=>f.artifacts.getMetadata(f.context(),f.sid,cited.id),'NOT_FOUND');
 await refusedAsync(()=>f.artifacts.getContent(f.context(f.actors.two),f.sid,cited.id),'NOT_FOUND');
 const app=buildApp({storage:f.storage,clock,artifactBlobs:f.blobs});disposers.push(()=>app.close());await app.ready();
 const headers={authorization:`Bearer ${f.tokens.get(f.actors.reader)!}`};
 for(const id of [cited.id,unused.id]){
  expect((await app.inject({method:'GET',url:`/api/v1/spaces/${f.sid}/artifacts/${id}`,headers})).statusCode).toBe(404);
  expect((await app.inject({method:'GET',url:`/api/v1/spaces/${f.sid}/artifacts/${id}/content`,headers})).statusCode).toBe(404);
 }
 const events=new EventService(f.storage,f.ids,clock,new HmacTokenSigner(),f.auth,f.storage.getInstanceSecret());
 const consumer=events.subscribe(f.context(f.actors.reader),f.sid,{consumer_key:'sealed-public',start:'beginning'}).consumer;
 const first=events.poll(f.context(f.actors.reader),f.sid,consumer.id,{limit:50});
 expect(first.events.some(e=>e.visibility!=='public'||e.type==='review.submitted'||e.object_id===cited.id||e.object_id===unused.id)).toBe(false);
 expect(JSON.stringify(first).includes('SEALED-')).toBe(false);expect(f.storage.findConsumerById(consumer.id)!.ack_seq).toBe(0);
 const search=new SearchService(f.storage,f.auth,{signer:new HmacTokenSigner(),secret:f.storage.getInstanceSecret(),clock,hasher:f.hasher});
 expect(search.search(f.context(f.actors.reader),f.sid,{q:'SEALED'}).items).toEqual([]);
 const exporter=new SpaceExportService(f.storage,f.auth,clock),session=exporter.open(f.context(f.actors.reader),f.sid);let exported='';
 try{for(;;){const item=session.nextLine();if(item.kind==='done')break;if(item.kind==='line')exported+=item.line;}}finally{exporter.closeAll();}
 expect(exported.includes('SEALED-')).toBe(false);expect(exported.includes(cited.id)).toBe(false);expect(exported.includes(unused.id)).toBe(false);
 f.submissions.submit(f.context(f.actors.two),f.sid,request.id,f.body(request.snapshot_sha256,f.actors.two),'last');
 expect(f.submissions.getSubmission(f.context(f.actors.reader),f.sid,acknowledgement.submission_id).coverage).toBe(body.coverage);
 expect(await f.artifacts.getMetadata(f.context(f.actors.reader),f.sid,cited.id)).toMatchObject({visibility:'review_assignment',review_assignment_id:one.id});
 await refusedAsync(()=>f.artifacts.getMetadata(f.context(f.actors.reader),f.sid,unused.id),'NOT_FOUND');
 const metadata=await app.inject({method:'GET',url:`/api/v1/spaces/${f.sid}/artifacts/${cited.id}`,headers});expect(metadata.statusCode).toBe(200);
 expect(metadata.json().data.visibility).toBe('review_assignment');expect(metadata.json().data.review_assignment_id).toBe(one.id);
 expect(metadata.body.includes('storage_key')).toBe(false);
 expect(f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'first')).toEqual(acknowledgement);
 expect((f.db.prepare("SELECT count(*) n FROM events WHERE type='review.revealed'").get() as {n:number}).n).toBe(1);
});

it('SD02 the last reviewer checks earlier private evidence redaction and readiness without reading another sealed assignment or committing partial reveal',async()=>{
 for(const state of ['redacted','missing','failed'] as const){
  const f=await fixture(),request=f.create(),assignment=f.submissions.getOwnAssignment(f.context(f.actors.one),f.sid,request.id);
  const artifact=await f.upload(f.actors.one,assignment.id,'evidence','synthetic independent evidence');
  const body=f.body(request.snapshot_sha256);body.evidence_refs=[{kind:'artifact',artifact_id:artifact.id}];
  const first=f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'sealed');
  if(state==='redacted')new RedactionService(f.storage,f.ids,clock,f.auth,f.idem).createRedaction(f.context(),f.sid,{target_type:'artifact',target_id:artifact.id,reason:'owned privacy transition'},'redact');
  else f.db.prepare('UPDATE artifacts SET state=? WHERE id=?').run(state,artifact.id); // Synthetic physical readiness fault, not a public mutation API.
  const before=f.counts();refused(()=>f.submissions.submit(f.context(f.actors.two),f.sid,request.id,f.body(request.snapshot_sha256,f.actors.two),'last'),state==='redacted'?'CONTENT_REDACTED':'SNAPSHOT_STALE');
  expect(f.counts()).toEqual(before);expect(f.storage.findReviewSubmissionById(first.submission_id)!.revealed_at).toBeNull();
  expect(f.requests.getRequest(f.context(),f.sid,request.id)).toMatchObject({phase:'collecting',submitted_count:1,changed_by:null});
  expect(f.db.prepare("SELECT 1 FROM idempotency_records WHERE key='last'").get()).toBeUndefined();
  refused(()=>f.submissions.getSubmission(f.context(f.actors.two),f.sid,first.submission_id),'NOT_FOUND');
 }
});

it('SD03 actual SQLite final-key failure rolls back submission/session/count/event and permits a subsequent original-key commit with exact immutable replay',async()=>{
 const f=await fixture(),request=f.create(),body=f.body(request.snapshot_sha256),before=f.counts();
 f.db.exec("CREATE TRIGGER owned_submission_failure BEFORE INSERT ON idempotency_records WHEN NEW.operation LIKE 'review.submission.create:%' BEGIN SELECT RAISE(ABORT,'owned final-key barrier'); END;");
 try{expect(()=>f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'retry')).toThrow();expect(f.counts()).toEqual(before);}
 finally{f.db.exec('DROP TRIGGER owned_submission_failure');}
 expect(f.storage.listReviewSubmissions(request.id)).toEqual([]);
 const ack=f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'retry'),after=f.counts();
 expect(f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'retry')).toEqual(ack);expect(f.counts()).toEqual(after);
 refused(()=>f.submissions.submit(f.context(f.actors.one),f.sid,request.id,{...body,coverage:'changed'},'retry'),'IDEMPOTENCY_CONFLICT');
 refused(()=>f.submissions.submit(f.context(f.actors.one),f.sid,request.id,f.body(request.snapshot_sha256,f.actors.one,2),'different-session'),'VALIDATION_ERROR');
 const head=f.storage.findSpaceById(f.sid)!,rev=f.storage.getSpaceRevision(f.sid,1)!;
 f.storage.updateSpace({...head,current_revision:2,policy_revision:2},{...rev,revision:2,rules:['changed rule']});
 expect(f.submissions.submit(f.context(f.actors.one),f.sid,request.id,body,'retry')).toEqual(ack);expect(f.counts()).toEqual(after);
 expect(Object.hasOwn(ack,'submitted_count')).toBe(false);
});

const worker=`import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import readline from 'node:readline';
const lines=readline.createInterface({input:process.stdin})[Symbol.asyncIterator]();let db;
try{const i=JSON.parse((await lines.next()).value),require=createRequire(i.root+'/package.json'),Database=require('better-sqlite3');
const core=await import(pathToFileURL(i.root+'/packages/core/dist/index.js').href),sqlite=await import(pathToFileURL(i.root+'/packages/storage-sqlite/dist/index.js').href),review=await import(pathToFileURL(i.root+'/modules/review/dist/index.js').href);
db=new Database(i.dbFile);db.pragma('busy_timeout=5000');const s=new sqlite.SqliteStorage(db),h=new core.CryptoHasher(),c={now:()=>new Date(i.now),nowIso:()=>i.now},a=new core.AuthService(s,h,c),service=new review.ReviewSubmissionService(s,a,new core.IdempotencyService(s,h,c),c,new core.CryptoIdGenerator());
process.stdout.write('READY\\n');await lines.next();const result=service.submit(a.authenticateToken(i.token),i.sid,i.requestId,i.body,i.key);process.stdout.write(JSON.stringify(result)+'\\n');
}catch(e){process.stdout.write(JSON.stringify({error_code:typeof e?.code==='string'&&/^[A-Z_]{1,40}$/.test(e.code)?e.code:'ERROR'})+'\\n');process.exitCode=1;}finally{db?.close();process.stdin.destroy();}`;
async function race(f:Fixture,requestId:string,jobs:Array<{actor:string;body:CreateReviewSubmission;key:string}>){
 const file=path.join(f.directory,'race.mjs');await writeFile(file,worker);const children:ChildProcessWithoutNullStreams[]=[];
 let readyTimer:ReturnType<typeof setTimeout>|undefined,finishTimer:ReturnType<typeof setTimeout>|undefined;
 try{
  const running=jobs.map(job=>{
   const child=spawn(process.execPath,[file],{cwd:f.directory,env:{PATH:process.env.PATH??''},stdio:['pipe','pipe','pipe']});children.push(child);
   let output='',stderrBytes=0,readyResolve!:()=>void;const ready=new Promise<void>(r=>{readyResolve=r;});
   child.stdout.on('data',b=>{output+=b.toString();if(output.includes('READY\n'))readyResolve();});child.stderr.on('data',b=>{stderrBytes+=b.length;});
   const end=new Promise<{exit:number|null;signal:NodeJS.Signals|null}>(resolve=>{child.once('close',(exit,signal)=>resolve({exit,signal}));child.once('error',()=>resolve({exit:null,signal:null}));});
   child.stdin.write(JSON.stringify({root:repo,dbFile:f.dbFile,now,sid:f.sid,requestId,token:f.tokens.get(job.actor),body:job.body,key:job.key})+'\n');
   return {child,ready,end,output:()=>output,stderr:()=>stderrBytes};
  });
  await Promise.race([Promise.all(running.map(j=>j.ready)),new Promise<never>((_,r)=>{readyTimer=setTimeout(()=>r(new Error('Owned readiness deadline')),8000);})]);clearTimeout(readyTimer);
  for(const job of running)job.child.stdin.end('GO\n');
  const results=await Promise.race([Promise.all(running.map(async job=>{expect(await job.end).toEqual({exit:0,signal:null});expect(job.stderr()).toBe(0);return JSON.parse(job.output().split('\n').find(s=>s.startsWith('{'))!) as {submission_id:string};})),new Promise<never>((_,r)=>{finishTimer=setTimeout(()=>r(new Error('Owned completion deadline')),8000);})]);clearTimeout(finishTimer);return results;
 }finally{
  clearTimeout(readyTimer);clearTimeout(finishTimer);
  await Promise.all(children.map(async child=>{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await new Promise<void>(resolve=>{const t=setTimeout(()=>{child.kill('SIGKILL');resolve();},2000);child.once('close',()=>{clearTimeout(t);resolve();});});}}));
 }
}
it('SD04 two genuine processes sharing a key commit one initial submission, and two distinct reviewers race one atomic reveal',async()=>{
 const first=await fixture(),request=first.create(),body=first.body(request.snapshot_sha256);
 const same=await race(first,request.id,[{actor:first.actors.one,body,key:'same'},{actor:first.actors.one,body,key:'same'}]);
 expect(same[0]).toEqual(same[1]);expect(first.storage.listReviewSubmissions(request.id)).toHaveLength(1);
 expect(first.storage.findReviewRequestById(request.id)!.submitted_count).toBe(1);
 expect((first.db.prepare("SELECT count(*) n FROM events WHERE type='review.submitted'").get() as {n:number}).n).toBe(1);
 const second=await fixture(),req=second.create();
 const different=await race(second,req.id,[{actor:second.actors.one,body:second.body(req.snapshot_sha256),key:'one'},{actor:second.actors.two,body:second.body(req.snapshot_sha256,second.actors.two),key:'two'}]);
 expect(new Set(different.map(x=>x.submission_id)).size).toBe(2);expect(second.storage.findReviewRequestById(req.id)).toMatchObject({phase:'revealed',submitted_count:2,version:3});
 expect(second.storage.listReviewSubmissions(req.id).every(x=>x.revealed_at!==null)).toBe(true);
 expect((second.db.prepare("SELECT count(*) n FROM events WHERE type='review.revealed'").get() as {n:number}).n).toBe(1);
},20000);

it('SD05 current scope, credential and sessions are enforced while observer review privileges do not become public write privileges',async()=>{
 const f=await fixture(),request=f.create(),actor=f.actors.one,context=f.context(actor),body=f.body(request.snapshot_sha256);
 refused(()=>f.submissions.getOwnAssignment(context,f.other,request.id),'NOT_FOUND');
 refused(()=>f.posts.createPost(context,f.sid,f.tid,{kind:'note',title:'owned refusal',summary:'owned',body:'not allowed'},'observer-public'),'FORBIDDEN');
 const member=f.storage.getMembership(f.sid,actor)!;f.storage.upsertMembership({...member,active:false});
 refused(()=>f.submissions.submit(context,f.sid,request.id,body,'inactive'),'NOT_FOUND');f.storage.upsertMembership(member);
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read']),actor);
 refused(()=>f.submissions.submit(context,f.sid,request.id,body,'readonly'),'FORBIDDEN');
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read','write']),actor);
 refused(()=>f.submissions.submit(context,f.sid,request.id,{...body,reviewer_session_id:`ses-${f.actors.two}-1`},'other-session'),'VALIDATION_ERROR');
 f.db.prepare('UPDATE sessions SET created_at=? WHERE id=?').run('2026-10-08T23:59:59.000Z',body.reviewer_session_id);
 refused(()=>f.submissions.submit(context,f.sid,request.id,body,'old-session'),'VALIDATION_ERROR');
 expect(f.storage.listReviewSubmissions(request.id)).toEqual([]);
});

it('SD06 corrupt submission bytes, session binding and compact reference remain refused during reads and ordinary reopen; failed private upload cleans physical blobs',async()=>{
 const f=await fixture(),request=f.create(),assignment=f.submissions.getOwnAssignment(f.context(f.actors.one),f.sid,request.id);
 const beforeObjects=await readdir(path.join(f.directory,'artifacts','objects')),before=f.counts();
 f.db.exec("CREATE TRIGGER owned_artifact_failure BEFORE INSERT ON idempotency_records WHEN NEW.operation LIKE 'artifact.review.create:%' BEGIN SELECT RAISE(ABORT,'owned artifact key barrier'); END;");
 try{await expect(f.upload(f.actors.one,assignment.id,'fail','owned unpublished blob')).rejects.toThrow();}finally{f.db.exec('DROP TRIGGER owned_artifact_failure');}
 expect(f.counts()).toEqual(before);expect(await readdir(path.join(f.directory,'artifacts','objects'))).toEqual(beforeObjects);expect(await readdir(path.join(f.directory,'artifacts','staging'))).toEqual([]);
 const ack=f.submissions.submit(f.context(f.actors.one),f.sid,request.id,f.body(request.snapshot_sha256),'first');
 const row=f.db.prepare('SELECT payload_json FROM review_submissions WHERE id=?').get(ack.submission_id) as {payload_json:string};
 f.db.prepare('UPDATE review_submissions SET payload_json=? WHERE id=?').run(JSON.stringify({...JSON.parse(row.payload_json),completion_status:'provisional'}),ack.submission_id);
 refused(()=>f.submissions.getSubmission(f.context(f.actors.one),f.sid,ack.submission_id),'RESYNC_REQUIRED');
 expect(()=>openAndCoordinateDatabase(f.db,'serve')).toThrow();
 f.db.prepare('UPDATE review_submissions SET payload_json=? WHERE id=?').run(row.payload_json,ack.submission_id);
 expect(()=>openAndCoordinateDatabase(f.db,'serve')).not.toThrow();
 f.db.prepare('UPDATE review_submissions SET reviewer_session_id=? WHERE id=?').run(`ses-${f.actors.two}-1`,ack.submission_id);
 refused(()=>f.submissions.getSubmission(f.context(f.actors.one),f.sid,ack.submission_id),'RESYNC_REQUIRED');
});

it('SD07 submission DTO and its inactive tool reject terminal linebreak hash countervectors before any business action',()=>{
 const body:CreateReviewSubmission={snapshot_sha256:'a'.repeat(64),reviewer_session_id:'owned-session',completion_status:'complete',verdict:'accept',coverage:'owned',checks_performed:'owned',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}};
 expect(Value.Check(CreateReviewSubmissionSchema,body)).toBe(true);
 const tool={...body,space_id:'owned-space',request_key:'owned-key',op:'submit',request_id:'owned-request'};
 expect(Value.Check(ToolReviewSubmitOpSchema,tool)).toBe(true);
 const observations=['\n','\r','\r\n'].map(suffix=>({dto:Value.Check(CreateReviewSubmissionSchema,{...body,snapshot_sha256:body.snapshot_sha256+suffix}),tool:Value.Check(ToolReviewSubmitOpSchema,{...tool,snapshot_sha256:body.snapshot_sha256+suffix})}));
 expect(observations).toEqual(Array.from({length:3},()=>({dto:false,tool:false})));
});

it('SD08 fixed own assignment remains readable with read-only credentials or later eligibility and phase changes, while new writes retain fresh gates',async()=>{
 const f=await fixture(),request=f.create(),actor=f.actors.one,expected=f.submissions.getOwnAssignment(f.context(actor),f.sid,request.id);
 const observed:Array<{stage:string;readable:boolean;code:string|null}>=[];
 const read=(stage:string)=>{try{expect(f.submissions.getOwnAssignment(f.context(actor),f.sid,request.id)).toEqual(expected);observed.push({stage,readable:true,code:null});}catch(e){observed.push({stage,readable:false,code:(e as {code?:string}).code??'ASSERTION'});}};
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read']),actor);read('readonly');
 refused(()=>f.submissions.submit(f.context(actor),f.sid,request.id,f.body(request.snapshot_sha256),'readonly-submit'),'FORBIDDEN');
 await refusedAsync(()=>f.upload(actor,expected.id,'readonly-upload','owned'),'FORBIDDEN');
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read','write']),actor);
 const member=f.storage.getMembership(f.sid,actor)!;f.storage.upsertMembership({...member,reviewer_eligible:false});read('ineligible');
 refused(()=>f.submissions.submit(f.context(actor),f.sid,request.id,f.body(request.snapshot_sha256),'ineligible-submit'),'VALIDATION_ERROR');
 await refusedAsync(()=>f.upload(actor,expected.id,'ineligible-upload','owned'),'FORBIDDEN');
 f.requests.cancelRequest(f.context(),f.sid,request.id,{expected_version:1,reason:'owned cancellation'},'cancel');read('cancelled');f.storage.upsertMembership(member);
 refused(()=>f.submissions.submit(f.context(actor),f.sid,request.id,f.body(request.snapshot_sha256),'cancelled-submit'),'VALIDATION_ERROR');
 f.storage.upsertMembership({...member,active:false});refused(()=>f.submissions.getOwnAssignment(f.context(actor),f.sid,request.id),'NOT_FOUND');
 const g=await fixture(),revealed=g.create(),assignment=g.submissions.getOwnAssignment(g.context(g.actors.one),g.sid,revealed.id);
 g.submissions.submit(g.context(g.actors.one),g.sid,revealed.id,g.body(revealed.snapshot_sha256),'one');
 g.submissions.submit(g.context(g.actors.two),g.sid,revealed.id,g.body(revealed.snapshot_sha256,g.actors.two),'two');
 g.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read']),g.actors.one);
 try{expect(g.submissions.getOwnAssignment(g.context(g.actors.one),g.sid,revealed.id)).toEqual(assignment);observed.push({stage:'revealed-readonly',readable:true,code:null});}catch(e){observed.push({stage:'revealed-readonly',readable:false,code:(e as {code?:string}).code??'ASSERTION'});}
 expect(observed).toEqual(['readonly','ineligible','cancelled','revealed-readonly'].map(stage=>({stage,readable:true,code:null})));
});

it('SD09 fresh private upload rechecks snapshot material before or during real streaming and publishing, with no new key event artifact or residual blob',async()=>{
 const observed:Array<{variant:string;code:string|null;unchanged:boolean;clean:boolean}>=[];
 for(const variant of ['pre-target','stream-dependency','publish-policy','pre-withdrawn','pre-missing-artifact','pre-redacted'] as const){
  const f=await fixture();let material=f.target.post.id;
  const requestInput:CreateReviewRequest={...f.request,dependency_refs:[...f.request.dependency_refs],artifact_ids:[...f.request.artifact_ids]};
  if(variant==='stream-dependency'){
   const dependency=f.posts.createPost(f.context(),f.sid,f.tid,{kind:'note',title:'owned dependency',summary:'owned',body:'fixed dependency'},'dependency');material=dependency.post.id;requestInput.dependency_refs=[{post_id:material,revision:1}];
  }
  if(variant==='pre-missing-artifact'){
   const stage=await f.blobs.stage((async function*(){yield Buffer.from('snapshot artifact');})(),DEFAULT_ARTIFACT_LIMITS.max_file_bytes);
   const artifact=await f.artifacts.create(f.context(),f.sid,{staged:stage,mime:'text/plain',metadata:{}},'snapshot-artifact');requestInput.artifact_ids=[artifact.id];material=artifact.id;
  }
  const request=f.requests.createRequest(f.context(),f.sid,requestInput,'request'),assignment=f.submissions.getOwnAssignment(f.context(f.actors.one),f.sid,request.id);
  const mutate=()=>{
   if(variant==='publish-policy'){const space=f.storage.findSpaceById(f.sid)!,rev=f.storage.getSpaceRevision(f.sid,1)!;f.storage.updateSpace({...space,current_revision:2,policy_revision:2},{...rev,revision:2,rules:['changed owned rule']});}
   else if(variant==='pre-withdrawn')f.db.prepare("UPDATE posts SET lifecycle='withdrawn' WHERE id=?").run(material); // Explicit owned historical lifecycle fault.
   else if(variant==='pre-missing-artifact')f.db.prepare("UPDATE artifacts SET state='missing' WHERE id=?").run(material); // Explicit owned physical readiness fault.
   else if(variant==='pre-redacted')new RedactionService(f.storage,f.ids,clock,f.auth,f.idem).createRedaction(f.context(),f.sid,{target_type:'post',target_id:material,reason:'owned redaction'},'redact');
   else {const rev=f.storage.getPostRevision(material,1)!;f.posts.createRevision(f.context(),f.sid,material,{expected_revision:1,title:rev.title,summary:rev.summary,body:'real changed material',structured:rev.structured},'revision');}
  };
  if(variant.startsWith('pre-'))mutate();
  const staged=await f.blobs.stage((async function*(){yield Buffer.from('private upload first chunk');if(variant==='stream-dependency')mutate();yield Buffer.from(' second chunk');})(),DEFAULT_ARTIFACT_LIMITS.max_file_bytes);
  let baseline=f.counts();const beforeObjects=await readdir(path.join(f.directory,'artifacts','objects'));
  const service=variant==='publish-policy'?new ArtifactService(f.storage,{
   stage:f.blobs.stage.bind(f.blobs),publish:async(s,k)=>{await f.blobs.publish(s,k);mutate();baseline=f.counts();},discardStage:f.blobs.discardStage.bind(f.blobs),discardPublished:f.blobs.discardPublished.bind(f.blobs),exists:f.blobs.exists.bind(f.blobs),open:f.blobs.open.bind(f.blobs),
  },f.auth,f.idem,f.ids,clock,DEFAULT_ARTIFACT_LIMITS):f.artifacts;
  let code:string|null=null;try{await service.createForReview(f.context(f.actors.one),f.sid,assignment.id,{staged,mime:'text/plain',metadata:{}},'fresh-upload');}catch(e){code=(e as {code?:string}).code??'UNKNOWN';}
  observed.push({variant,code,unchanged:JSON.stringify(f.counts())===JSON.stringify(baseline),clean:JSON.stringify(await readdir(path.join(f.directory,'artifacts','objects')))===JSON.stringify(beforeObjects)&&(await readdir(path.join(f.directory,'artifacts','staging'))).length===0});
 }
 // A committed historical upload replay and read retain their immutable meaning after a new material revision.
 const control=await fixture(),request=control.create(),assignment=control.submissions.getOwnAssignment(control.context(control.actors.one),control.sid,request.id);
 const first=await control.upload(control.actors.one,assignment.id,'historical-upload','same immutable bytes');
 const rev=control.storage.getPostRevision(control.target.post.id,1)!;
 control.posts.createRevision(control.context(),control.sid,control.target.post.id,{expected_revision:1,title:rev.title,summary:rev.summary,body:'changed after original upload',structured:rev.structured},'control-new-revision');
 const counts=control.counts(),objects=await readdir(path.join(control.directory,'artifacts','objects'));
 expect(await control.upload(control.actors.one,assignment.id,'historical-upload','same immutable bytes')).toEqual(first);
 expect(await control.artifacts.getMetadata(control.context(control.actors.one),control.sid,first.id)).toEqual(first);
 expect(control.counts()).toEqual(counts);expect(await readdir(path.join(control.directory,'artifacts','objects'))).toEqual(objects);expect(await readdir(path.join(control.directory,'artifacts','staging'))).toEqual([]);
 expect(observed).toEqual(['pre-target','stream-dependency','publish-policy','pre-withdrawn','pre-missing-artifact','pre-redacted'].map(variant=>({variant,code:variant==='pre-redacted'?'CONTENT_REDACTED':'SNAPSHOT_STALE',unchanged:true,clean:true})));
});

it('SD10 real private artifact redaction is not disclosed through an ordinary public consumer while public artifact redaction remains visible',async()=>{
 const f=await fixture(),request=f.create(),assignment=f.submissions.getOwnAssignment(f.context(f.actors.one),f.sid,request.id);
 const privateArtifact=await f.upload(f.actors.one,assignment.id,'private-redaction','sealed private bytes');
 const staged=await f.blobs.stage((async function*(){yield Buffer.from('ordinary public bytes');})(),DEFAULT_ARTIFACT_LIMITS.max_file_bytes);
 const publicArtifact=await f.artifacts.create(f.context(),f.sid,{staged,mime:'text/plain',metadata:{}},'public-redaction');
 const redactions=new RedactionService(f.storage,f.ids,clock,f.auth,f.idem);
 for(const [key,id] of [['private-redaction',privateArtifact.id],['public-redaction',publicArtifact.id]] as const)redactions.createRedaction(f.context(),f.sid,{target_type:'artifact',target_id:id,reason:'owned privacy transition'},key);
 const events=new EventService(f.storage,f.ids,clock,new HmacTokenSigner(),f.auth,f.storage.getInstanceSecret());
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read','write','admin']),f.actors.author); // Trusted fixture instance-admin credential, not a public credential mutation.
 const observed:Array<{stage:string;private_ids_visible:number;public_redaction_visible:number;ack_seq:number}>=[];
 const record=(stage:string,actor:string,consumerId:string)=>{const polled=events.poll(f.context(actor),f.sid,consumerId,{limit:100});observed.push({stage,private_ids_visible:polled.events.filter(e=>e.object_id===privateArtifact.id).length,public_redaction_visible:polled.events.filter(e=>e.type==='artifact.redacted'&&e.object_id===publicArtifact.id).length,ack_seq:f.storage.findConsumerById(consumerId)!.ack_seq});return polled;};
 for(const [name,actor] of [['reader',f.actors.reader],['admin',f.actors.author]] as const){const consumer=events.subscribe(f.context(actor),f.sid,{consumer_key:'new-'+name,start:'beginning'}).consumer;record('new-'+name,actor,consumer.id);}
 // Explicit synthetic historical bad visibility, not an archived production capture or fabricated wire response.
 f.db.prepare("UPDATE events SET visibility='public' WHERE object_id=? AND type IN ('artifact.created','artifact.redacted')").run(privateArtifact.id);
 const privateIds=(f.db.prepare("SELECT id FROM events WHERE object_id=? AND type IN ('artifact.created','artifact.redacted')").all(privateArtifact.id) as Array<{id:string}>).map(e=>e.id);
 for(const [name,actor] of [['reader',f.actors.reader],['admin',f.actors.author]] as const){
  const consumer=events.subscribe(f.context(actor),f.sid,{consumer_key:'historical-'+name,start:'beginning'}).consumer;
  const batch=record('historical-'+name,actor,consumer.id);expect(typeof batch.batch_id).toBe('string');
  const row=f.db.prepare('SELECT event_ids FROM delivery_batches WHERE id=?').get(batch.batch_id) as {event_ids:string};
  // Synthetic persisted pending batch containing earlier improperly public private IDs, within its original sequence span.
  f.db.prepare('UPDATE delivery_batches SET event_ids=? WHERE id=?').run(JSON.stringify([...new Set([...JSON.parse(row.event_ids) as string[],...privateIds])]),batch.batch_id);
  record('pending-'+name,actor,consumer.id);
 }
 f.submissions.submit(f.context(f.actors.one),f.sid,request.id,f.body(request.snapshot_sha256),'revealed-one');
 f.submissions.submit(f.context(f.actors.two),f.sid,request.id,f.body(request.snapshot_sha256,f.actors.two),'revealed-two');
 expect(f.storage.findArtifactById(privateArtifact.id)!.visibility).toBe('review_assignment');
 for(const [name,actor] of [['reader',f.actors.reader],['admin',f.actors.author]] as const){const consumer=events.subscribe(f.context(actor),f.sid,{consumer_key:'after-reveal-'+name,start:'beginning'}).consumer;record('after-reveal-'+name,actor,consumer.id);}
 expect(observed).toEqual(['new-reader','new-admin','historical-reader','pending-reader','historical-admin','pending-admin','after-reveal-reader','after-reveal-admin'].map(stage=>({stage,private_ids_visible:0,public_redaction_visible:1,ack_seq:0})));
});
