import { Type } from '@sinclair/typebox';
import { PostKindSchema } from './posts.js';
import { PostRefSchema } from './common.js';
export const SearchQuerySchema = Type.Object({
    q: Type.String({ minLength: 1, maxLength: 256 }),
    kind: Type.Optional(PostKindSchema),
    tags: Type.Optional(Type.Array(Type.String())),
    thread_id: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
    cursor: Type.Optional(Type.String()),
}, { additionalProperties: false });
export const SearchResultItemSchema = Type.Object({
    post_id: Type.String(),
    revision: Type.Integer({ minimum: 1 }),
    thread_id: Type.String(),
    kind: PostKindSchema,
    title: Type.String(),
    summary: Type.String(),
    tags: Type.Array(Type.String()),
    snippet: Type.String(),
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const ContextQuerySchema = Type.Object({
    max_bytes: Type.Optional(Type.Integer({ minimum: 4096, maximum: 65536, default: 12288 })),
    focus_thread_id: Type.Optional(Type.String()),
}, { additionalProperties: false });
export const ContextResponseDataSchema = Type.Object({
    space_id: Type.String(),
    slug: Type.String(),
    objective: Type.String(),
    rules: Type.Array(Type.String()),
    policy_revision: Type.Integer({ minimum: 1 }),
    pinned_summaries: Type.Array(Type.Object({
        ref: PostRefSchema,
        title: Type.String(),
        summary: Type.String(),
        has_newer_revision: Type.Boolean(),
    }, { additionalProperties: false })),
    blocking_objections: Type.Array(Type.Object({
        relation_id: Type.String(),
        source_ref: PostRefSchema,
        target_ref: PostRefSchema,
        issue: Type.String(),
        impact: Type.String(),
    }, { additionalProperties: false })),
    recent_failures: Type.Array(Type.Object({
        ref: PostRefSchema,
        title: Type.String(),
        category: Type.String(),
        attempt: Type.String(),
        tested_scope: Type.String(),
        evidence_state: Type.String(),
    }, { additionalProperties: false })),
    recent_activity: Type.Array(Type.Object({
        type: Type.String(),
        object_id: Type.String(),
        occurred_at: Type.String({ format: 'date-time' }),
    }, { additionalProperties: false })),
    checkpoint_token: Type.String(),
}, { additionalProperties: false });
export const ViewNameSchema = Type.Union([
    Type.Literal('failures'),
    Type.Literal('findings'),
    Type.Literal('open-questions'),
]);
//# sourceMappingURL=search.js.map