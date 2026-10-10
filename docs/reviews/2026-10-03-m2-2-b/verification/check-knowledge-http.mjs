// Independent finite KV01–08 probe. Run only after parent freeze + build.
// Historical malformed material/pins/private events below are explicit storage fixtures,
// never claimed to be real successful historical HTTP requests.
import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
const db=new Database(':memory:'); const token=bootstrapDatabase(db).adminToken;
const storage=new SqliteStorage(db); const app=buildApp({storage});const results=[];let n=0,sid,thread;
async function request(method,url,payload,status=200){const r=await app.inject({method,url,headers:{authorization:`Bearer ${token}`,'idempotency-key':`kv-${++n}`},...(payload===undefined?{}:{payload})});assert.equal(r.statusCode,status,`${method} ${url}: ${r.body}`);return r.json();}
const post=async(kind,structured,title=kind)=> (await request('POST',`/api/v1/spaces/${sid}/threads/${thread}/posts`,{kind,title,summary:'summary must not become missing material',body:'body',...(structured?{structured}:{})},201)).data.post;
const ref=p=>({post_id:p.id,revision:1});
const claim={statement:'statement',assumptions:[],scope:'scope',falsification_plan:'falsify'};
const view=async name=>(await request('GET',`/api/v1/spaces/${sid}/views/${name}`)).data;
const context=async max=>(await request('GET',`/api/v1/spaces/${sid}/context?max_bytes=${max??65536}`));
const stored=(p,data)=>db.prepare('UPDATE post_revisions SET structured=? WHERE post_id=? AND revision=1').run(JSON.stringify(data),p.id);
const snapshot=()=>Object.fromEntries(['spaces','space_revisions','posts','post_revisions','relations','events','idempotency_records'].map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));
const mark=(id,details={})=>results.push({id,pass:true,...details});
try{
 sid=(await request('POST','/api/v1/spaces',{slug:'knowledge-independent',objective:'objective',rules:[]},201)).data.space.id;
 thread=(await request('POST',`/api/v1/spaces/${sid}/threads`,{title:'fixture'},201)).data.thread.id;
 const target=await post('claim',claim),proposal=await post('proposal',claim),source=await post('note');
 const failure=await post('failure',{attempt:'attempt',category:'budget_exhausted',assumptions:[],tested_scope:'scope',expected:'expected',observed:'observed',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'not checked',ruled_out:'this execution',not_ruled_out:[],retry_when:[]});
 const question=await post('question');
 const findings=await view('findings');assert(findings.some(x=>x.post_id===target.id));assert(!findings.some(x=>x.post_id===proposal.id));
 for(const x of findings){assert.equal(x.kind,'claim');assert.equal(x.type,'claim');assert.equal(x.report_kind,'author_report');assert.equal(x.formal_review_status,'not_enabled');assert.equal(x.formal_check_status,'not_enabled');}
 const originalThread=(await request('GET',`/api/v1/spaces/${sid}/threads/${thread}`)).data;assert(JSON.stringify(originalThread).includes(proposal.id));mark('KV01');
 const rels=[];for(const type of ['supports','challenges','reproduces'])rels.push((await request('POST',`/api/v1/spaces/${sid}/relations`,{type,source_ref:ref(source),target_ref:ref(target)},201)).data);
 await request('POST',`/api/v1/spaces/${sid}/posts/${target.id}/revisions`,{expected_revision:1,title:'updated',summary:'updated',body:'updated',structured:claim},201);
 let f=(await view('findings')).find(x=>x.post_id===target.id);assert.equal(f.relations.length,3);for(const r of f.relations){assert.deepEqual(r.target_ref,ref(target));assert.equal(r.target_has_newer_revision,true);assert.equal(r.source_has_newer_revision,false);assert.equal(r.source_author_id,source.author_id);assert.equal(r.target_author_id,target.author_id);}
 assert((await view('open-questions')).some(x=>x.type==='question'&&x.post_id===question.id));mark('KV02',{three_relation_types:true,fixed_target_revision:1});
 stored(failure,{assumptions:[],not_ruled_out:[42],retry_when:[],category:'invented',evidence_state:'unverified',evidence_missing_reason:'   '});
 let before=snapshot(),fv=(await view('failures')).find(x=>x.post_id===failure.id);assert.equal(fv.material.attempt,null);assert.equal(fv.material.category,null);assert.deepEqual(fv.material.assumptions,[]);assert.equal(fv.material.not_ruled_out,null);assert.equal(fv.material.evidence_missing_reason,null);assert(fv.material.missing_fields.includes('evidence_missing_reason'));assert.deepEqual(snapshot(),before);
 for(const reason of [undefined,'   ',42]){stored(failure,{evidence_state:'unverified',...(reason===undefined?{}:{evidence_missing_reason:reason})});const material=(await view('failures')).find(x=>x.post_id===failure.id).material;assert.equal(material.evidence_missing_reason,null);assert(material.missing_fields.includes('evidence_missing_reason'));}
 stored(failure,{evidence_state:'provided'});fv=(await view('failures')).find(x=>x.post_id===failure.id);assert.equal(fv.material.evidence_missing_reason,null);assert(!fv.material.missing_fields.includes('evidence_missing_reason'));mark('KV03',{fixture_origin:'direct storage historical shape; not old HTTP'});
 const summary=await post('summary',{source_refs:[ref(target)]});
 const pins=[ref(summary),ref(target),{post_id:'absent',revision:1},{post_id:summary.id,revision:999}];
 db.prepare('UPDATE space_revisions SET pinned_refs=? WHERE space_id=?').run(JSON.stringify(pins),sid);
 before=snapshot();let c=await context();assert.equal(c.data.pinned_summaries.length,1);assert.equal(c.data.pinned_summaries[0].has_newer_revision,false);assert.equal(c.data.pinned_summaries[0].source_refs[0].has_newer_revision,true);assert.deepEqual(snapshot(),before);mark('KV04');
 const other=(await request('POST','/api/v1/spaces',{slug:'other-knowledge',objective:'other',rules:[]},201)).data.space.id;
 const ot=(await request('POST',`/api/v1/spaces/${other}/threads`,{title:'other'},201)).data.thread.id;
 const op=(await request('POST',`/api/v1/spaces/${other}/threads/${ot}/posts`,{kind:'note',title:'PRIVATE_TITLE_SENTINEL',summary:'private',body:'PRIVATE_BODY_SENTINEL'},201)).data.post;
 stored(summary,{source_refs:[ref(target),ref(op),{post_id:'missing',revision:1}]});
 c=await context();const ss=c.data.pinned_summaries[0].source_refs;assert.equal(ss[1].status,'unavailable');assert.equal(ss[1].has_newer_revision,null);assert.equal(ss[2].status,'unavailable');assert(!JSON.stringify(c).includes('PRIVATE_TITLE_SENTINEL'));
 await request('POST',`/api/v1/spaces/${sid}/posts/${target.id}/withdraw`,{expected_revision:2,reason:'withdraw'},200);
 c=await context();assert.equal(c.data.pinned_summaries[0].source_refs[0].status,'withdrawn');assert(c.data.blocking_objections.some(r=>r.state==='open'));mark('KV05');
 stored(source,{issue:'ISSUE_REDACT_SENTINEL',impact:'IMPACT_REDACT_SENTINEL'});
 await request('POST',`/api/v1/spaces/${sid}/redactions`,{target_type:'post',target_id:target.id,reason:'redact'},201);
 c=await context();const blocking=c.data.blocking_objections[0];assert.equal(blocking.issue,null);assert.equal(blocking.impact,null);assert.equal(blocking.target_has_newer_revision,null);assert.deepEqual(new Set(blocking.missing_fields),new Set(['issue','impact']));assert(!JSON.stringify(c).includes('ISSUE_REDACT_SENTINEL'));assert.equal(c.data.pinned_summaries[0].source_refs[0].status,'redacted');const unauthorized=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/views/findings`});assert.equal(unauthorized.statusCode,401);mark('KV06');
 storage.appendEvent(sid,{id:'private-fixture-event',type:'post.created',object_id:'PRIVATE_EVENT_SENTINEL',revision:null,visibility:'private',actor_id:source.author_id,created_at:new Date().toISOString()});
 c=await context();assert(!JSON.stringify(c.data.recent_activity).includes('PRIVATE_EVENT_SENTINEL'));mark('KV07',{fixture_origin:'explicit storage nonpublic event'});
 // Force additions alone above 4096 without promising hard-length trimming.
 stored(summary,{source_refs:Array.from({length:100},(_,i)=>({post_id:`absent-${i}-`+'x'.repeat(40),revision:1}))});
 const small=await context(4096),large=await context(65536);assert.equal(small.meta.truncated,true);assert.equal(large.meta.truncated,false);assert(Buffer.byteLength(JSON.stringify(large.data))>4096);mark('KV08',{measurement:'assembled data includes added source status fields',hard_length_limit_claimed:false});
 console.log(JSON.stringify({passes:true,results,limits:['KV09 requires full regression/integrity separately','storage fixtures are not captured historical HTTP','loopback app.inject; no external service/model','no hard context budget claim']},null,2));
}catch(e){console.log(JSON.stringify({passes:false,results,error:{name:e.name,message:e.message,stack:e.stack},snapshot:snapshot()},null,2));process.exitCode=1;}finally{await app.close();db.close();}
