import assert from 'node:assert/strict';
import {makeHarness} from './real-harness-factory.mjs';
import {filePart,end,boundary,rawUpload} from './probe-multipart.mjs';
const h=await makeHarness();const results=[];
try{for(const mime of ['text/plain','application/json']){for(const size of [4096,4097]){
 const text=' '.repeat(size-2)+'{}';const part=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: ${mime}\r\n\r\n${text}\r\n`);
 const before=h.snapshot();const r=await rawUpload({url:h.uploadUrl,token:h.token,key:`encoding-${mime}-${size}`,chunks:[filePart('encoding'),part,end]}).result;
 results.push({mime,raw_bytes:Buffer.byteLength(text),status:r.status,body:r.body});assert.equal(r.status,size===4096?201:400);if(size===4097)assert.deepEqual(h.snapshot(),before);await h.assertNoOwnCandidates();
}}console.log(JSON.stringify({cases:results,passes:true},null,2));}catch(e){console.log(JSON.stringify({cases:results,passes:false,error:{name:e.name,message:e.message,stack:e.stack}},null,2));process.exitCode=1;}finally{await h.close();}
