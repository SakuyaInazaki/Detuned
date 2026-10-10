import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import {
  DetunedClient,
  UserAbortError,
  TimeoutError,
  ClientProtocolError,
  ClientTransportError,
} from '@detuned/client';
import {
  ErrorCode,
  DetunedError,
  VALID_RELATION_TYPES,
  generateOpenApiSpec,
  CreateSpaceRequestSchema,
} from '@detuned/protocol';
import {
  RelationService,
  AuthenticatedContext,
} from '@detuned/core';
import activate from '@detuned/adapter-pi';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { DETUNED_TOOLS } from '@detuned/protocol';


// This fixture captures API-v1 routes with Web disabled. Resolve OpenAPI's
// operation/path/document server inheritance before comparing that same domain.
const openApiHttpMethods = new Set(['get','post','put','patch','delete','head','options','trace']);
function apiV1Operations(spec: { servers?: Array<{url:string}>; paths: Record<string,Record<string,any>> }) {
  return Object.entries(spec.paths).flatMap(([path,item]) => Object.entries(item).flatMap(([method,op]) => {
    if (!openApiHttpMethods.has(method)) return [];
    const servers: Array<{url:string}> = op.servers ?? item.servers ?? spec.servers ?? [];
    if (!servers.some(server => new URL(server.url,'http://openapi-fixture.invalid').pathname.replace(/\/+$/,'') === '/api/v1')) return [];
    return [{path,method,op}];
  }));
}

describe('R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter', () => {
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: FastifyInstance;
  let routeContracts: Array<{ method: string; path: string; body: unknown }>;
  let adminToken: string;
  let spaceId: string;
  let threadId: string;
  let postId1: string;
  let postId2: string;
  let port: number;
  let client: DetunedClient;

  beforeEach(async () => {
    db = new Database(':memory:');
    const boot = bootstrapDatabase(db);
    adminToken = boot.adminToken!;
    storage = new SqliteStorage(db);

    app = buildApp({ storage });
    routeContracts = [];
    app.addHook('onRoute', route => {
      for (const method of Array.isArray(route.method) ? route.method : [route.method]) {
        if (method !== 'HEAD' && route.url.startsWith('/api/v1/')) routeContracts.push({ method: method.toLowerCase(), path: route.url.replace(/^\/api\/v1/, '').replace(/:([^/]+)/g, '{$1}'), body: route.schema?.body ?? null });
      }
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    port = (app.server.address() as any).port;

    client = new DetunedClient({
      baseUrl: `http://127.0.0.1:${port}`,
      token: adminToken,
      maxRetries: 0,
    });

    // Seed space, thread, and posts
    const spc = await client.createSpace(
      { slug: 'r4c-space', objective: 'R4-C verification', rules: [] },
      'key-spc-1'
    );
    spaceId = spc.data.space.id;

    const th = await client.createThread(
      spaceId,
      {
        title: 'R4-C Thread',
        initial_post: {
          title: 'P1',
          kind: 'note',
          summary: 'Summary 1',
          body: 'Post 1',
        },
      },
      'key-th-1'
    );
    threadId = th.data.thread.id;
    postId1 = th.data.initial_post.post.id;

    const p2 = await client.createPost(
      spaceId,
      threadId,
      {
        title: 'P2',
        kind: 'note',
        summary: 'Summary 2',
        body: 'Post 2',
      },
      'key-p-2'
    );
    postId2 = p2.data.post.id;
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  describe('C01: Route Schema Validation & Query Integer Parsing', () => {
    it('C01-1: Route rejects undeclared body properties (additionalProperties: false)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/relations`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'idempotency-key': 'key-rel-extra',
        },
        payload: {
          source_ref: { post_id: postId1, revision: 1 },
          target_ref: { post_id: postId2, revision: 1 },
          type: 'cites',
          extra_illegal_field: 'forbidden',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
    });

    it('C01-2: parseIntegerQuery rejects non-digits, negative numbers, and out-of-range values', async () => {
      // 1bad in revision
      const resBadRev = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/posts/${postId1}?revision=1bad`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resBadRev.statusCode).toBe(400);

      // negative in limit
      const resNegLimit = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/threads/${threadId}?limit=-5`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resNegLimit.statusCode).toBe(400);

      // out-of-range in limit (limit > 100)
      const resHugeLimit = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/threads/${threadId}?limit=9999`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resHugeLimit.statusCode).toBe(400);

      // valid query succeeds
      const resOk = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/threads/${threadId}?limit=10`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resOk.statusCode).toBe(200);
    });

    it('C01-3: Core RelationService rejects invalid relation type without committing state', () => {
      const relService = new RelationService(storage);
      const auth: AuthenticatedContext = {
        actor: { id: 'test-admin', display_name: 'Admin', role: 'admin', created_at: '' },
        credential_id: 'cred-1',
        scopes: ['*'],
      };

      const relationsBefore = db.prepare('SELECT count(*) AS n FROM relations').get().n;
      const eventsBefore = db.prepare('SELECT count(*) AS n FROM events').get().n;

      try {
        relService.createRelation(
          auth,
          spaceId,
          {
            source_ref: { post_id: postId1, revision: 1 },
            target_ref: { post_id: postId2, revision: 1 },
            type: 'not_a_real_type' as any,
          },
          'key-core-invalid'
        );
        expect.unreachable('Should have thrown validation error');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DetunedError);
        expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(err.statusCode).toBe(400);
      }

      const relationsAfter = db.prepare('SELECT count(*) AS n FROM relations').get().n;
      const eventsAfter = db.prepare('SELECT count(*) AS n FROM events').get().n;
      expect(relationsAfter).toBe(relationsBefore);
      expect(eventsAfter).toBe(eventsBefore);
    });

    it('C01-4: Valid relation creation and resolve/reopen lifecycle maintains idempotency and symmetry', async () => {
      const createRes = await client.createRelation(
        spaceId,
        {
          source_ref: { post_id: postId1, revision: 1 },
          target_ref: { post_id: postId2, revision: 1 },
          type: 'challenges',
        },
        'key-rel-valid'
      );
      expect(createRes.data.state).toBe('open');
      const relId = createRes.data.id;

      const resolveRes = await client.resolveRelation(
        spaceId,
        relId,
        1,
        { post_id: postId2, revision: 1 },
        'key-rel-resolve'
      );
      expect(resolveRes.data.relation.state).toBe('resolved');

      const reopenRes = await client.reopenRelation(
        spaceId,
        relId,
        2,
        { post_id: postId2, revision: 1 },
        'key-rel-reopen'
      );
      expect(reopenRes.data.relation.state).toBe('open');
    });

    it('C01-5: Query, body, and reference validation rejects without side effects', async () => {
      const beforeState = () => ({
        relations: db.prepare('SELECT count(*) AS n FROM relations').get().n,
        events: db.prepare('SELECT count(*) AS n FROM events').get().n,
        idempotency: db.prepare('SELECT count(*) AS n FROM idempotency_records').get().n,
        memberships: db.prepare('SELECT count(*) AS n FROM memberships').get().n,
      });

      const initialSnapshot = beforeState();

      // 1. Unknown query param
      const r1 = await app.inject({
        method: 'GET',
        url: '/api/v1/spaces?bogus=1',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(r1.statusCode).toBe(400);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 2. Duplicate scalar cursor
      const r2 = await app.inject({
        method: 'GET',
        url: '/api/v1/spaces?cursor=a&cursor=b',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(r2.statusCode).toBe(400);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 3. Duplicate tags
      const r3 = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/search?q=alpha&tags=a&tags=b`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(r3.statusCode).toBe(400);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 4. Invalid state
      const r4 = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/threads?state=not_a_state`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(r4.statusCode).toBe(400);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 5. Explicit empty revision
      const r5 = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/posts/${postId1}?revision=`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(r5.statusCode).toBe(400);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 6. Missing actor reference
      const r6 = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/memberships`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { actor_id: 'r20-missing-actor', role: 'contributor' },
      });
      expect(r6.statusCode).toBe(404);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 7. Malformed JSON
      const r7 = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/threads`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
          'idempotency-key': 'bad-json-key',
        },
        payload: '{',
      });
      expect(r7.statusCode).toBe(400);
      const r7Json = JSON.parse(r7.body);
      expect(r7Json.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(r7Json.error?.retryable).toBe(false);
      expect(JSON.stringify(beforeState())).toBe(JSON.stringify(initialSnapshot));

      // 8. Revoke unknown body
      const actorRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/actors',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { kind: 'agent', display_name: 'Test Actor' },
      });
      const actorId = JSON.parse(actorRes.body).data.id;
      const credRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/credentials',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { actor_id: actorId },
      });
      const credId = JSON.parse(credRes.body).data.credential_id;

      const revokeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/credentials/${credId}/revoke`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { unrecognized_business_field: true },
      });
      expect(revokeRes.statusCode).toBe(400);
      const isRevoked = db.prepare('SELECT revoked_at FROM credentials WHERE id=?').get(credId).revoked_at !== null;
      expect(isRevoked).toBe(false);

      // 9. Client poll with omitted optional query
      const subRes = await client.subscribe(spaceId, { consumer_key: 'poll-key', start: 'now' }, 'sub-key');
      const consumerId = subRes.data.consumer.id;
      const pollResDefault = await client.poll(spaceId, consumerId);
      expect(pollResDefault.data).toBeDefined();
      const pollResExplicit = await client.poll(spaceId, consumerId, {});
      expect(pollResExplicit.data).toBeDefined();
    });

    it('C01-6: Unknown query on write routes and unexpected body on no-body write routes reject before mutation (AD01)', async () => {
      const snapshot = () => ({
        spaces: db.prepare('SELECT count(*) n FROM spaces').get().n,
        events: db.prepare('SELECT count(*) n FROM events').get().n,
        idempotency: db.prepare('SELECT count(*) n FROM idempotency_records').get().n,
        membership: db.prepare('SELECT * FROM memberships WHERE space_id=?').all(spaceId),
        consumer: db.prepare('SELECT * FROM consumers WHERE subscription_id IN (SELECT id FROM subscriptions WHERE space_id=?)').all(spaceId),
      });

      const actorRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/actors',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { kind: 'agent', display_name: 'AD01 Actor' },
      });
      const aid = JSON.parse(actorRes.body).data.id;
      const memRes = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/memberships`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { actor_id: aid, role: 'contributor' },
      });
      expect(memRes.statusCode).toBe(201);
      const subRes = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/subscriptions`,
        headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': 'sub-ad01' },
        payload: { consumer_key: 'ad01', start: 'now' },
      });
      const cid = JSON.parse(subRes.body).data.consumer.id;

      // 1. POST /spaces with ?bogus=1
      const before1 = snapshot();
      const r1 = await app.inject({
        method: 'POST',
        url: '/api/v1/spaces?bogus=1',
        headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': 'spc-ad01-bogus' },
        payload: { slug: 'spc-ad01-bogus', objective: 'test', rules: [] },
      });
      expect(r1.statusCode).toBe(400);
      expect(JSON.stringify(before1)).toBe(JSON.stringify(snapshot()));

      // 2. DELETE membership with { bogus: true }
      const before2 = snapshot();
      const r2 = await app.inject({
        method: 'DELETE',
        url: `/api/v1/spaces/${spaceId}/memberships/${aid}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { bogus: true },
      });
      expect(r2.statusCode).toBe(400);
      expect(JSON.stringify(before2)).toBe(JSON.stringify(snapshot()));

      // 3. DELETE consumer with { bogus: true }
      const before3 = snapshot();
      const r3 = await app.inject({
        method: 'DELETE',
        url: `/api/v1/spaces/${spaceId}/consumers/${cid}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { bogus: true },
      });
      expect(r3.statusCode).toBe(400);
      expect(JSON.stringify(before3)).toBe(JSON.stringify(snapshot()));

      // 4. Valid no-body requests (undefined, {}, and null) are accepted
      const rValidEmpty = await app.inject({
        method: 'DELETE',
        url: `/api/v1/spaces/${spaceId}/memberships/${aid}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {},
      });
      expect(rValidEmpty.statusCode).toBe(200);

      const rValidNull = await app.inject({
        method: 'DELETE',
        url: `/api/v1/spaces/${spaceId}/consumers/${cid}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: null,
      });
      expect(rValidNull.statusCode).toBe(200);
    });

    it('C01-7: API-v1 OpenAPI 3.1 body constraints agree with existing protocol and HTTP (AD02)', async () => {
      const spec = generateOpenApiSpec();
      expect(spec.openapi).toBe('3.1.0');
      const operations = apiV1Operations(spec as {servers?:Array<{url:string}>;paths:Record<string,Record<string,any>>});
      expect(operations.map(o => `${o.method} ${o.path}`).sort()).toEqual(routeContracts.map(r => `${r.method} ${r.path}`).sort());
      for (const route of routeContracts) {
        const schema = (spec.paths as any)[route.path][route.method].requestBody?.content?.['application/json']?.schema ?? null;
        expect(JSON.parse(JSON.stringify(schema))).toEqual(JSON.parse(JSON.stringify(route.body)));
      }

      const bodyOps = operations.filter((o) => o.op.requestBody?.content?.['application/json']);

      const placeholderBodies = bodyOps.filter(
        (o) => JSON.stringify(o.op.requestBody.content['application/json'].schema) === '{"type":"object"}'
      );
      expect(placeholderBodies.length).toBe(0);

      // Verify Ajv compilation of /spaces schema matches CreateSpaceRequestSchema and HTTP inject
      const schema = (spec.paths as any)['/spaces'].post.requestBody.content['application/json'].schema;
      const { createRequire } = await import('node:module');
      const serverRequire = createRequire(new URL('../../packages/server/dist/app.js', import.meta.url));
      const fastifyRequire = createRequire(serverRequire.resolve('fastify'));
      const compilerRequire = createRequire(fastifyRequire.resolve('@fastify/ajv-compiler'));
      const Ajv = compilerRequire('ajv');
      const ajv = new Ajv({ coerceTypes: false, removeAdditional: false, useDefaults: true, strict: false });
      const specValidator = ajv.compile({ ...schema, components: (spec as any).components ?? {} });
      const protocolValidator = ajv.compile(CreateSpaceRequestSchema);

      const testCases = [
        { name: 'missing_required_fields', body: {} },
        { name: 'wrong_field_type', body: { slug: 42, objective: 'review', rules: [] } },
        { name: 'unknown_body_field', body: { slug: 'valid', objective: 'review', rules: [], bogus: 1 } },
        { name: 'valid_body', body: { slug: 'valid-openapi-body', objective: 'review', rules: [] } },
      ];

      for (const tc of testCases) {
        const specValid = Boolean(specValidator(structuredClone(tc.body)));
        const protocolValid = Boolean(protocolValidator(tc.body));
        const r = await app.inject({
          method: 'POST',
          url: '/api/v1/spaces',
          headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': `r21-tc-${tc.name}` },
          payload: tc.body,
        });
        const httpValid = r.statusCode >= 200 && r.statusCode < 300;
        expect(specValid).toBe(protocolValid);
        expect(protocolValid).toBe(httpValid);
      }
    });

    it('C01-8: API-v1 OpenAPI route parameter bounds, search kind enum, anonymous capabilities, and body requirements (AE03)', async () => {
      const spec = generateOpenApiSpec();
      const serverRequire = createRequire(new URL('../../packages/server/dist/app.js', import.meta.url));
      const fastifyRequire = createRequire(serverRequire.resolve('fastify'));
      const compilerRequire = createRequire(fastifyRequire.resolve('@fastify/ajv-compiler'));
      const Ajv = compilerRequire('ajv');
      const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false });

      // 1. limit_lower_bound: query limit=0 must be rejected by OpenAPI schema AND server returns 400
      const limitParam = (spec.paths as any)['/spaces'].get.parameters.find(
        (p: any) => p.in === 'query' && p.name === 'limit'
      );
      expect(limitParam).toBeDefined();
      const limitValid = ajv.compile(limitParam.schema)(0);
      const limitRes = await app.inject({
        method: 'GET',
        url: '/api/v1/spaces?limit=0',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(limitValid).toBe(limitRes.statusCode < 400);
      expect(limitRes.statusCode).toBe(400);

      // 2. search_kind_enum: query kind=bogus must be rejected by OpenAPI schema AND server returns 400
      const searchKindParam = (spec.paths as any)['/spaces/{space_id}/search'].get.parameters.find(
        (p: any) => p.in === 'query' && p.name === 'kind'
      );
      expect(searchKindParam).toBeDefined();
      const kindValid = ajv.compile(searchKindParam.schema)('bogus');
      const searchRes = await app.inject({
        method: 'GET',
        url: `/api/v1/spaces/${spaceId}/search?q=test&kind=bogus`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(kindValid).toBe(searchRes.statusCode < 400);
      expect(searchRes.statusCode).toBe(400);

      // 3. anonymous_capabilities: /capabilities permits anonymous access in OpenAPI AND server returns 200 without token
      const capSecurity = (spec.paths as any)['/capabilities'].get.security ?? (spec as any).security;
      const permitsAnonymous = capSecurity === undefined || capSecurity.length === 0 || capSecurity.some((s: any) => Object.keys(s).length === 0);
      const capRes = await app.inject({ method: 'GET', url: '/api/v1/capabilities' });
      expect(permitsAnonymous).toBe(true);
      expect(capRes.statusCode).toBe(200);

      // 4. subscribe_without_key: /spaces/{space_id}/subscriptions does NOT require Idempotency-Key in OpenAPI AND succeeds without it
      const subRequiresKey = (spec.paths as any)['/spaces/{space_id}/subscriptions'].post.parameters.some(
        (p: any) => p.in === 'header' && p.name.toLowerCase() === 'idempotency-key' && p.required
      );
      const subRes = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/subscriptions`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { consumer_key: 'test-cons', start: 'now' },
      });
      expect(subRequiresKey).toBe(false);
      expect(subRes.statusCode).toBe(201);
      const consumerId = subRes.json().data.consumer.id;

      // 5. poll_without_body: raw HTTP poll without body is rejected (400) AND openapi requires requestBody
      const pollRequiresBody = (spec.paths as any)['/spaces/{space_id}/consumers/{id}/poll'].post.requestBody.required === true;
      const pollNoBody = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/consumers/${consumerId}/poll`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(pollRequiresBody).toBe(pollNoBody.statusCode >= 400);
      expect(pollNoBody.statusCode).toBe(400);

      // poll with {} succeeds
      const pollEmptyObj = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${spaceId}/consumers/${consumerId}/poll`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {},
      });
      expect(pollEmptyObj.statusCode).toBe(200);

      // 6. Compare complete actual and declared method/path sets.
      const specPaths = apiV1Operations(spec as {servers?:Array<{url:string}>;paths:Record<string,Record<string,any>>}).map(({method,path})=>`${method} ${path}`).sort();
      expect(specPaths).toEqual(routeContracts.map(r => `${r.method} ${r.path}`).sort());
    });
  });

  describe('C02: Client Response Envelope, Error Classification, and Lifecycle', () => {
    it('C02-1: HTTP 200/201 with malformed JSON rejects with ClientProtocolError', async () => {
      const savedFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () => {
          return new Response('{"data":', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;

        const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });
        await expect(testClient.request({ method: 'GET', path: '/test' })).rejects.toThrow(
          ClientProtocolError
        );
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-2: Missing envelope fields (api_version, request_id, data) reject with ClientProtocolError', async () => {
      const savedFetch = globalThis.fetch;
      try {
        const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });

        // Missing data
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r1' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;
        try {
          await testClient.request({ method: 'GET', path: '/test' });
          expect.unreachable('Should fail on missing data');
        } catch (err: any) {
          expect(err).toBeInstanceOf(ClientProtocolError);
        }

        // Missing api_version
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({ request_id: 'r1', data: { ok: true } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;
        try {
          await testClient.request({ method: 'GET', path: '/test' });
          expect.unreachable('Should fail on missing api_version');
        } catch (err: any) {
          expect(err).toBeInstanceOf(ClientProtocolError);
        }

        // Wrong api_version
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({ api_version: '999', request_id: 'r1', data: { ok: true } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;
        await expect(testClient.request({ method: 'GET', path: '/test' })).rejects.toThrow(ClientProtocolError);

        // Null request_id
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({ api_version: '1', request_id: null, data: { ok: true } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;
        await expect(testClient.request({ method: 'GET', path: '/test' })).rejects.toThrow(ClientProtocolError);

        // Error present on 200 response
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({
            api_version: '1',
            request_id: 'r1',
            data: null,
            error: { code: 'FORBIDDEN', message: 'denied', retryable: false },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;
        await expect(testClient.request({ method: 'GET', path: '/test' })).rejects.toThrow(ClientProtocolError);
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-3: Strictly preserves valid falsy data values and allows forward-compatible envelope fields', async () => {
      const savedFetch = globalThis.fetch;
      try {
        const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });

        // data: null
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({
              api_version: '1',
              request_id: 'r-null',
              data: null,
              future_extension: 'allowed',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;
        const resNull = await testClient.request({ method: 'GET', path: '/test' });
        expect(resNull.data).toBe(null);

        // data: false
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({ api_version: '1', request_id: 'r-false', data: false }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;
        const resFalse = await testClient.request({ method: 'GET', path: '/test' });
        expect(resFalse.data).toBe(false);

        // data: 0
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({ api_version: '1', request_id: 'r-0', data: 0 }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;
        const resZero = await testClient.request({ method: 'GET', path: '/test' });
        expect(resZero.data).toBe(0);

        // data: []
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({ api_version: '1', request_id: 'r-arr', data: [] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;
        const resArr = await testClient.request({ method: 'GET', path: '/test' });
        expect(resArr.data).toEqual([]);
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-4: Distinguishes UserAbortError from TimeoutError', async () => {
      // User abort
      const ctl = new AbortController();
      ctl.abort();
      await expect(client.getCapabilities({ signal: ctl.signal })).rejects.toThrow(
        UserAbortError
      );

      // Timeout abort
      const slowClient = new DetunedClient({
        baseUrl: `http://127.0.0.1:${port}`,
        timeoutMs: 1, // instant timeout
        maxRetries: 0,
      });

      const savedFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async (_url: any, opts: any) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          if (opts.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r', data: {} }));
        }) as any;

        const promise = slowClient.request({ method: 'GET', path: '/test' });
        await expect(promise).rejects.toThrow(TimeoutError);
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-5: Abort listener and timer are cleanly removed in all 5 cancellation phases and on settle', async () => {
      const { getEventListeners } = await import('node:events');

      // 1. Success settle
      const ctl0 = new AbortController();
      const res0 = await client.getCapabilities({ signal: ctl0.signal });
      expect(res0.data.api_version).toBe('1');
      expect(getEventListeners(ctl0.signal, 'abort').length).toBe(0);

      // 2. before_request
      const ctl1 = new AbortController();
      ctl1.abort();
      await expect(client.getCapabilities({ signal: ctl1.signal })).rejects.toThrow(UserAbortError);
      expect(getEventListeners(ctl1.signal, 'abort').length).toBe(0);

      const savedFetch = globalThis.fetch;
      try {
        // 3. headers phase abort
        const ctl2 = new AbortController();
        globalThis.fetch = (async (_url: any, opts: any) => {
          ctl2.abort();
          if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r', data: {} }));
        }) as any;
        await expect(client.getCapabilities({ signal: ctl2.signal })).rejects.toThrow(UserAbortError);
        expect(getEventListeners(ctl2.signal, 'abort').length).toBe(0);

        // 4. body phase abort
        const ctl3 = new AbortController();
        globalThis.fetch = (async (_url: any, opts: any) => {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => {
              ctl3.abort();
              throw new DOMException('Aborted', 'AbortError');
            },
          };
        }) as any;
        await expect(client.getCapabilities({ signal: ctl3.signal })).rejects.toThrow(UserAbortError);
        expect(getEventListeners(ctl3.signal, 'abort').length).toBe(0);

        // 5. Cancel only after the completed 503 attempt has established backoff.
        const ctl4 = new AbortController();
        const retryClient = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 30000, maxRetries: 1 });
        let backoffCalls = 0;
        let bodyRead = false;
        let attemptSignal: AbortSignal | undefined;
        const timers = new Map<object, { fn: () => void; delay: number }>();
        const savedSetTimeout = globalThis.setTimeout;
        const savedClearTimeout = globalThis.clearTimeout;
        let waiting!: () => void;
        const backoffEstablished = new Promise<void>((resolve) => { waiting = resolve; });
        try {
          globalThis.setTimeout = ((fn: () => void, delay: number) => {
            const handle = {};
            timers.set(handle, { fn, delay });
            if (delay < 30000) waiting();
            return handle;
          }) as any;
          globalThis.clearTimeout = ((handle: object) => { timers.delete(handle); }) as any;
          globalThis.fetch = (async (_url: any, opts: any) => {
            backoffCalls++;
            attemptSignal = opts.signal;
            return {
              ok: false, status: 503, headers: new Headers(),
              json: async () => {
                bodyRead = true;
                return { api_version: '1', request_id: 'r-bo', error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true } };
              },
            };
          }) as any;
          const request = retryClient.request({ method: 'GET', path: '/test', signal: ctl4.signal });
          const result = request.then(() => undefined, (err) => err);
          await backoffEstablished;
          // Allow sleepWithAbort to finish adding its distinct listener.
          await Promise.resolve();
          expect(bodyRead).toBe(true);
          expect(backoffCalls).toBe(1);
          expect([...timers.values()].map((timer) => timer.delay)).toEqual([expect.any(Number)]);
          expect([...timers.values()][0].delay).toBeLessThan(30000);
          expect(attemptSignal?.aborted).toBe(false);
          expect(getEventListeners(ctl4.signal, 'abort').length).toBe(1);
          ctl4.abort();
          expect(await result).toBeInstanceOf(UserAbortError);
          expect(backoffCalls).toBe(1);
          expect(timers.size).toBe(0);
          expect(getEventListeners(ctl4.signal, 'abort').length).toBe(0);
          expect(attemptSignal?.aborted).toBe(false);
        } finally {
          globalThis.setTimeout = savedSetTimeout;
          globalThis.clearTimeout = savedClearTimeout;
        }

        // 6. timeout phase
        const timeoutClient = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 1, maxRetries: 0 });
        const ctl5 = new AbortController();
        globalThis.fetch = (async (_url: any, opts: any) => {
          await new Promise((r) => setTimeout(r, 20));
          if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r', data: {} }));
        }) as any;
        await expect(timeoutClient.request({ method: 'GET', path: '/test', signal: ctl5.signal })).rejects.toThrow(TimeoutError);
        expect(getEventListeners(ctl5.signal, 'abort').length).toBe(0);
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-6: Bounded retries maintain original requestKey and terminate at maxRetries', async () => {
      const savedFetch = globalThis.fetch;
      let callCount = 0;
      const seenKeys: string[] = [];
      try {
        globalThis.fetch = (async (_url: any, opts: any) => {
          callCount++;
          seenKeys.push(opts.headers['Idempotency-Key']);
          return new Response(
            JSON.stringify({
              api_version: '1',
              request_id: `r-${callCount}`,
              error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'Busy', retryable: true },
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;

        const retryClient = new DetunedClient({
          baseUrl: 'http://unused.invalid',
          maxRetries: 2,
        });

        await expect(
          retryClient.request({
            method: 'POST',
            path: '/test',
            requestKey: 'my-fixed-idem-key',
          })
        ).rejects.toThrow(DetunedError);

        expect(callCount).toBe(3); // 1 initial + 2 retries
        expect(seenKeys).toEqual(['my-fixed-idem-key', 'my-fixed-idem-key', 'my-fixed-idem-key']);
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-7: Preserves server REVISION_CONFLICT error independently of message wording', async () => {
      const savedFetch = globalThis.fetch;
      try {
        const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });

        for (const message of ['revision conflict', 'transaction aborted because revision changed']) {
          globalThis.fetch = (async () => {
            return new Response(
              JSON.stringify({
                api_version: '1',
                request_id: 'r-conflict',
                error: {
                  code: 'REVISION_CONFLICT',
                  message,
                  retryable: false,
                  details: { current_revision: 2 },
                },
              }),
              { status: 409, headers: { 'Content-Type': 'application/json' } }
            );
          }) as any;

          try {
            await testClient.request({ method: 'POST', path: '/test', requestKey: 'r20-test-key' });
            expect.unreachable('Should have thrown DetunedError');
          } catch (err: any) {
            expect(err).toBeInstanceOf(DetunedError);
            expect(err.code).toBe('REVISION_CONFLICT');
            expect(err.statusCode).toBe(409);
            expect((err as any).isUserAbort).toBeFalsy();
          }
        }
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-8: Network and Retry-After retry policies', async () => {
      const savedFetch = globalThis.fetch;
      const realSetTimeout = globalThis.setTimeout;
      try {
        // 1. fetch_cause_econnrefused
        let calls1 = 0;
        globalThis.fetch = (async () => {
          calls1++;
          if (calls1 === 1) {
            throw new TypeError('fetch failed', {
              cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
            });
          }
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r1', data: { ok: true } }));
        }) as any;

        const client1 = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 1 });
        const res1 = await client1.request({ method: 'POST', path: '/test', requestKey: 'key-1' });
        expect(res1.data).toEqual({ ok: true });
        expect(calls1).toBe(2);

        // 2. retryable_400 does NOT retry
        let calls2 = 0;
        globalThis.fetch = (async () => {
          calls2++;
          return new Response(
            JSON.stringify({
              api_version: '1',
              request_id: 'r2',
              error: { code: 'VALIDATION_ERROR', message: 'bad input', retryable: true },
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;

        const client2 = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 1 });
        await expect(client2.request({ method: 'POST', path: '/test' })).rejects.toThrow(DetunedError);
        expect(calls2).toBe(1);

        // 3. retry_after_503 schedules delay >= 60000ms
        const scheduledDelays: number[] = [];
        globalThis.setTimeout = ((fn: any, delay: number, ...args: any[]) => {
          scheduledDelays.push(delay);
          return realSetTimeout(fn, 0, ...args);
        }) as any;

        let calls3 = 0;
        globalThis.fetch = (async () => {
          calls3++;
          if (calls3 === 1) {
            return new Response(
              JSON.stringify({
                api_version: '1',
                request_id: 'r3',
                error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true },
              }),
              { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
            );
          }
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r3', data: { ok: true } }));
        }) as any;

        const client3 = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 1 });
        const res3 = await client3.request({ method: 'POST', path: '/test' });
        expect(res3.data).toEqual({ ok: true });
        expect(calls3).toBe(2);
        expect(scheduledDelays.some((d) => d >= 60000)).toBe(true);
      } finally {
        globalThis.fetch = savedFetch;
        globalThis.setTimeout = realSetTimeout;
      }
    });

    it('C02-9: Unsolicited AbortError and network failures are distinguished from user abort and server DetunedError (AD03)', async () => {
      const client0 = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 0 });
      const ctl = new AbortController();
      const savedFetch = globalThis.fetch;

      try {
        // 1. Unsolicited AbortError (external signal not aborted, not timed out)
        globalThis.fetch = (async () => {
          throw new DOMException('upstream stopped', 'AbortError');
        }) as any;
        let unsolicitedErr: any;
        try {
          await client0.getCapabilities({ signal: ctl.signal });
          expect.unreachable('Should fail');
        } catch (e) {
          unsolicitedErr = e;
        }
        expect(unsolicitedErr).toBeInstanceOf(ClientTransportError);
        expect(unsolicitedErr.isUserAbort).toBe(false);
        expect(unsolicitedErr.isTimeout).toBe(false);
        expect(unsolicitedErr.isTransportError).toBe(true);

        // 2. Network error
        globalThis.fetch = (async () => {
          throw new TypeError('fetch failed', {
            cause: Object.assign(new Error('reset'), { code: 'ECONNRESET' }),
          });
        }) as any;
        let transportErr: any;
        try {
          await client0.getCapabilities();
          expect.unreachable('Should fail');
        } catch (e) {
          transportErr = e;
        }
        expect(transportErr).toBeInstanceOf(ClientTransportError);
        expect(transportErr.isTransportError).toBe(true);
        expect(transportErr.isDetunedError).toBe(false);

        // 3. Real server 503
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({
              api_version: '1',
              request_id: 'r-503',
              error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true },
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;
        let serverErr: any;
        try {
          await client0.getCapabilities();
          expect.unreachable('Should fail');
        } catch (e) {
          serverErr = e;
        }
        expect(serverErr).toBeInstanceOf(DetunedError);
        expect(serverErr.isDetunedError).toBe(true);
        expect(serverErr.isTransportError).toBe(false);

        // Classification must be distinct
        const classification = (e: any) =>
          JSON.stringify([e.name, e.kind, e.isTransportError, e.isDetunedError]);
        expect(classification(transportErr)).not.toBe(classification(serverErr));

        // 4. Server 409 REVISION_CONFLICT with "aborted" message preserves code and details
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({
              api_version: '1',
              request_id: 'r-409',
              error: {
                code: 'REVISION_CONFLICT',
                message: 'transaction aborted because revision changed',
                retryable: false,
                details: { current_revision: 2 },
              },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }) as any;
        let conflictErr: any;
        try {
          await client0.getCapabilities();
          expect.unreachable('Should fail');
        } catch (e) {
          conflictErr = e;
        }
        expect(conflictErr).toBeInstanceOf(DetunedError);
        expect(conflictErr.code).toBe('REVISION_CONFLICT');
        expect(conflictErr.statusCode).toBe(409);
        expect(conflictErr.retryable).toBe(false);
        expect(conflictErr.details).toEqual({ current_revision: 2 });
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C02-10: Single attempt timeout timer and external abort listener are cleared before backoff starts (AD04)', async () => {
      const { getEventListeners } = await import('node:events');
      const timers = new Map<number, { fn: (...args: any[]) => void; args: any[]; at: number; delay: number }>();
      let nextId = 1;
      let now = 0;
      const realSetTimeout = globalThis.setTimeout;
      const realClearTimeout = globalThis.clearTimeout;
      const realRandom = Math.random;

      globalThis.setTimeout = ((fn: any, delay: number, ...args: any[]) => {
        const id = nextId++;
        timers.set(id, { fn, args, at: now + Number(delay), delay: Number(delay) });
        return id as any;
      }) as any;
      globalThis.clearTimeout = ((id: any) => {
        timers.delete(id);
      }) as any;
      Math.random = () => 0;

      const flush = async () => {
        for (let i = 0; i < 24; i++) await Promise.resolve();
      };
      const advance = async (to: number) => {
        for (;;) {
          const entry = [...timers].filter(([, t]) => t.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
          if (!entry) break;
          const [id, t] = entry;
          timers.delete(id);
          now = t.at;
          t.fn(...t.args);
          await flush();
        }
        now = to;
        await flush();
      };

      const ctl = new AbortController();
      let calls = 0;
      const attempts: Array<{ at: number; signal: AbortSignal; key: string }> = [];
      let settled = false;

      const savedFetch = globalThis.fetch;
      globalThis.fetch = (async (_url: any, opts: any) => {
        calls++;
        attempts.push({ at: now, signal: opts.signal, key: opts.headers['Idempotency-Key'] });
        return calls === 1
          ? new Response(
              JSON.stringify({
                api_version: '1',
                request_id: 'r21-c10',
                error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true },
              }),
              { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
            )
          : new Response(JSON.stringify({ api_version: '1', request_id: 'r21-c10', data: { ok: true } }));
      }) as any;

      const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 30000, maxRetries: 1 });
      const p = testClient.request({ method: 'POST', path: '/test', requestKey: 'stable-r21', signal: ctl.signal });
      p.then(() => {
        settled = true;
      });

      try {
        await flush();
        // At backoff start: 30000ms attempt timeout MUST NOT be pending, external abort listener <= 1
        const pendingDelays = [...timers.values()].map((t) => t.delay);
        expect(pendingDelays.includes(30000)).toBe(false);
        expect(getEventListeners(ctl.signal, 'abort').length).toBeLessThanOrEqual(1);

        await advance(30000);
        // At 30s: attempt 1 signal must NOT have been aborted by timeout
        expect(settled).toBe(false);
        expect(calls).toBe(1);
        expect(attempts[0]?.signal.aborted).toBe(false);

        await advance(60000);
        if (!settled) {
          ctl.abort();
          await flush();
        }
        const result = await p;
        expect(result.data).toEqual({ ok: true });
        expect(calls).toBe(2);
        expect(timers.size).toBe(0);
        expect(getEventListeners(ctl.signal, 'abort').length).toBe(0);
      } finally {
        ctl.abort();
        timers.clear();
        globalThis.fetch = savedFetch;
        globalThis.setTimeout = realSetTimeout;
        globalThis.clearTimeout = realClearTimeout;
        Math.random = realRandom;
      }
    });

    it('C02-11: Oversized Retry-After stops automatic retries safely without Node timer overflow (AD05)', async () => {
      const { getEventListeners } = await import('node:events');
      const ctl = new AbortController();
      let calls = 0;
      const schedule: Array<{ requested_delay_ms: number; observed_node_delay_ms: any }> = [];

      const realSetTimeout = globalThis.setTimeout;
      const realClearTimeout = globalThis.clearTimeout;
      const guard = realSetTimeout(() => ctl.abort(), 100);

      globalThis.setTimeout = ((fn: any, delay: number, ...args: any[]) => {
        const timer = realSetTimeout(fn, delay, ...args);
        schedule.push({ requested_delay_ms: delay, observed_node_delay_ms: (timer as any)._idleTimeout });
        return timer;
      }) as any;

      const savedFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        calls++;
        return calls === 1
          ? new Response(
              JSON.stringify({
                api_version: '1',
                request_id: 'r21-ad05',
                error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true },
              }),
              { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '2147484' } }
            )
          : new Response(JSON.stringify({ api_version: '1', request_id: 'r21-ad05', data: { ok: true } }));
      }) as any;

      const client0 = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
      try {
        await expect(client0.getCapabilities({ signal: ctl.signal })).rejects.toThrow(DetunedError);
        expect(calls).toBe(1);
        expect(getEventListeners(ctl.signal, 'abort').length).toBe(0);
      } finally {
        realClearTimeout(guard);
        ctl.abort();
        globalThis.fetch = savedFetch;
        globalThis.setTimeout = realSetTimeout;
        globalThis.clearTimeout = realClearTimeout;
      }
    });

    it('C02-12: Cancellation and timeout win over pending body fulfillment on 200 and 409 responses (AE01)', async () => {
      const savedFetch = globalThis.fetch;
      const savedSetTimeout = globalThis.setTimeout;
      const savedClearTimeout = globalThis.clearTimeout;

      try {
        for (const mode of ['user', 'timeout']) {
          for (const status of [200, 409]) {
            const timers = new Map();
            let nextId = 1;
            let calls = 0;
            let requestSignal: AbortSignal | undefined;

            globalThis.setTimeout = ((fn: any, delay: number, ...args: any[]) => {
              const id = nextId++;
              timers.set(id, { fn, delay });
              return {
                id,
                unref() { return this; },
                ref() { return this; },
                [Symbol.toPrimitive]() { return id; },
              };
            }) as any;
            globalThis.clearTimeout = ((obj: any) => {
              const id = typeof obj === 'object' && obj !== null ? obj.id : obj;
              timers.delete(id);
              savedClearTimeout(obj);
            }) as any;

            const ctl = new AbortController();
            globalThis.fetch = (async (_url: any, options: any) => {
              calls++;
              requestSignal = options.signal;
              return {
                ok: status === 200,
                status,
                headers: new Headers(),
                json: async () => {
                  await Promise.resolve();
                  if (mode === 'user') {
                    ctl.abort();
                  } else {
                    const pending = [...timers][0];
                    if (!pending) throw new Error('No request timeout was armed');
                    timers.delete(pending[0]);
                    pending[1].fn();
                  }
                  return status === 200
                    ? { api_version: '1', request_id: 'ae01', data: { ok: true } }
                    : {
                        api_version: '1',
                        request_id: 'ae01',
                        error: {
                          code: 'REVISION_CONFLICT',
                          message: 'transaction aborted because revision changed',
                          retryable: false,
                          details: { current_revision: 2 },
                        },
                      };
                },
              };
            }) as any;

            const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 1000, maxRetries: 0 });
            let resultErr: any;
            try {
              await testClient.getCapabilities({ signal: ctl.signal });
            } catch (err) {
              resultErr = err;
            }

            const expectedName = mode === 'user' ? 'UserAbortError' : 'TimeoutError';
            expect(resultErr).toBeDefined();
            expect(resultErr.name).toBe(expectedName);
            expect(calls).toBe(1);
            expect(timers.size).toBe(0);
            const { getEventListeners } = await import('node:events');
            expect(getEventListeners(ctl.signal, 'abort').length).toBe(0);
          }
        }
      } finally {
        globalThis.fetch = savedFetch;
        globalThis.setTimeout = savedSetTimeout;
        globalThis.clearTimeout = savedClearTimeout;
      }
    });

    it('C02-13: Body stream transport classification, unsolicited abort, and retry allowlist (AE02)', async () => {
      const savedFetch = globalThis.fetch;
      const savedSetTimeout = globalThis.setTimeout;

      globalThis.setTimeout = ((fn: any, _delay: number, ...args: any[]) => savedSetTimeout(fn, 0, ...args)) as any;
      const reset = new TypeError('terminated', { cause: Object.assign(new Error('socket closed'), { code: 'UND_ERR_SOCKET' }) });
      const abort = new DOMException('upstream stopped', 'AbortError');
      const expired = new TypeError('fetch failed', { cause: Object.assign(new Error('certificate expired'), { code: 'CERT_HAS_EXPIRED' }) });
      const brokenBody = (error: any) => new Response(new ReadableStream({ start(controller) { controller.error(error); } }), { status: 200 });

      try {
        // 1. body_socket_final_classification
        {
          let calls = 0;
          globalThis.fetch = (async () => {
            calls++;
            return brokenBody(reset);
          }) as any;
          const c = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 0 });
          let caught: any;
          try {
            await c.request({ method: 'POST', path: '/test', requestKey: 'r22-stable' });
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(ClientTransportError);
          expect(calls).toBe(1);
          expect(caught.cause?.cause?.code).toBe('UND_ERR_SOCKET');
        }

        // 2. body_unsolicited_abort
        {
          let calls = 0;
          globalThis.fetch = (async () => {
            calls++;
            return brokenBody(abort);
          }) as any;
          const c = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 0 });
          let caught: any;
          try {
            await c.request({ method: 'POST', path: '/test', requestKey: 'r22-stable' });
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(ClientTransportError);
          expect(calls).toBe(1);
        }

        // 3. body_socket_retry_recovers
        {
          let calls = 0;
          const keys: string[] = [];
          globalThis.fetch = (async (_url: any, opts: any) => {
            calls++;
            keys.push(opts.headers['Idempotency-Key']);
            if (calls === 1) return brokenBody(reset);
            return new Response(JSON.stringify({ api_version: '1', request_id: 'r', data: { recovered: true } }));
          }) as any;
          const c = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
          const res = await c.request<any>({ method: 'POST', path: '/test', requestKey: 'r22-stable' });
          expect(res.data.recovered).toBe(true);
          expect(calls).toBe(2);
          expect(keys).toEqual(['r22-stable', 'r22-stable']);
        }

        // A known non-retryable HTTP status wins over interrupted error body.
        {
          let calls = 0;
          globalThis.fetch = (async () => {
            calls++;
            return new Response(new ReadableStream({ start(controller) { controller.error(reset); } }), { status: 409 });
          }) as any;
          const c = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
          const caught = await c.request({ method: 'POST', path: '/test', requestKey: 'r23-stable' })
            .then(() => undefined, (err: unknown) => err);
          expect(caught).toBeInstanceOf(DetunedError);
          expect(caught).toMatchObject({ statusCode: 409, retryable: false });
          expect(calls).toBe(1);
        }

        // 4. permanent_tls_does_not_retry
        {
          let calls = 0;
          globalThis.fetch = (async () => {
            calls++;
            throw expired;
          }) as any;
          const c = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
          let caught: any;
          try {
            await c.request({ method: 'POST', path: '/test', requestKey: 'r22-stable' });
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(ClientTransportError);
          expect(caught.retryable).toBe(false);
          expect(calls).toBe(1);
        }

        // 5. complete_bad_json_positive
        {
          let calls = 0;
          globalThis.fetch = (async () => {
            calls++;
            return new Response('{', { status: 200 });
          }) as any;
          const c = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
          let caught: any;
          try {
            await c.getCapabilities();
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(ClientProtocolError);
          expect(calls).toBe(1);
        }
      } finally {
        globalThis.fetch = savedFetch;
        globalThis.setTimeout = savedSetTimeout;
      }
    });

    it('C02-14: Finite Retry-After positive controls: HTTP-date, invalid fallback, and date over budget (AE05)', async () => {
      const savedFetch = globalThis.fetch;
      const savedSetTimeout = globalThis.setTimeout;
      const savedNow = Date.now;
      const savedRandom = Math.random;

      const now = Date.UTC(2026, 9, 2, 0, 0, 0);
      Date.now = () => now;
      Math.random = () => 0;

      const cases = [
        { name: 'http_date', header: new Date(now + 5000).toUTCString(), expectedDelay: 5000, expectedCalls: 2 },
        { name: 'invalid_header', header: 'not-a-date-or-seconds', expectedDelay: 1000, expectedCalls: 2 },
        { name: 'date_over_budget', header: new Date(now + 121000).toUTCString(), expectedDelay: null, expectedCalls: 1 },
      ];

      try {
        for (const tc of cases) {
          const delays: number[] = [];
          let calls = 0;
          globalThis.setTimeout = ((fn: any, delay: number, ...args: any[]) => {
            if (delay <= 10000) {
              delays.push(delay);
              return savedSetTimeout(fn, 0, ...args);
            }
            return savedSetTimeout(fn, delay, ...args);
          }) as any;
          globalThis.fetch = (async () => {
            calls++;
            if (calls === 1) {
              return new Response(
                JSON.stringify({ api_version: '1', request_id: 'r', error: { code: 'TEMPORARILY_UNAVAILABLE', message: 'busy', retryable: true } }),
                { status: 503, headers: { 'Retry-After': tc.header, 'Content-Type': 'application/json' } }
              );
            }
            return new Response(JSON.stringify({ api_version: '1', request_id: 'r', data: { ok: true } }));
          }) as any;

          const testClient = new DetunedClient({ baseUrl: 'http://unused.invalid', timeoutMs: 0, maxRetries: 1 });
          let res: any;
          let err: any;
          try {
            res = await testClient.getCapabilities();
          } catch (e) {
            err = e;
          }

          expect(calls).toBe(tc.expectedCalls);
          expect(delays).toEqual(tc.expectedDelay === null ? [] : [tc.expectedDelay]);
          if (tc.expectedCalls === 2) {
            expect(res).toBeDefined();
          } else {
            expect(err).toBeInstanceOf(DetunedError);
          }
        }
      } finally {
        globalThis.fetch = savedFetch;
        globalThis.setTimeout = savedSetTimeout;
        Date.now = savedNow;
        Math.random = savedRandom;
      }
    });
  });

  describe('C03: Pi Adapter Headless Output & Compatibility', () => {
    // These responses support the new lazy identity/session preflight. They are
    // ordinary wire fixtures, not a bypass of the original business assertions.
    const piFixtureMe = () => ({
      actor: { display_name: 'Gate Actor', id: 'act-gate', kind: 'agent', created_at: '2026-10-09T00:00:00Z', disabled_at: null },
      capabilities: ['read', 'write'], allowed_space_ids: [spaceId],
      visible_spaces: [{ id: spaceId, slug: 'gate', role: 'contributor' }],
    });
    const piFixtureSession = () => ({ id: 'ses-gate', actor_id: 'act-gate', space_id: spaceId,
      client_name: 'detuned-pi', client_version: '0.1.0', harness_session_id: null, metadata: {}, created_at: '2026-10-09T00:00:00Z' });
    it('C03-1: Both Pi commands report exact content and isolated channels in all 8 UI/headless success/failure combinations', async () => {
      const savedFetch = globalThis.fetch;
      const oldBaseUrl = process.env.DETUNED_BASE_URL;
      const oldToken = process.env.DETUNED_TOKEN;
      process.env.DETUNED_BASE_URL = 'http://unused.invalid';
      process.env.DETUNED_TOKEN = 'controlled-token';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const commands = new Map<string, any>();
      activate({ registerTool() {}, registerCommand(name: string, command: any) { commands.set(name, command); }, on() {} } as any);
      try {
        for (const name of ['forum-check', 'forum-status']) {
          for (const hasUI of [true, false]) {
            for (const success of [true, false]) {
              logSpy.mockClear();
              errorSpy.mockClear();
              const notify = vi.fn();
              let calls = 0;
              globalThis.fetch = (async (url: any) => {
                calls++;
                expect(String(url)).toBe(`http://unused.invalid/api/v1/${name === 'forum-check' ? 'capabilities' : 'me'}`);
                return new Response(JSON.stringify(success
                  ? { api_version: '1', request_id: 'r', data: name === 'forum-check'
                    ? { server_version: 'gate-test', api_version: '1' }
                    : piFixtureMe() }
                  : { api_version: '1', request_id: 'r', error: { code: 'VALIDATION_ERROR', message: 'controlled failure', retryable: false } }),
                  { status: success ? 200 : 400 });
              }) as any;
              const message = name === 'forum-check'
                ? success ? 'Detuned API 正常。版本: gate-test, API: v1' : 'Detuned 连通性测试失败: controlled failure'
                : success ? 'Detuned 已连接。当前身份: Gate Actor (act-gate), 可见空间: 1' : 'Detuned 未连接或认证失败: controlled failure';
              await commands.get(name).handler('', { hasUI, ui: { notify } });
              expect(calls).toBe(1);
              if (hasUI) {
                expect(notify.mock.calls).toEqual([[message, success ? 'info' : 'error']]);
                expect(logSpy).not.toHaveBeenCalled();
                expect(errorSpy).not.toHaveBeenCalled();
              } else {
                expect(notify).not.toHaveBeenCalled();
                expect((success ? logSpy : errorSpy).mock.calls).toEqual([[`[${name}] ${message}`]]);
                expect(success ? errorSpy : logSpy).not.toHaveBeenCalled();
              }
            }
          }
        }
      } finally {
        globalThis.fetch = savedFetch;
        logSpy.mockRestore();
        errorSpy.mockRestore();
        if (oldBaseUrl === undefined) delete process.env.DETUNED_BASE_URL;
        else process.env.DETUNED_BASE_URL = oldBaseUrl;
        if (oldToken === undefined) delete process.env.DETUNED_TOKEN;
        else process.env.DETUNED_TOKEN = oldToken;
      }
    });

    it('C03-3: Root package.json engines.node is >=22.19.0 to match Pi dependency requirements', () => {
      const rootPkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
      const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
      expect(rootPkg.engines?.node).toBe('>=22.19.0');
    });

    it('C03-4: Registered Pi tools reject bad JSON and preserve complete 409 business error fields', async () => {
      const savedFetch = globalThis.fetch;
      const tools = new Map<string, any>();
      activate({ registerTool(tool: any) { tools.set(tool.name, tool); }, registerCommand() {}, on() {} } as any);
      try {
        let calls = 0;
        globalThis.fetch = (async (url: unknown) => {
          calls++;
          const path = new URL(String(url)).pathname;
          const data = path.endsWith('/capabilities') ? { server_version: 'gate-test', api_version: '1' }
            : path.endsWith('/me') ? piFixtureMe() : path.endsWith('/sessions') ? piFixtureSession() : undefined;
          return data === undefined ? new Response('{', { status: 200 })
            : new Response(JSON.stringify({ api_version: '1', request_id: 'r', data }));
        }) as any;
        await expect(tools.get('forum_context').execute('bad-json', { space_id: spaceId })).rejects.toBeInstanceOf(ClientProtocolError);
        expect(calls).toBe(4); // capabilities, me, diagnostic session, then the original malformed business response
        calls = 0;
        globalThis.fetch = (async () => {
          calls++;
          return new Response(JSON.stringify({ api_version: '1', request_id: 'r', error: {
            code: 'REVISION_CONFLICT', message: 'transaction aborted because revision changed', retryable: false,
            details: { current_revision: 2 },
          } }), { status: 409 });
        }) as any;
        const error = await tools.get('forum_publish').execute('conflict', {
          space_id: spaceId, request_key: 'pi-gate-conflict', op: 'revision', post_id: postId1,
          expected_revision: 1, title: 'conflict', summary: 's', body: 'b',
        }).then(() => undefined, (err: unknown) => err);
        expect(error).toBeInstanceOf(DetunedError);
        expect(error).toMatchObject({ code: 'REVISION_CONFLICT', statusCode: 409, retryable: false,
          message: 'transaction aborted because revision changed', details: { current_revision: 2 } });
        expect(calls).toBe(1);
      } finally {
        globalThis.fetch = savedFetch;
      }
    });

    it('C03-5: Pi write tools union schemas preserve validation constraints and accept all 7 valid write operations (AE04)', async () => {
      const oldBaseUrl = process.env.DETUNED_BASE_URL;
      const oldToken = process.env.DETUNED_TOKEN;
      process.env.DETUNED_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.DETUNED_TOKEN = adminToken;

      try {
        const serverRequire = createRequire(new URL('../../packages/server/dist/app.js', import.meta.url));
        const fastifyRequire = createRequire(serverRequire.resolve('fastify'));
        const compilerRequire = createRequire(fastifyRequire.resolve('@fastify/ajv-compiler'));
        const Ajv = compilerRequire('ajv');
        const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false, allErrors: true });

        const piPackage = realpathSync(new URL('../../packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json', import.meta.url));
        const { validateToolArguments } = await import(new URL('../pi-ai/dist/utils/validation.js', pathToFileURL(piPackage)).href);

        const registeredTools = new Map<string, any>();
        activate({
          registerTool(t: any) { registeredTools.set(t.name, t); },
          registerCommand() {},
          on() {},
        } as any);

        // 1. Schema preservation across all tools
        for (const declared of DETUNED_TOOLS) {
          const registered = registeredTools.get(declared.name);
          expect(registered).toBeDefined();
          expect(registered.parameters).toEqual(declared.schema);
        }

      // 2. All 7 valid write branches
      const base = { space_id: spaceId, request_key: 'r22-key' };
      const ref = { post_id: postId1, revision: 1 };
      const validWrites: Array<[string, any]> = [
        ['forum_publish', { ...base, op: 'thread', title: 'r22 thread' }],
        ['forum_publish', { ...base, op: 'post', thread_id: threadId, kind: 'note', title: 'r22 post', summary: 'review', body: 'text' }],
        ['forum_publish', { ...base, op: 'revision', post_id: postId1, expected_revision: 1, title: 'r22 revision', summary: 'review', body: 'text' }],
        ['forum_publish', { ...base, op: 'withdraw', post_id: postId1, expected_revision: 1, reason: 'review' }],
        ['forum_relate', { ...base, op: 'create', source_ref: ref, target_ref: { post_id: postId2, revision: 1 }, type: 'cites' }],
        ['forum_relate', { ...base, op: 'resolve', relation_id: 'rel-r22', expected_version: 1, reason_ref: ref }],
        ['forum_relate', { ...base, op: 'reopen', relation_id: 'rel-r22', expected_version: 1, reason_ref: ref }],
      ];

      for (const [name, args] of validWrites) {
        const declared = DETUNED_TOOLS.find((t) => t.name === name)!;
        const registered = registeredTools.get(name)!;

        const originalValid = ajv.compile(declared.schema)(structuredClone(args));
        const adaptedValid = ajv.compile(registered.parameters)(structuredClone(args));
        expect(originalValid).toBe(true);
        expect(adaptedValid).toBe(true);

        const sdkOriginal = validateToolArguments({ ...registered, parameters: declared.schema }, { type: 'toolCall', id: 'call-1', name, arguments: args });
        const sdkAdapted = validateToolArguments(registered, { type: 'toolCall', id: 'call-2', name, arguments: args });
        expect(sdkOriginal).toBeDefined();
        expect(sdkAdapted).toBeDefined();
      }

      // 3. Representative negative counter-examples
      const invalidWrites: Array<[string, any]> = [
        ['forum_publish', { ...base, op: 'thread' }], // missing required title
        ['forum_publish', { ...base, op: 'unknown_op' }], // unknown op
        ['forum_publish', { ...base, op: 'revision', post_id: postId1, expected_revision: 0, title: 't', summary: 's', body: 'b' }], // revision < 1
        ['forum_publish', { ...base, op: 'thread', title: 't', extra_prop: 1 }], // unknown property
        ['forum_relate', { ...base, op: 'create' }], // missing refs
        ['forum_relate', { ...base, op: 'resolve', relation_id: 'rel-1', expected_version: 0 }], // expected_version < 1
      ];

      for (const [name, args] of invalidWrites) {
        const registered = registeredTools.get(name)!;
        expect(() =>
          validateToolArguments(registered, { type: 'toolCall', id: 'err-call', name, arguments: args })
        ).toThrow();
      }

      // 4. Live execution through registered tool callback after validation
      const publishTool = registeredTools.get('forum_publish')!;
      const publishParams = {
        space_id: spaceId,
        request_key: 'live-publish-key',
        op: 'thread',
        title: 'Live Validated Thread',
      };
      const validatedPublish = validateToolArguments(publishTool, {
        type: 'toolCall',
        id: 'call-live-pub',
        name: 'forum_publish',
        arguments: publishParams,
      });
      const pubResult = await publishTool.execute('call-live-pub', validatedPublish);
      expect(pubResult).toBeDefined();
      expect(pubResult.details?.thread?.id).toBeDefined();
      const relateTool = registeredTools.get('forum_relate')!;
      const validatedRelate = validateToolArguments(relateTool, {
        type: 'toolCall', id: 'call-live-rel', name: 'forum_relate', arguments: {
          space_id: spaceId, request_key: 'live-relate-key', op: 'create',
          source_ref: ref, target_ref: { post_id: postId2, revision: 1 }, type: 'cites',
        },
      });
      const relateResult = await relateTool.execute('call-live-rel', validatedRelate);
      expect(relateResult.details).toMatchObject({
        source_post_id: postId1, source_revision: 1,
        target_post_id: postId2, target_revision: 1, type: 'cites',
      });
      expect(relateResult.details?.id).toBeDefined();
    } finally {
      if (oldBaseUrl !== undefined) process.env.DETUNED_BASE_URL = oldBaseUrl;
      else delete process.env.DETUNED_BASE_URL;
      if (oldToken !== undefined) process.env.DETUNED_TOKEN = oldToken;
      else delete process.env.DETUNED_TOKEN;
    }
  });
});
});
