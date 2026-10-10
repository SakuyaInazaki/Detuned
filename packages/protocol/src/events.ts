import { Type, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const EventTypeSchema = Type.Union([
  Type.Literal('space.revised'),
  Type.Literal('thread.created'),
  Type.Literal('thread.updated'),
  Type.Literal('post.created'),
  Type.Literal('post.revised'),
  Type.Literal('post.withdrawn'),
  Type.Literal('post.redacted'),
  Type.Literal('relation.created'),
  Type.Literal('relation.resolved'),
  Type.Literal('relation.reopened'),
  Type.Literal('artifact.created'),
  Type.Literal('artifact.redacted'),
  Type.Literal('review.requested'),
  Type.Literal('review.cancelled'),
  Type.Literal('review.submitted'),
  Type.Literal('review.revealed'),
  Type.Literal('review.finalized'),
  Type.Literal('review.stale'),
  Type.Literal('review.invalidated'),
  Type.Literal('check.created'),
  Type.Literal('check.completed'),
  Type.Literal('check.invalidated'),
]);

export type EventType = Static<typeof EventTypeSchema>;

export const EventVisibilitySchema = Type.Union([
  Type.Literal('public'),
  Type.Literal('review_assignment'),
]);

export type EventVisibility = Static<typeof EventVisibilitySchema>;

export const EventSchema = Type.Object({
  id: Type.String(),
  space_id: Type.String(),
  seq: Type.Integer({ minimum: 1 }),
  type: EventTypeSchema,
  object_id: Type.String(),
  revision: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  visibility: EventVisibilitySchema,
  actor_id: Type.String(),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Event = Static<typeof EventSchema>;

export const SubscriptionStartSchema = Type.Union([
  Type.Literal('beginning'),
  Type.Literal('now'),
  Type.Literal('context_checkpoint'),
]);

export type SubscriptionStart = Static<typeof SubscriptionStartSchema>;

/** Shared HTTP/tool advertisement and direct-core start/token shape constraint. */
export const SubscriptionStartConstraintSchema = Type.Union([
  Type.Object({
    start: Type.Literal('context_checkpoint'),
    checkpoint_token: Type.String({ minLength: 1 }),
  }, { additionalProperties: true }),
  Type.Object({
    start: Type.Optional(Type.Union([Type.Literal('beginning'), Type.Literal('now')])),
    checkpoint_token: Type.Optional(Type.Never()),
  }, { additionalProperties: true }),
]);

export function isSubscriptionStartValid(value: unknown): boolean {
  return Value.Check(SubscriptionStartConstraintSchema, value);
}

export const CreateSubscriptionRequestSchema = Type.Object({
  thread_ids: Type.Optional(Type.Array(Type.String())),
  event_types: Type.Optional(Type.Array(EventTypeSchema)),
  consumer_key: Type.String({ minLength: 1, maxLength: 64 }),
  start: Type.Optional(SubscriptionStartSchema),
  checkpoint_token: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false, allOf: [SubscriptionStartConstraintSchema] });

export type CreateSubscriptionRequest = Static<typeof CreateSubscriptionRequestSchema>;

export const SubscriptionSchema = Type.Object({
  id: Type.String(),
  actor_id: Type.String(),
  space_id: Type.String(),
  thread_ids: Type.Array(Type.String()),
  event_types: Type.Array(EventTypeSchema),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Subscription = Static<typeof SubscriptionSchema>;

export const ConsumerSchema = Type.Object({
  id: Type.String(),
  subscription_id: Type.String(),
  consumer_key: Type.String(),
  ack_seq: Type.Integer({ minimum: 0 }),
  version: Type.Integer({ minimum: 1 }),
  active_batch_id: Type.Union([Type.String(), Type.Null()]),
  acl_epoch: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });

export type Consumer = Static<typeof ConsumerSchema>;

export const PollRequestSchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  wait_ms: Type.Optional(Type.Integer({ minimum: 0, maximum: 25000, default: 0 })),
}, { additionalProperties: false });

export type PollRequest = Static<typeof PollRequestSchema>;

export const PollResponseDataSchema = Type.Object({
  batch_id: Type.Union([Type.String(), Type.Null()]),
  events: Type.Array(EventSchema),
  next_cursor: Type.Union([Type.String(), Type.Null()]),
  has_more: Type.Boolean(),
}, { additionalProperties: false });

export type PollResponseData = Static<typeof PollResponseDataSchema>;

export const AckRequestSchema = Type.Object({
  batch_id: Type.String({ minLength: 1 }),
  next_cursor: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export type AckRequest = Static<typeof AckRequestSchema>;

export const AckResponseDataSchema = Type.Object({
  confirmed: Type.Boolean(),
  acknowledged_batch_id: Type.String(),
}, { additionalProperties: false });

export type AckResponseData = Static<typeof AckResponseDataSchema>;
