import { type Static } from '@sinclair/typebox';
import { type PostRevisionContentPage, type PostKind } from './posts.js';
import { type PostRevisionContentRef } from './posts.js';
export declare const POST_ASSEMBLE_LIMITS: Readonly<{
    bytes: 1048576;
    pages: 512;
}>;
export declare const PostAssembleQuerySchema: import("@sinclair/typebox").TObject<{
    max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type PostAssembleQuery = Static<typeof PostAssembleQuerySchema>;
export declare const AssembledPostDocumentSchema: import("@sinclair/typebox").TObject<{
    title: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    body: import("@sinclair/typebox").TString;
    tags: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    structured: import("@sinclair/typebox").TUnknown;
}>;
export type AssembledPostDocument = Static<typeof AssembledPostDocumentSchema>;
export interface AssembledPostRevisionContent {
    ref: PostRevisionContentRef;
    post_kind: PostKind;
    lifecycle: 'active' | 'withdrawn';
    has_newer_revision: boolean;
    encoding: 'json';
    content: AssembledPostDocument;
    bytes: number;
    pages: number;
}
export declare function validatePostAssembleQuery(query: unknown): asserts query is PostAssembleQuery;
export declare function isPostContentPage(value: unknown): value is PostRevisionContentPage;
export declare function isAssembledPostDocument(value: unknown): value is AssembledPostDocument;
//# sourceMappingURL=fixed-content.d.ts.map