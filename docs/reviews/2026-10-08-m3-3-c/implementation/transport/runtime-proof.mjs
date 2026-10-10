import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import Database from 'better-sqlite3';
const started=performance.now();
execFileSync(process.execPath,['tests/fixtures/runtime-fa1b35c/generator.mjs'],{stdio:'inherit',timeout:10000});
const legacy=await import('../../../../../tests/fixtures/runtime-fa1b35c/runtime.mjs');
const root=await mkdtemp(path.join(tmpdir(),'detuned-schema1-proof-'));let db,app;
try{
 db=new Database(path.join(root,'legacy.sqlite'));const boot=legacy.bootstrapDatabase(db);
 const versions=db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(r=>r.version);if(JSON.stringify(versions)!=='[1]')throw new Error('Expected genuine schema1');
 const secret=randomBytes(32).toString('hex');app=legacy.buildLegacyApp({storage:new legacy.SqliteStorage(db),tokenSecret:secret});let url=await app.listen({host:'127.0.0.1',port:0});
 const call=async(method,route,body,key)=>{const headers={authorization:`Bearer ${boot.adminToken}`};if(body){headers['content-type']='application/json';headers['idempotency-key']=key;}const response=await fetch(url+'/api/v1'+route,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(3000)});if(!response.ok)throw new Error(`Legacy HTTP ${method} returned ${response.status}`);return response.json();};
 const identity=await call('POST','/admin/actors',{kind:'agent',display_name:'Isolated fixture identity'});
 const sid=(await call('POST','/spaces',{slug:'schema1-proof',objective:'research',rules:[]},'space')).data.space.id;
 const tid=(await call('POST',`/spaces/${sid}/threads`,{title:'thread'},'thread')).data.thread.id;
 const changed=await call('PATCH',`/spaces/${sid}/threads/${tid}`,{expected_version:1,title:'thread version two'},'thread-patch');
 if(changed.data.version!==2)throw new Error('Expected historical thread version2');
 const pid=(await call('POST',`/spaces/${sid}/threads/${tid}/posts`,{kind:'note',title:'note',summary:'summary',body:'legacy body 中文'},'post')).data.post.id;
 await call('POST',`/spaces/${sid}/posts/${pid}/revisions`,{expected_revision:1,title:'note revision',summary:'summary',body:'legacy revision 中文'},'revision');
 const first=await call('GET',`/spaces/${sid}/posts/${pid}?revision=2`);await app.close();app=undefined;db.close();db=undefined;
 db=new Database(path.join(root,'legacy.sqlite'));app=legacy.buildLegacyApp({storage:new legacy.SqliteStorage(db),tokenSecret:randomBytes(32).toString('hex')});url=await app.listen({host:'127.0.0.1',port:0});
 const reopenedThread=await call('GET',`/spaces/${sid}/threads/${tid}`);if(reopenedThread.data.thread.version!==2)throw new Error('Reopened historical thread version differs');
 const noThreadHistory=!db.prepare("SELECT 1 FROM sqlite_master WHERE name='thread_versions'").get();if(!noThreadHistory)throw new Error('Expected original schema1 without thread history');
 const reopened=await call('GET',`/spaces/${sid}/posts/${pid}?revision=2`);if(reopened.data.revision.body!=='legacy revision 中文'||first.data.revision.body!==reopened.data.revision.body)throw new Error('Legacy reopened body differs');
 console.log(JSON.stringify({schema_versions:versions,thread_version:2,thread_versions_table:false,http_identity_created:!!identity.data.id,http_space_thread_post_revision:true,reopened_revision:reopened.data.revision.revision,body_sha256:createHash('sha256').update(reopened.data.revision.body).digest('hex'),elapsed_ms:performance.now()-started,secret_injected:true,credentials_archived:false}));
}finally{await app?.close();db?.close();await rm(root,{recursive:true,force:true});}
