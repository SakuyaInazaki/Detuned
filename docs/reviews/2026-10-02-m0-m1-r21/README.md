# R21：M0/M1-R4-C.1 独立复核

复核日期：2026-10-02。对象是 HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 上的 C.1 未提交工作区；准确源码见 [baseline.json](baseline.json)。本轮只审查、验证和编写交接资料，未修改产品源码或正式测试。

**结论：C.1 部分验收通过，暂不进入 M2.1。** 169/169 正式测试、13 个文件及继承的 27 条命令全部独立通过，AC01–AC06 为 6/6。成功信封修复和上一轮列举的输入已通过。C.1 任务书另外明确要求的全路由契约、错误来源分类、退避资源清理和等待上限仍有遗漏；本轮有限补查 AD01–AD05 均复现失败，归为下面三组问题。B 数据与升级包维持已验收状态，不重新开发。

下一轮执行 [M0/M1-R4-C.2 提示词](next-agent-prompt.md)。这轮补查没有增加附件、Web、评审、数据库或新宿主能力，均对应 [R20 原任务书](../2026-10-02-m0-m1-r20/next-agent-prompt.md) 已写明的要求。

## 1. 已确认的进展

| 原要求 | 本轮独立结论 |
|---|---|
| AC01 的九类具体输入/调用 | 通过：未知 GET query、重复 cursor/tags、非法 state、显式空 revision、不存在 actor、截断请求 JSON、revoke 未知 body、默认 poll |
| AC02 成功响应校验 | 通过；`ClientProtocolError` 能区分成功响应的格式故障，版本/request_id/data 校验及 falsy/未知扩展正例通过；R20-F02 关闭 |
| AC03 服务端错误 message 含 aborted | 通过；409 `REVISION_CONFLICT` 不再被猜词误判 |
| AC04 已列举的重试场景 | 通过：fetch cause ECONNREFUSED、Retry-After 60 秒计划延迟、400 禁重试、同键重发 |
| AC05 / AC06 | 原取消阶段正例、最终 listener 清理、受控 Pi 注册回调正反例保持通过 |
| B、生成管线和旧行为 | B 82 项、生成 6 项及全部旧检查通过；U01–U08 为 8/8 |
| 交付基线 | before 93 文件与 R20 一致；after 93 文件与收到的源码一致；实际修改 11 文件，其余 82 不变 |

证据：[完整复跑记录](verification.md)、[AC 输出](observed-c-boundaries.json)、[交付核对](delivery-evidence-audit.json)。总数不能代替逐条完成要求，也不能与审查探针累加成独立用例数。

## 2. R21-F01 / P2：请求契约只补了局部入口，OpenAPI 仍未描述真实约束

对应 R20 §1.1、§1.2“其他声明无 body 的写入口同样有明确策略”、§1.3，证据 AD01/AD02。

### 实际可复现行为

| 输入 | 实际结果 | 要求 |
|---|---|---|
| 合法正文创建空间，但 URL 为 `POST /spaces?bogus=1` | 201；空间、事件、幂等记录各增加 1 | 未声明的业务 query 在写入前拒绝 |
| `DELETE /spaces/:space_id/memberships/:actor_id` 携带 `{bogus:true}` | 200；成员 active 从 1 变 0 | 未声明 body 参数不能被忽略后执行操作 |
| `DELETE /spaces/:space_id/consumers/:id` 携带 `{bogus:true}` | 200；consumer 行被删除 | 同上，拒绝且状态保持 |
| 将 `{}`、错误类型 slug、未知属性分别交给 OpenAPI 的创建空间 schema | 三种都接受；真实 protocol 和 HTTP 均拒绝，HTTP 400 | 公开 schema 与运行时约束一致 |

这些是在授权的内存测试实例中验证的输入契约问题，没有发现借此绕过身份权限。问题在于调用者以为传入了控制条件，服务却忽略参数并提交操作。

来源：`packages/server/src/routes/spaces.ts:44` 的写路由没有 query 验证；`routes/admin.ts:170` 与 `routes/events.ts:67` 的 DELETE 没有 body 策略。`packages/protocol/src/openapi.ts:68` 的创建空间请求只写 `{type:'object'}`，同类占位覆盖 **19/19 个有 requestBody 的操作**。32 个业务操作名称确实列齐，但字段、required、additionalProperties、长度/范围等没有同步。OpenAPI 不导入公共业务 schema；新增清单只是存在性清单。

修复方向：让当前 32 个操作共用 protocol 请求定义与明确的传输转换。写路由也验证 query，无正文写入口统一采用明确的缺省/空对象策略并拒绝未知业务字段；OpenAPI 从这些定义导出真实约束。保留有效 body、标准 HTTP 头、默认 poll 和已通过 GET 正例。不发明新的 ID 格式，不新增管理操作幂等族，不要求重写全部路由框架。

## 3. R21-F02 / P2：仍误报用户取消，传输故障与服务端错误未区分

对应 R20 §2.2，证据 AD03。

- 外部 AbortSignal 未取消、timeout 禁用时，受控 fetch 抛 `DOMException('upstream stopped','AbortError')`，客户端仍返回 `UserAbortError`。
- fetch 抛 `TypeError('fetch failed', {cause: {code:'ECONNRESET'}})` 且不重试，与真实 HTTP 503 服务端 `TEMPORARILY_UNAVAILABLE` 都变成同一种 `DetunedError / 503`，没有稳定来源判别。只能猜 message 区分，违背既定错误分类要求。
- message 含 aborted 的 409 已修复；此正例保持通过，不能写成整项毫无进展。

来源：`packages/client/src/client.ts:314` 仍把仅凭名称识别的 AbortError 当用户取消；`:337` 为传输故障合成服务端错误类型和 HTTP 503。

修复方向：UserAbortError 只来自本次调用的外部取消；TimeoutError 只来自本次计时器。未主动取消的 fetch 中断按传输故障处理，并提供稳定类型或来源字段，使其与服务器实际返回的 DetunedError 可区分；保留 cause，保留服务端 code/status/retryable/details。保持协议解析错误、CLI/MCP/Pi 失败传播及现有重试策略，不新增服务端业务错误码体系。

## 4. R21-F03 / P2：退避仍占用请求计时器，Retry-After 未处理等待上限

对应 R20 §3.3、§3.6，证据 AD04/AD05。

### AD04：按时间顺序推进的虚拟时钟

默认单次 timeout=30000ms，服务端立即返回 503 + Retry-After=60。进入等待时同时存在 30000ms 请求计时器和 60000ms 退避计时器，外部 signal 上有 2 个 listener。推进到 30 秒，已经结束的请求 controller 被计时器 abort；整个调用仍未完成。推进到 60 秒又发出第二次请求并成功。

最终 timer/listener 确实为 0；**本轮没有证明完成后的永久内存泄漏**。缺陷是请求资源生命周期覆盖了退避阶段，timeout 语义不清，未达到“body 消费结束后先清理，再等待”的要求。旧 AC05 用 timeout=0 验证退避取消，不能检查此组合。

来源：`client.ts:302`、`:333` 在 try/catch 内 await 退避；`:343` 的 finally 只有等待完成/失败后才执行。仅抽出 sleep helper 没有解决顺序。

### AD05：真实 Node 计时器溢出

503 的 `Retry-After: 2147484` 表示至少等待 2147484000ms。客户端直接传给 Node setTimeout，被压成 1ms 并发出第二次请求；本次实际约 1–2ms 即返回成功。原始 stderr 保存了 `TimeoutOverflowWarning`。

这是新增加的 Retry-After 分支没有落实原任务要求的本地等待预算。Node 官方规定超过 2147483647ms 的 delay 会改成 1ms，与本地现象一致。[Node timers 官方说明](https://nodejs.org/api/timers.html#settimeoutcallback-delay-args)

修复方向：明确单次请求 timeout 的作用范围；进入退避前清理该次 timer/listener。为 Retry-After 秒数、HTTP-date、非有限值和超出预算定义策略；超出预算可以停止自动重试，不能压短后提前发送。正常等待/取消/耗尽后资源均清理，同一写操作使用原 key。不要求为数周后的重试做持久化调度。

## 5. R21-E01：正式覆盖与交付声明尚有落差

详见 [覆盖与证据核对](coverage-audit.md)。这是同一修复包内的补项，不另开产品阶段。

- C 测试从 13 增到 16 属实，Pi 测试已改用自己的随机端口并恢复环境变量，应予确认。
- `C02-5` 仍只在成功后调用一次 abort，没有 timer/listener 数量断言。AC05 的阶段覆盖没有完整进入正式套件。
- `C02-8` 将所有 timeout 都加速为 0ms，只断言“安排过 >=60000ms”，不能验证请求 timeout 与退避先后关系；HTTP-date、超预算路径未覆盖。
- Pi UI 用例仍只执行 forum-check；命令断言只判断调用过输出，未验证两条命令的 UI/无 UI 成功和失败内容/级别。protocol→Pi schema 的 `as any` 边界未补说明或转换。
- 实施报告的正式文件表包含不存在的测试文件，现有几个文件的用例数也写错。总数 169 是真，但这张覆盖表不能作为逐项验收依据。
- docs/04、07 确有修改；docs/04 顶部仍统称“待实现”，timeout 范围和等待预算尚未写清。三个状态入口与 R20 完成时哈希完全相同，未加入 C.1 待复核记录。compatibility 仍把最低支持版本写作 runtime，未单列实际 Node v26.3.0。
- 27 份 stdout/主输出均存在，仅 AC 一项有独立 stderr 字段，未附可复查采集器；不能确认报告声称的所有成功分支完整采集 stderr。本轮自行保存了所有命令的两条流，不据此否认已独立复现的通过结果。

## 6. 阶段判断与文件导航

当前已具备经过大量本地测试的身份、讨论、修订、精确引用、幂等和升级基础；B 包已通过。C 仍需上述三组有限修复及相关覆盖，之后才能确认 M0/M1 整体验收并领取 M2.1 附件包。四类真实宿主联调、Web、正式独立评审和真实研究评估尚未完成，不能把此次测试通过称为整个论坛已经可日常使用。

- [下一轮完整提示词](next-agent-prompt.md)
- [验证命令与实际退出码](verification.md)、[机器清单](commands.json)
- [新增有限探针](check-c-completion.mjs)、[原始结果](observed-c-completion.json)、[stderr](observed-c-completion.stderr.txt)
- [官方 harness 核对](harness-notes.md)、[覆盖与证据](coverage-audit.md)
- [复核前基线](baseline.json)、[复核后完整性](review-integrity.json)、[辅助检查与探针修正说明](auxiliary-checks.md)

没有运行：干净重装、Node 22 环境、远程 CI、四个真实宿主、模型调用、研究效益评估。没有修改全局 harness 配置、发起其他 Agent、推送或部署。
