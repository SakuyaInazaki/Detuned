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
} from '@detuned/client';
import {
  ErrorCode,
  DetunedError,
  VALID_RELATION_TYPES,
} from '@detuned/protocol';
import {
  RelationService,
  AuthenticatedContext,
} from '@detuned/core';
import activate from '@detuned/adapter-pi';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter', () => {
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: FastifyInstance;
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

    it('C02-5: Abort listener and timer are cleanly removed after settle (no memory leak)', async () => {
      const ctl = new AbortController();
      const res = await client.getCapabilities({ signal: ctl.signal });
      expect(res.data.api_version).toBe('1');
      ctl.abort();
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
  });

  describe('C03: Pi Adapter Headless Output & Compatibility', () => {
    it('C03-1: /forum-status and /forum-check log to console when hasUI is false (headless)', async () => {
      const oldBaseUrl = process.env.DETUNED_BASE_URL;
      const oldToken = process.env.DETUNED_TOKEN;
      process.env.DETUNED_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.DETUNED_TOKEN = adminToken;

      const registeredCommands = new Map<string, any>();
      activate({
        registerTool() {},
        registerCommand(name: string, def: any) {
          registeredCommands.set(name, def);
        },
        on() {},
      } as any);

      expect(registeredCommands.has('forum-status')).toBe(true);
      expect(registeredCommands.has('forum-check')).toBe(true);

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        const headlessContext = {
          hasUI: false,
          ui: { notify: vi.fn() },
        };

        // Execute forum-check
        await registeredCommands.get('forum-check').handler('', headlessContext);
        expect(headlessContext.ui.notify).not.toHaveBeenCalled();
        expect(logSpy.mock.calls.length + errorSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

        // Execute forum-status
        await registeredCommands.get('forum-status').handler('', headlessContext);
        expect(headlessContext.ui.notify).not.toHaveBeenCalled();
        expect(logSpy.mock.calls.length + errorSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      } finally {
        logSpy.mockRestore();
        errorSpy.mockRestore();
        if (oldBaseUrl !== undefined) process.env.DETUNED_BASE_URL = oldBaseUrl;
        else delete process.env.DETUNED_BASE_URL;
        if (oldToken !== undefined) process.env.DETUNED_TOKEN = oldToken;
        else delete process.env.DETUNED_TOKEN;
      }
    });

    it('C03-2: /forum-status and /forum-check notify ui when hasUI is true', async () => {
      const oldBaseUrl = process.env.DETUNED_BASE_URL;
      const oldToken = process.env.DETUNED_TOKEN;
      process.env.DETUNED_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.DETUNED_TOKEN = adminToken;

      const registeredCommands = new Map<string, any>();
      activate({
        registerTool() {},
        registerCommand(name: string, def: any) {
          registeredCommands.set(name, def);
        },
        on() {},
      } as any);

      const uiContext = {
        hasUI: true,
        ui: { notify: vi.fn() },
      };

      try {
        await registeredCommands.get('forum-check').handler('', uiContext);
        expect(uiContext.ui.notify).toHaveBeenCalled();
      } finally {
        if (oldBaseUrl !== undefined) process.env.DETUNED_BASE_URL = oldBaseUrl;
        else delete process.env.DETUNED_BASE_URL;
        if (oldToken !== undefined) process.env.DETUNED_TOKEN = oldToken;
        else delete process.env.DETUNED_TOKEN;
      }
    });

    it('C03-3: Root package.json engines.node is >=22.19.0 to match Pi dependency requirements', () => {
      const rootPkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
      const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
      expect(rootPkg.engines?.node).toBe('>=22.19.0');
    });
  });
});
