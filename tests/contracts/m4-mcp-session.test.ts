import { describe, expect, it, vi } from 'vitest';
import { PassThrough, Writable } from 'node:stream';
import { createMcpBridge } from '../../packages/mcp/src/index.js';
import { createSessionBinding, type McpSessionBinding } from '../../packages/mcp/src/session-binding.js';

const gate = <T = void>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => resolve = r); return { promise, resolve }; };
const time = '2026-10-08T00:00:00.000Z';
const me = { actor: { id: 'actor', kind: 'agent' as const, display_name: 'Fixture', created_at: time, disabled_at: null }, capabilities: ['read' as const], allowed_space_ids: ['*'], visible_spaces: [] };
const session = (space: string) => ({ id: 'ses-' + space, actor_id: 'actor', space_id: space, client_name: 'fixture', client_version: '1', harness_session_id: null, metadata: {}, created_at: time });
function setup(overrides: Partial<McpSessionBinding['client']> = {}) {
  const client = { getCapabilities: vi.fn(async () => ({ data: { api_version: '1' } })), getMe: vi.fn(async () => ({ data: me })), createSession: vi.fn(async (space: string) => ({ data: session(space) })), ...overrides };
  return { client, config: { client, clientName: 'fixture', clientVersion: '1' } as McpSessionBinding };
}
function io() {
  const input = new PassThrough(); const waiters = new Map<number, (value: any) => void>();
  const output = new Writable({ write(chunk, _enc, done) { const line = JSON.parse(String(chunk)); waiters.get(line.id)?.(line); done(); } });
  const request = (id: number, method: string, params?: object) => { const result = new Promise<any>(resolve => waiters.set(id, resolve)); input.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); return result; };
  return { input, output, request };
}
const poll = (space = 'space') => ({ name: 'forum_poll', arguments: { space_id: space, consumer_id: 'consumer', wait_ms: 0 } });

describe('M4.2-B lazy MCP diagnostic sessions', () => {
  it('is lazy through SDK discovery and invalid calls; valid calls share initialization/session and isolate spaces', async () => {
    const { client, config } = setup(); const stream = io(); const callTool = vi.fn(async (_name, args) => args);
    const bridge = createMcpBridge({ client: { callTool }, sessionBinding: config, ...stream });
    expect(client.getCapabilities).not.toHaveBeenCalled(); await bridge.start();
    try {
      await stream.request(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'fixture', version: '1' } });
      await stream.request(2, 'tools/list');
      expect((await stream.request(3, 'tools/call', { name: 'forum_poll', arguments: { ...poll().arguments, PRIVATE: 'secret' } })).result.structuredContent.error.code).toBe('VALIDATION_ERROR');
      expect(client.getCapabilities).not.toHaveBeenCalled();
      const [a, b] = await Promise.all([stream.request(4, 'tools/call', poll()), stream.request(5, 'tools/call', poll())]);
      expect(a.result.isError).toBeUndefined(); expect(b.result.isError).toBeUndefined();
      await stream.request(6, 'tools/call', poll('other'));
      expect(client.getCapabilities).toHaveBeenCalledTimes(1); expect(client.getMe).toHaveBeenCalledTimes(1); expect(client.createSession).toHaveBeenCalledTimes(2);
      expect(callTool.mock.calls.every(([, args]) => !('session_id' in args))).toBe(true);
    } finally { await bridge.close(); }
    const plain = io(); const legacy = createMcpBridge({ client: { callTool }, ...plain }); await legacy.start(); await plain.request(1, 'tools/call', poll()); await legacy.close(); expect(client.createSession).toHaveBeenCalledTimes(2);
  });

  it('one cancelled waiter leaves shared work alive; full global cancellation can retry after true cleanup', async () => {
    const entered = gate(), release = gate(); let shared!: AbortSignal;
    const first = setup({ getCapabilities: vi.fn(async opts => { shared = opts!.signal!; entered.resolve(); await release.promise; return { data: { api_version: '1' } }; }) });
    const binding = createSessionBinding(first.config); const a = new AbortController(), b = new AbortController();
    const one = binding.prepare('space', a.signal); const cancelled = expect(one).rejects.toMatchObject({ name: 'UserAbortError' });
    const two = binding.prepare('space', b.signal); await entered.promise; a.abort(); await cancelled; expect(shared.aborted).toBe(false); release.resolve(); await two;
    expect(first.client.createSession).toHaveBeenCalledTimes(1);
    const cleanup = gate(), aborted = gate(); let attempts = 0;
    const second = setup({ getCapabilities: vi.fn(async opts => { if (++attempts === 1) { await new Promise<void>((_resolve, reject) => opts!.signal!.addEventListener('abort', () => { aborted.resolve(); reject(new Error('private')); }, { once: true })); } return { data: { api_version: '1' } }; }) });
    const original = second.client.getCapabilities;
    second.client.getCapabilities = vi.fn(async (opts?: { signal?: AbortSignal }) => { try { return await original(opts); } finally { if (attempts === 1) await cleanup.promise; } });
    const retry = createSessionBinding(second.config); const controller = new AbortController(); const pending = retry.prepare('space', controller.signal); const rejection = expect(pending).rejects.toMatchObject({ name: 'UserAbortError' });
    await Promise.resolve(); await Promise.resolve(); controller.abort(); await aborted.promise; await rejection;
    await expect(retry.prepare('space', new AbortController().signal)).rejects.toMatchObject({ name: 'UserAbortError' }); expect(attempts).toBe(1);
    cleanup.resolve(); await retry.waitForIdle(); await retry.prepare('space', new AbortController().signal); expect(attempts).toBe(2); expect(second.client.createSession).toHaveBeenCalledTimes(1);
  });

  it('started session cancellation/response loss is terminal and late success cannot dispatch', async () => {
    const entered = gate(), release = gate(); let own!: AbortSignal;
    const fixture = setup({ createSession: vi.fn(async (space, _body, opts) => { own = opts!.signal!; entered.resolve(); await release.promise; return { data: session(space) }; }) });
    const binding = createSessionBinding(fixture.config); const cancel = new AbortController(); const first = binding.prepare('space', cancel.signal); const rejection = expect(first).rejects.toMatchObject({ name: 'UserAbortError' });
    await entered.promise; cancel.abort(); await rejection; expect(own.aborted).toBe(true); release.resolve(); await binding.waitForIdle();
    await expect(binding.prepare('space', new AbortController().signal)).rejects.toMatchObject({ name: 'UserAbortError' }); expect(fixture.client.createSession).toHaveBeenCalledTimes(1);
    const loss = setup({ createSession: vi.fn(async () => { throw new Error('PRIVATE response lost after commit'); }) }); const failed = createSessionBinding(loss.config);
    await expect(failed.prepare('space', new AbortController().signal)).rejects.toThrow(); await expect(failed.prepare('space', new AbortController().signal)).rejects.toThrow(); expect(loss.client.createSession).toHaveBeenCalledTimes(1);
    const stream = io(); const ready = gate(), finish = gate(); const callTool = vi.fn(); const late = setup({ createSession: vi.fn(async space => { ready.resolve(); await finish.promise; return { data: session(space) }; }) });
    const bridge = createMcpBridge({ ...stream, client: { callTool }, sessionBinding: late.config }); await bridge.start(); void stream.request(1, 'tools/call', poll()); await ready.promise; const closing = bridge.close(); finish.resolve(); await closing; expect(callTool).not.toHaveBeenCalled();
  });

  it('rejects incompatible capabilities and forged session actor/space without business calls', async () => {
    for (const override of [ { getCapabilities: vi.fn(async () => ({ data: { api_version: 'future' } })) }, { createSession: vi.fn(async space => ({ data: { ...session(space), actor_id: 'other' } })) }, { createSession: vi.fn(async space => ({ data: { ...session(space), space_id: 'other' } })) } ]) {
      const { config } = setup(override); const stream = io(); const callTool = vi.fn(); const bridge = createMcpBridge({ ...stream, client: { callTool }, sessionBinding: config }); await bridge.start();
      try { const result = (await stream.request(1, 'tools/call', poll())).result; expect(result.isError).toBe(true); expect(result.structuredContent.error.message).toBe('Service response failed protocol validation.'); expect(callTool).not.toHaveBeenCalled(); } finally { await bridge.close(); }
    }
  });

  it('close waits global and session finally; uncooperative initialization hits the shared deadline', async () => {
    for (const stage of ['global', 'session']) {
      const entered = gate(), aborted = gate(), cleanup = gate(); let finished = false;
      const blocked = async (signal: AbortSignal) => { entered.resolve(); try { await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => { aborted.resolve(); reject(new Error('cancel')); }, { once: true })); } finally { await cleanup.promise; finished = true; } };
      const fixture = setup(stage === 'global' ? { getCapabilities: vi.fn(async opts => { await blocked(opts!.signal!); return { data: { api_version: '1' } }; }) } : { createSession: vi.fn(async (space, _body, opts) => { await blocked(opts!.signal!); return { data: session(space) }; }) });
      const stream = io(); const callTool = vi.fn(); const bridge = createMcpBridge({ ...stream, client: { callTool }, sessionBinding: fixture.config }); await bridge.start(); void stream.request(1, 'tools/call', poll()); await entered.promise; const closing = bridge.close(); await aborted.promise;
      let closed = false; void closing.then(() => closed = true); await Promise.resolve(); expect(closed).toBe(false); cleanup.resolve(); await closing; expect(finished).toBe(true); expect(callTool).not.toHaveBeenCalled();
    }
    vi.useFakeTimers(); try {
      const entered = gate(), release = gate(); const fixture = setup({ getCapabilities: vi.fn(async () => { entered.resolve(); await release.promise; return { data: { api_version: '1' } }; }) });
      const stream = io(); const bridge = createMcpBridge({ ...stream, client: { callTool: vi.fn() }, sessionBinding: fixture.config, shutdownTimeoutMs: 20 }); await bridge.start(); void stream.request(1, 'tools/call', poll()); await entered.promise;
      const closing = bridge.close(); const reject = expect(closing).rejects.toMatchObject({ name: 'BridgeShutdownError' }); await vi.advanceTimersByTimeAsync(20); await reject; expect(bridge.close()).toBe(closing); release.resolve();
    } finally { vi.useRealTimers(); }
  });
});
