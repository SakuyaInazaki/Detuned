import { Static } from '@sinclair/typebox';
export declare const EventTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>;
export type EventType = Static<typeof EventTypeSchema>;
export declare const EventVisibilitySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"review_assignment">]>;
export type EventVisibility = Static<typeof EventVisibilitySchema>;
export declare const EventSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    seq: import("@sinclair/typebox").TInteger;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>;
    object_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
    visibility: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"review_assignment">]>;
    actor_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Event = Static<typeof EventSchema>;
export declare const SubscriptionStartSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"beginning">, import("@sinclair/typebox").TLiteral<"now">, import("@sinclair/typebox").TLiteral<"context_checkpoint">]>;
export type SubscriptionStart = Static<typeof SubscriptionStartSchema>;
/** Shared HTTP/tool advertisement and direct-core start/token shape constraint. */
export declare const SubscriptionStartConstraintSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    start: import("@sinclair/typebox").TLiteral<"context_checkpoint">;
    checkpoint_token: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    start: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"beginning">, import("@sinclair/typebox").TLiteral<"now">]>>;
    checkpoint_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNever>;
}>]>;
export declare function isSubscriptionStartValid(value: unknown): boolean;
export declare const CreateSubscriptionRequestSchema: import("@sinclair/typebox").TObject<{
    thread_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
    consumer_key: import("@sinclair/typebox").TString;
    start: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"beginning">, import("@sinclair/typebox").TLiteral<"now">, import("@sinclair/typebox").TLiteral<"context_checkpoint">]>>;
    checkpoint_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type CreateSubscriptionRequest = Static<typeof CreateSubscriptionRequestSchema>;
export declare const SubscriptionSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    thread_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    event_types: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Subscription = Static<typeof SubscriptionSchema>;
export declare const ConsumerSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    subscription_id: import("@sinclair/typebox").TString;
    consumer_key: import("@sinclair/typebox").TString;
    ack_seq: import("@sinclair/typebox").TInteger;
    version: import("@sinclair/typebox").TInteger;
    active_batch_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    acl_epoch: import("@sinclair/typebox").TInteger;
}>;
export type Consumer = Static<typeof ConsumerSchema>;
export declare const PollRequestSchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    wait_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type PollRequest = Static<typeof PollRequestSchema>;
export declare const PollResponseDataSchema: import("@sinclair/typebox").TObject<{
    batch_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    events: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        seq: import("@sinclair/typebox").TInteger;
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>;
        object_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
        visibility: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"review_assignment">]>;
        actor_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
    }>>;
    next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    has_more: import("@sinclair/typebox").TBoolean;
}>;
export type PollResponseData = Static<typeof PollResponseDataSchema>;
export declare const AckRequestSchema: import("@sinclair/typebox").TObject<{
    batch_id: import("@sinclair/typebox").TString;
    next_cursor: import("@sinclair/typebox").TString;
}>;
export type AckRequest = Static<typeof AckRequestSchema>;
export declare const AckResponseDataSchema: import("@sinclair/typebox").TObject<{
    confirmed: import("@sinclair/typebox").TBoolean;
    acknowledged_batch_id: import("@sinclair/typebox").TString;
}>;
export type AckResponseData = Static<typeof AckResponseDataSchema>;
//# sourceMappingURL=events.d.ts.map