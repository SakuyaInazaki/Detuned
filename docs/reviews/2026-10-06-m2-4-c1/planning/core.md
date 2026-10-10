# M2.4-C.1 核心实施规划（只读阶段）

2026-10-06。唯一行为方案为父批准的B.2.2/next-task.md；已读取AGENTS、README、docs00/08/11、progress与reviews最新入口及对应任务书。本轮只核代码和接口，不改产品/正式tests、不测试/build；待fresh baseline、父批准before及统一实施信号。当前起点是B.2.2有限验收311/32与current29；三遗失原历史fixture仍not_run，不借旧清单数作新基线。

## 精确所有权与共享接口

核心候选独占：
- packages/core/src/services/context-service.ts：focus授权/目标、材料筛选、必需metadata、沿原规则降级与预算。
- packages/core/src/ports/storage.ts：仅下述两窄方法。
- packages/storage-sqlite/src/sqlite-storage.ts：仅对应两参数化只读查询。
- tests/integration/m2-context-focus.test.ts：新增专项正式文件，真实业务反例与回归。
- docs/03-data-model.md、docs/12-decisions.md：本包规范/ADR下一号031（当前最后030，实施前重核）。
- 本包implementation/core新证据目录，开工后才保存before及日志。

现core/index已有StoragePort/ContextService导出，SQLite/index已export * sqlite-storage，无新增业务类或SQL索引，不需要动二者。schema.sql/schema.ts/DDL/migration、其它service与旧formal均不在当前可写范围。

StoragePort:1–18已import protocol Relation/Event，精确新签名提交父冻结：

```ts
listOpenChallengesForThread(spaceId: string, threadId: string, limit: number): Relation[];
listPublicEventsForThread(spaceId: string, threadId: string, atOrBeforeSeq: number, limit: number): Event[];
```

ContextService.getContext(auth,spaceId,query,budget:{request_id:string}):ContextPage保持。协议方持ContextQuery/ContextResponseData/ContextPage及schema/envelope helper，需成功focus时可选 `focus_thread: Thread` 完整只读metadata（title无新写长度限制），省略focus时不出该字段；included/omitted分支都容纳必需focus，继续同源contextEnvelopeBytes。无需新runtime validator/client业务或另service。

## 现有机制与落实次序

context-service.ts:32–56已有同步readSnapshot，refresh当前身份/space observer与read权限在显式focus400前。合法focus替换该拒绝：验证非空字符串后findThreadById并同space，否则404，open/archived均通过；材料/Thread/空间规则修订与getLatestEventSeq同一snapshot。空/白/非字符串400，授权仍优先；HTTP重复/unknown shape可transport400。快照后只签checkpoint及编码裁剪，不读DB、不poll/ack。

pins :59–74逐stored pinned_refs，新增仅p.thread_id==focus条件，其它合格规则/固定revision/source安全投影不变，数组原顺序及重复保留；跨thread source_refs允许。failures :94复用searchPosts(spaceId,'',{kind:'failure',thread_id:focusId},5)，sqlite-storage.ts:1252–1296已有active/current JOIN、参数化kind/thread、p.id DESC，不改排序或SearchPort。

challenge新查询：r.space_id限定、challenges/open，关联source和target Post且两端space均指定；任一thread匹配以OR表达不UNION制造重复；ORDER BY r.created_at ASC,r.id ASC LIMIT ?在SQL过滤后。返回现Relation字段；现projectRelation/getPostRevision投影沿用，不扫描补满。无focus继续原listOpenChallenges及slice10原输出，不偷改空间分支排序。

activity新查询：e.space_id、公有、seq<=空间高水位；thread.*直接object_id，post.*经现Post.thread_id，relation.*经Relation两端Post任一thread；同event-service.ts:194–219现订阅归属规则，其它类型排除。参数化对象关联/EXISTS不重复event，SQL过滤后ORDER BY seq DESC LIMIT ?取最新5，返回数组转ASC。现Event只含id/space_id/seq/type/object_id/revision/visibility/actor_id/created_at，无payload/thread列，无需DDL。无focus保现last5seq再public过滤行为。

focus_thread为必需字段，context-service.ts:152–165必要inline预算测量自动含它；规则object/rules整体省略及activity→failure→objection→pins尾裁沿现，不删focus。完整真实request_id/signature信封过大仍422。新LIMIT仅限制候选数量，不宣称SQL VM/CPU硬cap；pins/source现无cap维持。

## 必須先批准的旧formal调整清单

当前只列，不修改。核心旧tests/integration/m2-context.test.ts C03:55标题提到reject focus、:59–60 foreign-thread/空串统一unsupported提示：建议改未知foreign-thread为404，空为400；合法ownthread200由新增专项覆盖或父批准在此加一个ownthread正例。:56–58预算边界、:62–65无focus/meta、:67–69撤credential401原样保留。

协议旧tests/contracts/m2-context-contracts.test.ts:72–76：从原400循环分出focus_thread_id=thread（该目标不存在）期待404；空值400保留，重复focus需保或由新增合同补明确对照；tool同不存在thread改404。原预算/未知参数400与无focus信封断言不变；由协议所有者列/改，核心不跨写。

不可变旧probe docs/reviews/2026-10-03-m2-4-a/verification/check-context-http.mjs:17 CX02-09期待missing focus400确有冲突；原字节不改，应独验新增带归因版本probe为404。:28匿名401保持。已窄搜索M2.4-A/B1/B2.2 verification脚本，未见其它明确unsupported focus断言；不是全历史穷尽保证，独验继续审计。

## before与有限业务验收意图

fresh baseline后父批准才做隔离SQLite合法ownthread当前400的真实before；不以缺DTO/import失败作反例。实现后新专项覆盖多thread干扰LIMIT前筛、双端relation同space去重/固定revision、pins跨thread sources/原序重复、archived/withdrawn/redacted、未知/跨space/非法focus与当前权限优先、WAL Thread+材料+空间高水位一致、checkpoint仍space续接、完整DB无写、真实req.id预算/巨大focus422、规则省略及尾裁顺序、无focus无新增字段基线。仅新业务专项和必要sourcealias noEmit由核心运行，统一fullsuite/当前29/SDK/MCP/CLI由独验执行，禁止隐式build。

未发现不能满足父冻结行为的存储/类型实质冲突。共享风险是ContextResponseData/schema必须先由协议方提供focus metadata再编译；旧formal两个区段需父明确批准，旧独验unsupported probe须版本化，不可原地修改旧证据。另历史兼容工作线不需改以上产品文件，若共用旧formal/证据路径需父统一。
