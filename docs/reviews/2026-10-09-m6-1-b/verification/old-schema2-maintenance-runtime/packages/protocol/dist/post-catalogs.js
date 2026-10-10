import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { DetunedError, ErrorCode } from './errors.js';
import { LIST_LIMIT, CONTEXT_BYTES } from './request-policies.js';
import { PostRefSchema } from './common.js';
export const POST_CATALOG_READ_LIMITS = Object.freeze({ cursor_chars: 4096, cursor_ttl_seconds: 86400 });
const cursor = Type.String({ minLength: 1, maxLength: POST_CATALOG_READ_LIMITS.cursor_chars, pattern: '\\S' });
export const PostRevisionCatalogQuerySchema = Type.Object({
    limit: Type.Optional(Type.Integer({ ...LIST_LIMIT })),
    max_bytes: Type.Optional(Type.Integer({ ...CONTEXT_BYTES })), cursor: Type.Optional(cursor),
}, { additionalProperties: false });
export const RevisionArtifactsQuerySchema = Type.Object({ ...PostRevisionCatalogQuerySchema.properties }, { additionalProperties: false });
export function validatePostRevisionCatalogQuery(query) {
    if (!Value.Check(PostRevisionCatalogQuerySchema, query))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid revision catalog query. Remove cursor or correct parameters and retry.', 400, false);
}
export function validateRevisionArtifactsQuery(query) {
    if (!Value.Check(RevisionArtifactsQuerySchema, query))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid revision artifacts query. Remove cursor or correct parameters and retry.', 400, false);
}
const positive = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const binding = { v: Type.Literal(1), actor_id: Type.String({ minLength: 1 }), space_id: Type.String({ minLength: 1 }),
    post_id: Type.String({ minLength: 1 }), exp: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }) };
export const PostRevisionCatalogCursorPayloadSchema = Type.Object({ ...binding,
    purpose: Type.Literal('post_revisions_catalog'), sort: Type.Literal('revision_desc'), after_revision: positive,
}, { additionalProperties: false });
export function isPostRevisionCatalogCursorPayload(value) {
    return Value.Check(PostRevisionCatalogCursorPayloadSchema, value);
}
export const RevisionArtifactsCursorPayloadSchema = Type.Object({ ...binding,
    purpose: Type.Literal('revision_artifacts'), revision: positive, sort: Type.Literal('artifact_id_asc'), after_id: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
export function isRevisionArtifactsCursorPayload(value) {
    return Value.Check(RevisionArtifactsCursorPayloadSchema, value);
}
export const PostRevisionMetadataSchema = Type.Object({ revision: positive, editor_id: Type.String(),
    created_at: Type.String({ format: 'date-time' }), content_hash: Type.String({ minLength: 64, maxLength: 64 }),
}, { additionalProperties: false });
const artifactFields = { id: Type.String({ minLength: 1 }), owner_id: Type.String(),
    sha256: Type.String({ minLength: 64, maxLength: 64 }), bytes: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    mime: Type.String(), created_at: Type.String({ format: 'date-time' }), purpose: Type.String() };
export const RevisionArtifactCatalogReadySchema = Type.Object({ ...artifactFields, state: Type.Literal('ready') }, { additionalProperties: false });
export const RevisionArtifactCatalogMissingSchema = Type.Object({ ...artifactFields, state: Type.Literal('missing') }, { additionalProperties: false });
export const RevisionArtifactCatalogRedactedSchema = Type.Object({ id: artifactFields.id, state: Type.Literal('redacted') }, { additionalProperties: false });
export const RevisionArtifactCatalogItemSchema = Type.Union([RevisionArtifactCatalogReadySchema, RevisionArtifactCatalogMissingSchema, RevisionArtifactCatalogRedactedSchema]);
const meta = (truncated, hasCursor) => Type.Object({ truncated: Type.Literal(truncated),
    next_cursor: hasCursor ? cursor : Type.Null() }, { additionalProperties: false });
const revisionData = (minItems) => Type.Object({ post_id: Type.String({ minLength: 1 }), current_revision: positive,
    revisions: Type.Array(PostRevisionMetadataSchema, { minItems }) }, { additionalProperties: false });
export const PostRevisionCatalogPageSchema = Type.Union([
    Type.Object({ data: revisionData(1), meta: meta(true, true) }, { additionalProperties: false }),
    Type.Object({ data: revisionData(1), meta: meta(false, true) }, { additionalProperties: false }),
    Type.Object({ data: revisionData(0), meta: meta(false, false) }, { additionalProperties: false }),
]);
export const PostRevisionCatalogEnvelopeSchema = Type.Union(PostRevisionCatalogPageSchema.anyOf.map(page => Type.Object({
    api_version: Type.Literal('1'), request_id: Type.String(), ...page.properties,
}, { additionalProperties: false })));
const artifactData = (minItems) => Type.Object({ ref: PostRefSchema,
    artifacts: Type.Array(RevisionArtifactCatalogItemSchema, { minItems }) }, { additionalProperties: false });
export const PostRevisionArtifactsPageSchema = Type.Union([
    Type.Object({ data: artifactData(1), meta: meta(true, true) }, { additionalProperties: false }),
    Type.Object({ data: artifactData(1), meta: meta(false, true) }, { additionalProperties: false }),
    Type.Object({ data: artifactData(0), meta: meta(false, false) }, { additionalProperties: false }),
]);
export const PostRevisionArtifactsEnvelopeSchema = Type.Union(PostRevisionArtifactsPageSchema.anyOf.map(page => Type.Object({
    api_version: Type.Literal('1'), request_id: Type.String(), ...page.properties,
}, { additionalProperties: false })));
export function buildPostRevisionCatalogEnvelope(requestId, page) {
    return { api_version: '1', request_id: requestId, ...page };
}
export function serializePostRevisionCatalogEnvelope(requestId, page) { return JSON.stringify(buildPostRevisionCatalogEnvelope(requestId, page)); }
export function postRevisionCatalogEnvelopeBytes(requestId, page) { return new TextEncoder().encode(serializePostRevisionCatalogEnvelope(requestId, page)).byteLength; }
export function buildPostRevisionArtifactsEnvelope(requestId, page) {
    return { api_version: '1', request_id: requestId, ...page };
}
export function serializePostRevisionArtifactsEnvelope(requestId, page) { return JSON.stringify(buildPostRevisionArtifactsEnvelope(requestId, page)); }
export function postRevisionArtifactsEnvelopeBytes(requestId, page) { return new TextEncoder().encode(serializePostRevisionArtifactsEnvelope(requestId, page)).byteLength; }
//# sourceMappingURL=post-catalogs.js.map