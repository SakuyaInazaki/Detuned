# R20：B-GATE+C 独立复核

审查日期：2026-10-02。基线为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加当前未提交实现，93 个产品/测试/构建文件见 [baseline.json](baseline.json)。

**结论：B 包功能与正式回归验收通过；R4-F05/U05、R4-F06/U06 的原始问题关闭。R4-C 仍有四类既定契约遗漏，尚不能进入 M2。** 下一轮只收尾 C，不再重做 B 的数据库、迁移或生成器。

## 1. 已确认的进展

| 项目 | 本次独立结果 |
|---|---|
| 正式测试 | **13 文件，166/166**；B 82 项、生成 6 项、C 13 项 |
| 原 26 条命令 | **全部 exit 0**，包括 R4 U01–U08 **8/8** |
| B 生成补项 | no-op 已改为真实索引变异；FTS 来源、V2 跟随/V1 固定属性、V1/V2 损坏修复及缺输入恢复已进入正式回归 |
| U05 | 非法关系枚举由 HTTP 和 core 拒绝；合法 create/resolve/reopen 保持通过 |
| U06 | 截断 HTTP 200 JSON 会 reject；本轮额外验证注册 Pi 工具调用也会失败 |
| 取消与 Pi 正例 | AC05 的请求前/等响应头/读 body/退避取消、超时和结束后监听器计数通过；AC06 两个命令 × 有/无 UI 的受控成功路径通过 |
| 新 AC 检查 | **2/6 通过**：AC05/AC06 通过，AC01–AC04 失败；这是对 C 原要求的补验，不是新里程碑 |
| 交付差异 | 13 个既有文件修改、3 个新增、77 个原文件不变；after 指纹与现状吻合 |

[verification.md](verification.md) 与 [commands.json](commands.json) 保存实际命令、退出码和完整输出。现在共有 27 条验收命令：原 26 条全部通过，新 C 检查 exit 1。不能把“旧 26 条通过”写成 C 全部完成。

## 2. R20-F01（P2）：请求校验仍遗漏 query、空输入及部分写入口

复现：[AC01](observed-c-boundaries.json)。数据库、身份和凭据均为本轮临时内存夹具。

| 输入 | 实际结果 | 应有行为 |
|---|---|---|
| `GET /spaces?bogus=1` | 200，未知字段被忽略 | 拒绝未知业务 query |
| `GET /spaces?cursor=a&cursor=b` | 500 / TEMPORARILY_UNAVAILABLE | 在数据库调用前拒绝重复标量 |
| 搜索 `tags=a&tags=b` | 500，数组进入 `.split()` | 对当前 CSV 参数做明确校验，不能进入内部错误 |
| 主题列表 `state=not_a_state` | 200 | 拒绝非法枚举 |
| 帖子 `revision=` | 200，按省略处理而读取当前版 | 显式空修订是非法输入；只有省略才采用当前版 |
| 新增 membership 引用不存在的 actor | 500 | 对无效引用给稳定 4xx；无写副作用 |
| 创建主题提交截断 JSON `{` | 500 / TEMPORARILY_UNAVAILABLE | 保留请求解析错误的 4xx 分类 |
| revoke 凭据时提交未知 body 字段 | 200，**凭据实际被撤销** | 不消费未声明业务 body，不发生撤销副作用 |
| 公共 `client.poll(space, consumer)` 省略可选 query | 400；显式传 `{}` 则成功 | 保持已公开 wrapper 的默认调用可用 |

前七例的关系、事件、幂等、成员计数不变；revoke 用例在临时凭据上真实发生撤销。合法请求携带正常 Host/Accept/User-Agent 仍返回 200，poll 显式空对象正例也保持成功。

根因是只补了 body schema 和几个整数解析点。`parseIntegerQuery()` 将空串归为缺省；其他 query 继续类型断言；无 body 的写路由未排除额外输入；全局错误处理只识别 `validation`，将 Fastify 的 JSON 解析错误改成 500。新增 poll body schema 还使客户端默认不发 body 的合法便捷调用失败，应同步 wrapper 的默认 body 或明确的服务端缺省处理。

定位：[query.ts](../../../packages/server/src/utils/query.ts) 约 15–26 行；[search.ts](../../../packages/server/src/routes/search.ts) 约 26–54 行；[admin.ts](../../../packages/server/src/routes/admin.ts) 的 membership/revoke；[app.ts](../../../packages/server/src/app.ts) 约 99–138 行。

[路由清单](route-inventory.json) 共捕获 32 个 `/api/v1` 业务路由及一个自动 OPTIONS。19 个业务路由挂 body schema，没有路由级 query/params/header schema；部分已有手工/core 校验，所以“没有挂 schema”本身不是缺陷证据，上表的实际行为才是。OpenAPI 仅列出其中 13 个操作，且未同步新请求约束。

## 3. R20-F02（P2）：成功响应 envelope 仍接受非法已知字段

AC02 分别返回 `api_version: "999"`、`request_id: null`、`request_id: {}`、同时含 `data` 与业务 `error` 的 200 响应，四例均被当成成功。

[client.ts](../../../packages/client/src/client.ts) 184–196 行只检查 api_version 是任意字符串、request_id/data 属性存在。现有 API v1 的版本是字面量 `"1"`，request_id 应为字符串；业务 error 也不能成为成功 data 的附属字段。允许未知扩展字段不意味着放宽已知字段。未知属性与合法 falsy data 的正例仍应保留。

此外，解析/响应契约失败目前被包装成 HTTP status 200 的 `DetunedError(VALIDATION_ERROR)`，与服务端输入错误共用分类，未达到 C02 的客户端故障/服务端业务错误可区分要求。下一轮用最小客户端错误类别或稳定判别字段处理，不新增无必要的服务端错误码。

## 4. R20-F03（P2）：业务错误消息含 aborted 时被误判为用户取消

AC03 的两次输入都是 HTTP 409 / REVISION_CONFLICT，未提供取消信号。普通 message 保留 DetunedError；只将 message 换成 `transaction aborted because revision changed`，结果变成 UserAbortError，code/status 丢失。

[client.ts](../../../packages/client/src/client.ts) 244–248 行仍有 `err.message?.includes('aborted')`，且先于 DetunedError 分支。这与交付报告“严禁通过 message 猜分类”的说法直接矛盾。应依自身 signal、超时原因及明确错误类型分类；服务端业务错误的 message 不决定类别。

AC05 已证明常见取消阶段、超时及最终监听器清理可工作。本项不把所有取消实现判为失败，也不要求重写已通过的 signal 传递。

## 5. R20-F04（P2）：重试条件与 Retry-After 未完成

AC04 使用受控 fetch；记录请求键、次数与实际计划的延迟，并只加速测试等待，不访问网络。

| 条件 | 实际结果 | 既定契约 |
|---|---|---|
| `TypeError('fetch failed', {cause: {code: 'ECONNREFUSED'}})` 后可恢复 | 仅请求 1 次，未重试 | 按明确的可重试传输错误策略读取底层原因 |
| 503 且 `Retry-After: 60` | 计划等待 **1000 ms** 后重试 | 尊重服务器最早重试时间，或明确停止自动重试 |
| 400 且正文写 `retryable: true` | 发生第 2 次请求 | 不能让错误正文覆盖不可自动重试的 HTTP/业务类别 |

实际发生的两次重试保持了原 request_key，这一点通过。缺口在 [client.ts](../../../packages/client/src/client.ts) 199–234、255–285 行的重试决策，不是幂等结果存储。继续使用有限重试，明确最大重试数与总尝试次数的口径。

## 6. R20-E01：正式覆盖、文档与交付证据需准确收口

这些补项随 C 修复完成，不重新开启 B 开发：

- `C02-5` 标题声称 listener/timer 无泄漏，实际上只调用一次成功请求并在结束后 abort，没有统计监听器或 timer。新增 C 正式套件没有完整覆盖运行中取消/正常退避清理；R20 的独立正例不能冒充已经落入正式测试。
- Pi 命令测试没有把扩展连接到 beforeEach 创建的随机端口服务，也没有 stub fetch；扩展仍使用环境变量或默认 3000 端口。日志/notify 被调用即可通过，即使只走连接失败；UI 用例只调用 forum-check。AC06 本轮已受控确认成功行为，下一轮将真实断言写入正式套件。
- Pi 参数 schema 仍在注册点 `as any`，尚未处理已要求的局部类型转换说明。根 Node 下限已改为 >=22.19.0，但 compatibility 的 `runtime: v22.19.0+` 混合了支持声明与实际 Node v26.3.0 运行；没有本轮 Node 22 或远程 CI 证据。
- docs/03、04、07、ADR、三个活动状态入口均未在本轮交付中同步；OpenAPI 仍是原来的不完整操作摘要。未提供逐路由验证表和 M2.1 就绪评估。
- Gate A 的 26 份日志正确保存 stdout/stderr，并严格核对只有 U05/U06 失败。最终 26 份日志存在、stdout 和测试数量属实；但 `run-final-26.mjs` 成功分支使用 `execSync()` 返回值，只取 stdout，stderr 变量始终为空。不能称这些空 stderr 段为完整采集。测试摘要 `166/166` 也是运行器硬编码；本轮独立复跑已另行确认真实数量，下一轮运行器应从结果解析。
- 没有独立 `baseline-before.json`，但 R19 baseline、Gate A 快照和 after 足以核对本次产品差异；如实引用即可，不补造事前文件。可比的旧历史指纹无新增变化。
- 新交付仍将实际 `notnull: false` 写成 `is_nullable: true`、把 body UNINDEXED 写成删除 FTS 内容列、把复合 PK 变体写成 id 主键。R19 所列历史哈希/覆盖归因勘误尚无明确记录；只在新报告更正，不改旧材料。

细目见 [coverage-audit.md](coverage-audit.md)、[delivery-evidence-audit.json](delivery-evidence-audit.json)。

## 7. 下一步与产品阶段

下一包：[M0/M1-R4-C.1：补齐请求边界、响应错误与重试契约](next-agent-prompt.md)。只处理上述四类实际问题与必要正式覆盖/契约同步，保持 B、U05/U06、AC05/AC06 的已通过结果。最终要求原 26 条及 AC 共 **27 条全绿**。

B 数据与升级可靠性已完成本次功能和正式回归验收，产品推进到了请求/客户端契约收尾。M0/M1 整体仍待 C 验收，M2 附件、M5 Web、M6/M7 正式评审未开始或未完成；真实四宿主认证仍未运行，不能宣称整个论坛已可用。

本次只新增 R20 审查材料并更新三个状态入口，未修改产品源码、正式测试或旧审查输出。官方 Pi/dsh 与锁定版本核对见 [harness-notes.md](harness-notes.md)，完整性核对见 [review-integrity.json](review-integrity.json)。
