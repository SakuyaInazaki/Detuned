import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetunedClient } from '@detuned/client';
const client = (options = {}) => new DetunedClient({ baseUrl: 'https://forum.test', maxRetries: 3, ...options });
const body = { client_name: 'fixture', client_version: '1' };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('M4.1-D session and event client contracts', () => {
  it('session is single attempt on transport, body and retryable HTTP errors while retaining the envelope and encoded path', async () => {
    vi.useFakeTimers();
    const failures = [
      () => { throw Object.assign(new Error('fixture reset'), { code: 'ECONNRESET' }); },
      () => new Response(new ReadableStream({ start(c) { c.error(Object.assign(new Error('fixture reset'), { code: 'ECONNRESET' })); } })),
      () => new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'limited', retryable: true } }), { status: 429, headers: { 'retry-after': '0' } }),
    ];
    for (const fail of failures) {
      const fetch = vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe('https://forum.test/api/v1/spaces/s%20%2F%3F/sessions');
        expect(init.method).toBe('POST'); expect(JSON.parse(String(init.body))).toEqual(body);
        expect((init.headers as any)['Idempotency-Key']).toBeUndefined(); return fail();
      }); vi.stubGlobal('fetch', fetch);
      const operation = client().createSession('s /?', body); const expected = expect(operation).rejects.toBeInstanceOf(Error);
      await vi.runAllTimersAsync(); await expected; expect(fetch).toHaveBeenCalledTimes(1);
    }
    const session = { id: 'session', actor_id: 'actor', space_id: 'space', ...body, harness_session_id: null, metadata: {}, created_at: '2026-10-08T00:00:00Z' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'fixture', data: session, meta: { fixture: true } }))));
    expect(await client().createSession('space', body)).toEqual({ data: session, meta: { fixture: true } });
  });

  it('session timeout/abort does not retry and old poll still retries, with consumer delete preserving its typed envelope', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true })));
    vi.stubGlobal('fetch', fetch);
    const timed = client({ timeoutMs: 50 }).createSession('space', body); const timeoutExpected = expect(timed).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(50); await timeoutExpected; expect(fetch).toHaveBeenCalledTimes(1);
    const abort = new AbortController(); const cancelled = client().createSession('space', body, { signal: abort.signal }); const cancelledExpected = expect(cancelled).rejects.toMatchObject({ name: 'UserAbortError' });
    abort.abort(); await cancelledExpected; expect(fetch).toHaveBeenCalledTimes(2);
    let calls = 0;
    const pollFetch = vi.fn(async () => ++calls === 1 ? new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'limited', retryable: true } }), { status: 429, headers: { 'retry-after': '0' } }) : new Response(JSON.stringify({ api_version: '1', request_id: 'fixture', data: { events: [] } })));
    vi.stubGlobal('fetch', pollFetch);
    const poll = client().poll('space', 'consumer', { wait_ms: 0 }); const pollExpected = expect(poll).resolves.toEqual({ data: { events: [] }, meta: undefined }); await vi.runAllTimersAsync(); await pollExpected; expect(pollFetch).toHaveBeenCalledTimes(2);
    const deletion = vi.fn(async (url: string, init: RequestInit) => { expect(url).toBe('https://forum.test/api/v1/spaces/s%2F/consumers/c%2F'); expect(init.method).toBe('DELETE'); expect(init.body).toBeUndefined(); return new Response(JSON.stringify({ api_version: '1', request_id: 'fixture', data: { deactivated: true } })); });
    vi.stubGlobal('fetch', deletion); expect(await client().deactivateConsumer('s/', 'c/')).toEqual({ data: { deactivated: true }, meta: undefined });
  });
});
