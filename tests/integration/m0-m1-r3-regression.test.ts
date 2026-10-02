import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@detuned/server';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { DetunedClient } from '@detuned/client';
import activatePi from '@detuned/adapter-pi';
import { HISTORICAL_V1_SCHEMA_SQL } from '../fixtures/historical-v1-schema.js';

describe('M0-R3 / M1-R3 Behavioral Regressions (T01 - T11)', () => {
  let tempDir: string;
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: FastifyInstance;
  let adminToken: string;
  let serial = 0;

  async function send(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    token: string,
    payload?: unknown,
    key: string | null = `r3-${++serial}`
  ) {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (key !== null) headers['idempotency-key'] = key;
    const res = await app.inject({
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

  function gate() {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { promise, release };
  }

  const note = (body?: string) => ({
    kind: 'note',
    title: 'R3 note',
    summary: 'Regression fixture',
    body: body ?? 'Synthetic note',
  });

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'detuned-r3-test-'));
    db = new Database(join(tempDir, 'test.sqlite'));
    const boot = bootstrapDatabase(db);
    adminToken = boot.adminToken!;
    storage = new SqliteStorage(db);
    app = buildApp({ storage });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('T01: An immediate resolve retry preserves its immutable resolution result', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, { slug: 't01-space', objective: 'T01', rules: [] })
    ).space.id;
    const actor = getData(
      await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: 'T01 agent' })
    ).id;
    await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: actor, role: 'contributor' });
    const token = getData(
      await send('POST', '/admin/credentials', adminToken, {
        actor_id: actor,
        allowed_space_ids: [space],
        capabilities: ['read', 'write'],
      })
    ).token;

    const thread = getData(
      await send('POST', `/spaces/${space}/threads`, token, { title: 'T01 thread' })
    ).thread.id;

    const p1 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, token, note()));
    const p2 = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, token, note()));
    const reason = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, token, note()));

    const rel = getData(
      await send('POST', `/spaces/${space}/relations`, token, {
        source_ref: { post_id: p1.post.id, revision: 1 },
        target_ref: { post_id: p2.post.id, revision: 1 },
        type: 'challenges',
      })
    );

    const resolvePayload = { expected_version: 1, reason_ref: { post_id: reason.post.id, revision: 1 } };
    const firstRes = getData(
      await send('POST', `/spaces/${space}/relations/${rel.id}/resolve`, token, resolvePayload, 't01-resolve')
    );
    const secondRes = getData(
      await send('POST', `/spaces/${space}/relations/${rel.id}/resolve`, token, resolvePayload, 't01-resolve')
    );

    expect(firstRes.resolution).toBeDefined();
    expect(secondRes.resolution).toBeDefined();
    expect(firstRes.resolution.id).toBe(secondRes.resolution.id);
    expect(isDeepStrictEqual(firstRes.resolution, secondRes.resolution)).toBe(true);
    expect(firstRes.relation.version).toBe(secondRes.relation.version);
    expect(secondRes.relation.version).toBe(2);
  });

  it('T02: Thread create replay does not silently become a newer operation version', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, { slug: 't02-space', objective: 'T02', rules: [] })
    ).space.id;
    const actor = getData(
      await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: 'T02 agent' })
    ).id;
    await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: actor, role: 'contributor' });
    const token = getData(
      await send('POST', '/admin/credentials', adminToken, {
        actor_id: actor,
        allowed_space_ids: [space],
        capabilities: ['read', 'write'],
      })
    ).token;

    const threadPayload = { title: 'T02 original title' };
    const originalThread = getData(
      await send('POST', `/spaces/${space}/threads`, token, threadPayload, 't02-thread')
    ).thread;

    expect(originalThread.version).toBe(1);
    expect(originalThread.title).toBe('T02 original title');

    // Mutate thread to version 2
    await send('PATCH', `/spaces/${space}/threads/${originalThread.id}`, token, {
      expected_version: 1,
      title: 'T02 modified title',
    });

    // Replay creation with original key
    const replayThread = getData(
      await send('POST', `/spaces/${space}/threads`, token, threadPayload, 't02-thread')
    ).thread;

    expect(replayThread.version).toBe(1);
    expect(replayThread.title).toBe('T02 original title');
  });

  it('T03: Legacy full-JSON space.create result can be replayed after upgrade', async () => {
    const spacePayload = { slug: 't03-space', objective: 'T03', rules: [] };
    const firstSpace = getData(await send('POST', '/spaces', adminToken, spacePayload, 't03-space-key'));

    // Simulate legacy storage format where result_ref held the full JSON object including SpaceRevision
    db.prepare(
      "UPDATE idempotency_records SET result_ref = ? WHERE operation = 'space.create' AND key = 't03-space-key'"
    ).run(JSON.stringify(firstSpace));

    // Replay create
    const replay = await send('POST', '/spaces', adminToken, spacePayload, 't03-space-key');
    expect(replay.status).toBe(201);
    expect(replay.body.data?.revision?.revision).toBe(1);
    expect(replay.body.data?.space?.slug).toBe('t03-space');
  });

  it('T04: An empty allowed-space set has the same deny semantics in enumeration and direct access', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, { slug: 't04-space', objective: 'T04', rules: [] })
    ).space.id;
    const actor = getData(
      await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: 'T04 agent' })
    ).id;
    await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: actor, role: 'contributor' });
    const emptyToken = getData(
      await send('POST', '/admin/credentials', adminToken, {
        actor_id: actor,
        allowed_space_ids: [],
        capabilities: ['read', 'write'],
      })
    ).token;

    const listRes = getData(await send('GET', '/spaces', emptyToken));
    expect(listRes.length).toBe(0);

    const directRes = await send('GET', `/spaces/${space}/context`, emptyToken);
    expect([403, 404]).toContain(directRes.status);
  });

  it('T05: Redaction retry commits exactly one audit/result and one invalidation event', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, { slug: 't05-space', objective: 'T05', rules: [] })
    ).space.id;
    const actor = getData(
      await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: 'T05 agent' })
    ).id;
    await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: actor, role: 'contributor' });
    const token = getData(
      await send('POST', '/admin/credentials', adminToken, {
        actor_id: actor,
        allowed_space_ids: [space],
        capabilities: ['read', 'write'],
      })
    ).token;

    const thread = getData(
      await send('POST', `/spaces/${space}/threads`, token, { title: 'T05 thread' })
    ).thread.id;
    const targetPost = getData(await send('POST', `/spaces/${space}/threads/${thread}/posts`, token, note()));

    const redactionPayload = {
      target_type: 'post',
      target_id: targetPost.post.id,
      reason: 'Synthetic T05 redaction',
    };

    const redact1 = getData(
      await send('POST', `/spaces/${space}/redactions`, adminToken, redactionPayload, 't05-redact')
    );
    const redact2 = getData(
      await send('POST', `/spaces/${space}/redactions`, adminToken, redactionPayload, 't05-redact')
    );

    expect(redact1.redaction_id).toBe(redact2.redaction_id);

    const auditCount = (db.prepare('SELECT count(*) AS n FROM redactions WHERE target_id = ?').get(
      targetPost.post.id
    ) as any).n;
    const eventCount = (db.prepare(
      "SELECT count(*) AS n FROM events WHERE object_id = ? AND type = 'post.redacted'"
    ).get(targetPost.post.id) as any).n;

    expect(auditCount).toBe(1);
    expect(eventCount).toBe(1);
  });

  it('T06: An already initialized v1 upgrade preserves credentials and migrates old content caches', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, { slug: 't06-space', objective: 'T06', rules: [] })
    ).space.id;
    const actor = getData(
      await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: 'T06 agent' })
    ).id;
    await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: actor, role: 'contributor' });
    const token = getData(
      await send('POST', '/admin/credentials', adminToken, {
        actor_id: actor,
        allowed_space_ids: [space],
        capabilities: ['read', 'write'],
      })
    ).token;

    const thread = getData(
      await send('POST', `/spaces/${space}/threads`, token, { title: 'T06 thread' })
    ).thread.id;
    const legacyPost = getData(
      await send('POST', `/spaces/${space}/threads/${thread}/posts`, token, note('T06_LEGACY_CACHE_MARKER'), 't06-legacy-post')
    );

    db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE key = 't06-legacy-post'").run(
      JSON.stringify(legacyPost)
    );

    const legacyPath = join(tempDir, 'legacy.sqlite');
    const legacyDb = new Database(legacyPath);
    try {
      legacyDb.exec(HISTORICAL_V1_SCHEMA_SQL);
      legacyDb.pragma('foreign_keys = ON');
      legacyDb.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)').run('2026-09-28T00:00:00.000Z');
      for (const table of ['actors', 'credentials', 'spaces', 'space_revisions', 'memberships', 'threads', 'posts', 'post_revisions', 'events']) {
        const columns = legacyDb.prepare(`PRAGMA table_info(${table})`).all().map((c: any) => c.name);
        const quoted = columns.map((c: any) => `"${c}"`).join(',');
        const insert = legacyDb.prepare(`INSERT INTO ${table}(${quoted}) VALUES(${columns.map(() => '?').join(',')})`);
        for (const row of db.prepare(`SELECT ${quoted} FROM ${table}`).all()) insert.run(...columns.map((c: any) => (row as any)[c]));
      }
      const recordRow = db.prepare("SELECT * FROM idempotency_records WHERE key = 't06-legacy-post'").get() as any;
      recordRow.result_ref = JSON.stringify(legacyPost);
      const fields = Object.keys(recordRow);
      legacyDb.prepare(`INSERT INTO idempotency_records(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`).run(...fields.map((c) => recordRow[c]));

      const preMetadataAbsent = !legacyDb.prepare("SELECT 1 FROM sqlite_master WHERE name='instance_metadata'").get();
      const preThreadVersionsAbsent = !legacyDb.prepare("SELECT 1 FROM sqlite_master WHERE name='thread_versions'").get();
      const preFkErrors = (legacyDb.pragma('foreign_key_check') as any[]).length;
      expect(preMetadataAbsent).toBe(true);
      expect(preThreadVersionsAbsent).toBe(true);
      expect(preFkErrors).toBe(0);

      const credsBefore = (legacyDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
      const upgraded = bootstrapDatabase(legacyDb);
      const credsAfter = (legacyDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
      const cache = (legacyDb.prepare("SELECT result_ref FROM idempotency_records WHERE key = 't06-legacy-post'").get() as any).result_ref;

      expect(credsAfter).toBe(credsBefore);
      expect(upgraded.adminToken).toBeNull();
      expect(cache.includes('T06_LEGACY_CACHE_MARKER')).toBe(false);
    } finally {
      legacyDb.close();
    }
  });

  it('T07: Unsupported schema version is rejected before any DDL mutation', () => {
    const futureDb = new Database(join(tempDir, 'future.sqlite'));
    try {
      futureDb.exec(
        "CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES(999, '2026-09-28T00:00:00.000Z')"
      );
      const tablesBefore = (futureDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get() as any).n;
      let rejected = false;
      try {
        bootstrapDatabase(futureDb);
      } catch {
        rejected = true;
      }
      const tablesAfter = (futureDb.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get() as any).n;

      expect(rejected).toBe(true);
      expect(tablesAfter).toBe(tablesBefore);
    } finally {
      futureDb.close();
    }
  });

  it('T08: ACL epoch invalidation applies consistently to poll and ack', async () => {
    const space = getData(
      await send('POST', '/spaces', adminToken, { slug: 't08-space', objective: 'T08', rules: [] })
    ).space.id;
    const actor = getData(
      await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: 'T08 agent' })
    ).id;
    await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: actor, role: 'contributor' });
    const token = getData(
      await send('POST', '/admin/credentials', adminToken, {
        actor_id: actor,
        allowed_space_ids: [space],
        capabilities: ['read', 'write'],
      })
    ).token;

    const consumer = getData(
      await send('POST', `/spaces/${space}/subscriptions`, token, { consumer_key: 't08-acl', start: 'beginning' })
    ).consumer;
    const batch = getData(await send('POST', `/spaces/${space}/consumers/${consumer.id}/poll`, token, { limit: 1 }));

    // Advance space ACL epoch by modifying membership role
    await send('PATCH', `/spaces/${space}/memberships/${actor}`, adminToken, { role: 'observer' });

    // Stale poll fails with 409 RESYNC_REQUIRED
    const stalePoll = await send('POST', `/spaces/${space}/consumers/${consumer.id}/poll`, token, { limit: 1 });
    expect(stalePoll.status).toBe(409);
    expect(stalePoll.body.error?.code).toBe('RESYNC_REQUIRED');

    // Stale ack fails with 409 RESYNC_REQUIRED and consumer remains unchanged
    const beforeAck = storage.findConsumerById(consumer.id);
    const staleAck = await send('POST', `/spaces/${space}/consumers/${consumer.id}/ack`, token, {
      batch_id: batch.batch_id,
      next_cursor: batch.next_cursor,
    });
    const afterAck = storage.findConsumerById(consumer.id);

    expect(staleAck.status).toBe(409);
    expect(staleAck.body.error?.code).toBe('RESYNC_REQUIRED');
    expect(isDeepStrictEqual(beforeAck, afterAck)).toBe(true);
  });

  it('T09: Pi cancellation while a request is running reaches fetch and rejects without retry', async () => {
    const registered = new Map<string, any>();
    activatePi({
      registerTool(t: any) {
        registered.set(t.name, t);
      },
      registerCommand() {},
      on() {},
    } as any);

    const savedFetch = globalThis.fetch;
    try {
      const begun = gate();
      const finish = gate();
      let fetchSignal: AbortSignal | undefined;
      let fetchCalls = 0;
      const ctl = new AbortController();

      globalThis.fetch = (async (_url: any, opts: any) => {
        fetchCalls++;
        fetchSignal = opts.signal;
        begun.release();
        await finish.promise;
        if (opts.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return new Response(JSON.stringify({ data: { fixture: true } }), { status: 200 });
      }) as any;

      const running = registered
        .get('forum_context')
        .execute('r3-t09', { space_id: 'dummy-space' }, ctl.signal)
        .then(
          () => 'resolved',
          () => 'rejected'
        );

      await begun.promise;
      ctl.abort();
      const forwarded = fetchSignal?.aborted;
      finish.release();
      const outcome = await running;

      expect(forwarded).toBe(true);
      expect(outcome).toBe('rejected');
      expect(fetchCalls).toBe(1);
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it('T10: HTTP cancellation remains active until response body parsing completes', async () => {
    const savedFetch = globalThis.fetch;
    try {
      const readingBody = gate();
      const finishBody = gate();
      const bodyCtl = new AbortController();
      let bodyFetchSignal: AbortSignal | undefined;

      globalThis.fetch = (async (_url: any, opts: any) => {
        bodyFetchSignal = opts.signal;
        return {
          ok: true,
          status: 200,
          json: async () => {
            readingBody.release();
            await finishBody.promise;
            if (opts.signal?.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }
            return { data: { fixture: true } };
          },
        };
      }) as any;

      const client = new DetunedClient({ baseUrl: 'http://unused.invalid', maxRetries: 0 });
      const reading = client
        .request({ method: 'GET', path: '/fixture', signal: bodyCtl.signal })
        .then(
          () => 'resolved',
          () => 'rejected'
        );

      await readingBody.promise;
      bodyCtl.abort();
      const bodyForwarded = bodyFetchSignal?.aborted;
      finishBody.release();
      const bodyOutcome = await reading;

      expect(bodyForwarded).toBe(true);
      expect(bodyOutcome).toBe('rejected');
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it('T11: detuned serve refuses unsupported schema version 999 before listening', async () => {
    const serveDir = mkdtempSync(join(tmpdir(), 'detuned-t11-'));
    const serveDb = new Database(join(serveDir, 'detuned.sqlite'));
    bootstrapDatabase(serveDb);
    serveDb
      .prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(999, ?)')
      .run(new Date().toISOString());
    serveDb.close();

    const cli = fileURLToPath(new URL('../../packages/cli/dist/index.js', import.meta.url));
    let child: ReturnType<typeof spawn> | undefined;

    try {
      child = spawn(
        process.execPath,
        [cli, '--json', 'serve', '--data-dir', serveDir, '--host', '127.0.0.1', '--port', '0'],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      let stdout = '';
      let stderr = '';
      let started = false;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child?.kill('SIGKILL');
      }, 8000);

      child.stdout?.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk;
        if (stderr.includes('Detuned 服务已启动')) {
          started = true;
          child?.kill('SIGTERM');
        }
      });

      let exitCode: number | null = null;
      try {
        exitCode = await new Promise<number | null>((resolve, reject) => {
          child?.on('close', resolve);
          child?.on('error', reject);
        });
      } finally {
        clearTimeout(timer);
      }

      const explainsVersion = /(schema|版本|version)/i.test(stdout + stderr) && (stdout + stderr).includes('999');

      expect(started).toBe(false);
      expect(timedOut).toBe(false);
      expect(exitCode).not.toBeNull();
      expect(exitCode).not.toBe(0);
      expect(explainsVersion).toBe(true);
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
      rmSync(serveDir, { recursive: true, force: true });
    }
  });
});
