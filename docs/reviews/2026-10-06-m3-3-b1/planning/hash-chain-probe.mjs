import {performance} from 'node:perf_hooks';
const started=performance.now(),before=process.memoryUsage(),encoder=new TextEncoder();
const count=20000;let previous=new Uint8Array(32),bytes=0,records=0,stopped=false;
const hash=async(line)=>{const body=encoder.encode(line);const joined=new Uint8Array(32+body.length);joined.set(previous);joined.set(body,32);previous=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',joined));bytes+=body.length;};
await hash(JSON.stringify({type:'header',format:'detuned-space-export',version:1,space_id:'probe-space'})+'\n');
for(let seq=1;seq<=count;seq++){
 if(performance.now()-started>=15000){stopped=true;break;}
 await hash(JSON.stringify({type:'record',seq,kind:'note',id:'post-'+seq,body:'x'.repeat(950)})+'\n');records++;
}
console.log(JSON.stringify({node:process.version,hash_protocol:'SHA256(prevDigestRaw32 || exactUtf8LineWithLF); initial zero32; header included; end excluded',records_planned:count,records_completed:records,header_lines:1,total_bytes:bytes,elapsed_ms:performance.now()-started,stopped_at_15s:stopped,final_digest:Buffer.from(previous).toString('hex'),memory_before:before,memory_after:process.memoryUsage(),bounded_design:'Only current line/joined buffer and previous digest are retained; memory delta alone is not a bounded-memory proof'},null,2));
