import { beforeEach, afterEach, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { AuthService, CryptoHasher, SearchService, HmacTokenSigner } from '@detuned/core';
import { type ReviewRequestView, type CreateReviewSubmission } from '@detuned/protocol';
let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>, token: string, sid: string, pid: string, auth: AuthService, service: SearchService, tick: number;
const clock = { now: () => new Date(tick), nowIso: () => new Date(tick).toISOString() };
async function call(method: 'GET'|'POST'|'PATCH', suffix: string, payload?: object, key?: string, bearer = token, status = method === 'POST' ? 201 : 200) {
  tick += 1000;
  const r = await app.inject({ method, url: '/api/v1' + suffix, headers: { authorization: `Bearer ${bearer}`, ...(key ? { 'idempotency-key': key } : {}) }, ...(payload ? { payload } : {}) });
  expect(r.statusCode, r.body).toBe(status); return r.json().data;
}
const path = (suffix = '') => `/spaces/${sid}${suffix}`;
async function request(key: string): Promise<ReviewRequestView> { return call('POST', path('/review-requests'), { target_ref: { post_id: pid, revision: 1 }, dependency_refs: [], artifact_ids: [], code_refs: [], declared_contributors: [], reviewer_actor_ids: ['r1','r2'], expected_policy_revision: storage.findSpaceById(sid)!.policy_revision, reproduction_instructions: 'run' }, key); }
async function submit(round: ReviewRequestView, id: string, change: Partial<CreateReviewSubmission> = {}) {
  const session = await call('POST', path('/sessions'), { client_name: 'public-search-test', client_version: '1' }, undefined, `owned-${id}`);
  return call('POST', path(`/review-requests/${round.id}/submissions`), { snapshot_sha256: round.snapshot_sha256, reviewer_session_id: session.id, completion_status: 'complete', verdict: 'accept', coverage: 'Needle 研究 %_*', checks_performed: 'performed literal checks', evidence_refs: [], pending_requirements: [], limitations: ['limited scope'], independence_statement: { participated_in_material: false, exposed_to_other_reviews: false, statement: 'independent textual finding' }, ...change }, `submit-${round.id}-${id}`, `owned-${id}`);
}
function search(q: string, extra: { request_id?: string; target_post_id?: string; limit?: number; cursor?: string } = {}, bearer = token, reader = service) { return reader.searchPublicReviewSubmissions(auth.authenticateToken(bearer), sid, { source: 'review_submissions', q, ...extra }); }
function bounded(candidates: number, bytes = 262144) { return new SearchService(storage, auth, { signer: new HmacTokenSigner(), secret: storage.getInstanceSecret(), clock, hasher: new CryptoHasher() }, { max_candidates: candidates, max_response_bytes: bytes }); }
beforeEach(async () => {
  tick = Date.parse('2026-10-09T00:00:00Z'); db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db); app = buildApp({ storage, clock }); await app.ready();
  sid = (await call('POST','/spaces',{ slug:'public-review-search', objective:'o', rules:[] },'space')).space.id;
  const tid = (await call('POST',path('/threads'),{title:'t'},'thread')).thread.id;
  pid = (await call('POST',path(`/threads/${tid}/posts`),{kind:'claim',title:'Needle post',summary:'s',body:'ordinary post search',structured:{statement:'claim',assumptions:[],scope:'scope',falsification_plan:'test'}},'claim')).post.id;
  const space = storage.findSpaceById(sid)!; const rev = storage.getSpaceRevision(sid,space.policy_revision)!;
  await call('PATCH',path(),{expected_revision:space.current_revision,review_policy:{...rev.review_policy,required_checks:[]}},'no-checks');
  const hasher = new CryptoHasher(); auth = new AuthService(storage,hasher,clock); service = bounded(5000);
  for (const id of ['r1','r2','reader']) { storage.createActor({id,kind:'human',display_name:id,disabled_at:null,created_at:clock.nowIso()}); storage.upsertMembership({space_id:sid,actor_id:id,role:'observer',active:true,reviewer_eligible:id!=='reader',independence_group:id}); storage.createCredential({id:`cred-${id}`,actor_id:id,token_hash:hasher.sha256(`owned-${id}`),allowed_space_ids:[sid],capabilities:id==='reader'?['read']:['read','write'],expires_at:null,revoked_at:null,created_at:clock.nowIso()}); }
});
afterEach(async () => { await app.close(); db.close(); });
it('PS01 own sealed opinions never enter search; all-row final reveal creates real public fixed identities', async () => {
  const round = await request('one'); const first = await submit(round,'r1');
  expect(search('Needle',{},'owned-r1').items).toEqual([]);
  expect(await call('GET',path(`/review-submissions/${first.submission_id}`),undefined,undefined,'owned-r1')).toHaveProperty('coverage');
  await submit(round,'r2'); const result = search(' nEEdLe ');
  expect(result.items).toHaveLength(2); expect(result.items[0]).toMatchObject({type:'review_submission',space_id:sid,request_id:round.id,snapshot_id:round.snapshot_id,target_ref:{post_id:pid,revision:1},round:1,verdict:'accept'});
  expect(result.items[0]).not.toHaveProperty('post_id'); expect(result.items[0]).not.toHaveProperty('coverage');
});
it('PS02 literal whitelist, independent fields, ASCII fold, Unicode and bounded original-text snippet', async () => {
  const round = await request('literal'); const q = '😀'.repeat(256), text = '前'.repeat(60) + q + '后'.repeat(80);
  await submit(round,'r1',{coverage:text,checks_performed:'splitLeft',limitations:['splitRight']}); await submit(round,'r2');
  for (const term of ['研','研究','Needle','%_*','independent textual','limited scope','accept']) expect(search(term).items.length).toBeGreaterThan(0);
  const item = search(q).items[0]!; expect(Array.from(item.snippet).length).toBeLessThanOrEqual(320); expect(item.snippet).toContain(q); expect(item.snippet.startsWith('…')).toBe(true);
  expect(search('splitLeftsplitRight').items).toEqual([]); expect(search(round.snapshot_sha256).items).toEqual([]);
  expect(search('NEEDLE').items[0]!.snippet).toContain('Needle'); expect(search('研究x').items).toEqual([]);
});
it('PS03 public pagination has one extra real match and actor/query isolation', async () => {
  const round = await request('pages'); await submit(round,'r1'); await submit(round,'r2');
  const first = search('Needle',{limit:1}); expect(first.next_cursor).not.toBeNull();
  const second = search('needle',{limit:1,cursor:first.next_cursor!}); expect(second.items).toHaveLength(1); expect(second.next_cursor).toBeNull(); expect(second.items[0]!.submission_id).not.toBe(first.items[0]!.submission_id);
  expect(() => search('different',{cursor:first.next_cursor!})).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
  expect(() => search('needle',{cursor:first.next_cursor!},'owned-reader')).toThrow(expect.objectContaining({code:'VALIDATION_ERROR'}));
});
it('PS04 bounded metadata preflight applies to whole filter domain including cursor, not sealed rows; response bytes fail explicitly', async () => {
  const first = await request('first'); await submit(first,'r1'); await submit(first,'r2');
  const page = search('needle',{limit:1},token,bounded(2)); const second = await request('second'); await submit(second,'r1');
  expect(search('needle',{},token,bounded(2)).items).toHaveLength(2);
  await submit(second,'r2');
  expect(() => search('needle',{cursor:page.next_cursor!},token,bounded(2))).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));
  expect(search('needle',{request_id:first.id},token,bounded(2)).items).toHaveLength(2);
  expect(search('needle',{request_id:'unknown'},token,bounded(2)).items).toEqual([]);
  expect(() => search('needle',{request_id:first.id},token,bounded(2,20))).toThrow(expect.objectContaining({code:'QUERY_TOO_BROAD'}));
  expect(storage.listPublicReviewSubmissionCandidateIds(sid,{},2)).toHaveLength(3); // max+1 metadata sentinel, not 5000-scale certification
});
it('PS05 current ACL and real redaction hide history; cancelled history is otherwise still searchable', async () => {
  const round = await request('history'); await submit(round,'r1'); await submit(round,'r2');
  await call('POST',path(`/review-requests/${round.id}/cancel`),{expected_version:3,reason:'stop'},'cancel',token,200);
  expect(search('needle').items).toHaveLength(2);
  const cached = auth.authenticateToken('owned-reader'); storage.upsertMembership({...storage.getMembership(sid,'reader')!,active:false});
  expect(() => service.searchPublicReviewSubmissions(cached,sid,{source:'review_submissions',q:'needle'})).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
  await call('POST',path('/redactions'),{target_type:'post',target_id:pid,reason:'remove'},'redact'); expect(search('needle').items).toEqual([]);
});
it('PS06 real HTTP source/filter rejection and omitted/explicit posts preserve old row and signed cursor behavior', async () => {
  const legacy = await app.inject({method:'GET',url:`/api/v1${path('/search')}?q=Needle`,headers:{authorization:`Bearer ${token}`}});
  const explicit = await app.inject({method:'GET',url:`/api/v1${path('/search')}?q=Needle&source=posts`,headers:{authorization:`Bearer ${token}`}});
  expect(legacy.statusCode,legacy.body).toBe(200); expect(explicit.json().data).toEqual(legacy.json().data); expect(legacy.json().data[0]).toHaveProperty('post_id',pid); expect(legacy.json().data[0]).not.toHaveProperty('type');
  for (const query of ['source=review_submissions&kind=claim','source=review_submissions&tags_json=%5B%5D','source=posts&request_id=x','source=private','source=review_submissions&unknown=x']) { const bad=await app.inject({method:'GET',url:`/api/v1${path('/search')}?q=x&${query}`,headers:{authorization:`Bearer ${token}`}}); expect(bad.statusCode,bad.body).toBe(400); }
});
