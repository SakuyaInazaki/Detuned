import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request as httpRequest } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';

const marker = 'PRIVATE_RUNTIME_RESPONSE_MARKER';
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected private fixture object.');
  return value as Record<string, unknown>;
}
type Target = 'me' | 'session';
type Mutation = { name: string; target: Target; change(data: Record<string, unknown>): void };
const mutations: Mutation[] = [
  { name: 'Me nested shape', target: 'me', change(data) { object(data.actor).kind = marker; } },
  { name: 'Me nested extra field', target: 'me', change(data) { object(data.actor).extra = marker; } },
  { name: 'Me created_at invalid calendar date', target: 'me', change(data) { object(data.actor).created_at = '2026-02-30T00:00:00Z'; } },
  { name: 'Me disabled_at invalid date-time', target: 'me', change(data) { object(data.actor).disabled_at = marker; } },
  { name: 'Session wrong field type', target: 'session', change(data) { data.client_name = 42; } },
  { name: 'Session extra field', target: 'session', change(data) { data.extra = marker; } },
  { name: 'Session invalid calendar date', target: 'session', change(data) { data.created_at = '2026-02-30T00:00:00Z'; } },
  { name: 'Session metadata wrong shape', target: 'session', change(data) { data.metadata = [marker]; } },
];
async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'detuned-m44-native-'));
  const db = new Database(join(directory, 'private.sqlite'));
  const token = bootstrapDatabase(db).adminToken!;
  const app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Private fixture address unavailable.');
  const url = `http://127.0.0.1:${address.port}`;
  const client = new DetunedClient({ baseUrl: url, token });
  const space = (await client.createSpace({ slug: 'native-response', objective: 'private verification', rules: [] }, 'space')).data.space.id;
  const thread = (await client.createThread(space, { title: 'private verification' }, 'thread')).data.thread.id;
  const rows = (table: 'sessions' | 'posts') => (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
  return { url, token, space, thread, rows, close: async () => { await app.close(); db.close(); rmSync(directory, { recursive: true, force: true }); } };
}
async function gateway(upstream: string, mutation?: Mutation) {
  let enabled = true;
  const counts = { cap: 0, me: 0, session: 0, post: 0, ack: 0, other: 0 };
  let replacements = 0;
  const server = createServer((req, reply) => {
    const path = req.url ?? '/';
    const kind = path.endsWith('/capabilities') ? 'cap' : path.endsWith('/me') ? 'me' : path.endsWith('/sessions') ? 'session' : path.endsWith('/posts') ? 'post' : path.endsWith('/ack') ? 'ack' : 'other';
    counts[kind]++;
    const outgoing = httpRequest(new URL(path, upstream), { method: req.method, headers: req.headers }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        let body = Buffer.concat(chunks);
        const status = response.statusCode ?? 500;
        if (enabled && mutation?.target === kind && status < 400) {
          const parsed: unknown = JSON.parse(body.toString('utf8'));
          mutation.change(object(object(parsed).data));
          body = Buffer.from(JSON.stringify(parsed));
          replacements++;
        }
        reply.writeHead(status, { ...response.headers, 'content-length': String(body.length) });
        reply.end(body);
      });
      response.on('error', () => reply.destroy());
    });
    outgoing.on('error', () => reply.destroy());
    reply.on('close', () => { if (!reply.writableFinished) outgoing.destroy(); });
    req.pipe(outgoing);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Private proxy address unavailable.');
  return { url: `http://127.0.0.1:${address.port}`, counts, replacements: () => replacements, allow: () => { enabled = false; }, close: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}
async function bridge(url: string, token: string) {
  // The child receives only this private fixture's configuration, no user credentials.
  const transport = new StdioClientTransport({ command: process.execPath, args: ['packages/mcp/dist/index.js'], env: { DETUNED_BASE_URL: url, DETUNED_TOKEN: token }, stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', chunk => { stderr += String(chunk); });
  const sdk = new Client({ name: 'private-native-response', version: '1' }, { capabilities: {} });
  await sdk.connect(transport);
  return { sdk, stderr: () => stderr, close: () => sdk.close() };
}
function publish(f: Awaited<ReturnType<typeof fixture>>, key: string) {
  return { name: 'forum_publish', arguments: { space_id: f.space, op: 'post', thread_id: f.thread, kind: 'note', title: 'private verification', summary: 'private', body: 'private', tags: [], structured: {}, request_key: key } };
}
function rejection(value: unknown) {
  const response = object(value);
  expect(response.isError).toBe(true);
  const error = { code: 'TOOL_EXECUTION_ERROR', message: 'Service response failed protocol validation.' };
  expect(response.structuredContent).toEqual({ error });
  const content = response.content;
  expect(Array.isArray(content)).toBe(true);
  expect(JSON.parse(String(object((content as unknown[])[0]).text))).toEqual({ error });
  expect(JSON.stringify(response)).not.toContain(marker);
}

describe('M4.4-A independent native runtime response boundary', () => {
  it('legal real Me/Session responses reach business HTTP and commit one diagnostic session', async () => {
    const f = await fixture(); const g = await gateway(f.url); const b = await bridge(g.url, f.token);
    try {
      expect((await b.sdk.listTools()).tools).toHaveLength(8);
      expect(g.counts).toEqual({ cap: 0, me: 0, session: 0, post: 0, ack: 0, other: 0 });
      const value = await b.sdk.callTool(publish(f, 'valid-control'));
      expect(object(value).isError).not.toBe(true);
      expect(object(object(object(value).structuredContent).result).post).toBeDefined();
      expect(g.counts).toEqual({ cap: 1, me: 1, session: 1, post: 1, ack: 0, other: 0 });
      expect(f.rows('sessions')).toBe(1); expect(f.rows('posts')).toBe(1);
      expect(g.replacements()).toBe(0);
      console.info('Native legal control: HTTP cap=1 me=1 session=1 post=1 ack=0; SQLite sessions=1 posts=1.');
    } finally { await b.close(); expect(b.stderr().includes(f.token)).toBe(false); await g.close(); await f.close(); }
  }, 60000);

  for (const mutation of mutations) it(`rejects ${mutation.name} before business HTTP with actual upstream/DB evidence`, async () => {
    const f = await fixture(); const g = await gateway(f.url, mutation); let b = await bridge(g.url, f.token);
    try {
      rejection(await b.sdk.callTool(publish(f, 'invalid-response')));
      expect(g.replacements()).toBe(1);
      const attemptedSession = mutation.target === 'session' ? 1 : 0;
      expect(g.counts).toEqual({ cap: 1, me: 1, session: attemptedSession, post: 0, ack: 0, other: 0 });
      expect(f.rows('sessions')).toBe(attemptedSession); expect(f.rows('posts')).toBe(0);
      console.info(`Native rejected ${mutation.name}: HTTP cap=1 me=1 session=${attemptedSession} post=0 ack=0; SQLite sessions=${attemptedSession} posts=0; replaced=1.`);
      g.allow();
      if (mutation.target === 'session') {
        const before = { ...g.counts };
        rejection(await b.sdk.callTool(publish(f, 'terminal-response')));
        expect(g.counts).toEqual(before); expect(f.rows('sessions')).toBe(1);
        await b.close(); expect(b.stderr().includes(f.token)).toBe(false); b = await bridge(g.url, f.token);
      }
      // A real successful control for every rejecting proxy establishes that its path works.
      expect(object(await b.sdk.callTool(publish(f, 'recovered-control'))).isError).not.toBe(true);
      expect(g.counts).toEqual({ cap: 2, me: 2, session: attemptedSession + 1, post: 1, ack: 0, other: 0 });
      expect(f.rows('sessions')).toBe(attemptedSession + 1); expect(f.rows('posts')).toBe(1);
      expect(b.stderr()).not.toContain(marker);
    } finally { await b.close(); expect(b.stderr().includes(f.token)).toBe(false); await g.close(); await f.close(); }
  }, 60000);
});
