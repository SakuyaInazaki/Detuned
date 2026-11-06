import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPiNativeEnvironment} from '../helpers/pi-native-environment.js';
it('M7.10 independent built flat/wrapped MCP and real offline Pi SDK read discovery without business writes',async()=>{
 const isolated=await createPiNativeEnvironment();
 try{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../fixtures/pi-runtime/discovery-reads.mjs',import.meta.url))],{env:isolated.env,stdio:['ignore','pipe','pipe']});let out='',err='',forced=false;
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const timer=setTimeout(()=>{forced=true;child.kill('SIGKILL');},70000);
  const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));}).finally(()=>clearTimeout(timer));expect({exit,forced,err}).toEqual({exit:{code:0,signal:null},forced:false,err:''});const result=JSON.parse(out);
  expect(result).toMatchObject({passed:true,model_calls:0,setup_participants:3,old_epoch_lookup_preserved_pending:true,actual_consumer_delete_then_lookup_404:true,cross_actor_lookup_404:true,ack_requests:0,cleanup:{host_disposed:true,app_closed:true,private_directory_removed:true}});
  expect(result.transports.map((x:{label:string})=>x.label)).toEqual(['flat','wrapped','pi-sdk']);for(const transport of result.transports)expect(transport).toMatchObject({tool_count:9,global_reads_all_rows_unchanged:true,space_reads_after_prepare_all_rows_unchanged:true,relation_paging_count:6,consumer_recovered_without_ack:true,permission_denied:true,invalid_global_zero_http:true,active_global_http_cancelled:true});
 }finally{await isolated.remove();}
},80000);
