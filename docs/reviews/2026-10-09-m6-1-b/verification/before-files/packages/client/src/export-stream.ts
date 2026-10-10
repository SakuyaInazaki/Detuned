import { decodeSpaceExport, ExportDecodeError, validateSpaceExportError, type SpaceExportComplete } from '@detuned/protocol';
import { ClientProtocolError, ClientTransportError, UserAbortError, TimeoutError } from './client.js';
import { DetunedError, ErrorCode } from '@detuned/protocol';

export interface SpaceExportOptions {
  sink: (line: Uint8Array) => Promise<void> | void;
  signal?: AbortSignal;
  timeoutMs?: number;
}
/** Sink bytes are provisional until this promise resolves after the terminal line and EOF. No retries. */
export async function streamSpaceExport(baseUrl: string, token: string | undefined, spaceId: string, defaultTimeoutMs: number, options: SpaceExportOptions, cookieSession = false): Promise<SpaceExportComplete> {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || typeof options.sink !== 'function') throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid export timeout or sink.', 400);
  const controller = new AbortController(); let timedOut = false; let userAborted = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectStop: (error: Error) => void = () => {};
  const stopped = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  // Observe stop even if cancellation occurs between two awaited operations.
  void stopped.catch(() => {});
  const onAbort = () => { userAborted = true; controller.abort(); rejectStop(new UserAbortError()); };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); rejectStop(new TimeoutError(`Export timed out after ${timeoutMs}ms`)); }, timeoutMs);
  const wait = <T>(pending: Promise<T>): Promise<T> => Promise.race([pending, stopped]);
  try {
    if (userAborted) throw new UserAbortError();
    const headers: Record<string, string> = { Accept: 'application/x-ndjson' }; if (token && !cookieSession) headers.Authorization = `Bearer ${token}`;
    const response = await wait(fetch(`${baseUrl}/api/v1/spaces/${encodeURIComponent(spaceId)}/export?format=ndjson`, { headers, signal: controller.signal, credentials: cookieSession ? 'same-origin' : undefined }));
    if (!response.ok) {
      const json = await wait(response.json().catch(() => null));
      if (validateSpaceExportError(json)) throw new DetunedError(json.error.code, json.error.message, response.status, false, json.error.details);
      throw new DetunedError(response.status >= 500 ? ErrorCode.TEMPORARILY_UNAVAILABLE : ErrorCode.VALIDATION_ERROR, `HTTP ${response.status} export failed`, response.status, false);
    }
    if (!/^application\/x-ndjson\s*;\s*charset=utf-8$/i.test(response.headers.get('content-type') ?? '') || !response.body) throw new ClientProtocolError('Export response must be UTF-8 NDJSON.');
    reader = response.body.getReader();
    const bodyReader = reader;
    async function* chunks() {
      for (;;) {
        const chunk = await wait(bodyReader.read());
        if (chunk.done) return;
        yield chunk.value;
      }
    }
    const complete = await wait(decodeSpaceExport(chunks(), {
      signal: controller.signal, expectedSpaceId: spaceId,
      onLine: (_line, rawLine) => options.sink(rawLine),
    }));
    if (userAborted) throw new UserAbortError(); if (timedOut) throw new TimeoutError();
    return complete;
  } catch (error) {
    if (userAborted || options.signal?.aborted) throw new UserAbortError();
    if (timedOut) throw new TimeoutError(`Export timed out after ${timeoutMs}ms`);
    if (error instanceof ExportDecodeError) throw new ClientProtocolError(error.message);
    if (error instanceof DetunedError || error instanceof ClientProtocolError || error instanceof ClientTransportError) throw error;
    throw new ClientTransportError('Export transport failed.', { cause: error, retryable: false });
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', onAbort); controller.abort();
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
