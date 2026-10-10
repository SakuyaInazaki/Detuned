import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import Database from '../../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import {buildApp} from '../../../../../packages/server/dist/index.js';
import {SqliteStorage,bootstrapDatabase} from '../../../../../packages/storage-sqlite/dist/index.js';
const db=new Database(':memory:');const boot=bootstrapDatabase(db);const storage=new SqliteStorage(db),app=buildApp({storage});const headers={authorization:`Bearer ${boot.adminToken}`};
async function create(url,payload,key){const r=await app.inject({method:'POST',url,payload,headers:{...headers,'idempotency-key':key}});assert.equal(r.statusCode,201);return r.json().data;}
try{const sid=(await create('/api/v1/spaces',{slug:'focus-before',objective:'o',rules:[]},'space')).space.id;const tid=(await create(`/api/v1/spaces/${sid}/threads`,{title:'valid own thread'},'thread')).thread.id;
const ordinary=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/context`,headers});assert.equal(ordinary.statusCode,200);assert(!('focus_thread' in ordinary.json().data));
const focused=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/context?focus_thread_id=${tid}`,headers});assert.equal(focused.statusCode,400);assert.equal(focused.json().error.code,'VALIDATION_ERROR');assert(storage.findThreadById(tid)?.space_id===sid);
const result={stage:'before',source:'accepted B2.2 dist; actual HTTP inject; isolated memory SQLite',own_thread_exists:true,ordinary_status:ordinary.statusCode,ordinary_has_focus_field:false,focused_status:focused.statusCode,focused_error:focused.json().error,credentials_persisted:false};await writeFile(new URL('before.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await app.close();db.close();}
