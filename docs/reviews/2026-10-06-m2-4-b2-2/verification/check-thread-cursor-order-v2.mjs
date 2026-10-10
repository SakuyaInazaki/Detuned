// Independent v2 transport/service ordering probe; not developer D08 assertions.
import assert from 'node:assert/strict';
import {fixture} from './thread-fixture.mjs';
import {CryptoHasher} from '../../../../packages/core/dist/index.js';
const f=await fixture({count:2}),results=[];
try{
 const now=new Date().toISOString();
 function reader(id,capabilities,active){const actor={id,kind:'human',display_name:id,created_at:now,disabled_at:null};f.storage.createActor(actor);const token=`independent-${id}`;f.storage.createCredential({id:`cred_${id}`,actor_id:id,token_hash:new CryptoHasher().sha256(token),allowed_space_ids:[f.sid],capabilities,created_at:now,expires_at:null,revoked_at:null});f.storage.upsertMembership({space_id:f.sid,actor_id:id,role:'observer',active,reviewer_eligible:false,independence_group:null});return token;}
 const nonmember=reader('act_tp_nonmember',['read'],false),noRead=reader('act_tp_noread',[],true);
 const other=(await f.call('POST','/api/v1/spaces',{slug:'cursor-other',objective:'other',rules:[]},201)).json().data.space.id;
 const cases=[['nonmember',f.route,nonmember,404],['no-read-capability',f.route,noRead,403],['cross-space',`/api/v1/spaces/${other}/threads/${f.tid}/posts`,f.token,404],['missing-thread',`/api/v1/spaces/${f.sid}/threads/thr_missing_independent/posts`,f.token,404],['authorized-target',f.route,f.token,400]];
 const checkpoint=f.fingerprint();
 for(const cursor of ['', ' ', 'x'.repeat(4097)])for(const [name,route,token,status] of cases){const r=await f.call('GET',`${route}?${new URLSearchParams({cursor})}`,undefined,status,token);if(name==='authorized-target')assert.equal(r.json().error.message,'Invalid or expired thread posts cursor. Remove cursor and retry the first page.');results.push({case:name,cursor_length:cursor.length,status:r.statusCode});}
 for(const suffix of ['cursor=a&cursor=b','cursor=&unknown=1']){await f.call('GET',`${f.route}?${suffix}`,undefined,400,nonmember);results.push({case:'transport-query-rejection',query:suffix,status:400});}
 assert.equal(f.fingerprint(),checkpoint);console.log(JSON.stringify({passes:true,product_version:'v2',results,no_read_writes:true},null,2));
}catch(e){console.log(JSON.stringify({passes:false,results,error:{message:e.message,stack:e.stack}},null,2));process.exitCode=1;}finally{await f.close();}
