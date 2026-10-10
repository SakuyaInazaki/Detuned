import {test, expect, type ForumFixture} from './fixtures.js';
import type {Page} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

async function discussion(page: Page, forum: ForumFixture) {
  await page.getByRole('button', {name: `${forum.space.slug} 进入空间 →`, exact: true}).click();
  await page.getByRole('button', {name: `${forum.thread.title} 开放 · 查看帖子 →`, exact: true}).click();
  await expect(page.getByRole('button', {name: '帖子首页', exact: true})).toBeEnabled();
}
async function open(page: Page, id: string, revision: number) {
  await page.locator('.post-directory li').filter({hasText: id}).getByRole('button', {name: `查看修订 ${revision}`, exact: true}).click();
  await expect(page.getByRole('button', {name: '从首段重开', exact: true})).toBeEnabled();
}
async function login(page: Page, forum: ForumFixture) {await page.goto(forum.baseURL); await forum.login(page); await discussion(page, forum);}
async function loadArtifacts(page: Page) {
  await page.getByRole('button', {name: '加载附件目录', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('附件目录已加载');
}
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');

test('D201 revision pagination, fixed old reference, five actual fields and honest oversized comparison', async ({page, forum}) => {
  const large = await forum.seedSyntheticLargeNote('D2 synthetic historical large material');
  let revision = await forum.seedPost({title: 'D2 first title', summary: 'First summary', body: '研究🧪 first body', tags: ['first'], structured: {value: 1}});
  for (let i = 2; i <= 24; i++) revision = await forum.revisePost(revision, {title: `D2 title ${i}`, summary: `Summary ${i}`, body: `研究🧪 body ${i}`, tags: [`tag-${i}`], structured: {value: i}});
  await login(page, forum); await open(page, revision.id, 24);
  const catalog = page.getByRole('button', {name: '加载修订目录', exact: true});
  await catalog.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.revision-list li')).toHaveCount(20);
  await page.getByRole('combobox', {name: '比较版本二', exact: true}).selectOption('24');
  await page.getByRole('button', {name: '下一页修订', exact: true}).click();
  await expect(page.locator('.revision-list li')).toHaveCount(4);
  expect(await page.locator('.revision-list strong').allTextContents()).toEqual(['修订 4','修订 3','修订 2','修订 1']);
  await page.getByRole('combobox', {name: '比较版本一', exact: true}).selectOption('1');
  await page.getByRole('button', {name: '比较所选版本', exact: true}).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('region', {name: '五字段比较', exact: true})).toContainText('五字段完整对比');
  await expect(page.locator('.field-comparison')).toHaveCount(5);
  expect(await page.locator('.field-comparison h5').allTextContents()).toEqual(['标题 · 变化','摘要 · 变化','正文 · 变化','标签 · 变化','结构化内容 · 变化']);
  const comparison = page.getByRole('region', {name: '五字段比较', exact: true});
  for (const value of ['D2 first title','D2 title 24','First summary','Summary 24','研究🧪 first body','研究🧪 body 24','first','tag-24','"value":1','"value":24']) await expect(comparison).toContainText(value);
  // Root-requested visual evidence for the completed comparison, distinct from the long directory viewport.
  await comparison.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 20));
  await page.screenshot({path: forum.evidencePath('screenshots/d2-comparison-desktop.png')});
  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await comparison.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 20));
  await page.screenshot({path: forum.evidencePath('screenshots/d2-comparison-narrow.png')});
  await page.setViewportSize({width: 1280, height: 900});
  await page.getByRole('button', {name: '打开修订 1', exact: true}).click();
  await expect(page.locator('.body-text')).toHaveText('研究🧪 first body');
  const next = await forum.revisePost(revision, {title: 'D2 title 25', body: 'Latest body is separate'});
  await catalog.click(); await expect(page.getByText('目录查询时当前修订：25。正文仍保持已选版本。', {exact: true})).toBeVisible();
  await expect(page.locator('.body-text')).toHaveText('研究🧪 first body');
  expect(next.revision).toBe(25);
  const requests = forum.httpEvents.filter(event => event.path.endsWith(`/${revision.id}/revisions/catalog`));
  expect(requests.length >= 3 && requests[1]?.query?.cursor !== undefined).toBe(true);
  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.revision-evidence').scrollIntoViewIfNeeded();
  await page.screenshot({path: forum.evidencePath('screenshots/d2-revisions-narrow.png')});
  await open(page, large.id, 1); await catalog.click();
  await page.getByRole('combobox', {name: '比较版本一', exact: true}).selectOption('1');
  await page.getByRole('combobox', {name: '比较版本二', exact: true}).selectOption('1');
  await page.getByRole('button', {name: '比较所选版本', exact: true}).click();
  await expect(comparison).toContainText('未完成全部对比：正文未完整、超过 1 MiB');
  await expect(page.locator('.field-comparison')).toHaveCount(0);
  await expect(page.getByRole('button', {name: '继续加载正文', exact: true})).toBeEnabled();
});

test('D202 real upload and publish each recover same intent once, exact binding and verified explicit download', async ({page, forum}) => {
  await page.addInitScript(() => {
    const counts = {created: 0, revoked: 0}; Object.assign(window, {detunedBlobCounts: counts});
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = value => {counts.created++; return create(value);};
    URL.revokeObjectURL = value => {counts.revoked++; return revoke(value);};
  });
  const bytes = Buffer.from('<script>window.detunedAttachmentExecuted=true</script>研究🧪\n');
  await login(page, forum); await open(page, forum.post.id, 1);
  await page.getByRole('button', {name: '引用回复', exact: true}).click();
  const uploadPath = `/api/v1/spaces/${forum.space.id}/artifacts`;
  const losses = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: uploadPath}, 'lose-after-commit'));
  await page.getByLabel('选择附件文件', {exact: true}).setInputFiles({name: 'research.html', mimeType: 'text/html', buffer: bytes});
  await page.getByRole('button', {name: '上传所选附件', exact: true}).click();
  await Promise.all(losses.map(value => value.entered));
  const retry = page.getByRole('button', {name: '用同一请求重试上传', exact: true});
  await expect(retry).toBeEnabled(); await expect(page.getByLabel('选择附件文件', {exact: true})).toBeDisabled();
  expect(forum.artifacts().length).toBe(1); expect(forum.artifactsFor(forum.post.id, 1)).toEqual([]);
  await retry.click(); await expect(page.getByRole('status')).toContainText('附件已上传，尚未关联帖子');
  const uploaded = forum.artifacts()[0]!;
  expect(uploaded).toMatchObject({owner_id: forum.actorIds.contributor, space_id: forum.space.id, bytes: bytes.length, sha256: hash(bytes), state: 'ready'});
  const attempts = forum.httpEvents.filter(value => value.method === 'POST' && value.path === uploadPath);
  expect(attempts.length === 5 && attempts.every(value => !!value.requestKey) && new Set(attempts.map(value => value.requestKey)).size === 1).toBe(true);
  await page.getByLabel('选择附件文件', {exact: true}).setInputFiles({name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('Second evidence')});
  await page.getByRole('button', {name: '上传所选附件', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('附件已上传，尚未关联帖子');
  expect(forum.artifacts().length).toBe(2); expect(forum.artifactsFor(forum.post.id, 1)).toEqual([]);
  const postPath = `/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`;
  const postLosses = Array.from({length: 4}, () => forum.faultNext({method: 'POST', path: postPath}, 'lose-after-commit'));
  const title = 'D2 evidence bound once';
  await page.getByLabel('帖子标题', {exact: true}).fill(title);
  await page.getByLabel('摘要', {exact: true}).fill('Evidence and fixed citation in one transaction');
  await page.getByLabel('正文', {exact: true}).fill('Actual uploaded research');
  await page.getByRole('button', {name: '发布笔记', exact: true}).click(); await Promise.all(postLosses.map(value => value.entered));
  await expect(page.getByRole('button', {name: '用同一请求重试发布', exact: true})).toBeEnabled();
  await expect(page.getByLabel('正文', {exact: true})).toBeDisabled();
  const committed = forum.postsByTitle(title); expect(committed.length).toBe(1);
  const postId = committed[0]!.id;
  expect(forum.artifactsFor(postId, 1).map(value => value.artifact_id).sort()).toEqual(forum.artifacts().map(value => value.id).sort());
  expect(forum.relationsFrom(postId)).toEqual([expect.objectContaining({type: 'cites',target_post_id: forum.post.id,target_revision: 1})]);
  await page.getByRole('button', {name: '用同一请求重试发布', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('帖子已发布');
  expect(forum.postsByTitle(title).length).toBe(1); expect(forum.artifacts().length).toBe(2); expect(forum.artifactsFor(postId,1).length).toBe(2);
  const postAttempts = forum.httpEvents.filter(value => value.method === 'POST' && value.path === postPath);
  expect(postAttempts.length === 5 && new Set(postAttempts.map(value => value.requestKey)).size === 1 && postAttempts[0]?.requestKey !== attempts[0]?.requestKey).toBe(true);
  await expect(page.getByLabel('待绑定附件', {exact: true})).toHaveCount(0);
  await open(page, postId, 1); await loadArtifacts(page);
  let downloads = 0; page.on('download', () => downloads++);
  expect(downloads).toBe(0);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', {name: `下载附件 ${uploaded.id}`, exact: true}).click();
  const download = await downloadEvent; const privatePath = await download.path();
  if (!privatePath) throw new Error('Private browser download unavailable.');
  const actual = await readFile(privatePath);
  expect(actual.length === bytes.length && hash(actual) === hash(bytes)).toBe(true);
  expect(download.suggestedFilename()).toBe(`artifact-${uploaded.id}`);
  expect(await page.evaluate(() => !('detunedAttachmentExecuted' in window))).toBe(true);
  const counts = await page.evaluate(() => (window as unknown as {detunedBlobCounts: {created:number;revoked:number}}).detunedBlobCounts);
  expect(counts).toEqual({created: 1, revoked: 1}); expect(downloads).toBe(1);
  await download.delete();
  await writeFile(forum.evidencePath('download-verification.json'), JSON.stringify({bytes: actual.length, sha256: hash(actual), expected_match: true, explicit_downloads: downloads, blob: counts, private_download_deleted: true}, null, 2));
  await page.setViewportSize({width: 390,height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.artifact-list').scrollIntoViewIfNeeded(); await page.screenshot({path: forum.evidencePath('screenshots/d2-artifacts-narrow.png')});
});

test('D203 artifact pagination, exact tombstones and private associations with current ACL', async ({page, forum}) => {
  const ids: string[] = [];
  for (let i = 0; i < 21; i++) ids.push(await forum.seedArtifact({bytes: Buffer.from(`Evidence ${i}`), post: forum.post}));
  const missing = await forum.seedArtifact({bytes: Buffer.from('Missing evidence'), post: forum.post, state: 'missing'});
  const redacted = await forum.seedArtifact({bytes: Buffer.from('Redacted evidence unique residual'), post: forum.post, state: 'redacted'});
  const privateId = await forum.seedArtifact({bytes: Buffer.from('Private evidence'), post: forum.post, visibility: 'review_assignment'});
  const crossId = await forum.seedArtifact({bytes: Buffer.from('Cross space evidence'), post: forum.post, crossSpace: true});
  const residual = forum.artifacts().find(value => value.id === redacted)!.sha256;
  await page.goto(forum.baseURL); await forum.login(page,'observer'); await discussion(page,forum); await open(page,forum.post.id,1);
  await loadArtifacts(page); await expect(page.locator('.artifact-list li')).toHaveCount(20);
  const first = await page.locator('.artifact-list').textContent();
  await page.getByRole('button', {name:'下一页附件',exact:true}).click(); await expect(page.locator('.artifact-list li')).toHaveCount(3);
  const second = await page.locator('.artifact-list').textContent(); const visible = (first ?? '') + (second ?? '');
  expect([...ids,missing,redacted].every(id => visible.includes(id)) && !visible.includes(privateId) && !visible.includes(crossId) && !visible.includes(residual)).toBe(true);
  await expect(page.getByRole('button',{name:`下载附件 ${missing}`,exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:`下载附件 ${redacted}`,exact:true})).toHaveCount(0);
  const wire = await page.evaluate(async route => {
    const items: Array<Record<string,unknown>> = []; let cursor: string|null = null;
    do {const response: Response = await fetch(route + (cursor ? '?cursor='+encodeURIComponent(cursor) : ''), {credentials:'same-origin'}); const value: {data:{artifacts:Array<Record<string,unknown>>};meta:{next_cursor:string|null}} = await response.json(); items.push(...value.data.artifacts); cursor = value.meta.next_cursor;} while(cursor);
    return items;
  }, `/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/1/artifacts`);
  expect(wire.find(value => value.id === redacted)).toEqual({id:redacted,state:'redacted'});
  expect(wire.some(value => value.id === privateId || value.id === crossId)).toBe(false);
  for (const id of [privateId,crossId]) expect(await page.evaluate(async route => (await fetch(route,{credentials:'same-origin'})).status, `/api/v1/spaces/${forum.space.id}/artifacts/${id}`)).toBe(404);
  await forum.withdrawMembership('observer'); await page.getByRole('button',{name:'加载附件目录',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(forum.httpEvents.some(value => value.path.endsWith(`/revisions/1/artifacts`) && value.status === 404)).toBe(true);
});

test('D204 held catalog, comparison, committed upload and download never cross ref space or logout generation', async ({page,forum}) => {
  const artifact = await forum.seedArtifact({bytes: Buffer.from('Late explicit download'),post:forum.post});
  const other = await forum.seedNote({title:'D2 other fixed reader',body:'A separate selected reference'});
  await login(page,forum); await open(page,forum.post.id,1);
  const catalog = forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/catalog`},'hold-after');
  await page.getByRole('button',{name:'加载修订目录',exact:true}).click(); await catalog.entered;
  await page.getByRole('button',{name:`${forum.alternate.slug} 进入空间 →`,exact:true}).click(); catalog.release();
  await expect(page.locator('.revision-list')).toHaveCount(0); await discussion(page,forum); await open(page,forum.post.id,1);
  await page.getByRole('button',{name:'加载修订目录',exact:true}).click(); await expect(page.locator('.revision-list li')).toHaveCount(1);
  await page.getByRole('combobox', {name: '比较版本一',exact:true}).selectOption('1'); await page.getByRole('combobox', {name: '比较版本二',exact:true}).selectOption('1');
  const comparison = forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/1`},'hold-after');
  await page.getByRole('button',{name:'比较所选版本',exact:true}).click(); await comparison.entered;
  await open(page,other.id,1); comparison.release(); await expect(page.locator('.field-comparison')).toHaveCount(0);
  await expect(page.locator('.body-text')).toHaveText('A separate selected reference');
  const upload = forum.faultNext({method:'POST',path:`/api/v1/spaces/${forum.space.id}/artifacts`},'hold-after');
  await page.getByLabel('选择附件文件',{exact:true}).setInputFiles({name:'late.txt',mimeType:'text/plain',buffer:Buffer.from('Late committed upload')});
  await page.getByRole('button',{name:'上传所选附件',exact:true}).click(); await upload.entered;
  expect(forum.artifacts().length).toBe(2);
  await open(page,forum.post.id,1); upload.release(); await expect(page.getByLabel('待绑定附件',{exact:true})).toHaveCount(0);
  expect(forum.artifactsFor(forum.post.id,1).map(value => value.artifact_id)).toEqual([artifact]);
  await loadArtifacts(page);
  let downloaded = false; page.on('download',()=> {downloaded=true;});
  const held = forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/artifacts/${artifact}/content`},'hold-after');
  await page.getByRole('button',{name:`下载附件 ${artifact}`,exact:true}).click(); await held.entered;
  await page.getByRole('button',{name:'退出登录',exact:true}).click(); await expect(page.getByRole('status')).toContainText('已退出登录'); held.release();
  await expect(page.locator('.workspace')).toHaveCount(0); expect(downloaded).toBe(false);
  // A fresh real login/request provides an observable post-release barrier, not a timed sleep.
  await forum.login(page); await discussion(page,forum); expect(downloaded).toBe(false); await expect(page.getByLabel('待绑定附件',{exact:true})).toHaveCount(0);
});
