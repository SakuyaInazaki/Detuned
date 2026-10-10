import {it,expect} from 'vitest';
import {fork,execFile,type ChildProcess} from 'node:child_process';
import {mkdtemp,mkdir,rm,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
interface Message{type:string;id?:number;url?:string;result?:any;status?:number;body?:any;error?:string;code?:string;retryAfter?:string|null;keys?:string[];statuses?:number[]}
const helper=new URL('../helpers/m3-resource-limits-worker.mjs',import.meta.url);let serial=0;
type Awaiter={predicate:(m:Message)=>boolean;success:(m:Message)=>void;failure:(e:Error)=>void};
const channels=new WeakMap<ChildProcess,Set<Awaiter>>();
const wait=(p:ChildProcess,predicate:(m:Message)=>boolean)=>new Promise<Message>((done,reject)=>{
 let channel=channels.get(p);if(!channel){channel=new Set();channels.set(p,channel);const pending=channel;p.on('message',(m:Message)=>{for(const entry of [...pending])if(entry.predicate(m))entry.success(m);});p.once('exit',()=>{for(const entry of [...pending])entry.failure(Error('Resource-limit worker exited before private result'));});}
 const pending=channel;const entry:Awaiter={predicate,success:m=>{clearTimeout(timer);pending.delete(entry);done(m);},failure:e=>{clearTimeout(timer);pending.delete(entry);reject(e);}};const timer=setTimeout(()=>entry.failure(Error('Bounded private resource-limit IPC deadline')),20000);pending.add(entry);
});
const start=async(mode:string,dir?:string)=>{const child=fork(helper,[mode,...dir?[dir]:[]],{stdio:['ignore','ignore','pipe','ipc'],env:{PATH:process.env.PATH}});child.stderr?.setEncoding('utf8');let stderr='';child.stderr?.on('data',x=>stderr+=x);try{return{child,...await wait(child,m=>m.type==='ready')};}catch(e){child.kill('SIGKILL');throw Error(String(e)+' '+stderr);}};
const stop=async(p:ChildProcess)=>{if(p.exitCode!==null||p.signalCode!==null)return;await new Promise<void>(done=>{const timer=setTimeout(()=>p.kill('SIGKILL'),3000);p.once('exit',()=>{clearTimeout(timer);done();});p.send({type:'close'});});};
const begin=(p:ChildProcess,input:Record<string,unknown>)=>{const id=++serial,pending=wait(p,m=>m.type==='result'&&m.id===id);void pending.catch(()=>{});p.send({...input,id,type:'run'});return{id,pending};};const run=(p:ChildProcess,input:Record<string,unknown>)=>begin(p,input).pending;
const GiB=1024**3;
const defaultLimits={database_max_bytes:GiB,artifact_max_total_bytes:4*GiB,artifact_max_objects:10000};
const payload=(text='ordinary bounded research')=>({kind:'note',title:'resource acceptance',summary:'finite independent fixture',body:text});
const fixture=async(limits=defaultLimits)=>{
 const root=await mkdtemp(join(tmpdir(),'detuned-resource-limits-independent-')),dir=join(root,'data');await mkdir(dir,{mode:0o700});let server=(await start('server',dir)).child;const client=(await start('client')).child;
 try{let init=await run(server,{operation:'initialize',limits});expect(Boolean(init.error)).toBe(false);let url=init.url!,admin=init.result.adminToken;
 const call=(method:string,path:string,body?:unknown,key?:string)=>run(client,{operation:'request',url,token:admin,method,path,body,key});
 const space=(await call('POST','/spaces',{slug:'resource-independent',objective:'finite quota fixture',rules:[]})).body.data.space.id;
 const thread=(await call('POST',`/spaces/${space}/threads`,{title:'resource material'})).body.data.thread.id;
 const stats=async()=>(await run(server,{operation:'stats'})).result;
 const upload=(bytes:number,key?:string)=>run(client,{operation:'upload',url,token:admin,method:'POST',path:`/spaces/${space}/artifacts`,bytes,key});
 const reopen=async(newLimits=limits)=>{await stop(server);server=(await start('server',dir)).child;init=await run(server,{operation:'initialize',limits:newLimits});if(!init.error)url=init.url!;return init;};
 return{root,dir,client,space,thread,call,upload,stats,reopen,get server(){return server;},get url(){return url;},admin,cleanup:async()=>{await Promise.all([stop(server),stop(client)]);await rm(root,{recursive:true,force:true});}};
 }catch(e){await Promise.all([stop(server),stop(client)]);await rm(root,{recursive:true,force:true});throw e;}
};
const quota=(r:Message)=>{expect(r.status).toBe(507);expect(r.body.error.code).toBe('QUOTA_EXCEEDED');expect(r.body.error.retryable).toBe(false);};

it('M3.4-A2 independent natural bounded research fills real main database, rolls back failed post/event/idempotency and keeps reads usable',async()=>{
 const f=await fixture({...defaultLimits,database_max_bytes:1024**2});try{
 const initial=await f.stats();expect(initial.maxPageCount*initial.pageSize).toBe(1024**2);let failed=false;
 for(let i=0;i<32;i++){const before=await f.stats(),r=await f.call('POST',`/spaces/${f.space}/threads/${f.thread}/posts`,payload('R'.repeat(60000)),'natural-full-'+i);if(r.status===507){quota(r);expect((await f.stats()).counts).toEqual(before.counts);failed=true;break;}expect(r.status).toBe(201);}
 expect(failed).toBe(true);expect((await f.call('GET','/spaces')).status).toBe(200);
 const before=await f.stats(),r=await run(f.client,{operation:'shared-write',url:f.url,token:f.admin,space:f.space,thread:f.thread,body:payload('R'.repeat(60000)),key:'complete-507'});expect(r.result).toMatchObject({resolved:false,calls:1,code:'QUOTA_EXCEEDED',retryable:false});expect((await f.stats()).counts).toEqual(before.counts);
 }finally{await f.cleanup();}
},60000);

it('M3.4-A2 independent real uploads race global bytes and object quotas, replay and restarted service preserve registered usage',async()=>{
 for(const limits of [{...defaultLimits,artifact_max_total_bytes:10},{...defaultLimits,artifact_max_objects:1}]){const f=await fixture(limits);try{
 const before=await f.stats(),responses=await Promise.all([f.upload(6,'quota-race-a'),f.upload(6,'quota-race-b')]);expect(responses.map(r=>r.status).sort()).toEqual([201,507]);const winner=responses.find(r=>r.status===201)!,loser=responses.find(r=>r.status===507)!;quota(loser);const key=responses[0].status===201?'quota-race-a':'quota-race-b';const replay=await f.upload(6,key);expect(replay.status).toBe(201);expect(replay.body.data.id).toBe(winner.body.data.id);const after=await f.stats();expect(after.counts.artifacts-before.counts.artifacts).toBe(1);expect(after.counts.events-before.counts.events).toBe(1);expect(after.counts.idempotency_records-before.counts.idempotency_records).toBe(1);expect(after.files).toHaveLength(1);
 expect(Boolean((await f.reopen()).error)).toBe(false);quota(await f.upload(6,'quota-after-restart'));expect((await f.upload(6,key)).status).toBe(201);expect((await f.stats()).counts).toEqual(after.counts);
 }finally{await f.cleanup();}}
},60000);

it('M3.4-A2 independent huge missing declarations reject runtime startup deterministically without SUM overflow or research mutation',async()=>{
 const f=await fixture();try{const me=await f.call('GET','/me');const seeded=await run(f.server,{operation:'seed-missing',space:f.space,actor:me.body.data.actor.id});expect(seeded.result.rows).toBe(1025);const before=await f.stats(),logical=(await run(f.server,{operation:'logical-snapshot'})).result;const refused=await f.reopen();expect(refused.code).toBe('QUOTA_EXCEEDED');
 // Runtime refusal is distinct from maintaining/importing large declared missing manifests.
 const cli=await new Promise<{code:number;text:string}>(done=>execFile(process.execPath,[resolve('packages/cli/dist/index.js'),'--json','serve','--data-dir',f.dir],{timeout:10000,env:{PATH:process.env.PATH}},(e,out,err)=>done({code:e?(typeof e.code==='number'?e.code:1):0,text:out+err})));expect(cli.code).not.toBe(0);expect(cli.text.includes('QUOTA_EXCEEDED')).toBe(true);expect(cli.text.includes('SQLITE_ERROR')).toBe(false);expect(before.counts.artifacts).toBe(1025);expect((await run(f.server,{operation:'inspect-closed'})).result).toEqual(logical);
 }finally{await f.cleanup();}
},60000);

it('M3.4-A2 independent published artifact real allocation FULL cleans this call files and CLI invalid resource config is rejected before mkdir',async()=>{
 const f=await fixture({...defaultLimits,database_max_bytes:1024**2});try{
 const before=await f.stats();expect((await run(f.server,{operation:'arm-artifact-full'})).result.armed).toBe(true);const failure=await f.upload(10,'published-then-real-full');quota(failure);const after=await f.stats();expect(after.counts).toEqual(before.counts);expect(after.files).toEqual(before.files);expect(after.published-before.published).toBe(1);expect(after.discardedPublished-before.discardedPublished).toBe(1);expect((await f.call('GET','/spaces')).status).toBe(200);
 const marker='PRIVATE_INVALID_RESOURCE_CONFIG';for(const [flag,value] of [['--max-database-bytes',marker],['--max-database-bytes','1048575'],['--max-artifact-bytes','0'],['--max-artifact-objects','10001']]){const target=join(f.root,'bad-config-'+ ++serial),r=await new Promise<{code:number;leaked:boolean}>(done=>execFile(process.execPath,[resolve('packages/cli/dist/index.js'),'--json','serve','--data-dir',target,flag,value],{timeout:10000,env:{PATH:process.env.PATH}},(e,out,err)=>done({code:e?(typeof e.code==='number'?e.code:1):0,leaked:(out+err).includes(marker)})));expect(r.code).toBe(2);expect(r.leaked).toBe(false);await expect(lstat(target)).rejects.toMatchObject({code:'ENOENT'});}
 }finally{await f.cleanup();}
},60000);
