import addFormats from 'ajv-formats';
import { Value } from '@sinclair/typebox/value';
import { Type } from '@sinclair/typebox';
export const ArtifactVisibilitySchema = Type.Union([
    Type.Literal('space'),
    Type.Literal('review_assignment'),
]);
export const ArtifactStateSchema = Type.Union([
    Type.Literal('ready'),
    Type.Literal('redacted'),
    Type.Literal('missing'),
]);
export const ArtifactSchema = Type.Object({
    id: Type.String(),
    space_id: Type.String(),
    owner_id: Type.String(),
    visibility: ArtifactVisibilitySchema,
    review_assignment_id: Type.Union([Type.String(), Type.Null()]),
    check_run_id: Type.Union([Type.String(), Type.Null()]),
    sha256: Type.String({ minLength: 64, maxLength: 64 }),
    bytes: Type.Integer({ minimum: 0, maximum: 26214400 }), // 25 MiB
    mime: Type.String(),
    storage_key: Type.String(),
    state: ArtifactStateSchema,
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const DEFAULT_ARTIFACT_LIMITS = { max_file_bytes: 26214400, max_space_bytes: 1073741824 };
export const CreateArtifactMetadataSchema = Type.Object({ visibility: Type.Optional(Type.Literal('space')) }, { additionalProperties: false });
export const ArtifactMetadataSchema = Type.Object({
    id: Type.String(), space_id: Type.String(), owner_id: Type.String(), visibility: Type.Literal('space'),
    sha256: Type.String({ minLength: 64, maxLength: 64 }), bytes: Type.Integer({ minimum: 0, maximum: 26214400 }),
    mime: Type.String(), state: ArtifactStateSchema, created_at: Type.String({ format: 'date-time' }), content_url: Type.String(),
}, { additionalProperties: false });
export function resolveArtifactLimits(input = {}) {
    const limits = { ...DEFAULT_ARTIFACT_LIMITS, ...input };
    for (const value of [limits.max_file_bytes, limits.max_space_bytes]) {
        if (!Number.isSafeInteger(value) || value <= 0)
            throw new Error('Artifact limits must be positive safe integers.');
    }
    if (limits.max_file_bytes > 26214400)
        throw new Error('Artifact file limit exceeds 25 MiB.');
    return limits;
}
export function normalizeArtifactMime(input) {
    const value = input === undefined || input === '' ? 'application/octet-stream' : input;
    if (/[\x00-\x1f\x7f]/.test(value))
        throw new Error('Invalid MIME control character.');
    const base = (value.split(';', 1)[0] ?? '').trim().toLowerCase();
    if (!/^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+$/.test(base))
        throw new Error('Invalid MIME media type.');
    return base;
}
export function toArtifactMetadata(artifact) {
    return { id: artifact.id, space_id: artifact.space_id, owner_id: artifact.owner_id, visibility: 'space',
        sha256: artifact.sha256, bytes: artifact.bytes, mime: artifact.mime, state: artifact.state, created_at: artifact.created_at,
        content_url: `/api/v1/spaces/${encodeURIComponent(artifact.space_id)}/artifacts/${encodeURIComponent(artifact.id)}/content` };
}
// Value.Check has no built-in date-time format registry. Keep the public schema
// intact and validate that field locally without changing process-global formats.
const artifactMetadataCheckSchema = { ...ArtifactMetadataSchema, properties: { ...ArtifactMetadataSchema.properties, created_at: Type.String() } };
const artifactDateTime = addFormats.default.get('date-time', 'full');
function validArtifactDate(value) {
    if (artifactDateTime instanceof RegExp)
        return artifactDateTime.test(value);
    if (typeof artifactDateTime === 'function')
        return artifactDateTime(value);
    if (typeof artifactDateTime !== 'object' || artifactDateTime === null || !('validate' in artifactDateTime))
        return false;
    const validate = artifactDateTime.validate;
    return typeof validate === 'function' ? validate(value) === true : validate instanceof RegExp && validate.test(value);
}
export function isArtifactMetadata(value) { return Value.Check(artifactMetadataCheckSchema, value) && validArtifactDate(value.created_at); }
export function isCreateArtifactMetadata(value) { return Value.Check(CreateArtifactMetadataSchema, value); }
//# sourceMappingURL=artifacts.js.map