import {afterEach,expect,it,vi} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildApp} from '@detuned/server';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {AuthService,CryptoHasher,CryptoIdGenerator,HmacTokenSigner,IdempotencyService,RedactionService,SearchService} from '@detuned/core';
import {DetunedClient} from '@detuned/client';
import type {CreateReviewSubmission,ReviewRequestView,ReviewPolicy,ReviewSubmissionSearchQuery} from '@detuned/protocol';

const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{vi.restoreAllMocks();while(cleanups.length)await cleanups.pop()!();});
const object=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Owned fixture object absent');return value as Record<string,unknown>;};
const text=(value:unknown):string=>{if(typeof value!=='string')throw new Error('Owned fixture string absent');return value;};
const array=(value:unknown):Record<string,unknown>[]=>{if(!Array.isArray(value))throw new Error('Owned fixture array absent');return value.map(object);};
const policy:ReviewPolicy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
const claim={statement:'Independent search target',assumptions:['Synthetic fixture'],scope:'Local only',falsification_plan:'Read the counterexample'};
async function fixture(){
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-public-review-independent-')),file=path.join(directory,'forum.sqlite'),db=new Database(file);db.pragma('journal_mode=WAL');const token=bootstrapDatabase(db).adminToken!;const storage=new SqliteStorage(db);let milliseconds=Date.parse('2026-10-09T16:00:00.000Z');const clock={now:()=>new Date(milliseconds),nowIso:()=>new Date(milliseconds).toISOString()};const blobs=await ArtifactFileStore.create(directory);const app=buildApp({storage,clock,artifactBlobs:blobs});cleanups.push(async()=>{await app.close();if(db.open)db.close();await rm(directory,{recursive:true,force:true});});await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw new Error('Owned listener absent');const url='http://127.0.0.1:'+address.port;let serial=0;
 const client=(ownedToken=token)=>new DetunedClient({baseUrl:url,token:ownedToken,timeoutMs:5000});
 async function wire(route:string,body?:unknown,method='POST',ownedToken=token){milliseconds+=60000;const response=await fetch(url+'/api/v1'+route,{method,headers:{authorization:'Bearer '+ownedToken,'idempotency-key':'independent-search-'+ ++serial,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});return {status:response.status,body:object(await response.json())};}
 async function write(route:string,body:unknown,method='POST',ownedToken=token){const response=await wire(route,body,method,ownedToken);if(response.status>=300)throw new Error('Owned setup rejected '+response.status+' '+String(object(response.body.error).code));return object(response.body.data);}
 const sid=text(object((await write('/spaces',{slug:'public-review-owned',objective:'Owned local search',rules:[],review_policy:policy})).space).id),other=text(object((await write('/spaces',{slug:'public-review-other',objective:'Other local space',rules:[]})).space).id);const tid=text(object((await write(`/spaces/${sid}/threads`,{title:'Independent review search'})).thread).id);
 const post=async(title:string,kind='claim')=>text(object((await write(`/spaces/${sid}/threads/${tid}/posts`,{kind,title,summary:'Owned research',body:'Public local body',structured:kind==='claim'?claim:{}})).post).id);const target=await post('Public target');
 const identities:Array<{id:string;token:string}>=[];
 for(const name of ['one','two','reader']){const id=text((await write('/admin/actors',{kind:'human',display_name:'Independent public '+name})).id);await write(`/spaces/${sid}/memberships`,{actor_id:id,role:'observer',reviewer_eligible:name!=='reader',independence_group:'search-group-'+name});const credential=await write('/admin/credentials',{actor_id:id,allowed_space_ids:[sid,other],capabilities:name==='reader'?['read']:['read','write']});identities.push({id,token:text(credential.token)});}
 const create=async(options:{dependency?:string;artifact?:string;target?:string}={})=>client().createReviewRequest(sid,{target_ref:{post_id:options.target??target,revision:1},dependency_refs:options.dependency?[{post_id:options.dependency,revision:1}]:[],artifact_ids:options.artifact?[options.artifact]:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:identities.slice(0,2).map(i=>i.id),expected_policy_revision:1,reproduction_instructions:'Local independent search recipe'},'request-'+ ++serial);
 const prepare=async(request:ReviewRequestView,index:number,override:Partial<CreateReviewSubmission>={})=>{milliseconds+=60000;const session=await client(identities[index]!.token).createSession(sid,{client_name:'public-search-independent',client_version:'1'});return {snapshot_sha256:request.snapshot_sha256,reviewer_session_id:session.data.id,completion_status:'complete',verdict:'accept',coverage:'Ownedneedle '+index,checks_performed:'Independent local check',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Distinct actor/group'},...override} satisfies CreateReviewSubmission;};
 const submit=async(request:ReviewRequestView,index:number,override:Partial<CreateReviewSubmission>={})=>client(identities[index]!.token).submitReview(sid,request.id,await prepare(request,index,override),'submit-'+ ++serial);
 const reveal=async(request:ReviewRequestView,overrides:Partial<CreateReviewSubmission>[]=[])=>(await submit(request,0,overrides[0]),await submit(request,1,overrides[1]));
 const search=async(query:Partial<ReviewSubmissionSearchQuery>={},ownedToken=token)=>{const params=new URLSearchParams({q:'ownedneedle',source:'review_submissions',...Object.fromEntries(Object.entries(query).map(([k,value])=>[k,String(value)]))});const response=await wire(`/spaces/${sid}/search?${params}`,undefined,'GET',ownedToken);return {...response,items:response.status===200?array(response.body.data):[],meta:response.status===200?object(response.body.meta):{}};};
 const rows=()=>Object.fromEntries(['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','artifacts','events','idempotency_records','subscriptions','consumers','delivery_batches'].map(table=>[table,db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()]));
 const redact=(type:'post'|'artifact',id:string)=>write(`/spaces/${sid}/redactions`,{target_type:type,target_id:id,reason:'Owned privacy change'});
 const services=(cap=5000,bytes=262144)=>{const hasher=new CryptoHasher(),auth=new AuthService(storage,hasher,clock);return {auth,search:new SearchService(storage,auth,{signer:new HmacTokenSigner(),secret:storage.getInstanceSecret(),clock,hasher},{max_candidates:cap,max_response_bytes:bytes})};};
 return {directory,file,db,storage,clock,token,url,sid,other,tid,target,identities,client,wire,write,post,create,prepare,submit,reveal,search,rows,redact,services,advance:(seconds:number)=>{milliseconds+=seconds*1000;}};
}

it('PSI01 real sealed author remains unsearchable; failed last-submission reveal transaction publishes nothing and exact retry reveals once',async()=>{
 const f=await fixture(),request=await f.create();const first=await f.submit(request,0);expect(await f.client(f.identities[0]!.token).getReviewSubmission(f.sid,first.submission_id)).toMatchObject({coverage:'Ownedneedle 0',revealed_at:null});
 for(const ownedToken of [f.token,f.identities[0]!.token,f.identities[2]!.token]){const result=await f.search({request_id:request.id},ownedToken);expect(result.status).toBe(200);expect(result.items).toEqual([]);expect(result.meta).toEqual({truncated:false,next_cursor:null});}
 const body=await f.prepare(request,1),before=f.rows();f.db.exec("CREATE TRIGGER owned_reveal_fault BEFORE INSERT ON events WHEN NEW.type='review.revealed' BEGIN SELECT RAISE(ABORT,'owned reveal barrier'); END;");
 try{await expect(new DetunedClient({baseUrl:f.url,token:f.identities[1]!.token,timeoutMs:5000,maxRetries:0}).submitReview(f.sid,request.id,body,'last-owned-retry')).rejects.toBeDefined();expect(f.rows()).toEqual(before);expect((await f.search()).items).toEqual([]);}finally{f.db.exec('DROP TRIGGER owned_reveal_fault');}
 await f.client(f.identities[1]!.token).submitReview(f.sid,request.id,body,'last-owned-retry');const committed=f.rows();await f.client(f.identities[1]!.token).submitReview(f.sid,request.id,body,'last-owned-retry');expect(f.rows()).toEqual(committed);const result=await f.client(f.identities[2]!.token).searchPublicReviewSubmissions(f.sid,{source:'review_submissions',q:'OWNEDNEEDLE',request_id:request.id});expect(result.data).toHaveLength(2);expect(result.data.every(row=>row.type==='review_submission'&&row.revealed_at!==null&&row.request_id===request.id)).toBe(true);expect(f.db.prepare("SELECT count(*) n FROM events WHERE type='review.revealed'").get()).toEqual({n:1});
});

it('PSI02 referenced private evidence immediately hides only its public opinion; unused private upload redaction has no effect',async()=>{
 const f=await fixture(),request=await f.create(),reviewer=f.client(f.identities[0]!.token);const cited=await reviewer.uploadReviewArtifact(f.sid,request.id,new Blob(['PRIVATE_ATTACHMENT_NOT_SEARCHABLE']),{},'cited-private'),unused=await reviewer.uploadReviewArtifact(f.sid,request.id,new Blob(['UNUSED_ATTACHMENT']),{},'unused-private');
 await f.reveal(request,[{evidence_refs:[{kind:'artifact',artifact_id:cited.id}]}]);const before=(await f.search()).items;expect(before).toHaveLength(2);expect((await f.search({q:'PRIVATE_ATTACHMENT_NOT_SEARCHABLE'})).items).toEqual([]);expect((await f.search({q:cited.id})).items).toEqual([]);
 await f.redact('artifact',unused.id);expect((await f.search()).items).toEqual(before);await f.redact('artifact',cited.id);const visible=(await f.search()).items;expect(visible).toHaveLength(1);expect(visible[0]!.reviewer_actor_id).toBe(f.identities[1]!.id);expect(JSON.stringify(await f.search())).not.toContain('CONTENT_REDACTED');
});

it('PSI03 selected current-space intrinsic damage resyncs; ACL precedes it; online dependency/evidence privacy hides without claiming database health',async()=>{
 const f=await fixture(),request=await f.create();await f.reveal(request);const own=f.storage.listReviewSubmissions(request.id)[0]!;f.db.prepare('UPDATE review_submissions SET snapshot_sha256=? WHERE id=?').run('f'.repeat(64),own.id);const before=f.rows();const bad=await f.search();expect(bad.status).toBe(409);expect(object(bad.body.error).code).toBe('RESYNC_REQUIRED');expect(f.rows()).toEqual(before);
 f.storage.upsertMembership({...f.storage.getMembership(f.sid,f.identities[2]!.id)!,active:false});const denied=await f.search({},f.identities[2]!.token);expect(denied.status).toBe(404);expect(object(denied.body.error).code).toBe('NOT_FOUND');
 // A real public dependency redaction invokes current privacy; it is not intrinsic corruption.
 const dependency=await fixture(),dep=await dependency.post('Dependency','note'),r=await dependency.create({dependency:dep});await dependency.reveal(r);await dependency.redact('post',dep);expect((await dependency.search()).items).toEqual([]);
 // Explicit historical cross-space evidence fault exercises existing online NOT_FOUND hiding only.
 const evidence=await fixture(),note=await evidence.post('Public cited note','note'),e=await evidence.create();await evidence.reveal(e,[{evidence_refs:[{kind:'post',post_id:note,revision:1}]}]);evidence.db.prepare('UPDATE posts SET space_id=? WHERE id=?').run(evidence.other,note);const hidden=await evidence.search();expect(hidden.status).toBe(200);expect(hidden.items).toHaveLength(1);expect(hidden.items[0]!.reviewer_actor_id).toBe(evidence.identities[1]!.id);
});

it('PSI04 literal field boundaries, Unicode query and snippet preserve original text without metadata/attachment matching',async()=>{
 const f=await fixture(),r=await f.create(),query='研究'+ '🧪'.repeat(254),coverage='前'.repeat(80)+query+'後'.repeat(80)+' Literal % _ * " ABC É';await f.reveal(r,[{coverage,limitations:['ab','cd'],checks_performed:'check only',independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'独立'}}]);
 const full=await f.search({q:query});expect(full.items).toHaveLength(1);const snippet=text(full.items[0]!.snippet);expect(Array.from(snippet).length).toBeLessThanOrEqual(320);expect(snippet).toContain(query);expect(snippet).toContain('前'.repeat(32));
 for(const q of ['%', '_', '*', '"', 'abc','É','独'])expect((await f.search({q})).items).toHaveLength(1);
 for(const q of ['abcd','e\u0301','complete',r.snapshot_sha256])expect((await f.search({q})).items).toEqual([]);
 const rows=f.storage.listReviewSubmissions(r.id);expect((await f.search({q:rows[0]!.reviewer_session_id})).items).toEqual([]);expect((await f.search({q:'ab'})).items).toHaveLength(1);
});

it('PSI05 cursor anchors visible results, skips later-redacted opinions, preserves original expiry, and keeps cancelled/stale readable history',async()=>{
 const f=await fixture();for(let n=0;n<3;n++){const r=await f.create();await f.reveal(r);await f.client().cancelReviewRequest(f.sid,r.id,{expected_version:3,reason:'Owned history'},'cancel-'+n);}
 await f.write(`/spaces/${f.sid}/posts/${f.target}/revisions`,{expected_revision:1,title:'Later public target',summary:'revision',body:'Later body',structured:claim});
 const all=(await f.search({limit:100})).items;expect(all.every(row=>object(row.target_ref).revision===1)).toBe(true);expect(all).toHaveLength(6);const first=await f.search({limit:1});expect(first.items).toEqual(all.slice(0,1));const cursor=text(first.meta.next_cursor),payload=new HmacTokenSigner().verify(cursor,f.storage.getInstanceSecret(),f.clock.now().getTime()/1000)!;
 const invisible=all[1]!;await f.redact('post',text(object(invisible.target_ref).post_id)); // All rounds share target; use another independent fixture for exact skip below.
 expect((await f.search({limit:1,cursor})).items).toEqual([]);
 const skip=await fixture();const targets=[skip.target,await skip.post('Second target'),await skip.post('Third target')];for(const target of targets){const r=await skip.create({target});await skip.reveal(r);}
 const original=(await skip.search({limit:100})).items,head=await skip.search({limit:1});const firstCursor=text(head.meta.next_cursor);const toHide=original[1]!;await skip.redact('post',text(object(toHide.target_ref).post_id));const expected=original.filter(row=>text(object(row.target_ref).post_id)!==text(object(toHide.target_ref).post_id)&&row.submission_id!==head.items[0]!.submission_id);const next=await skip.search({limit:1,cursor:firstCursor});expect(next.items).toEqual(expected.slice(0,1));
 const beforeExpiry=new HmacTokenSigner().verify(firstCursor,skip.storage.getInstanceSecret(),skip.clock.now().getTime()/1000)!;skip.advance(100);const later=await skip.search({limit:1,cursor:text(next.meta.next_cursor)});expect(later.items).toEqual(expected.slice(1,2));expect(new HmacTokenSigner().verify(text(later.meta.next_cursor),skip.storage.getInstanceSecret(),skip.clock.now().getTime()/1000)!.exp).toBe(beforeExpiry.exp);
 f.advance(Number(payload.exp)-f.clock.now().getTime()/1000+1);expect((await f.search({limit:1,cursor})).status).toBe(400);
});

it('PSI06 real small candidate cap covers entire filtered domain even behind cursor; controlled default-cap observation is separately labelled',async()=>{
 const f=await fixture(),one=await f.create();await f.reveal(one);const two=await f.create();await f.reveal(two);const first=await f.search({limit:1}),cursor=text(first.meta.next_cursor);const {auth,search}=f.services(2);const ctx=auth.authenticateToken(f.token),query:ReviewSubmissionSearchQuery={source:'review_submissions',q:'ownedneedle',limit:1};
 expect(()=>search.searchPublicReviewSubmissions(ctx,f.sid,query)).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));expect(()=>search.searchPublicReviewSubmissions(ctx,f.sid,{...query,cursor})).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));expect(search.searchPublicReviewSubmissions(ctx,f.sid,{...query,request_id:one.id}).items).toHaveLength(1);expect(f.storage.listPublicReviewSubmissionCandidateIds(f.sid,{},2)).toHaveLength(3);
 const tiny=f.services(5000,1);expect(()=>tiny.search.searchPublicReviewSubmissions(tiny.auth.authenticateToken(f.token),f.sid,query)).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));
 // Controlled sentinel proves configured default 5000/5001 overflow, not 5001 real submissions or performance certification.
 const original=f.storage.listPublicReviewSubmissionCandidateIds.bind(f.storage);const observed:number[]=[];const spy=vi.spyOn(f.storage,'listPublicReviewSubmissionCandidateIds').mockImplementation((space,filters,max)=>{observed.push(max);return Array.from({length:max+1},(_,n)=>'controlled-'+n);});try{const configured=f.services();expect(()=>configured.search.searchPublicReviewSubmissions(configured.auth.authenticateToken(f.token),f.sid,query)).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));expect(observed).toContain(5000);}finally{spy.mockRestore();}expect(original(f.sid,{},2)).toHaveLength(3);
});

it('PSI07 actual second WAL connection redaction commits during selected-candidate read yet whole batch uses one privacy snapshot',async()=>{
 const f=await fixture(),r=await f.create();await f.reveal(r);const {auth,search}=f.services(),second=new Database(f.file);second.pragma('busy_timeout=5000');let commits=0;const original=f.storage.findReviewSubmissionById.bind(f.storage);
 try{const storage=new SqliteStorage(second),hasher=new CryptoHasher(),auth2=new AuthService(storage,hasher,f.clock),redaction=new RedactionService(storage,new CryptoIdGenerator(),f.clock,auth2,new IdempotencyService(storage,hasher,f.clock));const spy=vi.spyOn(f.storage,'findReviewSubmissionById').mockImplementation(id=>{if(!commits){expect(f.db.inTransaction).toBe(true);redaction.createRedaction(auth2.authenticateToken(f.token),f.sid,{target_type:'post',target_id:f.target,reason:'Owned WAL privacy commit'},'wal-redaction');commits++;}return original(id);});
 const batch=search.searchPublicReviewSubmissions(auth.authenticateToken(f.token),f.sid,{source:'review_submissions',q:'ownedneedle'});expect(commits).toBe(1);expect(batch.items).toHaveLength(2);spy.mockRestore();expect((await f.search()).items).toEqual([]);
 }finally{second.close();}
});
