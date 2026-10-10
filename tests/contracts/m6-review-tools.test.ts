import {it,expect} from 'vitest';
import {DETUNED_TOOLS,validateToolParams} from '@detuned/protocol';
import {DetunedClient} from '@detuned/client';
import {getMcpTools,validateMcpToolArguments} from '../../packages/mcp/src/tool-validation.js';
const s={space_id:'s'},k={...s,request_key:'key'};
const samples:Record<string,Record<string,unknown>>={forum_context:{...s,max_bytes:4096},forum_search:{...s,q:'x'},forum_read:{...s,kind:'post',id:'p'},forum_publish:{...k,op:'thread',title:'T'},forum_relate:{...k,op:'create',source_ref:{post_id:'p',revision:1},target_ref:{post_id:'q',revision:1},type:'cites'},forum_subscribe:{...k,consumer_key:'c',start:'beginning'},forum_poll:{...s,consumer_id:'c',wait_ms:0},forum_ack:{...s,consumer_id:'c',batch_id:'b',next_cursor:'opaque'},forum_review:{...k,op:'cancel',request_id:'r',expected_version:1,reason:'cancel'}};
it('RT01 nine canonical schemas preserve inputs and real SDK flat/wrapped strictness',()=>{
 const before=JSON.stringify(DETUNED_TOOLS);expect(getMcpTools()).toHaveLength(9);
 for(const [name,input] of Object.entries(samples)){
  const bytes=JSON.stringify(input);expect(validateToolParams(name,input)).toBe(true);
  expect(validateMcpToolArguments(name,input)).toBe(input);
  expect(validateMcpToolArguments(name,{input},'wrapped')).toBe(input);
  expect(validateToolParams(name,{...input,unknown:true})).toBe(false);
  expect(()=>validateMcpToolArguments(name,{input,unknown:true},'wrapped')).toThrow();
  expect(JSON.stringify(input)).toBe(bytes);
 }
 expect(JSON.stringify(DETUNED_TOOLS)).toBe(before);expect(validateToolParams('unknown',s)).toBe(false);
});
it('RT02 explicit subscription and read combinations stay strict beyond local schema keywords',()=>{
 expect(validateToolParams('forum_subscribe',{...k,consumer_key:'c',start:'context_checkpoint',checkpoint_token:'opaque'})).toBe(true);
 for(const args of [{...k,consumer_key:'c',start:'context_checkpoint'},{...k,consumer_key:'c',start:'now',checkpoint_token:'opaque'}])expect(validateToolParams('forum_subscribe',args)).toBe(false);
 for(const kind of ['review_request','review_snapshot','review_assignment','review_submission','review_submissions','review_status','review_decision','artifact']){
  expect(validateToolParams('forum_read',{...s,kind,id:'r'})).toBe(true);
  expect(validateToolParams('forum_read',{...s,kind,id:'r',revision:1})).toBe(false);
 }
 expect(validateToolParams('forum_read',{...s,kind:'post',id:'p',cursor:'x'})).toBe(false);
});
it('RT03 explicit session operation rejects identity/key/metadata fields before any HTTP',async()=>{
 const input={...s,op:'create_session',request_id:'r',client_name:'test',client_version:'1'};
 expect(validateToolParams('forum_review',input)).toBe(true);
 const client=new DetunedClient({baseUrl:'http://127.0.0.1:1'});
 for(const extra of [{actor_id:'a'},{request_key:'key'},{metadata:{}},{client_name:''}]){
  const bad={...input,...extra};expect(validateToolParams('forum_review',bad)).toBe(false);
  await expect(client.callTool('forum_review',bad)).rejects.toMatchObject({code:'VALIDATION_ERROR'});
 }
 await expect(client.callTool('forum_search',{...s,q:'x',unknown:true})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
});
it('RT04 all five review variants use current DTO properties without cross-branch fields',()=>{
 const variants=[
  {...k,op:'request',target_ref:{post_id:'p',revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['a'],expected_policy_revision:1,reproduction_instructions:'run'},
  {...k,op:'submit',request_id:'r',snapshot_sha256:'a'.repeat(64),reviewer_session_id:'session',completion_status:'complete',verdict:'accept',coverage:'all',checks_performed:'manual',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}},
  {...k,op:'finalize',request_id:'r',expected_version:1},samples.forum_review,
  {...s,op:'create_session',request_id:'r',client_name:'test',client_version:'1'},
 ];
 for(const input of variants){expect(validateToolParams('forum_review',input)).toBe(true);expect(validateMcpToolArguments('forum_review',{input},'wrapped')).toBe(input);expect(validateToolParams('forum_review',{...input,actor_id:'a'})).toBe(false);}
 expect(validateToolParams('forum_review',{...k,op:'cancel',request_id:'r',reason:'cancel'})).toBe(false);
 expect(validateToolParams('forum_review',{...k,op:'finalize',request_id:'r',expected_version:0})).toBe(false);
});
