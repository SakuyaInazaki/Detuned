export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  token_hash TEXT NOT NULL UNIQUE,
  allowed_space_ids TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  current_revision INTEGER NOT NULL DEFAULT 1,
  policy_revision INTEGER NOT NULL DEFAULT 1,
  acl_epoch INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS space_revisions (
  space_id TEXT NOT NULL REFERENCES spaces(id),
  revision INTEGER NOT NULL,
  objective TEXT NOT NULL,
  rules TEXT NOT NULL,
  review_policy TEXT NOT NULL,
  check_profiles TEXT NOT NULL,
  pinned_refs TEXT NOT NULL,
  editor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (space_id, revision)
);

CREATE TABLE IF NOT EXISTS memberships (
  space_id TEXT NOT NULL REFERENCES spaces(id),
  actor_id TEXT NOT NULL REFERENCES actors(id),
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  reviewer_eligible INTEGER NOT NULL DEFAULT 1,
  independence_group TEXT,
  PRIMARY KEY (space_id, actor_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  space_id TEXT NOT NULL REFERENCES spaces(id),
  client_name TEXT NOT NULL,
  client_version TEXT NOT NULL,
  harness_session_id TEXT,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'open',
  creator_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  author_id TEXT NOT NULL REFERENCES actors(id),
  kind TEXT NOT NULL,
  current_revision INTEGER NOT NULL DEFAULT 1,
  lifecycle TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_revisions (
  post_id TEXT NOT NULL REFERENCES posts(id),
  revision INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL,
  structured TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  editor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, revision)
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  source_post_id TEXT NOT NULL REFERENCES posts(id),
  source_revision INTEGER NOT NULL,
  target_post_id TEXT NOT NULL REFERENCES posts(id),
  target_revision INTEGER NOT NULL,
  type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open',
  version INTEGER NOT NULL DEFAULT 1,
  creator_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  UNIQUE (space_id, source_post_id, source_revision, target_post_id, target_revision, type)
);

CREATE TABLE IF NOT EXISTS relation_resolutions (
  id TEXT PRIMARY KEY,
  relation_id TEXT NOT NULL REFERENCES relations(id),
  version INTEGER NOT NULL,
  resolver_id TEXT NOT NULL REFERENCES actors(id),
  reason_ref TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  owner_id TEXT NOT NULL REFERENCES actors(id),
  visibility TEXT NOT NULL DEFAULT 'space',
  review_assignment_id TEXT,
  check_run_id TEXT,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revision_artifacts (
  post_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  purpose TEXT NOT NULL DEFAULT 'evidence',
  PRIMARY KEY (post_id, revision, artifact_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  space_id TEXT NOT NULL REFERENCES spaces(id),
  thread_ids TEXT NOT NULL,
  event_types TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consumers (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  consumer_key TEXT NOT NULL,
  ack_seq INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  active_batch_id TEXT,
  acl_epoch INTEGER NOT NULL DEFAULT 1,
  UNIQUE (subscription_id, consumer_key)
);

CREATE TABLE IF NOT EXISTS delivery_batches (
  id TEXT PRIMARY KEY,
  consumer_id TEXT NOT NULL REFERENCES consumers(id),
  from_seq INTEGER NOT NULL,
  through_seq INTEGER NOT NULL,
  event_ids TEXT NOT NULL,
  acked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  revision INTEGER,
  visibility TEXT NOT NULL DEFAULT 'public',
  actor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  UNIQUE (space_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_events_space_seq ON events(space_id, seq);

CREATE TABLE IF NOT EXISTS idempotency_records (
  actor_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_ref TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (actor_id, space_id, operation, key)
);

CREATE TABLE IF NOT EXISTS redactions (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  affected_revisions TEXT NOT NULL,
  operator_id TEXT NOT NULL REFERENCES actors(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS instance_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(
  post_id UNINDEXED,
  space_id UNINDEXED,
  title,
  summary,
  body,
  tags,
  tokenize="trigram"
);
`;
