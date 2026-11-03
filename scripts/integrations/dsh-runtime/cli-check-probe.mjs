// Fixed no-model diagnostic. The caller must supply an externally isolated Linux runner.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const [repo, root, installation] = process.argv.slice(2);
assert.equal(process.env.DETUNED_DSH_PROBE_ISOLATED, '1', 'External isolation acknowledgement required.');
assert.equal(process.platform, 'linux');
for (const value of [repo, root, installation]) assert.ok(typeof value === 'string' && path.isAbsolute(value));
const rootStat = await fs.lstat(root);
assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink());
assert.equal(rootStat.mode & 0o777, 0o700);
assert.equal(rootStat.uid, process.getuid());

const load = name => import(pathToFileURL(path.join(repo, name)).href);
const require = createRequire(path.join(repo, 'package.json'));
const Database = require('better-sqlite3');
const { bootstrapDatabase, SqliteStorage } = await load('packages/storage-sqlite/dist/index.js');
const { buildApp } = await load('packages/server/dist/index.js');
const { DetunedClient } = await load('packages/client/dist/index.js');
const packageVersion = async name => JSON.parse(await fs.readFile(path.join(installation, name, 'package.json'), 'utf8')).version;
const version = await packageVersion('');
const mcpVersion = await packageVersion('node_modules/@deepseek-ai/dsh-mcp-client');
assert.equal(version, '0.2.1-rc.2');
assert.equal(mcpVersion, version);

// This trusted diagnostic runs inside the real CLI. It registers no replacement tools.
function diagnosticSource(readerUrl) {
  return `
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { dshErrorCode } from ${JSON.stringify(readerUrl)};
export const inject = ['tools'];
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
async function awaitMarker(file) {
  for (let attempt = 0; attempt < 500; attempt++) {
    try { await fs.access(file); return; } catch { await pause(); }
  }
  throw Error('Parent handshake deadline.');
}
export function apply(ctx, config) {
  const timer = setTimeout(async () => {
    try {
      const expected = ['ack','context','poll','publish','read','relate','review','search','subscribe']
        .map(name => 'mcp__detuned__forum_' + name).sort();
      let names = [];
      for (let attempt = 0; attempt < 300; attempt++) {
        names = ctx.tools.schemas().map(tool => tool.name).sort();
        if (names.length === expected.length) break;
        await pause();
      }
      assert.deepEqual(names, expected);
      let serial = 0;
      const call = (name, args) => ctx.tools.execute({
        name: 'mcp__detuned__' + name, arguments: args,
        signal: new AbortController().signal, callId: 'probe-' + ++serial,
      });
      await fs.writeFile(config.ready, 'ready');
      await awaitMarker(config.start);
      const invalid = await call('forum_read', {
        space_id: config.space, kind: 'post', id: config.post, revision: 1, run_id: 'irrelevant',
      });
      const invalidCode = dshErrorCode(invalid);
      const shape = {
        is_error: invalid.isError === true,
        error_message_string: typeof invalid.error?.message === 'string',
        content_text_string: typeof invalid.content?.[0]?.text === 'string',
        structured_error_present: invalid.structuredContent?.error !== undefined,
      };
      await fs.writeFile(config.invalid, JSON.stringify({ code: invalidCode, shape }));
      await awaitMarker(config.resume);
      assert.equal(invalidCode, 'VALIDATION_ERROR');
      const denied = await call('forum_context', { space_id: config.denied });
      assert.equal(dshErrorCode(denied), 'NOT_FOUND');
      const read = await call('forum_read', {
        space_id: config.space, kind: 'post', id: config.post, revision: 1,
      });
      assert.notEqual(read.isError, true);
      assert.ok(JSON.stringify(read).includes('actual-dsh-private-fixture'));
      await fs.writeFile(config.receipt, JSON.stringify({
        names, host_node: process.version, invalid_code: invalidCode,
        denied_code: dshErrorCode(denied), read_success: true,
      }));
    } catch {
      await fs.writeFile(config.receipt, JSON.stringify({ failed: true }));
    }
    // Request the official launcher's bounded shutdown, rather than stdin EOF.
    process.kill(process.pid, 'SIGTERM');
  }, 150);
  ctx.effect(() => () => clearTimeout(timer));
}
`;
}

const dir = await fs.mkdtemp(path.join(root, 'cli-'));
await fs.chmod(dir, 0o700);
let db, app, child, exitPromise;
let ownedGroupAbsent = false;
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
function killOwnedGroup() {
  if (ownedGroupAbsent || !child?.pid) return;
  try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
async function waitFile(file) {
  for (let attempt = 0; attempt < 500; attempt++) {
    try { return await fs.readFile(file, 'utf8'); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      assert.equal(child.exitCode, null, 'CLI exited before diagnostic completion.');
      await pause();
    }
  }
  throw Error('CLI diagnostic deadline.');
}

try {
  // Real service and ordinary scoped credential; admin is confined to fixture setup.
  db = new Database(path.join(dir, 'instance.sqlite'));
  const token = bootstrapDatabase(db).adminToken;
  const requests = [];
  app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
  app.addHook('onRequest', async req => requests.push({ method: req.method, path: req.url.split('?')[0] }));
  const url = await app.listen({ host: '127.0.0.1', port: 0 });
  const admin = new DetunedClient({ baseUrl: url, token, maxRetries: 0 });
  const space = (await admin.createSpace({ slug: 'native-dsh', objective: 'bounded ordinary test', rules: [] }, 'space')).data.space.id;
  const denied = (await admin.createSpace({ slug: 'denied-dsh', objective: 'private', rules: [] }, 'denied')).data.space.id;
  const actor = await admin.createActor({ kind: 'agent', display_name: 'Native dsh ordinary' });
  await admin.createMembership(space, { actor_id: actor.id, role: 'contributor' });
  const credential = await admin.createCredential({ actor_id: actor.id, allowed_space_ids: [space], capabilities: ['read', 'write'] });
  const thread = (await admin.createThread(space, { title: 'fixture' }, 'thread')).data.thread.id;
  const post = (await admin.createPost(space, thread, {
    kind: 'note', title: 'fixture', summary: 'bounded', body: 'actual-dsh-private-fixture',
  }, 'post')).data.post;
  const tokenFile = path.join(dir, 'actor.token');
  await fs.writeFile(tokenFile, credential.token, { mode: 0o600 });

  // A custom empty-bundle profile loads only the documented registry/MCP services.
  const home = path.join(dir, 'home');
  const profile = path.join(home, 'profiles/probe');
  await fs.mkdir(profile, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(profile, 'package.json'), JSON.stringify({ private: true, 'dsh.profile': { bundles: [] } }));
  const files = Object.fromEntries(['ready', 'start', 'invalid', 'resume', 'receipt'].map(name => [name, path.join(dir, name)]));
  const plugin = path.join(dir, 'diagnostic.mjs');
  await fs.writeFile(plugin, diagnosticSource(new URL('./error-code.mjs', import.meta.url).href), { mode: 0o600 });
  const rows = [
    { id: 'prompt', name: '@deepseek-ai/dsh-system-prompt' },
    { id: 'tools', name: '@deepseek-ai/dsh-tools' },
    { id: 'mcp', name: '@deepseek-ai/dsh-mcp-client', config: {
      serverName: 'detuned', transport: 'stdio', command: process.execPath,
      args: [path.join(repo, 'packages/mcp/dist/index.js')],
      env: { DETUNED_BASE_URL: url, DETUNED_TOKEN_FILE: tokenFile }, cwd: dir,
      failOnStartupError: true, reconnect: { enabled: false },
    } },
    { id: 'diagnostic', name: plugin, config: { space, denied, post: post.id, ...files } },
  ];
  const patch = path.join(dir, 'overlay.json');
  await fs.writeFile(patch, JSON.stringify([{ insert: rows }]));
  child = spawn('/usr/bin/node', [path.join(installation, 'lib/bin.js'), '--profile', 'probe', '--patch', patch], {
    cwd: dir, detached: true, stdio: ['ignore', 'ignore', 'ignore'],
    env: { PATH: '/usr/bin:/bin', HOME: home, DSH_HOME: home, TMPDIR: dir, OPENSSL_CONF: '/dev/null', DSH_TELEMETRY_DISABLED: '1' },
  });
  exitPromise = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  void exitPromise.catch(() => {});

  // Two handshakes exclude discovery/setup and all later valid calls from the delta.
  await waitFile(files.ready);
  const before = requests.length;
  await fs.writeFile(files.start, 'start');
  const invalid = JSON.parse(await waitFile(files.invalid));
  const invalidHttp = requests.length - before;
  await fs.writeFile(files.resume, 'continue');
  const receipt = JSON.parse(await waitFile(files.receipt));
  const deadline = setTimeout(killOwnedGroup, 15000);
  let close;
  try { close = await exitPromise; } finally { clearTimeout(deadline); }
  assert.deepEqual(close, { code: 0, signal: null });
  assert.equal(invalid.code, 'VALIDATION_ERROR');
  assert.equal(invalidHttp, 0);
  assert.equal(receipt.failed, undefined);
  try { process.kill(-child.pid, 0); assert.fail('Owned CLI process group remains.'); }
  catch (error) { assert.equal(error.code, 'ESRCH'); ownedGroupAbsent = true; }

  await app.close(); app = undefined;
  db.close(); db = undefined;
  const result = {
    version, mcp_version: mcpVersion, host_node: receipt.host_node, backend_node: process.version,
    tools: receipt.names, invalid_code: invalid.code, invalid_http: invalidHttp,
    denied_code: receipt.denied_code, read_success: receipt.read_success, model_calls: 0,
    shutdown_request: 'diagnostic_plugin_SIGTERM', close, server_closed: true,
    owned_group_absent: true, error_shape: invalid.shape,
  };
  const output = JSON.stringify(result);
  assert.equal(output.includes(credential.token), false);
  assert.equal(output.includes(token), false);
  process.stdout.write(output + '\n');
} finally {
  killOwnedGroup();
  // Preserve the primary spawn failure while still removing our fixture.
  if (exitPromise) await exitPromise.catch(() => {});
  if (app) await app.close();
  if (db?.open) db.close();
  await fs.rm(dir, { recursive: true, force: true });
}
