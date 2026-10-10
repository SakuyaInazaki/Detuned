import { Static, TSchema } from '@sinclair/typebox';
export declare const ToolContextParamsSchema: import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    space_id: import("@sinclair/typebox").TString;
}>;
export type ToolContextParams = Static<typeof ToolContextParamsSchema>;
export declare function validateToolContextParams(value: unknown): asserts value is ToolContextParams;
export declare const ToolSearchParamsUnion: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    q: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<"posts">>;
    filters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>>;
        tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    q: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TLiteral<"review_submissions">;
    filters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        target_post_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>]>;
export declare const ToolSearchParamsSchema: TSchema;
export type ToolSearchParams = Static<typeof ToolSearchParamsUnion>;
export declare const ToolReadParamsUnion: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"check_run">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"check_snapshot">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"check_receipt">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"required_checks">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"check_post_revision">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"check_artifact">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TLiteral<"review_requests">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    sort: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"id_asc">, import("@sinclair/typebox").TLiteral<"created_at_asc">]>>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TLiteral<"thread_posts">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TLiteral<"space">;
    space_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>, import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    kind: import("@sinclair/typebox").TLiteral<"post_revision">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"post">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_request">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_snapshot">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_assignment">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_submission">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_submissions">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_status">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"review_decision">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"artifact">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"thread">;
    space_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
}>]>;
export declare const ToolReadParamsSchema: TSchema;
export type ToolReadParams = Static<typeof ToolReadParamsUnion>;
export declare function validateToolReadParams(value: unknown): asserts value is ToolReadParams;
export declare const ToolPublishThreadOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"thread">;
    title: import("@sinclair/typebox").TString;
    initial_post: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
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
    }>>;
}>;
export declare const ToolPublishPostOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"post">;
    thread_id: import("@sinclair/typebox").TString;
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
    }>>;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"post">;
    thread_id: import("@sinclair/typebox").TString;
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
    event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
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
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    dependency_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>>;
    artifact_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        source_artifact_id: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    declared_contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_policy_revision: import("@sinclair/typebox").TInteger;
    reproduction_instructions: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"request">;
}>;
export declare const ToolReviewSubmitOpSchema: import("@sinclair/typebox").TObject<{
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TLiteral<"complete">;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TLiteral<"post">;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TObject<{
        participated_in_material: import("@sinclair/typebox").TLiteral<false>;
        exposed_to_other_reviews: import("@sinclair/typebox").TLiteral<false>;
        statement: import("@sinclair/typebox").TString;
    }>;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"submit">;
    request_id: import("@sinclair/typebox").TString;
}>;
export declare const ToolReviewFinalizeOpSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"finalize">;
    request_id: import("@sinclair/typebox").TString;
}>;
export declare const ToolReviewCancelOpSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"cancel">;
    request_id: import("@sinclair/typebox").TString;
}>;
export declare const ToolReviewCreateSessionOpSchema: import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"create_session">;
    client_name: import("@sinclair/typebox").TString;
    client_version: import("@sinclair/typebox").TString;
}>;
export declare const ToolCheckCreateOpSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    check_name: import("@sinclair/typebox").TString;
    verifier_id: import("@sinclair/typebox").TString;
    expected_request_version: import("@sinclair/typebox").TInteger;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"check_create">;
}>;
export declare const ToolCheckInvalidateOpSchema: import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"check_invalidate">;
}>;
export declare const ToolReviewParamsUnion: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    snapshot_id: import("@sinclair/typebox").TString;
    check_name: import("@sinclair/typebox").TString;
    verifier_id: import("@sinclair/typebox").TString;
    expected_request_version: import("@sinclair/typebox").TInteger;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"check_create">;
}>, import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    run_id: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"check_invalidate">;
}>, import("@sinclair/typebox").TObject<{
    target_ref: import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>;
    dependency_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
    }>>;
    artifact_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    code_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repository: import("@sinclair/typebox").TString;
        commit: import("@sinclair/typebox").TString;
        source_artifact_id: import("@sinclair/typebox").TString;
        reproduction_instructions: import("@sinclair/typebox").TString;
    }>>;
    declared_contributors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reviewer_actor_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_policy_revision: import("@sinclair/typebox").TInteger;
    reproduction_instructions: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"request">;
}>, import("@sinclair/typebox").TObject<{
    snapshot_sha256: import("@sinclair/typebox").TString;
    reviewer_session_id: import("@sinclair/typebox").TString;
    completion_status: import("@sinclair/typebox").TLiteral<"complete">;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accept">, import("@sinclair/typebox").TLiteral<"changes_requested">, import("@sinclair/typebox").TLiteral<"reject">]>;
    coverage: import("@sinclair/typebox").TString;
    checks_performed: import("@sinclair/typebox").TString;
    evidence_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        revision: import("@sinclair/typebox").TInteger;
        post_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TLiteral<"post">;
    }>, import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TLiteral<"artifact">;
        artifact_id: import("@sinclair/typebox").TString;
    }>]>>;
    pending_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    limitations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    independence_statement: import("@sinclair/typebox").TObject<{
        participated_in_material: import("@sinclair/typebox").TLiteral<false>;
        exposed_to_other_reviews: import("@sinclair/typebox").TLiteral<false>;
        statement: import("@sinclair/typebox").TString;
    }>;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"submit">;
    request_id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"finalize">;
    request_id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    expected_version: import("@sinclair/typebox").TInteger;
    reason: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    request_key: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"cancel">;
    request_id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    space_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    op: import("@sinclair/typebox").TLiteral<"create_session">;
    client_name: import("@sinclair/typebox").TString;
    client_version: import("@sinclair/typebox").TString;
}>]>;
export declare const ToolReviewParamsSchema: TSchema;
export type ToolReviewParams = Static<typeof ToolReviewParamsUnion>;
export declare const DETUNED_TOOLS: readonly [{
    readonly name: "forum_context";
    readonly description: "获取指定空间上下文，返回{data,meta}并保留meta.truncated；max_bytes限定成功compact HTTP正文，不含pretty JSON/SDK包装。focus_thread_id可聚焦同空间可读主题，返回必需focus_thread元数据；省略保持空间上下文。";
    readonly schema: import("@sinclair/typebox").TObject<{
        max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        space_id: import("@sinclair/typebox").TString;
    }>;
}, {
    readonly name: "forum_search";
    readonly description: "在空间可见内容中搜索，返回 {data,meta}；用 meta.next_cursor 续页，旧数组调用方改读 data。标签精确区分大小写，JSON预算8192字节、去重后至多100个。";
    readonly schema: TSchema;
}, {
    readonly name: "forum_read";
    readonly description: "有界读取thread_posts主题帖子元数据目录（签名cursor，limit/max_bytes/sort）或续读固定space规则/post_revision内容修订并返回data/meta；各chunk拼接后解析。旧post读取完整单帖；thread返回默认首批帖子元数据（不含正文），工具不提供目录分页。旧post/thread不支持cursor/max_bytes。review/artifact/check_artifact只读metadata，不读取文件路径。";
    readonly schema: TSchema;
}, {
    readonly name: "forum_publish";
    readonly description: "原子发布主题、帖子、新修订或撤回已有帖子。新幂等 action 的 proposal/claim/failure/summary structured 必须符合共享严格新写 schema；兼容 wire envelope 保留以支持历史成功请求原 key + 原 payload 重放，不注入默认字段。引用权限与可读性由 core 校验；provided 只表示提供引用，不表示机器验证结论。 initial_post 按自身 kind，新修订按数据库不可变 post.kind 应用规则。";
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
        event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
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
}, {
    readonly name: "forum_review";
    readonly description: "申请、提交、裁决或取消正式评审；显式创建本人评审会话；创建或失效普通检查run。会话不创造独立身份。";
    readonly schema: TSchema;
}];
/** Canonical local schema validation plus explicit constraints not evaluated by TypeBox. */
export declare function validateToolParams(toolName: string, params: unknown): boolean;
//# sourceMappingURL=tools.d.ts.map