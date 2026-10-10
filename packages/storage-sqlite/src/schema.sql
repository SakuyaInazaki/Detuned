-- Detuned SQLite Schema Baseline

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

CREATE TABLE IF NOT EXISTS thread_versions (
  thread_id TEXT NOT NULL REFERENCES threads(id),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, version)
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


CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  manifest_json TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  policy_revision INTEGER NOT NULL,
  rules_revision INTEGER NOT NULL,
  target_post_id TEXT NOT NULL REFERENCES posts(id),
  target_revision INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshot_items (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  sha256 TEXT,
  PRIMARY KEY (snapshot_id, item_type, item_id, revision)
);

CREATE TABLE IF NOT EXISTS review_requests (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  target_post_id TEXT NOT NULL REFERENCES posts(id),
  target_revision INTEGER NOT NULL,
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
  round INTEGER NOT NULL,
  phase TEXT NOT NULL,
  version INTEGER NOT NULL,
  requested_by TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  changed_by TEXT NOT NULL REFERENCES actors(id),
  changed_at TEXT NOT NULL,
  reason TEXT,
  submitted_count INTEGER NOT NULL DEFAULT 0 CHECK (submitted_count BETWEEN 0 AND 5),
  UNIQUE (space_id, target_post_id, round)
);

CREATE TABLE IF NOT EXISTS review_request_versions (
  request_id TEXT NOT NULL REFERENCES review_requests(id),
  version INTEGER NOT NULL,
  phase TEXT NOT NULL,
  changed_by TEXT NOT NULL REFERENCES actors(id),
  changed_at TEXT NOT NULL,
  reason TEXT,
  submitted_count INTEGER NOT NULL DEFAULT 0 CHECK (submitted_count BETWEEN 0 AND 5),
  PRIMARY KEY (request_id, version)
);

CREATE TABLE IF NOT EXISTS review_assignments (
  id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL REFERENCES review_requests(id),
  reviewer_actor_id TEXT NOT NULL REFERENCES actors(id),
  group_at_assignment TEXT,
  PRIMARY KEY (request_id, reviewer_actor_id)
);

CREATE TABLE IF NOT EXISTS review_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL REFERENCES review_requests(id),
  assignment_id TEXT NOT NULL UNIQUE REFERENCES review_assignments(id),
  reviewer_actor_id TEXT NOT NULL REFERENCES actors(id),
  reviewer_session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  snapshot_sha256 TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  request_version INTEGER NOT NULL,
  submitted_at TEXT NOT NULL,
  revealed_at TEXT
);

CREATE TABLE IF NOT EXISTS review_decisions (
  id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL UNIQUE REFERENCES review_requests(id),
  actor_id TEXT NOT NULL REFERENCES actors(id),
  snapshot_sha256 TEXT NOT NULL,
  review_ids_json TEXT NOT NULL,
  check_receipt_ids_json TEXT NOT NULL,
  outcome TEXT NOT NULL,
  rationale TEXT NOT NULL,
  request_version INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS snapshot_items_material_idx ON snapshot_items(item_type,item_id,snapshot_id);
CREATE INDEX IF NOT EXISTS review_requests_active_idx ON review_requests(space_id,phase,snapshot_id);

CREATE TABLE IF NOT EXISTS check_runs (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES review_requests(id),
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
  snapshot_sha256 TEXT NOT NULL,
  check_name TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt > 0),
  verifier_actor_id TEXT NOT NULL REFERENCES actors(id),
  check_config_sha256 TEXT NOT NULL,
  created_request_version INTEGER NOT NULL CHECK (created_request_version > 0),
  state TEXT NOT NULL CHECK (state IN ('pending','pass','fail','error','invalidated')),
  version INTEGER NOT NULL CHECK (version > 0),
  created_by TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  changed_by TEXT NOT NULL REFERENCES actors(id),
  changed_at TEXT NOT NULL,
  invalidation_reason TEXT,
  UNIQUE (request_id, check_name, attempt)
);

CREATE TABLE IF NOT EXISTS check_run_versions (
  check_run_id TEXT NOT NULL REFERENCES check_runs(id),
  version INTEGER NOT NULL CHECK (version > 0),
  observed_request_version INTEGER NOT NULL CHECK (observed_request_version > 0),
  state TEXT NOT NULL CHECK (state IN ('pending','pass','fail','error','invalidated')),
  receipt_id TEXT,
  changed_by TEXT NOT NULL REFERENCES actors(id),
  changed_at TEXT NOT NULL,
  invalidation_reason TEXT,
  PRIMARY KEY (check_run_id, version)
);

CREATE TABLE IF NOT EXISTS check_receipts (
  receipt_id TEXT PRIMARY KEY,
  check_run_id TEXT NOT NULL UNIQUE REFERENCES check_runs(id),
  verifier_actor_id TEXT NOT NULL REFERENCES actors(id),
  observed_snapshot_sha256 TEXT NOT NULL,
  observed_check_config_sha256 TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass','fail','error')),
  environment TEXT NOT NULL,
  tool_versions_json TEXT NOT NULL,
  execution_steps TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  exit_code INTEGER NOT NULL,
  logs_artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  received_at TEXT NOT NULL,
  run_version INTEGER NOT NULL CHECK (run_version > 0)
);

CREATE TABLE IF NOT EXISTS check_run_credentials (
  credential_id TEXT PRIMARY KEY REFERENCES credentials(id),
  check_run_id TEXT NOT NULL REFERENCES check_runs(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS check_run_credentials_run_idx ON check_run_credentials(check_run_id);
