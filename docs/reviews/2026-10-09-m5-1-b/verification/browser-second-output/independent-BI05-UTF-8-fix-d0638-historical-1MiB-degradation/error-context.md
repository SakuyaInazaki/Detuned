# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent.spec.ts >> BI05 UTF-8 fixed pagination, newer revision and historical 1MiB degradation
- Location: scripts/integrations/web/independent.spec.ts:126:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.body-text')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.body-text') with timeout 5000ms
  - waiting for locator('.body-text')

```

```yaml
- banner:
  - text: Detuned协作研究论坛 Browser contributor
  - button "退出登录"
- main:
  - paragraph: 讨论 · 固定版本 · 可追溯引用
  - heading "让研究在讨论中继续" [level=1]
  - paragraph: 阅读当前可见的空间与主题，用笔记回应一个明确版本。正式评审尚未启用。
  - status: 固定修订下一段已加载。
  - complementary "空间":
    - heading "空间" [level=2]
    - text: 每页 20 项
    - list:
      - listitem:
        - button "browser-space 进入空间 →" [pressed]
    - button "空间首页"
  - region "讨论内容":
    - navigation "当前位置":
      - text: 空间
      - button "browser-space"
      - button "Browser discussion"
    - region "主题":
      - heading "主题" [level=2]
      - text: 主题状态
      - combobox "主题状态":
        - option "开放" [selected]
        - option "归档"
      - list:
        - listitem:
          - button "Browser discussion 开放 · 查看帖子 →" [pressed]
      - button "主题首页"
    - region "Browser discussion":
      - heading "Browser discussion" [level=2]
      - text: 帖子按 ID 升序
      - list:
        - listitem:
          - strong: note
          - text: pst_783a1c48-efbb-4b98-8a9b-1823cc73d2d4 active
          - button "查看修订 1"
        - listitem:
          - strong: note
          - text: pst_c453ce1f-9aa8-4a9c-9f44-d1380f2b79c2 active
          - button "查看修订 1"
        - listitem:
          - strong: note
          - text: pst_dce2f793-1c3b-4942-8bd1-afafeff7e67d active
          - button "查看修订 1"
      - button "帖子首页"
    - region "固定修订 1":
      - heading "固定修订 1" [level=2]
      - text: 内容尚未完整加载
      - paragraph: 帖子 pst_783a1c48-efbb-4b98-8a9b-1823cc73d2d4
      - paragraph: 已有更新修订；这里仍显示所选固定版本。
      - paragraph: 已读取 82,486 字节，完整读取后才显示正文。
      - button "继续加载正文"
      - button "从首段重开"
      - button "引用回复"
    - region "发布笔记":
      - heading "发布笔记" [level=2]
      - paragraph: 发布到当前主题，研究内容只按纯文本显示。
      - group:
        - text: 帖子标题
        - textbox "帖子标题"
        - text: 摘要
        - textbox "摘要"
        - text: 正文
        - textbox "正文"
      - button "发布笔记"
- contentinfo: 独立协作论坛 · 不自动确认事件 · 正式评审尚未启用
```

# Test source

```ts
  45  |   await thread.focus(); await page.keyboard.press('Enter');
  46  |   await open(page, post.id);
  47  |   expect(await page.locator('.body-text').evaluate((element, text) => element.textContent === text, hostile)).toBe(true);
  48  |   expect(await page.locator('.reading script,.reading img').count()).toBe(0);
  49  |   expect(await page.evaluate(() => !('detunedResearchExecuted' in window))).toBe(true);
  50  |   expect(remoteRequest).toBe(false);
  51  |   const screenshots = fileURLToPath(new URL('../../../docs/reviews/2026-10-09-m5-1-b/verification/screenshots/', import.meta.url));
  52  |   await mkdir(screenshots, {recursive: true});
  53  |   await page.screenshot({path: screenshots + 'independent-desktop.png', fullPage: true});
  54  |   await page.setViewportSize({width: 390, height: 844});
  55  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  56  |   await page.getByRole('button', {name: '引用回复', exact: true}).focus(); await page.keyboard.press('Enter');
  57  |   await expect(page.getByLabel('帖子标题', {exact: true})).toBeFocused();
  58  |   await page.screenshot({path: screenshots + 'independent-narrow.png', fullPage: true});
  59  | });
  60  | 
  61  | test('BI02 observer write denial, hidden space and immediate membership/credential withdrawal', async ({page, forum}) => {
  62  |   await page.goto(forum.baseURL); await forum.login(page, 'observer');
  63  |   await expect(page.getByRole('button', {name: new RegExp(forum.hidden.slug)})).toHaveCount(0);
  64  |   expect(await status(page, `/api/v1/spaces/${forum.hidden.id}/context`)).toBe(404);
  65  |   await discussion(page, forum);
  66  |   const before = forum.businessCounts();
  67  |   await draft(page, 'Observer must not publish');
  68  |   await page.getByRole('button', {name: '发布笔记', exact: true}).click();
  69  |   await expect(page.getByRole('alert')).toBeVisible();
  70  |   expect(forum.postsByTitle('Observer must not publish').length).toBe(0);
  71  |   expect(forum.businessCounts()).toEqual(before);
  72  |   await page.getByRole('button', {name: '退出登录', exact: true}).click();
  73  |   await expect(page.getByRole('status')).toContainText('已退出登录');
  74  |   await forum.login(page);
  75  |   await discussion(page, forum); await open(page, forum.post.id);
  76  |   await forum.withdrawMembership('contributor');
  77  |   await page.getByRole('button', {name: '从首段重开', exact: true}).click();
  78  |   await expect(page.getByRole('alert')).toBeVisible();
  79  |   expect(await status(page, `/api/v1/spaces/${forum.space.id}/context`)).toBe(404);
  80  |   await forum.revokeCredential('contributor');
  81  |   expect(await status(page, '/auth/session')).toBe(401);
  82  |   await page.getByRole('button', {name: '空间首页', exact: true}).click();
  83  |   await expect(page.getByRole('alert')).toBeVisible();
  84  |   expect(forum.httpEvents.some(event => event.path === '/api/v1/spaces' && event.status === 401)).toBe(true);
  85  | });
  86  | 
  87  | test('BI03 committed response loss exhausts bounded retries then same intent replays once', async ({page, forum}) => {
  88  |   await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum);
  89  |   const route = `/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`;
  90  |   const faults = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: route}, 'lose-after-commit'));
  91  |   const title = 'Response lost but committed';
  92  |   await draft(page, title); await page.getByRole('button', {name: '发布笔记', exact: true}).click();
  93  |   await Promise.all(faults.map(fault => fault.entered));
  94  |   const retry = page.getByRole('button', {name: '用同一请求重试发布', exact: true});
  95  |   await expect(retry).toBeEnabled(); await expect(page.getByRole('alert')).toBeVisible();
  96  |   await expect(page.getByLabel('正文', {exact: true})).toBeDisabled();
  97  |   let rows = forum.postsByTitle(title);
  98  |   expect(rows.length === 1 && rows[0]?.author_id === forum.actorIds.contributor && rows[0]?.current_revision === 1).toBe(true);
  99  |   const attempts = forum.httpEvents.filter(event => event.method === 'POST' && event.path === route);
  100 |   expect(attempts.length).toBe(4); expect(new Set(attempts.map(event => event.requestKey)).size).toBe(1);
  101 |   expect(attempts.every(event => typeof event.requestKey === 'string')).toBe(true);
  102 |   await retry.click(); await expect(page.getByRole('status')).toContainText('帖子已发布');
  103 |   rows = forum.postsByTitle(title); expect(rows.length).toBe(1);
  104 |   const final = forum.httpEvents.filter(event => event.method === 'POST' && event.path === route);
  105 |   expect(final.length).toBe(5); expect(new Set(final.map(event => event.requestKey)).size).toBe(1);
  106 | });
  107 | 
  108 | test('BI04 logout failure stays unconfirmed and held old response cannot repopulate', async ({page, forum}) => {
  109 |   await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum);
  110 |   const held = forum.faultNext({method: 'GET', path: '/api/v1/spaces'}, 'hold-after');
  111 |   await page.getByRole('button', {name: '空间首页', exact: true}).click(); await held.entered;
  112 |   const failure = forum.faultNext({method: 'DELETE', path: '/auth/session'}, 'fail-before');
  113 |   await page.getByRole('button', {name: '退出登录', exact: true}).click(); await failure.entered;
  114 |   const retry = page.getByRole('button', {name: '重试退出', exact: true});
  115 |   await expect(retry).toBeEnabled(); await expect(page.getByRole('status')).toContainText('退出尚未确认');
  116 |   expect(await status(page, '/auth/session')).toBe(200);
  117 |   held.release();
  118 |   await expect(page.locator('.workspace')).toHaveCount(0);
  119 |   await expect(page.getByRole('button', {name: '发布笔记', exact: true})).toHaveCount(0);
  120 |   await retry.click(); await expect(page.getByRole('status')).toContainText('已退出登录');
  121 |   expect(await status(page, '/auth/session')).toBe(401);
  122 |   expect(await page.evaluate(() => document.cookie === '' && localStorage.length === 0 && sessionStorage.length === 0 && (document.querySelector('#token') as HTMLInputElement)?.value === '')).toBe(true);
  123 |   await expect(page.locator('.workspace')).toHaveCount(0);
  124 | });
  125 | 
  126 | test('BI05 UTF-8 fixed pagination, newer revision and historical 1MiB degradation', async ({page, forum}) => {
  127 |   const historical = await forum.seedSyntheticLargeNote('Historical UTF-8 material');
  128 |   const oldBody = '研"\\'.repeat(12000); // 60,000 UTF-8 bytes, larger JSON representation spans pages.
  129 |   const legal = await forum.seedNote({title: 'Legal multi-page note', body: oldBody});
  130 |   let continuous = true, fixed = true, observedBytes = 0, pages = 0;
  131 |   page.on('response', async response => {
  132 |     if (!response.url().includes(`/posts/${historical.id}/revisions/1/content`) || response.status() !== 200) return;
  133 |     try {
  134 |       const value = await response.json(); const chunk = value.data;
  135 |       continuous &&= chunk.start_byte === observedBytes && new TextEncoder().encode(chunk.chunk).byteLength === chunk.end_byte - chunk.start_byte;
  136 |       fixed &&= chunk.ref.post_id === historical.id && chunk.ref.revision === 1;
  137 |       observedBytes = chunk.end_byte; pages += 1;
  138 |     } catch {continuous = false;}
  139 |   });
  140 |   await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum); await open(page, legal.id);
  141 |   await expect(page.locator('.reading article')).toHaveCount(0);
  142 |   await expect(page.getByRole('button', {name: '继续加载正文', exact: true})).toBeEnabled();
  143 |   await forum.revisePost(legal, {body: 'New revision body.'});
  144 |   await page.getByRole('button', {name: '继续加载正文', exact: true}).click();
> 145 |   await expect(page.locator('.body-text')).toBeVisible();
      |                                            ^ Error: expect(locator).toBeVisible() failed
  146 |   expect(await page.locator('.body-text').evaluate((element, body) => element.textContent === body, oldBody)).toBe(true);
  147 |   await expect(page.getByText('已有更新修订；这里仍显示所选固定版本。', {exact: true})).toBeVisible();
  148 |   await open(page, historical.id);
  149 |   for (let index = 0; index < 32 && !(await page.getByText(/已超过本地 1 MiB/).count()); index++) {
  150 |     await page.getByRole('button', {name: '继续加载正文', exact: true}).click();
  151 |     await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
  152 |   }
  153 |   await expect(page.getByText(/已超过本地 1 MiB/)).toBeVisible();
  154 |   await expect(page.locator('.reading article')).toHaveCount(0);
  155 |   expect(observedBytes > 1048576 && pages > 1 && continuous && fixed).toBe(true);
  156 |   await expect(page.locator('.reading pre')).toHaveCount(1);
  157 |   await page.getByRole('button', {name: '从首段重开', exact: true}).click();
  158 |   await expect(page.getByText(/已超过本地 1 MiB/)).toHaveCount(0);
  159 |   await expect(page.locator('.reading article')).toHaveCount(0);
  160 |   await expect(page.getByRole('button', {name: '继续加载正文', exact: true})).toBeEnabled();
  161 | });
  162 | 
```