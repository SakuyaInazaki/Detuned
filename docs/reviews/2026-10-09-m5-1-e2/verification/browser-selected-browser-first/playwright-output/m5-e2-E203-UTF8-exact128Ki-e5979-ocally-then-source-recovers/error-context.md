# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-e2.spec.ts >> E203 UTF8 exact128KiB/over limit and actual AST exceptions degrade locally then source recovers
- Location: scripts/integrations/web/m5-e2.spec.ts:68:1

# Error details

```
Error: Private fixture seed rejected (422).
```

# Test source

```ts
  74  |     server.listen(0, '127.0.0.1', () => {server.off('error', reject); resolve();});
  75  |   });
  76  |   const address = server.address();
  77  |   if (!address || typeof address === 'string') throw new Error('Private fixture listener unavailable.');
  78  |   return `http://127.0.0.1:${address.port}`;
  79  | }
  80  | function unavailable(response: ServerResponse) {
  81  |   response.writeHead(503, {'content-type': 'application/json', 'cache-control': 'no-store'});
  82  |   response.end(JSON.stringify({api_version: '1', request_id: 'private-proxy', error: {code: 'TEMPORARILY_UNAVAILABLE', message: 'Private fixture response unavailable.', retryable: true}}));
  83  | }
  84  | async function createFixture(): Promise<{forum: ForumFixture; dispose: () => Promise<void>}> {
  85  |   // Fail before creating a DB when the explicitly built Web bundle is absent.
  86  |   const webAssetsDir = path.join(repository, 'packages/web/dist');
  87  |   if (!(await stat(path.join(webAssetsDir, 'index.html'))).isFile()) throw new Error('Build the private Web test bundle first.');
  88  |   await mkdir(path.join(evidenceRoot, 'screenshots'), {recursive: true});
  89  |   const owned = await mkdtemp('/private/tmp/detuned-web-browser-');
  90  |   let initialized: {db: Database.Database; adminToken: string | null};
  91  |   try {
  92  |     const database = new Database(path.join(owned, 'forum.sqlite'));
  93  |     try {initialized = {db: database, adminToken: bootstrapDatabase(database).adminToken};}
  94  |     catch {database.close(); throw new Error('Private fixture bootstrap unavailable.');}
  95  |   } catch {await rm(owned, {recursive: true, force: true}); throw new Error('Private fixture bootstrap unavailable.');}
  96  |   const {db, adminToken} = initialized;
  97  |   if (!adminToken) {db.close(); await rm(owned, {recursive: true, force: true}); throw new Error('Private fixture bootstrap unavailable.');}
  98  |   const clock = new Clock();
  99  |   const httpEvents: HttpEvent[] = [];
  100 |   const pending: Array<{method: string; path: string; fault: Fault; entered: ReturnType<typeof deferred>; released: ReturnType<typeof deferred>}> = [];
  101 |   const held = new Set<ReturnType<typeof deferred>>();
  102 |   let upstream = '';
  103 |   let browserAccessed = false;
  104 |   let app: ReturnType<typeof buildApp> | undefined;
  105 |   const proxy = createServer((request, response) => {
  106 |     const pathname = new URL(request.url ?? '/', 'http://fixture.invalid').pathname;
  107 |     const method = request.method ?? 'GET';
  108 |     if (typeof request.headers.authorization !== 'string') browserAccessed = true;
  109 |     const index = pending.findIndex(f => f.method === method && f.path === pathname);
  110 |     const fault = index < 0 ? undefined : pending.splice(index, 1)[0];
  111 |     const record: HttpEvent = {method, path: pathname, status: 0};
  112 |     if ((pathname.endsWith('/posts') || pathname.endsWith('/threads') || pathname.endsWith('/artifacts')) && typeof request.headers['idempotency-key'] === 'string') record.requestKey = request.headers['idempotency-key'];
  113 |     if (pathname.endsWith('/search') || pathname.endsWith('/catalog') || pathname.endsWith('/artifacts') || pathname.endsWith('/context') || /\/threads\/[^/]+\/posts$/.test(pathname) || /\/spaces\/[^/]+\/revisions\/\d+$/.test(pathname)) record.query = Object.fromEntries(new URL(request.url ?? '/', 'http://fixture.invalid').searchParams);
  114 |     httpEvents.push(record);
  115 |     if (!upstream || fault?.fault === 'fail-before') {
  116 |       record.status = 503; request.resume(); unavailable(response); fault?.entered.resolve(); return;
  117 |     }
  118 |     // Browser-supplied Host/Origin/Cookie are forwarded unchanged. No credential injection.
  119 |     const forward = () => {
  120 |     const inner = httpRequest(new URL(request.url ?? '/', upstream), {method, headers: request.headers}, result => {
  121 |       record.status = result.statusCode ?? 0;
  122 |       if (!fault || fault.fault === 'hold-before') {response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response); return;}
  123 |       const chunks: Buffer[] = [];
  124 |       result.on('data', bytes => {chunks.push(Buffer.from(bytes));});
  125 |       result.on('end', () => {
  126 |         fault.entered.resolve();
  127 |         if (fault.fault === 'lose-after-commit') {if (!response.destroyed) unavailable(response); return;}
  128 |         held.add(fault.released);
  129 |         void fault.released.promise.then(() => {
  130 |           held.delete(fault.released);
  131 |           if (!response.destroyed) {response.writeHead(result.statusCode ?? 502, result.headers); response.end(Buffer.concat(chunks));}
  132 |         });
  133 |       });
  134 |       result.on('error', () => {if (!response.destroyed) unavailable(response); fault.entered.resolve();});
  135 |     });
  136 |     inner.on('error', () => {if (!response.destroyed) unavailable(response); fault?.entered.resolve();});
  137 |     inner.setTimeout(10000, () => {inner.destroy(); if (!response.destroyed) unavailable(response);});
  138 |     request.on('aborted', () => {inner.destroy();});
  139 |     request.pipe(inner);
  140 |     };
  141 |     if (fault?.fault === 'hold-before') {
  142 |       if (method !== 'GET') {unavailable(response); fault.entered.resolve(); return;}
  143 |       held.add(fault.released); fault.entered.resolve();
  144 |       void fault.released.promise.then(() => {held.delete(fault.released); if (!response.destroyed) forward();});
  145 |     } else forward();
  146 |   });
  147 |   let baseURL = '';
  148 |   async function dispose() {
  149 |     for (const f of pending) {f.entered.resolve(); f.released.resolve();}
  150 |     for (const d of held) d.resolve();
  151 |     proxy.closeAllConnections();
  152 |     await new Promise<void>((resolve, reject) => {proxy.close(error => {if (error && (!('code' in error) || error.code !== 'ERR_SERVER_NOT_RUNNING')) reject(error); else resolve();});});
  153 |     if (app) {
  154 |       let timer: ReturnType<typeof setTimeout> | undefined;
  155 |       try {await Promise.race([app.close(), new Promise<never>((_, reject) => {timer = setTimeout(() => reject(new Error('Private app cleanup deadline.')), 15000);})]);}
  156 |       finally {if (timer) clearTimeout(timer);}
  157 |     }
  158 |     db.close();
  159 |     await rm(owned, {recursive: true, force: true});
  160 |     try {await stat(owned); throw new Error('Private fixture cleanup incomplete.');} catch (error) {if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;}
  161 |     const evidence = evidenceRoot;
  162 |     await mkdir(evidence, {recursive: true});
  163 |     await appendFile(path.join(evidence, 'browser-fixture-cleanup.jsonl'), JSON.stringify({owned_temp: owned, proxy_closed: true, app_closed: true, db_closed: true, temp_absent: true}) + '\n');
  164 |   }
  165 |   try {
  166 |     baseURL = await listen(proxy);
  167 |     const artifactBlobs = await ArtifactFileStore.create(owned);
  168 |     app = buildApp({artifactBlobs, storage: new SqliteStorage(db), clock, webOrigin: baseURL, allowInsecureLoopback: true, webAssetsDir});
  169 |     let key = 0;
  170 |     async function seed(method: 'POST' | 'PATCH' | 'DELETE', route: string, payload?: Json): Promise<Json> {
  171 |       clock.refill();
  172 |       if (upstream) {
  173 |         const result = await fetch(baseURL + '/api/v1' + route, {method, headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`, ...(payload === undefined ? {} : {'content-type': 'application/json'})}, ...(payload === undefined ? {} : {body: JSON.stringify(payload)}), signal: AbortSignal.timeout(5000)});
> 174 |         if (result.status >= 300) throw new Error(`Private fixture seed rejected (${result.status}).`);
      |                                         ^ Error: Private fixture seed rejected (422).
  175 |         return json(json(await result.json()).data);
  176 |       }
  177 |       const response = await app!.inject({method, url: '/api/v1' + route, headers: {host: new URL(baseURL).host, authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`}, ...(payload === undefined ? {} : {payload})});
  178 |       if (response.statusCode >= 300) throw new Error(`Private fixture seed rejected (${response.statusCode}).`);
  179 |       return json(json(response.json()).data);
  180 |     }
  181 |     const space = {id: string(json((await seed('POST', '/spaces', {slug: 'browser-space', objective: 'Private browser research', rules: []})).space).id), slug: 'browser-space'};
  182 |     const hidden = {id: string(json((await seed('POST', '/spaces', {slug: 'private-hidden-space', objective: 'Private hidden research', rules: []})).space).id), slug: 'private-hidden-space'};
  183 |     const alternate = {id: string(json((await seed('POST', '/spaces', {slug: 'alternate-space', objective: 'Second private browser space', rules: []})).space).id), slug: 'alternate-space'};
  184 |     const thread = {id: string(json((await seed('POST', `/spaces/${space.id}/threads`, {title: 'Browser discussion'})).thread).id), title: 'Browser discussion'};
  185 |     const identities = {} as Record<IdentityName, Identity>;
  186 |     for (const role of ['contributor', 'observer'] as const) {
  187 |       const actor = string((await seed('POST', '/admin/actors', {kind: 'human', display_name: 'Browser ' + role})).id);
  188 |       await seed('POST', `/spaces/${space.id}/memberships`, {actor_id: actor, role});
  189 |       if (role === 'contributor') await seed('POST', `/spaces/${alternate.id}/memberships`, {actor_id: actor, role});
  190 |       const credential = await seed('POST', '/admin/credentials', {actor_id: actor, allowed_space_ids: role === 'contributor' ? [space.id, alternate.id] : [space.id], capabilities: ['read', 'write']});
  191 |       identities[role] = {actor, credential: string(credential.credential_id), token: string(credential.token)};
  192 |     }
  193 |     function postPayload(input: SeedPost): Json {
  194 |       return {kind: input.kind ?? 'note', title: input.title, summary: input.summary ?? 'Private browser fixture', body: input.body, ...(input.tags ? {tags: input.tags} : {}), ...(input.refs ? {refs: input.refs} : {}), ...(input.structured ? {structured: input.structured} : {})};
  195 |     }
  196 |     function postResult(response: Json, title: string): Post {
  197 |       return {id: string(json(response.post).id), title, revision: Number(json(response.revision).revision)};
  198 |     }
  199 |     async function seedPost(input: SeedPost): Promise<Post> {
  200 |       return postResult(await seed('POST', `/spaces/${space.id}/threads/${input.threadId ?? thread.id}/posts`, postPayload(input)), input.title);
  201 |     }
  202 |     async function seedNote(input: {title: string; body: string; structured?: Json}): Promise<Post> {return seedPost(input);}
  203 |     function historicalStructured(value: Post, structured: Json) {
  204 |       if (browserAccessed) throw new Error('Historical fixture must precede browser access.');
  205 |       const row = json(db.prepare('SELECT title,summary,body FROM post_revisions WHERE post_id=? AND revision=1').get(value.id));
  206 |       const hasher = new CryptoHasher();
  207 |       const contentHash = hasher.sha256(`${string(row.title)}\n${string(row.summary)}\n${string(row.body)}\n${hasher.canonicalJson(structured)}`);
  208 |       db.prepare('UPDATE post_revisions SET structured=?,content_hash=? WHERE post_id=? AND revision=1').run(JSON.stringify(structured), contentHash, value.id);
  209 |     }
  210 |     async function patchSpace(input: {spaceId?: string; objective?: string; rules?: string[]; pinnedRefs?: Array<{post_id:string;revision:number}>}): Promise<number> {
  211 |       const id=input.spaceId ?? space.id;
  212 |       if (![space.id,alternate.id].includes(id)) throw new Error('Private space patch scope invalid.');
  213 |       const row=json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(id));
  214 |       await seed('PATCH',`/spaces/${id}`,{expected_revision:Number(row.current_revision),...(input.objective===undefined?{}:{objective:input.objective}),...(input.rules===undefined?{}:{rules:input.rules}),...(input.pinnedRefs===undefined?{}:{pinned_refs:input.pinnedRefs})});
  215 |       return Number(json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(id)).current_revision);
  216 |     }
  217 |     const post = await seedNote({title: 'Fixture source', body: 'Original fixed research body.'});
  218 |     await app.listen({host: '127.0.0.1', port: 0});
  219 |     const address = app.server.address();
  220 |     if (!address || typeof address === 'string') throw new Error('Private upstream listener unavailable.');
  221 |     upstream = `http://127.0.0.1:${address.port}`;
  222 |     const forum: ForumFixture = {
  223 |       baseURL, space, hidden, alternate, thread, post,
  224 |       evidencePath(relative) {if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Private evidence path invalid.'); return path.join(evidenceRoot, relative);},
  225 |       actorIds: {contributor: identities.contributor.actor, observer: identities.observer.actor},
  226 |       async login(page, identity = 'contributor') {
  227 |         // Suppress action errors that would otherwise repeat the private token in call logs.
  228 |         try {await page.getByLabel('访问令牌', {exact: true}).fill(identities[identity].token); await page.getByRole('button', {name: '登录', exact: true}).click();}
  229 |         catch {throw new Error('Private browser login action failed.');}
  230 |         await expect(page.getByRole('button', {name: '退出登录', exact: true})).toBeVisible();
  231 |       },
  232 |       async revokeCredential(identity) {await seed('POST', `/admin/credentials/${identities[identity].credential}/revoke`);},
  233 |       async withdrawMembership(identity) {await seed('DELETE', `/spaces/${space.id}/memberships/${identities[identity].actor}`);},
  234 |       seedNote, seedPost, patchSpace,
  235 |       setHistoricalPostTimes(entries) {
  236 |         if (browserAccessed) throw new Error('Historical timestamps must precede browser access.');
  237 |         const update=db.prepare('UPDATE posts SET created_at=? WHERE id=? AND space_id=?');
  238 |         db.transaction(()=>{for(const entry of entries) {if(update.run(entry.createdAt,entry.id,space.id).changes!==1) throw new Error('Private historical post scope invalid.');}})();
  239 |       },
  240 |       async seedHistoricalLargeRules(spaceId) {
  241 |         if (browserAccessed) throw new Error('Historical space fixture must precede browser access.');
  242 |         const revision=await patchSpace({spaceId,objective:'Synthetic historical oversized rules',rules:['Legal initial rule']});
  243 |         const rules=Array.from({length:1200},(_,index)=>`${index} ${'研究🧪'.repeat(100)}`);
  244 |         db.prepare('UPDATE space_revisions SET rules=? WHERE space_id=? AND revision=?').run(JSON.stringify(rules),spaceId,revision);
  245 |         return revision;
  246 |       },
  247 |       async seedThread(input) {
  248 |         const result = await seed('POST', `/spaces/${space.id}/threads`, {title: input.title, ...(input.initialPost ? {initial_post: postPayload(input.initialPost)} : {})});
  249 |         return {id: string(json(result.thread).id), title: input.title, ...(result.initial_post && input.initialPost ? {initialPost: postResult(json(result.initial_post), input.initialPost.title)} : {})};
  250 |       },
  251 |       async seedHistoricalFailure(title) {
  252 |         // First accepted through ordinary strict HTTP. Then one owned historical
  253 |         // record is widened before browser access; this is not a legal new failure write.
  254 |         const value = await seedPost({kind: 'failure', title, body: 'Historical partial research record.', structured: {attempt: 'Historical attempt', category: 'test_failure', assumptions: [], tested_scope: 'Private fixture', expected: 'Complete record', observed: 'Partial historical record', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'Historical evidence unavailable', ruled_out: 'No general exclusion', not_ruled_out: ['Other variants'], retry_when: ['Obtain evidence']}});
  255 |         historicalStructured(value, {attempt: 'Historical attempt', category: null, tested_scope: null, evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'Historical evidence unavailable'});
  256 |         return value;
  257 |       },
  258 |       threadsByTitle(title) {return db.prepare('SELECT id,creator_id,space_id FROM threads WHERE title=? ORDER BY id').all(title) as ReturnType<ForumFixture['threadsByTitle']>;},
  259 |       async seedSyntheticLargeNote(title) {
  260 |         if (httpEvents.length) throw new Error('Synthetic historical fixture must precede browser access.');
  261 |         // The ordinary note is first accepted through actual HTTP. This one owned
  262 |         // historical test record is then widened before any browser sees it.
  263 |         // Do not claim that the oversized structured material was a legal HTTP new write.
  264 |         const value = await seedNote({title, body: 'Synthetic historical structured material.'});
  265 |         historicalStructured(value, {historical_material: '研究🧪'.repeat(120000)});
  266 |         return value;
  267 |       },
  268 |       async revisePost(original, input) {
  269 |         const result = await seed('POST', `/spaces/${space.id}/posts/${original.id}/revisions`, {expected_revision: original.revision, title: input.title ?? original.title, summary: input.summary ?? 'Private browser fixture revision', body: input.body, ...(input.tags ? {tags: input.tags} : {}), ...(input.structured ? {structured: input.structured} : {})});
  270 |         return {id: original.id, title: input.title ?? original.title, revision: Number(json(result.revision).revision)};
  271 |       },
  272 |       postsByTitle(title) {return db.prepare('SELECT p.id,p.author_id,p.current_revision,p.space_id,p.thread_id FROM posts p JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE r.title=? ORDER BY p.id').all(title) as ReturnType<ForumFixture['postsByTitle']>;},
  273 |       relationsFrom(postId) {return db.prepare('SELECT source_post_id,source_revision,target_post_id,target_revision,type FROM relations WHERE source_post_id=?').all(postId) as ReturnType<ForumFixture['relationsFrom']>;},
  274 |       artifacts() {return db.prepare('SELECT id,owner_id,space_id,sha256,bytes,state FROM artifacts ORDER BY id').all() as ReturnType<ForumFixture['artifacts']>;},
```