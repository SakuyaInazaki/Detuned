import { it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import Database from 'better-sqlite3';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DETUNED_TOOLS } from '@detuned/protocol';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';

const privateMarker = 'PRIVATE_WRAPPED_INPUT';
type RecordedRequest = { method: string; route: string; key: unknown; body: unknown };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected private fixture object.');
  return value as Record<string, unknown>;
}
function plain<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function result(value: unknown) { return record(record(value).structuredContent).result; }
function safeInvalid(value: unknown) {
  expect(record(value).isError).toBe(true);
  expect(record(record(value).structuredContent).error).toEqual({ code: 'VALIDATION_ERROR', message: 'Invalid forum tool arguments.' });
  expect(JSON.stringify(value).includes(privateMarker)).toBe(false);
}
async function eventually(predicate: () => boolean) {
  const deadline = performance.now() + 5000;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('Private wrapped resource barrier timed out.');
    await new Promise<void>(resolve => setImmediate(resolve));
  }
}
async function fixture() {
  const owned = await mkdtemp(path.join(tmpdir(), 'detuned-wrapped-independent-'));
  const db = new Database(path.join(owned, 'forum.sqlite'));
  const adminToken = bootstrapDatabase(db).adminToken;
  if (!adminToken) throw new Error('Private fresh bootstrap credential unavailable.');
  const app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
  const requests: RecordedRequest[] = [];
  app.addHook('preHandler', async request => {
    requests.push({ method: request.method, route: request.routeOptions.url ?? '', key: request.headers['idempotency-key'], body: request.body });
  });
  try {
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Private server address unavailable.');
    const url = `http://127.0.0.1:${address.port}`;
    const admin = new DetunedClient({ baseUrl: url, token: adminToken });
    const space = (await admin.createSpace({ slug: 'wrapped-private', objective: 'Private wrapped study', rules: [] }, 'space')).data.space.id;
    const thread = (await admin.createThread(space, { title: 'Private wrapped thread' }, 'thread')).data.thread.id;
    const actor = await admin.createActor({ kind: 'agent', display_name: 'Private wrapped contributor' });
    await admin.createMembership(space, { actor_id: actor.id, role: 'contributor' });
    const credential = await admin.createCredential({ actor_id: actor.id, allowed_space_ids: [space], capabilities: ['read', 'write'] });
    const tokenFile = path.join(owned, 'token');
    await writeFile(tokenFile, credential.token, { mode: 0o600 });
    const member = new DetunedClient({ baseUrl: url, token: credential.token });
    requests.length = 0;
    return { owned, db, app, url, space, thread, actor, tokenFile, member, requests,
      close: async () => { await app.close(); db.close(); await rm(owned, { recursive: true, force: true }); } };
  } catch (error) {
    await app.close(); db.close(); await rm(owned, { recursive: true, force: true }); throw error;
  }
}
async function bridge(f: Awaited<ReturnType<typeof fixture>>, mode?: string) {
  const env: Record<string, string> = { PATH: process.env.PATH ?? '/usr/bin:/bin', DETUNED_BASE_URL: f.url, DETUNED_TOKEN_FILE: f.tokenFile };
  if (mode !== undefined) env.DETUNED_MCP_INPUT_MODE = mode;
  const transport = new StdioClientTransport({ command: process.execPath, args: ['packages/mcp/dist/index.js'], env, stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', chunk => { stderr += String(chunk); });
  const sdk = new Client({ name: 'private-wrapped-independent', version: '1' }, { capabilities: {} });
  await sdk.connect(transport);
  return { sdk, stderr: () => stderr, close: () => sdk.close() };
}
function post(f: Awaited<ReturnType<typeof fixture>>, requestKey: string) {
  return { space_id: f.space, op: 'post', thread_id: f.thread, kind: 'note', title: 'Wrapped note', summary: 'Private note', body: 'Independent wrapped body', tags: [], structured: {}, request_key: requestKey };
}

it('wrapped independent default/explicit flat advertises the nine complete schemas; wrapped nests every canonical keyword exactly with no HTTP', async () => {
  const f = await fixture();
  try {
    const canonical = plain(DETUNED_TOOLS.map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.schema })));
    for (const mode of [undefined, 'flat', 'wrapped']) {
      const b = await bridge(f, mode);
      try {
        const tools = (await b.sdk.listTools()).tools;
        expect(tools).toHaveLength(9);
        if (mode !== 'wrapped') expect(tools).toEqual(canonical);
        else expect(tools).toEqual(canonical.map(tool => ({ ...tool, inputSchema: { type: 'object', properties: { input: tool.inputSchema }, required: ['input'], additionalProperties: false } })));
        expect(f.requests).toHaveLength(0);
        expect((f.db.prepare('SELECT count(*) n FROM sessions').get() as { n: number }).n).toBe(0);
      } finally { await b.close(); }
    }
  } finally { await f.close(); }
}, 30000);

it('wrapped independent outer, nested type, union and allOf rejection remain strict before preflight or session; flat has no wrapped fallback', async () => {
  const f = await fixture();
  const b = await bridge(f, 'wrapped');
  try {
    const bad = [
      { name: 'forum_context', arguments: { space_id: f.space } },
      { name: 'forum_context', arguments: { input: { space_id: f.space }, [privateMarker]: true } },
      { name: 'forum_context', arguments: {} },
      { name: 'forum_context', arguments: { input: null } },
      { name: 'forum_context', arguments: { input: [] } },
      { name: 'forum_context', arguments: { input: { space_id: 7 } } },
      { name: 'forum_read', arguments: { input: { space_id: f.space, kind: 'thread', id: f.thread, revision: 1 } } },
      { name: 'forum_publish', arguments: { input: { space_id: f.space, op: 'thread', title: 'Private', request_key: 'bad', post_id: privateMarker } } },
      { name: 'forum_subscribe', arguments: { input: { space_id: f.space, request_key: 'bad', consumer_key: 'bad', start: 'context_checkpoint' } } },
      { name: 'forum_subscribe', arguments: { input: { space_id: f.space, request_key: 'bad', consumer_key: 'bad', start: 'beginning', checkpoint_token: privateMarker } } },
      { name: 'forum_relate', arguments: { input: { space_id: f.space, op: 'create', request_key: 'bad', source_ref: { post_id: 'p', revision: '1' }, target_ref: { post_id: 'q', revision: 1 }, type: 'cites' } } },
    ];
    for (const call of bad) { const before = plain(call); safeInvalid(await b.sdk.callTool(call)); expect(call).toEqual(before); }
    expect(f.requests).toHaveLength(0);
    expect((f.db.prepare('SELECT count(*) n FROM sessions').get() as { n: number }).n).toBe(0);
    const flat = await bridge(f);
    try { safeInvalid(await flat.sdk.callTool({ name: 'forum_context', arguments: { input: { space_id: f.space } } })); expect(f.requests).toHaveLength(0); }
    finally { await flat.close(); }
  } finally { await b.close(); await f.close(); }
}, 30000);

it('wrapped independent publish preserves ordinary actor, target scope and request key; real replay creates only one post', async () => {
  const f = await fixture(); const b = await bridge(f, 'wrapped');
  try {
    const input = post(f, 'wrapped-same-logical-write'); const original = plain(input);
    const first = await b.sdk.callTool({ name: 'forum_publish', arguments: { input } });
    const replay = await b.sdk.callTool({ name: 'forum_publish', arguments: { input } });
    expect(record(first).isError).not.toBe(true); expect(record(replay).isError).not.toBe(true);
    expect(input).toEqual(original); expect(result(first)).toEqual(result(replay));
    const posts = f.db.prepare('SELECT id,space_id,thread_id,author_id FROM posts').all();
    expect(posts).toEqual([{ id: record(record(result(first)).post).id, space_id: f.space, thread_id: f.thread, author_id: f.actor.id }]);
    expect(f.db.prepare('SELECT actor_id,space_id FROM sessions').all()).toEqual([{ actor_id: f.actor.id, space_id: f.space }]);
    const writes = f.requests.filter(request => request.route.endsWith('/posts'));
    expect(writes).toHaveLength(2); expect(writes.every(request => request.key === input.request_key)).toBe(true);
    expect(writes.every(request => !Object.hasOwn(record(request.body), 'input'))).toBe(true);
    expect(f.requests.filter(request => request.route.endsWith('/capabilities'))).toHaveLength(1);
    expect(f.requests.filter(request => request.route.endsWith('/me'))).toHaveLength(1);
    expect(f.requests.filter(request => request.route.endsWith('/sessions'))).toHaveLength(1);
  } finally { await b.close(); await f.close(); }
}, 30000);

it('wrapped independent cancellation settles a real entered HTTP poll, preserves a separate pending batch and sends no ACK', async () => {
  const f = await fixture(); const b = await bridge(f, 'wrapped');
  try {
    const pending = (await f.member.subscribe(f.space, { consumer_key: 'pending', start: 'beginning' })).data.consumer.id;
    await f.member.poll(f.space, pending, { limit: 1 });
    const waiter = (await f.member.subscribe(f.space, { consumer_key: 'waiter', start: 'now' })).data.consumer.id;
    const before = f.db.prepare('SELECT id,ack_seq,active_batch_id FROM consumers ORDER BY id').all();
    expect(record(before.find(value => record(value).id === pending)).active_batch_id).not.toBeNull();
    const controller = new AbortController();
    const observed = b.sdk.callTool({ name: 'forum_poll', arguments: { input: { space_id: f.space, consumer_id: waiter, limit: 1, wait_ms: 25000 } } }, undefined, { signal: controller.signal }).then(() => true, () => false);
    await eventually(() => f.app.runtimeResources.activeCount === 1);
    controller.abort(); expect(await observed).toBe(false);
    await eventually(() => f.app.runtimeResources.activeCount === 0);
    expect(f.db.prepare('SELECT id,ack_seq,active_batch_id FROM consumers ORDER BY id').all()).toEqual(before);
    expect(f.requests.filter(request => request.route.endsWith('/ack'))).toHaveLength(0);
    const usable = await b.sdk.callTool({ name: 'forum_context', arguments: { input: { space_id: f.space } } });
    expect(record(usable).isError).not.toBe(true);
  } finally { await b.close(); await f.close(); }
}, 30000);

it('wrapped independent invalid startup modes exit safely without environment/token output or HTTP', async () => {
  const f = await fixture();
  try {
    for (const mode of [privateMarker, 'WRAPPED', '']) {
      const child = spawn(process.execPath, ['packages/mcp/dist/index.js'], { env: { PATH: process.env.PATH ?? '/usr/bin:/bin', DETUNED_BASE_URL: f.url, DETUNED_TOKEN_FILE: f.tokenFile, DETUNED_MCP_INPUT_MODE: mode }, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', killed = false;
      child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
      child.stdin.end(); const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 5000);
      const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
      clearTimeout(timer); expect(killed).toBe(false); expect(exit).toEqual({ code: 1, signal: null });
      expect(stdout).toBe(''); expect(stderr).toBe('Detuned MCP bridge failed to start or close safely.\n');
      expect(stderr.includes(privateMarker)).toBe(false); expect(stderr.includes(f.owned)).toBe(false); expect(f.requests).toHaveLength(0);
    }
  } finally { await f.close(); }
}, 30000);
