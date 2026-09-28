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

export function bootstrapDatabase(
  db: Database.Database,
  adminDisplayName = 'Administrator'
): BootstrapResult {
  // Apply schema
  db.exec(SCHEMA_SQL);

  // Check migration version
  const maxVerRow = db.prepare('SELECT max(version) AS max_v FROM schema_migrations').get() as any;
  if (maxVerRow && maxVerRow.max_v > 1) {
    throw new Error(
      `数据库 schema 版本 (v${maxVerRow.max_v}) 高于当前应用版本 (v1)，拒绝降级访问。请升级 Detuned。`
    );
  }

  // Record initial migration
  db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
    1,
    new Date().toISOString()
  );

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

  // Atomic bootstrap of initial materials
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

