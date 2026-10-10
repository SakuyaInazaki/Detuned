import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { AuthService, CryptoHasher, SearchService, type StoragePort } from '@detuned/core';
import { ReviewStatusService } from '@detuned/module-review';
import { isFindingsView, isFailuresView, type CreateReviewSubmission, type ReviewRequestView, type ReviewPolicy } from '@detuned/protocol';

let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>;
let token: string, sid: string, tid: string, pid: string, authService: AuthService, views: SearchService;
let tick: number;
const clock = { now: () => new Date(tick), nowIso: () => new Date(tick).toISOString() };
const claim = { statement: 'claim', assumptions: ['a'], scope: 'scope', falsification_plan: 'test' };
const failure = { attempt: 'run', category: 'environment_error', assumptions: [], tested_scope: 'run', expected: 'done', observed: 'offline', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'no log', ruled_out: 'this run', not_ruled_out: [], retry_when: ['retry online'] };
async function call(method: 'GET' | 'POST' | 'PATCH', suffix: string, payload?: object, key?: string, bearer = token, status = method === 'POST' ? 201 : 200) {
  tick += 1500;
  const response = await app.inject({ method, url: `/api/v1${suffix}`, headers: { authorization: `Bearer ${bearer}`, ...(key ? { 'idempotency-key': key } : {}) }, ...(payload ? { payload } : {}) });
  expect(response.statusCode, response.body).toBe(status);
  return response.json().data;
}
const path = (suffix = '') => `/spaces/${sid}${suffix}`;
function policy(): ReviewPolicy {
  const space = storage.findSpaceById(sid)!;
  return storage.getSpaceRevision(sid, space.policy_revision)!.review_policy;
}
async function patchPolicy(change: Partial<ReviewPolicy>, key: string) {
  return call('PATCH', path(), { expected_revision: storage.findSpaceById(sid)!.current_revision, review_policy: { ...policy(), ...change } }, key);
}
async function request(key: string): Promise<ReviewRequestView> {
  return call('POST', path('/review-requests'), { target_ref: { post_id: pid, revision: storage.findPostById(pid)!.current_revision }, dependency_refs: [], artifact_ids: [], code_refs: [], declared_contributors: [], reviewer_actor_ids: ['r1', 'r2'], expected_policy_revision: storage.findSpaceById(sid)!.policy_revision, reproduction_instructions: 'run' }, key);
}
function findings() {
  const items = views.getView(authService.authenticateToken(token), sid, 'findings').items;
  if (!isFindingsView(items, sid)) throw new Error('invalid fixture findings');
  return items;
}
async function accept(round: ReviewRequestView) {
  for (const id of ['r1', 'r2']) {
    const session = await call('POST', path('/sessions'), { client_name: 'knowledge-status', client_version: '1' }, undefined, `owned-${id}`);
    const body: CreateReviewSubmission = { snapshot_sha256: round.snapshot_sha256, reviewer_session_id: session.id, completion_status: 'complete', verdict: 'accept', coverage: 'scope', checks_performed: 'checked', evidence_refs: [], pending_requirements: [], limitations: [], independence_statement: { participated_in_material: false, exposed_to_other_reviews: false, statement: 'independent' } };
    await call('POST', path(`/review-requests/${round.id}/submissions`), body, `submit-${round.id}-${id}`, `owned-${id}`);
  }
  await call('POST', path(`/review-requests/${round.id}/finalize`), { expected_version: 3 }, `finalize-${round.id}`, token, 200);
}
beforeEach(async () => {
  tick = Date.parse('2026-10-09T00:00:00Z');
  db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db);
  app = buildApp({ storage, clock }); await app.ready();
  sid = (await call('POST', '/spaces', { slug: 'knowledge-status', objective: 'o', rules: [] }, 'space')).space.id;
  tid = (await call('POST', path('/threads'), { title: 't' }, 'thread')).thread.id;
  pid = (await call('POST', path(`/threads/${tid}/posts`), { kind: 'claim', title: 'claim', summary: 's', body: 'original', structured: claim }, 'claim')).post.id;
  const hasher = new CryptoHasher(); authService = new AuthService(storage, hasher, clock); views = new SearchService(storage, authService);
  for (const id of ['r1', 'r2', 'reader']) {
    storage.createActor({ id, kind: 'human', display_name: id, created_at: clock.nowIso(), disabled_at: null });
    storage.upsertMembership({ space_id: sid, actor_id: id, role: 'observer', active: true, reviewer_eligible: id !== 'reader', independence_group: id });
    storage.createCredential({ id: `credential-${id}`, actor_id: id, token_hash: hasher.sha256(`owned-${id}`), allowed_space_ids: [sid], capabilities: id === 'reader' ? ['read'] : ['read', 'write'], expires_at: null, revoked_at: null, created_at: clock.nowIso() });
  }
});
afterEach(async () => { vi.restoreAllMocks(); await app.close(); db.close(); });

it('KS01 enabled/disabled with no round preserve author reports and failure materials', async () => {
  await call('POST', path(`/threads/${tid}/posts`), { kind: 'failure', title: 'failure', summary: 's', structured: failure }, 'failure');
  for (const enabled of [true, false, true]) {
    await patchPolicy({ enabled }, `enabled-${enabled}-${tick}`);
    const state = enabled ? 'not_requested' : 'not_enabled';
    expect(findings()[0]).toMatchObject({ report_kind: 'author_report', formal_review_status: state, formal_check_status: state, formal_review: null, material: { statement: 'claim' } });
    const items = views.getView(authService.authenticateToken(token), sid, 'failures').items;
    expect(isFailuresView(items, sid)).toBe(true);
    expect(items[0]).toMatchObject({ report_kind: 'author_report', formal_review_status: state, formal_check_status: state, formal_review: null, material: { category: 'environment_error', retry_when: ['retry online'] } });
  }
});
it('KS02 latest all-round cancellation replaces accepted history rather than selecting a favourable old round', async () => {
  await patchPolicy({ required_checks: [] }, 'no-checks');
  const first = await request('first'); await accept(first);
  expect(findings()[0]!.formal_review).toMatchObject({ request_id: first.id, phase: 'accepted', verification_status: 'not_required', target_revision: 1, current_validity: 'current' });
  const second = await request('second');
  await call('POST', path(`/review-requests/${second.id}/cancel`), { expected_version: 1, reason: 'stop' }, 'cancel', token, 200);
  expect(findings()[0]).toMatchObject({ formal_review_status: 'cancelled', formal_check_status: 'not_required', formal_review: { request_id: second.id, round: 2, phase: 'cancelled' } });
});
it('KS03 accepted historical target remains fixed while current revision and disabled policy change validity', async () => {
  await patchPolicy({ required_checks: [] }, 'no-checks'); const first = await request('first'); await accept(first);
  await call('POST', path(`/posts/${pid}/revisions`), { expected_revision: 1, title: 'new', summary: 's', structured: claim }, 'revise');
  await patchPolicy({ enabled: false, required_checks: ['later'] }, 'disable');
  expect(findings()[0]).toMatchObject({ revision: 2, formal_review_status: 'accepted', formal_check_status: 'not_required', formal_review: { request_id: first.id, target_revision: 1, phase: 'accepted', current_validity: 'superseded', validity_reasons: ['target_superseded', 'policy_superseded'] } });
});
it('KS04 real collecting round becomes stale on revision; frozen checks remain pending', async () => {
  await call('PATCH', path(), { expected_revision: 1, check_profiles: { reproduce: { verifier_actor_ids: [], config_sha256: 'a'.repeat(64), description: 'external' } } }, 'profile');
  const first = await request('pending');
  expect(findings()[0]).toMatchObject({ formal_review_status: 'collecting', formal_check_status: 'pending' });
  await call('POST', path(`/posts/${pid}/revisions`), { expected_revision: 1, title: 'new', summary: 's', structured: claim }, 'revise');
  await patchPolicy({ required_checks: [] }, 'remove-checks');
  const item = findings()[0]!;
  expect(item).toMatchObject({ formal_review_status: 'stale', formal_check_status: 'pending', formal_review: { request_id: first.id, target_revision: 1, current_validity: 'superseded' } });
  expect(item.formal_review).toEqual({ ...new ReviewStatusService(storage, authService).getStatus(authService.authenticateToken(token), sid, first.id), space_id: sid, target_post_id: pid, round: 1, target_revision: 1, created_at: first.created_at });
});
it('KS05 real challenge and dependency redaction preserve historical accepted metadata without sealed contents', async () => {
  await patchPolicy({ required_checks: [] }, 'no-checks');
  const dependency = (await call('POST', path(`/threads/${tid}/posts`), { kind: 'note', title: 'dependency', summary: 's', body: 'dependency secret' }, 'dep')).post;
  const first: ReviewRequestView = await call('POST', path('/review-requests'), { target_ref: { post_id: pid, revision: 1 }, dependency_refs: [{ post_id: dependency.id, revision: 1 }], artifact_ids: [], code_refs: [], declared_contributors: [], reviewer_actor_ids: ['r1', 'r2'], expected_policy_revision: storage.findSpaceById(sid)!.policy_revision, reproduction_instructions: 'run' }, 'request-dep');
  await accept(first);
  await call('POST', path('/relations'), { source_ref: { post_id: dependency.id, revision: 1 }, target_ref: { post_id: pid, revision: 1 }, type: 'challenges' }, 'challenge');
  expect(findings()[0]!.formal_review).toMatchObject({ phase: 'accepted', current_validity: 'challenged', validity_reasons: ['open_challenges'] });
  await call('POST', path('/redactions'), { target_type: 'post', target_id: dependency.id, reason: 'remove' }, 'redact');
  expect(findings()[0]!.formal_review).toMatchObject({ phase: 'accepted', current_validity: 'invalidated' });
  expect(findings()[0]!.formal_review!.validity_reasons).toContain('dependency_redacted');
  expect(JSON.stringify(findings())).not.toContain('dependency secret');
});
it('KS06 one outer snapshot includes refreshed ACL, policy lookup and latest-round read; revoked ACL fails before policy parsing', async () => {
  const cached = authService.authenticateToken('owned-reader');
  let depth = 0;
  const readSnapshot = storage.readSnapshot.bind(storage);
  vi.spyOn(storage, 'readSnapshot').mockImplementation(<T>(fn: (snapshot: StoragePort) => T): T => readSnapshot(snapshot => { depth++; try { return fn(snapshot); } finally { depth--; } }));
  const findSpace = storage.findSpaceById.bind(storage);
  const getRevision = storage.getSpaceRevision.bind(storage);
  const search = storage.searchPosts.bind(storage);
  const rounds = storage.listPostReviewRequests.bind(storage);
  vi.spyOn(storage, 'findSpaceById').mockImplementation((...args) => { expect(depth).toBeGreaterThan(0); return findSpace(...args); });
  vi.spyOn(storage, 'getSpaceRevision').mockImplementation((...args) => { expect(depth).toBeGreaterThan(0); return getRevision(...args); });
  vi.spyOn(storage, 'searchPosts').mockImplementation((...args) => { expect(depth).toBeGreaterThan(0); return search(...args); });
  vi.spyOn(storage, 'listPostReviewRequests').mockImplementation((...args) => { expect(depth).toBeGreaterThan(0); expect(args[2]).toBe(1); return rounds(...args); });
  views.getView(cached, sid, 'findings');
  storage.upsertMembership({ ...storage.getMembership(sid, 'reader')!, active: false });
  // Intentional persisted-policy fault injection; no formal review status is forged.
  db.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=?').run('{broken', sid);
  expect(() => views.getView(cached, sid, 'findings')).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
});
it('KS07 malformed, missing and extra-field policies safely resync without defaults, unrelated storage errors propagate', () => {
  const valid = JSON.stringify(policy());
  for (const value of ['{broken', '{}', JSON.stringify({ ...policy(), unexpected: true })]) {
    db.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=?').run(value, sid);
    expect(() => findings()).toThrow(expect.objectContaining({ code: 'RESYNC_REQUIRED' }));
    db.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=?').run(valid, sid);
  }
  const missing = vi.spyOn(storage, 'getSpaceRevision').mockReturnValue(null);
  expect(() => findings()).toThrow(expect.objectContaining({ code: 'RESYNC_REQUIRED' })); missing.mockRestore();
  const unavailable = new Error('storage unavailable');
  vi.spyOn(storage, 'getSpaceRevision').mockImplementation(() => { throw unavailable; });
  expect(() => findings()).toThrow(unavailable);
});
