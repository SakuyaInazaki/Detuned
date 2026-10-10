import { EXPORT_LIMITS, validateSpaceExportLine, type SpaceExportLine, type SpaceExportHeader, type SpaceExportEnd, type SpaceExportComplete } from './export.js';

export class ExportDecodeError extends Error {
  constructor(message: string) { super(message); this.name = 'ExportDecodeError'; }
}
export interface SpaceExportDecodeOptions {
  onLine?: (line: SpaceExportLine, rawLine: Uint8Array) => void | Promise<void>;
  signal?: AbortSignal;
  expectedSpaceId?: string;
  limits?: Partial<Record<'max_line_bytes' | 'max_total_bytes' | 'max_records', number>>;
}
/** Every callback is provisional. Only complete end plus EOF resolves successfully. */
export async function decodeSpaceExport(chunks: AsyncIterable<Uint8Array>, options: SpaceExportDecodeOptions = {}): Promise<SpaceExportComplete> {
  if (Object.keys(options.limits ?? {}).some(key => !['max_line_bytes', 'max_total_bytes', 'max_records'].includes(key))) throw new ExportDecodeError('Invalid export decoder limits.');
  const limits = { ...EXPORT_LIMITS, ...options.limits };
  for (const key of ['max_line_bytes', 'max_total_bytes', 'max_records'] as const) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > EXPORT_LIMITS[key]) throw new ExportDecodeError('Invalid export decoder limits.');
  }
  const iterator = chunks[Symbol.asyncIterator]();
  let rejectStop: (error: Error) => void = () => {};
  const stopped = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  void stopped.catch(() => {});
  const aborted = () => rejectStop(new DOMException('Export decoding aborted.', 'AbortError'));
  options.signal?.addEventListener('abort', aborted, { once: true });
  if (options.signal?.aborted) aborted();
  const wait = <T>(pending: Promise<T>): Promise<T> => Promise.race([pending, stopped]);
  const buffer = new Uint8Array(limits.max_line_bytes);
  let used = 0, bytes = 0, beforeEnd = 0, count = 0;
  let previous = new Uint8Array(32), header: SpaceExportHeader | undefined, end: SpaceExportEnd | undefined;
  let completed = false;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    if (options.signal?.aborted) throw new DOMException('Export decoding aborted.', 'AbortError');
    for (;;) {
      const chunk = await wait(Promise.resolve().then(() => iterator.next()));
      if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array)) throw new ExportDecodeError('Export input must contain byte chunks.');
      bytes += chunk.value.length;
      if (bytes > limits.max_total_bytes) throw new ExportDecodeError('Export total byte limit exceeded.');
      let offset = 0;
      while (offset < chunk.value.length) {
        if (end) throw new ExportDecodeError('Export contains bytes after its terminal line.');
        const lf = chunk.value.indexOf(10, offset), finish = lf < 0 ? chunk.value.length : lf + 1;
        const length = finish - offset;
        if (used + length > buffer.length) throw new ExportDecodeError('Export line byte limit exceeded.');
        buffer.set(chunk.value.subarray(offset, finish), used); used += length; offset = finish;
        if (lf < 0) continue;
        const rawLine = buffer.slice(0, used); used = 0;
        if (rawLine.length === 1 || rawLine.includes(13)) throw new ExportDecodeError('Invalid export line.');
        let parsed: unknown;
        try { parsed = JSON.parse(decoder.decode(rawLine.subarray(0, -1))); } catch { throw new ExportDecodeError('Invalid JSON or UTF-8 export line.'); }
        if (!validateSpaceExportLine(parsed)) throw new ExportDecodeError('Export line does not match the versioned schema.');
        if (!header) {
          if (parsed.type !== 'header' || (options.expectedSpaceId !== undefined && parsed.source.space_id !== options.expectedSpaceId)) throw new ExportDecodeError('Export header is missing or names another space.');
          header = parsed;
        } else if (parsed.type === 'record') {
          if (parsed.seq !== ++count || count > limits.max_records) throw new ExportDecodeError('Export record sequence or count is invalid.');
        } else if (parsed.type === 'end') {
          const digest = [...previous].map(byte => byte.toString(16).padStart(2, '0')).join('');
          if (parsed.record_count !== count || parsed.bytes_before_end !== beforeEnd || parsed.chain_sha256 !== digest) throw new ExportDecodeError('Export terminal counts or hash do not match.');
          end = parsed;
        } else throw new ExportDecodeError('Export contains a repeated header.');
        if (parsed.type !== 'end') {
          const joined = new Uint8Array(32 + rawLine.length); joined.set(previous); joined.set(rawLine, 32);
          previous = new Uint8Array(await wait(globalThis.crypto.subtle.digest('SHA-256', joined))); beforeEnd += rawLine.length;
        }
        await wait(Promise.resolve().then(() => options.onLine?.(parsed, rawLine)));
      }
    }
    if (used || !header || !end) throw new ExportDecodeError('Export ended without a complete terminal line.');
    if (options.signal?.aborted) throw new DOMException('Export decoding aborted.', 'AbortError');
    completed = true;
    return { header, end, bytes };
  } finally {
    options.signal?.removeEventListener('abort', aborted);
    if (!completed && iterator.return) void Promise.resolve().then(() => iterator.return!()).catch(() => {});
  }
}
