// Copies only the explicitly supplied isolated seed. Never opens a user's database.
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, copyFile, writeFile, chmod } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { sha, disk } from './run-support.mjs';
const [manifestPath,newDirectory]=process.argv.slice(2);
if(!manifestPath||!newDirectory)throw new Error('run-prepare.mjs MANIFEST NEW_PRIVATE_DIRECTORY');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(manifest.clients?.length!==20||!manifest.space_id)throw new Error('Expected 20-client single-space seed');
const root=resolve(newDirectory);await mkdir(root,{recursive:false,mode:0o700});
if(await disk(root)<6*1024**3)throw new Error('disk free below 6GiB');
const source=resolve(dirname(manifestPath),manifest.database_file??'baseline.db');
const target=join(root,'runtime.db');await copyFile(source,target,constants.COPYFILE_EXCL);await chmod(target,0o600);
const db=new Database(target,{fileMustExist:true});const tokens=[];
try{
  if(db.prepare('SELECT COUNT(*) n FROM credentials').get().n!==0)throw new Error('Seed must have zero credentials');
  if(db.prepare('SELECT COUNT(*) n FROM consumers').get().n!==0)throw new Error('Seed must have zero consumers');
  const add=db.prepare('INSERT INTO credentials (id,actor_id,token_hash,allowed_space_ids,capabilities,expires_at,revoked_at,created_at) VALUES (?,?,?,?,?,NULL,NULL,?)');
  const stamp=new Date().toISOString();
  db.transaction(()=>{
    db.prepare("INSERT OR REPLACE INTO instance_metadata(key,value) VALUES ('token_secret',?)").run(randomBytes(32).toString('hex'));
    for(const [i,c] of manifest.clients.entries()){
      if(!db.prepare('SELECT id FROM sessions WHERE id=? AND actor_id=? AND space_id=?').get(c.session_id,c.actor_id,manifest.space_id))throw new Error('Session/actor mismatch');
      const token=randomBytes(32).toString('base64url');tokens.push(token);add.run(`c2-runtime-${i}`,c.actor_id,sha(token),JSON.stringify([manifest.space_id]),JSON.stringify(['read','write']),stamp);
    }
  })();
}finally{db.close();}
const runtimePath=join(root,'runtime.json');await writeFile(runtimePath,JSON.stringify({schema_version:1,db_path:target,tokens})+'\n',{mode:0o600,flag:'wx'});
await writeFile(join(root,'initialization.json'),JSON.stringify({schema_version:1,kind:'fixture_initialization_before_real_HTTP',seed_manifest:resolve(manifestPath),seed_database:source,runtime_database:target,actors:manifest.clients.map(c=>c.actor_id),credentials:20,capabilities:['read','write'],admin_credentials:0,consumers:0,created_at:new Date().toISOString()},null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({runtime_file:runtimePath,runtime_database:target,ordinary_credentials:20,consumer_count:0}));
