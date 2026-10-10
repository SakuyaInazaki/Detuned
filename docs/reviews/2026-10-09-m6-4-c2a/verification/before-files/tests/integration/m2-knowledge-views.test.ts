import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { AuthService, IdempotencyService, CryptoHasher, CryptoIdGenerator, SystemClock, SpaceService, ThreadService, PostService, SearchService, ContextService, HmacTokenSigner, AuthenticatedContext } from '@detuned/core';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';

describe('M2.2-B knowledge reading projections', () => {
  let db:Database.Database, storage:SqliteStorage, auth:AuthenticatedContext, as:AuthService, idem:IdempotencyService;
  let spaces:SpaceService, posts:PostService, views:SearchService, context:ContextService, sid:string, tid:string;
  const ids=new CryptoIdGenerator(),clock=new SystemClock(),hash=new CryptoHasher();
  const content={statement:'statement',assumptions:[],scope:'scope',falsification_plan:'plan'};
  const post=(kind:any,structured:any,key:string)=>posts.createPost(auth,sid,tid,{kind,title:key,summary:'s',structured},key);
  const relation=(source:any,target:any,type:any,key:string,targetRevision=1)=>storage.createRelation({id:key,space_id:sid,source_post_id:source.post.id,source_revision:1,target_post_id:target.post.id,target_revision:targetRevision,type,state:type==='challenges'?'open':'resolved',version:1,creator_id:auth.actor.id,created_at:clock.nowIso()});
  beforeEach(()=>{db=new Database(':memory:');const boot=bootstrapDatabase(db);storage=new SqliteStorage(db);as=new AuthService(storage,hash,clock);idem=new IdempotencyService(storage,hash,clock);auth=as.authenticateToken(boot.adminToken!);spaces=new SpaceService(storage,ids,clock,as,idem);sid=spaces.createSpace(auth,{slug:'views',objective:'o',rules:[]},'space').space.id;tid=new ThreadService(storage,ids,clock,hash,as,idem).createThread(auth,sid,{title:'t'},'thread').thread.id;posts=new PostService(storage,ids,clock,hash,as,idem);views=new SearchService(storage,as);context=new ContextService(storage,new HmacTokenSigner(),as,'test-secret');});
  afterEach(()=>db.close());
  it('V01: findings contain only claims, reports and fixed relation provenance, never certification',()=>{
    post('proposal',content,'proposal');const claim=post('claim',content,'claim'),source=post('note',{},'source');relation(source,claim,'supports','support');relation(source,claim,'reproduces','reproduction');relation(source,claim,'cites','citation');
    posts.createRevision(auth,sid,claim.post.id,{title:'new',summary:'s',structured:content,expected_revision:1},'claim-new');
    const items=views.getView(auth,sid,'findings').items;expect(items).toHaveLength(1);expect(items[0]).toMatchObject({type:'claim',report_kind:'author_report',formal_review_status:'not_enabled',formal_check_status:'not_enabled'});
    expect(items[0].relations).toHaveLength(2);expect(items[0].relations[0]).toMatchObject({target_ref:{post_id:claim.post.id,revision:1},target_has_newer_revision:true,source_author_id:auth.actor.id,creator_id:auth.actor.id});
  });
  it('V02: historical invalid fields become null/missing without inventing failure facts',()=>{
    const old=post('note',{},'legacy');db.prepare("UPDATE posts SET kind='failure' WHERE id=?").run(old.post.id);db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify({assumptions:[42],evidence_state:'invalid',attempt:5}),old.post.id);
    const item=views.getView(auth,sid,'failures').items[0];expect(item.material).toMatchObject({category:null,evidence_state:null,attempt:null,assumptions:null});expect(item.material.missing_fields).toContain('category');
    const recent=context.getContext(auth,sid,{},{request_id:'knowledge-test'}).data.recent_failures[0];expect(recent).toMatchObject({category:null,evidence_state:null,attempt:null,report_kind:'author_report'});
  });
  it('V03: pins require summary, keep fixed sources and distinguish summary vs source updates',()=>{
    const source=post('note',{},'pin-source'),summary=post('summary',{source_refs:[{post_id:source.post.id,revision:1}]},'summary');
    posts.createRevision(auth,sid,source.post.id,{title:'new source',summary:'s',expected_revision:1},'source-new');
    spaces.patchSpace(auth,sid,{expected_revision:1,pinned_refs:[{post_id:summary.post.id,revision:1},{post_id:source.post.id,revision:1},{post_id:'unknown',revision:1}]},'pin');
    const pinned=context.getContext(auth,sid,{},{request_id:'knowledge-test'}).data.pinned_summaries;expect(pinned).toHaveLength(1);expect(pinned[0]).toMatchObject({has_newer_revision:false,source_refs:[{ref:{post_id:source.post.id,revision:1},status:'active',has_newer_revision:true}]});
    db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(source.post.id);
    expect(context.getContext(auth,sid,{},{request_id:'knowledge-test'}).data.pinned_summaries[0].source_refs[0]).toMatchObject({status:'redacted',has_newer_revision:null});
  });
  it('V04: relation redaction preserves only tombstone facts, withdrawal stays open, nonpublic events are excluded',()=>{
    const target=post('claim',content,'target'),source=post('note',{issue:'secret issue',impact:'secret impact'},'challenge-source');relation(source,target,'challenges','challenge');
    posts.withdrawPost(auth,sid,source.post.id,{expected_revision:1,reason:'withdraw'},'withdraw');expect(views.getView(auth,sid,'open-questions').items[0]).toMatchObject({state:'open',source_status:'withdrawn'});
    db.prepare("UPDATE posts SET lifecycle='redacted' WHERE id=?").run(target.post.id);
    storage.appendEvent(sid,{id:'private',space_id:sid,type:'post.created',object_id:'secret-object',revision:1,visibility:'private' as any,actor_id:auth.actor.id,created_at:clock.nowIso()});
    const response=context.getContext(auth,sid,{},{request_id:'knowledge-test'}).data;expect(response.blocking_objections[0]).toMatchObject({issue:null,impact:null,missing_fields:['issue','impact']});expect(JSON.stringify(response)).not.toContain('secret issue');expect(response.recent_activity.some(e=>e.object_id==='secret-object')).toBe(false);
  });
  it('V05: unavailable sources conceal cross-space existence; malformed historical source arrays are null',()=>{
    const source=post('note',{},'local-source'),summary=post('summary',{source_refs:[{post_id:source.post.id,revision:1}]},'source-summary');
    const other=spaces.createSpace(auth,{slug:'other',objective:'o',rules:[]},'other').space.id;
    db.prepare('UPDATE posts SET space_id=? WHERE id=?').run(other,source.post.id);
    spaces.patchSpace(auth,sid,{expected_revision:1,pinned_refs:[{post_id:summary.post.id,revision:1}]},'pin-other');
    expect(context.getContext(auth,sid,{},{request_id:'knowledge-test'}).data.pinned_summaries[0].source_refs).toEqual([{ref:{post_id:source.post.id,revision:1},status:'unavailable',has_newer_revision:null}]);
    db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify({source_refs:[{post_id:source.post.id,revision:'1',unknown:true}]}),summary.post.id);
    expect(context.getContext(auth,sid,{},{request_id:'knowledge-test'}).data.pinned_summaries[0]).toMatchObject({source_refs:null,missing_fields:['source_refs']});
    const target=post('claim',content,'filter-target');relation(source,target,'supports','cross-relation');
    expect(views.getView(auth,sid,'findings').items[0].relations).toEqual([]);
  });
  it('V06: hard budget removes whole pins and a larger budget preserves all source facts',()=>{
    const source=post('note',{},'budget-source'),refs=Array.from({length:40},()=>({post_id:source.post.id,revision:1}));
    const summary=post('summary',{source_refs:refs},'budget-summary');
    spaces.patchSpace(auth,sid,{expected_revision:1,pinned_refs:[{post_id:summary.post.id,revision:1}]},'budget-pin');
    const result=context.getContext(auth,sid,{max_bytes:4096},{request_id:'knowledge-budget'});
    expect(result.data.pinned_summaries).toEqual([]);expect(result.meta.truncated).toBe(true);
    expect(Buffer.byteLength(JSON.stringify({api_version:'1',request_id:'knowledge-budget',...result}),'utf8')).toBeLessThanOrEqual(4096);
    expect(context.getContext(auth,sid,{max_bytes:65536},{request_id:'knowledge-budget'}).data.pinned_summaries[0].source_refs).toHaveLength(40);
    expect(result.data.recent_activity).toEqual([]);
    expect(context.getContext(auth,sid,{max_bytes:65536},{request_id:'knowledge-budget'}).meta.truncated).toBe(false);
  });
  it('V07: reason optionality and historical arrays retain known-empty versus unknown meaning',()=>{
    const old=post('note',{},'reason');db.prepare("UPDATE posts SET kind='failure' WHERE id=?").run(old.post.id);
    const write=(structured:any)=>db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=?').run(JSON.stringify(structured),old.post.id);
    write({evidence_state:'provided',assumptions:[],evidence_refs:[]});let material=views.getView(auth,sid,'failures').items[0].material;
    expect(material.assumptions).toEqual([]);expect(material.evidence_missing_reason).toBeNull();expect(material.missing_fields).not.toContain('evidence_missing_reason');
    write({evidence_state:'unverified',evidence_missing_reason:'  ',assumptions:['ok',42]});material=views.getView(auth,sid,'failures').items[0].material;
    expect(material.assumptions).toBeNull();expect(material.evidence_missing_reason).toBeNull();expect(material.missing_fields).toContain('evidence_missing_reason');
  });

});
