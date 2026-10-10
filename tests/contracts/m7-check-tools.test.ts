import {it,expect,vi} from 'vitest';
import {DETUNED_TOOLS,validateToolParams,CreateCheckRunSchema,InvalidateCheckRunSchema,ToolCheckCreateOpSchema,ToolCheckInvalidateOpSchema} from '@detuned/protocol';
import {DetunedClient} from '@detuned/client';
import {getMcpTools,validateMcpToolArguments} from '../../packages/mcp/src/tool-validation.js';
import {adaptToolSchema} from '../../packages/adapter-pi/src/index.js';
import {createPiRuntime} from '../../packages/adapter-pi/src/runtime.js';
const space={space_id:'s'},key={...space,request_key:'key'};
const create={...key,op:'check_create',request_id:'request',snapshot_id:'snapshot',check_name:'local',verifier_id:'verifier',expected_request_version:1};
const invalidate={...key,op:'check_invalidate',run_id:'run',expected_version:2,reason:'Real invalidation'};
const reads=[
 {kind:'check_run',...space,id:'run'}, {kind:'check_snapshot',...space,id:'run'},
 {kind:'check_receipt',...space,id:'run'}, {kind:'required_checks',...space,id:'request'},
 {kind:'check_post_revision',...space,run_id:'run',id:'post',revision:1},
 {kind:'check_artifact',...space,run_id:'run',id:'artifact'},
];
it('CT01 complete nine-tool canonical catalogs retain every new branch and canonical input field in flat/wrapped/Pi projection',()=>{
 const original=JSON.stringify(DETUNED_TOOLS),flat=getMcpTools(),wrapped=getMcpTools('wrapped');
 expect(flat.map(x=>x.name)).toEqual(['forum_context','forum_search','forum_read','forum_publish','forum_relate','forum_subscribe','forum_poll','forum_ack','forum_review']);
 for(let i=0;i<DETUNED_TOOLS.length;i++){
  const tool=DETUNED_TOOLS[i]!;expect(flat[i]!.inputSchema).toBe(tool.schema);
  expect(wrapped[i]!.inputSchema).toEqual({type:'object',properties:{input:tool.schema},required:['input'],additionalProperties:false});
  expect(adaptToolSchema(tool.schema)).toBe(tool.schema);
 }
 for(const [name,input] of [...reads.map(input=>['forum_read',input] as const),['forum_review',create] as const,['forum_review',invalidate] as const]){
  const bytes=JSON.stringify(input);expect(validateMcpToolArguments(name,input)).toBe(input);expect(validateMcpToolArguments(name,{input},'wrapped')).toBe(input);expect(JSON.stringify(input)).toBe(bytes);
 }
 for(const [name,schema] of Object.entries(CreateCheckRunSchema.properties))expect(ToolCheckCreateOpSchema.properties[name as keyof typeof CreateCheckRunSchema.properties]).toBe(schema);
 for(const [name,schema] of Object.entries(InvalidateCheckRunSchema.properties))expect(ToolCheckInvalidateOpSchema.properties[name as keyof typeof InvalidateCheckRunSchema.properties]).toBe(schema);
 expect(ToolCheckInvalidateOpSchema.properties.reason['x-max-codepoints']).toBe(500);expect(ToolCheckInvalidateOpSchema.properties.reason.maxLength).toBeUndefined();
 expect(JSON.stringify(DETUNED_TOOLS)).toBe(original);
});
it('CT02 canonical and SDK flat/wrapped reject cross-branch selectors and all ordinary forbidden issuer/verify/binary operations',()=>{
 const invalid:Array<[string,Record<string,unknown>]>=[
  ['forum_review',{...create,run_id:'other'}],['forum_review',{...create,logicalOperationId:'persist'}],
  ['forum_review',{...invalidate,request_id:'other'}],['forum_review',{...invalidate,expected_version:0}],
  ...['credential','receipt_submit','artifact_upload'].map(op=>['forum_review',{...key,op,run_id:'run'}] as [string,Record<string,unknown>]),
  ['forum_read',{...reads[0],run_id:'other'}],['forum_read',{...reads[4],revision:0}],['forum_read',{...reads[4],revision:Number.MAX_SAFE_INTEGER+1}],
  ['forum_read',{...reads[5],run_id:undefined}],['forum_read',{...space,kind:'check_content',id:'artifact',run_id:'run'}],
 ];
 for(const input of reads)for(const extra of [{cursor:'opaque'},{max_bytes:4096},{limit:1},{path:'/private/file'},{url:'http://other'},{request_key:'key'},{unknown:true}])invalid.push(['forum_read',{...input,...extra}]);
 for(const [name,input] of invalid){expect(validateToolParams(name,input),JSON.stringify(input)).toBe(false);expect(()=>validateMcpToolArguments(name,input)).toThrow();expect(()=>validateMcpToolArguments(name,{input},'wrapped')).toThrow();}
 expect(()=>validateMcpToolArguments('forum_review',{input:invalidate,unknown:true},'wrapped')).toThrow();
});
it('CT03 500 Unicode codepoints remain legal and 501 are refused by canonical/flat/wrapped/Pi before client factory or prepare',async()=>{
 const legal={...invalidate,reason:'😀'.repeat(500)},bad={...invalidate,reason:'😀'.repeat(501)};
 expect(validateToolParams('forum_review',legal)).toBe(true);expect(validateMcpToolArguments('forum_review',legal)).toBe(legal);expect(validateMcpToolArguments('forum_review',{input:legal},'wrapped')).toBe(legal);
 expect(validateToolParams('forum_review',bad)).toBe(false);for(const mode of ['flat','wrapped'] as const)expect(()=>validateMcpToolArguments('forum_review',mode==='flat'?bad:{input:bad},mode)).toThrow();
 let factories=0;const runtime=createPiRuntime({snapshot:()=>({baseUrl:'http://controlled.invalid',environmentToken:'ordinary'}),createClient:()=>{factories++;throw Error('controlled factory boundary');}});
 try{await expect(runtime.tool('forum_review',bad)).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(factories).toBe(0);await expect(runtime.tool('forum_review',legal)).rejects.toThrow();expect(factories).toBe(1);}finally{await runtime.close();}
});
it('CT04 common dispatcher forwards exact selectors/body/key/signal to all eight typed methods, without alternate transport or identity discovery',async()=>{
 const client=new DetunedClient({baseUrl:'http://controlled.invalid'}),sentinel=Error('controlled typed method boundary'),signal=new AbortController().signal;
 const spies={create:vi.spyOn(client,'createCheckRun').mockRejectedValue(sentinel),invalidate:vi.spyOn(client,'invalidateCheckRun').mockRejectedValue(sentinel),run:vi.spyOn(client,'getCheckRun').mockRejectedValue(sentinel),snapshot:vi.spyOn(client,'getCheckSnapshot').mockRejectedValue(sentinel),receipt:vi.spyOn(client,'getCheckReceipt').mockRejectedValue(sentinel),required:vi.spyOn(client,'getRequiredChecks').mockRejectedValue(sentinel),post:vi.spyOn(client,'getCheckPostRevision').mockRejectedValue(sentinel),artifact:vi.spyOn(client,'getCheckArtifact').mockRejectedValue(sentinel)};
 const me=vi.spyOn(client,'getMe').mockRejectedValue(Error('unexpected identity discovery'));
 try{
  for(const input of reads)await expect(client.callTool('forum_read',input,{signal})).rejects.toBe(sentinel);
  await expect(client.callTool('forum_review',create,{signal})).rejects.toBe(sentinel);await expect(client.callTool('forum_review',invalidate,{signal})).rejects.toBe(sentinel);
  expect(spies.run).toHaveBeenCalledExactlyOnceWith('s','run',{signal});expect(spies.snapshot).toHaveBeenCalledExactlyOnceWith('s','run',{signal});expect(spies.receipt).toHaveBeenCalledExactlyOnceWith('s','run',{signal});expect(spies.required).toHaveBeenCalledExactlyOnceWith('s','request',{signal});expect(spies.post).toHaveBeenCalledExactlyOnceWith('s','run','post',1,{signal});expect(spies.artifact).toHaveBeenCalledExactlyOnceWith('s','run','artifact',{signal});
  expect(spies.create).toHaveBeenCalledExactlyOnceWith('s',{request_id:'request',snapshot_id:'snapshot',check_name:'local',verifier_id:'verifier',expected_request_version:1},'key',{signal});expect(spies.invalidate).toHaveBeenCalledExactlyOnceWith('s','run',{expected_version:2,reason:'Real invalidation'},'key',{signal});expect(me).not.toHaveBeenCalled();
 }finally{for(const spy of Object.values(spies))spy.mockRestore();me.mockRestore();}
});
it('CT05 shared client refuses bad tool params before any HTTP, including oversized reason and forbidden persistent/secret/binary fields',async()=>{
 let http=0;vi.stubGlobal('fetch',vi.fn(async()=>{http++;throw Error('unexpected HTTP');}));const client=new DetunedClient({baseUrl:'http://controlled.invalid',maxRetries:0});
 try{
 for(const [name,input] of [['forum_review',{...invalidate,reason:'😀'.repeat(501)}],['forum_review',{...create,logicalOperationId:'persist'}],['forum_review',{...key,op:'credential',run_id:'run'}],['forum_read',{...reads[5],content:true}],['forum_read',{...reads[4],revision:1.5}]] as const)await expect(client.callTool(name,input)).rejects.toMatchObject({code:'VALIDATION_ERROR'});
 expect(http).toBe(0);
 }finally{vi.unstubAllGlobals();}
});
