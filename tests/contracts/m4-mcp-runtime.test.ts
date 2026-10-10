import { describe, expect, it, vi } from 'vitest';
import { PassThrough, Writable } from 'node:stream';
import { createMcpBridge } from '../../packages/mcp/src/index.js';
import { bridgeFailure, bridgeSuccess } from '../../packages/mcp/src/bridge-results.js';
import { DetunedError, ErrorCode } from '@detuned/protocol';

const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => resolve = r); return { promise, resolve }; };
function streams() {
  const input = new PassThrough(); const lines: any[] = []; const waiters: Array<(line: any) => void> = [];
  const output = new Writable({ write(chunk, _encoding, done) { const value = JSON.parse(String(chunk)); lines.push(value); waiters.shift()?.(value); done(); } });
  const next = () => new Promise<any>(resolve => waiters.push(resolve));
  return { input, output, lines, next, send(id: number, method: string, params?: object) { input.write(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }) + '\n'); } };
}
const params = { name: 'forum_poll', arguments: { space_id: 'space', consumer_id: 'consumer', wait_ms: 25000 } };

describe('M4.2-A owned MCP stdio runtime', () => {
  it('factory import/construction do not call HTTP; real SDK startup/discovery and unknown tool remain zero calls', async () => {
    const io = streams(); const callTool = vi.fn(); const bridge = createMcpBridge({ client: { callTool }, input: io.input, output: io.output });
    expect(callTool).not.toHaveBeenCalled(); expect(io.input.listenerCount('data')).toBe(0);
    try {
      await bridge.start(); const initialized = io.next(); io.send(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'fixture', version: '1' } });
      expect((await initialized).result.protocolVersion).toBe('2025-11-25');
      const listed = io.next(); io.send(2, 'tools/list'); expect((await listed).result.tools).toHaveLength(9);
      const bad = io.next(); io.send(3, 'tools/call', { name: 'PRIVATE_UNKNOWN', arguments: { secret: 'PRIVATE' } });
      const result = (await bad).result; expect(result.isError).toBe(true); expect(result.structuredContent.error.code).toBe('VALIDATION_ERROR'); expect(JSON.stringify(result)).not.toContain('PRIVATE');
      expect(callTool).not.toHaveBeenCalled();
    } finally { await bridge.close(); expect(io.input.destroyed).toBe(false); expect(io.output.destroyed).toBe(false); }
  });

  it('preserves structured result and exact pretty text through 16KiB multibyte boundary, with safe complete error summary', () => {
    const fitting = 'é'.repeat(8191); const full = bridgeSuccess(fitting); expect(Buffer.byteLength(full.content[0]!.type === 'text' ? full.content[0]!.text : '')).toBe(16384); expect(full.structuredContent).toEqual({ result: fitting });
    const over = bridgeSuccess(fitting + 'é'); expect(JSON.parse((over.content[0] as any).text)).toMatchObject({ truncated: true, full_result: 'structuredContent.result' }); expect(over.structuredContent).toEqual({ result: fitting + 'é' });
    const error = new DetunedError(ErrorCode.REVISION_CONFLICT, 'public conflict', 409, false, { research: 'é'.repeat(9000) });
    const result = bridgeFailure(error); expect(result.isError).toBe(true); expect(result.structuredContent).toEqual({ error: { code: 'REVISION_CONFLICT', message: 'public conflict', details: error.details } }); expect(JSON.parse((result.content[0] as any).text)).toMatchObject({ error: { code: 'REVISION_CONFLICT' }, full_error: 'structuredContent.error' }); expect(JSON.stringify(bridgeFailure(new Error('PRIVATE cause')))).not.toContain('PRIVATE');
  });

  it('EOF aborts all owned calls and waits their whole finally; repeat close has one promise and stops new calls', async () => {
    const io = streams(); const entered = deferred<void>(), aborted = deferred<void>(), cleanup = deferred<void>(); let finished = false;
    const bridge = createMcpBridge({ input: io.input, output: io.output, client: { async callTool(_name, _args, opts) { entered.resolve(); try { await new Promise<void>((_resolve, reject) => opts!.signal!.addEventListener('abort', () => { aborted.resolve(); reject(new Error('cancelled')); }, { once: true })); } finally { await cleanup.promise; finished = true; } } } });
    await bridge.start(); io.send(1, 'tools/call', params); await entered.promise; io.input.end(); await aborted.promise;
    const closing = bridge.close(); expect(bridge.close()).toBe(closing); let closed = false; void closing.then(() => closed = true);
    await Promise.resolve(); expect(closed).toBe(false); expect(finished).toBe(false);
    cleanup.resolve(); await closing; await bridge.closed; expect(finished).toBe(true); expect(io.lines).toEqual([]); expect(io.output.destroyed).toBe(false);
  });

  it('waits every already started output write callback without destroying caller output', async () => {
    const input = new PassThrough(); const writing = deferred<void>(); let flush!: () => void;
    const output = new Writable({ write(_chunk, _encoding, callback) { flush = () => callback(); writing.resolve(); } });
    const bridge = createMcpBridge({ client: { callTool: vi.fn() }, input, output });
    await bridge.start(); input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n'); await writing.promise;
    const closing = bridge.close(); let closed = false; void closing.then(() => closed = true); await Promise.resolve(); expect(closed).toBe(false);
    flush(); await closing; expect(output.destroyed).toBe(false); expect(input.destroyed).toBe(false);
  });

  it('deadline rejects uncooperative handler or unconfirmed output, preserving the single close result', async () => {
    vi.useFakeTimers();
    try {
      const io = streams(); const entered = deferred<void>(), release = deferred<void>();
      const bridge = createMcpBridge({ input: io.input, output: io.output, shutdownTimeoutMs: 20, client: { async callTool() { entered.resolve(); await release.promise; return {}; } } });
      await bridge.start(); io.send(1, 'tools/call', params); await entered.promise;
      const closing = bridge.close(); const failed = expect(closing).rejects.toMatchObject({ name: 'BridgeShutdownError' }); const terminal = expect(bridge.closed).rejects.toMatchObject({ name: 'BridgeShutdownError' });
      await vi.advanceTimersByTimeAsync(20); await failed; await terminal; expect(bridge.close()).toBe(closing); release.resolve();
      const input = new PassThrough(); let flush!: (error?: Error) => void; const writing = deferred<void>();
      const output = new Writable({ write(_chunk, _enc, callback) { flush = error => callback(error); writing.resolve(); } });
      const blocked = createMcpBridge({ input, output, client: { callTool: vi.fn() }, shutdownTimeoutMs: 20 });
      await blocked.start(); input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n'); await writing.promise;
      const close = blocked.close(); const failedFlush = expect(close).rejects.toMatchObject({ name: 'BridgeShutdownError' }); await vi.advanceTimersByTimeAsync(20); await failedFlush; expect(output.destroyed).toBe(false); expect(output.listenerCount('error')).toBe(1);
      const observed = new Promise<void>(resolve => output.once('error', () => resolve()));
      flush(new Error('PRIVATE late write failure')); await observed; await Promise.resolve();
      expect(output.listenerCount('error')).toBe(0); expect(output.listenerCount('close')).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it('output error enters the same failed lifecycle while observing sends and closing listeners', async () => {
    const input = new PassThrough(); const writing = deferred<void>(); let complete!: () => void;
    const output = new Writable({ write(_chunk, _enc, callback) { complete = () => callback(new Error('PRIVATE output fault')); writing.resolve(); } });
    const bridge = createMcpBridge({ input, output, client: { callTool: vi.fn() } }); await bridge.start();
    const failed = expect(bridge.closed).rejects.toMatchObject({ name: 'BridgeShutdownError' });
    for (let id = 1; id <= 16; id++) input.write(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/list' }) + '\n');
    await writing.promise; await Promise.resolve(); await Promise.resolve(); expect(output.listenerCount('error')).toBe(1); complete(); await failed;
    expect(output.listenerCount('error')).toBe(0); expect(output.listenerCount('close')).toBe(0);
    expect(input.listenerCount('data')).toBe(0); expect(input.listenerCount('end')).toBe(0);
  });
});
