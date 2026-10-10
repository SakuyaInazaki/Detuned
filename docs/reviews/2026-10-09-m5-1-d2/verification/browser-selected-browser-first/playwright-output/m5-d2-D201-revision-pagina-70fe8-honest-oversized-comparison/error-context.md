# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-d2.spec.ts >> D201 revision pagination, fixed old reference, five actual fields and honest oversized comparison
- Location: scripts/integrations/web/m5-d2.spec.ts:22:1

# Error details

```
TimeoutError: locator.selectOption: Timeout 5000ms exceeded.
Call log:
  - waiting for getByLabel('比较版本二', { exact: true })

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
                - generic [ref=e64]: pst_1195dbc7-1ff3-4731-8eb7-b2961024fa7a
                - text: active
              - button "查看修订 1" [ref=e65] [cursor=pointer]
            - listitem [ref=e66]:
              - generic [ref=e67]:
                - strong [ref=e68]: note
                - generic [ref=e69]: pst_491e1951-d0c3-468b-9fc0-b3dbadfe2e83
                - text: active
              - button "查看修订 24" [ref=e70] [cursor=pointer]
            - listitem [ref=e71]:
              - generic [ref=e72]:
                - strong [ref=e73]: note
                - generic [ref=e74]: pst_ce5d693b-8436-4dce-ba2a-873f0ab8ae9d
                - text: active
              - button "查看修订 1" [ref=e75] [cursor=pointer]
          - button "帖子首页" [ref=e77] [cursor=pointer]
        - region [ref=e78]:
          - generic [ref=e79]:
            - heading "固定修订 24" [level=2] [ref=e80]
            - generic [ref=e81]: 读取完成
          - paragraph [ref=e82]: 帖子 pst_491e1951-d0c3-468b-9fc0-b3dbadfe2e83
          - article [ref=e83]:
            - heading "D2 title 24" [level=3] [ref=e84]
            - paragraph [ref=e85]: Summary 24
            - generic [ref=e86]: 研究🧪 body 24
            - generic [ref=e87]:
              - heading "标签" [level=4] [ref=e88]
              - paragraph [ref=e89]: tag-24
              - heading "结构化内容" [level=4] [ref=e90]
              - generic [ref=e91]: "{ \"value\": 24 }"
          - generic [ref=e92]:
            - button "从首段重开" [ref=e93] [cursor=pointer]
            - button "引用回复" [ref=e94] [cursor=pointer]
          - generic [ref=e95]:
            - region [ref=e96]:
              - heading "修订目录" [level=3] [ref=e97]
              - button "加载修订目录" [ref=e98] [cursor=pointer]
              - paragraph [ref=e99]: 目录查询时当前修订：24。正文仍保持已选版本。
              - list [ref=e100]:
                - listitem [ref=e101]:
                  - generic [ref=e102]:
                    - strong [ref=e103]: 修订 24
                    - generic [ref=e104]: 2026-11-01T00:37:00.000Z
                    - generic [ref=e105]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e106]: 内容摘要 c296e6d7a9c342020dbc56555be64233c753906d67661662a01abf898a12a895
                  - button "打开修订 24" [ref=e107] [cursor=pointer]
                - listitem [ref=e108]:
                  - generic [ref=e109]:
                    - strong [ref=e110]: 修订 23
                    - generic [ref=e111]: 2026-11-01T00:36:00.000Z
                    - generic [ref=e112]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e113]: 内容摘要 c90b0159278b2b9f372d50474400a5f5c3030e9e3b8dcd7d812640d6c08c3948
                  - button "打开修订 23" [ref=e114] [cursor=pointer]
                - listitem [ref=e115]:
                  - generic [ref=e116]:
                    - strong [ref=e117]: 修订 22
                    - generic [ref=e118]: 2026-11-01T00:35:00.000Z
                    - generic [ref=e119]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e120]: 内容摘要 769cb93b7bee8d254441797cfbb32d5943baeca3e88ecec83b455ca4ffb3d5df
                  - button "打开修订 22" [ref=e121] [cursor=pointer]
                - listitem [ref=e122]:
                  - generic [ref=e123]:
                    - strong [ref=e124]: 修订 21
                    - generic [ref=e125]: 2026-11-01T00:34:00.000Z
                    - generic [ref=e126]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e127]: 内容摘要 44835073e09a49c6a47d0ccf1687aac26116624da1a32f7ed1e6200ae6242be7
                  - button "打开修订 21" [ref=e128] [cursor=pointer]
                - listitem [ref=e129]:
                  - generic [ref=e130]:
                    - strong [ref=e131]: 修订 20
                    - generic [ref=e132]: 2026-11-01T00:33:00.000Z
                    - generic [ref=e133]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e134]: 内容摘要 d198ea1bc62d26691b6884d6082da5fc1e35e0721a93c3ff4314c15e8872a10d
                  - button "打开修订 20" [ref=e135] [cursor=pointer]
                - listitem [ref=e136]:
                  - generic [ref=e137]:
                    - strong [ref=e138]: 修订 19
                    - generic [ref=e139]: 2026-11-01T00:32:00.000Z
                    - generic [ref=e140]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e141]: 内容摘要 1ffe7cc2a012ae2a8f25657a65b7ac0eceb135d032b7e5f3feff23ccc1cb590c
                  - button "打开修订 19" [ref=e142] [cursor=pointer]
                - listitem [ref=e143]:
                  - generic [ref=e144]:
                    - strong [ref=e145]: 修订 18
                    - generic [ref=e146]: 2026-11-01T00:31:00.000Z
                    - generic [ref=e147]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e148]: 内容摘要 7cf63c9f07f75e1228f58935641983ce989a37037879212e03b381b03c5abc14
                  - button "打开修订 18" [ref=e149] [cursor=pointer]
                - listitem [ref=e150]:
                  - generic [ref=e151]:
                    - strong [ref=e152]: 修订 17
                    - generic [ref=e153]: 2026-11-01T00:30:00.000Z
                    - generic [ref=e154]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e155]: 内容摘要 71bd8515211d09e9c91539d81a5cb3a6f5b884b6d6c08b05a35f7dae76ee73ef
                  - button "打开修订 17" [ref=e156] [cursor=pointer]
                - listitem [ref=e157]:
                  - generic [ref=e158]:
                    - strong [ref=e159]: 修订 16
                    - generic [ref=e160]: 2026-11-01T00:29:00.000Z
                    - generic [ref=e161]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e162]: 内容摘要 439bce447df92575bf90afc1205b00e063ddfeabe7b21c8177583e7898d55702
                  - button "打开修订 16" [ref=e163] [cursor=pointer]
                - listitem [ref=e164]:
                  - generic [ref=e165]:
                    - strong [ref=e166]: 修订 15
                    - generic [ref=e167]: 2026-11-01T00:28:00.000Z
                    - generic [ref=e168]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e169]: 内容摘要 e167dcc0c61b11d5a05942a945e78a61abd4ac06f1719b84a9639dfa25fbd032
                  - button "打开修订 15" [ref=e170] [cursor=pointer]
                - listitem [ref=e171]:
                  - generic [ref=e172]:
                    - strong [ref=e173]: 修订 14
                    - generic [ref=e174]: 2026-11-01T00:27:00.000Z
                    - generic [ref=e175]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e176]: 内容摘要 b5ffadb3e44a58d08ee8073f40a0fdf0ff2e83683cd5e4c4bdcb8437dd0f04f1
                  - button "打开修订 14" [ref=e177] [cursor=pointer]
                - listitem [ref=e178]:
                  - generic [ref=e179]:
                    - strong [ref=e180]: 修订 13
                    - generic [ref=e181]: 2026-11-01T00:26:00.000Z
                    - generic [ref=e182]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e183]: 内容摘要 3dd311ba24db674eab4d635effcbf97d8c29b60149b00e0eec25061df5b5b9ec
                  - button "打开修订 13" [ref=e184] [cursor=pointer]
                - listitem [ref=e185]:
                  - generic [ref=e186]:
                    - strong [ref=e187]: 修订 12
                    - generic [ref=e188]: 2026-11-01T00:25:00.000Z
                    - generic [ref=e189]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e190]: 内容摘要 5a3d3d2428f5357aba5124b746e25e7232609c096597e0bf928beaaf2a2c1a95
                  - button "打开修订 12" [ref=e191] [cursor=pointer]
                - listitem [ref=e192]:
                  - generic [ref=e193]:
                    - strong [ref=e194]: 修订 11
                    - generic [ref=e195]: 2026-11-01T00:24:00.000Z
                    - generic [ref=e196]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e197]: 内容摘要 4985f7c3726388e32bafc248a96e99cd340b33b2eb36f5e8492d7a0d6a2bc193
                  - button "打开修订 11" [ref=e198] [cursor=pointer]
                - listitem [ref=e199]:
                  - generic [ref=e200]:
                    - strong [ref=e201]: 修订 10
                    - generic [ref=e202]: 2026-11-01T00:23:00.000Z
                    - generic [ref=e203]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e204]: 内容摘要 1a0f05a728e53c8dffad368ce14840ed5da9b3be069e2dab3206a9bda8c38c3d
                  - button "打开修订 10" [ref=e205] [cursor=pointer]
                - listitem [ref=e206]:
                  - generic [ref=e207]:
                    - strong [ref=e208]: 修订 9
                    - generic [ref=e209]: 2026-11-01T00:22:00.000Z
                    - generic [ref=e210]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e211]: 内容摘要 a1b8bf8eaa99bf47958201b5f689feda4edde1a58ccc397cc765a67102151379
                  - button "打开修订 9" [ref=e212] [cursor=pointer]
                - listitem [ref=e213]:
                  - generic [ref=e214]:
                    - strong [ref=e215]: 修订 8
                    - generic [ref=e216]: 2026-11-01T00:21:00.000Z
                    - generic [ref=e217]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e218]: 内容摘要 48338fba71758708c006f40a860ba6a04de8def96a94ae96a02a58eca7a2e0c0
                  - button "打开修订 8" [ref=e219] [cursor=pointer]
                - listitem [ref=e220]:
                  - generic [ref=e221]:
                    - strong [ref=e222]: 修订 7
                    - generic [ref=e223]: 2026-11-01T00:20:00.000Z
                    - generic [ref=e224]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e225]: 内容摘要 a3a2d5e9d03af583b247e3cfec5f6394c3faa358a242dfe62c5e0c89378c4bf2
                  - button "打开修订 7" [ref=e226] [cursor=pointer]
                - listitem [ref=e227]:
                  - generic [ref=e228]:
                    - strong [ref=e229]: 修订 6
                    - generic [ref=e230]: 2026-11-01T00:19:00.000Z
                    - generic [ref=e231]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e232]: 内容摘要 5392da58f0eefa7f250ba1c9e40790bd2f5d14ca680abef996c0e00fec17f479
                  - button "打开修订 6" [ref=e233] [cursor=pointer]
                - listitem [ref=e234]:
                  - generic [ref=e235]:
                    - strong [ref=e236]: 修订 5
                    - generic [ref=e237]: 2026-11-01T00:18:00.000Z
                    - generic [ref=e238]: 编辑者 act_admin_1abc27412022
                    - generic [ref=e239]: 内容摘要 4c2d61cc8350827a398b670c5dd780518d6956b417b6d6ade140f4a88853b9a2
                  - button "打开修订 5" [ref=e240] [cursor=pointer]
              - button "下一页修订" [ref=e241] [cursor=pointer]
              - generic [ref=e242]:
                - generic [ref=e243]:
                  - text: 比较版本一
                  - combobox "比较版本一" [ref=e244]:
                    - option "选择修订" [selected]
                    - option "24"
                    - option "23"
                    - option "22"
                    - option "21"
                    - option "20"
                    - option "19"
                    - option "18"
                    - option "17"
                    - option "16"
                    - option "15"
                    - option "14"
                    - option "13"
                    - option "12"
                    - option "11"
                    - option "10"
                    - option "9"
                    - option "8"
                    - option "7"
                    - option "6"
                    - option "5"
                - generic [ref=e245]:
                  - text: 比较版本二
                  - combobox "比较版本二" [ref=e246]:
                    - option "选择修订" [selected]
                    - option "24"
                    - option "23"
                    - option "22"
                    - option "21"
                    - option "20"
                    - option "19"
                    - option "18"
                    - option "17"
                    - option "16"
                    - option "15"
                    - option "14"
                    - option "13"
                    - option "12"
                    - option "11"
                    - option "10"
                    - option "9"
                    - option "8"
                    - option "7"
                    - option "6"
                    - option "5"
                - button "比较所选版本" [disabled] [ref=e247]
              - region [ref=e248]:
                - heading "五字段比较" [level=4] [ref=e249]
                - paragraph [ref=e250]: 选择同帖的两个明确修订后比较。
            - region [ref=e251]:
              - heading "本修订附件" [level=3] [ref=e252]
              - paragraph [ref=e253]: 仅列此固定修订关联的附件。下载不会自动预览或执行。
              - button "加载附件目录" [ref=e254] [cursor=pointer]
              - list
        - region [ref=e255]:
          - heading "发布笔记" [level=2] [ref=e256]
          - paragraph [ref=e257]: 发布到当前主题，研究内容只按纯文本显示。
          - generic [ref=e258]:
            - generic [ref=e259]: 选择附件文件
            - button "选择附件文件" [ref=e260]
            - paragraph [ref=e261]: 单文件最多 25 MiB；逐个上传后，可在同一笔记中一起关联。
            - button "上传所选附件" [disabled] [ref=e263]
          - generic [ref=e264]:
            - group [ref=e265]:
              - generic [ref=e266]: 帖子标题
              - textbox "帖子标题" [ref=e267]
              - generic [ref=e268]: 摘要
              - textbox "摘要" [ref=e269]
              - generic [ref=e270]: 正文
              - textbox "正文" [ref=e271]
            - button "发布笔记" [ref=e273] [cursor=pointer]
  - contentinfo [ref=e274]: 独立协作论坛 · 正式评审尚未启用
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
  12  |   await page.locator('.post-directory li').filter({hasText: id}).getByRole('button', {name: `查看修订 ${revision}`, exact: true}).click();
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
> 30  |   await page.getByLabel('比较版本二', {exact: true}).selectOption('24');
      |                                                 ^ TimeoutError: locator.selectOption: Timeout 5000ms exceeded.
  31  |   await page.getByRole('button', {name: '下一页修订', exact: true}).click();
  32  |   await expect(page.locator('.revision-list li')).toHaveCount(4);
  33  |   expect(await page.locator('.revision-list strong').allTextContents()).toEqual(['修订 4','修订 3','修订 2','修订 1']);
  34  |   await page.getByLabel('比较版本一', {exact: true}).selectOption('1');
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
  54  |   await page.getByLabel('比较版本一', {exact: true}).selectOption('1');
  55  |   await page.getByLabel('比较版本二', {exact: true}).selectOption('1');
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
```