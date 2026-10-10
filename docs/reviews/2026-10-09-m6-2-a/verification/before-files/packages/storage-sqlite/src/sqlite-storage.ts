import { POST_CREATED_SORT_KEY_SQL, preparePostCreatedOrderIndex } from './post-created-order-index.js';
import { checkSqliteReadiness, sampleSqliteStatus, type OperationalOptions } from './operational-status.js';
import { configureSqliteResourceLimits } from './sqlite-resource-limits.js';
import { SqliteSpaceExportSnapshot } from './space-export-snapshot.js';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  StoragePort,
  IdempotencyRecord,
  DeliveryBatchRecord,
  ThreadVersionRecord,
  mapStorageFullError,
  resourceQuotaError,
} from '@detuned/core';
import {
  DetunedError,
  ResourceLimits,
  StorageOperationalStatus,
  resolveResourceLimits,
  ErrorCode,
  ReviewSnapshotRecord, ReviewSnapshotItemRecord, ReviewRequestRecord, ReviewRequestVersionRecord, ReviewAssignmentRecord,
  Actor,
  Credential,
  Space,
  SpaceRevision,
  Membership,
  Session,
  Thread,
  Post,
  PostRevision,
  PostRevisionMetadata,
  RevisionArtifactCatalogItem,
  Relation,
  RelationResolution,
  Artifact,
  Event,
  Subscription,
  Consumer,
} from '@detuned/protocol';

export class SqliteStorage implements StoragePort {
  private inTransaction = false;

  constructor(private readonly db: Database.Database, private readonly operationalOptions: OperationalOptions = {}) {
    this.initPragmas();
  }

  prepareRuntimeReadIndexes(): void { preparePostCreatedOrderIndex(this.db); }

  checkReadiness(): boolean { return checkSqliteReadiness(this.db, this.operationalOptions); }

  sampleOperationalStatus(): StorageOperationalStatus {
    return sampleSqliteStatus(this.db, this.operationalOptions, this.getArtifactUsage(10000));
  }

  private initPragmas(): void {
    if (this.db.inTransaction) {
      return;
    }
    try {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = FULL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');
    } catch {
      // Ignore if pragmas cannot be applied in current database state
    }
  }

  transaction<T>(fn: (tx: StoragePort) => T): T {
    if (this.inTransaction) {
      return fn(this);
    }
    const run = this.db.transaction(() => {
      this.inTransaction = true;
      try {
        return fn(this);
      } finally {
        this.inTransaction = false;
      }
    });
    try { return run.immediate(); } catch (error) { throw mapStorageFullError(error); }
  }

  readSnapshot<T>(fn: (snapshot: StoragePort) => T): T {
    const read = () => {
      const result = fn(this);
      if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result && typeof result.then === 'function') {
        throw new TypeError('readSnapshot requires a synchronous callback.');
      }
      return result;
    };
    // This is a calling convention, not SQLite-enforced read-only mode.
    if (this.db.inTransaction) return read();
    return this.db.transaction(read).deferred();
  }

  openSpaceExportSnapshot(spaceId: string) { return SqliteSpaceExportSnapshot.open(this.db.name, spaceId); }
  getExportEventSeq(spaceId: string): string {
    return (this.db.prepare('SELECT CAST(COALESCE(max(seq),0) AS TEXT) AS seq FROM events WHERE space_id=?').get(spaceId) as { seq: string }).seq;
  }
  hasExportRedactionAfter(spaceId: string, afterSeq: string, throughSeq: string): boolean {
    return Boolean(this.db.prepare("SELECT 1 FROM events WHERE space_id=? AND seq>? AND seq<=? AND type IN ('post.redacted','artifact.redacted') LIMIT 1").get(spaceId, afterSeq, throughSeq));
  }

  // Actors
  findActorById(id: string): Actor | null {
    const row = this.db.prepare('SELECT * FROM actors WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      kind: row.kind,
      display_name: row.display_name,
      created_at: row.created_at,
      disabled_at: row.disabled_at ?? null,
    };
  }

  createActor(actor: Actor): void {
    this.db
      .prepare(
        'INSERT INTO actors (id, kind, display_name, created_at, disabled_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(actor.id, actor.kind, actor.display_name, actor.created_at, actor.disabled_at ?? null);
  }

  updateActor(actor: Actor): void {
    this.db
      .prepare(
        'UPDATE actors SET kind = ?, display_name = ?, disabled_at = ? WHERE id = ?'
      )
      .run(actor.kind, actor.display_name, actor.disabled_at ?? null, actor.id);
  }

  // Credentials
  findCredentialByTokenHash(tokenHash: string): Credential | null {
    const row = this.db
      .prepare('SELECT * FROM credentials WHERE token_hash = ?')
      .get(tokenHash) as any;
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      token_hash: row.token_hash,
      allowed_space_ids: JSON.parse(row.allowed_space_ids),
      capabilities: JSON.parse(row.capabilities),
      expires_at: row.expires_at ?? null,
      revoked_at: row.revoked_at ?? null,
      created_at: row.created_at,
    };
  }

  findCredentialById(id: string): Credential | null {
    const row = this.db.prepare('SELECT * FROM credentials WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      token_hash: row.token_hash,
      allowed_space_ids: JSON.parse(row.allowed_space_ids),
      capabilities: JSON.parse(row.capabilities),
      expires_at: row.expires_at ?? null,
      revoked_at: row.revoked_at ?? null,
      created_at: row.created_at,
    };
  }

  createCredential(cred: Credential): void {
    this.db
      .prepare(
        `INSERT INTO credentials (
          id, actor_id, token_hash, allowed_space_ids, capabilities, expires_at, revoked_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cred.id,
        cred.actor_id,
        cred.token_hash,
        JSON.stringify(cred.allowed_space_ids),
        JSON.stringify(cred.capabilities),
        cred.expires_at ?? null,
        cred.revoked_at ?? null,
        cred.created_at
      );
  }

  revokeCredential(id: string, revokedAt: string): void {
    this.db
      .prepare('UPDATE credentials SET revoked_at = ? WHERE id = ?')
      .run(revokedAt, id);
  }

  // Spaces & Memberships
  findSpaceById(id: string): Space | null {
    const row = this.db.prepare('SELECT * FROM spaces WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      current_revision: row.current_revision,
      policy_revision: row.policy_revision,
      acl_epoch: row.acl_epoch,
      created_at: row.created_at,
    };
  }

  findSpaceBySlug(slug: string): Space | null {
    const row = this.db.prepare('SELECT * FROM spaces WHERE slug = ?').get(slug) as any;
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      current_revision: row.current_revision,
      policy_revision: row.policy_revision,
      acl_epoch: row.acl_epoch,
      created_at: row.created_at,
    };
  }

  createSpace(space: Space, revision: SpaceRevision): void {
    this.db
      .prepare(
        `INSERT INTO spaces (
          id, slug, current_revision, policy_revision, acl_epoch, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        space.id,
        space.slug,
        space.current_revision,
        space.policy_revision,
        space.acl_epoch,
        space.created_at
      );

    this.db
      .prepare(
        `INSERT INTO space_revisions (
          space_id, revision, objective, rules, review_policy, check_profiles, pinned_refs, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revision.space_id,
        revision.revision,
        revision.objective,
        JSON.stringify(revision.rules),
        JSON.stringify(revision.review_policy),
        JSON.stringify(revision.check_profiles),
        JSON.stringify(revision.pinned_refs),
        revision.editor_id,
        revision.created_at
      );
  }

  updateSpace(space: Space, revision: SpaceRevision): void {
    this.db
      .prepare(
        `UPDATE spaces SET
          slug = ?, current_revision = ?, policy_revision = ?, acl_epoch = ?
        WHERE id = ?`
      )
      .run(
        space.slug,
        space.current_revision,
        space.policy_revision,
        space.acl_epoch,
        space.id
      );

    this.db
      .prepare(
        `INSERT INTO space_revisions (
          space_id, revision, objective, rules, review_policy, check_profiles, pinned_refs, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revision.space_id,
        revision.revision,
        revision.objective,
        JSON.stringify(revision.rules),
        JSON.stringify(revision.review_policy),
        JSON.stringify(revision.check_profiles),
        JSON.stringify(revision.pinned_refs),
        revision.editor_id,
        revision.created_at
      );
  }

  getSpaceRevision(spaceId: string, revision: number): SpaceRevision | null {
    const row = this.db
      .prepare('SELECT * FROM space_revisions WHERE space_id = ? AND revision = ?')
      .get(spaceId, revision) as any;
    if (!row) return null;
    return {
      space_id: row.space_id,
      revision: row.revision,
      objective: row.objective,
      rules: JSON.parse(row.rules),
      review_policy: JSON.parse(row.review_policy),
      check_profiles: JSON.parse(row.check_profiles),
      pinned_refs: JSON.parse(row.pinned_refs),
      editor_id: row.editor_id,
      created_at: row.created_at,
    };
  }

  listVisibleSpaces(
    actorId: string,
    limit: number,
    cursor?: string | null,
    allowedSpaceIds?: string[]
  ): { spaces: Space[]; next_cursor: string | null } {
    let sql = `
      SELECT s.* FROM spaces s
      JOIN memberships m ON s.id = m.space_id
      WHERE m.actor_id = ? AND m.active = 1
    `;
    const params: any[] = [actorId];

    if (allowedSpaceIds) {
      if (!allowedSpaceIds.includes('*')) {
        if (allowedSpaceIds.length === 0) {
          sql += ' AND 1 = 0';
        } else {
          sql += ` AND s.id IN (${allowedSpaceIds.map(() => '?').join(', ')})`;
          params.push(...allowedSpaceIds);
        }
      }
    }

    if (cursor) {
      sql += ' AND s.id > ?';
      params.push(cursor);
    }
    sql += ' ORDER BY s.id ASC LIMIT ?';
    params.push(limit + 1);

    const rows = this.db.prepare(sql).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const spaces: Space[] = items.map((r) => ({
      id: r.id,
      slug: r.slug,
      current_revision: r.current_revision,
      policy_revision: r.policy_revision,
      acl_epoch: r.acl_epoch,
      created_at: r.created_at,
    }));

    return { spaces, next_cursor: nextCursor };
  }

  getMembership(spaceId: string, actorId: string): Membership | null {
    const row = this.db
      .prepare('SELECT * FROM memberships WHERE space_id = ? AND actor_id = ?')
      .get(spaceId, actorId) as any;
    if (!row) return null;
    return {
      space_id: row.space_id,
      actor_id: row.actor_id,
      role: row.role,
      active: row.active === 1,
      reviewer_eligible: row.reviewer_eligible === 1,
      independence_group: row.independence_group ?? null,
    };
  }

  upsertMembership(membership: Membership): void {
    this.db
      .prepare(
        `INSERT INTO memberships (
          space_id, actor_id, role, active, reviewer_eligible, independence_group
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(space_id, actor_id) DO UPDATE SET
          role = excluded.role,
          active = excluded.active,
          reviewer_eligible = excluded.reviewer_eligible,
          independence_group = excluded.independence_group`
      )
      .run(
        membership.space_id,
        membership.actor_id,
        membership.role,
        membership.active ? 1 : 0,
        membership.reviewer_eligible ? 1 : 0,
        membership.independence_group ?? null
      );

    // Increment space acl_epoch on membership changes
    this.db
      .prepare('UPDATE spaces SET acl_epoch = acl_epoch + 1 WHERE id = ?')
      .run(membership.space_id);
  }

  listMemberships(spaceId: string): Membership[] {
    const rows = this.db
      .prepare('SELECT * FROM memberships WHERE space_id = ? AND active = 1')
      .all(spaceId) as any[];
    return rows.map((r) => ({
      space_id: r.space_id,
      actor_id: r.actor_id,
      role: r.role,
      active: r.active === 1,
      reviewer_eligible: r.reviewer_eligible === 1,
      independence_group: r.independence_group ?? null,
    }));
  }

  // Sessions
  createSession(session: Session): void {
    this.db
      .prepare(
        `INSERT INTO sessions (
          id, actor_id, space_id, client_name, client_version, harness_session_id, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.actor_id,
        session.space_id,
        session.client_name,
        session.client_version,
        session.harness_session_id ?? null,
        JSON.stringify(session.metadata),
        session.created_at
      );
  }

  findSessionById(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      client_name: row.client_name,
      client_version: row.client_version,
      harness_session_id: row.harness_session_id ?? null,
      metadata: JSON.parse(row.metadata),
      created_at: row.created_at,
    };
  }

  // Threads
  createThread(thread: Thread): void {
    this.db
      .prepare(
        `INSERT INTO threads (
          id, space_id, title, version, state, creator_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        thread.id,
        thread.space_id,
        thread.title,
        thread.version,
        thread.state,
        thread.creator_id,
        thread.created_at,
        thread.updated_at
      );
    this.createThreadVersion({
      thread_id: thread.id,
      version: thread.version,
      title: thread.title,
      state: thread.state,
      created_at: thread.created_at,
    });
  }

  updateThread(thread: Thread): void {
    this.db
      .prepare(
        `UPDATE threads SET
          title = ?, version = ?, state = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(thread.title, thread.version, thread.state, thread.updated_at, thread.id);
    this.createThreadVersion({
      thread_id: thread.id,
      version: thread.version,
      title: thread.title,
      state: thread.state,
      created_at: thread.updated_at,
    });
  }

  getThreadVersion(threadId: string, version: number): ThreadVersionRecord | null {
    const row = this.db
      .prepare(
        'SELECT thread_id, version, title, state, created_at FROM thread_versions WHERE thread_id = ? AND version = ?'
      )
      .get(threadId, version) as any;
    if (!row) return null;
    return {
      thread_id: row.thread_id,
      version: row.version,
      title: row.title,
      state: row.state,
      created_at: row.created_at,
    };
  }

  createThreadVersion(record: ThreadVersionRecord): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO thread_versions (thread_id, version, title, state, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(record.thread_id, record.version, record.title, record.state, record.created_at);
  }

  findThreadById(id: string): Thread | null {
    const row = this.db.prepare('SELECT * FROM threads WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      title: row.title,
      version: row.version,
      state: row.state,
      creator_id: row.creator_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  listThreads(
    spaceId: string,
    state?: string,
    limit = 20,
    cursor?: string | null
  ): { threads: Thread[]; next_cursor: string | null } {
    let sql = 'SELECT * FROM threads WHERE space_id = ?';
    const params: any[] = [spaceId];
    if (state) {
      sql += ' AND state = ?';
      params.push(state);
    }
    if (cursor) {
      sql += ' AND id < ?';
      params.push(cursor);
    }
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = this.db.prepare(sql).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const threads: Thread[] = items.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      title: r.title,
      version: r.version,
      state: r.state,
      creator_id: r.creator_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return { threads, next_cursor: nextCursor };
  }

  // Posts & Revisions
  createPost(post: Post, revision: PostRevision): void {
    this.db
      .prepare(
        `INSERT INTO posts (
          id, space_id, thread_id, author_id, kind, current_revision, lifecycle, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        post.id,
        post.space_id,
        post.thread_id,
        post.author_id,
        post.kind,
        post.current_revision,
        post.lifecycle,
        post.created_at
      );

    this.db
      .prepare(
        `INSERT INTO post_revisions (
          post_id, revision, title, summary, body, tags, structured, content_hash, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revision.post_id,
        revision.revision,
        revision.title,
        revision.summary,
        revision.body,
        JSON.stringify(revision.tags),
        JSON.stringify(revision.structured),
        revision.content_hash,
        revision.editor_id,
        revision.created_at
      );

    // Update FTS
    this.db
      .prepare(
        `INSERT INTO post_fts (post_id, space_id, title, summary, body, tags)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        post.id,
        post.space_id,
        revision.title,
        revision.summary,
        revision.body,
        revision.tags.join(' ')
      );
  }

  createPostRevision(post: Post, revision: PostRevision): void {
    this.db
      .prepare('UPDATE posts SET current_revision = ?, lifecycle = ? WHERE id = ?')
      .run(post.current_revision, post.lifecycle, post.id);

    this.db
      .prepare(
        `INSERT INTO post_revisions (
          post_id, revision, title, summary, body, tags, structured, content_hash, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revision.post_id,
        revision.revision,
        revision.title,
        revision.summary,
        revision.body,
        JSON.stringify(revision.tags),
        JSON.stringify(revision.structured),
        revision.content_hash,
        revision.editor_id,
        revision.created_at
      );

    // Update FTS index with newest revision
    this.db.prepare('DELETE FROM post_fts WHERE post_id = ?').run(post.id);
    this.db
      .prepare(
        `INSERT INTO post_fts (post_id, space_id, title, summary, body, tags)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        post.id,
        post.space_id,
        revision.title,
        revision.summary,
        revision.body,
        revision.tags.join(' ')
      );
  }

  updatePost(post: Post): void {
    this.db
      .prepare('UPDATE posts SET current_revision = ?, lifecycle = ? WHERE id = ?')
      .run(post.current_revision, post.lifecycle, post.id);

    if (post.lifecycle === 'redacted') {
      this.db.prepare('DELETE FROM post_fts WHERE post_id = ?').run(post.id);
    }
  }

  findPostById(id: string): Post | null {
    const row = this.db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      thread_id: row.thread_id,
      author_id: row.author_id,
      kind: row.kind,
      current_revision: row.current_revision,
      lifecycle: row.lifecycle,
      created_at: row.created_at,
    };
  }

  getPostRevisionMetadata(postId: string, revision: number): PostRevisionMetadata | null {
    return this.db.prepare('SELECT revision,editor_id,created_at,content_hash FROM post_revisions WHERE post_id=? AND revision=?')
      .get(postId, revision) as PostRevisionMetadata | undefined ?? null;
  }

  listPostRevisionMetadata(postId: string, limit: number, afterRevision?: number): { revisions: PostRevisionMetadata[]; has_more: boolean } {
    const rows = this.db.prepare(`SELECT revision,editor_id,created_at,content_hash FROM post_revisions
      WHERE post_id=? ${afterRevision === undefined ? '' : 'AND revision<?'} ORDER BY revision DESC LIMIT ?`)
      .all(...(afterRevision === undefined ? [postId, limit + 1] : [postId, afterRevision, limit + 1])) as PostRevisionMetadata[];
    return { revisions: rows.slice(0, limit), has_more: rows.length > limit };
  }

  listRevisionArtifactMetadata(spaceId: string, postId: string, revision: number, limit: number, afterId?: string): { artifacts: RevisionArtifactCatalogItem[]; has_more: boolean } {
    // Filter before projecting. A tombstone never selects its old material metadata into JS.
    const rows = this.db.prepare(`SELECT a.id,a.state,
      CASE WHEN a.state!='redacted' THEN a.owner_id END AS owner_id,
      CASE WHEN a.state!='redacted' THEN a.sha256 END AS sha256,
      CASE WHEN a.state!='redacted' THEN a.bytes END AS bytes,
      CASE WHEN a.state!='redacted' THEN a.mime END AS mime,
      CASE WHEN a.state!='redacted' THEN a.created_at END AS created_at,
      CASE WHEN a.state!='redacted' THEN r.purpose END AS purpose
      FROM revision_artifacts r JOIN artifacts a ON a.id=r.artifact_id
      WHERE r.post_id=? AND r.revision=? AND a.space_id=? AND a.visibility='space'
      ${afterId === undefined ? '' : 'AND a.id>?'} ORDER BY a.id ASC LIMIT ?`)
      .all(...(afterId === undefined ? [postId, revision, spaceId, limit + 1] : [postId, revision, spaceId, afterId, limit + 1])) as Array<{
        id: string; state: 'ready' | 'missing' | 'redacted'; owner_id: string; sha256: string; bytes: number; mime: string; created_at: string; purpose: string;
      }>;
    const artifacts: RevisionArtifactCatalogItem[] = rows.slice(0, limit).map(row => row.state === 'redacted'
      ? { id: row.id, state: 'redacted' }
      : { id: row.id, state: row.state, owner_id: row.owner_id, sha256: row.sha256, bytes: row.bytes, mime: row.mime, created_at: row.created_at, purpose: row.purpose });
    return { artifacts, has_more: rows.length > limit };
  }

  getPostRevision(postId: string, revision: number): PostRevision | null {
    const row = this.db
      .prepare('SELECT * FROM post_revisions WHERE post_id = ? AND revision = ?')
      .get(postId, revision) as any;
    if (!row) return null;
    const post = this.findPostById(postId);
    const isRedacted = post?.lifecycle === 'redacted';
    return {
      post_id: row.post_id,
      revision: row.revision,
      title: isRedacted ? '[REDACTED]' : row.title,
      summary: isRedacted ? '[REDACTED]' : row.summary,
      body: isRedacted ? '[REDACTED]' : row.body,
      tags: isRedacted ? [] : JSON.parse(row.tags),
      structured: isRedacted ? {} : JSON.parse(row.structured),
      content_hash: isRedacted ? 'redacted' : row.content_hash,
      editor_id: row.editor_id,
      created_at: row.created_at,
    };
  }

  listPostRevisions(
    postId: string,
    limit = 20,
    cursor?: string | null
  ): { revisions: PostRevision[]; next_cursor: string | null } {
    const post = this.findPostById(postId);
    const isRedacted = post?.lifecycle === 'redacted';

    let sql = 'SELECT * FROM post_revisions WHERE post_id = ?';
    const params: any[] = [postId];
    if (cursor) {
      sql += ' AND revision < ?';
      params.push(parseInt(cursor, 10));
    }
    sql += ' ORDER BY revision DESC LIMIT ?';
    params.push(limit + 1);

    const rows = this.db.prepare(sql).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? String(items[items.length - 1].revision) : null;

    const revisions: PostRevision[] = items.map((r) => ({
      post_id: r.post_id,
      revision: r.revision,
      title: isRedacted ? '[REDACTED]' : r.title,
      summary: isRedacted ? '[REDACTED]' : r.summary,
      body: isRedacted ? '[REDACTED]' : r.body,
      tags: isRedacted ? [] : JSON.parse(r.tags),
      structured: isRedacted ? {} : JSON.parse(r.structured),
      content_hash: isRedacted ? 'redacted' : r.content_hash,
      editor_id: r.editor_id,
      created_at: r.created_at,
    }));

    return { revisions, next_cursor: nextCursor };
  }

  /** Canonical UTC milliseconds first; unknown historical values remain ordered by ID. */
  listPostsInThreadByCreatedAt(threadId: string, limit: number, after?: { key: string | null; id: string }): { posts: (Post & { sort_key: string | null })[]; has_more: boolean } {
    const key = POST_CREATED_SORT_KEY_SQL;
    const params: (string | number)[] = [threadId];
    let where = '';
    if (after) {
      if (after.key === null) { where = ' WHERE sort_key IS NULL AND id > ?'; params.push(after.id); }
      else { where = ' WHERE sort_key IS NULL OR sort_key > ? OR (sort_key = ? AND id > ?)'; params.push(after.key, after.key, after.id); }
    }
    params.push(limit + 1);
    const rows = this.db.prepare(`SELECT * FROM (SELECT id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at,${key} AS sort_key FROM posts WHERE thread_id = ?)${where} ORDER BY sort_key IS NULL ASC, sort_key ASC, id ASC LIMIT ?`).all(...params) as (Post & { sort_key: string | null })[];
    return { posts: rows.slice(0, limit), has_more: rows.length > limit };
  }

  listPostsInThread(
    threadId: string,
    limit = 50,
    cursor?: string | null
  ): { posts: Post[]; next_cursor: string | null } {
    let sql = 'SELECT * FROM posts WHERE thread_id = ?';
    const params: any[] = [threadId];
    if (cursor) {
      sql += ' AND id > ?';
      params.push(cursor);
    }
    sql += ' ORDER BY id ASC LIMIT ?';
    params.push(limit + 1);

    const rows = this.db.prepare(sql).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const posts: Post[] = items.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      thread_id: r.thread_id,
      author_id: r.author_id,
      kind: r.kind,
      current_revision: r.current_revision,
      lifecycle: r.lifecycle,
      created_at: r.created_at,
    }));

    return { posts, next_cursor: nextCursor };
  }

  // Relations & Resolutions
  createRelation(relation: Relation): void {
    this.db
      .prepare(
        `INSERT INTO relations (
          id, space_id, source_post_id, source_revision, target_post_id, target_revision,
          type, state, version, creator_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        relation.id,
        relation.space_id,
        relation.source_post_id,
        relation.source_revision,
        relation.target_post_id,
        relation.target_revision,
        relation.type,
        relation.state,
        relation.version,
        relation.creator_id,
        relation.created_at
      );
  }

  updateRelation(relation: Relation): void {
    this.db
      .prepare('UPDATE relations SET state = ?, version = ? WHERE id = ?')
      .run(relation.state, relation.version, relation.id);
  }

  findRelationById(id: string): Relation | null {
    const row = this.db.prepare('SELECT * FROM relations WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      source_post_id: row.source_post_id,
      source_revision: row.source_revision,
      target_post_id: row.target_post_id,
      target_revision: row.target_revision,
      type: row.type,
      state: row.state,
      version: row.version,
      creator_id: row.creator_id,
      created_at: row.created_at,
    };
  }

  findRelationByEndpoints(
    spaceId: string,
    sourcePostId: string,
    sourceRevision: number,
    targetPostId: string,
    targetRevision: number,
    type: string
  ): Relation | null {
    const row = this.db
      .prepare(
        `SELECT * FROM relations WHERE
          space_id = ? AND source_post_id = ? AND source_revision = ?
          AND target_post_id = ? AND target_revision = ? AND type = ?`
      )
      .get(spaceId, sourcePostId, sourceRevision, targetPostId, targetRevision, type) as any;
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      source_post_id: row.source_post_id,
      source_revision: row.source_revision,
      target_post_id: row.target_post_id,
      target_revision: row.target_revision,
      type: row.type,
      state: row.state,
      version: row.version,
      creator_id: row.creator_id,
      created_at: row.created_at,
    };
  }

  listRelationsByTarget(spaceId: string, targetPostId: string): Relation[] {
    const rows = this.db.prepare('SELECT id FROM relations WHERE space_id=? AND target_post_id=? ORDER BY created_at ASC,id ASC').all(spaceId, targetPostId) as { id: string }[];
    return rows.map(row => this.findRelationById(row.id)!);
  }

  listOpenChallenges(
    spaceId: string,
    targetPostId?: string,
    targetRevision?: number
  ): Relation[] {
    let sql = "SELECT * FROM relations WHERE space_id = ? AND type = 'challenges' AND state = 'open'";
    const params: any[] = [spaceId];
    if (targetPostId) {
      sql += ' AND target_post_id = ?';
      params.push(targetPostId);
    }
    if (targetRevision !== undefined) {
      sql += ' AND target_revision = ?';
      params.push(targetRevision);
    }
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      source_post_id: r.source_post_id,
      source_revision: r.source_revision,
      target_post_id: r.target_post_id,
      target_revision: r.target_revision,
      type: r.type,
      state: r.state,
      version: r.version,
      creator_id: r.creator_id,
      created_at: r.created_at,
    }));
  }

  listOpenChallengesForThread(spaceId: string, threadId: string, limit: number): Relation[] {
    const rows = this.db.prepare(`SELECT r.id FROM relations r
      JOIN posts source ON source.id = r.source_post_id
      JOIN posts target ON target.id = r.target_post_id
      WHERE r.space_id = ? AND r.type = 'challenges' AND r.state = 'open'
        AND source.space_id = ? AND target.space_id = ?
        AND (source.thread_id = ? OR target.thread_id = ?)
      ORDER BY r.created_at ASC, r.id ASC LIMIT ?`)
      .all(spaceId, spaceId, spaceId, threadId, threadId, limit) as { id: string }[];
    return rows.map(row => this.findRelationById(row.id)!);
  }

  createRelationResolution(resolution: RelationResolution): void {
    this.db
      .prepare(
        `INSERT INTO relation_resolutions (
          id, relation_id, version, resolver_id, reason_ref, action, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        resolution.id,
        resolution.relation_id,
        resolution.version,
        resolution.resolver_id,
        JSON.stringify(resolution.reason_ref),
        resolution.action,
        resolution.created_at
      );
  }

  findRelationResolutionById(id: string): RelationResolution | null {
    const row = this.db.prepare('SELECT * FROM relation_resolutions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      relation_id: row.relation_id,
      version: row.version,
      resolver_id: row.resolver_id,
      reason_ref: JSON.parse(row.reason_ref),
      action: row.action,
      created_at: row.created_at,
    };
  }

  findRelationResolutionByVersion(relationId: string, version: number): RelationResolution | null {
    const row = this.db.prepare('SELECT * FROM relation_resolutions WHERE relation_id = ? AND version = ?').get(relationId, version) as any;
    if (!row) return null;
    return {
      id: row.id,
      relation_id: row.relation_id,
      version: row.version,
      resolver_id: row.resolver_id,
      reason_ref: JSON.parse(row.reason_ref),
      action: row.action,
      created_at: row.created_at,
    };
  }

  configureResourceLimits(limits: ResourceLimits): void {
    const resolved = resolveResourceLimits(limits);
    configureSqliteResourceLimits(this.db, resolved);
    const usage = this.getArtifactUsage(resolved.artifact_max_objects);
    if (usage.objects > resolved.artifact_max_objects || usage.bytes > BigInt(resolved.artifact_max_total_bytes)) throw resourceQuotaError('instance_artifacts');
  }

  getArtifactUsage(maxObjects: number): { objects: number; bytes: bigint } {
    if (!Number.isSafeInteger(maxObjects) || maxObjects < 1 || maxObjects > 10000) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '登记附件计量范围非法。', 400);
    let objects = 0, bytes = 0n;
    const rows = this.db.prepare('SELECT CAST(bytes AS TEXT) AS bytes FROM artifacts ORDER BY id LIMIT ?').iterate(maxObjects + 1) as IterableIterator<{ bytes: string }>;
    try {
      for (const row of rows) {
        if (typeof row.bytes !== 'string' || !/^[0-9]+$/.test(row.bytes)) throw resourceQuotaError('instance_artifacts');
        objects++; bytes += BigInt(row.bytes);
      }
    } finally { rows.return?.(); }
    return { objects, bytes };
  }

  // Artifacts
  getArtifactBytesInSpace(spaceId: string): number {
    const row = this.db.prepare('SELECT COALESCE(SUM(bytes), 0) AS bytes FROM artifacts WHERE space_id = ?').get(spaceId) as { bytes: number };
    return row.bytes;
  }
  listArtifactStorageKeys(): string[] {
    return (this.db.prepare('SELECT storage_key FROM artifacts').all() as { storage_key: string }[]).map(row => row.storage_key);
  }
  createRevisionArtifact(postId: string, revision: number, artifactId: string, purpose: string): void {
    this.db.prepare('INSERT INTO revision_artifacts (post_id, revision, artifact_id, purpose) VALUES (?, ?, ?, ?)').run(postId, revision, artifactId, purpose);
  }
  createArtifact(artifact: Artifact): void {
    this.db
      .prepare(
        `INSERT INTO artifacts (
          id, space_id, owner_id, visibility, review_assignment_id, check_run_id,
          sha256, bytes, mime, storage_key, state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        artifact.id,
        artifact.space_id,
        artifact.owner_id,
        artifact.visibility,
        artifact.review_assignment_id ?? null,
        artifact.check_run_id ?? null,
        artifact.sha256,
        artifact.bytes,
        artifact.mime,
        artifact.storage_key,
        artifact.state,
        artifact.created_at
      );
  }

  updateArtifactState(id: string, state: Artifact['state']): void {
    this.db.prepare('UPDATE artifacts SET state = ? WHERE id = ?').run(state, id);
  }

  findArtifactById(id: string): Artifact | null {
    const row = this.db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      owner_id: row.owner_id,
      visibility: row.visibility,
      review_assignment_id: row.review_assignment_id ?? null,
      check_run_id: row.check_run_id ?? null,
      sha256: row.sha256,
      bytes: row.bytes,
      mime: row.mime,
      storage_key: row.storage_key,
      state: row.state,
      created_at: row.created_at,
    };
  }

  // Events
  appendEvent(spaceId: string, event: Omit<Event, 'seq'>): Event {
    const maxRow = this.db
      .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM events WHERE space_id = ?')
      .get(spaceId) as any;
    const nextSeq = (maxRow?.max_seq ?? 0) + 1;

    this.db
      .prepare(
        `INSERT INTO events (
          id, space_id, seq, type, object_id, revision, visibility, actor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        spaceId,
        nextSeq,
        event.type,
        event.object_id,
        event.revision ?? null,
        event.visibility,
        event.actor_id,
        event.created_at
      );

    return {
      ...event,
      seq: nextSeq,
    };
  }

  getLatestEventSeq(spaceId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM events WHERE space_id = ?')
      .get(spaceId) as any;
    return row?.max_seq ?? 0;
  }

  listEventsAfter(spaceId: string, afterSeq: number, limit: number): Event[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM events WHERE space_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?'
      )
      .all(spaceId, afterSeq, limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      seq: r.seq,
      type: r.type,
      object_id: r.object_id,
      revision: r.revision ?? null,
      visibility: r.visibility,
      actor_id: r.actor_id,
      created_at: r.created_at,
    }));
  }

  listPublicEventsForThread(spaceId: string, threadId: string, atOrBeforeSeq: number, limit: number): Event[] {
    // Match the existing subscription object ownership rules, without polling or writes.
    const rows = this.db.prepare(`SELECT e.* FROM events e
      WHERE e.space_id = ? AND e.visibility = 'public' AND e.seq <= ? AND (
        (e.type LIKE 'thread.%' AND e.object_id = ?) OR
        (e.type LIKE 'post.%' AND EXISTS (
          SELECT 1 FROM posts p WHERE p.id = e.object_id AND p.thread_id = ?)) OR
        (e.type LIKE 'relation.%' AND EXISTS (
          SELECT 1 FROM relations r
          LEFT JOIN posts source ON source.id = r.source_post_id
          LEFT JOIN posts target ON target.id = r.target_post_id
          WHERE r.id = e.object_id AND (source.thread_id = ? OR target.thread_id = ?)))
      ) ORDER BY e.seq DESC LIMIT ?`)
      .all(spaceId, atOrBeforeSeq, threadId, threadId, threadId, threadId, limit) as any[];
    return rows.reverse().map(r => ({
      id: r.id, space_id: r.space_id, seq: r.seq, type: r.type, object_id: r.object_id,
      revision: r.revision ?? null, visibility: r.visibility, actor_id: r.actor_id, created_at: r.created_at,
    }));
  }

  findEventById(id: string): Event | null {
    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      seq: row.seq,
      type: row.type,
      object_id: row.object_id,
      revision: row.revision ?? null,
      visibility: row.visibility,
      actor_id: row.actor_id,
      created_at: row.created_at,
    };
  }

  // Idempotency
  getIdempotencyRecord(
    actorId: string,
    spaceId: string,
    operation: string,
    key: string
  ): IdempotencyRecord | null {
    const row = this.db
      .prepare(
        'SELECT * FROM idempotency_records WHERE actor_id = ? AND space_id = ? AND operation = ? AND key = ?'
      )
      .get(actorId, spaceId, operation, key) as any;
    if (!row) return null;
    return {
      actor_id: row.actor_id,
      space_id: row.space_id,
      operation: row.operation,
      key: row.key,
      request_hash: row.request_hash,
      result_ref: row.result_ref,
      http_status: row.http_status,
      created_at: row.created_at,
    };
  }

  createIdempotencyRecord(record: IdempotencyRecord): void {
    this.db
      .prepare(
        `INSERT INTO idempotency_records (
          actor_id, space_id, operation, key, request_hash, result_ref, http_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.actor_id,
        record.space_id,
        record.operation,
        record.key,
        record.request_hash,
        record.result_ref,
        record.http_status,
        record.created_at
      );
  }

  // Subscriptions & Consumers
  createSubscription(sub: Subscription): void {
    this.db
      .prepare(
        `INSERT INTO subscriptions (
          id, actor_id, space_id, thread_ids, event_types, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        sub.id,
        sub.actor_id,
        sub.space_id,
        JSON.stringify(sub.thread_ids),
        JSON.stringify(sub.event_types),
        sub.created_at
      );
  }

  findSubscriptionById(id: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      thread_ids: JSON.parse(row.thread_ids),
      event_types: JSON.parse(row.event_types),
      created_at: row.created_at,
    };
  }

  findSubscriptionByActorAndSpace(actorId: string, spaceId: string): Subscription | null {
    const row = this.db
      .prepare('SELECT * FROM subscriptions WHERE actor_id = ? AND space_id = ?')
      .get(actorId, spaceId) as any;
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      thread_ids: JSON.parse(row.thread_ids),
      event_types: JSON.parse(row.event_types),
      created_at: row.created_at,
    };
  }

  listSubscriptionsByActorAndSpace(actorId: string, spaceId: string): Subscription[] {
    const rows = this.db
      .prepare('SELECT * FROM subscriptions WHERE actor_id = ? AND space_id = ?')
      .all(actorId, spaceId) as any[];
    return rows.map((row) => ({
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      thread_ids: JSON.parse(row.thread_ids),
      event_types: JSON.parse(row.event_types),
      created_at: row.created_at,
    }));
  }

  createConsumer(consumer: Consumer): void {
    this.db
      .prepare(
        `INSERT INTO consumers (
          id, subscription_id, consumer_key, ack_seq, version, active_batch_id, acl_epoch
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        consumer.id,
        consumer.subscription_id,
        consumer.consumer_key,
        consumer.ack_seq,
        consumer.version,
        consumer.active_batch_id ?? null,
        consumer.acl_epoch
      );
  }

  findConsumerById(id: string): Consumer | null {
    const row = this.db.prepare('SELECT * FROM consumers WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      subscription_id: row.subscription_id,
      consumer_key: row.consumer_key,
      ack_seq: row.ack_seq,
      version: row.version,
      active_batch_id: row.active_batch_id ?? null,
      acl_epoch: row.acl_epoch,
    };
  }

  findConsumerByKey(subscriptionId: string, consumerKey: string): Consumer | null {
    const row = this.db
      .prepare('SELECT * FROM consumers WHERE subscription_id = ? AND consumer_key = ?')
      .get(subscriptionId, consumerKey) as any;
    if (!row) return null;
    return {
      id: row.id,
      subscription_id: row.subscription_id,
      consumer_key: row.consumer_key,
      ack_seq: row.ack_seq,
      version: row.version,
      active_batch_id: row.active_batch_id ?? null,
      acl_epoch: row.acl_epoch,
    };
  }

  updateConsumerAck(id: string, ackSeq: number, version: number): void {
    this.db
      .prepare('UPDATE consumers SET ack_seq = ?, version = ? WHERE id = ?')
      .run(ackSeq, version, id);
  }

  updateConsumerBatch(id: string, activeBatchId: string | null, version: number): void {
    this.db
      .prepare('UPDATE consumers SET active_batch_id = ?, version = ? WHERE id = ?')
      .run(activeBatchId ?? null, version, id);
  }

  deactivateConsumer(id: string): void {
    this.transaction(() => {
      this.db.prepare('DELETE FROM delivery_batches WHERE consumer_id = ?').run(id);
      this.db.prepare('DELETE FROM consumers WHERE id = ?').run(id);
    });
  }

  // Delivery Batches
  createDeliveryBatch(batch: DeliveryBatchRecord): void {
    this.db
      .prepare(
        `INSERT INTO delivery_batches (
          id, consumer_id, from_seq, through_seq, event_ids, acked_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        batch.id,
        batch.consumer_id,
        batch.from_seq,
        batch.through_seq,
        JSON.stringify(batch.event_ids),
        batch.acked_at ?? null,
        batch.created_at
      );
  }

  findDeliveryBatchById(id: string): DeliveryBatchRecord | null {
    const row = this.db.prepare('SELECT * FROM delivery_batches WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      consumer_id: row.consumer_id,
      from_seq: row.from_seq,
      through_seq: row.through_seq,
      event_ids: JSON.parse(row.event_ids),
      acked_at: row.acked_at ?? null,
      created_at: row.created_at,
    };
  }

  ackDeliveryBatch(id: string, ackedAt: string): void {
    this.db
      .prepare('UPDATE delivery_batches SET acked_at = ? WHERE id = ?')
      .run(ackedAt, id);
  }

  // Search & Views
  searchPosts(
    spaceId: string, q: string,
    filters?: { kind?: string; tags?: string[]; thread_id?: string },
    limit = 20, cursor?: string | null,
    budget?: { max_candidates: number }
  ): { items: any[]; next_cursor: string | null } {
    // One deferred read snapshot for cardinality preflight and the actual page.
    return this.db.transaction(() => {
      const trimmed = q.trim();
      const useFts = [...trimmed].length >= 3;
      const from = useFts
        ? 'FROM post_fts f JOIN posts p ON f.post_id=p.id JOIN post_revisions r ON p.id=r.post_id AND p.current_revision=r.revision'
        : 'FROM posts p JOIN post_revisions r ON p.id=r.post_id AND p.current_revision=r.revision';
      const where = ["p.space_id=?", "p.lifecycle='active'"];
      const params: (string | number)[] = [spaceId];
      if (useFts) { where.push('f.space_id=?', 'post_fts MATCH ?'); params.push(spaceId, `"${trimmed.replace(/"/g, '""')}"`); }
      if (filters?.kind) { where.push('p.kind=?'); params.push(filters.kind); }
      if (filters?.thread_id) { where.push('p.thread_id=?'); params.push(filters.thread_id); }
      for (const tag of new Set(filters?.tags ?? [])) {
        where.push("EXISTS(SELECT 1 FROM json_each(r.tags) WHERE type='text' AND value COLLATE BINARY=?)"); params.push(tag);
      }
      if (cursor) { where.push('p.id<?'); params.push(cursor); }
      if (budget) {
        if (!Number.isSafeInteger(budget.max_candidates) || budget.max_candidates < 1) throw new Error('Invalid search candidate budget');
        // LIKE counts the complete property-filtered candidate set before text scanning.
        // FTS counts matching candidates. Neither is a VM instruction/time limit.
        const candidates = this.db.prepare(`SELECT p.id ${from} WHERE ${where.join(' AND ')} LIMIT ?`).all(...params, budget.max_candidates + 1);
        if (candidates.length > budget.max_candidates) {
          throw new DetunedError(ErrorCode.QUERY_TOO_BROAD, '搜索候选超过限额，请缩小标签、类型或主题条件。', 422);
        }
      }
      if (!useFts && trimmed.length > 0) {
        const pattern = `%${trimmed.replace(/([%_\\])/g, '\\$1')}%`;
        where.push("(r.title LIKE ? ESCAPE '\\' OR r.summary LIKE ? ESCAPE '\\' OR r.body LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM json_each(r.tags) WHERE type='text' AND value LIKE ? ESCAPE '\\'))");
        params.push(pattern, pattern, pattern, pattern);
      }
      const snippet = useFts ? "snippet(post_fts,2,'<b>','</b>','...',16)" : 'r.summary';
      const rows = this.db.prepare(`SELECT p.id AS post_id,p.thread_id,p.kind,p.current_revision,r.title,r.summary,r.tags,r.created_at,${snippet} AS snippet ${from} WHERE ${where.join(' AND ')} ORDER BY p.id DESC LIMIT ?`).all(...params, limit + 1) as any[];
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map(r => ({post_id:r.post_id,revision:r.current_revision,thread_id:r.thread_id,kind:r.kind,title:r.title,summary:r.summary,tags:typeof r.tags==='string'?JSON.parse(r.tags):r.tags,snippet:r.snippet??r.summary,created_at:r.created_at})),
        next_cursor: hasMore ? page[page.length - 1].post_id : null,
      };
    })();
  }

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
  }): void {
    this.transaction(() => {
      let actualAffectedRevisions = redaction.affected_revisions;

      if (redaction.target_type === 'post') {
        const post = this.findPostById(redaction.target_id);
        if (!post || post.space_id !== redaction.space_id) {
          throw new Error('NOT_FOUND: 目标帖子不存在或不属于该空间。');
        }

        const revRows = this.db
          .prepare('SELECT revision FROM post_revisions WHERE post_id = ? ORDER BY revision ASC')
          .all(redaction.target_id) as { revision: number }[];
        if (revRows.length > 0) {
          actualAffectedRevisions = revRows.map((r) => r.revision);
        }

        this.db
          .prepare("UPDATE posts SET lifecycle = 'redacted' WHERE id = ? AND space_id = ?")
          .run(redaction.target_id, redaction.space_id);

        // Sanitize post revisions in database (including tags!)
        this.db
          .prepare(
            "UPDATE post_revisions SET title = '[REDACTED]', summary = '[REDACTED]', body = '[REDACTED]', tags = '[]', structured = '{}' WHERE post_id = ?"
          )
          .run(redaction.target_id);

        // Remove from FTS index
        this.db.prepare('DELETE FROM post_fts WHERE post_id = ?').run(redaction.target_id);

        // Also sanitize any historical idempotency records containing this post's content
        const idemRows = this.db
          .prepare('SELECT actor_id, space_id, operation, key, result_ref FROM idempotency_records WHERE space_id = ?')
          .all(redaction.space_id) as any[];
        for (const row of idemRows) {
          if (row.result_ref && row.result_ref.includes(redaction.target_id)) {
            try {
              const parsed = JSON.parse(row.result_ref);
              let changed = false;
              if (parsed.post && parsed.post.id === redaction.target_id) {
                parsed.post.lifecycle = 'redacted';
                if (parsed.revision) {
                  parsed.revision.title = '[REDACTED]';
                  parsed.revision.summary = '[REDACTED]';
                  parsed.revision.body = '[REDACTED]';
                  parsed.revision.tags = [];
                  parsed.revision.structured = {};
                }
                changed = true;
              }
              if (parsed.initial_post?.post && parsed.initial_post.post.id === redaction.target_id) {
                parsed.initial_post.post.lifecycle = 'redacted';
                if (parsed.initial_post.revision) {
                  parsed.initial_post.revision.title = '[REDACTED]';
                  parsed.initial_post.revision.summary = '[REDACTED]';
                  parsed.initial_post.revision.body = '[REDACTED]';
                  parsed.initial_post.revision.tags = [];
                  parsed.initial_post.revision.structured = {};
                }
                changed = true;
              }
              if (changed) {
                this.db
                  .prepare('UPDATE idempotency_records SET result_ref = ? WHERE actor_id = ? AND space_id = ? AND operation = ? AND key = ?')
                  .run(JSON.stringify(parsed), row.actor_id, row.space_id, row.operation, row.key);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      } else if (redaction.target_type === 'artifact') {
        const artifact = this.findArtifactById(redaction.target_id);
        if (!artifact || artifact.space_id !== redaction.space_id) {
          throw new Error('NOT_FOUND: 目标附件不存在或不属于该空间。');
        }
        this.db
          .prepare("UPDATE artifacts SET state = 'redacted' WHERE id = ? AND space_id = ?")
          .run(redaction.target_id, redaction.space_id);
      }

      this.db
        .prepare(
          `INSERT INTO redactions (
            id, space_id, target_type, target_id, affected_revisions, operator_id, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          redaction.id,
          redaction.space_id,
          redaction.target_type,
          redaction.target_id,
          JSON.stringify(actualAffectedRevisions),
          redaction.operator_id,
          redaction.reason,
          redaction.created_at
        );
    });
  }

  createReviewSnapshot(record: ReviewSnapshotRecord, items: ReviewSnapshotItemRecord[]): void {
    this.transaction(() => {
      this.db.prepare(`INSERT INTO snapshots (id,space_id,manifest_json,manifest_sha256,policy_revision,rules_revision,target_post_id,target_revision,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(record.id,record.space_id,record.manifest_json,record.manifest_sha256,record.policy_revision,record.rules_revision,record.target_ref.post_id,record.target_ref.revision,record.created_by,record.created_at);
      const insert = this.db.prepare('INSERT INTO snapshot_items (snapshot_id,item_type,item_id,revision,sha256) VALUES (?,?,?,?,?)');
      for (const item of items) {
        if (item.snapshot_id !== record.id) throw new Error('Invalid review snapshot item.');
        insert.run(item.snapshot_id,item.item_type,item.item_id,item.revision,item.sha256);
      }
    });
  }

  findReviewSnapshotById(id: string): ReviewSnapshotRecord | null {
    const row = this.db.prepare('SELECT * FROM snapshots WHERE id=?').get(id) as (Omit<ReviewSnapshotRecord,'target_ref'> & {target_post_id:string;target_revision:number}) | undefined;
    if (!row) return null;
    const {target_post_id,target_revision,...rest} = row;
    return {...rest,target_ref:{post_id:target_post_id,revision:target_revision}};
  }

  listReviewSnapshotItems(snapshotId: string): ReviewSnapshotItemRecord[] {
    return this.db.prepare('SELECT snapshot_id,item_type,item_id,revision,sha256 FROM snapshot_items WHERE snapshot_id=? ORDER BY item_type,item_id,revision').all(snapshotId) as ReviewSnapshotItemRecord[];
  }

  getNextReviewRequestRound(spaceId: string, targetPostId: string): number {
    const row = this.db.prepare('SELECT COALESCE(MAX(round),0)+1 AS next FROM review_requests WHERE space_id=? AND target_post_id=?').get(spaceId,targetPostId) as {next:number};
    return row.next;
  }

  createReviewRequest(record: ReviewRequestRecord, version: ReviewRequestVersionRecord, assignments: ReviewAssignmentRecord[]): void {
    this.transaction(() => {
      if (version.request_id !== record.id || version.version !== record.version) throw new Error('Invalid review request version.');
      this.db.prepare(`INSERT INTO review_requests (id,space_id,target_post_id,target_revision,snapshot_id,round,phase,version,requested_by,created_at,changed_by,changed_at,reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(record.id,record.space_id,record.target_ref.post_id,record.target_ref.revision,record.snapshot_id,record.round,record.phase,record.version,record.requested_by,record.created_at,record.changed_by,record.changed_at,record.reason);
      this.insertReviewRequestVersion(version);
      const insert = this.db.prepare('INSERT INTO review_assignments (request_id,reviewer_actor_id,group_at_assignment) VALUES (?,?,?)');
      for (const assignment of assignments) {
        if (assignment.request_id !== record.id) throw new Error('Invalid review assignment.');
        insert.run(assignment.request_id,assignment.reviewer_actor_id,assignment.group_at_assignment);
      }
    });
  }

  private insertReviewRequestVersion(version: ReviewRequestVersionRecord): void {
    this.db.prepare('INSERT INTO review_request_versions (request_id,version,phase,changed_by,changed_at,reason) VALUES (?,?,?,?,?,?)').run(version.request_id,version.version,version.phase,version.changed_by,version.changed_at,version.reason);
  }

  findReviewRequestById(id: string): ReviewRequestRecord | null {
    const row = this.db.prepare('SELECT * FROM review_requests WHERE id=?').get(id) as (Omit<ReviewRequestRecord,'target_ref'> & {target_post_id:string;target_revision:number}) | undefined;
    if (!row) return null;
    const {target_post_id,target_revision,...rest} = row;
    return {...rest,target_ref:{post_id:target_post_id,revision:target_revision}};
  }

  findReviewRequestVersion(requestId: string, version: number): ReviewRequestVersionRecord | null {
    return (this.db.prepare('SELECT request_id,version,phase,changed_by,changed_at,reason FROM review_request_versions WHERE request_id=? AND version=?').get(requestId,version) as ReviewRequestVersionRecord | undefined) ?? null;
  }

  listReviewAssignments(requestId: string): ReviewAssignmentRecord[] {
    return this.db.prepare('SELECT request_id,reviewer_actor_id,group_at_assignment FROM review_assignments WHERE request_id=? ORDER BY reviewer_actor_id').all(requestId) as ReviewAssignmentRecord[];
  }

  updateReviewRequest(record: ReviewRequestRecord, version: ReviewRequestVersionRecord): void {
    this.transaction(() => {
      if (version.request_id !== record.id || version.version !== record.version) throw new Error('Invalid review request version.');
      const result = this.db.prepare('UPDATE review_requests SET phase=?,version=?,changed_by=?,changed_at=?,reason=? WHERE id=? AND version=?').run(record.phase,record.version,record.changed_by,record.changed_at,record.reason,record.id,record.version-1);
      if (result.changes !== 1) throw new Error('Invalid review request update.');
      this.insertReviewRequestVersion(version);
    });
  }

  getInstanceSecret(): string {
    const row = this.db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any;
    if (row?.value && typeof row.value === 'string' && row.value.trim() !== '') {
      return row.value.trim();
    }
    throw new Error('实例持久密钥缺失或未初始化。请先执行 detuned init 初始化。');
  }
}
