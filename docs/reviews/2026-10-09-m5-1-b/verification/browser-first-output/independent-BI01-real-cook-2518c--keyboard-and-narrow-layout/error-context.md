# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent.spec.ts >> BI01 real cookie, restoration, plain research text, keyboard and narrow layout
- Location: scripts/integrations/web/independent.spec.ts:24:1

# Error details

```
TimeoutError: locator.focus: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'browser-space进入空间 →', exact: true })

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]: Detuned协作研究论坛
    - generic [ref=f1e6]:
      - generic [ref=f1e7]: Browser contributor
      - button "退出登录" [ref=f1e8] [cursor=pointer]
  - main [ref=f1e9]:
    - generic [ref=f1e10]:
      - paragraph [ref=f1e11]: 讨论 · 固定版本 · 可追溯引用
      - heading "让研究在讨论中继续" [level=1] [ref=f1e12]
      - paragraph [ref=f1e13]: 阅读当前可见的空间与主题，用笔记回应一个明确版本。正式评审尚未启用。
    - status [ref=f1e14]:
      - generic [ref=f1e15]: 已恢复登录。
    - generic [ref=f1e16]:
      - complementary [ref=f1e17]:
        - generic [ref=f1e18]:
          - heading "空间" [level=2] [ref=f1e19]
          - generic [ref=f1e20]: 每页 20 项
        - list [ref=f1e21]:
          - listitem [ref=f1e22]:
            - button "browser-space 进入空间 →" [ref=f1e23] [cursor=pointer]:
              - text: browser-space
              - generic [ref=f1e24]: 进入空间 →
        - button "空间首页" [ref=f1e26] [cursor=pointer]
      - region "讨论内容" [ref=f1e27]:
        - navigation "当前位置" [ref=f1e28]:
          - generic [ref=f1e29]: 空间
        - generic [ref=f1e30]:
          - heading "选择一个空间" [level=2] [ref=f1e31]
          - paragraph [ref=f1e32]: 这里仅显示当前身份可见的研究。论坛文本不会作为程序执行。
  - contentinfo [ref=f1e33]: 独立协作论坛 · 不自动确认事件 · 正式评审尚未启用
```

# Test source

```ts
  1   | import {test, expect, type ForumFixture} from './fixtures.js';
  2   | import type {Page} from '@playwright/test';
  3   | import {mkdir} from 'node:fs/promises';
  4   | import {fileURLToPath} from 'node:url';
  5   | 
  6   | async function discussion(page: Page, forum: ForumFixture) {
  7   |   await page.getByRole('button', {name: `${forum.space.slug}进入空间 →`, exact: true}).click();
  8   |   await page.getByRole('button', {name: `${forum.thread.title}开放 · 查看帖子 →`, exact: true}).click();
  9   |   await expect(page.getByRole('button', {name: '帖子首页', exact: true})).toBeEnabled();
  10  | }
  11  | async function open(page: Page, id: string, revision = 1) {
  12  |   await page.locator('.post-directory li').filter({hasText: id}).getByRole('button', {name: `查看修订 ${revision}`, exact: true}).click();
  13  |   await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
  14  | }
  15  | async function draft(page: Page, title: string) {
  16  |   await page.getByLabel('帖子标题', {exact: true}).fill(title);
  17  |   await page.getByLabel('摘要', {exact: true}).fill('Independent browser note');
  18  |   await page.getByLabel('正文', {exact: true}).fill('Actual browser HTTP publication.');
  19  | }
  20  | async function status(page: Page, route: string) {
  21  |   return page.evaluate(async pathname => (await fetch(pathname, {credentials: 'same-origin'})).status, route);
  22  | }
  23  | 
  24  | test('BI01 real cookie, restoration, plain research text, keyboard and narrow layout', async ({page, context, forum}) => {
  25  |   const hostile = '<script>window.detunedResearchExecuted=true</script><img src="https://invalid.example/research" onerror="window.detunedResearchExecuted=true">';
  26  |   const post = await forum.seedNote({title: 'Plain research', body: hostile, structured: {sample: hostile}});
  27  |   let remoteRequest = false;
  28  |   page.on('request', request => {if (new URL(request.url()).origin !== forum.baseURL) remoteRequest = true;});
  29  |   const response = await page.goto(forum.baseURL);
  30  |   expect(response?.headers()['content-security-policy']?.includes("script-src 'self'")).toBe(true);
  31  |   await forum.login(page);
  32  |   const cookies = await context.cookies(forum.baseURL);
  33  |   // Never expose cookie values, private login input, CSRF or full storage snapshots in assertion diffs.
  34  |   expect(cookies.length === 1 && cookies.every(cookie => cookie.httpOnly && cookie.sameSite === 'Strict' && cookie.path === '/' && !cookie.secure)).toBe(true);
  35  |   expect(await page.evaluate(() => document.cookie === '' && localStorage.length === 0 && sessionStorage.length === 0)).toBe(true);
  36  |   await page.reload();
  37  |   await expect(page.getByRole('status')).toContainText('已恢复登录');
  38  |   const space = page.getByRole('button', {name: `${forum.space.slug}进入空间 →`, exact: true});
> 39  |   await space.focus(); await page.keyboard.press('Enter');
      |               ^ TimeoutError: locator.focus: Timeout 5000ms exceeded.
  40  |   const filter = page.getByLabel('主题状态', {exact: true});
  41  |   await filter.focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
  42  |   await expect(page.getByText('当前页暂无归档主题。', {exact: true})).toBeVisible();
  43  |   await filter.focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  44  |   const thread = page.getByRole('button', {name: `${forum.thread.title}开放 · 查看帖子 →`, exact: true});
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
```