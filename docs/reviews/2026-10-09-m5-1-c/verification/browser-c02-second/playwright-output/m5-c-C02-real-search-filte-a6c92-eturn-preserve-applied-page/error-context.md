# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-c.spec.ts >> C02 real search filters/cursor, fixed old result and return preserve applied page
- Location: scripts/integrations/web/m5-c.spec.ts:56:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
      - generic [ref=e15]: 搜索结果已加载。
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
        - navigation "空间页面" [ref=e35]:
          - button "讨论" [ref=e36] [cursor=pointer]
          - button "搜索" [ref=e37] [cursor=pointer]
          - button "失败报告" [ref=e38] [cursor=pointer]
        - region [ref=e39]:
          - heading "空间内搜索" [level=2] [ref=e40]
          - generic [ref=e41]:
            - generic [ref=e42]: 搜索关键词
            - textbox "搜索关键词" [ref=e43]: Quasar
            - generic [ref=e44]:
              - generic [ref=e45]:
                - text: 帖子类型
                - combobox "帖子类型" [ref=e46]:
                  - option "全部类型"
                  - option "note" [selected]
                  - option "question"
                  - option "proposal"
                  - option "claim"
                  - option "objection"
                  - option "failure"
                  - option "summary"
                  - option "review"
                  - option "decision"
              - generic [ref=e47]:
                - generic [ref=e48]: 限定主题 ID
                - textbox "限定主题 ID" [ref=e49]: thd_a1fc0dd9-f572-47d8-b9a6-c4ea531fc0fb
            - generic [ref=e50]: 标签（每行一个）
            - textbox "标签（每行一个）" [ref=e51]: science fixed
            - button "搜索" [ref=e52] [cursor=pointer]
          - list [ref=e53]:
            - listitem [ref=e54]:
              - heading "Quasar target 13" [level=3] [ref=e55]
              - paragraph [ref=e56]: Private browser fixture
              - generic [ref=e57]: <b>Quasar</b> target 13
              - paragraph [ref=e58]: note · 帖子 pst_1af02818-7be6-4843-a82a-8adaf7d3cfe6 · 修订 1 · 主题 thd_a1fc0dd9-f572-47d8-b9a6-c4ea531fc0fb
              - paragraph [ref=e59]: 标签：science · fixed
              - button "查看搜索修订 1" [ref=e60] [cursor=pointer]
            - listitem [ref=e61]:
              - heading "Quasar target 20" [level=3] [ref=e62]
              - paragraph [ref=e63]: Private browser fixture
              - generic [ref=e64]: <b>Quasar</b> target 20
              - paragraph [ref=e65]: note · 帖子 pst_0b529fe8-0030-4632-8a3c-e5c1d9acd6ae · 修订 1 · 主题 thd_a1fc0dd9-f572-47d8-b9a6-c4ea531fc0fb
              - paragraph [ref=e66]: 标签：science · fixed
              - button "查看搜索修订 1" [ref=e67] [cursor=pointer]
          - button "搜索首页" [ref=e69] [cursor=pointer]
  - contentinfo [ref=e70]: 独立协作论坛 · 正式评审尚未启用
```

# Test source

```ts
  1   | import {test, expect, type ForumFixture} from './fixtures.js';
  2   | import type {Page} from '@playwright/test';
  3   | 
  4   | async function selectSpace(page: Page, forum: ForumFixture, alternate = false) {
  5   |   const space = alternate ? forum.alternate : forum.space;
  6   |   await page.getByRole('button', {name: `${space.slug} 进入空间 →`, exact: true}).click();
  7   |   await expect(page.getByRole('status')).toContainText('主题已加载');
  8   | }
  9   | async function searchView(page: Page) {
  10  |   await page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '搜索', exact: true}).click();
  11  |   await expect(page.getByRole('heading', {name: '空间内搜索', exact: true})).toBeVisible();
  12  | }
  13  | async function submit(page: Page, forum: ForumFixture) {
  14  |   const response = page.waitForResponse(value => new URL(value.url()).pathname === `/api/v1/spaces/${forum.space.id}/search` && value.request().method() === 'GET');
  15  |   await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click();
  16  |   const result = await response; expect(result.status()).toBe(200);
  17  |   await expect(page.getByRole('status')).toContainText('搜索结果已加载');
  18  |   return result.json();
  19  | }
  20  | const failureMaterial = (evidence?: {post_id: string; revision: number}) => ({attempt: 'Bounded attempt', category: 'test_failure', assumptions: ['Private conditions'], tested_scope: 'Only private fixture', expected: 'Expected result', observed: 'Observed result', evidence_refs: evidence ? [{kind: 'post', ...evidence}] : [], evidence_state: evidence ? 'provided' : 'unverified', ...(evidence ? {} : {evidence_missing_reason: 'No independent evidence'}), ruled_out: 'One exact condition', not_ruled_out: ['Other variants'], retry_when: ['New evidence']});
  21  | 
  22  | test('C01 atomic thread with optional first note and lost committed response keeps one intent', async ({page, forum}) => {
  23  |   await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  24  |   await page.getByRole('button', {name: '新建主题', exact: true}).click();
  25  |   await page.getByLabel('主题标题', {exact: true}).fill('Empty ordinary thread');
  26  |   const initial = forum.businessCounts();
  27  |   await page.getByRole('button', {name: '创建主题', exact: true}).click();
  28  |   await expect(page.getByRole('status')).toContainText('主题已创建');
  29  |   expect(forum.threadsByTitle('Empty ordinary thread').length).toBe(1);
  30  |   expect(forum.businessCounts().threads).toBe(initial.threads! + 1);
  31  |   expect(forum.businessCounts().posts).toBe(initial.posts);
  32  |   await page.getByRole('button', {name: '新建主题', exact: true}).click();
  33  |   await page.getByLabel('主题标题', {exact: true}).fill('Recovered atomic thread');
  34  |   await page.getByLabel('同时发布首帖', {exact: true}).check();
  35  |   await page.getByLabel('首帖标题', {exact: true}).fill('Recovered atomic first note');
  36  |   await page.getByLabel('首帖摘要', {exact: true}).fill('One transaction');
  37  |   await page.getByLabel('首帖正文', {exact: true}).fill('Atomic ordinary human body.');
  38  |   const route = `/api/v1/spaces/${forum.space.id}/threads`, start = forum.httpEvents.length;
  39  |   const lost = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: route}, 'lose-after-commit'));
  40  |   const before = forum.businessCounts();
  41  |   await page.getByRole('button', {name: '创建主题', exact: true}).click();
  42  |   await Promise.all(lost.map(value => value.entered));
  43  |   const retry = page.getByRole('button', {name: '用同一请求重试创建', exact: true});
  44  |   await expect(retry).toBeEnabled(); await expect(page.getByLabel('首帖正文', {exact: true})).toBeDisabled();
  45  |   const threads = forum.threadsByTitle('Recovered atomic thread'), notes = forum.postsByTitle('Recovered atomic first note');
  46  |   expect(threads.length === 1 && notes.length === 1 && threads[0]?.creator_id === forum.actorIds.contributor && threads[0]?.space_id === forum.space.id && notes[0]?.thread_id === threads[0]?.id && notes[0]?.author_id === forum.actorIds.contributor && notes[0]?.current_revision === 1).toBe(true);
  47  |   expect(forum.businessCounts().threads).toBe(before.threads! + 1); expect(forum.businessCounts().posts).toBe(before.posts! + 1);
  48  |   await retry.click(); await expect(page.getByRole('status')).toContainText('主题已创建');
  49  |   expect(forum.threadsByTitle('Recovered atomic thread').length).toBe(1); expect(forum.postsByTitle('Recovered atomic first note').length).toBe(1);
  50  |   await expect(page.locator('.reading .reference')).toContainText(notes[0]!.id);
  51  |   expect(await page.locator('.body-text').evaluate(element => element.textContent === 'Atomic ordinary human body.')).toBe(true);
  52  |   const attempts = forum.httpEvents.slice(start).filter(value => value.method === 'POST' && value.path === route);
  53  |   expect(attempts.length).toBe(5); expect(attempts.every(value => typeof value.requestKey === 'string') && new Set(attempts.map(value => value.requestKey)).size === 1).toBe(true);
  54  | });
  55  | 
  56  | test('C02 real search filters/cursor, fixed old result and return preserve applied page', async ({page, forum}) => {
  57  |   const other = await forum.seedThread({title: 'Other matching thread'});
  58  |   const targets = new Map<string, {id: string; title: string; revision: number; body: string}>();
  59  |   for (let index = 0; index < 22; index++) {
  60  |     const body = `Quasar original ${index}`;
  61  |     const post = await forum.seedPost({title: `Quasar target ${index}`, body, tags: ['science', 'fixed'], threadId: other.id}); targets.set(post.id, {...post, body});
  62  |   }
  63  |   await forum.seedPost({title: 'Quasar wrong thread', body: 'Quasar excluded', tags: ['science', 'fixed']});
  64  |   await forum.seedPost({title: 'Quasar wrong tags', body: 'Quasar excluded', tags: ['other'], threadId: other.id});
  65  |   await forum.seedPost({title: 'Quasar question', body: 'Quasar question body', tags: ['science', 'fixed'], kind: 'question', threadId: other.id});
  66  |   await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  67  |   await page.getByRole('button', {name: `${forum.thread.title} 开放 · 查看帖子 →`, exact: true}).click();
  68  |   await expect(page.getByRole('button', {name: '帖子首页', exact: true})).toBeEnabled();
  69  |   await searchView(page);
  70  |   await page.getByLabel('搜索关键词', {exact: true}).fill('Quasar');
  71  |   await page.getByRole('combobox', {name: '帖子类型', exact: true}).selectOption('note');
  72  |   await page.getByLabel('限定主题 ID', {exact: true}).fill(other.id);
  73  |   await page.getByLabel('标签（每行一个）', {exact: true}).fill('science\nfixed');
  74  |   const first = await submit(page, forum);
  75  |   expect(first.data.length).toBe(20); expect(typeof first.meta.next_cursor === 'string' && first.meta.next_cursor.length > 0).toBe(true);
  76  |   expect(first.data.every((value: {post_id: string}) => targets.has(value.post_id))).toBe(true);
  77  |   const pending = page.waitForResponse(value => new URL(value.url()).pathname === `/api/v1/spaces/${forum.space.id}/search`);
  78  |   await page.getByRole('button', {name: '下一页搜索结果', exact: true}).click();
  79  |   const second = await (await pending).json(); await expect(page.getByRole('status')).toContainText('搜索结果已加载');
  80  |   expect(second.data.length).toBe(2); expect(second.meta.next_cursor).toBeNull();
  81  |   const request = forum.httpEvents.filter(value => value.path.endsWith('/search')).at(-1)!;
> 82  |   expect(request.query !== undefined && request.query.cursor === first.meta.next_cursor && request.query.q === 'Quasar' && request.query.kind === 'note' && request.query.thread_id === other.id && request.query.tags === 'science,fixed').toBe(true);
      |                                                                                                                                                                                                                                             ^ Error: expect(received).toBe(expected) // Object.is equality
  83  |   const selected = targets.get(second.data[0].post_id)!; await forum.revisePost(selected, {body: 'Revised current body.'});
  84  |   await page.locator('.search-results li').filter({hasText: selected.id}).getByRole('button', {name: '查看搜索修订 1', exact: true}).click();
  85  |   await expect(page.locator('.body-text')).toBeVisible(); expect(await page.locator('.body-text').evaluate((element, body) => element.textContent === body, selected.body)).toBe(true);
  86  |   await expect(page.getByText('已有更新修订；这里仍显示所选固定版本。', {exact: true})).toBeVisible();
  87  |   const count = forum.httpEvents.filter(value => value.path.endsWith('/search')).length;
  88  |   await page.getByRole('button', {name: '进入主题并引用', exact: true}).click();
  89  |   await expect(page.getByLabel('帖子标题', {exact: true})).toBeFocused();
  90  |   await page.getByLabel('帖子标题', {exact: true}).fill('Search fixed old ref citation');
  91  |   await page.getByLabel('摘要', {exact: true}).fill('Correct result thread and fixed revision');
  92  |   await page.getByLabel('正文', {exact: true}).fill('Cites the original selected research version.');
  93  |   await page.getByRole('button', {name: '发布笔记', exact: true}).click();
  94  |   await expect(page.getByRole('status')).toContainText('帖子已发布');
  95  |   const cited = forum.postsByTitle('Search fixed old ref citation');
  96  |   expect(cited.length === 1 && cited[0]?.thread_id === other.id && cited[0]?.thread_id !== forum.thread.id && cited[0]?.author_id === forum.actorIds.contributor).toBe(true);
  97  |   expect(forum.relationsFrom(cited[0]!.id).some(value => value.type === 'cites' && value.target_post_id === selected.id && value.target_revision === 1)).toBe(true);
  98  |   await page.getByRole('button', {name: '返回搜索结果', exact: true}).click();
  99  |   await expect(page.locator('.search-results li')).toHaveCount(2); expect(forum.httpEvents.filter(value => value.path.endsWith('/search')).length).toBe(count);
  100 |   await expect(page.getByLabel('标签（每行一个）', {exact: true})).toHaveValue('science\nfixed');
  101 |   await page.getByLabel('标签（每行一个）', {exact: true}).fill('absent');
  102 |   await expect(page.getByRole('button', {name: '下一页搜索结果', exact: true})).toHaveCount(0);
  103 |   const empty = await submit(page, forum); expect(empty.data.length).toBe(0); expect(forum.httpEvents.filter(value => value.path.endsWith('/search')).at(-1)?.query?.cursor === undefined).toBe(true);
  104 |   await page.getByLabel('标签（每行一个）', {exact: true}).fill('science\nfixed');
  105 |   await page.getByRole('combobox', {name: '帖子类型', exact: true}).selectOption('question');
  106 |   const question = await submit(page, forum); expect(question.data.length === 1 && question.data[0].kind === 'question').toBe(true);
  107 | });
  108 | 
  109 | test('C03 real author failure fields/historical missing values, fifty cap and inert material', async ({page, forum}) => {
  110 |   const historical = await forum.seedHistoricalFailure('Historical missing FailureProbe');
  111 |   const hostile = '<img src="https://invalid.example/failure" onerror="window.failureExecuted=true">';
  112 |   const rich = await forum.seedPost({kind: 'failure', title: hostile, body: 'FailureProbe rich record', structured: {...failureMaterial({post_id: forum.post.id, revision: 1}), observed: hostile}});
  113 |   for (let index = 0; index < 41; index++) await forum.seedPost({kind: 'failure', title: `FailureProbe bounded ${index}`, body: 'FailureProbe filler', structured: failureMaterial()});
  114 |   let remote = false; page.on('request', value => {if (new URL(value.url()).origin !== forum.baseURL) remote = true;});
  115 |   await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  116 |   await page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '失败报告', exact: true}).click();
  117 |   await expect(page.locator('.failure-report')).toHaveCount(43);
  118 |   await expect(page.getByText('最多 50 条的当前视图', {exact: true})).toBeVisible();
  119 |   const partial = page.locator('.failure-report').filter({hasText: historical.id});
  120 |   await expect(partial).toContainText('历史报告缺失字段');
  121 |   await expect(partial.locator('div').filter({has: page.locator('dt').filter({hasText: '实际测试范围'})}).first()).toContainText('未提供');
  122 |   const complete = page.locator('.failure-report').filter({hasText: rich.id});
  123 |   await expect(complete).toContainText('Only private fixture'); await expect(complete).toContainText('Other variants'); await expect(complete).toContainText('New evidence'); await expect(complete).toContainText('作者报告');
  124 |   await expect(complete).toContainText(forum.post.id); await expect(complete.getByRole('button', {name: '查看证据修订 1', exact: true})).toBeEnabled();
  125 |   expect(await complete.getByRole('heading', {name: hostile, exact: true}).count()).toBe(1);
  126 |   expect(await page.locator('.failure-report img,.failure-report script').count()).toBe(0); expect(await page.evaluate(() => !('failureExecuted' in window))).toBe(true); expect(remote).toBe(false);
  127 |   await complete.scrollIntoViewIfNeeded(); await page.screenshot({path: forum.evidencePath('screenshots/c-failure-desktop.png')});
  128 |   for (let index = 0; index < 10; index++) await forum.seedPost({kind: 'failure', title: `FailureProbe extra ${index}`, body: 'FailureProbe extra', structured: failureMaterial()});
  129 |   const next = page.waitForResponse(value => new URL(value.url()).pathname === `/api/v1/spaces/${forum.space.id}/views/failures`);
  130 |   await page.getByRole('button', {name: '刷新失败报告', exact: true}).click(); expect((await (await next).json()).data.length).toBe(50); await expect(page.locator('.failure-report')).toHaveCount(50);
  131 |   await page.getByLabel('失败搜索关键词', {exact: true}).fill('FailureProbe');
  132 |   const search = page.waitForResponse(value => new URL(value.url()).pathname.endsWith('/search'));
  133 |   await page.getByRole('button', {name: '按关键词搜索失败', exact: true}).click(); const result = await (await search).json(); expect(result.data.length === 20 && result.data.every((value: {kind: string}) => value.kind === 'failure')).toBe(true);
  134 | });
  135 | 
  136 | test('C04 pending actual query cannot cross space/logout and withdrawal before authorization rejects', async ({page, forum}) => {
  137 |   await forum.seedNote({title: 'ScopeProbe record', body: 'ScopeProbe old space material'});
  138 |   await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum); await searchView(page);
  139 |   await page.getByLabel('搜索关键词', {exact: true}).fill('ScopeProbe');
  140 |   const route = `/api/v1/spaces/${forum.space.id}/search`;
  141 |   const old = forum.faultNext({method: 'GET', path: route}, 'hold-after');
  142 |   await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click(); await old.entered;
  143 |   await selectSpace(page, forum, true); old.release(); await expect(page.locator('.search-results li')).toHaveCount(0);
  144 |   await expect(page.getByRole('navigation', {name: '当前位置', exact: true})).toContainText(forum.alternate.slug);
  145 |   await selectSpace(page, forum); await searchView(page); await page.getByLabel('搜索关键词', {exact: true}).fill('ScopeProbe');
  146 |   const loggingOut = forum.faultNext({method: 'GET', path: route}, 'hold-after');
  147 |   await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click(); await loggingOut.entered;
  148 |   await page.getByRole('button', {name: '退出登录', exact: true}).click(); await expect(page.getByRole('status')).toContainText('已退出登录'); loggingOut.release(); await expect(page.locator('.workspace')).toHaveCount(0);
  149 |   await forum.login(page); await selectSpace(page, forum); await searchView(page); await page.getByLabel('搜索关键词', {exact: true}).fill('ScopeProbe');
  150 |   const withdrawn = forum.faultNext({method: 'GET', path: route}, 'hold-before');
  151 |   await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click(); await withdrawn.entered;
  152 |   await forum.withdrawMembership('contributor'); withdrawn.release(); await expect(page.getByRole('alert')).toBeVisible();
  153 |   await expect(page.locator('.search-results li')).toHaveCount(0); expect(forum.httpEvents.filter(value => value.path === route).at(-1)?.status).toBe(404);
  154 | });
  155 | 
  156 | test('C05 keyboard/narrow search and finite connection failure recover without false results', async ({page, forum}) => {
  157 |   await forum.seedNote({title: 'KeyboardProbe note', body: 'KeyboardProbe research'});
  158 |   await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  159 |   const navigation = page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '搜索', exact: true}); await navigation.focus(); await page.keyboard.press('Enter');
  160 |   await page.getByLabel('搜索关键词', {exact: true}).fill('KeyboardProbe');
  161 |   const button = page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true});
  162 |   const route = `/api/v1/spaces/${forum.space.id}/search`;
  163 |   const failed = Array.from({length: 4}, () => forum.faultNext({method: 'GET', path: route}, 'fail-before'));
  164 |   await button.focus(); await page.keyboard.press('Enter'); await Promise.all(failed.map(value => value.entered));
  165 |   await expect(page.getByRole('alert')).toBeVisible(); await expect(button).toBeEnabled(); await expect(page.locator('.search-results li')).toHaveCount(0);
  166 |   await submit(page, forum); await expect(page.locator('.search-results li')).toHaveCount(1);
  167 |   await page.screenshot({path: forum.evidencePath('screenshots/c-search-desktop.png')});
  168 |   await page.setViewportSize({width: 390, height: 844}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  169 |   await page.locator('.search-results').scrollIntoViewIfNeeded(); await page.screenshot({path: forum.evidencePath('screenshots/c-search-narrow.png')});
  170 |   const fixed = page.getByRole('button', {name: '查看搜索修订 1', exact: true}); await fixed.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.body-text')).toContainText('KeyboardProbe research');
  171 |   const back = page.getByRole('button', {name: '返回搜索结果', exact: true}); await back.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.search-results li')).toHaveCount(1);
  172 | });
  173 | 
```