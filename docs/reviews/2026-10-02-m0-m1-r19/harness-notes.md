# R19：R4-C 的 harness 版本边界

核查时间：2026-10-02。本轮只查官方资料、锁文件和已安装声明；没有运行真实宿主认证、调用模型或改动用户全局配置。

## Pi

仓库安装的是 **`@earendil-works/pi-coding-agent@0.87.1`**。本地官方声明来源：

- `packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json`：engines 为 **Node >=22.19.0**。
- 同包 `dist/core/extensions/types.d.ts`：`ToolDefinition.execute(toolCallId, params, signal, onUpdate, ctx)`，约 345–373 行；`ctx.hasUI` 约 216 行；`registerCommand(name, options)` 约 1021 行。
- 同包 `docs/extensions.md`：工具执行错误通过抛出异常报告；受控工具调用仍需符合返回类型，命令按 UI 可用性处理。

在线 [Pi Extensions 官方说明](https://pi.dev/docs/latest/extensions) 同样要求正确报告执行失败，并说明非交互场景的 UI 边界。该滚动页面目前还列出 MCP 注册能力；不能把新页面的全部 API 倒推为本仓库 0.87.1 都具备，也不能无版本限定地声称 Pi 永远不支持 MCP。当前安装声明未检出 `registerMcpServer`，下一包维持既有原生扩展路线和锁定版本。

R4-C 应验证：注册工具的参数类型转换边界、`signal` 贯穿、执行失败抛错、返回值符合锁定类型，以及 `/forum-status`、`/forum-check` 在有 UI/无 UI 情况下的明确可观察行为。缩小局部 `any` 即可，不借机升级 Pi SDK 或重写接入路线。

本机实际验收是 Node **26.3.0**；根 engines 当前 `>=22.0.0` 与 Pi 依赖下限不一致。下一包对齐 engines、CI、packageManager 和文档，分别记录“声明兼容”与“实际运行”。未运行 Node 22 环境或远程 CI 时不可填写已通过。

## DeepSeek Harness（dsh）

[dsh MCP 客户端官方 README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) 说明可配置 stdio 或 streamable HTTP，每个服务使用独立 serverName 和命名空间；stdio 协议探测会启动临时子进程。启动/工具错误应可见，不能把握手失败写成论坛操作成功。

下一包仅让共享 HTTP 客户端的失败正确穿过已有 MCP 适配层，保持供应商无关协议。MCP 工具受控测试不等于 dsh 真实宿主认证通过；官方滚动分支也不等于用户安装版本。若后续需要宿主端到端验证，先记录实际 `dsh` 版本与配置范围。本包不安装宿主、不改全局配置、不增加自动启动 Agent 或调度模型。

## 记录方式

在 `integrations/compatibility.json` 区分类型编译、受控适配器测试和真实宿主测试。Codex、Claude Code、dsh、Pi 没有真实运行的部分继续标 `not_tested`，不能把所有宿主一起标为支持完成。关于模型、宿主的新能力，本包不作新增推断。
