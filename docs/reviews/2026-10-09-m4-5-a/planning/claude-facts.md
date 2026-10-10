# M4.5-A Claude 无模型入口：只读事实

2026-10-09；未启动 Claude、未读取 profile/keychain/凭据、未安装或执行 SDK。

- 父已确认安装 native 2.1.282 与隔离 `--version`；本次有限字节检索见 [static receipt](../author/claude/static-receipt.json)。版本哈希与字节位置可复核，但内部字符串不是公开 API 保证。
- [官方 CLI reference](https://code.claude.com/docs/en/cli-reference) 支持 print、input/output stream-json、verbose、setting-sources、settings、strict-mcp-config、mcp-config。当前文档为滚动版，不能把后来版本语义套在 2.1.282。
- [官方 headless 文档](https://code.claude.com/docs/en/headless) 明确 bare 不读 OAuth/keychain，并只连接显式 MCP；但特别说明 2.1.286 前 bare 部分限制不同。因此仅 bare 不能替代 private cwd、空 settings source 与严格 MCP 配置。
- native 内实际存在 `mcpServerStatus()`，请求 `{subtype:"mcp_status"}` 并读 `response.mcpServers`；初始化构造实际存在 `{subtype:"initialize",hooks:...,sdkMcpServers:...}`。
- native 的控制 schema 另有 `{subtype:"mcp_call",tool:<fully-qualified MCP name>,arguments?:object,...}`。仅核到 schema，尚未确认 stdio SDK 的分派支持；不得把它宣布为公开直调接口。
- `mcp_message` 字符串描述的是 SDK-hosted MCP JSON-RPC 双向投递与确认，不能据名称假定对外 stdio server 的 tools/call。
- 官方 Agent SDK TypeScript 页面抓取两次失败（内部错误／内容大于工具上限），官方 repo 根 sdk.d.ts 为404；搜索到的第三方控制协议未作为依据。公开 initialize/mcp_status JSON wire schema 尚未取得。

## 提交父决定的最小实验候选（未执行）

1. 私有新 cwd、0600 空 settings 与 MCP JSON；MCP 唯一 stdio bridge 使用绝对 Node/built 路径和私有普通 actor token-file。外层 env-i 最小 PATH，不设 Anthropic auth，不改 HOME/CODEX_HOME，不 add-dir、不 plugin/debug。
2. 候选 argv：`claude --bare -p --input-format stream-json --output-format stream-json --verbose --setting-sources '' --settings PRIVATE_SETTINGS --strict-mcp-config --mcp-config PRIVATE_MCP --no-session-persistence`；最后一项及全部参数须先与安装 help 核对。
3. 只写候选控制 `{type:"control_request",request_id:"init-1",request:{subtype:"initialize"}}`，成功才写同 envelope 的 `{subtype:"mcp_status"}`；保持 stdin 打开，绝不发 user/assistant/prompt。这是安装内部事实驱动的有界 probe，非已核公开协议。
4. 首包建议只 discovery：观察 bridge initialize/listTools 与零业务 HTTP；不发送未确认的 mcp_call。若认证前置拒绝，保退出/安全错误并停止，不填 key 或绕过。
5. 总 watchdog 20 秒；收到状态后关闭 stdin，短等自然退出，再 SIGTERM，仍未退则 SIGKILL 并 reap 子树/bridge，检查私有 owned 资源。stdout/stderr 仅保白名单摘要，原输出私有审阅防路径/标识泄露。

没有来源可证明无 prompt 的启动完全无网络（例如遥测/远端策略）或无推理仍免 auth；父须批准这个具体 bounded probe，并决定是否须加出站隔离。当前仅可提出真实 Claude discovery 候选，不能称 Claude tool execution 或模型认证已通过。
