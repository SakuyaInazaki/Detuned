// Independent fixture support. Dormant until parent freeze/build; synthetic stored history is explicit.
import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
export async function fixture({file=':memory:',clock,secret='independent-post-content',requestId}={}){
 const db=new Database(file),storage=new SqliteStorage(db),token=bootstrapDatabase(db).adminToken;
 const app=buildApp({storage,...clock?{clock}:{},tokenSecret:secret});let n=0;
 if(requestId)app.addHook('onRequest',async req=>{req.id=requestId();});
 const call=async(method,url,payload,status=200,t=token)=>{const r=await app.inject({method,url,headers:{authorization:`Bearer ${t}`,'idempotency-key':`independent-pr-${++n}`},...payload===undefined?{}:{payload}});assert.equal(r.statusCode,status,r.body);return r;};
 const sid=(await call('POST','/api/v1/spaces',{slug:'post-fixture',objective:'rules',rules:[]},201)).json().data.space.id;
 const tid=(await call('POST',`/api/v1/spaces/${sid}/threads`,{title:'thread'},201)).json().data.thread.id;
 const pid=(await call('POST',`/api/v1/spaces/${sid}/threads/${tid}/posts`,{kind:'note',title:'old title',summary:'s',body:'b'},201)).json().data.post.id;
 const route=`/api/v1/spaces/${sid}/posts/${pid}/revisions/1`;
 const document=()=>{const r=storage.getPostRevision(pid,1);return {title:r.title,summary:r.summary,body:r.body,tags:r.tags,structured:r.structured};};
 const store=doc=>db.prepare('UPDATE post_revisions SET title=?,summary=?,body=?,tags=?,structured=? WHERE post_id=? AND revision=1').run(doc.title,doc.summary,doc.body,JSON.stringify(doc.tags),JSON.stringify(doc.structured),pid);
 const fingerprint=()=>db.serialize().toString('base64');
 const close=async()=>{await app.close();if(db.open)db.close();};
 return {db,storage,token,app,sid,tid,pid,route,call,document,store,fingerprint,close};
}
