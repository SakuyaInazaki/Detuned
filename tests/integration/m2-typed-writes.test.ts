import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, AuthenticatedContext } from '@detuned/core';
import { SqliteStorage, bootstrapDatabase, openAndCoordinateDatabase } from '@detuned/storage-sqlite';
import { LegacyPostService } from '../../docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/legacy-post-service.js';
import { LegacyThreadService } from '../../docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/legacy-thread-service.js';

describe('M2.2-A new typed writes and historical replay', () => {
  let dir: string; let db: Database.Database; let storage: SqliteStorage; let auth: AuthenticatedContext;
  let as: AuthService; let idem: IdempotencyService; let threads: ThreadService; let posts: PostService; let sid: string; let tid: string;
  const hash = new CryptoHasher(), ids = new CryptoIdGenerator(), clock = new SystemClock();
  const reset = () => { storage = new SqliteStorage(db); as = new AuthService(storage, hash, clock); idem = new IdempotencyService(storage, hash, clock); threads = new ThreadService(storage, ids, clock, hash, as, idem); posts = new PostService(storage, ids, clock, hash, as, idem); };
  const content = (kind: any, structured: any) => ({ kind, title: 'typed', summary: 's', structured });
  const failure = (overrides = {}) => ({ attempt: 'a', category: 'environment_error', assumptions: [], tested_scope: 'scope', expected: 'e', observed: 'o', ruled_out: 'r', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'not available', not_ruled_out: [], retry_when: [], ...overrides });
  const counts = () => ['threads', 'posts', 'post_revisions', 'events', 'idempotency_records', 'relations', 'revision_artifacts'].map(table => (db.prepare(`SELECT count(*) n FROM ${table}`).get() as {n:number}).n);
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'detuned-typed-')); db = new Database(join(dir, 'db.sqlite')); const boot = bootstrapDatabase(db); reset(); auth = as.authenticateToken(boot.adminToken!); sid = new SpaceService(storage, ids, clock, as, idem).createSpace(auth, { slug: 'typed', objective: 'o', rules: [] }, 'space').space.id; tid = threads.createThread(auth, sid, {title:'t'}, 'thread').thread.id; });
  afterEach(() => { db.close(); rmSync(dir, {recursive:true, force:true}); });

  it('T01: weak initial failure path rejects missing evidence_state atomically', () => {
    const { evidence_state, ...bad } = failure(); const before = counts();
    expect(() => threads.createThread(auth, sid, { title:'bad', initial_post:content('failure',bad) }, 'bad')).toThrow();
    expect(counts()).toEqual(before);
  });

  it.each(['proposal', 'claim', 'failure', 'summary'])('T02: %s uses one strict rule across all three entry points', kind => {
    const source = posts.createPost(auth,sid,tid,content('note',{}),'source');
    const good = kind === 'failure' ? failure() : kind === 'summary' ? {source_refs:[{post_id:source.post.id,revision:1}]} : {statement:' s ', assumptions:[],scope:'scope',falsification_plan:'f'};
    const first = posts.createPost(auth,sid,tid,content(kind,good),'good');
    const bad = {...good, unexpected:true};
    for (const write of [() => threads.createThread(auth,sid,{title:'bad',initial_post:content(kind,bad)},'bad-initial'), () => posts.createPost(auth,sid,tid,content(kind,bad),'bad-post'), () => posts.createRevision(auth,sid,first.post.id,{...content(kind,bad),expected_revision:1},'bad-revision')]) {
      const before=counts(); expect(write).toThrowError(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400})); expect(counts()).toEqual(before);
    }
    expect(first.revision.structured).toEqual(good);
    expect(threads.createThread(auth,sid,{title:'valid',initial_post:content(kind,good)},'valid-initial').initial_post!.revision.structured).toEqual(good);
    expect(posts.createRevision(auth,sid,first.post.id,{...content(kind,good),expected_revision:1},'valid-revision').revision.structured).toEqual(good);
  });

  it('T03: failure provided requires real fixed evidence and unverified requires nonblank reason', () => {
    for (const bad of [failure({evidence_state:'provided'}), failure({evidence_missing_reason:'  '}), failure({category:'not-a-category'}), failure({assumptions:[1]}), failure({attempt:'x'.repeat(2001)})]) {
      const before=counts(); expect(() => posts.createPost(auth,sid,tid,content('failure',bad),JSON.stringify(bad))).toThrowError(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400})); expect(counts()).toEqual(before);
    }
    expect(() => posts.createPost(auth,sid,tid,content('failure',failure({evidence_state:'provided',evidence_refs:[{kind:'post',post_id:'absent',revision:1}]})),'fake')).toThrowError(expect.objectContaining({statusCode:404}));
  });

  it('T04: fixed old versions remain readable after new revisions/withdrawal; new refs reject wrong/cross-space/redacted targets', () => {
    const source=posts.createPost(auth,sid,tid,content('note',{}),'source');
    posts.createRevision(auth,sid,source.post.id,{title:'changed',summary:'s',expected_revision:1},'changed');
    const ref={post_id:source.post.id,revision:1}; const saved=posts.createPost(auth,sid,tid,content('summary',{source_refs:[ref]}),'fixed');
    expect(saved.revision.structured).toEqual({source_refs:[ref]});
    posts.withdrawPost(auth,sid,source.post.id,{reason:'withdraw',expected_revision:2},'withdraw');
    expect(() => posts.createPost(auth,sid,tid,content('summary',{source_refs:[ref]}),'withdrawn')).not.toThrow();
    const otherSid=new SpaceService(storage,ids,clock,as,idem).createSpace(auth,{slug:'other',objective:'o',rules:[]},'other-space').space.id;
    const other=threads.createThread(auth,otherSid,{title:'other',initial_post:content('note',{})},'other-thread').initial_post!;
    for(const bad of [{...ref,revision:99},{post_id:other.post.id,revision:1}]) expect(() => posts.createPost(auth,sid,tid,content('summary',{source_refs:[bad]}),JSON.stringify(bad))).toThrowError(expect.objectContaining({statusCode:404}));
    db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(source.post.id);
    expect(() => posts.createPost(auth,sid,tid,content('summary',{source_refs:[ref]}),'redacted')).toThrowError(expect.objectContaining({statusCode:410}));
    // A historical source reference remains preserved: replay does not re-run new reference validation.
    expect(posts.createPost(auth,sid,tid,content('summary',{source_refs:[ref]}),'fixed')).toEqual(saved);
    expect(() => posts.createPost(auth,sid,tid,content('summary',{source_refs:[{...ref,extra:true}]}),'extra-ref')).toThrowError(expect.objectContaining({statusCode:400}));
  });

  it.each(['failure','summary'])('T07: %s fixed ref validation runs in every new action and rolls back', kind => {
    const source=posts.createPost(auth,sid,tid,content('note',{}),'ref-source');
    const good=kind==='failure' ? failure({evidence_state:'provided',evidence_refs:[{kind:'post',post_id:source.post.id,revision:1}]}) : {source_refs:[{post_id:source.post.id,revision:1}]};
    const first=posts.createPost(auth,sid,tid,content(kind,good),'valid-ref');
    const bad=kind==='failure' ? failure({evidence_state:'provided',evidence_refs:[{kind:'post',post_id:source.post.id,revision:999}]}) : {source_refs:[{post_id:source.post.id,revision:999}]};
    for(const write of [()=>threads.createThread(auth,sid,{title:'bad-ref',initial_post:content(kind,bad)},'bad-ref-initial'),()=>posts.createPost(auth,sid,tid,content(kind,bad),'bad-ref-post'),()=>posts.createRevision(auth,sid,first.post.id,{...content(kind,bad),expected_revision:1},'bad-ref-revision')]) {const before=counts();expect(write).toThrowError(expect.objectContaining({statusCode:404}));expect(counts()).toEqual(before);}
  });

  it('T08: existing capability/membership policy applies to writes and same-key replay', () => {
    const actor={...auth.actor,id:ids.generateId('act')};storage.createActor(actor);
    const credential={...auth.credential,id:ids.generateId('cred'),actor_id:actor.id,token_hash:hash.sha256(actor.id),capabilities:['read','write'] as ('read'|'write')[]};storage.createCredential(credential);
    const member={space_id:sid,actor_id:actor.id,role:'contributor' as const,active:true,reviewer_eligible:false,independence_group:null};storage.upsertMembership(member);
    const current={actor,credential};const req=content('failure',failure());
    posts.createPost(current,sid,tid,req,'member');
    expect(()=>posts.createPost({...current,credential:{...credential,capabilities:['write']}},sid,tid,req,'no-read')).toThrowError(expect.objectContaining({statusCode:403}));
    storage.upsertMembership({...member,active:false});
    expect(()=>posts.createPost(current,sid,tid,req,'member')).toThrowError(expect.objectContaining({statusCode:404}));
  });

  it('T06: old newpost/revision successes retain genuine raw hashes and replay through restart', () => {
    const old = new LegacyPostService(storage,ids,clock,hash,as,idem);
    const wide = {statement:'s',assumptions:[42],scope:'scope',falsification_plan:'f'};
    const req=content('proposal',wide);
    const first=old.createPost(auth,sid,tid,req,'legacy-post');
    const revisionReq={...req,expected_revision:1};
    const rev=old.createRevision(auth,sid,first.post.id,revisionReq,'legacy-rev');
    const stored=db.prepare("SELECT * FROM idempotency_records WHERE key IN ('legacy-post','legacy-rev') ORDER BY key").all();
    expect(posts.createPost(auth,sid,tid,req,'legacy-post')).toEqual({...first,post:{...first.post,current_revision:2}});
    expect(posts.createRevision(auth,sid,first.post.id,revisionReq,'legacy-rev')).toEqual(rev);
    expect(() => posts.createPost(auth,sid,tid,req,'fresh-post')).toThrowError(expect.objectContaining({statusCode:400}));
    expect(() => posts.createRevision(auth,sid,first.post.id,{...revisionReq,expected_revision:2},'fresh-rev')).toThrowError(expect.objectContaining({statusCode:400}));
    db.close(); db=new Database(join(dir,'db.sqlite'));openAndCoordinateDatabase(db,'serve');reset();
    expect(posts.createRevision(auth,sid,first.post.id,revisionReq,'legacy-rev')).toEqual(rev);
    expect(db.prepare("SELECT * FROM idempotency_records WHERE key IN ('legacy-post','legacy-rev') ORDER BY key").all()).toEqual(stored);
    expect(() => posts.createRevision(auth,sid,first.post.id,{...revisionReq,summary:'changed'},'legacy-rev')).toThrowError(expect.objectContaining({code:'IDEMPOTENCY_CONFLICT'}));
  });

  it('T05: genuine baseline success replays same raw key after restart while new key rejects; changed payload still conflicts', () => {
    const old = new LegacyThreadService(storage,ids,clock,hash,as,idem);
    const { evidence_state, evidence_refs, not_ruled_out, retry_when, ...wide }=failure();
    const req={title:'legacy',initial_post:content('failure',wide)};
    const first=old.createThread(auth,sid,req,'legacy');
    const beforeRecord=db.prepare("SELECT * FROM idempotency_records WHERE key='legacy'").get();
    expect(threads.createThread(auth,sid,req,'legacy')).toEqual(first);
    expect(() => threads.createThread(auth,sid,req,'new-key')).toThrowError(expect.objectContaining({statusCode:400}));
    db.close(); db=new Database(join(dir,'db.sqlite')); openAndCoordinateDatabase(db,'serve'); reset();
    expect(threads.createThread(auth,sid,req,'legacy')).toEqual(first);
    expect(db.prepare("SELECT * FROM idempotency_records WHERE key='legacy'").get()).toEqual(beforeRecord);
    db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(first.initial_post!.post.id);
    const tombstone = threads.createThread(auth,sid,req,'legacy').initial_post!;
    expect(tombstone.revision.content_hash).toBe('redacted');
    expect(tombstone.revision.structured).toEqual({});
    db.prepare("UPDATE posts SET lifecycle='active' WHERE id=?").run(first.initial_post!.post.id);
    expect(() => threads.createThread(auth,sid,{...req,title:'different'},'legacy')).toThrowError(expect.objectContaining({code:'IDEMPOTENCY_CONFLICT'}));
  });
});
