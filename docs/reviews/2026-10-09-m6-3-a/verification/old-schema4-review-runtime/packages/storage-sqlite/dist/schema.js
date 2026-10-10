// BEGIN SCHEMA_SQL
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
`;
// END SCHEMA_SQL
// BEGIN MIGRATION_DDL
export const SCHEMA_MIGRATIONS_DDL = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);`;
export const INSTANCE_METADATA_DDL = `CREATE TABLE IF NOT EXISTS instance_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;
export const THREAD_VERSIONS_DDL = `CREATE TABLE IF NOT EXISTS thread_versions (
  thread_id TEXT NOT NULL REFERENCES threads(id),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, version)
);`;
export const REVIEW_TABLES_DDL = `CREATE TABLE IF NOT EXISTS snapshots (
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
);`;
export const V4_SCHEMA_TABLES = {
    "actors": {
        "name": "actors",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "display_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "disabled_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "artifacts": {
        "name": "artifacts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "owner_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_assignment_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "check_run_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "bytes",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "mime",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "storage_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "owner_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "consumers": {
        "name": "consumers",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "subscription_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "consumer_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "ack_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active_batch_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "subscription_id",
                "table": "subscriptions",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "subscription_id",
                    "consumer_key"
                ],
                "keyTerms": [
                    {
                        "name": "subscription_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "consumer_key",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "credentials": {
        "name": "credentials",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "token_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "allowed_space_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "capabilities",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "expires_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "revoked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "token_hash"
                ],
                "keyTerms": [
                    {
                        "name": "token_hash",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "delivery_batches": {
        "name": "delivery_batches",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "consumer_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "from_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "through_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "consumer_id",
                "table": "consumers",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "events": {
        "name": "events",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "object_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ],
        "indexes": [
            {
                "name": "idx_events_space_seq",
                "unique": false,
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ],
                "partial": false
            }
        ]
    },
    "idempotency_records": {
        "name": "idempotency_records",
        "columns": [
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "operation",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "key",
                "type": "TEXT",
                "notnull": true,
                "pk": 4
            },
            {
                "name": "request_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "result_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "http_status",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "instance_metadata": {
        "name": "instance_metadata",
        "columns": [
            {
                "name": "key",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "value",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "memberships": {
        "name": "memberships",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "role",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reviewer_eligible",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "independence_group",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "post_fts": {
        "name": "post_fts",
        "virtual": true,
        "columns": [
            {
                "name": "post_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [],
        "fts": {
            "module": "fts5",
            "columns": [
                {
                    "name": "post_id",
                    "unindexed": true
                },
                {
                    "name": "space_id",
                    "unindexed": true
                },
                {
                    "name": "title",
                    "unindexed": false
                },
                {
                    "name": "summary",
                    "unindexed": false
                },
                {
                    "name": "body",
                    "unindexed": false
                },
                {
                    "name": "tags",
                    "unindexed": false
                }
            ],
            "configs": {
                "tokenize": "trigram"
            }
        }
    },
    "post_revisions": {
        "name": "post_revisions",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "structured",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "content_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "posts": {
        "name": "posts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "author_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "lifecycle",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "author_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "redactions": {
        "name": "redactions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "affected_revisions",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "operator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "operator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relation_resolutions": {
        "name": "relation_resolutions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "relation_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "resolver_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "action",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "resolver_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "relation_id",
                "table": "relations",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relations": {
        "name": "relations",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "source_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "source_post_id",
                    "source_revision",
                    "target_post_id",
                    "target_revision",
                    "type"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "type",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "review_assignments": {
        "name": "review_assignments",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "request_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "reviewer_actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "group_at_assignment",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "reviewer_actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "request_id",
                "table": "review_requests",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "id"
                ],
                "keyTerms": [
                    {
                        "name": "id",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "review_request_versions": {
        "name": "review_request_versions",
        "columns": [
            {
                "name": "request_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "phase",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "submitted_count",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "changed_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "request_id",
                "table": "review_requests",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "review_requests": {
        "name": "review_requests",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "snapshot_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "round",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "phase",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "requested_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "submitted_count",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "changed_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "requested_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "snapshot_id",
                "table": "snapshots",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "target_post_id",
                    "round"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "round",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "review_submissions": {
        "name": "review_submissions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "request_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "assignment_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reviewer_actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reviewer_session_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "snapshot_sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "payload_json",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "request_version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "submitted_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "revealed_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "reviewer_session_id",
                "table": "sessions",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "reviewer_actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "assignment_id",
                "table": "review_assignments",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "request_id",
                "table": "review_requests",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "reviewer_session_id"
                ],
                "keyTerms": [
                    {
                        "name": "reviewer_session_id",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            },
            {
                "columns": [
                    "assignment_id"
                ],
                "keyTerms": [
                    {
                        "name": "assignment_id",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "revision_artifacts": {
        "name": "revision_artifacts",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "artifact_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "purpose",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "artifact_id",
                "table": "artifacts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "schema_migrations": {
        "name": "schema_migrations",
        "columns": [
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "applied_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "sessions": {
        "name": "sessions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_version",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "harness_session_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "metadata",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "snapshot_items": {
        "name": "snapshot_items",
        "columns": [
            {
                "name": "snapshot_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "item_type",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "item_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 4
            },
            {
                "name": "sha256",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "snapshot_id",
                "table": "snapshots",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "snapshots": {
        "name": "snapshots",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "manifest_json",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "manifest_sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "policy_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "rules_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "created_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "space_revisions": {
        "name": "space_revisions",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "objective",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "rules",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_policy",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "check_profiles",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "pinned_refs",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "spaces": {
        "name": "spaces",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "slug",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "policy_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [
            {
                "columns": [
                    "slug"
                ],
                "keyTerms": [
                    {
                        "name": "slug",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "subscriptions": {
        "name": "subscriptions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_types",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "thread_versions": {
        "name": "thread_versions",
        "columns": [
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "threads": {
        "name": "threads",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "updated_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    }
};
export const V3_SCHEMA_TABLES = {
    "actors": {
        "name": "actors",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "display_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "disabled_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "artifacts": {
        "name": "artifacts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "owner_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_assignment_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "check_run_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "bytes",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "mime",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "storage_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "owner_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "consumers": {
        "name": "consumers",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "subscription_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "consumer_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "ack_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active_batch_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "subscription_id",
                "table": "subscriptions",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "subscription_id",
                    "consumer_key"
                ],
                "keyTerms": [
                    {
                        "name": "subscription_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "consumer_key",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "credentials": {
        "name": "credentials",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "token_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "allowed_space_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "capabilities",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "expires_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "revoked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "token_hash"
                ],
                "keyTerms": [
                    {
                        "name": "token_hash",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "delivery_batches": {
        "name": "delivery_batches",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "consumer_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "from_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "through_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "consumer_id",
                "table": "consumers",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "events": {
        "name": "events",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "object_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ],
        "indexes": [
            {
                "name": "idx_events_space_seq",
                "unique": false,
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ],
                "partial": false
            }
        ]
    },
    "idempotency_records": {
        "name": "idempotency_records",
        "columns": [
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "operation",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "key",
                "type": "TEXT",
                "notnull": true,
                "pk": 4
            },
            {
                "name": "request_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "result_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "http_status",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "instance_metadata": {
        "name": "instance_metadata",
        "columns": [
            {
                "name": "key",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "value",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "memberships": {
        "name": "memberships",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "role",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reviewer_eligible",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "independence_group",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "post_fts": {
        "name": "post_fts",
        "virtual": true,
        "columns": [
            {
                "name": "post_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [],
        "fts": {
            "module": "fts5",
            "columns": [
                {
                    "name": "post_id",
                    "unindexed": true
                },
                {
                    "name": "space_id",
                    "unindexed": true
                },
                {
                    "name": "title",
                    "unindexed": false
                },
                {
                    "name": "summary",
                    "unindexed": false
                },
                {
                    "name": "body",
                    "unindexed": false
                },
                {
                    "name": "tags",
                    "unindexed": false
                }
            ],
            "configs": {
                "tokenize": "trigram"
            }
        }
    },
    "post_revisions": {
        "name": "post_revisions",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "structured",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "content_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "posts": {
        "name": "posts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "author_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "lifecycle",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "author_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "redactions": {
        "name": "redactions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "affected_revisions",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "operator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "operator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relation_resolutions": {
        "name": "relation_resolutions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "relation_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "resolver_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "action",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "resolver_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "relation_id",
                "table": "relations",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relations": {
        "name": "relations",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "source_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "source_post_id",
                    "source_revision",
                    "target_post_id",
                    "target_revision",
                    "type"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "type",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "review_assignments": {
        "name": "review_assignments",
        "columns": [
            {
                "name": "request_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "reviewer_actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "group_at_assignment",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "reviewer_actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "request_id",
                "table": "review_requests",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "review_request_versions": {
        "name": "review_request_versions",
        "columns": [
            {
                "name": "request_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "phase",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "changed_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "request_id",
                "table": "review_requests",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "review_requests": {
        "name": "review_requests",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "snapshot_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "round",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "phase",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "requested_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "changed_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "changed_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "requested_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "snapshot_id",
                "table": "snapshots",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "target_post_id",
                    "round"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "round",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "revision_artifacts": {
        "name": "revision_artifacts",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "artifact_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "purpose",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "artifact_id",
                "table": "artifacts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "schema_migrations": {
        "name": "schema_migrations",
        "columns": [
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "applied_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "sessions": {
        "name": "sessions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_version",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "harness_session_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "metadata",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "snapshot_items": {
        "name": "snapshot_items",
        "columns": [
            {
                "name": "snapshot_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "item_type",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "item_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 4
            },
            {
                "name": "sha256",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "snapshot_id",
                "table": "snapshots",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "snapshots": {
        "name": "snapshots",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "manifest_json",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "manifest_sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "policy_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "rules_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_by",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "created_by",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "space_revisions": {
        "name": "space_revisions",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "objective",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "rules",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_policy",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "check_profiles",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "pinned_refs",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "spaces": {
        "name": "spaces",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "slug",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "policy_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [
            {
                "columns": [
                    "slug"
                ],
                "keyTerms": [
                    {
                        "name": "slug",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "subscriptions": {
        "name": "subscriptions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_types",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "thread_versions": {
        "name": "thread_versions",
        "columns": [
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "threads": {
        "name": "threads",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "updated_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    }
};
export const V2_SCHEMA_TABLES = {
    "actors": {
        "name": "actors",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "display_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "disabled_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "artifacts": {
        "name": "artifacts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "owner_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_assignment_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "check_run_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "bytes",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "mime",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "storage_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "owner_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "consumers": {
        "name": "consumers",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "subscription_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "consumer_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "ack_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active_batch_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "subscription_id",
                "table": "subscriptions",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "subscription_id",
                    "consumer_key"
                ],
                "keyTerms": [
                    {
                        "name": "subscription_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "consumer_key",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "credentials": {
        "name": "credentials",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "token_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "allowed_space_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "capabilities",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "expires_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "revoked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "token_hash"
                ],
                "keyTerms": [
                    {
                        "name": "token_hash",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "delivery_batches": {
        "name": "delivery_batches",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "consumer_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "from_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "through_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "consumer_id",
                "table": "consumers",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "events": {
        "name": "events",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "object_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ],
        "indexes": [
            {
                "name": "idx_events_space_seq",
                "unique": false,
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ],
                "partial": false
            }
        ]
    },
    "idempotency_records": {
        "name": "idempotency_records",
        "columns": [
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "operation",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "key",
                "type": "TEXT",
                "notnull": true,
                "pk": 4
            },
            {
                "name": "request_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "result_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "http_status",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "instance_metadata": {
        "name": "instance_metadata",
        "columns": [
            {
                "name": "key",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "value",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "memberships": {
        "name": "memberships",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "role",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reviewer_eligible",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "independence_group",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "post_fts": {
        "name": "post_fts",
        "virtual": true,
        "columns": [
            {
                "name": "post_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [],
        "fts": {
            "module": "fts5",
            "columns": [
                {
                    "name": "post_id",
                    "unindexed": true
                },
                {
                    "name": "space_id",
                    "unindexed": true
                },
                {
                    "name": "title",
                    "unindexed": false
                },
                {
                    "name": "summary",
                    "unindexed": false
                },
                {
                    "name": "body",
                    "unindexed": false
                },
                {
                    "name": "tags",
                    "unindexed": false
                }
            ],
            "configs": {
                "tokenize": "trigram"
            }
        }
    },
    "post_revisions": {
        "name": "post_revisions",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "structured",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "content_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "posts": {
        "name": "posts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "author_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "lifecycle",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "author_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "redactions": {
        "name": "redactions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "affected_revisions",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "operator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "operator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relation_resolutions": {
        "name": "relation_resolutions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "relation_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "resolver_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "action",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "resolver_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "relation_id",
                "table": "relations",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relations": {
        "name": "relations",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "source_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "source_post_id",
                    "source_revision",
                    "target_post_id",
                    "target_revision",
                    "type"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "type",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "revision_artifacts": {
        "name": "revision_artifacts",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "artifact_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "purpose",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "artifact_id",
                "table": "artifacts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "schema_migrations": {
        "name": "schema_migrations",
        "columns": [
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "applied_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "sessions": {
        "name": "sessions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_version",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "harness_session_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "metadata",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "space_revisions": {
        "name": "space_revisions",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "objective",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "rules",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_policy",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "check_profiles",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "pinned_refs",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "spaces": {
        "name": "spaces",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "slug",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "policy_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [
            {
                "columns": [
                    "slug"
                ],
                "keyTerms": [
                    {
                        "name": "slug",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "subscriptions": {
        "name": "subscriptions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_types",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "thread_versions": {
        "name": "thread_versions",
        "columns": [
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "threads": {
        "name": "threads",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "updated_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    }
};
export const V1_SCHEMA_TABLES = {
    "actors": {
        "name": "actors",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "display_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "disabled_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "artifacts": {
        "name": "artifacts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "owner_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_assignment_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "check_run_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "sha256",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "bytes",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "mime",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "storage_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "owner_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "consumers": {
        "name": "consumers",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "subscription_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "consumer_key",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "ack_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active_batch_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "subscription_id",
                "table": "subscriptions",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "subscription_id",
                    "consumer_key"
                ],
                "keyTerms": [
                    {
                        "name": "subscription_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "consumer_key",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "credentials": {
        "name": "credentials",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "token_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "allowed_space_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "capabilities",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "expires_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "revoked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "token_hash"
                ],
                "keyTerms": [
                    {
                        "name": "token_hash",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "delivery_batches": {
        "name": "delivery_batches",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "consumer_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "from_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "through_seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acked_at",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "consumer_id",
                "table": "consumers",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "events": {
        "name": "events",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "seq",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "object_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "visibility",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ],
        "indexes": [
            {
                "name": "idx_events_space_seq",
                "unique": false,
                "columns": [
                    "space_id",
                    "seq"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "seq",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ],
                "partial": false
            }
        ]
    },
    "idempotency_records": {
        "name": "idempotency_records",
        "columns": [
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "operation",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "key",
                "type": "TEXT",
                "notnull": true,
                "pk": 4
            },
            {
                "name": "request_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "result_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "http_status",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "memberships": {
        "name": "memberships",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "role",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "active",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reviewer_eligible",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "independence_group",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "post_fts": {
        "name": "post_fts",
        "virtual": true,
        "columns": [
            {
                "name": "post_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "UNINDEXED",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [],
        "fts": {
            "module": "fts5",
            "columns": [
                {
                    "name": "post_id",
                    "unindexed": true
                },
                {
                    "name": "space_id",
                    "unindexed": true
                },
                {
                    "name": "title",
                    "unindexed": false
                },
                {
                    "name": "summary",
                    "unindexed": false
                },
                {
                    "name": "body",
                    "unindexed": false
                },
                {
                    "name": "tags",
                    "unindexed": false
                }
            ],
            "configs": {
                "tokenize": "trigram"
            }
        }
    },
    "post_revisions": {
        "name": "post_revisions",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "summary",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "body",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "tags",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "structured",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "content_hash",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "posts": {
        "name": "posts",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "author_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "kind",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "lifecycle",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "author_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "thread_id",
                "table": "threads",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "redactions": {
        "name": "redactions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "affected_revisions",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "operator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "operator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relation_resolutions": {
        "name": "relation_resolutions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "relation_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "resolver_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "reason_ref",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "action",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "resolver_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "relation_id",
                "table": "relations",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "relations": {
        "name": "relations",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "source_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "target_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "type",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "target_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "source_post_id",
                "table": "posts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": [
            {
                "columns": [
                    "space_id",
                    "source_post_id",
                    "source_revision",
                    "target_post_id",
                    "target_revision",
                    "type"
                ],
                "keyTerms": [
                    {
                        "name": "space_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "source_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_post_id",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "target_revision",
                        "coll": "BINARY",
                        "desc": 0
                    },
                    {
                        "name": "type",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "revision_artifacts": {
        "name": "revision_artifacts",
        "columns": [
            {
                "name": "post_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "artifact_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 3
            },
            {
                "name": "purpose",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "artifact_id",
                "table": "artifacts",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "schema_migrations": {
        "name": "schema_migrations",
        "columns": [
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "applied_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": []
    },
    "sessions": {
        "name": "sessions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_name",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "client_version",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "harness_session_id",
                "type": "TEXT",
                "notnull": false,
                "pk": 0
            },
            {
                "name": "metadata",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "space_revisions": {
        "name": "space_revisions",
        "columns": [
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 1
            },
            {
                "name": "revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 2
            },
            {
                "name": "objective",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "rules",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "review_policy",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "check_profiles",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "pinned_refs",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "editor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "editor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "spaces": {
        "name": "spaces",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "slug",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "current_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "policy_revision",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "acl_epoch",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [],
        "uniqueConstraints": [
            {
                "columns": [
                    "slug"
                ],
                "keyTerms": [
                    {
                        "name": "slug",
                        "coll": "BINARY",
                        "desc": 0
                    }
                ]
            }
        ]
    },
    "subscriptions": {
        "name": "subscriptions",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "actor_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "thread_ids",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "event_types",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "actor_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    },
    "threads": {
        "name": "threads",
        "columns": [
            {
                "name": "id",
                "type": "TEXT",
                "notnull": false,
                "pk": 1
            },
            {
                "name": "space_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "title",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "version",
                "type": "INTEGER",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "state",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "creator_id",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "created_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            },
            {
                "name": "updated_at",
                "type": "TEXT",
                "notnull": true,
                "pk": 0
            }
        ],
        "foreignKeys": [
            {
                "from": "creator_id",
                "table": "actors",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            },
            {
                "from": "space_id",
                "table": "spaces",
                "to": "id",
                "on_update": "NO ACTION",
                "on_delete": "NO ACTION"
            }
        ],
        "uniqueConstraints": []
    }
};
export function parseFts5Ddl(sql) {
    const match = sql.trim().match(/^CREATE\s+VIRTUAL\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+USING\s+(\w+)\s*\(([\s\S]*)\)$/i);
    if (!match || !match[1] || !match[2] || !match[3]) {
        return { valid: false, reason: "post_fts 必须为使用 fts5 的虚拟表", module: '', columns: [], configs: {} };
    }
    const module = match[2].toLowerCase();
    if (module !== 'fts5') {
        return { valid: false, reason: `post_fts 必须为使用 fts5 的虚拟表，实际为 ${module}`, module, columns: [], configs: {} };
    }
    const inner = match[3].trim();
    const parts = [];
    let cur = '';
    let inQuote = null;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (inQuote) {
            cur += ch;
            if (ch === inQuote)
                inQuote = null;
        }
        else if (ch === '"' || ch === "'") {
            inQuote = ch;
            cur += ch;
        }
        else if (ch === ',') {
            parts.push(cur.trim());
            cur = '';
        }
        else {
            cur += ch;
        }
    }
    if (cur.trim())
        parts.push(cur.trim());
    const columns = [];
    const configs = {};
    for (const part of parts) {
        const configMatch = part.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
        if (configMatch && configMatch[1] && configMatch[2]) {
            const key = configMatch[1].toLowerCase();
            let val = configMatch[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            configs[key] = val;
        }
        else {
            const tokens = part.split(/\s+/);
            const colName = tokens[0];
            if (!colName)
                continue;
            const isUnindexed = tokens.slice(1).some((t) => t.toUpperCase() === 'UNINDEXED');
            columns.push({ name: colName, unindexed: isUnindexed });
        }
    }
    return { valid: true, module, columns, configs };
}
export function verifyTableStructure(db, tableName, req) {
    const exists = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?")
        .get(tableName);
    if (!exists) {
        return { valid: false, reason: `缺少必需表: ${tableName}` };
    }
    // Handle virtual table (e.g. post_fts)
    if (req.virtual) {
        const row = db
            .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
            .get(tableName);
        if (!row || !row.sql) {
            return { valid: false, reason: `缺少必需的虚拟表: ${tableName}` };
        }
        const ftsParsed = parseFts5Ddl(row.sql.trim());
        if (!ftsParsed.valid) {
            return { valid: false, reason: `${tableName} 虚拟表结构损坏: ${ftsParsed.reason}` };
        }
        const expFts = req.fts;
        if (!expFts) {
            return { valid: false, reason: `${tableName} 缺少 FTS 预期定义` };
        }
        if (expFts.module.toLowerCase() !== ftsParsed.module.toLowerCase()) {
            return { valid: false, reason: `${tableName} 模块不匹配: 期望 ${expFts.module}，实际 ${ftsParsed.module}` };
        }
        if (ftsParsed.columns.length !== expFts.columns.length) {
            return { valid: false, reason: `${tableName} 列数量不匹配: 期望 ${expFts.columns.length}，实际 ${ftsParsed.columns.length}` };
        }
        for (let i = 0; i < expFts.columns.length; i++) {
            const exp = expFts.columns[i];
            const act = ftsParsed.columns[i];
            if (act.name.toLowerCase() !== exp.name.toLowerCase()) {
                return { valid: false, reason: `${tableName} 列顺序或名称不匹配: 期望 ${exp.name}，实际 ${act.name}` };
            }
            if (act.unindexed !== exp.unindexed) {
                return { valid: false, reason: `${tableName} 列 ${exp.name} 索引标志不匹配: 期望 unindexed=${exp.unindexed}，实际 unindexed=${act.unindexed}` };
            }
        }
        // Strict config keys and values comparison
        const actualConfigKeys = Object.keys(ftsParsed.configs).sort();
        const expectedConfigKeys = Object.keys(expFts.configs).sort();
        if (actualConfigKeys.length !== expectedConfigKeys.length) {
            return {
                valid: false,
                reason: `${tableName} 配置项数量不匹配: 期望 [${expectedConfigKeys.join(', ')}]，实际 [${actualConfigKeys.join(', ')}]`,
            };
        }
        for (const k of expectedConfigKeys) {
            if (ftsParsed.configs[k] !== expFts.configs[k]) {
                return {
                    valid: false,
                    reason: `${tableName} 配置项 ${k} 不匹配: 期望 ${expFts.configs[k]}，实际 ${ftsParsed.configs[k]}`,
                };
            }
        }
        return { valid: true };
    }
    const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    const colMap = new Map(cols.map((c) => [c.name, c]));
    for (const expectedCol of req.columns) {
        const actual = colMap.get(expectedCol.name);
        if (!actual) {
            return { valid: false, reason: `表 ${tableName} 缺少必需列: ${expectedCol.name}` };
        }
        if (actual.type.toUpperCase() !== expectedCol.type.toUpperCase()) {
            return {
                valid: false,
                reason: `表 ${tableName} 列 ${expectedCol.name} 类型不匹配: 期望 ${expectedCol.type}，实际 ${actual.type}`,
            };
        }
        if (expectedCol.notnull && actual.notnull !== 1) {
            return {
                valid: false,
                reason: `表 ${tableName} 列 ${expectedCol.name} 缺少 NOT NULL 约束`,
            };
        }
        if (actual.pk !== expectedCol.pk) {
            return {
                valid: false,
                reason: `表 ${tableName} 列 ${expectedCol.name} 主键定义不匹配: 期望 pk=${expectedCol.pk}，实际 pk=${actual.pk}`,
            };
        }
    }
    if (cols.length !== req.columns.length) {
        const expectedNames = new Set(req.columns.map((c) => c.name));
        const extraCols = cols.filter((c) => !expectedNames.has(c.name)).map((c) => c.name);
        return {
            valid: false,
            reason: `表 ${tableName} 包含未知列: ${extraCols.join(", ")}`,
        };
    }
    const fks = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
    for (const expectedFk of req.foreignKeys) {
        const expectedOnUpdate = (expectedFk.on_update ?? 'NO ACTION').toUpperCase();
        const expectedOnDelete = (expectedFk.on_delete ?? 'NO ACTION').toUpperCase();
        const found = fks.some((f) => f.from === expectedFk.from &&
            f.table === expectedFk.table &&
            f.to === expectedFk.to &&
            (f.on_update ?? 'NO ACTION').toUpperCase() === expectedOnUpdate &&
            (f.on_delete ?? 'NO ACTION').toUpperCase() === expectedOnDelete);
        if (!found) {
            return {
                valid: false,
                reason: `表 ${tableName} 缺少或不匹配外键约束: ${expectedFk.from} REFERENCES ${expectedFk.table}(${expectedFk.to}) ON UPDATE ${expectedOnUpdate} ON DELETE ${expectedOnDelete}`,
            };
        }
    }
    const indices = db.prepare(`PRAGMA index_list("${tableName}")`).all();
    const indexDetails = indices.map((idx) => {
        const xinfo = db.prepare(`PRAGMA index_xinfo("${idx.name}")`).all();
        const keyRows = xinfo.filter((x) => x.key === 1).sort((a, b) => a.seqno - b.seqno);
        const keyTerms = keyRows.map((x) => ({
            name: x.name,
            cid: x.cid,
            desc: x.desc,
            coll: (x.coll ?? 'BINARY').toUpperCase(),
        }));
        const hasExpression = keyTerms.some((t) => t.cid < 0 || t.name === null);
        return {
            name: idx.name,
            unique: idx.unique === 1,
            origin: idx.origin,
            partial: idx.partial === 1,
            hasExpression,
            keyTerms,
        };
    });
    // Check Primary Key
    const pkCols = req.columns.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
    if (pkCols.length > 0) {
        const isIntegerPk = pkCols.length === 1 && pkCols[0]?.type.toUpperCase() === 'INTEGER';
        if (!isIntegerPk) {
            const pkIndex = indexDetails.find((idx) => idx.origin === 'pk');
            if (!pkIndex) {
                return { valid: false, reason: `表 ${tableName} 缺少主键索引` };
            }
            if (!pkIndex.unique || pkIndex.partial || pkIndex.hasExpression) {
                return { valid: false, reason: `表 ${tableName} 主键索引定义损坏` };
            }
            if (pkIndex.keyTerms.length !== pkCols.length) {
                return { valid: false, reason: `表 ${tableName} 主键索引键项数量不匹配: 期望 ${pkCols.length}，实际 ${pkIndex.keyTerms.length}` };
            }
            for (let i = 0; i < pkCols.length; i++) {
                const expectedCol = pkCols[i];
                const actualTerm = pkIndex.keyTerms[i];
                if (!expectedCol || !actualTerm) {
                    return { valid: false, reason: `表 ${tableName} 主键定义缺失` };
                }
                const expectedName = expectedCol.name;
                if (actualTerm.name !== expectedName) {
                    return { valid: false, reason: `表 ${tableName} 主键索引键项列名不匹配: 期望 ${expectedName}，实际 ${actualTerm.name}` };
                }
                if (actualTerm.coll !== 'BINARY') {
                    return { valid: false, reason: `表 ${tableName} 主键列 ${expectedName} 校对规则不匹配: 期望 BINARY，实际 ${actualTerm.coll}` };
                }
                if (actualTerm.desc !== 0) {
                    return { valid: false, reason: `表 ${tableName} 主键列 ${expectedName} 排序不匹配: 期望 ASC，实际 DESC` };
                }
            }
        }
    }
    // Check Unique Constraints
    for (const expectedUnique of req.uniqueConstraints) {
        const found = indexDetails.some((idx) => idx.unique &&
            !idx.partial &&
            !idx.hasExpression &&
            idx.keyTerms.length === expectedUnique.columns.length &&
            idx.keyTerms.every((term, i) => {
                const expTerm = expectedUnique.keyTerms?.[i];
                const expName = expTerm ? expTerm.name : expectedUnique.columns[i];
                const expColl = expTerm ? expTerm.coll : 'BINARY';
                const expDesc = expTerm ? expTerm.desc : 0;
                return (term.name === expName &&
                    term.coll === expColl &&
                    term.desc === expDesc);
            }));
        if (!found) {
            return {
                valid: false,
                reason: `表 ${tableName} 缺少完整唯一约束/索引: (${expectedUnique.columns.join(", ")})`,
            };
        }
    }
    // Check Named Indexes
    if (req.indexes) {
        for (const expectedIdx of req.indexes) {
            const found = indexDetails.find((idx) => idx.name === expectedIdx.name);
            if (!found) {
                return { valid: false, reason: `表 ${tableName} 缺少必需索引: ${expectedIdx.name}` };
            }
            const expectedPartial = Boolean(expectedIdx.partial);
            if (found.unique !== expectedIdx.unique ||
                found.partial !== expectedPartial ||
                found.hasExpression) {
                return {
                    valid: false,
                    reason: `表 ${tableName} 索引 ${expectedIdx.name} 定义不匹配（唯一性、partial 谓词或表达式键）`,
                };
            }
            if (found.keyTerms.length !== expectedIdx.columns.length) {
                return {
                    valid: false,
                    reason: `表 ${tableName} 索引 ${expectedIdx.name} 定义不匹配（列项数量不同）`,
                };
            }
            for (let i = 0; i < expectedIdx.columns.length; i++) {
                const expectedColName = expectedIdx.columns[i];
                const term = found.keyTerms[i];
                const expectedTerm = expectedIdx.keyTerms?.[i];
                const expName = expectedTerm ? expectedTerm.name : expectedColName;
                const expColl = expectedTerm ? expectedTerm.coll : 'BINARY';
                const expDesc = expectedTerm ? expectedTerm.desc : 0;
                if (!expName || !term || term.name !== expName || term.coll !== expColl || term.desc !== expDesc) {
                    return {
                        valid: false,
                        reason: `表 ${tableName} 索引 ${expectedIdx.name} 定义不匹配（列名、排序或校对规则不同）`,
                    };
                }
            }
        }
    }
    return { valid: true };
}
export function verifyDatabaseStructure(db, version) {
    const tableMap = version === 4 ? V4_SCHEMA_TABLES : version === 3 ? V3_SCHEMA_TABLES : version === 2 ? V2_SCHEMA_TABLES : V1_SCHEMA_TABLES;
    for (const [tbl, req] of Object.entries(tableMap)) {
        const res = verifyTableStructure(db, tbl, req);
        if (!res.valid) {
            return res;
        }
    }
    if (version === 1) {
        // thread_versions must not exist in clean v1
        const hasTv = db
            .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = 'thread_versions'")
            .get();
        if (hasTv) {
            return { valid: false, reason: "v1 数据库不应包含 thread_versions 表" };
        }
    }
    return { valid: true };
}
//# sourceMappingURL=schema.js.map