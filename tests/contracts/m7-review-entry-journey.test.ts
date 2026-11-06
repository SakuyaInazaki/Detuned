import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPiNativeEnvironment} from '../helpers/pi-native-environment.js';
it('M7.13 real CLI and flat/wrapped MCP ordinary identities complete default review and preserve operation-scoped keys',async()=>{
 const isolated=await createPiNativeEnvironment();try{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../fixtures/review-entry-journey.mjs',import.meta.url))],{env:isolated.env,stdio:['ignore','pipe','pipe']});let out='',err='',forced=false;child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);const timer=setTimeout(()=>{forced=true;child.kill('SIGTERM');},60000);
  const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));}).finally(()=>clearTimeout(timer));expect({exit,forced,err}).toEqual({exit:{code:0,signal:null},forced:false,err:''});const result=JSON.parse(out);expect(result).toMatchObject({passed:true,model_calls:0,distinct_ordinary_actors:3,eligible_reviewers:2,accepted:true,verification_status:'not_required',check_receipts:0,sealed_second_reviewer_denied:true,current_version_read_before_finalize:true,stale_version_no_writes:true,visible_target_and_missing_profile_safe_diagnostics:true,same_key_different_operations_succeed_both_modes:true,same_operation_conflict_no_writes_both_modes:true,claude_template_wrapped_global_reads_zero_rows:true,admin_discussion_posts:0,protocol_identity_independence_only:true,cleanup:{all_mcp_closed:true,app_closed:true,private_directory_removed:true}});expect(result.transports).toHaveLength(5);for(const row of result.transports)expect(row).toMatchObject({tool_count:9,exit:{code:0,signal:null},requested_signals:[]});
 }finally{await isolated.remove();}
},70000);
