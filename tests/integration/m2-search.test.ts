import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, SearchService, HmacTokenSigner, AuthenticatedContext } from '@detuned/core';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';

describe('M2.3 product search semantics and bound cursors',()=>{
  let db:Database.Database,storage:SqliteStorage,auth:AuthenticatedContext,as:AuthService,idem:IdempotencyService,posts:PostService,spaces:SpaceService,sid:string,tid:string;
  const ids=new CryptoIdGenerator(),clock=new SystemClock(),hash=new CryptoHasher();
  const add=(title:string,tags:string[]=[],kind:any='note',body='')=>posts.createPost(auth,sid,tid,{kind,title,summary:'summary',body,tags},title);
  beforeEach(()=>{db=new Database(':memory:');const boot=bootstrapDatabase(db);storage=new SqliteStorage(db);as=new AuthService(storage,hash,clock);idem=new IdempotencyService(storage,hash,clock);auth=as.authenticateToken(boot.adminToken!);spaces=new SpaceService(storage,ids,clock,as,idem);sid=spaces.createSpace(auth,{slug:'search',objective:'o',rules:[]},'space').space.id;tid=new ThreadService(storage,ids,clock,hash,as,idem).createThread(auth,sid,{title:'t'},'thread').thread.id;posts=new PostService(storage,ids,clock,hash,as,idem);});
  afterEach(()=>db.close());
  it('S01: tags are exact all-match properties before paging, not FTS text',()=>{
    const yes=add('needle yes',['Case','a,b']),no=add('needle no',['case','a','b']);
    expect(storage.searchPosts(sid,'needle',{tags:['Case','a,b']},1).items.map(p=>p.post_id)).toEqual([yes.post.id]);
    expect(storage.searchPosts(sid,'needle',{tags:[]}).items).toHaveLength(2);
    expect(storage.searchPosts(sid,'needle',{tags:['Case','Case']}).items.map(p=>p.post_id)).toEqual([yes.post.id]);
    expect(storage.searchPosts(sid,'needle',{tags:['case']}).items.map(p=>p.post_id)).toEqual([no.post.id]);
  });
  it('S02: 1/2/3+ Unicode codepoints and literal symbols match product content including tags',()=>{
    const item=add('图失败零权边 😀图 😀图论 😀😀 % _ \\ " AND a*b',['标签']);
    for(const q of ['图','失败','零权边','😀','😀图','😀图论','😀😀','%','_','\\','"','AND','a*b','标签']) expect(storage.searchPosts(sid,q).items.map(p=>p.post_id)).toContain(item.post.id);
    expect(storage.searchPosts(sid,'NOT absent').items).toEqual([]);
  });
  const searchService=(limits?:{max_candidates:number;max_response_bytes:number})=>new SearchService(storage,as,{signer:new HmacTokenSigner(),secret:'search-test-secret',clock,hasher:hash},limits);
  it('S03: signed keyset pages bind actor/space/query/filters and permit equivalent tag order',()=>{
    for(let i=0;i<5;i++)add(`needle-${i}`,['a','b']);
    const service=searchService();const first=service.search(auth,sid,{q:' needle ',tags:['b','a','a'],limit:2});
    expect(first.items).toHaveLength(2);expect(first.next_cursor).toContain('.');
    const second=service.search(auth,sid,{q:'needle',tags:['a','b'],limit:1,cursor:first.next_cursor!});
    const third=service.search(auth,sid,{q:'needle',tags:['a','b'],limit:2,cursor:second.next_cursor!});
    expect([...first.items,...second.items,...third.items].map(i=>i.post_id)).toEqual(storage.searchPosts(sid,'needle').items.map(i=>i.post_id));expect(third.next_cursor).toBeNull();
    for(const req of [{q:'other',tags:['a','b']},{q:'needle',tags:['a']},{q:'needle',tags:['a','b'],thread_id:'other'}]) expect(()=>service.search(auth,sid,{...req,cursor:first.next_cursor!})).toThrowError(expect.objectContaining({statusCode:400,code:'VALIDATION_ERROR',retryable:false}));
    expect(()=>service.search(auth,sid,{q:'needle',cursor:first.items[0].post_id})).toThrowError(expect.objectContaining({statusCode:400}));
  });
  it('S04: query cardinality and encoded items excess fail explicitly, not a partial-prefix empty result',()=>{
    add('unrelated-1');add('unrelated-2');add('far-z',['narrow']);
    expect(()=>searchService({max_candidates:2,max_response_bytes:262144}).search(auth,sid,{q:'z'})).toThrowError(expect.objectContaining({code:'QUERY_TOO_BROAD',statusCode:422}));
    expect(searchService({max_candidates:2,max_response_bytes:262144}).search(auth,sid,{q:'z',tags:['narrow']}).items).toHaveLength(1);
    expect(()=>searchService({max_candidates:5000,max_response_bytes:1}).search(auth,sid,{q:'far-z'})).toThrowError(expect.objectContaining({code:'QUERY_TOO_BROAD',statusCode:422}));
    // Internal empty-query views keep their old behavior and do not need a signer.
    expect(new SearchService(storage,as).getView(auth,sid,'findings').items).toEqual([]);
    expect(()=>new SearchService(storage,as).search(auth,sid,{q:'z'})).toThrowError(expect.objectContaining({code:'TEMPORARILY_UNAVAILABLE',statusCode:500}));
  });

  it('S05: altered, expired, wrong-purpose cursors all fail identically, while current permission comes first',()=>{
    add('needle-1');add('needle-2');const service=searchService();const first=service.search(auth,sid,{q:'needle',limit:1});const signer=new HmacTokenSigner();
    const payload=signer.verify(first.next_cursor!,'search-test-secret')!;
    const variants=[first.next_cursor!+'x',signer.sign({...payload,exp:0},'search-test-secret'),signer.sign({...payload,purpose:'checkpoint'},'search-test-secret'),signer.sign({...payload,actor_id:'other'},'search-test-secret'),signer.sign({...payload,space_id:'other'},'search-test-secret'),signer.sign({...payload,extra:true},'search-test-secret')];
    for(const cursor of variants)expect(()=>service.search(auth,sid,{q:'needle',cursor})).toThrowError(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400,retryable:false,message:'搜索游标无效，请去掉 cursor 重新获取第一页。'}));
    storage.revokeCredential(auth.credential.id,clock.nowIso());expect(()=>service.search(auth,sid,{q:'needle',cursor:'bad'})).toThrowError(expect.objectContaining({statusCode:401}));
  });
  it('S06: current revisions, withdrawal and redaction remove old content in both branches',()=>{
    const item=add('旧词旧针 oldneedle',['旧标']);
    for(const q of ['旧','oldneedle'])expect(searchService().search(auth,sid,{q}).items).toHaveLength(1);
    posts.createRevision(auth,sid,item.post.id,{title:'新记录 newneedle',summary:'s',tags:['新标'],expected_revision:1},'rev');
    for(const q of ['旧','oldneedle','旧标'])expect(searchService().search(auth,sid,{q}).items).toEqual([]);
    posts.withdrawPost(auth,sid,item.post.id,{expected_revision:2,reason:'withdraw'},'withdraw');
    for(const q of ['新','newneedle'])expect(searchService().search(auth,sid,{q}).items).toEqual([]);
    const red=add('密 secretneedle',['secret']);db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(red.post.id);storage.updatePost({...red.post,lifecycle:'redacted'});
    for(const q of ['密','secretneedle'])expect(searchService().search(auth,sid,{q}).items).toEqual([]);
  });
  it('S07: properties combine before limit, and matching candidate excess is explicit on FTS',()=>{
    const yes=add('needle match',['exact'],'question');add('needle wrongtype',['exact']);add('needle wrongtag',['other'],'question');
    const service=searchService();expect(service.search(auth,sid,{q:'needle',kind:'question',tags:['exact'],thread_id:tid,limit:1}).items.map(i=>i.post_id)).toEqual([yes.post.id]);
    expect(()=>searchService({max_candidates:2,max_response_bytes:262144}).search(auth,sid,{q:'needle'})).toThrowError(expect.objectContaining({code:'QUERY_TOO_BROAD'}));
  });
  it('S08: signer accepts an injected clock without changing default older calls; nonASCII case behavior is explicit',()=>{
    const signer=new HmacTokenSigner();const token=signer.sign({exp:20},'clock');expect(signer.verify(token,'clock',10)).toEqual({exp:20});expect(signer.verify(token,'clock',21)).toBeNull();expect(signer.verify(token,'clock')).toBeNull();
    add('Æbc');add('æbc');expect(storage.searchPosts(sid,'Æ').items).toHaveLength(1);expect(storage.searchPosts(sid,'Æbc').items).toHaveLength(2);
  });

  it('S09: Unicode query length is codepoints, with trim but no normalization',()=>{
    add('unicode-length',[], 'note','😀'.repeat(256));const service=searchService();
    expect(service.search(auth,sid,{q:'  '+'😀'.repeat(129)+'  '}).items).toHaveLength(1);
    expect(service.search(auth,sid,{q:'😀'.repeat(256)}).items).toHaveLength(1);
    expect(()=>service.search(auth,sid,{q:'😀'.repeat(257)})).toThrowError(expect.objectContaining({code:'VALIDATION_ERROR',statusCode:400}));
  });

});
