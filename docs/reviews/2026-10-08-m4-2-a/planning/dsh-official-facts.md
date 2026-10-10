# M4.3 dsh 官方事实与前置条件

查询日期：2026-10-08。仅公开官方网页/source、本仓库文档与命令定位；未启动宿主、模型、测试或读取私人配置。产品保持冻结。

## 版本与可用性

- 复用 [既有事实](../../2026-10-08-m3-4-b2/planning/m4-dsh-pi-facts.md)、[dsh 接入说明](../../../../integrations/dsh.md)及 [compatibility](../../../../integrations/compatibility.json)：真实 dsh host 仍为 not_tested，MCP SDK stdio 证据不能替代它。
- 当前 shell `command -v dsh` 无路径；仓库依赖检索未见已安装 dsh 官方包。这不证明其他用户目录没有安装。
- [官方 master package.json](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/mcp/mcp-client/package.json) 声明 `@deepseek-ai/dsh-mcp-client` **0.2.1-alpha.1**、MIT、依赖 `@modelcontextprotocol/client` **2.0.0**；不是本机安装版，也不是 Detuned SDK 1.30.1。
- 官方 [commit c291e7961a515f6d7af9304e7fd1d257929aef26](https://github.com/deepseek-ai/deepseek-harness/commit/c291e7961a515f6d7af9304e7fd1d257929aef26) 可固定，但来自有缓存的 commits 列表；未确认其包含当前 master 的 MCP 行为。GitHub commits/master API 本次返回工具 Internal Error，**当前 master SHA 未核**，不能把该历史 commit 与滚动源码拼成锁定版本。

## 配置、发现与命名

- [官方 MCP README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) 与 [src/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/src/index.ts) 是本次滚动依据；后包须固定同一源码版本后复核。
- Config 支持 stdio/streamable-http；stdio 的 command/args/env/cwd，HTTP 的 url/headers；默认 toolCallTimeoutMs=60000、failOnStartupError=false。stdio 文档明确先临时 probe 再服务进程，不能假定只启动一次。
- serverName 必须 `[A-Za-z0-9_-]{1,32}`，同注册 scope 不重复；`scopeOf(ctx) ?? ctx.root` 为源码实际 namespace owner（index.ts:869–894）。不同 Agent scope 可复用同名，不等于自动隔离 Detuned 凭据。
- [tools.ts:75–80](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/mcp/mcp-client/src/tools.ts) 的 publicToolName 保留干净名称 `mcp__<serverName>__<rawName>`；不合法字符/超过64字符时规范化并加12hex身份摘要。服务返回的 rawName 独立送 tools/call，不从公开名称反解析。
- index.ts:856–943 的公开 async apply(ctx, config) 等待 initial connection/discovery；failOnStartupError=true 才按初始失败拒激活。不能仅凭整个 harness 启动证明插件成功。

## HMR、重启与关闭

- index.ts:608–615 描述 HMR dispose 旧实例再创建新实例；同 serverName 保持公开名称。909–924 缓存 dispose Promise，并注册插件卸载与 effect teardown。
- [connection.ts:195–228](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/mcp/mcp-client/src/connection.ts) 实现断线重连/预算耗尽清工具；失败代关闭未获确认则停止重连，防服务进程重叠。
- connection.ts:368–387 停重连、尝试关闭 transport、等连接 attempt 和工具同步队列，再注销工具；关闭未确认仅记录 incomplete 诊断，不能据 dispose 返回泛称服务进程已彻底清理。
- tools.ts:131–134 的真实调用转发 execution.signal 与 timeout。取消通知是否使 Detuned finally 完成、probe/HMR 的服务进程是否均结束，仍需宿主实测。

## 无模型入口与待父裁定

- package exports `.`（lib/index）及 `./src/*`；公开 createMcpToolDefinition（index.ts:640、tools.ts:212）可构造带 execute 的工具定义。它是局部适配 API，**不是已证明的完整宿主加载/重载验收入口**。
- 本次未核到可直接无模型执行发现后工具的官方 CLI 命令；尝试 tools README 候选路径一个404、一个抓取失败，不能宣称 CLI 没有该能力。不运行 dsh --help 或宿主进程补猜。
- 后包前置：父确定可用、许可范围内的固定官方 runtime/source；核 Cordis/tools 的公开组合及真实 loader/HMR 入口能否无模型驱动，再划私有 profile/凭据边界。当前环境不能自行安装替代。
- 最小候选验收为真实加载发现零业务写/ACK、准确工具名称及一次真实工具 HTTP、取消/重载/断线重连清理、两个隔离身份；是否采用及入口由父决定。本页没有新增工具框架或选实现路线。
