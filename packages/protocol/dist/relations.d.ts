import { Static } from '@sinclair/typebox';
export declare const RelationTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
export type RelationType = Static<typeof RelationTypeSchema>;
export declare const RelationStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
export type RelationState = Static<typeof RelationStateSchema>;
export declare const RelationSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    source_post_id: import("@sinclair/typebox").TString;
    source_revision: import("@sinclair/typebox").TInteger;
    target_post_id: import("@sinclair/typebox").TString;
    target_revision: import("@sinclair/typebox").TInteger;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"resolved">]>;
    version: import("@sinclair/typebox").TInteger;
    creator_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Relation = Static<typeof RelationSchema>;
export declare const RelationResolutionActionSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
export type RelationResolutionAction = Static<typeof RelationResolutionActionSchema>;
export declare const RelationResolutionSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    relation_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    resolver_id: import("@sinclair/typebox").TString;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"resolve">, import("@sinclair/typebox").TLiteral<"reopen">]>;
    created_at: import("@sinclair/typebox").TString;
}>;
export type RelationResolution = Static<typeof RelationResolutionSchema>;
export declare const CreateRelationRequestSchema: import("@sinclair/typebox").TObject<{
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
}>;
export type CreateRelationRequest = Static<typeof CreateRelationRequestSchema>;
export declare const ResolveRelationRequestSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
}>;
export type ResolveRelationRequest = Static<typeof ResolveRelationRequestSchema>;
export declare const ReopenRelationRequestSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
}>;
export type ReopenRelationRequest = Static<typeof ReopenRelationRequestSchema>;
//# sourceMappingURL=relations.d.ts.map