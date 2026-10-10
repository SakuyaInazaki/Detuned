#!/usr/bin/env node
import {statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {DetunedClient} from '../../packages/client/dist/index.js';
import {resolveLocalToken} from '../../packages/client/dist/node.js';
import {canonicalizeReviewJson} from '../../packages/protocol/dist/index.js';
import {assets,descriptors} from '../../examples/d01-fixed/catalog.mjs';
import {runFixedSuite} from '../../examples/d01-fixed/checker.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export class VerifierError extends Error {constructor(code){super(code);this.code=code;}}
const reject=code=>{throw new VerifierError(code);};
export async function preflight(client,spaceId,runId){
 const run=await client.getCheckRun(spaceId,runId),snapshot=await client.getCheckSnapshot(spaceId,runId);
 if(run.state!=='pending'||run.space_id!==spaceId||run.id!==runId||snapshot.check_run_id!==runId||snapshot.space_id!==spaceId||snapshot.snapshot_id!==run.snapshot_id||run.check_name!=='d01-fixed'||snapshot.manifest_sha256!==run.snapshot_sha256||sha(Buffer.from(canonicalizeReviewJson(snapshot.manifest),'utf8'))!==run.snapshot_sha256)reject('PREFLIGHT_BINDING');
 const manifest=snapshot.manifest,profiles=manifest.check_profiles.filter(p=>p.check_name===run.check_name);
 if(profiles.length!==1||profiles[0].config_sha256!==run.check_config_sha256||!profiles[0].verifier_actor_ids.includes(run.verifier_actor_id))reject('PREFLIGHT_CONFIG');
 const matching=descriptors.filter(descriptor=>{
  const local=assets(descriptor);return manifest.artifacts.length===local.length&&local.every(asset=>manifest.artifacts.filter(item=>item.sha256===asset.sha256&&item.bytes===asset.bytes).length===1)&&manifest.artifacts.every(item=>local.some(asset=>item.sha256===asset.sha256&&item.bytes===asset.bytes));
 });
 if(matching.length!==1)reject('PREFLIGHT_MATERIAL_SET');
 const descriptor=matching[0],local=assets(descriptor),config=local.find(item=>item.role==='config');if(config.sha256!==run.check_config_sha256)reject('PREFLIGHT_CONFIG');
 // Actual scoped bytes must agree. No downloaded material is written or executed.
 for(const asset of local){const item=manifest.artifacts.find(item=>item.sha256===asset.sha256&&item.bytes===asset.bytes);const download=await client.downloadCheckArtifact(spaceId,runId,item.artifact_id);if(download.bytes.length!==asset.bytes||sha(download.bytes)!==asset.sha256||!Buffer.from(download.bytes).equals(Buffer.from(asset.content)))reject('PREFLIGHT_MATERIAL_BYTES');}
 return{run,snapshot,descriptor};
}
export async function verifyAndSubmit(client,{spaceId,runId,uploadKey,receiptKey,receiptId},testHooks){
 if(typeof uploadKey!=='string'||!uploadKey.trim()||typeof receiptKey!=='string'||!receiptKey.trim()||!/^[A-Za-z0-9._:-]{1,128}$/.test(receiptId))reject('INVALID_OPTIONS');
 const {run,snapshot,descriptor}=await preflight(client,spaceId,runId),started=new Date().toISOString();let evaluation;
 // Controlled after-preflight fault seam is test-only; CLI never supplies hooks or arbitrary code.
 try{if(testHooks?.afterPreflight)testHooks.afterPreflight();evaluation=runFixedSuite(descriptor.id);}catch{evaluation={result:'error',graphs:0,operations:0,failures:[],error_code:'EXECUTION_ENVIRONMENT'};}
 const finished=new Date().toISOString(),local=assets(descriptor),runner=local.find(item=>item.role==='runner');
 const record={check_run_id:run.id,space_id:spaceId,request_id:run.request_id,snapshot_id:run.snapshot_id,target_ref:snapshot.manifest.target.ref,snapshot_sha256:run.snapshot_sha256,config_sha256:run.check_config_sha256,candidate:descriptor.id,source_sha256:local.find(item=>item.role===descriptor.candidate_role).sha256,runner_sha256:runner.sha256,started_at:started,finished_at:finished,assumptions:'Directed nonnegative safe-integer weights; safe path arithmetic; null unreachable. First-discovery failure does not refute Dijkstra.',limits:{graphs:128,vertices:32,edges:1024,operations:10000000},limitations:'Bounded correctness examples, not exhaustive proof or performance certification. Other algorithm variants remain unexcluded.',retry_condition:'A new attempt with corrected known candidate/material may retry; environment/resource errors do not refute the algorithm.',...evaluation};
 const logBytes=Buffer.from(JSON.stringify(record)+'\n','utf8');if(logBytes.length>65536)reject('LOG_BUDGET');
 const artifact=await client.uploadCheckArtifact(spaceId,runId,new Blob([logBytes],{type:'text/plain'}),{},uploadKey);
 const receipt=await client.submitCheckReceipt(spaceId,runId,{receipt_id:receiptId,observed_snapshot_sha256:run.snapshot_sha256,observed_check_config_sha256:run.check_config_sha256,result:evaluation.result,environment:'Repository fixed local verifier; timestamps are self-reported, not attested.',tool_versions:{node:process.version,runner_sha256:runner.sha256,candidate_sha256:record.source_sha256,reference_sha256:local.find(item=>item.role==='reference').sha256},execution_steps:'Validate frozen run, actual manifest JCS/config and exact scoped bytes; execute static repository candidates against independent Bellman-Ford on fixed cases and seed20260927; publish bounded log; submit immutable receipt.',started_at:started,finished_at:finished,exit_code:evaluation.result==='pass'?0:evaluation.result==='fail'?1:2,logs_artifact_id:artifact.id},receiptKey);
 return{result:receipt.result,receipt_id:receipt.receipt_id,check_run_id:receipt.check_run_id,logs_artifact_id:receipt.logs_artifact_id};
}
function parseArgs(argv){const allowed=['url','space','run','token-file','upload-key','receipt-key','receipt-id'],values={};for(let i=0;i<argv.length;i+=2){const key=argv[i]?.slice(2);if(!argv[i]?.startsWith('--')||!allowed.includes(key)||key in values||typeof argv[i+1]!=='string'||!argv[i+1]||argv[i+1].startsWith('--'))reject('INVALID_OPTIONS');values[key]=argv[i+1];}if(allowed.some(key=>!(key in values)))reject('INVALID_OPTIONS');const url=new URL(values.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)reject('INVALID_OPTIONS');return values;}
async function main(){
 const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
 try{const args=parseArgs(process.argv.slice(2));if((statSync(args['token-file']).mode&0o077)!==0)reject('INVALID_TOKEN_FILE');const token=resolveLocalToken({tokenFile:args['token-file']});const rawClient=new DetunedClient({baseUrl:args.url,token});
 // Only scoped shared-client methods; propagate cancellation without identity discovery.
 const client={getCheckRun:(s,r)=>rawClient.getCheckRun(s,r,{signal:controller.signal}),getCheckSnapshot:(s,r)=>rawClient.getCheckSnapshot(s,r,{signal:controller.signal}),downloadCheckArtifact:(s,r,a)=>rawClient.downloadCheckArtifact(s,r,a,{signal:controller.signal}),uploadCheckArtifact:(s,r,b,m,k)=>rawClient.uploadCheckArtifact(s,r,b,m,k,{signal:controller.signal}),submitCheckReceipt:(s,r,b,k)=>rawClient.submitCheckReceipt(s,r,b,k,{signal:controller.signal})};
 const result=await verifyAndSubmit(client,{spaceId:args.space,runId:args.run,uploadKey:args['upload-key'],receiptKey:args['receipt-key'],receiptId:args['receipt-id']});process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.result==='pass'?0:result.result==='fail'?1:2;
 }catch(error){process.stderr.write(JSON.stringify({error:error instanceof VerifierError?error.code:'VERIFIER_OPERATION_FAILED',submitted:false})+'\n');process.exitCode=2;}finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
