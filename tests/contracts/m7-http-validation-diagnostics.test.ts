import {beforeEach,afterEach,expect,it} from 'vitest';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
let db:Database.Database,app:ReturnType<typeof buildApp>,token:string,space:string,thread:string;
const headers=()=>({authorization:`Bearer ${token}`,'idempotency-key':'invalid'});
beforeEach(async()=>{db=new Database(':memory:');token=bootstrapDatabase(db).adminToken!;app=buildApp({storage:new SqliteStorage(db)});const s=await app.inject({method:'POST',url:'/api/v1/spaces',headers:headers(),payload:{slug:'diagnostics',objective:'test',rules:[]}});expect(s.statusCode).toBe(201);space=s.json().data.space.id;const t=await app.inject({method:'POST',url:`/api/v1/spaces/${space}/threads`,headers:headers(),payload:{title:'thread'}});expect(t.statusCode).toBe(201);thread=t.json().data.thread.id;});
afterEach(async()=>{await app.close();db.close();});
const counts=()=>['posts','post_revisions','relations','events','idempotency_records'].map(table=>db.prepare(`SELECT count(*) n FROM ${table}`).get());
async function rejected(payload:object){const before=counts();const response=await app.inject({method:'POST',url:`/api/v1/spaces/${space}/threads/${thread}/posts`,headers:headers(),payload});expect(response.statusCode).toBe(400);expect(response.json().error.code).toBe('VALIDATION_ERROR');expect(counts()).toEqual(before);return response.json().error;}
it('M7.12 HTTP top-level missing fields expose bounded canonical paths/rules',async()=>{
 const error=await rejected({kind:'note',summary:'s',body:'b'});expect(error.details.issues).toContainEqual({path:'/title',rule:'required'});expect(error.message).toContain('/title');expect(error.details.issues.length).toBeLessThanOrEqual(8);
});
it('M7.12 HTTP typed missing fields retain the existing safe structured diagnostics',async()=>{
 const error=await rejected({kind:'failure',title:'failure',summary:'s',body:'b',structured:{category:'counterexample',assumptions:[],tested_scope:'scope',expected:'e',observed:'o',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'no log',ruled_out:'run',not_ruled_out:[],retry_when:[]}});expect(error.details.issues).toContainEqual({path:'/structured/attempt',rule:'required'});expect(error.message).toContain('/structured/attempt');
});
it('M7.12 HTTP unknown fields never reflect supplied property names or values',async()=>{
 const marker='M712_PRIVATE_UNKNOWN_PROPERTY';const error=await rejected({kind:'note',title:'note',summary:'s',body:'b',[marker]:'M712_PRIVATE_VALUE'});expect(error.details.issues).toContainEqual({path:'',rule:'additionalProperties'});expect(error.details.issues.length).toBeLessThanOrEqual(8);expect(JSON.stringify(error)).not.toContain(marker);expect(JSON.stringify(error)).not.toContain('M712_PRIVATE_VALUE');expect(error.message.length).toBeLessThan(600);
});
