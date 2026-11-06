import { type PostAssembleQuery, type AssembledPostRevisionContent } from '@detuned/protocol';
export interface FixedContentReadBudget {
    remainingBytes: number;
    remainingRequests: number;
}
/** Fixed-reference JSON assembly; no scientific or cryptographic certification. */
export declare function assembleFixedPostContent(spaceId: string, postId: string, revision: number, query: PostAssembleQuery, timeoutMs: number, external: AbortSignal | undefined, read: (query: {
    max_bytes?: number;
    cursor?: string;
}, signal: AbortSignal) => Promise<unknown>, budget?: FixedContentReadBudget): Promise<AssembledPostRevisionContent>;
//# sourceMappingURL=fixed-content-assemble.d.ts.map