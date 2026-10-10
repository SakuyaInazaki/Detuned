import {it,expect} from 'vitest';
import {fork,spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
interface Message {type:string;id?:number;url?:string;result?:any;error?:string;code?:string}
const helper=new URL('../helpers/m4-read-cli-worker.mjs',import.meta.url);let sequence=0;
const wait=(child:ChildProcess,predicate:(m:Message)=>boolean)=>new Promise<Message>((done,reject)=>{
 const timer=setTimeout(()=>finish(Error('Private read worker IPC deadline')),10000);
 const receive=(m:Message)=>{if(predicate(m))finish(undefined,m);};
 const exited=()=>finish(Error('Private read worker exited before result'));
 function finish(error?:Error,message?:Message){clearTimeout(timer);child.off('message',receive);child.off('exit',exited);error?reject(error):done(message!);}
 child.on('message',receive);child.once('exit',exited);
});
const run=(child:ChildProcess,operation:string)=>{const id=++sequence,pending=wait(child,m=>m.type==='result'&&m.id===id);child.send({type:'run',id,operation});return pending;};
const stop=async(child:ChildProcess)=>{if(child.exitCode!==null||child.signalCode!==null)return;await new Promise<void>(done=>{const timer=setTimeout(()=>child.kill('SIGKILL'),3000);child.once('exit',()=>{clearTimeout(timer);done();});child.send({type:'close'});});};
function cli(url:string,args:string[],token?:string){
 return new Promise<{code:number|null;out:string;err:string;data:any}>((done,reject)=>{
  const env:NodeJS.ProcessEnv={PATH:process.env.PATH};if(token)env.DETUNED_TOKEN=token;
  const child=spawn(process.execPath,[resolve('packages/cli/dist/index.js'),'--url',url,'--json',...args],{env,stdio:['ignore','pipe','pipe']});
  let out='',err='',expired=false;child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  const timer=setTimeout(()=>{expired=true;child.kill('SIGKILL');},15000);
  const append=(kind:'out'|'err',text:string)=>{if(kind==='out')out+=text;else err+=text;if(out.length+err.length>1024*1024){expired=true;child.kill('SIGKILL');}};
  child.stdout.on('data',s=>append('out',s));child.stderr.on('data',s=>append('err',s));
  child.once('error',()=>{clearTimeout(timer);reject(Error('Private CLI spawn failed'));});child.once('close',code=>{clearTimeout(timer);if(expired)return reject(Error('Private CLI bounded deadline/output exceeded'));let data;try{data=JSON.parse(out);}catch{}done({code,out,err,data});});
 });
}
const note=(text:string)=>({kind:'note',title:text,summary:text,body:text+' body',structured:{},tags:['independent']});
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'detuned-m4-read-independent-')),dir=join(root,'data');await mkdir(dir,{mode:0o700});
 const child=fork(helper,[dir],{env:{PATH:process.env.PATH},stdio:['ignore','ignore','ignore','ipc']});
 try{await wait(child,m=>m.type==='ready');const init=await run(child,'initialize');expect(Boolean(init.error)).toBe(false);const url=init.url!,admin=init.result.adminToken;
  const http=async(method:string,path:string,body?:unknown,token:string|null=admin)=>{const response=await fetch(url+'/api/v1'+path,{method,headers:{...token?{authorization:'Bearer '+token}:{},...body===undefined?{}:{'content-type':'application/json'},'idempotency-key':'m4-independent-'+(++sequence)},...body===undefined?{}:{body:JSON.stringify(body)},signal:AbortSignal.timeout(10000)});return{status:response.status,body:await response.json() as any};};
  const create=async(path:string,body:unknown)=>{const r=await http('POST',path,body);expect(r.status).toBe(201);return r.body.data;};
  const a=(await create('/spaces',{slug:'m4-public-actor',objective:'finite read fixture',rules:[]})).space.id,b=(await create('/spaces',{slug:'m4-other-private',objective:'other identity boundary',rules:[]})).space.id;
  const thread=(await create(`/spaces/${a}/threads`,{title:'independent read thread'})).thread.id;
  const actor=(await create('/admin/actors',{kind:'agent',display_name:'ordinary read identity'})).id;
  await create(`/spaces/${a}/memberships`,{actor_id:actor,role:'observer'});const credential=await create('/admin/credentials',{actor_id:actor,allowed_space_ids:[a],capabilities:['read']});
  return{root,dir,child,url,admin,a,b,thread,actor,ordinary:credential.token,credentialId:credential.credential_id,http,create,stats:async()=>(await run(child,'stats')).result,cleanup:async()=>{await stop(child);await rm(root,{recursive:true,force:true});}};
 }catch(error){await stop(child);await rm(root,{recursive:true,force:true});throw error;}
}
async function pages(f:Awaited<ReturnType<typeof fixture>>,args:string[],token=f.admin){const items:any[]=[];let cursor:string|undefined;for(let i=0;i<8;i++){const r=await cli(f.url,[...args,'--limit','1',...cursor!==undefined?['--cursor',cursor]:[]],token);expect(r.code).toBe(0);expect(Object.keys(r.data).sort()).toEqual(['data','meta']);expect(Array.isArray(r.data.data)).toBe(true);items.push(...r.data.data);if(r.data.meta.next_cursor===null)return items;expect(typeof r.data.meta.next_cursor).toBe('string');cursor=r.data.meta.next_cursor;}throw Error('Private fixture paging failed to terminate');}

it('M4 independent built CLI identities and isolated list/history pages retain existing fixed reads',async()=>{
 const f=await fixture();try{
  const second=(await f.create(`/spaces/${f.a}/threads`,{title:'archived independent thread'})).thread.id;expect((await f.http('PATCH',`/spaces/${f.a}/threads/${second}`,{expected_version:1,state:'archived'})).status).toBe(200);
  const post=(await f.create(`/spaces/${f.a}/threads/${f.thread}/posts`,note('read history v1'))).post.id;
  for(let revision=2;revision<=3;revision++)await f.create(`/spaces/${f.a}/posts/${post}/revisions`,{expected_revision:revision-1,title:'read history v'+revision,summary:'independent revision',body:'version '+revision});
  const me=await cli(f.url,['me'],f.ordinary);expect(me.code).toBe(0);expect(me.data.actor.id).toBe(f.actor);expect((await cli(f.url,['capabilities'],f.ordinary)).data).toEqual((await f.http('GET','/capabilities',undefined,f.ordinary)).body.data);
  expect((await pages(f,['space','list'])).map(x=>x.id).sort()).toEqual([f.a,f.b].sort());expect((await pages(f,['space','list'],f.ordinary)).map(x=>x.id)).toEqual([f.a]);
  expect((await pages(f,['thread','list',f.a],f.ordinary)).map(x=>x.id).sort()).toEqual([f.thread,second].sort());const archived=await cli(f.url,['thread','list',f.a,'--state','archived'],f.ordinary);expect(archived.code).toBe(0);expect(archived.data.data.map((x:any)=>x.id)).toEqual([second]);
  const hidden=await cli(f.url,['thread','list',f.b],f.ordinary);expect(hidden.code).toBe(1);expect(hidden.data.error.code).toBe('NOT_FOUND');expect(hidden.out.includes('m4-other-private')).toBe(false);
  expect((await pages(f,['post','revisions',f.a,post],f.ordinary)).map(x=>x.revision).sort()).toEqual([1,2,3]);
  const old=await cli(f.url,['read','--space',f.a,'--kind','post','--id',post,'--revision','1'],f.ordinary);expect(old.code).toBe(0);expect(old.data).toEqual((await f.http('GET',`/spaces/${f.a}/posts/${post}?revision=1`,undefined,f.ordinary)).body.data);expect(Object.hasOwn(old.data,'meta')).toBe(false);
  const fixed=await cli(f.url,['post','read',f.a,post,'--revision','1'],f.ordinary),directory=await cli(f.url,['thread','posts',f.a,f.thread],f.ordinary);expect(fixed.code).toBe(0);expect(directory.code).toBe(0);expect(Object.keys(fixed.data).sort()).toEqual(['data','meta']);expect(Object.keys(directory.data).sort()).toEqual(['data','meta']);expect(directory.data.data.posts.map((x:any)=>x.id)).toEqual([post]);
 }finally{await f.cleanup();}
},90000);

it('M4 independent search legacy array and signed page cursor retain server binding and local invalid limits send no HTTP',async()=>{
 const f=await fixture();try{
  const other=(await f.create(`/spaces/${f.a}/threads`,{title:'another searchable thread'})).thread.id,ids:string[]=[];
  for(let i=0;i<3;i++)ids.push((await f.create(`/spaces/${f.a}/threads/${i===2?other:f.thread}/posts`,note('independent needle '+i))).post.id);
  const base=['search','--space',f.a,'--query','independent needle','--limit','1'];const legacy=await cli(f.url,base,f.ordinary);expect(legacy.code).toBe(0);expect(Array.isArray(legacy.data)).toBe(true);expect(legacy.data).toHaveLength(1);
  const first=await cli(f.url,[...base,'--page'],f.ordinary);expect(first.code).toBe(0);expect(Object.keys(first.data).sort()).toEqual(['data','meta']);expect(first.data.data).toEqual(legacy.data);expect(typeof first.data.meta.next_cursor).toBe('string');let cursor=first.data.meta.next_cursor;const got=[first.data.data[0].post_id];
  for(let i=0;i<3&&cursor!==null;i++){const next=await cli(f.url,[...base,'--cursor',cursor],f.ordinary);expect(next.code).toBe(0);expect(Object.hasOwn(next.data,'meta')).toBe(true);got.push(...next.data.data.map((x:any)=>x.post_id));cursor=next.data.meta.next_cursor;}
  expect(cursor).toBe(null);expect(got.sort()).toEqual(ids.sort());expect(new Set(got).size).toBe(3);
  const bound=await cli(f.url,['search','--space',f.a,'--query','changed query','--limit','1','--cursor',first.data.meta.next_cursor],f.ordinary);expect(bound.code).toBe(2);expect(bound.data.error.code).toBe('VALIDATION_ERROR');
  const filtered=await cli(f.url,['search','--space',f.a,'--query','independent needle','--thread',f.thread,'--page'],f.ordinary);expect(filtered.code).toBe(0);expect(filtered.data.data).toHaveLength(2);expect(filtered.data.data.every((x:any)=>x.thread_id===f.thread)).toBe(true);
  const before=(await f.stats()).count;for(const value of ['20tail','1.5','101','PRIVATE_INVALID_LIMIT'])for(const args of [['space','list'],['thread','list',f.a],['post','revisions',f.a,ids[0]],['search','--space',f.a,'--query','needle']]){const invalid=await cli(f.url,[...args,'--limit',value],f.ordinary);expect(invalid.code).toBe(2);expect(invalid.out.includes(value)||invalid.err.includes(value)).toBe(false);}expect((await f.stats()).count).toBe(before);
 }finally{await f.cleanup();}
},90000);

it('M4 independent anonymous health follows actual readiness, identity/admin errors and closed connection without credentials or paths',async()=>{
 const f=await fixture();try{
  expect((await cli(f.url,['health','live'])).data).toEqual({status:'alive'});expect((await cli(f.url,['health','ready'])).data).toEqual({status:'ready'});const anonymousHeaders=(await f.stats()).healthAuth;expect(anonymousHeaders).toHaveLength(2);expect(anonymousHeaders.every((x:boolean)=>x===false)).toBe(true);
  const me=await cli(f.url,['me']);expect(me.code).toBe(3);expect(me.data.error.code).toBe('UNAUTHENTICATED');const denied=await cli(f.url,['diagnostics'],f.ordinary);expect(denied.code).toBe(3);expect(denied.data.error.code).toBe('FORBIDDEN');const admin=await cli(f.url,['diagnostics'],f.admin);expect(admin.code).toBe(0);expect(admin.data.ready).toBe(true);expect(admin.out.includes(f.dir)||admin.out.includes(f.admin)).toBe(false);
  for(const [mutate,restore] of [['directory-hide','directory-restore'],['schema-bad','schema-restore']]){await run(f.child,mutate);const result=await cli(f.url,['health','ready']);expect(result.code).toBe(1);expect(result.data.error.code).toBe('SERVICE_NOT_READY');expect(result.data.error.details).toEqual({ready:false});expect(result.out.includes(f.dir)||result.err.includes(f.dir)||result.out.includes(f.admin)).toBe(false);expect((await cli(f.url,['health','live'])).data).toEqual({status:'alive'});await run(f.child,restore);expect((await cli(f.url,['health','ready'])).data).toEqual({status:'ready'});}
  expect((await f.http('POST',`/admin/credentials/${f.credentialId}/revoke`)).status).toBe(200);const revoked=await cli(f.url,['me'],f.ordinary);expect(revoked.code).toBe(3);expect(revoked.data.error.code).toBe('UNAUTHENTICATED');await run(f.child,'shutdown-http');const closed=await cli(f.url,['health','live']);expect(closed.code).not.toBe(0);expect(closed.data.error.code).toBeTruthy();expect(closed.out.includes(f.admin)||closed.err.includes(f.admin)).toBe(false);
 }finally{await f.cleanup();}
},90000);

it('M4 independent three knowledge views keep data-only material, invalid enum sends no request, health abort preserves shared client behavior',async()=>{
 const f=await fixture();try{
  const claim=await f.create(`/spaces/${f.a}/threads/${f.thread}/posts`,{kind:'claim',title:'independent finding',summary:'finding',body:'finite claim',structured:{statement:'finite statement',assumptions:[],scope:'fixture',falsification_plan:'verify routes'}});
  const failure=await f.create(`/spaces/${f.a}/threads/${f.thread}/posts`,{kind:'failure',title:'independent failure',summary:'failure',body:'finite failure',structured:{attempt:'private fixture',category:'test_failure',assumptions:[],tested_scope:'local',expected:'finite observation',observed:'bounded result',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'fixture contains no external evidence',ruled_out:'none',not_ruled_out:['other cases'],retry_when:['contract changes']}});
  const question=await f.create(`/spaces/${f.a}/threads/${f.thread}/posts`,{kind:'question',title:'independent question',summary:'question',body:'finite open question'});
  for(const [name,id] of [['findings',claim.post.id],['failures',failure.post.id],['open-questions',question.post.id]]){const result=await cli(f.url,['view',f.a,name],f.ordinary);expect(result.code).toBe(0);expect(Array.isArray(result.data)).toBe(true);expect(result.data.length).toBeGreaterThan(0);expect(result.data.some((x:any)=>x.post_id===id)).toBe(true);expect(Object.hasOwn(result.data,'meta')).toBe(false);expect(result.data).toEqual((await f.http('GET',`/spaces/${f.a}/views/${name}`,undefined,f.ordinary)).body.data);}
  const before=(await f.stats()).count;for(const args of [['thread','list',f.a,'--state','PRIVATE_INVALID_ENUM'],['view',f.a,'PRIVATE_INVALID_ENUM']]){const result=await cli(f.url,args,f.ordinary);expect(result.code).toBe(2);expect(result.out.includes('PRIVATE_INVALID_ENUM')||result.err.includes('PRIVATE_INVALID_ENUM')).toBe(false);}expect((await f.stats()).count).toBe(before);
  const abort=(await run(f.child,'abort-health')).result;expect(abort).toEqual([{resolved:false,name:'UserAbortError'},{resolved:false,name:'UserAbortError'}]);expect((await f.stats()).count).toBe(before);
 }finally{await f.cleanup();}
},90000);
