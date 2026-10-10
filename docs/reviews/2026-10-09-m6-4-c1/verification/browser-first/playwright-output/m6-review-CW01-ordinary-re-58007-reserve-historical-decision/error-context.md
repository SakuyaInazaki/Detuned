# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m6-review.spec.ts >> CW01 ordinary requester and distinct reviewers explicitly select sessions, bind private evidence, seal/reveal and preserve historical decision
- Location: scripts/integrations/web/m6-review.spec.ts:21:1

# Error details

```
TimeoutError: locator.fill: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('region', { name: '正式评审', exact: true }).getByLabel('评审者身份 IDs', { exact: true })

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
      - paragraph [ref=e13]: 阅读当前可见的空间与主题，用笔记回应一个明确版本，按空间规则对固定材料发起评审。
    - status [ref=e14]:
      - generic [ref=e15]: 固定修订已加载。
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
                - generic [ref=e66]: pst_46ac4332-70f2-4227-9bdf-79e378dcc483
                - text: active
              - button "查看修订 1" [ref=e67] [cursor=pointer]
            - listitem [ref=e68]:
              - generic [ref=e69]:
                - strong [ref=e70]: claim
                - generic [ref=e71]: pst_7b7b9afe-0fb3-4424-9cf8-92a5a89b7559
                - text: active
              - button "查看修订 1" [ref=e72] [cursor=pointer]
          - button "帖子首页" [ref=e74] [cursor=pointer]
        - region [ref=e75]:
          - generic [ref=e76]:
            - heading "固定修订 1" [level=2] [ref=e77]
            - generic [ref=e78]: 读取完成
          - paragraph [ref=e79]: 帖子 pst_7b7b9afe-0fb3-4424-9cf8-92a5a89b7559
          - article [ref=e80]:
            - heading "Browser independent review claim" [level=3] [ref=e81]
            - paragraph [ref=e82]: Owned ordinary research
            - region "正文内容" [ref=e83]:
              - button "正文：显示原文" [ref=e84] [cursor=pointer]: 显示原文
              - paragraph [ref=e86]: A fixed ordinary claim for browser review.
            - generic [ref=e87]:
              - heading "标签" [level=4] [ref=e88]
              - paragraph [ref=e89]: 无标签
              - heading "结构化内容" [level=4] [ref=e90]
              - generic [ref=e91]: "{ \"statement\": \"Independent local claim\", \"assumptions\": [ \"Synthetic fixture\" ], \"scope\": \"Private local browser\", \"falsification_plan\": \"Read and report counterexamples\" }"
          - generic [ref=e92]:
            - button "从首段重开" [ref=e93] [cursor=pointer]
            - button "引用回复" [ref=e94] [cursor=pointer]
          - button "正式评审" [expanded] [ref=e96] [cursor=pointer]
          - region [ref=e97]:
            - heading "正式评审" [level=2] [ref=e98]
            - paragraph [ref=e99]: 当前帖子 pst_7b7b9afe-0fb3-4424-9cf8-92a5a89b7559，所选固定修订 1。轮次、检查与材料有效性分别展示。
            - paragraph
            - button "加载评审轮次" [ref=e101] [cursor=pointer]
            - list
            - group [ref=e102]:
              - generic "创建评审请求" [ref=e103] [cursor=pointer]
              - generic [ref=e104]:
                - group "固定材料与评审者" [ref=e105]:
                  - generic [ref=e107]:
                    - text: 预期政策版本
                    - spinbutton "预期政策版本" [active] [ref=e108]: "2"
                  - generic [ref=e109]:
                    - text: 评审者身份 IDs
                    - textbox "评审者身份 IDs" [ref=e110]: "[]"
                  - generic [ref=e111]:
                    - text: 依赖固定引用
                    - textbox "依赖固定引用" [ref=e112]: "[]"
                  - generic [ref=e113]:
                    - text: 材料附件 IDs
                    - textbox "材料附件 IDs" [ref=e114]: "[]"
                  - generic [ref=e115]:
                    - text: 代码引用
                    - textbox "代码引用" [ref=e116]: "[]"
                  - generic [ref=e117]:
                    - text: 声明贡献者 IDs
                    - textbox "声明贡献者 IDs" [ref=e118]: "[]"
                  - generic [ref=e119]:
                    - text: 复现说明
                    - textbox "复现说明" [ref=e120]
                  - paragraph [ref=e121]: "数组使用 JSON；依赖形如 [{\"post_id\":\"…\",\"revision\":1}]。代码引用包含 repository、commit、source_artifact_id、reproduction_instructions。人数和资格由服务端确定。"
                - button "创建评审请求" [ref=e122] [cursor=pointer]
          - generic [ref=e123]:
            - region [ref=e124]:
              - heading "修订目录" [level=3] [ref=e125]
              - button "加载修订目录" [ref=e126] [cursor=pointer]
              - list
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - text: 比较版本一
                  - combobox "比较版本一" [ref=e129]:
                    - option "选择修订" [selected]
                - generic [ref=e130]:
                  - text: 比较版本二
                  - combobox "比较版本二" [ref=e131]:
                    - option "选择修订" [selected]
                - button "比较所选版本" [disabled] [ref=e132]
              - region [ref=e133]:
                - heading "五字段比较" [level=4] [ref=e134]
                - paragraph [ref=e135]: 选择同帖的两个明确修订后比较。
            - region [ref=e136]:
              - heading "本修订附件" [level=3] [ref=e137]
              - paragraph [ref=e138]: 仅列此固定修订关联的附件。下载不会自动预览或执行。
              - button "加载附件目录" [ref=e139] [cursor=pointer]
              - list
        - region [ref=e140]:
          - heading "发布笔记" [level=2] [ref=e141]
          - paragraph [ref=e142]: 发布到当前主题，研究内容只按纯文本显示。
          - generic [ref=e143]:
            - generic [ref=e144]: 选择附件文件
            - button "选择附件文件" [ref=e145]
            - paragraph [ref=e146]: 单文件最多 25 MiB；逐个上传后，可在同一笔记中一起关联。
            - button "上传所选附件" [disabled] [ref=e148]
          - generic [ref=e149]:
            - group [ref=e150]:
              - generic [ref=e151]: 帖子标题
              - textbox "帖子标题" [ref=e152]
              - generic [ref=e153]: 摘要
              - textbox "摘要" [ref=e154]
              - generic [ref=e155]: 正文
              - textbox "正文" [ref=e156]
            - button "发布笔记" [ref=e158] [cursor=pointer]
  - contentinfo [ref=e159]: 独立协作论坛 · 固定材料与正式评审
```

# Test source

```ts
  1  | import type {Page,Locator} from '@playwright/test';
  2  | import {test,expect,type ForumFixture,type ReviewSetup,type ReviewIdentityName} from './fixtures.js';
  3  | 
  4  | async function enter(page:Page,forum:ForumFixture,target=forum.post) {
  5  |  await page.getByRole('button',{name:new RegExp('^'+forum.space.slug)}).first().click();
  6  |  await page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'讨论',exact:true}).click();
  7  |  await page.getByRole('button',{name:new RegExp('^'+forum.thread.title)}).first().click();
  8  |  await page.locator('.post-directory li').filter({hasText:target.id}).getByRole('button',{name:'查看修订 '+target.revision,exact:true}).click();
  9  |  await expect(page.locator('.reading').getByRole('heading',{name:target.title,exact:true})).toBeVisible();
  10 |  await page.getByRole('button',{name:'正式评审',exact:true}).click();
  11 |  return page.getByRole('region',{name:'正式评审',exact:true});
  12 | }
  13 | async function login(page:Page,forum:ForumFixture,name:ReviewIdentityName){await forum.loginReview(page,name);}
  14 | async function logout(page:Page){await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByLabel('访问令牌',{exact:true})).toBeVisible();}
> 15 | async function create(panel:Locator,setup:ReviewSetup){await panel.getByText('创建评审请求',{exact:true}).first().click();await panel.getByLabel('预期政策版本',{exact:true}).fill(String(setup.policyRevision));await panel.getByLabel('评审者身份 IDs',{exact:true}).fill(JSON.stringify(setup.reviewerIds));await panel.getByLabel('复现说明',{exact:true}).fill('Independent ordinary browser recipe.');await panel.getByRole('button',{name:'创建评审请求',exact:true}).click();}
     |                                                                                                                                                                                                                                                       ^ TimeoutError: locator.fill: Timeout 5000ms exceeded.
  16 | async function open(panel:Locator,round=1){await panel.getByRole('button',{name:'加载评审轮次',exact:true}).click();await panel.getByRole('button',{name:`打开第 ${round} 轮`,exact:true}).click();await expect(panel.getByRole('region',{name:'固定评审材料',exact:true})).toBeVisible();}
  17 | async function ownSession(panel:Locator){await panel.getByRole('button',{name:'加载本人任务',exact:true}).click();await expect(panel.getByRole('button',{name:'开始初评',exact:true})).toBeEnabled();await panel.getByRole('button',{name:'开始初评',exact:true}).click();await expect(panel.getByRole('button',{name:'选用此会话',exact:true})).toBeVisible();expect((await panel.getByLabel('初评论坛会话 ID',{exact:true}).inputValue()).length===0).toBe(true);await panel.getByRole('button',{name:'选用此会话',exact:true}).click();expect((await panel.getByLabel('初评论坛会话 ID',{exact:true}).inputValue()).length>0).toBe(true);}
  18 | async function submit(panel:Locator,marker:string,evidence:string[]=[]){await panel.getByLabel('覆盖范围',{exact:true}).fill(marker);await panel.getByLabel('已执行检查',{exact:true}).fill('Read fixed material; no external check receipt.');await panel.getByLabel('独立声明说明',{exact:true}).fill('Separate human and group.');await panel.getByLabel('我声明未参与这些材料',{exact:true}).check();await panel.getByLabel('我声明未接触其他初评意见',{exact:true}).check();await panel.getByLabel('证据固定引用',{exact:true}).fill(JSON.stringify(evidence.map(artifact_id=>({kind:'artifact',artifact_id}))));await panel.getByRole('button',{name:'提交完整初评',exact:true}).click();await expect(panel.getByText(/初评已保存：/)).toBeVisible();}
  19 | async function reviewer(page:Page,forum:ForumFixture,setup:ReviewSetup,name:'one'|'two',marker:string,upload=false){await login(page,forum,name);const panel=await enter(page,forum,setup.target);await open(panel);await ownSession(panel);let evidence:string[]=[];if(upload){await panel.getByLabel('选择私有评审附件',{exact:true}).setInputFiles({name:'owned-review.txt',mimeType:'text/plain',buffer:Buffer.from('Private independent evidence.')});await panel.getByRole('button',{name:'上传私有评审附件',exact:true}).click();await expect(panel.getByText(/私有附件已上传；/)).toBeVisible();expect(await panel.getByLabel('证据固定引用',{exact:true}).inputValue()).toBe('[]');const artifacts=forum.artifacts().filter(a=>a.owner_id===setup.reviewerIds[0]);expect(artifacts).toHaveLength(1);evidence=[artifacts[0]!.id];}await submit(panel,marker,evidence);return panel;}
  20 | 
  21 | test('CW01 ordinary requester and distinct reviewers explicitly select sessions, bind private evidence, seal/reveal and preserve historical decision',async({page,forum})=>{
  22 |  const setup=await forum.setupReview();page.on('dialog',dialog=>void dialog.accept());await page.goto(forum.baseURL);await login(page,forum,'requester');let panel=await enter(page,forum,setup.target);await create(panel,setup);await expect(panel.getByText(/评审请求已创建：/)).toBeVisible();await open(panel);await expect(panel.getByRole('region',{name:'固定评审材料'})).toContainText('Independent local claim');await logout(page);
  23 |  panel=await reviewer(page,forum,setup,'one','First sealed independent coverage',true);await panel.getByRole('button',{name:'加载可见意见',exact:true}).click();await expect(panel.getByText('覆盖：First sealed independent coverage',{exact:true})).toBeVisible();expect(forum.reviewRows().submissions.every(s=>s.revealed_at===null)).toBe(true);await logout(page);
  24 |  await login(page,forum,'two');panel=await enter(page,forum,setup.target);await open(panel);await panel.getByRole('button',{name:'加载可见意见',exact:true}).click();await expect(panel.getByText(/服务端当前没有返回可见意见/)).toBeVisible();await expect(panel.getByText('覆盖：First sealed independent coverage',{exact:true})).toHaveCount(0);await ownSession(panel);await submit(panel,'Second independent coverage');await panel.getByRole('button',{name:'加载可见意见',exact:true}).click();await expect(panel.getByText('覆盖：First sealed independent coverage',{exact:true})).toBeVisible();await expect(panel.getByText('覆盖：Second independent coverage',{exact:true})).toBeVisible();const submitted=forum.reviewRows().submissions;expect(submitted).toHaveLength(2);expect(new Set(submitted.map(s=>s.reviewer_actor_id)).size).toBe(2);expect(new Set(submitted.map(s=>s.reviewer_session_id)).size).toBe(2);expect(submitted.every(s=>s.revealed_at!==null)).toBe(true);await logout(page);
  25 |  await login(page,forum,'requester');panel=await enter(page,forum,setup.target);await open(panel);await panel.getByRole('button',{name:'确认版本 3 并最终决定',exact:true}).click();await expect(panel.getByText(/最终决定已保存/)).toBeVisible();await panel.getByRole('button',{name:'刷新当前评审',exact:true}).click();await expect(panel.locator('.review-status')).toContainText('已接受');await panel.getByRole('button',{name:'读取历史最终决定',exact:true}).click();await expect(panel.getByText(/决定保留历史事实/)).toBeVisible();expect(forum.reviewRows().counts.review_decisions).toBe(1);await panel.locator('.review-status').scrollIntoViewIfNeeded();await page.screenshot({path:forum.evidencePath('screenshots/c1-review-desktop.png')});await page.setViewportSize({width:390,height:844});await panel.locator('.review-status').scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:forum.evidencePath('screenshots/c1-review-status-narrow.png')});await page.setViewportSize({width:1280,height:900});
  26 |  await forum.revisePost(setup.target,{body:'A genuine later revision.',structured:{statement:'Changed local claim',assumptions:['Synthetic fixture'],scope:'Private local browser',falsification_plan:'Changed counterexample'}});await panel.getByRole('button',{name:'刷新当前评审',exact:true}).click();await expect(panel.locator('.review-status')).toContainText('材料已有更新');await panel.getByRole('button',{name:'读取历史最终决定',exact:true}).click();expect(forum.reviewRows().counts.review_decisions).toBe(1);await expect(panel.getByText(/已接受 · 决定/)).toBeVisible();await logout(page);
  27 | });
  28 | 
  29 | test('CW02 required checks remain pending and incomplete finalization cannot invent a receipt; cancellation retains safe history',async({page,forum})=>{
  30 |  const setup=await forum.setupReview({requiredChecks:true});page.on('dialog',dialog=>void dialog.accept());await page.goto(forum.baseURL);await login(page,forum,'requester');let panel=await enter(page,forum,setup.target);await create(panel,setup);await expect(panel.getByText(/评审请求已创建：/)).toBeVisible();await logout(page);
  31 |  await reviewer(page,forum,setup,'one','Check-required first coverage');await logout(page);await reviewer(page,forum,setup,'two','Check-required second coverage');await logout(page);
  32 |  await login(page,forum,'requester');panel=await enter(page,forum,setup.target);await open(panel);await expect(panel.locator('.review-status')).toContainText('检查待完成');await expect(panel.locator('.review-status')).not.toContainText('检查通过');const before=forum.reviewRows();await panel.getByRole('button',{name:'确认版本 3 并最终决定',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('REVIEW_INCOMPLETE');expect(forum.reviewRows()).toEqual(before);await panel.getByRole('button',{name:'编辑为新的评审意图',exact:true}).click();await panel.getByLabel('取消原因',{exact:true}).fill('Explicit current cancellation.');await panel.getByRole('button',{name:'确认版本 3 并取消评审',exact:true}).click();await expect(panel.getByText(/取消已确认/)).toBeVisible();await panel.getByRole('button',{name:'刷新当前评审',exact:true}).click();await expect(panel.locator('.review-status')).toContainText('已取消');await panel.getByRole('button',{name:'加载可见意见',exact:true}).click();await expect(panel.getByText('覆盖：Check-required first coverage',{exact:true})).toBeVisible();await panel.getByRole('button',{name:'加载评审轮次',exact:true}).click();await expect(panel.getByRole('button',{name:'打开第 1 轮',exact:true})).toBeVisible();expect(forum.reviewRows().counts.review_decisions).toBe(0);
  33 | });
  34 | 
  35 | test('CW03 lost real committed response recovers the same intent/key once and session candidates never silently replace bindings',async({page,forum})=>{
  36 |  const setup=await forum.setupReview();page.on('dialog',dialog=>void dialog.accept());await page.goto(forum.baseURL);await login(page,forum,'requester');let panel=await enter(page,forum,setup.target);const endpoint=`/api/v1/spaces/${forum.space.id}/review-requests`;const failures=Array.from({length:4},()=>forum.faultNext({method:'POST',path:endpoint},'lose-after-commit'));await create(panel,setup);await Promise.all(failures.map(f=>f.entered));await expect(panel.getByRole('button',{name:'用同一请求重试评审写入',exact:true})).toBeEnabled();const committed=forum.reviewRows();expect(committed.counts.review_requests).toBe(1);await panel.getByRole('button',{name:'用同一请求重试评审写入',exact:true}).click();await expect(panel.getByText(/评审请求已创建：/)).toBeVisible();expect(forum.reviewRows()).toEqual(committed);const writes=forum.httpEvents.filter(e=>e.method==='POST'&&e.path===endpoint);expect(writes.length).toBe(5);expect(new Set(writes.map(e=>e.requestKey)).size).toBe(1);expect(writes.every(e=>typeof e.requestKey==='string')).toBe(true);await logout(page);
  37 |  await login(page,forum,'one');panel=await enter(page,forum,setup.target);await open(panel);await ownSession(panel);const first=await panel.getByLabel('初评论坛会话 ID',{exact:true}).inputValue();await panel.getByRole('button',{name:'开始初评',exact:true}).click();await expect.poll(()=>forum.reviewRows().counts.sessions).toBeGreaterThan((committed.counts.sessions??0)+1);expect((await panel.getByLabel('初评论坛会话 ID',{exact:true}).inputValue())===first).toBe(true);const sessions=forum.httpEvents.filter(e=>e.method==='POST'&&e.path===`/api/v1/spaces/${forum.space.id}/sessions`);expect(sessions).toHaveLength(2);await panel.getByRole('button',{name:'选用此会话',exact:true}).click();expect((await panel.getByLabel('初评论坛会话 ID',{exact:true}).inputValue())!==first).toBe(true);expect(forum.reviewRows().counts.review_submissions).toBe(0);
  38 | });
  39 | 
  40 | test('CW04 late directory/snapshot/session results do not refill a new scope or logged-out page; keyboard narrow viewport retains ordinary posts',async({page,forum})=>{
  41 |  const setup=await forum.setupReview();await page.goto(forum.baseURL);await login(page,forum,'requester');let panel=await enter(page,forum,setup.target);await create(panel,setup);await expect(panel.getByText(/评审请求已创建：/)).toBeVisible();
  42 |  const late=forum.faultNext({method:'GET',path:`/api/v1/spaces/${forum.space.id}/posts/${setup.target.id}/review-requests`},'hold-after');await panel.getByRole('button',{name:'加载评审轮次',exact:true}).click();await late.entered;await page.getByRole('button',{name:new RegExp('^'+forum.alternate.slug)}).first().click();late.release();await expect(page.getByRole('heading',{name:'空间概览',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'正式评审',exact:true})).toHaveCount(0);
  43 |  panel=await enter(page,forum,setup.target);await open(panel);const request=forum.reviewRows().requests[0];if(!request)throw new Error('Owned request unavailable.');const snapshotPath=forum.httpEvents.filter(e=>e.method==='GET'&&e.path.includes('/review-snapshots/')).at(-1)?.path;if(!snapshotPath)throw new Error('Owned snapshot request unavailable.');const held=forum.faultNext({method:'GET',path:snapshotPath},'hold-after');await panel.getByRole('button',{name:'刷新当前评审',exact:true}).click();await held.entered;await page.locator('.post-directory li').filter({hasText:forum.post.id}).getByRole('button',{name:'查看修订 1',exact:true}).click();held.release();await expect(page.locator('.reading').getByRole('heading',{name:forum.post.title,exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'固定评审材料',exact:true})).toHaveCount(0);await logout(page);
  44 |  await login(page,forum,'one');panel=await enter(page,forum,setup.target);await open(panel);await panel.getByRole('button',{name:'加载本人任务',exact:true}).click();await expect(panel.getByRole('button',{name:'开始初评',exact:true})).toBeEnabled();const sessionPath=`/api/v1/spaces/${forum.space.id}/sessions`,pending=forum.faultNext({method:'POST',path:sessionPath},'hold-after'),before=forum.reviewRows().counts.sessions??0;await panel.getByRole('button',{name:'开始初评',exact:true}).click();await pending.entered;await logout(page);pending.release();expect(forum.reviewRows().counts.sessions).toBe(before+1);expect(forum.httpEvents.filter(e=>e.method==='POST'&&e.path===sessionPath)).toHaveLength(1);await expect(page.getByRole('button',{name:'选用此会话',exact:true})).toHaveCount(0);
  45 |  await login(page,forum,'requester');await page.setViewportSize({width:390,height:844});await enter(page,forum);await expect(page.locator('.reading').getByRole('heading',{name:forum.post.title,exact:true})).toBeVisible();const nav=page.getByRole('navigation',{name:'空间页面',exact:true}).getByRole('button',{name:'讨论',exact:true});await nav.focus();await expect(nav).toBeFocused();await page.keyboard.press('Enter');await expect(nav).toHaveAttribute('aria-current','page');await page.getByRole('button',{name:new RegExp('^'+forum.thread.title)}).first().click();await page.getByLabel('帖子标题',{exact:true}).fill('C1 ordinary narrow note');await page.getByLabel('摘要',{exact:true}).fill('Existing ordinary flow remains intact.');await page.getByLabel('正文',{exact:true}).fill('A real ordinary post after review navigation.');await page.getByRole('button',{name:'发布笔记',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('帖子已发布');expect(forum.postsByTitle('C1 ordinary narrow note')).toHaveLength(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:forum.evidencePath('screenshots/c1-review-narrow.png')});await logout(page);
  46 | });
  47 | 
```