import { Type, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { DetunedError, ErrorCode } from './errors.js';
import { CONTEXT_BYTES } from './request-policies.js';
import { PostRefSchema, EvidenceRefSchema } from './common.js';
import { RelationTypeSchema } from './relations.js';

export const POST_KINDS = [
  'note',
  'question',
  'proposal',
  'claim',
  'objection',
  'failure',
  'summary',
  'review',
  'decision',
] as const;

export const PostKindSchema = Type.Union(
  POST_KINDS.map((k) => Type.Literal(k))
);

export type PostKind = Static<typeof PostKindSchema>;

export const PostLifecycleSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('withdrawn'),
  Type.Literal('redacted'),
]);

export type PostLifecycle = Static<typeof PostLifecycleSchema>;

export const FailureCategorySchema = Type.Union([
  Type.Literal('counterexample'),
  Type.Literal('proof_gap'),
  Type.Literal('test_failure'),
  Type.Literal('performance_failure'),
  Type.Literal('environment_error'),
  Type.Literal('budget_exhausted'),
]);

export type FailureCategory = Static<typeof FailureCategorySchema>;

export const ProposalClaimStructuredSchema = Type.Object({
  statement: Type.String({ minLength: 1, maxLength: 5000 }),
  assumptions: Type.Array(Type.String({ maxLength: 1000 })),
  scope: Type.String({ minLength: 1, maxLength: 1000 }),
  falsification_plan: Type.String({ minLength: 1, maxLength: 2000 }),
}, { additionalProperties: false });

export const ObjectionStructuredSchema = Type.Object({
  target_ref: PostRefSchema,
  issue: Type.String({ minLength: 1, maxLength: 2000 }),
  impact: Type.String({ minLength: 1, maxLength: 2000 }),
  evidence_refs: Type.Array(EvidenceRefSchema),
  verification_plan: Type.Optional(Type.String({ maxLength: 2000 })),
}, { additionalProperties: false });

export const FailureStructuredSchema = Type.Object({
  attempt: Type.String({ minLength: 1, maxLength: 2000 }),
  category: FailureCategorySchema,
  assumptions: Type.Array(Type.String({ maxLength: 1000 })),
  tested_scope: Type.String({ minLength: 1, maxLength: 1000 }),
  expected: Type.String({ minLength: 1, maxLength: 2000 }),
  observed: Type.String({ minLength: 1, maxLength: 2000 }),
  evidence_refs: Type.Array(EvidenceRefSchema),
  evidence_state: Type.Union([Type.Literal('provided'), Type.Literal('unverified')]),
  evidence_missing_reason: Type.Optional(Type.String({ maxLength: 1000 })),
  ruled_out: Type.String({ minLength: 1, maxLength: 2000 }),
  not_ruled_out: Type.Array(Type.String({ maxLength: 1000 })),
  retry_when: Type.Array(Type.String({ maxLength: 1000 })),
}, { additionalProperties: false });

export const SummaryStructuredSchema = Type.Object({
  source_refs: Type.Array(PostRefSchema, { minItems: 1 }),
}, { additionalProperties: false });

/** New actions use these strict schemas; historical wire/read schemas stay compatible.
 * Patterns express existing nonblank requirements without trimming persisted text.
 * Never add defaults here: idempotency hashes the original request before parsing.
 */
const nonblank = (maxLength: number) => Type.String({ minLength: 1, maxLength, pattern: '\\S' });
const NewProposalClaimStructuredSchema = Type.Object({
  ...ProposalClaimStructuredSchema.properties,
  statement: nonblank(5000),
  scope: nonblank(1000),
  falsification_plan: nonblank(2000),
}, { additionalProperties: false });

const failureFields = FailureStructuredSchema.properties;
const NewFailureStructuredSchema = Type.Union([
  Type.Object({
    ...failureFields,
    evidence_state: Type.Literal('provided'),
    evidence_refs: Type.Array(EvidenceRefSchema, { minItems: 1 }),
  }, { additionalProperties: false }),
  Type.Object({
    ...failureFields,
    evidence_state: Type.Literal('unverified'),
    evidence_missing_reason: nonblank(1000),
  }, { additionalProperties: false }),
]);

export const NEW_TYPED_STRUCTURED_SCHEMAS = {
  proposal: NewProposalClaimStructuredSchema,
  claim: NewProposalClaimStructuredSchema,
  failure: NewFailureStructuredSchema,
  summary: SummaryStructuredSchema,
} as const;

export type NewTypedStructured = Static<(typeof NEW_TYPED_STRUCTURED_SCHEMAS)[keyof typeof NEW_TYPED_STRUCTURED_SCHEMAS]>;

/** Pure schema validation, called only inside a new idempotent business action.
 * Reference readability/authorization is a separate core responsibility.
 */
export function parseNewTypedStructured(kind: PostKind, structured: unknown): NewTypedStructured | undefined {
  if (!Object.prototype.hasOwnProperty.call(NEW_TYPED_STRUCTURED_SCHEMAS, kind)) return undefined;
  const schema = NEW_TYPED_STRUCTURED_SCHEMAS[kind as keyof typeof NEW_TYPED_STRUCTURED_SCHEMAS];
  if (!Value.Check(schema, structured)) {
    throw new DetunedError('VALIDATION_ERROR', `${kind} structured does not satisfy the new-write schema`, 400);
  }
  return structured as NewTypedStructured;
}

export const NEW_TYPED_WRITE_POLICY_DESCRIPTION = '新幂等 action 的 proposal/claim/failure/summary structured 必须符合共享严格新写 schema；兼容 wire envelope 保留以支持历史成功请求原 key + 原 payload 重放，不注入默认字段。引用权限与可读性由 core 校验；provided 只表示提供引用，不表示机器验证结论。';

export const InformalReviewDecisionStructuredSchema = Type.Object({
  subject_refs: Type.Array(PostRefSchema, { minItems: 1 }),
  informal: Type.Literal(true),
}, { additionalProperties: false });

export const StructuredContentSchema = Type.Union([
  ProposalClaimStructuredSchema,
  ObjectionStructuredSchema,
  FailureStructuredSchema,
  SummaryStructuredSchema,
  InformalReviewDecisionStructuredSchema,
  Type.Record(Type.String(), Type.Unknown()),
]);

export type StructuredContent = Static<typeof StructuredContentSchema>;

export const PostRevisionSchema = Type.Object({
  post_id: Type.String(),
  revision: Type.Integer({ minimum: 1 }),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Array(Type.String({ maxLength: 48 }), { maxItems: 20 }),
  structured: StructuredContentSchema,
  content_hash: Type.String({ minLength: 64, maxLength: 64 }),
  editor_id: Type.String(),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type PostRevision = Static<typeof PostRevisionSchema>;

export const PostSchema = Type.Object({
  id: Type.String(),
  space_id: Type.String(),
  thread_id: Type.String(),
  author_id: Type.String(),
  kind: PostKindSchema,
  current_revision: Type.Integer({ minimum: 1 }),
  lifecycle: PostLifecycleSchema,
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Post = Static<typeof PostSchema>;

export const CreatePostRelationInputSchema = Type.Object({
  target_ref: PostRefSchema,
  type: RelationTypeSchema,
}, { additionalProperties: false });

export type CreatePostRelationInput = Static<typeof CreatePostRelationInputSchema>;

export const CreatePostRequestSchema = Type.Object({
  kind: PostKindSchema,
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Optional(Type.Array(Type.String({ maxLength: 48 }), { maxItems: 20 })),
  structured: Type.Optional(StructuredContentSchema),
  refs: Type.Optional(Type.Array(CreatePostRelationInputSchema)),
  artifact_ids: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
}, { additionalProperties: false });

export type CreatePostRequest = Static<typeof CreatePostRequestSchema>;

export const CreatePostRevisionRequestSchema = Type.Object({
  expected_revision: Type.Integer({ minimum: 1 }),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Optional(Type.Array(Type.String({ maxLength: 48 }), { maxItems: 20 })),
  structured: Type.Optional(StructuredContentSchema),
  refs: Type.Optional(Type.Array(CreatePostRelationInputSchema)),
  artifact_ids: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
}, { additionalProperties: false });

export type CreatePostRevisionRequest = Static<typeof CreatePostRevisionRequestSchema>;

export const WithdrawPostRequestSchema = Type.Object({
  expected_revision: Type.Integer({ minimum: 1 }),
  reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false });

export type WithdrawPostRequest = Static<typeof WithdrawPostRequestSchema>;


/** Read projection of persisted content; never apply new-write validation or defaults. */
export type PostRevisionContentDocument = Pick<PostRevision, 'title' | 'summary' | 'body' | 'tags' | 'structured'>;

export function encodePostRevisionContentDocument(document: PostRevisionContentDocument): string {
  return JSON.stringify({ title: document.title, summary: document.summary, body: document.body,
    tags: document.tags, structured: document.structured });
}

export const PostRevisionContentRefSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }), post_id: Type.String({ minLength: 1 }),
  revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export type PostRevisionContentRef = Static<typeof PostRevisionContentRefSchema>;

export const POST_REVISION_READ_LIMITS = Object.freeze({ cursor_chars: 4096, cursor_ttl_seconds: 86400 });
export const POST_REVISION_CURSOR_ERROR_MESSAGE = 'Invalid or expired post revision cursor. Remove cursor and retry the same fixed revision.';
export const PostRevisionReadQuerySchema = Type.Object({
  max_bytes: Type.Optional(Type.Integer({ ...CONTEXT_BYTES })),
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: POST_REVISION_READ_LIMITS.cursor_chars, pattern: '\\S' })),
}, { additionalProperties: false });
export type PostRevisionReadQuery = Static<typeof PostRevisionReadQuerySchema>;
export function validatePostRevisionReadQuery(query: PostRevisionReadQuery): void {
  if (query?.cursor !== undefined && (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > POST_REVISION_READ_LIMITS.cursor_chars)) {
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, POST_REVISION_CURSOR_ERROR_MESSAGE, 400, false);
  }
  if (!Value.Check(PostRevisionReadQuerySchema, query)) {
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid post revision read parameters.', 400, false);
  }
}

export const PostRevisionReadCursorPayloadSchema = Type.Object({
  v: Type.Literal(1), purpose: Type.Literal('post_revision_read'),
  actor_id: Type.String({ pattern: '\\S' }), space_id: Type.String({ pattern: '\\S' }), post_id: Type.String({ pattern: '\\S' }),
  revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  byte_offset: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  exp: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export type PostRevisionReadCursorPayload = Static<typeof PostRevisionReadCursorPayloadSchema>;
export function isPostRevisionReadCursorPayload(value: unknown): value is PostRevisionReadCursorPayload {
  return Value.Check(PostRevisionReadCursorPayloadSchema, value);
}

const postRevisionContentPageFields = {
  ref: PostRevisionContentRefSchema, post_kind: PostKindSchema,
  lifecycle: Type.Union([Type.Literal('active'), Type.Literal('withdrawn')]),
  has_newer_revision: Type.Boolean(), encoding: Type.Literal('json'), chunk: Type.String({ minLength: 1 }),
  start_byte: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  end_byte: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
};
export const PostRevisionContentPageSchema = Type.Union([
  Type.Object({
    data: Type.Object({ ...postRevisionContentPageFields, complete: Type.Literal(false) }, { additionalProperties: false }),
    meta: Type.Object({ truncated: Type.Literal(true), next_cursor: Type.String({ minLength: 1, pattern: '\\S' }) }, { additionalProperties: false }),
  }, { additionalProperties: false }),
  Type.Object({
    data: Type.Object({ ...postRevisionContentPageFields, complete: Type.Literal(true) }, { additionalProperties: false }),
    meta: Type.Object({ truncated: Type.Literal(false), next_cursor: Type.Null() }, { additionalProperties: false }),
  }, { additionalProperties: false }),
]);
export type PostRevisionContentPage = Static<typeof PostRevisionContentPageSchema>;
export const PostRevisionContentEnvelopeSchema = Type.Union(PostRevisionContentPageSchema.anyOf.map(page => Type.Object({
  api_version: Type.Literal('1'), request_id: Type.String(), ...page.properties,
}, { additionalProperties: false })));
export type PostRevisionContentEnvelope = { api_version: '1'; request_id: string } & PostRevisionContentPage;
export function buildPostRevisionContentEnvelope(requestId: string, page: PostRevisionContentPage): PostRevisionContentEnvelope {
  return { api_version: '1', request_id: requestId, ...page };
}
export function serializePostRevisionContentEnvelope(requestId: string, page: PostRevisionContentPage): string {
  return JSON.stringify(buildPostRevisionContentEnvelope(requestId, page));
}
export function postRevisionContentEnvelopeBytes(requestId: string, page: PostRevisionContentPage): number {
  return new TextEncoder().encode(serializePostRevisionContentEnvelope(requestId, page)).byteLength;
}
