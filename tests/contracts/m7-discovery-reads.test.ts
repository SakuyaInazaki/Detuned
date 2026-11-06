import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient,ClientProtocolError} from '@detuned/client';
import {validateMcpToolArguments,getMcpTools} from '../../packages/mcp/src/tool-validation.js';
let db:Database.Database,app:ReturnType<typeof buildApp>,admin:DetunedClient,a:DetunedClient,b:DetunedClient,sid:string,tid:string,pid:string,qid:string;
beforeEach(async()=>{db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;app=buildApp({storage:new SqliteStorage(db)});const url=await app.listen({host:'127.0.0.1',port:0});admin=new DetunedClient({baseUrl:url,token,maxRetries:0});sid=(await admin.createSpace({slug:'discovery',objective:'discovery',rules:[]},'space')).data.space.id;
 const clients=[];for(const label of ['a','b']){const actor=await admin.createActor({kind:'agent',display_name:label});await admin.createMembership(sid,{actor_id:actor.id,role:'contributor'});const credential=await admin.createCredential({actor_id:actor.id,allowed_space_ids:[sid],capabilities:['read','write']});clients.push(new DetunedClient({baseUrl:url,token:credential.token,maxRetries:0}));}a=clients[0]!;b=clients[1]!;
 tid=(await a.createThread(sid,{title:'t'},'thread')).data.thread.id;pid=(await a.createPost(sid,tid,{kind:'note',title:'p',summary:'s',body:'b'},'p')).data.post.id;qid=(await b.createPost(sid,tid,{kind:'note',title:'q',summary:'s',body:'b'},'q')).data.post.id;
});
afterEach(async()=>{vi.unstubAllGlobals();await app.close();db.close();});
const rows=()=>Object.fromEntries(['sessions','subscriptions','consumers','delivery_batches','events','posts','post_revisions','relations','relation_resolutions'].map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
it('M7.10-A global read tools expose identity/spaces without requiring space or writing',async()=>{
 const before=rows();const me=await a.callTool('forum_read',{kind:'me'});expect(me.actor.display_name).toBe('a');expect(me.visible_spaces.map((s:any)=>s.id)).toContain(sid);
 const spaces=await a.callTool('forum_read',{kind:'spaces',limit:1});expect(spaces.data.map((s:any)=>s.id)).toEqual([sid]);expect(spaces.meta.next_cursor).toBeNull();expect(rows()).toEqual(before);expect(getMcpTools()).toHaveLength(9);
 for(const mode of ['flat','wrapped'] as const)expect(validateMcpToolArguments('forum_read',mode==='flat'?{kind:'me'}:{input:{kind:'me'}},mode)).toEqual({kind:'me'});
});
it('M7.10-A all six relation kinds are readable and fixed revision directory paginates',async()=>{
 const ids=[];for(const type of ['cites','supports','challenges','supersedes','reproduces','addresses'] as const){ids.push((await a.createRelation(sid,{type,source_ref:{post_id:pid,revision:1},target_ref:{post_id:qid,revision:1}},type)).data.id);}
 const before=rows();const relation=await b.callTool('forum_read',{kind:'relation',space_id:sid,id:ids[0]});expect(relation).toMatchObject({relation_id:ids[0],relation_type:'cites',source_ref:{post_id:pid,revision:1},target_ref:{post_id:qid,revision:1}});
 const all=[];let cursor:string|undefined;do{const page=await b.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:1,direction:'out',limit:2,max_bytes:4096,...(cursor?{cursor}:{})});all.push(...page.data.relations);cursor=page.meta.next_cursor??undefined;}while(cursor);
 expect(all.map((r:any)=>r.relation_id)).toEqual([...ids].sort());expect(new Set(all.map((r:any)=>r.relation_type)).size).toBe(6);expect(rows()).toEqual(before);
 const incoming=await b.callTool('forum_read',{kind:'post_relations',space_id:sid,id:qid,revision:1,direction:'in'});expect(incoming.data.relations).toHaveLength(6);
});
it('M7.10-A consumer key recovery is current actor exact filters and never moves state',async()=>{
 const existing=await a.subscribe(sid,{consumer_key:'remembered',thread_ids:[tid],start:'beginning'});await a.poll(sid,existing.data.consumer.id,{limit:1});const before=rows();
 const recovered=await a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]});expect(recovered).toMatchObject({subscription:existing.data.subscription,consumer:{id:existing.data.consumer.id},resync_required:false});expect(rows()).toEqual(before);
 await expect(b.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]})).rejects.toMatchObject({code:'NOT_FOUND'});
 await expect(a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered'})).rejects.toMatchObject({code:'NOT_FOUND'});
 db.prepare('UPDATE spaces SET acl_epoch=acl_epoch+1 WHERE id=?').run(sid);const changed=rows();const stale=await a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'remembered',thread_ids:[tid]});expect(stale.resync_required).toBe(true);expect(rows()).toEqual(changed);await expect(a.poll(sid,existing.data.consumer.id)).rejects.toMatchObject({code:'RESYNC_REQUIRED'});
});
it('M7.10-A relation cursors bind actor, direction, revision and current authorization',async()=>{
 for(const type of ['cites','supports','addresses'] as const)await a.createRelation(sid,{type,source_ref:{post_id:pid,revision:1},target_ref:{post_id:qid,revision:1}},type);
 const page=await a.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:1,limit:1,direction:'out'});expect(page.meta.next_cursor).toEqual(expect.any(String));
 for(const [c,extra] of [[b,{}],[a,{direction:'in'}],[a,{revision:2}]] as const)await expect(c.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:1,direction:'out',cursor:page.meta.next_cursor,...extra})).rejects.toMatchObject({statusCode:extra.revision===2?404:400});
 const other=(await admin.createSpace({slug:'foreign',objective:'private',rules:[]},'foreign')).data.space.id;
 await expect(b.callTool('forum_read',{kind:'post_relations',space_id:other,id:pid,revision:1})).rejects.toMatchObject({code:'NOT_FOUND'});
 const before=rows();await expect(a.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:1,cursor:'forged'})).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(rows()).toEqual(before);
});
it('M7.10-A self relations appear once and new post revisions do not retarget old edges',async()=>{
 const relation=(await a.createRelation(sid,{type:'cites',source_ref:{post_id:pid,revision:1},target_ref:{post_id:pid,revision:1}},'self')).data;
 await a.createPostRevision(sid,pid,{expected_revision:1,title:'new',summary:'s',body:'b'},'revision');
 const old=await a.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:1,direction:'both'});expect(old.data.relations).toHaveLength(1);expect(old.data.relations[0]).toMatchObject({relation_id:relation.id,source_has_newer_revision:true,target_has_newer_revision:true});
 expect((await a.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:2})).data.relations).toEqual([]);
});
it('M7.10-A consumer lookup preserves filter multiplicity and deleted consumer remains absent',async()=>{
 const single=await a.subscribe(sid,{consumer_key:'same',thread_ids:[tid],event_types:['post.created']});const duplicate=await a.subscribe(sid,{consumer_key:'same',thread_ids:[tid,tid],event_types:['post.created']});expect(single.data.consumer.id).not.toBe(duplicate.data.consumer.id);
 const before=rows();const result=await a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'same',thread_ids:[tid,tid],event_types:['post.created']});expect(result.consumer.id).toBe(duplicate.data.consumer.id);expect(rows()).toEqual(before);
 await a.deactivateConsumer(sid,duplicate.data.consumer.id);const deleted=rows();await expect(a.callTool('forum_read',{kind:'consumer_lookup',space_id:sid,consumer_key:'same',thread_ids:[tid,tid],event_types:['post.created']})).rejects.toMatchObject({code:'NOT_FOUND'});expect(rows()).toEqual(deleted);
});
it('M7.10-A HTTP relation page budget and redacted endpoint tombstones are exact',async()=>{
 const ids=[];for(const type of ['cites','supports','challenges','supersedes','reproduces','addresses'] as const)ids.push((await a.createRelation(sid,{type,source_ref:{post_id:pid,revision:1},target_ref:{post_id:qid,revision:1}},type)).data.id);
 const response=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/posts/${pid}/revisions/1/relations?direction=out&max_bytes=4096`,headers:{authorization:`Bearer ${(a as any).token}`}});expect(response.statusCode).toBe(200);expect(Buffer.byteLength(response.body)).toBeLessThanOrEqual(4096);expect(response.json().data.relations.length).toBeGreaterThan(0);
 await admin.redact(sid,{target_type:'post',target_id:qid,reason:'redaction'},'redact-q');
 const tombstone=await a.callTool('forum_read',{kind:'relation',space_id:sid,id:ids[0]});expect(tombstone).toMatchObject({target_status:'redacted',target_has_newer_revision:null});expect(tombstone).not.toHaveProperty('body');expect(JSON.stringify(tombstone)).not.toContain('content_hash');
 await expect(a.callTool('forum_read',{kind:'post_relations',space_id:sid,id:qid,revision:1})).rejects.toMatchObject({code:'CONTENT_REDACTED'});
});
it('M7.10-A thread titles are explicit metadata opt-in and default bytes stay unchanged',async()=>{
 const before=await a.getThreadPosts(sid,tid);expect(before.data.posts.every(post=>!('title' in post))).toBe(true);
 const rich=await a.callTool('forum_read',{kind:'thread_posts',space_id:sid,id:tid,include_titles:true});expect(rich.data.posts.find((post:any)=>post.id===pid)).toMatchObject({title:'p',current_revision:1});
 expect(JSON.stringify(await a.getThreadPosts(sid,tid))).toBe(JSON.stringify(before));
 await a.createPostRevision(sid,pid,{expected_revision:1,title:'p-new',summary:'s',body:'b'},'title-revision');const newer=await a.callTool('forum_read',{kind:'thread_posts',space_id:sid,id:tid,include_titles:true});expect(newer.data.posts.find((post:any)=>post.id===pid)).toMatchObject({title:'p-new',current_revision:2});
 await admin.redact(sid,{target_type:'post',target_id:pid,reason:'hide title'},'hide-title');const hidden=await a.callTool('forum_read',{kind:'thread_posts',space_id:sid,id:tid,include_titles:true});expect(hidden.data.posts.find((post:any)=>post.id===pid)).not.toHaveProperty('title');
});
it('M7.10-A thread directory cursors bind title mode without changing default cursors',async()=>{
 const plain=await a.getThreadPosts(sid,tid,{limit:1});expect(plain.meta.next_cursor).toEqual(expect.any(String));
 await expect(a.callTool('forum_read',{kind:'thread_posts',space_id:sid,id:tid,include_titles:true,limit:1,cursor:plain.meta.next_cursor})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
 const rich=await a.callTool('forum_read',{kind:'thread_posts',space_id:sid,id:tid,include_titles:true,limit:1});await expect(a.getThreadPosts(sid,tid,{limit:1,cursor:rich.meta.next_cursor})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
});

it('M7.10-A client rejects unsolicited or redacted directory titles',async()=>{
 const base=await a.getThreadPosts(sid,tid);
 for(const redacted of [false,true]){const page=structuredClone(base);Object.assign(page.data.posts[0]!,{title:'PRIVATE_TITLE',...(redacted?{lifecycle:'redacted'}:{})});vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({api_version:'1',request_id:'controlled',...page}),{headers:{'content-type':'application/json'}})));
 await expect(a.getThreadPosts(sid,tid,redacted?{include_titles:true}:undefined)).rejects.toBeInstanceOf(ClientProtocolError);vi.unstubAllGlobals();}
});
it('M7.10-A reverse fixed-anchor read ignores hundreds of unrelated target edges',async()=>{
 const storage=new SqliteStorage(db),post=storage.findPostById(qid)!,revision=storage.getPostRevision(qid,1)!;
 db.transaction(()=>{for(let i=0;i<400;i++){const id=`unrelated-${String(i).padStart(4,'0')}`;storage.createPost({...post,id},{...revision,post_id:id});storage.createRelation({id:`unrelated-edge-${i}`,space_id:sid,source_post_id:id,source_revision:1,target_post_id:qid,target_revision:1,type:'cites',state:'resolved',version:1,creator_id:post.author_id,created_at:post.created_at});}})();
 const wanted=(await b.createRelation(sid,{type:'cites',source_ref:{post_id:qid,revision:1},target_ref:{post_id:pid,revision:1}},'reverse-wanted')).data;
 const before=rows();const result=await a.callTool('forum_read',{kind:'post_relations',space_id:sid,id:pid,revision:1,direction:'in',limit:1});expect(result.data.relations.map((relation:any)=>relation.relation_id)).toEqual([wanted.id]);expect(result.meta.next_cursor).toBeNull();expect(rows()).toEqual(before);
});
