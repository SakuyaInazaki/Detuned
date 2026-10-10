# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-tls.spec.ts >> TLS201 direct native HTTPS human cookie/Host Origin CSRF/static/write/logout remains scoped
- Location: scripts/integrations/web/m5-tls.spec.ts:4:1

# Error details

```
Error: Private TLS request failed.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]: Detuned协作研究论坛
    - generic [ref=e6]:
      - generic [ref=e7]: Browser contributor
      - button "退出登录" [ref=e8] [cursor=pointer]
  - main [ref=e9]:
    - generic [ref=e10]:
      - paragraph [ref=e11]: 讨论 · 固定版本 · 可追溯引用
      - heading "让研究在讨论中继续" [level=1] [ref=e12]
      - paragraph [ref=e13]: 阅读当前可见的空间与主题，用笔记回应一个明确版本。正式评审尚未启用。
    - status [ref=e14]:
      - generic [ref=e15]: 登录成功。
    - generic [ref=e16]:
      - complementary [ref=e17]:
        - generic [ref=e18]:
          - heading "空间" [level=2] [ref=e19]
          - generic [ref=e20]: 每页 20 项
        - list [ref=e21]:
          - listitem [ref=e22]:
            - button "alternate-space 进入空间 →" [ref=e23] [cursor=pointer]:
              - text: alternate-space
              - generic [ref=e24]: 进入空间 →
          - listitem [ref=e25]:
            - button "browser-space 进入空间 →" [ref=e26] [cursor=pointer]:
              - text: browser-space
              - generic [ref=e27]: 进入空间 →
        - button "空间首页" [ref=e29] [cursor=pointer]
      - region "讨论内容" [ref=e30]:
        - navigation "当前位置" [ref=e31]:
          - generic [ref=e32]: 空间
        - generic [ref=e33]:
          - heading "选择一个空间" [level=2] [ref=e34]
          - paragraph [ref=e35]: 这里仅显示当前身份可见的研究。论坛文本不会作为程序执行。
  - contentinfo [ref=e36]: 独立协作论坛 · 正式评审尚未启用
```

# Test source

```ts
  259 |       },
  260 |       setHistoricalPostTimes(entries) {
  261 |         if (browserAccessed) throw new Error('Historical timestamps must precede browser access.');
  262 |         const update=db.prepare('UPDATE posts SET created_at=? WHERE id=? AND space_id=?');
  263 |         db.transaction(()=>{for(const entry of entries) {if(update.run(entry.createdAt,entry.id,space.id).changes!==1) throw new Error('Private historical post scope invalid.');}})();
  264 |       },
  265 |       async seedHistoricalLargeRules(spaceId) {
  266 |         if (browserAccessed) throw new Error('Historical space fixture must precede browser access.');
  267 |         const revision=await patchSpace({spaceId,objective:'Synthetic historical oversized rules',rules:['Legal initial rule']});
  268 |         const rules=Array.from({length:1200},(_,index)=>`${index} ${'研究🧪'.repeat(100)}`);
  269 |         db.prepare('UPDATE space_revisions SET rules=? WHERE space_id=? AND revision=?').run(JSON.stringify(rules),spaceId,revision);
  270 |         return revision;
  271 |       },
  272 |       async seedThread(input) {
  273 |         const result = await seed('POST', `/spaces/${space.id}/threads`, {title: input.title, ...(input.initialPost ? {initial_post: postPayload(input.initialPost)} : {})});
  274 |         return {id: string(json(result.thread).id), title: input.title, ...(result.initial_post && input.initialPost ? {initialPost: postResult(json(result.initial_post), input.initialPost.title)} : {})};
  275 |       },
  276 |       async seedHistoricalFailure(title) {
  277 |         // First accepted through ordinary strict HTTP. Then one owned historical
  278 |         // record is widened before browser access; this is not a legal new failure write.
  279 |         const value = await seedPost({kind: 'failure', title, body: 'Historical partial research record.', structured: {attempt: 'Historical attempt', category: 'test_failure', assumptions: [], tested_scope: 'Private fixture', expected: 'Complete record', observed: 'Partial historical record', evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'Historical evidence unavailable', ruled_out: 'No general exclusion', not_ruled_out: ['Other variants'], retry_when: ['Obtain evidence']}});
  280 |         historicalStructured(value, {attempt: 'Historical attempt', category: null, tested_scope: null, evidence_refs: [], evidence_state: 'unverified', evidence_missing_reason: 'Historical evidence unavailable'});
  281 |         return value;
  282 |       },
  283 |       threadsByTitle(title) {return db.prepare('SELECT id,creator_id,space_id FROM threads WHERE title=? ORDER BY id').all(title) as ReturnType<ForumFixture['threadsByTitle']>;},
  284 |       async seedSyntheticLargeNote(title) {
  285 |         if (httpEvents.length) throw new Error('Synthetic historical fixture must precede browser access.');
  286 |         // The ordinary note is first accepted through actual HTTP. This one owned
  287 |         // historical test record is then widened before any browser sees it.
  288 |         // Do not claim that the oversized structured material was a legal HTTP new write.
  289 |         const value = await seedNote({title, body: 'Synthetic historical structured material.'});
  290 |         historicalStructured(value, {historical_material: '研究🧪'.repeat(120000)});
  291 |         return value;
  292 |       },
  293 |       async revisePost(original, input) {
  294 |         const result = await seed('POST', `/spaces/${space.id}/posts/${original.id}/revisions`, {expected_revision: original.revision, title: input.title ?? original.title, summary: input.summary ?? 'Private browser fixture revision', body: input.body, ...(input.tags ? {tags: input.tags} : {}), ...(input.structured ? {structured: input.structured} : {})});
  295 |         return {id: original.id, title: input.title ?? original.title, revision: Number(json(result.revision).revision)};
  296 |       },
  297 |       postsByTitle(title) {return db.prepare('SELECT p.id,p.author_id,p.current_revision,p.space_id,p.thread_id FROM posts p JOIN post_revisions r ON r.post_id=p.id AND r.revision=p.current_revision WHERE r.title=? ORDER BY p.id').all(title) as ReturnType<ForumFixture['postsByTitle']>;},
  298 |       relationsFrom(postId) {return db.prepare('SELECT source_post_id,source_revision,target_post_id,target_revision,type FROM relations WHERE source_post_id=?').all(postId) as ReturnType<ForumFixture['relationsFrom']>;},
  299 |       artifacts() {return db.prepare('SELECT id,owner_id,space_id,sha256,bytes,state FROM artifacts ORDER BY id').all() as ReturnType<ForumFixture['artifacts']>;},
  300 |       artifactsFor(postId, revision) {return db.prepare('SELECT artifact_id,purpose FROM revision_artifacts WHERE post_id=? AND revision=? ORDER BY artifact_id').all(postId, revision) as ReturnType<ForumFixture['artifactsFor']>;},
  301 |       async seedArtifact(input) {
  302 |         if (browserAccessed) throw new Error('Historical artifact fixture must precede browser access.');
  303 |         clock.refill();
  304 |         const form = new FormData();
  305 |         form.append('metadata', JSON.stringify({visibility: 'space'}));
  306 |         form.append('file', new Blob([new Uint8Array(input.bytes)], {type: input.mime ?? 'application/octet-stream'}), 'private-fixture.bin');
  307 |         const result = await fetch(baseURL + `/api/v1/spaces/${space.id}/artifacts`, {method: 'POST', headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`}, body: form, signal: AbortSignal.timeout(5000)});
  308 |         if (!result.ok) throw new Error(`Private artifact seed rejected (${result.status}).`);
  309 |         const id = string(json(json(await result.json()).data).id);
  310 |         // Legal HTTP upload precedes explicitly synthetic historical association/status.
  311 |         if (input.post) db.prepare('INSERT INTO revision_artifacts(post_id,revision,artifact_id,purpose) VALUES(?,?,?,?)').run(input.post.id, input.post.revision, id, 'private-fixture');
  312 |         if (input.state) db.prepare('UPDATE artifacts SET state=? WHERE id=?').run(input.state,id);
  313 |         if (input.visibility) db.prepare('UPDATE artifacts SET visibility=? WHERE id=?').run(input.visibility,id);
  314 |         if (input.crossSpace) db.prepare('UPDATE artifacts SET space_id=? WHERE id=?').run(hidden.id,id);
  315 |         return id;
  316 |       },
  317 |       businessCounts() {return Object.fromEntries(['threads', 'posts', 'post_revisions', 'relations', 'sessions', 'events', 'idempotency_records', 'artifacts', 'revision_artifacts'].map(table => [table, Number(json(db.prepare(`SELECT count(*) n FROM ${table}`).get()).n)]));},
  318 |       httpEvents,
  319 |       faultNext(match, fault) {if (tlsMaterial) throw new Error('Direct TLS fixture has no fault proxy.'); const entered = deferred(), released = deferred(); pending.push({...match, fault, entered, released}); return {entered: entered.promise, release: released.resolve};},
  320 |     };
  321 |     return {forum, dispose};
  322 |   } catch {await dispose(); throw new Error('Private browser fixture setup failed.');}
  323 | }
  324 | 
  325 | export const test = base.extend<{forum: ForumFixture}>({
  326 |   forum: async ({}, use) => {
  327 |     const fixture = await createFixture();
  328 |     try {await use(fixture.forum);} finally {await fixture.dispose();}
  329 |   },
  330 | });
  331 | export {expect};
  332 | 
  333 | 
  334 | /** Private certificates exist only while the actual TLS worker runs; no repository PEM or global trust. */
  335 | export type TlsMaterial = {owned: string; ca: Buffer; cert: Buffer; key: Buffer; spki: string};
  336 | async function createTlsMaterial(): Promise<TlsMaterial> {
  337 |   const owned = await mkdtemp('/private/tmp/detuned-browser-tls-');
  338 |   const run = promisify(execFile);
  339 |   const openssl = '/opt/homebrew/bin/openssl';
  340 |   try {
  341 |     await run(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=Detuned Private Test CA','-keyout',path.join(owned,'ca.key'),'-out',path.join(owned,'ca.crt')], {env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
  342 |     await run(openssl, ['req','-newkey','rsa:2048','-nodes','-sha256','-subj','/CN=localhost','-keyout',path.join(owned,'leaf.key'),'-out',path.join(owned,'leaf.csr')], {env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
  343 |     await writeFile(path.join(owned,'extensions.txt'),'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n',{mode:0o600});
  344 |     await run(openssl, ['x509','-req','-sha256','-days','2','-in',path.join(owned,'leaf.csr'),'-CA',path.join(owned,'ca.crt'),'-CAkey',path.join(owned,'ca.key'),'-CAcreateserial','-extfile',path.join(owned,'extensions.txt'),'-out',path.join(owned,'leaf.crt')], {env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
  345 |     await chmod(path.join(owned,'ca.key'),0o600); await chmod(path.join(owned,'leaf.key'),0o600);
  346 |     const ca=await readFile(path.join(owned,'ca.crt')),cert=await readFile(path.join(owned,'leaf.crt')),key=await readFile(path.join(owned,'leaf.key'));
  347 |     const spki=createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64');
  348 |     return {owned,ca,cert,key,spki};
  349 |   } catch {await rm(owned,{recursive:true,force:true}); throw new Error('Private TLS fixture generation failed.');}
  350 | }
  351 | export async function tlsRequestJson(url: string, ca: Buffer, options: {method?: string; headers?: Record<string,string>; body?: string}={}): Promise<{status: number; data: Json; headers: import('node:http').IncomingHttpHeaders}> {
  352 |   return new Promise((resolve,reject)=>{
  353 |     const request=httpsRequest(url,{ca,rejectUnauthorized:true,method:options.method??'GET',headers:options.headers},response=>{
  354 |       const chunks:Buffer[]=[];
  355 |       response.on('data',bytes=>chunks.push(Buffer.from(bytes)));
  356 |       response.on('end',()=>{try {resolve({status:response.statusCode??0,data:json(JSON.parse(Buffer.concat(chunks).toString())),headers:response.headers});} catch {reject(new Error('Private TLS response invalid.'));}});
  357 |       response.on('error',()=>reject(new Error('Private TLS response failed.')));
  358 |     });
> 359 |     request.on('error',()=>reject(new Error('Private TLS request failed.')));
      |                                   ^ Error: Private TLS request failed.
  360 |     request.setTimeout(5000,()=>request.destroy());
  361 |     request.end(options.body);
  362 |   });
  363 | }
  364 | export const tlsTest = test.extend<{}, {tlsMaterial: TlsMaterial}>({
  365 |   tlsMaterial: [async ({},use)=>{
  366 |     const material=await createTlsMaterial();
  367 |     try {await use(material);} finally {
  368 |       await rm(material.owned,{recursive:true,force:true});
  369 |       await mkdir(evidenceRoot,{recursive:true});
  370 |       await appendFile(path.join(evidenceRoot,'tls-certificate-cleanup.jsonl'),JSON.stringify({owned_temp:material.owned,temp_absent:await stat(material.owned).then(()=>false,()=>true)})+'\n');
  371 |     }
  372 |   },{scope:'worker'}],
  373 |   browser: async ({playwright,tlsMaterial},use)=>{
  374 |     const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:[`--ignore-certificate-errors-spki-list=${tlsMaterial.spki}`]});
  375 |     try {await use(browser);} finally {await browser.close();}
  376 |   },
  377 |   forum: async ({tlsMaterial},use)=>{
  378 |     const fixture=await createFixture(tlsMaterial);
  379 |     try {await use(fixture.forum);} finally {await fixture.dispose();}
  380 |   },
  381 | });
  382 | 
```