# R20：Pi/dsh 官方资料与锁定版本核对

核查日期：2026-10-02。只核查文档、已安装包及受控注册回调，未运行真实四宿主认证或模型任务。

## Pi 0.87.1 的已安装依据

`packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/`：

- `package.json`：版本 0.87.1，engines.node >=22.19.0。本轮实际 Node v26.3.0，pnpm 11.7.0。
- `dist/core/extensions/types.d.ts`：ToolDefinition 约 345 行，参数类型来自 `typebox`；execute 含 toolCallId、params、signal、onUpdate、ctx；ctx.mode / hasUI 约 214 行。
- `docs/extensions.md` 189–194 行：扩展可运行在交互、RPC、JSON、print 模式；RPC 可提供支持的 UI，JSON/print 没有 UI。
- `dist/main.js` 507–510 行与 `dist/core/output-guard.js`：非交互 CLI 路径接管普通 stdout，把普通输出转向 stderr；框架的协议输出走专门的 raw stdout。

所以不能仅凭 adapter 使用 console.log 就断言它一定破坏该锁定 Pi CLI 的 JSON/RPC 协议。本轮没有将此作为缺陷；AC06 对无 UI 输出可观察性与 UI 通知的受控检查通过。SDK 自建宿主与官方 CLI 的输出安排可能不同，真实宿主仍保留 not_tested。

在线 [Pi Extensions 官方说明](https://pi.dev/docs/latest/extensions) 也区分模式/UI 与工具失败，但它是滚动版本，现已列出新版本 MCP 注册等能力。下一轮依据仓库锁定的 0.87.1 声明处理局部参数 schema 转换，不直接套用 latest 的新增 API，不升级 SDK。

当前 `parameters: toolDef.schema as any` 与 params 强制断言未改；这里需要一个局部、有类型和说明的适配边界，并保留实际注册工具的契约测试。根 Node 下限的修正有效，但 `compatibility.json` 应分别记录最低支持声明和本轮实际运行版本，不能把范围字符串当实测版本。

## dsh

[官方 MCP 客户端 README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) 保持 stdio/streamable HTTP 入口和服务命名空间；stdio 协商会启动探测进程，工具错误应显式失败。共享客户端的失败分类和 MCP 映射应符合这条边界。

本包没有修改 dsh 的宿主配置或 MCP 路线；Detuned 的 stdio 受控测试不能替代实际 dsh 启动与认证。没有安装/启动 dsh，也没有修改 Codex、Claude Code 或 Pi 的全局配置。后续 M4 再按授权与实际安装版本完成宿主联调。
