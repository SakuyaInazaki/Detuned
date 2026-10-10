# M2.4-A 协议、HTTP 与工具合同草案

2026-10-03。仅只读核对与规划，尚未由父代理冻结；没有产品/正式测试修改、build或模型调用。先读当前 AGENTS、README、docs00/08/11、progress、M2.3最终审查及 next-task/facts。范围限 context 硬预算、工具 meta 与读取快照接线，不实施固定引用继续读取、post/read分页或附件工具。

## 1. 现有落点与缺项

- protocol/search.ts:76–81 的 ContextQuerySchema：max_bytes 可省，4096–65536，default12288；focus_thread_id 可省 string。request-policies.ts:4 的 CONTEXT_BYTES 是已有唯一范围来源。tools.ts:9–13 的 ToolContextParamsSchema 手抄同范围、focus string；本包改为复用 query properties，不新增 default 注入到 transport。
- HTTP routes/spaces.ts:112–134 已解析/拒重复与未知 query，调用 core 后另包装 `{api_version:'1',request_id:req.id,data,meta:{truncated,next_cursor:null}}`。core context-service.ts:134–144 仅量 data 一次，超限清 activity、failure缩2，不复测，也未 core 验证 max_bytes。focus 传入后未使用。
- app 无 genReqId/requestIdHeader 定制；安装 Fastify req-id-gen-factory.js:30–42 默认为递增 `req-<base36>`，不是 UUID；HTTP 计量必须用当前 req.id。不能预留一个猜测常数字节数。
- client.ts:527–533 getContext 静态类型 `{data:ContextResponseData,meta?:any}`；:756–760 forum_context 取 `.data` 丢 truncated。MCP:63–68 与 Pi:55–63 把共用结果 pretty JSON 放 text，Pi details 保存结果；不需复制业务或独立裁剪。
- CLI index.ts:256–269 有 --max-bytes(default12288)、--focus-thread，调用 getContext 并打印 data；不会因为本包工具 shape 改动自动有 meta 输出。本包不改 CLI，文档明确其输出层级。

## 2. 精确共享 DTO 候选

保持 ContextResponseDataSchema 的既有字段、null/missing_fields、固定refs、summary自身/来源新版意义，不加 omitted计数或space_revision引用；这些不是本包必须字段。新增：

```ts
ContextResponseMetaSchema = Type.Object({
  truncated: Type.Boolean(),
  next_cursor: Type.Null(),
}, { additionalProperties: false });
ContextPageSchema = Type.Object({
  data: ContextResponseDataSchema,
  meta: ContextResponseMetaSchema,
}, { additionalProperties: false });
type ContextPage = Static<typeof ContextPageSchema>;
ContextEnvelopeSchema = Type.Object({
  api_version: Type.Literal('1'), request_id: Type.String(),
  data: ContextResponseDataSchema, meta: ContextResponseMetaSchema,
}, { additionalProperties: false });
```

meta 在 context 成功返回必需；next_cursor 目前只能 null，诚实说明没有本包继续材料 cursor。不能沿通用 createApiEnvelopeSchema 的 optional meta 或 string|null 宽度冒充 context 特定保证。OpenAPI context200挂 ContextEnvelopeSchema，并公开 ContextPage/Meta；不要为计量增加 Fastify响应serializer，避免删除合法字段或转换 null。client.getContext→Promise<ContextPage>，静态边界与 M2.3 SearchPage 相同，不新增 runtime client验证。

## 3. 完整 compact HTTP 长度与 core 的接口

建议 protocol 纯 helper（仅构建/编码，不权限、不选择材料）：

```ts
buildContextEnvelope(requestId: string, page: ContextPage): ContextEnvelope;
serializeContextEnvelope(requestId: string, page: ContextPage): string;
contextEnvelopeBytes(requestId: string, page: ContextPage): number;
```

builder 固定属性顺序 `{api_version:'1',request_id:requestId,data:page.data,meta:page.meta}`；serialize 只 JSON.stringify(builder)，byte helper只 TextEncoder.encode(serialized).byteLength。计入 req.id真实UTF8/JSON转义、所有键值/标点、api_version、data、meta与 true/false。false五字节、true四字节也真实计量，不能估算统一开销。protocol不引入Node Buffer或Fastify依赖。

core候选 `getContext(auth,spaceId,query,budget:{request_id:string}):ContextPage`，第四参数必需，避免HTTP静默用假ID预算。core在当前授权的统一读取快照内收集事实，事务结束后按同一seq与Clock签 checkpoint，再调用共享byte helper，逐整项移除 activity→failures→blockers→pins，任何实际移除使meta.truncated=true并以该真实meta重测。mandatory objective/rules/checkpoint/标识仍放不下，422 QUERY_TOO_BROAD并建议增大预算；不偷偷截字符串/改ref/改变事实。所有成功完整envelope≤max_bytes，错误envelope不在成功响应cap承诺内。

HTTP只传 `{request_id:req.id}`，取core已预算 ContextPage，`.type('application/json; charset=utf-8').send(serializeContextEnvelope(req.id,page))`。发送同一纯compact编码文本，route不独立删材料、不二次改meta、不使用prettyJSON或新的response serializer；现app没有onSend改正文。新HTTP测试同时断言raw payload、解析DTO及字节，不能只重建一个近似对象测量。core测量与发送不可变 page，两者之间没有修改字段。

可选若父更倾向返回builder对象：需独立证明安装Fastify默认compact JSON编码完全一致；直接发共享compact文本更窄、可审阅，建议采用。辅助函数名字与第四参数已告A协调，仍待父裁决。

## 4. max_bytes / focus 的最小变更与业务边界

max_bytes由 CONTEXT_BYTES统一引用到 ContextQuerySchema、ToolContextParamsSchema、HTTP解析、core纯结构校验；core不可只clamp。整数/safe范围4096–65536，省略12288，null/字符串/浮点/NaN/越界拒绝400；HTTP空值/重复/未知沿原query政策。有效context读取没有状态/event/幂等/ack副作用。

focus_thread_id现所有入口有schema/传递但无语义。建议本包 **任何非undefined显式400 VALIDATION_ERROR，说明当前context不支持聚焦，请省略该参数**，避免自行添加候选筛选系统；wire保留可省string以兼容入口，描述明确不支持，空/重复/错误类型仍结构400。core先当前空间权限后业务拒绝；工具SDK结构通过不等于业务支持。若父选择实现，须先冻结哪些pins/relations/failures/activity算属于thread、空间目标规则是否保留、missing/跨space404与公开事件筛选，不能简单传入一个未生效参数继续虚报。

Clock注入与readSnapshot由A负责：正常app给ContextService显式ClockPort，旧签名purpose/actor/space/seq/TTL保持，不改消费/ack；A建议构造追加clock=SystemClock可兼容旧constructor，但HTTP正常不得依赖Date.now隐藏读取。budget第四arg不建议可选假ID。B仅app构造接线，不复制快照或授权。

## 5. 工具迁移与两条真实路径

forum_context改返回完整ContextPage，旧 `result.space_id` 改 `result.data.space_id`，`result.meta.truncated`可见；没有数组隐式属性或同名假meta。MCP/ Pi 继续共用client.callTool，不改他们的权限/预算逻辑。HTTP预算约束的是compact完整HTTP envelope；tool的 `{data,meta}`、pretty JSON文字、SDK content/details外壳不承诺≤max_bytes，不能把HTTP cap虚报成整个宿主消息cap。

新正式契约文件候选 tests/contracts/m2-context-contracts.test.ts；先真实HTTP超限与tool丢meta反例，保存before日志再实施。工具路径不只mock client：

1. 本机临时真实app，造可选材料使4096触发整项删减，client.callTool以及安装Pi validateToolArguments后注册execute调用该app；parse text、核details均有真实meta.truncated=true、next_cursor=null，保留checkpoint/data/schema。大预算控制组false，不能只测字段存在。
2. MCP SDK stdio连接当前compiled bridge，ListTools核共享ContextQuery边界；CallTool→同真实app，parse text核data/meta与truncated true/false，close/环境恢复finally；无模型、无四真实宿主认证。code build需协调A，避免并发全仓构建。

HTTP正反例：4096/65536/default实际response.raw bytes、Unicode/引号/反斜杠与真实req.id转义；可在测试app onRequest钩子设置确定的含Unicode/控制字符req.id，不新增产品AppOptions。mandatory大规则422，放大预算成功；可选删减后fits/null/source事实保持；非法max_bytes/focus按父冻结；schemaTypeBox/AJV和getContext静态编译。两连接snapshot屏障与seq接续由A实施，B验证HTTP材料/返回checkpoint合同，不能用sleep或token存在替代竞态证明。

## 6. 需父授权的既有正式测试适配清单

| 文件/当前行 | 当前目的 | 最小必要适配 |
|---|---|---|
| tests/contracts/cross-interface-contract.test.ts:78–80 | 共用工具context空间/rules/checkpoint | 改读contextRes.data原三条断言，额外meta断言可放新专项；不能删除语义断言 |
| tests/contracts/m2-knowledge-view-contracts.test.ts:82 | client getContext静态返回类型 | 改expected为Promise<ContextPage>必需meta；:80现data schema比较仍保留，无需改view类型或断言 |
| tests/integration/m2-knowledge-views.test.ts:24/30/32/39/46/48/56/60 | 历史缺项、固定来源、脱敏与旧budget行为 | 如budget第四arg必需，所有调用加确定request_id；其他data断言不改。:57/60 `.truncated`改`.meta.truncated`；V06原4096保留40个source且超预算成功的预期已被硬预算取代，4096应整项移除pin并truncated true，65536控制组必须完整40refs且false；保留source参与计量的原目的。不得改历史review/probe V06原证据 |

已核 tests/integration/m0-m1-r3-regression.test.ts:417 是取消传播，mock返回在abort前不会走成功对象；不需为新meta改这份夹具。m0-m1-r2-adapters只错误分类/注册断言；r4-c契约badJSON与409错误断言不受成功shape影响。m1-discussion当前context HTTP鉴权与撤凭据断言无需改。CLI只打印data，本包如实记录，不扩CLI实现。若Clock追加兼容参数则旧constructor不强制修改；A可为确定时钟在自己的获准新测试显式注入。

## 7. 所有权候选与停写

B候选 protocol/search.ts（Context DTO/helper/query）、必要index/OpenAPI/tools，server/routes/spaces.ts及app的ContextService Clock接线，client getContext/forum_context，新contract文件、docs04与examples/context.md。A持core/context/budget、StoragePort/readSnapshot/SqliteStorage、业务/竞态正式测试与docs03/ADR。上表旧正式文件的精确适配需父单独授权；本草案不构成改测试许可。

无新增依赖/DDL，不改post/read分页、附件能力、旧reviews/probes/logs/SQL/schema/archive，不commit/push或全局配置/模型。下一步只等父冻结接口与focus/旧测试适配，再实施；规划到此停写。
