# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-e1.spec.ts >> E101 ordinary and empty overview, finite candidates, old pinned reference and narrow keyboard without ACK
- Location: scripts/integrations/web/m5-e1.spec.ts:14:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.reading .body-text')
Expected: "Pinned fixed original body"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('.reading .body-text') with timeout 5000ms
  - waiting for locator('.reading .body-text')

```

```yaml
- banner:
  - text: Detuned协作研究论坛 Browser contributor
  - button "退出登录"
- main:
  - paragraph: 讨论 · 固定版本 · 可追溯引用
  - heading "让研究在讨论中继续" [level=1]
  - paragraph: 阅读当前可见的空间与主题，用笔记回应一个明确版本。正式评审尚未启用。
  - status: 空间概览已加载；材料可能受数量与预算限制。
  - complementary "空间":
    - heading "空间" [level=2]
    - text: 每页 20 项
    - list:
      - listitem:
        - button "alternate-space 进入空间 →"
      - listitem:
        - button "browser-space 进入空间 →" [pressed]
    - button "空间首页"
  - region "讨论内容":
    - navigation "当前位置":
      - text: 空间
      - button "browser-space"
    - navigation "空间页面":
      - button "概览"
      - button "讨论"
      - button "搜索"
      - button "失败报告"
      - button "设置"
    - region "空间概览":
      - heading "空间概览" [level=2]
      - button "刷新空间概览"
      - paragraph: 固定空间修订 2 · 策略修订 2
      - heading "研究目标" [level=3]
      - text: E1 ordinary objective
      - heading "空间规则" [level=3]
      - list:
        - listitem: <script>window.e1ResearchExecuted=true</script><img src="https://invalid.example/e1">
        - listitem: Research rules remain plain text
      - region "固定空间规则":
        - heading "固定空间规则" [level=3]
        - button "读取固定规则"
      - heading "置顶摘要" [level=3]
      - article:
        - heading "Pinned original title" [level=4]
        - text: Pinned original summary
        - paragraph: 帖子 pst_239be3f7-2b6b-4e54-a733-194ab0380e82 · 修订 1
        - paragraph: 已有更新修订；此处仍为置顶的固定版本。
        - button "查看置顶修订 1"
        - heading "摘要来源" [level=5]
        - paragraph: 帖子 pst_7618e0c9-365a-4719-871d-ebe656355464 · 修订 1 · 状态 active · 已有更新修订
        - button "查看来源修订 1"
      - heading "未解决异议" [level=3]
      - paragraph: 最多 10 个候选，仍可能被预算裁剪；不是完整异议索引。
      - article:
        - paragraph: 来源 pst_1b31def7-0e22-45c3-8185-a836c2a6537e 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 4
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_2414d7fe-54ad-4b4c-ac5c-293e9a73723f 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 1
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_3d8c80a3-ca5a-442b-9276-713d9396cc4d 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 11
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_4393665e-7421-4ddc-97c5-775cfa57e968 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 10
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_62c95ba7-1380-4e49-a2f9-e1e3cebc89f0 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 9
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_643f4c61-b662-47bf-a7f9-2b0a045ceaa8 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 2
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_64cdfbfa-1999-4d11-ae7b-78493b42c3e6 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 6
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_6abfbd42-3e99-49b9-ae42-277b0001f8b0 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 0
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_6b0577d6-5771-49b5-9354-2c9f209c4402 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 5
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - article:
        - paragraph: 来源 pst_a053b37c-0141-46ba-a75e-fc6b7008c4bc 修订 1（active） → 目标 pst_7618e0c9-365a-4719-871d-ebe656355464 修订 1（active）
        - heading "问题" [level=4]
        - text: Issue 8
        - heading "影响" [level=4]
        - text: Private impact
        - paragraph: 已有更新修订；此异议仍指向原固定版本。
        - button "查看异议来源修订 1"
      - heading "近期失败作者报告" [level=3]
      - paragraph: 最多 5 个候选，仍可能被预算裁剪。
      - article:
        - heading "E1 failure 1" [level=4]
        - paragraph: 分类：test_failure · 证据：unverified
        - text: 尝试：Private bounded attempt 适用范围：Private fixture only
        - paragraph: 缺失字段：无已报告缺失
        - button "查看失败修订 1"
      - article:
        - heading "E1 failure 3" [level=4]
        - paragraph: 分类：test_failure · 证据：unverified
        - text: 尝试：Private bounded attempt 适用范围：Private fixture only
        - paragraph: 缺失字段：无已报告缺失
        - button "查看失败修订 1"
      - article:
        - heading "E1 failure 2" [level=4]
        - paragraph: 分类：test_failure · 证据：unverified
        - text: 尝试：Private bounded attempt 适用范围：Private fixture only
        - paragraph: 缺失字段：无已报告缺失
        - button "查看失败修订 1"
      - article:
        - heading "E1 failure 5" [level=4]
        - paragraph: 分类：test_failure · 证据：unverified
        - text: 尝试：Private bounded attempt 适用范围：Private fixture only
        - paragraph: 缺失字段：无已报告缺失
        - button "查看失败修订 1"
      - article:
        - heading "E1 failure 0" [level=4]
        - paragraph: 分类：test_failure · 证据：unverified
        - text: 尝试：Private bounded attempt 适用范围：Private fixture only
        - paragraph: 缺失字段：无已报告缺失
        - button "查看失败修订 1"
      - heading "近期活动" [level=3]
      - paragraph: 最多 5 个候选，仍可能被预算裁剪。
      - list:
        - listitem: post.created · pst_89f37ffc-9c55-4928-8ec1-fedc0c41a8b3 · 2026-11-01T00:30:00.000Z
        - listitem: post.created · pst_ef22bf1c-7505-41a8-9932-6237ea8c0413 · 2026-11-01T00:31:00.000Z
        - listitem: post.created · pst_45931d66-e65c-4e40-9bd4-c51a68017258 · 2026-11-01T00:32:00.000Z
        - listitem: post.created · pst_7c6af1a9-8b03-426b-bfac-8702e6727a62 · 2026-11-01T00:33:00.000Z
        - listitem: space.revised · spc_d810cc6f-18e0-4eae-8ce0-b2f2c8b2738b · 2026-11-01T00:34:00.000Z
- contentinfo: 独立协作论坛 · 正式评审尚未启用
```

# Test source

```ts
  1   | import {test,expect,type ForumFixture} from './fixtures.js';
  2   | import type {Page} from '@playwright/test';
  3   | import {writeFile} from 'node:fs/promises';
  4   | async function enter(page:Page,forum:ForumFixture,alternate=false) {
  5   |   const space=alternate?forum.alternate:forum.space;
  6   |   await page.getByRole('button',{name:`${space.slug} 进入空间 →`,exact:true}).click();
  7   |   await expect(page.getByRole('heading',{name:'空间概览',exact:true})).toBeVisible();
  8   |   await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();
  9   | }
  10  | async function navigation(page:Page,name:string) {await page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name,exact:true}).click();}
  11  | const unverifiedFailure={attempt:'Private bounded attempt',category:'test_failure',assumptions:[],tested_scope:'Private fixture only',expected:'Expected result',observed:'Observed result',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'No independent evidence',ruled_out:'No general exclusion',not_ruled_out:['Other variants'],retry_when:['Obtain evidence']};
  12  | const noAutomaticConsumerCalls=(forum:ForumFixture)=>!forum.httpEvents.some(value=>/(?:poll|ack)(?:\/|$)/.test(value.path));
  13  | 
  14  | test('E101 ordinary and empty overview, finite candidates, old pinned reference and narrow keyboard without ACK',async({page,forum})=>{
  15  |   const hostile='<script>window.e1ResearchExecuted=true</script><img src="https://invalid.example/e1">';
  16  |   const summary=await forum.seedPost({kind:'summary',title:'Pinned original title',summary:'Pinned original summary',body:'Pinned fixed original body',structured:{source_refs:[{post_id:forum.post.id,revision:1}]}});
  17  |   await forum.revisePost(summary,{title:'Pinned latest title',body:'Latest summary body is distinct',structured:{source_refs:[{post_id:forum.post.id,revision:1}]}});
  18  |   await forum.revisePost(forum.post,{body:'Source revision two is distinct'});
  19  |   for(let index=0;index<12;index++) await forum.seedPost({kind:'objection',title:`E1 challenge ${index}`,body:'Bounded challenge',structured:{target_ref:{post_id:forum.post.id,revision:1},issue:`Issue ${index}`,impact:'Private impact',evidence_refs:[]},refs:[{type:'challenges',target_ref:{post_id:forum.post.id,revision:1}}]});
  20  |   for(let index=0;index<6;index++) await forum.seedPost({kind:'failure',title:`E1 failure ${index}`,body:'Bounded failure author report',structured:unverifiedFailure});
  21  |   await forum.patchSpace({objective:'E1 ordinary objective',rules:[hostile,'Research rules remain plain text'],pinnedRefs:[{post_id:summary.id,revision:1}]});
  22  |   let remote=false;page.on('request',request=>{if(new URL(request.url()).origin!==forum.baseURL) remote=true;});
  23  |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  24  |   await expect(page.getByText('E1 ordinary objective',{exact:true})).toBeVisible();
  25  |   await expect(page.getByText(hostile,{exact:true})).toBeVisible();
  26  |   expect(await page.evaluate(()=>!('e1ResearchExecuted' in window))).toBe(true);expect(remote).toBe(false);
  27  |   const counts=await page.evaluate(async route=>{const value=await(await fetch(route,{credentials:'same-origin'})).json();return {objections:value.data.blocking_objections.length,failures:value.data.recent_failures.length,activity:value.data.recent_activity.length,truncated:value.meta.truncated,pinned:value.data.pinned_summaries.map((item:{ref:{revision:number};has_newer_revision:boolean;source_refs:Array<{has_newer_revision:boolean}>})=>({revision:item.ref.revision,newer:item.has_newer_revision,source_newer:item.source_refs[0]?.has_newer_revision}))};},`/api/v1/spaces/${forum.space.id}/context?max_bytes=65536`);
  28  |   expect(counts).toMatchObject({objections:10,failures:5,activity:5,pinned:[{revision:1,newer:true,source_newer:true}]});
  29  |   await expect(page.getByText('最多 10 个候选，仍可能被预算裁剪；不是完整异议索引。',{exact:true})).toBeVisible();
  30  |   await expect(page.getByText('最多 5 个候选，仍可能被预算裁剪。',{exact:true})).toHaveCount(2);
  31  |   await expect(page.getByText('已有更新修订；此处仍为置顶的固定版本。',{exact:true})).toBeVisible();
  32  |   await expect(page.getByText('Pinned original title',{exact:true})).toBeVisible();await expect(page.getByText('Pinned latest title',{exact:true})).toHaveCount(0);
  33  |   // Retain a real old discussion thread before returning to overview; unknown context refs must not inherit it.
  34  |   await navigation(page,'讨论');await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  35  |   const overviewNavigation=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'概览',exact:true});await overviewNavigation.focus();await page.keyboard.press('Enter');
  36  |   const pinned=page.getByRole('button',{name:'查看置顶修订 1',exact:true});await pinned.focus();await page.keyboard.press('Enter');
> 37  |   await expect(page.locator('.reading .body-text')).toHaveText('Pinned fixed original body');
      |                                                     ^ Error: expect(locator).toHaveText(expected) failed
  38  |   expect(await page.getByRole('button',{name:'进入主题并引用',exact:true}).count()).toBe(0);
  39  |   const reply=page.getByRole('button',{name:'引用回复',exact:true});expect(await reply.count()===0||await reply.isDisabled()).toBe(true);
  40  |   await page.getByRole('button',{name:'返回空间概览',exact:true}).click();
  41  |   await expect(page.getByRole('heading',{name:'空间概览',exact:true})).toBeVisible();
  42  |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  43  |   expect(forum.httpEvents.filter(value=>value.method==='POST'&&value.path.endsWith('/posts')).length).toBeGreaterThan(0); // seed only; no browser wrong-thread publication
  44  |   const browserPosts=forum.httpEvents.filter(value=>value.method==='POST'&&value.path.endsWith('/posts')&&!value.requestKey?.startsWith('browser-private-seed-'));expect(browserPosts).toEqual([]);
  45  |   await page.getByRole('heading',{name:'空间概览',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  46  |   await page.screenshot({path:forum.evidencePath('screenshots/e1-overview-desktop.png')});
  47  |   await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  48  |   await page.getByRole('heading',{name:'空间概览',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  49  |   await page.screenshot({path:forum.evidencePath('screenshots/e1-overview-narrow.png')});
  50  |   const settingsNavigation=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'设置',exact:true});await settingsNavigation.focus();await page.keyboard.press('Enter');
  51  |   await expect(page.getByRole('button',{name:'刷新本人权限',exact:true})).toBeEnabled();await expect(page.getByText(forum.actorIds.contributor,{exact:false})).toBeVisible();
  52  |   await page.getByRole('heading',{name:'本人权限',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  53  |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:forum.evidencePath('screenshots/e1-settings-narrow.png')});
  54  |   await enter(page,forum,true);await expect(page.getByText('Second private browser space',{exact:true})).toBeVisible();
  55  |   await expect(page.getByText('Pinned original title',{exact:true})).toHaveCount(0);expect(noAutomaticConsumerCalls(forum)).toBe(true);
  56  | });
  57  | 
  58  | test('E102 omitted UTF8 rules read one fixed revision, latest update never switches and historical giant degrades honestly',async({page,forum})=>{
  59  |   const largeRevision=await forum.seedHistoricalLargeRules(forum.alternate.id);
  60  |   const rules=Array.from({length:100},(_,index)=>`${index} ${'研究🧪'.repeat(100)}`);
  61  |   const revision=await forum.patchSpace({objective:'E1 fixed rules objective',rules});
  62  |   let end=0,pages=0,continuous=true,fixed=true;
  63  |   page.on('response',async response=>{
  64  |     if(new URL(response.url()).pathname!==`/api/v1/spaces/${forum.space.id}/revisions/${revision}`||response.status()!==200)return;
  65  |     try{const value=await response.json();const part=value.data;continuous&&=part.start_byte===end&&new TextEncoder().encode(part.chunk).byteLength===part.end_byte-part.start_byte;fixed&&=part.ref.space_id===forum.space.id&&part.ref.revision===revision;end=part.end_byte;pages++;}catch{continuous=false;}
  66  |   });
  67  |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  68  |   await expect(page.getByText(/规则.*预算.*省略|预算.*省略.*规则/)).toBeVisible();
  69  |   await page.getByRole('button',{name:'读取固定规则',exact:true}).click();
  70  |   await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toBeEnabled();
  71  |   await forum.patchSpace({objective:'E1 latest objective distinct',rules:['New rules must not replace old selection']});
  72  |   for(let index=0;index<8&&await page.getByRole('button',{name:'继续加载规则',exact:true}).count();index++){
  73  |     await page.getByRole('button',{name:'继续加载规则',exact:true}).click();await expect(page.getByRole('button',{name:'从首段重开规则',exact:true})).toBeEnabled();
  74  |   }
  75  |   await expect(page.getByText(rules[0]!,{exact:true})).toBeVisible();await expect(page.getByText(rules[99]!,{exact:true})).toBeVisible();
  76  |   await expect(page.getByText('New rules must not replace old selection',{exact:true})).toHaveCount(0);
  77  |   expect(continuous&&fixed&&pages>=2&&end>65536).toBe(true);
  78  |   const requests=forum.httpEvents.filter(value=>value.path===`/api/v1/spaces/${forum.space.id}/revisions/${revision}`);expect(requests.length>=2&&requests[1]?.query?.cursor!==undefined).toBe(true);
  79  |   await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(page.getByText('E1 latest objective distinct',{exact:true})).toBeVisible();await expect(page.getByText(rules[0]!,{exact:true})).toBeVisible();await expect(page.getByText('概览已有不同规则修订；这里仍读取原固定版本，不会自动替换。',{exact:true})).toBeVisible();
  80  |   await enter(page,forum,true);await page.getByRole('button',{name:'读取固定规则',exact:true}).click();
  81  |   for(let index=0;index<32&&!(await page.getByText(/超过.*1 MiB/).count());index++){
  82  |     await page.getByRole('button',{name:'继续加载规则',exact:true}).click();await expect(page.getByRole('button',{name:'从首段重开规则',exact:true})).toBeEnabled();
  83  |   }
  84  |   await expect(page.getByText(/超过.*1 MiB/)).toBeVisible();await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toBeEnabled();
  85  |   expect(forum.httpEvents.filter(value=>value.path===`/api/v1/spaces/${forum.alternate.id}/revisions/${largeRevision}`).length>1).toBe(true);
  86  |   await page.getByRole('button',{name:'从首段重开规则',exact:true}).click();await expect(page.getByText(/超过.*1 MiB/)).toHaveCount(0);
  87  |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  88  | });
  89  | 
  90  | test('E103 settings show actual server identity and permissions, refreshed withdrawal cannot authorize writes',async({page,forum})=>{
  91  |   await page.goto(forum.baseURL);await forum.login(page,'observer');await enter(page,forum);await navigation(page,'设置');
  92  |   await expect(page.getByRole('heading',{name:'本人权限',exact:true})).toBeVisible();
  93  |   await page.getByRole('button',{name:'刷新本人权限',exact:true}).click();
  94  |   const actual=await page.evaluate(async()=>{const value=await(await fetch('/api/v1/me',{credentials:'same-origin'})).json();return {actor:value.data.actor.id,capabilities:value.data.capabilities,allowed:value.data.allowed_space_ids,visible:value.data.visible_spaces};});
  95  |   expect(actual.actor).toBe(forum.actorIds.observer);expect(actual.capabilities).toEqual(['read','write']);expect(actual.allowed).toEqual([forum.space.id]);expect(actual.visible).toEqual([{id:forum.space.id,slug:forum.space.slug,role:'observer'}]);
  96  |   await expect(page.getByText(forum.actorIds.observer,{exact:false})).toBeVisible();await expect(page.getByText('observer',{exact:true})).toBeVisible();
  97  |   const before=forum.businessCounts();await navigation(page,'讨论');await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  98  |   await page.getByLabel('帖子标题',{exact:true}).fill('E1 observer forbidden note');await page.getByLabel('摘要',{exact:true}).fill('Cannot infer write ACL from capability');await page.getByLabel('正文',{exact:true}).fill('Server must deny observer');await page.getByRole('button',{name:'发布笔记',exact:true}).click();
  99  |   await expect(page.getByRole('alert')).toBeVisible();expect(forum.postsByTitle('E1 observer forbidden note')).toEqual([]);expect(forum.businessCounts()).toEqual(before);
  100 |   await navigation(page,'设置');await forum.withdrawMembership('observer');await page.getByRole('button',{name:'刷新本人权限',exact:true}).click();
  101 |   expect(await page.evaluate(async()=>{const value=await(await fetch('/api/v1/me',{credentials:'same-origin'})).json();return value.data.visible_spaces.length===0;})).toBe(true);
  102 |   await expect(page.getByText('当前最多 100 项可见空间列表中没有此空间；不能由此推断完整 ACL。',{exact:true})).toBeVisible();
  103 |   await navigation(page,'概览');await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  104 |   expect(forum.httpEvents.some(value=>value.path===`/api/v1/spaces/${forum.space.id}/context`&&value.status===404)).toBe(true);
  105 |   expect(await page.evaluate(()=>document.cookie===''&&localStorage.length===0&&sessionStorage.length===0)).toBe(true);
  106 |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  107 | });
  108 | 
  109 | test('E104 held context changes space and held fixed rules after logout cannot refill',async({page,forum})=>{
  110 |   const revision=await forum.patchSpace({objective:'E1 old-space sentinel',rules:Array.from({length:100},(_,i)=>`${i} ${'研究🧪'.repeat(100)}`)});
  111 |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  112 |   const context=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/context`},'hold-after');await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await context.entered;
  113 |   await enter(page,forum,true);context.release();await expect(page.getByText('Second private browser space',{exact:true})).toBeVisible();await expect(page.getByText('E1 old-space sentinel',{exact:true})).toHaveCount(0);
  114 |   await enter(page,forum);const rules=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/revisions/${revision}`},'hold-after');await page.getByRole('button',{name:'读取固定规则',exact:true}).click();await rules.entered;
  115 |   await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('status')).toContainText('已退出登录');rules.release();await expect(page.locator('.workspace')).toHaveCount(0);
  116 |   await forum.login(page);await enter(page,forum,true);await expect(page.getByText('E1 old-space sentinel',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toHaveCount(0);
  117 |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  118 |   await writeFile(forum.evidencePath('scope-cancellation.json'),JSON.stringify({late_context_did_not_replace_space:true,late_fixed_rules_did_not_refill_logout:true,fresh_login_request_barrier:true,auto_poll_or_ack:false},null,2));
  119 | });
  120 | 
```