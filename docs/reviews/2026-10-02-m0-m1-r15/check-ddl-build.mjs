// Verify current SQL generation and isolated compilation without touching project sources.
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'detuned-r15-ddl-build-'));
const source = new URL('../../../packages/storage-sqlite/', import.meta.url);
const commands = [];
let result;
function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: directory, encoding: 'utf8', timeout: 30000 });
  commands.push({ argv: [process.execPath, ...args], exit_code: r.status, stdout: r.stdout, stderr: r.stderr });
  if (r.status !== 0) throw new Error(`Isolated check failed: ${args[0]}`);
}
try {
  mkdirSync(join(directory, 'src')); mkdirSync(join(directory, 'scripts'));
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
  for (const f of ['src/schema.sql', 'src/schema.ts', 'scripts/generate-schema.mjs', 'scripts/check-schema-sync.mjs']) copyFileSync(new URL(f, source), join(directory, f));
  // Benign statement only in this owned copy. It must survive generation and compilation.
  const marker = 'SELECT 42 AS r15_build_probe;';
  const sqlFile = join(directory, 'src/schema.sql');
  writeFileSync(sqlFile, readFileSync(sqlFile, 'utf8') + `\n${marker}\n`);
  run([join(directory, 'scripts/generate-schema.mjs')]);
  run([join(directory, 'scripts/check-schema-sync.mjs')]);
  run([require.resolve('typescript/bin/tsc'), join(directory, 'src/schema.ts'), '--outDir', join(directory, 'dist'), '--target', 'ES2022', '--module', 'ES2022', '--skipLibCheck']);
  const expected = readFileSync(sqlFile, 'utf8').replace(/^--.*$/gm, '').trim();
  rmSync(join(directory, 'src'), { recursive: true, force: true });
  const module = await import(pathToFileURL(join(directory, 'dist/schema.js')).href);
  result = { generated_source_change_present: module.SCHEMA_SQL.includes(marker), exact_sql: module.SCHEMA_SQL.trim() === expected, runtime_without_source_directory: true };
} finally { rmSync(directory, { recursive: true, force: true }); }
const passes = result.generated_source_change_present && result.exact_sql && result.runtime_without_source_directory;
console.log(JSON.stringify({ reviewed_date: '2026-10-02', commands, observed: result, passes, scope: 'Positive build-wiring check only. This does not prove that bootstrap migration DDL and structural descriptions share the same editable source.' }, null, 2));
if (!passes) process.exitCode = 1;
