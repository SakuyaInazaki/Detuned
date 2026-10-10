// Review only: source copies and synthetic SQLite databases under our own temp dir.
// No product edits, dependency installs, user data, model calls or external network.
import { mkdtempSync, mkdirSync, copyFileSync, cpSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';
import { bootstrapDatabase, classifyDatabase, openAndCoordinateDatabase as currentCoordinate, SqliteStorage } from '../../../../../packages/storage-sqlite/dist/index.js';
import { buildApp } from '../../../../../packages/server/dist/index.js';

// M6.2-A: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.
import {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';
function openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const require = createRequire(new URL('../../../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-r17-profile-'));
const probes = [];
const sqlSource = readFileSync(join(root, 'packages/storage-sqlite/src/schema.sql'), 'utf8');
const tsSource = readFileSync(join(root, 'packages/storage-sqlite/src/schema.ts'), 'utf8');
const profile = (text, version) => {
  const match = text.match(new RegExp(`export const V${version}_SCHEMA_TABLES: Record<string, TableRequirement> = (\\{[\\s\\S]*?\\n\\});`));
  if (!match) throw new Error(`Cannot read V${version} profile`);
  return JSON.parse(match[1]);
};
function snapshot(db) {
  const schema = db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
  return { schema, rows: schema.filter(row => row.type === 'table').map(({ name }) => [name,
    db.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all().map(row => JSON.stringify(row)).sort()]) };
}
function copyProject(name, { driver = true, historical = true } = {}) {
  const dir = join(directory, name);
  mkdirSync(join(dir, 'packages/storage-sqlite/src'), { recursive: true });
  mkdirSync(join(dir, 'packages/storage-sqlite/scripts'), { recursive: true });
  mkdirSync(join(dir, 'tests/fixtures'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  // Copy all source/generator inputs, including any extracted shared helpers.
  for (const name of ['src', 'scripts']) cpSync(join(root, 'packages/storage-sqlite', name), join(dir, 'packages/storage-sqlite', name), { recursive: true });
  if (historical) {for(const version of [1,2,3,4])copyFileSync(join(root, `tests/fixtures/historical-v${version}-schema.sql`), join(dir, `tests/fixtures/historical-v${version}-schema.sql`));}
  if (driver) symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}
function run(dir, args) {
  const result = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8', timeout: 30000 });
  return { exit_code: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr };
}
function script(dir, name) { return run(dir, [join(dir, 'packages/storage-sqlite/scripts', name)]); }
async function changedSource(name, mutate) {
  const dir = copyProject(name);
  const changed = mutate(sqlSource);
  writeFileSync(join(dir, 'packages/storage-sqlite/src/schema.sql'), changed);
  const generate = script(dir, 'generate-schema.mjs');
  const sync = script(dir, 'check-schema-sync.mjs');
  const output = { name, generate, sync };
  if (generate.exit_code !== 0 || sync.exit_code !== 0) {
    output.explicit_source_mismatch_rejection = true;
    return output;
  }
  const compile = run(dir, [require.resolve('typescript/bin/tsc'), join(dir, 'packages/storage-sqlite/src/schema.ts'),
    '--outDir', join(dir, 'dist'), '--target', 'ES2022', '--module', 'ES2022', '--skipLibCheck']);
  if (compile.exit_code !== 0) throw new Error(`Isolated compile failed: ${compile.stderr}${compile.stdout}`);
  const generated = readFileSync(join(dir, 'packages/storage-sqlite/src/schema.ts'), 'utf8');
  const v1 = profile(generated, 1);
  const v2 = profile(generated, 5);
  // Runtime cannot rely on leftover source files.
  rmSync(join(dir, 'packages/storage-sqlite/src'), { recursive: true, force: true });
  const module = await import(pathToFileURL(join(dir, 'dist/schema.js')).href);
  const db = new Database(':memory:');
  try {
    db.exec(module.SCHEMA_SQL);
    output.generated_sql_matches_mutation = module.SCHEMA_SQL.trim() === changed.replace(/^--.*$/gm, '').trim();
    output.runtime_structure = module.verifyDatabaseStructure(db, 5);
    output.current_table_profile_changed = !equal(profile(tsSource, 5), v2);
    output.historical_profile_unchanged = equal(profile(tsSource, 1), v1) && equal(profile(tsSource, 2), profile(generated, 2)) && equal(profile(tsSource, 3), profile(generated, 3)) && equal(profile(tsSource, 4), profile(generated, 4));
    output.runtime_without_src = true;
  } finally { db.close(); }
  return output;
}

let source;
let app;
try {
  source = new Database(join(directory, 'source.sqlite'));
  const boot = bootstrapDatabase(source);
  app = buildApp({ storage: new SqliteStorage(source) }); await app.ready();
  let serial = 0;
  async function request(target, method, path, payload) {
    const r = await target.inject({ method, url: `/api/v1${path}`, headers: {
      authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': `r17-${++serial}`,
    }, ...(payload === undefined ? {} : { payload }) });
    return { status: r.statusCode, body: r.json() };
  }
  function data(r) { if (r.status >= 400) throw new Error(`Setup failed ${r.status}`); return r.body.data; }
  const space = data(await request(app, 'POST', '/spaces', { slug: 'r17-fts', objective: 'FTS options', rules: [] })).space.id;
  const thread = data(await request(app, 'POST', `/spaces/${space}/threads`, { title: 'R17 fixture' })).thread.id;
  data(await request(app, 'POST', `/spaces/${space}/threads/${thread}/posts`, { kind: 'note', title: 'Fixture', summary: 'Fixture summary', body: 'needle proof in body' }));
  const healthy = await request(app, 'GET', `/spaces/${space}/search?q=needle`);
  if (healthy.status !== 200 || healthy.body.data?.length !== 1) throw new Error('Healthy FTS setup failed');

  const ftsOutcomes = [];
  for (const mode of ['bootstrap', 'init', 'serve']) {
    const file = join(directory, `detail-none-${mode}.sqlite`); writeFileSync(file, source.serialize());
    let db = new Database(file);
    try {
      const rows = db.prepare('SELECT post_id,space_id,title,summary,body,tags FROM post_fts').all();
      const ddl = db.prepare("SELECT sql FROM sqlite_master WHERE name='post_fts'").get().sql;
      db.exec('DROP TABLE post_fts');
      db.exec(ddl.replace(/\)\s*$/, ', detail=none)'));
      const insert = db.prepare('INSERT INTO post_fts(post_id,space_id,title,summary,body,tags) VALUES(@post_id,@space_id,@title,@summary,@body,@tags)');
      for (const row of rows) insert.run(row);
      const before = snapshot(db);
      const classification = classifyDatabase(db);
      let rejected = false, errorCode = null;
      try { mode === 'bootstrap' ? bootstrapDatabase(db) : openAndCoordinateDatabase(db, mode); }
      catch (e) { rejected = true; errorCode = e.code ?? null; }
      db.close(); db = new Database(file);
      const observed = { mode, classification, rejected, error_code: errorCode, unchanged_after_reopen: equal(before, snapshot(db)) };
      if (!rejected) {
        const child = buildApp({ storage: new SqliteStorage(db) });
        try {
          await child.ready();
          const search = await request(child, 'GET', `/spaces/${space}/search?q=needle`);
          observed.search = { status: search.status, result_count: search.body.data?.length ?? null, error_code: search.body.error?.code ?? null };
        } finally { await child.close(); }
      }
      observed.passes = classification.kind === 'corrupt' && rejected && observed.unchanged_after_reopen;
      ftsOutcomes.push(observed);
    } finally { db.close(); }
  }
  probes.push({ id: 'AA01', description: 'Unsupported FTS detail option cannot pass preflight and break the existing search API', healthy_search: { status: healthy.status, result_count: healthy.body.data.length }, observed: ftsOutcomes, passes: ftsOutcomes.every(x => x.passes) });

  const changes = [];
  changes.push(await changedSource('source-index-semantics', sql => sql.replace('ON events(space_id, seq);', 'ON events(space_id COLLATE NOCASE, seq DESC);')));
  changes.push(await changedSource('source-fts-indexing', sql => sql.replace('  body,\n  tags,', '  body UNINDEXED,\n  tags,')));
  probes.push({ id: 'AA02', description: 'Generated current schema and its full runtime profile stay in agreement, or source checks explicitly reject drift', observed: changes,
    passes: changes.every(x => x.explicit_source_mismatch_rejection || (x.generated_sql_matches_mutation && x.runtime_structure.valid && x.historical_profile_unchanged)) });

  const unavailable = [];
  for (const kind of ['missing_driver', 'missing_historical_source']) {
    const dir = copyProject(kind, { driver: kind !== 'missing_driver', historical: kind !== 'missing_historical_source' });
    const file = join(dir, 'packages/storage-sqlite/src/schema.ts');
    const original = readFileSync(file, 'utf8');
    const version = kind === 'missing_driver' ? 2 : 1;
    const re = new RegExp(`(export const V${version}_SCHEMA_TABLES: Record<string, TableRequirement> = \\{[\\s\\S]*?\\n\\});`);
    const broken = original.replace(re, block => block.replace('"type": "TEXT"', '"type": "BLOB"'));
    if (broken === original) throw new Error('Drift setup did not change the profile');
    writeFileSync(file, broken);
    const beforeCheck = script(dir, 'check-schema-sync.mjs');
    const generate = script(dir, 'generate-schema.mjs');
    const afterCheck = script(dir, 'check-schema-sync.mjs');
    const driftRetained = readFileSync(file, 'utf8').includes(broken.match(re)[1]);
    const observed = { kind, deliberately_corrupted_profile: `V${version}`, before_check: beforeCheck, generate, after_check: afterCheck, corrupted_profile_retained: driftRetained };
    observed.passes = beforeCheck.exit_code !== null && beforeCheck.exit_code !== 0 && generate.exit_code !== null && generate.exit_code !== 0 && afterCheck.exit_code !== null && afterCheck.exit_code !== 0;
    unavailable.push(observed);
  }
  probes.push({ id: 'AA03', description: 'Missing required driver or historical source cannot silently disable profile checks and preserve a corrupt profile', observed: unavailable, passes: unavailable.every(x => x.passes) });

  const ordinary = await changedSource('positive-column-mutation', sql => sql.replace('objective TEXT NOT NULL,', 'objective TEXT,'));
  const original = await changedSource('positive-original-source', sql => sql);
  probes.push({ id: 'AA04', description: 'Healthy generation and an actually supported column-profile change work with native driver and frozen historical source', observed: [original, ordinary],
    passes: [original, ordinary].every(x => x.generate.exit_code === 0 && x.sync.exit_code === 0 && x.runtime_structure?.valid && x.generated_sql_matches_mutation && x.historical_profile_unchanged && x.runtime_without_src) && ordinary.current_table_profile_changed });
} finally {
  if (app) await app.close(); if (source?.open) source.close();
  rmSync(directory, { recursive: true, force: true });
}
console.log(JSON.stringify({ reviewed_date: '2026-10-02', probes, summary: { passed: probes.filter(x => x.passes).length, total: probes.length } }, null, 2));
if (probes.some(x => !x.passes)) process.exitCode = 1;
