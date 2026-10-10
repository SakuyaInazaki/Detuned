import { Static } from '@sinclair/typebox';
export declare const POST_KINDS: readonly ["note", "question", "proposal", "claim", "objection", "failure", "summary", "review", "decision"];
export declare const PostKindSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
export type PostKind = Static<typeof PostKindSchema>;
export declare const PostLifecycleSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"redacted">]>;
export type PostLifecycle = Static<typeof PostLifecycleSchema>;
export declare const FailureCategorySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
export type FailureCategory = Static<typeof FailureCategorySchema>;
export declare const ProposalClaimStructuredSchema: import("@sinclair/typebox").TObject<{
    statement: import("@sinclair/typebox").TString;
    assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    scope: import("@sinclair/typebox").TString;
    falsification_plan: import("@sinclair/typebox").TString;
}>;
export declare const ObjectionStructuredSchema: import("@sinclair/typebox").TObject<{
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    issue: import("@sinclair/typebox").TString;
    impact: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    verification_plan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const FailureStructuredSchema: import("@sinclair/typebox").TObject<{
    attempt: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
    assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    tested_scope: import("@sinclair/typebox").TString;
    expected: import("@sinclair/typebox").TString;
    observed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>;
    evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    ruled_out: import("@sinclair/typebox").TString;
    not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export declare const SummaryStructuredSchema: import("@sinclair/typebox").TObject<{
    source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
}>;
export declare const NEW_TYPED_STRUCTURED_SCHEMAS: {
    readonly proposal: import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TString;
        scope: import("@sinclair/typebox").TString;
        falsification_plan: import("@sinclair/typebox").TString;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    readonly claim: import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TString;
        scope: import("@sinclair/typebox").TString;
        falsification_plan: import("@sinclair/typebox").TString;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    readonly failure: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        evidence_state: import("@sinclair/typebox").TLiteral<"provided">;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        attempt: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        tested_scope: import("@sinclair/typebox").TString;
        expected: import("@sinclair/typebox").TString;
        observed: import("@sinclair/typebox").TString;
        evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        ruled_out: import("@sinclair/typebox").TString;
        not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        evidence_state: import("@sinclair/typebox").TLiteral<"unverified">;
        evidence_missing_reason: import("@sinclair/typebox").TString;
        attempt: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        tested_scope: import("@sinclair/typebox").TString;
        expected: import("@sinclair/typebox").TString;
        observed: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        ruled_out: import("@sinclair/typebox").TString;
        not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>]>;
    readonly summary: import("@sinclair/typebox").TObject<{
        source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
    }>;
};
export type NewTypedStructured = Static<(typeof NEW_TYPED_STRUCTURED_SCHEMAS)[keyof typeof NEW_TYPED_STRUCTURED_SCHEMAS]>;
/** Pure schema validation, called only inside a new idempotent business action.
 * Reference readability/authorization is a separate core responsibility.
 */
export declare function parseNewTypedStructured(kind: PostKind, structured: unknown): NewTypedStructured | undefined;
export declare const NEW_TYPED_WRITE_POLICY_DESCRIPTION = "\u65B0\u5E42\u7B49 action \u7684 proposal/claim/failure/summary structured \u5FC5\u987B\u7B26\u5408\u5171\u4EAB\u4E25\u683C\u65B0\u5199 schema\uFF1B\u517C\u5BB9 wire envelope \u4FDD\u7559\u4EE5\u652F\u6301\u5386\u53F2\u6210\u529F\u8BF7\u6C42\u539F key + \u539F payload \u91CD\u653E\uFF0C\u4E0D\u6CE8\u5165\u9ED8\u8BA4\u5B57\u6BB5\u3002\u5F15\u7528\u6743\u9650\u4E0E\u53EF\u8BFB\u6027\u7531 core \u6821\u9A8C\uFF1Bprovided \u53EA\u8868\u793A\u63D0\u4F9B\u5F15\u7528\uFF0C\u4E0D\u8868\u793A\u673A\u5668\u9A8C\u8BC1\u7ED3\u8BBA\u3002";
export declare const InformalReviewDecisionStructuredSchema: import("@sinclair/typebox").TObject<{
    subject_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
    informal: import("@sinclair/typebox").TLiteral<true>;
}>;
export declare const StructuredContentSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    statement: import("@sinclair/typebox").TString;
    assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    scope: import("@sinclair/typebox").TString;
    falsification_plan: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    issue: import("@sinclair/typebox").TString;
    impact: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    verification_plan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    attempt: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
    assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    tested_scope: import("@sinclair/typebox").TString;
    expected: import("@sinclair/typebox").TString;
    observed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>;
    evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    ruled_out: import("@sinclair/typebox").TString;
    not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
}>, import("@sinclair/typebox").TObject<{
    subject_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
    informal: import("@sinclair/typebox").TLiteral<true>;
}>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>]>;
export type StructuredContent = Static<typeof StructuredContentSchema>;
export declare const PostRevisionSchema: import("@sinclair/typebox").TObject<{
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    body: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    structured: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TString;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        scope: import("@sinclair/typebox").TString;
        falsification_plan: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        issue: import("@sinclair/typebox").TString;
        impact: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        verification_plan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        attempt: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        tested_scope: import("@sinclair/typebox").TString;
        expected: import("@sinclair/typebox").TString;
        observed: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>;
        evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        ruled_out: import("@sinclair/typebox").TString;
        not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
    }>, import("@sinclair/typebox").TObject<{
        subject_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
        informal: import("@sinclair/typebox").TLiteral<true>;
    }>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>]>;
    content_hash: import("@sinclair/typebox").TString;
    editor_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type PostRevision = Static<typeof PostRevisionSchema>;
export declare const PostSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    thread_id: import("@sinclair/typebox").TString;
    author_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
    current_revision: import("@sinclair/typebox").TInteger;
    lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"redacted">]>;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Post = Static<typeof PostSchema>;
export declare const CreatePostRelationInputSchema: import("@sinclair/typebox").TObject<{
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
}>;
export type CreatePostRelationInput = Static<typeof CreatePostRelationInputSchema>;
export declare const CreatePostRequestSchema: import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    body: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    structured: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TString;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        scope: import("@sinclair/typebox").TString;
        falsification_plan: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        issue: import("@sinclair/typebox").TString;
        impact: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        verification_plan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        attempt: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        tested_scope: import("@sinclair/typebox").TString;
        expected: import("@sinclair/typebox").TString;
        observed: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>;
        evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        ruled_out: import("@sinclair/typebox").TString;
        not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
    }>, import("@sinclair/typebox").TObject<{
        subject_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
        informal: import("@sinclair/typebox").TLiteral<true>;
    }>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>]>>;
    refs: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
    }>>>;
    artifact_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type CreatePostRequest = Static<typeof CreatePostRequestSchema>;
export declare const CreatePostRevisionRequestSchema: import("@sinclair/typebox").TObject<{
    expected_revision: import("@sinclair/typebox").TInteger;
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    body: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    structured: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TString;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        scope: import("@sinclair/typebox").TString;
        falsification_plan: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        issue: import("@sinclair/typebox").TString;
        impact: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        verification_plan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        attempt: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"counterexample">, import("@sinclair/typebox").TLiteral<"proof_gap">, import("@sinclair/typebox").TLiteral<"test_failure">, import("@sinclair/typebox").TLiteral<"performance_failure">, import("@sinclair/typebox").TLiteral<"environment_error">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>;
        assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        tested_scope: import("@sinclair/typebox").TString;
        expected: import("@sinclair/typebox").TString;
        observed: import("@sinclair/typebox").TString;
        evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"post">;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>, import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TLiteral<"artifact">;
            artifact_id: import("@sinclair/typebox").TString;
        }>]>>;
        evidence_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provided">, import("@sinclair/typebox").TLiteral<"unverified">]>;
        evidence_missing_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        ruled_out: import("@sinclair/typebox").TString;
        not_ruled_out: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        retry_when: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>, import("@sinclair/typebox").TObject<{
        source_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
    }>, import("@sinclair/typebox").TObject<{
        subject_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
        informal: import("@sinclair/typebox").TLiteral<true>;
    }>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>]>>;
    refs: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        target_ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
    }>>>;
    artifact_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type CreatePostRevisionRequest = Static<typeof CreatePostRevisionRequestSchema>;
export declare const WithdrawPostRequestSchema: import("@sinclair/typebox").TObject<{
    expected_revision: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
}>;
export type WithdrawPostRequest = Static<typeof WithdrawPostRequestSchema>;
/** Read projection of persisted content; never apply new-write validation or defaults. */
export type PostRevisionContentDocument = Pick<PostRevision, 'title' | 'summary' | 'body' | 'tags' | 'structured'>;
export declare function encodePostRevisionContentDocument(document: PostRevisionContentDocument): string;
export declare const PostRevisionContentRefSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>;
export type PostRevisionContentRef = Static<typeof PostRevisionContentRefSchema>;
export declare const POST_REVISION_READ_LIMITS: Readonly<{
    cursor_chars: 4096;
    cursor_ttl_seconds: 86400;
}>;
export declare const POST_REVISION_CURSOR_ERROR_MESSAGE = "Invalid or expired post revision cursor. Remove cursor and retry the same fixed revision.";
export declare const PostRevisionReadQuerySchema: import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type PostRevisionReadQuery = Static<typeof PostRevisionReadQuerySchema>;
export declare function validatePostRevisionReadQuery(query: PostRevisionReadQuery): void;
export declare const PostRevisionReadCursorPayloadSchema: import("@sinclair/typebox").TObject<{
    v: import("@sinclair/typebox").TLiteral<1>;
    purpose: import("@sinclair/typebox").TLiteral<"post_revision_read">;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
    byte_offset: import("@sinclair/typebox").TInteger;
    exp: import("@sinclair/typebox").TInteger;
}>;
export type PostRevisionReadCursorPayload = Static<typeof PostRevisionReadCursorPayloadSchema>;
export declare function isPostRevisionReadCursorPayload(value: unknown): value is PostRevisionReadCursorPayload;
export declare const PostRevisionContentPageSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        complete: import("@sinclair/typebox").TLiteral<false>;
        ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        post_kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
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
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        post_kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
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
export type PostRevisionContentPage = Static<typeof PostRevisionContentPageSchema>;
export declare const PostRevisionContentEnvelopeSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        complete: import("@sinclair/typebox").TLiteral<false>;
        ref: import("@sinclair/typebox").TObject<{
            space_id: import("@sinclair/typebox").TString;
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        post_kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
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
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        post_kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
        has_newer_revision: import("@sinclair/typebox").TBoolean;
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
export type PostRevisionContentEnvelope = {
    api_version: '1';
    request_id: string;
} & PostRevisionContentPage;
export declare function buildPostRevisionContentEnvelope(requestId: string, page: PostRevisionContentPage): PostRevisionContentEnvelope;
export declare function serializePostRevisionContentEnvelope(requestId: string, page: PostRevisionContentPage): string;
export declare function postRevisionContentEnvelopeBytes(requestId: string, page: PostRevisionContentPage): number;
//# sourceMappingURL=posts.d.ts.map