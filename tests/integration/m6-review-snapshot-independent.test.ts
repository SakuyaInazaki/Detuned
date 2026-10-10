import {afterEach, expect, it, vi} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes, createHash} from 'node:crypto';
import {bootstrapDatabase, SqliteStorage} from '@detuned/storage-sqlite';
import {AuthService, CryptoHasher, CryptoIdGenerator} from '@detuned/core';
import {ReviewModule} from '@detuned/module-review';
import type {CreateReviewRequest, ReviewPolicy, PostRevision} from '@detuned/protocol';
import {canonicalizeReviewJson, ReviewCanonicalizationError} from '../../modules/review/src/canonical-json.js';

// Direct trusted storage seeds are private synthetic history, not public HTTP writes.
// All reads under test use the real ReviewModule and real file-backed SQLite.
const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{vi.restoreAllMocks();while(cleanups.length)await cleanups.pop()!();});
const now='2026-10-09T00:00:00.000Z';
const clock={now:()=>new Date(now),nowIso:()=>now};
const policy:ReviewPolicy={enabled:true,required_reviewers:1,exclude_contributors:true,distinct_actors:true,
 distinct_independence_groups:false,seal_until_all_submitted:true,invalidate_on_revision:true,
 required_checks:['reproduce'],allow_open_objections:false};
const originalStructured={statement:'固定主张🙂',assumptions:['第一项','第二项'],scope:'有限域',falsification_plan:'寻找反例'};
async function fixture(){
 const directory=await mkdtemp(path.join(tmpdir(),'detuned-review-independent-'));
 const db=new Database(path.join(directory,'forum.sqlite'));let writer:Database.Database|undefined;
 cleanups.push(async()=>{writer?.close();db.close();await rm(directory,{recursive:true,force:true});});
 bootstrapDatabase(db);db.pragma('journal_mode=WAL');const storage=new SqliteStorage(db),hasher=new CryptoHasher(),auth=new AuthService(storage,hasher,clock);
 const sid='spc-independent',tid='thd-independent',ids=['act-author','act-editor','act-reader','act-declared','act-reviewer'];
 for(const id of ids)storage.createActor({id,kind:'human',display_name:id,disabled_at:null,created_at:now});
 const token=randomBytes(32).toString('hex');
 storage.createCredential({id:'cred-reader',actor_id:ids[2]!,token_hash:hasher.sha256(token),allowed_space_ids:[sid],capabilities:['read'],expires_at:null,revoked_at:null,created_at:now});
 storage.createSpace({id:sid,slug:'independent',current_revision:1,policy_revision:1,acl_epoch:1,created_at:now},
 {space_id:sid,revision:1,objective:'不进hash的展示目标',rules:['固定规则🙂'],review_policy:structuredClone(policy),
 check_profiles:{reproduce:{verifier_actor_ids:[ids[4]!],config_sha256:'b'.repeat(64),description:'固定检查配置'}},pinned_refs:[],editor_id:ids[0]!,created_at:now});
 storage.upsertMembership({space_id:sid,actor_id:ids[2]!,role:'observer',active:true,reviewer_eligible:false,independence_group:null});
 storage.createThread({id:tid,space_id:sid,title:'材料',version:1,state:'open',creator_id:ids[0]!,created_at:now,updated_at:now});
 function seedPost(id:string,kind:'claim'|'note'='claim'){
  const revision:PostRevision={post_id:id,revision:1,title:id,summary:'材料摘要',body:'BODY SHOULD NOT BECOME MANIFEST',tags:[],
   structured:kind==='claim'?structuredClone(originalStructured):{},content_hash:createHash('sha256').update(id).digest('hex'),editor_id:ids[1]!,created_at:now};
  storage.createPost({id,space_id:sid,thread_id:tid,author_id:ids[0]!,kind,current_revision:1,lifecycle:'active',created_at:now},revision);
  return revision;
 }
 const target=seedPost('pst-target'),dependency=seedPost('pst-dependency','note');
 storage.createArtifact({id:'art-source',space_id:sid,owner_id:ids[0]!,visibility:'space',review_assignment_id:null,check_run_id:null,
  sha256:'a'.repeat(64),bytes:7,mime:'application/octet-stream',storage_key:'PRIVATE-STORAGE-KEY',state:'ready',created_at:now});
 const request={target_ref:{post_id:target.post_id,revision:1},dependency_refs:[{post_id:dependency.post_id,revision:1}],artifact_ids:['art-source'],
  code_refs:[{repository:'https://example.invalid/research',commit:'c'.repeat(40),source_artifact_id:'art-source',reproduction_instructions:'运行固定源码包'}],
  declared_contributors:[ids[3]!],reviewer_actor_ids:[ids[4]!],expected_policy_revision:1,reproduction_instructions:'根据固定材料复现'};
 const currentAuth=auth.authenticateToken(token);
 const module=new ReviewModule(storage,hasher,clock,new CryptoIdGenerator(),auth);
 return {directory,db,storage,hasher,auth,module,sid,tid,ids,target,dependency,request:request as CreateReviewRequest,currentAuth,
  seedPost,openWriter:()=>{writer=new Database(path.join(directory,'forum.sqlite'));return writer;}};
}
function readerWrites(db:Database.Database){return db.prepare('SELECT total_changes() AS n').get() as {n:number};}
function businessCounts(db:Database.Database){return Object.fromEntries(['posts','post_revisions','events','idempotency_records','sessions','review_requests'].filter(t=>db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t)).map(t=>[t,(db.prepare('SELECT count(*) AS n FROM '+t).get() as {n:number}).n]));}

// Tests below are completed against the root-frozen field/error contract, not guessed DTO names.

function snapshot(f:Awaited<ReturnType<typeof fixture>>,request=f.request){return f.module.generateSnapshotManifest(f.currentAuth,f.sid,request);}
function rejection(run:()=>unknown,code:string,status:number){
 try{run();throw new Error('Expected finite snapshot refusal');}catch(error){
  expect(error).toMatchObject({code,statusCode:status,retryable:false});
  expect((error as Error).message.includes('PRIVATE')).toBe(false);
 }
}
it('MI01 complete real material snapshot detaches inputs and has exact hash without any reader writes',async()=>{
 const f=await fixture(),before=businessCounts(f.db),changes=readerWrites(f.db),input=structuredClone(f.request);
 const oldHasher=vi.spyOn(f.hasher,'canonicalJson').mockImplementation(()=>{throw new Error('Old hasher must not serialize reviews');});
 const result=snapshot(f);
 expect(result.manifest).toEqual({manifest_version:1,space_id:f.sid,
  target:{ref:{post_id:f.target.post_id,revision:1},content_hash:f.target.content_hash,...originalStructured},
  dependencies:[{ref:{post_id:f.dependency.post_id,revision:1},content_hash:f.dependency.content_hash}],
  artifacts:[{artifact_id:'art-source',sha256:'a'.repeat(64),bytes:7}],code_refs:input.code_refs,
  rules_revision:1,policy_revision:1,review_policy:policy,
  check_profiles:[{check_name:'reproduce',config_sha256:'b'.repeat(64),verifier_actor_ids:['act-reviewer'],description:'固定检查配置'}],
  contributors:['act-author','act-declared','act-editor'],reproduction_instructions:input.reproduction_instructions});
 expect(result.manifestHash).toBe(createHash('sha256').update(canonicalizeReviewJson(result.manifest),'utf8').digest('hex'));
 expect(oldHasher).not.toHaveBeenCalled();expect(f.request).toEqual(input);
 expect(readerWrites(f.db)).toEqual(changes);expect(businessCounts(f.db)).toEqual(before);
 expect(JSON.stringify(result.manifest).includes('PRIVATE-STORAGE-KEY')).toBe(false);
 result.manifest.code_refs[0]!.repository='changed output';result.manifest.target.assumptions.push('changed output');
 expect(f.request).toEqual(input);expect(snapshot(f).manifestHash).toBe(result.manifestHash);
});
it('MI02 pinned-only revisions preserve hash while explicit rules policy changes and required config changes invalidate material',async()=>{
 const f=await fixture(),initial=snapshot(f);const space=f.storage.findSpaceById(f.sid)!,r1=f.storage.getSpaceRevision(f.sid,1)!;
 f.storage.updateSpace({...space,current_revision:2},{...r1,revision:2,pinned_refs:[{post_id:f.target.post_id,revision:1}]});
 expect(snapshot(f)).toEqual(initial);
 f.storage.updateSpace({...space,current_revision:3,policy_revision:3},{...r1,revision:3,rules:['规则已变']});
 rejection(()=>snapshot(f),'REVISION_CONFLICT',409);
 f.request.expected_policy_revision=3;const rules=snapshot(f);expect(rules.manifest.rules_revision).toBe(3);expect(rules.manifestHash===initial.manifestHash).toBe(false);
 const r3=f.storage.getSpaceRevision(f.sid,3)!;
 f.storage.updateSpace({...space,current_revision:4,policy_revision:4},{...r3,revision:4,check_profiles:{...r3.check_profiles,unused:{verifier_actor_ids:[],config_sha256:'e'.repeat(64),description:'ignored'}}});
 f.request.expected_policy_revision=4;const withUnused=snapshot(f);
 f.db.prepare('UPDATE space_revisions SET check_profiles=? WHERE space_id=? AND revision=4').run(JSON.stringify({...r3.check_profiles,unused:{verifier_actor_ids:[],config_sha256:'f'.repeat(64),description:'changed ignored'}}),f.sid);
 expect(snapshot(f)).toEqual(withUnused);
 f.db.prepare('UPDATE space_revisions SET check_profiles=? WHERE space_id=? AND revision=4').run(JSON.stringify({reproduce:{...r3.check_profiles.reproduce!,config_sha256:'d'.repeat(64)}}),f.sid);
 expect(snapshot(f).manifestHash===withUnused.manifestHash).toBe(false);
 f.db.prepare('UPDATE space_revisions SET check_profiles=? WHERE space_id=? AND revision=4').run('{}',f.sid);
 rejection(()=>snapshot(f),'VALIDATION_ERROR',400);
});
it('MI03 an actual second WAL connection commit cannot mix policy and material across the one synchronous read snapshot',async()=>{
 const f=await fixture(),old=snapshot(f),writer=f.openWriter(),second=new SqliteStorage(writer);
 const space=f.storage.findSpaceById(f.sid)!,r1=f.storage.getSpaceRevision(f.sid,1)!;let injected=false;
 const read=f.storage.getSpaceRevision.bind(f.storage),calls=vi.spyOn(f.storage,'readSnapshot'),before=readerWrites(f.db);
 vi.spyOn(f.storage,'getSpaceRevision').mockImplementation((sid,revision)=>{
  const observed=read(sid,revision);if(!injected){injected=true;second.transaction(tx=>{
   tx.updateSpace({...space,current_revision:2,policy_revision:2},{...r1,revision:2,rules:['CONCURRENT NEW RULE']});
   writer.prepare('UPDATE post_revisions SET content_hash=? WHERE post_id=? AND revision=1').run('f'.repeat(64),f.target.post_id);
  });}return observed;
 });
 expect(snapshot(f)).toEqual(old);expect(injected).toBe(true);expect(calls).toHaveBeenCalledTimes(1);expect(readerWrites(f.db)).toEqual(before);
 expect(second.findSpaceById(f.sid)!.policy_revision).toBe(2);expect(f.storage.getPostRevision(f.target.post_id,1)!.content_hash).toBe('f'.repeat(64));
 rejection(()=>snapshot(f),'REVISION_CONFLICT',409);
});
it('MI04 persisted read-only actor withdrawal and malformed historical/check material fail with safe typed errors and no writes',async()=>{
 const f=await fixture(),counts=businessCounts(f.db);
 f.db.prepare('UPDATE credentials SET revoked_at=? WHERE id=?').run(now,'cred-reader');
 rejection(()=>snapshot(f),'UNAUTHENTICATED',401);f.db.prepare('UPDATE credentials SET revoked_at=NULL WHERE id=?').run('cred-reader');
 f.storage.upsertMembership({space_id:f.sid,actor_id:'act-reader',role:'observer',active:false,reviewer_eligible:false,independence_group:null});
 rejection(()=>snapshot(f),'NOT_FOUND',404);f.storage.upsertMembership({space_id:f.sid,actor_id:'act-reader',role:'observer',active:true,reviewer_eligible:false,independence_group:null});
 f.db.prepare('UPDATE artifacts SET visibility=? WHERE id=?').run('review_assignment','art-source');rejection(()=>snapshot(f),'NOT_FOUND',404);
 f.db.prepare('UPDATE artifacts SET visibility=?,state=? WHERE id=?').run('space','missing','art-source');rejection(()=>snapshot(f),'SNAPSHOT_STALE',409);
 f.db.prepare('UPDATE artifacts SET state=? WHERE id=?').run('redacted','art-source');rejection(()=>snapshot(f),'CONTENT_REDACTED',410);
 f.db.prepare('UPDATE artifacts SET state=? WHERE id=?').run('ready','art-source');
 f.db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify({statement:'PRIVATE SECRET'}),f.target.post_id);
 rejection(()=>snapshot(f),'VALIDATION_ERROR',400);f.db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify(originalStructured),f.target.post_id);
 const profiles={reproduce:{config_sha256:'b'.repeat(64),verifier_actor_ids:null,description:'PRIVATE CONFIG'}};
 f.db.prepare('UPDATE space_revisions SET check_profiles=? WHERE space_id=?').run(JSON.stringify(profiles),f.sid);
 const before=readerWrites(f.db);rejection(()=>snapshot(f),'VALIDATION_ERROR',400);expect(readerWrites(f.db)).toEqual(before);expect(businessCounts(f.db)).toEqual(counts);
});
function history(f:Awaited<ReturnType<typeof fixture>>,count:number,editors=false){
 const actor=f.db.prepare('INSERT INTO actors(id,kind,display_name,created_at,disabled_at) VALUES(?,?,?,?,NULL)');
 const row=f.db.prepare('INSERT INTO post_revisions SELECT post_id,?,title,summary,body,tags,structured,content_hash,?,created_at FROM post_revisions WHERE post_id=? AND revision=1');
 f.db.transaction(()=>{for(let r=2;r<=count;r++){const id=editors?`act-history-${r}`:'act-editor';if(editors)actor.run(id,'human',id,now);row.run(r,id,f.target.post_id);}f.db.prepare('UPDATE posts SET current_revision=? WHERE id=?').run(count,f.target.post_id);})();f.request.target_ref.revision=count;
}
it('MI05 real narrow metadata pagination includes old editors and enforces exact aggregate history/contributor limits',async()=>{
 const f=await fixture();history(f,9999);const page=vi.spyOn(f.storage,'listPostRevisionMetadata');
 vi.spyOn(f.storage,'listPostRevisions').mockImplementation(()=>{throw new Error('No historical full body traversal');});
 expect(snapshot(f).manifest.contributors).toEqual(['act-author','act-declared','act-editor']);expect(page.mock.calls.length).toBeGreaterThan(99);
 f.db.prepare('INSERT INTO post_revisions SELECT post_id,10000,title,summary,body,tags,structured,content_hash,editor_id,created_at FROM post_revisions WHERE post_id=? AND revision=1').run(f.target.post_id);
 f.db.prepare('UPDATE posts SET current_revision=10000 WHERE id=?').run(f.target.post_id);f.request.target_ref.revision=10000;
 rejection(()=>snapshot(f),'QUERY_TOO_BROAD',422);
 const g=await fixture();history(g,4095,true);g.request.declared_contributors=[];
 expect(snapshot(g).manifest.contributors.length).toBe(4096);g.request.declared_contributors=['act-declared'];rejection(()=>snapshot(g),'QUERY_TOO_BROAD',422);
},10000);
it('MI06 independent canonical countervectors preserve dangerous-looking legal JSON names, separators and parsed IEEE values without prototype effects',()=>{
 const legal=JSON.parse('{"__proto__":{"polluted":true},"constructor":"literal","number":9007199254740993}') as unknown;
 expect(canonicalizeReviewJson(legal)).toBe('{"__proto__":{"polluted":true},"constructor":"literal","number":9007199254740992}');
 expect(Object.hasOwn(Object.prototype,'polluted')).toBe(false);
 expect(canonicalizeReviewJson({'\u2029':'line','\u2028':'paragraph','\u007f':'DEL'})).toBe('{"\u007f":"DEL","\u2028":"paragraph","\u2029":"line"}');
 const failure=Object.create(null) as Record<string,unknown>;Object.defineProperty(failure,'__proto__',{get(){throw new Error('PRIVATE GETTER');},enumerable:true});
 try{canonicalizeReviewJson(failure);throw new Error('Expected strict rejection');}catch(e){expect(e).toBeInstanceOf(ReviewCanonicalizationError);expect((e as ReviewCanonicalizationError).reason).toBe('invalid_json');}
});
