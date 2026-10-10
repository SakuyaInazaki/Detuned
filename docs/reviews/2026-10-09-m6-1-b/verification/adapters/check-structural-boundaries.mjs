// Independent review only: owned temporary SQLite files, no real data or external services.
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual as equal } from 'node:util';
import { bootstrapDatabase, classifyDatabase, openAndCoordinateDatabase as currentCoordinate, SqliteStorage } from '../../../../../packages/storage-sqlite/dist/index.js';
import { SCHEMA_SQL } from '../../../../../packages/storage-sqlite/dist/schema.js';
import { buildApp } from '../../../../../packages/server/dist/index.js';

// M6.1-B: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-r15-structure-'));
const source = new Database(join(directory, 'source.sqlite'));
const boot = bootstrapDatabase(source);
const emptyInitialized = source.serialize();
const app = buildApp({ storage: new SqliteStorage(source) });
const probes = [];
let serial = 0;
async function request(target, method, path, payload) {
  const response = await target.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': `r15-${++serial}`,
  }, ...(payload === undefined ? {} : { payload }) });
  return { status: response.statusCode, body: response.json() };
}
function data(result) {
  if (result.status >= 400) throw new Error(`Fixture setup failed: ${result.status} ${result.body.error?.code}`);
  return result.body.data;
}
function snapshot(database) {
  const schema = database.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
  return { schema, rows: schema.filter(row => row.type === 'table').map(({ name }) => [name,
    database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(row => JSON.stringify(row)).sort()]) };
}
function invoke(database, mode) {
  try {
    const result = mode === 'bootstrap' ? bootstrapDatabase(database) : openAndCoordinateDatabase(database, mode);
    return { rejected: false, is_new_instance: result.isNewInstance, issued_token: !!result.adminToken };
  } catch (error) {
    return { rejected: true, error_code: error.code ?? null, error_message: error.message };
  }
}
function rebuildCredentials(database, transform) {
  const ddl = database.prepare("SELECT sql FROM sqlite_master WHERE name='credentials'").get().sql;
  database.pragma('foreign_keys = OFF');
  database.exec(transform(ddl).replace(/^CREATE TABLE\s+credentials/, 'CREATE TABLE credentials_copy'));
  database.exec('INSERT INTO credentials_copy SELECT * FROM credentials; DROP TABLE credentials; ALTER TABLE credentials_copy RENAME TO credentials');
  database.pragma('foreign_keys = ON');
}
async function inspect(name, mutation, { seed = source.serialize(), consequence } = {}) {
  const outcomes = [];
  for (const mode of ['bootstrap', 'init', 'serve']) {
    const file = join(directory, `${name}-${mode}.sqlite`);
    writeFileSync(file, seed);
    let database = new Database(file);
    try {
      mutation(database);
      const before = snapshot(database);
      const classification = classifyDatabase(database);
      const outcome = invoke(database, mode);
      database.close(); database = new Database(file);
      const observed = { name, mode, classification, ...outcome, unchanged_after_reopen: equal(before, snapshot(database)) };
      if (consequence && !outcome.rejected) observed.consequence = await consequence(database);
      outcomes.push(observed);
    } finally { database.close(); }
  }
  return outcomes;
}
function expectRejected(outcomes) {
  return outcomes.every(result => result.classification.kind === 'corrupt' && result.rejected && result.unchanged_after_reopen);
}

try {
  await app.ready();
  const space = data(await request(app, 'POST', '/spaces', { slug: 'r15-space', objective: 'Structural review', rules: [] })).space.id;
  const thread = data(await request(app, 'POST', `/spaces/${space}/threads`, { title: 'R15 thread' })).thread.id;
  data(await request(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, { kind: 'note', title: 'Needle evidence', summary: 'fixture', body: 'needle proof' }));
  const healthySearch = await request(app, 'GET', `/spaces/${space}/search?q=needle`);
  if (healthySearch.status !== 200 || healthySearch.body.data.length !== 1) throw new Error('Healthy search fixture failed');

  const structural = [];
  structural.push(...await inspect('partial_unique_credential_hash', db => {
    rebuildCredentials(db, ddl => ddl.replace('token_hash TEXT NOT NULL UNIQUE', 'token_hash TEXT NOT NULL'));
    db.exec('CREATE UNIQUE INDEX r15_partial_token_hash ON credentials(token_hash) WHERE 0');
  }, { consequence: db => {
    let duplicateAccepted = false;
    try {
      db.exec("INSERT INTO credentials (id,actor_id,token_hash,allowed_space_ids,capabilities,expires_at,revoked_at,created_at) SELECT 'r15_duplicate',actor_id,token_hash,allowed_space_ids,capabilities,expires_at,revoked_at,created_at FROM credentials LIMIT 1");
      duplicateAccepted = true;
    } catch {}
    return { duplicate_token_hash_accepted: duplicateAccepted };
  } }));
  structural.push(...await inspect('partial_named_event_index', db => {
    db.exec('DROP INDEX idx_events_space_seq; CREATE INDEX idx_events_space_seq ON events(space_id,seq) WHERE seq < 0');
  }));
  structural.push(...await inspect('changed_foreign_key_action', db => {
    rebuildCredentials(db, ddl => ddl.replace('REFERENCES actors(id)', 'REFERENCES actors(id) ON DELETE CASCADE'));
  }));
  structural.push(...await inspect('ordinary_table_replacing_fts', db => {
    db.exec('DROP TABLE post_fts; CREATE TABLE post_fts (post_id, space_id, title, summary, body, tags)');
  }, { consequence: async db => {
    const child = buildApp({ storage: new SqliteStorage(db) });
    try {
      await child.ready();
      const response = await request(child, 'GET', `/spaces/${space}/search?q=needle`);
      return { search_status: response.status, error_code: response.body.error?.code ?? null };
    } finally { await child.close(); }
  } }));
  probes.push({ id: 'Y01', description: 'Semantic structure changes cannot masquerade as required constraints or a real FTS table', observed: structural, passes: expectRejected(structural) });

  const materialOnly = new Database(':memory:');
  materialOnly.exec(SCHEMA_SQL);
  materialOnly.prepare("INSERT INTO instance_metadata(key,value) VALUES('initialized','true'),('token_secret',?)").run('r15-known-existing-secret');
  const materialSeed = materialOnly.serialize(); materialOnly.close();
  const metadataOutcomes = await inspect('initialized_material_without_migrations_or_actor', () => {}, {
    seed: materialSeed,
    consequence: db => ({ existing_secret_preserved: db.prepare("SELECT value FROM instance_metadata WHERE key='token_secret'").get().value === 'r15-known-existing-secret' }),
  });
  probes.push({ id: 'Y02', description: 'Existing initialization materials must prevent blank classification and credential reissuance', observed: metadataOutcomes, passes: expectRejected(metadataOutcomes) });

  const migrationOutcomes = await inspect('complete_v2_with_missing_v2_migration_row', db => {
    db.exec('DELETE FROM schema_migrations WHERE version=2');
  }, { seed: emptyInitialized, consequence: db => ({ migration_versions: db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row => row.version) }) });
  probes.push({ id: 'Y03', description: 'Current v2 materials with contradictory migration history reject before repair', observed: migrationOutcomes, passes: expectRejected(migrationOutcomes) });

  const controls = [];
  for (const kind of ['empty_file', 'raw_v2_schema', 'raw_v1_schema', 'historical_v1_instance', 'healthy_v2']) {
    const file = join(directory, `control-${kind}.sqlite`);
    if (kind === 'healthy_v2') writeFileSync(file, source.serialize());
    let db = new Database(file);
    try {
      if (kind === 'raw_v2_schema') db.exec(SCHEMA_SQL);
      if (kind === 'raw_v1_schema' || kind === 'historical_v1_instance') db.exec(readFileSync(new URL('../../../../../tests/fixtures/historical-v1-schema.sql', import.meta.url), 'utf8'));
      if (kind === 'historical_v1_instance') {
        db.exec("INSERT INTO schema_migrations VALUES(1,'2026-10-01T00:00:00.000Z'); INSERT INTO actors(id,kind,display_name,created_at) VALUES('r15_admin','human','Review admin','2026-10-01T00:00:00.000Z')");
      }
      const classification = classifyDatabase(db);
      const isFresh = ['empty_file', 'raw_v1_schema', 'raw_v2_schema'].includes(kind);
      const result = invoke(db, isFresh ? 'init' : 'serve');
      db.close(); db = new Database(file);
      const beforeRestart = snapshot(db);
      const repeated = invoke(db, 'serve');
      controls.push({ kind, classification, ...result, restarted: !repeated.rejected, repeat_unchanged: equal(beforeRestart, snapshot(db)), current: classifyDatabase(db).kind === 'current_initialized', correct_material_policy: result.issued_token === isFresh && repeated.issued_token === false });
    } finally { db.close(); }
  }
  probes.push({ id: 'Y04', description: 'True blank, supported raw schemas, real historical fixture and current instance retain healthy startup', observed: { healthy_search_status: healthySearch.status, controls }, passes: controls.every(r => !r.rejected && r.restarted && r.repeat_unchanged && r.current && r.correct_material_policy) });
} finally {
  await app.close(); source.close(); rmSync(directory, { recursive: true, force: true });
}

console.log(JSON.stringify({ reviewed_date: '2026-10-02', runtime: process.version, probes, summary: { passed: probes.filter(p => p.passes).length, failed: probes.filter(p => !p.passes).length } }, null, 2));
if (probes.some(probe => !probe.passes)) process.exitCode = 1;
