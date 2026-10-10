import {afterEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,PostService,SpaceService,RelationService,RedactionService,ArtifactService,EventService,HmacTokenSigner} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService,ReviewFinalizationService,ReviewStatusService} from '@detuned/module-review';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {DEFAULT_ARTIFACT_LIMITS,REVIEW_VALIDITY_REASON_ORDER,FinalizeReviewRequestSchema,ToolReviewFinalizeOpSchema,
 type ReviewPolicy,type CreateReviewRequest,type CreateReviewSubmission,type ReviewVerdict} from '@detuned/protocol';
import {Value} from '@sinclair/typebox/value';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const cleanup:Array<()=>Promise<void>>=[];
afterEach(async()=>{while(cleanup.length)await cleanup.pop()!();});
const now='2026-10-09T01:00:00.000Z',clock={now:()=>new Date(now),nowIso:()=>now};
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const tracked=['posts','post_revisions','spaces','space_revisions','review_requests','review_request_versions','review_submissions','review_decisions','events','idempotency_records'];
async function fixture(overrides:Partial<ReviewPolicy>={}){
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-finalize-independent-')),file=path.join(directory,'detuned.sqlite'),db=new Database(file);
 db.pragma('journal_mode=WAL');db.pragma('busy_timeout=5000');bootstrapDatabase(db);
 cleanup.push(async()=>{if(db.open)db.close();await rm(directory,{recursive:true,force:true});});
 const storage=new SqliteStorage(db),hasher=new CryptoHasher(),ids=new CryptoIdGenerator(),auth=new AuthService(storage,hasher,clock),idem=new IdempotencyService(storage,hasher,clock);
 const sid='spc-finalize-owned',other='spc-finalize-other',tid='thd-finalize-owned',otherThread='thd-finalize-other';
 const actors={author:'act-finalize-author',one:'act-finalize-one',two:'act-finalize-two',reader:'act-finalize-reader',writer:'act-finalize-writer'},tokens=new Map<string,string>();
 for(const [name,id] of Object.entries(actors)){
  storage.createActor({id,kind:'human',display_name:id,created_at:now,disabled_at:null});const token=randomBytes(32).toString('hex');tokens.set(id,token);
  storage.createCredential({id:'cred-'+id,actor_id:id,token_hash:hasher.sha256(token),allowed_space_ids:[sid,other],capabilities:name==='reader'?['read']:['read','write'],created_at:now,expires_at:null,revoked_at:null});
 }
 for(const space of [sid,other]){
  storage.createSpace({id:space,slug:space,current_revision:1,policy_revision:1,acl_epoch:1,created_at:now},{space_id:space,revision:1,objective:'Synthetic independent finalization',rules:['Owned rule'],review_policy:{...policy,...overrides},check_profiles:{local:{verifier_actor_ids:[actors.reader],config_sha256:'a'.repeat(64),description:'No actual check run'}},pinned_refs:[],editor_id:actors.author,created_at:now});
  for(const [name,id] of Object.entries(actors))storage.upsertMembership({space_id:space,actor_id:id,role:name==='author'?'owner':name==='writer'?'contributor':'observer',active:true,reviewer_eligible:name==='one'||name==='two',independence_group:'group-'+name});
 }
 for(const thread of [tid,otherThread])storage.createThread({id:thread,space_id:sid,title:thread,version:1,state:'open',creator_id:actors.author,created_at:now,updated_at:now});
 const context=(id=actors.author)=>auth.authenticateToken(tokens.get(id)!);
 const posts=new PostService(storage,ids,clock,hasher,auth,idem),spaces=new SpaceService(storage,ids,clock,auth,idem),relations=new RelationService(storage,ids,clock,auth,idem),redact=new RedactionService(storage,ids,clock,auth,idem);
 const note=(title:string,thread=tid)=>posts.createPost(context(),sid,thread,{kind:'note',title,summary:title,body:title},'note-'+title).post;
 const target=posts.createPost(context(),sid,tid,{kind:'claim',title:'owned target',summary:'owned target',body:'public body',structured:{statement:'synthetic claim',assumptions:['owned data'],scope:'local regression',falsification_plan:'counterexample'}},'target').post;
 const dependency=note('owned dependency'),evidence=note('published post evidence'),challengeSource=posts.createPost(context(actors.writer),sid,tid,{kind:'note',title:'challenge source',summary:'challenge source',body:'public independent challenger note'},'challenge-source').post;
 const blobs=await ArtifactFileStore.create(directory),artifacts=new ArtifactService(storage,blobs,auth,idem,ids,clock,DEFAULT_ARTIFACT_LIMITS);
 const staged=await blobs.stage((async function*(){yield Buffer.from('synthetic snapshot artifact');})(),1000);
 const snapshotArtifact=await artifacts.create(context(),sid,{staged,mime:'text/plain',metadata:{}},'snapshot-artifact');
 const requests=new ReviewRequestService(storage,auth,idem,clock,ids,new ReviewModule(storage,hasher,clock,ids,auth)),submissions=new ReviewSubmissionService(storage,auth,idem,clock,ids),finals=new ReviewFinalizationService(storage,auth,idem,clock,ids),status=new ReviewStatusService(storage,auth);
 const req:CreateReviewRequest={target_ref:{post_id:target.id,revision:1},dependency_refs:[{post_id:dependency.id,revision:1}],artifact_ids:[snapshotArtifact.id],code_refs:[],declared_contributors:[],reviewer_actor_ids:[actors.one,actors.two],expected_policy_revision:1,reproduction_instructions:'owned independent recipe'};
 const request=requests.createRequest(context(),sid,req,'request');
 for(const actor of [actors.one,actors.two])storage.createSession({id:'ses-'+actor,space_id:sid,actor_id:actor,client_name:'independent-finalize',client_version:'1',harness_session_id:null,metadata:{},created_at:now});
 const body=(actor:string,verdict:ReviewVerdict='accept',refs:CreateReviewSubmission['evidence_refs']=[]):CreateReviewSubmission=>({snapshot_sha256:request.snapshot_sha256,reviewer_session_id:'ses-'+actor,completion_status:'complete',verdict,coverage:'Independent coverage',checks_performed:'Synthetic checklist, not a check receipt',evidence_refs:refs,pending_requirements:verdict==='accept'?[]:['Independent unresolved requirement'],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Independent group metadata'}});
 const submit=(actor:string,verdict:ReviewVerdict='accept',refs:CreateReviewSubmission['evidence_refs']=[])=>submissions.submit(context(actor),sid,request.id,body(actor,verdict,refs),'submit-'+actor);
 const reveal=(first:ReviewVerdict='accept',last:ReviewVerdict='accept')=>{submit(actors.one,first,[{kind:'post',post_id:evidence.id,revision:1}]);submit(actors.two,last);};
 const head=()=>storage.findReviewRequestById(request.id)!;
 const finalize=(key='finalize')=>finals.finalizeRequest(context(),sid,request.id,{expected_version:head().version},key);
 const challenge=()=>relations.createRelation(context(actors.writer),sid,{source_ref:{post_id:challengeSource.id,revision:1},target_ref:{post_id:target.id,revision:1},type:'challenges'},'challenge');
 const frozenStructured=(id:string)=>storage.getPostRevision(id,storage.findPostById(id)!.current_revision)!.structured;
 const revise=(id=target.id,key='revision')=>posts.createRevision(context(),sid,id,{expected_revision:storage.findPostById(id)!.current_revision,title:'changed '+id,summary:'changed',body:'new public body',structured:frozenStructured(id)},key);
 const counts=()=>Object.fromEntries(tracked.map(t=>[t,(db.prepare('SELECT count(*) n FROM '+t).get() as {n:number}).n]));
 const fullRows=()=>Object.fromEntries(tracked.map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
 return {directory,file,db,storage,hasher,ids,auth,idem,sid,other,tid,otherThread,actors,tokens,context,posts,spaces,relations,redact,note,target,dependency,evidence,challengeSource,blobs,artifacts,snapshotArtifact,requests,submissions,finals,status,req,request,body,submit,reveal,head,finalize,challenge,revise,counts,fullRows};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function refused(run:()=>unknown,code:string){expect(run).toThrow(expect.objectContaining({code}));}

it('DF01 finalizer current rights and ordered errors remain mandatory while immutable replay ignores later reviewer eligibility',async()=>{
 const f=await fixture();expect(Value.Check(FinalizeReviewRequestSchema,{expected_version:1})).toBe(true);
 expect(Value.Check(FinalizeReviewRequestSchema,{expected_version:1,expected_phase:'revealed'})).toBe(false);
 expect(Object.keys(ToolReviewFinalizeOpSchema.properties).includes('expected_version')).toBe(true);expect(Object.keys(ToolReviewFinalizeOpSchema.properties).includes('expected_phase')).toBe(false);
 refused(()=>f.finalize(),'REVIEW_INCOMPLETE');refused(()=>f.finals.finalizeRequest(f.context(),f.sid,f.request.id,{expected_version:99},'wrong-version'),'REVISION_CONFLICT');
 f.reveal();const before=f.counts();
 refused(()=>f.finals.finalizeRequest(f.context(f.actors.writer),f.sid,f.request.id,{expected_version:1},'not-requester'),'FORBIDDEN');
 refused(()=>f.finals.finalizeRequest(f.context(f.actors.reader),f.sid,f.request.id,{expected_version:3},'readonly'),'FORBIDDEN');
 refused(()=>f.finals.finalizeRequest(f.context(),f.other,f.request.id,{expected_version:3},'cross'),'NOT_FOUND');expect(f.counts()).toEqual(before);
 const result=f.finalize();expect(result).toMatchObject({outcome:'accepted',request_version:4,check_receipt_ids:[]});
 const member=f.storage.getMembership(f.sid,f.actors.one)!;f.storage.upsertMembership({...member,reviewer_eligible:false});
 f.spaces.patchSpace(f.context(),f.sid,{expected_revision:1,rules:['changed policy']},'after-decision-rule');
 const snapshot=f.counts();expect(f.finals.finalizeRequest(f.context(),f.sid,f.request.id,{expected_version:3},'finalize')).toEqual(result);expect(f.counts()).toEqual(snapshot);
 expect(f.finals.getDecision(f.context(f.actors.reader),f.sid,f.request.id)).toEqual(result);
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read']),f.actors.author);
 refused(()=>f.finals.finalizeRequest(f.context(),f.sid,f.request.id,{expected_version:3},'finalize'),'FORBIDDEN');
 f.db.prepare('UPDATE credentials SET capabilities=? WHERE actor_id=?').run(JSON.stringify(['read','write']),f.actors.author);
 const own=f.storage.getMembership(f.sid,f.actors.author)!;f.storage.upsertMembership({...own,role:'contributor'});
 // Requester retains authority; a non-requester contributor does not gain it.
 refused(()=>f.finals.finalizeRequest(f.context(f.actors.writer),f.sid,f.request.id,{expected_version:3},'finalize'),'FORBIDDEN');
 f.storage.upsertMembership({...own,active:false});refused(()=>f.finals.getDecision(f.context(),f.sid,f.request.id),'NOT_FOUND');
});

it('DF02 actual objections and frozen check configuration prioritize negative verdicts without inventing receipts',async()=>{
 for(const verdict of ['reject','changes_requested'] as const){const f=await fixture({required_checks:['local']});f.challenge();f.reveal(verdict);expect(f.status.getStatus(f.context(f.actors.reader),f.sid,f.request.id)).toMatchObject({verification_status:'pending',current_validity:'challenged'});const d=f.finalize();expect(d.outcome).toBe(verdict==='reject'?'rejected':'changes_requested');expect(d.check_receipt_ids).toEqual([]);}
 const pending=await fixture({required_checks:['local']});pending.reveal();const p=pending.fullRows();refused(()=>pending.finalize(),'REVIEW_INCOMPLETE');expect(pending.fullRows()).toEqual(p);
 const blocked=await fixture();blocked.challenge();blocked.reveal();const b=blocked.fullRows();refused(()=>blocked.finalize(),'OPEN_OBJECTIONS');expect(blocked.fullRows()).toEqual(b);
 const allowed=await fixture({allow_open_objections:true});allowed.challenge();allowed.reveal();expect(allowed.finalize().outcome).toBe('accepted');expect(allowed.status.getStatus(allowed.context(allowed.actors.reader),allowed.sid,allowed.request.id)).toMatchObject({phase:'accepted',current_validity:'challenged',validity_reasons:['open_challenges']});
});

it('DF03 actual mutation and stale history share one transaction; pinned and unrelated edits do not invalidate the frozen material',async()=>{
 const f=await fixture();const initial=f.head();
 f.spaces.patchSpace(f.context(),f.sid,{expected_revision:1,pinned_refs:[{post_id:f.target.id,revision:1}]},'pinned');f.revise(f.evidence.id,'unrelated');
 expect(f.head()).toEqual(initial);expect(f.status.getStatus(f.context(f.actors.reader),f.sid,f.request.id).current_validity).toBe('current');
 const before=f.fullRows();f.db.exec("CREATE TRIGGER owned_stale_rollback BEFORE INSERT ON events WHEN NEW.type='review.stale' BEGIN SELECT RAISE(ABORT,'owned transaction barrier'); END;");
 try{expect(()=>f.revise()).toThrow();expect(f.fullRows()).toEqual(before);}finally{f.db.exec('DROP TRIGGER owned_stale_rollback');}
 f.revise();expect(f.head()).toMatchObject({phase:'stale',version:2});const stale=f.fullRows();
 refused(()=>f.submissions.submit(f.context(f.actors.one),f.sid,f.request.id,f.body(f.actors.one),'stale-fresh-submit'),'SNAPSHOT_STALE');expect(f.fullRows()).toEqual(stale);
 refused(()=>f.finals.finalizeRequest(f.context(),f.sid,f.request.id,{expected_version:1},'wrong'),'REVISION_CONFLICT');refused(()=>f.finalize(),'SNAPSHOT_STALE');expect(f.fullRows()).toEqual(stale);
 const r=await fixture();r.redact.createRedaction(r.context(),r.sid,{target_type:'post',target_id:r.target.id,reason:'owned redaction'},'redaction');
 expect(r.head().phase).toBe('stale');expect(r.status.getStatus(r.context(r.actors.reader),r.sid,r.request.id)).toMatchObject({current_validity:'invalidated',validity_reasons:['target_redacted']});refused(()=>r.requests.getRequest(r.context(),r.sid,r.request.id),'CONTENT_REDACTED');
});

const raceWorker=`import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import readline from 'node:readline';
const lines=readline.createInterface({input:process.stdin})[Symbol.asyncIterator]();let db;
try{const i=JSON.parse((await lines.next()).value),require=createRequire(i.repo+'/package.json'),Database=require('better-sqlite3');
const core=await import(pathToFileURL(i.repo+'/packages/core/dist/index.js').href),s=await import(pathToFileURL(i.repo+'/packages/storage-sqlite/dist/index.js').href),review=await import(pathToFileURL(i.repo+'/modules/review/dist/index.js').href);
db=new Database(i.file);db.pragma('busy_timeout=5000');const storage=new s.SqliteStorage(db),h=new core.CryptoHasher(),c={now:()=>new Date(i.now),nowIso:()=>i.now},ids=new core.CryptoIdGenerator(),auth=new core.AuthService(storage,h,c),idem=new core.IdempotencyService(storage,h,c),a=auth.authenticateToken(i.token);
process.stdout.write('READY\\n');await lines.next();let result;
if(i.kind==='finalize')result=new review.ReviewFinalizationService(storage,auth,idem,c,ids).finalizeRequest(a,i.sid,i.requestId,{expected_version:3},'race-finalize');
else if(i.kind==='revision')result=new core.PostService(storage,ids,c,h,auth,idem).createRevision(a,i.sid,i.target,{expected_revision:1,title:'race change',summary:'race',body:'public race mutation',structured:storage.getPostRevision(i.target,1).structured},'race-revision');
else result=new core.RelationService(storage,ids,c,auth,idem).createRelation(a,i.sid,{source_ref:{post_id:i.challengeSource,revision:1},target_ref:{post_id:i.target,revision:1},type:'challenges'},'race-challenge');
process.stdout.write(JSON.stringify({ok:true,id:result.id??result.post?.id})+'\\n');
}catch(e){process.stdout.write(JSON.stringify({ok:false,code:typeof e?.code==='string'&&/^[A-Z_]{1,40}$/.test(e.code)?e.code:'ERROR'})+'\\n');process.exitCode=1;}finally{db?.close();process.stdin.destroy();}`;
interface RaceResult {ok:boolean;code?:string;id?:string}
async function race(f:Fixture,kind:'revision'|'challenge'){
 const file=path.join(f.directory,'race.mjs');await writeFile(file,raceWorker);const children:ChildProcessWithoutNullStreams[]=[];const timers:Array<ReturnType<typeof setTimeout>>=[];
 const deadline=<T>(p:Promise<T>,ms:number)=>Promise.race([p,new Promise<never>((_,reject)=>timers.push(setTimeout(()=>reject(new Error('Owned race deadline')),ms)))]);
 try{
  const jobs=['finalize',kind].map(action=>{const child=spawn(process.execPath,[file],{cwd:f.directory,env:{PATH:process.env.PATH??''},stdio:['pipe','pipe','pipe']});children.push(child);let output='',stderr=0,readyResolve!:()=>void;const ready=new Promise<void>(r=>{readyResolve=r;});child.stdout.on('data',b=>{output+=b.toString();if(output.includes('READY\n'))readyResolve();});child.stderr.on('data',b=>{stderr+=b.length;});const closed=new Promise<{exit:number|null;signal:NodeJS.Signals|null}>(resolve=>{child.once('close',(exit,signal)=>resolve({exit,signal}));child.once('error',()=>resolve({exit:null,signal:null}));});child.stdin.write(JSON.stringify({repo,file:f.file,now,sid:f.sid,requestId:f.request.id,target:f.target.id,challengeSource:f.challengeSource.id,kind:action,token:f.tokens.get(action==='challenge'?f.actors.writer:f.actors.author)})+'\n');return {child,ready,closed,result:()=>JSON.parse(output.split('\n').find(s=>s.startsWith('{'))!) as RaceResult,stderr:()=>stderr};});
  await deadline(Promise.all(jobs.map(j=>j.ready)),8000);for(const j of jobs)j.child.stdin.end('GO\n');await deadline(Promise.all(jobs.map(j=>j.closed)),8000);
  return jobs.map(j=>{expect(j.stderr()).toBe(0);expect(j.child.signalCode).toBeNull();const result=j.result();expect(j.child.exitCode).toBe(result.ok?0:1);return result;});
 }finally{for(const timer of timers)clearTimeout(timer);for(const child of children)if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await new Promise<void>(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},2000);child.once('close',()=>{clearTimeout(timer);resolve();});});}}
}
it('DF04 two real processes allow only atomic legal finalization versus revision or objection serialization',async()=>{
 for(const kind of ['revision','challenge'] as const){const f=await fixture();f.reveal();const [decision,mutation]=await race(f,kind);expect(mutation!.ok).toBe(true);const record=f.storage.findReviewDecisionByRequestId(f.request.id),finalEvents=f.db.prepare("SELECT * FROM events WHERE type='review.finalized'").all();
  if(decision!.ok){expect(record).toMatchObject({outcome:'accepted',request_version:4});expect(finalEvents).toHaveLength(1);expect(f.head().phase).toBe('accepted');expect(f.status.getStatus(f.context(f.actors.reader),f.sid,f.request.id).current_validity).toBe(kind==='revision'?'superseded':'challenged');}
  else{expect(record).toBeNull();expect(finalEvents).toHaveLength(0);expect(['REVISION_CONFLICT','SNAPSHOT_STALE','OPEN_OBJECTIONS']).toContain(decision!.code);expect(f.head().phase).toBe(kind==='revision'?'stale':'revealed');expect(f.db.prepare("SELECT 1 FROM idempotency_records WHERE key='race-finalize'").get()).toBeUndefined();}
 }
},25000);

it('DF05 the twelve metadata reasons are ordered and sealed or unused evidence health never leaks into public status',async()=>{
 const observed=new Set<string>();
 for(const mode of ['one','two'] as const){const f=await fixture({allow_open_objections:true});f.reveal();f.finalize();f.challenge();f.revise();f.revise(f.dependency.id,'dependency-revise');f.spaces.patchSpace(f.context(),f.sid,{expected_revision:1,rules:['effective new rules']},'rule-patch');
  f.redact.createRedaction(f.context(),f.sid,{target_type:'post',target_id:mode==='one'?f.target.id:f.dependency.id,reason:'public material redaction'},'material-redaction');
  const withdrawn=mode==='one'?f.dependency.id:f.target.id;f.posts.withdrawPost(f.context(),f.sid,withdrawn,{expected_revision:2,reason:'synthetic withdrawal'},'withdraw');
  if(mode==='one')f.db.prepare("UPDATE artifacts SET state='missing' WHERE id=?").run(f.snapshotArtifact.id); // Owned historical readiness fault, not a public API.
  else f.redact.createRedaction(f.context(),f.sid,{target_type:'artifact',target_id:f.snapshotArtifact.id,reason:'snapshot redaction'},'artifact-redaction');
  if(mode==='one')f.redact.createRedaction(f.context(),f.sid,{target_type:'post',target_id:f.evidence.id,reason:'published evidence redaction'},'published-redaction');
  else f.posts.withdrawPost(f.context(),f.sid,f.evidence.id,{expected_revision:1,reason:'published evidence withdrawal'},'published-withdraw');
  const status=f.status.getStatus(f.context(f.actors.reader),f.sid,f.request.id);expect(status.current_validity).toBe('invalidated');expect(status.phase).toBe('accepted');expect(status.validity_reasons).toEqual(REVIEW_VALIDITY_REASON_ORDER.filter(x=>status.validity_reasons.includes(x)));for(const reason of status.validity_reasons)observed.add(reason);
  expect(Object.keys(status).sort()).toEqual(['request_id','snapshot_id','phase','verification_status','current_validity','validity_reasons'].sort());
 }
 expect([...observed].sort()).toEqual([...REVIEW_VALIDITY_REASON_ORDER].sort());
 const sealed=await fixture();const assignment=sealed.submissions.getOwnAssignment(sealed.context(sealed.actors.one),sealed.sid,sealed.request.id);
 const upload=async(key:string)=>{const staged=await sealed.blobs.stage((async function*(){yield Buffer.from('private '+key);})(),1000);return sealed.artifacts.createForReview(sealed.context(sealed.actors.one),sealed.sid,assignment.id,{staged,mime:'text/plain',metadata:{}},key);};
 const cited=await upload('cited'),unused=await upload('unused');sealed.submit(sealed.actors.one,'accept',[{kind:'artifact',artifact_id:cited.id}]);
 const before=sealed.status.getStatus(sealed.context(sealed.actors.reader),sealed.sid,sealed.request.id);sealed.redact.createRedaction(sealed.context(),sealed.sid,{target_type:'artifact',target_id:cited.id,reason:'private change'},'private-redaction');sealed.db.prepare("UPDATE artifacts SET state='missing' WHERE id=?").run(unused.id);
 expect(sealed.status.getStatus(sealed.context(sealed.actors.reader),sealed.sid,sealed.request.id)).toEqual(before);expect(sealed.db.prepare("SELECT 1 FROM events WHERE type='review.stale'").get()).toBeUndefined();
});

it('DF06 revealed cancellation keeps published history and intrinsic decision faults fail safely with metadata-only public events and no ACK',async()=>{
 const cancelled=await fixture();cancelled.reveal();const original=cancelled.submissions.getSubmission(cancelled.context(cancelled.actors.reader),cancelled.sid,cancelled.storage.listReviewSubmissions(cancelled.request.id)[0]!.id);
 const confirmation=cancelled.requests.cancelRequest(cancelled.context(),cancelled.sid,cancelled.request.id,{expected_version:3,reason:'owned cancelled revealed'},'cancel-revealed');expect(confirmation.phase).toBe('cancelled');expect(cancelled.submissions.getSubmission(cancelled.context(cancelled.actors.reader),cancelled.sid,original.submission_id)).toEqual(original);
 expect(cancelled.requests.cancelRequest(cancelled.context(),cancelled.sid,cancelled.request.id,{expected_version:3,reason:'owned cancelled revealed'},'cancel-revealed')).toEqual(confirmation);refused(()=>cancelled.finalize(),'VALIDATION_ERROR');
 const f=await fixture();f.reveal();const decision=f.finalize();
 const events=new EventService(f.storage,f.ids,clock,new HmacTokenSigner(),f.auth,f.storage.getInstanceSecret());
 const consumer=events.subscribe(f.context(f.actors.reader),f.sid,{consumer_key:'final-public',start:'beginning',thread_ids:[f.tid]}).consumer;
 const polled=events.poll(f.context(f.actors.reader),f.sid,consumer.id,{limit:50});expect(polled.events.some(e=>e.type==='review.finalized'&&e.object_id===f.request.id)).toBe(true);expect(JSON.stringify(polled).includes('Independent coverage')).toBe(false);expect(f.storage.findConsumerById(consumer.id)!.ack_seq).toBe(0);
 const wrong=events.subscribe(f.context(f.actors.reader),f.sid,{consumer_key:'other-thread',start:'beginning',thread_ids:[f.otherThread],event_types:['review.finalized','review.stale']}).consumer;expect(events.poll(f.context(f.actors.reader),f.sid,wrong.id,{limit:50}).events).toEqual([]);
 f.db.prepare("UPDATE review_decisions SET snapshot_sha256=? WHERE id=?").run('f'.repeat(64),decision.id);refused(()=>f.finals.getDecision(f.context(f.actors.reader),f.sid,f.request.id),'RESYNC_REQUIRED');refused(()=>f.finals.finalizeRequest(f.context(),f.sid,f.request.id,{expected_version:3},'finalize'),'RESYNC_REQUIRED');
});
