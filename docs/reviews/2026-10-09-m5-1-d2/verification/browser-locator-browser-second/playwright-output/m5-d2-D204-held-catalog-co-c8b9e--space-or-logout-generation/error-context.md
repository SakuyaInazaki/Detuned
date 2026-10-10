# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-d2.spec.ts >> D204 held catalog, comparison, committed upload and download never cross ref space or logout generation
- Location: scripts/integrations/web/m5-d2.spec.ts:157:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.post-directory li').filter({ hasText: 'pst_8b01332d-0afb-4bda-848d-383c09813933' }).getByRole('button', { name: '查看修订 1', exact: true })
    - locator resolved to <button>查看修订 1</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

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
      - generic [ref=e15]: 比较请求已结束，请查看五字段比较状态。
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
                - generic [ref=e64]: pst_8b01332d-0afb-4bda-848d-383c09813933
                - text: active
              - button "查看修订 1" [ref=e65] [cursor=pointer]
            - listitem [ref=e66]:
              - generic [ref=e67]:
                - strong [ref=e68]: note
                - generic [ref=e69]: pst_f81cdcc9-ab46-4793-a0e8-a1c03a5ca97b
                - text: active
              - button "查看修订 1" [ref=e70] [cursor=pointer]
          - button "帖子首页" [ref=e72] [cursor=pointer]
        - region [ref=e73]:
          - generic [ref=e74]:
            - heading "固定修订 1" [level=2] [ref=e75]
            - generic [ref=e76]: 读取完成
          - paragraph [ref=e77]: 帖子 pst_f81cdcc9-ab46-4793-a0e8-a1c03a5ca97b
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
                    - generic [ref=e100]: 编辑者 act_admin_4494ce40e85a
                    - generic [ref=e101]: 内容摘要 50f1929d5ccd97b7519f3738bd62ac4d051122cbda973939f04aa77d692cb29e
                  - button "打开修订 1" [ref=e102] [cursor=pointer]
              - generic [ref=e103]:
                - generic [ref=e104]:
                  - text: 比较版本一
                  - combobox "比较版本一" [ref=e105]:
                    - option "选择修订"
                    - option "1" [selected]
                - generic [ref=e106]:
                  - text: 比较版本二
                  - combobox "比较版本二" [ref=e107]:
                    - option "选择修订"
                    - option "1" [selected]
                - button "比较所选版本" [ref=e108] [cursor=pointer]
              - region [ref=e109]:
                - heading "五字段比较" [level=4] [ref=e110]
                - paragraph [ref=e111]: 两个固定版本已完整读取，五字段对比完成。
                - paragraph [ref=e112]: 修订 1 → 修订 1，五字段完整对比。
                - generic [ref=e113]:
                  - heading "标题 · 相同" [level=5] [ref=e114]
                  - generic [ref=e115]:
                    - generic [ref=e116]:
                      - heading "前：修订 1" [level=6] [ref=e117]
                      - generic [ref=e118]: "\"Fixture source\""
                    - generic [ref=e119]:
                      - heading "后：修订 1" [level=6] [ref=e120]
                      - generic [ref=e121]: "\"Fixture source\""
                - generic [ref=e122]:
                  - heading "摘要 · 相同" [level=5] [ref=e123]
                  - generic [ref=e124]:
                    - generic [ref=e125]:
                      - heading "前：修订 1" [level=6] [ref=e126]
                      - generic [ref=e127]: "\"Private browser fixture\""
                    - generic [ref=e128]:
                      - heading "后：修订 1" [level=6] [ref=e129]
                      - generic [ref=e130]: "\"Private browser fixture\""
                - generic [ref=e131]:
                  - heading "正文 · 相同" [level=5] [ref=e132]
                  - generic [ref=e133]:
                    - generic [ref=e134]:
                      - heading "前：修订 1" [level=6] [ref=e135]
                      - generic [ref=e136]: "\"Original fixed research body.\""
                    - generic [ref=e137]:
                      - heading "后：修订 1" [level=6] [ref=e138]
                      - generic [ref=e139]: "\"Original fixed research body.\""
                - generic [ref=e140]:
                  - heading "标签 · 相同" [level=5] [ref=e141]
                  - generic [ref=e142]:
                    - generic [ref=e143]:
                      - heading "前：修订 1" [level=6] [ref=e144]
                      - generic [ref=e145]: "[]"
                    - generic [ref=e146]:
                      - heading "后：修订 1" [level=6] [ref=e147]
                      - generic [ref=e148]: "[]"
                - generic [ref=e149]:
                  - heading "结构化内容 · 相同" [level=5] [ref=e150]
                  - generic [ref=e151]:
                    - generic [ref=e152]:
                      - heading "前：修订 1" [level=6] [ref=e153]
                      - generic [ref=e154]: "{}"
                    - generic [ref=e155]:
                      - heading "后：修订 1" [level=6] [ref=e156]
                      - generic [ref=e157]: "{}"
            - region [ref=e158]:
              - heading "本修订附件" [level=3] [ref=e159]
              - paragraph [ref=e160]: 仅列此固定修订关联的附件。下载不会自动预览或执行。
              - button "加载附件目录" [ref=e161] [cursor=pointer]
              - list
        - region [ref=e162]:
          - heading "发布笔记" [level=2] [ref=e163]
          - paragraph [ref=e164]: 发布到当前主题，研究内容只按纯文本显示。
          - generic [ref=e165]:
            - generic [ref=e166]: 选择附件文件
            - button "选择附件文件" [ref=e167]
            - paragraph [ref=e168]: 单文件最多 25 MiB；逐个上传后，可在同一笔记中一起关联。
            - button "上传所选附件" [disabled] [ref=e170]
          - generic [ref=e171]:
            - group [ref=e172]:
              - generic [ref=e173]: 帖子标题
              - textbox "帖子标题" [ref=e174]
              - generic [ref=e175]: 摘要
              - textbox "摘要" [ref=e176]
              - generic [ref=e177]: 正文
              - textbox "正文" [ref=e178]
            - button "发布笔记" [ref=e180] [cursor=pointer]
  - contentinfo [ref=e181]: 独立协作论坛 · 正式评审尚未启用
```

# Test source

```ts
  1   | import {test, expect, type ForumFixture} from './fixtures.js';
  2   | import type {Page} from '@playwright/test';
  3   | import {readFile, writeFile} from 'node:fs/promises';
  4   | import {createHash} from 'node:crypto';
  5   | 
  6   | async function discussion(page: Page, forum: ForumFixture) {
  7   |   await page.getByRole('button', {name: `${forum.space.slug} 进入空间 →`, exact: true}).click();
  8   |   await page.getByRole('button', {name: `${forum.thread.title} 开放 · 查看帖子 →`, exact: true}).click();
  9   |   await expect(page.getByRole('button', {name: '帖子首页', exact: true})).toBeEnabled();
  10  | }
  11  | async function open(page: Page, id: string, revision: number) {
> 12  |   await page.locator('.post-directory li').filter({hasText: id}).getByRole('button', {name: `查看修订 ${revision}`, exact: true}).click();
      |                                                                                                                               ^ Error: locator.click: Test timeout of 60000ms exceeded.
  13  |   await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
  14  | }
  15  | async function login(page: Page, forum: ForumFixture) {await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum);}
  16  | async function loadArtifacts(page: Page) {
  17  |   await page.getByRole('button', {name: '加载附件目录', exact: true}).click();
  18  |   await expect(page.getByRole('status')).toContainText('附件目录已加载');
  19  | }
  20  | const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
  21  | 
  22  | test('D201 revision pagination, fixed old reference, five actual fields and honest oversized comparison', async ({page, forum}) => {
  23  |   const large = await forum.seedSyntheticLargeNote('D2 synthetic historical large material');
  24  |   let revision = await forum.seedPost({title: 'D2 first title', summary: 'First summary', body: '研究🧪 first body', tags: ['first'], structured: {value: 1}});
  25  |   for (let i = 2; i <= 24; i++) revision = await forum.revisePost(revision, {title: `D2 title ${i}`, summary: `Summary ${i}`, body: `研究🧪 body ${i}`, tags: [`tag-${i}`], structured: {value: i}});
  26  |   await login(page, forum); await open(page, revision.id, 24);
  27  |   const catalog = page.getByRole('button', {name: '加载修订目录', exact: true});
  28  |   await catalog.focus(); await page.keyboard.press('Enter');
  29  |   await expect(page.locator('.revision-list li')).toHaveCount(20);
  30  |   await page.getByRole('combobox', {name: '比较版本二', exact: true}).selectOption('24');
  31  |   await page.getByRole('button', {name: '下一页修订', exact: true}).click();
  32  |   await expect(page.locator('.revision-list li')).toHaveCount(4);
  33  |   expect(await page.locator('.revision-list strong').allTextContents()).toEqual(['修订 4','修订 3','修订 2','修订 1']);
  34  |   await page.getByRole('combobox', {name: '比较版本一', exact: true}).selectOption('1');
  35  |   await page.getByRole('button', {name: '比较所选版本', exact: true}).focus(); await page.keyboard.press('Enter');
  36  |   await expect(page.getByRole('region', {name: '五字段比较', exact: true})).toContainText('五字段完整对比');
  37  |   await expect(page.locator('.field-comparison')).toHaveCount(5);
  38  |   expect(await page.locator('.field-comparison h5').allTextContents()).toEqual(['标题 · 变化','摘要 · 变化','正文 · 变化','标签 · 变化','结构化内容 · 变化']);
  39  |   const comparison = page.getByRole('region', {name: '五字段比较', exact: true});
  40  |   for (const value of ['D2 first title','D2 title 24','First summary','Summary 24','研究🧪 first body','研究🧪 body 24','first','tag-24','"value":1','"value":24']) await expect(comparison).toContainText(value);
  41  |   await page.getByRole('button', {name: '打开修订 1', exact: true}).click();
  42  |   await expect(page.locator('.body-text')).toHaveText('研究🧪 first body');
  43  |   const next = await forum.revisePost(revision, {title: 'D2 title 25', body: 'Latest body is separate'});
  44  |   await catalog.click(); await expect(page.getByText('目录查询时当前修订：25。正文仍保持已选版本。', {exact: true})).toBeVisible();
  45  |   await expect(page.locator('.body-text')).toHaveText('研究🧪 first body');
  46  |   expect(next.revision).toBe(25);
  47  |   const requests = forum.httpEvents.filter(event => event.path.endsWith(`/${revision.id}/revisions/catalog`));
  48  |   expect(requests.length >= 3 && requests[1]?.query?.cursor !== undefined).toBe(true);
  49  |   await page.setViewportSize({width: 390, height: 844});
  50  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  51  |   await page.locator('.revision-evidence').scrollIntoViewIfNeeded();
  52  |   await page.screenshot({path: forum.evidencePath('screenshots/d2-revisions-narrow.png')});
  53  |   await open(page, large.id, 1); await catalog.click();
  54  |   await page.getByRole('combobox', {name: '比较版本一', exact: true}).selectOption('1');
  55  |   await page.getByRole('combobox', {name: '比较版本二', exact: true}).selectOption('1');
  56  |   await page.getByRole('button', {name: '比较所选版本', exact: true}).click();
  57  |   await expect(comparison).toContainText('未完成全部对比：正文未完整、超过 1 MiB');
  58  |   await expect(page.locator('.field-comparison')).toHaveCount(0);
  59  |   await expect(page.getByRole('button', {name: '继续加载正文', exact: true})).toBeEnabled();
  60  | });
  61  | 
  62  | test('D202 real upload and publish each recover same intent once, exact binding and verified explicit download', async ({page, forum}) => {
  63  |   await page.addInitScript(() => {
  64  |     const counts = {created: 0, revoked: 0}; Object.assign(window, {detunedBlobCounts: counts});
  65  |     const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
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
```