#!/usr/bin/env node
// No model requests. Run only inside an externally isolated Linux test environment.
import assert from 'node:assert/strict';
import {assertPendingRedelivery} from './poll-redelivery.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DetunedClient} from '../../packages/client/dist/index.js';
import {nativeCheckNames,prepareOrdinaryCheckFixture,exerciseOrdinaryCheckBranches,createNativeInputWriter} from './claude-check-probe.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const exec = promisify(execFile);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function codexCatalogue(status) {
  assert.ok(Array.isArray(status?.data), 'Expected app-server data array');
  const matches = status.data.filter(server => server.name === 'detuned');
  assert.ok(matches.length <= 1, 'Duplicate detuned server');
  const server = matches[0];
  const tools = server?.tools;
  const values = tools && typeof tools === 'object' && !Array.isArray(tools) ? Object.values(tools) : [];
  return {
    server,
    names: values.map(tool => tool.name).sort(),
    summary: {
      data_count: status.data.length,
      detuned_count: matches.length,
      tool_count: values.length,
      next_cursor_present: status.nextCursor != null,
    },
  };
}

// Cleanup has its own deadline, independent of an expired work deadline.
async function within(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Native probe deadline')), milliseconds); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function acceptableNativeClose(close) {
  // EOF may complete naturally; active-poll teardown may require SIGTERM.
  return close?.code === 0 && close.signal === null || close?.signal === 'SIGTERM' && close.code === null || close?.code === 143 && close.signal === null;
}

async function verifyOwnGroup(child) {
  assert.ok(Number.isSafeInteger(child.pid) && child.pid > 1);
  const {stdout} = await exec('/bin/ps', ['-p', String(child.pid), '-o', 'uid=,ppid=,pgid='], {timeout: 1000, maxBuffer: 128});
  assert.deepEqual(stdout.trim().split(/\s+/).map(Number), [process.getuid(), process.pid, child.pid]);
}

function groupAbsent(pid) {
  try {
    process.kill(-pid, 0);
    return false;
  } catch (error) {
    if (error.code === 'ESRCH') return true;
    throw error;
  }
}

// Each request owns its polling loop. A deadline terminates that loop itself.
export function nativeConnection(child, host, report, workEnd) {
  const writer = createNativeInputWriter(child);
  const responses = new Map(), pendingIds = new Set();
  let buffer = '', bytes = 0, serial = 0, streamFailure, stopped = false;
  child.stderr.resume();
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', text => {
    bytes += Buffer.byteLength(text);
    if (bytes > 1048576) {
      streamFailure = Error('Native output limit');
      return;
    }
    buffer += text;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      try {
        const value = JSON.parse(line);
        const id = host === 'codex' ? value.id : value.type === 'control_response' ? value.response?.request_id : undefined;
        // No unbounded buffering of unsolicited host messages.
        if (pendingIds.has(id)) responses.set(id, value);
      } catch {
        streamFailure = Error('Invalid native JSON');
      }
    }
  });
  return {
    stop() { stopped = true; },
    async initialized() { await writer.write(JSON.stringify({method: 'initialized'}) + '\n'); },
    async request(method, params) {
      const id = host === 'codex' ? ++serial : 'native-' + (++serial);
      const frame = host === 'codex' ? {id, method, params} : {type: 'control_request', request_id: id, request: {subtype: method, ...params}};
      const deadline = Math.min(workEnd, Date.now() + 15000);
      pendingIds.add(id);
      try {
        await within(writer.write(JSON.stringify(frame) + '\n'), Math.max(1, deadline - Date.now()));
        while (!responses.has(id)) {
          writer.assertHealthy();
          if (streamFailure) throw streamFailure;
          if (stopped || child.exitCode !== null || child.signalCode !== null) throw Error('Native request aborted');
          if (Date.now() >= deadline) throw Error('Native RPC deadline');
          await pause(20);
        }
        writer.assertHealthy();
        if (streamFailure) throw streamFailure;
        const value = responses.get(id);
        if (value.error) throw Error('Native RPC rejected');
        return host === 'codex' ? value.result : value.response;
      } finally {
        responses.delete(id);
        pendingIds.delete(id);
      }
    },
  };
}

async function createConfiguration(root, host, bridge) {
  const home = path.join(root, 'home'), tmp = path.join(root, 'tmp'), cwd = path.join(root, 'cwd');
  for (const directory of [home, tmp, cwd]) await fs.mkdir(directory, {mode: 0o700});
  const env = {PATH: process.env.PATH, CI: 'true', HOME: home, TMPDIR: tmp, XDG_CONFIG_HOME: home, XDG_CACHE_HOME: home, XDG_DATA_HOME: home, OPENSSL_CONF: '/dev/null'};
  if (host === 'codex') {
    const state = path.join(root, 'codex');
    await fs.mkdir(state, {mode: 0o700});
    env.CODEX_HOME = state;
    const config = [
      'cli_auth_credentials_store = "file"',
      '[mcp_servers.detuned]',
      `command = ${JSON.stringify(bridge.command)}`,
      `args = ${JSON.stringify(bridge.args)}`,
      '[mcp_servers.detuned.env]',
      ...Object.entries(bridge.env).map(([key, value]) => `${key} = ${JSON.stringify(value)}`),
    ].join('\n') + '\n';
    await fs.writeFile(path.join(state, 'config.toml'), config, {flag: 'wx', mode: 0o600});
    return {env, cwd, args: ['app-server', '--listen', 'stdio://']};
  }
  env.CLAUDE_CONFIG_DIR = path.join(root, 'claude');
  env.CLAUDE_CODE_TMPDIR = tmp;
  await fs.mkdir(env.CLAUDE_CONFIG_DIR, {mode: 0o700});
  const settings = path.join(root, 'settings.json'), mcp = path.join(root, 'mcp.json');
  await fs.writeFile(settings, '{}', {flag: 'wx', mode: 0o600});
  await fs.writeFile(mcp, JSON.stringify({mcpServers: {detuned: bridge}}), {flag: 'wx', mode: 0o600});
  return {env, cwd, args: ['--bare', '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--setting-sources', '', '--settings', settings, '--strict-mcp-config', '--mcp-config', mcp, '--no-session-persistence']};
}

async function discover(connection, host, cwd, report) {
  let threadId;
  if (host === 'codex') {
    await connection.request('initialize', {clientInfo: {name: 'detuned-linux-native', version: '1'}, capabilities: {experimentalApi: true}});
    await connection.initialized();
    const started = await connection.request('thread/start', {cwd, ephemeral: true});
    threadId = started.thread?.id;
    assert.equal(typeof threadId, 'string');
  } else {
    assert.equal((await connection.request('initialize', {})).subtype, 'success');
  }
  report.stage = 'catalogue';
  for (let attempt = 0; attempt < 40; attempt++) {
    let names;
    if (host === 'codex') {
      const status = codexCatalogue(await connection.request('mcpServerStatus/list', {threadId, detail: 'toolsAndAuthOnly'}));
      report.catalogues.push(status.summary);
      assert.equal(status.summary.next_cursor_present, false, 'Unexpected catalogue pagination');
      names = status.names;
    } else {
      const status = await connection.request('mcp_status', {});
      const server = status.response?.mcpServers?.find(item => item.name === 'detuned');
      names = (server?.tools ?? []).map(tool => tool.name).sort();
      report.catalogues.push({connected: server?.status === 'connected', tool_count: names.length});
    }
    if (names.length) {
      assert.deepEqual(names, nativeCheckNames);
      report.tools = names;
      return threadId;
    }
    await pause(100);
  }
  throw Error('Native catalogue not ready');
}

function toolCaller(connection, host, threadId) {
  return async (name, input) => {
    const response = await connection.request(host === 'codex' ? 'mcpServer/tool/call' : 'mcp_call', host === 'codex'
      ? {threadId, server: 'detuned', tool: name, arguments: {input}}
      : {tool: 'mcp__detuned__' + name, arguments: {input}});
    if (host === 'claude' && response.subtype !== 'success') {
      try { return {ok: false, code: JSON.parse(response.error).error?.code}; }
      catch { return {ok: false}; }
    }
    const value = host === 'codex' ? response : response.response;
    if (value?.isError) {
      let code = value.structuredContent?.error?.code;
      for (const part of value.content ?? []) {
        if (!code && part.type === 'text') {
          try { code = JSON.parse(part.text).error?.code; } catch {}
        }
      }
      return {ok: false, code};
    }
    assert.ok(value?.structuredContent && 'result' in value.structuredContent);
    return {ok: true, value: value.structuredContent.result};
  };
}

async function checkCancellation({fixture, call, requests, stop, connection, app, report}) {
  const consumer = (await fixture.ordinary.subscribe(fixture.space, {consumer_key: 'linux-native-pending', start: 'beginning'}, 'linux-native-sub')).data.consumer;
  const first = (await fixture.ordinary.poll(fixture.space, consumer.id, {limit: 1})).data;
  assert.ok(first.batch_id);
  const ackBefore = requests.filter(item => item.path.endsWith('/ack')).length;
  const waiting = (await fixture.ordinary.subscribe(fixture.space, {consumer_key: 'linux-native-wait', start: 'now'}, 'linux-native-wait')).data.consumer;
  const flight = call('forum_poll', {space_id: fixture.space, consumer_id: waiting.id, limit: 1, wait_ms: 25000});
  const settled = flight.then(() => null, () => null);
  const suffix = '/consumers/' + waiting.id + '/poll';
  const until = Date.now() + 3000;
  while (!requests.some(item => item.path.endsWith(suffix)) && Date.now() < until) await pause(20);
  assert.ok(requests.some(item => item.path.endsWith(suffix)));
  const poll = requests.find(item => item.path.endsWith(suffix));
  await stop();
  connection.stop();
  await within(settled, 1000);
  const drainedBy = Date.now() + 3000;
  while (app.runtimeResources.activeCount !== 0 && Date.now() < drainedBy) await pause(20);
  assert.equal(app.runtimeResources.activeCount, 0);
  assert.equal(poll.aborted, true, 'Active HTTP poll must be aborted by native teardown');
  const second = (await fixture.ordinary.poll(fixture.space, consumer.id, {limit: 1})).data;
  assertPendingRedelivery(second, first);
  assert.equal(requests.filter(item => item.path.endsWith('/ack')).length, ackBefore);
  Object.assign(report.checks, {pending_unchanged: true, ack_delta: 0, cancelled: true, active_poll_aborted: true, runtime_drained: true});
}

export function naturalNativeClose(close, lifecycle = []) {
  return close?.code === 0 && close.signal === null && !lifecycle.some(item => ['SIGTERM', 'SIGKILL'].includes(item.event));
}

export function recordNativeSignal(report, name, target = 'host') {
  report.lifecycle.push({event: name, target, at_ms: Date.now()});
  if (report.idle_exit) report.idle_exit.natural = false;
  if (report.shutdown === 'idle' || name === 'SIGKILL') report.status = 'failed';
}

// Call only after verifyOwnGroup has established this probe's detached group.
export async function cleanupNativeGroup(pid, report) {
  if (!groupAbsent(pid)) {
    recordNativeSignal(report, 'SIGTERM', 'group');
    process.kill(-pid, 'SIGTERM');
    await pause(300);
    if (!groupAbsent(pid)) {
      recordNativeSignal(report, 'SIGKILL', 'group');
      process.kill(-pid, 'SIGKILL');
      await pause(100);
    }
  }
  report.cleanup.group_absent = groupAbsent(pid);
  if (!report.cleanup.group_absent) report.status = 'failed';
}

export async function observeIdleExit(child, completion, report, milliseconds = 5000) {
  report.lifecycle.push({event: 'stdin-end', at_ms: Date.now()});
  child.stdin.end();
  let result;
  try { result = await within(completion, milliseconds); } catch { result = null; }
  report.idle_exit = {observed: result !== null, natural: naturalNativeClose(result, report.lifecycle), ...(result ?? {})};
  assert.ok(report.idle_exit.natural, 'Idle host did not exit naturally after EOF');
}

export async function runLinuxNativeProbe({host, binary, version, output, shutdown = 'active'}) {
  assert.equal(process.platform, 'linux');
  assert.ok(['active', 'idle'].includes(shutdown));
  assert.ok(['codex', 'claude'].includes(host));
  assert.ok(path.isAbsolute(binary) && path.isAbsolute(output));
  assert.ok(typeof version === 'string' && version.length > 0);
  assert.equal(process.env.DETUNED_NATIVE_ISOLATED, '1', 'Use the documented external isolation runner');
  await fs.access(binary);
  await assert.rejects(fs.lstat(output), {code: 'ENOENT'});
  const root = await fs.mkdtemp(path.join(tmpdir(), 'detuned-linux-native-'));
  await fs.chmod(root, 0o700);
  const report = {status: 'failed', host, version, scope: 'native-control-no-model', shutdown, stage: 'setup', catalogues: [], lifecycle: [], cleanup: {}, checks: {}};
  const requests = [], sockets = new Set();
  let db, app, child, connection, closeResult, closePromise, failure, groupConfirmed = false, stdinEnded = false, watchdog;
  const workEnd = Date.now() + 75000;
  const signal = name => {
    recordNativeSignal(report, name);
    if (child && !closeResult) child.kill(name);
  };
  const stop = async () => {
    if (!child) return;
    if (!stdinEnded) {
      stdinEnded = true;
      report.lifecycle.push({event: 'stdin-end', at_ms: Date.now()});
      child.stdin.end();
    }
    await within(closePromise, 5000).catch(() => null);
    if (!closeResult) {
      signal('SIGTERM');
      await within(closePromise, 1500).catch(() => null);
    }
    if (!closeResult) {
      signal('SIGKILL');
      await within(closePromise, 2000);
    }
    report.native_close = closeResult;
  };
  try {
    const require = createRequire(path.join(repo, 'package.json'));
    const Database = require('better-sqlite3');
    const {bootstrapDatabase, SqliteStorage} = await import('../../packages/storage-sqlite/dist/index.js');
    const {buildApp, ArtifactFileStore} = await import('../../packages/server/dist/index.js');
    db = new Database(path.join(root, 'forum.sqlite'));
    const bootstrap = bootstrapDatabase(db);
    const storage = new SqliteStorage(db, {dataDir: root});
    app = buildApp({storage, artifactBlobs: await ArtifactFileStore.create(root), writeRateLimits: {per_minute: 60000, burst: 10000}});
    app.server.on('connection', socket => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
    app.addHook('onRequest', async (request, reply) => {
      const row = {path: request.url.split('?')[0], aborted: false};
      requests.push(row);
      reply.raw.once('close', () => { if (!reply.raw.writableFinished) row.aborted = true; });
    });
    await app.listen({host: '127.0.0.1', port: 0});
    const url = `http://127.0.0.1:${app.server.address().port}`;
    const admin = new DetunedClient({baseUrl: url, token: bootstrap.adminToken, maxRetries: 0, timeoutMs: 2000});
    const fixture = await prepareOrdinaryCheckFixture(admin, url);
    const token = path.join(root, 'forum.token');
    await fs.writeFile(token, fixture.token, {flag: 'wx', mode: 0o600});
    const launcher = path.join(root, 'bridge.mjs');
    const entry = path.join(repo, 'packages/mcp/dist/index.js');
    await fs.writeFile(launcher, [
      "import fs from 'node:fs/promises';",
      `await fs.writeFile(${JSON.stringify(root + '/bridge-')}+process.pid,JSON.stringify({pid:process.pid,ppid:process.ppid}),{flag:'wx',mode:0o600});`,
      'setTimeout(()=>process.exit(1),80000).unref();',
      `process.argv[1]=${JSON.stringify(entry)};`,
      `await import(${JSON.stringify(pathToFileURL(entry).href)});`,
    ].join('\n'), {flag: 'wx', mode: 0o600});
    const bridge = {command: process.execPath, args: [launcher], env: {DETUNED_BASE_URL: url, DETUNED_TOKEN_FILE: token, DETUNED_MCP_INPUT_MODE: 'wrapped', OPENSSL_CONF: '/dev/null'}};
    const configuration = await createConfiguration(root, host, bridge);
    report.stage = 'version';
    const actual = await exec(binary, ['--version'], {env: configuration.env, cwd: configuration.cwd, timeout: 5000, maxBuffer: 4096});
    assert.equal(actual.stdout.trim(), version, 'Unexpected installed host version');
    report.stage = 'spawn';
    child = spawn(binary, configuration.args, {cwd: configuration.cwd, env: configuration.env, detached: true, stdio: ['pipe', 'pipe', 'pipe']});
    closePromise = new Promise(resolve => {
      child.once('error', () => { failure = Error('Native spawn failed'); });
      child.once('close', (code, signal) => {
        closeResult = {code, signal};
        report.lifecycle.push({event: 'close', code, signal, at_ms: Date.now()});
        resolve(closeResult);
      });
    });
    await verifyOwnGroup(child);
    groupConfirmed = true;
    watchdog = setTimeout(() => signal('SIGTERM'), Math.max(1, workEnd - Date.now()));
    connection = nativeConnection(child, host, report, workEnd);
    report.stage = 'initialize';
    const threadId = await discover(connection, host, configuration.cwd, report);
    const call = toolCaller(connection, host, threadId);
    report.checks = await exerciseOrdinaryCheckBranches(call, fixture, () => requests.length, stage => { report.stage = stage; });
    if (shutdown === 'idle') {
      report.stage = 'idle-exit';
      // Release the ephemeral thread through the installed host's documented RPC.
      if (host === 'codex') {
        const result = await connection.request('thread/unsubscribe', {threadId});
        assert.ok(result && typeof result.status === 'string', 'Missing thread unsubscribe status');
        report.thread_release = {status: result.status};
      }
      assert.equal(app.runtimeResources.activeCount, 0, 'Idle check requires no active HTTP work');
      stdinEnded = true;
      await observeIdleExit(child, closePromise, report);
      report.native_close = closeResult;
    } else {
      report.stage = 'poll-cancel';
      await checkCancellation({fixture, call, requests, stop, connection, app, report});
      assert.ok(acceptableNativeClose(closeResult), 'Unexpected native exit');
    }
    assert.ok(!report.lifecycle.some(item => item.event === 'SIGKILL'), 'Forced kill is not successful shutdown');
    report.status = 'passed';
    report.stage = 'complete';
  } catch (error) {
    failure = error;
    report.error = {name: error.name, code: error.code ?? 'NATIVE_PROBE_FAILED'};
  } finally {
    clearTimeout(watchdog);
    try { await stop(); } catch { report.status = 'failed'; }
    connection?.stop();
    if (groupConfirmed) {
      try {
        await cleanupNativeGroup(child.pid, report);
      } catch { report.status = 'failed'; }
    }
    for (const socket of sockets) socket.destroy();
    try {
      if (app) {
        app.runtimeResources.beginClosing();
        await within(app.runtimeResources.waitForIdle(), 3000);
        await within(app.close(), 3000);
      }
      report.cleanup.server_closed = true;
      if (db) db.close();
      report.cleanup.db_closed = true;
    } catch { report.status = 'failed'; }
    const files = (await fs.readdir(root)).filter(name => /^bridge-\d+$/.test(name));
    report.cleanup.bridge_count = files.length;
    let absent = true;
    for (const file of files) {
      const row = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
      try { process.kill(row.pid, 0); absent = false; }
      catch (error) { if (error.code !== 'ESRCH') absent = false; }
    }
    report.cleanup.bridges_absent = absent;
    if (!absent) report.status = 'failed';
    const safeToRemove = (!child || closeResult) && absent && (!groupConfirmed || report.cleanup.group_absent);
    if (safeToRemove) await fs.rm(root, {recursive: true});
    report.cleanup.private_directory_removed = Boolean(safeToRemove);
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  }
  if (failure || report.status !== 'passed') throw Error('Linux native probe failed');
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const args = process.argv.slice(2), options = {};
    assert.ok(args.length === 8 || args.length === 10);
    for (let index = 0; index < args.length; index += 2) {
      assert.ok(['--host', '--binary', '--version', '--output', '--shutdown'].includes(args[index]));
      const key = args[index].slice(2);
      assert.equal(options[key], undefined);
      options[key] = args[index + 1];
    }
    await runLinuxNativeProbe(options);
    process.stdout.write('NATIVE_CONTROL_PASSED\n');
  } catch {
    process.stderr.write('NATIVE_CONTROL_FAILED\n');
    process.exitCode = 1;
  }
}
