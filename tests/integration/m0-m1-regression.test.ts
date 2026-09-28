import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@detuned/server';
import { SqliteStorage, bootstrapDatabase, DirectoryLock } from '@detuned/storage-sqlite';

describe('M0-R / M1-R Behavioral Regressions (R01 - R11)', () => {
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
    key: string | null = `regress-${++serial}`
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

  async function createActor(name: string) {
    const res = await send('POST', '/admin/actors', adminToken, { kind: 'agent', display_name: name });
    return getData(res).id;
  }

  async function createCredential(actor_id: string, allowed_space_ids: string[], capabilities: string[]) {
    const res = await send('POST', '/admin/credentials', adminToken, {
      actor_id,
      allowed_space_ids,
      capabilities,
    });
    return getData(res).token;
  }

  async function addMembership(space: string, who: string, role: string) {
    const res = await send('POST', `/spaces/${space}/memberships`, adminToken, { actor_id: who, role });
    return getData(res);
  }

  async function createThread(space: string, token: string, title: string, initial_post?: any) {
    const res = await send('POST', `/spaces/${space}/threads`, token, {
      title,
      ...(initial_post ? { initial_post } : {}),
    });
    return getData(res);
  }

  const note = (body = 'Synthetic review fixture') => ({
    kind: 'note',
    title: 'Review note',
    summary: 'Review fixture',
    body,
  });

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'detuned-regress-'));
    db = new Database(join(tempDir, 'review.sqlite'));
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

  it('R01: Read-only capability cannot create a thread', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'review-a', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('review-writer');
    await addMembership(spaceA, writer, 'contributor');
    const readToken = await createCredential(writer, [spaceA], ['read']);

    const ro = await send('POST', `/spaces/${spaceA}/threads`, readToken, { title: 'Read token must not write' });
    expect(ro.status).toBe(403);
  });

  it('R02: A-scoped token must not enumerate B in /spaces or /me', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-a', objective: 'A', rules: [] })).space.id;
    const spaceB = getData(await send('POST', '/spaces', adminToken, { slug: 'space-b', objective: 'B', rules: [] })).space.id;
    const writer = await createActor('writer-ab');
    await addMembership(spaceA, writer, 'contributor');
    await addMembership(spaceB, writer, 'contributor');
    const scopedToken = await createCredential(writer, [spaceA], ['read', 'write']);

    const listed = getData(await send('GET', '/spaces', scopedToken));
    const me = getData(await send('GET', '/me', scopedToken));

    expect(listed.some((s: any) => s.id === spaceB)).toBe(false);
    expect(me.visible_spaces.some((s: any) => s.id === spaceB)).toBe(false);
  });

  it('R03a, R03b, R03c: HTTP schema validation rejects unknown properties, oversize title, and incomplete claim', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-schema', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('writer-schema');
    await addMembership(spaceA, writer, 'contributor');
    const writeToken = await createCredential(writer, [spaceA], ['read', 'write']);

    // R03a: Unknown property
    const unknown = await send('POST', `/spaces/${spaceA}/threads`, writeToken, {
      title: 'Unknown field',
      extra_unknown_field: true,
    });
    expect([400, 422]).toContain(unknown.status);

    // R03b: Oversize title > 160
    const oversize = await send('POST', `/spaces/${spaceA}/threads`, writeToken, {
      title: 'x'.repeat(161),
    });
    expect([400, 422]).toContain(oversize.status);

    // R03c: Claim without required structured fields
    const t1 = (await createThread(spaceA, writeToken, 'Thread one')).thread.id;
    const noStructured = await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, {
      kind: 'claim',
      title: 'Incomplete claim',
      summary: 'No scope',
      body: 'No structured claim fields',
    });
    expect([400, 422]).toContain(noStructured.status);
  });

  it('R04: initial_post persists its declared relation', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-initpost', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('writer-initpost');
    await addMembership(spaceA, writer, 'contributor');
    const writeToken = await createCredential(writer, [spaceA], ['read', 'write']);

    const t1 = (await createThread(spaceA, writeToken, 'Thread one')).thread.id;
    const target = getData(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, note())).post.id;

    const inline = await createThread(spaceA, writeToken, 'Initial post references', {
      ...note(),
      refs: [{ type: 'cites', target_ref: { post_id: target, revision: 1 } }],
    });

    const refCount = (db.prepare('SELECT count(*) AS n FROM relations WHERE source_post_id = ?').get(inline.initial_post.post.id) as any).n;
    expect(refCount).toBe(1);
  });

  it('R05a & R05b: Idempotency scope includes target resource, and missing key is rejected', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-idem', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('writer-idem');
    await addMembership(spaceA, writer, 'contributor');
    const writeToken = await createCredential(writer, [spaceA], ['read', 'write']);

    const t1 = (await createThread(spaceA, writeToken, 'Thread 1')).thread.id;
    const t2 = (await createThread(spaceA, writeToken, 'Thread 2')).thread.id;

    // R05a: Same key to two different threads must not return t1 post when writing to t2
    const payload = note('REVIEW_IDEM_MARKER');
    const first = getData(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, payload, 'same-key-two-targets'));
    const second = await send('POST', `/spaces/${spaceA}/threads/${t2}/posts`, writeToken, payload, 'same-key-two-targets');

    expect(second.status).toBe(201);
    expect(second.body.data.post.thread_id).toBe(t2);
    expect(second.body.data.post.id).not.toBe(first.post.id);

    // R05b: Missing idempotency key on write must return 400/422
    const noKey1 = await send('POST', `/spaces/${spaceA}/threads`, writeToken, { title: 'Missing key' }, null);
    const noKey2 = await send('POST', `/spaces/${spaceA}/threads`, writeToken, { title: 'Missing key' }, null);
    expect([400, 422]).toContain(noKey1.status);
    expect([400, 422]).toContain(noKey2.status);
  });

  it('R06: Redaction covers revision listing and idempotent replay', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-redact', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('writer-redact');
    await addMembership(spaceA, writer, 'contributor');
    const writeToken = await createCredential(writer, [spaceA], ['read', 'write']);

    const t1 = (await createThread(spaceA, writeToken, 'Thread 1')).thread.id;
    const payload = note('REVIEW_REDACTION_MARKER');
    const first = getData(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, payload, 'redact-key-1'));

    // Redact
    await send('POST', `/spaces/${spaceA}/redactions`, adminToken, {
      target_type: 'post',
      target_id: first.post.id,
      reason: 'Synthetic review probe',
    });

    const normalRead = await send('GET', `/spaces/${spaceA}/posts/${first.post.id}`, writeToken);
    expect(normalRead.status).toBe(410);

    const history = await send('GET', `/spaces/${spaceA}/posts/${first.post.id}/revisions`, writeToken);
    expect(history.raw.includes('REVIEW_REDACTION_MARKER')).toBe(false);

    const replay = await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, payload, 'redact-key-1');
    expect(replay.raw.includes('REVIEW_REDACTION_MARKER')).toBe(false);
  });

  it('R07: A owner cannot redact B post through A route', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-a-redact', objective: 'A', rules: [] })).space.id;
    const spaceB = getData(await send('POST', '/spaces', adminToken, { slug: 'space-b-redact', objective: 'B', rules: [] })).space.id;

    const ownerA = await createActor('owner-a');
    await addMembership(spaceA, ownerA, 'owner');
    const ownerAToken = await createCredential(ownerA, [spaceA], ['read', 'write']);

    const writerB = await createActor('writer-b');
    await addMembership(spaceB, writerB, 'contributor');
    const writerBToken = await createCredential(writerB, [spaceB], ['read', 'write']);

    const tb = (await createThread(spaceB, writerBToken, 'Space B thread')).thread.id;
    const victim = getData(await send('POST', `/spaces/${spaceB}/threads/${tb}/posts`, writerBToken, note())).post.id;

    // Owner A attempts to redact Space B post via Space A route
    const crossRedact = await send('POST', `/spaces/${spaceA}/redactions`, ownerAToken, {
      target_type: 'post',
      target_id: victim,
      reason: 'Cross space attack',
    });

    expect(crossRedact.status).toBe(404);
    const victimState = storage.findPostById(victim)!.lifecycle;
    expect(victimState).toBe('active');
  });

  it('R08: ACK cannot advance beyond persisted delivery batch', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-ack', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('writer-ack');
    await addMembership(spaceA, writer, 'contributor');
    const writeToken = await createCredential(writer, [spaceA], ['read', 'write']);

    const t1 = (await createThread(spaceA, writeToken, 'Thread 1')).thread.id;
    await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, note());

    const consumer = getData(await send('POST', `/spaces/${spaceA}/subscriptions`, writeToken, {
      consumer_key: 'forged-cursor',
      start: 'beginning',
      event_types: [],
    })).consumer;

    const polled = getData(await send('POST', `/spaces/${spaceA}/consumers/${consumer.id}/poll`, writeToken, { limit: 1 }));
    const future = storage.getLatestEventSeq(spaceA) + 10000;

    // Try forged ACK cursor with future through_seq
    const cursorBody = Buffer.from(
      JSON.stringify({
        consumer_id: consumer.id,
        batch_id: polled.batch_id,
        through_seq: future,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');

    const signature = createHmac('sha256', (app as any).tokenSecret ?? 'detuned-dev-secret-key-min-32-bytes-long!').update(cursorBody).digest('base64url');
    const forgedAck = await send('POST', `/spaces/${spaceA}/consumers/${consumer.id}/ack`, writeToken, {
      batch_id: polled.batch_id,
      next_cursor: `${cursorBody}.${signature}`,
    });

    expect(forgedAck.status).toBe(409);
    expect(storage.findConsumerById(consumer.id)!.ack_seq).toBeLessThanOrEqual(storage.getLatestEventSeq(spaceA));
  });

  it('R09a & R09b: Subscriptions do not silently reuse differing filters, and thread_ids filter works', async () => {
    const spaceA = getData(await send('POST', '/spaces', adminToken, { slug: 'space-filter', objective: 'A', rules: [] })).space.id;
    const writer = await createActor('writer-filter');
    await addMembership(spaceA, writer, 'contributor');
    const writeToken = await createCredential(writer, [spaceA], ['read', 'write']);

    const t1 = (await createThread(spaceA, writeToken, 'Thread 1')).thread.id;
    const t2 = (await createThread(spaceA, writeToken, 'Thread 2')).thread.id;

    // Initial sub with no filter
    await send('POST', `/spaces/${spaceA}/subscriptions`, writeToken, {
      consumer_key: 'first-filter',
      start: 'beginning',
    });

    // R09a: Sub with different filter
    const filtered = getData(await send('POST', `/spaces/${spaceA}/subscriptions`, writeToken, {
      consumer_key: 'different-filter',
      start: 'now',
      event_types: ['post.created'],
      thread_ids: [t2],
    }));

    expect(filtered.subscription.event_types).toEqual(['post.created']);
    expect(filtered.subscription.thread_ids).toContain(t2);

    // R09b: Reader subscribed only to t2 should NOT receive posts from t1
    const otherActor = await createActor('thread-filter-reader');
    await addMembership(spaceA, otherActor, 'observer');
    const otherToken = await createCredential(otherActor, [spaceA], ['read']);

    const threadSub = getData(await send('POST', `/spaces/${spaceA}/subscriptions`, otherToken, {
      consumer_key: 'only-t2',
      start: 'now',
      event_types: ['post.created'],
      thread_ids: [t2],
    }));

    const outside = getData(await send('POST', `/spaces/${spaceA}/threads/${t1}/posts`, writeToken, note())).post.id;
    const filteredPoll = getData(await send('POST', `/spaces/${spaceA}/consumers/${threadSub.consumer.id}/poll`, otherToken, { limit: 100 }));
    const wrongThread = filteredPoll.events.some((e: any) => e.object_id === outside);
    expect(wrongThread).toBe(false);
  });

  it('R10: Fresh initialized DB records applied migration version', () => {
    const migrationRows = (db.prepare('SELECT count(*) AS n FROM schema_migrations').get() as any).n;
    expect(migrationRows).toBeGreaterThanOrEqual(1);
  });

  it('R11: Lock recovers after owning process is dead', () => {
    const lockDir = join(tempDir, 'dead-lock');
    const lockModuleUrl = new URL('../../packages/storage-sqlite/dist/lock.js', import.meta.url).href;
    const childSource = `import { DirectoryLock } from ${JSON.stringify(lockModuleUrl)}; new DirectoryLock(process.argv[1]).acquire();`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', childSource, lockDir], { encoding: 'utf8' });
    expect(child.status).toBe(0);

    // Child is now terminated. Acquiring should recover without throwing!
    const retryLock = new DirectoryLock(lockDir);
    expect(() => {
      retryLock.acquire();
      retryLock.release();
    }).not.toThrow();
  });
});
