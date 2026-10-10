# R22：Pi / dsh 一手说明与验证层级

本轮重点是 Pi 参数适配是否改变语义；没有启动其他 Agent、真实 harness 或模型。

## 锁定版本与当前运行

仓库安装的 `@earendil-works/pi-coding-agent`、`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core` 均为 **0.87.1**。SDK engines 为 **>=22.19.0**，本轮命令实际运行 **Node v26.3.0 / pnpm 11.7.0**。最低声明不等于已在 Node 22 实测；未核查或更改用户全局安装。

已读取安装包的一手类型和实现：

- `pi-coding-agent/dist/core/extensions/types.d.ts:13` 从 `typebox` 导入类型；`:345` 定义 ToolDefinition，`:357` 为 parameters，`:373` 为 execute(toolCallId, params, signal, onUpdate, ctx)。
- `pi-ai/dist/utils/validation.js:280` 的 validateToolArguments 对工具 parameters 校验，不会因为适配器 execute 可直接调用就跳过 schema。
- `pi-agent-core/dist/agent-loop.js:490` 在工具执行前调用 validateToolArguments。AE04 直接使用这一安装版本的函数，对比原 schema 与实际注册 schema 的七种合法写参数；前者通过，后者拒绝。这足以确认参数入口回归，但不等于完成真实宿主认证。
- `pi-coding-agent/docs/extensions.md` 说明 UI 模式差别及工具抛错约定。AE04 对实际注册命令做八组合检查，对注册工具测试坏 JSON 与业务冲突；这些控制组通过。

protocol 使用 `@sinclair/typebox`，Pi 使用 `typebox`，两者需要明确的局部类型边界。**可解释的类型断言比改变有效 JSON Schema 的“默认字段补齐”更合适**；无需升级 SDK或全仓库消除 any。

## 在线官方说明

本轮再次读取 [Pi 官方扩展文档](https://pi.dev/docs/latest/extensions)：精确签名应依据导出类型，扩展可注册工具和命令，UI 支持随运行模式变化。latest 已包含较新的 MCP 等接口，不能据此要求锁定 0.87.1 跟随升级。已安装版本是本包实现依据。

再次读取 [dsh 官方 MCP client README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/mcp/mcp-client/README.md)（GitHub 展示页本次读取失败，raw 官方源成功）：本地接入使用 stdio，远程使用 Streamable HTTP，serverName 需唯一。此包没有改动 dsh 接入，也没有 dsh 宿主实测。

Node 22、干净安装、远程 CI、Pi/dsh/Codex/Claude Code 宿主联调和研究效果评估继续标为未测试。不要把受控 Pi SDK 校验、跨进程 MCP 通信或公开 GitHub 仓库替代这些不同层级的验收。
