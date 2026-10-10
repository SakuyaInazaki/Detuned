# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m6-review.spec.ts >> CW01 ordinary requester and distinct reviewers explicitly select sessions, bind private evidence, seal/reveal and preserve historical decision
- Location: scripts/integrations/web/m6-review.spec.ts:21:1

# Error details

```
Error: Private fixture seed rejected (403).
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
      - paragraph [ref=e13]: 阅读当前可见的空间与主题，用笔记回应一个明确版本，按空间规则对固定材料发起评审。
    - status [ref=e14]:
      - generic [ref=e15]: 历史决定已加载。
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
            - button "browser-space 进入空间 →" [pressed] [ref=e26] [cursor=pointer]:
              - text: browser-space
              - generic [ref=e27]: 进入空间 →
        - button "空间首页" [ref=e29] [cursor=pointer]
      - region "讨论内容" [ref=e30]:
        - navigation "当前位置" [ref=e31]:
          - generic [ref=e32]: 空间
          - generic [aria-hidden] [ref=e33]: /
          - button "browser-space" [ref=e34] [cursor=pointer]
          - generic [aria-hidden] [ref=e35]: /
          - button "Browser discussion" [ref=e36] [cursor=pointer]
        - navigation "空间页面" [ref=e37]:
          - button "概览" [ref=e38] [cursor=pointer]
          - button "讨论" [ref=e39] [cursor=pointer]
          - button "搜索" [ref=e40] [cursor=pointer]
          - button "失败报告" [ref=e41] [cursor=pointer]
          - button "设置" [ref=e42] [cursor=pointer]
        - region [ref=e43]:
          - generic [ref=e44]:
            - heading "新主题" [level=2] [ref=e45]
            - button "新建主题" [ref=e46] [cursor=pointer]
        - region [ref=e47]:
          - generic [ref=e48]:
            - heading "主题" [level=2] [ref=e49]
            - generic [ref=e50]:
              - text: 主题状态
              - combobox "主题状态" [ref=e51]:
                - option "开放" [selected]
                - option "归档"
          - list [ref=e52]:
            - listitem [ref=e53]:
              - button "Browser discussion 开放 · 查看帖子 →" [pressed] [ref=e54] [cursor=pointer]:
                - text: Browser discussion
                - generic [ref=e55]: 开放 · 查看帖子 →
          - button "主题首页" [ref=e57] [cursor=pointer]
        - region [ref=e58]:
          - generic [ref=e59]:
            - heading "Browser discussion" [level=2] [ref=e60]
            - generic [ref=e61]: 按创建时间 · 历史未知时间置末
          - list [ref=e62]:
            - listitem [ref=e63]:
              - generic [ref=e64]:
                - strong [ref=e65]: note
                - generic [ref=e66]: pst_62924623-31c1-4edb-a386-ecd781b316bb
                - text: active
              - button "查看修订 1" [ref=e67] [cursor=pointer]
            - listitem [ref=e68]:
              - generic [ref=e69]:
                - strong [ref=e70]: claim
                - generic [ref=e71]: pst_10f6cbd1-42a1-4e53-9202-caab50134746
                - text: active
              - button "查看修订 1" [ref=e72] [cursor=pointer]
          - button "帖子首页" [ref=e74] [cursor=pointer]
        - region [ref=e75]:
          - generic [ref=e76]:
            - heading "固定修订 1" [level=2] [ref=e77]
            - generic [ref=e78]: 读取完成
          - paragraph [ref=e79]: 帖子 pst_10f6cbd1-42a1-4e53-9202-caab50134746
          - article [ref=e80]:
            - heading "Browser independent review claim" [level=3] [ref=e81]
            - paragraph [ref=e82]: Owned ordinary research
            - region "正文内容" [ref=e83]:
              - button "正文：显示原文" [ref=e84] [cursor=pointer]: 显示原文
              - paragraph [ref=e86]: A fixed ordinary claim for browser review.
            - generic [ref=e87]:
              - heading "标签" [level=4] [ref=e88]
              - paragraph [ref=e89]: 无标签
              - heading "结构化内容" [level=4] [ref=e90]
              - generic [ref=e91]: "{ \"statement\": \"Independent local claim\", \"assumptions\": [ \"Synthetic fixture\" ], \"scope\": \"Private local browser\", \"falsification_plan\": \"Read and report counterexamples\" }"
          - generic [ref=e92]:
            - button "从首段重开" [ref=e93] [cursor=pointer]
            - button "引用回复" [ref=e94] [cursor=pointer]
          - button "正式评审" [expanded] [ref=e96] [cursor=pointer]
          - region [ref=e97]:
            - heading "正式评审" [level=2] [ref=e98]
            - paragraph [ref=e99]: 当前帖子 pst_10f6cbd1-42a1-4e53-9202-caab50134746，所选固定修订 1。轮次、检查与材料有效性分别展示。
            - paragraph
            - button "加载评审轮次" [ref=e101] [cursor=pointer]
            - list [ref=e102]:
              - listitem [ref=e103]:
                - strong [ref=e104]: 第 1 轮 · 修订 1
                - paragraph [ref=e105]: 2026-11-01T00:20:00.000Z · 已揭示 · 无需检查 · 材料当前有效
                - button "打开第 1 轮" [ref=e106] [cursor=pointer]
            - group [ref=e107]:
              - generic "创建评审请求" [ref=e108] [cursor=pointer]
            - region "选中评审轮次" [ref=e109]:
              - heading "请求 rrq_36cd2f7d-be3c-45c4-a57b-961b568f8872" [level=3] [ref=e110]
              - button "刷新当前评审" [ref=e111] [cursor=pointer]
              - generic [ref=e112]:
                - term [ref=e113]: 轮次阶段
                - definition [ref=e114]: 已接受
                - term [ref=e115]: 检查事实
                - definition [ref=e116]: 无需检查
                - term [ref=e117]: 当前材料有效性
                - definition [ref=e118]: 材料当前有效
              - paragraph [ref=e119]: 有效性原因：无
              - paragraph [ref=e120]: 检查回执执行与展示待 M7；待完成和无需检查都不等于通过。
              - paragraph [ref=e121]: 当前确认版本 4 · 初评进度 2/2 · 固定评审者 act_78e18099-33e2-4d18-860a-e46f45ba5a09、act_edb6219f-b25f-4832-94f0-3152355680a5
              - region "固定评审材料" [ref=e122]:
                - heading "固定材料" [level=3] [ref=e123]
                - paragraph [ref=e124]: 快照 snp_4ffc5e42-a5de-46e6-972b-9c577c115613 · SHA-256 edc626049f5b7e3255710a05a80595b58f843b6bf46ef367cea4990aa0bdfa4a
                - heading "目标主张" [level=4] [ref=e125]
                - paragraph [ref=e126]: Independent local claim
                - paragraph [ref=e127]: 范围：Private local browser
                - paragraph [ref=e128]: 假设：Synthetic fixture
                - paragraph [ref=e129]: 反驳计划：Read and report counterexamples
                - paragraph [ref=e130]: 复现说明：Independent ordinary browser recipe.
                - paragraph [ref=e131]: 规则版本 2 · 政策版本 2
                - generic [ref=e132]: "{ \"allow_open_objections\": false, \"distinct_actors\": true, \"distinct_independence_groups\": true, \"enabled\": true, \"exclude_contributors\": true, \"invalidate_on_revision\": true, \"required_checks\": [], \"required_reviewers\": 2, \"seal_until_all_submitted\": true }"
                - heading "冻结检查配置" [level=4] [ref=e133]
                - generic [ref=e134]: "[]"
                - paragraph [ref=e135]: 材料贡献者：act_ae215cdb-adec-4b2c-805b-10338e10fc24
                - list [ref=e136]:
                  - listitem [ref=e137]:
                    - text: pst_10f6cbd1-42a1-4e53-9202-caab50134746 · 修订 1
                    - button "阅读固定材料 pst_10f6cbd1-42a1-4e53-9202-caab50134746 修订 1" [ref=e138] [cursor=pointer]
                - list
                - heading "代码引用" [level=4] [ref=e139]
                - generic [ref=e140]: "[]"
              - generic [ref=e141]:
                - heading "本人初评" [level=3] [ref=e142]
                - button "加载本人任务" [ref=e143] [cursor=pointer]
              - generic [ref=e144]:
                - heading "服务端可见意见" [level=3] [ref=e145]
                - button "加载可见意见" [ref=e146] [cursor=pointer]
              - generic [ref=e147]:
                - heading "最终决定与取消" [level=3] [ref=e148]
                - button "读取历史最终决定" [ref=e149] [cursor=pointer]
                - paragraph [ref=e150]: 已接受 · 决定 rde_69f4e87b-5d72-42c7-b7a2-8a9d9dbaead3 · 固定请求版本 4
                - paragraph [ref=e151]: All complete reviews accept; no required checks or blocking objections remain.
                - paragraph [ref=e152]: 决定保留历史事实，不替代当前有效性。
                - button "确认版本 4 并最终决定" [ref=e153] [cursor=pointer]
                - generic [ref=e154]:
                  - text: 取消原因
                  - textbox "取消原因" [ref=e155]
                - button "确认版本 4 并取消评审" [disabled] [ref=e156]
          - generic [ref=e157]:
            - region [ref=e158]:
              - heading "修订目录" [level=3] [ref=e159]
              - button "加载修订目录" [ref=e160] [cursor=pointer]
              - list
              - generic [ref=e161]:
                - generic [ref=e162]:
                  - text: 比较版本一
                  - combobox "比较版本一" [ref=e163]:
                    - option "选择修订" [selected]
                - generic [ref=e164]:
                  - text: 比较版本二
                  - combobox "比较版本二" [ref=e165]:
                    - option "选择修订" [selected]
                - button "比较所选版本" [disabled] [ref=e166]
              - region [ref=e167]:
                - heading "五字段比较" [level=4] [ref=e168]
                - paragraph [ref=e169]: 选择同帖的两个明确修订后比较。
            - region [ref=e170]:
              - heading "本修订附件" [level=3] [ref=e171]
              - paragraph [ref=e172]: 仅列此固定修订关联的附件。下载不会自动预览或执行。
              - button "加载附件目录" [ref=e173] [cursor=pointer]
              - list
        - region [ref=e174]:
          - heading "发布笔记" [level=2] [ref=e175]
          - paragraph [ref=e176]: 发布到当前主题，研究内容只按纯文本显示。
          - generic [ref=e177]:
            - generic [ref=e178]: 选择附件文件
            - button "选择附件文件" [ref=e179]
            - paragraph [ref=e180]: 单文件最多 25 MiB；逐个上传后，可在同一笔记中一起关联。
            - button "上传所选附件" [disabled] [ref=e182]
          - generic [ref=e183]:
            - group [ref=e184]:
              - generic [ref=e185]: 帖子标题
              - textbox "帖子标题" [ref=e186]
              - generic [ref=e187]: 摘要
              - textbox "摘要" [ref=e188]
              - generic [ref=e189]: 正文
              - textbox "正文" [ref=e190]
            - button "发布笔记" [ref=e192] [cursor=pointer]
  - contentinfo [ref=e193]: 独立协作论坛 · 固定材料与正式评审
```

# Test source

```ts
  96  |   // Fail before creating a DB when the explicitly built Web bundle is absent.
  97  |   const webAssetsDir = path.join(repository, 'packages/web/dist');
  98  |   if (!(await stat(path.join(webAssetsDir, 'index.html'))).isFile()) throw new Error('Build the private Web test bundle first.');
  99  |   await mkdir(path.join(evidenceRoot, 'screenshots'), {recursive: true});
  100 |   const owned = await mkdtemp('/private/tmp/detuned-web-browser-');
  101 |   let initialized: {db: Database.Database; adminToken: string | null};
  102 |   try {
  103 |     const database = new Database(path.join(owned, 'forum.sqlite'));
  104 |     try {initialized = {db: database, adminToken: bootstrapDatabase(database).adminToken};}
  105 |     catch {database.close(); throw new Error('Private fixture bootstrap unavailable.');}
  106 |   } catch {await rm(owned, {recursive: true, force: true}); throw new Error('Private fixture bootstrap unavailable.');}
  107 |   const {db, adminToken} = initialized;
  108 |   if (!adminToken) {db.close(); await rm(owned, {recursive: true, force: true}); throw new Error('Private fixture bootstrap unavailable.');}
  109 |   const clock = new Clock();
  110 |   const httpEvents: HttpEvent[] = [];
  111 |   const pending: Array<{method: string; path: string; fault: Fault; entered: ReturnType<typeof deferred>; released: ReturnType<typeof deferred>}> = [];
  112 |   const held = new Set<ReturnType<typeof deferred>>();
  113 |   let upstream = '';
  114 |   let browserAccessed = false;
  115 |   let app: ReturnType<typeof buildApp> | undefined;
  116 |   const proxy = createServer((request, response) => {
  117 |     const pathname = new URL(request.url ?? '/', 'http://fixture.invalid').pathname;
  118 |     const method = request.method ?? 'GET';
  119 |     if (typeof request.headers.authorization !== 'string') browserAccessed = true;
  120 |     const index = pending.findIndex(f => f.method === method && f.path === pathname);
  121 |     const fault = index < 0 ? undefined : pending.splice(index, 1)[0];
  122 |     const record: HttpEvent = {method, path: pathname, status: 0};
  123 |     if ((pathname.endsWith('/posts') || pathname.endsWith('/threads') || pathname.endsWith('/artifacts') || /\/review-requests(?:\/[^/]+\/(?:submissions|finalize|cancel))?$/.test(pathname)) && typeof request.headers['idempotency-key'] === 'string') record.requestKey = request.headers['idempotency-key'];
  124 |     if (pathname.endsWith('/review-requests') || pathname.endsWith('/search') || pathname.endsWith('/catalog') || pathname.endsWith('/artifacts') || pathname.endsWith('/context') || /\/threads\/[^/]+\/posts$/.test(pathname) || /\/spaces\/[^/]+\/revisions\/\d+$/.test(pathname)) record.query = Object.fromEntries(new URL(request.url ?? '/', 'http://fixture.invalid').searchParams);
  125 |     httpEvents.push(record);
  126 |     if (!upstream || fault?.fault === 'fail-before') {
  127 |       record.status = 503; request.resume(); unavailable(response); fault?.entered.resolve(); return;
  128 |     }
  129 |     // Browser-supplied Host/Origin/Cookie are forwarded unchanged. No credential injection.
  130 |     const forward = () => {
  131 |     const inner = httpRequest(new URL(request.url ?? '/', upstream), {method, headers: request.headers}, result => {
  132 |       record.status = result.statusCode ?? 0;
  133 |       if (!fault || fault.fault === 'hold-before') {response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response); return;}
  134 |       const chunks: Buffer[] = [];
  135 |       result.on('data', bytes => {chunks.push(Buffer.from(bytes));});
  136 |       result.on('end', () => {
  137 |         fault.entered.resolve();
  138 |         if (fault.fault === 'lose-after-commit') {if (!response.destroyed) unavailable(response); return;}
  139 |         held.add(fault.released);
  140 |         void fault.released.promise.then(() => {
  141 |           held.delete(fault.released);
  142 |           if (!response.destroyed) {response.writeHead(result.statusCode ?? 502, result.headers); response.end(Buffer.concat(chunks));}
  143 |         });
  144 |       });
  145 |       result.on('error', () => {if (!response.destroyed) unavailable(response); fault.entered.resolve();});
  146 |     });
  147 |     inner.on('error', () => {if (!response.destroyed) unavailable(response); fault?.entered.resolve();});
  148 |     inner.setTimeout(10000, () => {inner.destroy(); if (!response.destroyed) unavailable(response);});
  149 |     request.on('aborted', () => {inner.destroy();});
  150 |     request.pipe(inner);
  151 |     };
  152 |     if (fault?.fault === 'hold-before') {
  153 |       if (method !== 'GET') {unavailable(response); fault.entered.resolve(); return;}
  154 |       held.add(fault.released); fault.entered.resolve();
  155 |       void fault.released.promise.then(() => {held.delete(fault.released); if (!response.destroyed) forward();});
  156 |     } else forward();
  157 |   });
  158 |   let baseURL = '';
  159 |   async function dispose() {
  160 |     for (const f of pending) {f.entered.resolve(); f.released.resolve();}
  161 |     for (const d of held) d.resolve();
  162 |     proxy.closeAllConnections();
  163 |     await new Promise<void>((resolve, reject) => {proxy.close(error => {if (error && (!('code' in error) || error.code !== 'ERR_SERVER_NOT_RUNNING')) reject(error); else resolve();});});
  164 |     if (app) {
  165 |       let timer: ReturnType<typeof setTimeout> | undefined;
  166 |       try {await Promise.race([app.close(), new Promise<never>((_, reject) => {timer = setTimeout(() => reject(new Error('Private app cleanup deadline.')), 15000);})]);}
  167 |       finally {if (timer) clearTimeout(timer);}
  168 |     }
  169 |     db.close();
  170 |     await rm(owned, {recursive: true, force: true});
  171 |     try {await stat(owned); throw new Error('Private fixture cleanup incomplete.');} catch (error) {if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;}
  172 |     const evidence = evidenceRoot;
  173 |     await mkdir(evidence, {recursive: true});
  174 |     await appendFile(path.join(evidence, 'browser-fixture-cleanup.jsonl'), JSON.stringify({owned_temp: owned, proxy_closed: true, app_closed: true, db_closed: true, temp_absent: true}) + '\n');
  175 |   }
  176 |   try {
  177 |     baseURL = await listen(proxy);
  178 |     if (tlsMaterial) {baseURL = baseURL.replace('http:', 'https:'); await new Promise<void>((resolve, reject) => proxy.close(error => error ? reject(error) : resolve()));}
  179 |     const artifactBlobs = await ArtifactFileStore.create(owned);
  180 |     app = buildApp({artifactBlobs, storage: new SqliteStorage(db), clock, webOrigin: baseURL, allowInsecureLoopback: !tlsMaterial, webAssetsDir, ...(tlsMaterial ? {tls: {cert: tlsMaterial.cert, key: tlsMaterial.key}} : {})});
  181 |     if (tlsMaterial) app.addHook('onResponse', async (request, response) => {
  182 |       const url = new URL(request.url, baseURL);
  183 |       if (typeof request.headers.authorization !== 'string') browserAccessed = true;
  184 |       httpEvents.push({method: request.method, path: url.pathname, status: response.statusCode});
  185 |     });
  186 |     let key = 0;
  187 |     async function seed(method: 'POST' | 'PATCH' | 'DELETE', route: string, payload?: Json): Promise<Json> {
  188 |       clock.refill();
  189 |       if (upstream && tlsMaterial) {
  190 |         const response = await tlsRequestJson(baseURL + '/api/v1' + route, tlsMaterial.ca, {method, headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`, ...(payload === undefined ? {} : {'content-type': 'application/json'})}, ...(payload === undefined ? {} : {body: JSON.stringify(payload)})});
  191 |         if (response.status >= 300) throw new Error(`Private TLS seed rejected (${response.status}).`);
  192 |         return json(response.data.data);
  193 |       }
  194 |       if (upstream) {
  195 |         const result = await fetch(baseURL + '/api/v1' + route, {method, headers: {authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`, ...(payload === undefined ? {} : {'content-type': 'application/json'})}, ...(payload === undefined ? {} : {body: JSON.stringify(payload)}), signal: AbortSignal.timeout(5000)});
> 196 |         if (result.status >= 300) throw new Error(`Private fixture seed rejected (${result.status}).`);
      |                                         ^ Error: Private fixture seed rejected (403).
  197 |         return json(json(await result.json()).data);
  198 |       }
  199 |       const response = await app!.inject({method, url: '/api/v1' + route, headers: {host: new URL(baseURL).host, authorization: `Bearer ${adminToken}`, 'idempotency-key': `browser-private-seed-${++key}`}, ...(payload === undefined ? {} : {payload})});
  200 |       if (response.statusCode >= 300) throw new Error(`Private fixture seed rejected (${response.statusCode}).`);
  201 |       return json(json(response.json()).data);
  202 |     }
  203 |     const space = {id: string(json((await seed('POST', '/spaces', {slug: 'browser-space', objective: 'Private browser research', rules: []})).space).id), slug: 'browser-space'};
  204 |     const hidden = {id: string(json((await seed('POST', '/spaces', {slug: 'private-hidden-space', objective: 'Private hidden research', rules: []})).space).id), slug: 'private-hidden-space'};
  205 |     const alternate = {id: string(json((await seed('POST', '/spaces', {slug: 'alternate-space', objective: 'Second private browser space', rules: []})).space).id), slug: 'alternate-space'};
  206 |     const thread = {id: string(json((await seed('POST', `/spaces/${space.id}/threads`, {title: 'Browser discussion'})).thread).id), title: 'Browser discussion'};
  207 |     const identities = {} as Record<IdentityName, Identity>;
  208 |     for (const role of ['contributor', 'observer'] as const) {
  209 |       const actor = string((await seed('POST', '/admin/actors', {kind: 'human', display_name: 'Browser ' + role})).id);
  210 |       await seed('POST', `/spaces/${space.id}/memberships`, {actor_id: actor, role});
  211 |       if (role === 'contributor') await seed('POST', `/spaces/${alternate.id}/memberships`, {actor_id: actor, role});
  212 |       const credential = await seed('POST', '/admin/credentials', {actor_id: actor, allowed_space_ids: role === 'contributor' ? [space.id, alternate.id] : [space.id], capabilities: ['read', 'write']});
  213 |       identities[role] = {actor, credential: string(credential.credential_id), token: string(credential.token)};
  214 |     }
  215 |     const reviewIdentities = new Map<ReviewIdentityName,Identity>();
  216 |     async function loginIdentity(page: Page, identity: Identity) {
  217 |       try {await page.getByLabel('访问令牌', {exact:true}).fill(identity.token); await page.getByRole('button',{name:'登录',exact:true}).click();}
  218 |       catch {throw new Error('Private browser login action failed.');}
  219 |       await expect(page.getByRole('button',{name:'退出登录',exact:true})).toBeVisible();
  220 |     }
  221 |     async function ordinaryPost(identity: Identity, route: string, payload: Json): Promise<Json> {
  222 |       clock.refill();
  223 |       const result=await fetch(baseURL+'/api/v1'+route,{method:'POST',headers:{authorization:`Bearer ${identity.token}`,'content-type':'application/json','idempotency-key':`browser-private-ordinary-${++key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  224 |       if(!result.ok)throw new Error(`Private ordinary seed rejected (${result.status}).`);
  225 |       return json(json(await result.json()).data);
  226 |     }
  227 |     function postPayload(input: SeedPost): Json {
  228 |       return {kind: input.kind ?? 'note', title: input.title, summary: input.summary ?? 'Private browser fixture', body: input.body, ...(input.tags ? {tags: input.tags} : {}), ...(input.refs ? {refs: input.refs} : {}), ...(input.structured ? {structured: input.structured} : {})};
  229 |     }
  230 |     function postResult(response: Json, title: string): Post {
  231 |       return {id: string(json(response.post).id), title, revision: Number(json(response.revision).revision)};
  232 |     }
  233 |     async function seedPost(input: SeedPost): Promise<Post> {
  234 |       return postResult(await seed('POST', `/spaces/${space.id}/threads/${input.threadId ?? thread.id}/posts`, postPayload(input)), input.title);
  235 |     }
  236 |     async function seedNote(input: {title: string; body: string; structured?: Json}): Promise<Post> {return seedPost(input);}
  237 |     function historicalStructured(value: Post, structured: Json) {
  238 |       if (browserAccessed) throw new Error('Historical fixture must precede browser access.');
  239 |       const row = json(db.prepare('SELECT title,summary,body FROM post_revisions WHERE post_id=? AND revision=1').get(value.id));
  240 |       const hasher = new CryptoHasher();
  241 |       const contentHash = hasher.sha256(`${string(row.title)}\n${string(row.summary)}\n${string(row.body)}\n${hasher.canonicalJson(structured)}`);
  242 |       db.prepare('UPDATE post_revisions SET structured=?,content_hash=? WHERE post_id=? AND revision=1').run(JSON.stringify(structured), contentHash, value.id);
  243 |     }
  244 |     async function patchSpace(input: {spaceId?: string; objective?: string; rules?: string[]; pinnedRefs?: Array<{post_id:string;revision:number}>}): Promise<number> {
  245 |       const id=input.spaceId ?? space.id;
  246 |       if (![space.id,alternate.id].includes(id)) throw new Error('Private space patch scope invalid.');
  247 |       const row=json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(id));
  248 |       await seed('PATCH',`/spaces/${id}`,{expected_revision:Number(row.current_revision),...(input.objective===undefined?{}:{objective:input.objective}),...(input.rules===undefined?{}:{rules:input.rules}),...(input.pinnedRefs===undefined?{}:{pinned_refs:input.pinnedRefs})});
  249 |       return Number(json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(id)).current_revision);
  250 |     }
  251 |     const post = await seedNote({title: 'Fixture source', body: 'Original fixed research body.'});
  252 |     await app.listen({host: '127.0.0.1', port: tlsMaterial ? Number(new URL(baseURL).port) : 0});
  253 |     const address = app.server.address();
  254 |     if (!address || typeof address === 'string') throw new Error('Private upstream listener unavailable.');
  255 |     upstream = `${tlsMaterial ? 'https' : 'http'}://127.0.0.1:${address.port}`;
  256 |     const forum: ForumFixture = {
  257 |       baseURL, space, hidden, alternate, thread, post,
  258 |       evidencePath(relative) {if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Private evidence path invalid.'); return path.join(evidenceRoot, relative);},
  259 |       actorIds: {contributor: identities.contributor.actor, observer: identities.observer.actor},
  260 |       async setupReview(options={}) {
  261 |         if(reviewIdentities.size)throw new Error('Review fixture already configured.');
  262 |         reviewIdentities.set('requester',identities.contributor);
  263 |         const reviewerIds: [string,string]=['',''];
  264 |         for(const [index,name] of (['one','two'] as const).entries()) {
  265 |           const actor=string((await seed('POST','/admin/actors',{kind:'human',display_name:'Independent browser reviewer '+name})).id);
  266 |           await seed('POST',`/spaces/${space.id}/memberships`,{actor_id:actor,role:'observer',reviewer_eligible:true,independence_group:'browser-review-'+name});
  267 |           const credential=await seed('POST','/admin/credentials',{actor_id:actor,allowed_space_ids:[space.id],capabilities:['read','write']});
  268 |           reviewIdentities.set(name,{actor,credential:string(credential.credential_id),token:string(credential.token)});reviewerIds[index]=actor;
  269 |         }
  270 |         const current=Number(json(db.prepare('SELECT current_revision FROM spaces WHERE id=?').get(space.id)).current_revision);
  271 |         await seed('PATCH',`/spaces/${space.id}`,{expected_revision:current,review_policy:{enabled:true,required_reviewers:2,exclude_contributors:true,distinct_actors:true,distinct_independence_groups:true,seal_until_all_submitted:true,invalidate_on_revision:true,required_checks:options.requiredChecks?['local']:[],allow_open_objections:false},check_profiles:options.requiredChecks?{local:{verifier_actor_ids:[identities.observer.actor],config_sha256:'a'.repeat(64),description:'No synthetic passing receipt'}}:{}});
  272 |         const value=await ordinaryPost(identities.contributor,`/spaces/${space.id}/threads/${thread.id}/posts`,{kind:'claim',title:'Browser independent review claim',summary:'Owned ordinary research',body:'A fixed ordinary claim for browser review.',structured:{statement:'Independent local claim',assumptions:['Synthetic fixture'],scope:'Private local browser',falsification_plan:'Read and report counterexamples'}});
  273 |         return {target:postResult(value,'Browser independent review claim'),requesterId:identities.contributor.actor,reviewerIds,policyRevision:Number(json(db.prepare('SELECT policy_revision FROM spaces WHERE id=?').get(space.id)).policy_revision)};
  274 |       },
  275 |       async loginReview(page,name) {const identity=reviewIdentities.get(name);if(!identity)throw new Error('Private review identity unavailable.');await loginIdentity(page,identity);},
  276 |       reviewRows() {
  277 |         return {counts:Object.fromEntries(['snapshots','snapshot_items','review_requests','review_request_versions','review_assignments','review_submissions','review_decisions','artifacts','events','idempotency_records','sessions'].map(table=>[table,Number(json(db.prepare(`SELECT count(*) n FROM ${table}`).get()).n)])),requests:db.prepare('SELECT id,round,phase,submitted_count FROM review_requests ORDER BY round').all() as ReturnType<ForumFixture['reviewRows']>['requests'],submissions:db.prepare('SELECT id,reviewer_actor_id,reviewer_session_id,revealed_at FROM review_submissions ORDER BY id').all() as ReturnType<ForumFixture['reviewRows']>['submissions']};
  278 |       },
  279 |       async login(page, identity = 'contributor') {
  280 |         // Suppress action errors that would otherwise repeat the private token in call logs.
  281 |         try {await page.getByLabel('访问令牌', {exact: true}).fill(identities[identity].token); await page.getByRole('button', {name: '登录', exact: true}).click();}
  282 |         catch {throw new Error('Private browser login action failed.');}
  283 |         await expect(page.getByRole('button', {name: '退出登录', exact: true})).toBeVisible();
  284 |       },
  285 |       async revokeCredential(identity) {await seed('POST', `/admin/credentials/${identities[identity].credential}/revoke`);},
  286 |       async withdrawMembership(identity) {await seed('DELETE', `/spaces/${space.id}/memberships/${identities[identity].actor}`);},
  287 |       seedNote, seedPost, patchSpace,
  288 |       async seedHistoricalBody(title,body) {
  289 |         if(browserAccessed) throw new Error('Historical body must precede browser access.');
  290 |         const value=await seedNote({title,body:'Legal small HTTP seed before owned historical replacement.'});
  291 |         const row=json(db.prepare('SELECT title,summary,structured FROM post_revisions WHERE post_id=? AND revision=1').get(value.id));
  292 |         const hasher=new CryptoHasher();const structured=json(JSON.parse(string(row.structured)));
  293 |         const hash=hasher.sha256(`${string(row.title)}\n${string(row.summary)}\n${body}\n${hasher.canonicalJson(structured)}`);
  294 |         db.prepare('UPDATE post_revisions SET body=?,content_hash=? WHERE post_id=? AND revision=1').run(body,hash,value.id);
  295 |         return value;
  296 |       },
```