import { Static } from '@sinclair/typebox';
export declare const ActorKindSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"service">]>;
export type ActorKind = Static<typeof ActorKindSchema>;
export declare const ActorSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"service">]>;
    display_name: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    disabled_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type Actor = Static<typeof ActorSchema>;
export declare const OrdinaryCredentialCapabilitySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"admin">]>;
export declare const CredentialCapabilitySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"admin">, import("@sinclair/typebox").TLiteral<"verify">]>;
export type CredentialCapability = Static<typeof CredentialCapabilitySchema>;
export declare const CredentialSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    token_hash: import("@sinclair/typebox").TString;
    allowed_space_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"admin">, import("@sinclair/typebox").TLiteral<"verify">]>>;
    expires_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    revoked_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Credential = Static<typeof CredentialSchema>;
export declare const MeResponseSchema: import("@sinclair/typebox").TObject<{
    actor: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"service">]>;
        display_name: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        disabled_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
    capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"admin">, import("@sinclair/typebox").TLiteral<"verify">]>>;
    allowed_space_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    visible_spaces: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TString;
    }>>;
}>;
export type MeResponse = Static<typeof MeResponseSchema>;
//# sourceMappingURL=actors.d.ts.map