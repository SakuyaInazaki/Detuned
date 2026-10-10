# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-d2.spec.ts >> D204 held catalog, comparison, committed upload and download never cross ref space or logout generation
- Location: scripts/integrations/web/m5-d2.spec.ts:157:1

# Error details

```
TimeoutError: locator.selectOption: Timeout 5000ms exceeded.
Call log:
  - waiting for getByLabel('比较版本一', { exact: true })

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
      - generic [ref=e15]: 修订目录已加载；固定正文没有切换。
    - generic [ref=e16]:
      - complementary [ref=e17]:
        - generic [ref=e18]:
          - heading "空间" [level=2] [ref=e19]
          - generic [ref=e20]: 每页 20 项
        - list [ref=e21]:
          - listitem [ref=e22]:
            - button "browser-space 进入空间 →" [pressed] [ref=e23] [cursor=pointer]:
              - text: browser-space
              - generic [ref=e24]: 进入空间 →
          - listitem [ref=e25]:
            - button "alternate-space 进入空间 →" [ref=e26] [cursor=pointer]:
              - text: alternate-space
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
          - button "讨论" [ref=e38] [cursor=pointer]
          - button "搜索" [ref=e39] [cursor=pointer]
          - button "失败报告" [ref=e40] [cursor=pointer]
        - region [ref=e41]:
          - generic [ref=e42]:
            - heading "新主题" [level=2] [ref=e43]
            - button "新建主题" [ref=e44] [cursor=pointer]
        - region [ref=e45]:
          - generic [ref=e46]:
            - heading "主题" [level=2] [ref=e47]
            - generic [ref=e48]:
              - text: 主题状态
              - combobox "主题状态" [ref=e49]:
                - option "开放" [selected]
                - option "归档"
          - list [ref=e50]:
            - listitem [ref=e51]:
              - button "Browser discussion 开放 · 查看帖子 →" [pressed] [ref=e52] [cursor=pointer]:
                - text: Browser discussion
                - generic [ref=e53]: 开放 · 查看帖子 →
          - button "主题首页" [ref=e55] [cursor=pointer]
        - region [ref=e56]:
          - generic [ref=e57]:
            - heading "Browser discussion" [level=2] [ref=e58]
            - generic [ref=e59]: 帖子列表
          - list [ref=e60]:
            - listitem [ref=e61]:
              - generic [ref=e62]:
                - strong [ref=e63]: note
                - generic [ref=e64]: pst_9ea16479-e24c-4329-9c73-b9e8f02e8e67
                - text: active
              - button "查看修订 1" [ref=e65] [cursor=pointer]
            - listitem [ref=e66]:
              - generic [ref=e67]:
                - strong [ref=e68]: note
                - generic [ref=e69]: pst_fd913e7c-ec90-4de9-b7bf-20a83fb83318
                - text: active
              - button "查看修订 1" [ref=e70] [cursor=pointer]
          - button "帖子首页" [ref=e72] [cursor=pointer]
        - region [ref=e73]:
          - generic [ref=e74]:
            - heading "固定修订 1" [level=2] [ref=e75]
            - generic [ref=e76]: 读取完成
          - paragraph [ref=e77]: 帖子 pst_9ea16479-e24c-4329-9c73-b9e8f02e8e67
          - article [ref=e78]:
            - heading "Fixture source" [level=3] [ref=e79]
            - paragraph [ref=e80]: Private browser fixture
            - generic [ref=e81]: Original fixed research body.
            - generic [ref=e82]:
              - heading "标签" [level=4] [ref=e83]
              - paragraph [ref=e84]: 无标签
              - heading "结构化内容" [level=4] [ref=e85]
              - generic [ref=e86]: "{}"
          - generic [ref=e87]:
            - button "从首段重开" [ref=e88] [cursor=pointer]
            - button "引用回复" [ref=e89] [cursor=pointer]
          - generic [ref=e90]:
            - region [ref=e91]:
              - heading "修订目录" [level=3] [ref=e92]
              - button "加载修订目录" [ref=e93] [cursor=pointer]
              - paragraph [ref=e94]: 目录查询时当前修订：1。正文仍保持已选版本。
              - list [ref=e95]:
                - listitem [ref=e96]:
                  - generic [ref=e97]:
                    - strong [ref=e98]: 修订 1
                    - generic [ref=e99]: 2026-11-01T00:12:00.000Z
                    - generic [ref=e100]: 编辑者 act_admin_8851e12f332c
                    - generic [ref=e101]: 内容摘要 50f1929d5ccd97b7519f3738bd62ac4d051122cbda973939f04aa77d692cb29e
                  - button "打开修订 1" [ref=e102] [cursor=pointer]
              - generic [ref=e103]:
                - generic [ref=e104]:
                  - text: 比较版本一
                  - combobox "比较版本一" [ref=e105]:
                    - option "选择修订" [selected]
                    - option "1"
                - generic [ref=e106]:
                  - text: 比较版本二
                  - combobox "比较版本二" [ref=e107]:
                    - option "选择修订" [selected]
                    - option "1"
                - button "比较所选版本" [disabled] [ref=e108]
              - region [ref=e109]:
                - heading "五字段比较" [level=4] [ref=e110]
                - paragraph [ref=e111]: 选择同帖的两个明确修订后比较。
            - region [ref=e112]:
              - heading "本修订附件" [level=3] [ref=e113]
              - paragraph [ref=e114]: 仅列此固定修订关联的附件。下载不会自动预览或执行。
              - button "加载附件目录" [ref=e115] [cursor=pointer]
              - list
        - region [ref=e116]:
          - heading "发布笔记" [level=2] [ref=e117]
          - paragraph [ref=e118]: 发布到当前主题，研究内容只按纯文本显示。
          - generic [ref=e119]:
            - generic [ref=e120]: 选择附件文件
            - button "选择附件文件" [ref=e121]
            - paragraph [ref=e122]: 单文件最多 25 MiB；逐个上传后，可在同一笔记中一起关联。
            - button "上传所选附件" [disabled] [ref=e124]
          - generic [ref=e125]:
            - group [ref=e126]:
              - generic [ref=e127]: 帖子标题
              - textbox "帖子标题" [ref=e128]
              - generic [ref=e129]: 摘要
              - textbox "摘要" [ref=e130]
              - generic [ref=e131]: 正文
              - textbox "正文" [ref=e132]
            - button "发布笔记" [ref=e134] [cursor=pointer]
  - contentinfo [ref=e135]: 独立协作论坛 · 正式评审尚未启用
```

# Test source

```ts
  66  |     URL.createObjectURL = value => {counts.created++; return create(value);};
  67  |     URL.revokeObjectURL = value => {counts.revoked++; return revoke(value);};
  68  |   });
  69  |   const bytes = Buffer.from('<script>window.detunedAttachmentExecuted=true</script>研究🧪\n');
  70  |   await login(page, forum); await open(page, forum.post.id, 1);
  71  |   await page.getByRole('button', {name: '引用回复', exact: true}).click();
  72  |   const uploadPath = `/api/v1/spaces/${forum.space.id}/artifacts`;
  73  |   const losses = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: uploadPath}, 'lose-after-commit'));
  74  |   await page.getByLabel('选择附件文件', {exact: true}).setInputFiles({name: 'research.html', mimeType: 'text/html', buffer: bytes});
  75  |   await page.getByRole('button', {name: '上传所选附件', exact: true}).click();
  76  |   await Promise.all(losses.map(value => value.entered));
  77  |   const retry = page.getByRole('button', {name: '用同一请求重试上传', exact: true});
  78  |   await expect(retry).toBeEnabled(); await expect(page.getByLabel('选择附件文件', {exact: true})).toBeDisabled();
  79  |   expect(forum.artifacts().length).toBe(1); expect(forum.artifactsFor(forum.post.id, 1)).toEqual([]);
  80  |   await retry.click(); await expect(page.getByRole('status')).toContainText('附件已上传，尚未关联帖子');
  81  |   const uploaded = forum.artifacts()[0]!;
  82  |   expect(uploaded).toMatchObject({owner_id: forum.actorIds.contributor, space_id: forum.space.id, bytes: bytes.length, sha256: hash(bytes), state: 'ready'});
  83  |   const attempts = forum.httpEvents.filter(value => value.method === 'POST' && value.path === uploadPath);
  84  |   expect(attempts.length === 5 && attempts.every(value => !!value.requestKey) && new Set(attempts.map(value => value.requestKey)).size === 1).toBe(true);
  85  |   await page.getByLabel('选择附件文件', {exact: true}).setInputFiles({name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('Second evidence')});
  86  |   await page.getByRole('button', {name: '上传所选附件', exact: true}).click();
  87  |   await expect(page.getByRole('status')).toContainText('附件已上传，尚未关联帖子');
  88  |   expect(forum.artifacts().length).toBe(2); expect(forum.artifactsFor(forum.post.id, 1)).toEqual([]);
  89  |   const postPath = `/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`;
  90  |   const postLosses = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: postPath}, 'lose-after-commit'));
  91  |   const title = 'D2 evidence bound once';
  92  |   await page.getByLabel('帖子标题', {exact: true}).fill(title);
  93  |   await page.getByLabel('摘要', {exact: true}).fill('Evidence and fixed citation in one transaction');
  94  |   await page.getByLabel('正文', {exact: true}).fill('Actual uploaded research');
  95  |   await page.getByRole('button', {name: '发布笔记', exact: true}).click(); await Promise.all(postLosses.map(value => value.entered));
  96  |   await expect(page.getByRole('button', {name: '用同一请求重试发布', exact: true})).toBeEnabled();
  97  |   await expect(page.getByLabel('正文', {exact: true})).toBeDisabled();
  98  |   const committed = forum.postsByTitle(title); expect(committed.length).toBe(1);
  99  |   const postId = committed[0]!.id;
  100 |   expect(forum.artifactsFor(postId, 1).map(value => value.artifact_id).sort()).toEqual(forum.artifacts().map(value => value.id).sort());
  101 |   expect(forum.relationsFrom(postId)).toEqual([expect.objectContaining({type: 'cites',target_post_id: forum.post.id,target_revision: 1})]);
  102 |   await page.getByRole('button', {name: '用同一请求重试发布', exact: true}).click();
  103 |   await expect(page.getByRole('status')).toContainText('帖子已发布');
  104 |   expect(forum.postsByTitle(title).length).toBe(1); expect(forum.artifacts().length).toBe(2); expect(forum.artifactsFor(postId,1).length).toBe(2);
  105 |   const postAttempts = forum.httpEvents.filter(value => value.method === 'POST' && value.path === postPath);
  106 |   expect(postAttempts.length === 5 && new Set(postAttempts.map(value => value.requestKey)).size === 1 && postAttempts[0]?.requestKey !== attempts[0]?.requestKey).toBe(true);
  107 |   await expect(page.getByLabel('待绑定附件', {exact: true})).toHaveCount(0);
  108 |   await open(page, postId, 1); await loadArtifacts(page);
  109 |   let downloads = 0; page.on('download', () => downloads++);
  110 |   expect(downloads).toBe(0);
  111 |   const downloadEvent = page.waitForEvent('download');
  112 |   await page.getByRole('button', {name: `下载附件 ${uploaded.id}`, exact: true}).click();
  113 |   const download = await downloadEvent; const privatePath = await download.path();
  114 |   if (!privatePath) throw new Error('Private browser download unavailable.');
  115 |   const actual = await readFile(privatePath);
  116 |   expect(actual.length === bytes.length && hash(actual) === hash(bytes)).toBe(true);
  117 |   expect(download.suggestedFilename()).toBe(`artifact-${uploaded.id}`);
  118 |   expect(await page.evaluate(() => !('detunedAttachmentExecuted' in window))).toBe(true);
  119 |   const counts = await page.evaluate(() => (window as unknown as {detunedBlobCounts: {created:number;revoked:number}}).detunedBlobCounts);
  120 |   expect(counts).toEqual({created: 1, revoked: 1}); expect(downloads).toBe(1);
  121 |   await download.delete();
  122 |   await writeFile(forum.evidencePath('download-verification.json'), JSON.stringify({bytes: actual.length, sha256: hash(actual), expected_match: true, explicit_downloads: downloads, blob: counts, private_download_deleted: true}, null, 2));
  123 |   await page.setViewportSize({width: 390,height: 844});
  124 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  125 |   await page.locator('.artifact-list').scrollIntoViewIfNeeded(); await page.screenshot({path: forum.evidencePath('screenshots/d2-artifacts-narrow.png')});
  126 | });
  127 | 
  128 | test('D203 artifact pagination, exact tombstones and private associations with current ACL', async ({page, forum}) => {
  129 |   const ids: string[] = [];
  130 |   for (let i = 0; i < 21; i++) ids.push(await forum.seedArtifact({bytes: Buffer.from(`Evidence ${i}`), post: forum.post}));
  131 |   const missing = await forum.seedArtifact({bytes: Buffer.from('Missing evidence'), post: forum.post, state: 'missing'});
  132 |   const redacted = await forum.seedArtifact({bytes: Buffer.from('Redacted evidence unique residual'), post: forum.post, state: 'redacted'});
  133 |   const privateId = await forum.seedArtifact({bytes: Buffer.from('Private evidence'), post: forum.post, visibility: 'review_assignment'});
  134 |   const crossId = await forum.seedArtifact({bytes: Buffer.from('Cross space evidence'), post: forum.post, crossSpace: true});
  135 |   const residual = forum.artifacts().find(value => value.id === redacted)!.sha256;
  136 |   await page.goto(forum.baseURL); await forum.login(page,'observer'); await discussion(page,forum); await open(page,forum.post.id,1);
  137 |   await loadArtifacts(page); await expect(page.locator('.artifact-list li')).toHaveCount(20);
  138 |   const first = await page.locator('.artifact-list').textContent();
  139 |   await page.getByRole('button', {name:'下一页附件',exact:true}).click(); await expect(page.locator('.artifact-list li')).toHaveCount(3);
  140 |   const second = await page.locator('.artifact-list').textContent(); const visible = (first ?? '') + (second ?? '');
  141 |   expect([...ids,missing,redacted].every(id => visible.includes(id)) && !visible.includes(privateId) && !visible.includes(crossId) && !visible.includes(residual)).toBe(true);
  142 |   await expect(page.getByRole('button',{name:`下载附件 ${missing}`,exact:true})).toHaveCount(0);
  143 |   await expect(page.getByRole('button',{name:`下载附件 ${redacted}`,exact:true})).toHaveCount(0);
  144 |   const wire = await page.evaluate(async route => {
  145 |     const items: Array<Record<string,unknown>> = []; let cursor: string|null = null;
  146 |     do {const response: Response = await fetch(route + (cursor ? '?cursor='+encodeURIComponent(cursor) : ''), {credentials:'same-origin'}); const value: {data:{artifacts:Array<Record<string,unknown>>};meta:{next_cursor:string|null}} = await response.json(); items.push(...value.data.artifacts); cursor = value.meta.next_cursor;} while(cursor);
  147 |     return items;
  148 |   }, `/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/1/artifacts`);
  149 |   expect(wire.find(value => value.id === redacted)).toEqual({id:redacted,state:'redacted'});
  150 |   expect(wire.some(value => value.id === privateId || value.id === crossId)).toBe(false);
  151 |   for (const id of [privateId,crossId]) expect(await page.evaluate(async route => (await fetch(route,{credentials:'same-origin'})).status, `/api/v1/spaces/${forum.space.id}/artifacts/${id}`)).toBe(404);
  152 |   await forum.withdrawMembership('observer'); await page.getByRole('button',{name:'加载附件目录',exact:true}).click();
  153 |   await expect(page.getByRole('alert')).toBeVisible();
  154 |   expect(forum.httpEvents.some(value => value.path.endsWith(`/revisions/1/artifacts`) && value.status === 404)).toBe(true);
  155 | });
  156 | 
  157 | test('D204 held catalog, comparison, committed upload and download never cross ref space or logout generation', async ({page,forum}) => {
  158 |   const artifact = await forum.seedArtifact({bytes: Buffer.from('Late explicit download'),post:forum.post});
  159 |   const other = await forum.seedNote({title:'D2 other fixed reader',body:'A separate selected reference'});
  160 |   await login(page,forum); await open(page,forum.post.id,1);
  161 |   const catalog = forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/catalog`},'hold-after');
  162 |   await page.getByRole('button',{name:'加载修订目录',exact:true}).click(); await catalog.entered;
  163 |   await page.getByRole('button',{name:`${forum.alternate.slug} 进入空间 →`,exact:true}).click(); catalog.release();
  164 |   await expect(page.locator('.revision-list')).toHaveCount(0); await discussion(page,forum); await open(page,forum.post.id,1);
  165 |   await page.getByRole('button',{name:'加载修订目录',exact:true}).click(); await expect(page.locator('.revision-list li')).toHaveCount(1);
> 166 |   await page.getByLabel('比较版本一',{exact:true}).selectOption('1'); await page.getByLabel('比较版本二',{exact:true}).selectOption('1');
      |                                               ^ TimeoutError: locator.selectOption: Timeout 5000ms exceeded.
  167 |   const comparison = forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/1/content`},'hold-after');
  168 |   await page.getByRole('button',{name:'比较所选版本',exact:true}).click(); await comparison.entered;
  169 |   await open(page,other.id,1); comparison.release(); await expect(page.locator('.field-comparison')).toHaveCount(0);
  170 |   await expect(page.locator('.body-text')).toHaveText('A separate selected reference');
  171 |   const upload = forum.faultNext({method:'POST',path:`/api/v1/spaces/${forum.space.id}/artifacts`},'hold-after');
  172 |   await page.getByLabel('选择附件文件',{exact:true}).setInputFiles({name:'late.txt',mimeType:'text/plain',buffer:Buffer.from('Late committed upload')});
  173 |   await page.getByRole('button',{name:'上传所选附件',exact:true}).click(); await upload.entered;
  174 |   expect(forum.artifacts().length).toBe(2);
  175 |   await open(page,forum.post.id,1); upload.release(); await expect(page.getByLabel('待绑定附件',{exact:true})).toHaveCount(0);
  176 |   expect(forum.artifactsFor(forum.post.id,1).map(value => value.artifact_id)).toEqual([artifact]);
  177 |   await loadArtifacts(page);
  178 |   let downloaded = false; page.on('download',()=> {downloaded=true;});
  179 |   const held = forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/artifacts/${artifact}/content`},'hold-after');
  180 |   await page.getByRole('button',{name:`下载附件 ${artifact}`,exact:true}).click(); await held.entered;
  181 |   await page.getByRole('button',{name:'退出登录',exact:true}).click(); await expect(page.getByRole('status')).toContainText('已退出登录'); held.release();
  182 |   await expect(page.locator('.workspace')).toHaveCount(0); expect(downloaded).toBe(false);
  183 |   // A fresh real login/request provides an observable post-release barrier, not a timed sleep.
  184 |   await forum.login(page); await discussion(page,forum); expect(downloaded).toBe(false); await expect(page.getByLabel('待绑定附件',{exact:true})).toHaveCount(0);
  185 | });
  186 | 
```