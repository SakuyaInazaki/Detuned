import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile,writeFile,chmod,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import Database from 'better-sqlite3';
import * as current from '../../../../packages/storage-sqlite/dist/index.js';
import * as core from '../../../../packages/core/dist/index.js';
import {ReviewModule,ReviewRequestService} from '../../../../modules/review/dist/index.js';
import {backupOffline as old2Backup} from '../../2026-10-09-m6-1-b/verification/old-schema2-maintenance-runtime/packages/storage-sqlite/dist/offline-backup.js';
import {bootstrapDatabase as old2Bootstrap} from '../../2026-10-09-m6-1-b/verification/old-schema2-maintenance-runtime/packages/storage-sqlite/dist/bootstrap.js';
import {SqliteStorage as Old2Storage} from '../../2026-10-09-m6-1-b/verification/old-schema2-maintenance-runtime/packages/storage-sqlite/dist/sqlite-storage.js';
import * as old2Core from '../../2026-10-09-m6-1-b/verification/old-schema2-maintenance-runtime/packages/core/dist/index.js';
import * as old3 from './old-schema3-review-runtime/packages/storage-sqlite/dist/index.js';
import * as old3Core from './old-schema3-review-runtime/packages/core/dist/index.js';
const here=fileURLToPath(new URL('.',import.meta.url)),repo=fileURLToPath(new URL('../../../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),time='2026-10-09T00:10:00.000Z',clock={now:()=>new Date(time),nowIso:()=>time};
const old2={backupOffline:old2Backup,bootstrapDatabase:old2Bootstrap,SqliteStorage:Old2Storage};
const tables=['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions'];
const receipt={kind:'bounded independent genuine schema2/3 original backup APIs -> current4 restore, actual CLI and wire compatibility',checks:[],cleanup_removed:false};
let directory,db,stage='capture verification';
const mark=(name,details={})=>receipt.checks.push({name,...details});
function empty(d){return Object.fromEntries(tables.map(t=>[t,d.prepare('SELECT count(*) n FROM '+t).get().n]));}
async function verifyFrozen(manifest,parent){const m=JSON.parse(await readFile(manifest,'utf8'));for(const row of m.files)assert.equal(sha(await readFile(path.join(parent,row.snapshot_path))),row.sha256);}
function wire(Core,Storage,d,token,sid){const storage=new Storage(d),auth=new Core.AuthService(storage,new Core.CryptoHasher(),clock),service=new Core.SpaceExportService(storage,auth,clock),reader=service.open(auth.authenticateToken(token),sid),lines=[];try{for(let i=0;i<1000;i++){const x=reader.nextLine();if(x.kind==='done')break;if(x.kind==='line')lines.push(x.line);}assert.equal(JSON.parse(lines.at(-1)).type,'end');return lines.join('');}finally{reader.close();service.closeAll();}}
function mixed(input,patch){const lines=input.trimEnd().split('\n').map(JSON.parse);lines[0]=patch(lines[0]);let hash=Buffer.alloc(32),bytes=0;for(const line of lines.slice(0,-1)){const raw=JSON.stringify(line)+'\n';hash=createHash('sha256').update(hash).update(raw).digest();bytes+=Buffer.byteLength(raw);}lines.at(-1).chain_sha256=hash.toString('hex');lines.at(-1).bytes_before_end=bytes;return lines.map(x=>JSON.stringify(x)+'\n').join('');}
async function cliRefusal(source,mode){
 const child=spawn(process.execPath,[path.join(repo,'packages/cli/dist/index.js'),'--json',mode,'--data-dir',source],{cwd:directory,env:{PATH:process.env.PATH??''},stdio:['ignore','pipe','pipe']});
 let output='',stderrBytes=0,timer;
 child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{stderrBytes+=b.length;});
 try{const ended=await Promise.race([new Promise(resolve=>{child.once('close',(exit,signal)=>resolve({exit,signal}));child.once('error',()=>resolve({exit:null,signal:null}));}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned legacy CLI deadline')),5000);})]);
  const result=JSON.parse(output);mark('actual CLI legacy refusal',{mode,exit:ended.exit,signal:ended.signal,error_code:result.error?.code,stderr_bytes:stderrBytes});assert.equal(ended.exit,3);assert.equal(ended.signal,null);assert.equal(result.error.code,'FORBIDDEN');
 }finally{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const t=setTimeout(()=>{child.kill('SIGKILL');},1500);child.once('close',()=>{clearTimeout(t);resolve();});});}}
}
try{
 await verifyFrozen(path.join(here,'old-schema3-review-runtime-manifest.json'),here);
 const parent2=path.resolve(here,'../../2026-10-09-m6-1-b/verification');await verifyFrozen(path.join(parent2,'old-schema2-maintenance-runtime-manifest.json'),parent2);
 directory=await mkdtemp(path.join(tmpdir(),'detuned-schema4-compat-'));
 const source2=path.join(directory,'source2');await mkdir(source2,{mode:0o700});
 stage='genuine schema2 original seed';db=new Database(path.join(source2,'detuned.sqlite'));const original2=old2.bootstrapDatabase(db);const store2=new old2.SqliteStorage(db);
 const hasher2=new old2Core.CryptoHasher(),auth2=new old2Core.AuthService(store2,hasher2,clock),id2=new old2Core.CryptoIdGenerator(),ctx2=auth2.authenticateToken(original2.adminToken);
 const policy={enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:[],allow_open_objections:false};
 store2.createSpace({id:'spc-old2-compat',slug:'old2-compat',current_revision:1,policy_revision:1,acl_epoch:1,created_at:time},{space_id:'spc-old2-compat',revision:1,objective:'Synthetic old2 compatibility',rules:[],review_policy:policy,check_profiles:{},pinned_refs:[],editor_id:ctx2.actor.id,created_at:time});
 store2.createThread({id:'thd-old2-compat',space_id:'spc-old2-compat',title:'Synthetic source2',version:1,state:'open',creator_id:ctx2.actor.id,created_at:time,updated_at:time});
 new old2Core.PostService(store2,id2,clock,hasher2,auth2,new old2Core.IdempotencyService(store2,hasher2,clock)).createPost(ctx2,'spc-old2-compat','thd-old2-compat',{kind:'note',title:'synthetic source2',summary:'public recipe',body:'owned original source2 note'},'old2-note');
 const wire1=wire(old2Core,old2.SqliteStorage,db,original2.adminToken,'spc-old2-compat');assert.equal(JSON.parse(wire1.split('\n')[0]).version,1);db.close();db=undefined;
 const file2=path.join(source2,'detuned.sqlite'),hash2=sha(await readFile(file2));
 const backup2=path.join(directory,'backup2');const b2=await old2.backupOffline({dataDir:source2,outputDir:backup2,offline:true});assert.equal(b2.manifest.schemaVersion,2);
 stage='original old2 restore to4';const restored2=path.join(directory,'restored2');await current.restoreBackup({backupDir:backup2,dataDir:restored2});db=new Database(path.join(restored2,'detuned.sqlite'));assert.equal(current.classifyDatabase(db).maxVersion,4);assert.deepEqual(empty(db),Object.fromEntries(tables.map(t=>[t,0])));assert.throws(()=>new core.AuthService(new current.SqliteStorage(db),new core.CryptoHasher(),clock).authenticateToken(original2.adminToken));db.close();db=undefined;assert.equal(sha(await readFile(file2)),hash2);mark('actual original schema2 API backup restores only new schema4 stage',{source_hash_unchanged:true,formal_tables_empty:true,old_token_rejected:true});
 stage='actual source3 oracle reconstruction';const history=JSON.parse(await readFile(path.join(repo,'tests/fixtures/historical-v3-review-history.json'),'utf8'));
 const source3=path.join(directory,'source3');await mkdir(source3,{mode:0o700});const file3=path.join(source3,'detuned.sqlite');db=new Database(file3);const sql=await readFile(path.join(repo,'tests/fixtures/historical-v3-schema.sql'),'utf8');assert.equal(sha(sql),history.source_sql_sha256);db.exec(sql);
 db.transaction(()=>{for(const [table,rows] of Object.entries(history.rows))for(const row of rows){assert.match(table,/^[a-z_][a-z0-9_]*$/);const keys=Object.keys(row);assert.ok(keys.every(k=>/^[a-z_][a-z0-9_]*$/.test(k)));db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));}})();
 db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('initialized','true');db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('token_secret',randomBytes(32).toString('hex'));
 const store3=new old3.SqliteStorage(db),hasher3=new old3Core.CryptoHasher(),token3=randomBytes(32).toString('hex');store3.createCredential({id:'owned-export-original3',actor_id:history.recipe.actors.author,token_hash:hasher3.sha256(token3),allowed_space_ids:[history.recipe.space_id],capabilities:['read','write'],created_at:time,revoked_at:null,expires_at:null});
 const wire3=wire(old3Core,old3.SqliteStorage,db,token3,history.recipe.space_id);assert.equal(JSON.parse(wire3.split('\n')[0]).source.schema_version,3);db.close();db=undefined;
 const hash3=sha(await readFile(file3)),backup3=path.join(directory,'backup3');const b3=await old3.backupOffline({dataDir:source3,outputDir:backup3,offline:true});assert.equal(b3.manifest.schemaVersion,3);const backupHash3=sha(await readFile(path.join(backup3,'detuned.sqlite')));
 for(const source of [source2,source3])for(const mode of ['init','serve']){stage='built CLI original '+path.basename(source)+' '+mode;await cliRefusal(source,mode);}
 assert.equal(sha(await readFile(file2)),hash2);assert.equal(sha(await readFile(file3)),hash3);
 stage='genuine original schema3 backup restores to4';const restored3=path.join(directory,'restored3');const restored=await current.restoreBackup({backupDir:backup3,dataDir:restored3});db=new Database(path.join(restored3,'detuned.sqlite'));
 assert.equal(current.classifyDatabase(db).maxVersion,4);const storage=new current.SqliteStorage(db),hasher=new core.CryptoHasher(),auth=new core.AuthService(storage,hasher,clock),idGen=new core.CryptoIdGenerator();assert.throws(()=>auth.authenticateToken(token3));
 const service=new ReviewRequestService(storage,auth,new core.IdempotencyService(storage,hasher,clock),clock,idGen,new ReviewModule(storage,hasher,clock,idGen,auth));
 const freshToken=randomBytes(32).toString('hex');storage.createCredential({id:'owned-replay-original3',actor_id:history.recipe.actors.author,token_hash:hasher.sha256(freshToken),allowed_space_ids:[history.recipe.space_id],capabilities:['read','write'],created_at:time,revoked_at:null,expires_at:null});const context=auth.authenticateToken(freshToken);
 for(const [name,item] of Object.entries(history.oracle)){const output=name==='cancel'?service.cancelRequest(context,item.space_id,item.request_id,item.payload,item.key):service.createRequest(context,item.space_id,item.payload,item.key);assert.deepEqual(output,item.response);assert.equal(db.prepare('SELECT result_ref FROM idempotency_records WHERE key=?').get(item.key).result_ref,item.result_ref);}
 const wire4=wire(core,current.SqliteStorage,db,restored.adminToken,history.recipe.space_id);assert.equal(JSON.parse(wire4.split('\n')[0]).source.schema_version,4);for(const value of ['manifest_json','group_at_assignment',history.oracle.create.response.id])assert.equal(wire4.includes(value),false);db.close();db=undefined;
 assert.equal(sha(await readFile(file3)),hash3);assert.equal(sha(await readFile(path.join(backup3,'detuned.sqlite'))),backupHash3);mark('genuine original3 API backup ->4 preserves exact original service base responses and compact refs',{original_replays_exact:true,source_backup_unchanged:true,old_token_rejected:true});
 stage='logical version compatibility';for(const [name,value] of [['wire1-source2',wire1],['wire2-source3',wire3],['wire2-source4',wire4]]){
  const file=path.join(directory,name+'.ndjson');await writeFile(file,value,{mode:0o600});const target=path.join(directory,'import-'+name);await current.importSpace({inputPath:file,dataDir:target,adminName:'owned logical import'});db=new Database(path.join(target,'detuned.sqlite'));assert.equal(current.classifyDatabase(db).maxVersion,4);assert.deepEqual(empty(db),Object.fromEntries(tables.map(t=>[t,0])));db.close();db=undefined;mark('actual '+name+' import',{formal_empty:true,schema_version:4});
 }
 for(const [name,value] of [['wire1-source3',mixed(wire1,h=>({...h,source:{...h.source,schema_version:3}}))],['wire2-source2',mixed(wire4,h=>({...h,source:{...h.source,schema_version:2}}))],['wire2-not-enabled',mixed(wire4,h=>({...h,formal_review_status:'not_enabled'}))]]){
  const file=path.join(directory,name+'.ndjson');await writeFile(file,value,{mode:0o600});await assert.rejects(()=>current.importSpace({inputPath:file,dataDir:path.join(directory,'reject-'+name),adminName:'owned rejection'}),e=>e.code==='INVALID_INPUT');mark('chain-valid mixed contract rejects '+name,{error_code:'INVALID_INPUT'});
 }
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.failure={stage,name:error?.name??'Error',code:typeof error?.code==='string'&&/^[A-Z_]{1,40}$/.test(error.code)?error.code:'ASSERTION_OR_ERROR'};process.exitCode=1;}
finally{db?.close();if(directory){await rm(directory,{recursive:true,force:true});receipt.cleanup_removed=await access(directory).then(()=>false,()=>true);}await writeFile(path.join(here,'maintenance-compatibility-receipt.json'),JSON.stringify(receipt,null,2)+'\n');process.stdout.write(JSON.stringify(receipt)+'\n');}
