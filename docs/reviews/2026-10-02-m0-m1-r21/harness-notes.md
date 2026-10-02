# R21：官方 harness 与运行环境核对

本轮未启动任何模型或真实宿主。受控工具回调与真实跨进程 MCP 测试仍不等于四宿主认证。

## Pi

实际仓库 SDK：`packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json` 为 **0.87.1**，最低 Node **>=22.19.0**；本轮测试命令实际使用 Node **v26.3.0**、pnpm **11.7.0**。没有验证全局 Pi 安装版本。

已读取已安装包的一手文件：

- `dist/core/extensions/types.d.ts:13` 从 `typebox` 导入 Static/TSchema；`:357` parameters 使用 TParams；`:373` execute 参数顺序为 toolCallId、params、signal、onUpdate、ctx。
- `docs/extensions.md` 的 UI and modes：JSON/print 无 UI，RPC 可转发受支持 UI，hasUI 不应等同于只有交互终端。
- `dist/main.js:509` 非交互路径调用 takeOverStdout；`dist/core/output-guard.js:38` 接管普通 stdout，转发到 stderr，框架保留原始输出通道。因此本轮没有把 console.log 推断为必然损坏 Pi JSON/RPC。

protocol 使用 `@sinclair/typebox`；这解释了 adapter 中真实存在的类型边界，但不能省略 schema 保真验证。局部边界说明/转换即可，不要求升级 SDK。

在线核对 [Pi 官方扩展文档](https://pi.dev/docs/latest/extensions)：提供 registerTool/registerCommand，并要求按导出类型确定准确签名。latest 是滚动文档，包含 registerMcpServer 等新能力；不能把它直接当成锁定 0.87.1 的接口说明。本项目实现以已安装版本的一手类型为准。

## DeepSeek Harness

已复查 [dsh 官方 MCP client README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)：本地程序使用 stdio，远程服务使用 Streamable HTTP；每项 serverName 唯一；工具名为 `mcp__<serverName>__<rawName>`。stdio 协商有临时探测进程；failOnStartupError 拒绝插件激活，并不保证整个 harness 退出。

这些是文档确认，不是本机安装/认证结果。C.2 保持已规划的官方 MCP 接入，不启动 dsh、不添加自动 Agent 调度、不改全局配置。

## Node 计时器

[Node 官方 setTimeout 说明](https://nodejs.org/api/timers.html#settimeoutcallback-delay-args) 将超过 2147483647ms 的 delay 改为 1ms。本轮 AD05 在实际 Node v26.3.0 中以受控 fetch 复现了该行为，stderr 原样保留。实现应停止超预算重试或安全等待，不能压短合法 Retry-After。

## 未执行范围

Node 22 的真实运行、干净安装、远程 CI、Pi/dsh/Codex/Claude Code 宿主联调和模型推理均未运行。没有检验或声称这些能力已完成；CI 配置和类型编译仅是相应层级证据。
