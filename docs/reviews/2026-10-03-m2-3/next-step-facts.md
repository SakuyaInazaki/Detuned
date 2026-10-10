# M2.4 只读事实输入

未改冻结产品/测试/规范或旧证据，未跑新测试/10万基准。本单列源码事实、已有正式断言及尚未验证的竞态推断；未测不等于通过或失败。父代理决定下一包DTO与范围。

## 1. 当前budget及响应边界

- ContextService.getContext（context-service.ts:22–164）返回 `{data:ContextResponseData,truncated:boolean}`。query HTTP与protocol共享4096–65536/default12288（request-policies.ts:4；routes/spaces.ts:118）。core本身只取query.max_bytes??12288，未独立验证范围；HTTP/tool已有边界。focus_thread_id目前仅传入，不参与材料筛选。
- :152–164只计算完整**data** `Buffer.byteLength(JSON.stringify(result),'utf8')`一次；超限清recent_activity、recent_failures缩2，不裁objective/rules/pins/blockers，不复测。所以不能保证最终data≤max_bytes，尤不能保证最终HTTP JSON≤max_bytes。M2.2-B已把source/关系加入这一次计量，未完成M2.4。
- server/routes/spaces.ts:125–141另加 `{api_version:'1',request_id:req.id,data,meta:{truncated,next_cursor:null}}`；HTTP envelope的键/值/标点未纳入core计量，context没有继续材料cursor。
- app.ts:84 Fastify options没有genReqId/requestIdHeader定制；req.id由安装版Fastify生成。`packages/server/node_modules/fastify/lib/req-id-gen-factory.js:30`默认计数请求ID，配置默认requestIdHeader=false；不是core IdGenerator。预留必须依据实际req.id序列化字节，不假定固定UUID尺寸。
- client.getContext（client.ts:527）request<ContextResponseData>返回data/meta；forum_context:755–761只取.data，**丢meta.truncated**。MCP:63–68、Pi:59将这个result用JSON.stringify(result,null,2)放text content，另有SDK外层content/details等包装；tool实际字节不等于HTTPcompact JSON，不能把HTTP限额说成SDK完整消息限额。CLI context经client，输出路径亦应明确承诺层级。

当前字段与大小事实（protocol/search.ts ContextResponseData、spaces.ts:46–57）：

| 内容 | 当前边界/风险 |
|---|---|
| space_id/slug/objective/rules/policy_revision | objective schema≤2000字符，单项rules≤500；rules数组无maxItems，slug及ID自有schema；没有规则/space_revision定位ref，policy_revision单数不足以指明当前内容修订 |
| pinned_summaries | pin数组无上限；合法active summary固定版，title/summary取旧revision，source_refs min1无max；每来源状态含固定ref/status/newer，不含正文，重复来源仍计量 |
| blocking_objections | 当前listOpenChallenges全部取回后slice(0,10)，其中不可读过滤可能不足10；含完整关系状态/身份/固定refs，issue/impact仅typeof string检查、无读投影长度上限；任端redacted均null |
| recent_failures | 最多5，截断时2；attempt≤2000/tested_scope≤1000按基础字段投影，category/state nullable，缺项显式；title从revision |
| recent_activity | 最后窗口至多5，过滤public、不补扫描；只type/object_id/time |
| checkpoint_token | HMAC签名含actor/space/seq/exp，用长度随ID变化的base64，不是固定预算字节数 |

新写HTTP有title160、summary280及总JSON体限制，但历史/tool/core写入口并非所有长度都曾一致，所以硬预算不能假定所有旧记录自动满足新写schema。objective合法非ASCII2000字符本身可超过4KiB，rules合法多条可轻易超过；这只是源码尺寸推断，本轮没有新运行测试。

## 2. checkpoint时序/绑定/消费及读一致性

- ContextService先当前auth→findSpace/getSpaceRevision，然后:37取latest event seq并立即签 `{purpose:'checkpoint',space_id,actor_id,seq,exp:Date.now秒+86400}`，随后读取pins/blockers/failures/activity。未把整个读取包在storage读事务；空间元信息与高水位不在统一快照，签名早于材料读取。现tokenSigner已有可选nowSeconds（M2.3），context没有注ClockPort，仍实际Date.now。
- StoragePort现仅transaction（sqlite-storage:50–64 immediate写事务），没有只读快照接口。M2.3 search内部deferred读事务只覆盖自己的预检/页，不为context前后其他查询提供全读快照。
- 潜在间隙推断：findSpace/spaceRevision读到旧规则后、getLatestEventSeq之前另一连接提交规则+event，token.seq会包含这次event而response仍旧规则；订阅从token开始将跳过这个通知。相反高水位之后发生的对象更新可进入后续材料读但仍在订阅重投，可能重复观察。需要跨连接屏障正式反例，**本轮未运行，不宣称已证竞态失败**。
- event-service.subscribe:34–61先当前空间授权，start=context_checkpoint时verify签名/expiry、purpose、space、actor和seq类型/0..latest范围，错误422 VALIDATION_ERROR；以该seq设置startSeq，再现事务建立/复用subscription/consumer。checkpoint只接续事件，不代表模型理解或自动ack，不是正文分页cursor。旧pipeline不宜本包顺手升级全部M3。
- docs04:156–157明确context在一致读取快照内拿材料和高水位；docs09:T06（:14）要求checkpoint无竞态漏新事件。已有tests/m0-m1-r2-regression:S04/S05（:191/:216）验证伪开发密钥和actor绑定，cross-interface:80只验证token存在；没有已发现“规则读/高水位间隙”正式屏障覆盖。

## 3. 已完成来源状态与现read能力

- M2.2-B已完成pin只合法同space active summary固定版，摘要自身has_newer_revision与source_refs每来源status/newer分开；redacted/unavailable新版null、withdrawn保留定位，非法source数组null+missing_fields。m2-knowledge-views:V03/V05、HTTP契约B04已有对应断言；不是欠项重复实现。
- docs04:179–181要求目标/有效规则引用优先，超限返回引用/truncation与继续途径，post stable revision+段落/字节cursor不切坏UTF8，forum_read同max_bytes。当前context只policy_revision与原rules，不提供规则内容修订定位/规则读取途径。
- GET posts/:id（routes/posts.ts:46–60）只接受revision，cursor/max_bytes作为未知query被拒；core.getPost（post-service:434起）返回完整Post+PostRevision，指定固定版/撤回可读、授权后redacted410，无正文续读；client.getPost:584只发送revision。
- GET thread/:id（routes/threads.ts:69–96）提供limit1–100默认50与裸ID cursor，返回thread+Post[]（**身份/生命周期metadata，不是title/summary正文概要**），meta.next_cursor；sqlite-storage:705按随机ID ASC、id>cursor，而非文档所说创建时间顺序。不是稳定对象/修订/访问者签名游标，也没有max_bytes。
- ToolReadParamsSchema（tools.ts:28–40）广泛允许post/thread/artifact/review及revision/cursor/max_bytes1024–65536，非kind判别组合。client.callTool forum_read:773–780只实现post/thread，忽略cursor/max_bytes（thread甚至不转limit），其他kind400。没有artifact/review专用read工具实际能力，不因schema存在虚报。M2.4若限post/thread应由父明确其他kind留后包。

## 4. 现测试与需父裁决的最小选项

- m2-knowledge-views:V06（:51–60）专门确认sources计入一次计量触发truncated，并明确非硬限；不能改这份旧证据当已完成M2.4。
- r4-c-route-contracts:61验证HTTP max_bytes边界，cross-interface:72–81验证工具context空间/rules/checkpoint；m1-discussion:345/419验证授权/撤凭据。M2.2来源与脱敏回归保持。未发现最终HTTP字节≤预算、工具truncation保留、UTF8正文分页与checkpoint跨连接屏障综合正式覆盖。

给父小范围选项，非本代理裁定：

1. **预算责任边界**：core接入可计算的HTTP envelope预留/序列化上下文（req.id、meta）并返回已预算data，或server持共享序列化函数做最终整体预算、core只选材料；需决定如何保持业务选择在core、避免server自行判事实。工具compact对象预算还是完整SDK包装预算需单独声明；至少不能丢truncated。
2. **最低必需内容放不下**：明确选择缩为规则/目标固定引用并提供合法继续read途径，或显式预算错误（不假成功/不悄悄截文字）。ref DTO/规则读取接口由父冻结，不自行加新space/summary路线。优先级与条目级删减必须保留墓碑、null、missing事实，不把未检查newer变false。
3. **一致性**：增最小StoragePort.readSnapshot(fn)并SQLite deferred读事务，包context材料+高水位，事务后签token；或其他可证明不漏策略。docs04要求快照，不能仅高水位前移便宣称全材料一致。ClockPort注入可复用，旧消费/ack语义不扩。
4. **分段有限范围**：post固定修订、UTF8安全byte位置与当前ACL/脱敏重查签名cursor；thread已有页继续是否仅精确转发和typed概要，还是新budget概要，由父决定。不要扩成全部M3/正式review/附件上传工具。

候选文件：core context/post/thread或新read-budget helper、StoragePort/SqliteStorage最小readSnapshot、protocol context/read DTO及tools判别、server spaces/posts/threads预算envelope接线、client forum_context/forum_read、MCP/Pi包装说明/必要接线、docs04/新ADR与新有限正式测试。每项由父定所有权；本事实单无新DTO/实现决定。
