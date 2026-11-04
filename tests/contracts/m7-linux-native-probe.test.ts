import {expect,it} from 'vitest';
import {PassThrough} from 'node:stream';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
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

it('Linux native request rejects a ready response when the same stream also failed',async()=>{
 const {nativeConnection}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 for(const corrupted of ['not-json\n'+JSON.stringify({id:1,result:{ok:true}})+'\n',JSON.stringify({id:1,result:{ok:true}})+'\n'+'x'.repeat(1048576)]){
  const child={stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),exitCode:null,signalCode:null};
  const connection=nativeConnection(child,'codex',{},Date.now()+1000);
  const request=connection.request('initialize',{});
  // Both chunks arrive before request resumes after its input write callback.
  if(corrupted.startsWith('not-json'))child.stdout.write(corrupted);
  else {
   child.stdout.write(JSON.stringify({id:1,result:{ok:true}})+'\n');
   child.stdout.write('x'.repeat(1048576));
  }
  await expect(request).rejects.toThrow(corrupted.startsWith('not-json')?'Invalid native JSON':'Native output limit');
  connection.stop();for(const stream of [child.stdin,child.stdout,child.stderr])stream.destroy();
 }
});

it('Linux idle receipt cannot remain natural or passed after residual group cleanup signals',async()=>{
 const {recordNativeSignal}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 const idle={shutdown:'idle',status:'passed',lifecycle:[],idle_exit:{natural:true}};
 recordNativeSignal(idle,'SIGTERM','group');
 expect(idle).toMatchObject({status:'failed',idle_exit:{natural:false},lifecycle:[{event:'SIGTERM',target:'group'}]});
 const active={shutdown:'active',status:'passed',lifecycle:[]};
 recordNativeSignal(active,'SIGTERM','group');
 expect(active.status).toBe('passed');
 recordNativeSignal(active,'SIGKILL','group');
 expect(active.status).toBe('failed');
});

it.runIf(process.platform==='linux')('Linux actual cleanup fails idle success when a naturally exited launcher leaves its own child',async()=>{
 const {cleanupNativeGroup}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/linux-native-check-probe.mjs')).href);
 const source=`const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});child.unref();console.log(child.pid);process.stdin.resume();process.stdin.once('end',()=>process.exit(0));`;
 const launcher=spawn(process.execPath,['-e',source],{detached:true,stdio:['pipe','pipe','ignore']});
 let descendant:number|undefined;
 try{
  const [data]=await once(launcher.stdout,'data');descendant=Number(String(data).trim());
  expect(Number.isSafeInteger(descendant)).toBe(true);
  // Check the real UID/parent/PGID before allowing the fixture launcher to exit.
  const ownership=execFileSync('/bin/ps',['-p',String(launcher.pid),'-o','uid=,ppid=,pgid='],{encoding:'utf8'}).trim().split(/\s+/).map(Number);
  expect(ownership).toEqual([process.getuid!(),process.pid,launcher.pid]);
  const descendantGroup=execFileSync('/bin/ps',['-p',String(descendant),'-o','pgid='],{encoding:'utf8'}).trim();
  expect(Number(descendantGroup)).toBe(launcher.pid);
  const completion=once(launcher,'close');launcher.stdin.end();
  expect(await completion).toEqual([0,null]);
  expect(()=>process.kill(descendant!,0)).not.toThrow();
  const report={shutdown:'idle',status:'passed',lifecycle:[],idle_exit:{natural:true},cleanup:{}};
  await cleanupNativeGroup(launcher.pid,report);
  expect(report).toMatchObject({status:'failed',idle_exit:{natural:false},lifecycle:[{event:'SIGTERM',target:'group'}]});
  // A dead zombie awaiting namespace-init reaping is not a running leaked bridge.
  let state='';try{state=execFileSync('/bin/ps',['-p',String(descendant),'-o','stat='],{encoding:'utf8'}).trim();}catch{}
  expect(state===''||state.startsWith('Z')).toBe(true);
 }finally{
  try{process.kill(-launcher.pid!,'SIGKILL');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw error;}
  launcher.stdin.destroy();launcher.stdout.destroy();
 }
});


it('native redelivery accepts renewed opaque cursors and progress hints while preserving the batch',async()=>{
 const {assertPendingRedelivery}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/poll-redelivery.mjs')).href);
 const original={batch_id:'batch',events:[{id:'event',seq:12}],has_more:false,next_cursor:'opaque-original'};
 expect(()=>assertPendingRedelivery({...original,has_more:true,next_cursor:'different opaque renewed value'},original)).not.toThrow();
 for(const patch of [{batch_id:'wrong'},{events:[{id:'other',seq:12}]},{events:[{id:'event',seq:13}]},{has_more:'bad'},{next_cursor:null},{next_cursor:''}]){
  expect(()=>assertPendingRedelivery({...original,...patch},original)).toThrow();
 }
 expect(()=>assertPendingRedelivery(original,{...original,next_cursor:''})).toThrow();
});
