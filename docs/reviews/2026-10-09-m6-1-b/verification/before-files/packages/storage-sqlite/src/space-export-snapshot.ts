import Database from 'better-sqlite3';
import { lstatSync, realpathSync } from 'node:fs';
import { DetunedError } from '@detuned/protocol';
import type { SpaceExportSnapshot, SpaceExportCandidate, SpaceExportKind, SpaceExportRefState, SpaceExportArtifactState } from '@detuned/core';

interface Family { kind: SpaceExportKind; from: string; where: string; columns: string[]; keys: string[]; rawColumns?: string[] }
const FAMILIES: Family[] = [
  { kind: 'space', from: 'spaces s', where: 's.id=?', columns: ['s.id','s.slug','s.current_revision','s.policy_revision','s.created_at'], keys: ['s.id'] },
  { kind: 'space_revision', from: 'space_revisions r', where: 'r.space_id=?', columns: ['r.space_id','r.revision','r.objective','r.rules','r.review_policy','r.check_profiles','r.pinned_refs','r.editor_id','r.created_at'], keys: ['r.revision'] },
  { kind: 'thread', from: 'threads t', where: 't.space_id=?', columns: ['t.id','t.space_id','t.title','t.version','t.state','t.creator_id','t.created_at','t.updated_at'], keys: ['t.id'] },
  { kind: 'thread_version', from: 'thread_versions v JOIN threads t ON t.id=v.thread_id', where: 't.space_id=?', columns: ['v.thread_id','v.version','v.title','v.state','v.created_at'], keys: ['v.thread_id','v.version'] },
  { kind: 'post', from: 'posts p', where: 'p.space_id=?', columns: ['p.id','p.space_id','p.thread_id','p.author_id','p.kind','p.current_revision','p.lifecycle','p.created_at'], keys: ['p.id'] },
  { kind: 'post_revision', from: 'post_revisions r JOIN posts p ON p.id=r.post_id', where: 'p.space_id=?', columns: ['r.post_id','r.revision',"CASE WHEN p.lifecycle='redacted' THEN NULL ELSE r.title END AS title", "CASE WHEN p.lifecycle='redacted' THEN NULL ELSE r.summary END AS summary", "CASE WHEN p.lifecycle='redacted' THEN NULL ELSE r.body END AS body", "CASE WHEN p.lifecycle='redacted' THEN NULL ELSE r.tags END AS tags", "CASE WHEN p.lifecycle='redacted' THEN NULL ELSE r.structured END AS structured", "CASE WHEN p.lifecycle='redacted' THEN NULL ELSE r.content_hash END AS content_hash",'r.editor_id','r.created_at','p.lifecycle'], keys: ['r.post_id','r.revision'], rawColumns: ['r.post_id','r.revision',...['title','summary','body','tags','structured','content_hash'].map(field => `CASE WHEN p.lifecycle='redacted' THEN '' ELSE r.${field} END`),'r.editor_id','r.created_at','p.lifecycle'] },
  { kind: 'relation', from: 'relations r', where: 'r.space_id=?', columns: ['r.id','r.space_id','r.source_post_id','r.source_revision','r.target_post_id','r.target_revision','r.type','r.state','r.version','r.creator_id','r.created_at'], keys: ['r.id'] },
  { kind: 'relation_resolution', from: 'relation_resolutions r JOIN relations l ON l.id=r.relation_id', where: 'l.space_id=?', columns: ['r.id','r.relation_id','r.version','r.resolver_id','r.reason_ref','r.action','r.created_at','l.source_post_id','l.source_revision','l.target_post_id','l.target_revision'], keys: ['r.id'] },
  { kind: 'revision_artifact', from: 'revision_artifacts r JOIN posts p ON p.id=r.post_id JOIN artifacts a ON a.id=r.artifact_id', where: "p.space_id=? AND a.space_id=p.space_id AND a.visibility='space'", columns: ['r.post_id','r.revision','r.artifact_id','r.purpose'], keys: ['r.post_id','r.revision','r.artifact_id'] },
  { kind: 'artifact', from: 'artifacts a', where: "a.space_id=? AND a.visibility='space'", columns: ['a.id','a.space_id','a.owner_id','a.visibility','a.sha256','a.bytes','a.mime','a.state','a.created_at'], keys: ['a.id'] },
];
const JSON_FIELDS = new Set(['rules','review_policy','check_profiles','pinned_refs','tags','structured','reason_ref']);
function unavailable(): DetunedError { return new DetunedError('EXPORT_UNAVAILABLE', 'Space export requires an independent file-backed read-only snapshot.', 503, false); }
/** Does not run SqliteStorage init pragmas, migrations or write transactions. */
export class SqliteSpaceExportSnapshot implements SpaceExportSnapshot {
  private family = 0;
  private last: (string | number)[] | undefined;
  private closed = false;
  readonly spaceRevision: number;
  readonly aclEpoch: number;
  readonly eventSeq: string;
  private constructor(private readonly db: Database.Database, private readonly spaceId: string) {
    if (db.pragma('journal_mode', { simple: true }) !== 'wal') throw unavailable();
    db.pragma('query_only=ON'); db.pragma('cache_size=-2048'); db.exec('BEGIN');
    const space = db.prepare('SELECT current_revision,acl_epoch FROM spaces WHERE id=?').get(spaceId) as { current_revision: number; acl_epoch: number } | undefined;
    if (!space) throw new DetunedError('NOT_FOUND', 'Space does not exist or is not readable.', 404);
    this.spaceRevision = space.current_revision; this.aclEpoch = space.acl_epoch;
    this.eventSeq = (db.prepare('SELECT CAST(COALESCE(max(seq),0) AS TEXT) AS seq FROM events WHERE space_id=?').get(spaceId) as { seq: string }).seq;
    if (!/^(0|[1-9][0-9]{0,18})$/.test(this.eventSeq)) throw unavailable();
  }
  static open(file: string, spaceId: string): SqliteSpaceExportSnapshot {
    let db: Database.Database | undefined;
    try {
      if (!file || file === ':memory:') throw unavailable();
      const resolved = realpathSync(file); const stat = lstatSync(resolved);
      if (!stat.isFile()) throw unavailable();
      db = new Database(resolved, { readonly: true, fileMustExist: true });
      return new SqliteSpaceExportSnapshot(db, spaceId);
    } catch (error) { db?.close(); if (error instanceof DetunedError) throw error; throw unavailable(); }
  }
  nextCandidate(maxRawBytes: number): SpaceExportCandidate | null {
    if (this.closed) return null;
    while (this.family < FAMILIES.length) {
      const f = FAMILIES[this.family]!;
      const clause = this.last ? ` AND (${f.keys.join(',')}) > (${f.keys.map(() => '?').join(',')})` : '';
      const params = [this.spaceId, ...(this.last ?? [])];
      const raw = (f.rawColumns ?? f.columns).map(column => `COALESCE(length(CAST(${column} AS BLOB)),0)`).join('+');
      const keyColumns = f.keys.map((key, i) => `${key} AS k${i}`).join(',');
      const where = `${f.where}${clause}`; const order = f.keys.join(',');
      const key = this.db.prepare(`SELECT ${keyColumns}, ${raw} AS raw_bytes FROM ${f.from} WHERE ${where} ORDER BY ${order} LIMIT 1`).get(...params) as Record<string, string | number> | undefined;
      if (!key) { this.family++; this.last = undefined; continue; }
      if (Number(key.raw_bytes) > maxRawBytes) throw new DetunedError('EXPORT_LIMIT_EXCEEDED', 'A stored export candidate exceeds the raw byte limit.', 422);
      this.last = f.keys.map((_field, index) => key[`k${index}`]!);
      const identity = f.keys.map(field => `${field}=?`).join(' AND ');
      const row = this.db.prepare(`SELECT ${f.columns.join(',')} FROM ${f.from} WHERE ${f.where} AND ${identity} LIMIT 1`).get(this.spaceId, ...this.last) as Record<string, unknown>;
      for (const field of JSON_FIELDS) if (Object.hasOwn(row, field) && row[field] !== null) {
        if (typeof row[field] !== 'string') throw new DetunedError('EXPORT_UNAVAILABLE', 'Stored export content is malformed.', 503);
        try { row[field] = JSON.parse(row[field]); } catch { throw new DetunedError('EXPORT_UNAVAILABLE', 'Stored export content is malformed.', 503); }
      }
      return { kind: f.kind, data: row };
    }
    return null;
  }
  postRef(postId: string, revision: number): SpaceExportRefState | null {
    const row = this.db.prepare('SELECT p.space_id,p.lifecycle,EXISTS(SELECT 1 FROM post_revisions r WHERE r.post_id=p.id AND r.revision=?) AS present FROM posts p WHERE p.id=?').get(revision, postId) as { space_id: string; lifecycle: string; present: number } | undefined;
    return row ? { space_id: row.space_id, lifecycle: row.lifecycle, exists: Boolean(row.present) } : null;
  }
  artifactState(artifactId: string): SpaceExportArtifactState | null {
    return this.db.prepare('SELECT space_id,visibility,state FROM artifacts WHERE id=?').get(artifactId) as SpaceExportArtifactState | undefined ?? null;
  }
  close(): void { if (!this.closed) { this.closed = true; try { this.db.exec('ROLLBACK'); } finally { this.db.close(); } } }
}
