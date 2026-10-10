import assert from 'node:assert/strict';
import {mkdtemp,rm,stat,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import Database from 'better-sqlite3';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {bootstrapDatabase,SqliteStorage,classifyDatabase,DirectoryLock} from '../../../../packages/storage-sqlite/dist/index.js';

const name=process.argv[2]??'runtime-index-first.receipt.json';assert.match(name,/^[a-z0-9-]+\.receipt\.json$/);
const index='posts_thread_created_sort_v1',receipt={scope:'Real current SQLite and actual isolated CLI startup; owned runtime index lifecycle',checks:[],cleanup:[]};
const ok=(v,label)=>assert.equal(Boolean(v),true,label);
async function isolated(label,run){const owned=await mkdtemp('/private/tmp/detuned-index-independent-');let db,app;
  try{const file=path.join(owned,'detuned.sqlite');db=new Database(file);bootstrapDatabase(db);const result=await run({owned,file,db,setApp:value=>app=value});receipt.checks.push({name:label,passed:true,details:result});}
  finally{await app?.close();if(db?.open)db.close();await rm(owned,{recursive:true,force:true});receipt.cleanup.push({name:label,app_closed:!app?.server.listening,db_closed:!db?.open,temp_absent:await stat(owned).then(()=>false,()=>true)});}
}
function migrations(db){return db.prepare('SELECT * FROM schema_migrations ORDER BY version').all();}
function indexRow(db){return db.prepare('SELECT type,tbl_name,sql FROM sqlite_master WHERE name=?').get(index);}
function rejected(fn,status,code){let error;try{fn();}catch(e){error=e;}ok(error?.statusCode===status&&error?.code===code,'Fixed startup rejection');return {http_status:error.statusCode,code:error.code};}
async function cli(owned,successful) {
  const child=spawn(process.execPath,['packages/cli/dist/index.js',...(successful?[]:['--json']),'serve','--data-dir',owned,'--host','127.0.0.1','--port','0','--no-request-logs'],{env:{PATH:process.env.PATH??'/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',started=false,readyResolve;const ready=new Promise(r=>readyResolve=r);const deadline=setTimeout(()=>child.kill('SIGKILL'),10000);
  child.stdout.on('data',bytes=>stdout+=String(bytes));child.stderr.on('data',bytes=>{stderr+=String(bytes);const m=stderr.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(m&&!started){started=true;readyResolve(`http://127.0.0.1:${m[1]}`);}});
  const exited=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',(code,signal)=>{clearTimeout(deadline);resolve({code,signal});});});
  if(successful){const address=await Promise.race([ready,exited.then(()=>{throw new Error('CLI exited before private listen');})]);const r=await fetch(address+'/api/v1/capabilities',{signal:AbortSignal.timeout(5000)});ok(r.status===200,'Actual startup private HTTP');child.kill('SIGTERM');}
  const result=await exited;ok(result.code===(successful?0:5)&&result.signal===null,'Actual bounded CLI exit');
  ok((await stat(path.join(owned,'detuned.lock')).then(()=>true,()=>false))===false,'CLI directory lock released');
  const lock=new DirectoryLock(owned);lock.acquire();lock.releaseStrict();
  return {exit_code:result.code,signal:result.signal,listened:started,stdout_bytes:Buffer.byteLength(stdout),stderr_bytes:Buffer.byteLength(stderr),lock_absent:true,actual_lock_reacquired:true,...(!successful?{safe_error_code:JSON.parse(stdout).error.code}:{private_capabilities_http:200})};
}
try {
  await isolated('old current DB prepares once after quota, extra index remains accepted and CLI exits cleanly',async f=>{
    const before=migrations(f.db),beforeTables=f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();ok(!indexRow(f.db),'Bootstrap did not create runtime-only index');
    const app=buildApp({storage:new SqliteStorage(f.db)});f.setApp(app);ok(indexRow(f.db)?.type==='index','Runtime index exists');assert.deepEqual(migrations(f.db),before);assert.deepEqual(f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all(),beforeTables);ok(classifyDatabase(f.db).kind==='current_initialized','Old classifier accepts added runtime index');
    await app.close();f.db.close();const result=await cli(f.owned,true);const reopened=new Database(f.file);try{assert.deepEqual(migrations(reopened),before);ok(classifyDatabase(reopened).kind==='current_initialized'&&indexRow(reopened)?.type==='index','Persistent old-current compatible reopen');}finally{reopened.close();}
    return {migration_records_unchanged:true,tables_unchanged:true,old_current_reopen:true,cli:result};
  });
  await isolated('reserved wrong definition is not repaired, actual CLI failure releases resources',async f=>{
    f.db.exec(`CREATE INDEX ${index} ON posts(id)`);const original=indexRow(f.db),before=migrations(f.db);
    const error=rejected(()=>buildApp({storage:new SqliteStorage(f.db)}),503,'TEMPORARILY_UNAVAILABLE');assert.deepEqual(indexRow(f.db),original);assert.deepEqual(migrations(f.db),before);
    f.db.close();const result=await cli(f.owned,false);ok(!result.listened,'Rejected before listen');const reopened=new Database(f.file);try{assert.deepEqual(indexRow(reopened),original);assert.deepEqual(migrations(reopened),before);}finally{reopened.close();}
    return {...error,definition_preserved:true,cli:result};
  });
  await isolated('real page quota FULL rolls runtime index transaction back',async f=>{
    const admin=f.db.prepare("SELECT id FROM actors WHERE kind='human' LIMIT 1").get().id;
    f.db.prepare("INSERT INTO spaces(id,slug,current_revision,policy_revision,created_at) VALUES('private-quota-space','quota',1,1,?)").run('2026-01-01T00:00:00.000Z');
    f.db.prepare("INSERT INTO threads(id,space_id,title,version,state,creator_id,created_at,updated_at) VALUES('private-quota-thread','private-quota-space','quota',1,'open',?,?,?)").run(admin,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
    const insert=f.db.prepare("INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) VALUES(?,'private-quota-space','private-quota-thread',?,'note',1,'active','2026-01-01T00:00:00.000Z')");let posts=0;
    while(f.db.pragma('page_count',{simple:true})<220&&posts<10000)f.db.transaction(()=>{for(let i=0;i<50;i++)insert.run('private-quota-'+String(posts++).padStart(6,'0')+'x'.repeat(160),admin);})();
    const pages=f.db.pragma('page_count',{simple:true});ok(pages<256,'Owned seed fits 1MiB before runtime index');const before=migrations(f.db),count=f.db.prepare('SELECT count(*) n FROM posts').get().n;
    const error=rejected(()=>buildApp({storage:new SqliteStorage(f.db),resourceLimits:{database_max_bytes:1048576}}),507,'QUOTA_EXCEEDED');
    ok(!f.db.inTransaction&&!indexRow(f.db),'No partial index or driver transaction');ok(f.db.prepare('SELECT count(*) n FROM posts').get().n===count,'Rows retained on FULL');assert.deepEqual(migrations(f.db),before);
    ok(f.db.pragma('max_page_count',{simple:true})===256,'Quota applied before index work');
    return {...error,seed_metadata_posts:posts,page_count_before:pages,max_page_count:256,rollback_no_partial_index:true,driver_transaction_closed:true};
  });
  await isolated('readonly/current bootstrap sources never opportunistically prepare index',async f=>{
    const before=migrations(f.db);ok(!indexRow(f.db),'Fresh bootstrap excludes runtime-only index');f.db.close();const ro=new Database(f.file,{readonly:true});try{rejected(()=>new SqliteStorage(ro).prepareRuntimeReadIndexes(),503,'TEMPORARILY_UNAVAILABLE');ok(!indexRow(ro),'Readonly did not add index');assert.deepEqual(migrations(ro),before);}finally{ro.close();}return {bootstrap_no_index:true,readonly_rejected:true,migrations_unchanged:true};
  });
}catch(error){receipt.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{await writeFile(new URL(name,import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
