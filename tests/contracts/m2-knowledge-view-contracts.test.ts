import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { FormatRegistry } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';
import { SourceStatusSchema, RelationProjectionSchema, BlockingObjectionSchema, FailureMaterialSchema, ClaimMaterialSchema, VIEW_RESPONSE_DATA_SCHEMAS, ViewResponseDataSchema, ContextResponseDataSchema, generateOpenApiSpec, ViewResponseData, ContextPage, ContextResponseData, ViewName, isPostRef, isPostRefArray, isHistoricalMaterialField } from '@detuned/protocol';

const req = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const compilerReq = createRequire(createRequire(req.resolve('fastify')).resolve('@fastify/ajv-compiler'));
const Ajv = compilerReq('ajv');
const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false, formats: { 'date-time': true } });
const ref = { post_id: 'post', revision: 1 };
const relation = { relation_id: 'r', relation_type: 'challenges', source_ref: ref, target_ref: ref, source_author_id: 'a', target_author_id: 'b', creator_id: 'c', state: 'open', version: 1, source_status: 'active', target_status: 'withdrawn', source_has_newer_revision: false, target_has_newer_revision: true };
function agrees(schema: any, value: unknown, expected: boolean) {
  const before = JSON.stringify(value);
  // Match the installed structural compiler's ignored date-time format; do not claim value-format validation.
  const previousFormat = FormatRegistry.Get('date-time');
  FormatRegistry.Set('date-time', () => true);
  try {
    expect(Value.Check(schema, value), JSON.stringify(value)).toBe(expected);
    expect(ajv.compile(schema)(value)).toBe(expected);
    expect(JSON.stringify(value)).toBe(before);
  } finally {
    if (previousFormat) FormatRegistry.Set('date-time', previousFormat);
    else FormatRegistry.Delete('date-time');
  }
}

describe('M2.2-B typed knowledge projection contracts', () => {
  it('B01: source and flat relation schemas make unavailable/redacted version knowledge null', () => {
    for (const status of ['active', 'withdrawn']) agrees(SourceStatusSchema, { ref, status, has_newer_revision: true }, true);
    for (const status of ['redacted', 'unavailable']) {
      agrees(SourceStatusSchema, { ref, status, has_newer_revision: null }, true);
      agrees(SourceStatusSchema, { ref, status, has_newer_revision: false }, false);
      agrees(SourceStatusSchema, { ref, status, has_newer_revision: null, title: 'secret' }, false);
    }
    agrees(SourceStatusSchema, { ref, status: 'active', has_newer_revision: null }, false);
    agrees(RelationProjectionSchema, relation, true);
    for (const endpoint of ['source', 'target']) {
      agrees(RelationProjectionSchema, { ...relation, [`${endpoint}_status`]: 'redacted', [`${endpoint}_has_newer_revision`]: null }, true);
      agrees(RelationProjectionSchema, { ...relation, [`${endpoint}_status`]: 'redacted' }, false);
    }
    agrees(RelationProjectionSchema, { ...relation, target_status: 'unavailable' }, false);
    agrees(RelationProjectionSchema, { ...relation, current_revision: 2 }, false);
    for (const endpoint of ['source', 'target']) {
      const tombstone = { ...relation, type: 'open_challenge', [`${endpoint}_status`]: 'redacted', [`${endpoint}_has_newer_revision`]: null, issue: null, impact: null, missing_fields: ['issue', 'impact'] };
      agrees(BlockingObjectionSchema, tombstone, true);
      agrees(BlockingObjectionSchema, { ...tombstone, issue: 'old secret' }, false);
      agrees(BlockingObjectionSchema, { ...tombstone, missing_fields: ['issue'] }, false);
    }
  });

  it('B02: material requires explicit nullable fields/missing lists without fake defaults', () => {
    const claim = { statement: null, assumptions: [], scope: null, falsification_plan: null, missing_fields: ['statement', 'scope', 'falsification_plan'] };
    agrees(ClaimMaterialSchema, claim, true);
    agrees(ClaimMaterialSchema, { ...claim, assumptions: [42] }, false);
    expect(isHistoricalMaterialField('claim', 'assumptions', [42])).toBe(false);
    expect(isHistoricalMaterialField('failure', 'category', 'made_up')).toBe(false);
    expect(isHistoricalMaterialField('failure', 'attempt', ' ')).toBe(true);
    expect(isHistoricalMaterialField('claim', 'unknown', 'x')).toBe(false);
    expect(isPostRef(ref)).toBe(true); expect(isPostRef({ ...ref, secret: 'x' })).toBe(false);
    expect(isPostRefArray([ref])).toBe(true); expect(isPostRefArray([])).toBe(false);
    const material = { attempt: null, category: null, assumptions: [], tested_scope: null, expected: null, observed: null, evidence_refs: [], evidence_state: null, evidence_missing_reason: null, ruled_out: null, not_ruled_out: [], retry_when: [], missing_fields: ['attempt', 'category', 'tested_scope', 'expected', 'observed', 'evidence_state', 'ruled_out'] };
    agrees(FailureMaterialSchema, material, true);
    agrees(FailureMaterialSchema, { ...material, category: 'made_up' }, false);
    const missingState = { ...material } as Record<string, unknown>; delete missingState.evidence_state;
    agrees(FailureMaterialSchema, missingState, false);
    agrees(FailureMaterialSchema, { ...material, evidence_state: 'unverified', evidence_missing_reason: 'reason' }, true);
  });

  it('B03: view mapping and OpenAPI preserve arrays and publish exact current response schemas', () => {
    for (const schema of Object.values(VIEW_RESPONSE_DATA_SCHEMAS)) agrees(schema, [], true);
    agrees(ViewResponseDataSchema, {}, false);
    const spec = generateOpenApiSpec() as any;
    expect(spec.paths['/spaces/{space_id}/views/{name}'].get.responses['200'].content['application/json'].schema.properties.data).toEqual(ViewResponseDataSchema);
    expect(spec.paths['/spaces/{space_id}/context'].get.responses['200'].content['application/json'].schema.anyOf.map((branch:any)=>branch.properties.data)).toEqual(ContextResponseDataSchema.anyOf);
    expect(spec.paths['/spaces/{space_id}/views/{name}'].get.description).toContain('claim');
    expectTypeOf<ReturnType<DetunedClient['getContext']>>().toEqualTypeOf<Promise<ContextPage>>();
    // Compiled as part of the dedicated tsc check; never opens a client request.
    function clientTypes(client: DetunedClient, name: ViewName) {
      const failures = client.getView('space', 'failures');
      const findings = client.getView('space', 'findings');
      const mixed = client.getView('space', name);
      expectTypeOf(failures).toEqualTypeOf<Promise<{ data: ViewResponseData<'failures'>; meta?: any }>>();
      expectTypeOf(findings).toEqualTypeOf<Promise<{ data: ViewResponseData<'findings'>; meta?: any }>>();
      expectTypeOf(mixed).toEqualTypeOf<Promise<{ data: ViewResponseData<ViewName>; meta?: any }>>();
    }
    void clientTypes;
  });
});

describe('M2.2-B real HTTP payload/schema agreement', () => {
  let app: FastifyInstance; let db: Database.Database; let token: string; let sid: string; let tid: string;
  const call = (method: 'GET'|'POST'|'PATCH', path: string, body?: object, key?: string) => app.inject({ method, url: `/api/v1${path}`, headers: { authorization: `Bearer ${token}`, ...(key ? { 'idempotency-key': key } : {}) }, ...(body ? { payload: body } : {}) });
  beforeEach(async () => {
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; app = buildApp({ storage: new SqliteStorage(db) }); await app.ready();
    const space = await call('POST', '/spaces', { slug: 'knowledge-contract', objective: 'contracts', rules: [] }, 'space'); sid = space.json().data.space.id;
    const thread = await call('POST', `/spaces/${sid}/threads`, { title: 't' }, 'thread'); tid = thread.json().data.thread.id;
  });
  afterEach(async () => { await app.close(); db.close(); });

  it('B04: actual three view arrays and context satisfy TypeBox/AJV/OpenAPI without a serializer', async () => {
    const publish = async (kind: string, structured?: object) => {
      const res = await call('POST', `/spaces/${sid}/threads/${tid}/posts`, { kind, title: kind, summary: 's', body: 'b', ...(structured ? { structured } : {}) }, kind);
      expect(res.statusCode).toBe(201); return res.json().data.post;
    };
    const question = await publish('question');
    const claim = await publish('claim', { statement: 'claim', assumptions: [], scope: 'scope', falsification_plan: 'test' });
    await publish('proposal', { statement: 'proposal', assumptions: [], scope: 'scope', falsification_plan: 'test' });
    await publish('failure', { attempt: 'run', category: 'environment_error', assumptions: [], tested_scope: 'run', expected: 'done', observed: 'offline', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'no log', ruled_out: 'this execution', not_ruled_out: [], retry_when: [] });
    const r = await call('POST', `/spaces/${sid}/relations`, { source_ref: { post_id: question.id, revision: 1 }, target_ref: { post_id: claim.id, revision: 1 }, type: 'challenges' }, 'relation'); expect(r.statusCode).toBe(201);
    const summary = await publish('summary', { source_refs: [{ post_id: claim.id, revision: 1 }] });
    const pin = await call('PATCH', `/spaces/${sid}`, { expected_revision: 1, pinned_refs: [{ post_id: summary.id, revision: 1 }] }, 'pin'); expect(pin.statusCode).toBe(200);
    for (const name of ['findings', 'failures', 'open-questions'] as const) {
      const response = await call('GET', `/spaces/${sid}/views/${name}`); expect(response.statusCode).toBe(200);
      const data = response.json().data;
      if (name === 'findings') expect(data.map((x: any) => x.kind)).toEqual(['claim']);
      if (name === 'open-questions') expect(data.map((x: any) => x.type).sort()).toEqual(['open_challenge', 'question']);
      agrees(VIEW_RESPONSE_DATA_SCHEMAS[name], data, true);
      const spec = generateOpenApiSpec() as any; agrees(spec.paths['/spaces/{space_id}/views/{name}'].get.responses['200'].content['application/json'].schema, response.json(), true);
    }
    const context = await call('GET', `/spaces/${sid}/context`); expect(context.statusCode).toBe(200);
    agrees(ContextResponseDataSchema, context.json().data, true);
    expect(context.json().data.pinned_summaries[0]).toMatchObject({ has_newer_revision: false, source_refs: [{ ref: { post_id: claim.id, revision: 1 }, status: 'active', has_newer_revision: false }] });
    const unauthorized = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/views/findings` }); expect(unauthorized.statusCode).toBe(401);
  });
});
