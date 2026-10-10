import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { AuthService, CryptoHasher, CryptoIdGenerator } from '@detuned/core';
import { ReviewModule } from '@detuned/module-review';
import { type CreateReviewRequest } from '@detuned/protocol';

let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>, module: ReviewModule;
let auth: ReturnType<AuthService['authenticateToken']>, sid: string, pid: string, dep: string, token: string;
const clock={ now:()=>new Date('2026-10-09T00:00:00.000Z'), nowIso:()=> '2026-10-09T00:00:00.000Z' };
const hasher=new CryptoHasher();
let req: CreateReviewRequest;
beforeEach(async()=>{
  db=new Database(':memory:'); token=bootstrapDatabase(db).adminToken!; storage=new SqliteStorage(db); app=buildApp({storage,clock}); await app.ready();
  const authorization=`Bearer ${token}`;
  async function post(url:string,payload:Record<string,unknown>,key:string){const r=await app.inject({method:'POST',url,headers:{authorization,'idempotency-key':key},payload});expect(r.statusCode,r.body).toBe(201);return r.json().data;}
  sid=(await post('/api/v1/spaces',{slug:'snapshot',objective:'o',rules:[]},'s')).space.id;
  const tid=(await post(`/api/v1/spaces/${sid}/threads`,{title:'t'},'t')).thread.id;
  pid=(await post(`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'claim',summary:'s',body:'original',structured:{statement:'claim',assumptions:['a','b'],scope:'scope',falsification_plan:'plan'}},'claim')).post.id;
  dep=(await post(`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'note',title:'dependency',summary:'s',body:'dependency'},'dependency')).post.id;
  const service=new AuthService(storage,hasher,clock); auth=service.authenticateToken(token);module=new ReviewModule(storage,hasher,clock,new CryptoIdGenerator(),service);
  req={target_ref:{post_id:pid,revision:1},dependency_refs:[{post_id:dep,revision:1}],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['reviewer'],expected_policy_revision:1,reproduction_instructions:' reproduce '};
  policy([],{});
});
afterEach(async()=>{vi.restoreAllMocks();await app.close();db.close();});
const snapshot=()=>module.generateSnapshotManifest(auth,sid,req);
function artifact(id:string){storage.createArtifact({id,space_id:sid,owner_id:auth.actor.id,visibility:'space',review_assignment_id:null,check_run_id:null,sha256:'a'.repeat(64),bytes:42,mime:'text/plain',storage_key:'private-object',state:'ready',created_at:clock.nowIso()});}
function policy(required:string[],profiles:Record<string,unknown>){db.prepare('UPDATE space_revisions SET review_policy=?,check_profiles=? WHERE space_id=? AND revision=1').run(JSON.stringify({...storage.getSpaceRevision(sid,1)!.review_policy,required_checks:required}),JSON.stringify(profiles),sid);}
function failure(code:string,status:number){expect(snapshot).toThrow(expect.objectContaining({code,statusCode:status}));}

it('RS01 one read snapshot, immutable detached materials, collection permutation and semantic array hash',()=>{
  artifact('z');artifact('a'); req.artifact_ids=['z','a'];req.declared_contributors=['z-person','a-person'];
  req.code_refs=[{repository:'z',commit:'a'.repeat(40),source_artifact_id:'z',reproduction_instructions:' z '},{repository:'a',commit:'b'.repeat(64),source_artifact_id:'a',reproduction_instructions:' a '}];
  const input=JSON.stringify(req), rows=db.prepare('SELECT * FROM post_revisions ORDER BY post_id').all(), changes=db.prepare('SELECT total_changes() AS n').get();
  const read=vi.spyOn(storage,'readSnapshot');const old=vi.spyOn(hasher,'canonicalJson').mockImplementation(()=>{throw new Error('old hasher must not be used');});
  const first=snapshot();expect(read).toHaveBeenCalledTimes(1);expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(changes);expect(JSON.stringify(req)).toBe(input);expect(old).not.toHaveBeenCalled();
  req.artifact_ids.reverse();req.code_refs.reverse();req.declared_contributors.reverse();expect(snapshot().manifestHash).toBe(first.manifestHash);
  first.manifest.target.assumptions.push('mutated');first.manifest.review_policy.required_checks.push('mutated');first.manifest.code_refs[0]!.repository='mutated';expect(snapshot().manifestHash).toBe(first.manifestHash);
  expect(db.prepare('SELECT * FROM post_revisions ORDER BY post_id').all()).toEqual(rows);
  const original=snapshot().manifestHash;db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify({statement:'claim',assumptions:['b','a'],scope:'scope',falsification_plan:'plan'}),pid);expect(snapshot().manifestHash).not.toBe(original);
});

it('RS02 current/lifecycle, policy conflict and revoked credential fail with fixed domain errors',()=>{
  const original=snapshot().manifestHash;db.prepare('UPDATE posts SET lifecycle=\'withdrawn\' WHERE id=?').run(dep);failure('SNAPSHOT_STALE',409);
  db.prepare('UPDATE posts SET lifecycle=\'redacted\' WHERE id=?').run(dep);failure('CONTENT_REDACTED',410);
  db.prepare('UPDATE posts SET lifecycle=\'active\',current_revision=2 WHERE id=?').run(dep);failure('SNAPSHOT_STALE',409);
  db.prepare('UPDATE posts SET current_revision=1 WHERE id=?').run(dep);expect(snapshot().manifestHash).toBe(original);
  req.expected_policy_revision=2;failure('REVISION_CONFLICT',409);req.expected_policy_revision=1;
  db.prepare('UPDATE credentials SET revoked_at=? WHERE id=?').run(clock.nowIso(),auth.credential.id);failure('UNAUTHENTICATED',401);
});

it('RS03 strict DTO duplicates, code correspondence and artifact availability/hash reject',()=>{
  req.dependency_refs.push({...req.target_ref});failure('VALIDATION_ERROR',400);req.dependency_refs.pop();
  artifact('code');req.artifact_ids=['code'];const code={repository:'repo',commit:'a'.repeat(40),source_artifact_id:'code',reproduction_instructions:'run'};req.code_refs=[code,{...code,reproduction_instructions:'different'}];failure('VALIDATION_ERROR',400);
  req.code_refs=[{...code,commit:code.commit+'\n'}];failure('VALIDATION_ERROR',400);
  req.code_refs=[code];expect(snapshot().manifest.artifacts).toEqual([{artifact_id:'code',sha256:'a'.repeat(64),bytes:42}]);
  db.prepare('UPDATE artifacts SET visibility=\'review_assignment\' WHERE id=\'code\'').run();failure('NOT_FOUND',404);
  db.prepare('UPDATE artifacts SET visibility=\'space\',state=\'missing\' WHERE id=\'code\'').run();failure('SNAPSHOT_STALE',409);
  db.prepare('UPDATE artifacts SET state=\'redacted\' WHERE id=\'code\'').run();failure('CONTENT_REDACTED',410);
  db.prepare('UPDATE artifacts SET state=\'ready\',sha256=? WHERE id=\'code\'').run('A'.repeat(64));failure('VALIDATION_ERROR',400);
  req.reproduction_instructions='  ';failure('VALIDATION_ERROR',400);
});

it('RS04 only required configuration, empty verifier facts, pinned stable and policy pointer changes',()=>{
  const profile={config_sha256:'b'.repeat(64),verifier_actor_ids:[],description:' unchanged '};policy(['z'],{z:profile,unused:{...profile,description:'unused'}});
  const first=snapshot();expect(first.manifest.check_profiles[0]!.verifier_actor_ids).toEqual([]);expect(first.manifest.check_profiles).toHaveLength(1);
  policy(['z'],{z:profile,unused:{...profile,description:'different'}});expect(snapshot().manifestHash).toBe(first.manifestHash);
  db.prepare('UPDATE space_revisions SET pinned_refs=? WHERE space_id=?').run(JSON.stringify([req.target_ref]),sid);expect(snapshot().manifestHash).toBe(first.manifestHash);
  policy(['z'],{});failure('VALIDATION_ERROR',400);policy(['z'],{z:{...profile,verifier_actor_ids:null}});failure('VALIDATION_ERROR',400);
  db.prepare('UPDATE space_revisions SET check_profiles=? WHERE space_id=?').run('{',sid);failure('VALIDATION_ERROR',400);db.prepare('UPDATE space_revisions SET check_profiles=? WHERE space_id=?').run('{}',sid);
  policy(['z'],{z:{...profile,verifier_actor_ids:['same','same']}});failure('VALIDATION_ERROR',400);
  policy(['z'],{z:{...profile,description:'x'.repeat(262144)}});failure('PAYLOAD_TOO_LARGE',413);
  policy(['z'],{z:profile});db.prepare('INSERT INTO space_revisions SELECT space_id,2,objective,rules,review_policy,check_profiles,pinned_refs,editor_id,created_at FROM space_revisions WHERE space_id=? AND revision=1').run(sid);
  db.prepare('UPDATE spaces SET policy_revision=2,current_revision=2 WHERE id=?').run(sid);req.expected_policy_revision=2;expect(snapshot().manifestHash).not.toBe(first.manifestHash);
});

it('RS05 all historical metadata editors via keyset, no historical bodies, bounded contribution traversal',()=>{
  const aid='historical';storage.createActor({id:aid,kind:'human',display_name:'history',created_at:clock.nowIso(),disabled_at:null});
  const insert=db.prepare('INSERT INTO post_revisions SELECT post_id,?,title,summary,body,tags,structured,content_hash,?,created_at FROM post_revisions WHERE post_id=? AND revision=1');
  for(let r=2;r<=205;r++)insert.run(r,r===2?aid:auth.actor.id,pid);
  db.prepare('UPDATE posts SET current_revision=205 WHERE id=?').run(pid);req.target_ref.revision=205;
  const list=vi.spyOn(storage,'listPostRevisionMetadata');const body=vi.spyOn(storage,'getPostRevision');expect(snapshot().manifest.contributors).toContain(aid);expect(list.mock.calls.filter(c=>c[0]===pid)).toHaveLength(3);expect(body.mock.calls.map(c=>c[1])).toEqual([205,1]);
  // Private legal metadata history fixture; no broad product writes or full-history bodies are read.
  db.transaction(()=>{for(let r=206;r<=10001;r++)insert.run(r,auth.actor.id,pid);})();db.prepare('UPDATE posts SET current_revision=10001 WHERE id=?').run(pid);req.target_ref.revision=10001;failure('QUERY_TOO_BROAD',422);
});
