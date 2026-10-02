import { Static } from '@sinclair/typebox';
export declare const CreateActorRequestSchema: import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"service">]>;
    display_name: import("@sinclair/typebox").TString;
}>;
export type CreateActorRequest = Static<typeof CreateActorRequestSchema>;
export declare const CreateCredentialRequestSchema: import("@sinclair/typebox").TObject<{
    actor_id: import("@sinclair/typebox").TString;
    allowed_space_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    capabilities: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"admin">]>>>;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
}>;
export type CreateCredentialRequest = Static<typeof CreateCredentialRequestSchema>;
export declare const CreateMembershipRequestSchema: import("@sinclair/typebox").TObject<{
    actor_id: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"owner">, import("@sinclair/typebox").TLiteral<"maintainer">, import("@sinclair/typebox").TLiteral<"contributor">, import("@sinclair/typebox").TLiteral<"observer">]>;
    reviewer_eligible: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    independence_group: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
}>;
export type CreateMembershipRequest = Static<typeof CreateMembershipRequestSchema>;
export declare const PatchMembershipRequestSchema: import("@sinclair/typebox").TObject<{
    role: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"owner">, import("@sinclair/typebox").TLiteral<"maintainer">, import("@sinclair/typebox").TLiteral<"contributor">, import("@sinclair/typebox").TLiteral<"observer">]>>;
    reviewer_eligible: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    active: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    independence_group: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
}>;
export type PatchMembershipRequest = Static<typeof PatchMembershipRequestSchema>;
export declare const CreateRedactionRequestSchema: import("@sinclair/typebox").TObject<{
    target_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"post">, import("@sinclair/typebox").TLiteral<"artifact">]>;
    target_id: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TString;
}>;
export type CreateRedactionRequest = Static<typeof CreateRedactionRequestSchema>;
//# sourceMappingURL=admin.d.ts.map