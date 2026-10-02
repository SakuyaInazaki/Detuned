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
//# sourceMappingURL=artifacts.d.ts.map