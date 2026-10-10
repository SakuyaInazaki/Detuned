import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService,ArtifactService,RedactionService,type BlobStorePort,type StagedBlob} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService} from '@detuned/module-review';
import {type CreateReviewRequest,type CreateReviewSubmission} from '@detuned/protocol';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,service:ReviewRequestService;
let auth:ReturnType<AuthService['authenticateToken']>,sid:string,pid:string,req:CreateReviewRequest;
const clock={now:()=>new Date('2026-10-09T00:00:00Z'),nowIso:()=> '2026-10-09T00:00:00.000Z'};
beforeEach(async()=>{
 blobs.stages.clear();blobs.objects.clear();blobs.beforePublish=undefined;
 db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;storage=new SqliteStorage(db);app=buildApp({storage,clock});await app.ready();
 const headers={authorization:`Bearer ${token}`};
 async function post(url:string,payload:Record<string,unknown>,key:string){const r=await app.inject({method:'POST',url,headers:{...headers,'idempotency-key':key},payload});expect(r.statusCode,r.body).toBe(201);return r.json().data;}
 sid=(await post('/api/v1/spaces',{slug:'review-requests',objective:'o',rules:[]},'space')).space.id;
 const tid=(await post(`/api/v1/spaces/${sid}/threads`,{title:'t'},'thread')).thread.id;
 pid=(await post(`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'claim',summary:'s',body:'original',structured:{statement:'claim',assumptions:['a'],scope:'s',falsification_plan:'f'}},'claim')).post.id;
 for(const id of ['r1','r2']){storage.createActor({id,kind:'human',display_name:id,created_at:clock.nowIso(),disabled_at:null});storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});}
 db.prepare("UPDATE space_revisions SET review_policy=json_set(review_policy,'$.required_checks',json('[]')) WHERE space_id=?").run(sid);
 const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);auth=as.authenticateToken(token);
 service=new ReviewRequestService(storage,as,new IdempotencyService(storage,hasher,clock),clock,new CryptoIdGenerator(),new ReviewModule(storage,hasher,clock,new CryptoIdGenerator(),as));
 req={target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['r2','r1'],expected_policy_revision:1,reproduction_instructions:'run'};
});
afterEach(async()=>{vi.restoreAllMocks();await app.close();db.close();});
const create=(key='create')=>service.createRequest(auth,sid,req,key);
const counts=()=>Object.fromEntries(['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','events','idempotency_records'].map(t=>[t,(db.prepare(`SELECT count(*) n FROM ${t}`).get() as {n:number}).n]));

function reviewer(id:string){
 const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);
 storage.createCredential({id:`credential-${id}`,actor_id:id,token_hash:hasher.sha256(`owned-${id}`),allowed_space_ids:[sid],capabilities:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});
 const ctx=as.authenticateToken(`owned-${id}`),sessionId=`session-${id}`;
 storage.createSession({id:sessionId,space_id:sid,actor_id:id,client_name:'owned-test',client_version:'1',harness_session_id:null,metadata:{},created_at:clock.nowIso()});
 return {ctx,submission:new ReviewSubmissionService(storage,as,new IdempotencyService(storage,hasher,clock),clock,new CryptoIdGenerator()),sessionId};
}
const body=(hash:string,session:string):CreateReviewSubmission=>({snapshot_sha256:hash,reviewer_session_id:session,completion_status:'complete',verdict:'accept',coverage:'scope',checks_performed:'checked',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}});

class MemoryBlobs implements BlobStorePort {
 stages=new Map<string,Uint8Array>();objects=new Map<string,Uint8Array>();sequence=0;beforePublish?:()=>void;
 async stage(chunks:AsyncIterable<Uint8Array>,max:number):Promise<StagedBlob>{const parts:Uint8Array[]=[];let n=0;for await(const c of chunks){n+=c.length;if(n>max)throw new Error('controlled size');parts.push(c);}const bytes=Buffer.concat(parts),key='stage-'+ ++this.sequence;this.stages.set(key,bytes);return{stage_key:key,bytes:n,sha256:new CryptoHasher().sha256(bytes)};}
 async publish(stage:StagedBlob,key:string){this.beforePublish?.();const b=this.stages.get(stage.stage_key);if(!b)throw new Error('controlled stage');this.objects.set(key,b);}
 async discardStage(stage:StagedBlob){this.stages.delete(stage.stage_key);}
 async discardPublished(key:string){this.objects.delete(key);}
 async exists(key:string){return this.objects.has(key);}
 async open(key:string){const b=this.objects.get(key);return b?{chunks:(async function*(){yield b;})(),dispose:async()=>{}}:null;}
}
const blobs=new MemoryBlobs();
function artifactService(){const hasher=new CryptoHasher(),as=new AuthService(storage,hasher,clock);return new ArtifactService(storage,blobs,as,new IdempotencyService(storage,hasher,clock),new CryptoIdGenerator(),clock,{max_file_bytes:26214400,max_space_bytes:1073741824});}
async function upload(as:ArtifactService,ctx:typeof auth,assignment:string,key:string){const staged=await blobs.stage((async function*(){yield Buffer.from('private evidence');})(),100);return as.createForReview(ctx,sid,assignment,{staged,mime:'text/plain',metadata:{}},key);}
it('RA01 observer private uploads replay while sealed and only explicit evidence reveals',async()=>{
 const request=create(),one=reviewer('r1'),two=reviewer('r2'),as=artifactService(),assignment=one.submission.getOwnAssignment(one.ctx,sid,request.id);
 const used=await upload(as,one.ctx,assignment.id,'used'),idle=await upload(as,one.ctx,assignment.id,'idle');expect(used.visibility).toBe('review_assignment');expect(await upload(as,one.ctx,assignment.id,'used')).toEqual(used);
 await expect(as.getMetadata(auth,sid,used.id)).rejects.toMatchObject({code:'NOT_FOUND'});await expect(as.getMetadata(two.ctx,sid,used.id)).rejects.toMatchObject({code:'NOT_FOUND'});
 const b={...body(request.snapshot_sha256,one.sessionId),evidence_refs:[{kind:'artifact' as const,artifact_id:used.id}]};one.submission.submit(one.ctx,sid,request.id,b,'submit1');
 await expect(upload(as,one.ctx,assignment.id,'new-after-submit')).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(await upload(as,one.ctx,assignment.id,'used')).toEqual(used);
 two.submission.submit(two.ctx,sid,request.id,body(request.snapshot_sha256,two.sessionId),'submit2');expect((await as.getMetadata(auth,sid,used.id)).visibility).toBe('review_assignment');await expect(as.getMetadata(auth,sid,idle.id)).rejects.toMatchObject({code:'NOT_FOUND'});
 expect(storage.findArtifactById(used.id)?.visibility).toBe('review_assignment');expect(storage.findArtifactById(idle.id)?.visibility).toBe('review_assignment');
});
it('RA02 fresh qualification is rechecked after publish and discarded on transaction rejection',async()=>{
 const request=create(),one=reviewer('r1'),as=artifactService(),assignment=one.submission.getOwnAssignment(one.ctx,sid,request.id),objects=blobs.objects.size;
 blobs.beforePublish=()=>storage.upsertMembership({...storage.getMembership(sid,'r1')!,reviewer_eligible:false});try{await expect(upload(as,one.ctx,assignment.id,'raced')).rejects.toMatchObject({code:'FORBIDDEN'});}finally{blobs.beforePublish=undefined;}
 expect(blobs.objects.size).toBe(objects);expect(blobs.stages.size).toBe(0);expect(storage.getArtifactUsage(100).objects).toBe(0);
});
it('RA03 read-only credential cannot private-upload and public post binding remains space-only',async()=>{
 const request=create(),one=reviewer('r1'),as=artifactService(),assignment=one.submission.getOwnAssignment(one.ctx,sid,request.id),used=await upload(as,one.ctx,assignment.id,'used');
 const hasher=new CryptoHasher();storage.createCredential({id:'readonly',actor_id:'r1',token_hash:hasher.sha256('private-readonly'),allowed_space_ids:[sid],capabilities:['read'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});const readOnly=new AuthService(storage,hasher,clock).authenticateToken('private-readonly');await expect(upload(as,readOnly,assignment.id,'denied')).rejects.toMatchObject({code:'FORBIDDEN'});
 const {assertRevisionArtifacts}=await import('../../packages/core/src/services/artifact-references.js');expect(()=>assertRevisionArtifacts(storage,sid,[used.id],undefined)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
 storage.updateArtifactState(used.id,'redacted');await expect(as.getMetadata(one.ctx,sid,used.id)).rejects.toMatchObject({code:'CONTENT_REDACTED'});await expect(as.getMetadata(auth,sid,used.id)).rejects.toMatchObject({code:'NOT_FOUND'});
});

it('RA04 stale target before private upload rejects with no retained blob, row, event or key',async()=>{
 const request=create(),one=reviewer('r1'),as=artifactService(),assignment=one.submission.getOwnAssignment(one.ctx,sid,request.id),before=counts();
 db.prepare('UPDATE posts SET current_revision=2 WHERE id=?').run(pid);
 await expect(upload(as,one.ctx,assignment.id,'stale-before')).rejects.toMatchObject({code:'SNAPSHOT_STALE'});
 expect(counts()).toEqual(before);expect(storage.getArtifactUsage(100).objects).toBe(0);expect(blobs.objects.size).toBe(0);expect(blobs.stages.size).toBe(0);
});
it('RA05 policy changed during asynchronous publish rejects and removes own published blob',async()=>{
 const request=create(),one=reviewer('r1'),as=artifactService(),assignment=one.submission.getOwnAssignment(one.ctx,sid,request.id),before=counts();
 blobs.beforePublish=()=>db.prepare('UPDATE spaces SET policy_revision=2 WHERE id=?').run(sid);
 try{await expect(upload(as,one.ctx,assignment.id,'stale-after-publish')).rejects.toMatchObject({code:'SNAPSHOT_STALE'});}finally{blobs.beforePublish=undefined;}
 expect(counts()).toEqual(before);expect(storage.getArtifactUsage(100).objects).toBe(0);expect(blobs.objects.size).toBe(0);expect(blobs.stages.size).toBe(0);
});

it('RA06 private redaction keeps assignment event scope while public artifact redaction stays public',async()=>{
 const request=create(),one=reviewer('r1'),as=artifactService(),assignment=one.submission.getOwnAssignment(one.ctx,sid,request.id);
 const privateArtifact=await upload(as,one.ctx,assignment.id,'private-to-redact');
 const staged=await blobs.stage((async function*(){yield Buffer.from('public evidence');})(),100);
 const publicArtifact=await as.create(auth,sid,{staged,mime:'text/plain',metadata:{}},'public-to-redact');
 const hasher=new CryptoHasher(),redactions=new RedactionService(storage,new CryptoIdGenerator(),clock,new AuthService(storage,hasher,clock),new IdempotencyService(storage,hasher,clock));
 redactions.createRedaction(auth,sid,{target_type:'artifact',target_id:privateArtifact.id,reason:'owned test private'},'private-redaction');
 redactions.createRedaction(auth,sid,{target_type:'artifact',target_id:publicArtifact.id,reason:'owned test public'},'public-redaction');
 const events=db.prepare("SELECT object_id,visibility FROM events WHERE type='artifact.redacted' ORDER BY object_id").all() as {object_id:string;visibility:string}[];
 expect(events.find(e=>e.object_id===privateArtifact.id)?.visibility).toBe('review_assignment');
 expect(events.find(e=>e.object_id===publicArtifact.id)?.visibility).toBe('public');
 expect(events.filter(e=>e.visibility==='public').map(e=>e.object_id)).toEqual([publicArtifact.id]);
 expect(storage.findArtifactById(privateArtifact.id)?.state).toBe('redacted');expect(storage.findArtifactById(publicArtifact.id)?.state).toBe('redacted');
 expect((db.prepare('SELECT count(*) n FROM redactions').get() as {n:number}).n).toBe(2);
});
