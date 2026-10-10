import { test, expect } from './fixtures.js';
import { fileURLToPath } from 'node:url';

test('human reads a fixed revision, publishes a note and cited response, then confirms logout', async ({ page, forum }) => {
  await page.goto(forum.baseURL);
  await forum.login(page);
  await page.getByRole('button', { name: new RegExp(forum.space.slug) }).click();
  await page.getByRole('button', { name: new RegExp(forum.thread.title) }).click();
  const source = page.locator('.post-directory li').filter({ hasText: forum.post.id });
  await source.getByRole('button', { name: '查看修订 1' }).click();
  await expect(page.getByRole('heading', { name: forum.post.title, exact: true })).toBeVisible();
  await expect(page.getByText('固定修订 1', { exact: true })).toBeVisible();

  // These explicit captures contain only private research fixtures, never the login field or session secrets.
  await page.screenshot({ path: fileURLToPath(new URL('../../../docs/reviews/2026-10-09-m5-1-b/author/web/screenshots/desktop.png', import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: fileURLToPath(new URL('../../../docs/reviews/2026-10-09-m5-1-b/author/web/screenshots/narrow.png', import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  const title = 'Human browser note';
  await page.getByLabel('帖子标题', { exact: true }).fill(title);
  await page.getByLabel('摘要', { exact: true }).fill('An isolated ordinary human note.');
  await page.getByLabel('正文', { exact: true }).fill('Plain text from the author browser journey.');
  await page.getByRole('button', { name: '发布笔记', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('帖子已发布');
  const created = await forum.postsByTitle(title);
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({ author_id: forum.actorIds.contributor, space_id: forum.space.id, thread_id: forum.thread.id, current_revision: 1 });

  // The response cites the fixed selected revision, rather than inventing a reply tree.
  await source.getByRole('button', { name: '查看修订 1' }).click();
  await page.getByRole('button', { name: '引用回复', exact: true }).click();
  await page.getByLabel('帖子标题', { exact: true }).fill('Human browser cited response');
  await page.getByLabel('摘要', { exact: true }).fill('Response to the fixed source revision.');
  await page.getByLabel('正文', { exact: true }).fill('This note refers to source revision one.');
  await page.getByRole('button', { name: '发布笔记', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('帖子已发布');
  const cited = await forum.postsByTitle('Human browser cited response');
  expect(cited).toHaveLength(1);
  expect(cited[0]).toMatchObject({ author_id: forum.actorIds.contributor, space_id: forum.space.id, thread_id: forum.thread.id, current_revision: 1 });
  expect(await forum.relationsFrom(cited[0]!.id)).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'cites', target_post_id: forum.post.id, target_revision: 1 })]));

  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已退出登录');
  await expect(page.getByLabel('访问令牌', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '退出登录', exact: true })).toHaveCount(0);
});
