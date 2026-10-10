import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, SpaceRevisionReadService, ThreadService, PostService, ContextService, HmacTokenSigner, AuthenticatedContext } from '@detuned/core';
import { SpaceRevisionPage, encodeSpaceRulesDocument, spaceRevisionEnvelopeBytes, serializeSpaceRevisionEnvelope, SPACE_REVISION_CURSOR_ERROR_MESSAGE } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';

describe('M2.4-B.1 fixed space revision references and rules continuation',()=>{
  let db:Database.Database,storage:SqliteStorage,auth:AuthenticatedContext,as:AuthService,spaces:SpaceService,context:ContextService,read:SpaceRevisionReadService,sid:string;
  const ids=new CryptoIdGenerator(),clock=new SystemClock(),hash=new CryptoHasher(),secret='space-rules-test-secret';
  beforeEach(()=>{
    db=new Database(':memory:');storage=new SqliteStorage(db);const boot=bootstrapDatabase(db);as=new AuthService(storage,hash,clock);auth=as.authenticateToken(boot.adminToken!);
    spaces=new SpaceService(storage,ids,clock,as,new IdempotencyService(storage,hash,clock));sid=spaces.createSpace(auth,{slug:'rules',objective:'objective',rules:['first rule']},'space').space.id;
    context=new ContextService(storage,new HmacTokenSigner(),as,secret,clock);read=new SpaceRevisionReadService(storage,new HmacTokenSigner(),as,secret,clock);
  });
  afterEach(()=>db.close());

  it('S01: large mandatory rules return an explicit fixed reference instead of having no bounded context path',()=>{
    spaces.patchSpace(auth,sid,{expected_revision:1,rules:Array.from({length:12},()=> '中'.repeat(400))},'large-rules');
    let page:unknown,error:unknown;
    try{page=context.getContext(auth,sid,{max_bytes:4096},{request_id:'rules-before'});}catch(e){error=e;}
    expect(error).toBeUndefined();
    expect(page).toMatchObject({data:{space_revision_ref:{space_id:sid,revision:2},space_content_status:'omitted_for_budget',objective:null,rules:null},meta:{truncated:true}});
  });

  it('S02: normal context includes its actual content revision reference, distinct from policy_revision',()=>{
    spaces.patchSpace(auth,sid,{expected_revision:1,pinned_refs:[]},'pin-only');
    const page=context.getContext(auth,sid,{}, {request_id:'ref-before'});
    expect(page.data.policy_revision).toBe(1);
    expect(page.data).toMatchObject({space_revision_ref:{space_id:sid,revision:2},space_content_status:'included',rules:['first rule']});
  });

  const joinPages=(service:SpaceRevisionReadService,revision:number,budget=4096,afterFirst?:()=>void)=>{
    let cursor:string|undefined,joined='',end=0,pages=0;
    do {
      const page=service.getRevision(auth,sid,revision,{max_bytes:budget,cursor},{request_id:'实际ID"\\中🙂'});
      expect(page.data.ref).toEqual({space_id:sid,revision});expect(page.data.start_byte).toBe(end);
      expect(page.data.end_byte).toBeGreaterThan(end);expect(Buffer.byteLength(page.data.chunk)).toBe(page.data.end_byte-end);
      expect(spaceRevisionEnvelopeBytes('实际ID"\\中🙂',page)).toBeLessThanOrEqual(budget);
      expect(Buffer.byteLength(serializeSpaceRevisionEnvelope('实际ID"\\中🙂',page))).toBeLessThanOrEqual(budget);
      expect(page.meta.truncated).toBe(!page.data.complete);
      joined+=page.data.chunk;end=page.data.end_byte;pages++;
      if(pages===1)afterFirst?.();
      cursor=page.meta.next_cursor??undefined;expect(pages).toBeLessThan(100);
    }while(cursor);
    return {text:joined,pages};
  };

  it('S03: UTF8-safe pages reconstruct fixed rules including JSON escapes while current revision changes',()=>{
    const document={objective:'目标🙂"\\\n\t\0孤'+String.fromCharCode(0xd800),rules:Array.from({length:20},(_,i)=>`${i}中🙂"\\\n`.repeat(45)+String.fromCharCode(0xd800))};
    spaces.patchSpace(auth,sid,{expected_revision:1,...document},'unicode');
    const stored=storage.getSpaceRevision(sid,2)!;const expected={objective:stored.objective,rules:stored.rules};
    // SQLite TEXT already replaces an isolated surrogate in objective; JSON rules preserve it.
    expect(stored.objective.endsWith('\ufffd')).toBe(true);expect(stored.rules[0].charCodeAt(stored.rules[0].length-1)).toBe(0xd800);
    const result=joinPages(read,2,4096,()=>spaces.patchSpace(auth,sid,{expected_revision:2,objective:'new objective',rules:['new rule']},'newer'));
    expect(result.pages).toBeGreaterThan(2);expect(result.text).toBe(encodeSpaceRulesDocument(expected));expect(JSON.parse(result.text)).toEqual(expected);
    expect(joinPages(read,2,65536).text).toBe(result.text);
    const first=read.getRevision(auth,sid,2,{}, {request_id:'default'});expect(spaceRevisionEnvelopeBytes('default',first)).toBeLessThanOrEqual(12288);
  });

  it('S04: empty rules and empty rule strings remain exact, with no optional configuration exposure',()=>{
    for(const [i,rules] of [[],[''],['','规则','']].entries()) {
      spaces.patchSpace(auth,sid,{expected_revision:i+1,rules},`empty-${i}`);
      const joined=joinPages(read,i+2);expect(JSON.parse(joined.text)).toEqual({objective:'objective',rules});expect(Object.keys(JSON.parse(joined.text))).toEqual(['objective','rules']);
    }
  });

  it('S05: tampering, wrong bindings, invalid payloads and signed non-boundary positions fail uniformly',()=>{
    spaces.patchSpace(auth,sid,{expected_revision:1,rules:Array.from({length:12},()=> '中'.repeat(400))},'cursor-rules');
    const signer=new HmacTokenSigner(),first=read.getRevision(auth,sid,2,{max_bytes:4096},{request_id:'cursor'}),token=first.meta.next_cursor!;
    const payload=signer.verify(token,secret)!;const bytes=Buffer.from(encodeSpaceRulesDocument({objective:'objective',rules:Array.from({length:12},()=> '中'.repeat(400))}));
    const split=bytes.findIndex(byte=>(byte&0xc0)===0x80);
    const altered=[{v:2},{purpose:'search'},{actor_id:'other'},{space_id:'other'},{revision:1},{byte_offset:0},{byte_offset:bytes.length},{byte_offset:split},{exp:0},{exp:Math.floor(Date.now()/1000)+172800},{unknown:'key'}];
    for(const patch of altered) {
      expect(()=>read.getRevision(auth,sid,2,{cursor:signer.sign({...payload,...patch},secret)},{request_id:'cursor'})).toThrow(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400,retryable:false,message:SPACE_REVISION_CURSOR_ERROR_MESSAGE}));
    }
    for(const cursor of ['', ' ', 'x'.repeat(4097),token+'x','12']) {
      expect(()=>read.getRevision(auth,sid,2,{cursor},{request_id:'cursor'})).toThrow(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400,message:SPACE_REVISION_CURSOR_ERROR_MESSAGE}));
    }
    const other=spaces.createSpace(auth,{slug:'other',objective:'o',rules:[]},'other').space.id;
    expect(()=>read.getRevision(auth,other,1,{cursor:token},{request_id:'other'})).toThrow(expect.objectContaining({statusCode:400}));
    expect(()=>read.getRevision(auth,sid,999,{}, {request_id:'missing'})).toThrow(expect.objectContaining({statusCode:404}));
  });

  it('S06: each page rechecks identity, read capability and membership before inspecting cursor',()=>{
    const actor={id:'act_reader',kind:'human' as const,display_name:'reader',created_at:clock.nowIso(),disabled_at:null};storage.createActor(actor);
    const credential={id:'cred_reader',actor_id:actor.id,token_hash:hash.sha256('reader'),allowed_space_ids:[sid],capabilities:['read' as const],created_at:clock.nowIso(),expires_at:null,revoked_at:null};storage.createCredential(credential);
    const reader={actor,credential},member={space_id:sid,actor_id:actor.id,role:'observer' as const,active:true,reviewer_eligible:false,independence_group:null};storage.upsertMembership(member);
    spaces.patchSpace(auth,sid,{expected_revision:1,rules:Array.from({length:12},()=> '中'.repeat(400))},'reader-rules');
    const first=read.getRevision(reader,sid,2,{max_bytes:4096},{request_id:'reader'});expect(first.data.complete).toBe(false);
    storage.upsertMembership({...member,active:false});expect(()=>read.getRevision(reader,sid,2,{cursor:'bad'},{request_id:'reader'})).toThrow(expect.objectContaining({statusCode:404}));
    storage.upsertMembership(member);
    db.prepare("UPDATE credentials SET capabilities='[\"write\"]' WHERE id=?").run(credential.id);
    expect(()=>read.getRevision(reader,sid,2,{cursor:'bad'},{request_id:'reader'})).toThrow(expect.objectContaining({statusCode:403}));
    db.prepare("UPDATE credentials SET capabilities='[\"read\"]' WHERE id=?").run(credential.id);
    storage.revokeCredential(credential.id,clock.nowIso());expect(()=>read.getRevision(reader,sid,2,{cursor:first.meta.next_cursor!},{request_id:'reader'})).toThrow(expect.objectContaining({statusCode:401}));
  });

  it('S07: multiple nonterminal pages preserve initial expiry as clock advances and budgets change',()=>{
    spaces.patchSpace(auth,sid,{expected_revision:1,rules:Array.from({length:20},()=> '中🙂'.repeat(100))},'ttl-rules');
    let now=Date.now();const fake={now:()=>new Date(now),nowIso:()=>new Date(now).toISOString()},signer=new HmacTokenSigner();
    const timed=new SpaceRevisionReadService(storage,signer,as,secret,fake);
    const first=timed.getRevision(auth,sid,2,{max_bytes:4096},{request_id:'ttl'});expect(first.data.complete).toBe(false);
    const exp=signer.verify(first.meta.next_cursor!,secret,now/1000)!.exp;
    now+=3600000;
    const second=timed.getRevision(auth,sid,2,{max_bytes:4096,cursor:first.meta.next_cursor!},{request_id:'ttl'});expect(second.data.complete).toBe(false);
    expect(signer.verify(second.meta.next_cursor!,secret,now/1000)!.exp).toBe(exp);
    const larger=timed.getRevision(auth,sid,2,{max_bytes:65536,cursor:second.meta.next_cursor!},{request_id:'ttl'});expect(larger.data.complete).toBe(true);
    expect(JSON.parse(first.data.chunk+second.data.chunk+larger.data.chunk)).toEqual({objective:'objective',rules:Array.from({length:20},()=> '中🙂'.repeat(100))});
    now=(exp as number)*1000;expect(timed.getRevision(auth,sid,2,{cursor:second.meta.next_cursor!},{request_id:'ttl'})).toBeDefined();
    now+=1000;expect(()=>timed.getRevision(auth,sid,2,{cursor:second.meta.next_cursor!},{request_id:'ttl'})).toThrow(expect.objectContaining({statusCode:400}));
  });

  it('S08: rule omission preserves optional candidates; minimum metadata failures and reads never write',()=>{
    const idem=new IdempotencyService(storage,hash,clock),tid=new ThreadService(storage,ids,clock,hash,as,idem).createThread(auth,sid,{title:'t'},'thread').thread.id;
    const post=new PostService(storage,ids,clock,hash,as,idem),note=post.createPost(auth,sid,tid,{kind:'note',title:'source',summary:'s'},'source');
    const pin=post.createPost(auth,sid,tid,{kind:'summary',title:'pin',summary:'s',structured:{source_refs:[{post_id:note.post.id,revision:1}]}},'pin');
    spaces.patchSpace(auth,sid,{expected_revision:1,rules:Array.from({length:12},()=> '中'.repeat(400)),pinned_refs:[{post_id:pin.post.id,revision:1}]},'large-with-pin');
    const fingerprint=()=>JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row:any)=>[row.name,db.prepare(`SELECT * FROM "${row.name}"`).all()]));
    const before=fingerprint(),page=context.getContext(auth,sid,{max_bytes:4096},{request_id:'keep-pin'});
    expect(page.data.space_content_status).toBe('omitted_for_budget');expect(page.data.pinned_summaries).toHaveLength(1);expect(page.data.recent_activity.length).toBeGreaterThan(0);
    expect(joinPages(read,2).text).toBe(encodeSpaceRulesDocument(storage.getSpaceRevision(sid,2)!));
    expect(()=>read.getRevision(auth,sid,2,{max_bytes:4096},{request_id:'中'.repeat(5000)})).toThrow(expect.objectContaining({statusCode:422,code:'QUERY_TOO_BROAD'}));
    expect(()=>context.getContext(auth,sid,{max_bytes:4096},{request_id:'中'.repeat(5000)})).toThrow(expect.objectContaining({statusCode:422,code:'QUERY_TOO_BROAD'}));
    expect(fingerprint()).toBe(before);
  });

});
