import { Static } from '@sinclair/typebox';
export declare const CheckProfileSchema: import("@sinclair/typebox").TObject<{
    verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    config_sha256: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
}>;
export type CheckProfile = Static<typeof CheckProfileSchema>;
export declare const ReviewPolicySchema: import("@sinclair/typebox").TObject<{
    enabled: import("@sinclair/typebox").TBoolean;
    required_reviewers: import("@sinclair/typebox").TInteger;
    exclude_contributors: import("@sinclair/typebox").TBoolean;
    distinct_actors: import("@sinclair/typebox").TBoolean;
    distinct_independence_groups: import("@sinclair/typebox").TBoolean;
    seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
    invalidate_on_revision: import("@sinclair/typebox").TBoolean;
    required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    allow_open_objections: import("@sinclair/typebox").TBoolean;
}>;
export type ReviewPolicy = Static<typeof ReviewPolicySchema>;
export declare const SpaceRoleSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"owner">, import("@sinclair/typebox").TLiteral<"maintainer">, import("@sinclair/typebox").TLiteral<"contributor">, import("@sinclair/typebox").TLiteral<"observer">]>;
export type SpaceRole = Static<typeof SpaceRoleSchema>;
export declare const MembershipSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"owner">, import("@sinclair/typebox").TLiteral<"maintainer">, import("@sinclair/typebox").TLiteral<"contributor">, import("@sinclair/typebox").TLiteral<"observer">]>;
    active: import("@sinclair/typebox").TBoolean;
    reviewer_eligible: import("@sinclair/typebox").TBoolean;
    independence_group: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type Membership = Static<typeof MembershipSchema>;
export declare const SpaceRevisionSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    objective: import("@sinclair/typebox").TString;
    rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    review_policy: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        required_reviewers: import("@sinclair/typebox").TInteger;
        exclude_contributors: import("@sinclair/typebox").TBoolean;
        distinct_actors: import("@sinclair/typebox").TBoolean;
        distinct_independence_groups: import("@sinclair/typebox").TBoolean;
        seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
        invalidate_on_revision: import("@sinclair/typebox").TBoolean;
        required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        allow_open_objections: import("@sinclair/typebox").TBoolean;
    }>;
    check_profiles: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        config_sha256: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
    }>>;
    pinned_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
    editor_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type SpaceRevision = Static<typeof SpaceRevisionSchema>;
export declare const SpaceSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    slug: import("@sinclair/typebox").TString;
    current_revision: import("@sinclair/typebox").TInteger;
    policy_revision: import("@sinclair/typebox").TInteger;
    acl_epoch: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Space = Static<typeof SpaceSchema>;
export declare const CreateSpaceRequestSchema: import("@sinclair/typebox").TObject<{
    slug: import("@sinclair/typebox").TString;
    objective: import("@sinclair/typebox").TString;
    rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    review_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        required_reviewers: import("@sinclair/typebox").TInteger;
        exclude_contributors: import("@sinclair/typebox").TBoolean;
        distinct_actors: import("@sinclair/typebox").TBoolean;
        distinct_independence_groups: import("@sinclair/typebox").TBoolean;
        seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
        invalidate_on_revision: import("@sinclair/typebox").TBoolean;
        required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        allow_open_objections: import("@sinclair/typebox").TBoolean;
    }>>;
    check_profiles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        config_sha256: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
    }>>>;
}>;
export type CreateSpaceRequest = Static<typeof CreateSpaceRequestSchema>;
export declare const PatchSpaceRequestSchema: import("@sinclair/typebox").TObject<{
    expected_revision: import("@sinclair/typebox").TInteger;
    objective: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    rules: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    review_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        required_reviewers: import("@sinclair/typebox").TInteger;
        exclude_contributors: import("@sinclair/typebox").TBoolean;
        distinct_actors: import("@sinclair/typebox").TBoolean;
        distinct_independence_groups: import("@sinclair/typebox").TBoolean;
        seal_until_all_submitted: import("@sinclair/typebox").TBoolean;
        invalidate_on_revision: import("@sinclair/typebox").TBoolean;
        required_checks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        allow_open_objections: import("@sinclair/typebox").TBoolean;
    }>>;
    check_profiles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        verifier_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        config_sha256: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
    }>>>;
    pinned_refs: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>>;
}>;
export type PatchSpaceRequest = Static<typeof PatchSpaceRequestSchema>;
export declare const SessionSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    client_name: import("@sinclair/typebox").TString;
    client_version: import("@sinclair/typebox").TString;
    harness_session_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    metadata: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Session = Static<typeof SessionSchema>;
export declare const CreateSessionRequestSchema: import("@sinclair/typebox").TObject<{
    client_name: import("@sinclair/typebox").TString;
    client_version: import("@sinclair/typebox").TString;
    harness_session_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type CreateSessionRequest = Static<typeof CreateSessionRequestSchema>;
//# sourceMappingURL=spaces.d.ts.map