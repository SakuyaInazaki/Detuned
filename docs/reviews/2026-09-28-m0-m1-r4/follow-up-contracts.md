# 后续任务书：R4-C 请求/响应契约

**本文件是 R4-B 验收后领取的独立任务，不是 next-agent-prompt.md 当前回合的附加范围。** 当前基线已确认 R4-F05/U05 和 R4-F06/U06 失败。它们必须关闭后才能评估 M2.1，不能作为长期豁免。

## C01：已启用 HTTP 路由按公共 schema 验证

列出实际注册的路由，标明 body/query/params/header 的验证来源与已实现范围。以 protocol 为 schema 来源，补齐 relations、admin、events 等现有路由；未实现的 M2–M7 接口继续标设计，不空建接口。

合法请求保持成功，非法枚举、错误类型、未知业务字段、无效版本与引用返回稳定 4xx，不写 relation/event/idempotency 等状态。core 仍负责枚举与状态迁移、权限、空间归属及幂等不变量；CLI/MCP/Pi 不复制这些规则。

请求头保持正常 HTTP 兼容，不能因 Host/Accept/User-Agent 等标准头拒绝请求。query 的数字解析、范围、重复值等行为明确，避免通过类型断言或 parseInt 静默截取坏输入。只覆盖当前实现的参数，不借机完成所有未来分页/预算功能。

同步 HTTP、公共 protocol、OpenAPI 和现有客户端工具映射，区分实际启用接口与规划接口。至少以 U05 的合法/非法一对请求证明：拒绝非法关系值的同时，合法关系仍可创建、resolve/reopen，且跨入口结果一致。

## C02：客户端失败与取消生命周期

修复 U06：200/201 的 JSON 解析失败、截断响应或不合规成功 envelope 必须 reject；不能 resolved undefined。空响应只在契约明确允许时接受，不把无 data 的错误对象当成功。保留向前兼容的未知响应属性。

区分用户取消、超时、传输/解析失败与服务端 DetunedError；不要以错误 message 含 aborted 来猜分类。取消不再重试，允许重试的网络错误采用既定有界策略，所有写重试复用原 request_key，不能声称取消已回滚服务端。

每次请求到 body 完成、重试退避结束都应清理 timer 和 abort listener。当前匿名 backoff listener 在正常退避结束后不会移除，应通过可验证的 helper 或等价实现处理。保留已通过的 Pi→wrapper→request→fetch signal 传递。

补充有控制屏障的测试：请求前、等响应头、读 body、退避期间分别 abort；正常退避后检查监听器清理；超时与用户取消可区分；请求数不在取消后增长；损坏 JSON 经直接 client 与至少一个实际 adapter 工具表现为失败。不要只传入预先 aborted 的 signal。真实回环流式 HTTP 可用，不需调用模型。

## C03：Pi 与交付状态的准确记录

维持官方 `@earendil-works/pi-coding-agent@0.87.1` 类型编译。根据已安装官方声明检查 TypeBox 参数 schema 的转换边界，缩小并说明必要的第三方 `any`；补命令输出及无 UI 场景的受控测试。未运行宿主就保留 not_tested，不把签名编译当完整支持。

可核查的官方来源为 [Pi Extensions](https://pi.dev/docs/latest/extensions) 与 [dsh MCP 客户端](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)。本包不改 dsh 的接入路线、不修改全局配置、不新增自动唤醒或多 Agent 调度。

根 engines、adapter 的最低 Node 要求、CI Node 版本、packageManager 和文档保持一致。当前官方 Pi 依赖声明 Node >=22.19.0，本机验收为 26.3.0；不能据本机结果声称 Node 22 全范围均验证。按锁文件安装并运行 CI 中适用命令，区分本地执行和远端 CI。

## 出口

| 项目 | 条件 |
|---|---|
| R4-F05 / U05 | 非法关系 4xx 且无新增状态；合法关系正常 |
| R4-F06 / U06 | 截断 JSON reject；CLI/MCP/Pi 的相关失败映射正确 |
| 已启用路由契约 | 有清单、公共 schema 及正反例，未知业务属性被拒绝 |
| 取消/超时/退避 | 各阶段受控验证，timer/listener 清理，有界重试与原键保持 |
| Pi | 官方类型编译与受控行为通过；真实宿主状态如实记录 |
| 全局回归 | build/typecheck/lint/正式套件、46 项旧探针及 R4 U01–U08 通过 |
| 文档 | 无“三包已完成”与实际待办相矛盾的活动状态；留下命令和证据 |

保存修复后结果，不覆盖本次 observed。R4-B/C 都验收完成后，提交一次 M2.1 就绪评估并停止；不在本回合自动开始附件实现。
