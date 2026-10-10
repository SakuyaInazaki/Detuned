import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const helper = fileURLToPath(new URL('../fixtures/pi-runtime/native-lifecycle.mjs', import.meta.url));
const modes = ['identity', 'new', 'switch', 'fork', 'reload', 'shutdown'] as const;
describe('M4.4-B independent real Pi 0.87.1 SDK lifecycle', () => {
  for (const mode of modes) it(`native ${mode} uses isolated ordinary credentials and awaited lifecycle cleanup`, async () => {
    const child = spawn('/usr/bin/env', ['-i', 'PATH=/opt/homebrew/bin:/usr/bin:/bin', 'CI=true', process.execPath, helper, mode], { env: {}, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; let killed = false;
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 70000);
    const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal }));
    }).finally(() => clearTimeout(timer));
    expect({ mode, ...exit, killed, stderr }).toEqual({ mode, code: 0, signal: null, killed: false, stderr: '' });
    const evidence = JSON.parse(stdout.trim());
    expect(evidence).toMatchObject({ mode, passed: true, model_calls: 0, activation_and_start_http: 0, invalid_review_before_prepare_http: 0, same_generation_retains_a: true, concurrent_first_calls: { capability: 1, me: 1, session: 1, posts: 2, author_a: true }, metadata: { version: '0.87.1', loader_public_export: false, internal_loader_test_only: true } });
    expect(evidence.tools).toHaveLength(9);
    if (mode === 'identity') expect(evidence).toMatchObject({ veto_preserves_runtime: true, new_generation_b: true, ordinary_actor_denied_space: 'NOT_FOUND', ninth_review: { actual_session: true, assignment_actor_b: true, diagnostic_unchanged: true, session_delta: 1, ack_delta: 0 } });
    else expect(evidence).toMatchObject({ cancelled_before_return: true, tool_finally_before_return: true, pending_batch_unchanged: true, ack_request_delta: 0 });
    if (mode === 'reload') expect(evidence).toMatchObject({ closed_extension_no_http: true, reload_reactivated_without_start: true, replacement_uses_b: true });
    if (mode === 'shutdown') expect(evidence.closed_extension_no_http).toBe(true);
    console.info(JSON.stringify(evidence));
  }, 80000);
});

// The historical six cases above are retained byte-for-byte.
describe('M7.4-A fixed Pi ordinary check branches',()=>{
 it('native checks prepares no invalid input and performs real two-write/six-read calls',async()=>{
  const {mkdtemp,chmod,realpath,rm,access}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const privateRoot=await realpath(await mkdtemp(join(tmpdir(),'detuned-pi-checks-parent-')));await chmod(privateRoot,0o700);
  let stdout='',stderr='',killed=false,lastStage='parent-created',exit:{code:number|null;signal:NodeJS.Signals|null}|undefined;
  const stages:string[]=[];const caught:{error_name?:string;error_code?:string}={};const counts:Record<string,{active_count?:number;connections?:number}>={};const diagnostic=()=>JSON.stringify({lastStage,stages,caught,counts});
  try {
   const child=spawn(process.execPath,[helper,'checks',privateRoot],{env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin',CI:'true'},stdio:['ignore','pipe','pipe','ipc']});
   child.on('message',value=>{
    if(typeof value!=='object'||value===null||!('stage'in value)||typeof value.stage!=='string'||!/^[A-Za-z-]{1,64}$/.test(value.stage))return;
    lastStage=value.stage;if(stages.length<64){stages.push(value.stage);const observed:{active_count?:number;connections?:number}={};if('active_count'in value&&typeof value.active_count==='number'&&Number.isSafeInteger(value.active_count)&&value.active_count>=0)observed.active_count=value.active_count;if('connections'in value&&typeof value.connections==='number'&&Number.isSafeInteger(value.connections)&&value.connections>=0)observed.connections=value.connections;counts[value.stage]=observed;}
    if(value.stage==='catch'){
     if('error_name'in value&&typeof value.error_name==='string'&&/^[A-Za-z0-9_]{1,64}$/.test(value.error_name))caught.error_name=value.error_name;
     if('error_code'in value&&typeof value.error_code==='string'&&/^[A-Za-z0-9_]{1,64}$/.test(value.error_code))caught.error_code=value.error_code;
    }
   });
   child.stdout!.setEncoding('utf8');child.stderr!.setEncoding('utf8');child.stdout!.on('data',value=>{stdout+=value;});child.stderr!.on('data',value=>{stderr+=value;});const timer=setTimeout(()=>{killed=true;child.kill('SIGKILL');},70000);
   let spawnFailed=false;exit=await new Promise<{code:number|null;signal:NodeJS.Signals|null}>(resolve=>{child.once('error',()=>{spawnFailed=true;});child.once('close',(code,signal)=>resolve({code,signal}));}).finally(()=>clearTimeout(timer));
   expect(spawnFailed,diagnostic()).toBe(false);
  } finally {await rm(privateRoot,{recursive:true,force:true});}
  let removed=false;try{await access(privateRoot);}catch(error){removed=typeof error==='object'&&error!==null&&'code'in error&&error.code==='ENOENT';}expect(removed,diagnostic()).toBe(true);
  // The child only emits white-listed evidence; no credentials/raw HTTP are captured.
  expect({exit,killed,stderr},diagnostic()).toEqual({exit:{code:0,signal:null},killed:false,stderr:''});const evidence=JSON.parse(stdout);
  expect(evidence).toMatchObject({mode:'checks',passed:true,model_calls:0,metadata:{version:'0.87.1'},checks:{invalid_before_prepare_http:0,reason_500:true,scope_denied:true,artifact_metadata_only:true,ack_delta:0,pending_unchanged:true,cancelled:true},cleanup:{host_disposed:true,app_closed:true,private_directory_removed:true}});
  expect(counts['business-cleanup-drain-done']?.active_count,diagnostic()).toBe(0);expect(counts['socket-cleanup-close-done']?.connections,diagnostic()).toBe(0);
  expect(evidence.cleanup.transport.active_after_drain).toBe(0);expect(evidence.cleanup.transport.connections_after_close).toBe(0);for(const key of ['active_before_drain','connections_before_close','accepted_connections','closed_connections'])expect(Number.isSafeInteger(evidence.cleanup.transport[key])&&evidence.cleanup.transport[key]>=0).toBe(true);expect(evidence.cleanup.transport.closed_connections).toBe(evidence.cleanup.transport.accepted_connections);
  expect(evidence.tools).toHaveLength(9);expect(evidence.checks.reads).toEqual(['check_run','check_snapshot','check_post_revision','check_receipt','check_artifact','required_checks']);
 },80000);
});
