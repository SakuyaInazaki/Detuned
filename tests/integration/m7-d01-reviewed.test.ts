import {afterEach,describe,it,expect} from 'vitest';
import {mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const load=()=>import(new URL('../../scripts/demos/d01-reviewed.mjs',import.meta.url).href);
const directories:string[]=[];
afterEach(async()=>{for(const dir of directories.splice(0))await rm(dir,{recursive:true,force:true});});
describe('M7.3 real reviewed D01 journey',()=>{
 it('DJ01 preserves pending recovery and immutable accepted history through a later challenge',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'detuned-dj01-'));directories.push(dir);const outputPath=path.join(dir,'ledger.json');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);const seen:string[]=[];
  try{const {runReviewedDemo}=await load();const ledger=await runReviewedDemo({outputPath,signal:controller.signal,observe:async(checkpoint:string,context:any)=>{
   seen.push(checkpoint);const status=await context.readers.C.getReviewStatus();
   if(checkpoint==='sealed'){expect(status.phase).toBe('collecting');expect((await context.readers.C.searchPublicReviewSubmissions({source:'review_submissions',q:'D01_SEALED_COVERAGE',request_id:context.requestId})).data).toHaveLength(0);await expect(context.readers.R2.getReviewSubmission(context.submissionIds[0])).rejects.toBeDefined();}
   if(checkpoint==='accepted'){expect((await context.readers.C.getOriginalChallenge()).state).toBe('open');expect(status.current_validity).toBe('current');expect((await context.readers.C.getReviewDecision()).outcome).toBe('accepted');expect((await context.readers.C.getCheckReceipt()).result).toBe('pass');}
   if(checkpoint==='superseded'){expect((await context.readers.C.getOriginalChallenge()).state).toBe('open');expect(status.current_validity).toBe('superseded');expect(status.validity_reasons).toContain('open_challenges');expect((await context.readers.C.getReviewDecision()).outcome).toBe('accepted');}
  }});expect(seen).toEqual(['sealed','accepted','superseded']);expect(ledger.recovery.server_pids[0]).not.toBe(ledger.recovery.server_pids[1]);expect(ledger.recovery.worker_pids[0]).not.toBe(ledger.recovery.worker_pids[1]);expect(ledger.recovery.pending_equal).toBe(true);expect(ledger.cleanup).toEqual({children_remaining:0,private_directory_removed:true});expect((await stat(outputPath)).mode&0o777).toBe(0o600);expect(JSON.parse(await readFile(outputPath,'utf8')).hashes).toEqual(ledger.hashes);
  }finally{clearTimeout(timer);controller.abort();}
 });
 it('DJ02 rejects existing output before creating a service and preserves its bytes',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'detuned-dj02-'));directories.push(dir);const outputPath=path.join(dir,'ledger.json');await writeFile(outputPath,'existing',{mode:0o600});const {runReviewedDemo}=await load();await expect(runReviewedDemo({outputPath})).rejects.toThrow('Output already exists');expect(await readFile(outputPath,'utf8')).toBe('existing');
 });
});
