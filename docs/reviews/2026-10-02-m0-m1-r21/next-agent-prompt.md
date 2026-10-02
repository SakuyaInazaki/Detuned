# 下一轮提示词：M0/M1-R4-C.2

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务：**M0/M1-R4-C.2：统一当前请求契约，完成错误分类与重试生命周期**。

R21 已独立确认：C.1 的 169/169 正式测试、13 个文件、继承的 27 条命令全部通过；AC01–AC06 为 6/6；R20-F02 成功信封修复关闭。B 数据/升级功能及正式回归已通过，不重做 B。下一轮只关闭 R21-F01～F03，并完成对应正式覆盖和 R21-E01 文档/证据补项。AD01–AD05 当前 0/5，均属于 R20/C.1 已要求而未完成的范围。

完成后交回复核，尚不开始 M2、Web、正式评审或自动调度。不要把“27 条旧命令全绿”单独当作任务完成条件。

## 0. 开工与约束

先读 AGENTS.md、根 README、docs/00、08、11，再读 docs/03、04、07、相关 ADR 和本目录 README、coverage-audit、verification、harness-notes、check-c-completion.mjs 及输出。R20 原任务书补充背景，当前有限清单以本提示词为准。

开工说明任务编号、目标行为、预计文件和验收方式。先把 AD 反例落入正式测试，运行并保存修复前失败，再修根因。不能只调用独立审查脚本来充当正式 CI 回归。

- 保留 HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 上已有未提交工作。用本目录 baseline 的 93 个产品/测试/构建文件记录 before；加入新增文件，文档单列。禁止 reset/clean/checkout 覆盖工作。
- 不修改旧脚本、旧 observed、旧报告、冻结历史 SQL 或 archive；失败夹具只用临时副本/内存库。
- 禁止使用、安装、启用或间接调用 deepseek-brainstorm；不启动其他 Agent、不调用模型、不改全局 harness 配置；不提交、推送、发布或部署。
- 预期范围为 protocol/server/client、必要的 Pi 局部类型边界、正式测试和文档。不升级 SDK、不新增数据库布局或迁移、不引入通用调度框架。

## 1. 单元 A：R21-F01，当前请求契约统一（AD01 / AD02）

### 1.1 对当前操作使用完整的入口规则

当前是 32 个业务操作；自动 HEAD/OPTIONS 不算新业务能力。每个操作列出 method/path、body/query/params/业务 header、schema 来源、缺省/空值/重复值/未知字段政策。表格必须描述验证方法，不只写 has_schema 或 openapi_present。

采用小而明确的共享定义或 route contract，公共字段约束仍由 protocol 提供。URL 查询的数字和 CSV 转换可以留在 server，但先拒绝错误类型/重复标量，再转换和验证，不能另写一套与 protocol 漂移的枚举/范围。保留 body `coerceTypes:false`。

必须关闭的有限矩阵：

| 场景 | 必须观察到的结果 |
|---|---|
| 合法创建空间 body + `?bogus=1` | 400；空间/事件/幂等记录均不增加 |
| 成员 DELETE + `{bogus:true}` | 400；目标 membership 的 active 不变 |
| consumer DELETE + `{bogus:true}` | 400；目标 consumer 和相关批次状态不变 |
| 其他当前写入口传未声明 query | 同一公共政策在业务执行前拒绝；用路由覆盖检查加有代表性的实际请求验证 |
| 三个无正文写入口：revoke、membership DELETE、consumer DELETE | 缺省 body、空对象和显式 null 的策略明确且一致；允许哪些必须写入契约，未知字段/数组/非对象不能静默执行 |
| 当前 GET 参数和默认 poll | 保持 AC01 正例；有效 query、标准 Host/Accept/User-Agent、`client.poll(space,consumer)` 继续可用 |

params 只按既有 ID/枚举约束验证，不发明 UUID/前缀限制。Idempotency-Key 按当前操作规则描述和验证；不要给管理操作、subscribe/poll/ack/deactivate 增加新的幂等操作族。权限、引用和状态判断继续放服务端共享业务路径，不复制到各 adapter。

### 1.2 OpenAPI 表达真实约束

目前路径为 32/32，但 19 个 requestBody 都只是 `{type:'object'}`。改为复用 protocol 定义，内联或 components/$ref 均可；不要维护第二份手写业务字段。

同步 required、additionalProperties、枚举、长度/范围、query 的 CSV 传输形式、path 和业务 header 约束，以及无 body/无 query 的政策。保留实际返回的成功/错误信封说明；只描述当前启用操作，不生成未实现 M2–M7 路由。检查匿名 capabilities、默认 poll、订阅的 header 等描述与实际行为一致，不靠改动无关业务语义迎合旧摘要。

正式契约测试至少验证：生成规范可解析且路由集合匹配；创建空间的缺字段、错误类型、未知字段三反例在生成 schema / protocol / HTTP 中一致拒绝，合法 body 一致接受。对当前全部 body 定义建立引用/结构一致性检查，不要只硬编码计数 32 或 19。AD02 支持本地 components 引用；若改变生成形式，保持行为可验证并说明。

## 2. 单元 B：R21-F02，错误来源和取消原因（AD03）

删除 `err.name === 'AbortError'` 就直接 UserAbortError 的分支。本次调用的外部 signal 真正取消才是用户取消；本次 timeout 触发才是超时；既没有取消也没有超时的底层 AbortError 属于传输中断，不伪称用户操作。

为客户端传输失败提供稳定类型或来源判别，例如小型 `ClientTransportError`，保留 cause 和必要重试信息。它必须能与服务器实际返回的 DetunedError 区分，不能通过 message 文本判断。无需增加服务端 error code，避免把一个未收到响应的网络错误伪装成真实 HTTP 503。

明确并测试五类：服务端业务错误、用户取消、请求超时、传输错误、成功响应解析/协议错误。409 的 code/status/retryable/details 必须完整保留，message 含 aborted 的正例继续通过；ClientProtocolError 不重试；取消后不发新尝试。

必要时调整 CLI/MCP/Pi 的错误适配，保留 CLI 失败非零、MCP isError、Pi execute 抛错。至少一个真正注册的工具回调验证坏 JSON 和业务冲突，不能只测 client 私有 helper。可以保留客户端网络错误的既有 CLI 退出码含义，不需要把所有错误类型强制变成同一错误码。

## 3. 单元 C：R21-F03，请求结束后清理，再进入有界退避（AD04 / AD05）

### 3.1 明确生命周期

推荐保留现有 timeoutMs 为**每次尝试从发请求到消费完 body 的超时**。尝试完成或失败后，先清理该尝试的 timer 和外部 abort listener，再由单独的可取消等待负责退避。等待结束才建立下一次尝试的资源。无论重试来自 HTTP 还是网络错误，复用同一处理流程，避免两段分支清理顺序不同。

当前 finally 包在 await sleep 外层，不能达到上述顺序。不要仅加一个 cleanup helper 而仍到等待后才调用。

用虚拟时钟或受控计时器按时间顺序验证：立即收到 503 + Retry-After 60 后，不再有上一尝试的 30 秒 timer；退避阶段只保留自己的取消资源；推进到 30 秒不会 abort 已完成的请求；遵守等待后按同键重试，或按明确预算停止自动重试；最终资源为零。不要把 30 秒和 60 秒都变为 0ms 后只检查计划过某个 delay。

### 3.2 Retry-After 有明确等待预算

保留秒数与 HTTP-date。校验数值有限、非负并安全换算；明确本地最大等待/总重试预算及配置默认值。超过预算可以返回最后的服务端错误并说明停止自动重试；不得将服务端要求等待的时间压短后继续发送。

`2147484` 秒会超过 Node 单 timer 上限并被压到 1ms；必须安全拒绝自动等待或正确处理，不能任其提前重试。无需实现数周后的持久化调度，采用停止自动重试即可。非法 header 使用文档化的有界后备策略；合法日期也受同一预算约束。

请求总次数维持“初次 1 次 + 最多 maxRetries 次”；默认 maxRetries=3 即最多 4 次尝试，在文档中直说。保留网络 cause 白名单、400/401/403/404/409/413/422 优先禁重试、固定 key；写明 timeout 是否重试。不要为了通过测试增加无限等待或笼统重试所有 TypeError。

有限正式矩阵：正常退避结束、取消退避、已完成请求的 timer/listener 清理、真实用户取消和超时、网络恢复、服务端重试耗尽、秒数/HTTP-date/非法/超预算 Retry-After、同键与禁重试状态。用虚拟时间避免真实等待 60 秒，以句柄/数量或受控资源断言清理。

## 4. 同包完成正式覆盖、Pi 边界和说明

AC05 已有请求前、等头、读 body、退避取消、超时的受控正例；将这些稳定行为纳入正式套件。删除或补强 C02-5 的空洞“no memory leak”断言，不能完成后调用 abort 就算资源验收。

Pi 已锁定 0.87.1，C.1 已把命令测试改成自己的随机端口并恢复环境变量；保留这项修复。按 [harness-notes.md](harness-notes.md) 及已安装官方类型/说明核对：

- protocol 使用 `@sinclair/typebox`，Pi SDK 使用 `typebox`；把参数 schema 的必要局部转换/断言包在明确边界并解释兼容性，验证生成 schema 没有丢约束。不是要求全仓库清除 any，也不是升级 Pi。
- `/forum-check` 和 `/forum-status` 都覆盖 UI/无 UI 的成功与失败，验证消息内容和 info/error 级别，不能只断言出现过任意输出。使用自己的临时服务或受控 fetch，恢复所有修改的环境与全局函数。
- 注册工具测试检查协议错误和业务错误向外抛出；不要重新设计 UI。官方 Pi 非交互 CLI 有 stdout 接管机制，不能凭 console.log 臆断 JSON/RPC 被污染。
- compatibility 分开记录 minimum_supported_node `>=22.19.0` 与 actual_test_runtime；按实际执行记录版本。Node 22、远程 CI、四个真实宿主、模型调用未运行就写 not_tested。dsh 继续官方 MCP 方式，不在此包启动真实宿主或模型。

更新 docs/04 的实现范围、请求政策、五类错误、每次尝试 timeout、等待预算、默认 4 次尝试；必要同步 docs/03/07 与 ADR。未实现规划能力仍明确标注。三个状态入口保持 R21 为最新独立结论，增加“C.2 已实现/实际自验结果、待复核”，不要自行伪造下一轮独立验收。

## 5. 证据与出口条件

新归档目录：`docs/reviews/2026-10-02-m0-m1-r21/implementation-r4-c2/`。

保留 before/after、新增文件与逐项差异、修复前失败及修复后日志、32 操作验证表、错误/重试矩阵、官方版本核对。正式文件名/数量从真实输出生成；不要复用 C.1 中包含不存在文件的覆盖表。

提供可检查的采集器，成功/失败都保存 stdout 和 stderr、时间及真实退出码。可以参考本目录 run-existing.py，但复制到自己的输出目录并改清数据来源，**不要直接执行旧 runner 覆盖旧 observed**。不从旧 manifest 复制成功数字当新执行记录。

最终源码稳定后 build，然后执行本目录 commands.json 的 **28 条命令**（继承 27 条 + check-c-completion）。要求：

- 全部 exit 0；AC 6/6、AD 5/5、U 8/8；B 与生成相关旧检查保持通过。
- 正式套件包含上述有限反例和正例；总数以实际执行为准，不硬编码“169/169”。
- 路由/OpenAPI 共用规则、错误类型、等待预算、资源断言和 Pi 覆盖有可定位证据，不只提交全绿摘要。
- 旧 probe、observed、冻结 SQL 和 archive 哈希不变；历史 R17 日志曾被覆盖的事实继续链接 R21 coverage 说明，既不伪造恢复，也不再写入旧目录。
- 没有执行的干净安装、指定 Node 环境、远程 CI、真实宿主和研究评估逐项如实说明；不为此包强行调用模型或修改全局环境。

交付时按 A/B/C 分别说明行为变化、正式断言和已知限制，给出 M2.1 就绪评估。达到全部条件后交回复核；确认 C 整体验收通过后，下一包是 M2.1 流式附件、哈希、配额、授权下载与孤儿清理。本轮不实现这些新功能。
