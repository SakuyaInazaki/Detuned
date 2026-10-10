import {it,expect} from 'vitest';
import {createPiRuntime,piResult,safePiError} from '../../packages/adapter-pi/src/runtime.js';
import {ClientProtocolError,UserAbortError} from '@detuned/client';
import {DetunedError,ErrorCode} from '@detuned/protocol';
const actor=(id:string)=>({id,kind:'agent' as const,display_name:id,created_at:'2026-10-09T00:00:00Z',disabled_at:null});
function client(id:string,counts:{cap:number;me:number;session:number;tool:number}){return {
 getCapabilities:async()=>{counts.cap++;return {data:{api_version:'1'}} as any;},
 getMe:async()=>{counts.me++;return {data:{actor:actor(id),capabilities:["read","write"],allowed_space_ids:["space"],visible_spaces:[]}} as any;},
 createSession:async(space:string)=>{counts.session++;return {data:{id:'session',space_id:space,actor_id:id,client_name:'detuned-pi',client_version:'0.1.0',harness_session_id:null,metadata:{},created_at:'2026-10-09T00:00:00Z'}} as any;},
 callTool:async()=>{counts.tool++;return {actor:id};},
};}
it('Pi generation snapshots credentials and uses one identity/session flight until explicit start',async()=>{
 let token='actorA';const counts={cap:0,me:0,session:0,tool:0};const runtime=createPiRuntime({snapshot:()=>({baseUrl:'http://private',environmentToken:token}),createClient:opts=>client(opts.token!,counts)});
 token='actorB';const results=await Promise.all([runtime.tool('forum_context',{space_id:'space'}),runtime.tool('forum_context',{space_id:'space'})]);expect(results.map(x=>x.details)).toEqual([{actor:'actorA'},{actor:'actorA'}]);expect(counts).toEqual({cap:1,me:1,session:1,tool:2});await runtime.start();expect((await runtime.tool('forum_context',{space_id:'space'})).details).toEqual({actor:'actorB'});await runtime.close();
});
it('Pi selected credential failure and conflict are terminal locally; pre-cancel and missing space make no client',async()=>{
 for(const config of [{environmentToken:'A',environmentTokenFile:'/private/not-read'},{environmentTokenFile:'/private/missing-detuned-pi-token'}]){let made=0;const runtime=createPiRuntime({snapshot:()=>({baseUrl:'http://private',...config}),createClient:()=>{made++;throw Error('secret');}});await expect(runtime.tool('forum_context',{space_id:'space'})).rejects.toBeInstanceOf(DetunedError);await expect(runtime.tool('forum_context',{space_id:'space'})).rejects.toBeInstanceOf(DetunedError);expect(made).toBe(0);await runtime.close();}
 let made=0;const runtime=createPiRuntime({snapshot:()=>({baseUrl:'http://private'}),createClient:()=>{made++;throw Error('secret');}});const abort=new AbortController();abort.abort();await expect(runtime.tool('forum_context',{space_id:'space'},abort.signal)).rejects.toBeInstanceOf(UserAbortError);await expect(runtime.tool('forum_context',{})).rejects.toMatchObject({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid forum tool arguments.'});expect(made).toBe(0);await runtime.close();
});
it('Pi shutdown waits true tool finally and prevents late successful result',async()=>{
 let entered!:()=>void,release!:()=>void;const barrier=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);const counts={cap:0,me:0,session:0,tool:0};let finallyDone=false;
 const runtime=createPiRuntime({snapshot:()=>({baseUrl:'http://private',environmentToken:'A'}),createClient:()=>({...client('A',counts),callTool:async()=>{entered();try{await gate;return {late:true};}finally{finallyDone=true;}}})});const call=runtime.tool('forum_context',{space_id:'space'});const observed=call.then(()=>false,e=>e instanceof UserAbortError);await barrier;let closed=false;const close=runtime.close().then(()=>{closed=true;});await Promise.resolve();expect(closed).toBe(false);release();expect(await observed).toBe(true);await close;expect(finallyDone).toBe(true);await expect(runtime.tool('forum_context',{space_id:'space'})).rejects.toBeInstanceOf(UserAbortError);
});
it('Pi deadline does not claim cleanup or reopen the old generation',async()=>{
 let entered!:()=>void,release!:()=>void;const barrier=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);const counts={cap:0,me:0,session:0,tool:0};let finished=false;const runtime=createPiRuntime({shutdownTimeoutMs:1,snapshot:()=>({baseUrl:'http://private'}),createClient:()=>({...client('A',counts),callTool:async()=>{entered();await gate;finished=true;return {};}})});const call=runtime.tool('forum_context',{space_id:'space'});const observed=call.catch(e=>e);await barrier;await expect(runtime.close()).rejects.toThrow('could not confirm');expect(finished).toBe(false);await expect(runtime.tool('forum_context',{space_id:'space'})).rejects.toBeInstanceOf(UserAbortError);release();expect(await observed).toBeInstanceOf(UserAbortError);
});
it('Pi preserves complete details and public business error; other errors are typed and safe',()=>{
 const result={text:'汉'.repeat(10000)};const output=piResult(result);expect(output.details).toBe(result);expect(new TextEncoder().encode(output.content[0]!.text).length).toBeLessThanOrEqual(16384);expect(JSON.parse(output.content[0]!.text).truncated).toBe(true);const error=new DetunedError(ErrorCode.FORBIDDEN,'Public forbidden',403,false,{allowed:false});expect(safePiError(error)).toBe(error);const safe=safePiError(new ClientProtocolError('PRIVATE_TOKEN'));expect(safe).toBeInstanceOf(ClientProtocolError);expect(safe.message).not.toContain('PRIVATE_TOKEN');expect(safePiError(Error('PRIVATE_TOKEN')).message).toBe('Forum operation failed.');
});
