import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {isolatedJourney,auditJourney} from './verify.mjs';
import {fingerprints} from './verify-audit.mjs';
import {controls} from './verify-controls.mjs';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url)),Database=require('better-sqlite3');
const [liveFile,phase,output]=process.argv.slice(2);assert.ok(['preflight','postflight'].includes(phase));const live=JSON.parse(await readFile(liveFile,'utf8'));const manifestFile=live.manifest;const directory=dirname(manifestFile);const discovery=JSON.parse(await readFile(join(directory,'discovery.json'),'utf8'));
const db=new Database(live.db_path,{readonly:true,fileMustExist:true});try{
 const before=fingerprints(db);const result=await isolatedJourney({baseURL:live.base_url,token:live.tokens[0],space_id:discovery.space_id,query:discovery.query});const after=fingerprints(db);assert.deepEqual(after,before,'HTTP read journey writes no tables');
 const oracle=JSON.parse(await readFile(join(directory,'oracle.json'),'utf8'));const audit=auditJourney(result,oracle);const hash=x=>createHash('sha256').update(x).digest('hex');const extra=process.argv[5]==='--controls'?await controls(live,result):null;const checkpointHash=hash(result.initial_checkpoint);delete result.initial_checkpoint;
 for(const r of result.records){if(r.response.data?.checkpoint_token){r.response.data.checkpoint_token_sha256=hash(r.response.data.checkpoint_token);delete r.response.data.checkpoint_token;}}
 await writeFile(output,JSON.stringify({phase,audit,controls:extra,checkpoint_sha256:checkpointHash,readonly_fingerprints:before,journey:result},null,2)+'\n',{flag:'wx'});await writeFile(join(dirname(liveFile),phase+'.ok'),'independent HTTP-only journey accepted\n',{flag:'wx'});console.log(JSON.stringify({phase,...audit,read_only:true}));
}finally{db.close();}
