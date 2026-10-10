# R22：M0/M1-R4-C.2 独立复核

**结论：部分验收通过，C 整体仍需收尾。** 独立重跑确认 **175/175 正式测试、13 个文件、继承的 28 条命令全部通过**；AC 6/6、AD 5/5、U 8/8。C.2 修复了原 AD 反例，B 数据与升级包继续维持验收。新增有限检查 AE 为 **1/5 通过**，归为下述三组问题；其中 Pi 写入 schema 是本轮引入的直接功能回归，优先处理。

下一包：[M0/M1-R4-C.3 提示词](next-agent-prompt.md)。本轮不修改产品实现；下一轮只完成这三组及对应覆盖/证据，完成后再复核进入 M2.1 的条件。附件、Web、正式独立评审和真实四宿主接入尚未完成。

审查对象是 `b8dacd56779a007a2e7045b682bca0c036fdfc44` 加 C.2 未提交工作，详见 [baseline.json](baseline.json)。相对 R21，93 个产品/测试/构建配置文件中 9 个改变、84 个不变。HEAD 的变化来自用户此前授权的全量公开仓库快照，不能按交付中沿用的 `71aefc1` 回退工作区。

## 已确认完成

| 项目 | 独立结论 |
|---|---|
| 未声明写 query、三个无正文写端点的未知字段 | AD01 通过；代表性非法请求返回 400，空间、事件、幂等、membership、consumer 状态不变 |
| OpenAPI requestBody 占位符 | AD02 通过；AE03 进一步比对完整路由集合及所有 body，32 操作匹配，19 个 body 定义均与服务端路由 schema 一致 |
| 请求阶段孤立 AbortError、传输/服务端来源区分、409 保真 | AD03 通过；下面 F02 是正文阶段遗漏和新重试判断回归，不否认这些修复 |
| 尝试资源在退避前清理、超限 Retry-After 安全停止 | AD04/AD05 通过，R21-F03 的功能修复关闭；AE05 的 HTTP-date、非法值后备、超预算日期正例也通过 |
| Pi 两条命令的 UI/无 UI 成功/失败输出 | AE04 的 8 个命令组合全部通过；注册工具的坏 JSON、409 抛错与 details 保留也通过；正式 CI 尚未完整固化 |
| B 与生成回归 | B 82 项、生成 6 项及相关历史探针保持通过，不重新扩大数据库审查范围 |

## R22-F01 · P1：Pi schema 适配使两个写工具的全部操作无法通过参数校验

位置：[adapter-pi/src/index.ts:22](../../../packages/adapter-pi/src/index.ts#L22)，新增的 `adaptToolSchema`。

`forum_publish` 与 `forum_relate` 的原 schema 是 `anyOf` 联合，字段约束在各分支内。新函数为其顶层补入 `properties: {}` 和 `additionalProperties: false`，这会把合法的 `space_id`、`request_key`、`op` 等全部视为额外字段。并非 TypeScript 类型外观问题。

AE04 对实际注册的参数 schema 使用 Ajv 和已安装 **Pi 0.87.1 的 `validateToolArguments`** 双重验证：thread/post/revision/withdraw、create/resolve/reopen 共 **7 个合法输入**，原 protocol schema 全部接受，新适配结果全部拒绝。官方 agent-loop 在执行工具前调用该校验器，因此这些调用到不了 HTTP 写入。这是安装版本校验器层面的实证，未启动真实宿主或模型。

正式 C03-4 只检查 `forum_context` 的 properties/required 并直接调用 execute，遗漏了联合写 schema。应让局部类型适配保持原有 JSON Schema 语义，不能通过放宽所有分支、删除未知字段约束或绕过宿主验证解决。

## R22-F02 · P2：错误与取消处理没有覆盖整个响应正文阶段

位置：[client.ts:328](../../../packages/client/src/client.ts#L328)、[client.ts:345](../../../packages/client/src/client.ts#L345)、[client.ts:119](../../../packages/client/src/client.ts#L119)。AE01/AE02 复现三项同一尝试生命周期内的问题：

1. 重构删除了 `await res.json()` 返回后的取消/超时检查。受控调度中，正文 promise 等待期间外部取消或该尝试 timer 已触发，随后正文正常兑现，200 仍成功返回；409 则作为普通业务错误返回。四种组合均未按已发生的取消/超时结束。资源最后确实清理为零，这不是永久泄漏；该探针也不声称已在真实网络中复现竞态。
2. 原生 `Response` 的正文流以 `TypeError('terminated', cause.code='UND_ERR_SOCKET')` 或孤立 AbortError 失败时，被统一转成 `ClientProtocolError`，cause 丢失；即使有重试预算也只调用一次。应区分传输中断和已经完整读到但语法损坏的 JSON。后者当前一次失败、不重试的正例继续通过。
3. 新增 `/fetch failed/i` 猜词判断绕过网络错误码白名单。`TypeError('fetch failed', cause.code='CERT_HAS_EXPIRED')` 在 `maxRetries=1` 时调用两次，并返回 `retryable: true`。这是永久 TLS 错误，应保留传输来源及 cause 并停止自动重试，不得禁用证书校验。

修复应统一处理获取响应和消费正文的错误来源，同时保留 C.2 已正确的“清理尝试资源后再退避”。业务 409 保真、固定幂等键、禁重试 HTTP 状态、合法 falsy data 均须保持。

## R22-F03 · P2：OpenAPI 的非 body 契约仍与实际接口不一致

位置：[openapi.ts:60](../../../packages/protocol/src/openapi.ts#L60)、[:88](../../../packages/protocol/src/openapi.ts#L88)、[:345](../../../packages/protocol/src/openapi.ts#L345)、[:364](../../../packages/protocol/src/openapi.ts#L364)、[:407](../../../packages/protocol/src/openapi.ts#L407)。这些是 C.2 原提示词已明确要求的项目。

| AE03 输入/行为 | 生成规范 | 实际 HTTP |
|---|---|---|
| `GET /spaces?limit=0` | integer 无下界，接受 | 400 VALIDATION_ERROR |
| search `kind=bogus` | string 无枚举，接受 | 400 VALIDATION_ERROR |
| 匿名 capabilities | 继承全局 Bearer 必需 | 200 |
| subscribe 不带 Idempotency-Key | header 必需 | 201 |
| poll 省略整个 body | requestBody 可选 | 400 VALIDATION_ERROR；`{}` 正例 200 |

当前公共 client 的默认 poll 会发送 `{}`，这一修复仍有效。优先更正规范和共享约束以描述现有语义，不为迎合旧文档引入新的管理员/订阅幂等操作族，也不改动无关业务。OpenAPI 未表达“未知 query 禁止”等政策时可使用明确说明/扩展，不能虚称标准校验器自动执行这些政策。

## R22-E01：正式覆盖与交付说明补项

这些随上述修复一起完成，不单独要求新功能或另一轮纯文档包。

- C03-4 未测试联合 schema、坏 JSON 或 409 冲突；缺失空间的普通 `toThrow()` 不能代表这些断言。C03-1 以坏 token 模拟 `/forum-check` 失败无效，因为 capabilities 匿名可读；它未断言该命令失败输出。C03-2 没有调用 `/forum-check` 失败路径。
- C02-5 的“退避取消”使用 `maxRetries: 0` 的 client，并在创建请求 timeout 时立即取消，实际未进入退避。应按阶段推进时钟并检查调用次数、timer/listener；所有临时全局替换放 finally。
- 日期与非法 Retry-After、所有 body schema 对应关系已有本轮独立正例，但仍需进入正式套件。正式测试不能只用 32/19 两个硬编码数判断契约一致。
- [C.2 coverage-audit](../2026-10-02-m0-m1-r21/implementation-r4-c2/coverage-audit.md) 再次列入不存在的文件和错误的每文件数量。175 总数真实，覆盖表不准确，正确清单见本目录 [coverage-audit.md](coverage-audit.md)。
- 交付未提供 32 操作的 body/query/params/业务 header 政策表或可检查采集器；其 stdout/stderr 文件存在，本轮也已独立复跑，不能据此否定真实通过的命令。
- `compatibility.json` 仍以 `runtime: v22.19.0+` 混合最低支持与实际运行，实际是 Node v26.3.0；交付基线/verification 仍写旧 HEAD。下一包提供更正说明，保留旧证据原文，不覆盖历史报告。

## 证据与边界

- [执行与限制](verification.md)、[命令清单](commands.json)、[AE 输出](observed-c2-boundaries.json)、[正式覆盖核对](coverage-audit.md)、[官方 harness 核对](harness-notes.md)。
- 28 条既有命令全部 exit 0；第 29 条 AE 命令 exit 1，4 个失败检查归为 3 个功能组，不能写成 29 条全绿。
- 未进行干净安装、Node 22 实跑、远程 CI、真实 Pi/dsh/Codex/Claude Code 联调或模型研究评估。公开 repo 存在不等于远程 CI 已核验。
- 本轮未修改产品源码、正式测试、历史探针/交付证据、冻结 SQL 和 archive。构建产物与本轮开工基线相同；测试运行会更新已被用户要求全量追踪的 Vitest 缓存。最终文件核对见 [integrity.json](integrity.json)。
