import assert from 'node:assert/strict';
import {writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {orderFixture} from './order-fixture.mjs';

// One finite sample, not the earlier ten-minute/1M-event mixed benchmark.
const receipt={scope:'Owned synthetic100k metadata seed; real Bearer HTTP,20ordinary identities,4waves/80requests',window_limit_ms:55000,quantile:'nearest-rank: sorted[ceil(p*n)-1], per wave n=20',target_p95_ms:500,waves:[],distribution:[],explain:[],cleanup:null};
const name=process.argv[2]??'order-performance-first.receipt.json';assert.match(name,/^[a-z0-9-]+\.receipt\.json$/);
let f;let hardTimer;const sqlCalls=new Map();
try {
  f=await orderFixture();const readers=[];
  for(let i=0;i<20;i++) {
    const actor=i<2?f.members[i].actor:(await f.seed('/admin/actors',{kind:'human',display_name:`Private performance reader ${i}`})).id;
    if(i>=2)await f.seed(`/spaces/${f.space}/memberships`,{actor_id:actor,role:'observer'});
    readers.push((await f.seed('/admin/credentials',{actor_id:actor,allowed_space_ids:[f.space],capabilities:['read']})).token);
  }
  const threads=Array.from({length:1000},(_,i)=>`private-perf-thread-${String(i).padStart(4,'0')}`);
  const insertThread=f.db.prepare('INSERT INTO threads(id,space_id,title,version,state,creator_id,created_at,updated_at) VALUES(?,?,?,1,\'open\',?,?,?)');
  const insertPost=f.db.prepare('INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) VALUES(?,?,?,?,\'note\',1,\'active\',?)');
  const seedStart=performance.now();
  f.db.transaction(()=>{
    for(const id of threads)insertThread.run(id,f.space,'私有性能主题',f.members[0].actor,f.clock.nowIso(),f.clock.nowIso());
    for(let i=0;i<100000;i++)insertPost.run(`private-perf-post-${String(i).padStart(6,'0')}`,f.space,threads[i%1000],f.members[0].actor,new Date(Date.parse('2026-01-01T00:00:00.000Z')+(100000-i)*1000).toISOString());
  })();
  receipt.seed={method:'Owned direct transaction,metadata posts only,no revisions/events; not100kHTTPwrites',milliseconds:performance.now()-seedStart,posts:f.db.prepare('SELECT count(*) n FROM posts').get().n,threads:f.db.prepare('SELECT count(*) n FROM threads').get().n};
  const originalPrepare=f.db.prepare.bind(f.db);
  f.db.prepare=function(sql){const statement=originalPrepare(sql);if(/^\s*SELECT/i.test(sql)&&/FROM posts\b/i.test(sql)&&/strftime/i.test(sql)){const all=statement.all.bind(statement);statement.all=(...args)=>{sqlCalls.set(sql+'\n'+JSON.stringify(args),{sql,args});return all(...args);};}return statement;};
  const windowStart=performance.now();hardTimer=setTimeout(()=>{receipt.hard_deadline_reached=true;process.exitCode=1;f.app.server.closeAllConnections();},55000);
  function distribution(label){const counts=f.db.prepare('SELECT thread_id,count(*) n FROM posts GROUP BY thread_id').all();receipt.distribution.push({label,total_posts:counts.reduce((s,r)=>s+r.n,0),nonempty_threads:counts.length,min_posts:Math.min(...counts.map(r=>r.n)),max_posts:Math.max(...counts.map(r=>r.n))});}
  async function wave(label,threadIds,cursors) {
    if(performance.now()-windowStart>50000)throw new Error('Bounded performance window exhausted before next wave');
    const counts=f.counts();const results=await Promise.all(threadIds.map(async(thread,i)=>{
      const start=performance.now();try{const r=await f.request(`/spaces/${f.space}/threads/${thread}/posts`,readers[i],{sort:'created_at_asc',limit:20,max_bytes:12288,...(cursors?{cursor:cursors[i]}:{})});return {milliseconds:performance.now()-start,status:r.status,items:r.json.data?.posts?.length??0,ids:r.json.data?.posts?.map(p=>p.id)??[],cursor:r.json.meta?.next_cursor??null};}catch(e){return {milliseconds:performance.now()-start,status:0,items:0,ids:[],cursor:null,error:e.name};}
    }));assert.deepEqual(f.counts(),counts);
    const times=results.map(r=>r.milliseconds).sort((a,b)=>a-b);const quant=p=>times[Math.ceil(p*times.length)-1];
    receipt.waves.push({label,concurrency:20,samples:20,p50_ms:quant(.5),p95_ms:quant(.95),max_ms:times.at(-1),errors:results.filter(r=>r.status!==200).map(r=>({status:r.status,error:r.error??null})),returned_counts:results.map(r=>r.items),business_counts_unchanged:true,p95_under_500ms:quant(.95)<500});
    assert.equal(results.every(r=>r.status===200&&r.items===20&&typeof r.cursor==='string'),true,'Actual finite new-sort20item HTTP pages');return results;
  }
  distribution('ordinary1000threadsAverage100');
  const ordinaryIds=threads.slice(0,20);const first=await wave('ordinary-first20',ordinaryIds);const next=await wave('ordinary-next20',ordinaryIds,first.map(r=>r.cursor));
  assert.equal(next.every((r,i)=>r.ids.every(id=>!first[i].ids.includes(id))),true,'Each own cursor advances without overlap');
  // Deliberate fixture-only redistribution after ordinary two waves; no concurrent writes during either read phase.
  f.db.prepare('UPDATE posts SET thread_id=?').run(threads[0]);distribution('concentrated100kOneThread');
  const concentratedIds=Array(20).fill(threads[0]);const dense=await wave('concentrated-first20',concentratedIds);const denseNext=await wave('concentrated-next20',concentratedIds,dense.map(r=>r.cursor));
  assert.equal(denseNext.every((r,i)=>r.ids.every(id=>!dense[i].ids.includes(id))),true,'Concentrated own cursors advance');
  receipt.window_ms=performance.now()-windowStart;clearTimeout(hardTimer);
  receipt.requests=receipt.waves.reduce((n,w)=>n+w.samples,0);receipt.all_p95_under_500ms=receipt.waves.every(w=>w.p95_under_500ms);
  for(const {sql,args}of sqlCalls.values())receipt.explain.push({sql,parameters:args,plan:originalPrepare('EXPLAIN QUERY PLAN '+sql).all(...args)});
  receipt.resources={rss_bytes:process.memoryUsage().rss,db_bytes:(await stat(path.join(f.owned,'forum.sqlite'))).size};
  receipt.caller_index_ddl_changes=false;receipt.runtime_index=f.db.prepare("SELECT type,tbl_name,sql FROM sqlite_master WHERE name='posts_thread_created_sort_v1'").get()??null;receipt.ordinary_read_accounts=20;
  receipt.hardware={logical_cpus:os.cpus().length,total_memory_bytes:os.totalmem(),platform:process.platform,node:process.version};
}catch(error){receipt.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{clearTimeout(hardTimer);if(f)receipt.cleanup=await f.close();await writeFile(new URL(name,import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({waves:receipt.waves,requests:receipt.requests??0,window_ms:receipt.window_ms??null,failure:receipt.failure??null,cleanup:receipt.cleanup}));}
