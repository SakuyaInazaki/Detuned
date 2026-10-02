import { Type } from '@sinclair/typebox';
import { PostRefSchema } from './common.js';
export const RelationTypeSchema = Type.Union([
    Type.Literal('cites'),
    Type.Literal('supports'),
    Type.Literal('challenges'),
    Type.Literal('supersedes'),
    Type.Literal('reproduces'),
    Type.Literal('addresses'),
]);
export const RelationStateSchema = Type.Union([
    Type.Literal('open'),
    Type.Literal('resolved'),
]);
export const RelationSchema = Type.Object({
    id: Type.String(),
    space_id: Type.String(),
    source_post_id: Type.String(),
    source_revision: Type.Integer({ minimum: 1 }),
    target_post_id: Type.String(),
    target_revision: Type.Integer({ minimum: 1 }),
    type: RelationTypeSchema,
    state: RelationStateSchema,
    version: Type.Integer({ minimum: 1 }),
    creator_id: Type.String(),
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const RelationResolutionActionSchema = Type.Union([
    Type.Literal('resolve'),
    Type.Literal('reopen'),
]);
export const RelationResolutionSchema = Type.Object({
    id: Type.String(),
    relation_id: Type.String(),
    version: Type.Integer({ minimum: 1 }),
    resolver_id: Type.String(),
    reason_ref: PostRefSchema,
    action: RelationResolutionActionSchema,
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const CreateRelationRequestSchema = Type.Object({
    source_ref: PostRefSchema,
    target_ref: PostRefSchema,
    type: RelationTypeSchema,
}, { additionalProperties: false });
export const ResolveRelationRequestSchema = Type.Object({
    expected_version: Type.Integer({ minimum: 1 }),
    reason_ref: PostRefSchema,
}, { additionalProperties: false });
export const ReopenRelationRequestSchema = Type.Object({
    expected_version: Type.Integer({ minimum: 1 }),
    reason_ref: PostRefSchema,
}, { additionalProperties: false });
//# sourceMappingURL=relations.js.map