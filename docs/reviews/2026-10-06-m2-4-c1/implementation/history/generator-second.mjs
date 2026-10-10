// Produce real old HTTP history from a precise committed runtime, never current @detuned code.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, realpath, symlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root=fileURLToPath(new URL('../../',import.meta.url));
const destination=path.resolve(process.argv[2] ?? path.join(root,'tests/fixtures/history-b8dacd5'));
const recipePath=path.join(destination,'recipe.json');
const recipe=JSON.parse(await readFile(recipePath,'utf8'));
const commit='b8dacd56779a007a2e7045b682bca0c036fdfc44';assert.equal(recipe.source_commit,commit);
// Refuse accidental destructive regeneration: caller chooses a fresh output directory and copies recipe.
for(const file of ['legacy.db','expected.json','provenance.json'])assert(!existsSync(path.join(destination,file)),`Output already exists: ${file}`);
const git=(...args)=>execFileSync('git',args,{cwd:root});
assert.equal(git('rev-parse',`${commit}^{commit}`).toString().trim(),commit);
const work=await mkdtemp(path.join(tmpdir(),'detuned-hr1-generate-'));
const oldRoot=path.join(work,'old');const packages=['core','protocol','storage-sqlite','server'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const exported={},internalResolutions=[],externalDependencies=[];let db,app;
try{
 const paths=git('ls-tree','-r','--name-only',commit,'packages').toString().trim().split('\n').filter(p=>packages.some(name=>p===`packages/${name}/package.json`||p.startsWith(`packages/${name}/dist/`)));
 for(const p of paths){const bytes=git('show',`${commit}:${p}`),file=path.join(oldRoot,p);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);exported[p]=hash(bytes);assert.equal(hash(await readFile(file)),exported[p]);}
 for(const name of packages){
  const base=path.join(oldRoot,'packages',name),manifest=JSON.parse(await readFile(path.join(base,'package.json'),'utf8'));
  for(const dependency of Object.keys(manifest.dependencies??{})){
   const link=path.join(base,'node_modules',dependency);await mkdir(path.dirname(link),{recursive:true});
   if(dependency.startsWith('@detuned/')){const sibling=dependency.slice('@detuned/'.length);assert(packages.includes(sibling),`Unapproved internal dependency ${dependency}`);await symlink(path.join(oldRoot,'packages',sibling),link,'dir');}
   else{const target=await realpath(path.join(root,'packages',name,'node_modules',dependency));await symlink(target,link,'dir');const m=JSON.parse(await readFile(path.join(target,'package.json'),'utf8'));externalDependencies.push({consumer:name,name:dependency,version:m.version,diagnostic_installed_realpath:target});}
  }
 }
 for(const name of packages){const base=path.join(oldRoot,'packages',name);const manifest=JSON.parse(await readFile(path.join(base,'package.json'),'utf8'));
  for(const dependency of Object.keys(manifest.dependencies??{}).filter(x=>x.startsWith('@detuned/'))){const resolved=fileURLToPath(execFileSync(process.execPath,['--input-type=module','--eval',`console.log(import.meta.resolve(${JSON.stringify(dependency)}))`],{cwd:base}).toString().trim());const actual=await realpath(resolved);assert(actual.startsWith(oldRoot+path.sep));const relative=path.relative(oldRoot,actual);assert.equal(hash(await readFile(actual)),exported[relative]);internalResolutions.push({consumer:name,name:dependency,resolved_relative_to_export:relative,sha256:exported[relative]});}
 }
 // Verify the complete isolated committed runtime again before importing any application code.
 for(const [relative,sha]of Object.entries(exported))assert.equal(hash(await readFile(path.join(oldRoot,relative))),sha);
 const storageRequire=createRequire(path.join(oldRoot,'packages/storage-sqlite/package.json'));
 const [{default:Database},{buildApp},{SqliteStorage,bootstrapDatabase}]=await Promise.all([import(pathToFileURL(storageRequire.resolve('better-sqlite3'))),import(pathToFileURL(path.join(oldRoot,'packages/server/dist/index.js'))),import(pathToFileURL(path.join(oldRoot,'packages/storage-sqlite/dist/index.js')))]);
 db=new Database(path.join(work,'old-runtime.db'));const boot=bootstrapDatabase(db);const token=boot.adminToken;assert.equal(typeof token,'string');
 const oldSecret=db.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get().value;
 let id=0;const clock={now:()=>new Date(recipe.clock),nowIso:()=>recipe.clock};
 app=buildApp({storage:new SqliteStorage(db),clock,idGen:{generate:prefix=>`${prefix}_hr1_${String(++id).padStart(4,'0')}`}});
 const http=async(url,payload,key)=>{const r=await app.inject({method:'POST',url,headers:{authorization:`Bearer ${token}`,'idempotency-key':key},payload});assert.equal(r.statusCode,201,`Old HTTP ${key}: status ${r.statusCode}; code ${r.json().error?.code}`);return r.json().data;};
 const space=await http('/api/v1/spaces',recipe.space_payload,'hr1-space-create');const sid=space.space.id;const cases=[];let tid,pid;
 for(const c of recipe.cases){const url=c.entry==='initial'?`/api/v1/spaces/${sid}/threads`:c.entry==='newpost'?`/api/v1/spaces/${sid}/threads/${tid}/posts`:`/api/v1/spaces/${sid}/posts/${pid}/revisions`;
  const data=await http(url,c.payload,c.key);if(c.entry==='initial')tid=data.thread.id;else if(c.entry==='newpost')pid=data.post.id;
  const record=db.prepare('SELECT * FROM idempotency_records WHERE key=?').get(c.key);assert(record);cases.push({...c,url,response_data:data,idempotency_record:record});
 }
 const tables=['actors','memberships','spaces','space_revisions','threads','thread_versions','posts','post_revisions','revision_artifacts','relations','events','idempotency_records'];
 const snapshot=()=>Object.fromEntries(tables.map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));const business=snapshot();
 await app.close();app=undefined;db.pragma('wal_checkpoint(TRUNCATE)');
 db.transaction(()=>{db.prepare('DELETE FROM credentials').run();db.prepare("DELETE FROM instance_metadata WHERE key='token_secret'").run();})();
 assert.deepEqual(snapshot(),business);db.pragma('wal_checkpoint(TRUNCATE)');
 const archive=path.join(destination,'legacy.db');await mkdir(destination,{recursive:true});db.prepare('VACUUM INTO ?').run(archive);db.close();db=undefined;
 const archiveBytes=await readFile(archive);assert(!archiveBytes.includes(Buffer.from(token)));assert(!archiveBytes.includes(Buffer.from(oldSecret)));assert(!archiveBytes.includes(Buffer.from(hash(Buffer.from(token)))));
 const archived=new Database(archive,{readonly:true});try{assert.equal(archived.prepare('SELECT count(*) AS n FROM credentials').get().n,0);assert.equal(archived.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get(),undefined);}finally{archived.close();}
 const expected={actor_id:boot.adminActorId,space_id:sid,generated_clock:recipe.clock,cases,final_post_heads:Object.fromEntries(business.posts.map(p=>[p.id,p.current_revision])),business_snapshot:business};
 const expectedBytes=Buffer.from(JSON.stringify(expected,null,2)+'\n');assert(!expectedBytes.includes(Buffer.from(token)));assert(!expectedBytes.includes(Buffer.from(oldSecret)));await writeFile(path.join(destination,'expected.json'),expectedBytes);
 const original=JSON.parse(await readFile(path.join(root,'docs/reviews/2026-10-03-m2-2-a/verification/historical-fixture.json'),'utf8'));const committed=new Set(git('ls-tree','-r','--name-only',commit).toString().trim().split('\n'));const comparison={matching:0,different:0,missing:0};for(const [relative,sha]of Object.entries(original.verified_dist_hashes)){if(!committed.has(relative))comparison.missing++;else comparison[hash(git('show',`${commit}:${relative}`))===sha?'matching':'different']++;}
 const provenance={source_commit:commit,generated_at:new Date().toISOString(),source_kind:'new real HTTP success from isolated committed b8dacd5 dist; not recovered original M2.1 DB',actual_http_statuses:[201,201,201],source_file_sha256:exported,internal_package_resolution_checks:internalResolutions,external_dependencies:externalDependencies,original_232_dist_comparison:comparison,sanitization:{removed_all_credentials:true,removed_token_secret:true,vacuum_into_new_archive:true,known_secret_byte_and_token_hash_scan_passed:true,business_rows_unchanged:true},fixture_sha256:{'legacy.db':hash(archiveBytes),'expected.json':hash(expectedBytes),'recipe.json':hash(await readFile(recipePath))},rebuild_requires:'fixed Git objects and already installed external dependencies; no old temporary DB/tree/token required',owned_generation_temporary_tree_removed:true};
 const provenanceBytes=Buffer.from(JSON.stringify(provenance,null,2)+'\n');assert(!provenanceBytes.includes(Buffer.from(token)));assert(!provenanceBytes.includes(Buffer.from(oldSecret)));await writeFile(path.join(destination,'provenance.json'),provenanceBytes);
 for(const [relative,sha]of Object.entries(exported))assert.equal(hash(await readFile(path.join(oldRoot,relative))),sha);
 console.log(JSON.stringify({passes:true,source_commit:commit,actual_http_statuses:provenance.actual_http_statuses,cases:cases.map(c=>({entry:c.entry,request_hash:c.idempotency_record.request_hash,result_ref:c.idempotency_record.result_ref})),isolated_internal_resolution_checks:internalResolutions.length,exported_file_count:Object.keys(exported).length,original_232_dist_comparison:comparison,sanitized_archive_sha256:provenance.fixture_sha256['legacy.db'],temporary_generation_tree_removed:true},null,2));
}finally{if(app)await app.close();if(db?.open)db.close();await rm(work,{recursive:true,force:true});}
