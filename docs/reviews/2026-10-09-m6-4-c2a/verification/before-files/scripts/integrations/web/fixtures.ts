import {test as base, expect, type Page} from '@playwright/test';
import {createServer, request as httpRequest, type Server, type ServerResponse} from 'node:http';
import {mkdtemp, rm, stat, mkdir, appendFile, readFile, writeFile, chmod} from 'node:fs/promises';
import {request as httpsRequest} from 'node:https';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {X509Certificate, createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import {buildApp, ArtifactFileStore} from '../../../packages/server/dist/index.js';
import {bootstrapDatabase, SqliteStorage} from '../../../packages/storage-sqlite/dist/index.js';
import {CryptoHasher} from '../../../packages/core/dist/index.js';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const evidenceRoot = path.resolve(process.env.DETUNED_WEB_EVIDENCE_DIR ?? path.join(repository, 'test-results/web'));
type IdentityName = 'contributor' | 'observer';
export type ReviewIdentityName = 'requester' | 'one' | 'two';
export type ReviewSetup = {target: Post; requesterId: string; reviewerIds: [string,string]; policyRevision: number};
type Identity = {actor: string; credential: string; token: string};
type Post = {id: string; title: string; revision: number};
type SeedPost = {title: string; body: string; summary?: string; kind?: 'note' | 'failure' | 'question' | 'summary' | 'objection'; refs?: Array<{type: 'challenges' | 'cites'; target_ref: {post_id: string; revision: number}}>; tags?: string[]; structured?: Json; threadId?: string};
type Json = Record<string, unknown>;
type HttpEvent = {method: string; path: string; status: number; requestKey?: string; query?: Record<string, string>};
type Fault = 'lose-after-commit' | 'fail-before' | 'hold-after' | 'hold-before';
export type FaultHandle = {entered: Promise<void>; release: () => void};
export interface ForumFixture {
  baseURL: string;
  setupReview(options?: {requiredChecks?: boolean}): Promise<ReviewSetup>;
  loginReview(page: Page, identity: ReviewIdentityName): Promise<void>;
  reviewRows(): {counts: Record<string,number>; requests: Array<{id:string;round:number;phase:string;submitted_count:number}>; submissions: Array<{id:string;reviewer_actor_id:string;reviewer_session_id:string;revealed_at:string|null}>};
  evidencePath(relative: string): string;
  space: {id: string; slug: string};
  hidden: {id: string; slug: string};
  alternate: {id: string; slug: string};
  thread: {id: string; title: string};
  post: Post;
  actorIds: Record<IdentityName, string>;
  login(page: Page, identity?: IdentityName): Promise<void>;
  revokeCredential(identity: IdentityName): Promise<void>;
  withdrawMembership(identity: IdentityName): Promise<void>;
  patchSpace(input: {spaceId?: string; objective?: string; rules?: string[]; pinnedRefs?: Array<{post_id:string;revision:number}>}): Promise<number>;
  seedHistoricalLargeRules(spaceId: string): Promise<number>;
  seedHistoricalBody(title: string, body: string): Promise<Post>;
  reviseReviewTarget(original: Post, input: {body:string;structured:Json}): Promise<Post>;
  setHistoricalPostTimes(entries: Array<{id: string; createdAt: string}>): void;
  seedNote(input: {title: string; body: string; structured?: Json}): Promise<Post>;
  seedPost(input: SeedPost): Promise<Post>;
  seedThread(input: {title: string; initialPost?: SeedPost}): Promise<{id: string; title: string; initialPost?: Post}>;
  seedHistoricalFailure(title: string): Promise<Post>;
  threadsByTitle(title: string): Array<{id: string; creator_id: string; space_id: string}>;
  seedSyntheticLargeNote(title: string): Promise<Post>;
  revisePost(post: Post, input: {title?: string; summary?: string; tags?: string[]; body: string; structured?: Json}): Promise<Post>;
  postsByTitle(title: string): Array<{id: string; author_id: string; current_revision: number; space_id: string; thread_id: string}>;
  relationsFrom(postId: string): Array<{source_post_id: string; source_revision: number; target_post_id: string; target_revision: number; type: string}>;
  artifacts(): Array<{id: string; owner_id: string; space_id: string; sha256: string; bytes: number; state: string}>;
  artifactsFor(postId: string, revision: number): Array<{artifact_id: string; purpose: string}>;
  seedArtifact(input: {bytes: Uint8Array; mime?: string; post?: Post; state?: 'ready' | 'missing' | 'redacted'; visibility?: 'space' | 'review_assignment'; crossSpace?: boolean}): Promise<string>;
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
async function createFixture(tlsMaterial?: TlsMaterial): Promise<{forum: ForumFixture; dispose: () => Promise<void>}> {
  // Fail before creating a DB when the explicitly built Web bundle is absent.
  const webAssetsDir = path.join(repository, 'packages/web/dist');
  if (!(await stat(path.join(webAssetsDir, 'index.html'))).isFile()) throw new Error('Build the private Web test bundle first.');
  await mkdir(path.join(evidenceRoot, 'screenshots'), {recursive: true});
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
  let browserAccessed = false;
  let app: ReturnType<typeof buildApp> | undefined;
  const proxy = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://fixture.invalid').pathname;
    const method = request.method ?? 'GET';
    if (typeof request.headers.authorization !== 'string') browserAccessed = true;
    const index = pending.findIndex(f => f.method === method && f.path === pathname);
    const fault = index < 0 ? undefined : pending.splice(index, 1)[0];
    const record: HttpEvent = {method, path: pathname, status: 0};
    if ((pathname.endsWith('/posts') || pathname.endsWith('/threads') || pathname.endsWith('/artifacts') || /\/review-requests(?:\/[^/]+\/(?:submissions|finalize|cancel))?$/.test(pathname)) && typeof request.headers['idempotency-key'] === 'string') record.requestKey = request.headers['idempotency-key'];
    if (pathname.endsWith('/review-requests') || pathname.endsWith('/search') || pathname.endsWith('/catalog') || pathname.endsWith('/artifacts') || pathname.endsWith('/context') || /\/threads\/[^/]+\/posts$/.test(pathname) || /\/spaces\/[^/]+\/revisions\/\d+$/.test(pathname)) record.query = Object.fromEntries(new URL(request.url ?? '/', 'http://fixture.invalid').searchParams);
    httpEvents.push(record);
    if (!upstream || fault?.fault === 'fail-before') {
      record.status = 503; request.resume(); unavailable(response); fault?.entered.resolve(); return;
    }
    // Browser-supplied Host/Origin/Cookie are forwarded unchanged. No credential injection.
    const forward = () => {
    const inner = httpRequest(new URL(request.url ?? '/', upstream), {method, headers: request.headers}, result => {
      record.status = result.statusCode ?? 0;
      if (!fault || fault.fault === 'hold-before') {response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response); return;}
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
    };
    if (fault?.fault === 'hold-before') {
      if (method !== 'GET') {unavailable(response); fault.entered.resolve(); return;}
      held.add(fault.released); fault.entered.resolve();
      void fault.released.promise.then(() => {held.delete(fault.released); if (!response.destroyed) forward();});
    } else forward();
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
    const evidence = evidenceRoot;
    await mkdir(evidence, {recursive: true});
    await appendFile(path.join(evidence, 'browser-fixture-cleanup.jsonl'), JSON.stringify({owned_temp: owned, proxy_closed: true, app_closed: true, db_closed: true, temp_absent: true}) + '\n');
  }
  try {
    baseURL = await listen(proxy);
    if (tlsMaterial) {baseURL = baseURL.replace('http:', 'https:'); await new Promise<void>((resolve, reject) => proxy.close(error => error ? reject(error) : resolve()));}
    const artifactBlobs = await ArtifactFileStore.create(owned);
    app = buildApp({artifactBlobs, storage: new SqliteStorage(db), clock, webOrigin: baseURL, allowInsecureLoopback: !tlsMaterial, webAssetsDir, ...(tlsMaterial ? {tls: {cert: tlsMaterial.cert, key: tlsMaterial.key}} : {})});
    if (tlsMaterial) app.addHook('onResponse', async (request, response) => {
      const url = new URL(request.url, baseURL);
      if (typeof request.headers.authorization !== 'string') browserAccessed = true;
      httpEvents.push({method: request.method, path: url.pathname, status: response.statusCode});
    });
    let key = 0;
    async function seed(method: 'POST' | 'PATCH' | 'DELETE', route: string, payload?: Json): Promise<Json> {
      clock.refill();
      if (upstream && tlsMaterial) {
        const response = await tlsRequestJson(baseURL + '/api/v1' + route, tlsMaterial.ca, {method, headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`, ...(payload === undefined ? {} : {'content-type': 'application/json'})}, ...(payload === undefined ? {} : {body: JSON.stringify(payload)})});
        if (response.status >= 300) throw new Error(`Private TLS seed rejected (${response.status}).`);
        return json(response.data.data);
      }
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
    const alternate = {id: string(json((await seed('POST', '/spaces', {slug: 'alternate-space', objective: 'Second private browser space', rules: []})).space).id), slug: 'alternate-space'};
    const thread = {id: string(json((await seed('POST', `/spaces/${space.id}/threads`, {title: 'Browser discussion'})).thread).id), title: 'Browser discussion'};
    const identities = {} as Record<IdentityName, Identity>;
    for (const role of ['contributor', 'observer'] as const) {
      const actor = string((await seed('POST', '/admin/actors', {kind: 'human', display_name: 'Browser ' + role})).id);
      await seed('POST', `/spaces/${space.id}/memberships`, {actor_id: actor, role});
      if (role === 'contributor') await seed('POST', `/spaces/${alternate.id}/memberships`, {actor_id: actor, role});
      const credential = await seed('POST', '/admin/credentials', {actor_id: actor, allowed_space_ids: role === 'contributor' ? [space.id, alternate.id] : [space.id], capabilities: ['read', 'write']});
      identities[role] = {actor, credential: string(credential.credential_id), token: string(credential.token)};
    }
    const reviewIdentities = new Map<ReviewIdentityName,Identity>();
    async function loginIdentity(page: Page, identity: Identity) {
      try {await page.getByLabel('访问令牌', {exact:true}).fill(identity.token); await page.getByRole('button',{name:'登录',exact:true}).click();}
      catch {throw new Error('Private browser login action failed.');}
      await expect(page.getByRole('button',{name:'退出登录',exact:true})).toBeVisible();
    }
    async function ordinaryPost(identity: Identity, route: string, payload: Json): Promise<Json> {
      clock.refill();
      const result=await fetch(baseURL+'/api/v1'+route,{method:'POST',headers:{authorization:`Bearer ${identity.token}`,'content-type':'application/json','idempotency-key':`browser-private-ordinary-${++key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
      if(!result.ok)throw new Error(`Private ordinary seed rejected (${result.status}).`);
      return json(json(await result.json()).data);
    }
    function postPayload(input: SeedPost): Json {
      return {kind: input.kind ?? 'note', title: input.title, summary: input.summary ?? 'Private browser fixture', body: input.body, ...(input.tags ? {tags: input.tags} : {}), ...(input.refs ? {refs: input.refs} : {}), ...(input.structured ? {structured: input.structured} : {})};
    }
    function postResult(response: Json, title: string): Post {
      return {id: string(json(response.post).id), title, revision: Number(json(response.revision).revision)};
    }
    async function seedPost(input: SeedPost): Promise<Post> {
      return postResult(await seed('POST', `/spaces/${space.id}/threads/${input.threadId ?? thread.id}/posts`, postPayload(input)), input.title);
    }
    async function seedNote(input: {title: string; body: string; structured?: Json}): Promise<Post> {return seedPost(input);}
    function historicalStructured(value: Post, structured: Json) {
      if (browserAccessed) throw new Error('Historical fixture must precede browser access.');
      const row = json(db.prepare('SELECT title,summary,body FROM post_revisions WHERE post_id=? AND revision=1').get(value.id));
      const hasher = new CryptoHasher();
      const contentHash = hasher.sha256(`${string(row.title)}\n${string(row.summary)}\n${string(row.body)}\n${hasher.canonicalJson(structured)}`);
      db.prepare('UPDATE post_revisions SET structured=?,content_hash=? WHERE post_id=? AND revision=1').run(JSON.stringify(structured), contentHash, value.id);
    }
    async function patchSpace(input: {spaceId?: string; objective?: string; rules?: string[]; pinnedRefs?: Array<{post_id:string;revision:number}>}): Promise<number> {
      const id=input.spaceId ?? space.id;
      if (![space.id,alternate.id].includes(id)) throw new Error('Private space patch scope invalid.');
      const row=json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(id));
      await seed('PATCH',`/spaces/${id}`,{expected_revision:Number(row.current_revision),...(input.objective===undefined?{}:{objective:input.objective}),...(input.rules===undefined?{}:{rules:input.rules}),...(input.pinnedRefs===undefined?{}:{pinned_refs:input.pinnedRefs})});
      return Number(json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(id)).current_revision);
    }
    const post = await seedNote({title: 'Fixture source', body: 'Original fixed research body.'});
    await app.listen({host: '127.0.0.1', port: tlsMaterial ? Number(new URL(baseURL).port) : 0});
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Private upstream listener unavailable.');
    upstream = `${tlsMaterial ? 'https' : 'http'}://127.0.0.1:${address.port}`;
    const forum: ForumFixture = {
      baseURL, space, hidden, alternate, thread, post,
      evidencePath(relative) {if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Private evidence path invalid.'); return path.join(evidenceRoot, relative);},
      actorIds: {contributor: identities.contributor.actor, observer: identities.observer.actor},
      async setupReview(options={}) {
        if(reviewIdentities.size)throw new Error('Review fixture already configured.');
        reviewIdentities.set('requester',identities.contributor);
        const reviewerIds: [string,string]=['',''];
        for(const [index,name] of (['one','two'] as const).entries()) {
          const actor=string((await seed('POST','/admin/actors',{kind:'human',display_name:'Independent browser reviewer '+name})).id);
          await seed('POST',`/spaces/${space.id}/memberships`,{actor_id:actor,role:'observer',reviewer_eligible:true,independence_group:'browser-review-'+name});
          const credential=await seed('POST','/admin/credentials',{actor_id:actor,allowed_space_ids:[space.id],capabilities:['read','write']});
          reviewIdentities.set(name,{actor,credential:string(credential.credential_id),token:string(credential.token)});reviewerIds[index]=actor;
        }
        const current=Number(json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(space.id)).current_revision);
        await seed('PATCH',`/spaces/${space.id}`,{expected_revision:current,review_policy:{enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:options.requiredChecks?['local']:[],allow_open_objections:false},check_profiles:options.requiredChecks?{local:{verifier_actor_ids:[identities.observer.actor],config_sha256:'a'.repeat(64),description:'No synthetic passing receipt'}}:{}});
        const value=await ordinaryPost(identities.contributor,`/spaces/${space.id}/threads/${thread.id}/posts`,{kind:'claim',title:'Browser independent review claim',summary:'Owned ordinary research',body:'A fixed ordinary claim for browser review.',structured:{statement:'Independent local claim',assumptions:['Synthetic fixture'],scope:'Private local browser',falsification_plan:'Read and report counterexamples'}});
        return {target:postResult(value,'Browser independent review claim'),requesterId:identities.contributor.actor,reviewerIds,policyRevision:Number(json(db.prepare('SELECT policy_revision FROM spaces WHERE id=?').get(space.id)).policy_revision)};
      },
      async loginReview(page,name) {const identity=reviewIdentities.get(name);if(!identity)throw new Error('Private review identity unavailable.');await loginIdentity(page,identity);},
      reviewRows() {
        return {counts:Object.fromEntries(['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','artifacts','events','idempotency_records','sessions'].map(table=>[table,Number(json(db.prepare(`SELECT count(*) n FROM ${table}`).get()).n)])),requests:db.prepare('SELECT id,round,phase,submitted_count FROM review_requests ORDER BY round').all() as ReturnType<ForumFixture['reviewRows']>['requests'],submissions:db.prepare('SELECT id,reviewer_actor_id,reviewer_session_id,revealed_at FROM review_submissions ORDER BY id').all() as ReturnType<ForumFixture['reviewRows']>['submissions']};
      },
      async login(page, identity = 'contributor') {
        // Suppress action errors that would otherwise repeat the private token in call logs.
        try {await page.getByLabel('访问令牌', {exact: true}).fill(identities[identity].token); await page.getByRole('button', {name: '登录', exact: true}).click();}
        catch {throw new Error('Private browser login action failed.');}
        await expect(page.getByRole('button', {name: '退出登录', exact: true})).toBeVisible();
      },
      async revokeCredential(identity) {await seed('POST', `/admin/credentials/${identities[identity].credential}/revoke`);},
      async withdrawMembership(identity) {await seed('DELETE', `/spaces/${space.id}/memberships/${identities[identity].actor}`);},
      seedNote, seedPost, patchSpace,
      async reviseReviewTarget(original,input) {
        const identity=reviewIdentities.get('requester');if(!identity)throw new Error('Private review requester unavailable.');
        const result=await ordinaryPost(identity,`/spaces/${space.id}/posts/${original.id}/revisions`,{expected_revision:original.revision,title:original.title,summary:'Private fixture claim revision',body:input.body,structured:input.structured});
        return {id:original.id,title:original.title,revision:Number(json(result.revision).revision)};
      },
      async seedHistoricalBody(title,body) {
        if(browserAccessed) throw new Error('Historical body must precede browser access.');
        const value=await seedNote({title,body:'Legal small HTTP seed before owned historical replacement.'});
        const row=json(db.prepare('SELECT title,summary,structured FROM post_revisions WHERE post_id=? AND revision=1').get(value.id));
        const hasher=new CryptoHasher();const structured=json(JSON.parse(string(row.structured)));
        const hash=hasher.sha256(`${string(row.title)}\n${string(row.summary)}\n${body}\n${hasher.canonicalJson(structured)}`);
        db.prepare('UPDATE post_revisions SET body=?,content_hash=? WHERE post_id=? AND revision=1').run(body,hash,value.id);
        return value;
      },
      setHistoricalPostTimes(entries) {
        if (browserAccessed) throw new Error('Historical timestamps must precede browser access.');
        const update=db.prepare('UPDATE posts SET created_at=? WHERE id=? AND space_id=?');
        db.transaction(()=>{for(const entry of entries) {if(update.run(entry.createdAt,entry.id,space.id).changes!==1) throw new Error('Private historical post scope invalid.');}})();
      },
      async seedHistoricalLargeRules(spaceId) {
        if (browserAccessed) throw new Error('Historical space fixture must precede browser access.');
        const revision=await patchSpace({spaceId,objective:'Synthetic historical oversized rules',rules:['Legal initial rule']});
        const rules=Array.from({length:1200},(_,index)=>`${index} ${'研究🧪'.repeat(100)}`);
        db.prepare('UPDATE space_revisions SET rules=? WHERE space_id=? AND revision=?').run(JSON.stringify(rules),spaceId,revision);
        return revision;
      },
      async seedThread(input) {
        const result = await seed('POST', `/spaces/${space.id}/threads`, {title: input.title, ...(input.initialPost ? {initial_post: postPayload(input.initialPost)} : {})});
        return {id: string(json(result.thread).id), title: input.title, ...(result.initial_post && input.initialPost ? {initialPost: postResult(json(result.initial_post), input.initialPost.title)} : {})};
      },
      async seedHistoricalFailure(title) {
        // First accepted through ordinary strict HTTP. Then one owned historical
        // record is widened before browser access; this is not a legal new failure write.
        const value = await seedPost({kind: 'failure', title, body: 'Historical partial research record.', structured: {attempt: 'Historical attempt', category: 'test_failure', assumptions: [], tested_scope: 'Private fixture', expected: 'Complete record', observed: 'Partial historical record', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'Historical evidence unavailable', ruled_out: 'No general exclusion', not_ruled_out: ['Other variants'], retry_when: ['Obtain evidence']}});
        historicalStructured(value, {attempt: 'Historical attempt', category: null, tested_scope: null, evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'Historical evidence unavailable'});
        return value;
      },
      threadsByTitle(title) {return db.prepare('SELECT id,creator_id,space_id FROM threads WHERE title=? ORDER BY id').all(title) as ReturnType<ForumFixture['threadsByTitle']>;},
      async seedSyntheticLargeNote(title) {
        if (httpEvents.length) throw new Error('Synthetic historical fixture must precede browser access.');
        // The ordinary note is first accepted through actual HTTP. This one owned
        // historical test record is then widened before any browser sees it.
        // Do not claim that the oversized structured material was a legal HTTP new write.
        const value = await seedNote({title, body: 'Synthetic historical structured material.'});
        historicalStructured(value, {historical_material: '研究🧪'.repeat(120000)});
        return value;
      },
      async revisePost(original, input) {
        const result = await seed('POST', `/spaces/${space.id}/posts/${original.id}/revisions`, {expected_revision: original.revision, title: input.title ?? original.title, summary: input.summary ?? 'Private browser fixture revision', body: input.body, ...(input.tags ? {tags: input.tags} : {}), ...(input.structured ? {structured: input.structured} : {})});
        return {id: original.id, title: input.title ?? original.title, revision: Number(json(result.revision).revision)};
      },
      postsByTitle(title) {return db.prepare('SELECT p.id,p.author_id,p.current_revision,p.space_id,p.thread_id FROM posts p JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE r.title=? ORDER BY p.id').all(title) as ReturnType<ForumFixture['postsByTitle']>;},
      relationsFrom(postId) {return db.prepare('SELECT source_post_id,source_revision,target_post_id,target_revision,type FROM relations WHERE source_post_id=?').all(postId) as ReturnType<ForumFixture['relationsFrom']>;},
      artifacts() {return db.prepare('SELECT id,owner_id,space_id,sha256,bytes,state FROM artifacts ORDER BY id').all() as ReturnType<ForumFixture['artifacts']>;},
      artifactsFor(postId, revision) {return db.prepare('SELECT artifact_id,purpose FROM revision_artifacts WHERE post_id=? AND revision=? ORDER BY artifact_id').all(postId, revision) as ReturnType<ForumFixture['artifactsFor']>;},
      async seedArtifact(input) {
        if (browserAccessed) throw new Error('Historical artifact fixture must precede browser access.');
        clock.refill();
        const form = new FormData();
        form.append('metadata', JSON.stringify({visibility: 'space'}));
        form.append('file', new Blob([new Uint8Array(input.bytes)], {type: input.mime ?? 'application/octet-stream'}), 'private-fixture.bin');
        const result = await fetch(baseURL + `/api/v1/spaces/${space.id}/artifacts`, {method: 'POST', headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`}, body: form, signal: AbortSignal.timeout(5000)});
        if (!result.ok) throw new Error(`Private artifact seed rejected (${result.status}).`);
        const id = string(json(json(await result.json()).data).id);
        // Legal HTTP upload precedes explicitly synthetic historical association/status.
        if (input.post) db.prepare('INSERT INTO revision_artifacts(post_id,revision,artifact_id,purpose) VALUES(?,?,?,?)').run(input.post.id, input.post.revision, id, 'private-fixture');
        if (input.state) db.prepare('UPDATE artifacts SET state=? WHERE id=?').run(input.state,id);
        if (input.visibility) db.prepare('UPDATE artifacts SET visibility=? WHERE id=?').run(input.visibility,id);
        if (input.crossSpace) db.prepare('UPDATE artifacts SET space_id=? WHERE id=?').run(hidden.id,id);
        return id;
      },
      businessCounts() {return Object.fromEntries(['threads', 'posts', 'post_revisions', 'relations', 'sessions', 'events', 'idempotency_records', 'artifacts', 'revision_artifacts'].map(table => [table, Number(json(db.prepare(`SELECT count(*) n FROM ${table}`).get()).n)]));},
      httpEvents,
      faultNext(match, fault) {if (tlsMaterial) throw new Error('Direct TLS fixture has no fault proxy.'); const entered = deferred(), released = deferred(); pending.push({...match, fault, entered, released}); return {entered: entered.promise, release: released.resolve};},
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


/** Private certificates exist only while the actual TLS worker runs; no repository PEM or global trust. */
export type TlsMaterial = {owned: string; ca: Buffer; cert: Buffer; key: Buffer; spki: string};
async function createTlsMaterial(): Promise<TlsMaterial> {
  const owned = await mkdtemp('/private/tmp/detuned-browser-tls-');
  const run = promisify(execFile);
  const openssl = '/opt/homebrew/bin/openssl';
  try {
    await run(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=Detuned Private Test CA','-keyout',path.join(owned,'ca.key'),'-out',path.join(owned,'ca.crt')], {env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
    await run(openssl, ['req','-newkey','rsa:2048','-nodes','-sha256','-subj','/CN=localhost','-keyout',path.join(owned,'leaf.key'),'-out',path.join(owned,'leaf.csr')], {env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
    await writeFile(path.join(owned,'extensions.txt'),'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n',{mode:0o600});
    await run(openssl, ['x509','-req','-sha256','-days','2','-in',path.join(owned,'leaf.csr'),'-CA',path.join(owned,'ca.crt'),'-CAkey',path.join(owned,'ca.key'),'-CAcreateserial','-extfile',path.join(owned,'extensions.txt'),'-out',path.join(owned,'leaf.crt')], {env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
    await chmod(path.join(owned,'ca.key'),0o600); await chmod(path.join(owned,'leaf.key'),0o600);
    const ca=await readFile(path.join(owned,'ca.crt')),cert=await readFile(path.join(owned,'leaf.crt')),key=await readFile(path.join(owned,'leaf.key'));
    const spki=createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64');
    return {owned,ca,cert,key,spki};
  } catch {await rm(owned,{recursive:true,force:true}); throw new Error('Private TLS fixture generation failed.');}
}
export async function tlsRequestJson(url: string, ca: Buffer, options: {method?: string; headers?: Record<string,string>; body?: string}={}): Promise<{status: number; data: Json; headers: import('node:http').IncomingHttpHeaders}> {
  return new Promise((resolve,reject)=>{
    const hostname=new URL(url).hostname;
    // Bind TLS verification to the connection URL, while independently testing HTTP Host policy.
    const request=httpsRequest(url,{ca,rejectUnauthorized:true,servername:isIP(hostname)?'':hostname,method:options.method??'GET',headers:options.headers},response=>{
      const chunks:Buffer[]=[];
      response.on('data',bytes=>chunks.push(Buffer.from(bytes)));
      response.on('end',()=>{try {resolve({status:response.statusCode??0,data:json(JSON.parse(Buffer.concat(chunks).toString())),headers:response.headers});} catch {reject(new Error('Private TLS response invalid.'));}});
      response.on('error',()=>reject(new Error('Private TLS response failed.')));
    });
    request.on('error',()=>reject(new Error('Private TLS request failed.')));
    request.setTimeout(5000,()=>request.destroy());
    request.end(options.body);
  });
}
export const tlsTest = test.extend<{}, {tlsMaterial: TlsMaterial}>({
  tlsMaterial: [async ({},use)=>{
    const material=await createTlsMaterial();
    try {await use(material);} finally {
      await rm(material.owned,{recursive:true,force:true});
      await mkdir(evidenceRoot,{recursive:true});
      await appendFile(path.join(evidenceRoot,'tls-certificate-cleanup.jsonl'),JSON.stringify({owned_temp:material.owned,temp_absent:await stat(material.owned).then(()=>false,()=>true)})+'\n');
    }
  },{scope:'worker'}],
  browser: async ({playwright,tlsMaterial},use)=>{
    const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:[`--ignore-certificate-errors-spki-list=${tlsMaterial.spki}`]});
    try {await use(browser);} finally {await browser.close();}
  },
  forum: async ({tlsMaterial},use)=>{
    const fixture=await createFixture(tlsMaterial);
    try {await use(fixture.forum);} finally {await fixture.dispose();}
  },
});
