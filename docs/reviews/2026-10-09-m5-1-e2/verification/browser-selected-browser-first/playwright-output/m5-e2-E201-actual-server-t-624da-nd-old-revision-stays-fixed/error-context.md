# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m5-e2.spec.ts >> E201 actual server time order spans pages, historical unknown remains last and old revision stays fixed
- Location: scripts/integrations/web/m5-e2.spec.ts:33:1

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
      - generic [ref=e15]: 帖子目录已按创建时间加载；历史未知时间排在末尾。
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
          - generic [aria-hidden] [ref=e35]: /
          - button "Browser discussion" [ref=e36] [cursor=pointer]
        - navigation "空间页面" [ref=e37]:
          - button "概览" [ref=e38] [cursor=pointer]
          - button "讨论" [ref=e39] [cursor=pointer]
          - button "搜索" [ref=e40] [cursor=pointer]
          - button "失败报告" [ref=e41] [cursor=pointer]
          - button "设置" [ref=e42] [cursor=pointer]
        - region [ref=e43]:
          - generic [ref=e44]:
            - heading "新主题" [level=2] [ref=e45]
            - button "新建主题" [ref=e46] [cursor=pointer]
        - region [ref=e47]:
          - generic [ref=e48]:
            - heading "主题" [level=2] [ref=e49]
            - generic [ref=e50]:
              - text: 主题状态
              - combobox "主题状态" [ref=e51]:
                - option "开放" [selected]
                - option "归档"
          - list [ref=e52]:
            - listitem [ref=e53]:
              - button "Browser discussion 开放 · 查看帖子 →" [pressed] [ref=e54] [cursor=pointer]:
                - text: Browser discussion
                - generic [ref=e55]: 开放 · 查看帖子 →
          - button "主题首页" [ref=e57] [cursor=pointer]
        - region [ref=e58]:
          - generic [ref=e59]:
            - heading "Browser discussion" [level=2] [ref=e60]
            - generic [ref=e61]: 按创建时间 · 历史未知时间置末
          - list [ref=e62]:
            - listitem [ref=e63]:
              - generic [ref=e64]:
                - strong [ref=e65]: note
                - generic [ref=e66]: pst_2c13dae4-c976-44b7-a5df-92eab95b270e
                - text: active
              - button "查看修订 1" [ref=e67] [cursor=pointer]
            - listitem [ref=e68]:
              - generic [ref=e69]:
                - strong [ref=e70]: note
                - generic [ref=e71]: pst_186a5dcf-7951-47d1-b83a-e3ea9c3a8754
                - text: active
              - button "查看修订 1" [ref=e72] [cursor=pointer]
            - listitem [ref=e73]:
              - generic [ref=e74]:
                - strong [ref=e75]: note
                - generic [ref=e76]: pst_180b9184-b8f9-45c7-9453-f8583631b290
                - text: active
              - button "查看修订 1" [ref=e77] [cursor=pointer]
            - listitem [ref=e78]:
              - generic [ref=e79]:
                - strong [ref=e80]: note
                - generic [ref=e81]: pst_15310006-186a-4743-9afa-c27de8729041
                - text: active
              - button "查看修订 1" [ref=e82] [cursor=pointer]
            - listitem [ref=e83]:
              - generic [ref=e84]:
                - strong [ref=e85]: note
                - generic [ref=e86]: pst_0b802d5d-9c91-46de-902e-b5d88fc212df
                - text: active
              - button "查看修订 1" [ref=e87] [cursor=pointer]
            - listitem [ref=e88]:
              - generic [ref=e89]:
                - strong [ref=e90]: note
                - generic [ref=e91]: pst_1242e90e-18d4-4848-9073-20a99f35c3a3
                - text: active
              - button "查看修订 1" [ref=e92] [cursor=pointer]
            - listitem [ref=e93]:
              - generic [ref=e94]:
                - strong [ref=e95]: note
                - generic [ref=e96]: pst_fe217330-dab0-4939-9540-15fcfa422359
                - text: active
              - button "查看修订 1" [ref=e97] [cursor=pointer]
          - button "帖子首页" [ref=e99] [cursor=pointer]
        - region [ref=e100]:
          - heading "发布笔记" [level=2] [ref=e101]
          - paragraph [ref=e102]: 发布到当前主题，研究内容只按纯文本显示。
          - generic [ref=e103]:
            - generic [ref=e104]: 选择附件文件
            - button "选择附件文件" [ref=e105]
            - paragraph [ref=e106]: 单文件最多 25 MiB；逐个上传后，可在同一笔记中一起关联。
            - button "上传所选附件" [disabled] [ref=e108]
          - generic [ref=e109]:
            - group [ref=e110]:
              - generic [ref=e111]: 帖子标题
              - textbox "帖子标题" [ref=e112]
              - generic [ref=e113]: 摘要
              - textbox "摘要" [ref=e114]
              - generic [ref=e115]: 正文
              - textbox "正文" [ref=e116]
            - button "发布笔记" [ref=e118] [cursor=pointer]
  - contentinfo [ref=e119]: 独立协作论坛 · 正式评审尚未启用
```

# Test source

```ts
  1  | import {test,expect,type ForumFixture} from './fixtures.js';
  2  | import type {Page} from '@playwright/test';
  3  | import {writeFile} from 'node:fs/promises';
  4  | 
  5  | async function enter(page:Page,forum:ForumFixture) {
  6  |   await page.getByRole('button',{name:`${forum.space.slug} 进入空间 →`,exact:true}).click();
  7  |   await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();
  8  |   const discussion=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'讨论',exact:true});
  9  |   await discussion.focus();await expect(discussion).toBeFocused();await page.keyboard.press('Enter');
  10 |   await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  11 |   await expect(page.getByRole('button',{name:'帖子首页',exact:true})).toBeEnabled();
  12 | }
  13 | async function open(page:Page,id:string,revision=1) {
  14 |   const item=page.locator('.post-directory li').filter({hasText:id});
  15 |   const response=page.waitForResponse(value=>new URL(value.url()).pathname.endsWith(`/posts/${id}/revisions/${revision}`)&&value.status()===200);
  16 |   await item.getByRole('button',{name:`查看修订 ${revision}`,exact:true}).click();
  17 |   await response;await expect(page.getByRole('button',{name:'从首段重开',exact:true})).toBeEnabled();
  18 |   for(let i=0;i<12&&!(await page.getByRole('region',{name:'正文内容',exact:true}).count());i++){
  19 |     const more=page.getByRole('button',{name:'继续加载正文',exact:true});
  20 |     if(!await more.count())break;
  21 |     await more.click();await expect(page.getByRole('button',{name:'从首段重开',exact:true})).toBeEnabled();
  22 |   }
  23 |   await expect(page.getByRole('region',{name:'正文内容',exact:true})).toBeVisible();
  24 | }
  25 | async function viewport(page:Page,forum:ForumFixture,name:string,narrow=false) {
  26 |   if(narrow)await page.setViewportSize({width:390,height:844});
  27 |   await page.getByRole('region',{name:'正文内容',exact:true}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));
  28 |   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  29 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  30 |   await page.screenshot({path:forum.evidencePath(`screenshots/${name}.png`)});
  31 | }
  32 | 
  33 | test('E201 actual server time order spans pages, historical unknown remains last and old revision stays fixed',async({page,forum})=>{
  34 |   const posts=[forum.post];for(let i=0;i<26;i++)posts.push(await forum.seedNote({title:`E2 time ${i}`,body:`Actual chronological body ${i}`}));
  35 |   const sorted=[...posts].sort((a,b)=>a.id.localeCompare(b.id));
  36 |   const entries=sorted.map((p,i)=>({id:p.id,createdAt:i===26?'Historical unknown time':i<2?'2026-01-01T00:00:00.000Z':`2025-12-${String(31-i).padStart(2,'0')}T00:00:00.000Z`}));
  37 |   forum.setHistoricalPostTimes(entries);
  38 |   const expected=entries.filter(p=>p.createdAt!=='Historical unknown time').sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).concat(entries.filter(p=>p.createdAt==='Historical unknown time')).map(p=>p.id);
  39 |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  40 |   await expect(page.getByText('按创建时间 · 历史未知时间置末',{exact:true})).toBeVisible();
  41 |   const first=await page.locator('.post-directory li small').allTextContents();expect(first).toEqual(expected.slice(0,20));
  42 |   await page.getByRole('button',{name:'下一页帖子',exact:true}).click();await expect(page.getByRole('button',{name:'帖子首页',exact:true})).toBeEnabled();
  43 |   const second=await page.locator('.post-directory li small').allTextContents();expect(second).toEqual(expected.slice(20));
  44 |   const requests=forum.httpEvents.filter(e=>e.path===`/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`);
> 45 |   expect(requests.every(e=>e.query?.sort==='created_at_asc')).toBe(true);expect(requests.at(-1)?.query?.cursor!==undefined).toBe(true);
     |                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  46 |   const selected=posts.find(p=>p.id===expected[20])!;await forum.revisePost(selected,{body:'Changed latest body must not replace selected R1'});
  47 |   await open(page,selected.id);const region=page.getByRole('region',{name:'正文内容',exact:true});
  48 |   const oldBody=selected.id===forum.post.id?'Original fixed research body.':`Actual chronological body ${Number(selected.title.split(' ').at(-1))}`;
  49 |   await expect(region.locator('.markdown-rendered')).toHaveText(oldBody);await expect(page.getByText('Changed latest body must not replace selected R1',{exact:true})).toHaveCount(0);await expect(page.getByText('已有更新修订；这里仍显示所选固定版本。',{exact:true})).toBeVisible();
  50 |   expect(forum.httpEvents.some(e=>/\/(?:ack|poll)$/.test(e.path))).toBe(false);
  51 | });
  52 | 
  53 | test('E202 CommonMark is bounded plain research: safe links only, no HTML or remote images, exact keyboard original',async({page,forum})=>{
  54 |   const source='# 研究 Markdown\n\n**Strong research** and *emphasis*.\n\n> A quoted research claim.\n\n- First item\n- Second item\n\n```text\n<script>window.e2CodeExecuted=true</script>\n```\n\n[Allowed link](https://example.invalid/research?q=study)\n\n[Credential link](https://user:fiction@example.invalid/private)\n\n[Relative link](/admin/actors)\n\n[Protocol relative](//invalid.example/protocol)\n\n[Script link](javascript:alert(1))\n\n[Data link](data:text/html,fiction)\n\n![Remote research image](https://invalid.example/research.png)\n\n<script>window.e2ResearchExecuted=true</script><iframe src="https://invalid.example/frame"></iframe>';
  55 |   const post=await forum.seedNote({title:'E2 Markdown security',body:source});let remote=false;page.on('request',request=>{if(new URL(request.url()).origin!==forum.baseURL)remote=true;});
  56 |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);await open(page,post.id);
  57 |   const region=page.getByRole('region',{name:'正文内容',exact:true});await expect(region.getByRole('heading',{name:'研究 Markdown',exact:true})).toBeVisible();
  58 |   expect(await region.locator('script,img,iframe,video,audio,object,embed').count()).toBe(0);
  59 |   expect(await page.evaluate(()=>!('e2ResearchExecuted'in window)&&!('e2CodeExecuted'in window))).toBe(true);expect(remote).toBe(false);
  60 |   const links=await region.locator('a').evaluateAll(elements=>elements.map(element=>({href:element.getAttribute('href'),target:element.getAttribute('target'),rel:element.getAttribute('rel')})));
  61 |   expect(links).toEqual([{href:'https://example.invalid/research?q=study',target:'_blank',rel:'noopener noreferrer'}]);
  62 |   const toggle=page.getByRole('button',{name:'正文：显示原文',exact:true});await toggle.focus();await expect(toggle).toBeFocused();await page.keyboard.press('Enter');
  63 |   expect(await region.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,source)).toBe(true);
  64 |   await page.getByRole('button',{name:'正文：显示 Markdown',exact:true}).click();await expect(region.getByRole('heading',{name:'研究 Markdown',exact:true})).toBeVisible();
  65 |   await viewport(page,forum,'e2-markdown-desktop');await viewport(page,forum,'e2-markdown-narrow',true);expect(remote).toBe(false);
  66 | });
  67 | 
  68 | test('E203 UTF8 exact128KiB/over limit and actual AST exceptions degrade locally then source recovers',async({page,forum})=>{
  69 |   const exact='研'.repeat(43690)+'ab',over='研'.repeat(43691),nodes='x\n\n'.repeat(10001),depth='> '.repeat(70)+'Deep rule';
  70 |   expect(new TextEncoder().encode(exact).byteLength).toBe(131072);expect(new TextEncoder().encode(over).byteLength).toBe(131073);
  71 |   const exactPost=await forum.seedNote({title:'E2 exact UTF8 input',body:exact});const overPost=await forum.seedNote({title:'E2 over UTF8 input',body:over});const nodePost=await forum.seedNote({title:'E2 AST node limit',body:nodes});
  72 |   await forum.patchSpace({rules:[depth]});await page.goto(forum.baseURL);await forum.login(page);
  73 |   await page.getByRole('button',{name:`${forum.space.slug} 进入空间 →`,exact:true}).click();await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();
  74 |   const rule=page.getByRole('region',{name:'空间规则 1内容',exact:true});await expect(rule.getByText('Markdown 降级：结构超过预算或解析/显示未完成，以下保留原文。',{exact:true})).toBeVisible();
  75 |   expect(await rule.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,depth)).toBe(true);
  76 |   await forum.patchSpace({rules:['# Recovered rule']});await page.getByRole('button',{name:'刷新空间概览',exact:true}).click();await expect(rule.getByRole('heading',{name:'Recovered rule',exact:true})).toBeVisible();await expect(rule.getByText(/Markdown 降级/)).toHaveCount(0);
  77 |   await page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'讨论',exact:true}).click();await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();await expect(page.getByRole('button',{name:'帖子首页',exact:true})).toBeEnabled();
  78 |   await open(page,exactPost.id);let region=page.getByRole('region',{name:'正文内容',exact:true});expect(await region.locator('.markdown-rendered').evaluate((element,text)=>element.textContent===text,exact)).toBe(true);await expect(region.getByText(/Markdown 降级/)).toHaveCount(0);
  79 |   await open(page,overPost.id);region=page.getByRole('region',{name:'正文内容',exact:true});await expect(region.getByText('Markdown 降级：超过 128 KiB 输入预算，以下显示原文。',{exact:true})).toBeVisible();expect(await region.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,over)).toBe(true);
  80 |   await open(page,nodePost.id);region=page.getByRole('region',{name:'正文内容',exact:true});await expect(region.getByText('Markdown 降级：结构超过预算或解析/显示未完成，以下保留原文。',{exact:true})).toBeVisible();expect(await region.locator('.markdown-original').evaluate((element,text)=>element.textContent===text,nodes)).toBe(true);
  81 |   await open(page,forum.post.id);await expect(page.getByRole('region',{name:'正文内容',exact:true}).locator('.markdown-rendered')).toHaveText('Original fixed research body.');await expect(page.getByRole('button',{name:'退出登录',exact:true})).toBeEnabled();
  82 |   await writeFile(forum.evidencePath('markdown-budget.json'),JSON.stringify({exact_utf8_bytes:131072,over_utf8_bytes:131073,legal_http_seed:true,depth70_real_ast_exception:true,over20000_nodes_real_ast_exception:true,local_boundary_preserved_forum:true,same_inline_rule_component_source_recovered:true},null,2));
  83 | });
  84 | 
  85 | test('E204 held new-sort directory and fixed Markdown body never cross space or logout generation',async({page,forum})=>{
  86 |   await page.goto(forum.baseURL);await forum.login(page);await enter(page,forum);
  87 |   const order=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`},'hold-after');await page.getByRole('button',{name:'帖子首页',exact:true}).click();await order.entered;
  88 |   await page.getByRole('button',{name:`${forum.alternate.slug} 进入空间 →`,exact:true}).click();await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();order.release();await expect(page.locator('.post-directory')).toHaveCount(0);
  89 |   await enter(page,forum);const body=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${forum.post.id}/revisions/1`},'hold-after');
  90 |   await page.locator('.post-directory li').filter({hasText:forum.post.id}).getByRole('button',{name:'查看修订 1',exact:true}).click();await body.entered;
  91 |   await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('status')).toContainText('已退出登录');body.release();await expect(page.locator('.workspace')).toHaveCount(0);
  92 |   await forum.login(page);await page.getByRole('button',{name:`${forum.alternate.slug} 进入空间 →`,exact:true}).click();await expect(page.getByRole('button',{name:'刷新空间概览',exact:true})).toBeEnabled();await expect(page.getByRole('region',{name:'正文内容',exact:true})).toHaveCount(0);
  93 |   expect(forum.httpEvents.filter(e=>e.path===`/api/v1/spaces/${forum.space.id}/threads/${forum.thread.id}/posts`).every(e=>e.query?.sort==='created_at_asc')).toBe(true);
  94 | });
  95 | 
```