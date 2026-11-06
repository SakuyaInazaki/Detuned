import { type ThreadPostsPage, type ThreadPostsReadQuery } from './threads.js';
import { type Static } from '@sinclair/typebox';
export declare const RelationReadViewSchema: import("@sinclair/typebox").TObject<{
    relation_id: import("@sinclair/typebox").TString;
    relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    creator_id: import("@sinclair/typebox").TString;
    source_author_id: import("@sinclair/typebox").TString;
    target_author_id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
    version: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
    source_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"redacted">]>;
    target_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"redacted">]>;
    source_has_newer_revision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
    target_has_newer_revision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
}>;
export type RelationReadView = Static<typeof RelationReadViewSchema>;
export declare const PostRelationsQuerySchema: import("@sinclair/typebox").TObject<{
    direction: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"in">, import("@sinclair/typebox").TLiteral<"out">, import("@sinclair/typebox").TLiteral<"both">]>>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type PostRelationsQuery = Static<typeof PostRelationsQuerySchema>;
export declare const PostRelationsPageSchema: import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        relations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            relation_id: import("@sinclair/typebox").TString;
            relation_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
            source_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            target_ref: import("@sinclair/typebox").TObject<{
                post_id: import("@sinclair/typebox").TString;
                revision: import("@sinclair/typebox").TInteger;
            }>;
            creator_id: import("@sinclair/typebox").TString;
            source_author_id: import("@sinclair/typebox").TString;
            target_author_id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
            version: import("@sinclair/typebox").TInteger;
            created_at: import("@sinclair/typebox").TString;
            source_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"redacted">]>;
            target_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"redacted">]>;
            source_has_newer_revision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
            target_has_newer_revision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNull]>;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
}>;
export type PostRelationsPage = Static<typeof PostRelationsPageSchema>;
export declare const ConsumerLookupQuerySchema: import("@sinclair/typebox").TObject<{
    consumer_key: import("@sinclair/typebox").TString;
    thread_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
}>;
export type ConsumerLookupQuery = Static<typeof ConsumerLookupQuerySchema>;
export declare const ConsumerLookupViewSchema: import("@sinclair/typebox").TObject<{
    subscription: import("@sinclair/typebox").TObject<{
        created_at: import("@sinclair/typebox").TString;
        id: import("@sinclair/typebox").TString;
        actor_id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        thread_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        event_types: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>;
    }>;
    consumer: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        subscription_id: import("@sinclair/typebox").TString;
        consumer_key: import("@sinclair/typebox").TString;
        ack_seq: import("@sinclair/typebox").TInteger;
        version: import("@sinclair/typebox").TInteger;
        active_batch_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        acl_epoch: import("@sinclair/typebox").TInteger;
    }>;
    resync_required: import("@sinclair/typebox").TBoolean;
}>;
export type ConsumerLookupView = Static<typeof ConsumerLookupViewSchema>;
export declare function validateDiscoveryQuery(schema: typeof PostRelationsQuerySchema | typeof ConsumerLookupQuerySchema, value: unknown): void;
export declare function isRelationReadView(value: unknown): value is RelationReadView;
export declare function isPostRelationsPage(value: unknown): value is PostRelationsPage;
export declare function isConsumerLookupView(value: unknown): value is ConsumerLookupView;
export declare const isGlobalRead: (name: string, args: unknown) => boolean;
export declare function isSpacesPage(value: unknown): boolean;
export declare function isThreadPostsPageForQuery(value: unknown, spaceId: string, threadId: string, query?: ThreadPostsReadQuery): value is ThreadPostsPage;
//# sourceMappingURL=discovery-reads.d.ts.map