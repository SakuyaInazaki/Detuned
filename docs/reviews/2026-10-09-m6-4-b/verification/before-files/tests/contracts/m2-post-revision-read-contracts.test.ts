import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Value } from '@sinclair/typebox/value';
import {
  CONTEXT_BYTES, DETUNED_TOOLS, PostRevisionContentPage, PostRevisionContentPageSchema,
  PostRevisionContentEnvelopeSchema, PostRevisionReadQuerySchema, ToolReadParamsSchema,
  encodePostRevisionContentDocument, generateOpenApiSpec, postRevisionContentEnvelopeBytes,
  serializePostRevisionContentEnvelope,
} from '@detuned/protocol';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient, UserAbortError } from '@detuned/client';
import { activate, type PiExtensionContext } from '@detuned/adapter-pi';
type ToolDefinition = Parameters<PiExtensionContext['registerTool']>[0];

const serverRequire = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const compilerRequire = createRequire(createRequire(serverRequire.resolve('fastify')).resolve('@fastify/ajv-compiler'));
const Ajv = compilerRequire('ajv');
const ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false, formats: { 'date-time': true } });

describe('M2.4-B.2.1 fixed post revision transport contracts', () => {
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: ReturnType<typeof buildApp>;
  let token: string;
  let sid: string;
  let pid: string;
  const requestId = '实际"\\中🙂';
  const original = { title: '固定帖子', summary: '完整内容投影', body: '正文🙂"\\\n\t'.repeat(1800), tags: ['原 标签', ''], structured: { historical_extra: { old: true }, unknown_type: 'legacy' } };
  const headers = () => ({ authorization: `Bearer ${token}` });
  beforeEach(async () => {
    db = new Database(':memory:');
    token = bootstrapDatabase(db).adminToken!;
    storage = new SqliteStorage(db);
    app = buildApp({ storage });
    app.addHook('onRequest', (req, _reply, done) => { req.id = requestId; done(); });
    await app.ready();
    const space = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'space' }, payload: { slug: 'post-read', objective: 'objective', rules: [] } });
    expect(space.statusCode).toBe(201);
    sid = space.json().data.space.id;
    const thread = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'thread' }, payload: { title: 'thread', initial_post: { kind: 'note', ...original } } });
    expect(thread.statusCode).toBe(201);
    pid = thread.json().data.initial_post.post.id;
  });
  afterEach(async () => { await app?.close(); db?.close(); });
  const route = (revision = '1', query = '') => `/api/v1/spaces/${sid}/posts/${pid}/revisions/${revision}${query ? `?${query}` : ''}`;

  it('P01: raw 4K/64K/default pages preserve fixed stored projection while current head changes', async () => {
    const expected = encodePostRevisionContentDocument(storage.getPostRevision(pid, 1)!);
    for (const budget of [4096, 65536, undefined]) {
      let cursor: string | undefined;
      let joined = '';
      let end = 0;
      let pages = 0;
      do {
        const query = new URLSearchParams({ ...(budget === undefined ? {} : { max_bytes: String(budget) }), ...(cursor ? { cursor } : {}) });
        const response = await app.inject({ method: 'GET', url: route('1', query.toString()), headers: headers() });
        expect(response.statusCode, response.payload).toBe(200);
        const envelope = response.json();
        const page = { data: envelope.data, meta: envelope.meta };
        expect(envelope.request_id).toBe(requestId);
        expect(Buffer.byteLength(response.payload)).toBeLessThanOrEqual(budget ?? 12288);
        expect(response.payload).toBe(serializePostRevisionContentEnvelope(requestId, page));
        expect(postRevisionContentEnvelopeBytes(requestId, page)).toBe(Buffer.byteLength(response.payload));
        expect(Value.Check(PostRevisionContentEnvelopeSchema, envelope)).toBe(true);
        expect(ajv.compile(PostRevisionContentEnvelopeSchema)(envelope)).toBe(true);
        expect(page.data.ref).toEqual({ space_id: sid, post_id: pid, revision: 1 });
        expect(page.data.post_kind).toBe('note');
        expect(page.data.lifecycle).toBe('active');
        expect(page.data.start_byte).toBe(end);
        expect(page.data.end_byte).toBeGreaterThan(end);
        expect(Buffer.byteLength(page.data.chunk)).toBe(page.data.end_byte - end);
        expect(page.meta.truncated).toBe(!page.data.complete);
        joined += page.data.chunk;
        end = page.data.end_byte;
        cursor = page.meta.next_cursor ?? undefined;
        if (budget === 4096 && pages === 0) {
          expect(page.data.has_newer_revision).toBe(false);
          const revised = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/posts/${pid}/revisions`, headers: { ...headers(), 'idempotency-key': 'revision' }, payload: { expected_revision: 1, title: 'new', summary: 'new', body: 'new', tags: [], structured: {} } });
          expect(revised.statusCode).toBe(201);
        } else expect(page.data.has_newer_revision).toBe(true);
        expect(++pages).toBeLessThan(100);
      } while (cursor);
      expect(joined).toBe(expected);
      expect(JSON.parse(joined)).toEqual(original);
      expect(Object.keys(JSON.parse(joined))).toEqual(['title', 'summary', 'body', 'tags', 'structured']);
      if (budget === 4096) expect(pages).toBeGreaterThan(1);
    }
  });

  it('P02: strict path/query and unsupported old pagination reject without changing old full getters', async () => {
    for (const [revision, query] of [
      ['0', ''], ['1bad', ''], ['9007199254740992', ''], ['1.5', ''],
      ['1', 'max_bytes=4095'], ['1', 'max_bytes=65537'], ['1', 'max_bytes=1.5'], ['1', 'max_bytes='],
      ['1', 'cursor='], ['1', 'cursor=legacy'], ['1', 'cursor=x&cursor=y'],
      ['1', 'max_bytes=4096&max_bytes=4096'], ['1', 'unknown=x'], ['1', 'revision=1'],
    ]) {
      const response = await app.inject({ method: 'GET', url: route(revision, query), headers: headers() });
      expect(response.statusCode, `${revision}?${query}`).toBe(400);
      expect(response.json().error).toMatchObject({ code: 'VALIDATION_ERROR', retryable: false });
    }
    const old = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${pid}?revision=1`, headers: headers() });
    expect(old.statusCode).toBe(200);
    expect(old.json().data.revision.body).toBe(original.body);
    expect(old.json().meta).toBeUndefined();
    expect(Buffer.byteLength(old.payload)).toBeGreaterThan(4096);
    const directory = await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${pid}/revisions?limit=1`, headers: headers() });
    expect(directory.statusCode).toBe(200);
    expect(Array.isArray(directory.json().data)).toBe(true);
    expect((await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/posts/${pid}?cursor=ignored`, headers: headers() })).statusCode).toBe(400);
  });

  it('P03: real HTTP client new-kind pages and old-kind full data remain distinct; signal cancels', async () => {
    const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
    const client = new DetunedClient({ baseUrl, token, maxRetries: 0 });
    const old = await client.getPost(sid, pid, 1);
    expect(old.data.revision.body).toBe(original.body);
    const oldTool = await client.callTool('forum_read', { kind: 'post', space_id: sid, id: pid, revision: 1 });
    expect(oldTool).toEqual(old.data);
    expect(oldTool.meta).toBeUndefined();
    let cursor: string | undefined;
    let joined = '';
    let pages = 0;
    do {
      const page = await client.callTool('forum_read', { kind: 'post_revision', space_id: sid, id: pid, revision: 1, max_bytes: 4096, ...(cursor ? { cursor } : {}) });
      expect(Value.Check(PostRevisionContentPageSchema, page)).toBe(true);
      expect(page.meta.truncated).toBe(!page.data.complete);
      joined += page.data.chunk;
      cursor = page.meta.next_cursor ?? undefined;
      expect(++pages).toBeLessThan(100);
    } while (cursor);
    expect(pages).toBeGreaterThan(1);
    expect(JSON.parse(joined)).toEqual(original);
    const signal = AbortSignal.abort();
    await expect(client.getPostRevisionContent(sid, pid, 1, {}, { signal })).rejects.toBeInstanceOf(UserAbortError);
    expectTypeOf<ReturnType<DetunedClient['getPostRevisionContent']>>().toEqualTypeOf<Promise<PostRevisionContentPage>>();
  });

  it('P04: shared tool branches strictly reject contradictions while preserving the eight tool names', async () => {
    const valid = { kind: 'post_revision', space_id: sid, id: pid, revision: 1, max_bytes: 4096 };
    expect(ToolReadParamsSchema.type).toBe('object');
    expect(Value.Check(ToolReadParamsSchema, valid)).toBe(true);
    expect(ajv.compile(ToolReadParamsSchema)(valid)).toBe(true);
    const client = new DetunedClient({ baseUrl: 'http://127.0.0.1:1', token, maxRetries: 0 });
    for (const invalid of [
      { ...valid, revision: undefined }, { ...valid, revision: 1.5 }, { ...valid, revision: Number.MAX_SAFE_INTEGER + 1 },
      { ...valid, id: undefined }, { ...valid, post_id: pid }, { ...valid, cursor: '' }, { ...valid, cursor: ' '.repeat(2) },
      { ...valid, cursor: 'x'.repeat(4097) }, { ...valid, max_bytes: 4095 },
      { ...valid, kind: 'post' }, { ...valid, kind: 'thread' }, { ...valid, kind: 'space' },
    ]) {
      expect(Value.Check(ToolReadParamsSchema, invalid)).toBe(false);
      expect(ajv.compile(ToolReadParamsSchema)(invalid)).toBe(false);
      await expect(client.callTool('forum_read', invalid)).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    }
    expect(Value.Check(ToolReadParamsSchema, { kind: 'post', space_id: sid, id: pid })).toBe(true);
    expect(DETUNED_TOOLS.map(tool => tool.name)).toEqual(['forum_context', 'forum_search', 'forum_read', 'forum_publish', 'forum_relate', 'forum_subscribe', 'forum_poll', 'forum_ack']);
  });

  it('P05: page/envelope schemas correlate completion/meta and exclude redacted success or extra fields', () => {
    const data = { ref: { space_id: sid, post_id: pid, revision: 1 }, post_kind: 'note', lifecycle: 'withdrawn', has_newer_revision: true, encoding: 'json', chunk: 'x', start_byte: 0, end_byte: 1, complete: false };
    const page = { data, meta: { truncated: true, next_cursor: 'signed' } };
    expect(Value.Check(PostRevisionContentPageSchema, page)).toBe(true);
    for (const invalid of [
      { ...page, meta: { truncated: false, next_cursor: 'signed' } }, { ...page, meta: { truncated: true, next_cursor: null } },
      { ...page, data: { ...data, complete: true } }, { ...page, data: { ...data, lifecycle: 'redacted' } },
      { ...page, data: { ...data, content_hash: 'not-a-document-hash' } }, { ...page, meta: { truncated: true, next_cursor: '' } },
    ]) {
      expect(Value.Check(PostRevisionContentPageSchema, invalid)).toBe(false);
      expect(ajv.compile(PostRevisionContentPageSchema)(invalid)).toBe(false);
      expect(Value.Check(PostRevisionContentEnvelopeSchema, { api_version: '1', request_id: requestId, ...invalid })).toBe(false);
    }
    expect(Value.Check(PostRevisionContentPageSchema, { data: { ...data, complete: true }, meta: { truncated: false, next_cursor: null } })).toBe(true);
  });

  it('P06: new OpenAPI route declares all parameters, complete envelope and strict cursor after policy traversal', () => {
    type ReadOperation = { parameters: Array<{ name: string; in: string; required?: boolean; schema: unknown }>; responses: Record<string, { content: Record<string, { schema: unknown }> }>; requestBody?: unknown };
    const spec = generateOpenApiSpec() as { paths: Record<string, { get: ReadOperation }> };
    const op = spec.paths['/spaces/{space_id}/posts/{id}/revisions/{revision}']!.get;
    expect(op.parameters.filter(p => p.in === 'path').map(p => p.name)).toEqual(['space_id', 'id', 'revision']);
    expect(op.parameters.find(p => p.name === 'revision')).toMatchObject({ required: true, schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } });
    expect(op.parameters.find(p => p.name === 'max_bytes')!.schema).toEqual({ type: 'integer', ...CONTEXT_BYTES });
    expect(op.parameters.find(p => p.name === 'cursor')!.schema).toEqual(PostRevisionReadQuerySchema.properties.cursor);
    expect(op.responses['200']!.content['application/json']!.schema).toEqual(PostRevisionContentEnvelopeSchema);
    expect(op.requestBody).toBeUndefined();
    expect(spec.paths['/spaces/{space_id}/posts/{id}']!.get.parameters.map(p => p.name)).toEqual(['space_id', 'id', 'revision']);
  });

  it('P07: installed Pi validator reaches actual registered execute for new and unchanged old post kinds', async () => {
    const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
    const savedUrl = process.env.DETUNED_BASE_URL;
    const savedToken = process.env.DETUNED_TOKEN;
    const tools: ToolDefinition[] = [];
    try {
      process.env.DETUNED_BASE_URL = baseUrl;
      process.env.DETUNED_TOKEN = token;
      activate({ registerTool: (tool: ToolDefinition) => tools.push(tool), registerCommand: () => undefined, on: () => () => undefined } as unknown as PiExtensionContext);
      const tool = tools.find(tool => tool.name === 'forum_read')!;
      const piDirectory = realpathSync(new URL('../../packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent', import.meta.url));
      const { validateToolArguments } = await import(pathToFileURL(resolve(piDirectory, '../pi-ai/dist/utils/validation.js')).href);
      const params = { kind: 'post_revision', space_id: sid, id: pid, revision: 1, max_bytes: 4096 };
      const validated = validateToolArguments({ name: tool.name, description: tool.description, parameters: tool.parameters }, { id: 'p07', name: tool.name, arguments: params });
      const result = await tool.execute('p07', validated, undefined, undefined, {} as never);
      expect(Value.Check(PostRevisionContentPageSchema, result.details)).toBe(true);
      expect((result.details as PostRevisionContentPage).meta.truncated).toBe(true);
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(result.details);
      const oldArgs = validateToolArguments({ name: tool.name, description: tool.description, parameters: tool.parameters }, { id: 'old', name: tool.name, arguments: { kind: 'post', space_id: sid, id: pid, revision: 1 } });
      const old = await tool.execute('old', oldArgs, undefined, undefined, {} as never);
      expect((old.details as { revision: { body: string } }).revision.body).toBe(original.body);
      expect((old.details as { meta?: unknown }).meta).toBeUndefined();
    } finally {
      if (savedUrl === undefined) delete process.env.DETUNED_BASE_URL; else process.env.DETUNED_BASE_URL = savedUrl;
      if (savedToken === undefined) delete process.env.DETUNED_TOKEN; else process.env.DETUNED_TOKEN = savedToken;
    }
  });
});
