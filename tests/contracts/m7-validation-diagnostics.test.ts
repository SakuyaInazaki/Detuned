import {afterEach,expect,it,vi} from 'vitest';
import {parseNewTypedStructured,CreateReviewSubmissionSchema,schemaValidationError} from '@detuned/protocol';
import {DetunedClient} from '@detuned/client';
import {validateMcpToolArguments} from '../../packages/mcp/src/tool-validation.js';
import {piToolError} from '../../packages/adapter-pi/src/runtime.js';
const marker='M79_SECRET_UNKNOWN_NAME_VALUE';
const failure={attempt:'attempt',category:'counterexample',assumptions:[],tested_scope:'scope',expected:'expected',observed:'observed',evidence_refs:[],evidence_state:'provided',ruled_out:'ruled out',not_ruled_out:[],retry_when:[]};
function caught(fn:()=>unknown):any{try{fn();}catch(error){return error;}throw Error('Expected rejection');}
afterEach(()=>vi.unstubAllGlobals());
it('M7.9-A provided failure points to empty evidence refs without reflecting content',()=>{
 const error=caught(()=>parseNewTypedStructured('failure',{...failure,attempt:marker}));
 expect(error.details.issues).toContainEqual(expect.objectContaining({path:'/structured/evidence_refs',rule:'minItems'}));
 expect(error.message).toContain('/structured/evidence_refs');expect(JSON.stringify(error)).not.toContain(marker);
});
it('M7.9-A category diagnostics provide only canonical allowed enum values',()=>{
 const error=caught(()=>parseNewTypedStructured('failure',{...failure,category:marker,evidence_refs:[{kind:'post',post_id:'post',revision:1}]}));
 expect(error.details.issues).toContainEqual(expect.objectContaining({path:'/structured/category',rule:'enum',allowed_values:expect.arrayContaining(['counterexample','test_failure'])}));
 expect(JSON.stringify(error)).not.toContain(marker);
});
it('M7.9-A MCP flat/wrapped and Pi visible errors carry bounded static paths',()=>{
 for(const [mode,args] of [['flat',{space_id:42,[marker]:marker}],['wrapped',{input:{space_id:42,[marker]:marker}}],['wrapped',{[marker]:marker}]] as const){
  const error=caught(()=>validateMcpToolArguments('forum_context',args,mode));
  expect(error.details.issues.length).toBeGreaterThan(0);expect(error.details.issues.length).toBeLessThanOrEqual(8);
  expect(error.message).toMatch(/space_id|input/);expect(piToolError(error).message).toMatch(/space_id|input/);
  expect(JSON.stringify(error)+error.message).not.toContain(marker);
  for(const issue of error.details.issues)expect(issue.path.length).toBeLessThanOrEqual(160);
 }
});
it('M7.9-A client tool validation keeps zero HTTP and exposes known branch fields',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const error=await new DetunedClient({baseUrl:'http://controlled.invalid'}).callTool('forum_publish',{space_id:'space',op:'post',kind:'note',[marker]:marker}).catch(error=>error);
 expect(error.details.issues).toContainEqual(expect.objectContaining({path:'/thread_id',rule:'required'}));
 expect(error.details.issues.length).toBeLessThanOrEqual(8);expect(JSON.stringify(error)).not.toContain(marker);expect(fetcher).not.toHaveBeenCalled();
});
it('M7.9-A many failures and hostile property names remain bounded and redacted',()=>{
 const error=caught(()=>parseNewTypedStructured('failure',{[marker]:marker,evidence_state:'provided'}));
 expect(error.details.issues.length).toBeGreaterThan(0);expect(error.details.issues.length).toBeLessThanOrEqual(8);
 expect(JSON.stringify(error)).not.toContain(marker);expect(error.message.length).toBeLessThan(600);
});

it('M7.9-A invalid and missing publish discriminators explain canonical operations',()=>{
 for(const params of [{space_id:'space',op:'create'},{space_id:'space'}]){
  const error=caught(()=>validateMcpToolArguments('forum_publish',params));
  expect(error.details.issues).toContainEqual(expect.objectContaining(params.op===undefined?{path:'/op',rule:'required'}:{path:'/op',rule:'enum',allowed_values:expect.arrayContaining(['thread','post','revision','withdraw'])}));
 }
});
it('M7.9-A numeric bounds are distinct from type errors in actual tool diagnostics',()=>{
 const error=caught(()=>validateMcpToolArguments('forum_read',{kind:'post',space_id:'space',id:'post',revision:0}));
 expect(error.details.issues).toContainEqual(expect.objectContaining({path:'/revision',rule:'minimum'}));
});

it('M7.14 trusted expected types explain numeric and array errors without reflecting input',()=>{
 for(const [name,params,path,expected] of [
  ['forum_read',{kind:'post',space_id:'s',id:'p',revision:'1'},'/revision','integer'],
  ['forum_review',{op:'finalize',space_id:'s',request_key:'k',request_id:'r',expected_version:'1'},'/expected_version','integer'],
 ] as const){const error=caught(()=>validateMcpToolArguments(name,params));expect(error.details.issues).toContainEqual({path,rule:'type',expected_type:expected});}
 const error=caught(()=>parseNewTypedStructured('proposal',{statement:'s',assumptions:marker,scope:'s',falsification_plan:'f'}));
 expect(error.details.issues).toContainEqual({path:'/structured/assumptions',rule:'type',expected_type:'array'});expect(JSON.stringify(error)).not.toContain(marker);
 const submission={snapshot_sha256:'a'.repeat(64),reviewer_session_id:'session',completion_status:'complete',verdict:'accept',coverage:'fixed material',checks_performed:'comparison',evidence_refs:[],pending_requirements:[],limitations:marker,independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'Independent'}};
 const limitations=schemaValidationError('Invalid submission.',CreateReviewSubmissionSchema,submission);
 expect(limitations.details!.issues).toContainEqual({path:'/limitations',rule:'type',expected_type:'array'});expect(JSON.stringify(limitations)).not.toContain(marker);
});
