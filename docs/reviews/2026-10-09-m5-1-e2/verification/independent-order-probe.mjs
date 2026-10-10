import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {DetunedClient} from '../../../../packages/client/dist/index.js';
import {DETUNED_TOOLS} from '../../../../packages/protocol/dist/index.js';
import {createPiRuntime} from '../../../../packages/adapter-pi/dist/runtime.js';
import {adaptToolSchema} from '../../../../packages/adapter-pi/dist/index.js';
import {orderFixture} from './order-fixture.mjs';

const receipt={scope:'Independent real SQLite/Bearer HTTP/CLI/MCP stdio/Pi product runtime; no model or Pi native host',checks:[],cleanup:null};
const name=process.argv[2]??'independent-order-first.receipt.json';assert.match(name,/^[a-z0-9-]+\.receipt\.json$/);
let f,transport,sdk,pi;
const ok=(value,label)=>assert.equal(Boolean(value),true,label);
const error=(r,status,code)=>ok(r.status===status&&r.json.error?.code===code,'Expected fixed HTTP error');
async function group(name,fn){receipt.checks.push({name,passed:true,details:await fn()});}
try {
  f=await orderFixture();const actor=f.members[0],peer=f.members[1];
  const ids=[];
  for(let i=0;i<36;i++)ids.push((await f.seed(`/spaces/${f.space}/threads/${f.thread}/posts`,{kind:'note',title:`Private order ${i}`,summary:'Multibyte metadata '+ '研究🧪'.repeat(20),body:'Actual fixed research body'},'POST',actor.token)).post.id);
  const sorted=ids.toSorted(),known=new Map(),unknown=new Map();
  // Synthetic historical created_at values on legally created owned posts only.
  for(let i=0;i<30;i++)known.set(sorted[i],i<2?'2026-01-01T00:00:00.000Z':`2025-12-${String(31-i).padStart(2,'0')}T00:00:00.000Z`);
  const invalid=['2026-02-30T00:00:00.000Z','2026-01-01T00:00:00Z','2026-01-01T01:00:00.000+01:00','unknown historical time','2026-11-31T00:00:00.000Z','2026-01-01T24:00:00.000Z'];
  for(let i=30;i<36;i++)unknown.set(sorted[i],invalid[i-30]);
  const update=f.db.prepare('UPDATE posts SET created_at=? WHERE id=?');f.db.transaction(()=>{for(const [id,time]of [...known,...unknown])update.run(time,id);})();
  const expected=[...known.keys()].sort((a,b)=>known.get(a).localeCompare(known.get(b))||a.localeCompare(b)).concat([...unknown.keys()].sort());
  const route=`/spaces/${f.space}/threads/${f.thread}/posts`;let firstCursor;
  const before=f.counts();
  await group('canonical UTC/ties/unknown history and full-wire byte-trim keyset',async()=>{
    let cursor;const seen=[];let pages=0,max=0,trim=false;
    do {
      const r=await f.request(route,actor.token,{sort:'created_at_asc',limit:100,max_bytes:4096,cursor});ok(r.status===200&&r.bytes<=4096,'Actual full UTF8 wire budget');
      max=Math.max(max,r.bytes);trim||=r.json.meta.truncated;
      ok(r.json.data.posts.every(p=>!Object.hasOwn(p,'sort_key')),'Private SQL key is not public');
      for(const p of r.json.data.posts){seen.push(p.id);ok(p.created_at===(known.get(p.id)??unknown.get(p.id)),'Unknown original timestamp preserved');}
      cursor=r.json.meta.next_cursor;
      if(cursor){const payload=f.signer.verify(cursor,f.secret,Math.floor(f.clock.value/1000));const tail=r.json.data.posts.at(-1);ok(payload.after_id===tail.id&&payload.after_key===(known.get(tail.id)??null),'Cursor binds actual emitted tail');}
      if(!pages++)firstCursor=cursor;
    }while(cursor&&pages<30);
    assert.deepEqual(seen,expected);ok(!cursor&&trim,'Byte-trim pages complete without duplicate/gap');assert.deepEqual(f.counts(),before);
    return {posts:seen.length,pages,max_wire_bytes:max,unknown_originals_preserved:unknown.size,tie_ids:expected.filter(id=>known.get(id)==='2026-01-01T00:00:00.000Z'),synthetic_historical_timestamp_seed:true};
  });
  await group('cursor binding, unchanged expiry and current ACL',async()=>{
    const issued=f.signer.verify(firstCursor,f.secret,Math.floor(f.clock.value/1000));const t=f.clock.value;
    error(await f.request(route,actor.token,{cursor:firstCursor}),400,'VALIDATION_ERROR');
    error(await f.request(route,actor.token,{cursor:firstCursor,sort:'id_asc'}),400,'VALIDATION_ERROR');
    error(await f.request(route,peer.token,{cursor:firstCursor,sort:'created_at_asc'}),400,'VALIDATION_ERROR');
    error(await f.request(`/spaces/${f.space}/threads/${f.secondThread}/posts`,actor.token,{cursor:firstCursor,sort:'created_at_asc'}),400,'VALIDATION_ERROR');
    error(await f.request(`/spaces/${f.other}/threads/${f.thread}/posts`,actor.token,{cursor:firstCursor,sort:'created_at_asc'}),404,'NOT_FOUND');
    const badPurpose=f.signer.sign({...issued,purpose:'context'},f.secret);error(await f.request(route,actor.token,{cursor:badPurpose,sort:'created_at_asc'}),400,'VALIDATION_ERROR');
    f.clock.value=t+10000;const next=await f.request(route,actor.token,{cursor:firstCursor,sort:'created_at_asc',limit:1});ok(next.status===200,'Valid count continuation');
    ok(f.signer.verify(next.json.meta.next_cursor,f.secret,Math.floor(f.clock.value/1000)).exp===issued.exp,'TTL not renewed');
    f.clock.value=(issued.exp+1)*1000;error(await f.request(route,actor.token,{cursor:firstCursor,sort:'created_at_asc'}),400,'VALIDATION_ERROR');f.clock.value=t;
    const peerStart=await f.request(route,peer.token,{sort:'created_at_asc',limit:1});assert.deepEqual(f.counts(),before);await f.seed(`/spaces/${f.space}/memberships/${peer.actor}`,undefined,'DELETE');
    error(await f.request(route,peer.token,{sort:'created_at_asc',cursor:peerStart.json.meta.next_cursor}),404,'NOT_FOUND');
    return {actor_thread_space_sort_purpose_bound:true,omitted_sort_rejected_for_new_cursor:true,original_expiry_retained:true,controlled_clock_expired:true,withdrawn_membership_rejected:true};
  });
  await group('default id cursor and legacy GET remain compatible; reads do not mutate business state',async()=>{
    const readBefore=f.counts();
    const page=await f.request(route,actor.token,{limit:2});assert.deepEqual(page.json.data.posts.map(p=>p.id),sorted.slice(0,2));
    const payload=f.signer.verify(page.json.meta.next_cursor,f.secret,Math.floor(f.clock.value/1000));ok(payload.sort==='id_asc'&&!Object.hasOwn(payload,'after_key'),'Old id cursor has no new nullable field');
    const old=await f.request(route,actor.token,{limit:2,cursor:page.json.meta.next_cursor});assert.deepEqual(old.json.data.posts.map(p=>p.id),sorted.slice(2,4));
    error(await f.request(route,actor.token,{sort:'created_at_asc',cursor:page.json.meta.next_cursor}),400,'VALIDATION_ERROR');
    const legacy=await f.request(`/spaces/${f.space}/threads/${f.thread}`,actor.token,{limit:2});assert.deepEqual(legacy.json.data.posts.map(p=>p.id),sorted.slice(0,2));
    assert.deepEqual(f.counts(),readBefore);return {old_id_payload_keys:Object.keys(payload).sort(),legacy_get_default_unchanged:true,business_counts_unchanged:true};
  });
  await group('sharedclient, actual CLI and MCP/Pi product wrappers forward advertised sort',async()=>{
    const client=new DetunedClient({baseUrl:f.base,token:actor.token});const args={space_id:f.space,kind:'thread_posts',id:f.thread,sort:'created_at_asc',limit:2};
    const shared=await client.callTool('forum_read',args);assert.deepEqual(shared.data.posts.map(p=>p.id),expected.slice(0,2));
    const cli=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['packages/cli/dist/index.js','--url',f.base,'--token-file',f.tokenFile,'--json','thread','posts',f.space,f.thread,'--sort','created_at_asc','--limit','2'],{env:{PATH:process.env.PATH??'/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});let out='',err='';
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Private CLI deadline'));},10000);child.stdout.on('data',x=>out+=String(x));child.stderr.on('data',x=>err+=String(x));child.on('error',reject);child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,out,err});});
    });ok(cli.code===0&&cli.signal===null&&!cli.err,'Actual isolated CLI success');assert.deepEqual(JSON.parse(cli.out).data.posts.map(p=>p.id),expected.slice(0,2));
    transport=new StdioClientTransport({command:process.execPath,args:['packages/mcp/dist/index.js'],env:{PATH:process.env.PATH??'/usr/bin:/bin',DETUNED_BASE_URL:f.base,DETUNED_TOKEN_FILE:f.tokenFile},stderr:'pipe'});let stderr='';transport.stderr?.on('data',x=>stderr+=String(x));
    sdk=new Client({name:'private-e2-order',version:'1'},{capabilities:{}});await sdk.connect(transport);
    const tools=(await sdk.listTools()).tools;ok(tools.length===8&&JSON.stringify(tools.find(t=>t.name==='forum_read').inputSchema).includes('created_at_asc'),'Actual MCP advertisement includes sort');
    const result=await sdk.callTool({name:'forum_read',arguments:args});ok(result.isError!==true,'MCP successful sort');assert.deepEqual(result.structuredContent.result.data.posts.map(p=>p.id),expected.slice(0,2));await sdk.close();sdk=undefined;transport=undefined;ok(!stderr,'MCP stderr empty');
    const schema=DETUNED_TOOLS.find(t=>t.name==='forum_read').schema;ok(adaptToolSchema(schema)===schema&&JSON.stringify(schema).includes('created_at_asc'),'Pi advertised canonical schema retains sort');
    pi=createPiRuntime({snapshot:()=>({baseUrl:f.base,environmentTokenFile:f.tokenFile})});const returned=await pi.tool('forum_read',args);assert.deepEqual(returned.details.data.posts.map(p=>p.id),expected.slice(0,2));await pi.close();pi=undefined;
    return {sharedclient:true,cli_exit:cli.code,mcp_actual_stdio_advertised_tools:tools.length,mcp_read:true,pi_product_runtime:true,pi_native_host_not_claimed:true};
  });
}catch(error){receipt.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{try{await sdk?.close();await pi?.close();}finally{if(f)receipt.cleanup=await f.close();}await writeFile(new URL(name,import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({checks:receipt.checks.map(r=>r.name),failure:receipt.failure??null,cleanup:receipt.cleanup}));}
