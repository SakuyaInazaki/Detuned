# 下一轮提示词：M0/M1-R4-C.3

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务：**M0/M1-R4-C.3：恢复 Pi 写工具参数校验，统一客户端正文生命周期，完成当前接口契约验收**。

R22 已独立确认 C.2 的 **175/175 测试、13 个文件、28 条既有命令、AC 6/6、AD 5/5、U 8/8** 全部通过。B 数据/升级与生成回归已验收，不重做 B。原 R21-F03 的清理顺序与超长等待修复已通过；保留它们。R22 新检查 AE01–AE05 为 1/5，四个失败组合归为下述三个有限功能组。先修 **P1 Pi 写入回归**，再完成客户端和 OpenAPI，随包补正式覆盖及准确交付材料。

只完成本提示词列出的范围。完成后交独立复核，目标是通过 C 整体验收并进入下一包 M2.1。**本轮不实现 M2 附件、Web、正式评审、自动调度或模型评测，也不再追加数据库损坏变体。**

## 0. 开工、基线与边界

先读 AGENTS.md、README、docs/00、08、11，再读 docs/03、04、07、当前相关 ADR，以及本目录 README、coverage-audit、verification、harness-notes、check-c2-boundaries.mjs 和 observed-c2-boundaries.json。R21 提示词仅作来源背景，本轮出口以本提示词的有限清单为准。

开工说明任务编号、要改变的行为、预计文件和验收办法。当前 R22 HEAD 是 `b8dacd56779a007a2e7045b682bca0c036fdfc44` 加 C.2 未提交实现；这是用户授权全量公开上传后的基线，不是旧 `71aefc1`。开工读取真实 HEAD，以 R22 baseline 的 93 个产品/测试/配置文件记录 before，并加入新增文件，文档单列。不得 reset、clean、checkout 覆盖用户或前轮工作。

- 预计修改：`packages/adapter-pi/src/index.ts`、`packages/client/src/client.ts`、protocol 的当前请求契约/OpenAPI、必要的 server 参数接线、正式测试、当前说明与新交付证据。不要升级 Pi SDK、引入新迁移或通用框架。
- 保留历史探针、observed、报告和交付目录原字节；冻结 SQL 与 archive 不变。旧报告的错误在新包写勘误，不能改写旧证据。
- 禁止使用、安装、启用或间接调用 deepseek-brainstorm；不启动其他 Agent、不调用模型、不修改全局 harness 配置。本轮不提交、推送、发布或部署。
- 保留用户要求全量追踪的文件，包括 node_modules、dist、日志及其他已追踪文件；不要以整理仓库为由删除或取消追踪。正常 build/test 可更新产物或缓存，但须单列说明。
- 先把 AE 失败转为正式测试并保存失败日志，再修实现；不要只运行独立探针就宣布形成了 CI 覆盖。所有全局替换、环境变量、计时器和临时服务均在 finally/afterEach 恢复。

## 1. 单元 A：R22-F01，恢复 Pi 写工具（最高优先级）

### 根因与必须恢复的行为

`adaptToolSchema()` 对 `anyOf` 顶层注入 `properties: {}`、`additionalProperties: false`。`forum_publish` 与 `forum_relate` 的字段原本位于联合分支，新约束使所有合法写参数被宿主校验拒绝。

R22 已使用安装版本 Pi 0.87.1 的 `validateToolArguments` 验证：原 schema 接受、新 schema 拒绝下列全部七个分支：

| 工具 | op |
|---|---|
| forum_publish | thread、post、revision、withdraw |
| forum_relate | create、resolve、reopen |

修复局部 `@sinclair/typebox` → Pi `typebox` 类型边界，保持原 JSON Schema 语义。可以采用有准确输入/输出类型和注释的局部断言或必要转换；**不能凭空补入运行时约束，不能将所有参数改为宽松 object，不能绕开 Pi 参数校验或修改公共工具语义来适应错误的适配函数。** 不要求全仓库清除 any，不升级 SDK。必要时在 adapter 的类型依赖中明确声明已有对应包，不依赖偶然提升的类型包路径。

### 正式验收

1. 对 activate 实际注册的全部 8 个工具建立 schema 保真检查；对上述 7 个联合分支使用合法代表参数，验证原 protocol 和注册结果都接受。
2. 至少覆盖缺必填字段、未知 op、越界 revision/version、未知属性的代表反例，避免通过放宽约束“修好”正例。比对语义，不强制 JSON 属性排列相同。
3. 使用已安装 Pi SDK 的实际参数校验器或其相同版本校验路径；至少一次合法 publish 与一次合法 relate **先经过该校验再进入注册的 execute**，在临时服务中完成调用。只直接执行 callback 无法发现本次回归。
4. 注册工具继续验证坏 JSON 抛 ClientProtocolError、409 REVISION_CONFLICT 抛 DetunedError，检查 code/status/retryable/details；不返回伪成功对象。
5. 两命令 `forum-check`、`forum-status` × UI/无 UI × 成功/失败共八组合，检查确切内容与 info/error 或 console.log/error 通道。`forum-check` 调 capabilities，是匿名可读接口，**坏 token 不是失败夹具**；用受控坏响应/不可重试业务错误，或本次临时服务的真实故障。

AE04 的八种命令输出及两种错误透传已经通过；这些项主要补入正式 CI。真实宿主/模型仍标 not_tested。参考本目录 harness-notes 的安装版类型与官方来源，不能把最新网站接口直接套到 0.87.1。

## 2. 单元 B：R22-F02，同一尝试贯穿响应正文

保留 C.2 的清理顺序：每次 HTTP 尝试从发请求到消费完 body，清理该尝试的 timer/listener 后才进入单独的可取消退避。不要重新把 sleep 包回尝试的 finally 内。

### 有限修复矩阵

| 场景 | 预期 |
|---|---|
| body promise 等待期间外部 signal 取消，随后 body 正常兑现 | 以 UserAbortError 结束，不返回成功、不发下一次尝试 |
| body promise 等待期间本次 timeout 触发，随后 body 正常兑现 | 以 TimeoutError 结束，不返回成功、不自动重试 |
| 上述两种情况分别遇到 200 和 409 正文 | 都尊重本次已发生的控制信号；未取消的 409 保真正例仍通过 |
| 200 的原生正文流以 UND_ERR_SOCKET/ECONNRESET cause 失败 | ClientTransportError，保留 cause/code；有预算时按相同键有界重试，下一次正常响应可恢复 |
| 正文流抛未由用户/timeout 触发的 AbortError | 传输中断，与请求头阶段一致；不能伪称用户取消或完整 JSON 语法错误 |
| 完整响应读完但 JSON 损坏/信封非法 | ClientProtocolError，一次失败，不进入传输重试 |
| TypeError('fetch failed') + cause.code=CERT_HAS_EXPIRED | 一次失败；ClientTransportError、retryable=false、保留 cause；不能猜 message 放行重试，不能关闭 TLS 校验 |
| 已知网络 cause、真实 HTTP 503、409 含 aborted 文案 | 仍区分来源，409 的 code/status/retryable/details 不丢 |

建议用一个小型分类路径在获取响应和消费正文两阶段复用，不维护两套会漂移的判断。外部取消与本次超时以本次状态为准；在正文 await 成功兑现后也检查，不只在 catch 中检查。网络重试保留既有 cause 错误码白名单；未知 TypeError 不因消息相似就重试。保留禁重试状态优先级和 maxRetries 计数，默认初次 1 次 + 3 次重试 = 最多 4 次尝试。

已收到明确不可重试 HTTP 状态时，不应因为错误正文损坏而开启原本禁止的重试；不得为 AE02 改坏 400/401/403/404/409/413/422 的现有政策。

### 正式时序验证

- 将 AE01/AE02 的反例和正例固化，覆盖 body 抛错与 body 后兑现两条路径。
- 修正 C02-5 的退避取消：使用至少一次重试预算，先证明已进入等待，再取消；断言没有第二次 fetch，并检查 timer/listener 归零。不能在创建请求 timeout 的瞬间就取消并称为退避测试。
- 保留 C02-10 / AD04 的按时间顺序检查：30 秒时不能 abort 已完成的请求，60 秒后才重试或按预算停止。
- 保留 AD05 超大秒数停止；把 AE05 的合法 HTTP-date、明确非法 header、有意义的日期超预算三例加入正式套件。非法 header 使用已文档化的有界后备退避；不把合法等待压短后发送。
- 所有全局恢复放 finally。给派生 Promise 安装失败处理，修复前记录应是明确断言失败，避免额外 unhandled rejection 混入。

## 3. 单元 C：R22-F03，完成当前操作的非 body 契约

19 个 requestBody 定义现在已经正确绑定，32 操作集合也已匹配，不重写已正确的 body 业务字段。完成上一包遗漏的 query/path/header/security/required 说明，并让服务端与生成规范复用公共约束。

必须逐项关闭 AE03 的五处不一致：

1. 列表 limit 的最小值、最大值和默认值与实际一致，不能只有 integer。
2. search kind 等既有枚举从 protocol 复用，不能在服务端与 OpenAPI 各自手写不同列表；CSV 参数明确传输形式及拒绝重复值的政策。
3. capabilities 明确允许匿名，不继承全局 Bearer 必需。
4. subscribe 不虚列必须的 Idempotency-Key；不要为迎合旧规范新增订阅/管理员幂等族。
5. raw HTTP poll 与 OpenAPI 的 body 必填说明一致。优先如实将 HTTP object body 标为必需并说明 `{}`；公共 `client.poll(space, consumer)` 仍默认发送 `{}`。不要将可选 query 对象与省略 HTTP body 混为一谈。

建立当前 **32 操作的可核对表**：method/path、body/query/path params/业务 headers、schema 或公共验证函数来源、缺省/空值/重复值/未知字段政策及对应正式断言。允许使用小型显式契约表或共享 schema/helper；不要求通用路由框架，也不要求原本没有查询参数的路由凭空拥有 query schema。

表和规范还须覆盖当前已有的 max_bytes、revision、view name、空白 Idempotency-Key 等实际约束，以及三个无正文写接口的 undefined/null/{} 接受与其他输入拒绝政策。按现有 ID/枚举定义处理 params，不新增 UUID/前缀规则。普通 Host/Accept/User-Agent 等标准 header 正常允许；仅描述和校验业务 header。body 保持 coerceTypes:false。

OpenAPI 无法直接表达的未知 query、重复参数等政策，可用说明或局部扩展并配合 HTTP 正式测试，不宣称标准 parameter schema 自动实现了它们。权限、引用、状态判断仍在服务端业务层。

正式契约测试需比较完整 method/path 集合和全部 body schema 的引用/结构或等价约束；对本节非 body 约束有代表性生成 schema / protocol / HTTP 正反例。不要只断言数量 32/19，不要放宽原有服务端校验使文档“碰巧吻合”。

## 4. 同包交付 R22-E01：准确覆盖与状态

- 纠正每文件测试统计。真实基线清单在 R22 coverage-audit，不存在的文件不能继续出现在完成表；统计应来自本次测试输出。
- compatibility 分开保存 `minimum_supported_node` 与 `actual_test_runtime`，实际命令使用哪个 Node 就写哪个。未运行 Node 22、干净安装、远程 CI 和真实四宿主就逐项写 not_tested。
- docs/04 开头区分当前已实现与规划能力；写清每次尝试 timeout 覆盖 body、timeout 不自动重试、等待预算默认值、非法 Retry-After 后备策略和最多四次尝试。同步必要的请求约束/ADR，但不改历史审查原文。
- 根 README、docs/progress、docs/reviews/README 的独立验收结论保持 **R22**，增加“C.3 已实现/本次真实自验、待复核”，不要自称 R23 独立验收通过。
- 对旧 C.2 文档的 HEAD、运行环境、覆盖表写新勘误。不能据旧 HEAD 重置工作区；最终报告记录实际 HEAD + 本次 before/after 差异。

## 5. 验收与证据出口

新交付目录：`docs/reviews/2026-10-02-m0-m1-r22/implementation-r4-c3/`。

保存 before/after、新增文件、逐文件变化、正式修复前失败、修复后输出、32 操作政策表、Pi 七分支/八命令组合、客户端有限矩阵和运行环境。提供可检查的采集器，stdout/stderr 分开记录，包含真实退出码与时间；失败/超时也必须落盘。

最终源码稳定后 build，再执行 **R22 commands.json 的全部 29 条命令**。可以复制 runner 到自己的目录并调整输入/输出，不能直接执行旧 runner 覆盖历史 observed。每条命令都须真实运行，不复制旧 manifest 的成功数字。

出口条件：

- build、typecheck、lint、正式全套与全部 29 命令 exit 0；正式测试总数从实际输出统计。
- AC 6/6、AD 5/5、AE 5/5、U 8/8；B 与生成旧回归保持通过。
- Pi 七种合法写操作通过安装版参数校验且负例约束保留；真实注册执行路径有正式证据。
- 客户端正文阶段和已通过的清理/等待行为共同成立；OpenAPI/HTTP 有限差异关闭；正式覆盖与政策表可定位。
- 旧脚本/observed/报告/交付材料、冻结 SQL、archive 原字节保持。历史 R17 输出曾被覆盖的事实继续引用现有说明，不伪造恢复。
- 说明完成行为、实际验证、未测试范围和 M2.1 就绪判断，不以测试数量替代这些出口。

满足以上条件后交回复核。下一阶段目标仍是 **M2.1：流式附件、哈希、配额、授权下载和孤儿清理**。这三组收尾不需要额外模型账户、真实模型调用或管理员全局配置，也不需要扩张到其他数据库任务。
