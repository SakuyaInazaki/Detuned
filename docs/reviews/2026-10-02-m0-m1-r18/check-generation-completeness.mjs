// Review-only probes: all mutations occur in owned temporary project copies.
// Uses installed dependencies, without network, model calls or product edits.
import { mkdtempSync, mkdirSync, copyFileSync, cpSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-r18-generation-'));
const sourceSql = readFileSync(join(root, 'packages/storage-sqlite/src/schema.sql'), 'utf8');
const sourceTs = readFileSync(join(root, 'packages/storage-sqlite/src/schema.ts'), 'utf8');
const probes = [];
const hash = text => createHash('sha256').update(text).digest('hex');
function profile(text, version) {
  const re = new RegExp(`export const V${version}_SCHEMA_TABLES: Record<string, TableRequirement> = (\\{[\\s\\S]*?\\n\\});`);
  const match = text.match(re);
  if (!match) throw new Error(`V${version} profile not found`);
  return JSON.parse(match[1]);
}
function copyProject(name, { driver = true, historical = true } = {}) {
  const dir = join(directory, name);
  mkdirSync(join(dir, 'packages/storage-sqlite'), { recursive: true });
  mkdirSync(join(dir, 'tests/fixtures'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const sub of ['src', 'scripts']) cpSync(join(root, 'packages/storage-sqlite', sub), join(dir, 'packages/storage-sqlite', sub), { recursive: true });
  if (historical) copyFileSync(join(root, 'tests/fixtures/historical-v1-schema.sql'), join(dir, 'tests/fixtures/historical-v1-schema.sql'));
  if (driver) symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}
function run(dir, args) {
  const r = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8', timeout: 30000 });
  return { exit_code: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr, ...(r.error ? { execution_error: r.error.message } : {}) };
}
function script(dir, name) { return run(dir, [join(dir, 'packages/storage-sqlite/scripts', name)]); }
const failed = r => r.exit_code !== null && r.exit_code !== 0;
const tsPath = dir => join(dir, 'packages/storage-sqlite/src/schema.ts');
const sqlPath = dir => join(dir, 'packages/storage-sqlite/src/schema.sql');
function replaceOnce(text, before, after) {
  if (!text.includes(before)) throw new Error(`Fixture mutation target missing: ${before}`);
  return text.replace(before, after);
}
async function verifyCompiled(dir) {
  const compile = run(dir, [require.resolve('typescript/bin/tsc'), tsPath(dir), '--outDir', join(dir, 'dist'), '--target', 'ES2022', '--module', 'ES2022', '--skipLibCheck']);
  if (compile.exit_code !== 0) throw new Error(`Isolated compile failed: ${JSON.stringify(compile)}`);
  rmSync(join(dir, 'packages/storage-sqlite/src'), { recursive: true });
  const mod = await import(pathToFileURL(join(dir, 'dist/schema.js')).href);
  const db = new Database(':memory:');
  try {
    db.exec(mod.SCHEMA_SQL);
    return { compile, runtime_without_src: true, runtime_structure: mod.verifyDatabaseStructure(db, 2) };
  } finally { db.close(); }
}

try {
  const pkCases = [];
  for (const [name, mutatedPk] of [
    ['pk-collation', 'PRIMARY KEY (actor_id COLLATE NOCASE, space_id, operation, key)'],
    ['pk-direction', 'PRIMARY KEY (actor_id, space_id, operation, key DESC)'],
  ]) {
    const dir = copyProject(name);
    const sql = replaceOnce(sourceSql, 'PRIMARY KEY (actor_id, space_id, operation, key)', mutatedPk);
    writeFileSync(sqlPath(dir), sql);
    const generate = script(dir, 'generate-schema.mjs');
    const sync = script(dir, 'check-schema-sync.mjs');
    const output = { name, source_change: mutatedPk, generate, sync };
    if (failed(generate) || failed(sync)) {
      output.explicit_source_rejection = true;
      output.passes = true;
    } else {
      const generated = readFileSync(tsPath(dir), 'utf8');
      output.current_profile_changed = !equal(profile(sourceTs, 2), profile(generated, 2));
      output.historical_profile_unchanged = equal(profile(sourceTs, 1), profile(generated, 1));
      Object.assign(output, await verifyCompiled(dir));
      output.passes = generate.exit_code === 0 && sync.exit_code === 0 && output.runtime_structure.valid && output.historical_profile_unchanged;
    }
    pkCases.push(output);
  }
  probes.push({ id: 'AB01', description: 'PK key collation/direction is generated consistently or explicitly rejected at build time', observed: pkCases, passes: pkCases.every(x => x.passes) });

  const blockCases = [];
  for (const missing of ['begin', 'end']) {
    const dir = copyProject(`missing-migration-${missing}`);
    const marker = missing === 'begin' ? '// BEGIN MIGRATION_DDL' : '// END MIGRATION_DDL';
    const before = replaceOnce(sourceTs, marker, '// Removed migration marker in isolated review fixture');
    const sql = replaceOnce(sourceSql, 'applied_at TEXT NOT NULL', 'applied_at TEXT');
    writeFileSync(tsPath(dir), before);
    writeFileSync(sqlPath(dir), sql);
    const generate = script(dir, 'generate-schema.mjs');
    const after = readFileSync(tsPath(dir), 'utf8');
    const check = script(dir, 'check-schema-sync.mjs');
    const expectedDdl = sql.match(/CREATE TABLE IF NOT EXISTS schema_migrations\s*\([\s\S]*?\);/)[0];
    const actualDdl = after.match(/export const SCHEMA_MIGRATIONS_DDL = `([\s\S]*?)`;/)?.[1];
    const unchanged = before === after;
    // Either reject without touching output, or reliably regenerate without the marker.
    const passes = (failed(generate) && unchanged) || (generate.exit_code === 0 && check.exit_code === 0 && actualDdl?.trim() === expectedDdl.trim());
    blockCases.push({ missing_marker: marker, generate, check, output_hash_before: hash(before), output_hash_after: hash(after), output_unchanged: unchanged, migration_constant_matches_source: actualDdl?.trim() === expectedDdl.trim(), passes });
  }
  probes.push({ id: 'AB02', description: 'Missing migration block markers cannot produce a successful partial schema update', observed: blockCases, passes: blockCases.every(x => x.passes) });

  const repairCases = [];
  for (const version of [1, 2]) {
    const dir = copyProject(`corrupt-v${version}-profile`);
    const re = new RegExp(`(export const V${version}_SCHEMA_TABLES: Record<string, TableRequirement> = \\{[\\s\\S]*?\\n\\});`);
    const broken = sourceTs.replace(re, block => replaceOnce(block, '"type": "TEXT"', '"type": "BLOB"'));
    if (broken === sourceTs) throw new Error('Profile corruption setup failed');
    writeFileSync(tsPath(dir), broken);
    const beforeCheck = script(dir, 'check-schema-sync.mjs');
    const generate = script(dir, 'generate-schema.mjs');
    const afterCheck = script(dir, 'check-schema-sync.mjs');
    const repaired = readFileSync(tsPath(dir), 'utf8');
    const out = { version, before_check: beforeCheck, generate, after_check: afterCheck, profiles_restored: equal(profile(repaired, 1), profile(sourceTs, 1)) && equal(profile(repaired, 2), profile(sourceTs, 2)) };
    Object.assign(out, await verifyCompiled(dir));
    out.passes = failed(beforeCheck) && generate.exit_code === 0 && afterCheck.exit_code === 0 && out.profiles_restored && out.runtime_structure.valid;
    repairCases.push(out);
  }
  probes.push({ id: 'AB03', description: 'With complete inputs, actual sync commands reject corrupt profiles and generation repairs them', observed: repairCases, passes: repairCases.every(x => x.passes) });

  const inputs = [];
  for (const missing of ['driver', 'historical', 'schema.sql', 'extractor', 'v2-marker']) {
    const dir = copyProject(`missing-${missing}`, { driver: missing !== 'driver', historical: missing !== 'historical' });
    if (missing === 'schema.sql') rmSync(sqlPath(dir));
    if (missing === 'extractor') rmSync(join(dir, 'packages/storage-sqlite/scripts/extract-schema-requirements.mjs'));
    if (missing === 'v2-marker') writeFileSync(tsPath(dir), replaceOnce(sourceTs, 'export const V2_SCHEMA_TABLES:', 'export const BROKEN_V2_SCHEMA_TABLES:'));
    const before = readFileSync(tsPath(dir), 'utf8');
    const check = script(dir, 'check-schema-sync.mjs');
    const generate = script(dir, 'generate-schema.mjs');
    const after = readFileSync(tsPath(dir), 'utf8');
    inputs.push({ missing, check, generate, output_hash_before: hash(before), output_hash_after: hash(after), output_unchanged: before === after, passes: failed(check) && failed(generate) && before === after });
  }
  probes.push({ id: 'AB04', description: 'Other required input failures reject without modifying schema.ts', observed: inputs, passes: inputs.every(x => x.passes) });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log(JSON.stringify({ reviewed_date: '2026-10-02', probes, summary: { passed: probes.filter(x => x.passes).length, total: probes.length } }, null, 2));
if (probes.some(x => !x.passes)) process.exitCode = 1;
