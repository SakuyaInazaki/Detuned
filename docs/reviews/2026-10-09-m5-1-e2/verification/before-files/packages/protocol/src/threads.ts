import { Value } from '@sinclair/typebox/value';
import { CONTEXT_BYTES, THREAD_POST_LIMIT } from './request-policies.js';
import { DetunedError, ErrorCode } from './errors.js';
import { Type, Static } from '@sinclair/typebox';
import { CreatePostRequestSchema, PostSchema } from './posts.js';

export const ThreadStateSchema = Type.Union([
  Type.Literal('open'),
  Type.Literal('archived'),
]);

export type ThreadState = Static<typeof ThreadStateSchema>;

export const ThreadSchema = Type.Object({
  id: Type.String(),
  space_id: Type.String(),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  version: Type.Integer({ minimum: 1 }),
  state: ThreadStateSchema,
  creator_id: Type.String(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Thread = Static<typeof ThreadSchema>;

export const CreateThreadRequestSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 160 }),
  initial_post: Type.Optional(CreatePostRequestSchema),
}, { additionalProperties: false });

export type CreateThreadRequest = Static<typeof CreateThreadRequestSchema>;

export const PatchThreadRequestSchema = Type.Object({
  expected_version: Type.Integer({ minimum: 1 }),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
  state: Type.Optional(ThreadStateSchema),
}, { additionalProperties: false });

export type PatchThreadRequest = Static<typeof PatchThreadRequestSchema>;


/** Bounded read-only metadata directory; no content or new-write restrictions. */
export const THREAD_POSTS_READ_LIMITS = Object.freeze({ cursor_chars: 4096, cursor_ttl_seconds: 86400 });
export const THREAD_POSTS_CURSOR_ERROR_MESSAGE = 'Invalid or expired thread posts cursor. Remove cursor and retry the first page.';
export const ThreadPostsReadQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ ...THREAD_POST_LIMIT })),
  max_bytes: Type.Optional(Type.Integer({ ...CONTEXT_BYTES })),
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: THREAD_POSTS_READ_LIMITS.cursor_chars, pattern: '\\S' })),
}, { additionalProperties: false });
export type ThreadPostsReadQuery = Static<typeof ThreadPostsReadQuerySchema>;
export function validateThreadPostsReadQuery(query: ThreadPostsReadQuery): void {
  if (query?.cursor !== undefined && (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > THREAD_POSTS_READ_LIMITS.cursor_chars))
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, THREAD_POSTS_CURSOR_ERROR_MESSAGE, 400, false);
  if (!Value.Check(ThreadPostsReadQuerySchema, query))
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid thread posts read parameters.', 400, false);
}
export const ThreadPostsReadCursorPayloadSchema = Type.Object({
  v: Type.Literal(1), purpose: Type.Literal('thread_posts_read'),
  actor_id: Type.String({ minLength: 1 }), space_id: Type.String({ minLength: 1 }),
  thread_id: Type.String({ minLength: 1 }), sort: Type.Literal('id_asc'),
  after_id: Type.String({ minLength: 1 }), exp: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export type ThreadPostsReadCursorPayload = Static<typeof ThreadPostsReadCursorPayloadSchema>;
export function isThreadPostsReadCursorPayload(value: unknown): value is ThreadPostsReadCursorPayload {
  return Value.Check(ThreadPostsReadCursorPayloadSchema, value);
}
const threadPostsMetadataSchema = Type.Object({ ...ThreadSchema.properties, title: Type.String() }, { additionalProperties: false });
const threadPostsData = (minItems: number) => Type.Object({ thread: threadPostsMetadataSchema, posts: Type.Array(PostSchema, { minItems }) }, { additionalProperties: false });
const threadPostsMeta = (truncated: boolean, cursor: boolean) => Type.Object({
  truncated: Type.Literal(truncated), next_cursor: cursor ? Type.String({ minLength: 1, pattern: '\\S' }) : Type.Null(),
}, { additionalProperties: false });
export const ThreadPostsPageSchema = Type.Union([
  Type.Object({ data: threadPostsData(1), meta: threadPostsMeta(true, true) }, { additionalProperties: false }),
  Type.Object({ data: threadPostsData(1), meta: threadPostsMeta(false, true) }, { additionalProperties: false }),
  Type.Object({ data: threadPostsData(0), meta: threadPostsMeta(false, false) }, { additionalProperties: false }),
]);
export type ThreadPostsPage = Static<typeof ThreadPostsPageSchema>;
export const ThreadPostsEnvelopeSchema = Type.Union(ThreadPostsPageSchema.anyOf.map(page => Type.Object({
  api_version: Type.Literal('1'), request_id: Type.String(), ...page.properties,
}, { additionalProperties: false })));
export type ThreadPostsEnvelope = { api_version: '1'; request_id: string } & ThreadPostsPage;
export function buildThreadPostsEnvelope(requestId: string, page: ThreadPostsPage): ThreadPostsEnvelope {
  return { api_version: '1', request_id: requestId, ...page };
}
export function serializeThreadPostsEnvelope(requestId: string, page: ThreadPostsPage): string {
  return JSON.stringify(buildThreadPostsEnvelope(requestId, page));
}
export function threadPostsEnvelopeBytes(requestId: string, page: ThreadPostsPage): number {
  return new TextEncoder().encode(serializeThreadPostsEnvelope(requestId, page)).byteLength;
}
