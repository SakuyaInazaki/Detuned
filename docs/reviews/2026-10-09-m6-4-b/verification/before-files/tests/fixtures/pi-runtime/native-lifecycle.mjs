// Fixed isolated test harness; loader.js is an explicitly approved internal SDK file URL.
// It is not a public package export and is never imported by the product.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const mode = process.argv[2];
assert.ok(['identity', 'new', 'switch', 'fork', 'reload', 'shutdown'].includes(mode));
const pkg = path.join(repo, 'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent');
const hash = async name => createHash('sha256').update(await fs.readFile(name)).digest('hex');
const loaderPath = path.join(pkg, 'dist/core/extensions/loader.js');
const metadata = { version: JSON.parse(await fs.readFile(path.join(pkg, 'package.json'), 'utf8')).version, loader_sha256: await hash(loaderPath), loader_public_export: false, internal_loader_test_only: true };
assert.equal(metadata.version, '0.87.1');
assert.equal(metadata.loader_sha256, '81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4');
const sdk = await import(pathToFileURL(path.join(pkg, 'dist/index.js')));
const loader = await import(pathToFileURL(loaderPath));
const require = createRequire(path.join(repo, 'package.json'));
const Database = require('better-sqlite3');
const { bootstrapDatabase, SqliteStorage } = await import(pathToFileURL(path.join(repo, 'packages/storage-sqlite/dist/index.js')));
const { buildApp } = await import(pathToFileURL(path.join(repo, 'packages/server/dist/index.js')));
const { DetunedClient, UserAbortError } = await import(pathToFileURL(path.join(repo, 'packages/client/dist/index.js')));
const { DetunedError } = await import(pathToFileURL(path.join(repo, 'packages/protocol/dist/index.js')));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'detuned-pi-native-'));
let db, app, host;
const deadline = setTimeout(() => { console.error('Private native lifecycle deadline.'); process.exit(1); }, 60000);
const evidence = { mode, metadata, model_calls: 0, events: [] };
try {
  db = new Database(path.join(dir, 'private.sqlite'));
  const adminToken = bootstrapDatabase(db).adminToken;
  app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
  const requests = [];
  app.addHook('onRequest', async req => { requests.push({ method: req.method, path: req.url.split('?')[0] }); });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const admin = new DetunedClient({ baseUrl: url, token: adminToken });
  const space = (await admin.createSpace({ slug: 'private-native', objective: 'private verification', rules: [] }, 'space')).data.space.id;
  const deniedSpace = (await admin.createSpace({ slug: 'private-denied', objective: 'private verification', rules: [] }, 'denied')).data.space.id;
  const thread = (await admin.createThread(space, { title: 'private thread', initial_post: { title: 'private seed', kind: 'note', summary: 'private', body: 'private' } }, 'thread')).data.thread.id;
  const actors = [];
  for (const display_name of ['Private A', 'Private B']) {
    const actor = await admin.createActor({ kind: 'agent', display_name });
    await admin.createMembership(space, { actor_id: actor.id, role: 'contributor' });
    const credential = await admin.createCredential({ actor_id: actor.id, allowed_space_ids: ['*'], capabilities: ['read', 'write'] });
    actors.push({ actor, credential });
  }
  const tokenFile = path.join(dir, 'forum-token');
  await fs.writeFile(tokenFile, actors[0].credential.token, { mode: 0o600 });
  process.env.DETUNED_BASE_URL = url;
  process.env.DETUNED_TOKEN_FILE = tokenFile;
  const authPath = path.join(dir, 'auth.json');
  await fs.writeFile(authPath, '{}', { mode: 0o600 });
  const modelRuntime = await sdk.ModelRuntime.create({ authPath, modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
  const settingsManager = sdk.SettingsManager.inMemory();
  const eventBus = sdk.createEventBus();
  let loaded, generation = 0, veto = false;
  const activate = async () => {
    const gen = ++generation;
    const runtime = sdk.createExtensionRuntime();
    loaded = await loader.loadExtensionsCached([path.join(repo, 'packages/adapter-pi/dist/index.js')], dir, eventBus, runtime);
    assert.equal(loaded.errors.length, 0);
    const observer = await loader.loadExtensionFromFactory(pi => {
      pi.on('session_before_switch', async () => veto ? { cancel: true } : undefined);
      for (const name of ['session_start', 'session_shutdown']) pi.on(name, async event => {
        evidence.events.push({ type: event.type, reason: event.reason, generation: gen, phase: 'enter' });
        await new Promise(resolve => setImmediate(resolve));
        evidence.events.push({ type: event.type, reason: event.reason, generation: gen, phase: 'exit' });
      });
    }, dir, eventBus, runtime, 'private-native-observer-' + gen);
    loaded.extensions.push(observer);
  };
  const beforeActivation = requests.length;
  await activate();
  const resourceLoader = {
    getExtensions: () => loaded, getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }), getSystemPrompt: () => '', getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [], extendResources: () => {}, reload: activate,
  };
  const factory = async options => {
    const result = await sdk.createAgentSession({ ...options, modelRuntime, resourceLoader, tools: loaded.extensions.flatMap(extension => [...extension.tools.keys()]), settingsManager });
    await result.session.bindExtensions({});
    return { ...result, services: { cwd: dir, agentDir: dir, modelRuntime, settingsManager, resourceLoader, diagnostics: [] }, diagnostics: [] };
  };
  const manager = sdk.SessionManager.create(dir, path.join(dir, 'sessions'));
  const saveStatic = manager => {
    manager.appendMessage({ role: 'user', content: 'Private lifecycle fixture', timestamp: Date.now() });
    manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'Static test fixture; no model call.' }], api: 'openai-completions', provider: 'private', model: 'private', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'stop', timestamp: Date.now() });
  };
  host = await sdk.createAgentSessionRuntime(factory, { cwd: dir, agentDir: dir, sessionManager: manager });
  saveStatic(manager);
  assert.equal(requests.length, beforeActivation);
  const names = host.session.extensionRunner.getAllRegisteredTools().map(tool => tool.definition.name).sort();
  assert.deepEqual(names, ['forum_ack', 'forum_context', 'forum_poll', 'forum_publish', 'forum_read', 'forum_relate', 'forum_search', 'forum_subscribe']);
  assert.equal(host.session.getAllTools().length, 8);
  evidence.tools = names; evidence.activation_and_start_http = 0;
  let serial = 0;
  const call = (name, args, definition = host.session.getToolDefinition(name)) => definition.execute('private-' + (++serial), args, new AbortController().signal);
  const publish = key => ({ space_id: space, op: 'post', thread_id: thread, kind: 'note', title: 'private native', summary: 'private', body: 'private', request_key: key });
  const beforeCall = requests.length;
  const initial = await Promise.all([call('forum_publish', publish('first')), call('forum_publish', publish('parallel'))]);
  assert.ok(initial.every(value => value.details.post.author_id === actors[0].actor.id));
  const firstRequests = requests.slice(beforeCall);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/capabilities')).length, 1);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/me')).length, 1);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/sessions')).length, 1);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/posts')).length, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[0].actor.id).n, 1);
  evidence.concurrent_first_calls = { capability: 1, me: 1, session: 1, posts: 2, author_a: true };
  await fs.writeFile(tokenFile, actors[1].credential.token, { mode: 0o600 });
  assert.equal((await call('forum_publish', publish('same-generation'))).details.post.author_id, actors[0].actor.id);
  evidence.same_generation_retains_a = true;
  if (mode === 'identity') {
    veto = true;
    const count = requests.length;
    const replacement = await host.newSession();
    assert.equal(replacement.cancelled, true);
    assert.equal(requests.length, count);
    assert.equal((await call('forum_publish', publish('veto-keeps-old'))).details.post.author_id, actors[0].actor.id);
    veto = false;
    await host.newSession();
    assert.equal((await call('forum_publish', publish('new-generation-b'))).details.post.author_id, actors[1].actor.id);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[1].actor.id).n, 1);
    const denied = await call('forum_context', { space_id: deniedSpace }).then(() => undefined, error => error);
    assert.ok(denied instanceof DetunedError);
    assert.equal(denied.code, 'NOT_FOUND');
    assert.equal(denied.statusCode, 404);
    assert.equal(JSON.stringify({ message: denied.message, details: denied.details }).includes(actors[1].credential.token), false);
    evidence.veto_preserves_runtime = true; evidence.new_generation_b = true; evidence.ordinary_actor_denied_space = denied.code;
  } else {
    // Separate consumers establish both a persistent unconfirmed batch and a genuine long wait.
    const actorClient = new DetunedClient({ baseUrl: url, token: actors[0].credential.token });
    const pending = (await actorClient.subscribe(space, { consumer_key: 'pending', start: 'beginning' })).data.consumer.id;
    const batch = (await call('forum_poll', { space_id: space, consumer_id: pending, limit: 1, wait_ms: 0 })).details;
    assert.ok(batch.batch_id);
    const waiting = (await actorClient.subscribe(space, { consumer_key: 'waiting', start: 'now', event_types: ['post.created'] })).data.consumer.id;
    const state = id => db.prepare('SELECT ack_seq,active_batch_id FROM consumers WHERE id=?').get(id);
    const beforePending = state(pending), beforeWaiting = state(waiting);
    const ackCount = () => requests.filter(value => value.path.endsWith('/ack')).length;
    const beforeAck = ackCount();
    let entered;
    const entry = new Promise(resolve => { entered = resolve; });
    const service = app.eventService;
    const original = service.pollWithWait.bind(service);
    service.pollWithWait = (...args) => { const result = original(...args); if (args[2] === waiting && args[3]?.wait_ms > 0) entered(); return result; };
    let settled = false;
    const oldPoll = host.session.getToolDefinition('forum_poll');
    const inflight = call('forum_poll', { space_id: space, consumer_id: waiting, limit: 1, wait_ms: 25000 }, oldPoll).finally(() => { settled = true; });
    const observed = inflight.then(() => ({ success: true }), error => ({ error }));
    await entry;
    assert.equal(settled, false);
    const startCount = evidence.events.filter(event => event.type === 'session_start').length;
    if (mode === 'new') await host.newSession();
    if (mode === 'switch') {
      const target = sdk.SessionManager.create(dir, path.join(dir, 'switch-sessions')); saveStatic(target);
      await host.switchSession(target.getSessionFile());
    }
    if (mode === 'fork') await host.fork(manager.getLeafId(), { position: 'at' });
    if (mode === 'reload') await host.session.reload();
    if (mode === 'shutdown') { await host.dispose(); host = undefined; }
    assert.equal(settled, true, 'Official lifecycle return must follow tool finally.');
    assert.ok((await observed).error instanceof UserAbortError);
    assert.deepEqual(state(pending), beforePending);
    assert.deepEqual(state(waiting), beforeWaiting);
    assert.equal(ackCount(), beforeAck);
    evidence.cancelled_before_return = true; evidence.tool_finally_before_return = true; evidence.pending_batch_unchanged = true; evidence.ack_request_delta = 0;
    if (mode === 'reload' || mode === 'shutdown') {
      const count = requests.length;
      const oldCall = await call('forum_poll', { space_id: space, consumer_id: waiting, wait_ms: 0 }, oldPoll).then(() => undefined, error => error);
      assert.ok(oldCall instanceof UserAbortError);
      assert.equal(requests.length, count);
      evidence.closed_extension_no_http = true;
    }
    if (mode !== 'shutdown') {
      assert.equal((await call('forum_publish', publish('after-lifecycle'))).details.post.author_id, actors[1].actor.id);
      assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[1].actor.id).n, 1);
      evidence.replacement_uses_b = true;
      if (mode === 'reload') {
        assert.equal(generation, 2);
        assert.notEqual(host.session.getToolDefinition('forum_poll'), oldPoll);
        assert.equal(evidence.events.filter(event => event.type === 'session_start').length, startCount);
        evidence.reload_reactivated_without_start = true;
      }
    }
  }
  console.log(JSON.stringify({ ...evidence, passed: true }));
} catch (error) {
  // Only assertion/site/type information escapes, never request headers or private credential values.
  console.error(JSON.stringify({ mode, passed: false, error_name: error?.name, error_code: error?.code, location: String(error?.stack).split('\n').slice(1, 3) }));
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  if (host) await host.dispose();
  if (app) await app.close();
  db?.close();
  await fs.rm(dir, { recursive: true, force: true });
}
