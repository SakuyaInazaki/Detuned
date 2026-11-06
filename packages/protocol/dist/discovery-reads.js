import { ThreadSchema, ThreadPostDirectoryItemSchema } from './threads.js';
import { isCheckInstant } from './review.js';
import { SpaceSchema } from './spaces.js';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { RelationTypeSchema, RelationStateSchema } from './relations.js';
import { PostRefSchema } from './common.js';
import { ConsumerSchema, SubscriptionSchema, EventTypeSchema } from './events.js';
import { DetunedError, ErrorCode } from './errors.js';
const id = Type.String({ minLength: 1 });
const status = Type.Union([Type.Literal('active'), Type.Literal('withdrawn'), Type.Literal('redacted')]);
const newer = Type.Union([Type.Boolean(), Type.Null()]);
export const RelationReadViewSchema = Type.Object({ relation_id: id, relation_type: RelationTypeSchema, source_ref: PostRefSchema, target_ref: PostRefSchema, creator_id: id, source_author_id: id, target_author_id: id, state: RelationStateSchema, version: Type.Integer({ minimum: 1 }), created_at: Type.String(), source_status: status, target_status: status, source_has_newer_revision: newer, target_has_newer_revision: newer }, { additionalProperties: false });
export const PostRelationsQuerySchema = Type.Object({ direction: Type.Optional(Type.Union([Type.Literal('in'), Type.Literal('out'), Type.Literal('both')])), limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })), max_bytes: Type.Optional(Type.Integer({ minimum: 4096, maximum: 65536 })), cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 4096 })) }, { additionalProperties: false });
export const PostRelationsPageSchema = Type.Object({ data: Type.Object({ ref: PostRefSchema, relations: Type.Array(RelationReadViewSchema, { maxItems: 100 }) }, { additionalProperties: false }), meta: Type.Object({ truncated: Type.Boolean(), next_cursor: Type.Union([id, Type.Null()]) }, { additionalProperties: false }) }, { additionalProperties: false });
export const ConsumerLookupQuerySchema = Type.Object({ consumer_key: Type.String({ minLength: 1, maxLength: 64 }), thread_ids: Type.Optional(Type.Array(Type.String())), event_types: Type.Optional(Type.Array(EventTypeSchema)) }, { additionalProperties: false });
export const ConsumerLookupViewSchema = Type.Object({ subscription: Type.Object({ ...SubscriptionSchema.properties, created_at: Type.String() }, { additionalProperties: false }), consumer: ConsumerSchema, resync_required: Type.Boolean() }, { additionalProperties: false });
export function validateDiscoveryQuery(schema, value) { if (!Value.Check(schema, value))
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid discovery read parameters.', 400); }
export function isRelationReadView(value) { return Value.Check(RelationReadViewSchema, value) && isCheckInstant(value.created_at) && [value.source_status, value.target_status].every((status, index) => status === 'redacted' ? (index ? value.target_has_newer_revision : value.source_has_newer_revision) === null : typeof (index ? value.target_has_newer_revision : value.source_has_newer_revision) === 'boolean'); }
export function isPostRelationsPage(value) { return Value.Check(PostRelationsPageSchema, value) && value.data.relations.every(isRelationReadView) && (!value.meta.truncated || value.meta.next_cursor !== null); }
export function isConsumerLookupView(value) { return Value.Check(ConsumerLookupViewSchema, value) && value.consumer.subscription_id === value.subscription.id && isCheckInstant(value.subscription.created_at); }
export const isGlobalRead = (name, args) => name === 'forum_read' && args !== null && typeof args === 'object' && ['me', 'spaces'].includes(args.kind);
const spacesPageSchema = Type.Object({ data: Type.Array({ ...SpaceSchema, properties: { ...SpaceSchema.properties, created_at: Type.String() } }), meta: Type.Object({ truncated: Type.Literal(false), next_cursor: Type.Union([Type.String(), Type.Null()]) }, { additionalProperties: false }) }, { additionalProperties: false });
export function isSpacesPage(value) { return Value.Check(spacesPageSchema, value) && value.data.every(space => isCheckInstant(space.created_at)); }
const threadPageWire = Type.Object({ data: Type.Object({ thread: Type.Object({ ...ThreadSchema.properties, created_at: Type.String(), updated_at: Type.String() }, { additionalProperties: false }), posts: Type.Array(Type.Object({ ...ThreadPostDirectoryItemSchema.properties, created_at: Type.String() }, { additionalProperties: false }), { maxItems: 100 }) }, { additionalProperties: false }), meta: Type.Object({ truncated: Type.Boolean(), next_cursor: Type.Union([Type.String({ minLength: 1 }), Type.Null()]) }, { additionalProperties: false }) }, { additionalProperties: false });
export function isThreadPostsPageForQuery(value, spaceId, threadId, query) {
    if (!Value.Check(threadPageWire, value) || value.data.thread.id !== threadId || value.data.thread.space_id !== spaceId || value.data.posts.length > (query?.limit ?? 20) || (value.meta.truncated && value.meta.next_cursor === null) || (value.meta.next_cursor !== null && value.data.posts.length === 0))
        return false;
    return value.data.posts.every(post => post.space_id === spaceId && post.thread_id === threadId && (!('title' in post) || (query?.include_titles === true && post.lifecycle !== 'redacted')));
}
//# sourceMappingURL=discovery-reads.js.map