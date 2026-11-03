import {expect,it} from 'vitest';
import {PassThrough} from 'node:stream';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

it('Linux native catalogue accepts app-server data/tools objects and preserves safe discovery diagnostics',async()=>{
 const {codexCatalogue}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 const {nativeCheckNames}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/claude-check-probe.mjs')).href);
 const tools=Object.fromEntries(nativeCheckNames.map((name:string)=>[name,{name}]));
 const result=codexCatalogue({data:[{name:'detuned',tools}],nextCursor:null});
 expect(result.names).toEqual(nativeCheckNames);
 expect(result.summary).toEqual({data_count:1,detuned_count:1,tool_count:9,next_cursor_present:false});
 expect(codexCatalogue({data:[],nextCursor:null}).names).toEqual([]);
 expect(codexCatalogue({data:[],nextCursor:'opaque'}).summary.next_cursor_present).toBe(true);
 expect(()=>codexCatalogue({servers:[]})).toThrow('Expected app-server data array');
 expect(()=>codexCatalogue({data:[{name:'detuned'},{name:'detuned'}]})).toThrow();
});

it('Linux native close distinguishes natural, bounded TERM and failed/crashed exits',async()=>{
 const {acceptableNativeClose}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 expect(acceptableNativeClose({code:0,signal:null})).toBe(true);
 expect(acceptableNativeClose({code:null,signal:'SIGTERM'})).toBe(true);
 expect(acceptableNativeClose({code:143,signal:null})).toBe(true);
 for(const close of [undefined,{code:1,signal:null},{code:null,signal:'SIGKILL'},{code:null,signal:'SIGSEGV'},{code:null,signal:null}]){
  expect(acceptableNativeClose(close)).toBe(false);
 }
});

it('Linux native request polling ends on deadline and cancellation without a host response',async()=>{
 const {nativeConnection}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 const streams=()=>({stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),exitCode:null,signalCode:null});
 const first=streams();
 const expired=nativeConnection(first,'codex',{},Date.now()+40);
 await expect(expired.request('initialize',{})).rejects.toThrow('Native RPC deadline');
 const second=streams();
 const stopped=nativeConnection(second,'codex',{},Date.now()+1000);
 const request=stopped.request('initialize',{});
 stopped.stop();
 await expect(request).rejects.toThrow('Native request aborted');
 for(const child of [first,second])for(const stream of [child.stdin,child.stdout,child.stderr])stream.destroy();
});


it('Linux idle shutdown requires natural close and does not count cleanup TERM as success',async()=>{
 const {observeIdleExit,naturalNativeClose}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 expect(naturalNativeClose({code:0,signal:null},[{event:'SIGTERM'}])).toBe(false);
 expect(naturalNativeClose({code:null,signal:'SIGTERM'},[])).toBe(false);
 const stdin=new PassThrough();const report={lifecycle:[]};
 await observeIdleExit({stdin},Promise.resolve({code:0,signal:null}),report,40);
 expect(report).toMatchObject({idle_exit:{observed:true,natural:true,code:0,signal:null}});
 expect(stdin.writableEnded).toBe(true);
 const stuck={lifecycle:[]};const stalled=new PassThrough();
 await expect(observeIdleExit({stdin:stalled},new Promise(()=>{}),stuck,20)).rejects.toThrow('Idle host did not exit naturally');
 expect(stuck).toMatchObject({idle_exit:{observed:false,natural:false}});
 stdin.destroy();stalled.destroy();
});


it('Linux native connection preserves distinct outstanding RPC responses during release',async()=>{
 const {nativeConnection}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 const child={stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),exitCode:null,signalCode:null};
 const connection=nativeConnection(child,'codex',{},Date.now()+1000);
 const poll=connection.request('mcpServer/tool/call',{}),release=connection.request('thread/unsubscribe',{threadId:'owned'});
 child.stdout.write(JSON.stringify({id:2,result:{status:'unsubscribed'}})+'\n');
 child.stdout.write(JSON.stringify({id:1,result:{cancelled:true}})+'\n');
 expect(await release).toEqual({status:'unsubscribed'});
 expect(await poll).toEqual({cancelled:true});
 connection.stop();for(const stream of [child.stdin,child.stdout,child.stderr])stream.destroy();
});
