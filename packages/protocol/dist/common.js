import { LIST_LIMIT } from './request-policies.js';
import { Type } from '@sinclair/typebox';
export const ApiMetaSchema = Type.Object({
    truncated: Type.Boolean(),
    next_cursor: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });
export function createApiEnvelopeSchema(dataSchema) {
    return Type.Object({
        api_version: Type.Literal('1'),
        request_id: Type.String(),
        data: dataSchema,
        meta: Type.Optional(ApiMetaSchema),
    }, { additionalProperties: false });
}
export const PaginationQuerySchema = Type.Object({
    limit: Type.Optional(Type.Integer({ ...LIST_LIMIT })),
    cursor: Type.Optional(Type.String()),
}, { additionalProperties: false });
export const PostRefSchema = Type.Object({
    post_id: Type.String({ minLength: 1 }),
    revision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export const PostEvidenceRefSchema = Type.Object({
    kind: Type.Literal('post'),
    post_id: Type.String({ minLength: 1 }),
    revision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export const ArtifactEvidenceRefSchema = Type.Object({
    kind: Type.Literal('artifact'),
    artifact_id: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
export const EvidenceRefSchema = Type.Union([
    PostEvidenceRefSchema,
    ArtifactEvidenceRefSchema,
]);
//# sourceMappingURL=common.js.map