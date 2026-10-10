import { afterEach, beforeEach, expect, expectTypeOf, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { CryptoHasher } from '@detuned/core';
import { ClientProtocolError, DetunedClient } from '@detuned/client';
import { isFindingsView, isFailuresView, generateOpenApiSpec, FindingViewItemSchema, FailureViewItemSchema, ViewResponseDataSchema, type FindingViewItem, type FailureViewItem, type ViewResponseData, type ReviewRequestView, type CreateReviewSubmission } from '@detuned/protocol';

let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>, url: string;
let token: string, sid: string, pid: string, client: DetunedClient, tick: number;
const clock = { now: () => new Date(tick), nowIso: () => new Date(tick).toISOString() };
const path = (suffix = '') => `/spaces/${sid}${suffix}`;
async function write(method: 'POST' | 'PATCH', suffix: string, payload: object, key?: string, bearer = token, status = method === 'POST' ? 201 : 200) {
  tick += 1500;
  const response = await fetch(`${url}/api/v1${suffix}`, { method, headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(payload) });
  expect(response.status, await response.clone().text()).toBe(status);
  return (await response.json()).data;
}
async function acceptedFinding(): Promise<FindingViewItem> {
  const space = storage.findSpaceById(sid)!;
  const revision = storage.getSpaceRevision(sid, space.policy_revision)!;
  await write('PATCH', path(), { expected_revision: space.current_revision, review_policy: { ...revision.review_policy, required_checks: [] } }, 'no-checks');
  const round: ReviewRequestView = await write('POST', path('/review-requests'), { target_ref: { post_id: pid, revision: 1 }, dependency_refs: [], artifact_ids: [], code_refs: [], declared_contributors: [], reviewer_actor_ids: ['r1', 'r2'], expected_policy_revision: storage.findSpaceById(sid)!.policy_revision, reproduction_instructions: 'run' }, 'request');
  for (const id of ['r1', 'r2']) {
    const session = await write('POST', path('/sessions'), { client_name: 'knowledge-contract', client_version: '1' }, undefined, `owned-${id}`);
    const submission: CreateReviewSubmission = { snapshot_sha256: round.snapshot_sha256, reviewer_session_id: session.id, completion_status: 'complete', verdict: 'accept', coverage: 'scope', checks_performed: 'checked', evidence_refs: [], pending_requirements: [], limitations: [], independence_statement: { participated_in_material: false, exposed_to_other_reviews: false, statement: 'independent' } };
    await write('POST', path(`/review-requests/${round.id}/submissions`), submission, `submit-${id}`, `owned-${id}`);
  }
  await write('POST', path(`/review-requests/${round.id}/finalize`), { expected_version: 3 }, 'finalize', token, 200);
  return (await client.getView(sid, 'findings')).data[0]!;
}
beforeEach(async () => {
  tick = Date.parse('2026-10-09T00:00:00Z');
  db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db);
  app = buildApp({ storage, clock }); await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('fixture listener unavailable');
  url = `http://127.0.0.1:${address.port}`; client = new DetunedClient({ baseUrl: url, token, maxRetries: 0 });
  sid = (await write('POST', '/spaces', { slug: 'knowledge-contract', objective: 'o', rules: [] }, 'space')).space.id;
  const tid = (await write('POST', path('/threads'), { title: 't' }, 'thread')).thread.id;
  pid = (await write('POST', path(`/threads/${tid}/posts`), { kind: 'claim', title: 'claim', summary: 's', body: 'original', structured: { statement: 'claim', assumptions: [], scope: 'scope', falsification_plan: 'test' } }, 'claim')).post.id;
  await write('POST', path(`/threads/${tid}/posts`), { kind: 'failure', title: 'failure', summary: 's', structured: { attempt: 'run', category: 'environment_error', assumptions: [], tested_scope: 'run', expected: 'done', observed: 'offline', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'no log', ruled_out: 'this run', not_ruled_out: [], retry_when: ['online'] } }, 'failure');
  const hash = new CryptoHasher();
  for (const id of ['r1', 'r2']) {
    storage.createActor({ id, kind: 'human', display_name: id, created_at: clock.nowIso(), disabled_at: null });
    storage.upsertMembership({ space_id: sid, actor_id: id, role: 'observer', active: true, reviewer_eligible: true, independence_group: id });
    storage.createCredential({ id: `credential-${id}`, actor_id: id, token_hash: hash.sha256(`owned-${id}`), allowed_space_ids: [sid], capabilities: ['read', 'write'], expires_at: null, revoked_at: null, created_at: clock.nowIso() });
  }
});
afterEach(async () => { vi.unstubAllGlobals(); await app.close(); db.close(); });

it('KC01 real HTTP/shared client preserve typed array envelope and canonical OpenAPI, accepted review never means checks passed', async () => {
  const empty = await client.getView(sid, 'findings');
  expectTypeOf(empty).toEqualTypeOf<{ data: ViewResponseData<'findings'>; meta?: any }>();
  expect(empty.data[0]).toMatchObject({ formal_review_status: 'not_requested', formal_check_status: 'not_requested', formal_review: null });
  const item = await acceptedFinding();
  expect(isFindingsView([item], sid)).toBe(true);
  expect(item).toMatchObject({ report_kind: 'author_report', formal_review_status: 'accepted', formal_check_status: 'not_required', formal_review: { space_id: sid, target_post_id: pid, target_revision: 1, phase: 'accepted', verification_status: 'not_required', current_validity: 'current' } });
  expect(Object.keys(item.formal_review!).sort()).toEqual(['created_at', 'current_validity', 'phase', 'request_id', 'round', 'snapshot_id', 'space_id', 'target_post_id', 'target_revision', 'validity_reasons', 'verification_status']);
  const failures = await client.getView(sid, 'failures');
  expect(isFailuresView(failures.data, sid)).toBe(true);
  expect(failures.data[0]).toMatchObject({ formal_review_status: 'not_requested', formal_review: null });
  const response = await fetch(`${url}/api/v1${path('/views/findings')}`, { headers: { authorization: `Bearer ${token}` } });
  expect(response.status).toBe(200); const envelope = await response.json();
  expect(Array.isArray(envelope.data)).toBe(true); expect(envelope.data).toEqual([item]);
  expect(envelope).not.toHaveProperty('view');
  const spec = generateOpenApiSpec();
  const schemas = (spec.components as { schemas: Record<string, unknown> }).schemas;
  expect(schemas.FindingViewItem).toEqual(FindingViewItemSchema);
  expect(schemas.FailureViewItem).toEqual(FailureViewItemSchema);
  expect(schemas.ViewResponseData).toEqual(ViewResponseDataSchema);
});
it('KC02 real HTTP invalid persisted policy returns safe RESYNC_REQUIRED rather than a default, shared client surfaces it', async () => {
  const valid = storage.getSpaceRevision(sid, 1)!.review_policy;
  for (const raw of ['{}', '{broken', JSON.stringify({ ...valid, secret: 'stored secret' })]) {
    // Intentional fault injection is confined to policy; no review decision is forged.
    db.prepare('UPDATE space_revisions SET review_policy=? WHERE space_id=?').run(raw, sid);
    const response = await fetch(`${url}/api/v1${path('/views/findings')}`, { headers: { authorization: `Bearer ${token}` } });
    expect(response.status).toBe(409);
    const text = await response.text(); expect(text).toContain('RESYNC_REQUIRED'); expect(text).not.toContain('stored secret'); expect(text).not.toContain('{broken');
    await expect(client.getView(sid, 'failures')).rejects.toMatchObject({ code: 'RESYNC_REQUIRED' });
  }
});
it('KC03 controlled transport rejects every malformed row, scope/date/flags mismatch and over-limit findings arrays', async () => {
  // The valid base comes from real SQLite lifecycle. Mutated transport is only wire-contract evidence.
  const item = await acceptedFinding(); const review = item.formal_review!;
  const invalid: unknown[] = [
    [{ ...item, secret: 'sealed' }],
    [{ ...item, created_at: 'not-a-date' }],
    [{ ...item, formal_review: { ...review, created_at: 'not-a-date' } }],
    [{ ...item, formal_review: { ...review, space_id: 'other-space' } }],
    [{ ...item, formal_review: { ...review, target_post_id: 'other-post' } }],
    [{ ...item, formal_review: { ...review, target_revision: item.revision + 1 } }],
    [{ ...item, formal_review_status: 'cancelled' }],
    [{ ...item, formal_check_status: 'pending' }],
    [{ ...item, formal_review: null }],
    [{ ...item, formal_review: { ...review, verification_status: 'verified' }, formal_check_status: 'verified' }],
    [{ ...item, formal_review: { ...review, sealed_reviews: [] } }],
    [item, { ...item, material: { ...item.material, statement: 4 } }],
    Array.from({ length: 26 }, () => item),
    { items: [item] },
  ];
  for (const data of invalid) {
    expect(isFindingsView(data, sid)).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'controlled', data }), { status: 200 })));
    await expect(client.getView(sid, 'findings')).rejects.toBeInstanceOf(ClientProtocolError);
  }
});
it('KC04 controlled transport preserves null semantics and failure array guard, unrelated view behavior stays unchanged', async () => {
  const finding = (await client.getView(sid, 'findings')).data[0]!;
  const failureItem: FailureViewItem = (await client.getView(sid, 'failures')).data[0]!;
  expect(isFindingsView([{ ...finding, formal_review_status: 'not_enabled', formal_check_status: 'not_enabled' }], sid)).toBe(true);
  for (const data of [[{ ...failureItem, formal_check_status: 'not_enabled' }], [{ ...failureItem, formal_review_status: 'accepted' }], [{ ...failureItem, created_at: 'bad' }], [failureItem, { ...failureItem, unknown: true }], Array.from({ length: 51 }, () => failureItem)]) {
    expect(isFailuresView(data, sid)).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'controlled', data }), { status: 200 })));
    await expect(client.getView(sid, 'failures')).rejects.toBeInstanceOf(ClientProtocolError);
  }
  const opaqueOtherView = [{ legacy_shape: 'unchanged transport' }];
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'controlled', data: opaqueOtherView }), { status: 200 })));
  expect((await client.getView(sid, 'open-questions')).data).toEqual(opaqueOtherView);
});
