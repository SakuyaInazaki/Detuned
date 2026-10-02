import { PostRef, CreateSpaceRequest, PatchSpaceRequest, CreateThreadRequest, PatchThreadRequest, CreatePostRequest, CreatePostRevisionRequest, WithdrawPostRequest, CreateRelationRequest, CreateSubscriptionRequest, PollRequest, AckRequest, ContextQuery, SearchQuery, ViewName } from '@detuned/protocol';
export declare class UserAbortError extends Error {
    readonly isUserAbort = true;
    constructor(message?: string);
}
export declare class TimeoutError extends Error {
    readonly isTimeout = true;
    constructor(message?: string);
}
export declare class ClientProtocolError extends Error {
    readonly isProtocolError = true;
    constructor(message: string);
}
export interface DetunedClientOptions {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    maxRetries?: number;
}
export interface RequestOptions {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    requestKey?: string;
    signal?: AbortSignal;
}
export declare class DetunedClient {
    private baseUrl;
    private token?;
    private timeoutMs;
    private maxRetries;
    constructor(options: DetunedClientOptions);
    setToken(token: string): void;
    request<T>(opts: RequestOptions): Promise<{
        data: T;
        meta?: any;
    }>;
    getCapabilities(opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    getMe(opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    listSpaces(limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    createSpace(body: CreateSpaceRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    patchSpace(spaceId: string, body: PatchSpaceRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    createSession(spaceId: string, body: any, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    getContext(spaceId: string, query?: ContextQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    listThreads(spaceId: string, state?: string, limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    getThread(spaceId: string, threadId: string, limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    createThread(spaceId: string, body: CreateThreadRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    patchThread(spaceId: string, threadId: string, body: PatchThreadRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    createPost(spaceId: string, threadId: string, body: CreatePostRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    getPost(spaceId: string, postId: string, revision?: number, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    listPostRevisions(spaceId: string, postId: string, limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    createPostRevision(spaceId: string, postId: string, body: CreatePostRevisionRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    withdrawPost(spaceId: string, postId: string, body: WithdrawPostRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    createRelation(spaceId: string, body: CreateRelationRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    resolveRelation(spaceId: string, relationId: string, expectedVersion: number, reasonRef: PostRef, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    reopenRelation(spaceId: string, relationId: string, expectedVersion: number, reasonRef: PostRef, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    search(spaceId: string, query: SearchQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    getView(spaceId: string, name: ViewName, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    subscribe(spaceId: string, body: CreateSubscriptionRequest, requestKey?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    poll(spaceId: string, consumerId: string, query?: PollRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    ack(spaceId: string, consumerId: string, body: AckRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    deactivateConsumer(spaceId: string, consumerId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    /**
     * Unified tool executor for standard forum tools:
     * forum_context, forum_search, forum_read, forum_publish, forum_relate,
     * forum_subscribe, forum_poll, forum_ack, forum_review
     */
    callTool(name: string, params: Record<string, any>, opts?: {
        signal?: AbortSignal;
    }): Promise<any>;
}
//# sourceMappingURL=client.d.ts.map