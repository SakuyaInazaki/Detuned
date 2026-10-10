import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateSpaceExportLine} from '@detuned/protocol';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage,upgradeOffline,backupOffline,restoreBackup,classifyDatabase} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {AuthService,CryptoHasher,CryptoIdGenerator,IdempotencyService} from '@detuned/core';
import {ReviewModule,ReviewRequestService,ReviewSubmissionService} from '@detuned/module-review';
import {type CreateReviewRequest,type CreateReviewSubmission} from '@detuned/protocol';
let db:Database.Database,storage:SqliteStorage,app:ReturnType<typeof buildApp>,service:ReviewRequestService;
let auth:ReturnType<AuthService['authenticateToken']>,sid:string,pid:string,req:CreateReviewRequest;
const clock={now:()=>new Date('2026-10-09T00:00:00Z'),nowIso:()=> '2026-10-09T00:00:00.000Z'};
beforeEach(async()=>{
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


const historical3=readFileSync(new URL('../fixtures/historical-v3-schema.sql',import.meta.url),'utf8');
function source3FromActualRequest(file:string){
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/historical-v3-review-history.json',import.meta.url),'utf8')) as {rows:Record<string,Record<string,string|number|null>[]>,recipe:{space_id:string},oracle:{create:{response:import('@detuned/protocol').ReviewRequestView},cancel:{response:import('@detuned/protocol').ReviewRequestView},collecting:{response:import('@detuned/protocol').ReviewRequestView}}};
 const old=new Database(file);old.exec(historical3);old.pragma('foreign_keys = OFF');
 for(const [name,rows] of Object.entries(fixture.rows)){if(!rows.length)continue;const columns=Object.keys(rows[0]!);const insert=old.prepare(`INSERT INTO "${name}" (${columns.map(c=>'"'+c+'"').join(',')}) VALUES (${columns.map(()=>'?').join(',')})`);for(const row of rows)insert.run(...columns.map(c=>row[c]));}
 old.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('initialized','true');old.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('token_secret','private-independent-test-secret');
 old.pragma('foreign_keys = ON');expect(classifyDatabase(old)).toMatchObject({kind:'supported_legacy',maxVersion:3});const refs=old.prepare("SELECT operation,key,result_ref FROM idempotency_records WHERE operation LIKE 'review.request.%' ORDER BY operation,key").all();old.close();return{original:fixture.oracle.create.response,cancelled:fixture.oracle.cancel.response,collecting:fixture.oracle.collecting.response,spaceId:fixture.recipe.space_id,refs};
}
it('SM401 exact source3 profiles and original compact bytes migrate to5 with IDs/count0',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'detuned-schema4-'));try{const source=path.join(root,'old3');await mkdir(source);const file=path.join(source,'detuned.sqlite'),history=source3FromActualRequest(file),before=createHash('sha256').update(await readFile(file)).digest('hex');
 const output=path.join(root,'new4');expect(await upgradeOffline({dataDir:source,outputDir:output,offline:true,adminName:'Owned schema4 fixture admin'})).toMatchObject({source_schema_version:3,schema_version:5});expect(createHash('sha256').update(await readFile(file)).digest('hex')).toBe(before);
 const upgraded=new Database(path.join(output,'detuned.sqlite'));try{const store=new SqliteStorage(upgraded);expect(classifyDatabase(upgraded)).toMatchObject({kind:'current_initialized',maxVersion:5});expect(upgraded.prepare("SELECT operation,key,result_ref FROM idempotency_records WHERE operation LIKE 'review.request.%' ORDER BY operation,key").all()).toEqual(history.refs);const assignments=store.listReviewAssignments(history.original.id);expect(new Set(assignments.map(x=>x.id)).size).toBe(2);expect(assignments.every(x=>typeof x.id==='string'&&x.id.length>0)).toBe(true);expect(store.findReviewRequestById(history.original.id)?.submitted_count).toBe(0);
 // Identity reset is expected; privileged private fixture auth for exact history reconstruction only.
 const {reconstructReviewRequestView}=await import('@detuned/core');expect(reconstructReviewRequestView(store,history.spaceId,history.original.id,1)).toEqual(history.original);expect(reconstructReviewRequestView(store,history.spaceId,history.original.id,2)).toEqual(history.cancelled);expect(reconstructReviewRequestView(store,history.spaceId,history.collecting.id,1)).toEqual(history.collecting);
 }finally{upgraded.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});
it('SM402 current schema5 sealed/revealed records and immutable payload survive physical recovery',async()=>{
 const request=create(),one=reviewer('r1'),two=reviewer('r2'),ack=one.submission.submit(one.ctx,sid,request.id,body(request.snapshot_sha256,one.sessionId),'one');
 const root=await mkdtemp(path.join(os.tmpdir(),'detuned-review4-backup-'));try{const source=path.join(root,'source');await mkdir(source);const file=path.join(source,'detuned.sqlite');await db.backup(file);const sealed=path.join(root,'sealed');expect((await backupOffline({dataDir:source,outputDir:sealed,offline:true})).manifest.schemaVersion).toBe(5);
 const target=path.join(root,'sealed-restored');await restoreBackup({backupDir:sealed,dataDir:target});const recovered=new Database(path.join(target,'detuned.sqlite'));try{expect(new SqliteStorage(recovered).findReviewSubmissionById(ack.submission_id)).toEqual(storage.findReviewSubmissionById(ack.submission_id));}finally{recovered.close();}
 two.submission.submit(two.ctx,sid,request.id,body(request.snapshot_sha256,two.sessionId),'two');await db.backup(file);const revealed=path.join(root,'revealed');await backupOffline({dataDir:source,outputDir:revealed,offline:true});const dest=path.join(root,'revealed-restored');await restoreBackup({backupDir:revealed,dataDir:dest});const full=new Database(path.join(dest,'detuned.sqlite'));try{expect(new SqliteStorage(full).listReviewSubmissions(request.id)).toEqual(storage.listReviewSubmissions(request.id));expect(new SqliteStorage(full).findReviewRequestById(request.id)?.submitted_count).toBe(2);}finally{full.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});
it('SM403 wire2 admits only source3/4/5 excluded; strict historical wire1 remains source2',()=>{
 const h={type:'header',format:'detuned-space-export',version:2,export_id:'exp_00000000-0000-0000-0000-000000000001',created_at:clock.nowIso(),source:{space_id:sid,schema_version:4,snapshot_event_seq:'0',space_revision:1},identity_semantics:'source_actor_ids_only',scope:'public_research',formal_review_status:'excluded',formal_check_status:'excluded',hash_algorithm:'sha256-chain-v1'};
 expect(validateSpaceExportLine(h)).toBe(true);expect(validateSpaceExportLine({...h,source:{...h.source,schema_version:3}})).toBe(true);expect(validateSpaceExportLine({...h,source:{...h.source,schema_version:5}})).toBe(true);expect(validateSpaceExportLine({...h,source:{...h.source,schema_version:6}})).toBe(false);expect(validateSpaceExportLine({...h,version:1})).toBe(false);expect(validateSpaceExportLine({...h,source:{...h.source,schema_version:2}})).toBe(false);
});
