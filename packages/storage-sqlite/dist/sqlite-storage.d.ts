import { type OperationalOptions } from './operational-status.js';
import { SqliteSpaceExportSnapshot } from './space-export-snapshot.js';
import Database from 'better-sqlite3';
import { StoragePort, IdempotencyRecord, DeliveryBatchRecord, ThreadVersionRecord } from '@detuned/core';
import { ResourceLimits, StorageOperationalStatus, CheckRunRecord, CheckRunVersionRecord, CheckReceiptRecord, CheckRunCredentialRecord, ReviewSnapshotRecord, ReviewSnapshotItemRecord, ReviewRequestRecord, ReviewRequestVersionRecord, ReviewAssignmentRecord, ReviewSubmissionRecord, ReviewDecisionRecord, Actor, Credential, Space, SpaceRevision, Membership, Session, Thread, Post, PostRevision, PostRevisionMetadata, RevisionArtifactCatalogItem, Relation, RelationResolution, Artifact, Event, Subscription, Consumer } from '@detuned/protocol';
export declare class SqliteStorage implements StoragePort {
    private readonly db;
    private readonly operationalOptions;
    private inTransaction;
    constructor(db: Database.Database, operationalOptions?: OperationalOptions);
    prepareRuntimeReadIndexes(): void;
    checkReadiness(): boolean;
    sampleOperationalStatus(): StorageOperationalStatus;
    private initPragmas;
    transaction<T>(fn: (tx: StoragePort) => T): T;
    readSnapshot<T>(fn: (snapshot: StoragePort) => T): T;
    openSpaceExportSnapshot(spaceId: string): SqliteSpaceExportSnapshot;
    getExportEventSeq(spaceId: string): string;
    hasExportRedactionAfter(spaceId: string, afterSeq: string, throughSeq: string): boolean;
    findActorById(id: string): Actor | null;
    createActor(actor: Actor): void;
    updateActor(actor: Actor): void;
    findCredentialByTokenHash(tokenHash: string): Credential | null;
    findCredentialById(id: string): Credential | null;
    createCredential(cred: Credential): void;
    revokeCredential(id: string, revokedAt: string): void;
    findSpaceById(id: string): Space | null;
    findSpaceBySlug(slug: string): Space | null;
    createSpace(space: Space, revision: SpaceRevision): void;
    updateSpace(space: Space, revision: SpaceRevision): void;
    getSpaceRevision(spaceId: string, revision: number): SpaceRevision | null;
    listVisibleSpaces(actorId: string, limit: number, cursor?: string | null, allowedSpaceIds?: string[]): {
        spaces: Space[];
        next_cursor: string | null;
    };
    getMembership(spaceId: string, actorId: string): Membership | null;
    upsertMembership(membership: Membership): void;
    listMemberships(spaceId: string): Membership[];
    createSession(session: Session): void;
    findSessionById(id: string): Session | null;
    createThread(thread: Thread): void;
    updateThread(thread: Thread): void;
    getThreadVersion(threadId: string, version: number): ThreadVersionRecord | null;
    createThreadVersion(record: ThreadVersionRecord): void;
    findThreadById(id: string): Thread | null;
    listThreads(spaceId: string, state?: string, limit?: number, cursor?: string | null): {
        threads: Thread[];
        next_cursor: string | null;
    };
    createPost(post: Post, revision: PostRevision): void;
    createPostRevision(post: Post, revision: PostRevision): void;
    updatePost(post: Post): void;
    findPostById(id: string): Post | null;
    getPostRevisionMetadata(postId: string, revision: number): PostRevisionMetadata | null;
    listPostRevisionMetadata(postId: string, limit: number, afterRevision?: number): {
        revisions: PostRevisionMetadata[];
        has_more: boolean;
    };
    listRevisionArtifactMetadata(spaceId: string, postId: string, revision: number, limit: number, afterId?: string): {
        artifacts: RevisionArtifactCatalogItem[];
        has_more: boolean;
    };
    getPostRevision(postId: string, revision: number): PostRevision | null;
    listPostRevisions(postId: string, limit?: number, cursor?: string | null): {
        revisions: PostRevision[];
        next_cursor: string | null;
    };
    /** Canonical UTC milliseconds first; unknown historical values remain ordered by ID. */
    listPostsInThreadByCreatedAt(threadId: string, limit: number, after?: {
        key: string | null;
        id: string;
    }): {
        posts: (Post & {
            sort_key: string | null;
        })[];
        has_more: boolean;
    };
    listPostsInThread(threadId: string, limit?: number, cursor?: string | null): {
        posts: Post[];
        next_cursor: string | null;
    };
    createRelation(relation: Relation): void;
    updateRelation(relation: Relation): void;
    findRelationById(id: string): Relation | null;
    findRelationByEndpoints(spaceId: string, sourcePostId: string, sourceRevision: number, targetPostId: string, targetRevision: number, type: string): Relation | null;
    listRelationsByTarget(spaceId: string, targetPostId: string): Relation[];
    listOpenChallenges(spaceId: string, targetPostId?: string, targetRevision?: number): Relation[];
    listOpenChallengesForThread(spaceId: string, threadId: string, limit: number): Relation[];
    createRelationResolution(resolution: RelationResolution): void;
    findRelationResolutionById(id: string): RelationResolution | null;
    findRelationResolutionByVersion(relationId: string, version: number): RelationResolution | null;
    configureResourceLimits(limits: ResourceLimits): void;
    getArtifactUsage(maxObjects: number): {
        objects: number;
        bytes: bigint;
    };
    getArtifactBytesInSpace(spaceId: string): number;
    listArtifactStorageKeys(): string[];
    createRevisionArtifact(postId: string, revision: number, artifactId: string, purpose: string): void;
    createArtifact(artifact: Artifact): void;
    updateArtifactState(id: string, state: Artifact['state']): void;
    findArtifactById(id: string): Artifact | null;
    appendEvent(spaceId: string, event: Omit<Event, 'seq'>): Event;
    getLatestEventSeq(spaceId: string): number;
    listEventsAfter(spaceId: string, afterSeq: number, limit: number): Event[];
    listPublicEventsForThread(spaceId: string, threadId: string, atOrBeforeSeq: number, limit: number): Event[];
    findEventById(id: string): Event | null;
    getIdempotencyRecord(actorId: string, spaceId: string, operation: string, key: string): IdempotencyRecord | null;
    createIdempotencyRecord(record: IdempotencyRecord): void;
    createSubscription(sub: Subscription): void;
    findSubscriptionById(id: string): Subscription | null;
    findSubscriptionByActorAndSpace(actorId: string, spaceId: string): Subscription | null;
    listSubscriptionsByActorAndSpace(actorId: string, spaceId: string): Subscription[];
    createConsumer(consumer: Consumer): void;
    findConsumerById(id: string): Consumer | null;
    findConsumerByKey(subscriptionId: string, consumerKey: string): Consumer | null;
    updateConsumerAck(id: string, ackSeq: number, version: number): void;
    updateConsumerBatch(id: string, activeBatchId: string | null, version: number): void;
    deactivateConsumer(id: string): void;
    createDeliveryBatch(batch: DeliveryBatchRecord): void;
    findDeliveryBatchById(id: string): DeliveryBatchRecord | null;
    ackDeliveryBatch(id: string, ackedAt: string): void;
    listPublicReviewSubmissionCandidateIds(spaceId: string, filters: {
        request_id?: string;
        target_post_id?: string;
    }, maxCandidates: number): string[];
    searchPosts(spaceId: string, q: string, filters?: {
        kind?: string;
        tags?: string[];
        thread_id?: string;
    }, limit?: number, cursor?: string | null, budget?: {
        max_candidates: number;
    }): {
        items: any[];
        next_cursor: string | null;
    };
    createRedaction(redaction: {
        id: string;
        space_id: string;
        target_type: 'post' | 'artifact';
        target_id: string;
        affected_revisions: number[];
        operator_id: string;
        reason: string;
        created_at: string;
    }): void;
    createReviewSnapshot(record: ReviewSnapshotRecord, items: ReviewSnapshotItemRecord[]): void;
    findReviewSnapshotById(id: string): ReviewSnapshotRecord | null;
    listReviewSnapshotItems(snapshotId: string): ReviewSnapshotItemRecord[];
    getNextReviewRequestRound(spaceId: string, targetPostId: string): number;
    createReviewRequest(record: ReviewRequestRecord, version: ReviewRequestVersionRecord, assignments: ReviewAssignmentRecord[]): void;
    private insertReviewRequestVersion;
    findReviewRequestById(id: string): ReviewRequestRecord | null;
    listPostReviewRequests(spaceId: string, postId: string, limit: number, afterRound?: number): {
        requests: ReviewRequestRecord[];
        has_more: boolean;
    };
    findReviewRequestVersion(requestId: string, version: number): ReviewRequestVersionRecord | null;
    listReviewAssignments(requestId: string): ReviewAssignmentRecord[];
    updateReviewRequest(record: ReviewRequestRecord, version: ReviewRequestVersionRecord): void;
    findReviewAssignmentById(id: string): ReviewAssignmentRecord | null;
    findReviewAssignment(requestId: string, actorId: string): ReviewAssignmentRecord | null;
    createReviewSubmission(record: ReviewSubmissionRecord): void;
    private submissionRow;
    findReviewSubmissionById(id: string): ReviewSubmissionRecord | null;
    findReviewSubmissionByAssignmentId(id: string): ReviewSubmissionRecord | null;
    findReviewSubmissionBySessionId(id: string): ReviewSubmissionRecord | null;
    listReviewSubmissions(requestId: string): ReviewSubmissionRecord[];
    revealReviewSubmissions(requestId: string, revealedAt: string): void;
    getInstanceSecret(): string;
    findReviewDecisionByRequestId(requestId: string): ReviewDecisionRecord | null;
    createReviewDecision(record: ReviewDecisionRecord): void;
    listActiveReviewRequestsForMaterial(spaceId: string, material: {
        kind: 'post' | 'artifact' | 'policy';
        objectId: string;
    }): ReviewRequestRecord[];
    private insertCheckRunVersion;
    createCheckRun(r: CheckRunRecord, v: CheckRunVersionRecord): void;
    findCheckRunById(id: string): CheckRunRecord | null;
    getNextCheckRunAttempt(requestId: string, checkName: string): number;
    findLatestCheckRun(requestId: string, checkName: string): CheckRunRecord | null;
    findCheckRunVersion(runId: string, version: number): CheckRunVersionRecord | null;
    findCheckRunVersionBeforeRequestVersion(runId: string, requestVersion: number): CheckRunVersionRecord | null;
    updateCheckRun(r: CheckRunRecord, v: CheckRunVersionRecord): void;
    createCheckReceipt(r: CheckReceiptRecord): void;
    private checkReceiptRow;
    findCheckReceiptByRunId(runId: string): CheckReceiptRecord | null;
    findCheckReceiptById(receiptId: string): CheckReceiptRecord | null;
    createCheckRunCredential(r: CheckRunCredentialRecord): void;
    findCheckRunCredentialByCredentialId(id: string): CheckRunCredentialRecord | null;
    listCheckRunCredentials(runId: string): CheckRunCredentialRecord[];
}
//# sourceMappingURL=sqlite-storage.d.ts.map