import assert from 'node:assert/strict';
import Database from '../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../packages/storage-sqlite/dist/index.js';
export async function fixture({file=':memory:'}={}){
 const db=new Database(file),storage=new SqliteStorage(db),token=bootstrapDatabase(db).adminToken;
 let now='2030-01-01T00:00:00.000Z',rid='焦点"\\🙂',serial=0;const secret='independent-focus-fixture',clock={now:()=>new Date(now),nowIso:()=>now};
 const app=buildApp({storage,clock,tokenSecret:secret,idGen:{generateId:prefix=>`${prefix}_fc_${String(++serial).padStart(5,'0')}`}});app.addHook('onRequest',async req=>{req.id=rid;});
 const call=async(method,url,payload,status=200,t=token)=>{const r=await app.inject({method,url,headers:{authorization:`Bearer ${t}`,'idempotency-key':`fc-${++serial}`},...payload===undefined?{}:{payload}});assert.equal(r.statusCode,status,`${method} ${url}: ${r.body}`);return r;};
 const sid=(await call('POST','/api/v1/spaces',{slug:'focus-independent',objective:'目标"\\🙂',rules:['规则🙂']},201)).json().data.space.id;
 const foreign=(await call('POST','/api/v1/spaces',{slug:'focus-foreign',objective:'foreign',rules:[]},201)).json().data.space.id;
 const thread=async(space,title)=>(await call('POST',`/api/v1/spaces/${space}/threads`,{title},201)).json().data.thread.id;
 const tid=await thread(sid,'focus'),other=await thread(sid,'other'),foreignThread=await thread(foreign,'foreign');
 const post=async(thread,kind='note',structured,space=sid)=>(await call('POST',`/api/v1/spaces/${space}/threads/${thread}/posts`,{kind,title:`材料 ${serial}`,summary:'summary',body:'body🙂',...structured?{structured}:{}},201)).json().data.post;
 const ref=p=>({post_id:p.id,revision:1});const relation=async(source,target)=>(await call('POST',`/api/v1/spaces/${sid}/relations`,{type:'challenges',source_ref:ref(source),target_ref:ref(target)},201)).json().data;
 const context=async(focus=tid,max=65536,status=200)=>call('GET',`/api/v1/spaces/${sid}/context?${new URLSearchParams({...focus===undefined?{}:{focus_thread_id:focus},max_bytes:String(max)})}`,undefined,status);
 const fingerprint=()=>db.serialize().toString('base64');const close=async()=>{await app.close();if(db.open)db.close();};
 return{db,storage,token,secret,clock,app,sid,foreign,tid,other,foreignThread,post,ref,relation,call,context,fingerprint,close,setTime:v=>{now=v},setRequestId:v=>{rid=v}};
}
