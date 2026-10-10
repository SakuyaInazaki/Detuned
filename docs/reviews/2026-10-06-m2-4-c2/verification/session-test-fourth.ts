import {it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {buildApp} from '@detuned/server';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';

it('C2 new HTTP-only process discovers bounded rules, failure conditions and fixed sources, then checkpoint consumption sees a later source revision',async()=>{
 const db=new Database(':memory:'),admin=bootstrapDatabase(db).adminToken!,storage=new SqliteStorage(db),app=buildApp({storage});let serial=0;
 const call=async(method:'GET'|'POST'|'PATCH',url:string,payload?:Record<string,unknown>,token=admin)=>{const r=await app.inject({method,url,headers:{authorization:`Bearer ${token}`,'idempotency-key':`chain-${++serial}`},...(payload?{payload}:{})});expect(r.statusCode,r.body).toBeLessThan(300);return r.json().data;};
 try{
 const rules=Array.from({length:20},()=> '规则🙂"\\'.repeat(50));const sid=(await call('POST','/api/v1/spaces',{slug:'chain',objective:'HTTP唯一入口',rules})).space.id;
 const tid=(await call('POST',`/api/v1/spaces/${sid}/threads`,{title:'发现链'})).thread.id;
 const post=async(kind:string,title:string,structured?:Record<string,unknown>)=>call('POST',`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind,title,summary:'摘要',body:'中文🙂"\\'.repeat(1300),...(structured?{structured}:{})});
 const source=await post('note','源材料');const sourceRef={post_id:source.post.id,revision:1};
 const failure={attempt:'first-discovery',category:'counterexample',assumptions:['非负权重'],tested_scope:'三个点的有向图',expected:'首次发现最短',observed:'间接路径更短',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'仅作者报告',ruled_out:'零权重不是原因',not_ruled_out:['负权重变体'],retry_when:['以出队距离确认']};
 const f=await post('failure','C2三点反例',failure);const summary=await post('summary','来源摘要',{source_refs:[sourceRef]});
 await call('PATCH',`/api/v1/spaces/${sid}`,{expected_revision:1,pinned_refs:[{post_id:summary.post.id,revision:1}]});
 // Explicit ordinary-agent authentication setup, never hand admin to session process.
 const token=randomBytes(32).toString('hex'),now=new Date().toISOString();db.prepare('INSERT INTO actors(id,kind,display_name,created_at) VALUES(?,?,?,?)').run('chain-reader','agent','reader',now);
 db.prepare('INSERT INTO memberships(space_id,actor_id,role) VALUES(?,?,?)').run(sid,'chain-reader','contributor');
 db.prepare('INSERT INTO credentials(id,actor_id,token_hash,allowed_space_ids,capabilities,created_at) VALUES(?,?,?,?,?,?)').run('chain-reader-cred','chain-reader',createHash('sha256').update(token).digest('hex'),JSON.stringify([sid]),JSON.stringify(['read','write']),now);
 const before=db.serialize();const baseURL=await app.listen({port:0,host:'127.0.0.1'});
 const child=spawn(process.execPath,[new URL('../../scripts/scale/verify-session.mjs',import.meta.url).pathname],{stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH}});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.stdin.end(JSON.stringify({baseURL,token,space_id:sid,query:'C2三点反例'}));
 const exit=await new Promise<number|null>((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});expect(exit,err).toBe(0);
 const journey=JSON.parse(out);expect(db.serialize()).toEqual(before);
 // Only after process exit does the test oracle inspect the collected documents.
 expect(journey.discovered_failure_ids).toContain(f.post.id);
 expect(journey.documents.find((x:{ref:{post_id:string}})=>x.ref.post_id===f.post.id).content.structured).toEqual(failure);
 expect(journey.documents.find((x:{ref:{space_id?:string}})=>x.ref.space_id===sid).content).toEqual({objective:'HTTP唯一入口',rules});
 const oldSource=journey.documents.find((x:{ref:{post_id:string}})=>x.ref.post_id===source.post.id);expect(oldSource.ref).toEqual({space_id:sid,...sourceRef});
 const sub=await call('POST',`/api/v1/spaces/${sid}/subscriptions`,{consumer_key:'chain-new',start:'context_checkpoint',checkpoint_token:journey.initial_checkpoint},token);
 const initialSeq=sub.consumer.ack_seq;
 const changed=await call('POST',`/api/v1/spaces/${sid}/posts/${source.post.id}/revisions`,{expected_revision:1,title:'源更新',summary:'摘要更新',body:'新版'},admin);
 const poll=()=>call('POST',`/api/v1/spaces/${sid}/consumers/${sub.consumer.id}/poll`,{limit:100},token);
 const batch=await poll();expect(batch.events.map((e:{object_id:string})=>e.object_id)).toContain(source.post.id);expect(batch.events.every((e:{seq:number})=>e.seq>initialSeq)).toBe(true);
 expect(await poll()).toEqual(batch);const ack=await call('POST',`/api/v1/spaces/${sid}/consumers/${sub.consumer.id}/ack`,{batch_id:batch.batch_id,next_cursor:batch.next_cursor},token);expect(ack.confirmed).toBe(true);expect((await poll()).batch_id).toBeNull();
 const view=await call('GET',`/api/v1/spaces/${sid}/context?focus_thread_id=${tid}&max_bytes=65536`,undefined,token);expect(view.pinned_summaries[0].outdated_sources).toBe(true);
 const old=await call('GET',`/api/v1/spaces/${sid}/posts/${source.post.id}?revision=1`,undefined,token);expect(old.revision.body).toBe(oldSource.content.body);expect(changed.post.current_revision).toBe(2);
 }finally{await app.close();db.close();}
},30000);
