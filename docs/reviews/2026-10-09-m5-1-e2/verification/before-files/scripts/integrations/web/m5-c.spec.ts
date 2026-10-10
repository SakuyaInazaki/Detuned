import {test, expect, type ForumFixture} from './fixtures.js';
import type {Page} from '@playwright/test';

async function selectSpace(page: Page, forum: ForumFixture, alternate = false) {
  const space = alternate ? forum.alternate : forum.space;
  await page.getByRole('button', {name: `${space.slug} 进入空间 →`, exact: true}).click();
  await page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '讨论', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('主题已加载');
}
async function searchView(page: Page) {
  await page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '搜索', exact: true}).click();
  await expect(page.getByRole('heading', {name: '空间内搜索', exact: true})).toBeVisible();
}
async function submit(page: Page, forum: ForumFixture) {
  const response = page.waitForResponse(value => new URL(value.url()).pathname === `/api/v1/spaces/${forum.space.id}/search` && value.request().method() === 'GET');
  await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click();
  const result = await response; expect(result.status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('搜索结果已加载');
  return result.json();
}
const failureMaterial = (evidence?: {post_id: string; revision: number}) => ({attempt: 'Bounded attempt', category: 'test_failure', assumptions: ['Private conditions'], tested_scope: 'Only private fixture', expected: 'Expected result', observed: 'Observed result', evidence_refs: evidence ? [{kind: 'post', ...evidence}] : [], evidence_state: evidence ? 'provided' : 'unverified', ...(evidence ? {} : {evidence_missing_reason: 'No independent evidence'}), ruled_out: 'One exact condition', not_ruled_out: ['Other variants'], retry_when: ['New evidence']});

test('C01 atomic thread with optional first note and lost committed response keeps one intent', async ({page, forum}) => {
  await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  await page.getByRole('button', {name: '新建主题', exact: true}).click();
  await page.getByLabel('主题标题', {exact: true}).fill('Empty ordinary thread');
  const initial = forum.businessCounts();
  await page.getByRole('button', {name: '创建主题', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('主题已创建');
  expect(forum.threadsByTitle('Empty ordinary thread').length).toBe(1);
  expect(forum.businessCounts().threads).toBe(initial.threads! + 1);
  expect(forum.businessCounts().posts).toBe(initial.posts);
  await page.getByRole('button', {name: '新建主题', exact: true}).click();
  await page.getByLabel('主题标题', {exact: true}).fill('Recovered atomic thread');
  await page.getByLabel('同时发布首帖', {exact: true}).check();
  await page.getByLabel('首帖标题', {exact: true}).fill('Recovered atomic first note');
  await page.getByLabel('首帖摘要', {exact: true}).fill('One transaction');
  await page.getByLabel('首帖正文', {exact: true}).fill('Atomic ordinary human body.');
  const route = `/api/v1/spaces/${forum.space.id}/threads`, start = forum.httpEvents.length;
  const lost = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: route}, 'lose-after-commit'));
  const before = forum.businessCounts();
  await page.getByRole('button', {name: '创建主题', exact: true}).click();
  await Promise.all(lost.map(value => value.entered));
  const retry = page.getByRole('button', {name: '用同一请求重试创建', exact: true});
  await expect(retry).toBeEnabled(); await expect(page.getByLabel('首帖正文', {exact: true})).toBeDisabled();
  const threads = forum.threadsByTitle('Recovered atomic thread'), notes = forum.postsByTitle('Recovered atomic first note');
  expect(threads.length === 1 && notes.length === 1 && threads[0]?.creator_id === forum.actorIds.contributor && threads[0]?.space_id === forum.space.id && notes[0]?.thread_id === threads[0]?.id && notes[0]?.author_id === forum.actorIds.contributor && notes[0]?.current_revision === 1).toBe(true);
  expect(forum.businessCounts().threads).toBe(before.threads! + 1); expect(forum.businessCounts().posts).toBe(before.posts! + 1);
  await retry.click(); await expect(page.getByRole('status')).toContainText('主题已创建');
  expect(forum.threadsByTitle('Recovered atomic thread').length).toBe(1); expect(forum.postsByTitle('Recovered atomic first note').length).toBe(1);
  await expect(page.locator('.reading .reference')).toContainText(notes[0]!.id);
  expect(await page.locator('.body-text').evaluate(element => element.textContent === 'Atomic ordinary human body.')).toBe(true);
  const attempts = forum.httpEvents.slice(start).filter(value => value.method === 'POST' && value.path === route);
  expect(attempts.length).toBe(5); expect(attempts.every(value => typeof value.requestKey === 'string') && new Set(attempts.map(value => value.requestKey)).size === 1).toBe(true);
});

test('C02 real search filters/cursor, fixed old result and return preserve applied page', async ({page, forum}) => {
  const other = await forum.seedThread({title: 'Other matching thread'});
  const targets = new Map<string, {id: string; title: string; revision: number; body: string}>();
  for (let index = 0; index < 22; index++) {
    const body = `Quasar original ${index}`;
    const post = await forum.seedPost({title: `Quasar target ${index}`, body, tags: ['science', 'fixed'], threadId: other.id}); targets.set(post.id, {...post, body});
  }
  await forum.seedPost({title: 'Quasar wrong thread', body: 'Quasar excluded', tags: ['science', 'fixed']});
  await forum.seedPost({title: 'Quasar wrong tags', body: 'Quasar excluded', tags: ['other'], threadId: other.id});
  await forum.seedPost({title: 'Quasar question', body: 'Quasar question body', tags: ['science', 'fixed'], kind: 'question', threadId: other.id});
  await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  await page.getByRole('button', {name: `${forum.thread.title} 开放 · 查看帖子 →`, exact: true}).click();
  await expect(page.getByRole('button', {name: '帖子首页', exact: true})).toBeEnabled();
  await searchView(page);
  await page.getByLabel('搜索关键词', {exact: true}).fill('Quasar');
  await page.getByRole('combobox', {name: '帖子类型', exact: true}).selectOption('note');
  await page.getByLabel('限定主题 ID', {exact: true}).fill(other.id);
  await page.getByLabel('标签（每行一个）', {exact: true}).fill('science\nfixed');
  const first = await submit(page, forum);
  expect(first.data.length).toBe(20); expect(typeof first.meta.next_cursor === 'string' && first.meta.next_cursor.length > 0).toBe(true);
  expect(first.data.every((value: {post_id: string}) => targets.has(value.post_id))).toBe(true);
  const pending = page.waitForResponse(value => new URL(value.url()).pathname === `/api/v1/spaces/${forum.space.id}/search`);
  await page.getByRole('button', {name: '下一页搜索结果', exact: true}).click();
  const second = await (await pending).json(); await expect(page.getByRole('status')).toContainText('搜索结果已加载');
  expect(second.data.length).toBe(2); expect(second.meta.next_cursor).toBeNull();
  const request = forum.httpEvents.filter(value => value.path.endsWith('/search')).at(-1)!;
  expect(request.query !== undefined && request.query.cursor === first.meta.next_cursor && request.query.q === 'Quasar' && request.query.kind === 'note' && request.query.thread_id === other.id && request.query.tags_json === JSON.stringify(['science', 'fixed'])).toBe(true);
  const selected = targets.get(second.data[0].post_id)!; await forum.revisePost(selected, {body: 'Revised current body.'});
  await page.locator('.search-results li').filter({hasText: selected.id}).getByRole('button', {name: '查看搜索修订 1', exact: true}).click();
  await expect(page.locator('.body-text')).toBeVisible(); expect(await page.locator('.body-text').evaluate((element, body) => element.textContent === body, selected.body)).toBe(true);
  await expect(page.getByText('已有更新修订；这里仍显示所选固定版本。', {exact: true})).toBeVisible();
  const count = forum.httpEvents.filter(value => value.path.endsWith('/search')).length;
  await page.getByRole('button', {name: '进入主题并引用', exact: true}).click();
  await expect(page.getByLabel('帖子标题', {exact: true})).toBeFocused();
  await page.getByLabel('帖子标题', {exact: true}).fill('Search fixed old ref citation');
  await page.getByLabel('摘要', {exact: true}).fill('Correct result thread and fixed revision');
  await page.getByLabel('正文', {exact: true}).fill('Cites the original selected research version.');
  await page.getByRole('button', {name: '发布笔记', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('帖子已发布');
  const cited = forum.postsByTitle('Search fixed old ref citation');
  expect(cited.length === 1 && cited[0]?.thread_id === other.id && cited[0]?.thread_id !== forum.thread.id && cited[0]?.author_id === forum.actorIds.contributor).toBe(true);
  expect(forum.relationsFrom(cited[0]!.id).some(value => value.type === 'cites' && value.target_post_id === selected.id && value.target_revision === 1)).toBe(true);
  await page.getByRole('button', {name: '返回搜索结果', exact: true}).click();
  await expect(page.locator('.search-results li')).toHaveCount(2); expect(forum.httpEvents.filter(value => value.path.endsWith('/search')).length).toBe(count);
  await expect(page.getByLabel('标签（每行一个）', {exact: true})).toHaveValue('science\nfixed');
  await page.getByLabel('标签（每行一个）', {exact: true}).fill('absent');
  await expect(page.getByRole('button', {name: '下一页搜索结果', exact: true})).toHaveCount(0);
  const empty = await submit(page, forum); expect(empty.data.length).toBe(0); expect(forum.httpEvents.filter(value => value.path.endsWith('/search')).at(-1)?.query?.cursor === undefined).toBe(true);
  await page.getByLabel('标签（每行一个）', {exact: true}).fill('science\nfixed');
  await page.getByRole('combobox', {name: '帖子类型', exact: true}).selectOption('question');
  const question = await submit(page, forum); expect(question.data.length === 1 && question.data[0].kind === 'question').toBe(true);
});

test('C03 real author failure fields/historical missing values, fifty cap and inert material', async ({page, forum}) => {
  const historical = await forum.seedHistoricalFailure('Historical missing FailureProbe');
  const hostile = '<img src="https://invalid.example/failure" onerror="window.failureExecuted=true">';
  const rich = await forum.seedPost({kind: 'failure', title: hostile, body: 'FailureProbe rich record', structured: {...failureMaterial({post_id: forum.post.id, revision: 1}), observed: hostile}});
  for (let index = 0; index < 41; index++) await forum.seedPost({kind: 'failure', title: `FailureProbe bounded ${index}`, body: 'FailureProbe filler', structured: failureMaterial()});
  let remote = false; page.on('request', value => {if (new URL(value.url()).origin !== forum.baseURL) remote = true;});
  await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  await page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '失败报告', exact: true}).click();
  await expect(page.locator('.failure-report')).toHaveCount(43);
  await expect(page.getByText('最多 50 条的当前视图', {exact: true})).toBeVisible();
  const partial = page.locator('.failure-report').filter({hasText: historical.id});
  await expect(partial).toContainText('历史报告缺失字段');
  await expect(partial.locator('div').filter({has: page.locator('dt').filter({hasText: '实际测试范围'})}).first()).toContainText('未提供');
  const complete = page.locator('.failure-report').filter({hasText: rich.id});
  await expect(complete).toContainText('Only private fixture'); await expect(complete).toContainText('Other variants'); await expect(complete).toContainText('New evidence'); await expect(complete).toContainText('作者报告');
  await expect(complete).toContainText(forum.post.id); await expect(complete.getByRole('button', {name: '查看证据修订 1', exact: true})).toBeEnabled();
  expect(await complete.getByRole('heading', {name: hostile, exact: true}).count()).toBe(1);
  expect(await page.locator('.failure-report img,.failure-report script').count()).toBe(0); expect(await page.evaluate(() => !('failureExecuted' in window))).toBe(true); expect(remote).toBe(false);
  await complete.scrollIntoViewIfNeeded(); await page.screenshot({path: forum.evidencePath('screenshots/c-failure-desktop.png')});
  for (let index = 0; index < 10; index++) await forum.seedPost({kind: 'failure', title: `FailureProbe extra ${index}`, body: 'FailureProbe extra', structured: failureMaterial()});
  const next = page.waitForResponse(value => new URL(value.url()).pathname === `/api/v1/spaces/${forum.space.id}/views/failures`);
  await page.getByRole('button', {name: '刷新失败报告', exact: true}).click(); expect((await (await next).json()).data.length).toBe(50); await expect(page.locator('.failure-report')).toHaveCount(50);
  await page.getByLabel('失败搜索关键词', {exact: true}).fill('FailureProbe');
  const search = page.waitForResponse(value => new URL(value.url()).pathname.endsWith('/search'));
  await page.getByRole('button', {name: '按关键词搜索失败', exact: true}).click(); const result = await (await search).json(); expect(result.data.length === 20 && result.data.every((value: {kind: string}) => value.kind === 'failure')).toBe(true);
});

test('C04 pending actual query cannot cross space/logout and withdrawal before authorization rejects', async ({page, forum}) => {
  await forum.seedNote({title: 'ScopeProbe record', body: 'ScopeProbe old space material'});
  await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum); await searchView(page);
  await page.getByLabel('搜索关键词', {exact: true}).fill('ScopeProbe');
  const route = `/api/v1/spaces/${forum.space.id}/search`;
  const old = forum.faultNext({method: 'GET', path: route}, 'hold-after');
  await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click(); await old.entered;
  await selectSpace(page, forum, true); old.release(); await expect(page.locator('.search-results li')).toHaveCount(0);
  await expect(page.getByRole('navigation', {name: '当前位置', exact: true})).toContainText(forum.alternate.slug);
  await selectSpace(page, forum); await searchView(page); await page.getByLabel('搜索关键词', {exact: true}).fill('ScopeProbe');
  const loggingOut = forum.faultNext({method: 'GET', path: route}, 'hold-after');
  await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click(); await loggingOut.entered;
  await page.getByRole('button', {name: '退出登录', exact: true}).click(); await expect(page.getByRole('status')).toContainText('已退出登录'); loggingOut.release(); await expect(page.locator('.workspace')).toHaveCount(0);
  await forum.login(page); await selectSpace(page, forum); await searchView(page); await page.getByLabel('搜索关键词', {exact: true}).fill('ScopeProbe');
  const withdrawn = forum.faultNext({method: 'GET', path: route}, 'hold-before');
  await page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true}).click(); await withdrawn.entered;
  await forum.withdrawMembership('contributor'); withdrawn.release(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.search-results li')).toHaveCount(0); expect(forum.httpEvents.filter(value => value.path === route).at(-1)?.status).toBe(404);
});

test('C05 keyboard/narrow search and finite connection failure recover without false results', async ({page, forum}) => {
  await forum.seedNote({title: 'KeyboardProbe note', body: 'KeyboardProbe research'});
  await page.goto(forum.baseURL); await forum.login(page); await selectSpace(page, forum);
  const navigation = page.getByRole('navigation', {name: '空间页面', exact: true}).getByRole('button', {name: '搜索', exact: true}); await navigation.focus(); await page.keyboard.press('Enter');
  await page.getByLabel('搜索关键词', {exact: true}).fill('KeyboardProbe');
  const button = page.getByRole('region', {name: '空间内搜索', exact: true}).getByRole('button', {name: '搜索', exact: true});
  const route = `/api/v1/spaces/${forum.space.id}/search`;
  const failed = Array.from({length: 4}, () => forum.faultNext({method: 'GET', path: route}, 'fail-before'));
  await button.focus(); await page.keyboard.press('Enter'); await Promise.all(failed.map(value => value.entered));
  await expect(page.getByRole('alert')).toBeVisible(); await expect(button).toBeEnabled(); await expect(page.locator('.search-results li')).toHaveCount(0);
  await submit(page, forum); await expect(page.locator('.search-results li')).toHaveCount(1);
  await page.screenshot({path: forum.evidencePath('screenshots/c-search-desktop.png')});
  await page.setViewportSize({width: 390, height: 844}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.search-results').scrollIntoViewIfNeeded(); await page.screenshot({path: forum.evidencePath('screenshots/c-search-narrow.png')});
  const fixed = page.getByRole('button', {name: '查看搜索修订 1', exact: true}); await fixed.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.body-text')).toContainText('KeyboardProbe research');
  const back = page.getByRole('button', {name: '返回搜索结果', exact: true}); await back.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.search-results li')).toHaveCount(1);
});
