import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { DetunedError, ErrorCode } from './errors.js';
export const ARTIFACT_CONTENT_LIMITS = Object.freeze({ blob_bytes: 1048576, min_bytes: 4096, max_bytes: 12288, default_bytes: 8192 });
export const ArtifactContentQuerySchema = Type.Object({ encoding: Type.Optional(Type.Union([Type.Literal('utf8'), Type.Literal('base64')])), offset: Type.Optional(Type.Integer({ minimum: 0, maximum: ARTIFACT_CONTENT_LIMITS.blob_bytes })), expected_sha256: Type.Optional(Type.String({ pattern: '^[0-9a-f]{64}$' })), max_bytes: Type.Optional(Type.Integer({ minimum: 4096, maximum: 12288 })) }, { additionalProperties: false });
export function validateArtifactContentQuery(query) { if (!Value.Check(ArtifactContentQuerySchema, query) || ((query.offset ?? 0) > 0 && query.expected_sha256 === undefined))
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid artifact content parameters; continuation requires expected_sha256.', 400, false); }
//# sourceMappingURL=evidence-reads.js.map