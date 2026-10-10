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

Locator: locator('.body-text')
Expected: "Pinned fixed original body"
Error: strict mode violation: locator('.body-text') resolved to 3 elements:
    1) <pre class="body-text">E1 ordinary objective</pre> aka getByText('E1 ordinary objective')
    2) <pre class="body-text"><script>window.e1ResearchExecuted=true</script><i…</pre> aka getByText('<script>window.')
    3) <pre class="body-text">Research rules remain plain text</pre> aka getByText('Research rules remain plain')

Call log:
  - Expect "toHaveText" locator('.body-text') with timeout 5000ms
  - waiting for locator('.body-text')

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
      - generic [ref=e15]: 空间概览已加载；材料可能受数量与预算限制。
    - generic [ref=e16]:
      - complementary [ref=e17]:
        - generic [ref=e18]:
          - heading "空间" [level=2] [ref=e19]
          - generic [ref=e20]: 每页 20 项
        - list [ref=e21]:
          - listitem [ref=e22]:
            - button "alternate-space 进入空间 →" [ref=e23] [cursor=pointer]:
              - text: alternate-space
              - generic [ref=e24]: 进入空间 →
          - listitem [ref=e25]:
            - button "browser-space 进入空间 →" [pressed] [ref=e26] [cursor=pointer]:
              - text: browser-space
              - generic [ref=e27]: 进入空间 →
        - button "空间首页" [ref=e29] [cursor=pointer]
      - region "讨论内容" [ref=e30]:
        - navigation "当前位置" [ref=e31]:
          - generic [ref=e32]: 空间
          - generic [aria-hidden] [ref=e33]: /
          - button "browser-space" [ref=e34] [cursor=pointer]
        - navigation "空间页面" [ref=e35]:
          - button "概览" [active] [ref=e36] [cursor=pointer]
          - button "讨论" [ref=e37] [cursor=pointer]
          - button "搜索" [ref=e38] [cursor=pointer]
          - button "失败报告" [ref=e39] [cursor=pointer]
          - button "设置" [ref=e40] [cursor=pointer]
        - region [ref=e41]:
          - generic [ref=e42]:
            - heading "空间概览" [level=2] [ref=e43]
            - button "刷新空间概览" [ref=e44] [cursor=pointer]
          - paragraph [ref=e45]: 固定空间修订 2 · 策略修订 2
          - heading "研究目标" [level=3] [ref=e46]
          - generic [ref=e47]: E1 ordinary objective
          - heading "空间规则" [level=3] [ref=e48]
          - list [ref=e49]:
            - listitem [ref=e50]:
              - generic [ref=e51]: <script>window.e1ResearchExecuted=true</script><img src="https://invalid.example/e1">
            - listitem [ref=e52]:
              - generic [ref=e53]: Research rules remain plain text
          - region [ref=e54]:
            - heading "固定空间规则" [level=3] [ref=e55]
            - button "读取固定规则" [ref=e56] [cursor=pointer]
          - heading "置顶摘要" [level=3] [ref=e57]
          - article [ref=e58]:
            - heading "Pinned original title" [level=4] [ref=e59]
            - generic [ref=e60]: Pinned original summary
            - paragraph [ref=e61]: 帖子 pst_89e73ca9-9d43-412c-bf0e-8fdb4d53f0d2 · 修订 1
            - paragraph [ref=e62]: 已有更新修订；此处仍为置顶的固定版本。
            - button "查看置顶修订 1" [ref=e63] [cursor=pointer]
            - heading "摘要来源" [level=5] [ref=e64]
            - generic [ref=e65]:
              - paragraph [ref=e66]: 帖子 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 · 修订 1 · 状态 active · 已有更新修订
              - button "查看来源修订 1" [ref=e67] [cursor=pointer]
          - heading "未解决异议" [level=3] [ref=e68]
          - paragraph [ref=e69]: 最多 10 个候选，仍可能被预算裁剪；不是完整异议索引。
          - article [ref=e70]:
            - paragraph [ref=e71]: 来源 pst_053905c3-96c9-4dcd-b12f-161ac161e74f 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e72]
            - generic [ref=e73]: Issue 9
            - heading "影响" [level=4] [ref=e74]
            - generic [ref=e75]: Private impact
            - paragraph [ref=e76]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e77] [cursor=pointer]
          - article [ref=e78]:
            - paragraph [ref=e79]: 来源 pst_1b4d3467-5018-46fe-81fb-8ef2a274163b 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e80]
            - generic [ref=e81]: Issue 2
            - heading "影响" [level=4] [ref=e82]
            - generic [ref=e83]: Private impact
            - paragraph [ref=e84]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e85] [cursor=pointer]
          - article [ref=e86]:
            - paragraph [ref=e87]: 来源 pst_3875c845-1b0a-4ff4-adb5-d3ded16baf82 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e88]
            - generic [ref=e89]: Issue 8
            - heading "影响" [level=4] [ref=e90]
            - generic [ref=e91]: Private impact
            - paragraph [ref=e92]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e93] [cursor=pointer]
          - article [ref=e94]:
            - paragraph [ref=e95]: 来源 pst_4a5f933f-fc94-48e9-af89-9ddbf21b4c34 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e96]
            - generic [ref=e97]: Issue 5
            - heading "影响" [level=4] [ref=e98]
            - generic [ref=e99]: Private impact
            - paragraph [ref=e100]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e101] [cursor=pointer]
          - article [ref=e102]:
            - paragraph [ref=e103]: 来源 pst_4db59575-875c-439f-9348-d782a90abec7 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e104]
            - generic [ref=e105]: Issue 1
            - heading "影响" [level=4] [ref=e106]
            - generic [ref=e107]: Private impact
            - paragraph [ref=e108]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e109] [cursor=pointer]
          - article [ref=e110]:
            - paragraph [ref=e111]: 来源 pst_5e738be1-bf9d-4c26-808c-cefa6db36e5a 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e112]
            - generic [ref=e113]: Issue 0
            - heading "影响" [level=4] [ref=e114]
            - generic [ref=e115]: Private impact
            - paragraph [ref=e116]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e117] [cursor=pointer]
          - article [ref=e118]:
            - paragraph [ref=e119]: 来源 pst_70e8c4b2-3472-49a7-bb74-fb131e348795 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e120]
            - generic [ref=e121]: Issue 10
            - heading "影响" [level=4] [ref=e122]
            - generic [ref=e123]: Private impact
            - paragraph [ref=e124]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e125] [cursor=pointer]
          - article [ref=e126]:
            - paragraph [ref=e127]: 来源 pst_8c902627-f09a-4d6f-9c7e-e8c9963fdb26 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e128]
            - generic [ref=e129]: Issue 3
            - heading "影响" [level=4] [ref=e130]
            - generic [ref=e131]: Private impact
            - paragraph [ref=e132]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e133] [cursor=pointer]
          - article [ref=e134]:
            - paragraph [ref=e135]: 来源 pst_90c46504-fbea-4b62-a159-000cb2c487bd 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e136]
            - generic [ref=e137]: Issue 6
            - heading "影响" [level=4] [ref=e138]
            - generic [ref=e139]: Private impact
            - paragraph [ref=e140]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e141] [cursor=pointer]
          - article [ref=e142]:
            - paragraph [ref=e143]: 来源 pst_d61a20d9-02db-4ac2-8f8b-645081da533b 修订 1（active） → 目标 pst_ec116b2f-4b34-4dd8-8039-537144f8b7f0 修订 1（active）
            - heading "问题" [level=4] [ref=e144]
            - generic [ref=e145]: Issue 4
            - heading "影响" [level=4] [ref=e146]
            - generic [ref=e147]: Private impact
            - paragraph [ref=e148]: 已有更新修订；此异议仍指向原固定版本。
            - button "查看异议来源修订 1" [ref=e149] [cursor=pointer]
          - heading "近期失败作者报告" [level=3] [ref=e150]
          - paragraph [ref=e151]: 最多 5 个候选，仍可能被预算裁剪。
          - article [ref=e152]:
            - heading "E1 failure 5" [level=4] [ref=e153]
            - paragraph [ref=e154]: 分类：test_failure · 证据：unverified
            - generic [ref=e155]: 尝试：Private bounded attempt 适用范围：Private fixture only
            - paragraph [ref=e156]: 缺失字段：无已报告缺失
            - button "查看失败修订 1" [ref=e157] [cursor=pointer]
          - article [ref=e158]:
            - heading "E1 failure 3" [level=4] [ref=e159]
            - paragraph [ref=e160]: 分类：test_failure · 证据：unverified
            - generic [ref=e161]: 尝试：Private bounded attempt 适用范围：Private fixture only
            - paragraph [ref=e162]: 缺失字段：无已报告缺失
            - button "查看失败修订 1" [ref=e163] [cursor=pointer]
          - article [ref=e164]:
            - heading "E1 failure 0" [level=4] [ref=e165]
            - paragraph [ref=e166]: 分类：test_failure · 证据：unverified
            - generic [ref=e167]: 尝试：Private bounded attempt 适用范围：Private fixture only
            - paragraph [ref=e168]: 缺失字段：无已报告缺失
            - button "查看失败修订 1" [ref=e169] [cursor=pointer]
          - article [ref=e170]:
            - heading "E1 failure 1" [level=4] [ref=e171]
            - paragraph [ref=e172]: 分类：test_failure · 证据：unverified
            - generic [ref=e173]: 尝试：Private bounded attempt 适用范围：Private fixture only
            - paragraph [ref=e174]: 缺失字段：无已报告缺失
            - button "查看失败修订 1" [ref=e175] [cursor=pointer]
          - article [ref=e176]:
            - heading "E1 failure 4" [level=4] [ref=e177]
            - paragraph [ref=e178]: 分类：test_failure · 证据：unverified
            - generic [ref=e179]: 尝试：Private bounded attempt 适用范围：Private fixture only
            - paragraph [ref=e180]: 缺失字段：无已报告缺失
            - button "查看失败修订 1" [ref=e181] [cursor=pointer]
          - heading "近期活动" [level=3] [ref=e182]
          - paragraph [ref=e183]: 最多 5 个候选，仍可能被预算裁剪。
          - list [ref=e184]:
            - listitem [ref=e185]: post.created · pst_0359556c-9acb-46b7-80d4-42b5c568391f · 2026-11-01T00:30:00.000Z
            - listitem [ref=e186]: post.created · pst_b07424f0-264b-40d9-81f5-2141f8235883 · 2026-11-01T00:31:00.000Z
            - listitem [ref=e187]: post.created · pst_0587a657-489c-45dd-9647-b4d0cb1e15f4 · 2026-11-01T00:32:00.000Z
            - listitem [ref=e188]: post.created · pst_cf28c722-c717-46a9-9e5e-c23073d75604 · 2026-11-01T00:33:00.000Z
            - listitem [ref=e189]: space.revised · spc_7e44e92d-cad2-495a-b322-01013c4e79fc · 2026-11-01T00:34:00.000Z
  - contentinfo [ref=e190]: 独立协作论坛 · 正式评审尚未启用
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
  35  |   await navigation(page,'概览');
  36  |   const pinned=page.getByRole('button',{name:'查看置顶修订 1',exact:true});await pinned.focus();await page.keyboard.press('Enter');
> 37  |   await expect(page.locator('.body-text')).toHaveText('Pinned fixed original body');
      |                                            ^ Error: expect(locator).toHaveText(expected) failed
  38  |   expect(await page.getByRole('button',{name:'进入主题并引用',exact:true}).count()).toBe(0);
  39  |   const reply=page.getByRole('button',{name:'引用回复',exact:true});expect(await reply.count()===0||await reply.isDisabled()).toBe(true);
  40  |   await page.getByRole('button',{name:'返回空间概览',exact:true}).click();
  41  |   await expect(page.getByRole('heading',{name:'空间概览',exact:true})).toBeVisible();
  42  |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  43  |   expect(forum.httpEvents.filter(value=>value.method==='POST'&&value.path.endsWith('/posts')).length).toBeGreaterThan(0); // seed only; no browser wrong-thread publication
  44  |   const browserPosts=forum.httpEvents.filter(value=>value.method==='POST'&&value.path.endsWith('/posts')&&!value.requestKey?.startsWith('browser-private-seed-'));expect(browserPosts).toEqual([]);
  45  |   await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  46  |   await page.getByRole('heading',{name:'空间概览',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  47  |   await page.screenshot({path:forum.evidencePath('screenshots/e1-overview-narrow.png')});
  48  |   await enter(page,forum,true);await expect(page.getByText('Second private browser space',{exact:true})).toBeVisible();
  49  |   await expect(page.getByText('Pinned original title',{exact:true})).toHaveCount(0);expect(noAutomaticConsumerCalls(forum)).toBe(true);
  50  | });
  51  | 
  52  | test('E102 omitted UTF8 rules read one fixed revision, latest update never switches and historical giant degrades honestly',async({page,forum})=>{
  53  |   const largeRevision=await forum.seedHistoricalLargeRules(forum.alternate.id);
  54  |   const rules=Array.from({length:100},(_,index)=>`${index} ${'研究🧪'.repeat(100)}`);
  55  |   const revision=await forum.patchSpace({objective:'E1 fixed rules objective',rules});
  56  |   let end=0,pages=0,continuous=true,fixed=true;
  57  |   page.on('response',async response=>{
  58  |     if(new URL(response.url()).pathname!==`/api/v1/spaces/${forum.space.id}/revisions/${revision}`||response.status()!==200)return;
  59  |     try{const value=await response.json();const part=value.data;continuous&&=part.start_byte===end&&new TextEncoder().encode(part.chunk).byteLength===part.end_byte-part.start_byte;fixed&&=part.ref.space_id===forum.space.id&&part.ref.revision===revision;end=part.end_byte;pages++;}catch{continuous=false;}
  60  |   });
  61  |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  62  |   await expect(page.getByText(/规则.*预算.*省略|预算.*省略.*规则/)).toBeVisible();
  63  |   await page.getByRole('button',{name:'读取固定规则',exact:true}).click();
  64  |   await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toBeEnabled();
  65  |   await forum.patchSpace({objective:'E1 latest objective distinct',rules:['New rules must not replace old selection']});
  66  |   for(let index=0;index<8&&await page.getByRole('button',{name:'继续加载规则',exact:true}).count();index++){
  67  |     await page.getByRole('button',{name:'继续加载规则',exact:true}).click();await expect(page.getByRole('button',{name:'从首段重开规则',exact:true})).toBeEnabled();
  68  |   }
  69  |   await expect(page.getByText(rules[0]!,{exact:true})).toBeVisible();await expect(page.getByText(rules[99]!,{exact:true})).toBeVisible();
  70  |   await expect(page.getByText('New rules must not replace old selection',{exact:true})).toHaveCount(0);
  71  |   expect(continuous&&fixed&&pages>=2&&end>65536).toBe(true);
  72  |   const requests=forum.httpEvents.filter(value=>value.path===`/api/v1/spaces/${forum.space.id}/revisions/${revision}`);expect(requests.length>=2&&requests[1]?.query?.cursor!==undefined).toBe(true);
  73  |   await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(page.getByText('E1 latest objective distinct',{exact:true})).toBeVisible();await expect(page.getByText(rules[0]!,{exact:true})).toBeVisible();await expect(page.getByText('概览已有不同规则修订；这里仍读取原固定版本，不会自动替换。',{exact:true})).toBeVisible();
  74  |   await enter(page,forum,true);await page.getByRole('button',{name:'读取固定规则',exact:true}).click();
  75  |   for(let index=0;index<32&&!(await page.getByText(/超过.*1 MiB/).count());index++){
  76  |     await page.getByRole('button',{name:'继续加载规则',exact:true}).click();await expect(page.getByRole('button',{name:'从首段重开规则',exact:true})).toBeEnabled();
  77  |   }
  78  |   await expect(page.getByText(/超过.*1 MiB/)).toBeVisible();await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toBeEnabled();
  79  |   expect(forum.httpEvents.filter(value=>value.path===`/api/v1/spaces/${forum.alternate.id}/revisions/${largeRevision}`).length>1).toBe(true);
  80  |   await page.getByRole('button',{name:'从首段重开规则',exact:true}).click();await expect(page.getByText(/超过.*1 MiB/)).toHaveCount(0);
  81  |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  82  | });
  83  | 
  84  | test('E103 settings show actual server identity and permissions, refreshed withdrawal cannot authorize writes',async({page,forum})=>{
  85  |   await page.goto(forum.baseURL);await forum.login(page,'observer');await enter(page,forum);await navigation(page,'设置');
  86  |   await expect(page.getByRole('heading',{name:'本人权限',exact:true})).toBeVisible();
  87  |   await page.getByRole('button',{name:'刷新本人权限',exact:true}).click();
  88  |   const actual=await page.evaluate(async()=>{const value=await(await fetch('/api/v1/me',{credentials:'same-origin'})).json();return {actor:value.data.actor.id,capabilities:value.data.capabilities,allowed:value.data.allowed_space_ids,visible:value.data.visible_spaces};});
  89  |   expect(actual.actor).toBe(forum.actorIds.observer);expect(actual.capabilities).toEqual(['read','write']);expect(actual.allowed).toEqual([forum.space.id]);expect(actual.visible).toEqual([{id:forum.space.id,slug:forum.space.slug,role:'observer'}]);
  90  |   await expect(page.getByText(forum.actorIds.observer,{exact:false})).toBeVisible();await expect(page.getByText('observer',{exact:true})).toBeVisible();
  91  |   const before=forum.businessCounts();await navigation(page,'讨论');await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  92  |   await page.getByLabel('帖子标题',{exact:true}).fill('E1 observer forbidden note');await page.getByLabel('摘要',{exact:true}).fill('Cannot infer write ACL from capability');await page.getByLabel('正文',{exact:true}).fill('Server must deny observer');await page.getByRole('button',{name:'发布笔记',exact:true}).click();
  93  |   await expect(page.getByRole('alert')).toBeVisible();expect(forum.postsByTitle('E1 observer forbidden note')).toEqual([]);expect(forum.businessCounts()).toEqual(before);
  94  |   await navigation(page,'设置');await forum.withdrawMembership('observer');await page.getByRole('button',{name:'刷新本人权限',exact:true}).click();
  95  |   expect(await page.evaluate(async()=>{const value=await(await fetch('/api/v1/me',{credentials:'same-origin'})).json();return value.data.visible_spaces.length===0;})).toBe(true);
  96  |   await expect(page.getByText('当前最多 100 项可见空间列表中没有此空间；不能由此推断完整 ACL。',{exact:true})).toBeVisible();
  97  |   await navigation(page,'概览');await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  98  |   expect(forum.httpEvents.some(value=>value.path===`/api/v1/spaces/${forum.space.id}/context`&&value.status===404)).toBe(true);
  99  |   expect(await page.evaluate(()=>document.cookie===''&&localStorage.length===0&&sessionStorage.length===0)).toBe(true);
  100 |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  101 | });
  102 | 
  103 | test('E104 held context changes space and held fixed rules after logout cannot refill',async({page,forum})=>{
  104 |   const revision=await forum.patchSpace({objective:'E1 old-space sentinel',rules:Array.from({length:100},(_,i)=>`${i} ${'研究🧪'.repeat(100)}`)});
  105 |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  106 |   const context=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/context`},'hold-after');await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await context.entered;
  107 |   await enter(page,forum,true);context.release();await expect(page.getByText('Second private browser space',{exact:true})).toBeVisible();await expect(page.getByText('E1 old-space sentinel',{exact:true})).toHaveCount(0);
  108 |   await enter(page,forum);const rules=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/revisions/${revision}`},'hold-after');await page.getByRole('button',{name:'读取固定规则',exact:true}).click();await rules.entered;
  109 |   await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('status')).toContainText('已退出登录');rules.release();await expect(page.locator('.workspace')).toHaveCount(0);
  110 |   await forum.login(page);await enter(page,forum,true);await expect(page.getByText('E1 old-space sentinel',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'继续加载规则',exact:true})).toHaveCount(0);
  111 |   expect(noAutomaticConsumerCalls(forum)).toBe(true);
  112 |   await writeFile(forum.evidencePath('scope-cancellation.json'),JSON.stringify({late_context_did_not_replace_space:true,late_fixed_rules_did_not_refill_logout:true,fresh_login_request_barrier:true,auto_poll_or_ack:false},null,2));
  113 | });
  114 | 
```