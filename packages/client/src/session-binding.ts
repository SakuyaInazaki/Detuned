import type { DetunedClient } from './client.js';
import { ClientProtocolError, UserAbortError } from './client.js';
import { isMeResponse, isSession, type MeResponse, type Session } from '@detuned/protocol';

function parseMe(data: unknown): MeResponse {
  if (isMeResponse(data)) return data;
  throw new ClientProtocolError('Invalid identity response.');
}
function parseSession(data: unknown): Session {
  if (isSession(data)) return data;
  throw new ClientProtocolError('Invalid session response.');
}

export interface RuntimeSessionBindingOptions {
  client: Pick<DetunedClient, 'getCapabilities' | 'getMe' | 'createSession'>;
  clientName: string;
  clientVersion: string;
}
export interface RuntimeSessionBinding {
  prepare(spaceId: string, signal: AbortSignal): Promise<void>;
  beginClosing(): void;
  waitForIdle(): Promise<void>;
}
interface Flight<T> {
  controller: AbortController;
  promise: Promise<T>;
  waiters: number;
  settled: boolean;
  startedSession: boolean;
}
const EXPECTED_API_VERSION = '1';

/** Runtime-local diagnostic association; it does not add session_id to forum writes. */
export function createRuntimeSessionBinding(config: RuntimeSessionBindingOptions): RuntimeSessionBinding {
  let closing = false;
  let identity: Flight<MeResponse> | undefined;
  const spaces = new Map<string, Flight<Session>>();
  const pending = new Set<Promise<unknown>>();
  const cancelled = () => new UserAbortError();
  function check(signal: AbortSignal): void { if (closing || signal.aborted) throw cancelled(); }
  function flight<T>(run: (item: Flight<T>) => Promise<T>, failed: (item: Flight<T>) => void): Flight<T> {
    const item: Flight<T> = { controller: new AbortController(), promise: undefined!, waiters: 0, settled: false, startedSession: false };
    // A microtask allows the map and pending registration to precede any client call.
    let rejected = false;
    item.promise = Promise.resolve().then(() => run(item)).catch(error => { rejected = true; throw error; }).finally(() => { item.settled = true; pending.delete(item.promise); if (rejected) failed(item); });
    pending.add(item.promise);
    void item.promise.catch(() => {});
    return item;
  }
  function join<T>(item: Flight<T>, signal: AbortSignal): Promise<T> {
    if (closing || signal.aborted || item.controller.signal.aborted) return Promise.reject(cancelled());
    item.waiters++;
    return new Promise<T>((resolve, reject) => {
      let done = false;
      const finish = (error: boolean, value: unknown) => {
        if (done) return;
        done = true; signal.removeEventListener('abort', abort); item.waiters--;
        if (item.waiters === 0 && !item.settled) item.controller.abort();
        if (error) reject(value); else resolve(value as T);
      };
      const abort = () => finish(true, cancelled());
      signal.addEventListener('abort', abort, { once: true });
      item.promise.then(value => { if (closing || signal.aborted || item.controller.signal.aborted) finish(true, cancelled()); else finish(false, value); }, error => finish(true, error));
      if (signal.aborted) abort();
    });
  }
  function getIdentity(signal: AbortSignal): Promise<MeResponse> {
    check(signal);
    if (!identity) {
      identity = flight(async item => {
        const own = item.controller.signal; check(own);
        const capabilities = await config.client.getCapabilities({ signal: own }); check(own);
        if (!capabilities || typeof capabilities.data !== 'object' || capabilities.data === null || capabilities.data.api_version !== EXPECTED_API_VERSION) throw new ClientProtocolError('Unsupported service API response.');
        const response = await config.client.getMe({ signal: own }); check(own);
        return parseMe(response.data);
      }, item => { if (identity === item) identity = undefined; });
    }
    return join(identity, signal);
  }
  async function prepare(spaceId: string, signal: AbortSignal): Promise<void> {
    const me = await getIdentity(signal); check(signal);
    let item = spaces.get(spaceId);
    if (!item) {
      item = flight(async current => {
        const own = current.controller.signal; check(own);
        current.startedSession = true;
        const response = await config.client.createSession(spaceId, { client_name: config.clientName, client_version: config.clientVersion }, { signal: own }); check(own);
        const session = parseSession(response.data);
        if (session.actor_id !== me.actor.id || session.space_id !== spaceId) throw new ClientProtocolError('Session response identity mismatch.');
        return session;
      }, current => { if (!current.startedSession && spaces.get(spaceId) === current) spaces.delete(spaceId); });
      spaces.set(spaceId, item);
    }
    await join(item, signal); check(signal);
  }
  function beginClosing(): void {
    closing = true;
    identity?.controller.abort();
    for (const item of spaces.values()) item.controller.abort();
  }
  async function waitForIdle(): Promise<void> { await Promise.allSettled([...pending]); }
  return { prepare, beginClosing, waitForIdle };
}
