import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, SpaceRevisionReadService, ThreadService, PostService, ContextService, EventService, HmacTokenSigner, AuthenticatedContext } from '@detuned/core';
import { contextEnvelopeBytes, serializeContextEnvelope, ContextQuery } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';

describe('M2.4-A context snapshot and full response budget', () => {
  let dir:string, a:Database.Database, b:Database.Database, storage:SqliteStorage, writer:SqliteStorage;
  let auth:AuthenticatedContext, authService:AuthService, spaces:SpaceService, writerSpaces:SpaceService, context:ContextService, sid:string;
  const ids=new CryptoIdGenerator(),clock=new SystemClock(),hash=new CryptoHasher(),signer=new HmacTokenSigner(),secret='context-test-secret';
  beforeEach(()=>{
    dir=mkdtempSync(join(tmpdir(),'detuned-context-'));a=new Database(join(dir,'forum.db'));const boot=bootstrapDatabase(a);storage=new SqliteStorage(a);
    b=new Database(join(dir,'forum.db'));writer=new SqliteStorage(b);authService=new AuthService(storage,hash,clock);auth=authService.authenticateToken(boot.adminToken!);
    spaces=new SpaceService(storage,ids,clock,authService,new IdempotencyService(storage,hash,clock));
    const writerAuth=new AuthService(writer,hash,clock);writerSpaces=new SpaceService(writer,ids,clock,writerAuth,new IdempotencyService(writer,hash,clock));
    sid=spaces.createSpace(auth,{slug:'context',objective:'old objective',rules:['old rule']},'space').space.id;
    context=new ContextService(storage,signer,authService,secret);
  });
  afterEach(()=>{b.close();a.close();rmSync(dir,{recursive:true,force:true});});

  it('C01: a controlled second-connection commit cannot move checkpoint past unread rules',()=>{
    const oldSeq=storage.getLatestEventSeq(sid),readRevision=storage.getSpaceRevision.bind(storage);let committed=false;
    // Synchronous barrier: no sleeps or scheduling race. Commit after the old revision is read.
    storage.getSpaceRevision=(spaceId,revision)=>{
      const result=readRevision(spaceId,revision);
      if(!committed){committed=true;writerSpaces.patchSpace(auth,sid,{expected_revision:1,rules:['new rule']},'concurrent-rules');}
      return result;
    };
    const page=context.getContext(auth,sid,{}, {request_id:'snapshot-test'});
    expect(committed).toBe(true);expect(page.data.rules).toEqual(['old rule']);expect(page.data.space_revision_ref).toEqual({space_id:sid,revision:1});
    const events=new EventService(storage,ids,clock,signer,authService,secret);
    const sub=events.subscribe(auth,sid,{consumer_key:'snapshot-reader',start:'context_checkpoint',checkpoint_token:page.data.checkpoint_token});
    const delivery=events.poll(auth,sid,sub.consumer.id,{});
    console.log('C01 observed',JSON.stringify({old_seq:oldSeq,current_seq:writer.getLatestEventSeq(sid),rules:page.data.rules,checkpoint_seq:signer.verify(page.data.checkpoint_token,secret)?.seq,delivered:delivery.events.map(e=>({seq:e.seq,type:e.type}))}));
    // Actual checkpoint consumption must replay the concurrent change, not silently skip it.
    expect(delivery.events.some(event=>event.seq>oldSeq && event.type==='space.revised')).toBe(true);
    expect(signer.verify(page.data.checkpoint_token,secret)?.seq).toBe(oldSeq);
  });

  it('C02: oversized rules return a fixed reference that is readable within the same bounded budget',()=>{
    const rules=Array.from({length:12},()=> '中'.repeat(400));
    spaces.patchSpace(auth,sid,{expected_revision:1,rules},'large-rules');
    const page=context.getContext(auth,sid,{max_bytes:4096},{request_id:'unicode-"中'});
    expect(page.data).toMatchObject({space_revision_ref:{space_id:sid,revision:2},space_content_status:'omitted_for_budget',objective:null,rules:null});
    expect(page.meta.truncated).toBe(true);
    const read=new SpaceRevisionReadService(storage,signer,authService,secret,clock);
    let text='',cursor:string|undefined,pages=0;
    do {const part=read.getRevision(auth,sid,2,{max_bytes:4096,cursor},{request_id:'rules'});text+=part.data.chunk;cursor=part.meta.next_cursor??undefined;expect(++pages).toBeLessThan(30);}while(cursor);
    expect(JSON.parse(text)).toEqual({objective:'old objective',rules});
  });

  it('C03: core validates bounds and focused targets after current authorization',()=>{
    for(const value of [4095,65537,0,4096.5,NaN,null,'4096']) {
      expect(()=>context.getContext(auth,sid,{max_bytes:value} as ContextQuery,{request_id:'bounds'})).toThrow(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400}));
    }
    expect(()=>context.getContext(auth,sid,{focus_thread_id:'foreign-thread'},{request_id:'focus'})).toThrow(expect.objectContaining({statusCode:404}));
    for(const value of ['', '   ']) {
      expect(()=>context.getContext(auth,sid,{focus_thread_id:value},{request_id:'focus'})).toThrow(expect.objectContaining({statusCode:400}));
    }
    for(const max_bytes of [undefined,4096,65536]) {
      const page=context.getContext(auth,sid,{max_bytes},{request_id:'escaped-"中\\🙂'});
      expect(contextEnvelopeBytes('escaped-"中\\🙂',page)).toBeLessThanOrEqual(max_bytes??12288);
      expect(page.meta).toEqual({truncated:false,next_cursor:null});
    }
    const credentials=a.prepare('SELECT id FROM credentials').all() as {id:string}[];
    storage.revokeCredential(credentials[0].id,clock.nowIso());
    expect(()=>context.getContext(auth,sid,{focus_thread_id:'foreign'},{request_id:'auth-first'})).toThrow(expect.objectContaining({statusCode:401}));
  });

  it('C04: actual checkpoint subscription uses injected clock at and beyond expiry',()=>{
    let now=Date.now();const fakeClock={now:()=>new Date(now),nowIso:()=>new Date(now).toISOString()};
    let signedOutside=false;
    const checkedSigner={verify:signer.verify.bind(signer),sign:(payload:Record<string,unknown>,key:string)=>{signedOutside=!a.inTransaction;return signer.sign(payload,key);}};
    const timed=new ContextService(storage,checkedSigner,authService,secret,fakeClock);
    const page=timed.getContext(auth,sid,{}, {request_id:'clock'}), payload=signer.verify(page.data.checkpoint_token,secret)!;
    expect(signedOutside).toBe(true);expect(payload.exp).toBe(Math.floor(now/1000)+86400);
    const events=new EventService(storage,ids,fakeClock,signer,authService,secret);
    now=(payload.exp as number)*1000;
    expect(events.subscribe(auth,sid,{consumer_key:'at-expiry',start:'context_checkpoint',checkpoint_token:page.data.checkpoint_token}).consumer).toBeDefined();
    now+=1000;
    expect(()=>events.subscribe(auth,sid,{consumer_key:'after-expiry',start:'context_checkpoint',checkpoint_token:page.data.checkpoint_token})).toThrow(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:422}));
  });

  it('C05: snapshot nesting neither commits an outer write nor leaves a failed read transaction open',()=>{
    expect(()=>storage.transaction(()=>{
      a.prepare("UPDATE spaces SET slug='rolled-back' WHERE id=?").run(sid);
      storage.readSnapshot(()=>storage.readSnapshot(()=>{expect(a.inTransaction).toBe(true);expect(storage.findSpaceById(sid)?.slug).toBe('rolled-back');}));
      expect(a.inTransaction).toBe(true);throw new Error('outer failure');
    })).toThrow('outer failure');
    expect(a.inTransaction).toBe(false);expect(storage.findSpaceById(sid)?.slug).toBe('context');
    expect(()=>storage.readSnapshot(()=>{storage.findSpaceById(sid);throw new Error('read failure');})).toThrow('read failure');
    expect(a.inTransaction).toBe(false);
    expect(()=>storage.readSnapshot(()=>Promise.resolve(1))).toThrow(/synchronous/);
    expect(a.inTransaction).toBe(false);
    spaces.patchSpace(auth,sid,{expected_revision:1,objective:'after failure'},'after-failure');
    expect(storage.readSnapshot(()=>storage.getSpaceRevision(sid,2)?.objective)).toBe('after failure');
  });

  it('C06: optional items are removed from the tail in priority order without changing retained facts',()=>{
    const idem=new IdempotencyService(storage,hash,clock),tid=new ThreadService(storage,ids,clock,hash,authService,idem).createThread(auth,sid,{title:'materials'},'materials').thread.id;
    const posts=new PostService(storage,ids,clock,hash,authService,idem);
    const source=posts.createPost(auth,sid,tid,{kind:'note',title:'source',summary:'s',structured:{issue:'中'.repeat(350),impact:'impact'}},'source');
    const summary=posts.createPost(auth,sid,tid,{kind:'summary',title:'pin',summary:'full summary',structured:{source_refs:Array.from({length:40},()=>({post_id:source.post.id,revision:1}))}},'summary');
    spaces.patchSpace(auth,sid,{expected_revision:1,pinned_refs:[{post_id:summary.post.id,revision:1}]},'pin');
    storage.createRelation({id:'blocking',space_id:sid,source_post_id:source.post.id,source_revision:1,target_post_id:summary.post.id,target_revision:1,type:'challenges',state:'open',version:1,creator_id:auth.actor.id,created_at:clock.nowIso()});
    for(let i=0;i<3;i++) {
      const old=posts.createPost(auth,sid,tid,{kind:'note',title:`failure ${i}`,summary:'s'},`failure-${i}`);
      a.prepare("UPDATE posts SET kind='failure' WHERE id=?").run(old.post.id);
      a.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify({attempt:'中'.repeat(400)}),old.post.id);
    }
    const fixed={now:()=>new Date('2026-10-03T00:00:00Z'),nowIso:()=> '2026-10-03T00:00:00Z'};
    const service=new ContextService(storage,signer,authService,secret,fixed),request_id='priority-中';
    const full=service.getContext(auth,sid,{max_bytes:65536},{request_id});
    expect(full.data.pinned_summaries[0].source_refs).toHaveLength(40);
    expect(full.data.recent_failures[0]).toMatchObject({category:null,evidence_state:null,missing_fields:expect.arrayContaining(['category','evidence_state'])});
    const expected=structuredClone(full);
    for(const key of ['recent_activity','recent_failures','blocking_objections','pinned_summaries'] as const) {
      while(expected.data[key].length) {
        expected.data[key].pop();expected.meta.truncated=true;
        const cap=contextEnvelopeBytes(request_id,expected);
        if(cap<4096) break;
        const actual=service.getContext(auth,sid,{max_bytes:cap},{request_id});
        expect(actual).toEqual(expected);
        expect(Buffer.byteLength(serializeContextEnvelope(request_id,actual),'utf8')).toBe(cap);
      }
    }
    const smallest=service.getContext(auth,sid,{max_bytes:4096},{request_id});
    expect(smallest.data.pinned_summaries).toEqual([]);expect(smallest.meta.truncated).toBe(true);
  });

  it('C07: success and budget failure perform no entity, event, idempotency or acknowledgement writes',()=>{
    const fingerprint=()=>JSON.stringify(a.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row:any)=>[row.name,a.prepare(`SELECT * FROM "${row.name}"`).all()]));
    const before=fingerprint();context.getContext(auth,sid,{}, {request_id:'read-only'});expect(fingerprint()).toBe(before);
    expect(()=>context.getContext(auth,sid,{max_bytes:4096},{request_id:'中'.repeat(5000)})).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));
    expect(fingerprint()).toBe(before);
  });

});
