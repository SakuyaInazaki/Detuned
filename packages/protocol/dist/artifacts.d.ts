import { Static } from '@sinclair/typebox';
export declare const ArtifactVisibilitySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space">, import("@sinclair/typebox").TLiteral<"review_assignment">]>;
export type ArtifactVisibility = Static<typeof ArtifactVisibilitySchema>;
export declare const ArtifactStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ready">, import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
export type ArtifactState = Static<typeof ArtifactStateSchema>;
export declare const ArtifactSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    visibility: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space">, import("@sinclair/typebox").TLiteral<"review_assignment">]>;
    review_assignment_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    check_run_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    storage_key: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ready">, import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
    created_at: import("@sinclair/typebox").TString;
}>;
export type Artifact = Static<typeof ArtifactSchema>;
export interface ArtifactLimits {
    max_file_bytes: number;
    max_space_bytes: number;
}
export declare const DEFAULT_ARTIFACT_LIMITS: ArtifactLimits;
export declare const CreateArtifactMetadataSchema: import("@sinclair/typebox").TObject<{
    visibility: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<"space">>;
}>;
export type CreateArtifactMetadata = Static<typeof CreateArtifactMetadataSchema>;
export declare const ArtifactMetadataSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    visibility: import("@sinclair/typebox").TLiteral<"space">;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ready">, import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
    created_at: import("@sinclair/typebox").TString;
    content_url: import("@sinclair/typebox").TString;
}>;
export type ArtifactMetadata = Static<typeof ArtifactMetadataSchema>;
export declare function resolveArtifactLimits(input?: Partial<ArtifactLimits>): ArtifactLimits;
export declare function normalizeArtifactMime(input: string | undefined): string;
export declare function toArtifactMetadata(artifact: Artifact): ArtifactMetadata;
export declare function isArtifactMetadata(value: unknown): value is ArtifactMetadata;
export declare function isCreateArtifactMetadata(value: unknown): value is CreateArtifactMetadata;
export declare const ReviewArtifactMetadataSchema: import("@sinclair/typebox").TObject<{
    visibility: import("@sinclair/typebox").TLiteral<"review_assignment">;
    review_assignment_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ready">, import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
    created_at: import("@sinclair/typebox").TString;
    content_url: import("@sinclair/typebox").TString;
}>;
export type ReviewArtifactMetadata = Static<typeof ReviewArtifactMetadataSchema>;
export declare const ReadableArtifactMetadataSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    visibility: import("@sinclair/typebox").TLiteral<"space">;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ready">, import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
    created_at: import("@sinclair/typebox").TString;
    content_url: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    visibility: import("@sinclair/typebox").TLiteral<"review_assignment">;
    review_assignment_id: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TString;
    owner_id: import("@sinclair/typebox").TString;
    sha256: import("@sinclair/typebox").TString;
    bytes: import("@sinclair/typebox").TInteger;
    mime: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ready">, import("@sinclair/typebox").TLiteral<"redacted">, import("@sinclair/typebox").TLiteral<"missing">]>;
    created_at: import("@sinclair/typebox").TString;
    content_url: import("@sinclair/typebox").TString;
}>]>;
export type ReadableArtifactMetadata = Static<typeof ReadableArtifactMetadataSchema>;
export declare function isReadableArtifactMetadata(value: unknown): value is ReadableArtifactMetadata;
//# sourceMappingURL=artifacts.d.ts.map