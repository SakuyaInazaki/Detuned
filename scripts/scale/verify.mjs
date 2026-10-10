import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditSeed,auditRun} from './verify-audit.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export async function isolatedJourney(options){
 const child=spawn(process.execPath,[new URL('./verify-session.mjs',import.meta.url).pathname],{stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH}});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.stdin.end(JSON.stringify(options));await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`HTTP-only session failed (${code}): ${stderr}`)));});return JSON.parse(stdout);
}
export function auditJourney(result,oracle){
 const actual=new Map(result.documents.map(x=>[x.ref.post_id?`${x.ref.post_id}:${x.ref.revision}`:`space:${x.ref.revision}`,x]));
 const checks=[];for(const expected of oracle.documents??[]){const key=expected.ref.post_id?`${expected.ref.post_id}:${expected.ref.revision}`:`space:${expected.ref.revision}`;const doc=actual.get(key);assert.ok(doc,`HTTP-discovered document missing ${key}`);assert.deepEqual(doc.content,expected.content);checks.push(key);}
 if(oracle.task){const task=oracle.task;const failure=actual.get(`${task.failure_ref.post_id}:${task.failure_ref.revision}`);assert.ok(failure,'task fixed failure obtained');for(const [name,value] of Object.entries(task.expected_failure_fields))assert.deepEqual(failure.content.structured[name],value,`failure field ${name}`);assert.ok(actual.has(`${task.summary_ref.post_id}:${task.summary_ref.revision}`),'summary obtained');for(const ref of task.source_refs)assert.ok(actual.has(`${ref.post_id}:${ref.revision}`),'source fixed content obtained');checks.push('task conditions/evidence/variants/retry and sources');}
 for(const representative of oracle.representative_posts??[]){const doc=actual.get(`${(representative.ref??representative).post_id}:${(representative.ref??representative).revision}`);if(doc){assert.equal(hash(JSON.stringify(doc.content)),representative.document_sha256);assert.equal(doc.bytes,representative.document_bytes);}}
 assert.ok(result.discovered_failure_ids.length>0);return {documents_checked:checks,HTTP_records:result.records.length,HTTP_bytes:result.records.reduce((n,x)=>n+x.response_bytes,0),oracle_opened_after_session:true};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [mode,oracleFile,output]=process.argv.slice(2);if(mode==='seed'){const result=await auditSeed(oracleFile);await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({counts:result.counts,credential_free:result.credential_free}));}else if(mode==='run'){const target=process.argv[5];const result=await auditRun(oracleFile,output,process.argv[6]);await writeFile(target,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({requests:result.requests,consumers:result.consumer_checks.length}));}else{assert.equal(mode,'session','usage: verify.mjs session <oracle.json> <new output.json>; connection config on stdin');let input='';for await(const part of process.stdin)input+=part;
 const result=await isolatedJourney(JSON.parse(input));
 // Independent oracle is deliberately opened only after the child has exited.
 const oracle=JSON.parse(await readFile(oracleFile,'utf8'));const audit=auditJourney(result,oracle);
 const checkpoint=result.initial_checkpoint;delete result.initial_checkpoint;
 for(const record of result.records)if(record.response?.data?.checkpoint_token){record.response.data.checkpoint_token_sha256=hash(record.response.data.checkpoint_token);delete record.response.data.checkpoint_token;}
 await writeFile(output,JSON.stringify({audit,checkpoint_sha256:hash(checkpoint),journey:result},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(audit));}
}
