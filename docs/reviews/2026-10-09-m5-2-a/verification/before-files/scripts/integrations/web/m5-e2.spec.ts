import {test,expect,type ForumFixture} from './fixtures.js';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

async function enter(page:Page,forum:ForumFixture) {
  await page.getByRole('button',{name:`${forum.space.slug} 进入空间 →`,exact:true}).click();
  await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();
  const discussion=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'讨论',exact:true});
  await discussion.focus();await expect(discussion).toBeFocused();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  await expect(page.getByRole('button',{name:'帖子首页',exact:true})).toBeEnabled();
}
async function open(page:Page,id:string,revision=1) {
  const item=page.locator('.post-directory li').filter({hasText:id});
  const response=page.waitForResponse(value=>new URL(value.url()).pathname.endsWith(`/posts/${id}/revisions/${revision}`)&&value.status()===200);
  await item.getByRole('button',{name:`查看修订 ${revision}`,exact:true}).click();
  await response;await expect(page.getByRole('button',{name:'从首段重开',exact:true})).toBeEnabled();
  for(let i=0;i<12&&!(await page.getByRole('region',{name:'正文内容',exact:true}).count());i++){
    const more=page.getByRole('button',{name:'继续加载正文',exact:true});
    if(!await more.count())break;
    await more.click();await expect(page.getByRole('button',{name:'从首段重开',exact:true})).toBeEnabled();
  }
  await expect(page.getByRole('region',{name:'正文内容',exact:true})).toBeVisible();
}
async function viewport(page:Page,forum:ForumFixture,name:string,narrow=false) {
  if(narrow)await page.setViewportSize({width:390,height:844});
  await page.getByRole('region',{name:'正文内容',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:forum.evidencePath(`screenshots/${name}.png`)});
}

test('E201 actual server time order spans pages, historical unknown remains last and old revision stays fixed',async({page,forum})=>{
  const posts=[forum.post];for(let i=0;i<26;i++)posts.push(await forum.seedNote({title:`E2 time ${i}`,body:`Actual chronological body ${i}`}));
  const sorted=[...posts].sort((a,b)=>a.id.localeCompare(b.id));
  const entries=sorted.map((p,i)=>({id:p.id,createdAt:i===26?'Historical unknown time':i<2?'2026-01-01T00:00:00.000Z':`2025-12-${String(31-i).padStart(2,'0')}T00:00:00.000Z`}));
  forum.setHistoricalPostTimes(entries);
  const expected=entries.filter(p=>p.createdAt!=='Historical unknown time').sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).concat(entries.filter(p=>p.createdAt==='Historical unknown time')).map(p=>p.id);
  await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  await expect(page.getByText('按创建时间 · 历史未知时间置末',{exact:true})).toBeVisible();
  const first=await page.locator('.post-directory li small').allTextContents();expect(first).toEqual(expected.slice(0,20));
  await page.getByRole('button',{name:'下一页帖子',exact:true}).click();await expect(page.getByRole('button',{name:'帖子首页',exact:true})).toBeEnabled();
  const second=await page.locator('.post-directory li small').allTextContents();expect(second).toEqual(expected.slice(20));
  const requests=forum.httpEvents.filter(e=>e.method==='GET'&&e.path===`/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`);
  expect(requests.every(e=>e.query?.sort==='created_at_asc')).toBe(true);expect(requests.at(-1)?.query?.cursor!==undefined).toBe(true);
  const selected=posts.find(p=>p.id===expected[20])!;await forum.revisePost(selected,{body:'Changed latest body must not replace selected R1'});
  await open(page,selected.id);const region=page.getByRole('region',{name:'正文内容',exact:true});
  const oldBody=selected.id===forum.post.id?'Original fixed research body.':`Actual chronological body ${Number(selected.title.split(' ').at(-1))}`;
  await expect(region.locator('.markdown-rendered')).toHaveText(oldBody);await expect(page.getByText('Changed latest body must not replace selected R1',{exact:true})).toHaveCount(0);await expect(page.getByText('已有更新修订；这里仍显示所选固定版本。',{exact:true})).toBeVisible();
  expect(forum.httpEvents.some(e=>/\/(?:ack|poll)$/.test(e.path))).toBe(false);
});

test('E202 CommonMark is bounded plain research: safe links only, no HTML or remote images, exact keyboard original',async({page,forum})=>{
  const source='# 研究 Markdown\n\n**Strong research** and *emphasis*.\n\n> A quoted research claim.\n\n- First item\n- Second item\n\n```text\n<script>window.e2CodeExecuted=true</script>\n```\n\n[Allowed link](https://example.invalid/research?q=study)\n\n[Credential link](https://user:fiction@example.invalid/private)\n\n[Relative link](/admin/actors)\n\n[Protocol relative](//invalid.example/protocol)\n\n[Script link](javascript:alert(1))\n\n[Data link](data:text/html,fiction)\n\n![Remote research image](https://invalid.example/research.png)\n\n<script>window.e2ResearchExecuted=true</script><iframe src="https://invalid.example/frame"></iframe>';
  const post=await forum.seedNote({title:'E2 Markdown security',body:source});let remote=false;page.on('request',request=>{if(new URL(request.url()).origin!==forum.baseURL)remote=true;});
  await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);await open(page,post.id);
  const region=page.getByRole('region',{name:'正文内容',exact:true});await expect(region.getByRole('heading',{name:'研究 Markdown',exact:true})).toBeVisible();
  expect(await region.locator('script,img,iframe,video,audio,object,embed').count()).toBe(0);
  expect(await page.evaluate(()=>!('e2ResearchExecuted'in window)&&!('e2CodeExecuted'in window))).toBe(true);expect(remote).toBe(false);
  const links=await region.locator('a').evaluateAll(elements=>elements.map(element=>({href:element.getAttribute('href'),target:element.getAttribute('target'),rel:element.getAttribute('rel')})));
  expect(links).toEqual([{href:'https://example.invalid/research?q=study',target:'_blank',rel:'noopener noreferrer'}]);
  const toggle=page.getByRole('button',{name:'正文：显示原文',exact:true});await toggle.focus();await expect(toggle).toBeFocused();await page.keyboard.press('Enter');
  expect(await region.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,source)).toBe(true);
  await page.getByRole('button',{name:'正文：显示 Markdown',exact:true}).click();await expect(region.getByRole('heading',{name:'研究 Markdown',exact:true})).toBeVisible();
  await viewport(page,forum,'e2-markdown-desktop');await viewport(page,forum,'e2-markdown-narrow',true);expect(remote).toBe(false);
});

test('E203 UTF8 exact128KiB/over limit and actual AST exceptions degrade locally then source recovers',async({page,forum})=>{
  const exact='研'.repeat(43690)+'ab',over='研'.repeat(43691),nodes='x\n\n'.repeat(10001),depth='> '.repeat(70)+'Deep rule';
  expect(new TextEncoder().encode(exact).byteLength).toBe(131072);expect(new TextEncoder().encode(over).byteLength).toBe(131073);
  const exactPost=await forum.seedHistoricalBody('E2 exact UTF8 input',exact);const overPost=await forum.seedHistoricalBody('E2 over UTF8 input',over);const nodePost=await forum.seedNote({title:'E2 AST node limit',body:nodes});
  await forum.patchSpace({rules:[depth]});await page.goto(forum.baseURL);await forum.login(page);
  await page.getByRole('button',{name:`${forum.space.slug} 进入空间 →`,exact:true}).click();await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();
  const rule=page.getByRole('region',{name:'空间规则 1内容',exact:true});await expect(rule.getByText('Markdown 降级：结构超过预算或解析/显示未完成，以下保留原文。',{exact:true})).toBeVisible();
  expect(await rule.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,depth)).toBe(true);
  await forum.patchSpace({rules:['# Recovered rule']});await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(rule.getByRole('heading',{name:'Recovered rule',exact:true})).toBeVisible();await expect(rule.getByText(/Markdown 降级/)).toHaveCount(0);
  await page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'讨论',exact:true}).click();await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();await expect(page.getByRole('button',{name:'帖子首页',exact:true})).toBeEnabled();
  await open(page,exactPost.id);let region=page.getByRole('region',{name:'正文内容',exact:true});expect(await region.locator('.markdown-rendered').evaluate((element,text)=>element.textContent===text,exact)).toBe(true);await expect(region.getByText(/Markdown 降级/)).toHaveCount(0);
  await open(page,overPost.id);region=page.getByRole('region',{name:'正文内容',exact:true});await expect(region.getByText('Markdown 降级：超过 128 KiB 输入预算，以下显示原文。',{exact:true})).toBeVisible();expect(await region.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,over)).toBe(true);
  await open(page,nodePost.id);region=page.getByRole('region',{name:'正文内容',exact:true});await expect(region.getByText('Markdown 降级：结构超过预算或解析/显示未完成，以下保留原文。',{exact:true})).toBeVisible();expect(await region.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,nodes)).toBe(true);
  await open(page,forum.post.id);await expect(page.getByRole('region',{name:'正文内容',exact:true}).locator('.markdown-rendered')).toHaveText('Original fixed research body.');await expect(page.getByRole('button',{name:'退出登录',exact:true})).toBeEnabled();
  await writeFile(forum.evidencePath('markdown-budget.json'),JSON.stringify({exact_utf8_bytes:131072,over_utf8_bytes:131073,oversize_body_synthetic_owned_historical_seed:true,production_http_body_limit_65536_bytes_unchanged:true,node_and_depth_legal_http_seed:true,depth70_real_ast_exception:true,over20000_nodes_real_ast_exception:true,local_boundary_preserved_forum:true,same_inline_rule_component_source_recovered:true},null,2));
});

test('E204 held new-sort directory and fixed Markdown body never cross space or logout generation',async({page,forum})=>{
  await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  const order=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`},'hold-after');await page.getByRole('button',{name:'帖子首页',exact:true}).click();await order.entered;
  await page.getByRole('button',{name:`${forum.alternate.slug} 进入空间 →`,exact:true}).click();await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();order.release();await expect(page.locator('.post-directory')).toHaveCount(0);
  await enter(page,forum);const body=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/1`},'hold-after');
  await page.locator('.post-directory li').filter({hasText:forum.post.id}).getByRole('button',{name:'查看修订 1',exact:true}).click();await body.entered;
  await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('status')).toContainText('已退出登录');body.release();await expect(page.locator('.workspace')).toHaveCount(0);
  await forum.login(page);await page.getByRole('button',{name:`${forum.alternate.slug} 进入空间 →`,exact:true}).click();await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();await expect(page.getByRole('region',{name:'正文内容',exact:true})).toHaveCount(0);
  expect(forum.httpEvents.filter(e=>e.path===`/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`).every(e=>e.query?.sort==='created_at_asc')).toBe(true);
});
