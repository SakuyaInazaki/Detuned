import { randomBytes, createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { SqliteStorage } from './sqlite-storage.js';
import { SCHEMA_SQL } from './schema.js';

export interface BootstrapResult {
  isNewInstance: boolean;
  adminToken: string | null;
  adminActorId: string | null;
}

export function isDatabaseInitialized(db: Database.Database): boolean {
  try {
    const meta = db.prepare("SELECT value FROM instance_metadata WHERE key = 'initialized'").get() as any;
    if (meta?.value === 'true') {
      const admin = db.prepare("SELECT * FROM actors WHERE kind = 'human' LIMIT 1").get() as any;
      if (admin) {
        const cred = db.prepare("SELECT * FROM credentials WHERE actor_id = ? AND revoked_at IS NULL LIMIT 1").get(admin.id);
        return Boolean(cred);
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function migrateIdempotencyRecords(db: Database.Database): void {
  try {
    const rows = db.prepare('SELECT actor_id, space_id, operation, key, result_ref FROM idempotency_records').all() as any[];
    const updateStmt = db.prepare('UPDATE idempotency_records SET result_ref = ? WHERE actor_id = ? AND space_id = ? AND operation = ? AND key = ?');
    for (const row of rows) {
      if (!row.result_ref) continue;
      try {
        const parsed = JSON.parse(row.result_ref);
        let migrated = false;
        let newRef: any = null;

        if (parsed.thread && parsed.thread.id) {
          newRef = {
            $ref: 'thread',
            thread_id: parsed.thread.id,
            title: parsed.thread.title,
            version: parsed.thread.version,
            state: parsed.thread.state,
          };
          if (parsed.initial_post?.post?.id) {
            newRef.initial_post_id = parsed.initial_post.post.id;
            newRef.initial_post_revision = parsed.initial_post.revision?.revision ?? (typeof parsed.initial_post.revision === 'number' ? parsed.initial_post.revision : 1);
            if (Array.isArray(parsed.initial_post.relations)) {
              newRef.relation_ids = parsed.initial_post.relations.map((r: any) => r.id);
            }
          }
          migrated = true;
        } else if (parsed.post && parsed.post.id) {
          newRef = {
            $ref: 'post',
            post_id: parsed.post.id,
            revision: parsed.revision?.revision ?? (typeof parsed.revision === 'number' ? parsed.revision : 1),
          };
          if (Array.isArray(parsed.relations)) {
            newRef.relation_ids = parsed.relations.map((r: any) => r.id);
          }
          migrated = true;
        } else if (parsed.relation && parsed.relation.id) {
          newRef = {
            $ref: 'relation',
            relation_id: parsed.relation.id,
            relation_version: parsed.relation.version,
            relation_state: parsed.relation.state,
          };
          if (parsed.resolution?.id) {
            newRef.resolution_id = parsed.resolution.id;
          }
          migrated = true;
        } else if (parsed.space && parsed.space.id) {
          newRef = {
            $ref: 'space',
            space_id: parsed.space.id,
            revision: parsed.revision?.revision ?? (typeof parsed.revision === 'number' ? parsed.revision : undefined),
          };
          migrated = true;
        } else if (parsed.redaction_id) {
          newRef = {
            $ref: 'redaction',
            redaction_id: parsed.redaction_id,
          };
          migrated = true;
        }

        if (migrated && newRef) {
          updateStmt.run(JSON.stringify(newRef), row.actor_id, row.space_id, row.operation, row.key);
        }
      } catch {
        // Ignore unparseable
      }
    }
  } catch {
    // If idempotency_records doesn't exist yet
  }
}

export function bootstrapDatabase(
  db: Database.Database,
  adminDisplayName = 'Administrator'
): BootstrapResult {
  // Check migration version before applying schema DDL
  const hasMigrations = db
    .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
    .get() as any;
  if (hasMigrations?.n > 0) {
    const maxVerRow = db.prepare('SELECT max(version) AS max_v FROM schema_migrations').get() as any;
    if (maxVerRow && maxVerRow.max_v > 1) {
      throw new Error(
        `数据库 schema 版本 (v${maxVerRow.max_v}) 高于当前应用版本 (v1)，拒绝降级访问。请升级 Detuned。`
      );
    }
  }

  // Apply schema
  db.exec(SCHEMA_SQL);

  // Record initial migration
  db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
    1,
    new Date().toISOString()
  );

  // Run idempotency records migration to remove legacy content caches
  migrateIdempotencyRecords(db);

  const storage = new SqliteStorage(db);

  // Check if initialization is already complete
  const initMeta = db.prepare("SELECT value FROM instance_metadata WHERE key = 'initialized'").get() as any;
  const existingAdmin = db.prepare("SELECT * FROM actors WHERE kind = 'human' LIMIT 1").get() as any;
  const existingCred = existingAdmin
    ? (db.prepare("SELECT * FROM credentials WHERE actor_id = ? AND revoked_at IS NULL LIMIT 1").get(existingAdmin.id) as any)
    : null;

  if (initMeta?.value === 'true' && existingAdmin && existingCred) {
    return {
      isNewInstance: false,
      adminToken: null,
      adminActorId: existingAdmin.id,
    };
  }

  // If this is an upgrade from an existing v1 database with admin actor & credential already created:
  if (existingAdmin && existingCred) {
    const existingSecret = db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any;
    if (!existingSecret?.value) {
      const secret = randomBytes(32).toString('hex');
      db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('token_secret', ?)").run(secret);
    }
    db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('initialized', 'true')").run();

    return {
      isNewInstance: false,
      adminToken: null,
      adminActorId: existingAdmin.id,
    };
  }

  // Atomic bootstrap of initial materials for fresh instance
  const createAdminTx = db.transaction(() => {
    let adminActorId: string;
    const now = new Date().toISOString();

    if (existingAdmin) {
      adminActorId = existingAdmin.id;
    } else {
      adminActorId = `act_admin_${randomBytes(6).toString('hex')}`;
      storage.createActor({
        id: adminActorId,
        kind: 'human',
        display_name: adminDisplayName,
        created_at: now,
        disabled_at: null,
      });
    }

    const rawToken = `detuned_adm_${randomBytes(24).toString('hex')}`;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    storage.createCredential({
      id: `cred_admin_${randomBytes(6).toString('hex')}`,
      actor_id: adminActorId,
      token_hash: tokenHash,
      allowed_space_ids: ['*'],
      capabilities: ['read', 'write', 'admin'],
      expires_at: null,
      revoked_at: null,
      created_at: now,
    });

    // Generate and persist instance token secret if not already set
    const existingSecret = db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get() as any;
    if (!existingSecret?.value) {
      const secret = randomBytes(32).toString('hex');
      db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('token_secret', ?)").run(secret);
    }

    // Mark initialization complete
    db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('initialized', 'true')").run();

    return {
      isNewInstance: true,
      adminToken: rawToken,
      adminActorId,
    };
  });

  return createAdminTx();
}
