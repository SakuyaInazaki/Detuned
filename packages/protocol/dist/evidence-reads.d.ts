import { type Static } from '@sinclair/typebox';
export declare const ARTIFACT_CONTENT_LIMITS: Readonly<{
    blob_bytes: 1048576;
    min_bytes: 4096;
    max_bytes: 12288;
    default_bytes: 8192;
}>;
export declare const ArtifactContentQuerySchema: import("@sinclair/typebox").TObject<{
    encoding: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"utf8">, import("@sinclair/typebox").TLiteral<"base64">]>>;
    offset: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    expected_sha256: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ArtifactContentQuery = Static<typeof ArtifactContentQuerySchema>;
export interface ArtifactContentPage {
    artifact_id: string;
    sha256: string;
    mime: string;
    total_bytes: number;
    encoding: 'utf8' | 'base64';
    offset: number;
    next_offset: number | null;
    complete: boolean;
    integrity_verified: true;
    content: string;
}
export declare function validateArtifactContentQuery(query: unknown): asserts query is ArtifactContentQuery;
//# sourceMappingURL=evidence-reads.d.ts.map