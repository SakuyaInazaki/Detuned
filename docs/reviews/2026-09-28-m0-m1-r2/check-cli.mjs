// Starts an isolated temporary HTTP server on 127.0.0.1, then invokes the actual built CLI.
// No model calls, user data or global configuration; all fixtures are removed on exit.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { buildApp } from '../../../packages/server/dist/index.js';
import { SqliteStorage, bootstrapDatabase } from '../../../packages/storage-sqlite/dist/index.js';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const Database = require('better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'detuned-review-cli-'));
const db = new Database(join(directory, 'review.sqlite'));
const boot = bootstrapDatabase(db);
const app = buildApp({ storage: new SqliteStorage(db) });
const cli = fileURLToPath(new URL('../../../packages/cli/dist/index.js', import.meta.url));
let serial = 0;
async function post(path, payload) {
  const res = await app.inject({ method: 'POST', url: `/api/v1${path}`, headers: {
    authorization: `Bearer ${boot.adminToken}`, 'idempotency-key': `fixture-${++serial}`,
  }, payload });
  if (res.statusCode >= 400) throw new Error(`Fixture failed: ${res.statusCode}`);
  return res.json().data;
}
async function runCli(url, space, op, input) {
  const inputPath = join(directory, `${op}.json`);
  writeFileSync(inputPath, JSON.stringify(input));
  const child = spawn(process.execPath, [cli, '--json', '--url', url, 'publish', '--space', space, '--op', op,
    '--input', inputPath, '--request-key', `cli-${op}`], {
    env: { ...process.env, DETUNED_TOKEN: boot.adminToken, DETUNED_TOKEN_FILE: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
  let exitCode;
  try {
    exitCode = await new Promise((resolve, reject) => { child.on('close', resolve); child.on('error', reject); });
  } finally { clearTimeout(timer); }
  let output;
  try { output = JSON.parse(stdout); } catch { output = {}; }
  return { op, exit_code: exitCode, error_code: output.error?.code ?? null, message: output.error?.message ?? null,
    stderr_empty: stderr === '', passes: exitCode === 0 && !output.error };
}

try {
  await app.ready();
  const space = (await post('/spaces', { slug: 'cli-r2', objective: 'CLI fixture', rules: [] })).space.id;
  const thread = (await post(`/spaces/${space}/threads`, { title: 'CLI fixture' })).thread.id;
  const fields = { title: 'CLI note', summary: 'CLI fixture', body: 'Synthetic body' };
  const target = (await post(`/spaces/${space}/threads/${thread}/posts`, { kind: 'note', ...fields })).post.id;
  const withdrawalTarget = (await post(`/spaces/${space}/threads/${thread}/posts`, { kind: 'note', ...fields })).post.id;
  const url = await app.listen({ host: '127.0.0.1', port: 0 });
  const checks = [];
  checks.push(await runCli(url, space, 'post', { thread_id: thread, kind: 'note', ...fields }));
  checks.push(await runCli(url, space, 'revision', { post_id: target, expected_revision: 1, ...fields, body: 'Revised body' }));
  checks.push(await runCli(url, space, 'withdraw', { post_id: withdrawalTarget, expected_revision: 1, reason: 'Synthetic withdrawal' }));
  const result = { reviewed_date: '2026-09-28', reviewed_commit: 'fa1b35c', runtime: process.version,
    mode: 'real built CLI subprocess + loopback HTTP + temporary file SQLite', expected: 'all exit 0', checks,
    passed: checks.filter(c => c.passes).length, failed: checks.filter(c => !c.passes).length };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exitCode = result.failed ? 1 : 0;
} finally {
  await app.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
