import {test as base, expect, type Page} from '@playwright/test';
import {createServer, request as httpRequest, type Server, type ServerResponse} from 'node:http';
import {mkdtemp, rm, stat, mkdir, appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import {buildApp} from '../../../packages/server/dist/index.js';
import {bootstrapDatabase, SqliteStorage} from '../../../packages/storage-sqlite/dist/index.js';
import {CryptoHasher} from '../../../packages/core/dist/index.js';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
type IdentityName = 'contributor' | 'observer';
type Identity = {actor: string; credential: string; token: string};
type Post = {id: string; title: string; revision: number};
type Json = Record<string, unknown>;
type HttpEvent = {method: string; path: string; status: number; requestKey?: string};
type Fault = 'lose-after-commit' | 'fail-before' | 'hold-after';
export type FaultHandle = {entered: Promise<void>; release: () => void};
export interface ForumFixture {
  baseURL: string;
  space: {id: string; slug: string};
  hidden: {id: string; slug: string};
  thread: {id: string; title: string};
  post: Post;
  actorIds: Record<IdentityName, string>;
  login(page: Page, identity?: IdentityName): Promise<void>;
  revokeCredential(identity: IdentityName): Promise<void>;
  withdrawMembership(identity: IdentityName): Promise<void>;
  seedNote(input: {title: string; body: string; structured?: Json}): Promise<Post>;
  seedSyntheticLargeNote(title: string): Promise<Post>;
  revisePost(post: Post, input: {title?: string; body: string; structured?: Json}): Promise<Post>;
  postsByTitle(title: string): Array<{id: string; author_id: string; current_revision: number; space_id: string; thread_id: string}>;
  relationsFrom(postId: string): Array<{source_post_id: string; source_revision: number; target_post_id: string; target_revision: number; type: string}>;
  businessCounts(): Record<string, number>;
  readonly httpEvents: HttpEvent[];
  faultNext(match: {method: string; path: string}, fault: Fault): FaultHandle;
}
function json(value: unknown): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Private fixture response unavailable.');
  return value as Json;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Private fixture identity unavailable.');
  return value;
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => {resolve = r;});
  return {promise, resolve};
}
class Clock {
  private milliseconds = Date.parse('2026-11-01T00:00:00.000Z');
  now() {return new Date(this.milliseconds);}
  nowIso() {return this.now().toISOString();}
  refill() {this.milliseconds += 60000;}
}
async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {server.off('error', reject); resolve();});
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Private fixture listener unavailable.');
  return `http://127.0.0.1:${address.port}`;
}
function unavailable(response: ServerResponse) {
  response.writeHead(503, {'content-type': 'application/json', 'cache-control': 'no-store'});
  response.end(JSON.stringify({api_version: '1', request_id: 'private-proxy', error: {code: 'TEMPORARILY_UNAVAILABLE', message: 'Private fixture response unavailable.', retryable: true}}));
}
async function createFixture(): Promise<{forum: ForumFixture; dispose: () => Promise<void>}> {
  // Fail before creating a DB when the explicitly built Web bundle is absent.
  const webAssetsDir = path.join(repository, 'packages/web/dist');
  if (!(await stat(path.join(webAssetsDir, 'index.html'))).isFile()) throw new Error('Build the private Web test bundle first.');
  const owned = await mkdtemp('/private/tmp/detuned-web-browser-');
  let initialized: {db: Database.Database; adminToken: string | null};
  try {
    const database = new Database(path.join(owned, 'forum.sqlite'));
    try {initialized = {db: database, adminToken: bootstrapDatabase(database).adminToken};}
    catch {database.close(); throw new Error('Private fixture bootstrap unavailable.');}
  } catch {await rm(owned, {recursive: true, force: true}); throw new Error('Private fixture bootstrap unavailable.');}
  const {db, adminToken} = initialized;
  if (!adminToken) {db.close(); await rm(owned, {recursive: true, force: true}); throw new Error('Private fixture bootstrap unavailable.');}
  const clock = new Clock();
  const httpEvents: HttpEvent[] = [];
  const pending: Array<{method: string; path: string; fault: Fault; entered: ReturnType<typeof deferred>; released: ReturnType<typeof deferred>}> = [];
  const held = new Set<ReturnType<typeof deferred>>();
  let upstream = '';
  let app: ReturnType<typeof buildApp> | undefined;
  const proxy = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://fixture.invalid').pathname;
    const method = request.method ?? 'GET';
    const index = pending.findIndex(f => f.method === method && f.path === pathname);
    const fault = index < 0 ? undefined : pending.splice(index, 1)[0];
    const record: HttpEvent = {method, path: pathname, status: 0};
    if (pathname.endsWith('/posts') && typeof request.headers['idempotency-key'] === 'string') record.requestKey = request.headers['idempotency-key'];
    httpEvents.push(record);
    if (!upstream || fault?.fault === 'fail-before') {
      record.status = 503; request.resume(); unavailable(response); fault?.entered.resolve(); return;
    }
    // Browser-supplied Host/Origin/Cookie are forwarded unchanged. No credential injection.
    const inner = httpRequest(new URL(request.url ?? '/', upstream), {method, headers: request.headers}, result => {
      record.status = result.statusCode ?? 0;
      if (!fault) {response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response); return;}
      const chunks: Buffer[] = [];
      result.on('data', bytes => {chunks.push(Buffer.from(bytes));});
      result.on('end', () => {
        fault.entered.resolve();
        if (fault.fault === 'lose-after-commit') {if (!response.destroyed) unavailable(response); return;}
        held.add(fault.released);
        void fault.released.promise.then(() => {
          held.delete(fault.released);
          if (!response.destroyed) {response.writeHead(result.statusCode ?? 502, result.headers); response.end(Buffer.concat(chunks));}
        });
      });
      result.on('error', () => {if (!response.destroyed) unavailable(response); fault.entered.resolve();});
    });
    inner.on('error', () => {if (!response.destroyed) unavailable(response); fault?.entered.resolve();});
    inner.setTimeout(10000, () => {inner.destroy(); if (!response.destroyed) unavailable(response);});
    request.on('aborted', () => {inner.destroy();});
    request.pipe(inner);
  });
  let baseURL = '';
  async function dispose() {
    for (const f of pending) {f.entered.resolve(); f.released.resolve();}
    for (const d of held) d.resolve();
    proxy.closeAllConnections();
    await new Promise<void>((resolve, reject) => {proxy.close(error => {if (error && (!('code' in error) || error.code !== 'ERR_SERVER_NOT_RUNNING')) reject(error); else resolve();});});
    if (app) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {await Promise.race([app.close(), new Promise<never>((_, reject) => {timer = setTimeout(() => reject(new Error('Private app cleanup deadline.')), 15000);})]);}
      finally {if (timer) clearTimeout(timer);}
    }
    db.close();
    await rm(owned, {recursive: true, force: true});
    try {await stat(owned); throw new Error('Private fixture cleanup incomplete.');} catch (error) {if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;}
    const evidence = path.join(repository, 'docs/reviews/2026-10-09-m5-1-b/verification');
    await mkdir(evidence, {recursive: true});
    await appendFile(path.join(evidence, 'browser-fixture-cleanup.jsonl'), JSON.stringify({owned_temp: owned, proxy_closed: true, app_closed: true, db_closed: true, temp_absent: true}) + '\n');
  }
  try {
    baseURL = await listen(proxy);
    app = buildApp({storage: new SqliteStorage(db), clock, webOrigin: baseURL, allowInsecureLoopback: true, webAssetsDir});
    let key = 0;
    async function seed(method: 'POST' | 'PATCH' | 'DELETE', route: string, payload?: Json): Promise<Json> {
      clock.refill();
      if (upstream) {
        const result = await fetch(baseURL + '/api/v1' + route, {method, headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`, ...(payload === undefined ? {} : {'content-type': 'application/json'})}, ...(payload === undefined ? {} : {body: JSON.stringify(payload)}), signal: AbortSignal.timeout(5000)});
        if (result.status >= 300) throw new Error(`Private fixture seed rejected (${result.status}).`);
        return json(json(await result.json()).data);
      }
      const response = await app!.inject({method, url: '/api/v1' + route, headers: {host: new URL(baseURL).host, authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`}, ...(payload === undefined ? {} : {payload})});
      if (response.statusCode >= 300) throw new Error(`Private fixture seed rejected (${response.statusCode}).`);
      return json(json(response.json()).data);
    }
    const space = {id: string(json((await seed('POST', '/spaces', {slug: 'browser-space', objective: 'Private browser research', rules: []})).space).id), slug: 'browser-space'};
    const hidden = {id: string(json((await seed('POST', '/spaces', {slug: 'private-hidden-space', objective: 'Private hidden research', rules: []})).space).id), slug: 'private-hidden-space'};
    const thread = {id: string(json((await seed('POST', `/spaces/${space.id}/threads`, {title: 'Browser discussion'})).thread).id), title: 'Browser discussion'};
    const identities = {} as Record<IdentityName, Identity>;
    for (const role of ['contributor', 'observer'] as const) {
      const actor = string((await seed('POST', '/admin/actors', {kind: 'human', display_name: 'Browser ' + role})).id);
      await seed('POST', `/spaces/${space.id}/memberships`, {actor_id: actor, role});
      const credential = await seed('POST', '/admin/credentials', {actor_id: actor, allowed_space_ids: [space.id], capabilities: ['read', 'write']});
      identities[role] = {actor, credential: string(credential.credential_id), token: string(credential.token)};
    }
    async function seedNote(input: {title: string; body: string; structured?: Json}): Promise<Post> {
      const response = await seed('POST', `/spaces/${space.id}/threads/${thread.id}/posts`, {kind: 'note', title: input.title, summary: 'Private browser fixture', body: input.body, ...(input.structured ? {structured: input.structured} : {})});
      return {id: string(json(response.post).id), title: input.title, revision: Number(json(response.revision).revision)};
    }
    const post = await seedNote({title: 'Fixture source', body: 'Original fixed research body.'});
    await app.listen({host: '127.0.0.1', port: 0});
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Private upstream listener unavailable.');
    upstream = `http://127.0.0.1:${address.port}`;
    const forum: ForumFixture = {
      baseURL, space, hidden, thread, post,
      actorIds: {contributor: identities.contributor.actor, observer: identities.observer.actor},
      async login(page, identity = 'contributor') {
        // Suppress action errors that would otherwise repeat the private token in call logs.
        try {await page.getByLabel('访问令牌', {exact: true}).fill(identities[identity].token); await page.getByRole('button', {name: '登录', exact: true}).click();}
        catch {throw new Error('Private browser login action failed.');}
        await expect(page.getByRole('button', {name: '退出登录', exact: true})).toBeVisible();
      },
      async revokeCredential(identity) {await seed('POST', `/admin/credentials/${identities[identity].credential}/revoke`);},
      async withdrawMembership(identity) {await seed('DELETE', `/spaces/${space.id}/memberships/${identities[identity].actor}`);},
      seedNote,
      async seedSyntheticLargeNote(title) {
        if (httpEvents.length) throw new Error('Synthetic historical fixture must precede browser access.');
        // The ordinary note is first accepted through actual HTTP. This one owned
        // historical test record is then widened before any browser sees it.
        // Do not claim that the oversized structured material was a legal HTTP new write.
        const value = await seedNote({title, body: 'Synthetic historical structured material.'});
        const row = json(db.prepare('SELECT title,summary,body FROM post_revisions WHERE post_id=? AND revision=1').get(value.id));
        const structured = {historical_material: '研究🧪'.repeat(120000)};
        const hasher = new CryptoHasher();
        const contentHash = hasher.sha256(`${string(row.title)}\n${string(row.summary)}\n${string(row.body)}\n${hasher.canonicalJson(structured)}`);
        db.prepare('UPDATE post_revisions SET structured=?,content_hash=? WHERE post_id=? AND revision=1').run(JSON.stringify(structured), contentHash, value.id);
        return value;
      },
      async revisePost(original, input) {
        const result = await seed('POST', `/spaces/${space.id}/posts/${original.id}/revisions`, {expected_revision: original.revision, title: input.title ?? original.title, summary: 'Private browser fixture revision', body: input.body, ...(input.structured ? {structured: input.structured} : {})});
        return {id: original.id, title: input.title ?? original.title, revision: Number(json(result.revision).revision)};
      },
      postsByTitle(title) {return db.prepare('SELECT p.id,p.author_id,p.current_revision,p.space_id,p.thread_id FROM posts p JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE r.title=? ORDER BY p.id').all(title) as ReturnType<ForumFixture['postsByTitle']>;},
      relationsFrom(postId) {return db.prepare('SELECT source_post_id,source_revision,target_post_id,target_revision,type FROM relations WHERE source_post_id=?').all(postId) as ReturnType<ForumFixture['relationsFrom']>;},
      businessCounts() {return Object.fromEntries(['posts', 'post_revisions', 'relations', 'sessions', 'events', 'idempotency_records'].map(table => [table, Number(json(db.prepare(`SELECT count(*) n FROM ${table}`).get()).n)]));},
      httpEvents,
      faultNext(match, fault) {const entered = deferred(), released = deferred(); pending.push({...match, fault, entered, released}); return {entered: entered.promise, release: released.resolve};},
    };
    return {forum, dispose};
  } catch {await dispose(); throw new Error('Private browser fixture setup failed.');}
}

export const test = base.extend<{forum: ForumFixture}>({
  forum: async ({}, use) => {
    const fixture = await createFixture();
    try {await use(fixture.forum);} finally {await fixture.dispose();}
  },
});
export {expect};
