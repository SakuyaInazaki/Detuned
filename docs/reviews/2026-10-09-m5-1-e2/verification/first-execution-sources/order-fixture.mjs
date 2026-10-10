import assert from 'node:assert/strict';
import {mkdtemp,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {bootstrapDatabase,SqliteStorage} from '../../../../packages/storage-sqlite/dist/index.js';
import {HmacTokenSigner} from '../../../../packages/core/dist/index.js';

// Dedicated owned fixture for the two E2 HTTP probes. No ambient account/profile/config.
export async function orderFixture() {
  const owned=await mkdtemp('/private/tmp/detuned-order-independent-');
  let db,app;
  const clock={value:Date.parse('2026-11-01T00:00:00.000Z'),now(){return new Date(this.value);},nowIso(){return this.now().toISOString();}};
  const events=[];let base,key=0,admin;
  async function request(route,token,query={},method='GET',body) {
    const url=new URL('/api/v1'+route,base);
    for(const [name,value] of Object.entries(query))if(value!==undefined)url.searchParams.set(name,String(value));
    const response=await fetch(url,{method,headers:{authorization:`Bearer ${token}`,...(method==='GET'?{}:{'idempotency-key':`e2-private-${++key}`}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
    const wire=await response.text();return {status:response.status,wire,bytes:Buffer.byteLength(wire),json:JSON.parse(wire)};
  }
  async function seed(route,body,method='POST',token=admin) {
    clock.value+=60000;const r=await request(route,token,{},method,body);
    assert.equal(r.status<300,true,`Private legal HTTP seed rejected: ${r.status}`);return r.json.data;
  }
  async function close() {
    if(app)await app.close();if(db?.open)db.close();await rm(owned,{recursive:true,force:true});
    return {app_closed:!app?.server.listening,db_closed:!db?.open,temp_absent:await stat(owned).then(()=>false,()=>true)};
  }
  try {
    db=new Database(path.join(owned,'forum.sqlite'));admin=bootstrapDatabase(db).adminToken;assert.equal(typeof admin,'string');
    const storage=new SqliteStorage(db),signer=new HmacTokenSigner();
    app=buildApp({storage,clock,requestLogSink:row=>events.push(row)});
    await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();assert.equal(typeof address,'object');base=`http://127.0.0.1:${address.port}`;
    const space=(await seed('/spaces',{slug:'e2-order-private',objective:'Private order verification',rules:[]})).space.id;
    const other=(await seed('/spaces',{slug:'e2-order-other',objective:'Other private space',rules:[]})).space.id;
    const thread=(await seed(`/spaces/${space}/threads`,{title:'Independent order thread'})).thread.id;
    const secondThread=(await seed(`/spaces/${space}/threads`,{title:'Other order thread'})).thread.id;
    const members=[];
    for(let n=0;n<2;n++) {
      const actor=(await seed('/admin/actors',{kind:'human',display_name:`Private order human ${n}`})).id;
      await seed(`/spaces/${space}/memberships`,{actor_id:actor,role:n?'observer':'contributor'});
      const credential=await seed('/admin/credentials',{actor_id:actor,allowed_space_ids:[space,other],capabilities:['read','write']});
      members.push({actor,token:credential.token,credential:credential.credential_id});
    }
    const tokenFile=path.join(owned,'token');await writeFile(tokenFile,members[0].token,{mode:0o600});
    function counts(){return Object.fromEntries(['posts','post_revisions','events','idempotency_records','relations'].map(table=>[table,db.prepare(`SELECT count(*) n FROM ${table}`).get().n]));}
    return {owned,db,app,storage,signer,secret:storage.getInstanceSecret(),clock,events,base,space,other,thread,secondThread,members,tokenFile,request,seed,close,counts};
  } catch(error){await close();throw error;}
}
