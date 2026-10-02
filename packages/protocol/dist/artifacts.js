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
//# sourceMappingURL=artifacts.js.map