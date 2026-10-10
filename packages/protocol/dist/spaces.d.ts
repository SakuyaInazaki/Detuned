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
export declare const SpaceRevisionRefSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>;
export type SpaceRevisionRef = Static<typeof SpaceRevisionRefSchema>;
export declare const SpaceRulesDocumentSchema: import("@sinclair/typebox").TObject<{
    objective: import("@sinclair/typebox").TString;
    rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type SpaceRulesDocument = Static<typeof SpaceRulesDocumentSchema>;
export declare function encodeSpaceRulesDocument(document: SpaceRulesDocument): string;
export declare const SPACE_REVISION_READ_LIMITS: Readonly<{
    cursor_chars: 4096;
    cursor_ttl_seconds: 86400;
}>;
export declare const SPACE_REVISION_CURSOR_ERROR_MESSAGE = "\u7A7A\u95F4\u4FEE\u8BA2\u6E38\u6807\u65E0\u6548\uFF0C\u8BF7\u53BB\u6389 cursor \u91CD\u65B0\u8BFB\u53D6\u6307\u5B9A\u4FEE\u8BA2\u3002";
export declare const SpaceRevisionReadQuerySchema: import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type SpaceRevisionReadQuery = Static<typeof SpaceRevisionReadQuerySchema>;
export declare function validateSpaceRevisionReadQuery(query: SpaceRevisionReadQuery): void;
export declare const SpaceRevisionReadCursorPayloadSchema: import("@sinclair/typebox").TObject<{
    v: import("@sinclair/typebox").TLiteral<1>;
    purpose: import("@sinclair/typebox").TLiteral<"space_revision_read">;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    byte_offset: import("@sinclair/typebox").TInteger;
    exp: import("@sinclair/typebox").TInteger;
}>;
export type SpaceRevisionReadCursorPayload = Static<typeof SpaceRevisionReadCursorPayloadSchema>;
export declare function isSpaceRevisionReadCursorPayload(value: unknown): value is SpaceRevisionReadCursorPayload;
export declare const SpaceRevisionPageSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        complete: import("@sinclair/typebox").TLiteral<false>;
        ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        encoding: import("@sinclair/typebox").TLiteral<"json">;
        chunk: import("@sinclair/typebox").TString;
        start_byte: import("@sinclair/typebox").TInteger;
        end_byte: import("@sinclair/typebox").TInteger;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<true>;
        next_cursor: import("@sinclair/typebox").TString;
    }>;
}>, import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        complete: import("@sinclair/typebox").TLiteral<true>;
        ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        encoding: import("@sinclair/typebox").TLiteral<"json">;
        chunk: import("@sinclair/typebox").TString;
        start_byte: import("@sinclair/typebox").TInteger;
        end_byte: import("@sinclair/typebox").TInteger;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<false>;
        next_cursor: import("@sinclair/typebox").TNull;
    }>;
}>]>;
export type SpaceRevisionPage = Static<typeof SpaceRevisionPageSchema>;
export declare const SpaceRevisionEnvelopeSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        complete: import("@sinclair/typebox").TLiteral<false>;
        ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        encoding: import("@sinclair/typebox").TLiteral<"json">;
        chunk: import("@sinclair/typebox").TString;
        start_byte: import("@sinclair/typebox").TInteger;
        end_byte: import("@sinclair/typebox").TInteger;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<true>;
        next_cursor: import("@sinclair/typebox").TString;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
} | {
    data: import("@sinclair/typebox").TObject<{
        complete: import("@sinclair/typebox").TLiteral<true>;
        ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        encoding: import("@sinclair/typebox").TLiteral<"json">;
        chunk: import("@sinclair/typebox").TString;
        start_byte: import("@sinclair/typebox").TInteger;
        end_byte: import("@sinclair/typebox").TInteger;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<false>;
        next_cursor: import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
}>[]>;
export type SpaceRevisionEnvelope = {
    api_version: '1';
    request_id: string;
} & SpaceRevisionPage;
export declare function buildSpaceRevisionEnvelope(requestId: string, page: SpaceRevisionPage): SpaceRevisionEnvelope;
export declare function serializeSpaceRevisionEnvelope(requestId: string, page: SpaceRevisionPage): string;
export declare function spaceRevisionEnvelopeBytes(requestId: string, page: SpaceRevisionPage): number;
//# sourceMappingURL=spaces.d.ts.map