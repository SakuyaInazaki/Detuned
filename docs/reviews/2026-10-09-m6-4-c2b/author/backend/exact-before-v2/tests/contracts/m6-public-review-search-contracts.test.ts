import { beforeEach, afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { CryptoHasher } from '@detuned/core';
import { DetunedClient, ClientProtocolError } from '@detuned/client';
import { isPublicReviewSubmissionSearchPage, isReviewSubmissionSearchCursorPayload, validateSearchSourceQuery, normalizeReviewSubmissionSearchQuery, compareReviewSubmissionIds, generateOpenApiSpec, type PublicReviewSubmissionSearchPage, type ReviewRequestView } from '@detuned/protocol';
let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>, client: DetunedClient, url: string, token: string, sid: string, pid: string, tick: number;
const clock = { now: () => new Date(tick), nowIso: () => new Date(tick).toISOString() };
const path = (suffix = '') => `/spaces/${sid}${suffix}`;
async function write(method: 'POST'|'PATCH', suffix: string, payload: object, key?: string, bearer = token) {
  tick += 1000;
  const response = await fetch(`${url}/api/v1${suffix}`, { method, headers: { authorization:`Bearer ${bearer}`, 'content-type':'application/json', ...(key?{'idempotency-key':key}:{}) }, body: JSON.stringify(payload) });
  expect(response.status,await response.clone().text()).toBe(method==='POST'?201:200); return (await response.json()).data;
}
beforeEach(async () => {
  tick = Date.parse('2026-10-09T00:00:00Z'); db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db); app = buildApp({storage,clock}); await app.listen({host:'127.0.0.1',port:0});
  const addr = app.server.address(); if (!addr || typeof addr === 'string') throw new Error('owned listener missing'); url=`http://127.0.0.1:${addr.port}`; client=new DetunedClient({baseUrl:url,token,maxRetries:0});
  sid=(await write('POST','/spaces',{slug:'public-review-contracts',objective:'o',rules:[]},'space')).space.id;
  const tid=(await write('POST',path('/threads'),{title:'t'},'thread')).thread.id;
  pid=(await write('POST',path(`/threads/${tid}/posts`),{kind:'claim',title:'Needle ordinary post',summary:'s',body:'original',structured:{statement:'claim',assumptions:[],scope:'s',falsification_plan:'f'}},'claim')).post.id;
  const rev=storage.getSpaceRevision(sid,1)!; await write('PATCH',path(),{expected_revision:1,review_policy:{...rev.review_policy,required_checks:[]}},'policy');
  const hash=new CryptoHasher(); for(const id of ['r1','r2']) {storage.createActor({id,kind:'human',display_name:id,created_at:clock.nowIso(),disabled_at:null});storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:true,independence_group:id});storage.createCredential({id:`cred-${id}`,actor_id:id,token_hash:hash.sha256(`owned-${id}`),allowed_space_ids:[sid],capabilities:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()});}
});
afterEach(async () => {vi.unstubAllGlobals();await app.close();db.close();});
async function reveal():Promise<ReviewRequestView> {
  const round:ReviewRequestView=await write('POST',path('/review-requests'),{target_ref:{post_id:pid,revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['r1','r2'],expected_policy_revision:storage.findSpaceById(sid)!.policy_revision,reproduction_instructions:'run'},'request');
  for(const id of ['r1','r2']){const session=await write('POST',path('/sessions'),{client_name:'public-contract',client_version:'1'},undefined,`owned-${id}`);await write('POST',path(`/review-requests/${round.id}/submissions`),{snapshot_sha256:round.snapshot_sha256,reviewer_session_id:session.id,completion_status:'complete',verdict:'accept',coverage:'Needle 研究 actual opinion',checks_performed:'checked',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'independent'}},`submit-${id}`,`owned-${id}`);}
  return round;
}
it('PC01 real HTTP/shared client typed strict page has genuine review identity, and old posts search return type stays', async () => {
  const round=await reveal();const query={source:'review_submissions' as const,q:'NEEDLE',request_id:round.id,target_post_id:pid,limit:1};
  const page=await client.searchPublicReviewSubmissions(sid,query); expectTypeOf(page).toEqualTypeOf<PublicReviewSubmissionSearchPage>(); expect(isPublicReviewSubmissionSearchPage(page,sid,query)).toBe(true);
  expect(page.meta.truncated).toBe(false);expect(page.meta.next_cursor).not.toBeNull();expect(page.data[0]).toMatchObject({type:'review_submission',request_id:round.id,target_ref:{post_id:pid,revision:1},space_id:sid,snapshot_id:round.snapshot_id,round:1,snippet:'Needle 研究 actual opinion'});
  const next=await client.searchPublicReviewSubmissions(sid,{...query,cursor:page.meta.next_cursor!});expect(next.data).toHaveLength(1);expect(next.meta.next_cursor).toBeNull();
  expect((await client.search(sid,{q:'Needle'})).data[0]).toHaveProperty('post_id',pid);
  const spec=generateOpenApiSpec() as any;expect(spec.paths['/spaces/{space_id}/search'].get['x-query-schema']).toBeDefined();expect(spec.paths['/spaces/{space_id}/search'].get['x-logical-query-schema']).toEqual(spec.components.schemas.SearchSourceQuery);expect(spec.paths['/spaces/{space_id}/search'].get.description).toContain('review_submissions');expect(spec.components.schemas.PublicReviewSubmissionSearchPage).toBeDefined();
});
it('PC02 canonical source prevalidation rejects unknown/incompatible query before new client transport', async () => {
  const fetchSpy=vi.fn();vi.stubGlobal('fetch',fetchSpy);
  for(const q of [{source:'review_submissions',q:'x',kind:'claim'},{source:'review_submissions',q:'x',private:'x'},{source:'posts',q:'x',request_id:'r'},{source:'private',q:'x'},{source:'review_submissions',q:' '.repeat(4)}]) {
    expect(()=>validateSearchSourceQuery(q)).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
    await expect(client.searchPublicReviewSubmissions(sid,q as any)).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  }
  expect(fetchSpy).not.toHaveBeenCalled();
  const cursor = {v:1,purpose:'review_submission_search',source:'review_submissions',actor_id:'actor',space_id:'space',query_hash:'a'.repeat(64),sort:'submission_id_desc',before_submission_id:'id',exp:1};
  expect(isReviewSubmissionSearchCursorPayload(cursor)).toBe(true);
  for (const field of ['actor_id','space_id','before_submission_id']) expect(isReviewSubmissionSearchCursorPayload({...cursor,[field]:'bad\uD800'})).toBe(false);
  expect(normalizeReviewSubmissionSearchQuery({source:'review_submissions',q:'  ABC研究  '})).toMatchObject({q:'abc研究',limit:20});
});
it('PC03 whole-page wire guard rejects date/identity/filter/order/unknown/meta/snippet flaws without partial rows', async () => {
  const round=await reveal();const query={source:'review_submissions' as const,q:'Needle',request_id:round.id,target_post_id:pid};const page=await client.searchPublicReviewSubmissions(sid,query),row=page.data[0]!;
  const malformed:unknown[]=[
    {...page,data:Array.from({length:21},(_,n)=>({...row,submission_id:'rsb_'+String(100-n).padStart(3,'0')})),meta:{truncated:false,next_cursor:null}},
    {...page,data:[{...row,sealed_payload:'no'}]}, {...page,data:[row,{...page.data[1]!,revealed_at:null}]},
    {...page,data:[{...row,space_id:'other'}]}, {...page,data:[{...row,request_id:'other'}]}, {...page,data:[{...row,target_ref:{post_id:'other',revision:1}}]},
    {...page,data:[{...row,submitted_at:'yesterday'}]}, {...page,data:[{...row,revealed_at:'2020-01-01T00:00:00Z'}]},
    {...page,data:[{...row,snippet:'😀'.repeat(321)}]}, {...page,data:[row,row]}, {...page,data:[...page.data].reverse()},
    {...page,meta:{truncated:true,next_cursor:null}}, {...page,meta:{truncated:false,next_cursor:'opaque-under-limit'}}, {...page,data:[],meta:{truncated:false,next_cursor:'opaque'}},
    {...page,data:[{...row,submission_id:'bad\uD800'}]}, {...page,unexpected:true},
  ];
  for(const data of malformed){expect(isPublicReviewSubmissionSearchPage(data,sid,query)).toBe(false);vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({api_version:'1',request_id:'controlled',data:(data as any).data,meta:(data as any).meta,...((data as any).unexpected?{unexpected:true}:{})}),{status:200})));await expect(client.searchPublicReviewSubmissions(sid,query)).rejects.toBeInstanceOf(ClientProtocolError);}
});
it('PC04 shared ID ordering follows SQLite BINARY, not locale; distinct review/post cursors do not cross source', async () => {
  const ids=['rsb_Z','rsb_a','rsb_研','rsb_😀'];
  const sql=db.prepare('SELECT value FROM json_each(?) ORDER BY value DESC').all(JSON.stringify(ids)) as {value:string}[];
  expect([...ids].sort((a,b)=>compareReviewSubmissionIds(b,a))).toEqual(sql.map(x=>x.value));
  await reveal();const reviews=await client.searchPublicReviewSubmissions(sid,{source:'review_submissions',q:'Needle',limit:1});
  await expect(client.search(sid,{q:'Needle',cursor:reviews.meta.next_cursor!})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
});
