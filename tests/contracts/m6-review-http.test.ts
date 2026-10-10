import {beforeEach,afterEach,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp,ArtifactFileStore} from '@detuned/server';
import {CryptoHasher} from '@detuned/core';
import {isSession,isReviewRequestView,isReviewRequestReadView,isReviewSnapshotView,isOwnReviewAssignmentView,isReviewSubmissionAcknowledgement,isReviewSubmissionView,isReviewSubmissionsView,isReviewDecisionView,isReviewStatusView,isReviewArtifactMetadata,generateOpenApiSpec,type CreateReviewRequest,type CreateReviewSubmission} from '@detuned/protocol';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,root:string,url:string,sid:string,pid:string,request:CreateReviewRequest;
let admin:string;let tick=Date.parse('2026-10-09T00:00:00Z');
const clock={now:()=>new Date(tick),nowIso:()=>new Date(tick).toISOString()};
const token=(id:string)=>`owned-http-${id}`;
const activeSessions=new Map<string,string>();
async function createReviewerSessions(){for(const id of ['r1','r2']){const session=checked(await data(await call(path('/sessions'),id,'POST',{client_name:'owned-http-after-request',client_version:'1'}),201),isSession);activeSessions.set(id,session.id);}}
async function call(path:string,actor='writer',method='GET',payload?:unknown,key?:string){
 tick+=1500;
 return fetch(url+path,{method,headers:{authorization:`Bearer ${actor==='admin'?admin:token(actor)}`,...(payload!==undefined?{'content-type':'application/json'}:{}),...(key?{'idempotency-key':key}:{})},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});
}
const path=(suffix:string)=>`/api/v1/spaces/${sid}${suffix}`;
async function data(response:Response,status=200):Promise<unknown>{
 expect(response.status,await response.clone().text()).toBe(status);
 const value:unknown=await response.json();
 if(typeof value!=='object'||value===null||Array.isArray(value)||!('api_version' in value)||value.api_version!=='1'||!('request_id' in value)||typeof value.request_id!=='string'||!('data' in value)||('error' in value&&value.error!==null&&value.error!==undefined))throw new Error('fixture success envelope invalid');
 return value.data;
}
function checked<T>(value:unknown,guard:(value:unknown)=>value is T):T {if(!guard(value))throw new Error('fixture response data invalid');return value;}
function entityId(value:unknown,name:string):string {
 if(typeof value!=='object'||value===null||!(name in value))throw new Error('fixture entity missing');
 const entity:unknown=name==='space'&&'space' in value?value.space:name==='thread'&&'thread' in value?value.thread:name==='post'&&'post' in value?value.post:undefined;if(typeof entity!=='object'||entity===null||!('id' in entity)||typeof entity.id!=='string')throw new Error('fixture entity ID invalid');return entity.id;
}
async function create(key='request'){return checked(await data(await call(path('/review-requests'),'writer','POST',request,key),201),isReviewRequestView);}
const submitBody=(hash:string,id:string):CreateReviewSubmission=>{const sessionId=activeSessions.get(id);if(!sessionId)throw new Error('post-request session missing');return {snapshot_sha256:hash,reviewer_session_id:sessionId,completion_status:'complete',verdict:'accept',coverage:'scope',checks_performed:'checked',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}};};
beforeEach(async()=>{
 activeSessions.clear();
 root=await mkdtemp(join(tmpdir(),'detuned-review-http-'));db=new Database(':memory:');admin=bootstrapDatabase(db).adminToken!;storage=new SqliteStorage(db);
 app=buildApp({storage,clock,artifactBlobs:await ArtifactFileStore.create(root)});await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw new Error('owned listener missing');url=`http://127.0.0.1:${address.port}`;
 sid=entityId(await data(await call('/api/v1/spaces','admin','POST',{slug:'review-http',objective:'o',rules:[]},'space'),201),'space');
 const hasher=new CryptoHasher();for(const id of ['writer','r1','r2','reader']){
 storage.createActor({id,kind:'human',display_name:id,created_at:clock.nowIso(),disabled_at:null});storage.upsertMembership({space_id:sid,actor_id:id,role:id==='writer'?'contributor':'observer',active:true,reviewer_eligible:id==='r1'||id==='r2',independence_group:id});
 storage.createCredential({id:`cred-${id}`,actor_id:id,token_hash:hasher.sha256(token(id)),allowed_space_ids:[sid],capabilities:id==='reader'?['read']:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});
 if(id==='r1'||id==='r2')storage.createSession({id:`session-${id}`,space_id:sid,actor_id:id,client_name:'owned-http',client_version:'1',harness_session_id:null,metadata:{},created_at:clock.nowIso()});
 }
 const thread=entityId(await data(await call(path('/threads'),'writer','POST',{title:'t'},'thread'),201),'thread');
 pid=entityId(await data(await call(path(`/threads/${thread}/posts`),'writer','POST',{kind:'claim',title:'claim',summary:'s',body:'original',structured:{statement:'claim',assumptions:['a'],scope:'s',falsification_plan:'f'}},'claim'),201),'post');
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.required_checks',json('[]')) WHERE space_id=?").run(sid);
 request={target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['r2','r1'],expected_policy_revision:1,reproduction_instructions:'run'};
});
afterEach(async()=>{try{await app?.close();}finally{db?.close();if(root)await rm(root,{recursive:true,force:true});}});
it('RH01 real HTTP complete vertical and exact immutable confirmations',async()=>{
 const first=await create();await createReviewerSessions();expect(isReviewRequestView(first)).toBe(true);expect(first).not.toHaveProperty('submitted_count');
 expect(await create()).toEqual(first);
 expect(isReviewRequestReadView(await data(await call(path(`/review-requests/${first.id}`))))).toBe(true);
 expect(isReviewSnapshotView(await data(await call(path(`/review-snapshots/${first.snapshot_id}`))))).toBe(true);
 expect(isOwnReviewAssignmentView(await data(await call(path(`/review-requests/${first.id}/assignment`),'r1')))).toBe(true);
 const one=checked(await data(await call(path(`/review-requests/${first.id}/submissions`),'r1','POST',submitBody(first.snapshot_sha256,'r1'),'one'),201),isReviewSubmissionAcknowledgement);expect(isReviewSubmissionAcknowledgement(one)).toBe(true);
 expect(isReviewSubmissionView(await data(await call(path(`/review-submissions/${one.submission_id}`),'r1')))).toBe(true);
 await data(await call(path(`/review-requests/${first.id}/submissions`),'r2','POST',submitBody(first.snapshot_sha256,'r2'),'two'),201);
 const visible=checked(await data(await call(path(`/review-requests/${first.id}/submissions`),'reader')),isReviewSubmissionsView);expect(isReviewSubmissionsView(visible)).toBe(true);expect(visible.submissions.map((s:{reviewer_actor_id:string})=>s.reviewer_actor_id)).toEqual(['r1','r2']);
 const decision=checked(await data(await call(path(`/review-requests/${first.id}/finalize`),'writer','POST',{expected_version:3},'finalize')),isReviewDecisionView);expect(isReviewDecisionView(decision)).toBe(true);expect(decision.outcome).toBe('accepted');
 expect(await data(await call(path(`/review-requests/${first.id}/decision`)))).toEqual(decision);
 expect(isReviewStatusView(await data(await call(path(`/review-requests/${first.id}/status`))))).toBe(true);
 expect(await create()).toEqual(first);
 const other=await create('cancel-request');const cancelled=checked(await data(await call(path(`/review-requests/${other.id}/cancel`),'writer','POST',{expected_version:1,reason:'stop'},'cancel')),isReviewRequestView);expect(isReviewRequestView(cancelled)).toBe(true);expect(cancelled.phase).toBe('cancelled');
 const capability=await data(await call('/api/v1/capabilities'));if(typeof capability!=='object'||capability===null||!('modules_enabled' in capability))throw new Error('fixture capabilities invalid');expect(capability.modules_enabled).toContain('review');
});
it('RH02 sealed list, private multipart owner scope and real file bytes/cache',async()=>{
 const first=await create();await createReviewerSessions();const route=path(`/review-requests/${first.id}`);
 const upload=async(metadata:unknown,key:string)=>{tick+=1500;const form=new FormData();form.append('file',new Blob(['private bytes'],{type:'text/plain'}),'owned.txt');form.append('metadata',JSON.stringify(metadata));return fetch(url+route+'/artifacts',{method:'POST',headers:{authorization:`Bearer ${token('r1')}`,'idempotency-key':key},body:form});};
 const artifactCount=()=> (db.prepare('SELECT count(*) n FROM artifacts WHERE space_id=?').get(sid) as {n:number}).n;const before=artifactCount();
 const bad=await upload({visibility:'space'},'bad');expect(bad.status).toBe(400);expect(bad.headers.get('cache-control')).toBe('private, no-store');expect(artifactCount()).toBe(before);
 const unusedArtifact=checked(await data(await upload({},'unused-artifact'),201),isReviewArtifactMetadata);
 const uploaded=checked(await data(await upload({},'artifact'),201),isReviewArtifactMetadata);expect(isReviewArtifactMetadata(uploaded)).toBe(true);expect(uploaded.owner_id).toBe('r1');
 const metadata=await call(path(`/artifacts/${uploaded.id}`),'r1');expect(metadata.headers.get('cache-control')).toBe('private, no-store');await data(metadata);
 const bytes=await call(path(`/artifacts/${uploaded.id}/content`),'r1');expect(bytes.headers.get('cache-control')).toBe('private, no-store');const raw=Buffer.from(await bytes.arrayBuffer());expect(raw.toString()).toBe('private bytes');expect(new CryptoHasher().sha256(raw)).toBe(uploaded.sha256);
 expect((await call(path(`/artifacts/${uploaded.id}`),'reader')).status).toBe(404);
 const body={...submitBody(first.snapshot_sha256,'r1'),evidence_refs:[{kind:'artifact' as const,artifact_id:uploaded.id}]};
 const ack=checked(await data(await call(route+'/submissions','r1','POST',body,'one'),201),isReviewSubmissionAcknowledgement);
 for(const actor of ['reader','admin','r2']){const res=await call(route+'/submissions',actor);expect(res.headers.get('cache-control')).toBe('private, no-store');expect(checked(await data(res),isReviewSubmissionsView).submissions).toEqual([]);expect((await call(path(`/review-submissions/${ack.submission_id}`),actor)).status).toBe(404);}
 expect(checked(await data(await call(route+'/submissions','r1')),isReviewSubmissionsView).submissions).toHaveLength(1);
 await data(await call(route+'/submissions','r2','POST',submitBody(first.snapshot_sha256,'r2'),'two'),201);
 await data(await call(route+'/cancel','writer','POST',{expected_version:3,reason:'stop'},'cancel'));
 expect(checked(await data(await call(route+'/submissions','reader')),isReviewSubmissionsView).submissions).toHaveLength(2);
 // An uploaded but unused private material does not become public on reveal.
 expect((await call(path(`/artifacts/${unusedArtifact.id}`),'reader')).status).toBe(404);
});
it('RH03 strict schema/query/key rejection and response guards do not relax old shapes',async()=>{
 const count=()=>db.prepare('SELECT count(*) n FROM review_requests').get() as {n:number};const before=count().n;
 const bad=await call(path('/review-requests'),'writer','POST',{...request,request_key:'forbidden'},'bad');expect(bad.status).toBe(400);expect(bad.headers.get('cache-control')).toBe('private, no-store');expect(count().n).toBe(before);
 expect((await call(path('/review-requests'),'writer','POST',request)).status).toBe(400);
 const first=await create();expect((await call(path(`/review-requests/${first.id}?unknown=x`))).status).toBe(400);
 const noAuth=await fetch(url+path(`/review-requests/${first.id}`));expect(noAuth.status).toBe(401);expect(noAuth.headers.get('cache-control')).toBe('private, no-store');
 expect(isReviewRequestView({...first,created_at:'not-a-date'})).toBe(false);expect(isReviewRequestView({...first,submitted_count:0})).toBe(false);
 expect(isReviewSubmissionsView({request_id:first.id,submissions:[],secret:'no'})).toBe(false);
 const spec=generateOpenApiSpec();expect(Object.keys(spec.paths as Record<string,unknown>)).toContain('/spaces/{space_id}/review-requests/{id}/submissions');
 const space=storage.findSpaceById(sid);if(!space)throw new Error('fixture space missing');const revision=storage.getSpaceRevision(sid,space.policy_revision);if(!revision)throw new Error('fixture policy missing');
 await data(await call(path(''),'admin','PATCH',{expected_revision:space.current_revision,review_policy:{...revision.review_policy,enabled:false}},'disable-policy'));
 const changed=storage.findSpaceById(sid);if(!changed)throw new Error('fixture updated space missing');
 expect((await call(path('/review-requests'),'writer','POST',{...request,expected_policy_revision:changed.policy_revision},'disabled')).status).toBe(400);expect(await create()).toEqual(first);
});
