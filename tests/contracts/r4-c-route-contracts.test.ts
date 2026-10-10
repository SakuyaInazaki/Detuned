import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { FastifyInstance, RouteOptions } from 'fastify';
import { buildApp } from '@detuned/server';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { generateOpenApiSpec, LIST_LIMIT, THREAD_POST_LIMIT, CONTEXT_BYTES, REVISION_QUERY, NONBLANK_STRING_SCHEMA, QUERY_TRANSPORT_POLICY, NO_BODY_WRITE_POLICY, integerQueryOptions } from '@detuned/protocol';
import { parseIntegerQuery, parseCsvQuery } from '../../packages/server/src/utils/query.js';

// Fastify's installed validator, not a second dependency or a permissive test-only schema.
const serverRequire = createRequire(new URL('../../packages/server/dist/app.js', import.meta.url));
const compilerRequire = createRequire(createRequire(serverRequire.resolve('fastify')).resolve('@fastify/ajv-compiler'));
const Ajv = compilerRequire('ajv');
const normalize = (path: string) => path.replace(/^\/api\/v1/, '').replace(/:([^/]+)/g, '{$1}');
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
type Operation = { parameters?: Array<{ name: string; in: string; required?: boolean; schema: object; style?: string; explode?: boolean }>; requestBody?: { required: boolean; content: { 'application/json': { schema: object } } }; [key: string]: unknown };


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

describe('C.3-GATE complete API-v1 route contracts', () => {
  let app: FastifyInstance;
  let db: Database.Database;
  let token: string;
  let sid: string;
  let routes: Array<{ method: string; path: string; body?: unknown }>;
  const spec = generateOpenApiSpec() as { servers?: Array<{url:string}>; paths: Record<string, Record<string, Operation>> };
  const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false });
  const call = (method: 'GET' | 'POST', url: string, payload?: object, key?: string) => app.inject({ method, url, headers: { authorization: `Bearer ${token}`, ...(key !== undefined ? { 'idempotency-key': key } : {}) }, ...(payload === undefined ? {} : { payload }) });
  beforeEach(async () => {
    db = new Database(':memory:');
    token = bootstrapDatabase(db).adminToken!;
    app = buildApp({ storage: new SqliteStorage(db) });
    routes = [];
    app.addHook('onRoute', (r: RouteOptions) => {
      for (const method of Array.isArray(r.method) ? r.method : [r.method]) {
        if (method !== 'HEAD' && r.url.startsWith('/api/v1/')) routes.push({ method: method.toLowerCase(), path: normalize(r.url), body: r.schema?.body });
      }
    });
    await app.ready();
    const space = await call('POST', '/api/v1/spaces', { slug: 'route-contract', objective: 'contracts', rules: [] }, 'seed');
    expect(space.statusCode).toBe(201);
    sid = space.json().data.space.id;
  });
  afterEach(async () => { await app.close(); db.close(); });

  it('G01: compares every actual API-v1 method/path and every body schema, including absence', () => {
    const declared = apiV1Operations(spec);
    expect(routes.map(r => `${r.method} ${r.path}`).sort()).toEqual(declared.map(r => `${r.method} ${r.path}`).sort());
    for (const route of routes) {
      const op = spec.paths[route.path][route.method];
      expect(json(op.requestBody?.content['application/json']?.schema ?? null), `${route.method} ${route.path}`).toEqual(json(route.body ?? null));
      expect(op['x-query-policy']).toEqual(QUERY_TRANSPORT_POLICY);
      const pathNames = [...route.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1]).sort();
      expect((op.parameters ?? []).filter(p => p.in === 'path').map(p => p.name).sort()).toEqual(pathNames);
    }
    expect(spec.paths['/me'].get).toBeDefined();
    expect(spec.paths['/spaces/{space_id}'].get).toBeUndefined();
  });

  it('G02: shared integer defaults and bounds agree with schema, parser and HTTP', async () => {
    for (const [path, parameter, policy, url] of [
      ['/spaces', 'limit', LIST_LIMIT, '/api/v1/spaces'],
      ['/spaces/{space_id}/context', 'max_bytes', CONTEXT_BYTES, `/api/v1/spaces/${sid}/context`],
    ] as const) {
      const schema = spec.paths[path].get.parameters!.find(p => p.name === parameter)!.schema;
      const validate = ajv.compile(schema);
      expect(parseIntegerQuery(undefined, parameter, integerQueryOptions(policy))).toBe(policy.default);
      for (const value of [policy.minimum - 1, policy.minimum, policy.maximum, policy.maximum + 1]) {
        expect(validate(value)).toBe(value >= policy.minimum && value <= policy.maximum);
        const response = await call('GET', `${url}?${parameter}=${value}`);
        expect(response.statusCode < 400).toBe(validate(value));
      }
      for (const raw of ['', '1bad', '1.5', '1&' + parameter + '=2']) expect((await call('GET', `${url}?${parameter}=${raw}`)).statusCode).toBe(400);
    }
    expect(spec.paths['/spaces/{space_id}/threads/{id}'].get.parameters!.find(p => p.name === 'limit')!.schema).toEqual({ type: 'integer', ...THREAD_POST_LIMIT });
    expect(spec.paths['/spaces/{space_id}/posts/{id}'].get.parameters!.find(p => p.name === 'revision')!.schema).toEqual({ type: 'integer', ...REVISION_QUERY });
  });

  it('G03: string, enum and CSV policies preserve present HTTP behavior', async () => {
    expect(ajv.compile(NONBLANK_STRING_SCHEMA)('   ')).toBe(false);
    expect(ajv.compile(NONBLANK_STRING_SCHEMA)(' x ')).toBe(true);
    for (const suffix of ['cursor=', 'cursor=x&cursor=y', 'tags=x', 'state=bogus']) expect((await call('GET', `/api/v1/spaces/${sid}/threads?${suffix}`)).statusCode).toBe(400);
    expect((await call('GET', `/api/v1/spaces/${sid}/threads?state=open`)).statusCode).toBe(200);
    for (const query of ['q=', 'q=x&kind=bogus', 'q=x&tags=a&tags=b', 'q=x&tag=a']) expect((await call('GET', `/api/v1/spaces/${sid}/search?${query}`)).statusCode).toBe(400);
    expect((await call('GET', `/api/v1/spaces/${sid}/search?q=x&tags=`)).statusCode).toBe(200);
    expect(parseCsvQuery(' a, ,b ', 'tags')).toEqual(['a', 'b']);
    expect(parseCsvQuery('', 'tags')).toEqual([]);
    const tags = spec.paths['/spaces/{space_id}/search'].get.parameters!.find(p => p.name === 'tags')!;
    expect(tags.style).toBe('form'); expect(tags.explode).toBe(false);
    expect((await call('GET', `/api/v1/spaces/${sid}/views/failures?limit=20`)).statusCode).toBe(400);
    expect((await call('GET', `/api/v1/spaces/${sid}/views/failures`)).statusCode).toBe(200);
    expect((await call('POST', '/api/v1/spaces', { slug: 'blank-key', objective: 'x', rules: [] }, '   ')).statusCode).toBe(400);
  });

  it('G04: anonymous capabilities, optional subscription key, poll object and no-body policies remain explicit', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/capabilities' })).statusCode).toBe(200);
    expect(spec.paths['/capabilities'].get.security).toEqual([]);
    const sub = await call('POST', `/api/v1/spaces/${sid}/subscriptions`, { consumer_key: 'g04', start: 'now' });
    expect(sub.statusCode).toBe(201);
    const cid = sub.json().data.consumer.id;
    expect((await call('POST', `/api/v1/spaces/${sid}/consumers/${cid}/poll`)).statusCode).toBe(400);
    expect((await call('POST', `/api/v1/spaces/${sid}/consumers/${cid}/poll`, {})).statusCode).toBe(200);
    expect(spec.paths['/spaces/{space_id}/consumers/{id}/poll'].post.requestBody!.required).toBe(true);
    for (const [path, method] of [['/admin/credentials/{id}/revoke', 'post'], ['/spaces/{space_id}/memberships/{actor_id}', 'delete'], ['/spaces/{space_id}/consumers/{id}', 'delete']] as const) expect(spec.paths[path][method]['x-no-body-policy']).toEqual(NO_BODY_WRITE_POLICY);
  });
});
