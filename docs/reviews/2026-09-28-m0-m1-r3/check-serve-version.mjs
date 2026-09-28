// Actual CLI startup with an owned temporary DB; binds only an ephemeral loopback port.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { bootstrapDatabase } from '../../../packages/storage-sqlite/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-r3-version-'));
const db = new Database(join(directory, 'detuned.sqlite'));
bootstrapDatabase(db);
db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(999, ?)').run(new Date().toISOString());
db.close();

const cli = fileURLToPath(new URL('../../../packages/cli/dist/index.js', import.meta.url));
let child;
try {
  child = spawn(process.execPath, [cli, '--json', 'serve', '--data-dir', directory, '--host', '127.0.0.1', '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let started = false;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 8000);
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => {
    stderr += chunk;
    if (stderr.includes('Detuned 服务已启动')) {
      started = true;
      child.kill('SIGTERM');
    }
  });
  let exitCode;
  try {
    exitCode = await new Promise((resolve, reject) => { child.on('close', resolve); child.on('error', reject); });
  } finally { clearTimeout(timer); }
  const explainsVersion = /(schema|版本|version)/i.test(stdout + stderr) && (stdout + stderr).includes('999');
  const passes = !started && !timedOut && exitCode !== null && exitCode !== 0 && explainsVersion;
  const result = { reviewed_date: '2026-09-28', reviewed_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runtime: process.version, mode: 'real built CLI subprocess, owned DB, ephemeral loopback port', id: 'T11',
    expected: 'serve refuses unsupported schema 999 before listening, with a diagnostic',
    observed: { started, timed_out: timedOut, exit_code: exitCode, explains_unsupported_version: explainsVersion }, passes };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exitCode = passes ? 0 : 1;
} finally {
  if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  rmSync(directory, { recursive: true, force: true });
}
