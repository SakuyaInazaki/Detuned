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
export declare const CreateCredentialDataSchema: import("@sinclair/typebox").TObject<{
    credential_id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    token: import("@sinclair/typebox").TString;
}>;
export type CreateCredentialData = Static<typeof CreateCredentialDataSchema>;
export declare const RevokeCredentialDataSchema: import("@sinclair/typebox").TObject<{
    revoked: import("@sinclair/typebox").TLiteral<true>;
}>;
export type RevokeCredentialData = Static<typeof RevokeCredentialDataSchema>;
export declare const DeactivateMembershipDataSchema: import("@sinclair/typebox").TObject<{
    deactivated: import("@sinclair/typebox").TLiteral<true>;
}>;
export type DeactivateMembershipData = Static<typeof DeactivateMembershipDataSchema>;
export declare const RedactionResultSchema: import("@sinclair/typebox").TObject<{
    redaction_id: import("@sinclair/typebox").TString;
}>;
export type RedactionResult = Static<typeof RedactionResultSchema>;
//# sourceMappingURL=admin.d.ts.map