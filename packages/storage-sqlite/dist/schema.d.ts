export declare const SCHEMA_SQL = "\nCREATE TABLE IF NOT EXISTS schema_migrations (\n  version INTEGER PRIMARY KEY,\n  applied_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS actors (\n  id TEXT PRIMARY KEY,\n  kind TEXT NOT NULL,\n  display_name TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  disabled_at TEXT\n);\n\nCREATE TABLE IF NOT EXISTS credentials (\n  id TEXT PRIMARY KEY,\n  actor_id TEXT NOT NULL REFERENCES actors(id),\n  token_hash TEXT NOT NULL UNIQUE,\n  allowed_space_ids TEXT NOT NULL,\n  capabilities TEXT NOT NULL,\n  expires_at TEXT,\n  revoked_at TEXT,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS spaces (\n  id TEXT PRIMARY KEY,\n  slug TEXT NOT NULL UNIQUE,\n  current_revision INTEGER NOT NULL DEFAULT 1,\n  policy_revision INTEGER NOT NULL DEFAULT 1,\n  acl_epoch INTEGER NOT NULL DEFAULT 1,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS space_revisions (\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  revision INTEGER NOT NULL,\n  objective TEXT NOT NULL,\n  rules TEXT NOT NULL,\n  review_policy TEXT NOT NULL,\n  check_profiles TEXT NOT NULL,\n  pinned_refs TEXT NOT NULL,\n  editor_id TEXT NOT NULL REFERENCES actors(id),\n  created_at TEXT NOT NULL,\n  PRIMARY KEY (space_id, revision)\n);\n\nCREATE TABLE IF NOT EXISTS memberships (\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  actor_id TEXT NOT NULL REFERENCES actors(id),\n  role TEXT NOT NULL,\n  active INTEGER NOT NULL DEFAULT 1,\n  reviewer_eligible INTEGER NOT NULL DEFAULT 1,\n  independence_group TEXT,\n  PRIMARY KEY (space_id, actor_id)\n);\n\nCREATE TABLE IF NOT EXISTS sessions (\n  id TEXT PRIMARY KEY,\n  actor_id TEXT NOT NULL REFERENCES actors(id),\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  client_name TEXT NOT NULL,\n  client_version TEXT NOT NULL,\n  harness_session_id TEXT,\n  metadata TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS threads (\n  id TEXT PRIMARY KEY,\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  title TEXT NOT NULL,\n  version INTEGER NOT NULL DEFAULT 1,\n  state TEXT NOT NULL DEFAULT 'open',\n  creator_id TEXT NOT NULL REFERENCES actors(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS thread_versions (\n  thread_id TEXT NOT NULL REFERENCES threads(id),\n  version INTEGER NOT NULL,\n  title TEXT NOT NULL,\n  state TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  PRIMARY KEY (thread_id, version)\n);\n\nCREATE TABLE IF NOT EXISTS posts (\n  id TEXT PRIMARY KEY,\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  thread_id TEXT NOT NULL REFERENCES threads(id),\n  author_id TEXT NOT NULL REFERENCES actors(id),\n  kind TEXT NOT NULL,\n  current_revision INTEGER NOT NULL DEFAULT 1,\n  lifecycle TEXT NOT NULL DEFAULT 'active',\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS post_revisions (\n  post_id TEXT NOT NULL REFERENCES posts(id),\n  revision INTEGER NOT NULL,\n  title TEXT NOT NULL,\n  summary TEXT NOT NULL,\n  body TEXT NOT NULL,\n  tags TEXT NOT NULL,\n  structured TEXT NOT NULL,\n  content_hash TEXT NOT NULL,\n  editor_id TEXT NOT NULL REFERENCES actors(id),\n  created_at TEXT NOT NULL,\n  PRIMARY KEY (post_id, revision)\n);\n\nCREATE TABLE IF NOT EXISTS relations (\n  id TEXT PRIMARY KEY,\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  source_post_id TEXT NOT NULL REFERENCES posts(id),\n  source_revision INTEGER NOT NULL,\n  target_post_id TEXT NOT NULL REFERENCES posts(id),\n  target_revision INTEGER NOT NULL,\n  type TEXT NOT NULL,\n  state TEXT NOT NULL DEFAULT 'open',\n  version INTEGER NOT NULL DEFAULT 1,\n  creator_id TEXT NOT NULL REFERENCES actors(id),\n  created_at TEXT NOT NULL,\n  UNIQUE (space_id, source_post_id, source_revision, target_post_id, target_revision, type)\n);\n\nCREATE TABLE IF NOT EXISTS relation_resolutions (\n  id TEXT PRIMARY KEY,\n  relation_id TEXT NOT NULL REFERENCES relations(id),\n  version INTEGER NOT NULL,\n  resolver_id TEXT NOT NULL REFERENCES actors(id),\n  reason_ref TEXT NOT NULL,\n  action TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS artifacts (\n  id TEXT PRIMARY KEY,\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  owner_id TEXT NOT NULL REFERENCES actors(id),\n  visibility TEXT NOT NULL DEFAULT 'space',\n  review_assignment_id TEXT,\n  check_run_id TEXT,\n  sha256 TEXT NOT NULL,\n  bytes INTEGER NOT NULL,\n  mime TEXT NOT NULL,\n  storage_key TEXT NOT NULL,\n  state TEXT NOT NULL DEFAULT 'ready',\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS revision_artifacts (\n  post_id TEXT NOT NULL,\n  revision INTEGER NOT NULL,\n  artifact_id TEXT NOT NULL REFERENCES artifacts(id),\n  purpose TEXT NOT NULL DEFAULT 'evidence',\n  PRIMARY KEY (post_id, revision, artifact_id)\n);\n\nCREATE TABLE IF NOT EXISTS subscriptions (\n  id TEXT PRIMARY KEY,\n  actor_id TEXT NOT NULL REFERENCES actors(id),\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  thread_ids TEXT NOT NULL,\n  event_types TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS consumers (\n  id TEXT PRIMARY KEY,\n  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),\n  consumer_key TEXT NOT NULL,\n  ack_seq INTEGER NOT NULL DEFAULT 0,\n  version INTEGER NOT NULL DEFAULT 1,\n  active_batch_id TEXT,\n  acl_epoch INTEGER NOT NULL DEFAULT 1,\n  UNIQUE (subscription_id, consumer_key)\n);\n\nCREATE TABLE IF NOT EXISTS delivery_batches (\n  id TEXT PRIMARY KEY,\n  consumer_id TEXT NOT NULL REFERENCES consumers(id),\n  from_seq INTEGER NOT NULL,\n  through_seq INTEGER NOT NULL,\n  event_ids TEXT NOT NULL,\n  acked_at TEXT,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS events (\n  id TEXT PRIMARY KEY,\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  seq INTEGER NOT NULL,\n  type TEXT NOT NULL,\n  object_id TEXT NOT NULL,\n  revision INTEGER,\n  visibility TEXT NOT NULL DEFAULT 'public',\n  actor_id TEXT NOT NULL REFERENCES actors(id),\n  created_at TEXT NOT NULL,\n  UNIQUE (space_id, seq)\n);\n\nCREATE INDEX IF NOT EXISTS idx_events_space_seq ON events(space_id, seq);\n\nCREATE TABLE IF NOT EXISTS idempotency_records (\n  actor_id TEXT NOT NULL,\n  space_id TEXT NOT NULL,\n  operation TEXT NOT NULL,\n  key TEXT NOT NULL,\n  request_hash TEXT NOT NULL,\n  result_ref TEXT NOT NULL,\n  http_status INTEGER NOT NULL,\n  created_at TEXT NOT NULL,\n  PRIMARY KEY (actor_id, space_id, operation, key)\n);\n\nCREATE TABLE IF NOT EXISTS redactions (\n  id TEXT PRIMARY KEY,\n  space_id TEXT NOT NULL REFERENCES spaces(id),\n  target_type TEXT NOT NULL,\n  target_id TEXT NOT NULL,\n  affected_revisions TEXT NOT NULL,\n  operator_id TEXT NOT NULL REFERENCES actors(id),\n  reason TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS instance_metadata (\n  key TEXT PRIMARY KEY,\n  value TEXT NOT NULL\n);\n\nCREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(\n  post_id UNINDEXED,\n  space_id UNINDEXED,\n  title,\n  summary,\n  body,\n  tags,\n  tokenize=\"trigram\"\n);\n";
export declare const SCHEMA_MIGRATIONS_DDL = "CREATE TABLE IF NOT EXISTS schema_migrations (\n  version INTEGER PRIMARY KEY,\n  applied_at TEXT NOT NULL\n);";
export declare const INSTANCE_METADATA_DDL = "CREATE TABLE IF NOT EXISTS instance_metadata (\n  key TEXT PRIMARY KEY,\n  value TEXT NOT NULL\n);";
export declare const THREAD_VERSIONS_DDL = "CREATE TABLE IF NOT EXISTS thread_versions (\n  thread_id TEXT NOT NULL REFERENCES threads(id),\n  version INTEGER NOT NULL,\n  title TEXT NOT NULL,\n  state TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  PRIMARY KEY (thread_id, version)\n);";
export interface ColumnRequirement {
    name: string;
    type: string;
    notnull: boolean;
    pk: number;
}
export interface ForeignKeyRequirement {
    from: string;
    table: string;
    to: string;
    on_update?: string;
    on_delete?: string;
}
export interface IndexKeyTerm {
    name: string | null;
    coll: string;
    desc: number;
}
export interface UniqueConstraintRequirement {
    columns: string[];
    keyTerms?: IndexKeyTerm[];
}
export interface IndexRequirement {
    name: string;
    unique: boolean;
    columns: string[];
    keyTerms?: IndexKeyTerm[];
    partial?: boolean;
}
export interface FtsRequirement {
    module: string;
    columns: Array<{
        name: string;
        unindexed: boolean;
    }>;
    configs: Record<string, string>;
}
export interface TableRequirement {
    name: string;
    virtual?: boolean;
    columns: ColumnRequirement[];
    foreignKeys: ForeignKeyRequirement[];
    uniqueConstraints: UniqueConstraintRequirement[];
    indexes?: IndexRequirement[];
    fts?: FtsRequirement;
}
export declare const V2_SCHEMA_TABLES: Record<string, TableRequirement>;
export declare const V1_SCHEMA_TABLES: Record<string, TableRequirement>;
export declare function parseFts5Ddl(sql: string): {
    valid: boolean;
    reason?: string;
    module: string;
    columns: Array<{
        name: string;
        unindexed: boolean;
    }>;
    configs: Record<string, string>;
};
export declare function verifyTableStructure(db: any, tableName: string, req: TableRequirement): {
    valid: boolean;
    reason?: string;
};
export declare function verifyDatabaseStructure(db: any, version: 1 | 2): {
    valid: boolean;
    reason?: string;
};
//# sourceMappingURL=schema.d.ts.map