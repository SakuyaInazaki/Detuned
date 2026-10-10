import { Value } from '@sinclair/typebox/value';
import { CONTEXT_BYTES } from './request-policies.js';
import { DetunedError, ErrorCode } from './errors.js';
import { Type } from '@sinclair/typebox';
import { PostRefSchema } from './common.js';
export const CheckProfileSchema = Type.Object({
    verifier_actor_ids: Type.Array(Type.String()),
    config_sha256: Type.String({ minLength: 64, maxLength: 64 }),
    description: Type.String(),
}, { additionalProperties: false });
export const ReviewPolicySchema = Type.Object({
    enabled: Type.Boolean({ default: true }),
    required_reviewers: Type.Integer({ minimum: 1, maximum: 5, default: 2 }),
    exclude_contributors: Type.Boolean({ default: true }),
    distinct_actors: Type.Boolean({ default: true }),
    distinct_independence_groups: Type.Boolean({ default: false }),
    seal_until_all_submitted: Type.Boolean({ default: true }),
    invalidate_on_revision: Type.Boolean({ default: true }),
    required_checks: Type.Array(Type.String()),
    allow_open_objections: Type.Boolean({ default: false }),
}, { additionalProperties: false });
export const SpaceRoleSchema = Type.Union([
    Type.Literal('owner'),
    Type.Literal('maintainer'),
    Type.Literal('contributor'),
    Type.Literal('observer'),
]);
export const MembershipSchema = Type.Object({
    space_id: Type.String(),
    actor_id: Type.String(),
    role: SpaceRoleSchema,
    active: Type.Boolean(),
    reviewer_eligible: Type.Boolean(),
    independence_group: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });
export const SpaceRevisionSchema = Type.Object({
    space_id: Type.String(),
    revision: Type.Integer({ minimum: 1 }),
    objective: Type.String({ minLength: 1, maxLength: 2000 }),
    rules: Type.Array(Type.String({ maxLength: 500 })),
    review_policy: ReviewPolicySchema,
    check_profiles: Type.Record(Type.String(), CheckProfileSchema),
    pinned_refs: Type.Array(PostRefSchema),
    editor_id: Type.String(),
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const SpaceSchema = Type.Object({
    id: Type.String(),
    slug: Type.String({ minLength: 1, maxLength: 64 }),
    current_revision: Type.Integer({ minimum: 1 }),
    policy_revision: Type.Integer({ minimum: 1 }),
    acl_epoch: Type.Integer({ minimum: 1 }),
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const CreateSpaceRequestSchema = Type.Object({
    slug: Type.String({ minLength: 1, maxLength: 64, pattern: '^[a-z0-9_-]+$' }),
    objective: Type.String({ minLength: 1, maxLength: 2000 }),
    rules: Type.Array(Type.String({ maxLength: 500 })),
    review_policy: Type.Optional(ReviewPolicySchema),
    check_profiles: Type.Optional(Type.Record(Type.String(), CheckProfileSchema)),
}, { additionalProperties: false });
export const PatchSpaceRequestSchema = Type.Object({
    expected_revision: Type.Integer({ minimum: 1 }),
    objective: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
    rules: Type.Optional(Type.Array(Type.String({ maxLength: 500 }))),
    review_policy: Type.Optional(ReviewPolicySchema),
    check_profiles: Type.Optional(Type.Record(Type.String(), CheckProfileSchema)),
    pinned_refs: Type.Optional(Type.Array(PostRefSchema)),
}, { additionalProperties: false });
export const SessionSchema = Type.Object({
    id: Type.String(),
    actor_id: Type.String(),
    space_id: Type.String(),
    client_name: Type.String({ minLength: 1, maxLength: 64 }),
    client_version: Type.String({ minLength: 1, maxLength: 64 }),
    harness_session_id: Type.Union([Type.String(), Type.Null()]),
    metadata: Type.Record(Type.String(), Type.Unknown()),
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const CreateSessionRequestSchema = Type.Object({
    client_name: Type.String({ minLength: 1, maxLength: 64 }),
    client_version: Type.String({ minLength: 1, maxLength: 64 }),
    harness_session_id: Type.Optional(Type.String({ maxLength: 128 })),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, { additionalProperties: false });
export const SpaceRevisionRefSchema = Type.Object({ space_id: Type.String({ minLength: 1 }), revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) }, { additionalProperties: false });
export const SpaceRulesDocumentSchema = Type.Object({ objective: Type.String(), rules: Type.Array(Type.String()) }, { additionalProperties: false });
export function encodeSpaceRulesDocument(document) { return JSON.stringify({ objective: document.objective, rules: document.rules }); }
export const SPACE_REVISION_READ_LIMITS = Object.freeze({ cursor_chars: 4096, cursor_ttl_seconds: 86400 });
export const SPACE_REVISION_CURSOR_ERROR_MESSAGE = '空间修订游标无效，请去掉 cursor 重新读取指定修订。';
export const SpaceRevisionReadQuerySchema = Type.Object({ max_bytes: Type.Optional(Type.Integer({ ...CONTEXT_BYTES })), cursor: Type.Optional(Type.String({ minLength: 1, maxLength: SPACE_REVISION_READ_LIMITS.cursor_chars, pattern: '\\S' })) }, { additionalProperties: false });
export function validateSpaceRevisionReadQuery(query) {
    if (query?.cursor !== undefined && (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > SPACE_REVISION_READ_LIMITS.cursor_chars))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, SPACE_REVISION_CURSOR_ERROR_MESSAGE, 400, false);
    if (!Value.Check(SpaceRevisionReadQuerySchema, query))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '空间修订读取参数不合法。', 400, false);
}
export const SpaceRevisionReadCursorPayloadSchema = Type.Object({ v: Type.Literal(1), purpose: Type.Literal('space_revision_read'), actor_id: Type.String({ pattern: '\\S' }), space_id: Type.String({ pattern: '\\S' }), revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), byte_offset: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), exp: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }) }, { additionalProperties: false });
export function isSpaceRevisionReadCursorPayload(value) { return Value.Check(SpaceRevisionReadCursorPayloadSchema, value); }
const spaceRevisionPageFields = { ref: SpaceRevisionRefSchema, encoding: Type.Literal('json'), chunk: Type.String({ minLength: 1 }), start_byte: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }), end_byte: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) };
export const SpaceRevisionPageSchema = Type.Union([
    Type.Object({ data: Type.Object({ ...spaceRevisionPageFields, complete: Type.Literal(false) }, { additionalProperties: false }), meta: Type.Object({ truncated: Type.Literal(true), next_cursor: Type.String({ minLength: 1, pattern: '\\S' }) }, { additionalProperties: false }) }, { additionalProperties: false }),
    Type.Object({ data: Type.Object({ ...spaceRevisionPageFields, complete: Type.Literal(true) }, { additionalProperties: false }), meta: Type.Object({ truncated: Type.Literal(false), next_cursor: Type.Null() }, { additionalProperties: false }) }, { additionalProperties: false }),
]);
export const SpaceRevisionEnvelopeSchema = Type.Union(SpaceRevisionPageSchema.anyOf.map(page => Type.Object({ api_version: Type.Literal('1'), request_id: Type.String(), ...page.properties }, { additionalProperties: false })));
export function buildSpaceRevisionEnvelope(requestId, page) { return { api_version: '1', request_id: requestId, ...page }; }
export function serializeSpaceRevisionEnvelope(requestId, page) { return JSON.stringify(buildSpaceRevisionEnvelope(requestId, page)); }
export function spaceRevisionEnvelopeBytes(requestId, page) { return new TextEncoder().encode(serializeSpaceRevisionEnvelope(requestId, page)).byteLength; }
//# sourceMappingURL=spaces.js.map