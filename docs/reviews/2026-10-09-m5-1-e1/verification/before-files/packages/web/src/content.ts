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

export type FieldComparison = { field: string; changed: boolean; before: string; after: string };
export type ContentComparison = { beforeRevision: number; afterRevision: number; fields: FieldComparison[] };
/** Only parsed fixed documents; bounded traversal, array order and exact strings are preserved. */
export function compareDocuments(before: FixedContent, after: FixedContent): ContentComparison | null {
  if (!before.complete || !after.complete || before.rawMode || after.rawMode || !before.document || !after.document
    || before.postId !== after.postId) return null;
  function serializeDocument(document: PostRevisionContentDocument): string[] {
    let nodes = 0; let bytes = 0;
    function part(value: unknown, depth: number): string {
      if (++nodes > 20_000 || depth > 64) throw new Error('Comparison budget exceeded.');
      const fragments: string[] = [];
      const add = (text: string) => {
        bytes += new TextEncoder().encode(text).byteLength;
        if (bytes > CONTENT_ACCUMULATION_LIMIT) throw new Error('Comparison budget exceeded.');
        fragments.push(text);
      };
      if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
        add(JSON.stringify(value));
      } else if (Array.isArray(value)) {
        add('['); value.forEach((entry, i) => { if (i) add(','); fragments.push(part(entry, depth + 1)); }); add(']');
      } else if (record(value)) {
        add('{'); Object.keys(value).sort().forEach((key, i) => { if (i) add(','); add(`${JSON.stringify(key)}:`); fragments.push(part(value[key], depth + 1)); }); add('}');
      } else throw new Error('Unsupported comparison value.');
      return fragments.join('');
    }
    return [document.title, document.summary, document.body, document.tags, document.structured].map(value => part(value, 0));
  }
  try {
    const left = serializeDocument(before.document); const right = serializeDocument(after.document);
    return { beforeRevision: before.revision, afterRevision: after.revision,
      fields: ['标题', '摘要', '正文', '标签', '结构化内容'].map((field, i) => ({ field, changed: left[i] !== right[i], before: left[i]!, after: right[i]! })) };
  } catch { return null; }
}
