// Test-only read observation immediately before the author's private cleanup.
// No writes to the forum database; do not load this in a product process.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
const require=createRequire('/app/packages/storage-sqlite/package.json');
const Database=require('better-sqlite3'),remove=fs.rm;
let observed=false;
fs.rm=async function(target,options){
 if(observed||typeof target!=='string'||!path.basename(target).startsWith('detuned-d01-recovery-'))return remove(target,options);
 observed=true;let failure;
 try{
  const results=[];
  for(const folder of ['instance','restored']){
   const db=new Database(path.join(target,folder,'detuned.sqlite'),{readonly:true});
   try{
    const counts=db.transaction(()=>({
     posts:db.prepare("SELECT count(*) n FROM posts WHERE title='smoke race' OR title GLOB 'smoke [0-9]*'").get().n,
     revisions:db.prepare("SELECT count(*) n FROM post_revisions r JOIN posts p ON p.id=r.post_id WHERE p.title='smoke race' OR p.title GLOB 'smoke [0-9]*'").get().n,
     events:db.prepare("SELECT count(*) n FROM events e JOIN posts p ON p.id=e.object_id WHERE e.type='post.created' AND (p.title='smoke race' OR p.title GLOB 'smoke [0-9]*')").get().n,
     idem:db.prepare("SELECT count(*) n FROM idempotency_records WHERE operation LIKE 'post.create%' AND key GLOB 'd01-smoke-*'").get().n,
     same_key_posts:db.prepare("SELECT count(*) n FROM posts WHERE title='smoke race'").get().n,
     same_key_idem:db.prepare("SELECT count(*) n FROM idempotency_records WHERE operation LIKE 'post.create%' AND key='d01-smoke-race'").get().n,
     unique_titles:db.prepare("SELECT count(DISTINCT title) n FROM posts WHERE title GLOB 'smoke [0-9]*'").get().n
    }))();
    results.push({directory:folder,counts});
    assert.deepEqual(counts,{posts:21,revisions:21,events:21,idem:21,same_key_posts:1,same_key_idem:1,unique_titles:20});
   }finally{db.close();}
  }
  await fs.writeFile('/tmp/d01-independent-smoke-oracle.json',JSON.stringify({status:'passed',readonly:true,source_and_restored:results})+'\n');
 }catch(e){failure=e;await fs.writeFile('/tmp/d01-independent-smoke-oracle.json',JSON.stringify({status:'failed',name:e?.name})+'\n');}
 finally{await remove(target,options);}
 if(failure)throw failure;
};
syncBuiltinESMExports();
