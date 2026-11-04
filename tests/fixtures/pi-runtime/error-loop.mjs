// Fixed SDK error conversion with an in-memory stream fixture, never a provider.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const sdkPackage=fs.realpathSync(path.join(repo,'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json'));
const corePackage=fs.realpathSync(path.join(path.dirname(sdkPackage),'../pi-agent-core/package.json'));
const coreMetadata=JSON.parse(fs.readFileSync(corePackage,'utf8'));
assert.equal(coreMetadata.version,'0.87.1');
const {runAgentLoop}=await import(new URL(coreMetadata.exports['.'].import,pathToFileURL(corePackage)).href);
const {default:activate}=await import(pathToFileURL(path.join(repo,'packages/adapter-pi/dist/index.js')));
const metadata=JSON.parse(fs.readFileSync(path.join(repo,'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json'),'utf8'));
assert.equal(metadata.version,'0.87.1');
const marker='PRIVATE_PI_UPSTREAM_ERROR';
const cases=[
 {error:{code:'REVISION_CONFLICT',message:'Public revision changed.',retryable:false,details:{current_revision:3}},text:'[REVISION_CONFLICT] Public revision changed.'},
 {error:{code:{private:marker},message:marker,retryable:false},text:'[VALIDATION_ERROR] HTTP 409 请求失败'},
 {error:{message:marker,details:{private:marker}},text:'[VALIDATION_ERROR] HTTP 409 请求失败'},
];
const outputs=[];
for(const item of cases){
 const tools=[];const events=[];let http=0,steps=0,observed;
 activate({on(){},registerCommand(){},registerTool(tool){tools.push(tool);}});
 globalThis.fetch=async()=>{http++;return new Response(JSON.stringify({api_version:'1',request_id:'controlled-error',error:item.error}),{status:409});};
 const stream=async(_model,context)=>{
  steps++;
  if(steps===2){observed=context.messages.find(message=>message.role==='toolResult');assert.ok(observed);assert.equal(observed.isError,true);assert.equal(observed.content[0].text,item.text);assert.ok(!JSON.stringify(observed).includes(marker));}
  assert.ok(steps<=2,'Fixture must never start another generation');
  const message={role:'assistant',content:steps===1?[{type:'toolCall',id:'controlled-call',name:'forum_context',arguments:{space_id:'space'}}]:[{type:'text',text:'done'}],api:'fixture',provider:'fixture',model:'fixture',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:steps===1?'toolUse':'stop',timestamp:0};
  return {async *[Symbol.asyncIterator](){yield {type:'done',reason:message.stopReason,message};},result:async()=>message};
 };
 await runAgentLoop([{role:'user',content:'deterministic fixture',timestamp:0}],{messages:[],tools},{model:{provider:'fixture',id:'fixture',api:'fixture'},convertToLlm:messages=>messages},event=>events.push(event),undefined,stream);
 const end=events.find(event=>event.type==='tool_execution_end');assert.ok(end?.isError);assert.deepEqual(end.result.details,{});
 assert.equal(steps,2);assert.equal(http,1);
 outputs.push({visible_text:item.text,http_requests:http,synthetic_stream_steps:steps,sdk_clears_error_details:true});
}
process.stdout.write(JSON.stringify({passed:true,sdk_version:metadata.version,provider_calls:0,synthetic_stream_fixture:true,cases:outputs})+'\n');
