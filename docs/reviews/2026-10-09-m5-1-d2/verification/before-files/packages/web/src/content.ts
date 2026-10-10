import { ClientProtocolError } from '@detuned/client';
import type { PostRevisionContentDocument, PostRevisionContentPage } from '@detuned/protocol';

export const CONTENT_BUDGET = 65_536;
export const CONTENT_ACCUMULATION_LIMIT = 1_048_576;
export type FixedContent = {
  postId: string; revision: number; offset: number; cursor: string | null;
  chunks: string[]; accumulatedBytes: number; rawMode: boolean; currentChunk: string;
  complete: boolean; newer: boolean; document?: PostRevisionContentDocument;
};
export function initialContent(postId: string, revision: number): FixedContent {
  return { postId, revision, offset: 0, cursor: null, chunks: [], accumulatedBytes: 0, rawMode: false, currentChunk: '', complete: false, newer: false };
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function parseDocument(value: unknown): PostRevisionContentDocument {
  if (!record(value) || Object.keys(value).sort().join(',') !== 'body,structured,summary,tags,title'
    || typeof value.title !== 'string' || typeof value.summary !== 'string' || typeof value.body !== 'string'
    || !Array.isArray(value.tags) || !value.tags.every((tag: unknown) => typeof tag === 'string') || !record(value.structured)) {
    throw new ClientProtocolError('Invalid fixed content document.');
  }
  return { title: value.title, summary: value.summary, body: value.body, tags: value.tags, structured: value.structured };
}
export function appendContent(previous: FixedContent, page: PostRevisionContentPage): FixedContent {
  const { data, meta } = page;
  if (!data || !meta || data.ref?.post_id !== previous.postId || data.ref.revision !== previous.revision
    || data.encoding !== 'json' || typeof data.chunk !== 'string' || data.start_byte !== previous.offset
    || !Number.isSafeInteger(data.end_byte) || data.end_byte <= data.start_byte
    || new TextEncoder().encode(data.chunk).byteLength !== data.end_byte - data.start_byte
    || typeof data.complete !== 'boolean' || typeof data.has_newer_revision !== 'boolean'
    || (data.complete ? meta.next_cursor !== null || meta.truncated !== false : typeof meta.next_cursor !== 'string' || !meta.next_cursor || meta.truncated !== true)) {
    throw new ClientProtocolError('Invalid fixed content page.');
  }
  const bytes = new TextEncoder().encode(data.chunk).byteLength;
  const rawMode = previous.rawMode || previous.accumulatedBytes + bytes > CONTENT_ACCUMULATION_LIMIT;
  const chunks = rawMode ? [] : [...previous.chunks, data.chunk];
  let document: PostRevisionContentDocument | undefined;
  if (data.complete && !rawMode) {
    try { document = parseDocument(JSON.parse(chunks.join(''))); }
    catch { throw new ClientProtocolError('Invalid fixed content document.'); }
  }
  return { ...previous, offset: data.end_byte, cursor: meta.next_cursor, chunks,
    accumulatedBytes: rawMode ? 0 : previous.accumulatedBytes + bytes, rawMode,
    currentChunk: data.chunk, complete: data.complete, newer: data.has_newer_revision,
    ...(document ? { document } : {}) };
}
