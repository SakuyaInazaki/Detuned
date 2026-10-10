import { it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const source = process.env.DETUNED_EXPERIMENT_SOURCE!;
const repo = process.env.DETUNED_EXPERIMENT_REPO!;
const load = (path: string) => import(pathToFileURL(source + '/' + path + '/lib/index.js').href);
const { Context } = await load('vendor/cordis');
const { default: Loader } = await load('vendor/loader');
const { default: Timer } = await load('vendor/timer');
const { default: Hmr } = await load('packages/boot/hmr');
const { default: SystemPrompt } = await load('packages/core/system-prompt');
const { default: ToolRuntime } = await load('packages/core/tools');
const { createScope } = await load('packages/core/scope');
const { loadOverlayPatches, mountRootInclude } = await load('packages/boot/app-boot');
const { ToolCallId } = await load('packages/llm/llm');
const require = createRequire(repo + '/package.json');
const Database = require('better-sqlite3');
const { bootstrapDatabase, SqliteStorage } = await import(pathToFileURL(repo + '/packages/storage-sqlite/dist/index.js').href);
const { buildApp } = await import(pathToFileURL(repo + '/packages/server/dist/index.js').href);
const { DetunedClient } = await import(pathToFileURL(repo + '/packages/client/dist/index.js').href);
const expectedNames = ['ack', 'context', 'poll', 'publish', 'read', 'relate', 'search', 'subscribe'].map(n => 'mcp__detuned__forum_' + n).sort();
const deferred = () => Promise.withResolvers<void>();
async function fixture() {
  const dir = mkdtempSync('/private/tmp/detuned-m43-loader.');
  const db = new Database(dir + '/detuned.sqlite');
  const token = bootstrapDatabase(db).adminToken;
  const app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
  let requests = 0, acks = 0;
  app.addHook('onRequest', async (req: any) => { requests++; if (req.routeOptions.url?.endsWith('/ack')) acks++; });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const admin = new DetunedClient({ baseUrl: url, token });
  const space = (await admin.createSpace({ slug: 'loader-private', objective: 'private', rules: [] }, 'space')).data.space.id;
  const thread = (await admin.createThread(space, { title: 'private' }, 'thread')).data.thread.id;
  async function identity(label: string) {
    const actor = await admin.createActor({ kind: 'agent', display_name: label });
    await admin.createMembership(space, { actor_id: actor.id, role: 'contributor' });
    const credential = await admin.createCredential({ actor_id: actor.id, allowed_space_ids: [space], capabilities: ['read', 'write'] });
    const file = dir + '/' + label + '.token'; writeFileSync(file, credential.token, { mode: 0o600 });
    return { actor, file, client: new DetunedClient({ baseUrl: url, token: credential.token }) };
  }
  const a = await identity('actor_a'), b = await identity('actor_b');
  return { dir, db, app, url, admin, space, thread, a, b, requests: () => requests, acks: () => acks,
    async close() { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }); } };
}
async function host(f: any) {
  const ctx = new Context(); ctx.baseUrl = pathToFileURL(f.dir + '/').href;
  await ctx.plugin(SystemPrompt, {}); await ctx.plugin(ToolRuntime); await ctx.plugin(Loader);
  await ctx.plugin(Timer); await ctx.plugin(Hmr, { root: [], ignored: [], debounce: 0 });
  let scope: any; const key: any = { id: 'loader-owned-scope' };
  await ctx.plugin(Object.assign((inner: any) => { scope = createScope(inner, key); }, { inject: ['tools', 'systemPrompt', 'loader'] }));
  const base = f.dir + '/cordis.yml'; writeFileSync(base, '[]\n');
  const patch = f.dir + '/cordis.patch.yml', pidLog = f.dir + '/bridge.pids'; writeFileSync(pidLog, '', { mode: 0o600 });
  function writePatch(tokenFile: string) {
    const text = readFileSync(repo + '/integrations/dsh/cordis.patch.example.yml', 'utf8')
      .replace('/ABS/PATH/TO/node', process.execPath)
      .replace('/ABS/Detuned/packages/mcp/dist/index.js', repo + '/packages/mcp/dist/index.js')
      .replace('http://127.0.0.1:PORT', f.url).replace('/ABS/PRIVATE/actor-token.txt', tokenFile);
    // Only the existing environment object gains a private PID observer. Public plugin name and fields remain unchanged.
    const observed = text.replace('          DETUNED_TOKEN_FILE:', `          NODE_OPTIONS: '--require=${source}/.detuned-m43/pid-preload.cjs'\n          DETUNED_EXPERIMENT_PID_LOG: '${pidLog}'\n          DETUNED_TOKEN_FILE:`);
    writeFileSync(patch, observed, { mode: 0o600 });
  }
  writePatch(f.a.file);
  const before = f.requests();
  const rootEntry = await mountRootInclude(scope.ctx, base, loadOverlayPatches('detuned-private', patch), pathToFileURL(source + '/').href, 'detuned-private');
  await scope.ctx.loader.await();
  const names = () => ctx.tools.schemas(key).map((t: any) => t.name).sort();
  expect(names()).toEqual(expectedNames); expect(f.requests()).toBe(before);
  let count = 0;
  const run = (name: string, args: any, signal = new AbortController().signal) => ctx.tools.execute({ name: 'mcp__detuned__' + name, arguments: args, agent: key, signal, callId: ToolCallId('loader-' + ++count) });
  const pidRows = () => readFileSync(pidLog, 'utf8').trim().split('\n').filter(Boolean).map(s => JSON.parse(s));
  function assertExited(pids: number[]) { for (const pid of pids) { expect(pidRows().some(x => x.event === 'exit' && x.pid === pid)).toBe(true); expect(() => process.kill(pid, 0)).toThrow(); } }
  return { ctx, scope, key, patch, rootEntry, names, writePatch, run, pidRows, assertExited,
    async close() {
      const failed: string[] = [];
      const clean = async (label: string, operation: () => unknown) => { try { await operation(); } catch { failed.push(label); } };
      await clean('include-remove', () => scope.ctx.loader.remove(rootEntry.id));
      await clean('loader-drain', () => scope.ctx.loader.await());
      await clean('scope-dispose', () => scope.dispose());
      let remaining = -1; await clean('registry-sample', () => { remaining = names().length; });
      await clean('root-dispose', () => ctx.fiber.dispose());
      const pids = pidRows().filter(x => x.event === 'start').map(x => x.pid);
      expect(failed).toEqual([]); expect(remaining).toBe(0); expect(pids.length).toBeGreaterThan(0); assertExited(pids);
      console.log(JSON.stringify({ owned_pids: pids, all_exited: true }));
    } };
}
it('official Loader Hmr construction probe', async () => {
  const dir = mkdtempSync('/private/tmp/detuned-m43-hmr-probe.'); const ctx = new Context();
  try { ctx.baseUrl = pathToFileURL(dir + '/').href; await ctx.plugin(Loader); expect(ctx.loader.internal).toBeTruthy(); await ctx.plugin(Timer); await ctx.plugin(Hmr, { root: [], ignored: [], debounce: 0 }); expect(ctx.hmr).toBeTruthy(); await ctx.hmr.runExclusive(async () => {}); }
  finally { await ctx.fiber.dispose(); rmSync(dir, { recursive: true, force: true }); }
});
it('official complete patch activates through Loader Include', async () => {
  const f = await fixture(); let h: any;
  try { h = await host(f); expect(f.db.prepare('SELECT COUNT(*) n FROM sessions').get().n).toBe(0); expect((await h.run('forum_context', { space_id: f.space })).isError).not.toBe(true); console.log(JSON.stringify({ discovered_names: h.names(), original_package_name: true })); }
  finally { try { if (h) await h.close(); } finally { await f.close(); } }
});
it('official real Hmr watch replaces actor without ACK or stale identity', async () => {
  const f = await fixture(); let h: any, disposeWatch: any;
  try {
    h = await host(f);
    const consumer = (await f.a.client.subscribe(f.space, { consumer_key: 'watch-private', start: 'now' })).data.consumer.id;
    const entered = deferred(), stopped = deferred(); const scheduler = f.app.eventService.waitScheduler;
    f.app.eventService.waitScheduler = { nowMs: () => scheduler.nowMs(), sleep: (ms: number, signal: AbortSignal) => { entered.resolve(); return scheduler.sleep(ms, signal); } };
    const poll = f.app.eventService.pollWithWait.bind(f.app.eventService);
    f.app.eventService.pollWithWait = async (...args: any[]) => { try { return await poll(...args); } finally { stopped.resolve(); } };
    const before = f.db.prepare('SELECT ack_seq,active_batch_id FROM consumers WHERE id=?').get(consumer), ackBefore = f.acks();
    const pending = h.run('forum_poll', { space_id: f.space, consumer_id: consumer, wait_ms: 25000, limit: 1 }); void pending.then(() => {}, () => {});
    await entered.promise;
    const oldPids = h.pidRows().filter((x: any) => x.event === 'start').map((x: any) => x.pid);
    const refreshed = deferred(); let refreshes = 0;
    disposeWatch = await h.ctx.hmr.watchConfig(h.patch, async () => {
      const patches = loadOverlayPatches('detuned-private', h.patch);
      await h.rootEntry.update({ config: { ...h.rootEntry.options.config, patches } });
      await h.scope.ctx.loader.await(); refreshes++;
      if (patches[0]?.insert?.[0]?.config?.env?.DETUNED_TOKEN_FILE === f.b.file) refreshed.resolve();
    });
    h.writePatch(f.b.file); await refreshed.promise; await stopped.promise; await pending.catch(() => {});
    h.assertExited(oldPids); expect(h.names()).toEqual(expectedNames);
    expect(f.db.prepare('SELECT ack_seq,active_batch_id FROM consumers WHERE id=?').get(consumer)).toEqual(before); expect(f.acks()).toBe(ackBefore);
    const published = await h.run('forum_publish', { space_id: f.space, thread_id: f.thread, op: 'post', kind: 'note', title: 'private B', summary: 'private', body: 'Research data only', tags: [], structured: {}, request_key: 'identity-after-watch' });
    expect(published.isError).not.toBe(true);
    expect(f.db.prepare('SELECT author_id,space_id FROM posts').all()).toEqual([{ author_id: f.b.actor.id, space_id: f.space }]);
    expect(f.db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(f.a.actor.id).n).toBe(1);
    expect(f.db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(f.b.actor.id).n).toBe(1);
    console.log(JSON.stringify({ real_watch_refreshes: refreshes, old_pids: oldPids, old_exited: true, author_switched: true, ack_unchanged: true }));
  } finally { let watchFailed = false; try { if (disposeWatch) await disposeWatch(); } catch { watchFailed = true; } try { if (h) await h.close(); } finally { await f.close(); } expect(watchFailed).toBe(false); }
});
