import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPiNativeEnvironment} from '../helpers/pi-native-environment.js';
it('M7.11 independent built flat/wrapped MCP and real offline Pi SDK access verified evidence and explicitly deactivate',async()=>{
 const isolated=await createPiNativeEnvironment();
 try{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../fixtures/pi-runtime/evidence-access.mjs',import.meta.url))],{env:isolated.env,stdio:['ignore','pipe','pipe']});let out='',err='',forced=false;
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const timer=setTimeout(()=>{forced=true;child.kill('SIGKILL');},70000);
  const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));}).finally(()=>clearTimeout(timer));expect({exit,forced,err}).toEqual({exit:{code:0,signal:null},forced:false,err:''});const result=JSON.parse(out);
  expect(result).toMatchObject({passed:true,model_calls:0,setup_participants:3,old_epoch_lookup_preserved_pending:true,actual_consumer_delete_then_lookup_404:true,cross_actor_lookup_404:true,ack_requests:0,cleanup:{host_disposed:true,app_closed:true,private_directory_removed:true}});
  expect(result.transports.map((x:{label:string})=>x.label)).toEqual(['flat','wrapped','pi-sdk']);for(const transport of result.transports)expect(transport).toMatchObject({guide_three_json_envelopes_executed:true,fixed_revision_artifact_catalog:true,unprepared_invalid_content_zero_http_and_rows:true,base64_independent_pages_reconstruct:true,full_text_reconstructed:true,actual_pretty_json_budget:true,invalid_continuation_zero_http:true,three_named_views:true,history_fixed_reasons:true,content_http_cancelled:true,deactivation_preserves_subscriptions_events:true,tool_count:9,global_reads_all_rows_unchanged:true,space_reads_after_prepare_all_rows_unchanged:true,relation_paging_count:6,consumer_recovered_without_ack:true,permission_denied:true,invalid_global_zero_http:true,active_global_http_cancelled:true});
 }finally{await isolated.remove();}
},80000);
