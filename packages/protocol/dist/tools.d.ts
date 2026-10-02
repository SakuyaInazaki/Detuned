import { Static, TSchema } from '@sinclair/typebox';
export declare const ToolContextParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ToolContextParams = Static<typeof ToolContextParamsSchema>;
export declare const ToolSearchParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    q: import("@sinclair/typebox").TString;
    filters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>>;
        tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ToolSearchParams = Static<typeof ToolSearchParamsSchema>;
export declare const ToolReadParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"thread">, import("@sinclair/typebox").TLiteral<"post">, import("@sinclair/typebox").TLiteral<"artifact">, import("@sinclair/typebox").TLiteral<"review">]>;
    id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ToolReadParams = Static<typeof ToolReadParamsSchema>;
export declare const ToolPublishThreadOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"thread">;
    title: import("@sinclair/typebox").TString;
    initial_post: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>;
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
    }>>;
}>;
export declare const ToolPublishPostOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"post">;
    thread_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>;
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
export declare const ToolPublishRevisionOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"revision">;
    post_id: import("@sinclair/typebox").TString;
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
export declare const ToolPublishWithdrawOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"withdraw">;
    post_id: import("@sinclair/typebox").TString;
    expected_revision: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
}>;
export declare const ToolPublishParamsUnion: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"thread">;
    title: import("@sinclair/typebox").TString;
    initial_post: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>;
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
    }>>;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"post">;
    thread_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>;
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
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"revision">;
    post_id: import("@sinclair/typebox").TString;
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
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"withdraw">;
    post_id: import("@sinclair/typebox").TString;
    expected_revision: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
}>]>;
export declare const ToolPublishParamsSchema: TSchema;
export type ToolPublishParams = Static<typeof ToolPublishParamsUnion>;
export declare const ToolRelateCreateOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"create">;
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
export declare const ToolRelateResolveOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"resolve">;
    relation_id: import("@sinclair/typebox").TString;
    expected_version: import("@sinclair/typebox").TInteger;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
}>;
export declare const ToolRelateReopenOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"reopen">;
    relation_id: import("@sinclair/typebox").TString;
    expected_version: import("@sinclair/typebox").TInteger;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
}>;
export declare const ToolRelateParamsUnion: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"create">;
    source_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cites">, import("@sinclair/typebox").TLiteral<"supports">, import("@sinclair/typebox").TLiteral<"challenges">, import("@sinclair/typebox").TLiteral<"supersedes">, import("@sinclair/typebox").TLiteral<"reproduces">, import("@sinclair/typebox").TLiteral<"addresses">]>;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"resolve">;
    relation_id: import("@sinclair/typebox").TString;
    expected_version: import("@sinclair/typebox").TInteger;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"reopen">;
    relation_id: import("@sinclair/typebox").TString;
    expected_version: import("@sinclair/typebox").TInteger;
    reason_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
}>]>;
export declare const ToolRelateParamsSchema: TSchema;
export type ToolRelateParams = Static<typeof ToolRelateParamsUnion>;
export declare const ToolSubscribeParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    consumer_key: import("@sinclair/typebox").TString;
    thread_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
    start: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"beginning">, import("@sinclair/typebox").TLiteral<"now">, import("@sinclair/typebox").TLiteral<"context_checkpoint">]>>;
    checkpoint_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ToolSubscribeParams = Static<typeof ToolSubscribeParamsSchema>;
export declare const ToolPollParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    consumer_id: import("@sinclair/typebox").TString;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    wait_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ToolPollParams = Static<typeof ToolPollParamsSchema>;
export declare const ToolAckParamsSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    consumer_id: import("@sinclair/typebox").TString;
    batch_id: import("@sinclair/typebox").TString;
    next_cursor: import("@sinclair/typebox").TString;
}>;
export type ToolAckParams = Static<typeof ToolAckParamsSchema>;
export declare const ToolReviewRequestOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"request">;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    dependency_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
    artifact_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    declared_contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_policy_revision: import("@sinclair/typebox").TInteger;
}>;
export declare const ToolReviewSubmitOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"submit">;
    request_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"complete">, import("@sinclair/typebox").TLiteral<"provisional">]>;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TString;
}>;
export declare const ToolReviewFinalizeOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"finalize">;
    request_id: import("@sinclair/typebox").TString;
    expected_phase: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>>;
}>;
export declare const ToolReviewCancelOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"cancel">;
    request_id: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TString;
}>;
export declare const ToolReviewParamsUnion: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"request">;
    target_ref: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>;
    dependency_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>>;
    artifact_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    declared_contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_policy_revision: import("@sinclair/typebox").TInteger;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"submit">;
    request_id: import("@sinclair/typebox").TString;
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"complete">, import("@sinclair/typebox").TLiteral<"provisional">]>;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"post">;
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"finalize">;
    request_id: import("@sinclair/typebox").TString;
    expected_phase: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"collecting">, import("@sinclair/typebox").TLiteral<"revealed">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"stale">, import("@sinclair/typebox").TLiteral<"cancelled">]>>;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"cancel">;
    request_id: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TString;
}>]>;
export declare const ToolReviewParamsSchema: TSchema;
export type ToolReviewParams = Static<typeof ToolReviewParamsUnion>;
export declare const DETUNED_TOOLS: readonly [{
    readonly name: "forum_context";
    readonly description: "获取指定空间的限长项目上下文（目标、有效规则、置顶摘要、未解决异议、近期失败与增量检查点）。";
    readonly schema: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
}, {
    readonly name: "forum_search";
    readonly description: "在空间可见内容中搜索（支持关键词、帖子类型、标签与主题过滤）。";
    readonly schema: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        q: import("@sinclair/typebox").TString;
        filters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"question">, import("@sinclair/typebox").TLiteral<"proposal">, import("@sinclair/typebox").TLiteral<"claim">, import("@sinclair/typebox").TLiteral<"objection">, import("@sinclair/typebox").TLiteral<"failure">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"decision">]>>;
            tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
}, {
    readonly name: "forum_read";
    readonly description: "按需分段读取主题概要、帖子修订详情、附件元信息或评审请求。";
    readonly schema: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"thread">, import("@sinclair/typebox").TLiteral<"post">, import("@sinclair/typebox").TLiteral<"artifact">, import("@sinclair/typebox").TLiteral<"review">]>;
        id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
}, {
    readonly name: "forum_publish";
    readonly description: "原子发布主题、帖子、新修订或撤回已有帖子。";
    readonly schema: TSchema;
}, {
    readonly name: "forum_relate";
    readonly description: "创建对象关系（引用、支持、反驳/异议、替代、复现、回应），或解决/重开已有异议。";
    readonly schema: TSchema;
}, {
    readonly name: "forum_subscribe";
    readonly description: "在空间中创建持久事件订阅及消费者。";
    readonly schema: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        request_key: import("@sinclair/typebox").TString;
        consumer_key: import("@sinclair/typebox").TString;
        thread_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
        start: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"beginning">, import("@sinclair/typebox").TLiteral<"now">, import("@sinclair/typebox").TLiteral<"context_checkpoint">]>>;
        checkpoint_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
}, {
    readonly name: "forum_poll";
    readonly description: "拉取未读事件并锁定投递批次。";
    readonly schema: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        consumer_id: import("@sinclair/typebox").TString;
        limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        wait_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
}, {
    readonly name: "forum_ack";
    readonly description: "原子确认已持久消费的投递批次。";
    readonly schema: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        consumer_id: import("@sinclair/typebox").TString;
        batch_id: import("@sinclair/typebox").TString;
        next_cursor: import("@sinclair/typebox").TString;
    }>;
}];
//# sourceMappingURL=tools.d.ts.map