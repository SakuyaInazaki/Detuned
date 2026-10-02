import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  StoragePort,
  IdempotencyRecord,
  DeliveryBatchRecord,
  ThreadVersionRecord,
} from '@detuned/core';
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
} from '@detuned/protocol';

export class SqliteStorage implements StoragePort {
  private inTransaction = false;

  constructor(private readonly db: Database.Database) {
    this.initPragmas();
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
    return run.immediate();
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

  // Artifacts
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
    this.db.prepare('DELETE FROM consumers WHERE id = ?').run(id);
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
    spaceId: string,
    q: string,
    filters?: { kind?: string; tags?: string[]; thread_id?: string },
    limit = 20,
    cursor?: string | null
  ): { items: any[]; next_cursor: string | null } {
    const trimmed = q.trim();
    let rows: any[] = [];

    if (trimmed.length >= 3) {
      // Trigram MATCH search on post_fts
      // Safe literal phrase wrapping: escape internal quotes
      const sanitized = `"${trimmed.replace(/"/g, '""')}"`;
      let sql = `
        SELECT p.id as post_id, p.thread_id, p.kind, p.current_revision,
               r.title, r.summary, r.tags, r.created_at,
               snippet(post_fts, 2, '<b>', '</b>', '...', 16) as snippet
        FROM post_fts f
        JOIN posts p ON f.post_id = p.id
        JOIN post_revisions r ON p.id = r.post_id AND p.current_revision = r.revision
        WHERE f.space_id = ? AND post_fts MATCH ? AND p.lifecycle = 'active'
      `;
      const params: any[] = [spaceId, sanitized];

      if (filters?.kind) {
        sql += ' AND p.kind = ?';
        params.push(filters.kind);
      }
      if (filters?.thread_id) {
        sql += ' AND p.thread_id = ?';
        params.push(filters.thread_id);
      }
      if (cursor) {
        sql += ' AND p.id < ?';
        params.push(cursor);
      }
      sql += ' ORDER BY p.id DESC LIMIT ?';
      params.push(limit + 1);

      rows = this.db.prepare(sql).all(...params) as any[];
    } else {
      // 1-2 chars: fallback to LIKE search on active posts & revisions
      function escapeLike(str: string): string {
        return str.replace(/([%_\\])/g, '\\$1');
      }
      const escaped = escapeLike(trimmed);
      let sql = `
        SELECT p.id as post_id, p.thread_id, p.kind, p.current_revision,
               r.title, r.summary, r.tags, r.created_at,
               r.summary as snippet
        FROM posts p
        JOIN post_revisions r ON p.id = r.post_id AND p.current_revision = r.revision
        WHERE p.space_id = ? AND p.lifecycle = 'active'
      `;
      const params: any[] = [spaceId];

      if (trimmed.length > 0) {
        sql += " AND (r.title LIKE ? ESCAPE '\\' OR r.summary LIKE ? ESCAPE '\\' OR r.body LIKE ? ESCAPE '\\')";
        params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
      }

      if (filters?.kind) {
        sql += ' AND p.kind = ?';
        params.push(filters.kind);
      }
      if (filters?.thread_id) {
        sql += ' AND p.thread_id = ?';
        params.push(filters.thread_id);
      }
      if (cursor) {
        sql += ' AND p.id < ?';
        params.push(cursor);
      }
      sql += ' ORDER BY p.id DESC LIMIT ?';
      params.push(limit + 1);

      rows = this.db.prepare(sql).all(...params) as any[];
    }

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].post_id : null;

    const formatted = items.map((r) => ({
      post_id: r.post_id,
      revision: r.current_revision,
      thread_id: r.thread_id,
      kind: r.kind,
      title: r.title,
      summary: r.summary,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
      snippet: r.snippet ?? r.summary,
      created_at: r.created_at,
    }));

    return { items: formatted, next_cursor: nextCursor };
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

  getInstanceSecret(): string {
    const row = this.db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any;
    if (row?.value && typeof row.value === 'string' && row.value.trim() !== '') {
      return row.value.trim();
    }
    throw new Error('实例持久密钥缺失或未初始化。请先执行 detuned init 初始化。');
  }
}
