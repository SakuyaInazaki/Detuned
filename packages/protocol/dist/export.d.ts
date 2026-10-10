import { type Static } from '@sinclair/typebox';
import { type ApiErrorResponse } from './errors.js';
export declare const EXPORT_LIMITS: {
    readonly max_raw_bytes: 1048576;
    readonly max_line_bytes: 1048576;
    readonly max_total_bytes: 536870912;
    readonly max_records: 2000000;
    readonly deadline_ms: 120000;
    readonly max_active: 4;
};
export declare const SpaceExportHeaderSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"header">;
    format: import("@sinclair/typebox").TLiteral<"detuned-space-export">;
    version: import("@sinclair/typebox").TLiteral<1>;
    export_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        schema_version: import("@sinclair/typebox").TLiteral<2>;
        snapshot_event_seq: import("@sinclair/typebox").TString;
        space_revision: import("@sinclair/typebox").TInteger;
    }>;
    identity_semantics: import("@sinclair/typebox").TLiteral<"source_actor_ids_only">;
    scope: import("@sinclair/typebox").TLiteral<"public_research">;
    formal_review_status: import("@sinclair/typebox").TLiteral<"not_enabled">;
    formal_check_status: import("@sinclair/typebox").TLiteral<"not_enabled">;
    hash_algorithm: import("@sinclair/typebox").TLiteral<"sha256-chain-v1">;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"header">;
    format: import("@sinclair/typebox").TLiteral<"detuned-space-export">;
    version: import("@sinclair/typebox").TLiteral<2>;
    export_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        schema_version: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<3>, import("@sinclair/typebox").TLiteral<4>, import("@sinclair/typebox").TLiteral<5>, import("@sinclair/typebox").TLiteral<6>]>;
        snapshot_event_seq: import("@sinclair/typebox").TString;
        space_revision: import("@sinclair/typebox").TInteger;
    }>;
    identity_semantics: import("@sinclair/typebox").TLiteral<"source_actor_ids_only">;
    scope: import("@sinclair/typebox").TLiteral<"public_research">;
    formal_review_status: import("@sinclair/typebox").TLiteral<"excluded">;
    formal_check_status: import("@sinclair/typebox").TLiteral<"excluded">;
    hash_algorithm: import("@sinclair/typebox").TLiteral<"sha256-chain-v1">;
}>]>;
export declare const SpaceExportRecordSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"record">;
    seq: import("@sinclair/typebox").TInteger;
    kind: import("@sinclair/typebox").TLiteral<string>;
    data: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        policy_revision: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        objective: import("@sinclair/typebox").TString;
        rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        review_policy: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        check_profiles: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        pinned_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
        editor_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        projected: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<true>>;
    }> | import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        creator_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TObject<{
        thread_id: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        title: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        created_at: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        thread_id: import("@sinclair/typebox").TString;
        author_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        current_revision: import("@sinclair/typebox").TInteger;
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
        created_at: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        thread_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        lifecycle: import("@sinclair/typebox").TLiteral<"redacted">;
        tombstone: import("@sinclair/typebox").TLiteral<true>;
    }>]> | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        body: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        structured: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        editor_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        source_content_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        projected: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<true>>;
    }>, import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        tombstone: import("@sinclair/typebox").TLiteral<true>;
    }>]> | import("@sinclair/typebox").TObject<{
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
    }> | import("@sinclair/typebox").TObject<{
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
    }> | import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        artifact_id: import("@sinclair/typebox").TString;
        purpose: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        owner_id: import("@sinclair/typebox").TString;
        visibility: import("@sinclair/typebox").TLiteral<"space">;
        sha256: import("@sinclair/typebox").TString;
        bytes: import("@sinclair/typebox").TInteger;
        mime: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TLiteral<"ready">;
        created_at: import("@sinclair/typebox").TString;
        content_url: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
        tombstone: import("@sinclair/typebox").TLiteral<true>;
    }>]>;
}>[]>;
export declare const SpaceExportEndSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"end">;
    complete: import("@sinclair/typebox").TLiteral<true>;
    record_count: import("@sinclair/typebox").TInteger;
    bytes_before_end: import("@sinclair/typebox").TInteger;
    chain_sha256: import("@sinclair/typebox").TString;
}>;
export declare const SpaceExportLineSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"header">;
    format: import("@sinclair/typebox").TLiteral<"detuned-space-export">;
    version: import("@sinclair/typebox").TLiteral<1>;
    export_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        schema_version: import("@sinclair/typebox").TLiteral<2>;
        snapshot_event_seq: import("@sinclair/typebox").TString;
        space_revision: import("@sinclair/typebox").TInteger;
    }>;
    identity_semantics: import("@sinclair/typebox").TLiteral<"source_actor_ids_only">;
    scope: import("@sinclair/typebox").TLiteral<"public_research">;
    formal_review_status: import("@sinclair/typebox").TLiteral<"not_enabled">;
    formal_check_status: import("@sinclair/typebox").TLiteral<"not_enabled">;
    hash_algorithm: import("@sinclair/typebox").TLiteral<"sha256-chain-v1">;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"header">;
    format: import("@sinclair/typebox").TLiteral<"detuned-space-export">;
    version: import("@sinclair/typebox").TLiteral<2>;
    export_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        schema_version: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<3>, import("@sinclair/typebox").TLiteral<4>, import("@sinclair/typebox").TLiteral<5>, import("@sinclair/typebox").TLiteral<6>]>;
        snapshot_event_seq: import("@sinclair/typebox").TString;
        space_revision: import("@sinclair/typebox").TInteger;
    }>;
    identity_semantics: import("@sinclair/typebox").TLiteral<"source_actor_ids_only">;
    scope: import("@sinclair/typebox").TLiteral<"public_research">;
    formal_review_status: import("@sinclair/typebox").TLiteral<"excluded">;
    formal_check_status: import("@sinclair/typebox").TLiteral<"excluded">;
    hash_algorithm: import("@sinclair/typebox").TLiteral<"sha256-chain-v1">;
}>]>, import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"record">;
    seq: import("@sinclair/typebox").TInteger;
    kind: import("@sinclair/typebox").TLiteral<string>;
    data: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        slug: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        policy_revision: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TObject<{
        space_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        objective: import("@sinclair/typebox").TString;
        rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        review_policy: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        check_profiles: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        pinned_refs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>>;
        editor_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        projected: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<true>>;
    }> | import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        creator_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TObject<{
        thread_id: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        title: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"archived">]>;
        created_at: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        thread_id: import("@sinclair/typebox").TString;
        author_id: import("@sinclair/typebox").TString;
        kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"note" | "question" | "proposal" | "claim" | "objection" | "failure" | "summary" | "review" | "decision">[]>;
        current_revision: import("@sinclair/typebox").TInteger;
        lifecycle: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
        created_at: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        thread_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        lifecycle: import("@sinclair/typebox").TLiteral<"redacted">;
        tombstone: import("@sinclair/typebox").TLiteral<true>;
    }>]> | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        title: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        body: import("@sinclair/typebox").TString;
        tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        structured: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        editor_id: import("@sinclair/typebox").TString;
        created_at: import("@sinclair/typebox").TString;
        source_content_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        projected: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<true>>;
    }>, import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        tombstone: import("@sinclair/typebox").TLiteral<true>;
    }>]> | import("@sinclair/typebox").TObject<{
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
    }> | import("@sinclair/typebox").TObject<{
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
    }> | import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        revision: import("@sinclair/typebox").TInteger;
        artifact_id: import("@sinclair/typebox").TString;
        purpose: import("@sinclair/typebox").TString;
    }> | import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        owner_id: import("@sinclair/typebox").TString;
        visibility: import("@sinclair/typebox").TLiteral<"space">;
        sha256: import("@sinclair/typebox").TString;
        bytes: import("@sinclair/typebox").TInteger;
        mime: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TLiteral<"ready">;
        created_at: import("@sinclair/typebox").TString;
        content_url: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        space_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
        tombstone: import("@sinclair/typebox").TLiteral<true>;
    }>]>;
}>[]>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"end">;
    complete: import("@sinclair/typebox").TLiteral<true>;
    record_count: import("@sinclair/typebox").TInteger;
    bytes_before_end: import("@sinclair/typebox").TInteger;
    chain_sha256: import("@sinclair/typebox").TString;
}>]>;
export declare const SpaceExportQuerySchema: import("@sinclair/typebox").TObject<{
    format: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<"ndjson">>;
}>;
export type SpaceExportHeader = Static<typeof SpaceExportHeaderSchema>;
export type SpaceExportRecord = Static<typeof SpaceExportRecordSchema>;
export type SpaceExportEnd = Static<typeof SpaceExportEndSchema>;
export type SpaceExportLine = Static<typeof SpaceExportLineSchema>;
export interface SpaceExportComplete {
    header: SpaceExportHeader;
    end: SpaceExportEnd;
    bytes: number;
}
export declare function validateSpaceExportLine(value: unknown): value is SpaceExportLine;
/** Fixed public vector: exact UTF-8 lines include LF; zero raw32 seed, end excluded. */
export declare const SPACE_EXPORT_HASH_VECTOR: {
    readonly lines: readonly ["{\"type\":\"header\",\"format\":\"detuned-space-export\",\"version\":1,\"export_id\":\"exp_00000000-0000-0000-0000-000000000001\",\"created_at\":\"2026-10-06T00:00:00.000Z\",\"source\":{\"space_id\":\"space-vector\",\"schema_version\":2,\"snapshot_event_seq\":\"0\",\"space_revision\":1},\"identity_semantics\":\"source_actor_ids_only\",\"scope\":\"public_research\",\"formal_review_status\":\"not_enabled\",\"formal_check_status\":\"not_enabled\",\"hash_algorithm\":\"sha256-chain-v1\"}\n", "{\"type\":\"record\",\"seq\":1,\"kind\":\"space\",\"data\":{\"id\":\"space-vector\",\"slug\":\"unicode-中文🙂\",\"current_revision\":1,\"policy_revision\":1,\"created_at\":\"2026-10-06T00:00:00.000Z\"}}\n"];
    readonly bytes_before_end: 615;
    readonly record_count: 1;
    readonly chain_sha256: "5e7fc520f524e978da985e777305b2d3cc66c563daccf9a0598c07f81474731c";
};
export declare function validateSpaceExportError(value: unknown): value is ApiErrorResponse;
//# sourceMappingURL=export.d.ts.map