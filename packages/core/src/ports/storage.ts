import {
  Actor,
  Credential,
  Space,
  SpaceRevision,
  Membership,
  Session,
  Thread,
  Post,
  PostRevision,
  Relation,
  RelationResolution,
  Artifact,
  Event,
  Subscription,
  Consumer,
  PollResponseData,
} from '@detuned/protocol';

export interface IdempotencyRecord {
  actor_id: string;
  space_id: string;
  operation: string;
  key: string;
  request_hash: string;
  result_ref: string; // JSON string of result or ref
  http_status: number;
  created_at: string;
}

export interface DeliveryBatchRecord {
  id: string;
  consumer_id: string;
  from_seq: number;
  through_seq: number;
  event_ids: string[];
  acked_at: string | null;
  created_at: string;
}

export interface StoragePort {
  transaction<T>(fn: (tx: StoragePort) => T): T;

  // Actors & Credentials
  findActorById(id: string): Actor | null;
  createActor(actor: Actor): void;
  updateActor(actor: Actor): void;

  findCredentialByTokenHash(tokenHash: string): Credential | null;
  findCredentialById(id: string): Credential | null;
  createCredential(cred: Credential): void;
  revokeCredential(id: string, revokedAt: string): void;

  // Spaces & Memberships
  findSpaceById(id: string): Space | null;
  findSpaceBySlug(slug: string): Space | null;
  createSpace(space: Space, revision: SpaceRevision): void;
  updateSpace(space: Space, revision: SpaceRevision): void;
  getSpaceRevision(spaceId: string, revision: number): SpaceRevision | null;
  listVisibleSpaces(
    actorId: string,
    limit: number,
    cursor?: string | null,
    allowedSpaceIds?: string[]
  ): { spaces: Space[]; next_cursor: string | null };

  getMembership(spaceId: string, actorId: string): Membership | null;
  upsertMembership(membership: Membership): void;
  listMemberships(spaceId: string): Membership[];

  // Sessions
  createSession(session: Session): void;
  findSessionById(id: string): Session | null;

  // Threads
  createThread(thread: Thread): void;
  updateThread(thread: Thread): void;
  findThreadById(id: string): Thread | null;
  listThreads(spaceId: string, state?: string, limit?: number, cursor?: string | null): { threads: Thread[]; next_cursor: string | null };

  // Posts & Revisions
  createPost(post: Post, revision: PostRevision): void;
  createPostRevision(post: Post, revision: PostRevision): void;
  updatePost(post: Post): void;
  findPostById(id: string): Post | null;
  getPostRevision(postId: string, revision: number): PostRevision | null;
  listPostRevisions(postId: string, limit?: number, cursor?: string | null): { revisions: PostRevision[]; next_cursor: string | null };
  listPostsInThread(threadId: string, limit?: number, cursor?: string | null): { posts: Post[]; next_cursor: string | null };

  // Relations & Resolutions
  createRelation(relation: Relation): void;
  updateRelation(relation: Relation): void;
  findRelationById(id: string): Relation | null;
  findRelationByEndpoints(
    spaceId: string,
    sourcePostId: string,
    sourceRevision: number,
    targetPostId: string,
    targetRevision: number,
    type: string
  ): Relation | null;
  listOpenChallenges(spaceId: string, targetPostId?: string, targetRevision?: number): Relation[];
  createRelationResolution(resolution: RelationResolution): void;
  findRelationResolutionById(id: string): RelationResolution | null;

  // Artifacts
  createArtifact(artifact: Artifact): void;
  updateArtifactState(id: string, state: Artifact['state']): void;
  findArtifactById(id: string): Artifact | null;

  // Events
  appendEvent(spaceId: string, event: Omit<Event, 'seq'>): Event;
  getLatestEventSeq(spaceId: string): number;
  listEventsAfter(spaceId: string, afterSeq: number, limit: number): Event[];
  findEventById(id: string): Event | null;

  // Idempotency
  getIdempotencyRecord(actorId: string, spaceId: string, operation: string, key: string): IdempotencyRecord | null;
  createIdempotencyRecord(record: IdempotencyRecord): void;

  // Subscriptions & Consumers
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

  // Delivery Batches
  createDeliveryBatch(batch: DeliveryBatchRecord): void;
  findDeliveryBatchById(id: string): DeliveryBatchRecord | null;
  ackDeliveryBatch(id: string, ackedAt: string): void;

  // Search & Views
  searchPosts(
    spaceId: string,
    q: string,
    filters?: { kind?: string; tags?: string[]; thread_id?: string },
    limit?: number,
    cursor?: string | null
  ): { items: any[]; next_cursor: string | null };

  // Redactions
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
}
