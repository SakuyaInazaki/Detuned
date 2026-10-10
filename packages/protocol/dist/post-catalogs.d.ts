import { type Static } from '@sinclair/typebox';
export declare const POST_CATALOG_READ_LIMITS: Readonly<{
    cursor_chars: 4096;
    cursor_ttl_seconds: 86400;
}>;
export declare const PostRevisionCatalogQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type PostRevisionCatalogQuery = Static<typeof PostRevisionCatalogQuerySchema>;
export declare const RevisionArtifactsQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type RevisionArtifactsQuery = Static<typeof RevisionArtifactsQuerySchema>;
export declare function validatePostRevisionCatalogQuery(query: PostRevisionCatalogQuery): void;
export declare function validateRevisionArtifactsQuery(query: RevisionArtifactsQuery): void;
export declare const PostRevisionCatalogCursorPayloadSchema: import("@sinclair/typebox").TObject<{
    purpose: import("@sinclair/typebox").TLiteral<"post_revisions_catalog">;
    sort: import("@sinclair/typebox").TLiteral<"revision_desc">;
    after_revision: import("@sinclair/typebox").TInteger;
    v: import("@sinclair/typebox").TLiteral<1>;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    post_id: import("@sinclair/typebox").TString;
    exp: import("@sinclair/typebox").TInteger;
}>;
export type PostRevisionCatalogCursorPayload = Static<typeof PostRevisionCatalogCursorPayloadSchema>;
export declare function isPostRevisionCatalogCursorPayload(value: unknown): value is PostRevisionCatalogCursorPayload;
export declare const RevisionArtifactsCursorPayloadSchema: import("@sinclair/typebox").TObject<{
    purpose: import("@sinclair/typebox").TLiteral<"revision_artifacts">;
    revision: import("@sinclair/typebox").TInteger;
    sort: import("@sinclair/typebox").TLiteral<"artifact_id_asc">;
    after_id: import("@sinclair/typebox").TString;
    v: import("@sinclair/typebox").TLiteral<1>;
    actor_id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    post_id: import("@sinclair/typebox").TString;
    exp: import("@sinclair/typebox").TInteger;
}>;
export type RevisionArtifactsCursorPayload = Static<typeof RevisionArtifactsCursorPayloadSchema>;
export declare function isRevisionArtifactsCursorPayload(value: unknown): value is RevisionArtifactsCursorPayload;
export declare const PostRevisionMetadataSchema: import("@sinclair/typebox").TObject<{
    revision: import("@sinclair/typebox").TInteger;
    editor_id: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    content_hash: import("@sinclair/typebox").TString;
}>;
export type PostRevisionMetadata = Static<typeof PostRevisionMetadataSchema>;
export declare const RevisionArtifactCatalogReadySchema: import("@sinclair/typebox").TObject<{
    state: import("@sinclair/typebox").TLiteral<"ready">;
    id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    purpose: import("@sinclair/typebox").TString;
}>;
export declare const RevisionArtifactCatalogMissingSchema: import("@sinclair/typebox").TObject<{
    state: import("@sinclair/typebox").TLiteral<"missing">;
    id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    purpose: import("@sinclair/typebox").TString;
}>;
export declare const RevisionArtifactCatalogRedactedSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TLiteral<"redacted">;
}>;
export declare const RevisionArtifactCatalogItemSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    state: import("@sinclair/typebox").TLiteral<"ready">;
    id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    purpose: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    state: import("@sinclair/typebox").TLiteral<"missing">;
    id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    purpose: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TLiteral<"redacted">;
}>]>;
export type RevisionArtifactCatalogItem = Static<typeof RevisionArtifactCatalogItemSchema>;
export declare const PostRevisionCatalogPageSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        revisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            editor_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
}>, import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        revisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            editor_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
}>, import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        revisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            editor_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
}>]>;
export type PostRevisionCatalogPage = Static<typeof PostRevisionCatalogPageSchema>;
export declare const PostRevisionCatalogEnvelopeSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        revisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            editor_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
} | {
    data: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        revisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            editor_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
} | {
    data: import("@sinclair/typebox").TObject<{
        post_id: import("@sinclair/typebox").TString;
        current_revision: import("@sinclair/typebox").TInteger;
        revisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            revision: import("@sinclair/typebox").TInteger;
            editor_id: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            content_hash: import("@sinclair/typebox").TString;
        }>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
}>[]>;
export type PostRevisionCatalogEnvelope = {
    api_version: '1';
    request_id: string;
} & PostRevisionCatalogPage;
export declare const PostRevisionArtifactsPageSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"ready">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"missing">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TLiteral<"redacted">;
        }>]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
}>, import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"ready">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"missing">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TLiteral<"redacted">;
        }>]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
}>, import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"ready">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"missing">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TLiteral<"redacted">;
        }>]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
}>]>;
export type PostRevisionArtifactsPage = Static<typeof PostRevisionArtifactsPageSchema>;
export declare const PostRevisionArtifactsEnvelopeSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TObject<{
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"ready">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"missing">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TLiteral<"redacted">;
        }>]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
} | {
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"ready">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"missing">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TLiteral<"redacted">;
        }>]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
} | {
    data: import("@sinclair/typebox").TObject<{
        ref: import("@sinclair/typebox").TObject<{
            post_id: import("@sinclair/typebox").TString;
            revision: import("@sinclair/typebox").TInteger;
        }>;
        artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"ready">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            state: import("@sinclair/typebox").TLiteral<"missing">;
            id: import("@sinclair/typebox").TString;
            owner_id: import("@sinclair/typebox").TString;
            sha256: import("@sinclair/typebox").TString;
            bytes: import("@sinclair/typebox").TInteger;
            mime: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            purpose: import("@sinclair/typebox").TString;
        }>, import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            state: import("@sinclair/typebox").TLiteral<"redacted">;
        }>]>>;
    }>;
    meta: import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TLiteral<boolean>;
        next_cursor: import("@sinclair/typebox").TString | import("@sinclair/typebox").TNull;
    }>;
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
}>[]>;
export type PostRevisionArtifactsEnvelope = {
    api_version: '1';
    request_id: string;
} & PostRevisionArtifactsPage;
export declare function buildPostRevisionCatalogEnvelope(requestId: string, page: PostRevisionCatalogPage): PostRevisionCatalogEnvelope;
export declare function serializePostRevisionCatalogEnvelope(requestId: string, page: PostRevisionCatalogPage): string;
export declare function postRevisionCatalogEnvelopeBytes(requestId: string, page: PostRevisionCatalogPage): number;
export declare function buildPostRevisionArtifactsEnvelope(requestId: string, page: PostRevisionArtifactsPage): PostRevisionArtifactsEnvelope;
export declare function serializePostRevisionArtifactsEnvelope(requestId: string, page: PostRevisionArtifactsPage): string;
export declare function postRevisionArtifactsEnvelopeBytes(requestId: string, page: PostRevisionArtifactsPage): number;
//# sourceMappingURL=post-catalogs.d.ts.map