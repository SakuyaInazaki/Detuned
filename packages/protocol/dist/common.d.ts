import { TSchema, Static } from '@sinclair/typebox';
export declare const ApiMetaSchema: import("@sinclair/typebox").TObject<{
    truncated: import("@sinclair/typebox").TBoolean;
    next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ApiMeta = Static<typeof ApiMetaSchema>;
export declare function createApiEnvelopeSchema<T extends TSchema>(dataSchema: T): import("@sinclair/typebox").TObject<{
    api_version: import("@sinclair/typebox").TLiteral<"1">;
    request_id: import("@sinclair/typebox").TString;
    data: T;
    meta: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        truncated: import("@sinclair/typebox").TBoolean;
        next_cursor: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export declare const PaginationQuerySchema: import("@sinclair/typebox").TObject<{
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type PaginationQuery = Static<typeof PaginationQuerySchema>;
export declare const PostRefSchema: import("@sinclair/typebox").TObject<{
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>;
export type PostRef = Static<typeof PostRefSchema>;
export declare const PostEvidenceRefSchema: import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"post">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>;
export declare const ArtifactEvidenceRefSchema: import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"artifact">;
    artifact_id: import("@sinclair/typebox").TString;
}>;
export declare const EvidenceRefSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"post">;
    post_id: import("@sinclair/typebox").TString;
    revision: import("@sinclair/typebox").TInteger;
}>, import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TLiteral<"artifact">;
    artifact_id: import("@sinclair/typebox").TString;
}>]>;
export type EvidenceRef = Static<typeof EvidenceRefSchema>;
//# sourceMappingURL=common.d.ts.map