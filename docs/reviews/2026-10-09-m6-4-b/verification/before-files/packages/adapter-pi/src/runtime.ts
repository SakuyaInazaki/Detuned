import { DetunedClient, createRuntimeSessionBinding, ClientProtocolError, ClientTransportError, TimeoutError, UserAbortError } from '@detuned/client';
import { resolveLocalToken } from '@detuned/client/node';
import { DetunedError } from '@detuned/protocol';

export function safePiError(error: unknown): Error {
  if (error instanceof DetunedError) return error;
  if (error instanceof ClientProtocolError) return new ClientProtocolError('Service response failed protocol validation.');
  if (error instanceof ClientTransportError) return new ClientTransportError('Transport request failed.', { code: error.code === 'ABORT_ERROR' ? 'ABORT_ERROR' : 'TRANSPORT_ERROR', retryable: error.retryable });
  if (error instanceof TimeoutError) return new TimeoutError('Request timed out.');
  if (error instanceof UserAbortError) return new UserAbortError('Operation was cancelled.');
  return new Error('Forum operation failed.');
}
export function piResult(result: unknown) {
  const full = JSON.stringify(result, null, 2);
  const text = new TextEncoder().encode(full).byteLength <= 16384 ? full : JSON.stringify({ truncated: true, full_result: 'details', text_limit_bytes: 16384, message: 'The complete result is retained in host details; it is not automatically available to the model.', next_step: 'Retry with a smaller result using the advertised tool budget or pagination options, or read a specific object with an existing tool.' });
  return { content: [{ type: 'text' as const, text }], details: result };
}
type Client = Pick<DetunedClient, 'getCapabilities' | 'getMe' | 'createSession' | 'callTool'>;
export interface PiRuntimeOptions {
  snapshot(): { baseUrl: string; environmentToken?: string; environmentTokenFile?: string };
  createClient?(options: { baseUrl: string; token?: string }): Client;
  shutdownTimeoutMs?: number;
}
interface Generation {
  closing: boolean;
  controllers: Set<AbortController>;
  calls: Set<Promise<unknown>>;
  client: () => Promise<Client>;
  binding?: ReturnType<typeof createRuntimeSessionBinding>;
  close?: Promise<void>;
}
/** Activation-local state. It never reads ambient configuration itself. */
export function createPiRuntime(options: PiRuntimeOptions) {
  const budget = options.shutdownTimeoutMs ?? 10000;
  if (!Number.isSafeInteger(budget) || budget < 1 || budget > 120000) throw new Error('Invalid shutdown budget.');
  function generation(): Generation {
    const config = options.snapshot();
    let prepared: Promise<Client> | undefined;
    const current: Generation = { closing: false, controllers: new Set(), calls: new Set(), client: () => {
      if (!prepared) {
        prepared = Promise.resolve().then(() => {
          if (current.closing) throw new UserAbortError();
          const token = resolveLocalToken(config);
          const client = options.createClient?.({ baseUrl: config.baseUrl, token }) ?? new DetunedClient({ baseUrl: config.baseUrl, token });
          current.binding = createRuntimeSessionBinding({ client, clientName: 'detuned-pi', clientVersion: '0.1.0' });
          return client;
        });
        void prepared.catch(() => {});
      }
      return prepared;
    } };
    return current;
  }
  let current = generation();
  function check(item: Generation, signal: AbortSignal) { if (item.closing || signal.aborted) throw new UserAbortError(); }
  function run<T>(signal: AbortSignal | undefined, action: (client: Client, item: Generation, own: AbortSignal) => Promise<T>): Promise<T> {
    const item = current;
    if (item.closing || signal?.aborted) return Promise.reject(new UserAbortError('Operation was cancelled.'));
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    item.controllers.add(controller);
    const promise = Promise.resolve().then(async () => {
      check(item, controller.signal);
      const client = await item.client(); check(item, controller.signal);
      const result = await action(client, item, controller.signal); check(item, controller.signal);
      return result;
    }).catch(error => { throw safePiError(error); }).finally(() => {
      signal?.removeEventListener('abort', abort); item.controllers.delete(controller); item.calls.delete(promise);
    });
    item.calls.add(promise); void promise.catch(() => {});
    return promise;
  }
  function close(item = current): Promise<void> {
    if (item.close) return item.close;
    item.closing = true;
    for (const controller of item.controllers) controller.abort();
    item.binding?.beginClosing();
    const idle = Promise.allSettled([...item.calls]).then(async () => { await item.binding?.waitForIdle(); });
    item.close = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Forum shutdown could not confirm resource cleanup.')), budget);
      idle.then(() => { clearTimeout(timer); resolve(); }, () => { clearTimeout(timer); reject(new Error('Forum shutdown could not confirm resource cleanup.')); });
    });
    void item.close.catch(() => {});
    return item.close;
  }
  return {
    tool(name: string, args: Record<string, unknown>, signal?: AbortSignal) {
      if (typeof args.space_id !== 'string' || !args.space_id) return Promise.reject(new Error('Forum tool requires a space.'));
      return run(signal, async (client, item, own) => {
        await item.binding!.prepare(args.space_id as string, own); check(item, own);
        return piResult(await client.callTool(name, args, { signal: own }));
      });
    },
    me() { return run(undefined, (client, _item, signal) => client.getMe({ signal })); },
    capabilities() { return run(undefined, (client, _item, signal) => client.getCapabilities({ signal })); },
    close: () => close(),
    async start() { await close(); current = generation(); },
  };
}
