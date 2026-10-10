import {test,expect,type ForumFixture} from './fixtures.js';
import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
async function enter(page:Page,forum:ForumFixture,alternate=false) {
  const space=alternate?forum.alternate:forum.space;
  await page.getByRole('button',{name:`${space.slug} 进入空间 →`,exact:true}).click();
  await expect(page.getByRole('heading',{name:'空间概览',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();
}
async function navigation(page:Page,name:string) {await page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name,exact:true}).click();}
const unverifiedFailure={attempt:'Private bounded attempt',category:'test_failure',assumptions:[],tested_scope:'Private fixture only',expected:'Expected result',observed:'Observed result',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'No independent evidence',ruled_out:'No general exclusion',not_ruled_out:['Other variants'],retry_when:['Obtain evidence']};
const noAutomaticConsumerCalls=(forum:ForumFixture)=>!forum.httpEvents.some(value=>/(?:poll|ack)(?:\/|$)/.test(value.path));

test('E101 ordinary and empty overview, finite candidates, old pinned reference and narrow keyboard without ACK',async({page,forum})=>{
  const hostile='<script>window.e1ResearchExecuted=true</script><img src="https://invalid.example/e1">';
  const summary=await forum.seedPost({kind:'summary',title:'Pinned original title',summary:'Pinned original summary',body:'Pinned fixed original body',structured:{source_refs:[{post_id:forum.post.id,revision:1}]}});
  await forum.revisePost(summary,{title:'Pinned latest title',body:'Latest summary body is distinct',structured:{source_refs:[{post_id:forum.post.id,revision:1}]}});
  await forum.revisePost(forum.post,{body:'Source revision two is distinct'});
  for(let index=0;index<12;index++) await forum.seedPost({kind:'objection',title:`E1 challenge ${index}`,body:'Bounded challenge',structured:{target_ref:{post_id:forum.post.id,revision:1},issue:`Issue ${index}`,impact:'Private impact',evidence_refs:[]},refs:[{type:'challenges',target_ref:{post_id:forum.post.id,revision:1}}]});
  for(let index=0;index<6;index++) await forum.seedPost({kind:'failure',title:`E1 failure ${index}`,body:'Bounded failure author report',structured:unverifiedFailure});
  await forum.patchSpace({objective:'E1 ordinary objective',rules:[hostile,'Research rules remain plain text'],pinnedRefs:[{post_id:summary.id,revision:1}]});
  let remote=false;page.on('request',request=>{if(new URL(request.url()).origin!==forum.baseURL) remote=true;});
  await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  await expect(page.getByText('E1 ordinary objective',{exact:true})).toBeVisible();
  await expect(page.getByText(hostile,{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>!('e1ResearchExecuted' in window))).toBe(true);expect(remote).toBe(false);
  const counts=await page.evaluate(async route=>{const value=await(await fetch(route,{credentials:'same-origin'})).json();return {objections:value.data.blocking_objections.length,failures:value.data.recent_failures.length,activity:value.data.recent_activity.length,truncated:value.meta.truncated,pinned:value.data.pinned_summaries.map((item:{ref:{revision:number};has_newer_revision:boolean;source_refs:Array<{has_newer_revision:boolean}>})=>({revision:item.ref.revision,newer:item.has_newer_revision,source_newer:item.source_refs[0]?.has_newer_revision}))};},`/api/v1/spaces/${forum.space.id}/context?max_bytes=65536`);
  expect(counts).toMatchObject({objections:10,failures:5,activity:5,pinned:[{revision:1,newer:true,source_newer:true}]});
  await expect(page.getByText('最多 10 个候选，仍可能被预算裁剪；不是完整异议索引。',{exact:true})).toBeVisible();
  await expect(page.getByText('最多 5 个候选，仍可能被预算裁剪。',{exact:true})).toHaveCount(2);
  await expect(page.getByText('已有更新修订；此处仍为置顶的固定版本。',{exact:true})).toBeVisible();
  await expect(page.getByText('Pinned original title',{exact:true})).toBeVisible();await expect(page.getByText('Pinned latest title',{exact:true})).toHaveCount(0);
  // Retain a real old discussion thread before returning to overview; unknown context refs must not inherit it.
  await navigation(page,'讨论');await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  const overviewNavigation=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'概览',exact:true});await overviewNavigation.focus();await page.keyboard.press('Enter');
  const pinned=page.getByRole('button',{name:'查看置顶修订 1',exact:true});
  await expect(pinned).toBeEnabled();await pinned.focus();await expect(pinned).toBeFocused();
  const pinnedResponse=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/spaces/${forum.space.id}/posts/${summary.id}/revisions/1`&&response.status()===200);
  await page.keyboard.press('Enter');await pinnedResponse;

  await expect(page.locator('.reading .body-text')).toHaveText('Pinned fixed original body');
  expect(await page.getByRole('button',{name:'进入主题并引用',exact:true}).count()).toBe(0);
  const reply=page.getByRole('button',{name:'引用回复',exact:true});expect(await reply.count()===0||await reply.isDisabled()).toBe(true);
  await page.getByRole('button',{name:'返回空间概览',exact:true}).click();
  await expect(page.getByRole('heading',{name:'空间概览',exact:true})).toBeVisible();
  expect(noAutomaticConsumerCalls(forum)).toBe(true);
  expect(forum.httpEvents.filter(value=>value.method==='POST'&&value.path.endsWith('/posts')).length).toBeGreaterThan(0); // seed only; no browser wrong-thread publication
  const browserPosts=forum.httpEvents.filter(value=>value.method==='POST'&&value.path.endsWith('/posts')&&!value.requestKey?.startsWith('browser-private-seed-'));expect(browserPosts).toEqual([]);
  await page.getByRole('heading',{name:'空间概览',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:forum.evidencePath('screenshots/e1-overview-desktop.png')});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('heading',{name:'空间概览',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:forum.evidencePath('screenshots/e1-overview-narrow.png')});
  const settingsNavigation=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'设置',exact:true});await settingsNavigation.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'刷新本人权限',exact:true})).toBeEnabled();await expect(page.getByText(forum.actorIds.contributor,{exact:false})).toBeVisible();
  await page.getByRole('heading',{name:'本人权限',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:forum.evidencePath('screenshots/e1-settings-narrow.png')});
  await enter(page,forum,true);await expect(page.getByText('Second private browser space',{exact:true})).toBeVisible();
  await expect(page.getByText('Pinned original title',{exact:true})).toHaveCount(0);expect(noAutomaticConsumerCalls(forum)).toBe(true);
});

test('E102 omitted UTF8 rules read one fixed revision, latest update never switches and historical giant degrades honestly',async({page,forum})=>{
  const largeRevision=await forum.seedHistoricalLargeRules(forum.alternate.id);
  const rules=Array.from({length:100},(_,index)=>`${index} ${'研究🧪'.repeat(100)}`);
  const revision=await forum.patchSpace({objective:'E1 fixed rules objective',rules});
  let end=0,pages=0,continuous=true,fixed=true;
  page.on('response',async response=>{
    if(new URL(response.url()).pathname!==`/api/v1/spaces/${forum.space.id}/revisions/${revision}`||response.status()!==200)return;
    try{const value=await response.json();const part=value.data;continuous&&=part.start_byte===end&&new TextEncoder().encode(part.chunk).byteLength===part.end_byte-part.start_byte;fixed&&=part.ref.space_id===forum.space.id&&part.ref.revision===revision;end=part.end_byte;pages++;}catch{continuous=false;}
  });
  await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  await expect(page.getByText(/规则.*预算.*省略|预算.*省略.*规则/)).toBeVisible();
  await page.getByRole('button',{name:'读取固定规则',exact:true}).click();
  await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toBeEnabled();
  await forum.patchSpace({objective:'E1 latest objective distinct',rules:['New rules must not replace old selection']});
  for(let index=0;index<8&&await page.getByRole('button',{name:'继续加载规则',exact:true}).count();index++){
    await page.getByRole('button',{name:'继续加载规则',exact:true}).click();await expect(page.getByRole('button',{name:'从首段重开规则',exact:true})).toBeEnabled();
  }
  await expect(page.getByText(rules[0]!,{exact:true})).toBeVisible();await expect(page.getByText(rules[99]!,{exact:true})).toBeVisible();
  await expect(page.getByText('New rules must not replace old selection',{exact:true})).toHaveCount(0);
  expect(continuous&&fixed&&pages>=2&&end>65536).toBe(true);
  const requests=forum.httpEvents.filter(value=>value.path===`/api/v1/spaces/${forum.space.id}/revisions/${revision}`);expect(requests.length>=2&&requests[1]?.query?.cursor!==undefined).toBe(true);
  await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(page.getByText('E1 latest objective distinct',{exact:true})).toBeVisible();await expect(page.getByText(rules[0]!,{exact:true})).toBeVisible();await expect(page.getByText('概览已有不同规则修订；这里仍读取原固定版本，不会自动替换。',{exact:true})).toBeVisible();
  await enter(page,forum,true);await page.getByRole('button',{name:'读取固定规则',exact:true}).click();
  for(let index=0;index<32&&!(await page.getByText(/超过.*1 MiB/).count());index++){
    await page.getByRole('button',{name:'继续加载规则',exact:true}).click();await expect(page.getByRole('button',{name:'从首段重开规则',exact:true})).toBeEnabled();
  }
  await expect(page.getByText(/超过.*1 MiB/)).toBeVisible();await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toBeEnabled();
  expect(forum.httpEvents.filter(value=>value.path===`/api/v1/spaces/${forum.alternate.id}/revisions/${largeRevision}`).length>1).toBe(true);
  await page.getByRole('button',{name:'从首段重开规则',exact:true}).click();await expect(page.getByText(/超过.*1 MiB/)).toHaveCount(0);
  expect(noAutomaticConsumerCalls(forum)).toBe(true);
});

test('E103 settings show actual server identity and permissions, refreshed withdrawal cannot authorize writes',async({page,forum})=>{
  await page.goto(forum.baseURL);await forum.login(page,'observer');await enter(page,forum);await navigation(page,'设置');
  await expect(page.getByRole('heading',{name:'本人权限',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'刷新本人权限',exact:true}).click();
  const actual=await page.evaluate(async()=>{const value=await(await fetch('/api/v1/me',{credentials:'same-origin'})).json();return {actor:value.data.actor.id,capabilities:value.data.capabilities,allowed:value.data.allowed_space_ids,visible:value.data.visible_spaces};});
  expect(actual.actor).toBe(forum.actorIds.observer);expect(actual.capabilities).toEqual(['read','write']);expect(actual.allowed).toEqual([forum.space.id]);expect(actual.visible).toEqual([{id:forum.space.id,slug:forum.space.slug,role:'observer'}]);
  await expect(page.getByText(forum.actorIds.observer,{exact:false})).toBeVisible();await expect(page.getByText('observer',{exact:true})).toBeVisible();
  const before=forum.businessCounts();await navigation(page,'讨论');await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  await page.getByLabel('帖子标题',{exact:true}).fill('E1 observer forbidden note');await page.getByLabel('摘要',{exact:true}).fill('Cannot infer write ACL from capability');await page.getByLabel('正文',{exact:true}).fill('Server must deny observer');await page.getByRole('button',{name:'发布笔记',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();expect(forum.postsByTitle('E1 observer forbidden note')).toEqual([]);expect(forum.businessCounts()).toEqual(before);
  await navigation(page,'设置');await forum.withdrawMembership('observer');await page.getByRole('button',{name:'刷新本人权限',exact:true}).click();
  expect(await page.evaluate(async()=>{const value=await(await fetch('/api/v1/me',{credentials:'same-origin'})).json();return value.data.visible_spaces.length===0;})).toBe(true);
  await expect(page.getByText('当前最多 100 项可见空间列表中没有此空间；不能由此推断完整 ACL。',{exact:true})).toBeVisible();
  await navigation(page,'概览');await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  expect(forum.httpEvents.some(value=>value.path===`/api/v1/spaces/${forum.space.id}/context`&&value.status===404)).toBe(true);
  expect(await page.evaluate(()=>document.cookie===''&&localStorage.length===0&&sessionStorage.length===0)).toBe(true);
  expect(noAutomaticConsumerCalls(forum)).toBe(true);
});

test('E104 held context changes space and held fixed rules after logout cannot refill',async({page,forum})=>{
  const revision=await forum.patchSpace({objective:'E1 old-space sentinel',rules:Array.from({length:100},(_,i)=>`${i} ${'研究🧪'.repeat(100)}`)});
  await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  const context=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/context`},'hold-after');await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await context.entered;
  await enter(page,forum,true);context.release();await expect(page.getByText('Second private browser space',{exact:true})).toBeVisible();await expect(page.getByText('E1 old-space sentinel',{exact:true})).toHaveCount(0);
  await enter(page,forum);const rules=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/revisions/${revision}`},'hold-after');await page.getByRole('button',{name:'读取固定规则',exact:true}).click();await rules.entered;
  await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('status')).toContainText('已退出登录');rules.release();await expect(page.locator('.workspace')).toHaveCount(0);
  await forum.login(page);await enter(page,forum,true);await expect(page.getByText('E1 old-space sentinel',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toHaveCount(0);
  expect(noAutomaticConsumerCalls(forum)).toBe(true);
  await writeFile(forum.evidencePath('scope-cancellation.json'),JSON.stringify({late_context_did_not_replace_space:true,late_fixed_rules_did_not_refill_logout:true,fresh_login_request_barrier:true,auto_poll_or_ack:false},null,2));
});
