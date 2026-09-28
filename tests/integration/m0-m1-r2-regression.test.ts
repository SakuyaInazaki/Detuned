import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@detuned/server';
import { SqliteStorage, bootstrapDatabase, SCHEMA_SQL } from '@detuned/storage-sqlite';

describe('M0-R2 / M1-R2 Behavioral Regressions (S01 - S11 & CLI)', () => {
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
    key: string | null = `r2-${++serial}`
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

  const note = (body = 'Synthetic R2 fixture') => ({
    kind: 'note',
    title: 'R2 note',
    summary: 'R2 fixture',
    body,
  });

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'detuned-r2-vitest-'));
    db = new Database(join(tempDir, 'test.sqlite'));
    const boot = bootstrapDatabase(db);
    adminToken = boot.adminToken!;
    storage = new SqliteStorage(db);
    app = buildApp({ storage });
    await app.ready();
  });

  afterEach(async () => {
    if (app) await app.close();
    if (db) db.close();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('S01: Redacted initial_post cannot reappear through thread.create replay', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's01-space', objective: 'S01', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S01 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const inlinePayload = {
      title: 'S01 thread with initial post',
      initial_post: note('R2_NESTED_REDACTION_MARKER'),
    };
    const inline = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, inlinePayload, 's01-key'));
    const initialPostId = inline.initial_post.post.id;

    // Redact the initial post
    const redactRes = await send('POST', `/spaces/${spaceId}/redactions`, adminToken, {
      target_type: 'post',
      target_id: initialPostId,
      reason: 'S01 synthetic redaction',
    });
    expect(redactRes.status).toBe(201);

    // Replay thread creation with same idempotency key
    const replay = await send('POST', `/spaces/${spaceId}/threads`, writeToken, inlinePayload, 's01-key');
    expect(replay.status).toBe(201);
    expect(replay.raw.includes('R2_NESTED_REDACTION_MARKER')).toBe(false);
    expect(replay.body.data.initial_post.post.lifecycle).toBe('redacted');
    expect(replay.body.data.initial_post.revision.body).toBe('[REDACTED]');
  });

  it('S02: Redacted tags cannot reappear through post.create replay', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's02-space', objective: 'S02', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S02 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, { title: 'S02 thread' })).thread.id;

    const taggedPayload = { ...note(), tags: ['R2_PRIVATE_TAG'] };
    const tagged = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, taggedPayload, 's02-tag-key'));
    const postId = tagged.post.id;

    // Redact the tagged post
    const redactRes = await send('POST', `/spaces/${spaceId}/redactions`, adminToken, {
      target_type: 'post',
      target_id: postId,
      reason: 'S02 synthetic redaction',
    });
    expect(redactRes.status).toBe(201);

    // Replay post creation with same idempotency key
    const tagReplay = await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, taggedPayload, 's02-tag-key');
    expect(tagReplay.status).toBe(201);
    expect(tagReplay.raw.includes('R2_PRIVATE_TAG')).toBe(false);
    expect(tagReplay.body.data.post.lifecycle).toBe('redacted');
    expect(tagReplay.body.data.revision.tags).toEqual([]);
  });

  it('S03: Relation resolve and reopen idempotency must account for URL target', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's03-space', objective: 'S03', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S03 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, { title: 'S03 thread' })).thread.id;
    const postA = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note()));
    const postB1 = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note()));
    const postB2 = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note()));
    const reason = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note()));

    const rel1 = getData(await send('POST', `/spaces/${spaceId}/relations`, writeToken, {
      source_ref: { post_id: postA.post.id, revision: 1 },
      target_ref: { post_id: postB1.post.id, revision: 1 },
      type: 'challenges',
    }));
    const rel2 = getData(await send('POST', `/spaces/${spaceId}/relations`, writeToken, {
      source_ref: { post_id: postA.post.id, revision: 1 },
      target_ref: { post_id: postB2.post.id, revision: 1 },
      type: 'challenges',
    }));

    const resolutionPayload = { expected_version: 1, reason_ref: { post_id: reason.post.id, revision: 1 } };

    // Resolve relation 1 with key 'resolve-two-targets'
    const res1 = await send('POST', `/spaces/${spaceId}/relations/${rel1.id}/resolve`, writeToken, resolutionPayload, 'resolve-two-targets');
    expect(res1.status).toBe(200);

    // Resolve relation 2 with same key
    const res2 = await send('POST', `/spaces/${spaceId}/relations/${rel2.id}/resolve`, writeToken, resolutionPayload, 'resolve-two-targets');
    const secondState = storage.findRelationById(rel2.id)!.state;

    // Must either resolve relation 2 (if key is scoped by target) or return 409 conflict, NEVER false success returning rel1 while rel2 is open!
    const validBehavior = res2.status === 409 || (res2.status === 200 && res2.body.data?.relation.id === rel2.id && secondState === 'resolved');
    expect(validBehavior).toBe(true);
    expect(res2.body.data?.relation.id).not.toBe(rel1.id);
  });

  it('S04: Public development secret must not authorize a future checkpoint', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's04-space', objective: 'S04', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S04 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const future = storage.getLatestEventSeq(spaceId) + 10000;
    const payload = Buffer.from(JSON.stringify({ space_id: spaceId, seq: future, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const sig = createHmac('sha256', 'detuned-dev-secret-key-min-32-bytes-long!').update(payload).digest('base64url');

    const forged = await send('POST', `/spaces/${spaceId}/subscriptions`, writeToken, {
      consumer_key: 'forged-checkpoint',
      start: 'context_checkpoint',
      checkpoint_token: `${payload}.${sig}`,
    });

    expect([400, 403, 409, 422]).toContain(forged.status);
    const consumer = storage.findConsumerByKey(spaceId, 'forged-checkpoint');
    if (consumer) {
      expect(consumer.ack_seq).toBeLessThanOrEqual(storage.getLatestEventSeq(spaceId));
    }
  });

  it('S05: Context checkpoint is bound to the requesting actor', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's05-space', objective: 'S05', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S05 writer');
    const reader = await createActor('S05 reader');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: reader, role: 'observer' });

    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);
    const readToken = await createCredential(reader, [spaceId], ['read']);

    const ctx = getData(await send('GET', `/spaces/${spaceId}/context`, writeToken));
    expect(ctx.checkpoint_token).toBeDefined();

    // Reader attempts to use writer's checkpoint
    const crossActor = await send('POST', `/spaces/${spaceId}/subscriptions`, readToken, {
      consumer_key: 'foreign-checkpoint',
      start: 'context_checkpoint',
      checkpoint_token: ctx.checkpoint_token,
    });

    expect([400, 403, 409, 422]).toContain(crossActor.status);
  });

  it('S06: Thread filter retains a relation whose endpoints are inside the subscribed thread', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's06-space', objective: 'S06', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S06 writer');
    const reader = await createActor('S06 reader');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: reader, role: 'observer' });

    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);
    const readToken = await createCredential(reader, [spaceId], ['read']);

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, { title: 'S06 thread' })).thread.id;
    const postA = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note()));
    const postB = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note()));

    // Subscribe to relation.created on threadId
    const subRes = getData(await send('POST', `/spaces/${spaceId}/subscriptions`, readToken, {
      consumer_key: 'thread-relations',
      start: 'now',
      thread_ids: [threadId],
      event_types: ['relation.created'],
    }));

    // Create relation between postA and postB inside threadId
    const relation = getData(await send('POST', `/spaces/${spaceId}/relations`, writeToken, {
      source_ref: { post_id: postA.post.id, revision: 1 },
      target_ref: { post_id: postB.post.id, revision: 1 },
      type: 'challenges',
    }));

    // Poll events
    const poll = getData(await send('POST', `/spaces/${spaceId}/consumers/${subRes.consumer.id}/poll`, readToken, { limit: 100 }));
    const delivered = poll.events.some((e: any) => e.type === 'relation.created' && e.object_id === relation.id);
    expect(delivered).toBe(true);
  });

  it('S07: Membership alone cannot bypass empty credential capabilities', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's07-space', objective: 'S07', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S07 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const noCapToken = await createCredential(writer, [spaceId], []);

    const noRead = await send('GET', `/spaces/${spaceId}/context`, noCapToken);
    expect(noRead.status).toBe(403);
  });

  it('S08: A legal 60-codepoint Chinese title is accepted', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's08-space', objective: 'S08', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S08 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, { title: 'S08 thread' })).thread.id;

    // 60 Chinese characters: 60 Unicode codepoints, 180 UTF-8 bytes
    const chineseTitle = '图'.repeat(60);
    const postRes = await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, {
      ...note(),
      title: chineseTitle,
    });
    expect(postRes.status).toBe(201);
  });

  it('S09: Failure kind validates category and mandatory fields', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's09-space', objective: 'S09', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S09 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, { title: 'S09 thread' })).thread.id;

    const badFailure = await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, {
      ...note(),
      kind: 'failure',
      structured: {
        attempt: 'fixture',
        category: 'banana', // invalid category
        assumptions: [],
        tested_scope: 'fixture only',
        expected: 'fixture',
        observed: 'fixture',
        ruled_out: 'this fixture only',
      },
    });
    expect([400, 422]).toContain(badFailure.status);
  });

  it('S10: Failed redaction audit insert rolls back content and lifecycle changes', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 's10-space', objective: 'S10', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const writer = await createActor('S10 writer');
    await send('POST', `/spaces/${spaceId}/memberships`, adminToken, { actor_id: writer, role: 'contributor' });
    const writeToken = await createCredential(writer, [spaceId], ['read', 'write']);

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, writeToken, { title: 'S10 thread' })).thread.id;
    const post = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, writeToken, note('R2_ATOMIC_ORIGINAL')));

    // Add trigger that aborts insertion into redactions table
    db.exec("CREATE TRIGGER r2_fail_redaction BEFORE INSERT ON redactions BEGIN SELECT RAISE(ABORT, 'synthetic r2 audit failure'); END");

    const failedRedact = await send('POST', `/spaces/${spaceId}/redactions`, adminToken, {
      target_type: 'post',
      target_id: post.post.id,
      reason: 'Synthetic R2 redaction',
    });
    expect(failedRedact.status).toBe(500);

    db.exec('DROP TRIGGER r2_fail_redaction');

    const auditRows = (db.prepare('SELECT count(*) AS n FROM redactions WHERE target_id = ?').get(post.post.id) as any).n;
    const postState = storage.findPostById(post.post.id)!.lifecycle;
    const rev = storage.getPostRevision(post.post.id, 1)!;

    expect(auditRows).toBe(0);
    expect(postState).toBe('active');
    expect(rev.body).toBe('R2_ATOMIC_ORIGINAL');
  });

  it('S11: Bootstrap recovers after failure between admin actor and credential creation', () => {
    const bootDbPath = join(tempDir, 'bootstrap-fail.sqlite');
    const bootDb = new Database(bootDbPath);
    let firstBootThrew = false;

    try {
      bootDb.exec(SCHEMA_SQL);
      bootDb.exec("CREATE TRIGGER r2_fail_credential BEFORE INSERT ON credentials BEGIN SELECT RAISE(ABORT, 'synthetic r2 credential failure'); END");
      try {
        bootstrapDatabase(bootDb);
      } catch {
        firstBootThrew = true;
      }
      bootDb.exec('DROP TRIGGER r2_fail_credential');
    } finally {
      bootDb.close();
    }

    expect(firstBootThrew).toBe(true);

    const reopenedBootDb = new Database(bootDbPath);
    let retryBoot: any;
    let credentials = 0;
    try {
      retryBoot = bootstrapDatabase(reopenedBootDb);
      credentials = (reopenedBootDb.prepare('SELECT count(*) AS n FROM credentials').get() as any).n;
    } finally {
      reopenedBootDb.close();
    }

    expect(retryBoot.isNewInstance).toBe(true);
    expect(Boolean(retryBoot.adminToken)).toBe(true);
    expect(credentials).toBe(1);
  });

  it('CLI: post, revision, withdraw commands succeed without schema errors', async () => {
    const spaceRes = await send('POST', '/spaces', adminToken, { slug: 'cli-test', objective: 'CLI test', rules: [] });
    const spaceId = getData(spaceRes).space.id;

    const threadId = getData(await send('POST', `/spaces/${spaceId}/threads`, adminToken, { title: 'CLI test thread' })).thread.id;
    const fields = { title: 'CLI note', summary: 'CLI fixture', body: 'Synthetic body' };
    const targetPost = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, adminToken, { kind: 'note', ...fields })).post.id;
    const withdrawTarget = getData(await send('POST', `/spaces/${spaceId}/threads/${threadId}/posts`, adminToken, { kind: 'note', ...fields })).post.id;

    const url = await app.listen({ host: '127.0.0.1', port: 0 });
    const cliPath = fileURLToPath(new URL('../../packages/cli/dist/index.js', import.meta.url));

    async function runCli(op: string, input: any) {
      const inputPath = join(tempDir, `cli-${op}.json`);
      writeFileSync(inputPath, JSON.stringify(input));
      const child = spawn(process.execPath, [
        cliPath, '--json', '--url', url, 'publish', '--space', spaceId, '--op', op,
        '--input', inputPath, '--request-key', `test-cli-${op}`
      ], {
        env: { ...process.env, DETUNED_TOKEN: adminToken, DETUNED_TOKEN_FILE: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });

      const exitCode = await new Promise<number>((resolve, reject) => {
        child.on('close', resolve);
        child.on('error', reject);
      });

      let parsedOut: any;
      try { parsedOut = JSON.parse(stdout); } catch { parsedOut = {}; }
      return { exitCode, parsedOut, stderr };
    }

    const postCheck = await runCli('post', { thread_id: threadId, kind: 'note', ...fields });
    expect(postCheck.exitCode).toBe(0);
    expect(postCheck.parsedOut.post?.id).toBeDefined();

    const revCheck = await runCli('revision', { post_id: targetPost, expected_revision: 1, ...fields, body: 'Revised body' });
    expect(revCheck.exitCode).toBe(0);
    expect(revCheck.parsedOut.revision?.revision).toBe(2);

    const withdrawCheck = await runCli('withdraw', { post_id: withdrawTarget, expected_revision: 1, reason: 'Synthetic withdrawal' });
    expect(withdrawCheck.exitCode).toBe(0);
    expect(withdrawCheck.parsedOut.lifecycle).toBe('withdrawn');
  });
});
