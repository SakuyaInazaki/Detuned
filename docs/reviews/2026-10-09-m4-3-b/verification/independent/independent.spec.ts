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

const {DETUNED_TOOLS}=await import(pathToFileURL(repo+'/packages/protocol/dist/index.js').href);
it('independent real malformed patch preserves identity and valid patch recovers',async()=>{
 const f=await fixture();let h:any,stop:any;const receipt:any={};try{
 h=await host(f);expect(h.names()).toEqual(DETUNED_TOOLS.map((t:any)=>'mcp__detuned__'+t.name).sort());
 const publish=(key:string)=>h.run('forum_publish',{space_id:f.space,thread_id:f.thread,op:'post',kind:'note',title:'private',summary:'private',body:'Research data',request_key:key});
 expect((await publish('before-invalid')).isError).not.toBe(true);expect(f.db.prepare('SELECT author_id FROM posts').all()).toEqual([{author_id:f.a.actor.id}]);
 const initial=deferred(),invalid=deferred(),recovered=deferred();let refreshes=0,failures=0;
 stop=await h.ctx.hmr.watchConfig(h.patch,async()=>{
 try{const patches=loadOverlayPatches('detuned-private',h.patch);await h.rootEntry.update({config:{...h.rootEntry.options.config,patches}});await h.scope.ctx.loader.await();refreshes++;if(patches[0]?.insert?.[0]?.config?.env?.DETUNED_TOKEN_FILE===f.b.file)recovered.resolve();else initial.resolve()}
 catch(error){failures++;receipt.parse_failure_type=(error as Error).name;invalid.resolve();throw error}
 });await initial.promise;
 const counts=()=>Object.fromEntries(['posts','events','idempotency_records','sessions'].map(t=>[t,f.db.prepare('SELECT COUNT(*) n FROM '+t).get().n]));const before=counts(),requests=f.requests(),acks=f.acks();
 const oldRows=h.pidRows();const oldPids=oldRows.filter((x:any)=>x.event==='start').map((x:any)=>x.pid);
 writeFileSync(h.patch,'- insert: [\n',{mode:0o600});await invalid.promise;await h.ctx.hmr.runExclusive(async()=>{});
 expect(failures).toBe(1);expect(counts()).toEqual(before);expect(f.requests()).toBe(requests);expect(f.acks()).toBe(acks);expect(h.names()).toEqual(expectedNames);expect(h.pidRows()).toEqual(oldRows);
 expect((await h.run('forum_context',{space_id:f.space})).isError).not.toBe(true);expect(counts()).toEqual(before);
 h.writePatch(f.b.file);await recovered.promise;h.assertExited(oldPids);expect(h.names()).toEqual(expectedNames);
 expect((await publish('after-recovery')).isError).not.toBe(true);expect(f.db.prepare('SELECT author_id,space_id FROM posts ORDER BY created_at,id').all()).toEqual([{author_id:f.a.actor.id,space_id:f.space},{author_id:f.b.actor.id,space_id:f.space}]);
 const sessions=f.db.prepare('SELECT actor_id,space_id FROM sessions').all();expect(sessions).toHaveLength(2);expect(sessions.every((x:any)=>x.space_id===f.space)).toBe(true);expect(sessions.map((x:any)=>x.actor_id).sort()).toEqual([f.a.actor.id,f.b.actor.id].sort());expect(f.acks()).toBe(acks);
 Object.assign(receipt,{status:'PASS',exact_names:h.names(),real_refreshes:refreshes,parse_failures:failures,invalid_http_increment:0,invalid_business_increment:0,invalid_child_increment:0,observed_behavior:'previous valid A remains active after parse failure; later valid B reload succeeds',author_before:'A',author_after:'B',ack_requests:f.acks(),old_pids:oldPids,old_exited:true});console.log(JSON.stringify(receipt));
 }finally{const failures:string[]=[];for(const [name,fn] of [['watch-stop',async()=>{if(stop)await stop()}],['host-close',async()=>{if(h)await h.close()}],['fixture-close',async()=>{await f.close()}]] as any){try{await fn()}catch{failures.push(name)}}receipt.cleanup_failures=failures;writeFileSync(repo+'/docs/reviews/2026-10-09-m4-3-b/verification/independent/runtime-receipt.json',JSON.stringify(receipt,null,2));expect(failures).toEqual([])}
});
