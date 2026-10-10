// Explicit old baseline dist capture; never build or import changing source.
import { readFile,writeFile,mkdtemp } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=new URL('../../../../',import.meta.url),out=new URL('./',import.meta.url);
const baseline=JSON.parse(await readFile(new URL('baseline.json',out),'utf8'));
const hashes={...baseline.tracked_build_artifact_hashes,...baseline.untracked_build_artifact_hashes};
async function verify(){for(const [p,sha]of Object.entries(hashes)){if(createHash('sha256').update(await readFile(new URL(p,root))).digest('hex')!==sha)throw Error(`Old baseline dist changed: ${p}`);}}
await verify();
const [{default:Database},{buildApp},{SqliteStorage,bootstrapDatabase}]=await Promise.all([import(new URL('packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js',root)),import(new URL('packages/server/dist/index.js',root)),import(new URL('packages/storage-sqlite/dist/index.js',root))]);
const temporary=await mkdtemp(path.join(os.tmpdir(),'detuned-m22a-history-'));const database=path.join(temporary,'historical.db');const db=new Database(database);const token=bootstrapDatabase(db).adminToken;const app=buildApp({storage:new SqliteStorage(db)});let sid;
const request=async(url,payload,key)=>{const r=await app.inject({method:'POST',url,headers:{authorization:`Bearer ${token}`,'idempotency-key':key},payload});return{status:r.statusCode,body:r.json()};};
try{
 const space=await request('/api/v1/spaces',{slug:'historical-typed',objective:'history',rules:[]},'historical-space');sid=space.body.data.space.id;
 const payload={title:'Old successful wide initial failure',initial_post:{kind:'failure',title:'Old failure',summary:'s',body:'b',structured:{attempt:'old attempt',category:'environment_error',assumptions:[],tested_scope:'this run',expected:'run',observed:'offline',evidence_refs:[],ruled_out:'this execution only',not_ruled_out:[],retry_when:[]}}};
 const key='historical-initial-failure';const response=await request(`/api/v1/spaces/${sid}/threads`,payload,key);
 if(response.status!==201)throw Error(`Old fixture not successful: ${JSON.stringify(response)}`);
 const record=db.prepare("SELECT * FROM idempotency_records WHERE key=?").get(key);
 const entity=db.prepare('SELECT * FROM post_revisions').all();const events=db.prepare('SELECT * FROM events').all();
 await verify();
 // Test credential material stays in a temporary private fixture; no token in public log.
 await writeFile(path.join(temporary,'credentials.json'),JSON.stringify({token}),{mode:0o600});
 await writeFile(new URL('historical-fixture.json',out),JSON.stringify({captured_at:new Date().toISOString(),source:'baseline-verified immutable existing dist; no source/build used',baseline_head:baseline.head,verified_dist_hashes:hashes,temporary_database:database,temporary_credentials:path.join(temporary,'credentials.json'),space_id:sid,key,payload,response,idempotency_record:record,entities:entity,events},null,2)+'\n');
 console.log(JSON.stringify({passes:true,status:response.status,recorded_request_hash:record.request_hash,event_count:events.length,persisted_structured:entity[0].structured_json ?? entity[0].structured},null,2));
}finally{await app.close();db.close();}
