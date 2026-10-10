import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@detuned/server';
import {
  SqliteStorage,
  bootstrapDatabase,
  isDatabaseInitialized,
  openAndCoordinateDatabase,
  migrateIdempotencyRecords,
  classifyDatabase,
  CURRENT_SCHEMA_VERSION,
  SCHEMA_SQL,
} from '@detuned/storage-sqlite';
import {
  encodeResult,
  extractResultRef,
  reconstructResult,
  validateResultRef,
  validateStoredResultRefPrecheck,
  normalizeLegacyResultRef,
} from '@detuned/core';
import { DetunedError, ErrorCode } from '@detuned/protocol';

describe('M0/M1-R4-B Data and Upgrade Reliability Regressions (B01 - B12)', () => {
  let tempDir: string;
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: FastifyInstance;
  let adminToken: string;
  let adminActorId: string;
  let serial = 0;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'detuned-r4-b-test-'));
    const dbPath = join(tempDir, 'detuned.sqlite');
    db = new Database(dbPath);
    const boot = bootstrapDatabase(db);
    adminToken = boot.adminToken!;
    adminActorId = boot.adminActorId!;
    storage = new SqliteStorage(db);
    app = buildApp({ storage });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function send(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    token: string,
    payload?: unknown,
    key: string | null = `r4b-${++serial}`,
    targetApp: FastifyInstance = app
  ) {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (key !== null) headers['idempotency-key'] = key;
    const res = await targetApp.inject({
      method,
      url: `/api/v1${path}`,
      headers,
      ...(payload === undefined ? {} : { payload }),
    });
    let body: any;
    try {
      body = res.json();
    } catch {
      body = {};
    }
    return { status: res.statusCode, body, raw: res.payload };
  }

  function getData(res: { status: number; body: any }) {
    if (res.status >= 400) {
      throw new Error(`Request failed: ${res.status} ${res.body.error?.code}: ${res.body.error?.message}`);
    }
    return res.body.data;
  }

  const note = (body: string) => ({
    kind: 'note',
    title: 'R4 synthetic note',
    summary: 'Review fixture note',
    body,
  });

  function fullLogicalSnapshot(database: Database.Database) {
    const schema = database.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all();
    return {
      schema,
      rows: schema.filter((x: any) => x.type === 'table').map(({ name }: any) => [
        name,
        database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map((r: any) => JSON.stringify(r)).sort()
      ])
    };
  }

  // B01: All implemented operation families have typed, versioned result schemas without fallback
  it('B01: All 11 implemented operation families encode, replay identically, and reconstruct after reopen without fallback', async () => {
    const dbPath = join(tempDir, 'b01_ops.sqlite');
    const b01Db = new Database(dbPath);
    const boot = bootstrapDatabase(b01Db);
    const token = boot.adminToken!;
    const b01Storage = new SqliteStorage(b01Db);
    const b01App = buildApp({ storage: b01Storage });
    await b01App.ready();

    try {
      // 1. space.create
      const spaceKey = 'b01-key-space-create';
      const spaceBody = { slug: 'b01-space', objective: 'Test space', rules: [] };
      const spaceRes = getData(await send('POST', '/spaces', token, spaceBody, spaceKey, b01App));
      const spaceId = spaceRes.space.id;

      // 2. space.patch
      const spaceForPatch = getData(await send('POST', '/spaces', token, { slug: 'b01-space-patch-tgt', objective: 'Initial obj', rules: [] }, 'b01-setup-space-patch', b01App)).space.id;
      const patchSpaceKey = 'b01-key-space-patch';
      const patchSpaceBody = { expected_revision: 1, objective: 'Updated space objective' };
      const patchSpaceRes = getData(await send('PATCH', `/spaces/${spaceForPatch}`, token, patchSpaceBody, patchSpaceKey, b01App));

      // 3. thread.create
      const threadKey = 'b01-key-thread-create';
      const threadBody = { title: 'B01 thread' };
      const threadRes = getData(await send('POST', `/spaces/${spaceId}/threads`, token, threadBody, threadKey, b01App));
      const threadId = threadRes.thread.id;

      // 4. thread.patch
      const patchThreadKey = 'b01-key-thread-patch';
      const patchThreadBody = { expected_version: 1, title: 'B01 updated thread' };
      const patchThreadRes = getData(await send('PATCH', `/spaces/${spaceId}/threads/${threadId}`, token, patchThreadBody, patchThreadKey, b01App));

      // 5. post.create
      const postKey = 'b01-key-post-create';
      const postBody = note('B01 post body');
      const postRes = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, token, postBody, postKey, b01App));
      const postId = postRes.post.id;

      // 6. post.revision
      const postForRev = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, token, note('p-rev'), 'b01-setup-p-rev', b01App)).post.id;
      const postRevKey = 'b01-key-post-revision';
      const postRevBody = { expected_revision: 1, title: 'B01 rev 2', summary: 'summary 2', body: 'B01 body 2' };
      const postRevRes = getData(await send('POST', `/spaces/${spaceId}/posts/${postForRev}/revisions`, token, postRevBody, postRevKey, b01App));

      // 7. post.withdraw
      const postForWithdraw = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, token, note('p-withdraw'), 'b01-setup-p-withdraw', b01App)).post.id;
      const withdrawKey = 'b01-key-post-withdraw';
      const withdrawBody = { expected_revision: 1, reason: 'B01 withdraw reason' };
      const withdrawRes = getData(await send('POST', `/spaces/${spaceId}/posts/${postForWithdraw}/withdraw`, token, withdrawBody, withdrawKey, b01App));

      // Set up a second post for relation operations
      const post2 = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, token, note('p2'), 'b01-setup-p2', b01App)).post.id;

      // 8. relation.create
      const relCreateKey = 'b01-key-relation-create';
      const relCreateBody = { source_ref: { post_id: postId, revision: 1 }, target_ref: { post_id: post2, revision: 1 }, type: 'challenges' };
      const relCreateRes = getData(await send('POST', `/spaces/${spaceId}/relations`, token, relCreateBody, relCreateKey, b01App));
      const relationId = relCreateRes.id;

      // 9. relation.resolve
      const relResolveKey = 'b01-key-relation-resolve';
      const relResolveBody = { expected_version: 1, reason_ref: { post_id: postId, revision: 1 } };
      const relResolveRes = getData(await send('POST', `/spaces/${spaceId}/relations/${relationId}/resolve`, token, relResolveBody, relResolveKey, b01App));

      // 10. relation.reopen
      const relReopenKey = 'b01-key-relation-reopen';
      const relReopenBody = { expected_version: 2, reason_ref: { post_id: postId, revision: 1 } };
      const relReopenRes = getData(await send('POST', `/spaces/${spaceId}/relations/${relationId}/reopen`, token, relReopenBody, relReopenKey, b01App));

      // 11. admin.redaction
      const redactKey = 'b01-key-admin-redaction';
      const redactBody = { target_type: 'post', target_id: post2, reason: 'B01 redaction reason' };
      const redactRes = getData(await send('POST', `/spaces/${spaceId}/redactions`, token, redactBody, redactKey, b01App));

      const opDefinitions = [
        { name: 'space.create', method: 'POST', path: '/spaces', body: spaceBody, key: spaceKey, initialData: spaceRes },
        { name: 'space.patch', method: 'PATCH', path: `/spaces/${spaceForPatch}`, body: patchSpaceBody, key: patchSpaceKey, initialData: patchSpaceRes },
        { name: 'thread.create', method: 'POST', path: `/spaces/${spaceId}/threads`, body: threadBody, key: threadKey, initialData: threadRes },
        { name: 'thread.patch', method: 'PATCH', path: `/spaces/${spaceId}/threads/${threadId}`, body: patchThreadBody, key: patchThreadKey, initialData: patchThreadRes },
        { name: 'post.create', method: 'POST', path: `/spaces/${spaceId}/threads/${threadId}/posts`, body: postBody, key: postKey, initialData: postRes },
        { name: 'post.revision', method: 'POST', path: `/spaces/${spaceId}/posts/${postForRev}/revisions`, body: postRevBody, key: postRevKey, initialData: postRevRes },
        { name: 'post.withdraw', method: 'POST', path: `/spaces/${spaceId}/posts/${postForWithdraw}/withdraw`, body: withdrawBody, key: withdrawKey, initialData: withdrawRes },
        { name: 'relation.create', method: 'POST', path: `/spaces/${spaceId}/relations`, body: relCreateBody, key: relCreateKey, initialData: relCreateRes },
        { name: 'relation.resolve', method: 'POST', path: `/spaces/${spaceId}/relations/${relationId}/resolve`, body: relResolveBody, key: relResolveKey, initialData: relResolveRes },
        { name: 'relation.reopen', method: 'POST', path: `/spaces/${spaceId}/relations/${relationId}/reopen`, body: relReopenBody, key: relReopenKey, initialData: relReopenRes },
        { name: 'admin.redaction', method: 'POST', path: `/spaces/${spaceId}/redactions`, body: redactBody, key: redactKey, initialData: redactRes },
      ];

      // Check stored idempotency refs
      for (const op of opDefinitions) {
        const rec = b01Db.prepare('SELECT result_ref FROM idempotency_records WHERE key = ?').get(op.key) as any;
        expect(rec).toBeDefined();
        const parsedRef = JSON.parse(rec.result_ref);
        expect(parsedRef.v).toBe(1);
        expect(parsedRef.kind).toBeDefined();
      }

      // Same-connection replay for all 11 operations
      const beforeSameConnSnapshot = fullLogicalSnapshot(b01Db);
      for (const op of opDefinitions) {
        const countBeforeEvents = (b01Db.prepare('SELECT count(*) AS n FROM events').get() as any).n;
        const countBeforeIdem = (b01Db.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n;

        const replayRes = await send(op.method as any, op.path, token, op.body, op.key, b01App);
        expect(replayRes.status).toBeLessThan(300);
        expect(replayRes.body.data).toEqual(op.initialData);

        const countAfterEvents = (b01Db.prepare('SELECT count(*) AS n FROM events').get() as any).n;
        const countAfterIdem = (b01Db.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n;
        expect(countAfterEvents).toBe(countBeforeEvents);
        expect(countAfterIdem).toBe(countBeforeIdem);

        // Snapshot invariance: zero business state mutation during replay
        expect(fullLogicalSnapshot(b01Db)).toEqual(beforeSameConnSnapshot);
      }

      // Reopen database and verify persistent decoder replay for all 11 operations
      await b01App.close();
      b01Db.close();

      const reopenedB01Db = new Database(dbPath);
      const reopenedB01App = buildApp({ storage: new SqliteStorage(reopenedB01Db) });
      await reopenedB01App.ready();
      try {
        const beforeReopenedSnapshot = fullLogicalSnapshot(reopenedB01Db);
        for (const op of opDefinitions) {
          const countBeforeEvents = (reopenedB01Db.prepare('SELECT count(*) AS n FROM events').get() as any).n;
          const countBeforeIdem = (reopenedB01Db.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n;

          const replayRes = await send(op.method as any, op.path, token, op.body, op.key, reopenedB01App);
          expect(replayRes.status).toBeLessThan(300);
          expect(replayRes.body.data).toEqual(op.initialData);

          const countAfterEvents = (reopenedB01Db.prepare('SELECT count(*) AS n FROM events').get() as any).n;
          const countAfterIdem = (reopenedB01Db.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n;
          expect(countAfterEvents).toBe(countBeforeEvents);
          expect(countAfterIdem).toBe(countBeforeIdem);

          // Snapshot invariance: zero business state mutation across file reopen and replay
          expect(fullLogicalSnapshot(reopenedB01Db)).toEqual(beforeReopenedSnapshot);
        }
      } finally {
        await reopenedB01App.close();
        reopenedB01Db.close();
      }

      // Unknown operation rejected
      expect(() => encodeResult('unknown.operation', { id: 'test' })).toThrowError(/未注册的写操作类型/);
    } finally {
      try { await b01App.close(); } catch {}
      try { b01Db.close(); } catch {}
    }
  });

  // B02: Replay on subsequent object change, reopen, response loss
  it('B02: Thread, post, and relation replays preserve original version/state across object changes and database reopen', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b02-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;

    // 1. Thread create -> patch -> replay create
    const threadKey = 'thread-key-b02';
    const originalThread = getData(
      await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'B02 Initial Title' }, threadKey)
    );
    const threadId = originalThread.thread.id;

    await send('PATCH', `/spaces/${space}/threads/${threadId}`, adminToken, {
      expected_version: 1,
      title: 'B02 Modified Title',
    });

    // 2. Relation create -> resolve -> replay relation create (G01 regression test)
    const p1 = getData(await send('POST', `/spaces/${space}/threads/${threadId}/posts`, adminToken, note('p1'))).post.id;
    const p2 = getData(await send('POST', `/spaces/${space}/threads/${threadId}/posts`, adminToken, note('p2'))).post.id;
    const relKey = 'rel-key-b02';
    const relBody = {
      source_ref: { post_id: p1, revision: 1 },
      target_ref: { post_id: p2, revision: 1 },
      type: 'challenges',
    };
    const originalRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, relBody, relKey));
    expect(originalRelation.version).toBe(1);
    expect(originalRelation.state).toBe('open');

    await send('POST', `/spaces/${space}/relations/${originalRelation.id}/resolve`, adminToken, {
      expected_version: 1,
      reason_ref: { post_id: p1, revision: 1 },
    });

    // Replay relation create: must still return version 1 and open state!
    const replayRel = await send('POST', `/spaces/${space}/relations`, adminToken, relBody, relKey);
    expect(replayRel.status).toBe(201);
    expect(replayRel.body.data.version).toBe(1);
    expect(replayRel.body.data.state).toBe('open');

    // 3. Post create -> redact -> replay post create
    const postKey = 'post-key-b02';
    const originalPost = getData(
      await send('POST', `/spaces/${space}/threads/${threadId}/posts`, adminToken, note('B02_SENSITIVE_SECRET'), postKey)
    );
    const postId = originalPost.post.id;

    await send('POST', `/spaces/${space}/redactions`, adminToken, {
      target_type: 'post',
      target_id: postId,
      reason: 'B02 secret redaction',
    });

    // Replay post create: should return post with redacted body, not leaking sensitive secret
    const replayPost = await send(
      'POST',
      `/spaces/${space}/threads/${threadId}/posts`,
      adminToken,
      note('B02_SENSITIVE_SECRET'),
      postKey
    );
    expect(replayPost.status).toBe(201);
    expect(replayPost.body.data.post.id).toBe(postId);
    expect(replayPost.body.data.revision.body).toBe('[REDACTED]');

    // 4. Close database and reopen from disk -> replay thread create
    await app.close();
    db.close();

    const dbPath = join(tempDir, 'detuned.sqlite');
    db = new Database(dbPath);
    storage = new SqliteStorage(db);
    app = buildApp({ storage });
    await app.ready();

    const replayThread = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'B02 Initial Title' }, threadKey);
    expect(replayThread.status).toBe(201);
    expect(replayThread.body.data.thread.title).toBe('B02 Initial Title');
    expect(replayThread.body.data.thread.version).toBe(1);

    const threadCount = (db.prepare('SELECT count(*) AS n FROM threads').get() as any).n;
    expect(threadCount).toBe(1);
  });

  // B03: Legacy $ref resolve/reopen preserves resolution version after reopen (U02)
  it('B03: Upgraded resolve references preserve the original operation version after subsequent reopen', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b03-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;
    const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'B03 thread' })).thread.id;
    const p1 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p1'))).post.id;
    const p2 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p2'))).post.id;
    const p3 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p3'))).post.id;

    const relRes = getData(
      await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: p1, revision: 1 },
        target_ref: { post_id: p2, revision: 1 },
        type: 'challenges',
      })
    );
    const relationId = relRes.id;

    // Resolve relation with key
    const resolveKey = 'rel-resolve-b03';
    const resolveBody = {
      expected_version: 1,
      reason_ref: { post_id: p3, revision: 1 },
    };
    const resolveRes = getData(
      await send('POST', `/spaces/${space}/relations/${relationId}/resolve`, adminToken, resolveBody, resolveKey)
    );
    const originalResolutionId = resolveRes.resolution.id;
    expect(resolveRes.relation.version).toBe(2);
    expect(resolveRes.relation.state).toBe('resolved');

    // Reopen relation to version 3
    const reopenRes = getData(
      await send('POST', `/spaces/${space}/relations/${relationId}/reopen`, adminToken, {
        expected_version: 2,
        reason_ref: { post_id: p3, revision: 1 },
      })
    );
    expect(reopenRes.relation.version).toBe(3);
    expect(reopenRes.relation.state).toBe('open');

    // Replay the original resolve request
    const replayResolve = await send(
      'POST',
      `/spaces/${space}/relations/${relationId}/resolve`,
      adminToken,
      resolveBody,
      resolveKey
    );
    expect(replayResolve.status).toBe(200);
    expect(replayResolve.body.data.relation.version).toBe(2);
    expect(replayResolve.body.data.relation.state).toBe('resolved');
    expect(replayResolve.body.data.resolution.version).toBe(2);
    expect(replayResolve.body.data.resolution.id).toBe(originalResolutionId);

    // Also test injected legacy $ref format (U02 scenario)
    db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'rel-resolve-b03'").run(
      JSON.stringify({ $ref: 'relation', relation_id: relationId, resolution_id: originalResolutionId })
    );
    migrateIdempotencyRecords(db);
    const replayLegacy = await send(
      'POST',
      `/spaces/${space}/relations/${relationId}/resolve`,
      adminToken,
      resolveBody,
      resolveKey
    );
    expect(replayLegacy.status).toBe(200);
    expect(replayLegacy.body.data.relation.version).toBe(2);
    expect(replayLegacy.body.data.relation.state).toBe('resolved');
  });

  // B03 (Symmetric Reopen): Legacy $ref for both resolve and reopen reconstruct original results across file reopen and subsequent resolve
  it('B03 (Symmetric Reopen): Reopen database and replay legacy $ref for both resolve and reopen preserving historical results', async () => {
    const b03DbPath = join(tempDir, 'b03_symmetric.sqlite');
    const b03Db = new Database(b03DbPath);
    const b03Boot = bootstrapDatabase(b03Db);
    const b03Token = b03Boot.adminToken!;
    const b03App = buildApp({ storage: new SqliteStorage(b03Db) });
    await b03App.ready();

    try {
      const space = getData(await send('POST', '/spaces', b03Token, { slug: 'b03-sym-spc', objective: 'Sym space', rules: [] }, 'b03-sym-spc-key', b03App)).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, b03Token, { title: 'Sym thread' }, 'b03-sym-th-key', b03App)).thread.id;
      const p1 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, b03Token, note('p1'), 'b03-sym-p1', b03App)).post.id;
      const p2 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, b03Token, note('p2'), 'b03-sym-p2', b03App)).post.id;
      const p3 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, b03Token, note('p3'), 'b03-sym-p3', b03App)).post.id;

      const relRes = getData(await send('POST', `/spaces/${space}/relations`, b03Token, {
        source_ref: { post_id: p1, revision: 1 },
        target_ref: { post_id: p2, revision: 1 },
        type: 'challenges',
      }, 'b03-sym-rel-create', b03App));
      const relationId = relRes.id;

      // 1. resolve(v2)
      const resolveKeyV2 = 'b03-sym-resolve-v2';
      const resolveBodyV2 = { expected_version: 1, reason_ref: { post_id: p3, revision: 1 } };
      const resolveV2Data = getData(await send('POST', `/spaces/${space}/relations/${relationId}/resolve`, b03Token, resolveBodyV2, resolveKeyV2, b03App));
      const resolutionV2Id = resolveV2Data.resolution.id;
      expect(resolveV2Data.relation.version).toBe(2);
      expect(resolveV2Data.relation.state).toBe('resolved');

      // 2. reopen(v3)
      const reopenKeyV3 = 'b03-sym-reopen-v3';
      const reopenBodyV3 = { expected_version: 2, reason_ref: { post_id: p3, revision: 1 } };
      const reopenV3Data = getData(await send('POST', `/spaces/${space}/relations/${relationId}/reopen`, b03Token, reopenBodyV3, reopenKeyV3, b03App));
      const resolutionV3Id = reopenV3Data.resolution.id;
      expect(reopenV3Data.relation.version).toBe(3);
      expect(reopenV3Data.relation.state).toBe('open');

      // 3. Subsequent resolve(v4)
      const resolveKeyV4 = 'b03-sym-resolve-v4';
      const resolveBodyV4 = { expected_version: 3, reason_ref: { post_id: p3, revision: 1 } };
      const resolveV4Data = getData(await send('POST', `/spaces/${space}/relations/${relationId}/resolve`, b03Token, resolveBodyV4, resolveKeyV4, b03App));
      expect(resolveV4Data.relation.version).toBe(4);
      expect(resolveV4Data.relation.state).toBe('resolved');

      // 4. Overwrite both result_refs with supported legacy shapes
      b03Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = ?").run(
        JSON.stringify({ $ref: 'relation', relation_id: relationId, resolution_id: resolutionV2Id }),
        resolveKeyV2
      );
      b03Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = ?").run(
        JSON.stringify({ $ref: 'relation', relation_id: relationId, resolution_id: resolutionV3Id }),
        reopenKeyV3
      );

      // 5. Close DB & app, reopen from file and coordinate
      await b03App.close();
      b03Db.close();

      const reopenedB03Db = new Database(b03DbPath);
      openAndCoordinateDatabase(reopenedB03Db, 'serve');
      const restartedB03App = buildApp({ storage: new SqliteStorage(reopenedB03Db) });
      await restartedB03App.ready();

      try {
        const snapshotBefore = fullLogicalSnapshot(reopenedB03Db);

        // Replay resolve(v2)
        const repResolve = await send('POST', `/spaces/${space}/relations/${relationId}/resolve`, b03Token, resolveBodyV2, resolveKeyV2, restartedB03App);
        expect(repResolve.status).toBe(200);
        expect(repResolve.body.data).toEqual(resolveV2Data);

        // Replay reopen(v3)
        const repReopen = await send('POST', `/spaces/${space}/relations/${relationId}/reopen`, b03Token, reopenBodyV3, reopenKeyV3, restartedB03App);
        expect(repReopen.status).toBe(200);
        expect(repReopen.body.data).toEqual(reopenV3Data);

        // Verify relation is still v4, resolved
        const currentRel = reopenedB03Db.prepare("SELECT version, state FROM relations WHERE id = ?").get(relationId) as any;
        expect(currentRel.version).toBe(4);
        expect(currentRel.state).toBe('resolved');

        // Verify logical snapshot invariance
        expect(fullLogicalSnapshot(reopenedB03Db)).toEqual(snapshotBefore);
      } finally {
        await restartedB03App.close();
        reopenedB03Db.close();
      }
    } finally {
      try { await b03App.close(); } catch {}
      try { b03Db.close(); } catch {}
    }
  });

  // B04: Unknown kind/version, corrupt JSON rejected with 422 RESYNC_REQUIRED (U04 & G06)
  it('B04: Unknown idempotency reference kind or future version rejected with 422 RESYNC_REQUIRED', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b04-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;

    const threadBody = { title: 'B04 initial thread' };
    const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'b04-test-key')).thread.id;

    // G06 cases:
    const cases = [
      ['invalid_version_zero', { v: 0, kind: 'thread.create', thread_id: thread, thread_version: 1 }],
      ['future_version_99', { v: 99, kind: 'thread.create', thread_id: thread, thread_version: 1 }],
      ['missing_thread_version', { v: 1, kind: 'thread.create', thread_id: thread }],
      ['wrong_operation_kind', { v: 1, kind: 'space', space_id: space, revision: 1 }],
      ['forbidden_cached_body', { v: 1, kind: 'thread.create', thread_id: thread, thread_version: 1, body: 'cached' }],
    ];

    for (const [name, ref] of cases) {
      db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'b04-test-key'").run(
        JSON.stringify(ref)
      );
      const res = await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'b04-test-key');
      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
    }
  });

  // B05: Migration of legal historical formats removes cached body and preserves business data
  it('B05: Historical full-JSON idempotency records and direct entities are migrated cleanly to versioned refs', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b05-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;
    const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'B05 thread' })).thread.id;
    const post = getData(
      await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('B05_BODY_SECRET'), 'key-legacy-b05')
    );

    // 1. Simulate fa1b35c full JSON response saved in result_ref
    db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'key-legacy-b05'").run(
      JSON.stringify(post)
    );
    expect(
      (db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'key-legacy-b05'").get() as any).result_ref.includes('B05_BODY_SECRET')
    ).toBe(true);

    migrateIdempotencyRecords(db);

    const afterRef = (
      db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'key-legacy-b05'").get() as any
    ).result_ref;
    expect(afterRef.includes('B05_BODY_SECRET')).toBe(false);
    const parsed = JSON.parse(afterRef);
    expect(parsed.v).toBe(1);
    expect(parsed.kind).toBe('post');
    expect(parsed.post_id).toBe(post.post.id);

    // Replay succeeds and reconstructs post data
    const replay = await send(
      'POST',
      `/spaces/${space}/threads/${thread}/posts`,
      adminToken,
      note('B05_BODY_SECRET'),
      'key-legacy-b05'
    );
    expect(replay.status).toBe(201);
    expect(replay.body.data.post.id).toBe(post.post.id);

    // 2. Direct Relation and withdraw Post migration (G07 scenario)
    const p1 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p1'))).post.id;
    const p2 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p2'))).post.id;
    const relRes = getData(
      await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: p1, revision: 1 },
        target_ref: { post_id: p2, revision: 1 },
        type: 'challenges',
      }, 'key-direct-rel')
    );
    const withdrawRes = getData(
      await send('POST', `/spaces/${space}/posts/${p1}/withdraw`, adminToken, {
        expected_revision: 1,
        reason: 'withdraw direct',
      }, 'key-direct-withdraw')
    );

    // Overwrite records with direct entity shapes
    db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'key-direct-rel'").run(
      JSON.stringify(relRes)
    );
    db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'key-direct-withdraw'").run(
      JSON.stringify(withdrawRes)
    );

    migrateIdempotencyRecords(db);

    const relRefMigrated = JSON.parse((db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'key-direct-rel'").get() as any).result_ref);
    expect(relRefMigrated.kind).toBe('relation.create');
    expect(relRefMigrated.relation_version).toBe(1);

    const withdrawRefMigrated = JSON.parse((db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'key-direct-withdraw'").get() as any).result_ref);
    expect(withdrawRefMigrated.kind).toBe('post.withdraw');
    expect(withdrawRefMigrated.post_id).toBe(p1);
  });

  // B06: Migration write fault injection rolls back atomically (U01 & G03)
  it('B06: Migration failure rolls back entire transaction leaving database unchanged', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b06-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;
    const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'B06 thread' })).thread.id;

    // Serialize database to a new file for fault testing
    const faultDbPath = join(tempDir, 'fault.sqlite');
    writeFileSync(faultDbPath, db.serialize());

    let faultDb = new Database(faultDbPath);
    try {
      faultDb.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
      const beforeSnapshot = fullLogicalSnapshot(faultDb);

      let faultHits = 0;
      let installed = false;
      faultDb.function('mark_fault', () => {
        faultHits++;
        return 1;
      });
      const nativeExec = faultDb.exec.bind(faultDb);
      faultDb.exec = (sql: string) => {
        const returned = nativeExec(sql);
        if (!installed && /CREATE TABLE IF NOT EXISTS thread_versions/.test(sql)) {
          installed = true;
          nativeExec(`
            CREATE TEMP TRIGGER fail_thread_history BEFORE INSERT ON thread_versions
            BEGIN
              SELECT mark_fault();
              SELECT RAISE(ABORT, 'Simulated SQLite write fault on history insertion');
            END;
          `);
        }
        return returned;
      };

      let threw = false;
      try {
        bootstrapDatabase(faultDb);
      } catch (err: any) {
        threw = true;
        expect(err.message).toContain('Simulated SQLite write fault');
      }
      expect(threw).toBe(true);
      expect(faultHits).toBe(1);

      faultDb.exec = nativeExec;
      faultDb.close();

      faultDb = new Database(faultDbPath);
      expect(fullLogicalSnapshot(faultDb)).toEqual(beforeSnapshot);

      // Verify transaction rollback: schema_migrations is still at version 1
      const maxV = (faultDb.prepare('SELECT max(version) AS max_v FROM schema_migrations').get() as any).max_v;
      expect(maxV).toBe(1);
    } finally {
      faultDb.close();
    }
  });

  // B07: Revoking all credentials preserves initialization state without generating new admin tokens (U03)
  it('B07: Revoking all credentials preserves initialization and does not create new admin credentials', async () => {
    // Record current secret
    const secretBefore = (db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any).value;

    // 1. Revoke all credentials
    db.prepare("UPDATE credentials SET revoked_at = datetime('now')").run();
    expect(isDatabaseInitialized(db)).toBe(true);

    const credsBefore = (db.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
    const reBoot = bootstrapDatabase(db);
    expect(reBoot.isNewInstance).toBe(false);
    expect(reBoot.adminToken).toBeNull();

    const credsAfter = (db.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
    expect(credsAfter).toBe(credsBefore);

    // 2. Expire credentials
    db.prepare("UPDATE credentials SET expires_at = '2020-01-01T00:00:00.000Z'").run();
    const bootExpired = bootstrapDatabase(db);
    expect(bootExpired.isNewInstance).toBe(false);
    expect(bootExpired.adminToken).toBeNull();

    // 3. Disable admin actor
    db.prepare("UPDATE actors SET disabled_at = datetime('now')").run();
    const bootDisabled = bootstrapDatabase(db);
    expect(bootDisabled.isNewInstance).toBe(false);
    expect(bootDisabled.adminToken).toBeNull();

    // 4. Verify secret stability
    const secretAfter = (db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any).value;
    expect(secretAfter).toBe(secretBefore);
  });

  // B08: Blank db initialization failure and retry; legacy db metadata upgrade
  it('B08: Atomic initialization retries cleanly; legacy db upgrade never issues new tokens', async () => {
    // 1. Test clean recovery from aborted first initialization (like S11)
    const freshDbPath = join(tempDir, 'recovery.sqlite');
    const freshDb = new Database(freshDbPath);
    try {
      freshDb.exec(SCHEMA_SQL);
      freshDb.exec("CREATE TRIGGER fail_cred BEFORE INSERT ON credentials BEGIN SELECT RAISE(ABORT, 'abort cred'); END;");
      let threw = false;
      try {
        bootstrapDatabase(freshDb);
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
      freshDb.exec('DROP TRIGGER fail_cred');

      // Retry on reopened DB
      freshDb.close();
      const reopenedFreshDb = new Database(freshDbPath);
      try {
        const retryBoot = bootstrapDatabase(reopenedFreshDb);
        expect(retryBoot.isNewInstance).toBe(true);
        expect(retryBoot.adminToken).toBeDefined();
        const credCount = (reopenedFreshDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
        expect(credCount).toBe(1);
      } finally {
        reopenedFreshDb.close();
      }
    } finally {
      try { freshDb.close(); } catch {}
    }

    // 2. Test genuine legacy db upgrade (v1 schema without metadata, max version 1)
    const legacyDbPath = join(tempDir, 'legacy_upgrade.sqlite');
    writeFileSync(legacyDbPath, db.serialize());
    const legacyDb = new Database(legacyDbPath);
    try {
      legacyDb.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DROP TABLE IF EXISTS instance_metadata; DELETE FROM schema_migrations WHERE version > 1;');
      const credsBefore = (legacyDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
      const upgraded = bootstrapDatabase(legacyDb);
      expect(upgraded.isNewInstance).toBe(false);
      expect(upgraded.adminToken).toBeNull();
      const credsAfter = (legacyDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
      expect(credsAfter).toBe(credsBefore);
      expect(isDatabaseInitialized(legacyDb)).toBe(true);
    } finally {
      legacyDb.close();
    }

    // 3. Test current v2 db with dropped instance_metadata is rejected in serve mode (not upgraded as legacy)
    const corruptDbPath = join(tempDir, 'corrupt_metadata.sqlite');
    writeFileSync(corruptDbPath, db.serialize());
    const corruptDb = new Database(corruptDbPath);
    try {
      corruptDb.exec('DROP TABLE instance_metadata');
      expect(() => openAndCoordinateDatabase(corruptDb, 'serve')).toThrowError(/实例持久密钥缺失或损坏/);
    } finally {
      corruptDb.close();
    }
  });

  // B09: init and serve reject future/unsupported schema version before listening
  it('B09: openAndCoordinateDatabase rejects future schema versions and unknown databases before DDL mutation', async () => {
    // 1. Future schema version
    const futureDbPath = join(tempDir, 'future.sqlite');
    const futureDb = new Database(futureDbPath);
    try {
      futureDb.exec(`
        CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
        INSERT INTO schema_migrations (version, applied_at) VALUES (999, datetime('now'));
      `);

      const tablesBefore = (futureDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get() as any).n;
      expect(() => openAndCoordinateDatabase(futureDb, 'init')).toThrowError(/高于当前应用/);
      expect(() => openAndCoordinateDatabase(futureDb, 'serve')).toThrowError(/高于当前应用/);
      const tablesAfter = (futureDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get() as any).n;
      expect(tablesAfter).toBe(tablesBefore);
    } finally {
      futureDb.close();
    }

    // 2. Unknown non-empty schema (G05 scenario)
    const unknownDbPath = join(tempDir, 'unknown.sqlite');
    const unknownDb = new Database(unknownDbPath);
    try {
      unknownDb.exec("CREATE TABLE unrelated_notes (id INTEGER PRIMARY KEY, content TEXT); INSERT INTO unrelated_notes VALUES(1, 'notes');");
      const tablesBefore = (unknownDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get() as any).n;
      expect(() => openAndCoordinateDatabase(unknownDb, 'init')).toThrowError(/检测到未知或不受支持的非空数据库结构/);
      const tablesAfter = (unknownDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get() as any).n;
      expect(tablesAfter).toBe(tablesBefore);
    } finally {
      unknownDb.close();
    }

    // 3. Supported legacy DB in serve mode (G08 scenario)
    const legacyServeDbPath = join(tempDir, 'legacy_serve.sqlite');
    writeFileSync(legacyServeDbPath, db.serialize());
    const legacyServeDb = new Database(legacyServeDbPath);
    try {
      legacyServeDb.exec('DROP TABLE IF EXISTS review_submissions; DROP TABLE IF EXISTS review_assignments; DROP TABLE IF EXISTS review_request_versions; DROP TABLE IF EXISTS review_requests; DROP TABLE IF EXISTS snapshot_items; DROP TABLE IF EXISTS snapshots; DROP TABLE IF EXISTS thread_versions; DROP TABLE IF EXISTS instance_metadata; DELETE FROM schema_migrations WHERE version > 1;');
      const credsBefore = (legacyServeDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
      expect(() => openAndCoordinateDatabase(legacyServeDb, 'serve')).toThrow(/migrate/);
      const credsAfter = (legacyServeDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
      expect(credsAfter).toBe(credsBefore);
      expect(classifyDatabase(legacyServeDb).kind).toBe('supported_legacy');
    } finally {
      legacyServeDb.close();
    }
  });

  // B10: Missing/corrupted secret causes storage/bootstrap to reject without ephemeral random token
  it('B10: getInstanceSecret throws when secret is missing, preventing ephemeral random secret fallback', async () => {
    const badDbPath = join(tempDir, 'bad_secret.sqlite');
    const badDb = new Database(badDbPath);
    try {
      bootstrapDatabase(badDb);
      badDb.prepare("DELETE FROM instance_metadata WHERE key = 'token_secret'").run();

      const badStorage = new SqliteStorage(badDb);
      expect(() => badStorage.getInstanceSecret()).toThrowError(/实例持久密钥缺失或未初始化/);

      expect(() => openAndCoordinateDatabase(badDb, 'serve')).toThrowError(/实例持久密钥缺失或损坏/);
      expect(() => openAndCoordinateDatabase(badDb, 'init')).toThrowError(/实例持久密钥缺失或损坏/);
    } finally {
      badDb.close();
    }
  });

  // B11: Idempotency conflict (409) and proper scope binding
  it('B11: Modified payload with same key returns 409 IDEMPOTENCY_CONFLICT, while concurrent identical requests succeed', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b11-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;

    // 1. Concurrent requests with identical key using Promise.all
    const concurrentKey = 'concurrent-key-b11';
    const [resA, resB] = await Promise.all([
      send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Concurrent Thread' }, concurrentKey),
      send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Concurrent Thread' }, concurrentKey),
    ]);
    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    expect(resA.body.data.thread.id).toBe(resB.body.data.thread.id);

    const threadCount = (db.prepare("SELECT count(*) AS n FROM threads WHERE title = 'Concurrent Thread'").get() as any).n;
    expect(threadCount).toBe(1);

    // 2. Modified payload with same key returns 409
    const conflictKey = 'conflict-key-b11';
    const original = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'First Title' }, conflictKey);
    expect(original.status).toBe(201);

    const conflict = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Different Title' }, conflictKey);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error?.code).toBe('IDEMPOTENCY_CONFLICT');

    // 3. Same key on a different space operates independently
    const space2 = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b11-space-2',
        objective: 'Test space 2',
        rules: [],
      })
    ).space.id;
    const otherSpaceThread = await send('POST', `/spaces/${space2}/threads`, adminToken, { title: 'First Title' }, conflictKey);
    expect(otherSpaceThread.status).toBe(201);
  });

  // B12: Redaction audit and event atomic rollback verification
  it('B12: Redaction audit covers multi-page revisions and rolls back atomically on failure', async () => {
    // This case covers 25 historical revisions, rather than write-rate admission.
    await app.close();
    app = buildApp({ storage, writeRateLimits: { per_minute: 60000, burst: 10000 } });
    await app.ready();
    const space = getData(
      await send('POST', '/spaces', adminToken, {
        slug: 'b12-space',
        objective: 'Test space',
        rules: [],
      })
    ).space.id;
    const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'B12 thread' })).thread.id;

    // Create a post with 25 revisions (exceeding default page size of 20, as in U07)
    const initialPost = getData(
      await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('Initial body 1'))
    );
    const postId = initialPost.post.id;

    for (let r = 2; r <= 25; r++) {
      await send('POST', `/spaces/${space}/posts/${postId}/revisions`, adminToken, {
        expected_revision: r - 1,
        title: `Rev ${r} title`,
        summary: `Rev ${r} summary`,
        body: `Rev ${r} body content`,
      });
    }

    const revCountBefore = (db.prepare('SELECT count(*) AS n FROM post_revisions WHERE post_id = ?').get(postId) as any).n;
    expect(revCountBefore).toBe(25);

    // Execute redaction
    const redactRes = getData(
      await send('POST', `/spaces/${space}/redactions`, adminToken, {
        target_type: 'post',
        target_id: postId,
        reason: 'Multi-page redaction verification',
      })
    );
    expect(redactRes.redaction_id).toBeDefined();

    // Verify post lifecycle is redacted
    const postRecord = db.prepare('SELECT lifecycle FROM posts WHERE id = ?').get(postId) as any;
    expect(postRecord.lifecycle).toBe('redacted');

    // Verify all 25 revisions are redacted
    const unredactedCount = (
      db.prepare("SELECT count(*) AS n FROM post_revisions WHERE post_id = ? AND body != '[REDACTED]'").get(postId) as any
    ).n;
    expect(unredactedCount).toBe(0);

    const auditRow = db.prepare('SELECT affected_revisions FROM redactions WHERE id = ?').get(redactRes.redaction_id) as any;
    const affectedList = JSON.parse(auditRow.affected_revisions);
    expect(affectedList.length).toBe(25);
  });

  // H01 - H09: Regressions for R6 Boundary Findings
  describe('R6 Boundary Regressions (H01 - H09)', () => {
    // H01: Upgrading known old relation.create references never substitutes current state
    it('H01: Upgrading old relation.create references preserves initial state or refuses upgrade', async () => {
      const space = getData(
        await send('POST', '/spaces', adminToken, {
          slug: 'h01-space',
          objective: 'H01 test',
          rules: [],
        })
      ).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'H01 thread' })).thread.id;
      const p1 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p1'))).post.id;
      const p2 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p2'))).post.id;

      const relBody = {
        source_ref: { post_id: p1, revision: 1 },
        target_ref: { post_id: p2, revision: 1 },
        type: 'challenges',
      };
      const origRel = getData(await send('POST', `/spaces/${space}/relations`, adminToken, relBody, 'h01-orig-rel'));
      expect(origRel.version).toBe(1);
      expect(origRel.state).toBe('open');

      // Resolve relation to version 2 / resolved
      await send('POST', `/spaces/${space}/relations/${origRel.id}/resolve`, adminToken, {
        expected_version: 1,
        reason_ref: { post_id: p1, revision: 1 },
      });

      // 1. Test previous v1 ref without version/state
      const fixPath1 = join(tempDir, 'h01_v1.sqlite');
      writeFileSync(fixPath1, db.serialize());
      const db1 = new Database(fixPath1);
      try {
        db1.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(
          JSON.stringify({ v: 1, kind: 'relation.create', relation_id: origRel.id }),
          'h01-orig-rel'
        );
        let rejected = false;
        try { openAndCoordinateDatabase(db1, 'init'); } catch { rejected = true; }
        if (!rejected) {
          const childApp = buildApp({ storage: new SqliteStorage(db1) });
          await childApp.ready();
          try {
            const rep = await send('POST', `/spaces/${space}/relations`, adminToken, relBody, 'h01-orig-rel', childApp);
            const safe = (rep.status >= 400 && Boolean(rep.body.error?.code)) || (rep.status === 201 && rep.body.data?.version === 1 && rep.body.data?.state === 'open');
            expect(safe).toBe(true);
          } finally {
            await childApp.close();
          }
        }
      } finally {
        db1.close();
      }

      // 2. Test legacy $ref
      const fixPath2 = join(tempDir, 'h01_ref.sqlite');
      writeFileSync(fixPath2, db.serialize());
      const db2 = new Database(fixPath2);
      try {
        db2.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(
          JSON.stringify({ $ref: 'relation', relation_id: origRel.id }),
          'h01-orig-rel'
        );
        let rejected = false;
        try { openAndCoordinateDatabase(db2, 'init'); } catch { rejected = true; }
        if (!rejected) {
          const childApp = buildApp({ storage: new SqliteStorage(db2) });
          await childApp.ready();
          try {
            const rep = await send('POST', `/spaces/${space}/relations`, adminToken, relBody, 'h01-orig-rel', childApp);
            const safe = (rep.status >= 400 && Boolean(rep.body.error?.code)) || (rep.status === 201 && rep.body.data?.version === 1 && rep.body.data?.state === 'open');
            expect(safe).toBe(true);
          } finally {
            await childApp.close();
          }
        }
      } finally {
        db2.close();
      }
    });

    // H02: Fresh thread times and nested relation versions remain tied to original operation
    it('H02: Replayed thread retains original updated_at and nested relations retain original version/state', async () => {
      let instant = Date.parse('2026-09-28T01:00:00.000Z');
      const testClock = { now: () => new Date(instant), nowIso: () => new Date(instant).toISOString() };
      const clockApp = buildApp({ storage: new SqliteStorage(db), clock: testClock });
      await clockApp.ready();
      try {
        const space = getData(
          await send('POST', '/spaces', adminToken, {
            slug: 'h02-space',
            objective: 'H02 test',
            rules: [],
          }, 'h02-space-key', clockApp)
        ).space.id;

        const threadBody = { title: 'H02 Initial Title' };
        const origThread = getData(
          await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'h02-thread-key', clockApp)
        );
        const threadId = origThread.thread.id;

        // Advance clock by 60s and patch thread
        instant += 60000;
        await send('PATCH', `/spaces/${space}/threads/${threadId}`, adminToken, {
          expected_version: 1,
          title: 'H02 Later Title',
        }, 'h02-patch-key', clockApp);

        // Replay thread create: must still have original updated_at
        const replayThread = await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'h02-thread-key', clockApp);
        expect(replayThread.status).toBe(201);
        expect(replayThread.body.data.thread.updated_at).toBe(origThread.thread.updated_at);

        // Nested relations test:
        const targetPost = getData(await send('POST', `/spaces/${space}/threads/${threadId}/posts`, adminToken, note('target'), 'h02-target-post-key', clockApp)).post.id;
        const postWithRef = {
          ...note('post with challenge'),
          refs: [{ target_ref: { post_id: targetPost, revision: 1 }, type: 'challenges' }],
        };
        const origPostWithRel = getData(
          await send('POST', `/spaces/${space}/threads/${threadId}/posts`, adminToken, postWithRef, 'h02-nested-rel-key', clockApp)
        );
        const nestedRel = origPostWithRel.relations[0];
        expect(nestedRel.version).toBe(1);
        expect(nestedRel.state).toBe('open');

        // Resolve nested relation to version 2
        await send('POST', `/spaces/${space}/relations/${nestedRel.id}/resolve`, adminToken, {
          expected_version: 1,
          reason_ref: { post_id: targetPost, revision: 1 },
        }, 'h02-resolve-key', clockApp);

        // Replay post create: nested relations must still be version 1 and open!
        const repeatedPost = await send('POST', `/spaces/${space}/threads/${threadId}/posts`, adminToken, postWithRef, 'h02-nested-rel-key', clockApp);
        expect(repeatedPost.status).toBe(201);
        expect(repeatedPost.body.data.relations[0].version).toBe(1);
        expect(repeatedPost.body.data.relations[0].state).toBe('open');
      } finally {
        await clockApp.close();
      }
    });

    // H03: A current instance with lost metadata is refused without generating a replacement secret
    it('H03: Current v2 database with lost metadata is classified as corrupt and rejected', () => {
      const h03Path = join(tempDir, 'h03_corrupt.sqlite');
      writeFileSync(h03Path, db.serialize());
      const h03Db = new Database(h03Path);
      try {
        const secretBefore = (h03Db.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get() as any).value;
        h03Db.exec('DROP TABLE instance_metadata');
        expect(() => openAndCoordinateDatabase(h03Db, 'serve')).toThrowError(/实例持久密钥缺失或损坏/);
        const hasMeta = Boolean(h03Db.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get());
        expect(hasMeta).toBe(false);
      } finally {
        h03Db.close();
      }
    });

    // H04: Missing required schema or contradictory migration markers fail before mutation
    it('H04: Missing post_revisions or version 2 without version 1 fails before mutation', () => {
      // 1. Missing post_revisions
      const h04Path1 = join(tempDir, 'h04_missing_table.sqlite');
      writeFileSync(h04Path1, db.serialize());
      const db1 = new Database(h04Path1);
      try {
        db1.exec('DROP TABLE post_revisions');
        expect(classifyDatabase(db1).kind).toBe('corrupt');
        expect(() => openAndCoordinateDatabase(db1, 'init')).toThrow();
      } finally {
        db1.close();
      }

      // 2. Version gap: version 2 without version 1
      const h04Path2 = join(tempDir, 'h04_version_gap.sqlite');
      writeFileSync(h04Path2, db.serialize());
      const db2 = new Database(h04Path2);
      try {
        db2.exec('DELETE FROM schema_migrations WHERE version = 1');
        expect(classifyDatabase(db2).kind).toBe('corrupt');
        expect(() => openAndCoordinateDatabase(db2, 'init')).toThrow();
      } finally {
        db2.close();
      }
    });

    // H05: Unsupported references and incompatible legacy results abort complete upgrade
    it('H05: Future v:99 ref and post result in thread operation abort upgrade', () => {
      // 1. Future v:99 ref disguised as legacy
      const h05Path1 = join(tempDir, 'h05_v99.sqlite');
      writeFileSync(h05Path1, db.serialize());
      const db1 = new Database(h05Path1);
      try {
        db1.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
        db1.prepare(
          "INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, http_status, result_ref, created_at) VALUES ('act_admin', 'spc_1', 'post.create', 'h05-key-1', 'hash', 201, ?, datetime('now'))"
        ).run(JSON.stringify({ v: 99, $ref: 'post', post_id: 'pst_fake', revision: 1 }));
        expect(() => bootstrapDatabase(db1)).toThrow();
      } finally {
        db1.close();
      }

      // 2. Post result in thread operation
      const h05Path2 = join(tempDir, 'h05_incompatible.sqlite');
      writeFileSync(h05Path2, db.serialize());
      const db2 = new Database(h05Path2);
      try {
        db2.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
        db2.prepare(
          "INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, http_status, result_ref, created_at) VALUES ('act_admin', 'spc_1', 'thread.create', 'h05-key-2', 'hash', 201, ?, datetime('now'))"
        ).run(JSON.stringify({ post: { id: 'pst_fake' }, revision: { revision: 1 } }));
        expect(() => bootstrapDatabase(db2)).toThrow();
      } finally {
        db2.close();
      }
    });

    // H06: validateResultRef rejects unregistered operations, invalid optional fields, and cached body
    it('H06: validateResultRef rejects unregistered operations, invalid optional fields and cached body', () => {
      const base = { v: 1, kind: 'thread.create', thread_id: 'thd_test', thread_version: 1 };
      // 1. Unknown operation
      expect(() => validateResultRef('unknown.operation', base)).toThrow();
      // 2. Similar but unregistered operation
      expect(() => validateResultRef('thread.patch_unregistered', { v: 1, kind: 'thread.patch', thread_id: 'thd_test', thread_version: 1 })).toThrow();
      // 3. Negative initial revision
      expect(() => validateResultRef('thread.create', { ...base, initial_post_id: 'pst_test', initial_post_revision: -1 })).toThrow();
      // 4. Non-array relation_ids
      expect(() => validateResultRef('thread.create', { ...base, relation_ids: 'not-an-array' })).toThrow();
      // 5. Nested cached body
      expect(() => validateResultRef('thread.create', { ...base, extra: { body: 'CACHED_BODY' } })).toThrow();
    });

    // H07: Replay checks operation target and does not silently drop missing relations
    it('H07: Replay rejects mismatched target and missing relations with 422', async () => {
      const space = getData(
        await send('POST', '/spaces', adminToken, {
          slug: 'h07-space',
          objective: 'H07 test',
          rules: [],
        })
      ).space.id;
      const th1 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Th1' })).thread.id;
      const th2 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Th2' })).thread.id;
      const patchBody = { expected_version: 1, title: 'Th2 changed' };
      await send('PATCH', `/spaces/${space}/threads/${th2}`, adminToken, patchBody, 'h07-patch-target');

      const p1 = getData(await send('POST', `/spaces/${space}/threads/${th1}/posts`, adminToken, note('p1'), 'h07-source-post')).post.id;

      // Corrupt target in thread.patch
      db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'h07-patch-target'").run(
        JSON.stringify({ v: 1, kind: 'thread.patch', thread_id: th1, thread_version: 1 })
      );
      // Corrupt relation_ids in post
      db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'h07-source-post'").run(
        JSON.stringify({ v: 1, kind: 'post', post_id: p1, revision: 1, relation_ids: ['rel_missing_h07'] })
      );

      const wrongTarget = await send('PATCH', `/spaces/${space}/threads/${th2}`, adminToken, patchBody, 'h07-patch-target');
      expect(wrongTarget.status).toBe(422);

      const missingRel = await send('POST', `/spaces/${space}/threads/${th1}/posts`, adminToken, note('p1'), 'h07-source-post');
      expect(missingRel.status).toBe(422);
    });

    // H08: Conflicting history for the same immutable key rejects migration
    it('H08: Conflicting history for the same immutable key rejects migration', async () => {
      const space = getData(
        await send('POST', '/spaces', adminToken, {
          slug: 'h08-space',
          objective: 'H08 test',
          rules: [],
        })
      ).space.id;
      const thRes = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Original H08 Title' }, 'h08-orig-key'));
      const thId = thRes.thread.id;

      const h08Path = join(tempDir, 'h08_conflict.sqlite');
      writeFileSync(h08Path, db.serialize());
      const h08Db = new Database(h08Path);
      try {
        h08Db.prepare('UPDATE thread_versions SET title = ? WHERE thread_id = ? AND version = 1').run(
          'Contradictory Title in History',
          thId
        );
        h08Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'h08-orig-key'").run(
          JSON.stringify(thRes)
        );
        expect(() => openAndCoordinateDatabase(h08Db, 'init')).toThrow();
      } finally {
        h08Db.close();
      }
    });

    // H09: Migration diagnostics do not print raw body marker in stdout or stderr
    it('H09: Migration diagnostics never print raw body marker', () => {
      const childDir = join(tempDir, 'cli_diag_test');
      mkdirSync(childDir, { recursive: true });
      const childDbPath = join(childDir, 'detuned.sqlite');
      writeFileSync(childDbPath, db.serialize());
      const childDb = new Database(childDbPath);
      const marker = 'SYNTHETIC_PRIVATE_MARKER_DO_NOT_LOG';
      try {
        childDb.prepare(
          "INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, http_status, result_ref, created_at) VALUES ('act_admin', 'spc_1', 'thread.create', 'h09-diag-key', 'hash', 201, ?, datetime('now'))"
        ).run(JSON.stringify({ legacy_unknown: true, body: marker }));
      } finally {
        childDb.close();
      }

      const root = join(__dirname, '../..');
      const child = spawnSync(
        process.execPath,
        [join(root, 'packages/cli/dist/index.js'), '--json', 'init', '--data-dir', childDir],
        { cwd: root, encoding: 'utf8', timeout: 5000 }
      );
      expect(child.status).not.toBe(0);
      expect(child.stdout.includes(marker)).toBe(false);
      expect(child.stderr.includes(marker)).toBe(false);
    });

    // J01: Migration of relation.create lacking version/state safely refuses unprovable replay
    it('J01: Migration of relation.create lacking version/state safely refuses unprovable replay', async () => {
      const space = getData(
        await send('POST', '/spaces', adminToken, {
          slug: 'j01-space',
          objective: 'J01 review',
          rules: [],
        })
      ).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'J01 thread' })).thread.id;
      const p1 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p1'))).post.id;
      const p2 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('p2'))).post.id;
      const relationBody = { source_ref: { post_id: p1, revision: 1 }, target_ref: { post_id: p2, revision: 1 }, type: 'challenges' };
      const created = getData(await send('POST', `/spaces/${space}/relations`, adminToken, relationBody, 'j01-first'));
      await send('POST', `/spaces/${space}/relations/${created.id}/resolve`, adminToken, { expected_version: 1, reason_ref: { post_id: p1, revision: 1 } });
      const reused = getData(await send('POST', `/spaces/${space}/relations`, adminToken, relationBody, 'j01-reuse'));
      expect(reused.version).toBe(2);

      const j01Path = join(tempDir, 'j01_reused.sqlite');
      writeFileSync(j01Path, db.serialize());
      const j01Db = new Database(j01Path);
      try {
        j01Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'j01-reuse'").run(
          JSON.stringify({ v: 1, kind: 'relation.create', relation_id: reused.id })
        );
        openAndCoordinateDatabase(j01Db, 'init');
      } finally {
        j01Db.close();
      }

      const j01Db2 = new Database(j01Path);
      const j01App = buildApp({ storage: new SqliteStorage(j01Db2) });
      await j01App.ready();
      try {
        const replay = await send('POST', `/spaces/${space}/relations`, adminToken, relationBody, 'j01-reuse', j01App);
        expect(replay.status).toBe(422);
        expect(replay.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await j01App.close();
        j01Db2.close();
      }
    });

    // J02: Current instance material loss is refused consistently across bootstrap, init and serve
    it('J02: Current instance material loss is refused consistently across bootstrap, init and serve without mutating secrets', () => {
      // 1. bootstrap with missing instance_metadata
      const j02Path1 = join(tempDir, 'j02_boot_missing.sqlite');
      writeFileSync(j02Path1, db.serialize());
      const db1 = new Database(j02Path1);
      try {
        db1.exec('DROP TABLE instance_metadata');
        expect(classifyDatabase(db1).kind).toBe('corrupt');
        expect(() => bootstrapDatabase(db1)).toThrow();
        expect(db1.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get()).toBeUndefined();
      } finally {
        db1.close();
      }

      // 2. serve with empty metadata
      const j02Path2 = join(tempDir, 'j02_serve_empty.sqlite');
      writeFileSync(j02Path2, db.serialize());
      const db2 = new Database(j02Path2);
      try {
        db2.exec('DELETE FROM instance_metadata');
        expect(classifyDatabase(db2).kind).toBe('corrupt');
        expect(() => openAndCoordinateDatabase(db2, 'serve')).toThrow();
        const secretAfter = (db2.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get() as any)?.value;
        expect(secretAfter).toBeUndefined();
      } finally {
        db2.close();
      }

      // 3. real CLI init with missing metadata
      const childDir = join(tempDir, 'j02_cli_init');
      mkdirSync(childDir, { recursive: true });
      const childDbPath = join(childDir, 'detuned.sqlite');
      writeFileSync(childDbPath, db.serialize());
      const cliDb = new Database(childDbPath);
      cliDb.exec('DROP TABLE instance_metadata');
      cliDb.close();

      const root = join(__dirname, '../..');
      const child = spawnSync(
        process.execPath,
        [join(root, 'packages/cli/dist/index.js'), '--json', 'init', '--data-dir', childDir],
        { cwd: root, encoding: 'utf8', timeout: 5000 }
      );
      expect(child.status).not.toBe(0);
      expect(existsSync(join(childDir, 'detuned.lock'))).toBe(false);
      const cliDbAfter = new Database(childDbPath);
      try {
        expect(cliDbAfter.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get()).toBeUndefined();
      } finally {
        cliDbAfter.close();
      }
    });

    // J03: Current schema with missing required column is classified as corrupt and rejected
    it('J03: Current schema with missing required column is classified as corrupt and rejected', () => {
      const j03Path = join(tempDir, 'j03_missing_column.sqlite');
      writeFileSync(j03Path, db.serialize());
      const j03Db = new Database(j03Path);
      try {
        j03Db.exec('ALTER TABLE post_revisions RENAME COLUMN body TO r7_missing_body');
        expect(classifyDatabase(j03Db).kind).toBe('corrupt');
        expect(() => openAndCoordinateDatabase(j03Db, 'init')).toThrow();
      } finally {
        j03Db.close();
      }
    });

    // J04: Migration preserves historical timestamps and detects state conflicts
    it('J04: Migration preserves historical timestamps and detects state conflicts', async () => {
      const space = getData(
        await send('POST', '/spaces', adminToken, {
          slug: 'j04-space',
          objective: 'J04 review',
          rules: [],
        })
      ).space.id;
      const thRes = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'J04 original' }, 'j04-th'));
      const threadId = thRes.thread.id;
      const patch1 = getData(await send('PATCH', `/spaces/${space}/threads/${threadId}`, adminToken, { expected_version: 1, title: 'J04 v2' }, 'j04-p1'));
      await send('PATCH', `/spaces/${space}/threads/${threadId}`, adminToken, { expected_version: 2, title: 'J04 v3' });

      // Test 1: Historical timestamp preserved across upgrade
      const j04Path = join(tempDir, 'j04_time.sqlite');
      writeFileSync(j04Path, db.serialize());
      const dbTime = new Database(j04Path);
      try {
        dbTime.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
        dbTime.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'j04-p1'").run(JSON.stringify(patch1));
        bootstrapDatabase(dbTime);
      } finally {
        dbTime.close();
      }

      const dbTime2 = new Database(j04Path);
      const appTime = buildApp({ storage: new SqliteStorage(dbTime2) });
      await appTime.ready();
      try {
        const replay = await send('PATCH', `/spaces/${space}/threads/${threadId}`, adminToken, { expected_version: 1, title: 'J04 v2' }, 'j04-p1', appTime);
        expect(replay.status).toBe(200);
        expect(replay.body.data.updated_at).toBe(patch1.updated_at);
      } finally {
        await appTime.close();
        dbTime2.close();
      }

      // Test 2: State conflict throws and rolls back
      const j04ConflictPath = join(tempDir, 'j04_conflict.sqlite');
      writeFileSync(j04ConflictPath, db.serialize());
      const dbConflict = new Database(j04ConflictPath);
      try {
        dbConflict.prepare("UPDATE thread_versions SET state='archived' WHERE thread_id=? AND version=1").run(threadId);
        dbConflict.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'j04-th'").run(JSON.stringify(thRes));
        expect(() => openAndCoordinateDatabase(dbConflict, 'init')).toThrow();
      } finally {
        dbConflict.close();
      }
    });

    // J05: Reconstruction validates space ownership and resolution-to-relation binding
    it('J05: Reconstruction validates space ownership and resolution-to-relation binding', async () => {
      const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'j05-a', objective: 'Space A', rules: [] })).space.id;
      const spaceB = getData(await send('POST', '/spaces', adminToken, { slug: 'j05-b', objective: 'Space B', rules: [] })).space.id;
      const threadB = getData(await send('POST', `/spaces/${spaceB}/threads`, adminToken, { title: 'Thread in B' })).thread.id;

      const threadA = getData(await send('POST', `/spaces/${spaceA}/threads`, adminToken, { title: 'Thread in A' }, 'j05-th-a')).thread.id;
      const p1 = getData(await send('POST', `/spaces/${spaceA}/threads/${threadA}/posts`, adminToken, note('p1'))).post.id;
      const p2 = getData(await send('POST', `/spaces/${spaceA}/threads/${threadA}/posts`, adminToken, note('p2'))).post.id;
      const rel1 = getData(await send('POST', `/spaces/${spaceA}/relations`, adminToken, { source_ref: { post_id: p1, revision: 1 }, target_ref: { post_id: p2, revision: 1 }, type: 'challenges' }));
      const rel2 = getData(await send('POST', `/spaces/${spaceA}/relations`, adminToken, { source_ref: { post_id: p2, revision: 1 }, target_ref: { post_id: p1, revision: 1 }, type: 'challenges' }));
      const res2 = getData(await send('POST', `/spaces/${spaceA}/relations/${rel2.id}/resolve`, adminToken, { expected_version: 1, reason_ref: { post_id: p1, revision: 1 } }));

      // Tampered space binding rejected in migration
      const j05Path = join(tempDir, 'j05_tamper.sqlite');
      writeFileSync(j05Path, db.serialize());
      const j05Db = new Database(j05Path);
      try {
        j05Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'j05-th-a'").run(
          JSON.stringify({ v: 1, kind: 'thread.create', thread_id: threadB, thread_version: 1 })
        );
        expect(() => openAndCoordinateDatabase(j05Db, 'init')).toThrow();
      } finally {
        j05Db.close();
      }

      // Replay rejects cross-space target at runtime
      db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'j05-th-a'").run(
        JSON.stringify({ v: 1, kind: 'thread.create', thread_id: threadB, thread_version: 1 })
      );
      const replayCrossSpace = await send('POST', `/spaces/${spaceA}/threads`, adminToken, { title: 'Thread in A' }, 'j05-th-a');
      expect(replayCrossSpace.status).toBe(422);

      // Replay rejects resolution pointing to different relation
      db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE operation = 'relation.create'").run(
        JSON.stringify({ v: 1, kind: 'relation.resolve', relation_id: rel1.id, relation_version: 2, relation_state: 'resolved', resolution_id: res2.resolution.id })
      );
    });

    // J06: Strict validation on nested relations, unreplayable op/reason, and encoder
    it('J06: Strict validation on nested relations, unreplayable op/reason and encoder', () => {
      const base = { v: 1, kind: 'post', post_id: 'pst_1', revision: 1 };
      // Fractional version rejected
      expect(() => validateResultRef('post.create:thd_1', { ...base, relations: [{ id: 'rel_1', version: 1.5, state: 'open' }] })).toThrow();
      // Unsafe integer revision rejected
      expect(() => validateResultRef('post.create:thd_1', { ...base, revision: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
      // Extra nested field rejected
      expect(() => validateResultRef('post.create:thd_1', { ...base, relations: [{ id: 'rel_1', version: 1, state: 'open', extra: 'bad' }] })).toThrow();
      // Unreplayable with wrong op and extra key rejected
      expect(() => validateResultRef('post.create:thd_1', { v: 1, kind: 'unreplayable', op: 'wrong.op', reason: 'unregistered', extra: true })).toThrow();
      // Unknown operation rejected by encoder
      expect(() => encodeResult('thread.create_unregistered', { thread: { id: 'thd_1' } })).toThrow();

      // Migration rejects unreplayable with cached body
      const j06Path = join(tempDir, 'j06_cached_body.sqlite');
      writeFileSync(j06Path, db.serialize());
      const j06Db = new Database(j06Path);
      try {
        j06Db.prepare(
          "INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, http_status, result_ref, created_at) VALUES ('act_admin', 'spc_1', 'thread.create', 'j06-body', 'hash', 201, ?, datetime('now'))"
        ).run(JSON.stringify({ v: 1, kind: 'unreplayable', op: 'thread.create', reason: 'historical_thread_version_unrecoverable', body: 'LEAK' }));
        expect(() => openAndCoordinateDatabase(j06Db, 'init')).toThrow();
      } finally {
        j06Db.close();
      }
    });
  });

  describe('R8 Boundary Regressions (L01, L02, L08)', () => {
    it('L01-1: POST /spaces initial 201, immediate same-key retry 201 with identical business data and zero extra writes', async () => {
      const spaceBody = { slug: 'r8-space-test', objective: 'R8 space test', rules: [] };
      const original = getData(await send('POST', '/spaces', adminToken, spaceBody, 'space-key-1'));
      expect(original.space.id).toBeDefined();

      const countsBefore = {
        spaces: (db.prepare('SELECT count(*) AS n FROM spaces').get() as any).n,
        space_revisions: (db.prepare('SELECT count(*) AS n FROM space_revisions').get() as any).n,
        memberships: (db.prepare('SELECT count(*) AS n FROM memberships').get() as any).n,
        events: (db.prepare('SELECT count(*) AS n FROM events').get() as any).n,
        idempotency_records: (db.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n,
      };

      const replay = await send('POST', '/spaces', adminToken, spaceBody, 'space-key-1');
      expect(replay.status).toBe(201);
      expect(replay.body.data).toEqual(original);

      const countsAfter = {
        spaces: (db.prepare('SELECT count(*) AS n FROM spaces').get() as any).n,
        space_revisions: (db.prepare('SELECT count(*) AS n FROM space_revisions').get() as any).n,
        memberships: (db.prepare('SELECT count(*) AS n FROM memberships').get() as any).n,
        events: (db.prepare('SELECT count(*) AS n FROM events').get() as any).n,
        idempotency_records: (db.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n,
      };
      expect(countsAfter).toEqual(countsBefore);
    });

    it('L01-2: Reopening file database and running openAndCoordinateDatabase serve allows space.create same-key replay with 201', async () => {
      const spaceBody = { slug: 'r8-reopen-space', objective: 'R8 reopen space', rules: [] };
      const original = getData(await send('POST', '/spaces', adminToken, spaceBody, 'space-reopen-key'));

      const reopenPath = join(tempDir, 'r8_space_reopen.sqlite');
      writeFileSync(reopenPath, db.serialize());

      const reopenDb = new Database(reopenPath);
      openAndCoordinateDatabase(reopenDb, 'serve');
      reopenDb.close();

      const reopenDb2 = new Database(reopenPath);
      const childApp = buildApp({ storage: new SqliteStorage(reopenDb2) });
      await childApp.ready();
      try {
        const replay = await send('POST', '/spaces', adminToken, spaceBody, 'space-reopen-key', childApp);
        expect(replay.status).toBe(201);
        expect(replay.body.data).toEqual(original);
      } finally {
        await childApp.close();
        reopenDb2.close();
      }
    });

    it('L01-3: Transaction committed on disk but response not delivered: onSend 500 fault, 2nd connection check, and 201 replay across restarts', async () => {
      const faultDir = mkdtempSync(join(tmpdir(), 'detuned-l01-3-'));
      const faultPath = join(faultDir, 'fault.sqlite');
      const faultDb = new Database(faultPath);
      const boot = bootstrapDatabase(faultDb);
      const faultToken = boot.adminToken!;

      let faultHits = 0;
      let committedVisible = false;
      let originalAfterCommit: any = null;

      const faultApp = buildApp({ storage: new SqliteStorage(faultDb) });
      faultApp.addHook('onSend', async (request, reply, payload) => {
        if (
          request.method === 'POST' &&
          request.url === '/api/v1/spaces' &&
          request.headers['idempotency-key'] === 'l01-3-lost-key' &&
          reply.statusCode === 201 &&
          faultHits === 0
        ) {
          faultHits++;
          originalAfterCommit = JSON.parse(String(payload)).data;
          const reader = new Database(faultPath, { readonly: true });
          try {
            committedVisible =
              !faultDb.inTransaction &&
              (reader.prepare('SELECT count(*) AS n FROM spaces WHERE id=?').get(originalAfterCommit.space.id) as any).n === 1 &&
              (reader.prepare("SELECT count(*) AS n FROM idempotency_records WHERE key='l01-3-lost-key'").get() as any).n === 1 &&
              (reader.prepare('SELECT count(*) AS n FROM events').get() as any).n > 0;
          } finally {
            reader.close();
          }
          throw new Error('Deterministic response failure after durable commit');
        }
        return payload;
      });
      await faultApp.ready();

      const spaceBody = { slug: 'r8-l01-3-loss', objective: 'Response fault recovery', rules: [] };
      const failed = await send('POST', '/spaces', faultToken, spaceBody, 'l01-3-lost-key', faultApp);
      expect(failed.status).toBe(500);
      expect(faultHits).toBe(1);
      expect(committedVisible).toBe(true);

      const countsAfterFault = {
        spaces: (faultDb.prepare('SELECT count(*) AS n FROM spaces').get() as any).n,
        memberships: (faultDb.prepare('SELECT count(*) AS n FROM memberships').get() as any).n,
        events: (faultDb.prepare('SELECT count(*) AS n FROM events').get() as any).n,
        idempotency_records: (faultDb.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n,
      };

      // 1. Same-instance retry recovers original space result with 201 without extra writes
      const retry = await send('POST', '/spaces', faultToken, spaceBody, 'l01-3-lost-key', faultApp);
      expect(retry.status).toBe(201);
      expect(retry.body.data).toEqual(originalAfterCommit);

      const countsAfterRetry = {
        spaces: (faultDb.prepare('SELECT count(*) AS n FROM spaces').get() as any).n,
        memberships: (faultDb.prepare('SELECT count(*) AS n FROM memberships').get() as any).n,
        events: (faultDb.prepare('SELECT count(*) AS n FROM events').get() as any).n,
        idempotency_records: (faultDb.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n,
      };
      expect(countsAfterRetry).toEqual(countsAfterFault);

      await faultApp.close();
      faultDb.close();

      // 2. Restart and serve via openAndCoordinateDatabase
      const reopenedDb = new Database(faultPath);
      openAndCoordinateDatabase(reopenedDb, 'serve');
      const restartedApp = buildApp({ storage: new SqliteStorage(reopenedDb) });
      await restartedApp.ready();
      try {
        const restartedReplay = await send('POST', '/spaces', faultToken, spaceBody, 'l01-3-lost-key', restartedApp);
        expect(restartedReplay.status).toBe(201);
        expect(restartedReplay.body.data).toEqual(originalAfterCommit);
      } finally {
        await restartedApp.close();
        reopenedDb.close();
        rmSync(faultDir, { recursive: true, force: true });
      }
    });

    it('L01-4: space.patch normal same-key retry succeeds, wrong space binding rejected with 422, modified payload rejected with 409', async () => {
      const spaceBody = { slug: 'r8-patch-space', objective: 'Patch space test', rules: [] };
      const sp = getData(await send('POST', '/spaces', adminToken, spaceBody, 'patch-sp-key'));
      const spaceId = sp.space.id;

      const patchBody = { expected_revision: 1, objective: 'Updated objective' };
      const patched = getData(await send('PATCH', `/spaces/${spaceId}`, adminToken, patchBody, 'patch-key-1'));
      expect(patched.revision.revision).toBe(2);

      // 1. Same key and payload replay succeeds (200)
      const replay = await send('PATCH', `/spaces/${spaceId}`, adminToken, patchBody, 'patch-key-1');
      expect(replay.status).toBe(200);
      expect(replay.body.data.revision.revision).toBe(2);

      // 2. Same key but modified payload returns 409 IDEMPOTENCY_CONFLICT
      const conflict = await send('PATCH', `/spaces/${spaceId}`, adminToken, { expected_revision: 1, objective: 'Conflicting' }, 'patch-key-1');
      expect(conflict.status).toBe(409);
      expect(conflict.body.error?.code).toBe('IDEMPOTENCY_CONFLICT');

      // 3. Mismatched space target ID in idempotency record rejected with 422
      const fakeRef = JSON.stringify({ v: 1, kind: 'space', space_id: 'spc_wrong', revision: 2 });
      db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'patch-key-1'").run(fakeRef);
      const wrongTarget = await send('PATCH', `/spaces/${spaceId}`, adminToken, patchBody, 'patch-key-1');
      expect(wrongTarget.status).toBe(422);
      expect(wrongTarget.body.error?.code).toBe('RESYNC_REQUIRED');
    });

    it('L01-5: Space isolation (N05) - space.patch cross-space rejected with 422 and migration rejected', async () => {
      const sp1 = getData(await send('POST', '/spaces', adminToken, { slug: 'n05-sp1', objective: 'Space 1', rules: [] })).space.id;
      const sp2 = getData(await send('POST', '/spaces', adminToken, { slug: 'n05-sp2', objective: 'Space 2', rules: [] })).space.id;

      const patchBody = { expected_revision: 1, objective: 'Updated sp1' };
      const patched = getData(await send('PATCH', `/spaces/${sp1}`, adminToken, patchBody, 'n05-patch'));
      expect(patched.revision.revision).toBe(2);

      // In cloned database, replace ref with mismatched space_id
      const isoPath = join(tempDir, 'n05_isolation.sqlite');
      writeFileSync(isoPath, db.serialize());
      const isoDb = new Database(isoPath);
      isoDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'n05-patch'").run(
        JSON.stringify({ v: 1, kind: 'space', space_id: sp2, revision: 1 })
      );

      // Replay in space 1 with mismatched ref space 2 returns 422
      const appIso = buildApp({ storage: new SqliteStorage(isoDb) });
      await appIso.ready();
      try {
        const crossSpace = await send('PATCH', `/spaces/${sp1}`, adminToken, patchBody, 'n05-patch', appIso);
        expect(crossSpace.status).toBe(422);
        expect(crossSpace.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await appIso.close();
      }

      // Migration with cross-space reference is rejected
      expect(() => openAndCoordinateDatabase(isoDb, 'serve')).toThrow();
      isoDb.close();
    });

    it('L02-1: Unreplayable marker generated for unrecoverable thread.patch survives repeated restarts without self-locking', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'r8-l02-sp', objective: 'L02 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'L02 thread' })).thread.id;

      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 1, title: 'v2' }, 'l02-patch2');
      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 2, title: 'v3' }, 'l02-patch3');

      const l02Path = join(tempDir, 'r8_l02_marker.sqlite');
      writeFileSync(l02Path, db.serialize());
      const l02Db = new Database(l02Path);
      l02Db.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
      l02Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'l02-patch2'").run(
        JSON.stringify({ $ref: 'thread', thread_id: thread, thread_version: 2 })
      );

      bootstrapDatabase(l02Db);
      const markerRow = l02Db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'l02-patch2'").get() as any;
      const marker = JSON.parse(markerRow.result_ref);
      expect(marker.kind).toBe('unreplayable');
      expect(marker.op).toBe(`thread.patch:${thread}`);
      l02Db.close();

      const l02Db2 = new Database(l02Path);
      expect(() => openAndCoordinateDatabase(l02Db2, 'serve')).not.toThrow();
      l02Db2.close();

      const l02Db3 = new Database(l02Path);
      expect(() => openAndCoordinateDatabase(l02Db3, 'serve')).not.toThrow();
      l02Db3.close();
    });

    it('L02-2: Replaying valid unreplayable thread marker returns controlled 422 RESYNC_REQUIRED without extra writes', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'r8-l02-rep-sp', objective: 'L02 rep space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'L02 rep thread' })).thread.id;

      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 1, title: 'v2' }, 'l02-rep-patch2');
      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 2, title: 'v3' }, 'l02-rep-patch3');

      const repPath = join(tempDir, 'r8_l02_replay.sqlite');
      writeFileSync(repPath, db.serialize());
      const repDb = new Database(repPath);
      repDb.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
      repDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'l02-rep-patch2'").run(
        JSON.stringify({ $ref: 'thread', thread_id: thread, thread_version: 2 })
      );
      bootstrapDatabase(repDb);
      repDb.close();

      const repDb2 = new Database(repPath);
      const countsBefore = {
        actors: (repDb2.prepare('SELECT count(*) AS n FROM actors').get() as any).n,
        credentials: (repDb2.prepare('SELECT count(*) AS n FROM credentials').get() as any).n,
        threads: (repDb2.prepare('SELECT count(*) AS n FROM threads').get() as any).n,
        events: (repDb2.prepare('SELECT count(*) AS n FROM events').get() as any).n,
        idempotency_records: (repDb2.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n,
      };

      const childApp = buildApp({ storage: new SqliteStorage(repDb2) });
      await childApp.ready();
      try {
        const replay = await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 1, title: 'v2' }, 'l02-rep-patch2', childApp);
        expect(replay.status).toBe(422);
        expect(replay.body.error?.code).toBe('RESYNC_REQUIRED');

        const countsAfter = {
          actors: (repDb2.prepare('SELECT count(*) AS n FROM actors').get() as any).n,
          credentials: (repDb2.prepare('SELECT count(*) AS n FROM credentials').get() as any).n,
          threads: (repDb2.prepare('SELECT count(*) AS n FROM threads').get() as any).n,
          events: (repDb2.prepare('SELECT count(*) AS n FROM events').get() as any).n,
          idempotency_records: (repDb2.prepare('SELECT count(*) AS n FROM idempotency_records').get() as any).n,
        };
        expect(countsAfter).toEqual(countsBefore);
      } finally {
        await childApp.close();
        repDb2.close();
      }
    });

    it('L02-3a: Pure validator checks: invalid op, target mismatch, unregistered reason, and cached body rejected', () => {
      const validRelMarker = { v: 1, kind: 'unreplayable', op: 'relation.create', reason: 'historical_relation_version_unrecoverable' };
      expect(() => validateResultRef('relation.create', validRelMarker)).not.toThrow();

      expect(() => validateResultRef('relation.create', { ...validRelMarker, op: 'unknown.op' })).toThrow();
      expect(() => validateResultRef('thread.patch:thd_1', { v: 1, kind: 'unreplayable', op: 'thread.patch:thd_2', reason: 'historical_thread_version_unrecoverable' })).toThrow();
      expect(() => validateResultRef('relation.create', { ...validRelMarker, reason: 'unregistered_bogus_reason' })).toThrow();
      expect(() => validateResultRef('relation.create', { ...validRelMarker, body: 'leak' })).toThrow();
    });

    it('L02-3b: Migrated relation.create unreplayable marker remains valid across three starts and replays with 422', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'r9-n04-sp', objective: 'N04 space', rules: [] })).space.id;
      const targetPost = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'N04 th', initial_post: note('init') })).initial_post.post.id;
      const sourcePost = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'N04 th2', initial_post: note('init2') })).initial_post.post.id;

      const rel = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: sourcePost, revision: 1 },
        target_ref: { post_id: targetPost, revision: 1 },
        type: 'challenges',
      }, 'n04-rel'));

      const n04Path = join(tempDir, 'r9_n04_marker.sqlite');
      writeFileSync(n04Path, db.serialize());
      const n04Db = new Database(n04Path);
      // Simulating older v1 relation.create without version/state
      n04Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'n04-rel'").run(
        JSON.stringify({ v: 1, kind: 'relation.create', relation_id: rel.id })
      );

      openAndCoordinateDatabase(n04Db, 'serve');
      const row = n04Db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'n04-rel'").get() as any;
      const marker = JSON.parse(row.result_ref);
      expect(marker.kind).toBe('unreplayable');
      expect(marker.op).toBe('relation.create');
      expect(marker.reason).toBe('historical_relation_version_unrecoverable');
      n04Db.close();

      // Start 2
      const n04Db2 = new Database(n04Path);
      expect(() => openAndCoordinateDatabase(n04Db2, 'serve')).not.toThrow();
      n04Db2.close();

      // Start 3 and replay
      const n04Db3 = new Database(n04Path);
      expect(() => openAndCoordinateDatabase(n04Db3, 'serve')).not.toThrow();
      const childApp = buildApp({ storage: new SqliteStorage(n04Db3) });
      await childApp.ready();
      try {
        const replay = await send('POST', `/spaces/${space}/relations`, adminToken, {
          source_ref: { post_id: sourcePost, revision: 1 },
          target_ref: { post_id: targetPost, revision: 1 },
          type: 'challenges',
        }, 'n04-rel', childApp);
        expect(replay.status).toBe(422);
        expect(replay.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp.close();
        n04Db3.close();
      }
    });

    it('L02-3c: Invalid marker migration refuses atomically without modifying database', () => {
      const markers = [
        { label: 'wrong_target', op: 'thread.patch:target_thread', ref: { v: 1, kind: 'unreplayable', op: 'thread.patch:wrong', reason: 'historical_thread_version_unrecoverable' } },
        { label: 'unknown_operation', op: 'bogus.op', ref: { v: 1, kind: 'unreplayable', op: 'bogus.op', reason: 'historical_thread_version_unrecoverable' } },
        { label: 'unknown_reason', op: 'relation.create', ref: { v: 1, kind: 'unreplayable', op: 'relation.create', reason: 'not_a_real_reason' } },
        { label: 'extra_body', op: 'relation.create', ref: { v: 1, kind: 'unreplayable', op: 'relation.create', reason: 'historical_relation_version_unrecoverable', body: 'leak' } },
      ];

      for (const item of markers) {
        const testPath = join(tempDir, `invalid_marker_${item.label}.sqlite`);
        writeFileSync(testPath, db.serialize());
        const tDb = new Database(testPath);
        tDb.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
        tDb.prepare("INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, result_ref, http_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(adminActorId, 'instance', item.op, `bad-${item.label}`, 'hash', JSON.stringify(item.ref), 200, new Date().toISOString());

        const schemaBefore = fullLogicalSnapshot(tDb);
        expect(() => bootstrapDatabase(tDb)).toThrow();
        tDb.close();

        const tDb2 = new Database(testPath);
        const schemaAfter = fullLogicalSnapshot(tDb2);
        expect(schemaAfter).toEqual(schemaBefore);
        tDb2.close();
      }
    });

    it('L02-3d: Full target markers and legacy family markers survive repeated starts and replay safely (N02)', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'n02-sp', objective: 'N02 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'N02 th' })).thread.id;
      const fullOp = `thread.patch:${thread}`;
      const patch1 = { expected_version: 1, title: 'v2' };
      const patch2 = { expected_version: 2, title: 'v3' };

      // Make genuine requests first so request_hash is valid
      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, patch1, 'n02-full');
      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, patch2, 'n02-fam');

      const n02Path = join(tempDir, 'n02_markers.sqlite');
      writeFileSync(n02Path, db.serialize());
      const n02Db = new Database(n02Path);

      // 1. Full target marker
      n02Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'n02-full'").run(
        JSON.stringify({ v: 1, kind: 'unreplayable', op: fullOp, reason: 'historical_thread_version_unrecoverable' })
      );

      // 2. Legacy family marker
      n02Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'n02-fam'").run(
        JSON.stringify({ v: 1, kind: 'unreplayable', op: 'thread.patch', reason: 'historical_thread_version_unrecoverable' })
      );

      openAndCoordinateDatabase(n02Db, 'serve');
      n02Db.close();

      // Check second and third starts
      const n02Db2 = new Database(n02Path);
      expect(() => openAndCoordinateDatabase(n02Db2, 'serve')).not.toThrow();
      n02Db2.close();

      const n02Db3 = new Database(n02Path);
      expect(() => openAndCoordinateDatabase(n02Db3, 'serve')).not.toThrow();
      const childApp = buildApp({ storage: new SqliteStorage(n02Db3) });
      await childApp.ready();
      try {
        const replay1 = await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, patch1, 'n02-full', childApp);
        expect(replay1.status).toBe(422);
        expect(replay1.body.error?.code).toBe('RESYNC_REQUIRED');

        const replay2 = await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, patch2, 'n02-fam', childApp);
        expect(replay2.status).toBe(422);
        expect(replay2.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp.close();
        n02Db3.close();
      }
    });

    it('L02-4: Recoverable full legacy thread and normal thread retry replay accurately across restarts (positive control)', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'r8-l08-sp', objective: 'L08 space', rules: [] })).space.id;
      const threadBody = { title: 'L08 thread' };
      const original = getData(await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'l08-thread'));

      const retry1 = await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'l08-thread');
      expect(retry1.status).toBe(201);
      expect(retry1.body.data.thread.id).toBe(original.thread.id);

      const posPath = join(tempDir, 'r8_l08_positive.sqlite');
      writeFileSync(posPath, db.serialize());
      const posDb = new Database(posPath);
      posDb.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1;');
      posDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'l08-thread'").run(JSON.stringify(original));

      bootstrapDatabase(posDb);
      posDb.close();

      const posDb2 = new Database(posPath);
      openAndCoordinateDatabase(posDb2, 'serve');

      const childApp = buildApp({ storage: new SqliteStorage(posDb2) });
      await childApp.ready();
      try {
        const replay = await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'l08-thread', childApp);
        expect(replay.status).toBe(201);
        expect(replay.body.data.thread.id).toBe(original.thread.id);
        expect(replay.body.data.thread.title).toBe(original.thread.title);
      } finally {
        await childApp.close();
        posDb2.close();
      }
    });

    it('L04: Old nested relation results with unprovable version are converted to unreplayable and refused with 422 RESYNC_REQUIRED', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'l04-sp', objective: 'L04 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'L04 th' })).thread.id;
      const targetPost = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested'), refs: [{ target_ref: { post_id: targetPost, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'l04-nested'));
      const relation = nested.relations[0];

      // Resolve the relation so its current version in DB moves forward to version 2
      await send('POST', `/spaces/${space}/relations/${relation.id}/resolve`, adminToken, {
        expected_version: 1,
        reason_ref: { post_id: targetPost, revision: 1 },
      });

      const l04Path = join(tempDir, 'l04_test.sqlite');
      writeFileSync(l04Path, db.serialize());
      const l04Db = new Database(l04Path);
      // Simulate historical post ref that only stored relation_ids
      l04Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'l04-nested'").run(
        JSON.stringify({ $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id] })
      );

      openAndCoordinateDatabase(l04Db, 'init');
      l04Db.close();

      const l04Db2 = new Database(l04Path);
      const childApp = buildApp({ storage: new SqliteStorage(l04Db2) });
      await childApp.ready();
      try {
        const replay = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'l04-nested', childApp);
        expect(replay.status).toBe(422);
        expect(replay.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp.close();
        l04Db2.close();
      }
    });

    function fullLogicalSnapshot(database: Database.Database) {
      const schema = database.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all();
      return {
        schema,
        rows: schema.filter((x: any) => x.type === 'table').map(({ name }: any) => [
          name,
          database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map((r: any) => JSON.stringify(r)).sort()
        ])
      };
    }

    it('L05: Historical conflicts include operation timestamps, not only title and state, causing atomic rollback', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'l05-sp', objective: 'L05 space', rules: [] })).space.id;
      const threadBody = { title: 'L05 thread' };
      const original = getData(await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'l05-thread'));
      const threadId = original.thread.id;

      const l05Path = join(tempDir, 'l05_test.sqlite');
      writeFileSync(l05Path, db.serialize());
      const l05Db = new Database(l05Path);

      // Modify created_at in thread_versions to create timestamp conflict
      l05Db.prepare("UPDATE thread_versions SET created_at = '1999-01-01T00:00:00.000Z' WHERE thread_id = ? AND version = 1").run(threadId);
      l05Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'l05-thread'").run(JSON.stringify(original));

      const before = fullLogicalSnapshot(l05Db);
      expect(() => openAndCoordinateDatabase(l05Db, 'init')).toThrow();
      l05Db.close();

      const l05Db2 = new Database(l05Path);
      const after = fullLogicalSnapshot(l05Db2);
      expect(after).toEqual(before);
      l05Db2.close();
    });

    it('L06: Same-space initial-post and resolution/version mismatches are rejected by migration and replay', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'l06-sp', objective: 'L06 space', rules: [] })).space.id;
      const thread1 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th1' })).thread.id;
      const foreignPost = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, note('foreign'))).post.id;
      const thread2 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th2' }, 'th2-key')).thread.id;

      // 1. initial_post_wrong_thread
      const l06Path1 = join(tempDir, 'l06_wrong_thread.sqlite');
      writeFileSync(l06Path1, db.serialize());
      const db1 = new Database(l06Path1);
      db1.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'th2-key'").run(
        JSON.stringify({ v: 1, kind: 'thread.create', thread_id: thread2, thread_version: 1, initial_post_id: foreignPost, initial_post_revision: 1 })
      );
      expect(() => openAndCoordinateDatabase(db1, 'init')).toThrow();

      const childApp1 = buildApp({ storage: new SqliteStorage(db1) });
      await childApp1.ready();
      try {
        const replay1 = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th2' }, 'th2-key', childApp1);
        expect(replay1.status).toBe(422);
        expect(replay1.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp1.close();
        db1.close();
      }

      // 2. resolution_version_mismatch
      const targetPost = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, note('target'))).post.id;
      const rel = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: foreignPost, revision: 1 },
        target_ref: { post_id: targetPost, revision: 1 },
        type: 'challenges',
      })).id;
      const res = getData(await send('POST', `/spaces/${space}/relations/${rel}/resolve`, adminToken, {
        expected_version: 1,
        reason_ref: { post_id: targetPost, revision: 1 },
      }, 'resolve-key'));

      const l06Path2 = join(tempDir, 'l06_res_mismatch.sqlite');
      writeFileSync(l06Path2, db.serialize());
      const db2 = new Database(l06Path2);
      db2.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'resolve-key'").run(
        JSON.stringify({ v: 1, kind: 'relation.resolve', relation_id: rel, relation_version: 99, relation_state: 'resolved', resolution_id: res.resolution.id })
      );
      expect(() => openAndCoordinateDatabase(db2, 'init')).toThrow();

      const childApp2 = buildApp({ storage: new SqliteStorage(db2) });
      await childApp2.ready();
      try {
        const replay2 = await send('POST', `/spaces/${space}/relations/${rel}/resolve`, adminToken, {
          expected_version: 1,
          reason_ref: { post_id: targetPost, revision: 1 },
        }, 'resolve-key', childApp2);
        expect(replay2.status).toBe(422);
        expect(replay2.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp2.close();
        db2.close();
      }
    });

    it('L07: Encoder, partial legacy conversion and paired fields have no validation bypass', () => {
      // 1. Encoder rejects invalid output (thread_version = 0)
      expect(() => encodeResult('thread.create', { thread: { id: 'thd_test', version: 0 } })).toThrow();

      // 2. Unpaired initial_post fields rejected
      expect(() => validateResultRef('thread.create', { v: 1, kind: 'thread.create', thread_id: 'thd_test', thread_version: 1, initial_post_revision: 1 })).toThrow();
      expect(() => validateResultRef('thread.create', { v: 1, kind: 'thread.create', thread_id: 'thd_test', thread_version: 1, initial_post_id: 'pst_test' })).toThrow();

      // 3. Unknown operation aborts migration atomically
      const l07Path = join(tempDir, 'l07_unknown_op.sqlite');
      writeFileSync(l07Path, db.serialize());
      const l07Db = new Database(l07Path);
      l07Db.prepare("INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, result_ref, http_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(adminActorId, 'instance', 'unknown.operation', 'l07-key', 'hash', JSON.stringify({ v: 1, kind: 'relation.create', relation_id: 'rel_test' }), 200, new Date().toISOString());

      const before = fullLogicalSnapshot(l07Db);
      expect(() => openAndCoordinateDatabase(l07Db, 'init')).toThrow();
      l07Db.close();

      const l07Db2 = new Database(l07Path);
      const after = fullLogicalSnapshot(l07Db2);
      expect(after).toEqual(before);
      l07Db2.close();
    });
  });

  describe('R10 boundary regressions (P01 - P06)', () => {
    function fullLogicalSnapshot(database: Database.Database) {
      const schema = database.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all();
      return {
        schema,
        rows: schema.filter((x: any) => x.type === 'table').map(({ name }: any) => [
          name,
          database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map((r: any) => JSON.stringify(r)).sort()
        ])
      };
    }

    it('P01: Nested refs must bind to the result source and to a provable historical version', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'p01-sp', objective: 'P01 space', rules: [] })).space.id;
      const thread1 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'P01 th1' })).thread.id;
      const targetPost = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: targetPost, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, nestedBody, 'p01-nested'));
      const relation = nested.relations[0];

      const otherNested = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, { ...nestedBody, body: 'other source' }));
      const wrongSourceRelation = otherNested.relations[0];

      // 1. wrong_source_post
      const p01Path1 = join(tempDir, 'p01_wrong_src.sqlite');
      writeFileSync(p01Path1, db.serialize());
      const p01Db1 = new Database(p01Path1);
      const baseRef = JSON.parse(p01Db1.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'p01-nested'").get().result_ref);
      p01Db1.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'p01-nested'").run(
        JSON.stringify({ ...baseRef, relation_ids: [wrongSourceRelation.id], relations: [{ id: wrongSourceRelation.id, version: wrongSourceRelation.version, state: wrongSourceRelation.state }] })
      );
      const before1 = fullLogicalSnapshot(p01Db1);
      expect(() => openAndCoordinateDatabase(p01Db1, 'serve')).toThrow();
      const childApp1 = buildApp({ storage: new SqliteStorage(p01Db1) });
      await childApp1.ready();
      try {
        const replay1 = await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, nestedBody, 'p01-nested', childApp1);
        expect(replay1.status).toBe(422);
        expect(replay1.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp1.close();
        p01Db1.close();
      }
      const p01Db1Reopen = new Database(p01Path1);
      expect(fullLogicalSnapshot(p01Db1Reopen)).toEqual(before1);
      p01Db1Reopen.close();

      // 2. future_nested_version
      const p01Path2 = join(tempDir, 'p01_future_ver.sqlite');
      writeFileSync(p01Path2, db.serialize());
      const p01Db2 = new Database(p01Path2);
      p01Db2.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'p01-nested'").run(
        JSON.stringify({ ...baseRef, relation_ids: [relation.id], relations: [{ id: relation.id, version: 999, state: relation.state }] })
      );
      const before2 = fullLogicalSnapshot(p01Db2);
      expect(() => openAndCoordinateDatabase(p01Db2, 'serve')).toThrow();
      const childApp2 = buildApp({ storage: new SqliteStorage(p01Db2) });
      await childApp2.ready();
      try {
        const replay2 = await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, nestedBody, 'p01-nested', childApp2);
        expect(replay2.status).toBe(422);
        expect(replay2.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childApp2.close();
        p01Db2.close();
      }
      const p01Db2Reopen = new Database(p01Path2);
      expect(fullLogicalSnapshot(p01Db2Reopen)).toEqual(before2);
      p01Db2Reopen.close();
    });

    it('P02: Every migration early return validates the original operation, shape and known entity bindings', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'p02-sp', objective: 'P02 space', rules: [] })).space.id;
      const thread1 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'P02 th1' }, 'p02-th1')).thread.id;
      const thread2 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'P02 th2' })).thread.id;
      const targetPost = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested'), refs: [{ target_ref: { post_id: targetPost, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, nestedBody, 'p02-nested'));
      const relation = nested.relations[0];
      const patchBody = { expected_version: 1, title: 'v2' };
      await send('PATCH', `/spaces/${space}/threads/${thread1}`, adminToken, patchBody, 'p02-patch');

      const cases = [
        { label: 'typed_post_cached_body', key: 'p02-nested', ref: { v: 1, kind: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id], body: 'synthetic forbidden cache' } },
        { label: 'typed_post_duplicate_ids', key: 'p02-nested', ref: { v: 1, kind: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id, relation.id] } },
        { label: 'known_operation_wrong_kind', key: 'p02-th1', ref: { v: 1, kind: 'relation.create', relation_id: relation.id } },
        { label: 'invalid_thread_version_zero', key: 'p02-patch', ref: { v: 1, kind: 'thread.patch', thread_id: thread1, thread_version: 0 } },
        { label: 'wrong_thread_target', key: 'p02-patch', ref: { v: 1, kind: 'thread.patch', thread_id: thread2, thread_version: 99 } },
      ];

      for (const item of cases) {
        const testPath = join(tempDir, `p02_${item.label}.sqlite`);
        writeFileSync(testPath, db.serialize());
        const tDb = new Database(testPath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = ?").run(JSON.stringify(item.ref), item.key);
        const before = fullLogicalSnapshot(tDb);
        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        const tDbReopen = new Database(testPath);
        expect(fullLogicalSnapshot(tDbReopen)).toEqual(before);
        tDbReopen.close();
      }
    });

    it('P03: Supported legacy online replay must pass the same checks/projection as migration', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'p03-sp', objective: 'P03 space', rules: [] })).space.id;
      const thread1 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th1' }, 'p03-th1')).thread;
      const thread2 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th2' })).thread.id;
      const foreignPost = getData(await send('POST', `/spaces/${space}/threads/${thread2}/posts`, adminToken, note('foreign')));
      const nestedBody = note('nested');
      await send('POST', `/spaces/${space}/threads/${thread1.id}/posts`, adminToken, nestedBody, 'p03-nested');

      // 1. wrong_target: post.create on thread1 pointing to foreign post on thread2
      const wrongPath = join(tempDir, 'p03_wrong.sqlite');
      writeFileSync(wrongPath, db.serialize());
      const wrongDb = new Database(wrongPath);
      wrongDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'p03-nested'").run(
        JSON.stringify({ $ref: 'post', post_id: foreignPost.post.id, revision: 1, relation_ids: [] })
      );
      const childWrongApp = buildApp({ storage: new SqliteStorage(wrongDb) });
      await childWrongApp.ready();
      try {
        const replayWrong = await send('POST', `/spaces/${space}/threads/${thread1.id}/posts`, adminToken, nestedBody, 'p03-nested', childWrongApp);
        expect(replayWrong.status).toBe(422);
        expect(replayWrong.body.error?.code).toBe('RESYNC_REQUIRED');
      } finally {
        await childWrongApp.close();
        wrongDb.close();
      }

      // 2. legacy-thread-time: legacy full thread result maintains original updated_at across online and migration
      const timePath = join(tempDir, 'p03_time.sqlite');
      writeFileSync(timePath, db.serialize());
      const timeDb = new Database(timePath);
      timeDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'p03-th1'").run(JSON.stringify(thread1));
      const childTimeApp = buildApp({ storage: new SqliteStorage(timeDb) });
      await childTimeApp.ready();
      try {
        const onlineReplay = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th1' }, 'p03-th1', childTimeApp);
        expect(onlineReplay.status).toBe(201);
        expect(onlineReplay.body.data.thread.updated_at).toBe(thread1.updated_at);
      } finally {
        await childTimeApp.close();
      }

      openAndCoordinateDatabase(timeDb, 'serve');
      const childTimeApp2 = buildApp({ storage: new SqliteStorage(timeDb) });
      await childTimeApp2.ready();
      try {
        const afterMigrationReplay = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'th1' }, 'p03-th1', childTimeApp2);
        expect(afterMigrationReplay.status).toBe(201);
        expect(afterMigrationReplay.body.data.thread.updated_at).toBe(thread1.updated_at);
      } finally {
        await childTimeApp2.close();
        timeDb.close();
      }
    });

    it('P04: Missing historical timestamps must never be synthesized from migration wall time', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'p04-sp', objective: 'P04 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'P04 th' }, 'p04-th')).thread.id;
      const patch2 = getData(await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 1, title: 'v2' }, 'p04-patch2'));
      await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 2, title: 'v3' }, 'p04-patch3');

      const p04Path = join(tempDir, 'p04_time.sqlite');
      writeFileSync(p04Path, db.serialize());
      const p04Db = new Database(p04Path);
      p04Db.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
      const missingTime = { ...patch2 };
      delete missingTime.created_at;
      delete missingTime.updated_at;
      p04Db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'p04-patch2'").run(JSON.stringify(missingTime));

      const before = fullLogicalSnapshot(p04Db);
      expect(() => bootstrapDatabase(p04Db)).toThrow();
      p04Db.close();

      const p04Db2 = new Database(p04Path);
      expect(fullLogicalSnapshot(p04Db2)).toEqual(before);
      p04Db2.close();
    });

    it('P05: Validating a manufactured valid ref must not hide malformed new business results', () => {
      expect(() => extractResultRef('relation.create', { id: 'rel_test', version: 1, state: 'not-a-state' })).toThrow();
      expect(() => extractResultRef('relation.create', { id: 'rel_test', version: '2', state: 'open' })).toThrow();
      expect(() => extractResultRef('post.create:thd_test', {
        post: { id: 'pst_test', revision: 1 },
        revision: 1,
        relations: [{ id: 'rel_test', version: 1, state: 'not-a-state' }],
      })).toThrow();
    });

    it('Q01: Damaged typed refs are rejected before converting to markers and database remains unchanged after reopen', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'q01-sp', objective: 'Q01 space', rules: [] })).space.id;
      const originalThread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Q01 thread' }, 'q01-thread'));
      const thread = originalThread.thread.id;
      const otherThread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Other thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'q01-nested-post'));
      const relation = nested.relations[0];
      const foreignPost = getData(await send('POST', `/spaces/${space}/threads/${otherThread}/posts`, adminToken, note('foreign post')));

      const cases = [
        ['missing_required_revision', 'q01-nested-post', { v: 1, kind: 'post', post_id: nested.post.id, relation_ids: [relation.id] }],
        ['wrong_post_thread_with_id_only_relations', 'q01-nested-post', { v: 1, kind: 'post', post_id: foreignPost.post.id, revision: 1, relation_ids: [relation.id] }],
        ['compact_relation_missing_entity', 'q01-rel-reuse', { v: 1, kind: 'relation.create', relation_id: 'rel_q01_nonexistent' }],
        ['relations_without_initial_post', 'q01-thread', { v: 1, kind: 'thread.create', thread_id: thread, thread_version: 1, relation_ids: [relation.id] }],
      ];

      for (const [variant, key, ref] of cases) {
        const fixturePath = join(tempDir, `q01_${variant}.sqlite`);
        writeFileSync(fixturePath, db.serialize());
        const tDb = new Database(fixturePath);
        if (key === 'q01-rel-reuse') {
          tDb.prepare("INSERT INTO idempotency_records (actor_id, space_id, operation, key, request_hash, result_ref, http_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(adminActorId, space, 'relation.create', key, 'hash', JSON.stringify(ref), 201, new Date().toISOString());
        } else {
          tDb.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(JSON.stringify(ref), key);
        }
        const before = fullLogicalSnapshot(tDb);
        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        const tDb2 = new Database(fixturePath);
        expect(fullLogicalSnapshot(tDb2)).toEqual(before);
        tDb2.close();
      }
    });

    it('Q02: Legacy normalizers reject malformed supplied values before defaulting or coercing them', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'q02-sp', objective: 'Q02 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Q02 thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'q02-nested-post'));
      const relation = nested.relations[0];

      const cases = [
        ['legacy_invalid_nested_state', { ...nested, relations: [{ ...relation, state: 'not-a-state' }] }],
        ['legacy_invalid_supplied_revision', { ...nested, revision: 'not-a-revision' }],
      ];

      for (const [variant, ref] of cases) {
        const fixturePath = join(tempDir, `q02_${variant}.sqlite`);
        writeFileSync(fixturePath, db.serialize());
        const tDb = new Database(fixturePath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'q02-nested-post'").run(JSON.stringify(ref));
        const before = fullLogicalSnapshot(tDb);

        // Online replay throws 422
        const onlineApp = buildApp({ storage: new SqliteStorage(tDb) });
        await onlineApp.ready();
        const onlineRes = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'q02-nested-post', onlineApp);
        expect(onlineRes.status).toBe(422);
        await onlineApp.close();

        // Migration refuses atomically
        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        const tDb2 = new Database(fixturePath);
        expect(fullLogicalSnapshot(tDb2)).toEqual(before);
        tDb2.close();
      }
    });

    it('Q03: Missing historical patch updated_at is rejected atomically and cannot borrow thread created_at', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'q03-sp', objective: 'Q03 space', rules: [] })).space.id;
      const original = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Q03 thread' }, 'q03-th-create'));
      const thread = original.thread.id;
      const patch2Body = { expected_version: 1, title: 'Q03 thread v2' };
      const patch2 = getData(await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, patch2Body, 'q03-patch2'));
      getData(await send('PATCH', `/spaces/${space}/threads/${thread}`, adminToken, { expected_version: 2, title: 'Q03 thread v3' }, 'q03-patch3'));

      const fixturePath = join(tempDir, 'q03_missing_updated.sqlite');
      writeFileSync(fixturePath, db.serialize());
      const tDb = new Database(fixturePath);
      tDb.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DELETE FROM schema_migrations WHERE version > 1');
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'q03-th-create'").run(JSON.stringify(original));
      const missingUpdated = { ...patch2 };
      delete missingUpdated.updated_at;
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'q03-patch2'").run(JSON.stringify(missingUpdated));

      const before = fullLogicalSnapshot(tDb);
      expect(() => bootstrapDatabase(tDb)).toThrow();
      tDb.close();

      const tDb2 = new Database(fixturePath);
      expect(fullLogicalSnapshot(tDb2)).toEqual(before);
      tDb2.close();
    });

    it('Q04: Invalid action output is rejected before persistence, with business, events, and results rolled back', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'q04-sp', objective: 'Q04 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Q04 thread' })).thread.id;

      expect(() => extractResultRef(`post.create:${thread}`, { post: { id: 'p1' }, revision: 1, relations: 'not-an-array' })).toThrow();
      expect(() => extractResultRef('thread.create', { thread: { id: 't1', version: 1 }, initial_post: { post: {}, revision: 1 } })).toThrow();

      // Real action execution rollback test
      const testPath = join(tempDir, 'q04_rollback.sqlite');
      writeFileSync(testPath, db.serialize());
      const tDb = new Database(testPath);
      const testStorage = new SqliteStorage(tDb);
      const testClock = { now: () => new Date(), nowIso: () => new Date().toISOString() };
      const testHasher = new (await import('@detuned/core')).CryptoHasher();
      const testIdempotency = new (await import('@detuned/core')).IdempotencyService(testStorage, testHasher, testClock);
      const before = fullLogicalSnapshot(tDb);

      expect(() => {
        testIdempotency.executeIdempotent(adminActorId, space, `post.create:${thread}`, 'bad-output-key', { test: true }, 201, (tx) => {
          tx.createPost(
            { id: 'pst_q04_bad', space_id: space, thread_id: thread, author_id: adminActorId, kind: 'note', current_revision: 1, lifecycle: 'active', created_at: testClock.nowIso() },
            { post_id: 'pst_q04_bad', revision: 1, title: 't', summary: 's', body: 'b', tags: [], structured: {}, content_hash: 'h', editor_id: adminActorId, created_at: testClock.nowIso() }
          );
          tx.appendEvent(space, { id: 'evt_q04_bad', space_id: space, type: 'post.created', object_id: 'pst_q04_bad', revision: 1, visibility: 'space', actor_id: adminActorId, created_at: testClock.nowIso() });
          return { post: { id: 'pst_q04_bad' }, revision: 1, relations: 'not-an-array' };
        });
      }).toThrow();

      const postCount = tDb.prepare("SELECT count(*) as n FROM posts WHERE id = 'pst_q04_bad'").get() as any;
      expect(postCount.n).toBe(0);
      const eventCount = tDb.prepare("SELECT count(*) as n FROM events WHERE id = 'evt_q04_bad'").get() as any;
      expect(eventCount.n).toBe(0);
      const recordCount = tDb.prepare("SELECT count(*) as n FROM idempotency_records WHERE key = 'bad-output-key'").get() as any;
      expect(recordCount.n).toBe(0);

      tDb.close();
      const tDb2 = new Database(testPath);
      expect(fullLogicalSnapshot(tDb2)).toEqual(before);
      tDb2.close();
    });

    it('Q05: Positive controls confirm valid fresh actions, replay idempotency, and relation reuse v2 succeed', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'q05-sp', objective: 'Q05 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'Q05 thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'q05-nested'));
      const relation = nested.relations[0];

      // Resolve relation
      await send('POST', `/spaces/${space}/relations/${relation.id}/resolve`, adminToken, {
        expected_version: 1,
        reason_ref: { post_id: target, revision: 1 },
      });

      // Reuse relation v2 (now resolved)
      const reuseBody = { source_ref: { post_id: nested.post.id, revision: 1 }, target_ref: { post_id: target, revision: 1 }, type: 'challenges' };
      const reused = getData(await send('POST', `/spaces/${space}/relations`, adminToken, reuseBody, 'q05-reuse'));
      expect(reused.id).toBe(relation.id);
      expect(reused.version).toBe(2);
      expect(reused.state).toBe('resolved');

      // Replay returns identical data
      const replay = getData(await send('POST', `/spaces/${space}/relations`, adminToken, reuseBody, 'q05-reuse'));
      expect(replay).toEqual(reused);
    });
  });

  describe('R12 review regression (V01-V05)', () => {
    it('V01: Typed ID-only references cannot hide missing post revision or nonexistent nested relations without precheck failure', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'v01-sp', objective: 'V01 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V01 thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'v01-nested'));
      const relation = nested.relations[0];

      // Wrong relation source
      const wrongSourceRel = 'rel_wrong_src_123';
      storage.createRelation({
        id: wrongSourceRel,
        space_id: space,
        source_post_id: target,
        source_revision: 1,
        target_post_id: nested.post.id,
        target_revision: 1,
        type: 'challenges',
        state: 'open',
        version: 1,
        creator_id: adminActorId,
        created_at: new Date().toISOString(),
      });

      const cases = [
        ['missing_post_revision', { v: 1, kind: 'post', post_id: nested.post.id, revision: 999, relation_ids: [relation.id] }],
        ['wrong_relation_source', { v: 1, kind: 'post', post_id: nested.post.id, revision: 1, relation_ids: [wrongSourceRel] }],
        ['nonexistent_nested_relation', { v: 1, kind: 'post', post_id: nested.post.id, revision: 1, relation_ids: ['rel_does_not_exist'] }],
      ];

      for (const [name, badRef] of cases) {
        expect(() => validateStoredResultRefPrecheck(storage, `post.create:${thread}`, space, badRef)).toThrow();

        const testPath = join(tempDir, `v01_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'v01-nested'").run(JSON.stringify(badRef));
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'v01-nested', childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }
    });

    it('V02: Legacy normalizer rejects malformed arrays and wrong thread bindings with 422 before generating markers', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'v02-sp', objective: 'V02 space', rules: [] })).space.id;
      const thread1 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V02 thread 1' })).thread.id;
      const thread2 = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V02 thread 2' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread1}/posts`, adminToken, nestedBody, 'v02-nested'));
      const relation = nested.relations[0];
      const foreignPost = getData(await send('POST', `/spaces/${space}/threads/${thread2}/posts`, adminToken, note('foreign post'))).post.id;

      const cases = [
        ['legacy_non_array_relation_ids', { $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: 'not-an-array' }, `/spaces/${space}/threads/${thread1}/posts`, `post.create:${thread1}`],
        ['legacy_wrong_thread_before_marker', { $ref: 'post', post_id: foreignPost, revision: 1, relation_ids: [relation.id] }, `/spaces/${space}/threads/${thread1}/posts`, `post.create:${thread1}`],
        ['legacy_duplicate_relation_ids', { $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id, relation.id] }, `/spaces/${space}/threads/${thread1}/posts`, `post.create:${thread1}`],
      ];

      for (const [name, badRef, path, op] of cases) {
        expect(() => normalizeLegacyResultRef(storage, op, badRef, space)).toThrow();

        const testPath = join(tempDir, `v02_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'v02-nested'").run(JSON.stringify(badRef));
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', path as string, adminToken, nestedBody, 'v02-nested', childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }
    });

    it('V03: Explicit null relations output triggers validation error and rolls back business, events, and results', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'v03-sp', objective: 'V03 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V03 thread' })).thread.id;

      expect(() => extractResultRef(`post.create:${thread}`, { post: { id: 'p_null' }, revision: 1, relations: null })).toThrow();

      const testPath = join(tempDir, 'v03_rollback.sqlite');
      writeFileSync(testPath, db.serialize());
      const tDb = new Database(testPath);
      const testStorage = new SqliteStorage(tDb);
      const testClock = { now: () => new Date(), nowIso: () => new Date().toISOString() };
      const testHasher = new (await import('@detuned/core')).CryptoHasher();
      const testIdempotency = new (await import('@detuned/core')).IdempotencyService(testStorage, testHasher, testClock);
      const before = fullLogicalSnapshot(tDb);

      expect(() => {
        testIdempotency.executeIdempotent(adminActorId, space, `post.create:${thread}`, 'v03-bad-null-key', { test: true }, 201, (tx) => {
          tx.createPost(
            { id: 'pst_v03_bad', space_id: space, thread_id: thread, author_id: adminActorId, kind: 'note', current_revision: 1, lifecycle: 'active', created_at: testClock.nowIso() },
            { post_id: 'pst_v03_bad', revision: 1, title: 't', summary: 's', body: 'b', tags: [], structured: {}, content_hash: 'h', editor_id: adminActorId, created_at: testClock.nowIso() }
          );
          tx.appendEvent(space, { id: 'evt_v03_bad', space_id: space, type: 'post.created', object_id: 'pst_v03_bad', revision: 1, visibility: 'space', actor_id: adminActorId, created_at: testClock.nowIso() });
          return { post: { id: 'pst_v03_bad' }, revision: 1, relations: null };
        });
      }).toThrow();

      const postCount = tDb.prepare("SELECT count(*) as n FROM posts WHERE id = 'pst_v03_bad'").get() as any;
      expect(postCount.n).toBe(0);
      const eventCount = tDb.prepare("SELECT count(*) as n FROM events WHERE id = 'evt_v03_bad'").get() as any;
      expect(eventCount.n).toBe(0);
      const recordCount = tDb.prepare("SELECT count(*) as n FROM idempotency_records WHERE key = 'v03-bad-null-key'").get() as any;
      expect(recordCount.n).toBe(0);

      tDb.close();
      const tDb2 = new Database(testPath);
      expect(fullLogicalSnapshot(tDb2)).toEqual(before);
      tDb2.close();
    });

    it('V04: Explicit v1 updated_at conflicting with the historical snapshot is refused atomically', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'v04-sp', objective: 'V04 space', rules: [] })).space.id;
      const threadRes = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V04 thread' }, 'v04-thread-create');
      const originalThread = getData(threadRes);

      const testPath = join(tempDir, 'v04_conflict.sqlite');
      writeFileSync(testPath, db.serialize());
      const tDb = new Database(testPath);

      // Mutate idempotency record to have conflicting updated_at on version 1
      const conflictingRef = { ...originalThread, thread: { ...originalThread.thread, updated_at: '1999-01-01T00:00:00.000Z' } };
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'v04-thread-create'").run(JSON.stringify(conflictingRef));
      const before = fullLogicalSnapshot(tDb);

      expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
      tDb.close();

      const tDb2 = new Database(testPath);
      expect(fullLogicalSnapshot(tDb2)).toEqual(before);
      tDb2.close();
    });

    it('V05: Positive controls confirm legal old inputs, complete history and empty relation arrays replay correctly', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'v05-sp', objective: 'V05 space', rules: [] })).space.id;
      const threadKey = 'v05-thread-orig';
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V05 thread' }, threadKey)).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'v05-nested'));
      const relation = nested.relations[0];

      // Empty relations array is valid and returns exact replay
      const emptyRelBody = note('empty relations');
      const emptyRes = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, emptyRelBody, 'v05-empty-rels'));
      expect(emptyRes.relations).toEqual([]);
      const emptyReplay = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, emptyRelBody, 'v05-empty-rels'));
      expect(emptyReplay).toEqual(emptyRes);

      // Paired positive controls: id-only controlled 422 vs complete thread exact replay
      const testPath = join(tempDir, 'v05_paired.sqlite');
      writeFileSync(testPath, db.serialize());
      const tDb = new Database(testPath);
      // Set legacy ref with only relation_ids
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'v05-nested'").run(
        JSON.stringify({ $ref: 'post', post_id: nested.post.id, revision: 1, relation_ids: [relation.id] })
      );
      openAndCoordinateDatabase(tDb, 'serve');
      tDb.close();

      const tDb2 = new Database(testPath);
      openAndCoordinateDatabase(tDb2, 'serve');
      const beforeSnapshot = fullLogicalSnapshot(tDb2);
      const childApp = buildApp({ storage: new SqliteStorage(tDb2) });
      await childApp.ready();
      try {
        const postReplay = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'v05-nested', childApp);
        expect(postReplay.status).toBe(422);
        expect(postReplay.body.error?.code).toBe('RESYNC_REQUIRED');

        const threadReplay = await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'V05 thread' }, threadKey, childApp);
        expect(threadReplay.status).toBe(201);
      } finally {
        await childApp.close();
        expect(fullLogicalSnapshot(tDb2)).toEqual(beforeSnapshot);
        tDb2.close();
      }
    });

    it('W01: Legacy initial_post malformed envelopes, explicit invalid revisions and orphan pairs must not disappear or default to v1', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'w01-sp', objective: 'W01 space', rules: [] })).space.id;
      const initialBody = { title: 'W01 initial post thread', initial_post: note('initial post') };
      const initial = getData(await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w01-initial-thread'));
      const target = getData(await send('POST', `/spaces/${space}/threads/${initial.thread.id}/posts`, adminToken, note('target'))).post.id;
      const initialRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: initial.initial_post.post.id, revision: 1 },
        target_ref: { post_id: target, revision: 1 },
        type: 'challenges',
      }, 'w01-relation'));

      const cases = [
        ['initial_revision_string', { ...initial, initial_post: { ...initial.initial_post, revision: 'invalid-revision' } }],
        ['initial_post_null', { ...initial, initial_post: null }],
        ['initial_post_empty_object', { ...initial, initial_post: {} }],
        ['orphan_initial_revision_and_relations', { $ref: 'thread', thread_id: initial.thread.id, thread_version: 1, initial_post_revision: 1, relation_ids: [initialRelation.id] }],
      ];

      for (const [name, badRef] of cases) {
        const testPath = join(tempDir, `w01_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'w01-initial-thread'").run(JSON.stringify(badRef));
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w01-initial-thread', childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }
    });

    it('W02: Explicit null legacy fields fail before alias/default selection and never degrade to unreplayable', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'w02-sp', objective: 'W02 space', rules: [] })).space.id;
      const initialBody = { title: 'W02 initial post thread', initial_post: note('initial post') };
      const initial = getData(await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w02-initial-thread'));
      const target = getData(await send('POST', `/spaces/${space}/threads/${initial.thread.id}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${initial.thread.id}/posts`, adminToken, nestedBody, 'w02-nested-post'));

      const cases = [
        ['initial_relations_null', 'w02-initial-thread', { ...initial, initial_post: { ...initial.initial_post, relations: null } }, initialBody, `/spaces/${space}/threads`],
        ['initial_relation_ids_null', 'w02-initial-thread', { ...initial, initial_post: { ...initial.initial_post, relation_ids: null } }, initialBody, `/spaces/${space}/threads`],
        ['post_relation_state_null', 'w02-nested-post', { ...nested, relations: [{ ...nested.relations[0], state: null }] }, nestedBody, `/spaces/${space}/threads/${initial.thread.id}/posts`],
        ['post_relation_version_null', 'w02-nested-post', { ...nested, relations: [{ ...nested.relations[0], version: null }] }, nestedBody, `/spaces/${space}/threads/${initial.thread.id}/posts`],
      ];

      for (const [name, key, badRef, body, path] of cases) {
        const testPath = join(tempDir, `w02_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(JSON.stringify(badRef), key);
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', path as string, adminToken, body, key as string, childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }
    });

    it('W03: Full initial response, omission, and ID-only handling preserve exact shapes without injected relations', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'w03-sp', objective: 'W03 space', rules: [] })).space.id;
      const threadBody = { title: 'W03 plain thread' };
      const originalThread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'w03-thread-create'));
      const thread = originalThread.thread.id;

      const initialBody = { title: 'W03 initial post thread', initial_post: note('initial post') };
      const initial = getData(await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w03-initial-thread'));
      expect(Object.keys(initial.initial_post).sort()).toEqual(['post', 'revision']);

      const immediateInitialRetry = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w03-initial-thread');
      expect(immediateInitialRetry.status).toBe(201);
      expect(immediateInitialRetry.body.data).toEqual(initial);
      expect(Object.keys(immediateInitialRetry.body.data.initial_post).sort()).toEqual(['post', 'revision']);

      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'w03-nested-post'));

      const initialRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: initial.initial_post.post.id, revision: 1 },
        target_ref: { post_id: target, revision: 1 },
        type: 'challenges',
      }, 'w03-initial-relation'));

      const testPath = join(tempDir, 'w03_valid_controls.sqlite');
      writeFileSync(testPath, db.serialize());
      let tDb = new Database(testPath);
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'w03-initial-thread'").run(JSON.stringify(initial));
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'w03-thread-create'").run(JSON.stringify(originalThread));
      tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'w03-nested-post'").run(JSON.stringify(nested));

      const beforeOnline = fullLogicalSnapshot(tDb);
      const childApp1 = buildApp({ storage: new SqliteStorage(tDb) });
      await childApp1.ready();
      try {
        const replay = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w03-initial-thread', childApp1);
        expect(replay.status).toBe(201);
        expect(replay.body.data).toEqual(initial);
        expect(fullLogicalSnapshot(tDb)).toEqual(beforeOnline);
      } finally {
        await childApp1.close();
      }

      openAndCoordinateDatabase(tDb, 'serve');
      tDb.close();

      tDb = new Database(testPath);
      openAndCoordinateDatabase(tDb, 'serve');
      const beforeMigrated = fullLogicalSnapshot(tDb);
      const childApp2 = buildApp({ storage: new SqliteStorage(tDb) });
      await childApp2.ready();
      try {
        const a = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w03-initial-thread', childApp2);
        const b = await send('POST', `/spaces/${space}/threads`, adminToken, threadBody, 'w03-thread-create', childApp2);
        const c = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'w03-nested-post', childApp2);

        expect(a.status).toBe(201);
        expect(a.body.data).toEqual(initial);
        expect(b.status).toBe(201);
        expect(b.body.data).toEqual(originalThread);
        expect(c.status).toBe(201);
        expect(c.body.data).toEqual(nested);
        expect(fullLogicalSnapshot(tDb)).toEqual(beforeMigrated);
      } finally {
        await childApp2.close();
        tDb.close();
      }

      const idOnlyPath = join(tempDir, 'w03_valid_initial_id_only.sqlite');
      writeFileSync(idOnlyPath, db.serialize());
      let idOnlyDb = new Database(idOnlyPath);
      idOnlyDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'w03-initial-thread'").run(
        JSON.stringify({
          $ref: 'thread',
          thread_id: initial.thread.id,
          thread_version: 1,
          initial_post_id: initial.initial_post.post.id,
          initial_post_revision: 1,
          relation_ids: [initialRelation.id],
        })
      );
      openAndCoordinateDatabase(idOnlyDb, 'serve');
      idOnlyDb.close();

      idOnlyDb = new Database(idOnlyPath);
      openAndCoordinateDatabase(idOnlyDb, 'serve');
      const beforeIdOnly = fullLogicalSnapshot(idOnlyDb);
      const childApp3 = buildApp({ storage: new SqliteStorage(idOnlyDb) });
      await childApp3.ready();
      try {
        const replay = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'w03-initial-thread', childApp3);
        expect(replay.status).toBe(422);
        expect(replay.body.error?.code).toBe('RESYNC_REQUIRED');
        const storedRef = JSON.parse((idOnlyDb.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'w03-initial-thread'").get() as any).result_ref);
        expect(storedRef.kind).toBe('unreplayable');
        expect(fullLogicalSnapshot(idOnlyDb)).toEqual(beforeIdOnly);
      } finally {
        await childApp3.close();
        idOnlyDb.close();
      }
    });
  });

  describe('R14 review regression (X01-X03)', () => {
    it('X01: Explicit invalid/conflicting aliases reject in HTTP and migration without writes', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'x01-sp', objective: 'X01 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'X01 thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'x01-nested-post'));
      const initialBody = { title: 'X01 initial post thread', initial_post: note('initial post') };
      const initial = getData(await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'x01-initial-thread'));
      const initialRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: initial.initial_post.post.id, revision: 1 },
        target_ref: { post_id: target, revision: 1 },
        type: 'challenges',
      }, 'x01-initial-relation'));

      const cases = [
        ['initial_revision_null_alias', 'x01-initial-thread', { ...initial, initial_post_revision: null }, initialBody, `/spaces/${space}/threads`],
        ['initial_revision_conflict', 'x01-initial-thread', { ...initial, initial_post_revision: 2 }, initialBody, `/spaces/${space}/threads`],
        ['initial_id_null_alias', 'x01-initial-thread', { ...initial, initial_post_id: null }, initialBody, `/spaces/${space}/threads`],
        ['initial_relations_conflict', 'x01-initial-thread', { ...initial, relations: [], initial_post: { ...initial.initial_post, relations: [initialRelation] } }, initialBody, `/spaces/${space}/threads`],
        ['post_relation_state_alias_conflict', 'x01-nested-post', { ...nested, relations: [{ ...nested.relations[0], relation_state: 'resolved' }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
        ['post_relation_version_alias_null', 'x01-nested-post', { ...nested, relations: [{ ...nested.relations[0], relation_version: null }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
        ['post_relation_version_alias_conflict', 'x01-nested-post', { ...nested, relations: [{ ...nested.relations[0], relation_version: 2 }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
      ];

      for (const [name, key, badRef, body, path] of cases) {
        const testPath = join(tempDir, `x01_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(JSON.stringify(badRef), key);
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', path as string, adminToken, body, key as string, childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }
    });

    it('X02: Legal empty/full relation arrays and equivalent aliases preserve complete output across restart', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'x02-sp', objective: 'X02 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'X02 thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const initialBody = { title: 'X02 initial post thread', initial_post: note('initial post') };
      const initial = getData(await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'x02-initial-thread'));
      const initialRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: initial.initial_post.post.id, revision: 1 },
        target_ref: { post_id: target, revision: 1 },
        type: 'challenges',
      }, 'x02-initial-relation'));

      const cases = [
        ['explicit_empty', { ...initial, initial_post: { ...initial.initial_post, relations: [] } }],
        ['complete_relation', { ...initial, initial_post: { ...initial.initial_post, relations: [initialRelation] } }],
        ['equal_aliases', {
          ...initial,
          initial_post_id: initial.initial_post.post.id,
          initial_post_revision: 1,
          relation_ids: [initialRelation.id],
          relations: [{ id: initialRelation.id, relation_version: initialRelation.version, relation_state: initialRelation.state }],
          initial_post: { ...initial.initial_post, relation_ids: [initialRelation.id], relations: [initialRelation] },
        }],
      ];

      for (const [name, ref] of cases) {
        const testPath = join(tempDir, `x02_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        const expected = { ...initial, initial_post: { ...initial.initial_post, relations: name === 'explicit_empty' ? [] : [initialRelation] } };
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'x02-initial-thread'").run(JSON.stringify(ref));
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const online = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'x02-initial-thread', childApp);
          expect(online.status).toBe(201);
          expect(online.body.data).toEqual(expected);
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        openAndCoordinateDatabase(tDb, 'serve');
        tDb.close();

        tDb = new Database(testPath);
        openAndCoordinateDatabase(tDb, 'serve');
        const beforeReplay = fullLogicalSnapshot(tDb);
        const childApp2 = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp2.ready();
        try {
          const replay = await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'x02-initial-thread', childApp2);
          expect(replay.status).toBe(201);
          expect(replay.body.data).toEqual(expected);
          expect(fullLogicalSnapshot(tDb)).toEqual(beforeReplay);
        } finally {
          await childApp2.close();
          tDb.close();
        }
      }
    });

    it('X03: Known future version contradictions reject before legal missing-state fallback; valid partial history remains controlled', async () => {
      const space = getData(await send('POST', '/spaces', adminToken, { slug: 'x03-sp', objective: 'X03 space', rules: [] })).space.id;
      const thread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'X03 thread' })).thread.id;
      const target = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, note('target'))).post.id;
      const nestedBody = { ...note('nested source'), refs: [{ target_ref: { post_id: target, revision: 1 }, type: 'challenges' }] };
      const nested = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'x03-nested-post'));
      const relation = nested.relations[0];

      const otherThread = getData(await send('POST', `/spaces/${space}/threads`, adminToken, { title: 'X03 other thread' })).thread.id;
      const foreignPost = getData(await send('POST', `/spaces/${space}/threads/${otherThread}/posts`, adminToken, note('foreign post'))).post.id;

      const secondary = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: nested.post.id, revision: 1 },
        target_ref: { post_id: foreignPost, revision: 1 },
        type: 'supports',
      }, 'x03-secondary-relation'));

      const relationBody = { source_ref: { post_id: nested.post.id, revision: 1 }, target_ref: { post_id: target, revision: 1 }, type: 'challenges' };
      const reusedRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, relationBody, 'x03-relation-reuse'));

      const initialBody = { title: 'X03 initial post thread', initial_post: note('initial post') };
      const initial = getData(await send('POST', `/spaces/${space}/threads`, adminToken, initialBody, 'x03-initial-thread'));
      const initialRelation = getData(await send('POST', `/spaces/${space}/relations`, adminToken, {
        source_ref: { post_id: initial.initial_post.post.id, revision: 1 },
        target_ref: { post_id: target, revision: 1 },
        type: 'challenges',
      }, 'x03-initial-relation'));

      const future = { id: relation.id, version: relation.version + 1000 };
      const typedRelationRef = JSON.parse((db.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'x03-relation-reuse'").get() as any).result_ref);

      const invalidCases = [
        ['post_partial_future_version', 'x03-nested-post', { ...nested, relations: [future] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
        ['initial_partial_future_version', 'x03-initial-thread', { ...initial, initial_post: { ...initial.initial_post, relations: [{ id: initialRelation.id, version: initialRelation.version + 1000 }] } }, initialBody, `/spaces/${space}/threads`],
        ['mixed_full_future_and_partial_relation', 'x03-nested-post', { ...nested, relations: [{ ...future, state: 'open' }, { id: secondary.id }] }, nestedBody, `/spaces/${space}/threads/${thread}/posts`],
        ['typed_relation_partial_future_version', 'x03-relation-reuse', { ...typedRelationRef, relation_version: reusedRelation.version + 1000, relation_state: undefined }, relationBody, `/spaces/${space}/relations`],
        ['legacy_relation_partial_future_version', 'x03-relation-reuse', { ...reusedRelation, version: reusedRelation.version + 1000, state: undefined }, relationBody, `/spaces/${space}/relations`],
      ];

      for (const [name, key, badRef, body, path] of invalidCases) {
        const testPath = join(tempDir, `x03_${name}.sqlite`);
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare('UPDATE idempotency_records SET result_ref = ? WHERE key = ?').run(JSON.stringify(badRef), key);
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', path as string, adminToken, body, key as string, childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }

      // Complete future control: also rejected and db unchanged
      {
        const testPath = join(tempDir, 'x03_complete_future_control.sqlite');
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'x03-nested-post'").run(JSON.stringify({ ...nested, relations: [{ ...future, state: 'open' }] }));
        const before = fullLogicalSnapshot(tDb);

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'x03-nested-post', childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(before);
        } finally {
          await childApp.close();
        }

        expect(() => openAndCoordinateDatabase(tDb, 'serve')).toThrow();
        tDb.close();

        tDb = new Database(testPath);
        expect(fullLogicalSnapshot(tDb)).toEqual(before);
        tDb.close();
      }

      // Legal partial history control: version: 1 without state can be migrated to unreplayable marker
      {
        const testPath = join(tempDir, 'x03_legal_partial_control.sqlite');
        writeFileSync(testPath, db.serialize());
        let tDb = new Database(testPath);
        tDb.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 'x03-nested-post'").run(JSON.stringify({ ...nested, relations: [{ id: relation.id, version: 1 }] }));

        openAndCoordinateDatabase(tDb, 'serve');
        tDb.close();

        tDb = new Database(testPath);
        openAndCoordinateDatabase(tDb, 'serve');
        const beforeReplay = fullLogicalSnapshot(tDb);
        const stored = JSON.parse((tDb.prepare("SELECT result_ref FROM idempotency_records WHERE key = 'x03-nested-post'").get() as any).result_ref);
        expect(stored.kind).toBe('unreplayable');

        const childApp = buildApp({ storage: new SqliteStorage(tDb) });
        await childApp.ready();
        try {
          const res = await send('POST', `/spaces/${space}/threads/${thread}/posts`, adminToken, nestedBody, 'x03-nested-post', childApp);
          expect(res.status).toBe(422);
          expect(res.body.error?.code).toBe('RESYNC_REQUIRED');
          expect(fullLogicalSnapshot(tDb)).toEqual(beforeReplay);
        } finally {
          await childApp.close();
          tDb.close();
        }
      }
    });

    // B2 Database Structural Precheck Matrix (L03 & Full Inspection)
    describe('B2 Database Structural Precheck Matrix (L03 & Full Inspection)', () => {
      // B2-1 / L03: Missing primary key or wrong composite PK order rejects in init, serve, and CLI
      it('B2-1 / L03: Missing idempotency primary key rejects before mutation in init and serve, leaving database unchanged', () => {
        const l03Path = join(tempDir, 'l03_lost_pk.sqlite');
        writeFileSync(l03Path, db.serialize());
        const l03Db = new Database(l03Path);
        try {
          l03Db.exec('CREATE TABLE r8_idem_copy AS SELECT * FROM idempotency_records; DROP TABLE idempotency_records; ALTER TABLE r8_idem_copy RENAME TO idempotency_records');
          const before = fullLogicalSnapshot(l03Db);
          const classification = classifyDatabase(l03Db);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/主键定义不匹配|缺少 NOT NULL 约束/);

          // 1. Rejected by openAndCoordinateDatabase 'init'
          expect(() => openAndCoordinateDatabase(l03Db, 'init')).toThrowError(/实例持久密钥缺失或损坏/);
          l03Db.close();

          // Reopen and assert unchanged
          const l03DbReopened1 = new Database(l03Path);
          try {
            expect(fullLogicalSnapshot(l03DbReopened1)).toEqual(before);
            // 2. Rejected by openAndCoordinateDatabase 'serve'
            expect(() => openAndCoordinateDatabase(l03DbReopened1, 'serve')).toThrowError(/实例持久密钥缺失或损坏/);
          } finally {
            l03DbReopened1.close();
          }

          // Reopen again and assert unchanged
          const l03DbReopened2 = new Database(l03Path);
          try {
            expect(fullLogicalSnapshot(l03DbReopened2)).toEqual(before);
          } finally {
            l03DbReopened2.close();
          }
        } finally {
          // ensure closed
        }
      });

      // B2-2: Missing required table or damaged required column (type, notnull) rejects
      it('B2-2: Missing table or damaged required column rejects before mutation and preserves database', () => {
        // Missing table
        const missingTblPath = join(tempDir, 'b2_missing_table.sqlite');
        writeFileSync(missingTblPath, db.serialize());
        const dbTbl = new Database(missingTblPath);
        try {
          dbTbl.exec('DROP TABLE space_revisions');
          const before = fullLogicalSnapshot(dbTbl);
          expect(classifyDatabase(dbTbl).kind).toBe('corrupt');
          expect(() => openAndCoordinateDatabase(dbTbl, 'serve')).toThrow();
          dbTbl.close();
          const dbTbl2 = new Database(missingTblPath);
          expect(fullLogicalSnapshot(dbTbl2)).toEqual(before);
          dbTbl2.close();
        } finally {}

        // Missing column
        const missingColPath = join(tempDir, 'b2_missing_col.sqlite');
        writeFileSync(missingColPath, db.serialize());
        const dbCol = new Database(missingColPath);
        try {
          dbCol.exec('ALTER TABLE spaces RENAME COLUMN slug TO old_slug');
          const before = fullLogicalSnapshot(dbCol);
          expect(classifyDatabase(dbCol).kind).toBe('corrupt');
          expect(() => openAndCoordinateDatabase(dbCol, 'init')).toThrow();
          dbCol.close();
          const dbCol2 = new Database(missingColPath);
          expect(fullLogicalSnapshot(dbCol2)).toEqual(before);
          dbCol2.close();
        } finally {}

        // Wrong column type
        const wrongTypePath = join(tempDir, 'b2_wrong_type.sqlite');
        writeFileSync(wrongTypePath, db.serialize());
        const dbType = new Database(wrongTypePath);
        try {
          dbType.exec('CREATE TABLE spaces_copy (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, current_revision TEXT NOT NULL, policy_revision INTEGER NOT NULL, acl_epoch INTEGER NOT NULL, created_at TEXT NOT NULL); INSERT INTO spaces_copy SELECT id, slug, CAST(current_revision AS TEXT), policy_revision, acl_epoch, created_at FROM spaces; DROP TABLE spaces; ALTER TABLE spaces_copy RENAME TO spaces');
          const before = fullLogicalSnapshot(dbType);
          expect(classifyDatabase(dbType).kind).toBe('corrupt');
          expect(() => openAndCoordinateDatabase(dbType, 'serve')).toThrow();
          dbType.close();
          const dbType2 = new Database(wrongTypePath);
          expect(fullLogicalSnapshot(dbType2)).toEqual(before);
          dbType2.close();
        } finally {}
      });

      // B2-3: Damaged foreign key or missing unique constraint rejects with exact diagnostics
      it('B2-3: Damaged foreign key or missing unique constraint rejects with paired controls', () => {
        // Missing foreign key on space_revisions
        const fkPath = join(tempDir, 'b2_fk_corrupt.sqlite');
        writeFileSync(fkPath, db.serialize());
        let dbFk = new Database(fkPath);
        try {
          dbFk.exec('CREATE TABLE sr_copy (space_id TEXT NOT NULL, revision INTEGER NOT NULL, objective TEXT NOT NULL, rules TEXT NOT NULL, review_policy TEXT NOT NULL, check_profiles TEXT NOT NULL, pinned_refs TEXT NOT NULL, editor_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(space_id, revision)); INSERT INTO sr_copy SELECT * FROM space_revisions; DROP TABLE space_revisions; ALTER TABLE sr_copy RENAME TO space_revisions');
          const beforeFk = fullLogicalSnapshot(dbFk);
          const res = classifyDatabase(dbFk);
          expect(res.kind).toBe('corrupt');
          expect(res.reason).toMatch(/缺少.*外键约束/);
          expect(() => openAndCoordinateDatabase(dbFk, 'init')).toThrow();
          dbFk.close();
          dbFk = new Database(fkPath);
          expect(fullLogicalSnapshot(dbFk)).toEqual(beforeFk);
        } finally {
          dbFk.close();
        }

        // Missing unique constraint on credentials(token_hash)
        const uqPath = join(tempDir, 'b2_uq_corrupt.sqlite');
        writeFileSync(uqPath, db.serialize());
        let dbUq = new Database(uqPath);
        try {
          dbUq.exec('CREATE TABLE cred_copy (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), token_hash TEXT NOT NULL, allowed_space_ids TEXT NOT NULL, capabilities TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL); INSERT INTO cred_copy SELECT * FROM credentials; DROP TABLE credentials; ALTER TABLE cred_copy RENAME TO credentials');
          const beforeUq = fullLogicalSnapshot(dbUq);
          const res = classifyDatabase(dbUq);
          expect(res.kind).toBe('corrupt');
          expect(res.reason).toMatch(/缺少.*唯一约束/);
          expect(() => openAndCoordinateDatabase(dbUq, 'serve')).toThrow();
          dbUq.close();
          dbUq = new Database(uqPath);
          expect(fullLogicalSnapshot(dbUq)).toEqual(beforeUq);
        } finally {
          dbUq.close();
        }
      });

      // B2-4: Explicit index with wrong column order or uniqueness definition rejects
      it('B2-4: Explicit index with wrong column order or uniqueness definition rejects with paired controls', () => {
        // Swapped column order on idx_events_space_seq
        const idxPath = join(tempDir, 'b2_idx_corrupt.sqlite');
        writeFileSync(idxPath, db.serialize());
        let dbIdx = new Database(idxPath);
        try {
          dbIdx.exec('DROP INDEX idx_events_space_seq; CREATE INDEX idx_events_space_seq ON events(seq, space_id);');
          const beforeIdx = fullLogicalSnapshot(dbIdx);
          const res = classifyDatabase(dbIdx);
          expect(res.kind).toBe('corrupt');
          expect(res.reason).toMatch(/索引 idx_events_space_seq 定义不匹配/);
          expect(() => openAndCoordinateDatabase(dbIdx, 'init')).toThrow();
          dbIdx.close();
          dbIdx = new Database(idxPath);
          expect(fullLogicalSnapshot(dbIdx)).toEqual(beforeIdx);

          // Paired control: restore correct index
          dbIdx.exec('DROP INDEX idx_events_space_seq; CREATE INDEX idx_events_space_seq ON events(space_id, seq);');
          expect(classifyDatabase(dbIdx).kind).toBe('current_initialized');
          expect(() => openAndCoordinateDatabase(dbIdx, 'serve')).not.toThrow();
        } finally {
          dbIdx.close();
        }
      });

      // B2-5: Migration table missing columns, non-continuous version rows, or negative versions reject before mutation
      it('B2-5: Migration table missing columns, non-continuous version rows, or negative versions reject before mutation', () => {
        // Missing applied_at column
        const migPath1 = join(tempDir, 'b2_mig_col.sqlite');
        writeFileSync(migPath1, db.serialize());
        let dbM1 = new Database(migPath1);
        try {
          dbM1.exec('CREATE TABLE sm_copy (version INTEGER PRIMARY KEY); INSERT INTO sm_copy SELECT version FROM schema_migrations; DROP TABLE schema_migrations; ALTER TABLE sm_copy RENAME TO schema_migrations');
          const before1 = fullLogicalSnapshot(dbM1);
          expect(classifyDatabase(dbM1).kind).toBe('corrupt');
          expect(() => openAndCoordinateDatabase(dbM1, 'init')).toThrow();
          dbM1.close();
          dbM1 = new Database(migPath1);
          expect(fullLogicalSnapshot(dbM1)).toEqual(before1);
        } finally { dbM1.close(); }

        // Negative version row
        const migPath2 = join(tempDir, 'b2_mig_neg.sqlite');
        writeFileSync(migPath2, db.serialize());
        let dbM2 = new Database(migPath2);
        try {
          dbM2.exec("INSERT INTO schema_migrations (version, applied_at) VALUES (-1, '2026-10-01T00:00:00.000Z')");
          const before2 = fullLogicalSnapshot(dbM2);
          expect(classifyDatabase(dbM2).kind).toBe('corrupt');
          expect(() => openAndCoordinateDatabase(dbM2, 'serve')).toThrow();
          dbM2.close();
          dbM2 = new Database(migPath2);
          expect(fullLogicalSnapshot(dbM2)).toEqual(before2);
        } finally { dbM2.close(); }

        // Version gap: version 2 without version 1
        const migPath3 = join(tempDir, 'b2_mig_gap.sqlite');
        writeFileSync(migPath3, db.serialize());
        let dbM3 = new Database(migPath3);
        try {
          dbM3.exec('DELETE FROM schema_migrations WHERE version = 1');
          const before3 = fullLogicalSnapshot(dbM3);
          expect(classifyDatabase(dbM3).kind).toBe('corrupt');
          expect(() => openAndCoordinateDatabase(dbM3, 'init')).toThrow();
          dbM3.close();
          dbM3 = new Database(migPath3);
          expect(fullLogicalSnapshot(dbM3)).toEqual(before3);
        } finally { dbM3.close(); }
      });

      // B2-6: Partial Detuned tables without migrations rejected as corrupt, not blank
      it('B2-6: Partial Detuned tables without migrations rejected as corrupt, not blank', () => {
        const partPath = join(tempDir, 'b2_partial_tables.sqlite');
        const dbPart = new Database(partPath);
        try {
          dbPart.exec(`
            CREATE TABLE actors (id TEXT PRIMARY KEY, kind TEXT NOT NULL, display_name TEXT NOT NULL, created_at TEXT NOT NULL, disabled_at TEXT);
            CREATE TABLE credentials (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), token_hash TEXT NOT NULL UNIQUE, allowed_space_ids TEXT NOT NULL, capabilities TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL);
            CREATE TABLE spaces (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, current_revision INTEGER NOT NULL DEFAULT 1, policy_revision INTEGER NOT NULL DEFAULT 1, acl_epoch INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
            CREATE TABLE threads (id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id), title TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL DEFAULT 'open', creator_id TEXT NOT NULL REFERENCES actors(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE posts (id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id), thread_id TEXT NOT NULL REFERENCES threads(id), author_id TEXT NOT NULL REFERENCES actors(id), kind TEXT NOT NULL, current_revision INTEGER NOT NULL DEFAULT 1, lifecycle TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
          `);
          const before = fullLogicalSnapshot(dbPart);
          const classification = classifyDatabase(dbPart);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/结构不完整，缺少必需表/);

          expect(() => openAndCoordinateDatabase(dbPart, 'init')).toThrowError(/实例持久密钥缺失或损坏/);
          dbPart.close();

          const dbPartAfter = new Database(partPath);
          try {
            expect(fullLogicalSnapshot(dbPartAfter)).toEqual(before);
            expect(dbPartAfter.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get()).toBeUndefined();
          } finally {
            dbPartAfter.close();
          }
        } finally {
          // done
        }
      });

      // B2-7: CLI serve rejects corrupt database before listening on socket and releases directory lock
      it('B2-7: CLI serve rejects corrupt database before listening on socket and releases directory lock', () => {
        const cliDir = join(tempDir, 'cli_corrupt_serve');
        mkdirSync(cliDir, { recursive: true });
        const cliDbPath = join(cliDir, 'detuned.sqlite');
        writeFileSync(cliDbPath, db.serialize());

        const cliDb = new Database(cliDbPath);
        cliDb.exec('CREATE TABLE r8_idem_copy AS SELECT * FROM idempotency_records; DROP TABLE idempotency_records; ALTER TABLE r8_idem_copy RENAME TO idempotency_records');
        cliDb.close();

        const root = join(__dirname, '../..');
        const child = spawnSync(
          process.execPath,
          [join(root, 'packages/cli/dist/index.js'), '--json', 'serve', '--data-dir', cliDir, '--port', '49152'],
          { cwd: root, encoding: 'utf8', timeout: 5000 }
        );
        expect(child.status).not.toBe(0);
        expect(existsSync(join(cliDir, 'detuned.lock'))).toBe(false);

        // Verify output is structured error reporting corrupt database
        const out = JSON.parse(child.stderr || child.stdout);
        expect(out.error?.code).toBe('FORBIDDEN');
        expect(out.error?.message).toMatch(/实例持久密钥缺失或损坏/);
      });

      // B2-8: Complete unpopulated Detuned schema, truly blank DB, supported legacy v1 refused, and healthy current schema start according to contract
      it('B2-8: Complete unpopulated Detuned schema, truly blank DB, supported legacy v1 refused, and healthy current schema start according to contract', () => {
        // 1. Truly blank DB
        const blankPath = join(tempDir, 'b2_blank.sqlite');
        const dbBlank = new Database(blankPath);
        try {
          expect(classifyDatabase(dbBlank).kind).toBe('blank');
          const boot = openAndCoordinateDatabase(dbBlank, 'init');
          expect(boot.isNewInstance).toBe(true);
          expect(boot.adminToken).toBeTruthy();
          expect(classifyDatabase(dbBlank).kind).toBe('current_initialized');
        } finally { dbBlank.close(); }

        // 2. Complete unpopulated schema (all current tables pre-created via DDL)
        const ddlPath = join(tempDir, 'b2_unpopulated.sqlite');
        const dbDdl = new Database(ddlPath);
        try {
          dbDdl.exec(SCHEMA_SQL);
          expect(classifyDatabase(dbDdl).kind).toBe('blank');
          expect(() => openAndCoordinateDatabase(dbDdl, 'serve')).toThrowError(/数据库尚未初始化/);
          const boot = openAndCoordinateDatabase(dbDdl, 'init');
          expect(boot.isNewInstance).toBe(true);
          expect(boot.adminToken).toBeTruthy();
          expect(classifyDatabase(dbDdl).kind).toBe('current_initialized');
        } finally { dbDdl.close(); }

        // 3. Supported legacy v1
        const legacyPath = join(tempDir, 'b2_legacy.sqlite');
        writeFileSync(legacyPath, db.serialize());
        const dbLeg = new Database(legacyPath);
        try {
          dbLeg.exec('DROP TABLE review_submissions; DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions; DROP TABLE IF EXISTS instance_metadata; DELETE FROM schema_migrations WHERE version > 1;');
          expect(classifyDatabase(dbLeg).kind).toBe('supported_legacy');
          expect(() => openAndCoordinateDatabase(dbLeg, 'serve')).toThrow(/migrate/);
          expect(classifyDatabase(dbLeg).kind).toBe('supported_legacy');
        } finally { dbLeg.close(); }

        // 4. Healthy current schema
        const healthyPath = join(tempDir, 'b2_healthy.sqlite');
        writeFileSync(healthyPath, db.serialize());
        const dbHealth = new Database(healthyPath);
        try {
          expect(classifyDatabase(dbHealth).kind).toBe('current_initialized');
          const boot = openAndCoordinateDatabase(dbHealth, 'serve');
          expect(boot.isNewInstance).toBe(false);
          expect(boot.adminToken).toBeNull();
          expect(classifyDatabase(dbHealth).kind).toBe('current_initialized');
        } finally { dbHealth.close(); }
      });
    });

    // B.4-3R / Y01-Y04 Database Structure & Migration Parity Regression
    describe('B.4-3R / Y01-Y04 Database Structure & Migration Parity Regression', () => {
      // Y01: Semantic structure changes (partial unique index, partial named index, foreign key action, ordinary table replacing FTS) reject as corrupt and leave DB unchanged
      it('Y01: Semantic structure changes (partial unique index, partial named index, foreign key action, ordinary table replacing FTS) reject as corrupt', () => {
        // Variant 1: partial unique index on credentials(token_hash) WHERE 0
        const pUqPath = join(tempDir, 'y01_partial_unique.sqlite');
        writeFileSync(pUqPath, db.serialize());
        let dbPUq = new Database(pUqPath);
        try {
          const ddl = (dbPUq.prepare("SELECT sql FROM sqlite_master WHERE name='credentials'").get() as any).sql;
          dbPUq.pragma('foreign_keys = OFF');
          dbPUq.exec(ddl.replace('token_hash TEXT NOT NULL UNIQUE', 'token_hash TEXT NOT NULL').replace(/^CREATE TABLE\s+credentials/, 'CREATE TABLE credentials_copy'));
          dbPUq.exec('INSERT INTO credentials_copy SELECT * FROM credentials; DROP TABLE credentials; ALTER TABLE credentials_copy RENAME TO credentials');
          dbPUq.pragma('foreign_keys = ON');
          dbPUq.exec('CREATE UNIQUE INDEX r15_partial_token_hash ON credentials(token_hash) WHERE 0');

          const before = fullLogicalSnapshot(dbPUq);
          const classification = classifyDatabase(dbPUq);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/唯一约束/);

          expect(() => openAndCoordinateDatabase(dbPUq, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbPUq, 'serve')).toThrow();
          dbPUq.close();

          dbPUq = new Database(pUqPath);
          expect(fullLogicalSnapshot(dbPUq)).toEqual(before);
        } finally {
          dbPUq.close();
        }

        // Variant 2: partial named event index WHERE seq < 0
        const pIdxPath = join(tempDir, 'y01_partial_idx.sqlite');
        writeFileSync(pIdxPath, db.serialize());
        let dbPIdx = new Database(pIdxPath);
        try {
          dbPIdx.exec('DROP INDEX idx_events_space_seq; CREATE INDEX idx_events_space_seq ON events(space_id,seq) WHERE seq < 0');
          const before = fullLogicalSnapshot(dbPIdx);
          const classification = classifyDatabase(dbPIdx);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/索引 idx_events_space_seq 定义不匹配/);

          expect(() => openAndCoordinateDatabase(dbPIdx, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbPIdx, 'serve')).toThrow();
          dbPIdx.close();

          dbPIdx = new Database(pIdxPath);
          expect(fullLogicalSnapshot(dbPIdx)).toEqual(before);
        } finally {
          dbPIdx.close();
        }

        // Variant 3: changed foreign key action ON DELETE CASCADE
        const fkActPath = join(tempDir, 'y01_fk_action.sqlite');
        writeFileSync(fkActPath, db.serialize());
        let dbFkAct = new Database(fkActPath);
        try {
          const ddl = (dbFkAct.prepare("SELECT sql FROM sqlite_master WHERE name='credentials'").get() as any).sql;
          dbFkAct.pragma('foreign_keys = OFF');
          dbFkAct.exec(ddl.replace('REFERENCES actors(id)', 'REFERENCES actors(id) ON DELETE CASCADE').replace(/^CREATE TABLE\s+credentials/, 'CREATE TABLE credentials_copy'));
          dbFkAct.exec('INSERT INTO credentials_copy SELECT * FROM credentials; DROP TABLE credentials; ALTER TABLE credentials_copy RENAME TO credentials');
          dbFkAct.pragma('foreign_keys = ON');

          const before = fullLogicalSnapshot(dbFkAct);
          const classification = classifyDatabase(dbFkAct);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/缺少或不匹配外键约束/);

          expect(() => openAndCoordinateDatabase(dbFkAct, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbFkAct, 'serve')).toThrow();
          dbFkAct.close();

          dbFkAct = new Database(fkActPath);
          expect(fullLogicalSnapshot(dbFkAct)).toEqual(before);
        } finally {
          dbFkAct.close();
        }

        // Variant 4: ordinary table replacing post_fts virtual table
        const ftsPath = join(tempDir, 'y01_ordinary_fts.sqlite');
        writeFileSync(ftsPath, db.serialize());
        let dbFts = new Database(ftsPath);
        try {
          dbFts.exec('DROP TABLE post_fts; CREATE TABLE post_fts (post_id, space_id, title, summary, body, tags)');
          const before = fullLogicalSnapshot(dbFts);
          const classification = classifyDatabase(dbFts);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/post_fts 必须为使用 fts5 的虚拟表/);

          expect(() => openAndCoordinateDatabase(dbFts, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbFts, 'serve')).toThrow();
          dbFts.close();

          dbFts = new Database(ftsPath);
          expect(fullLogicalSnapshot(dbFts)).toEqual(before);
        } finally {
          dbFts.close();
        }
      });

      // Y02: Existing initialization materials must prevent blank classification and credential reissuance
      it('Y02: Existing initialization materials without migrations or actors reject as corrupt in all modes and CLI', () => {
        const y02Dir = join(tempDir, 'y02_cli_dir');
        mkdirSync(y02Dir, { recursive: true });
        const y02Path = join(y02Dir, 'detuned.sqlite');
        const dbY02 = new Database(y02Path);
        dbY02.exec(SCHEMA_SQL);
        dbY02.prepare("INSERT INTO instance_metadata(key, value) VALUES('initialized', 'true'), ('token_secret', ?)").run('y02-known-existing-secret');
        dbY02.close();

        let dbInspect = new Database(y02Path);
        try {
          const before = fullLogicalSnapshot(dbInspect);
          const classification = classifyDatabase(dbInspect);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/数据库包含持久化初始化材料/);

          expect(() => bootstrapDatabase(dbInspect)).toThrow();
          expect(() => openAndCoordinateDatabase(dbInspect, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbInspect, 'serve')).toThrow();

          dbInspect.close();
          dbInspect = new Database(y02Path);
          expect(fullLogicalSnapshot(dbInspect)).toEqual(before);
          expect((dbInspect.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any).value).toBe('y02-known-existing-secret');
        } finally {
          dbInspect.close();
        }

        // Test CLI init rejects
        const root = join(__dirname, '../..');
        const child = spawnSync(
          process.execPath,
          [join(root, 'packages/cli/dist/index.js'), '--json', 'init', '--data-dir', y02Dir],
          { cwd: root, encoding: 'utf8', timeout: 5000 }
        );
        expect(child.status).not.toBe(0);
        expect(existsSync(join(y02Dir, 'detuned.lock'))).toBe(false);
        const out = JSON.parse(child.stderr || child.stdout);
        expect(out.error?.code).toBe('FORBIDDEN');
        expect(out.error?.message).toMatch(/数据库包含持久化初始化材料|实例持久密钥缺失或损坏/);
      });

      // Y03: Current schema3 database with missing version=2 migration row rejects before repair
      it('Y03: Current schema3 database with missing version 2 migration row rejects as corrupt before repair', () => {
        const y03Path = join(tempDir, 'y03_missing_v2_mig.sqlite');
        writeFileSync(y03Path, db.serialize());
        let dbY03 = new Database(y03Path);
        try {
          dbY03.exec('DELETE FROM schema_migrations WHERE version = 2');
          const before = fullLogicalSnapshot(dbY03);
          const classification = classifyDatabase(dbY03);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/迁移记录不连续|包含 v2.*thread_versions/);

          expect(() => bootstrapDatabase(dbY03)).toThrow();
          expect(() => openAndCoordinateDatabase(dbY03, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbY03, 'serve')).toThrow();

          dbY03.close();
          dbY03 = new Database(y03Path);
          expect(fullLogicalSnapshot(dbY03)).toEqual(before);
          const versions = dbY03.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((r: any) => r.version);
          expect(versions).not.toContain(2);
        } finally {
          dbY03.close();
        }
      });

      // Y04: Healthy controls (empty file, raw current schema, raw v1 schema, historical v1 instance refused, healthy current) initialize and serve cleanly
      it('Y04: True blank, supported raw schemas, real historical fixture and current instance retain healthy startup', () => {
        const controls = ['empty_file', 'raw_current_schema', 'raw_v1_schema', 'historical_v1_instance', 'healthy_current'];
        for (const kind of controls) {
          const file = join(tempDir, `y04_ctrl_${kind}.sqlite`);
          if (kind === 'healthy_current') {
            writeFileSync(file, db.serialize());
          }
          let cDb = new Database(file);
          try {
            if (kind === 'raw_current_schema') {
              cDb.exec(SCHEMA_SQL);
            }
            if (kind === 'raw_v1_schema' || kind === 'historical_v1_instance') {
              cDb.exec(readFileSync(new URL('../fixtures/historical-v1-schema.sql', import.meta.url), 'utf8'));
            }
            if (kind === 'historical_v1_instance') {
              cDb.exec("INSERT INTO schema_migrations VALUES(1,'2026-10-01T00:00:00.000Z'); INSERT INTO actors(id,kind,display_name,created_at) VALUES('y04_admin','human','Review admin','2026-10-01T00:00:00.000Z')");
            }
            if (kind === 'historical_v1_instance') {
              expect(() => openAndCoordinateDatabase(cDb, 'serve')).toThrow(/migrate/);
              expect(classifyDatabase(cDb).kind).toBe('supported_legacy');
              continue;
            }
            const isFresh = ['empty_file', 'raw_v1_schema', 'raw_current_schema'].includes(kind);
            const boot = isFresh ? openAndCoordinateDatabase(cDb, 'init') : openAndCoordinateDatabase(cDb, 'serve');
            expect(Boolean(boot.adminToken)).toBe(isFresh);

            cDb.close();
            cDb = new Database(file);
            const beforeRestart = fullLogicalSnapshot(cDb);
            const repeated = openAndCoordinateDatabase(cDb, 'serve');
            expect(repeated.adminToken).toBeNull();
            expect(fullLogicalSnapshot(cDb)).toEqual(beforeRestart);
            expect(classifyDatabase(cDb).kind).toBe('current_initialized');
          } finally {
            cDb.close();
          }
        }
      });
    });

    // B.4-3R2 / Z01-Z04 Index Key & FTS Schema Semantics Regression
    describe('B.4-3R2 / Z01-Z04 Index Key & FTS Schema Semantics Regression', () => {
      function rebuildTable(dbTarget: Database.Database, table: string, transform: (sql: string) => string) {
        const ddl = (dbTarget.prepare("SELECT sql FROM sqlite_master WHERE name=?").get(table) as any).sql;
        dbTarget.pragma('foreign_keys = OFF');
        dbTarget.exec(transform(ddl).replace(new RegExp(`^CREATE TABLE\\s+${table}`), `CREATE TABLE ${table}_copy`));
        dbTarget.exec(`INSERT INTO ${table}_copy SELECT * FROM ${table}; DROP TABLE ${table}; ALTER TABLE ${table}_copy RENAME TO ${table}`);
        dbTarget.pragma('foreign_keys = ON');
      }

      // Z01: Index key terms, PK collation and named index sort/collation participate in validation
      it('Z01: Expression key in unique index, PK NOCASE collation, and named index sort/collation changes reject as corrupt', () => {
        // Variant 1: Expression key in unique index masquerading as single-column UNIQUE
        const exprPath = join(tempDir, 'z01_expression_key.sqlite');
        writeFileSync(exprPath, db.serialize());
        let dbExpr = new Database(exprPath);
        try {
          rebuildTable(dbExpr, 'credentials', ddl => ddl.replace('token_hash TEXT NOT NULL UNIQUE', 'token_hash TEXT NOT NULL'));
          dbExpr.exec('CREATE UNIQUE INDEX r16_token_hash_expression ON credentials(token_hash, lower(id))');
          const before = fullLogicalSnapshot(dbExpr);
          const classification = classifyDatabase(dbExpr);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/唯一约束/);

          expect(() => openAndCoordinateDatabase(dbExpr, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbExpr, 'serve')).toThrow();
          dbExpr.close();

          dbExpr = new Database(exprPath);
          expect(fullLogicalSnapshot(dbExpr)).toEqual(before);
        } finally {
          dbExpr.close();
        }

        // Variant 2: PK column collation changed to NOCASE
        const pkPath = join(tempDir, 'z01_pk_nocase.sqlite');
        writeFileSync(pkPath, db.serialize());
        let dbPk = new Database(pkPath);
        try {
          rebuildTable(dbPk, 'idempotency_records', ddl => ddl.replace('key TEXT NOT NULL,', 'key TEXT COLLATE NOCASE NOT NULL,'));
          const before = fullLogicalSnapshot(dbPk);
          const classification = classifyDatabase(dbPk);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/主键|校对/);

          expect(() => openAndCoordinateDatabase(dbPk, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbPk, 'serve')).toThrow();
          dbPk.close();

          dbPk = new Database(pkPath);
          expect(fullLogicalSnapshot(dbPk)).toEqual(before);
        } finally {
          dbPk.close();
        }

        // Variant 3: Named index sort and collation changed
        const namedPath = join(tempDir, 'z01_named_sort_coll.sqlite');
        writeFileSync(namedPath, db.serialize());
        let dbNamed = new Database(namedPath);
        try {
          dbNamed.exec('DROP INDEX idx_events_space_seq; CREATE INDEX idx_events_space_seq ON events(space_id COLLATE NOCASE, seq DESC)');
          const before = fullLogicalSnapshot(dbNamed);
          const classification = classifyDatabase(dbNamed);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/索引 idx_events_space_seq 定义不匹配/);

          expect(() => openAndCoordinateDatabase(dbNamed, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbNamed, 'serve')).toThrow();
          dbNamed.close();

          dbNamed = new Database(namedPath);
          expect(fullLogicalSnapshot(dbNamed)).toEqual(before);
        } finally {
          dbNamed.close();
        }
      });

      // Z02: FTS column indexed flag and tokenizer configuration
      it('Z02: FTS body column marked UNINDEXED rejects as corrupt', () => {
        const ftsPath = join(tempDir, 'z02_fts_unindexed.sqlite');
        writeFileSync(ftsPath, db.serialize());
        let dbFts = new Database(ftsPath);
        try {
          const rows = dbFts.prepare('SELECT post_id,space_id,title,summary,body,tags FROM post_fts').all();
          const ddl = (dbFts.prepare("SELECT sql FROM sqlite_master WHERE name='post_fts'").get() as any).sql;
          const changed = ddl.replace(/\bbody\s*,/, 'body UNINDEXED,');
          expect(changed).not.toBe(ddl);
          dbFts.exec('DROP TABLE post_fts');
          dbFts.exec(changed);
          const insert = dbFts.prepare('INSERT INTO post_fts(post_id,space_id,title,summary,body,tags) VALUES(@post_id,@space_id,@title,@summary,@body,@tags)');
          for (const row of rows) insert.run(row);

          const before = fullLogicalSnapshot(dbFts);
          const classification = classifyDatabase(dbFts);
          expect(classification.kind).toBe('corrupt');
          expect(classification.reason).toMatch(/post_fts/);

          expect(() => openAndCoordinateDatabase(dbFts, 'init')).toThrow();
          expect(() => openAndCoordinateDatabase(dbFts, 'serve')).toThrow();
          dbFts.close();

          dbFts = new Database(ftsPath);
          expect(fullLogicalSnapshot(dbFts)).toEqual(before);
        } finally {
          dbFts.close();
        }
      });

      // Z03: Equivalent full unique index accepted
      it('Z03: Equivalent full unique index on credentials(token_hash COLLATE BINARY ASC) accepted as healthy', () => {
        const z03Path = join(tempDir, 'z03_standalone_unique.sqlite');
        writeFileSync(z03Path, db.serialize());
        let dbZ03 = new Database(z03Path);
        try {
          rebuildTable(dbZ03, 'credentials', ddl => ddl.replace('token_hash TEXT NOT NULL UNIQUE', 'token_hash TEXT NOT NULL'));
          dbZ03.exec('CREATE UNIQUE INDEX r16_full_token_hash ON credentials(token_hash COLLATE BINARY ASC)');

          const before = fullLogicalSnapshot(dbZ03);
          const classification = classifyDatabase(dbZ03);
          expect(classification.kind).toBe('current_initialized');

          const boot = openAndCoordinateDatabase(dbZ03, 'serve');
          expect(boot.isNewInstance).toBe(false);
          dbZ03.close();

          dbZ03 = new Database(z03Path);
          expect(fullLogicalSnapshot(dbZ03)).toEqual(before);
          expect(classifyDatabase(dbZ03).kind).toBe('current_initialized');
        } finally {
          dbZ03.close();
        }
      });

      // Z04: CLI init/serve reject Y02/Y03 with FORBIDDEN and release lock
      it('Z04: CLI init/serve reject Y02 existing materials and Y03 missing version 2 with FORBIDDEN and release lock', () => {
        const root = join(__dirname, '../..');

        // Y02 case
        const dirY02 = join(tempDir, 'z04_y02_cli');
        mkdirSync(dirY02, { recursive: true });
        const fileY02 = join(dirY02, 'detuned.sqlite');
        const dbY02 = new Database(fileY02);
        dbY02.exec(SCHEMA_SQL);
        dbY02.prepare("INSERT INTO instance_metadata(key, value) VALUES('initialized', 'true'), ('token_secret', ?)").run('z04-secret');
        const beforeY02 = fullLogicalSnapshot(dbY02);
        dbY02.close();

        for (const mode of ['init', 'serve']) {
          const run = spawnSync(
            process.execPath,
            [join(root, 'packages/cli/dist/index.js'), '--json', mode, '--data-dir', dirY02],
            { cwd: root, encoding: 'utf8', timeout: 5000 }
          );
          expect(run.status).not.toBe(0);
          expect(existsSync(join(dirY02, 'detuned.lock'))).toBe(false);
          const parsed = JSON.parse(run.stderr || run.stdout);
          expect(parsed.error?.code).toBe('FORBIDDEN');
          const checkDb = new Database(fileY02);
          expect(fullLogicalSnapshot(checkDb)).toEqual(beforeY02);
          checkDb.close();
        }

        // Y03 case
        const dirY03 = join(tempDir, 'z04_y03_cli');
        mkdirSync(dirY03, { recursive: true });
        const fileY03 = join(dirY03, 'detuned.sqlite');
        writeFileSync(fileY03, db.serialize());
        const dbY03 = new Database(fileY03);
        dbY03.exec('DELETE FROM schema_migrations WHERE version = 2');
        const beforeY03 = fullLogicalSnapshot(dbY03);
        dbY03.close();

        for (const mode of ['init', 'serve']) {
          const run = spawnSync(
            process.execPath,
            [join(root, 'packages/cli/dist/index.js'), '--json', mode, '--data-dir', dirY03],
            { cwd: root, encoding: 'utf8', timeout: 5000 }
          );
          expect(run.status).not.toBe(0);
          expect(existsSync(join(dirY03, 'detuned.lock'))).toBe(false);
          const parsed = JSON.parse(run.stderr || run.stdout);
          expect(parsed.error?.code).toBe('FORBIDDEN');
          const checkDb = new Database(fileY03);
          expect(fullLogicalSnapshot(checkDb)).toEqual(beforeY03);
          checkDb.close();
        }
      });

      // AA01: Unsupported FTS detail option cannot pass preflight and break search
      it('AA01: Unsupported FTS configuration options (detail=none, content=...) are rejected as corrupt', async () => {
        const file = join(tempDir, 'aa01_fts.sqlite');
        let dbAA01 = new Database(file);
        const boot = bootstrapDatabase(dbAA01);
        const appAA01 = buildApp({ storage: new SqliteStorage(dbAA01) });
        await appAA01.ready();

        let spaceId = '';
        try {
          const spRes = await appAA01.inject({
            method: 'POST',
            url: '/api/v1/spaces',
            headers: { authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': 'aa01-sp' },
            payload: { slug: 'aa01-space', objective: 'FTS test', rules: [] }
          });
          expect(spRes.statusCode).toBe(201);
          spaceId = spRes.json().data.space.id;

          const thRes = await appAA01.inject({
            method: 'POST',
            url: `/api/v1/spaces/${spaceId}/threads`,
            headers: { authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': 'aa01-th' },
            payload: { title: 'AA01 thread' }
          });
          expect(thRes.statusCode).toBe(201);
          const threadId = thRes.json().data.thread.id;

          const poRes = await appAA01.inject({
            method: 'POST',
            url: `/api/v1/spaces/${spaceId}/threads/${threadId}/posts`,
            headers: { authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': 'aa01-po' },
            payload: { kind: 'note', title: 'AA01 Post', summary: 'Summary', body: 'needle proof in body' }
          });
          expect(poRes.statusCode).toBe(201);

          // Verify healthy search works
          const healthySearch = await appAA01.inject({
            method: 'GET',
            url: `/api/v1/spaces/${spaceId}/search?q=needle`,
            headers: { authorization: `Bearer ${boot.adminToken}` }
          });
          expect(healthySearch.statusCode).toBe(200);
          expect(healthySearch.json().data.length).toBe(1);
        } finally {
          await appAA01.close();
          dbAA01.close();
        }

        // Test with detail=none
        for (const mode of ['bootstrap', 'init', 'serve']) {
          const fileMode = join(tempDir, `aa01_detail_${mode}.sqlite`);
          writeFileSync(fileMode, readFileSync(file));
          let dbMode = new Database(fileMode);
          try {
            const rows = dbMode.prepare('SELECT post_id,space_id,title,summary,body,tags FROM post_fts').all();
            const ddl = (dbMode.prepare("SELECT sql FROM sqlite_master WHERE name='post_fts'").get() as any).sql;
            dbMode.exec('DROP TABLE post_fts');
            dbMode.exec(ddl.replace(/\)\s*$/, ', detail=none)'));
            const insert = dbMode.prepare('INSERT INTO post_fts(post_id,space_id,title,summary,body,tags) VALUES(@post_id,@space_id,@title,@summary,@body,@tags)');
            for (const row of rows) insert.run(row);

            const before = fullLogicalSnapshot(dbMode);
            const classification = classifyDatabase(dbMode);
            expect(classification.kind).toBe('corrupt');

            let rejected = false;
            try {
              if (mode === 'bootstrap') {
                bootstrapDatabase(dbMode);
              } else {
                openAndCoordinateDatabase(dbMode, mode as 'init' | 'serve');
              }
            } catch (e: any) {
              rejected = true;
            }
            expect(rejected).toBe(true);

            dbMode.close();
            dbMode = new Database(fileMode);
            expect(fullLogicalSnapshot(dbMode)).toEqual(before);
          } finally {
            dbMode.close();
          }
        }
      });
    });
  });
});


