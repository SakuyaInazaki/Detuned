/** RFC 8785 serialization for already-parsed JSON values. No text parser or Proxy isolation. */
export type ReviewCanonicalizationReason = 'invalid_json' | 'max_bytes' | 'max_depth' | 'max_nodes';
export declare class ReviewCanonicalizationError extends Error {
    readonly reason: ReviewCanonicalizationReason;
    constructor(reason: ReviewCanonicalizationReason);
}
export declare function canonicalizeReviewJson(value: unknown): string;
//# sourceMappingURL=review-canonical.d.ts.map