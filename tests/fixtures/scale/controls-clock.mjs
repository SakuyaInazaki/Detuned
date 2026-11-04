// Real HTTP controls with an injected business clock; no inference or fake ACKs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildApp} from '../../../packages/server/dist/index.js';
import {SqliteStorage} from '../../../packages/storage-sqlite/dist/index.js';
import {isolatedJourney} from '../../../scripts/scale/verify.mjs';
import {controls} from '../../../scripts/scale/verify-controls.mjs';
const require=createRequire(new URL('../../../package.json',import.meta.url)),Database=require('better-sqlite3');
const [manifestFile,runtimeFile,output]=process.argv.slice(2);
assert.ok([manifestFile,runtimeFile,output].every(value=>typeof value==='string'&&path.isAbsolute(value)));
const manifest=JSON.parse(await fs.readFile(manifestFile,'utf8')),runtime=JSON.parse(await fs.readFile(runtimeFile,'utf8'));
const discovery=JSON.parse(await fs.readFile(path.join(path.dirname(manifestFile),'discovery.json'),'utf8'));
const db=new Database(runtime.db_path,{fileMustExist:true});let offset=0,app,report;
const clock={now:()=>new Date(Date.now()+offset),nowIso:()=>new Date(Date.now()+offset).toISOString()};
const fetch=globalThis.fetch;const cursors=[];let ackUsedRenewed=false;
try{
 app=buildApp({storage:new SqliteStorage(db),clock,writeRateLimits:{per_minute:60000,burst:10000}});
 const base_url=await app.listen({host:'127.0.0.1',port:0});
 const journey=await isolatedJourney({baseURL:base_url,token:runtime.tokens[0],space_id:discovery.space_id,query:discovery.query});
 globalThis.fetch=async(input,init)=>{
  const endpoint=new URL(input).pathname;
  if(endpoint.endsWith('/ack'))ackUsedRenewed=JSON.parse(init.body).next_cursor===cursors[1];
  const response=await fetch(input,init),text=response.text.bind(response);
  response.text=async()=>{const raw=await text();if(endpoint.endsWith('/poll')&&cursors.length<2)cursors.push(JSON.parse(raw).data.next_cursor);return raw;};
  return response;
 };
 const result=await controls({base_url,db_path:runtime.db_path,tokens:runtime.tokens},journey,{beforeRedelivery:async()=>{offset+=2000;}});
 assert.equal(offset,2000);assert.equal(cursors.length,2);assert.notEqual(cursors[0],cursors[1]);assert.ok(ackUsedRenewed);
 report={passed:true,provider_calls:0,clock_advance_ms:offset,cursor_renewed:true,ack_used_renewed_cursor:true,consumption:{from_seq:result.consumption.from_seq,through_seq:result.consumption.through_seq,actual_ack:result.consumption.actual_ack,no_auto_ack:result.consumption.no_auto_ack},ACL_statuses:result.ACL_statuses,source_lifecycle_projection:result.source_lifecycle_projection,server_closed:false};
}finally{globalThis.fetch=fetch;if(app)await app.close();db.close();}
report.server_closed=true;
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
process.stdout.write('CONTROLS_CLOCK_PASSED\n');
