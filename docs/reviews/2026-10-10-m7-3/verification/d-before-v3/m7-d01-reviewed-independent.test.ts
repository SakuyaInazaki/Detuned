import {afterEach,expect,it,vi} from 'vitest';
import {mkdtemp,readFile,stat,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,type ChildProcess} from 'node:child_process';
import {createHash} from 'node:crypto';
import type {ReviewStatusView,ReviewDecisionView,ReviewSubmissionView,CheckRunView,CheckReceiptView,ReadableArtifactMetadata,PublicReviewSubmissionSearchPage,ReviewSubmissionSearchQuery,RelationProjection} from '@detuned/protocol';

import type {ArtifactDownload} from '@detuned/client';

type Reader={getReviewStatus():Promise<ReviewStatusView>;getReviewDecision():Promise<ReviewDecisionView>;getReviewSubmission(id:string):Promise<ReviewSubmissionView>;searchPublicReviewSubmissions(query:ReviewSubmissionSearchQuery):Promise<PublicReviewSubmissionSearchPage>;getCheckRun?():Promise<CheckRunView>;getCheckReceipt?():Promise<CheckReceiptView>;getCheckArtifact?(id:string):Promise<ReadableArtifactMetadata>;downloadCheckArtifact?(id:string):Promise<ArtifactDownload>;getPostRevisionContent(postId:string,revision:number):Promise<unknown>};
type Observation={originalChallengeId:string;spaceId:string;requestId:string;runId:string|null;targetRef:{post_id:string;revision:1};submissionIds:string[];roles:{C:string;R2:string};hashes:{snapshot:string;config:string};readers:{C:Reader&{getOriginalChallenge():Promise<RelationProjection>};R2:Reader}};
const observed=vi.hoisted(()=>({children:[] as import('node:child_process').ChildProcess[],batches:[] as {pid:number;batch_id:string;events:unknown[]}[],acks:[] as {pid:number;batchId:string}[],directories:[] as string[],fixedChunks:[] as string[],serverPids:[] as number[],sequence:0,spawns:[] as {pid:number;kind:string;order:number}[],closes:[] as {pid:number;code:number|null;signal:string|null;order:number}[]}));
vi.mock('node:child_process',async importOriginal=>{
 const actual=await importOriginal<typeof import('node:child_process')>();
 function track(child:ChildProcess,args:unknown[]){observed.children.push(child);const flagsForKind=args[1];const kind=String(args[0]).endsWith('/d01-reviewed-worker.mjs')?'C-worker':Array.isArray(flagsForKind)&&flagsForKind.includes('serve')?'server':'command';observed.spawns.push({pid:child.pid!,kind,order:++observed.sequence});child.once('close',(code,signal)=>observed.closes.push({pid:child.pid!,code,signal,order:++observed.sequence}));if(Array.isArray(args[1])&&args[1].includes('serve'))observed.serverPids.push(child.pid!);const flags=args[1];if(Array.isArray(flags)){const at=flags.indexOf('--data-dir');if(at>=0&&typeof flags[at+1]==='string')observed.directories.push(path.dirname(flags[at+1]));}
  child.on('message',(message:unknown)=>{if(message&&typeof message==='object'&&'result' in message){const r=message.result;if(r&&typeof r==='object'&&'data' in r&&r.data&&typeof r.data==='object'&&'chunk' in r.data&&typeof r.data.chunk==='string')observed.fixedChunks.push(r.data.chunk);if(r&&typeof r==='object'&&'batch_id' in r&&typeof r.batch_id==='string'&&'events' in r&&Array.isArray(r.events))observed.batches.push({pid:child.pid!,batch_id:r.batch_id,events:r.events});}});
  if(typeof child.send==='function')child.send=new Proxy(child.send,{apply(target,self,args){const m=args[0];if(m&&typeof m==='object'&&m.type==='ack')observed.acks.push({pid:child.pid!,batchId:m.batchId});return Reflect.apply(target,self,args);}});return child;
 }
 return{...actual,spawn:new Proxy(actual.spawn,{apply(target,self,args){return track(Reflect.apply(target,self,args) as ChildProcess,args);}}),fork:new Proxy(actual.fork,{apply(target,self,args){return track(Reflect.apply(target,self,args) as ChildProcess,args);}})};
});
async function assertOwnedClosed(start:number){const owned=observed.children.slice(start);expect(owned.length).toBeGreaterThan(0);expect(owned.every(child=>observed.closes.some(event=>event.pid===child.pid))).toBe(true);expect(owned.every(child=>!alive(child.pid!))).toBe(true);}

const controllers:AbortController[]=[];
const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{for(const controller of controllers.splice(0))controller.abort();for(const child of observed.children){if(child.exitCode!==null||child.signalCode!==null)continue;const closed=new Promise<void>(resolve=>child.once('close',()=>resolve()));child.kill('SIGTERM');const grace=setTimeout(()=>child.kill('SIGKILL'),250);try{await closed;}finally{clearTimeout(grace);}}while(cleanups.length)await cleanups.pop()!();});
async function privateDirectory(){const directory=await mkdtemp(path.join(tmpdir(),'detuned-m7-3-independent-'));cleanups.push(()=>rm(directory,{recursive:true,force:true}));return directory;}
async function moduleUnderTest(){return import(new URL('../../scripts/demos/d01-reviewed.mjs',import.meta.url).href);}
function digest(value:Uint8Array){return createHash('sha256').update(value).digest('hex');}
function alive(pid:number){try{process.kill(pid,0);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')return false;throw error;}}
function safeText(value:string){expect(/detuned_(?:vrf|admin|agent|adm|agt)_[A-Za-z0-9_-]+|Bearer\s|authorization/i.test(value)).toBe(false);expect(value.includes(tmpdir())).toBe(false);expect(/"(?:token|authorization|headers|admin_token|credentials|data_dir|base_url)"\s*:/i.test(value)).toBe(false);}
async function launch(outputPath:string){
 const child=spawn(process.execPath,['scripts/demos/d01-reviewed.mjs','--output',outputPath],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout!.on('data',chunk=>{stdout+=chunk});child.stderr!.on('data',chunk=>{stderr+=chunk});
 let timer:ReturnType<typeof setTimeout>;const done=new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});});
 // Own child only: watchdog prevents continuing CLI writes after default test timeout.
 timer=setTimeout(()=>child.kill('SIGTERM'),4000);cleanups.push(async()=>{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await done;}});
 return{child,done};
}

it('DI01 independently reads all three live ordinary HTTP checkpoints; sealed privacy and immutable accepted history survive supersession',async()=>{
 const serverStart=observed.serverPids.length;const fixedStart=observed.fixedChunks.length,dirStart=observed.directories.length;const start=observed.children.length,batchStart=observed.batches.length,ackStart=observed.acks.length;const directory=await privateDirectory(),outputPath=path.join(directory,'ledger.json'),{runReviewedDemo}=await moduleUnderTest(),controller=new AbortController();
 controllers.push(controller);const timer=setTimeout(()=>controller.abort(),4000);let decision:ReviewDecisionView|undefined,receipt:CheckReceiptView|undefined,logHash:string|undefined;const seen:string[]=[];
 try{
  await runReviewedDemo({outputPath,signal:controller.signal,observe:async(checkpoint:string,c:Observation)=>{
   seen.push(checkpoint);expect(Object.keys(c.readers).sort()).toEqual(['C','R2']);expect(c.roles.C).not.toBe(c.roles.R2);
   for(const reader of Object.values(c.readers)){expect('token' in reader||'client' in reader||'createPost' in reader||'submitCheckReceipt' in reader).toBe(false);expect(Object.isFrozen(reader)).toBe(true);}
   const status=await c.readers.C.getReviewStatus();expect(status.request_id).toBe(c.requestId);
   if(checkpoint==='sealed'){
    expect(c.submissionIds.length).toBe(1);await expect(c.readers.R2.getReviewSubmission(c.submissionIds[0]!)).rejects.toMatchObject({code:'NOT_FOUND'});
    const page=await c.readers.C.searchPublicReviewSubmissions({source:'review_submissions',q:'D01_SEALED_COVERAGE',request_id:c.requestId,limit:50});expect(page.data).toEqual([]);expect(c.runId).toBeNull();
   }else if(checkpoint==='accepted'){
    expect(status).toMatchObject({phase:'accepted',verification_status:'passed',current_validity:'current',validity_reasons:[]});decision=await c.readers.C.getReviewDecision();receipt=await c.readers.C.getCheckReceipt!();
    expect(await c.readers.C.getOriginalChallenge()).toMatchObject({relation_id:c.originalChallengeId,relation_type:'challenges',state:'open'});expect(decision.outcome).toBe('accepted');expect(decision.snapshot_sha256).toBe(c.hashes.snapshot);expect(decision.review_ids).toHaveLength(2);expect(new Set(decision.review_ids).size).toBe(2);expect(decision.check_receipt_ids).toEqual([receipt.receipt_id]);
    expect(receipt).toMatchObject({check_run_id:c.runId,result:'pass',observed_snapshot_sha256:c.hashes.snapshot,observed_check_config_sha256:c.hashes.config,exit_code:0});expect((await c.readers.C.getCheckRun!()).state).toBe('pass');
    const metadata=await c.readers.C.getCheckArtifact!(receipt.logs_artifact_id),download=await c.readers.C.downloadCheckArtifact!(receipt.logs_artifact_id);expect(metadata.state).toBe('ready');logHash=digest(download.bytes);expect(logHash).toBe(metadata.sha256);expect(download.bytes.byteLength).toBe(metadata.bytes);safeText(new TextDecoder().decode(download.bytes));
    const submissions=await Promise.all(decision.review_ids.map(id=>c.readers.R2.getReviewSubmission(id)));expect(new Set(submissions.map(x=>x.reviewer_actor_id)).size).toBe(2);expect(new Set(submissions.map(x=>x.reviewer_session_id)).size).toBe(2);expect(submissions.every(x=>x.revealed_at!==null&&x.completion_status==='complete')).toBe(true);const publicPage=await c.readers.C.searchPublicReviewSubmissions({source:'review_submissions',q:'D01_SEALED_COVERAGE',request_id:c.requestId,limit:50});expect(publicPage.data).toHaveLength(2);
    await c.readers.C.getPostRevisionContent(c.targetRef.post_id,1);
   }else{
    expect(checkpoint).toBe('superseded');expect(await c.readers.C.getOriginalChallenge()).toMatchObject({relation_id:c.originalChallengeId,relation_type:'challenges',state:'open'});expect(status.current_validity).toBe('superseded');expect(status.validity_reasons).toContain('target_superseded');expect(status.validity_reasons).toContain('open_challenges');expect(await c.readers.C.getReviewDecision()).toEqual(decision);expect(await c.readers.C.getCheckReceipt!()).toEqual(receipt);expect(digest((await c.readers.C.downloadCheckArtifact!(receipt!.logs_artifact_id)).bytes)).toBe(logHash);await c.readers.C.getPostRevisionContent(c.targetRef.post_id,1);
   }
  }});
 }finally{clearTimeout(timer);controller.abort();}
 expect(seen).toEqual(['sealed','accepted','superseded']);await assertOwnedClosed(start);const ownPids=observed.children.slice(start).map(child=>child.pid);const actualCloses=observed.closes.filter(event=>ownPids.includes(event.pid));expect(actualCloses).toHaveLength(ownPids.length);expect(actualCloses.every(event=>event.code===0&&event.signal===null)).toBe(true);for(const kind of ['server','C-worker']){const spawns=observed.spawns.filter(event=>ownPids.includes(event.pid)&&event.kind===kind);expect(spawns).toHaveLength(2);const firstClose=actualCloses.find(event=>event.pid===spawns[0]!.pid)!;expect(firstClose.code).toBe(0);expect(firstClose.signal).toBeNull();expect(spawns[1]!.order).toBeGreaterThan(firstClose.order);}const batches=observed.batches.slice(batchStart);expect(batches).toHaveLength(2);expect(batches[0]!.pid).not.toBe(batches[1]!.pid);expect(batches[1]!.batch_id).toBe(batches[0]!.batch_id);expect(batches[1]!.events).toEqual(batches[0]!.events);expect(batches[0]!.events.length).toBeGreaterThan(0);expect(observed.acks.slice(ackStart)).toEqual([{pid:batches[1]!.pid,batchId:batches[1]!.batch_id}]);expect(observed.fixedChunks.slice(fixedStart).some(chunk=>JSON.parse(chunk).body==='首次发现即冻结距离，不再松弛。')).toBe(true);for(const directory of new Set(observed.directories.slice(dirStart)))await expect(stat(directory)).rejects.toMatchObject({code:'ENOENT'});const text=await readFile(outputPath,'utf8');const ledger=JSON.parse(text);expect(ledger.recovery.server_pids).toEqual(observed.serverPids.slice(serverStart));expect(ledger.recovery.server_pids).toHaveLength(2);expect(ledger.recovery.server_pids[0]).not.toBe(ledger.recovery.server_pids[1]);expect(ledger.recovery.worker_pids).toEqual(batches.map(batch=>batch.pid));expect(ledger.children.map((child:{pid:number})=>child.pid).sort()).toEqual(observed.children.slice(start).map(child=>child.pid).sort());expect(ledger.hashes.log).toBe(logHash);expect(ledger.hashes.decision).toBe(digest(Buffer.from(JSON.stringify(decision))));expect(ledger.hashes.receipt).toBe(digest(Buffer.from(JSON.stringify(receipt))));safeText(text);expect((await stat(outputPath)).mode&0o777).toBe(0o600);
});

it('DI02 actual CLI output is private and no-clobber, with a real process exit rather than ledger success alone',async()=>{
 const directory=await privateDirectory(),outputPath=path.join(directory,'ledger.json'),{child,done}=await launch(outputPath),result=await done;expect(result.code).toBe(0);expect(alive(child.pid!)).toBe(false);safeText(result.stdout);safeText(result.stderr);const original=await readFile(outputPath);const ledger=JSON.parse(original.toString());expect(ledger.children.length).toBeGreaterThanOrEqual(6);expect(ledger.children.every((entry:{pid:number;exit:number|null;signal:string|null})=>!alive(entry.pid)&&entry.exit===0&&entry.signal===null)).toBe(true);safeText(original.toString());expect((await stat(outputPath)).mode&0o777).toBe(0o600);
 const repeat=await launch(outputPath),failure=await repeat.done;expect(failure.code).not.toBe(0);expect(await readFile(outputPath)).toEqual(original);expect(alive(repeat.child.pid!)).toBe(false);safeText(failure.stdout);safeText(failure.stderr);expect(await readdir(directory)).toEqual(['ledger.json']);
});


it.each(['observer-throw','observer-abort'])('DI03 genuine child journey %s settles all owned processes and publishes no misleading output',async mode=>{
 const directory=await privateDirectory(),outputPath=path.join(directory,'ledger.json'),start=observed.children.length,dirStart=observed.directories.length,{runReviewedDemo}=await moduleUnderTest(),controller=new AbortController();let reached=false;const sentinel=new Error('Controlled observer failure');controllers.push(controller);const timer=setTimeout(()=>controller.abort(),4000);
 try{const running=runReviewedDemo({outputPath,signal:controller.signal,observe:async(checkpoint:string)=>{expect(checkpoint).toBe('sealed');reached=true;if(mode==='observer-throw')throw sentinel;controller.abort();await new Promise<void>(()=>{});}});if(mode==='observer-throw')await expect(running).rejects.toBe(sentinel);else await expect(running).rejects.toBeDefined();}finally{clearTimeout(timer);controller.abort();}
 expect(reached).toBe(true);await assertOwnedClosed(start);for(const own of new Set(observed.directories.slice(dirStart)))await expect(stat(own)).rejects.toMatchObject({code:'ENOENT'});await expect(stat(outputPath)).rejects.toMatchObject({code:'ENOENT'});
});
