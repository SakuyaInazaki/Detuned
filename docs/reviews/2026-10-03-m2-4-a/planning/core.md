# M2.4-A Unit A 开工规划（待父冻结）

2026-10-03。只读核对与接口提案；没有修改产品/正式测试，没有运行产品测试或竞态实验。当前状态入口仍为M2.3本机验收通过。本包不完成M2.4-B固定规则引用/继续读取，也不宣称完整T06通过。

## 1. 当前根因与最小快照接口

`packages/core/src/services/context-service.ts:21–158`：授权、space/revision、高水位和材料分别读取；37行取seq并立即用Date.now签checkpoint，材料随后读取。147行只计算data一次，超限仅清activity、failures保留2，无复测。focus参数没有使用。源码显示潜在规则旧版/seq新版间隙；目前没有实验证据，不能将推断写成已测失败。

`packages/core/src/ports/storage.ts:53`建议新增：

```ts
readSnapshot<T>(fn: (snapshot: StoragePort) => T): T;
```

同步回调，只用于读取，禁止await/跨出回调使用延迟结果。`packages/storage-sqlite/src/sqlite-storage.ts:50`现transaction是immediate且用私有inTransaction标志；searchPosts自己的deferred事务没有更新该标志。因此readSnapshot应检查连接实际`db.inTransaction`：已有事务时直接`fn(this)`沿用外层快照；否则用`db.transaction(() => fn(this)).deferred()`。第一次SELECT建立快照，整个callback同步执行。外层write事务中的嵌套读取不另开事务、不提交外层；嵌套readSnapshot共用同一快照。独立callback抛错由driver回滚释放事务，嵌套异常传给调用者，由外层事务所有者处理；不改write transaction/幂等语义。

接口不把deferred误称SQLite强制只读模式，不设置连接级query_only、不加DDL或通用写拦截框架。调用方只读约定与正式无副作用测试保证本包路径。运行时可拒绝thenable callback结果，避免误用async在事务结束后继续读；不引入异步StoragePort。现SqliteStorage初始化41行使用WAL，双连接测试应使用临时文件库而非两个独立`:memory:`。

## 2. 精确构造、结果与传输合同提案

与协议单元B核对可实施（尚待父冻结）：

```ts
// protocol
interface ContextPage {
  data: ContextResponseData;
  meta: { truncated: boolean; next_cursor: null };
}
buildContextEnvelope(requestId: string, page: ContextPage): ContextEnvelope;
serializeContextEnvelope(requestId: string, page: ContextPage): string;
contextEnvelopeBytes(requestId: string, page: ContextPage): number;
// serialize = JSON.stringify(build); bytes = TextEncoder UTF8(serialize).length

// core:现四构造参数保持顺序，第五参数注入ClockPort
new ContextService(storage, tokenSigner, authService, tokenSecret, clock);
getContext(auth, spaceId, query, budget: { request_id: string }): ContextPage;
```

建议第五参数默认SystemClock保持现构造调用兼容，正常app显式传已有clock；budget第四参数必传，避免虚构request_id的预算。协议共享builder固定`{api_version:'1',request_id,data,meta}`，不新增omitted计数/space_revision_ref。core和server使用同一serializer信息。server传真实req.id，并建议`.type('application/json').send(serializeContextEnvelope(req.id,page))`发已计量字符串，不重建对象或通过另一个serializer改字段；route不做材料裁减。Fastify默认req.id为计数而非UUID（本包事实单已有安装源码定位），需计入真实转义字节。

读取顺序：readSnapshot callback内刷新auth并要求当前observer权限→读取space及current revision→取材料与public event窗口→取高水位（窗口与高水位使用同一快照）→返回纯材料、actor id、seq。所有依赖storage的知识投影均在callback内。退出快照后用注入clock签同一seq，purpose/space/actor/TTL86400沿用；之后不得再读DB。签出的真实token进入预算。消费subscribe/poll/ack保持现协议，不自动ack，不使checkpoint成为模型理解证明。

## 3. 成功HTTP正文硬预算

core复用协议`CONTEXT_BYTES`（request-policies.ts:4），验证正整数4096..65536，默认12288；非法400 VALIDATION_ERROR。授权先执行，避免用错误顺序代替当前401/403授权策略。

先组装完整ContextPage，meta.truncated=false，测实际compact完整成功envelope UTF8，包括api_version、真实request_id、data、meta、标点/转义、checkpoint。若超限依次从数组尾部pop一整项：recent_activity→recent_failures→blocking_objections→pinned_summaries。首次实际删除后truncated=true，每次删除重新计算；保留原排序前端。不是发现超限就虚报已截断，不截字符串/改null/missing/source状态、不漂移固定ref。必保space_id/slug/objective/rules/policy_revision/checkpoint；全部可选数组空仍放不下，抛422 QUERY_TOO_BROAD并建议增大max_bytes。本包不承诺错误envelope也受成功正文预算约束，不提供B阶段继续读取。

工具forum_context返回{data,meta}迁移由B负责；SDK pretty text/content/details额外包装不属于同一HTTP字节预算。不把纯data限额或工具外壳混称完整HTTP限额。

## 4. focus_thread_id需父裁决

事实：spaces.ts:116–123允许并传参，core未用。仅给failure加thread筛选不能使pins/source_refs/关系/activity全部变成线程上下文；关系两端可属于不同thread，source_refs仍需保留跨thread固定来源状态；public activity只有object_id且对象类型不同。完整一致过滤会扩展本包读取语义。

建议本包对任何非undefined focus_thread_id，在当前身份/space授权之后明确400 VALIDATION_ERROR：`本阶段不支持 focus_thread_id，请去掉该参数读取空间上下文。` 不查线程ID存在与否，避免跨空间存在性泄漏；不把空串当无参数（传输现有非空校验保持）。无focus的空间上下文保持。若父要求小范围实现，必须另冻：线程同space/read授权、关系source或target匹配、failure匹配、activity对象解析、全局pin/规则是否保留及source_refs不筛除；本提案不自行实施这些规则。

## 5. 正式有限反例与受控屏障计划

新`tests/integration/m2-context.test.ts`（候选名称待所有权冻结）：

- 核心非法边界、默认/4096/65536，按真实serializer测UTF8；构造多Unicode/引号/反斜杠request_id、大source数组、大可选材料，验证逐项尾删顺序、truncated真值和保留null/missing/墓碑。
- 合法大objective/rules令必保正文超过4096时422；增大预算成功。无实体/event/幂等/ack变化。Clock固定签发exp，标准actor/space绑定保持。
- **两个真实SQLite连接同一临时WAL文件**：给A StoragePort做有限装饰，在getSpaceRevision返回旧规则后同步调用B连接SpaceService.patchSpace提交新规则+event（屏障是明确函数调用，非sleep）。A snapshot首次授权/space SELECT已建立；B提交后A继续取材料/seq，断言正文旧规则与token旧seq一致。结束A读取后从该checkpoint订阅/poll必须收到B规则事件。故障版无readSnapshot会得到旧规则+新seq而跳过事件，此反例须保存before/after。
- 嵌套readSnapshot在外层write事务及自身中不提前提交；独立callback异常后连接可正常读/写。使用真实SQL事务状态检查，不用token存在替代竞态。
- 撤凭据/成员、redacted/withdrawn/source新版、公私event保持；focus按父最终裁决验证。B负责真实HTTP原始body字节、工具meta/包装；双方证据不能替代对方层级。

本轮没有执行上述实验。后续先保存实质失败再改根因，有限source测试/类型检查后冻结；统一build/full regressions归独立验收。

## 6. 旧正式测试适配申请及所有权

| 路径/位置 | 必需或保持原因 |
|---|---|
| tests/integration/m2-knowledge-views.test.ts:24,30,32,39,46,48,56,60 | 直接getContext需真实budget.request_id；返回truncated改meta.truncated。V06:52–60原明确非硬限长、4096仍保40sources的断言与新合同冲突，应断言整个pin移除/成功bytes≤4096，65536保来源与false。不改历史日志。 |
| tests/contracts/cross-interface-contract.test.ts:74–81 | forum_context迁移后断言contextRes.data.space_id/rules/checkpoint及meta；B所有权待父批准。 |
| tests/integration/m0-m1-r2-regression.test.ts:191,216 | HTTP .json().data形状维持，checkpoint绑定语义保持，预计无需改。 |
| tests/contracts/m2-knowledge-view-contracts.test.ts:126–128 | ContextResponseData保持，无新增DTO字段，预计无需改。 |
| tests/integration/m0-m1-r3-regression.test.ts:417 | forum_context AbortSignal断言只看取消与calls，不依赖返回形状，预计无需改。 |

业务候选：context-service.ts、ports/storage.ts、sqlite-storage.ts必要readSnapshot、新core正式测试、docs03/ADR及implementation/core。B负责protocol共享page/serializer/core可复用query规则、app Clock接线、spaces route真实req.id与发送、client/tools/新HTTP正式测试/docs04。旧tests必须父明确授权后修改；不改旧probe。没有新依赖/DDL/A写校验/历史hash管线改动。接口尚待父冻结，计划完成停写。

## 7. 父追加核对：旧构造/JS调用与实际TTL消费

四参数ContextService构造通过第五参数默认SystemClock保持；新的getContext第四budget为必需，旧JS/core探针缺参会失败，不能借默认假request_id维持“完整HTTP预算”假象。仓库reviews内本次rg检索*.ts/*.mjs/*.js没有发现直接new ContextService/getContext调用；这不是对外部或动态探针的穷尽证明。若独立方旧历史探针确有直接core无budget调用，保留失败及脚本原字节，另建当前版本适配脚本提供明确测试request_id，并标明仅core预算验证；原HTTP探针继续由route传真实req.id。不得覆盖历史探针。

EventService已注ClockPort（event-service.ts:23），但subscribe checkpoint verify在41行未传nowSeconds，仍用signer默认Date.now；其他poll cursor签发159/247行和验证294行也仍真实时间。这意味着只验Context exp payload无法声称注入Clock驱动完整订阅TTL。最小申请：仅checkpoint消费41行改传`this.clock.now().getTime()/1000`，不改poll/ack cursor格式、签发/状态机。用同一fake clock通过真实subscribe成功消费，推进到exp+1后同token失败，另验证当前实现exp等号仍有效（signer现条件是now>exp），保存标准HMAC错误与actor/space拒绝回归。此event-service.ts单行属于候选所有权外，需父批准归属；若不批准，只能如实限定为context签发Clock注入、消费TTL保持真实时间，不能虚报完整TTL注入通过。
