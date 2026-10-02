// Independent review: synthetic identities and owned temporary databases only.
// Never modifies product sources, historical probes, or user databases.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';
import { bootstrapDatabase, classifyDatabase, openAndCoordinateDatabase, SqliteStorage } from '../../../packages/storage-sqlite/dist/index.js';
import { SCHEMA_SQL } from '../../../packages/storage-sqlite/dist/schema.js';
import { buildApp } from '../../../packages/server/dist/index.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-r16-semantics-'));
const source = new Database(join(directory, 'source.sqlite'));
const boot = bootstrapDatabase(source);
const emptyInitialized = source.serialize();
const app = buildApp({ storage: new SqliteStorage(source) });
const probes = [];
let serial = 0;
let space;

async function request(target, method, path, payload, key = `r16-${++serial}`) {
  const response = await target.inject({ method, url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': key,
  }, ...(payload === undefined ? {} : { payload }) });
  return { status: response.statusCode, body: response.json() };
}
function data(result) {
  if (result.status >= 400) throw new Error(`Fixture setup failed: ${result.status} ${result.body.error?.code}`);
  return result.body.data;
}
function snapshot(db) {
  const schema = db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
  return { schema, rows: schema.filter(row => row.type === 'table').map(({ name }) => [name,
    db.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(row => JSON.stringify(row)).sort()]) };
}
function invoke(db, mode) {
  try {
    const result = mode === 'bootstrap' ? bootstrapDatabase(db) : openAndCoordinateDatabase(db, mode);
    return { rejected: false, issued_token: !!result.adminToken };
  } catch (error) {
    return { rejected: true, error_code: error.code ?? null, error_message: error.message };
  }
}
function rebuild(db, table, transform) {
  const ddl = db.prepare("SELECT sql FROM sqlite_master WHERE name=?").get(table).sql;
  db.pragma('foreign_keys = OFF');
  db.exec(transform(ddl).replace(new RegExp(`^CREATE TABLE\\s+${table}`), `CREATE TABLE ${table}_copy`));
  db.exec(`INSERT INTO ${table}_copy SELECT * FROM ${table}; DROP TABLE ${table}; ALTER TABLE ${table}_copy RENAME TO ${table}`);
  db.pragma('foreign_keys = ON');
}
async function withApp(db, fn) {
  const child = buildApp({ storage: new SqliteStorage(db) });
  try { await child.ready(); return await fn(child); }
  finally { await child.close(); }
}
async function search(db) {
  return withApp(db, async child => {
    const response = await request(child, 'GET', `/spaces/${space}/search?q=needle`);
    return { status: response.status, result_count: response.body.data?.length ?? null, error_code: response.body.error?.code ?? null };
  });
}
async function inspect(name, mutate, consequence, expected = 'reject') {
  const outcomes = [];
  for (const mode of ['bootstrap', 'init', 'serve']) {
    const file = join(directory, `${name}-${mode}.sqlite`);
    writeFileSync(file, source.serialize());
    let db = new Database(file);
    try {
      mutate(db);
      const before = snapshot(db);
      const classification = classifyDatabase(db);
      const result = invoke(db, mode);
      db.close(); db = new Database(file);
      const observation = { name, mode, classification, ...result, unchanged_after_reopen: equal(before, snapshot(db)) };
      // Consequences deliberately run only AFTER the startup snapshot comparison.
      if (!result.rejected && consequence) observation.consequence = await consequence(db);
      observation.passes = expected === 'reject'
        ? classification.kind === 'corrupt' && result.rejected && observation.unchanged_after_reopen
        : classification.kind === 'current_initialized' && !result.rejected && !result.issued_token && observation.unchanged_after_reopen;
      outcomes.push(observation);
    } finally { db.close(); }
  }
  return outcomes;
}

try {
  await app.ready();
  space = data(await request(app, 'POST', '/spaces', { slug: 'r16-space', objective: 'Schema semantics', rules: [] })).space.id;
  const thread = data(await request(app, 'POST', `/spaces/${space}/threads`, { title: 'R16 fixture' })).thread.id;
  data(await request(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, {
    kind: 'note', title: 'Fixture title', summary: 'Fixture summary', body: 'needle exists only in this body',
  }));
  const healthySearch = await search(source);
  if (healthySearch.status !== 200 || healthySearch.result_count !== 1) throw new Error('Healthy FTS fixture failed');

  const indexes = [];
  indexes.push(...await inspect('extra_expression_key_in_unique_index', db => {
    rebuild(db, 'credentials', ddl => ddl.replace('token_hash TEXT NOT NULL UNIQUE', 'token_hash TEXT NOT NULL'));
    db.exec('CREATE UNIQUE INDEX r16_token_hash_expression ON credentials(token_hash, lower(id))');
  }, db => {
    let duplicateAccepted = false;
    try {
      db.exec("INSERT INTO credentials (id,actor_id,token_hash,allowed_space_ids,capabilities,expires_at,revoked_at,created_at) SELECT 'r16_duplicate',actor_id,token_hash,allowed_space_ids,capabilities,expires_at,revoked_at,created_at FROM credentials LIMIT 1");
      duplicateAccepted = true;
    } catch {}
    return { duplicate_token_hash_accepted: duplicateAccepted,
      actual_key_terms: db.prepare('PRAGMA index_xinfo(r16_token_hash_expression)').all().filter(row => row.key === 1) };
  }));
  indexes.push(...await inspect('idempotency_primary_key_collation_changed', db => {
    rebuild(db, 'idempotency_records', ddl => ddl.replace('key TEXT NOT NULL,', 'key TEXT COLLATE NOCASE NOT NULL,'));
  }, db => withApp(db, async child => {
    const first = await request(child, 'POST', `/spaces/${space}/threads`, { title: 'Upper key' }, 'R16CaseKey');
    const second = await request(child, 'POST', `/spaces/${space}/threads`, { title: 'Lower key' }, 'r16casekey');
    return { first_status: first.status, second_status: second.status, second_error: second.body.error?.code ?? null };
  })));
  indexes.push(...await inspect('named_index_sort_and_collation_changed', db => {
    db.exec('DROP INDEX idx_events_space_seq; CREATE INDEX idx_events_space_seq ON events(space_id COLLATE NOCASE, seq DESC)');
  }, db => ({ actual_key_terms: db.prepare('PRAGMA index_xinfo(idx_events_space_seq)').all().filter(row => row.key === 1) })));
  probes.push({ id: 'Z01', description: 'All index key terms, PK collation and named-index sort/collation participate in structure validation', observed: indexes, passes: indexes.every(row => row.passes) });

  const fts = await inspect('fts_body_marked_unindexed', db => {
    const rows = db.prepare('SELECT post_id,space_id,title,summary,body,tags FROM post_fts').all();
    const ddl = db.prepare("SELECT sql FROM sqlite_master WHERE name='post_fts'").get().sql;
    const changed = ddl.replace(/\bbody\s*,/, 'body UNINDEXED,');
    if (changed === ddl) throw new Error('FTS mutation did not match');
    db.exec('DROP TABLE post_fts'); db.exec(changed);
    const insert = db.prepare('INSERT INTO post_fts(post_id,space_id,title,summary,body,tags) VALUES(@post_id,@space_id,@title,@summary,@body,@tags)');
    for (const row of rows) insert.run(row);
  }, search);
  probes.push({ id: 'Z02', description: 'FTS body must retain its indexed status; required words in DDL are not a semantic comparison', healthy_search: healthySearch, observed: fts, passes: fts.every(row => row.passes) });

  const controls = await inspect('full_unique_standalone_equivalent', db => {
    rebuild(db, 'credentials', ddl => ddl.replace('token_hash TEXT NOT NULL UNIQUE', 'token_hash TEXT NOT NULL'));
    db.exec('CREATE UNIQUE INDEX r16_full_token_hash ON credentials(token_hash COLLATE BINARY ASC)');
  }, async db => {
    const found = await search(db);
    const keys = await withApp(db, async child => {
      const first = await request(child, 'POST', `/spaces/${space}/threads`, { title: 'Upper key' }, 'R16CaseKey');
      const second = await request(child, 'POST', `/spaces/${space}/threads`, { title: 'Lower key' }, 'r16casekey');
      return { first_status: first.status, second_status: second.status };
    });
    return { search: found, keys };
  }, 'accept');
  probes.push({ id: 'Z03', description: 'Equivalent full unique index, healthy body search and distinct case-sensitive keys remain usable', observed: controls,
    passes: controls.every(row => row.passes && row.consequence.search.result_count === 1 && row.consequence.keys.first_status === 201 && row.consequence.keys.second_status === 201) });

  const materialDb = new Database(':memory:');
  materialDb.exec(SCHEMA_SQL);
  materialDb.prepare("INSERT INTO instance_metadata(key,value) VALUES('initialized','true'),('token_secret',?)").run('r16-existing-synthetic-secret');
  const materialSeed = materialDb.serialize(); materialDb.close();
  const cliOutcomes = [];
  for (const kind of ['existing_materials', 'missing_version_2']) {
    for (const mode of ['init', 'serve']) {
      const dir = join(directory, `cli-${kind}-${mode}`); mkdirSync(dir);
      const file = join(dir, 'detuned.sqlite');
      writeFileSync(file, kind === 'existing_materials' ? materialSeed : emptyInitialized);
      let db = new Database(file);
      if (kind === 'missing_version_2') db.exec('DELETE FROM schema_migrations WHERE version=2');
      const before = snapshot(db); db.close();
      const run = spawnSync(process.execPath, [join(root, 'packages/cli/dist/index.js'), '--json', mode, '--data-dir', dir], { cwd: root, encoding: 'utf8', timeout: 5000 });
      let parsed;
      try { parsed = JSON.parse(run.stderr || run.stdout); } catch { parsed = {}; }
      db = new Database(file);
      const unchanged = equal(before, snapshot(db)); db.close();
      const observed = { kind, mode, exit_code: run.status, signal: run.signal, error_code: parsed.error?.code ?? null,
        emitted_admin_token: /adminToken|admin_token|dt_admin_|detuned_admin_/i.test(run.stdout + run.stderr),
        lock_released: !existsSync(join(dir, 'detuned.lock')), unchanged_after_cli_reopen: unchanged };
      observed.passes = run.status !== null && run.status !== 0 && observed.error_code === 'FORBIDDEN' && !observed.emitted_admin_token && observed.lock_released && unchanged;
      cliOutcomes.push(observed);
    }
  }
  probes.push({ id: 'Z04', description: 'Actual CLI init/serve reject both Y02/Y03, release lock, emit no success credential and preserve reopened snapshot', observed: cliOutcomes, passes: cliOutcomes.every(row => row.passes) });
} finally {
  await app.close(); source.close(); rmSync(directory, { recursive: true, force: true });
}
console.log(JSON.stringify({ reviewed_date: '2026-10-02', probes, summary: { passed: probes.filter(row => row.passes).length, total: probes.length } }, null, 2));
if (probes.some(row => !row.passes)) process.exitCode = 1;
