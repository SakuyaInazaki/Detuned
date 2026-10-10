import {test, expect, type ForumFixture} from './fixtures.js';
import type {Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

async function discussion(page: Page, forum: ForumFixture) {
  await page.getByRole('button', {name: `${forum.space.slug} 进入空间 →`, exact: true}).click();
  await page.getByRole('button', {name: `${forum.thread.title} 开放 · 查看帖子 →`, exact: true}).click();
  await expect(page.getByRole('button', {name: '帖子首页', exact: true})).toBeEnabled();
}
async function open(page: Page, id: string, revision = 1) {
  await page.locator('.post-directory li').filter({hasText: id}).getByRole('button', {name: `查看修订 ${revision}`, exact: true}).click();
  await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
}
async function draft(page: Page, title: string) {
  await page.getByLabel('帖子标题', {exact: true}).fill(title);
  await page.getByLabel('摘要', {exact: true}).fill('Independent browser note');
  await page.getByLabel('正文', {exact: true}).fill('Actual browser HTTP publication.');
}
async function status(page: Page, route: string) {
  return page.evaluate(async pathname => (await fetch(pathname, {credentials: 'same-origin'})).status, route);
}

test('BI01 real cookie, restoration, plain research text, keyboard and narrow layout', async ({page, context, forum}) => {
  const hostile = '<script>window.detunedResearchExecuted=true</script><img src="https://invalid.example/research" onerror="window.detunedResearchExecuted=true">';
  const post = await forum.seedNote({title: 'Plain research', body: hostile, structured: {sample: hostile}});
  let remoteRequest = false;
  page.on('request', request => {if (new URL(request.url()).origin !== forum.baseURL) remoteRequest = true;});
  const response = await page.goto(forum.baseURL);
  expect(response?.headers()['content-security-policy']?.includes("script-src 'self'")).toBe(true);
  await forum.login(page);
  const cookies = await context.cookies(forum.baseURL);
  // Never expose cookie values, private login input, CSRF or full storage snapshots in assertion diffs.
  expect(cookies.length === 1 && cookies.every(cookie => cookie.httpOnly && cookie.sameSite === 'Strict' && cookie.path === '/' && !cookie.secure)).toBe(true);
  expect(await page.evaluate(() => document.cookie === '' && localStorage.length === 0 && sessionStorage.length === 0)).toBe(true);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('已恢复登录');
  const space = page.getByRole('button', {name: `${forum.space.slug} 进入空间 →`, exact: true});
  await space.focus(); await page.keyboard.press('Enter');
  const filter = page.getByRole('combobox', {name: '主题状态', exact: true});
  await filter.selectOption('archived');
  await expect(page.getByText('当前页暂无归档主题。', {exact: true})).toBeVisible();
  await filter.selectOption('open');
  const thread = page.getByRole('button', {name: `${forum.thread.title} 开放 · 查看帖子 →`, exact: true});
  await thread.focus(); await page.keyboard.press('Enter');
  await open(page, post.id);
  expect(await page.locator('.body-text').evaluate((element, text) => element.textContent === text, hostile)).toBe(true);
  expect(await page.locator('.reading script,.reading img').count()).toBe(0);
  expect(await page.evaluate(() => !('detunedResearchExecuted' in window))).toBe(true);
  expect(remoteRequest).toBe(false);
  const screenshots = forum.evidencePath('screenshots/') + '/';
  await mkdir(screenshots, {recursive: true});
  await page.screenshot({path: screenshots + 'independent-desktop.png', fullPage: true});
  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', {name: '引用回复', exact: true}).focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('帖子标题', {exact: true})).toBeFocused();
  await page.locator('.post-directory button').first().hover();
  const geometry = await page.evaluate(() => {
    const button = document.querySelector('.post-directory button') as HTMLButtonElement; const style = getComputedStyle(button);
    return {headers: document.querySelectorAll('header.topbar').length, heroes: document.querySelectorAll('.intro h1').length, scrollHeight: document.documentElement.scrollHeight, scrollY, readingTop: document.querySelector('.reading')!.getBoundingClientRect().top + scrollY, composerTop: document.querySelector('.composer')!.getBoundingClientRect().top + scrollY, button: {color: style.color, background: style.backgroundColor, opacity: style.opacity, disabled: button.disabled}};
  });
  await page.screenshot({path: screenshots + 'independent-narrow-hover.png'});
  await writeFile(screenshots + 'narrow-dom-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({path: screenshots + 'independent-narrow-top.png'});
  await page.locator('.reading').scrollIntoViewIfNeeded(); await page.screenshot({path: screenshots + 'independent-narrow-reading.png'});
  await page.locator('.composer').scrollIntoViewIfNeeded(); await page.screenshot({path: screenshots + 'independent-narrow-composer.png'});
});

test('BI02 observer write denial, hidden space and immediate membership/credential withdrawal', async ({page, forum}) => {
  await page.goto(forum.baseURL); await forum.login(page, 'observer');
  await expect(page.getByRole('button', {name: new RegExp(forum.hidden.slug)})).toHaveCount(0);
  expect(await status(page, `/api/v1/spaces/${forum.hidden.id}/context`)).toBe(404);
  await discussion(page, forum);
  const before = forum.businessCounts();
  await draft(page, 'Observer must not publish');
  await page.getByRole('button', {name: '发布笔记', exact: true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(forum.postsByTitle('Observer must not publish').length).toBe(0);
  expect(forum.businessCounts()).toEqual(before);
  await page.getByRole('button', {name: '退出登录', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('已退出登录');
  await forum.login(page);
  await discussion(page, forum); await open(page, forum.post.id);
  await forum.withdrawMembership('contributor');
  await page.getByRole('button', {name: '从首段重开', exact: true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await status(page, `/api/v1/spaces/${forum.space.id}/context`)).toBe(404);
  await forum.revokeCredential('contributor');
  expect(await status(page, '/auth/session')).toBe(401);
  await page.getByRole('button', {name: '空间首页', exact: true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(forum.httpEvents.some(event => event.path === '/api/v1/spaces' && event.status === 401)).toBe(true);
});

test('BI03 committed response loss exhausts bounded retries then same intent replays once', async ({page, forum}) => {
  await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum);
  const route = `/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`;
  const faults = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: route}, 'lose-after-commit'));
  const title = 'Response lost but committed';
  await draft(page, title); await page.getByRole('button', {name: '发布笔记', exact: true}).click();
  await Promise.all(faults.map(fault => fault.entered));
  const retry = page.getByRole('button', {name: '用同一请求重试发布', exact: true});
  await expect(retry).toBeEnabled(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('正文', {exact: true})).toBeDisabled();
  let rows = forum.postsByTitle(title);
  expect(rows.length === 1 && rows[0]?.author_id === forum.actorIds.contributor && rows[0]?.current_revision === 1).toBe(true);
  const attempts = forum.httpEvents.filter(event => event.method === 'POST' && event.path === route);
  expect(attempts.length).toBe(4); expect(new Set(attempts.map(event => event.requestKey)).size).toBe(1);
  expect(attempts.every(event => typeof event.requestKey === 'string')).toBe(true);
  await retry.click(); await expect(page.getByRole('status')).toContainText('帖子已发布');
  rows = forum.postsByTitle(title); expect(rows.length).toBe(1);
  const final = forum.httpEvents.filter(event => event.method === 'POST' && event.path === route);
  expect(final.length).toBe(5); expect(new Set(final.map(event => event.requestKey)).size).toBe(1);
});

test('BI04 logout failure stays unconfirmed and held old response cannot repopulate', async ({page, forum}) => {
  await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum);
  const held = forum.faultNext({method: 'GET', path: '/api/v1/spaces'}, 'hold-after');
  await page.getByRole('button', {name: '空间首页', exact: true}).click(); await held.entered;
  const failure = forum.faultNext({method: 'DELETE', path: '/auth/session'}, 'fail-before');
  await page.getByRole('button', {name: '退出登录', exact: true}).click(); await failure.entered;
  const retry = page.getByRole('button', {name: '重试退出', exact: true});
  await expect(retry).toBeEnabled(); await expect(page.getByRole('status')).toContainText('退出尚未确认');
  expect(await status(page, '/auth/session')).toBe(200);
  held.release();
  await expect(page.locator('.workspace')).toHaveCount(0);
  await expect(page.getByRole('button', {name: '发布笔记', exact: true})).toHaveCount(0);
  await retry.click(); await expect(page.getByRole('status')).toContainText('已退出登录');
  expect(await status(page, '/auth/session')).toBe(401);
  expect(await page.evaluate(() => document.cookie === '' && localStorage.length === 0 && sessionStorage.length === 0 && (document.querySelector('#token') as HTMLInputElement)?.value === '')).toBe(true);
  await expect(page.locator('.workspace')).toHaveCount(0);
});

test('BI05 UTF-8 fixed pagination, newer revision and historical 1MiB degradation', async ({page, forum}) => {
  const historical = await forum.seedSyntheticLargeNote('Historical UTF-8 material');
  const oldBody = '研"\\'.repeat(12000); // 60,000 UTF-8 bytes, larger JSON representation spans pages.
  const legal = await forum.seedNote({title: 'Legal multi-page note', body: oldBody});
  let continuous = true, fixed = true, observedBytes = 0, pages = 0;
  page.on('response', async response => {
    if (!new URL(response.url()).pathname.endsWith(`/posts/${historical.id}/revisions/1`) || response.status() !== 200) return;
    try {
      const value = await response.json(); const chunk = value.data;
      continuous &&= chunk.start_byte === observedBytes && new TextEncoder().encode(chunk.chunk).byteLength === chunk.end_byte - chunk.start_byte;
      fixed &&= chunk.ref.post_id === historical.id && chunk.ref.revision === 1;
      observedBytes = chunk.end_byte; pages += 1;
    } catch {continuous = false;}
  });
  await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum); await open(page, legal.id);
  await expect(page.locator('.reading article')).toHaveCount(0);
  await expect(page.getByRole('button', {name: '继续加载正文', exact: true})).toBeEnabled();
  await forum.revisePost(legal, {body: 'New revision body.'});
  for (let index = 0; index < 8 && !(await page.locator('.body-text').count()); index++) {
    await page.getByRole('button', {name: '继续加载正文', exact: true}).click();
    await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
  }
  await expect(page.locator('.body-text')).toBeVisible();
  expect(await page.locator('.body-text').evaluate((element, body) => element.textContent === body, oldBody)).toBe(true);
  await expect(page.getByText('已有更新修订；这里仍显示所选固定版本。', {exact: true})).toBeVisible();
  await open(page, historical.id);
  for (let index = 0; index < 32 && !(await page.getByText(/已超过本地 1 MiB/).count()); index++) {
    await page.getByRole('button', {name: '继续加载正文', exact: true}).click();
    await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
  }
  await expect(page.getByText(/已超过本地 1 MiB/)).toBeVisible();
  await expect(page.locator('.reading article')).toHaveCount(0);
  expect(observedBytes > 1048576 && pages > 1 && continuous && fixed).toBe(true);
  await expect(page.locator('.reading pre')).toHaveCount(1);
  await page.getByRole('button', {name: '从首段重开', exact: true}).click();
  await expect(page.getByText(/已超过本地 1 MiB/)).toHaveCount(0);
  await expect(page.locator('.reading article')).toHaveCount(0);
  await expect(page.getByRole('button', {name: '继续加载正文', exact: true})).toBeEnabled();
});
