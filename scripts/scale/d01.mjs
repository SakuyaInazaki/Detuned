import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
const hash=x=>createHash('sha256').update(x).digest('hex');
const records=[];
async function call(base,token,role,method,path,body){
 const key=method==='GET'?undefined:`d01-${role}-${records.length}`;
 const r=await fetch(new URL(path,base),{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(key?{'idempotency-key':key}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const text=await r.text();let response;try{response=JSON.parse(text);}catch{response={raw:text};}
 records.push({role,method,path,request_key:key,body,status:r.status,response_bytes:Buffer.byteLength(text),response});
 assert.ok(r.ok,`${method} ${path}: ${text}`);return response;
}
async function reader(input){
 assert.deepEqual(Object.keys(input).sort(),['baseURL','query','space_id','token']);
 const {baseURL,token,space_id,query}=input,root=`/api/v1/spaces/${space_id}`;
 const fixed=async(ref)=>{let cursor,text='',offset=0;do{const p=await call(baseURL,token,'C','GET',`${root}/posts/${ref.post_id}/revisions/${ref.revision}?${new URLSearchParams({max_bytes:'4096',...(cursor?{cursor}:{})})}`);assert.equal(p.data.start_byte,offset);offset=p.data.end_byte;text+=p.data.chunk;cursor=p.meta.next_cursor;assert.deepEqual(p.data.ref,{space_id,...ref});}while(cursor);return {ref,document_sha256:hash(text),content:JSON.parse(text)};};
 const results=(await call(baseURL,token,'C','GET',`${root}/search?${new URLSearchParams({q:query,limit:'100'})}`)).data;
 const hit=results.find(p=>p.kind==='failure');assert.ok(hit,'failure discovered by public query');
 const f=await fixed({post_id:hit.post_id,revision:hit.revision??hit.current_revision});
 const evidence=f.content.structured.evidence_refs.filter(x=>x.kind==='post');assert.equal(evidence.length,2);
 const docs=[];for(const ref of evidence)docs.push(await fixed({post_id:ref.post_id,revision:ref.revision}));
 const original=docs.find(d=>d.content.structured?.statement?.includes('首次发现'));assert.ok(original);
 const counterexample=docs.find(d=>d!==original);assert.ok(counterexample.content.body.includes('s→a=10'));
 assert.ok(f.content.structured.tested_scope&&f.content.structured.not_ruled_out.length&&f.content.structured.retry_when.length);
 const proposal={kind:'proposal',title:'D01改进：出队确认与松弛',summary:'已知 Dijkstra 修正规则，非新数学成果或评审通过',body:`基于论坛固定引用 ${original.ref.post_id}@${original.ref.revision} 与 ${f.ref.post_id}@${f.ref.revision}。非负权重：最小暂定距离出队，跳过过时项，首次有效出队才 settle；逐边松弛并重新入队。三点图得到 a=2,b=1；兼容零权边、平行边及不可达点。`,structured:{statement:'非负权图采用最小距离优先队列出队确认，逐边松弛而非首次发现即固定',assumptions:['有限有向图','所有边权非负'],scope:f.content.structured.tested_scope,falsification_plan:'核三点反例、零权边、平行边、不可达点及不同邻接顺序；与可信参考算法比较'},refs:[original.ref,f.ref].map(target_ref=>({type:'cites',target_ref}))};
 // Relation semantics do not constitute proof or formal acceptance.
 const created=await call(baseURL,token,'C','POST',`${root}/threads/${hit.thread_id}/posts`,proposal);
 return {inputs:{space_id,query},documents:[f,...docs],created,records};
}
if(process.argv[2]==='--reader'){
 let s='';for await(const c of process.stdin)s+=c;try{process.stdout.write(JSON.stringify(await reader(JSON.parse(s))));}catch(e){process.stdout.write(JSON.stringify({records,error:String(e)}));process.exitCode=1;}
}else{
 const {mkdtemp,writeFile}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{createRequire}=await import('node:module');
 const {buildApp}=await import('../../packages/server/dist/index.js'),{bootstrapDatabase,SqliteStorage}=await import('../../packages/storage-sqlite/dist/index.js');
 const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
 const dir=await mkdtemp(join(tmpdir(),'detuned-d01-')),db=new Database(join(dir,'runtime.db')),admin=bootstrapDatabase(db).adminToken,app=buildApp({storage:new SqliteStorage(db)});let journey;
 try{
 const base=await app.listen({port:0,host:'127.0.0.1'}),sid=(await call(base,admin,'controller','POST','/api/v1/spaces',{slug:'d01-demo',objective:'确定性 D01 步骤1–3',rules:['作者报告不等于研究认证']})).data.space.id;
 const tokens=[];for(const role of ['A','B','C']){const token=randomBytes(32).toString('hex'),now=new Date().toISOString();tokens.push(token);db.prepare('INSERT INTO actors(id,kind,display_name,created_at) VALUES(?,?,?,?)').run(`d01-${role}`,'agent',role,now);db.prepare('INSERT INTO memberships(space_id,actor_id,role) VALUES(?,?,?)').run(sid,`d01-${role}`,'contributor');db.prepare('INSERT INTO credentials(id,actor_id,token_hash,allowed_space_ids,capabilities,created_at) VALUES(?,?,?,?,?,?)').run(`d01-cred-${role}`,`d01-${role}`,hash(token),JSON.stringify([sid]),JSON.stringify(['read','write']),now);}
 const root=`/api/v1/spaces/${sid}`,tid=(await call(base,tokens[0],'A','POST',`${root}/threads`,{title:'D01非负权最短路'})).data.thread.id;
 const a=(await call(base,tokens[0],'A','POST',`${root}/threads/${tid}/posts`,{kind:'proposal',title:'首次发现即固定',summary:'待反驳的错误规则',body:'按邻接顺序首次发现顶点就固定距离，不再更新',structured:{statement:'非负权图首次发现某点即可固定其距离',assumptions:['非负权重'],scope:'有限非负权有向图',falsification_plan:'寻找小图反例'}})).data;
 const ar={post_id:a.post.id,revision:a.post.current_revision};
 const evidence=(await call(base,tokens[1],'B','POST',`${root}/threads/${tid}/posts`,{kind:'note',title:'三点图手算证据',summary:'固定可读材料',body:'s→a=10,s→b=1,b→a=1；错误规则 a=10，正确 s=0,b=1,a=2；由两步路径1+1=2。'})).data;
 const er={post_id:evidence.post.id,revision:evidence.post.current_revision};
 const failure=(await call(base,tokens[1],'B','POST',`${root}/threads/${tid}/posts`,{kind:'failure',title:'D01三点反例',summary:'首次发现规则的适用反例',body:'反例否定首次发现固定规则，不否定 Dijkstra。',structured:{attempt:'邻接顺序 s→a 后 s→b',category:'counterexample',assumptions:['非负权重'],tested_scope:'三顶点有向非负权图；首发现不松弛规则',expected:'a=2,b=1',observed:'错误规则 a=10，正确距离2',evidence_refs:[ar,er].map(r=>({kind:'post',...r})),evidence_state:'provided',ruled_out:'负权边不是原因',not_ruled_out:['负权图的其它算法','更大图实现细节'],retry_when:['最小暂定距离出队确认并逐边松弛']} })).data;
 const child=spawn(process.execPath,[new URL(import.meta.url).pathname,'--reader'],{stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH}});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.stdin.end(JSON.stringify({baseURL:base,token:tokens[2],space_id:sid,query:'D01三点反例'}));const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});journey=JSON.parse(out);assert.equal(exit,0,err||journey.error);
 assert.equal(db.prepare('SELECT author_id FROM posts WHERE id=?').get(journey.created.data.post.id).author_id,'d01-C');
 const events=db.prepare('SELECT seq,type,object_id,actor_id FROM events WHERE space_id=? ORDER BY seq').all(sid);
 await writeFile(join(dir,'ledger.json'),JSON.stringify({format_version:1,scope:'D01 steps1–3 only; no model or review',space_id:sid,actors:['d01-A','d01-B','d01-C'],original_ref:ar,failure_ref:{post_id:failure.post.id,revision:failure.post.current_revision},controller_records:records,journey,events},null,2)+'\n');console.log(JSON.stringify({directory:dir,ledger:join(dir,'ledger.json'),events:events.length,status:'completed'}));
 }catch(e){await writeFile(join(dir,'failed.json'),JSON.stringify({error:String(e),records,journey},null,2)+'\n');console.error(JSON.stringify({directory:dir,error:String(e)}));process.exitCode=1;}finally{await app.close();db.close();}
}
