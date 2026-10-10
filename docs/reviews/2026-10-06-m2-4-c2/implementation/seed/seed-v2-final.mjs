// Transparent deterministic fixture construction, not HTTP success/throughput evidence.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,stat,statfs} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(join(root,'package.json'));
const args=process.argv.slice(2);let output,profile;
for(let i=0;i<args.length;i+=2){if(args[i]==='--output')output=resolve(args[i+1]);else if(args[i]==='--profile')profile=args[i+1];else throw Error('Only --output and --profile smoke|full are accepted.');}
assert(output && ['smoke','full'].includes(profile),'Explicit new --output and --profile smoke|full are required.');
const recipeBytes=await readFile(join(root,'tests/fixtures/scale/recipe.json')),recipe=JSON.parse(recipeBytes),spec=recipe.profiles[profile];
assert(spec && spec.clients===20 && spec.posts%100===0 && spec.posts%spec.threads===0);
assert(!existsSync(output),'Output directory must not exist; never overwrite user data or previous evidence.');await mkdir(output,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>x===null?'null':Array.isArray(x)?'['+x.map(canonical).join(',')+']':typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const Database=require('better-sqlite3');
const {bootstrapDatabase,SqliteStorage}=await import(pathToFileURL(join(root,'packages/storage-sqlite/dist/index.js')));
const {parseNewTypedStructured}=await import(pathToFileURL(join(root,'packages/protocol/dist/index.js')));
const spaceId='spc_c2_main',adminId='act_c2_admin',base=Date.parse(recipe.clock),perThread=spec.posts/spec.threads;
const actor=i=>'act_c2_'+String(i).padStart(2,'0'),thread=i=>'thd_c2_'+String(i).padStart(4,'0'),post=i=>'pst_c2_'+String(i).padStart(6,'0');
const kind=i=>recipe.kind_slots[i%10],threadIndex=i=>Math.floor(i/perThread),owner=i=>threadIndex(i)%20;
const archivedCount=spec.threads-Math.floor(spec.threads*.9);
const revisions=spec.events-2-spec.threads-spec.posts-spec.relations-archivedCount,rounds=Math.floor(revisions/spec.posts),extra=revisions%spec.posts;
const head=i=>1+rounds+(i<extra?1:0),when=seq=>new Date(base+seq).toISOString();let seq=0,done=false,db,batch=0;
const started=performance.now(),startWall=new Date().toISOString();const recipeHash=sha(recipeBytes),work=join(output,'seed-work.db');
function report(stage,details={}){console.log(JSON.stringify({stage,profile,elapsed_ms:Math.round(performance.now()-started),events_so_far:seq,...details}));}
async function freeCheck(stage){const fs=await statfs(output);const free=Number(fs.bavail)*Number(fs.bsize);report(stage,{free_bytes:free});assert(free>=recipe.minimum_free_bytes,'Free disk below frozen 6GiB stop threshold.');}
await freeCheck('start');
const docs=new Map(),created=new Float64Array(spec.posts),bodyCounts={short:0,medium:0,long:0};
function bytesText(pattern,bytes){let s='',used=0;for(const ch of pattern.repeat(Math.ceil(bytes/Buffer.byteLength(pattern))+1)){const n=Buffer.byteLength(ch);if(used+n>bytes)break;s+=ch;used+=n;}return s+'x'.repeat(bytes-used);}
function fields(i,revision){
 const k=kind(i),latest=revision===head(i),bucket=i%100<90?'short':i%100<99?'medium':'long';
 const title=i===7?recipe.discovery_query:'协作 '+k+' '+i,summary=i===7?'首次发现固定距离的三点反例与适用条件':'研究材料 '+k+' '+i;
 const body=i===7?bytesText('C2三点反例 s→a=10 s→b=1 b→a=1 first discovery gives 10; relaxation gives 2. 图 失败 反例图 counterexample.\n',latest?recipe.latest_body_bytes[bucket]:recipe.historical_body_bytes):bytesText('中文协作 研究条件 detuned '+i+' 中🙂 "\\\n ',latest?recipe.latest_body_bytes[bucket]:recipe.historical_body_bytes);
 let structured={};
 if(k==='proposal'||k==='claim')structured={statement:'允许松弛更新最短距离 '+i,assumptions:['边权非负'],scope:'有限有向图',falsification_plan:'检查固定路径和反例'};
 if(k==='failure')structured={attempt:i===7?'首次发现节点后固定距离；s→a=10，s→b=1，b→a=1':'固定局部实验 '+i,category:'counterexample',assumptions:['非负权有向图'],tested_scope:i===7?'三点有向图；先发现a即固定为10会失效，正确距离为2':'当前有限样本',expected:'距离为2',observed:'错误算法距离为10',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'模拟配方材料；未运行外部独立验证器',ruled_out:'此三点图上的首次发现即固定规则',not_ruled_out:['已使用松弛的算法','负权或不同前提'],retry_when:['允许重新松弛并复测三条边']};
 if(k==='summary'){
  const own=threadIndex(i)*perThread,previous=threadIndex(i)===0?(spec.threads-1)*perThread:own-perThread;
  // Final summaries pin a current already-created earlier source; cross-thread revision1 remains fixed.
  const ownRevision=latest?Math.min(head(own),revision):1;
  structured={source_refs:[{post_id:post(own),revision:ownRevision},{post_id:post(previous),revision:1}]};
  if(i===8)structured.source_refs.splice(1,0,{post_id:post(7),revision:latest?Math.min(head(7),revision):1});
 }
 parseNewTypedStructured(k,structured);
 return {title,summary,body,tags:['scale',k,'条件'],structured};
}
function hashContent(f){return sha(`${f.title}\n${f.summary}\n${f.body}\n${canonical(f.structured)}`);}
try{
 db=new Database(work);new SqliteStorage(db);const boot=bootstrapDatabase(db);const bootstrapSecret=db.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get().value;
 db.prepare('DELETE FROM credentials').run();db.prepare('DELETE FROM actors WHERE id=?').run(boot.adminActorId);
 db.prepare('UPDATE schema_migrations SET applied_at=?').run(recipe.clock);
 db.prepare("UPDATE instance_metadata SET value=? WHERE key='initialized_at'").run(recipe.clock);
 const actorInsert=db.prepare('INSERT INTO actors VALUES(?,?,?,?,?)');actorInsert.run(adminId,'human','Scale fixture administrator',recipe.clock,null);
 for(let c=0;c<20;c++)actorInsert.run(actor(c),'agent','模拟客户端 '+c,recipe.clock,null);
 db.prepare('INSERT INTO spaces VALUES(?,?,?,?,?,?)').run(spaceId,'c2-scale',1,1,1,recipe.clock);
 const rules=Array.from({length:12},(_,i)=>'空间规则 '+i+' '+bytesText('先概要后详情 中文条件🙂 ',2048));
 const policy={enabled:false,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:false,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
 db.prepare('INSERT INTO space_revisions VALUES(?,?,?,?,?,?,?,?,?)').run(spaceId,1,'可重复规模实验：只通过论坛接续反例与来源',JSON.stringify(rules),JSON.stringify(policy),'{}','[]',adminId,recipe.clock);
 const membership=db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,?)'),session=db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?)');
 membership.run(spaceId,adminId,'owner',1,0,null);
 for(let c=0;c<20;c++){membership.run(spaceId,actor(c),'contributor',1,0,'c2-client-'+c);session.run('ses_c2_'+String(c).padStart(2,'0'),actor(c),spaceId,'scale-simulated-client','v1','c2-'+c,'{}',recipe.clock);}
 const ev=db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)');
 function event(type,id,revision,by){seq++;ev.run('evt_c2_'+String(seq).padStart(9,'0'),spaceId,seq,type,id,revision,'public',by,when(seq));return when(seq);}
 const ti=db.prepare('INSERT INTO threads VALUES(?,?,?,?,?,?,?,?)'),tv=db.prepare('INSERT INTO thread_versions VALUES(?,?,?,?,?)');
 event('space.revised',spaceId,1,adminId);
 for(let t=0;t<spec.threads;t++){const time=event('thread.created',thread(t),1,actor(t%20)),state='open',title='主题 '+t;ti.run(thread(t),spaceId,title,1,state,actor(t%20),time,time);tv.run(thread(t),1,title,state,time);}
 const pi=db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?,?,?)'),pr=db.prepare('INSERT INTO post_revisions VALUES(?,?,?,?,?,?,?,?,?,?)');
 function revision(i,n,type){const f=fields(i,n),time=event(type,post(i),n,actor(owner(i)));pr.run(post(i),n,f.title,f.summary,f.body,JSON.stringify(f.tags),JSON.stringify(f.structured),hashContent(f),actor(owner(i)),time);if(n===head(i)){const bucket=i%100<90?'short':i%100<99?'medium':'long';bodyCounts[bucket]++;if(i<20||i%100===99||i===8)docs.set(i,{...f});}}
 async function finishBatch(){db.exec('COMMIT');batch++;await freeCheck('batch');db.exec('BEGIN IMMEDIATE');}
 db.exec('BEGIN IMMEDIATE');let rows=0;
 // Seed creation order is explicit: every referenced nonsummary source already exists.
 for(const summaryPass of [false,true])for(let i=0;i<spec.posts;i++){if((kind(i)==='summary')!==summaryPass)continue;created[i]=seq+1;pi.run(post(i),spaceId,thread(threadIndex(i)),actor(owner(i)),kind(i),head(i),'active',when(created[i]));revision(i,1,'post.created');if(++rows%recipe.batch_rows===0)await finishBatch();}
 const ri=db.prepare('INSERT INTO relations VALUES(?,?,?,?,?,?,?,?,?,?,?)');const relationIds=[];
 function firstOf(t,k){for(let i=t*perThread;i<(t+1)*perThread;i++)if(kind(i)===k)return i;throw Error('Thread lacks requested kind.');}
 for(let t=0;t<spec.relations;t++){const source=firstOf(t,'failure'),target=firstOf(t%2?t:(t+1)%spec.threads,'proposal'),id='rel_c2_'+String(t).padStart(4,'0'),time=event('relation.created',id,1,actor(owner(source)));ri.run(id,spaceId,post(source),1,post(target),1,'challenges','open',1,actor(owner(source)),time);relationIds.push(id);}
 for(let round=1;round<=rounds;round++)for(let i=0;i<spec.posts;i++){revision(i,round+1,'post.revised');if(++rows%recipe.batch_rows===0)await finishBatch();}
 for(let i=0;i<extra;i++){revision(i,rounds+2,'post.revised');if(++rows%recipe.batch_rows===0)await finishBatch();}
 db.exec('COMMIT');
 for(let t=spec.threads-archivedCount;t<spec.threads;t++){const time=event('thread.updated',thread(t),2,actor(t%20));db.prepare("UPDATE threads SET state='archived',version=2,updated_at=? WHERE id=?").run(time,thread(t));tv.run(thread(t),2,'主题 '+t,'archived',time);}
 const pinned=Array.from({length:20},(_,c)=>{const i=firstOf(c,'summary');return {post_id:post(i),revision:head(i)};});
 const pinTime=event('space.revised',spaceId,2,adminId);
 db.prepare('INSERT INTO space_revisions SELECT space_id,2,objective,rules,review_policy,check_profiles,?,editor_id,? FROM space_revisions WHERE space_id=? AND revision=1').run(JSON.stringify(pinned),pinTime,spaceId);
 db.prepare('UPDATE spaces SET current_revision=2 WHERE id=?').run(spaceId);assert.equal(seq,spec.events);
 await freeCheck('before-fts');
 db.prepare(`INSERT INTO post_fts(post_id,space_id,title,summary,body,tags) SELECT p.id,p.space_id,r.title,r.summary,r.body,
   (SELECT group_concat(value,' ') FROM json_each(r.tags)) FROM posts p JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision`).run();
 report('fts-built');await freeCheck('before-oracle');
 assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.equal(db.pragma('foreign_key_check').length,0);
 const count=t=>db.prepare(`SELECT count(*) n FROM ${t}`).get().n;
 assert.equal(count('posts'),spec.posts);assert.equal(count('post_revisions'),spec.posts+revisions);assert.equal(count('events'),spec.events);assert.equal(count('threads'),spec.threads);assert.equal(count('relations'),spec.relations);assert.equal(count('actors'),21);assert.equal(count('sessions'),20);assert.equal(count('consumers'),0);assert.equal(count('subscriptions'),0);
 assert.deepEqual(db.prepare('SELECT min(seq) lo,max(seq) hi,count(DISTINCT seq) n FROM events').get(),{lo:1,hi:spec.events,n:spec.events});
 const bad=sql=>assert.equal(db.prepare(sql).get().n,0,sql);
 bad('SELECT count(*) n FROM posts p LEFT JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE r.post_id IS NULL');
 bad('SELECT count(*) n FROM events e LEFT JOIN post_revisions r ON r.post_id=e.object_id AND r.revision=e.revision WHERE e.type IN (\'post.created\',\'post.revised\') AND r.post_id IS NULL');
 bad('SELECT count(*) n FROM relations r LEFT JOIN post_revisions s ON s.post_id=r.source_post_id AND s.revision=r.source_revision LEFT JOIN post_revisions t ON t.post_id=r.target_post_id AND t.revision=r.target_revision WHERE s.post_id IS NULL OR t.post_id IS NULL');
 bad(`SELECT count(*) n FROM post_revisions r JOIN posts p ON p.id=r.post_id,json_each(r.structured,'$.source_refs') source LEFT JOIN posts s ON s.id=json_extract(source.value,'$.post_id') LEFT JOIN post_revisions sr ON sr.post_id=s.id AND sr.revision=json_extract(source.value,'$.revision') WHERE p.kind='summary' AND (s.id IS NULL OR s.space_id<>p.space_id OR sr.post_id IS NULL)`);
 assert.equal(count('post_fts'),spec.posts);
 bad(`SELECT count(*) n FROM post_fts f JOIN posts p ON p.id=f.post_id JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE f.space_id<>p.space_id OR f.title<>r.title OR f.summary<>r.summary OR f.body<>r.body OR f.tags<>(SELECT group_concat(value,' ') FROM json_each(r.tags))`);
 bad('SELECT count(*) n FROM (SELECT post_id,count(*) c FROM post_fts GROUP BY post_id HAVING c<>1)');
 for(const row of db.prepare('SELECT title,summary,body,structured,content_hash FROM post_revisions').iterate())assert.equal(sha(`${row.title}\n${row.summary}\n${row.body}\n${canonical(JSON.parse(row.structured))}`),row.content_hash);
 bad("SELECT count(*) n FROM post_revisions r JOIN posts p ON p.id=r.post_id,json_each(r.structured,'$.source_refs') source JOIN post_revisions sr ON sr.post_id=json_extract(source.value,'$.post_id') AND sr.revision=json_extract(source.value,'$.revision') WHERE p.kind='summary' AND sr.created_at>r.created_at");
 bad("SELECT count(*) n FROM events e JOIN post_revisions r ON r.post_id=e.object_id AND r.revision=e.revision WHERE e.type IN ('post.created','post.revised') AND e.created_at<>r.created_at");
 assert.deepEqual(db.prepare("SELECT count(*) n FROM events WHERE type='thread.updated'").get(),{n:archivedCount});
 assert.equal(db.prepare('SELECT max(seq) n FROM events').get().n,spec.events);
 report('integrity-oracle-complete');
 const logical={},tables={actors:'id',memberships:'space_id,actor_id',sessions:'id',spaces:'id',space_revisions:'space_id,revision',threads:'id',thread_versions:'thread_id,version',posts:'id',post_revisions:'post_id,revision',relations:'id',events:'space_id,seq',post_fts:'post_id'};
 for(const [table,order]of Object.entries(tables)){const h=createHash('sha256');for(const row of db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).iterate())h.update(canonical(row)+'\n');logical[table]=h.digest('hex');}
 const document=i=>{const r=db.prepare('SELECT * FROM post_revisions WHERE post_id=? AND revision=?').get(post(i),head(i));const f={title:r.title,summary:r.summary,body:r.body,tags:JSON.parse(r.tags),structured:JSON.parse(r.structured)};const text=JSON.stringify(f);return {space_id:spaceId,post_id:post(i),revision:head(i),document_sha256:sha(text),document_bytes:Buffer.byteLength(text)};};
 const sampleIndices=[0,5,7,8,99,spec.posts-1],postRefs=sampleIndices.map(document),spaceDocument=JSON.stringify({objective:'可重复规模实验：只通过论坛接续反例与来源',rules});
 const failure=fields(7,head(7)),summary=fields(8,head(8));
 const queries={zh1:{hit:['图'],miss:['罕']},zh2:{hit:['失败'],miss:['罕词']},zh3:{hit:['反例图'],miss:['罕词组']},en:{hit:['counterexample'],miss:['nevermatchC2xyz']}};
 for(const [name,pool]of Object.entries(queries)){if(name.startsWith('zh'))for(const q of [...pool.hit,...pool.miss])assert.equal([...q].length,Number(name.slice(2)));}
 const template={attempt:'固定批次最短路实验',category:'counterexample',assumptions:['非负权'],tested_scope:'当前配方三点图',expected:'2',observed:'10',evidence_refs:[{kind:'post',post_id:post(7),revision:head(7)}],evidence_state:'provided',ruled_out:'首次发现固定距离',not_ruled_out:['松弛算法'],retry_when:['加入松弛后复测']};parseNewTypedStructured('failure',template);
 const discovery={space_id:spaceId,query:recipe.discovery_query,task:'仅凭论坛读取找到首次发现固定距离的反例、适用条件、证据状态、未排除变体与重试条件，取得固定来源摘要并继续正文与事件。'};
 const counts={posts:count('posts'),post_revisions:count('post_revisions'),events:seq,threads:count('threads'),relations:count('relations'),actors:21,sessions:20};
 const sourceFiles=['packages/protocol/dist/posts.js','packages/protocol/dist/index.js','packages/core/dist/services/post-service.js','packages/storage-sqlite/dist/bootstrap.js','packages/storage-sqlite/dist/schema.js','packages/storage-sqlite/dist/sqlite-storage.js'];const currentHashes={};for(const file of sourceFiles)currentHashes[file]=sha(await readFile(join(root,file)));
 const source={generator_sha256:sha(await readFile(fileURLToPath(import.meta.url))),current_dist_sha256:currentHashes,versions:{node:process.version,sqlite:db.prepare('SELECT sqlite_version() v').get().v,better_sqlite3:require('better-sqlite3/package.json').version}};
 const manifest={format_version:1,recipe_id:recipe.recipe_id,profile,recipe_sha256:recipeHash,seed:recipe.seed,schema_version:db.prepare('SELECT max(version) v FROM schema_migrations').get().v,database_file:'baseline.db',oracle_file:'oracle.json',discovery_file:'discovery.json',source,counts,logical_sha256:logical,space_id:spaceId,admin_actor_id:adminId,baseline_event_seq:seq,clients:Array.from({length:20},(_,c)=>({index:c,actor_id:actor(c),session_id:'ses_c2_'+String(c).padStart(2,'0'),consumer_key:'c2-client-'+c,write_thread_id:thread(c),revision_post_id:post(c*perThread+(c*perThread%10===0?0:5)),revision_post_kind:'note',current_revision:head(c*perThread+(c*perThread%10===0?0:5))})),threads:{open:Array.from({length:Math.floor(spec.threads*.9)},(_,i)=>thread(i)),archived:Array.from({length:spec.threads-Math.floor(spec.threads*.9)},(_,i)=>thread(i+Math.floor(spec.threads*.9)))},post_refs:postRefs,space_ref:{space_id:spaceId,revision:db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(spaceId).current_revision,document_sha256:sha(spaceDocument),document_bytes:Buffer.byteLength(spaceDocument)},queries,templates:{failure:template},credential_free:true,consumer_initialization:'runtime_context_checkpoint',body_distribution:bodyCounts};
 const oracle={format_version:1,recipe_sha256:recipeHash,seed_counts:counts,initial_space_seq:seq,logical_sha256:logical,task:{failure_ref:document(7),summary_ref:document(8),source_refs:summary.structured.source_refs,expected_failure_fields:failure.structured},representative_posts:postRefs,challenge_samples:relationIds.slice(0,20)};
 for(const c of manifest.clients){const p=db.prepare('SELECT * FROM posts WHERE id=?').get(c.revision_post_id);assert.equal(p.author_id,c.actor_id);assert.equal(p.kind,'note');assert.equal(p.thread_id,c.write_thread_id);assert.equal(db.prepare('SELECT state FROM threads WHERE id=?').get(c.write_thread_id).state,'open');}
 for(const [category,pool]of Object.entries(queries))for(const q of [...pool.hit,...pool.miss]){const n=db.prepare('SELECT count(*) n FROM posts p JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE r.title LIKE ? OR r.summary LIKE ? OR r.body LIKE ?').get('%'+q+'%','%'+q+'%','%'+q+'%').n;assert(pool.hit.includes(q)?n>0:n===0,category+' literal query hit/miss expectation');}
 db.prepare('DELETE FROM credentials').run();db.prepare("DELETE FROM instance_metadata WHERE key='token_secret'").run();assert.equal(count('credentials'),0);assert.equal(db.prepare("SELECT count(*) n FROM instance_metadata WHERE key='token_secret'").get().n,0);db.pragma('wal_checkpoint(TRUNCATE)');await freeCheck('before-vacuum');
 const archive=join(output,'baseline.db');db.prepare('VACUUM INTO ?').run(archive);db.close();db=undefined;await rm(work);for(const suffix of ['-wal','-shm'])await rm(work+suffix,{force:true});
 const fileStat=await stat(archive);assert(fileStat.size<=recipe.maximum_baseline_bytes,'Baseline exceeds frozen 2.5GiB stop threshold.');
 // Stream DB bytes for physical hash; do not materialize a multi-GiB database in JS.
 const {createReadStream}=await import('node:fs');const archiveHasher=createHash('sha256');const forbidden=[boot.adminToken,sha(boot.adminToken),bootstrapSecret].map(x=>Buffer.from(x));let carry=Buffer.alloc(0);for await(const chunk of createReadStream(archive)){archiveHasher.update(chunk);const scan=Buffer.concat([carry,chunk]);for(const bytes of forbidden)assert(!scan.includes(bytes),'Sanitized archive still contains bootstrap credential material.');carry=scan.subarray(Math.max(0,scan.length-128));}manifest.database_sha256=archiveHasher.digest('hex');manifest.database_bytes=fileStat.size;await freeCheck('after-vacuum');
 await writeFile(join(output,'discovery.json'),JSON.stringify(discovery,null,2)+'\n');await writeFile(join(output,'oracle.json'),JSON.stringify(oracle,null,2)+'\n');await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(join(output,'generation.json'),JSON.stringify({started_at:startWall,finished_at:new Date().toISOString(),elapsed_ms:performance.now()-started,origin:'current parameterized batch fixture, not HTTP success',batch_count:batch,all_oracles_passed:true,credentials:0,consumer_count:0},null,2)+'\n');done=true;report('complete',{database_bytes:fileStat.size,counts,manifest:join(output,'manifest.json')});
}catch(error){if(db?.inTransaction)db.exec('ROLLBACK');await writeFile(join(output,'failed.json'),JSON.stringify({stage:'failed',profile,events:seq,message:error.message,elapsed_ms:performance.now()-started},null,2)+'\n');throw error;}finally{if(db?.open)db.close();if(!done)report('incomplete-output-retained');}
