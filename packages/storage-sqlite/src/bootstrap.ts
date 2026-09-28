import { randomBytes, createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { SqliteStorage } from './sqlite-storage.js';
import { SCHEMA_SQL } from './schema.js';

export interface BootstrapResult {
  isNewInstance: boolean;
  adminToken: string | null;
  adminActorId: string | null;
}

export function bootstrapDatabase(
  db: Database.Database,
  adminDisplayName = 'Administrator'
): BootstrapResult {
  // Apply schema
  db.exec(SCHEMA_SQL);

  // Record initial migration
  db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
    1,
    new Date().toISOString()
  );

  const storage = new SqliteStorage(db);

  // Check if admin actor already exists
  const existingAdmin = db
    .prepare("SELECT * FROM actors WHERE kind = 'human' LIMIT 1")
    .get();

  if (existingAdmin) {
    return {
      isNewInstance: false,
      adminToken: null,
      adminActorId: (existingAdmin as any).id,
    };
  }

  // Create initial admin
  const adminActorId = `act_admin_${randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  storage.createActor({
    id: adminActorId,
    kind: 'human',
    display_name: adminDisplayName,
    created_at: now,
    disabled_at: null,
  });

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

  return {
    isNewInstance: true,
    adminToken: rawToken,
    adminActorId,
  };
}
