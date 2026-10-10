import {afterEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
import {ArtifactFileStore} from '../../packages/server/src/artifact-files.js';
const checker=await import(new URL('../../examples/d01-fixed/checker.mjs',import.meta.url).href);
const catalog=await import(new URL('../../examples/d01-fixed/catalog.mjs',import.meta.url).href);
const runner=await import(new URL('../../scripts/checks/d01-fixed-verifier.mjs',import.meta.url).href);
const cleanups:Array<()=>Promise<void>>=[];afterEach(async()=>{while(cleanups.length)await cleanups.pop()!();});
async function fixture(candidate='relaxation',extra=false){
 const dir=await mkdtemp(join(tmpdir(),'detuned-fixed-verifier-')),db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!,storage=new SqliteStorage(db),app=buildApp({storage,artifactBlobs:await ArtifactFileStore.create(dir)});const paths:string[]=[];app.addHook('onRequest',async req=>{paths.push(req.url);});const url=await app.listen({host:'127.0.0.1',port:0});cleanups.push(async()=>{await app.close();db.close();await rm(dir,{recursive:true,force:true});});const admin=new DetunedClient({baseUrl:url,token,maxRetries:0});let serial=0;
 async function write(path:string,body:unknown,method='POST'){const response=await fetch(url+'/api/v1'+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json','idempotency-key':'setup-'+ ++serial},body:JSON.stringify(body)});expect(response.status).toBe(method==='POST'?201:200);return(await response.json()).data;}
 const sid=(await write('/spaces',{slug:'fixed-verifier',objective:'fixed bounded checker',rules:[]})).space.id,tid=(await write(`/spaces/${sid}/threads`,{title:'fixed'})).thread.id;
 const pid=(await write(`/spaces/${sid}/threads/${tid}/posts`,{kind:'claim',title:'shortest paths',summary:'fixed',body:'Repository pinned candidate with independent reference',structured:{statement:'nonnegative shortest paths',assumptions:['safe integer arithmetic'],scope:'fixed examples',falsification_plan:'first-discovery counterexample'}})).post.id;
 const now=new Date().toISOString();for(const id of ['fixed-r1','fixed-r2','fixed-v']){storage.createActor({id,kind:id==='fixed-v'?'service':'human',display_name:id,created_at:now,disabled_at:null});if(id!=='fixed-v')storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});}
 const materials=catalog.assets(candidate),config=materials.find((a:any)=>a.role==='config');const rev=storage.getSpaceRevision(sid,1)!;await write(`/spaces/${sid}`,{expected_revision:1,review_policy:{...rev.review_policy,required_checks:['d01-fixed']},check_profiles:{'d01-fixed':{verifier_actor_ids:['fixed-v'],config_sha256:config.sha256,description:'fixed known candidate'}}},'PATCH');
 const artifactIds:string[]=[];for(const asset of materials){const artifact=await admin.uploadArtifact(sid,new Blob([asset.content],{type:'application/octet-stream'}),{},'asset-'+asset.role);artifactIds.push(artifact.id);}
 if(extra)artifactIds.push((await admin.uploadArtifact(sid,new Blob(['Unknown forum content must never execute'],{type:'text/plain'}),{},'unknown')).id);
 const request=await write(`/spaces/${sid}/review-requests`,{target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:artifactIds,code_refs:[],declared_contributors:[],reviewer_actor_ids:['fixed-r1','fixed-r2'],expected_policy_revision:storage.findSpaceById(sid)!.policy_revision,reproduction_instructions:'fixed repository verifier only'});
 const run=await admin.createCheckRun(sid,{request_id:request.id,snapshot_id:request.snapshot_id,check_name:'d01-fixed',verifier_id:'fixed-v',expected_request_version:request.version},'create');const issued=await admin.issueCheckRunCredential(sid,run.id);const client=new DetunedClient({baseUrl:url,token:issued.token,maxRetries:1});return{dir,db,storage,app,url,sid,run,client,verify:issued.token,paths};
}
const options=(f:Awaited<ReturnType<typeof fixture>>)=>({spaceId:f.sid,runId:f.run.id,uploadKey:'fixed-upload',receiptKey:'fixed-receipt',receiptId:'fixed.receipt'});
it('FV01 fixed known candidates compare all variants with independent reference; budgets and unsafe arithmetic are error',()=>{
 const right=checker.runFixedSuite('relaxation'),wrong=checker.runFixedSuite('first-discovery');expect(right.result).toBe('pass');expect(right.graphs).toBe(58);expect(right.operations).toBeLessThanOrEqual(10000000);expect(wrong.result).toBe('fail');expect(wrong.failures.some((f:any)=>f.case_id==='first-discovery-counterexample/original'&&f.expected[1]===2&&f.observed[1]===10)).toBe(true);
 expect(checker.runFixedSuite('unknown').result).toBe('error');expect(()=>checker.validateGraph({vertices:33,source:0,edges:[]})).toThrow();expect(()=>checker.validateGraph({vertices:2,source:0,edges:[[0,1,-1]]})).toThrow();expect(()=>checker.validateOutput([0,-1],2)).toThrow();expect(()=>checker.validateOutput([0,Infinity],2)).toThrow();expect(()=>checker.makeBudget(0).step()).toThrow();expect(()=>checker.makeBudget().add(Number.MAX_SAFE_INTEGER,1)).toThrow();
});
it('FV02 real TCP scoped material preflight and known relaxation produce immutable pass receipt and no identity discovery',async()=>{
 const f=await fixture();const start=f.paths.length;const result=await runner.verifyAndSubmit(f.client,options(f));expect(result.result).toBe('pass');expect(f.storage.findCheckReceiptByRunId(f.run.id)?.exit_code).toBe(0);expect(f.paths.slice(start).some(path=>path.endsWith('/me')||path.endsWith('/sessions'))).toBe(false);
 await expect(runner.verifyAndSubmit(f.client,options(f))).rejects.toMatchObject({code:'PREFLIGHT_BINDING'});expect(f.storage.findCheckRunById(f.run.id)?.version).toBe(2);
});
it('FV03 genuine first-discovery fail and controlled after-preflight environment error retain different meanings',async()=>{
 const wrong=await fixture('first-discovery');expect((await runner.verifyAndSubmit(wrong.client,options(wrong))).result).toBe('fail');expect(wrong.storage.findCheckReceiptByRunId(wrong.run.id)?.result).toBe('fail');
 const fault=await fixture();expect((await runner.verifyAndSubmit(fault.client,options(fault),{afterPreflight(){throw Error('controlled environment fault');}})).result).toBe('error');expect(fault.storage.findCheckReceiptByRunId(fault.run.id)?.exit_code).toBe(2);
});
it('FV04 real unknown material fails preflight before log/receipt write and leaves run pending',async()=>{
 const f=await fixture('relaxation',true),before=(f.db.prepare('SELECT count(*) n FROM artifacts').get() as {n:number}).n;
 await expect(runner.verifyAndSubmit(f.client,options(f))).rejects.toMatchObject({code:'PREFLIGHT_MATERIAL_SET'});expect(f.storage.findCheckReceiptByRunId(f.run.id)).toBeNull();expect((f.db.prepare('SELECT count(*) n FROM artifacts').get() as {n:number}).n).toBe(before);expect(f.storage.findCheckRunById(f.run.id)?.state).toBe('pending');
});
it('FV05 real short-lived CLI uses private token-file and only safe submitted summary stdout',async()=>{
 const f=await fixture(),file=join(f.dir,'verify.token');await writeFile(file,f.verify,{mode:0o600});const child=spawn(process.execPath,['scripts/checks/d01-fixed-verifier.mjs','--url',f.url,'--space',f.sid,'--run',f.run.id,'--token-file',file,'--upload-key','cli-upload','--receipt-key','cli-receipt','--receipt-id','cli.receipt'],{env:{PATH:process.env.PATH,CI:'1'}});let out='',err='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',chunk=>out+=chunk);child.stderr.on('data',chunk=>err+=chunk);const timer=setTimeout(()=>child.kill('SIGKILL'),10000);const code=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)}).finally(()=>clearTimeout(timer));expect(code).toBe(0);expect(err.length).toBe(0);expect((out+err).includes(f.verify)).toBe(false);expect(JSON.parse(out).result).toBe('pass');const receipt=f.storage.findCheckReceiptByRunId(f.run.id)!;expect(receipt.tool_versions.node).toBe(process.version);
});
