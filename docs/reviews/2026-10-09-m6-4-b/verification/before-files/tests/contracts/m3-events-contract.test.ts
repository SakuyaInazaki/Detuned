import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient, UserAbortError, TimeoutError } from '@detuned/client';

const empty = { batch_id: null, events: [], next_cursor: null, has_more: false };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
async function until(check: () => boolean, ms = 1500) { const end = performance.now() + ms; while (!check() && performance.now() < end) await pause(10); expect(check()).toBe(true); }

describe('M3.1 event HTTP and adapter cancellation contracts', () => {
  let db: Database.Database, storage: SqliteStorage, app: ReturnType<typeof buildApp>, token: string, sid: string, cid: string;
  let polled: { request: IncomingMessage; response: ServerResponse }[];
  const headers = () => ({ authorization: `Bearer ${token}` });
  const path = () => `/api/v1/spaces/${sid}/consumers/${cid}/poll`;
  beforeEach(async () => {
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!; storage = new SqliteStorage(db); app = buildApp({ storage }); polled = []; app.addHook('onRequest', async (req, reply) => { if (req.url.endsWith('/poll')) polled.push({ request: req.raw, response: reply.raw }); }); await app.ready();
    const space = await app.inject({ method: 'POST', url: '/api/v1/spaces', headers: { ...headers(), 'idempotency-key': 'space' }, payload: { slug: 'm3-events', objective: 'events', rules: [] } });
    expect(space.statusCode).toBe(201); sid = space.json().data.space.id;
    const subscribed = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/subscriptions`, headers: headers(), payload: { consumer_key: 'm3-consumer', start: 'now' } });
    expect(subscribed.statusCode).toBe(201); cid = subscribed.json().data.consumer.id;
  });
  afterEach(async () => { vi.restoreAllMocks(); await app?.close(); db?.close(); });
  function waiting() {
    const started = deferred<AbortSignal>(); let aborted = false;
    (app as any).eventService.pollWithWait = (_a: unknown, _s: unknown, _c: unknown, _r: unknown, { signal }: { signal: AbortSignal }) => {
      started.resolve(signal);
      return new Promise((_resolve, reject) => {
        const stop = () => { aborted = true; reject(new DOMException('Cancelled', 'AbortError')); };
        if (signal.aborted) stop(); else signal.addEventListener('abort', stop, { once: true });
      });
    };
    return { started, aborted: () => aborted };
  }
  async function client(timeoutMs = 2000) { const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 }); return new DetunedClient({ baseUrl, token, timeoutMs, maxRetries: 0 }); }

  it('E01: legal positive wait actually waits at an empty consumer without creating or acknowledging a batch', async () => {
    const before = storage.findConsumerById(cid); const start = performance.now();
    const response = await app.inject({ method: 'POST', url: path(), headers: headers(), payload: { wait_ms: 120 } });
    expect(response.statusCode, response.payload).toBe(200); expect(response.json().data).toEqual(empty);
    expect(performance.now() - start).toBeGreaterThanOrEqual(100); expect(storage.findConsumerById(cid)).toEqual(before);
  });
  it('E02: existing strict poll schema defaults and bounds reach the async service unchanged', async () => {
    const call = vi.fn(async (..._args: unknown[]) => empty); (app as any).eventService.pollWithWait = call;
    const response = await app.inject({ method: 'POST', url: path(), headers: headers(), payload: {} });
    expect(response.statusCode).toBe(200); expect(call).toHaveBeenCalledOnce(); expect(call.mock.calls[0]?.[3]).toEqual({ limit: 20, wait_ms: 0 });
    for (const payload of [{ wait_ms: -1 }, { wait_ms: 25001 }, { wait_ms: '1' }, { wait_ms: null }, { limit: 101 }, { unknown: 1 }]) expect((await app.inject({ method: 'POST', url: path(), headers: headers(), payload })).statusCode).toBe(400);
    expect(call).toHaveBeenCalledOnce();
  });
  it('E03: a completed request body is not cancellation, but client user abort cancels the live HTTP wait', async () => {
    const pending = waiting(); const c = await client(); const abort = new AbortController();
    const request = c.poll(sid, cid, { wait_ms: 25000 }, { signal: abort.signal }); const rejection = expect(request).rejects.toBeInstanceOf(UserAbortError);
    const signal = await pending.started.promise; await pause(30); expect(signal.aborted).toBe(false);
    abort.abort(); await rejection; await until(pending.aborted); expect(storage.findConsumerById(cid)?.active_batch_id).toBeNull();
    for (const p of polled) { expect(p.request.listeners('aborted').some(fn => fn.name === 'onDisconnect')).toBe(false); expect(p.response.listeners('close').some(fn => fn.name === 'onResponseClose')).toBe(false); }
  });
  it('E04: client timeout cancels the same server wait and does not retry or acknowledge', async () => {
    const pending = waiting(); const c = await client(80);
    await expect(c.poll(sid, cid, { wait_ms: 25000 })).rejects.toBeInstanceOf(TimeoutError);
    await until(pending.aborted); expect(storage.findConsumerById(cid)?.ack_seq).toBe(storage.getLatestEventSeq(sid));
  });
  it('E05: app shutdown aborts active waits before socket drain and returns retryable 503', async () => {
    const pending = waiting(); const c = await client(); const request = c.poll(sid, cid, { wait_ms: 25000 });
    const result = request.catch(error => error); await pending.started.promise;
    await app.close(); const error = await result;
    expect(error).toMatchObject({ statusCode: 503, code: 'TEMPORARILY_UNAVAILABLE', retryable: true }); expect(pending.aborted()).toBe(true);
  });
  it('E06: lost HTTP delivery preserves the actual persisted batch for redelivery and explicit ack only', async () => {
    const event = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/threads`, headers: { ...headers(), 'idempotency-key': 'event' }, payload: { title: 'event' } }); expect(event.statusCode).toBe(201);
    const service = (app as any).eventService;
    const original = service.pollWithWait.bind(service); const committed = deferred<any>();
    service.pollWithWait = async (...args: any[]) => {
      const batch = await original(...args); committed.resolve(batch);
      return new Promise((_resolve, reject) => { const signal = args[4].signal as AbortSignal; const stop = () => reject(new DOMException('Delivery cancelled', 'AbortError')); if (signal.aborted) stop(); else signal.addEventListener('abort', stop, { once: true }); });
    };
    const c = await client(); const abort = new AbortController(); const delivery = c.poll(sid, cid, { wait_ms: 25000 }, { signal: abort.signal }); const cancelled = expect(delivery).rejects.toBeInstanceOf(UserAbortError);
    const batch = await committed.promise; expect(batch.events).toHaveLength(1); abort.abort(); await cancelled;
    await until(() => polled[0]?.response.destroyed === true); service.pollWithWait = original;
    const before = storage.findConsumerById(cid)!; expect(before.active_batch_id).toBe(batch.batch_id);
    const retry = await app.inject({ method: 'POST', url: path(), headers: headers(), payload: { wait_ms: 25000 } }); expect(retry.json().data.batch_id).toBe(batch.batch_id); expect(retry.json().data.events).toEqual(batch.events); expect(storage.findConsumerById(cid)?.ack_seq).toBe(before.ack_seq);
    const ack = await app.inject({ method: 'POST', url: `/api/v1/spaces/${sid}/consumers/${cid}/ack`, headers: headers(), payload: { batch_id: batch.batch_id, next_cursor: retry.json().data.next_cursor } }); expect(ack.statusCode).toBe(200); expect(ack.json().data.confirmed).toBe(true);
  });
  it('E07: real MCP stdio cancellation propagates through SDK extra.signal to the HTTP fetch', async () => {
    const started = deferred<void>(); let disconnected = false, ackRequests = 0;
    const server = createServer((req, reply) => {
      if (req.url?.endsWith('/ack')) ackRequests++;
      req.resume(); req.on('end', () => { started.resolve(); }); reply.on('close', () => { if (!reply.writableFinished) disconnected = true; });
    });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); const address = server.address() as { port: number };
    const transport = new StdioClientTransport({ command: process.execPath, args: ['packages/mcp/dist/index.js'], env: { PATH: process.env.PATH ?? '', DETUNED_BASE_URL: `http://127.0.0.1:${address.port}`, DETUNED_TOKEN: 'isolated-test-only' }, stderr: 'pipe' });
    const mcp = new Client({ name: 'm3-contract', version: '1' });
    try {
      await mcp.connect(transport); expect((await mcp.listTools()).tools).toHaveLength(8);
      const abort = new AbortController(); const call = mcp.callTool({ name: 'forum_poll', arguments: { space_id: 'test-space', consumer_id: 'test-consumer', wait_ms: 25000 } }, undefined, { signal: abort.signal });
      const failed = call.catch(error => error); await started.promise; abort.abort(); await failed;
      await until(() => disconnected); expect(ackRequests).toBe(0);
    } finally { await mcp.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  }, 10000);
});
