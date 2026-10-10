import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { AdminService, ArtifactService, AuthService, CryptoHasher, CryptoIdGenerator, EventService, HmacTokenSigner, IdempotencyService, PostService, RelationService, SpaceService, ThreadService, WriteRateLimiter, type AuthenticatedContext, type BlobStorePort } from '@detuned/core';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { DEFAULT_ARTIFACT_LIMITS } from '@detuned/protocol';

function errorOf(action: () => unknown): any { try { action(); } catch (e) { return e; } throw Error('expected rejection'); }

describe('M3.4-A.1 process-local write admission', () => {
  let db: Database.Database, storage: SqliteStorage, auth: AuthenticatedContext, as: AuthService;
  let ms: number, sid: string, tid: string, postId: string;
  const ids = new CryptoIdGenerator(), hash = new CryptoHasher(), signer = new HmacTokenSigner();
  const clock = { now: () => new Date(ms), nowIso: () => new Date(ms).toISOString() };
  let limiter: WriteRateLimiter, idem: IdempotencyService, spaces: SpaceService, posts: PostService, threads: ThreadService, relations: RelationService, events: EventService, admin: AdminService;
  beforeEach(() => {
    ms = 1893456000000; db = new Database(':memory:'); const boot = bootstrapDatabase(db); storage = new SqliteStorage(db);
    const seedLimiter = new WriteRateLimiter(clock, { per_minute: 60000, burst: 10000 });
    const seedAuth = new AuthService(storage, hash, clock, seedLimiter); auth = seedAuth.authenticateToken(boot.adminToken!);
    const seedIdem = new IdempotencyService(storage, hash, clock, seedLimiter);
    sid = new SpaceService(storage, ids, clock, seedAuth, seedIdem).createSpace(auth, { slug: 'rate', objective: 'o', rules: [] }, 'seed-space').space.id;
    tid = new ThreadService(storage, ids, clock, hash, seedAuth, seedIdem).createThread(auth, sid, { title: 't' }, 'seed-thread').thread.id;
    postId = new PostService(storage, ids, clock, hash, seedAuth, seedIdem).createPost(auth, sid, tid, { kind: 'note', title: 'p', summary: 's' }, 'seed-post').post.id;
    limiter = new WriteRateLimiter(clock); as = new AuthService(storage, hash, clock, limiter); idem = new IdempotencyService(storage, hash, clock, limiter);
    spaces = new SpaceService(storage, ids, clock, as, idem); threads = new ThreadService(storage, ids, clock, hash, as, idem);
    posts = new PostService(storage, ids, clock, hash, as, idem); relations = new RelationService(storage, ids, clock, as, idem);
    events = new EventService(storage, ids, clock, signer, as, 'rate-test-secret'); admin = new AdminService(storage, ids, clock, as);
  });
  afterEach(() => db.close());
  const session = () => spaces.createSession(auth, sid, { client_name: 'rate-test', client_version: '1' });
  const exhaust = () => { for (let i = 0; i < 20; i++) session(); };

  it('admits the real default 20-session burst and refills one token at exactly 1000ms', () => {
    exhaust(); expect(errorOf(session)).toMatchObject({ code: 'RATE_LIMITED', statusCode: 429, retryable: true, details: { scope: 'actor', retry_after_seconds: 1 } });
    ms += 999; expect(errorOf(session).details.retry_after_seconds).toBe(1); ms++; session(); expect(errorOf(session).code).toBe('RATE_LIMITED');
    expect((db.prepare('SELECT COUNT(*) n FROM sessions').get() as any).n).toBe(21);
  });

  it('preserves a wall-clock high water mark and caps a large forward jump at burst', () => {
    exhaust(); ms -= 60000; expect(errorOf(session)).toMatchObject({ code: 'RATE_LIMITED', details: { retry_after_seconds: 61 } });
    ms -= 1000000000000; expect(errorOf(session).details.retry_after_seconds).toBe(600000); ms += 1000000000000; ms += 60999; expect(errorOf(session).code).toBe('RATE_LIMITED');
    ms++; session(); ms += 1000000000000; exhaust(); expect(errorOf(session).code).toBe('RATE_LIMITED');
  });

  it('uses exact integer refill and ceil seconds at a non-divisor configured rate', () => {
    const meter = new WriteRateLimiter(clock, { per_minute: 7, burst: 1 }); meter.admit('one');
    expect(errorOf(() => meter.admit('one')).details.retry_after_seconds).toBe(9); ms += 8571;
    expect(errorOf(() => meter.admit('one')).details.retry_after_seconds).toBe(1); ms++; meter.admit('one');
  });

  it('does not evict indebted identities at capacity and reclaims only fully refilled buckets', () => {
    const meter = new WriteRateLimiter(clock, { per_minute: 60, burst: 2 }, { maxActors: 2 }); meter.admit('a'); meter.admit('b');
    expect(errorOf(() => meter.admit('c'))).toMatchObject({ details: { scope: 'instance', retry_after_seconds: 1 } });
    meter.admit('a'); expect(errorOf(() => meter.admit('a')).details.scope).toBe('actor'); ms += 1000; meter.admit('c');
    meter.admit('a'); expect(errorOf(() => meter.admit('a')).details.scope).toBe('actor');
  });

  it('keeps successful replay and key conflicts before admission, and charges rollback failures', () => {
    const created = threads.createThread(auth, sid, { title: 'stable' }, 'stable'); for (let i = 0; i < 19; i++) session();
    expect(threads.createThread(auth, sid, { title: 'stable' }, 'stable').thread.id).toBe(created.thread.id);
    expect(errorOf(() => threads.createThread(auth, sid, { title: 'different' }, 'stable')).code).toBe('IDEMPOTENCY_CONFLICT');
    expect(errorOf(session).code).toBe('RATE_LIMITED'); ms += 1000;
    expect(errorOf(() => posts.createRevision(auth, sid, postId, { expected_revision: 99, title: 'new', summary: 's' }, 'bad-version')).code).toBe('REVISION_CONFLICT');
    expect(storage.findPostById(postId)!.current_revision).toBe(1);
    expect(storage.getIdempotencyRecord(auth.actor.id, sid, `post.revision:${postId}`, 'bad-version')).toBeNull();
    expect(errorOf(session).code).toBe('RATE_LIMITED');
  });

  it('shares admin/session/subscription admission while poll and ACK remain usable at exhaustion', () => {
    const subscription = events.subscribe(auth, sid, { consumer_key: 'one', start: 'now' });
    admin.createActor(auth, { kind: 'agent', display_name: 'new actor' }); for (let i = 0; i < 18; i++) session();
    expect(events.subscribe(auth, sid, { consumer_key: 'one', start: 'now' }).consumer.id).toBe(subscription.consumer.id);
    expect(errorOf(() => events.subscribe(auth, sid, { consumer_key: 'two', start: 'now' })).code).toBe('RATE_LIMITED');
    storage.appendEvent(sid, { id: ids.generateId('evt'), space_id: sid, type: 'post.created', object_id: postId, revision: 1, actor_id: auth.actor.id, visibility: 'public', created_at: clock.nowIso() });
    const batch = events.poll(auth, sid, subscription.consumer.id, {});
    expect(events.ack(auth, sid, subscription.consumer.id, { batch_id: batch.batch_id!, next_cursor: batch.next_cursor! }).confirmed).toBe(true);
    expect(errorOf(() => events.deactivateConsumer(auth, sid, subscription.consumer.id)).code).toBe('RATE_LIMITED');
    expect(errorOf(() => admin.createActor(auth, { kind: 'agent', display_name: 'no' })).code).toBe('RATE_LIMITED');
  });

  it('preserves object authorization before 429 for non-authors and ineligible resolvers', () => {
    storage.createActor({ id: 'other', kind: 'agent', display_name: 'other', created_at: clock.nowIso(), disabled_at: null });
    storage.upsertMembership({ actor_id: 'other', space_id: sid, role: 'contributor', active: true, reviewer_eligible: true, independence_group: null });
    storage.createCredential({ id: 'other-cred', actor_id: 'other', token_hash: hash.sha256('other-token'), allowed_space_ids: [sid], capabilities: ['read','write'], expires_at: null, revoked_at: null, created_at: clock.nowIso() });
    const other = as.authenticateToken('other-token');
    const relation = relations.createRelation(auth, sid, { type: 'challenges', source_ref: { post_id: postId, revision: 1 }, target_ref: { post_id: postId, revision: 1 } }, 'challenge');
    for (let i = 0; i < 20; i++) spaces.createSession(other, sid, { client_name: 'test', client_version: '1' });
    expect(errorOf(() => posts.createRevision(other, sid, postId, { expected_revision: 1, title: 'bad', summary: 's' }, 'unauthorized')).statusCode).toBe(403);
    expect(errorOf(() => relations.resolveChallenge(other, sid, relation.id, { expected_version: 1, reason_ref: { post_id: postId, revision: 1 } }, 'resolve')).statusCode).toBe(403);
    expect(errorOf(() => threads.patchThread(other, sid, tid, { expected_version: 1, title: 'bad' }, 'patch')).statusCode).toBe(403);
    for (let i = 0; i < 19; i++) session();
    expect(errorOf(() => posts.createRevision(auth, sid, postId, { expected_revision: 1, title: 'ok', summary: 's' }, 'authorized')).code).toBe('RATE_LIMITED');
  });

  it('does not charge denied space access, but one actor shares limits across token and space', () => {
    const sid2 = new SpaceService(storage, ids, clock, as, new IdempotencyService(storage, hash, clock, new WriteRateLimiter(clock))).createSpace(auth, { slug: 'second', objective: 'o', rules: [] }, 'second').space.id;
    storage.createCredential({ ...auth.credential, id: 'second-cred', token_hash: hash.sha256('second-token') });
    const alternate = as.authenticateToken('second-token');
    expect(errorOf(() => spaces.createSession(alternate, 'unknown', { client_name: 'x', client_version: '1' })).statusCode).toBe(404);
    for (let i = 0; i < 10; i++) session();
    for (let i = 0; i < 10; i++) spaces.createSession(alternate, sid2, { client_name: 'x', client_version: '1' });
    expect(errorOf(session).code).toBe('RATE_LIMITED');
  });

  it('charges artifact once at the final transaction and avoids duplicate replay charge after stage I/O', async () => {
    const published = new Set<string>(); let publishes = 0;
    const blobs: BlobStorePort = { stage: async () => { throw Error('unused'); }, publish: async (_stage,key) => { publishes++; published.add(key); }, discardStage: async () => {}, discardPublished: async key => { published.delete(key); }, exists: async key => published.has(key), open: async () => null };
    const artifacts = new ArtifactService(storage, blobs, as, idem, ids, clock, DEFAULT_ARTIFACT_LIMITS);
    const input = { metadata: { visibility: 'space' as const }, mime: 'text/plain', staged: { stage_key: 'stage', bytes: 1, sha256: hash.sha256('a') } };
    const artifact = await artifacts.create(auth, sid, input, 'artifact'); for (let i = 0; i < 19; i++) session();
    expect((await artifacts.create(auth, sid, input, 'artifact')).id).toBe(artifact.id);
    await expect(artifacts.create(auth, sid, input, 'fresh')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(publishes).toBe(3); expect(published.size).toBe(1);
  });
});
