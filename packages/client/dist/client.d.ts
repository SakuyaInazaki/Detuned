import { type CreateCheckRun, type InvalidateCheckRun, type SubmitCheckReceipt, type CheckRunView, type CheckSnapshotView, type CheckPostRevisionView, type CheckReceiptView, type RequiredChecksView, type IssueCheckRunCredentialRequest, type IssueCheckRunCredentialData } from '@detuned/protocol';
import { type ReviewSubmissionSearchQuery, type PublicReviewSubmissionSearchPage } from '@detuned/protocol';
import { type PostReviewRequestsQuery, type PostReviewRequestsPage } from '@detuned/protocol';
import { type CreateReviewRequest, type CreateReviewSubmission, type FinalizeReviewRequest, type CancelReviewRequest, type ReviewRequestView, type ReviewRequestReadView, type ReviewSnapshotView, type OwnReviewAssignmentView, type ReviewSubmissionAcknowledgement, type ReviewSubmissionView, type ReviewSubmissionsView, type ReviewDecisionView, type ReviewStatusView, type ReviewArtifactMetadata } from '@detuned/protocol';
import { type PostRevisionCatalogQuery, type RevisionArtifactsQuery, type PostRevisionCatalogPage, type PostRevisionArtifactsPage } from '@detuned/protocol';
import { type WebSessionResponse } from '@detuned/protocol';
import { type ArtifactDownload } from './artifact-transfer.js';
export type { ArtifactDownload } from './artifact-transfer.js';
import { type SpaceExportOptions } from './export-stream.js';
export type { SpaceExportOptions } from './export-stream.js';
import { type RequestKeyStore, type WriteOptions } from './request-key.js';
import { Actor, Membership, CreateActorRequest, CreateCredentialRequest, CreateMembershipRequest, PatchMembershipRequest, CreateRedactionRequest, CreateCredentialData, RevokeCredentialData, DeactivateMembershipData, RedactionResult, ArtifactMetadata, ReadableArtifactMetadata, CreateArtifactMetadata, PostRef, CreateSpaceRequest, CreateSessionRequest, PatchSpaceRequest, CreateThreadRequest, PatchThreadRequest, CreatePostRequest, CreatePostRevisionRequest, WithdrawPostRequest, CreateRelationRequest, CreateSubscriptionRequest, PollRequest, AckRequest, ContextQuery, ContextPage, ThreadPostsPage, ThreadPostsReadQuery, PostRevisionContentPage, PostRevisionReadQuery, SpaceRevisionPage, SpaceRevisionReadQuery, ViewResponseData, SearchQuery, SearchPage, ViewName } from '@detuned/protocol';
/** Check writes deliberately do not perform persistent-key identity discovery. */
export interface CheckWriteOptions {
    signal?: AbortSignal;
}
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
export declare class ClientTransportError extends Error {
    readonly isTransportError = true;
    readonly isDetunedError = false;
    readonly isUserAbort = false;
    readonly isTimeout = false;
    readonly kind: "transport";
    readonly code: string | null;
    readonly statusCode: number | null;
    readonly retryable: boolean;
    constructor(message: string, options?: {
        cause?: unknown;
        retryable?: boolean;
        code?: string;
    });
}
export interface DetunedClientOptions {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    maxRetries?: number;
    maxRetryAfterMs?: number;
    requestKeyStore?: RequestKeyStore;
    browserSession?: {
        getCsrfToken: () => string | undefined;
    };
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
    private browserSession?;
    private baseUrl;
    private requestKeyStore?;
    private token?;
    private timeoutMs;
    private maxRetries;
    private maxRetryAfterMs;
    constructor(options: DetunedClientOptions);
    setToken(token: string): void;
    request<T>(opts: RequestOptions): Promise<{
        data: T;
        meta?: any;
    }>;
    private requestWithBody;
    private write;
    private prepareWriteKey;
    createActor(body: CreateActorRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<Actor>;
    createCredential(body: CreateCredentialRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<CreateCredentialData>;
    revokeCredential(credentialId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<RevokeCredentialData>;
    createMembership(spaceId: string, body: CreateMembershipRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<Membership>;
    patchMembership(spaceId: string, actorId: string, body: PatchMembershipRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<Membership>;
    deactivateMembership(spaceId: string, actorId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<DeactivateMembershipData>;
    redact(spaceId: string, body: CreateRedactionRequest, requestKey?: string, opts?: WriteOptions): Promise<RedactionResult>;
    /** New review responses alone use the strict, bounded JSON transport. */
    private reviewResponse;
    createReviewRequest(spaceId: string, body: CreateReviewRequest, requestKey?: string, opts?: WriteOptions): Promise<ReviewRequestView>;
    getPostReviewRequests(spaceId: string, postId: string, query?: PostReviewRequestsQuery, options?: {
        signal?: AbortSignal;
    }): Promise<PostReviewRequestsPage>;
    getReviewRequest(spaceId: string, requestId: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReviewRequestReadView>;
    getReviewSnapshot(spaceId: string, snapshotId: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReviewSnapshotView>;
    getOwnReviewAssignment(spaceId: string, requestId: string, options?: {
        signal?: AbortSignal;
    }): Promise<OwnReviewAssignmentView>;
    submitReview(spaceId: string, requestId: string, body: CreateReviewSubmission, requestKey?: string, opts?: WriteOptions): Promise<ReviewSubmissionAcknowledgement>;
    getReviewSubmission(spaceId: string, submissionId: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReviewSubmissionView>;
    listReviewSubmissions(spaceId: string, requestId: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReviewSubmissionsView>;
    finalizeReviewRequest(spaceId: string, requestId: string, body: FinalizeReviewRequest, requestKey?: string, opts?: WriteOptions): Promise<ReviewDecisionView>;
    cancelReviewRequest(spaceId: string, requestId: string, body: CancelReviewRequest, requestKey?: string, opts?: WriteOptions): Promise<ReviewRequestView>;
    getReviewStatus(spaceId: string, requestId: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReviewStatusView>;
    getReviewDecision(spaceId: string, requestId: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReviewDecisionView>;
    private checkRunPath;
    private checkWriteKey;
    private checkResponse;
    createCheckRun(spaceId: string, body: CreateCheckRun, requestKey?: string, opts?: WriteOptions): Promise<CheckRunView>;
    getCheckRun(spaceId: string, runId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<CheckRunView>;
    getCheckSnapshot(spaceId: string, runId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<CheckSnapshotView>;
    getCheckPostRevision(spaceId: string, runId: string, postId: string, revision: number, opts?: {
        signal?: AbortSignal;
    }): Promise<CheckPostRevisionView>;
    issueCheckRunCredential(spaceId: string, runId: string, body?: IssueCheckRunCredentialRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<IssueCheckRunCredentialData>;
    submitCheckReceipt(spaceId: string, runId: string, body: SubmitCheckReceipt, requestKey?: string, opts?: CheckWriteOptions): Promise<CheckReceiptView>;
    getCheckReceipt(spaceId: string, runId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<CheckReceiptView>;
    invalidateCheckRun(spaceId: string, runId: string, body: InvalidateCheckRun, requestKey?: string, opts?: WriteOptions): Promise<CheckRunView>;
    uploadCheckArtifact(spaceId: string, runId: string, file: Blob, metadata?: Record<string, never>, requestKey?: string, opts?: CheckWriteOptions): Promise<ArtifactMetadata>;
    getCheckArtifact(spaceId: string, runId: string, artifactId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<ReadableArtifactMetadata>;
    downloadCheckArtifact(spaceId: string, runId: string, artifactId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<ArtifactDownload>;
    getRequiredChecks(spaceId: string, requestId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<RequiredChecksView>;
    uploadReviewArtifact(spaceId: string, requestId: string, file: Blob, metadata?: Record<string, never>, requestKey?: string, opts?: WriteOptions): Promise<ReviewArtifactMetadata>;
    uploadArtifact(spaceId: string, file: Blob, metadata?: CreateArtifactMetadata, requestKey?: string, opts?: WriteOptions): Promise<ArtifactMetadata>;
    getArtifact(spaceId: string, artifactId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<ReadableArtifactMetadata>;
    downloadArtifact(spaceId: string, artifactId: string, opts?: {
        signal?: AbortSignal;
    }): Promise<ArtifactDownload>;
    exportSpace(spaceId: string, options: SpaceExportOptions): Promise<import("@detuned/protocol").SpaceExportComplete>;
    createWebSession(token: string, options?: {
        signal?: AbortSignal;
    }): Promise<WebSessionResponse>;
    getWebSession(options?: {
        signal?: AbortSignal;
    }): Promise<WebSessionResponse>;
    deleteWebSession(options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    getLiveness(opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: {
            status: "alive";
        };
        meta?: any;
    }>;
    getReadiness(opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: {
            status: "ready";
        };
        meta?: any;
    }>;
    getCapabilities(opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    getDiagnostics(opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: {
            artifacts: {
                complete: boolean;
                objects_observed: number;
                bytes_observed: string;
            };
            ready: boolean;
            lifecycle: "running" | "draining";
            database: {
                page_size: number;
                page_count: number;
                free_pages: number;
                max_pages: number;
                allocated_bytes: string;
                max_allocated_bytes: string;
                journal_mode: "wal" | "delete" | "truncate" | "persist" | "memory" | "off" | "unknown";
                wal: {
                    applicable: boolean;
                    busy: boolean | null;
                    log_frames: number | null;
                    checkpointed_frames: number | null;
                };
            };
            files: {
                database: {
                    state: "missing" | "regular" | "unavailable" | "not_applicable";
                    bytes: string | null;
                    applicable: boolean;
                };
                wal: {
                    state: "missing" | "regular" | "unavailable" | "not_applicable";
                    bytes: string | null;
                    applicable: boolean;
                };
            };
            data_directory: {
                configured: boolean;
                available: boolean | null;
            };
        };
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
    createSpace(body: CreateSpaceRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    patchSpace(spaceId: string, body: PatchSpaceRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    createSession(spaceId: string, body: CreateSessionRequest, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: {
            created_at: string;
            id: string;
            actor_id: string;
            space_id: string;
            client_name: string;
            client_version: string;
            harness_session_id: string | null;
            metadata: {
                [x: string]: unknown;
            };
        };
        meta?: any;
    }>;
    getContext(spaceId: string, query?: ContextQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<ContextPage>;
    getSpaceRevision(spaceId: string, revision: number, query?: SpaceRevisionReadQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<SpaceRevisionPage>;
    listThreads(spaceId: string, state?: string, limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    getThreadPosts(spaceId: string, threadId: string, query?: ThreadPostsReadQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<ThreadPostsPage>;
    getThread(spaceId: string, threadId: string, limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    createThread(spaceId: string, body: CreateThreadRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    patchThread(spaceId: string, threadId: string, body: PatchThreadRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    createPost(spaceId: string, threadId: string, body: CreatePostRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    getPost(spaceId: string, postId: string, revision?: number, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any;
        meta?: any;
    }>;
    getPostRevisionContent(spaceId: string, postId: string, revision: number, query?: PostRevisionReadQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<PostRevisionContentPage>;
    getPostRevisionCatalog(spaceId: string, postId: string, query?: PostRevisionCatalogQuery, options?: {
        signal?: AbortSignal;
    }): Promise<PostRevisionCatalogPage>;
    getPostRevisionArtifacts(spaceId: string, postId: string, revision: number, query?: RevisionArtifactsQuery, options?: {
        signal?: AbortSignal;
    }): Promise<PostRevisionArtifactsPage>;
    listPostRevisions(spaceId: string, postId: string, limit?: number, cursor?: string, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: any[];
        meta?: any;
    }>;
    createPostRevision(spaceId: string, postId: string, body: CreatePostRevisionRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    withdrawPost(spaceId: string, postId: string, body: WithdrawPostRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    createRelation(spaceId: string, body: CreateRelationRequest, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    resolveRelation(spaceId: string, relationId: string, expectedVersion: number, reasonRef: PostRef, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    reopenRelation(spaceId: string, relationId: string, expectedVersion: number, reasonRef: PostRef, requestKey?: string, opts?: WriteOptions): Promise<{
        data: any;
        meta?: any;
    }>;
    search(spaceId: string, query: SearchQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<SearchPage>;
    searchPublicReviewSubmissions(spaceId: string, query: ReviewSubmissionSearchQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<PublicReviewSubmissionSearchPage>;
    getView<N extends ViewName>(spaceId: string, name: N, opts?: {
        signal?: AbortSignal;
    }): Promise<{
        data: ViewResponseData<N>;
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
        data: {
            deactivated: true;
        };
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