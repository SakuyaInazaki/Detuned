# R23-A：Pi 与 client 有限独立审查

审查日期：2026-10-03。范围：R22-F01/F02 与 C.3 明确要求的正式覆盖。只读产品源码、正式测试、C.3 交付与安装版 Pi 0.87.1 类型/校验代码；未改源码、测试或历史证据，未调用模型、外网或宿主。29 命令由验证 Agent 统一运行，本审查不重复执行，测试运行结论以其新证据为准。

结论：未发现需要新增产品故障维度的证据；F01 的运行语义已修复，F02 的主要反例已有实现与正式断言。以下三项是 C.3 明确出口中的正式覆盖遗漏，不能因现有测试全绿标为全部完成。整体门禁由父 Agent 判断。

## R23-A01 · P2 · Pi 正式验收矩阵仍缺项（覆盖遗漏）

位置：`tests/contracts/r4-c-contracts.test.ts:1492`、`:1550`、`:1588`、`:1685`。

- C03-1 以坏 token 调 forum-check，但 capabilities 匿名，且没有检查该命令 error 输出；C03-2 没有执行 forum-check 失败。两命令 × UI/无 UI × 成功/失败的八组合没有完整正式断言。已有成功断言多用 stringContaining，未覆盖完整内容与错误通道隔离。
- C03-4 只直接执行 context 成功，以及不存在空间的普通 toThrow；未构造坏 JSON 或 409，也未检查 code/status/retryable/details。
- C03-5 的七分支 SDK 参数校验与所有工具 schema equality 存在；live 部分只验证并执行 publish/thread（1693–1701），未先校验 relate 再执行。

最小复核：读取上述测试即可确认没有对应受控输入与断言。正例：C03-5 的七分支、缺字段/未知 op/越界/未知属性反例均存在，validated publish 确实连接临时真实服务。本项不声称 relate 或命令当前产品行为失败；R22 独立探针不能替代要求中的正式 CI。

影响：相关执行映射、错误透传或命令错误通道回归不会被这些正式测试发现。最小修复：补 validated relate/create 的真实服务执行；用受控坏 JSON/409 调注册工具检查完整错误字段；补 forum-check 的受控失败，并逐个断言八组合的具体内容与渠道。所有环境/fetch/console 替换在 finally 恢复。

## R23-A02 · P2 · C02-5 仍没有进入退避阶段（覆盖遗漏与清理缺口）

位置：`tests/contracts/r4-c-contracts.test.ts:55`、`:771`–`:791`。

beforeEach client 为 maxRetries:0；所谓 backoff case 在创建任何 setTimeout 时直接 ctl4.abort。client 首先创建请求超时 timer，所以此处在请求生命周期开始就取消，503 重试等待没有发生。backoffCalls 不作断言，timer 没有归零断言。setTimeout 恢复在正常路径 791 行，finally 仅恢复 fetch；断言失败会留下全局替换。

最小复核：以上源码构造足以确定阶段；不需要重跑全套。正例：C02-10 已有退避前清理的时钟顺序断言；C02-12 检查正文兑现后取消/timeout 与清理。本项不声称实际 sleep 取消已坏。

影响：退避取消这一明确要求仍未纳入 CI，失败路径还可能污染后续测试。最小修复：用 maxRetries≥1 客户端，受控时钟推进完首次503正文，确认真实 backoff timer 与单独 listener 存在再取消，检查 fetch=1、timer/listener=0；所有替换统一 finally。

## R23-A03 · P2 · 正文中断遇已知禁重试 HTTP 状态缺正式控制组

位置：`tests/contracts/r4-c-contracts.test.ts:1283`–`:1388`；`packages/client/src/client.ts:335`–`:338`。

C02-13 的 brokenBody 固定 status:200，五个子场景没有收到 400/401/403/404/409/413/422 后正文流失败的输入。C02-8 的正常JSON retryable_400 是有用正例，但无法覆盖正文 catch 分支。C.3 已明确要求不可重试 HTTP 状态不得因正文坏掉启动自动重试。

最小复核：测试夹具与源码分支比对。最小修复：增加一个代表性禁重试状态（如409）的原生正文流中断，maxRetries≥1，检查 calls=1、retryable=false、HTTP来源/status真实；保留200正文中断可恢复正例。错误类型可按当前HTTP契约决定，不单独强制 ClientTransportError。

## 非阻塞说明与类型勘误

- C.3 README:29 把官方 Pi 校验器写为“基于 Ajv”。安装版 `pi-ai/dist/utils/validation.js:243` 调 `typebox/compile` 的 Compile，284/299 调 Check；正式 C03-5 单独的 Ajv 控制组与官方验证路径应区分。无需升级 SDK。
- C.3 README:45 与 coverage 表声称禁重试4xx正文中断返回 ClientTransportError；实际源码落入 json=null 的 HTTP DetunedError 分支。不重试政策仍保持，应更正描述，不能据错误说明新增类型要求。
- `adapter-pi/src/index.ts:22` 仍是 any→any 无注释；运行时保真成立，但 C.3 要求的准确局部类型边界未落实。建议以 protocol TSchema 输入、Pi typebox schema 输出建立明确局部断言/注释；不改变运行时字段约束，不全仓库清除 any。

## 限制

未单独运行产品探针或正式套件；以上是有限源码与断言审查，运行证据由验证 Agent 统一提供。未做真实 Pi 宿主、模型、Node22、干净安装、远程CI认证。没有审查数据库 B、M2或更远边界。
