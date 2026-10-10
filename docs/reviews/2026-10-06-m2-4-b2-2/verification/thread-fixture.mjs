// Independent synthetic metadata fixture, not captured historical HTTP success. Dormant before freeze.
import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
export async function fixture({file=':memory:',clock,secret='independent-thread-directory',requestId,count=90}={}){
 const db=new Database(file),storage=new SqliteStorage(db),token=bootstrapDatabase(db).adminToken,app=buildApp({storage,...clock?{clock}:{},tokenSecret:secret});let n=0;if(requestId)app.addHook('onRequest',async req=>{req.id=requestId();});
 const call=async(method,url,payload,status=200,t=token)=>{const r=await app.inject({method,url,headers:{authorization:`Bearer ${t}`,'idempotency-key':`independent-tp-${++n}`},...payload===undefined?{}:{payload}});assert.equal(r.statusCode,status,r.body);return r;};
 const sid=(await call('POST','/api/v1/spaces',{slug:'thread-fixture',objective:'rules',rules:[]},201)).json().data.space.id;
 const tid=(await call('POST',`/api/v1/spaces/${sid}/threads`,{title:'thread "\\中🙂'},201)).json().data.thread.id;
 const pid=(await call('POST',`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'note',title:'fixed title',summary:'s',body:'正文🙂"\\\n'.repeat(1000)},201)).json().data.post.id;
 for(let i=1;i<=count;i++){const id=`pst_tp_${String(i).padStart(3,'0')}`;db.prepare('INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) SELECT ?,space_id,thread_id,author_id,kind,current_revision,?,created_at FROM posts WHERE id=?').run(id,i%3===0?'redacted':i%3===1?'active':'withdrawn',pid);db.prepare('INSERT INTO post_revisions(post_id,revision,title,summary,body,tags,structured,content_hash,editor_id,created_at) SELECT ?,revision,title,summary,body,tags,structured,content_hash,editor_id,created_at FROM post_revisions WHERE post_id=?').run(id,pid);}
 const route=`/api/v1/spaces/${sid}/threads/${tid}/posts`,fingerprint=()=>db.serialize().toString('base64');const ids=after=>db.prepare('SELECT id FROM posts WHERE thread_id=? AND id>? ORDER BY id ASC').all(tid,after??'').map(r=>r.id);
 const close=async()=>{await app.close();if(db.open)db.close();};return{db,storage,token,app,sid,tid,pid,route,call,fingerprint,ids,close};
}
