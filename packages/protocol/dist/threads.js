import { Type } from '@sinclair/typebox';
import { CreatePostRequestSchema } from './posts.js';
export const ThreadStateSchema = Type.Union([
    Type.Literal('open'),
    Type.Literal('archived'),
]);
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
export const CreateThreadRequestSchema = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 160 }),
    initial_post: Type.Optional(CreatePostRequestSchema),
}, { additionalProperties: false });
export const PatchThreadRequestSchema = Type.Object({
    expected_version: Type.Integer({ minimum: 1 }),
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
    state: Type.Optional(ThreadStateSchema),
}, { additionalProperties: false });
//# sourceMappingURL=threads.js.map