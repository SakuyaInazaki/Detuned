# M4 dsh/Pi 只读事实（2026-10-08）

范围仅 integrations/dsh.md、pi.md、compatibility.json、当前adapter及官方primary docs/source、已安装包元数据。没有读取authfiles/环境秘密，没有安装/init/全局配置修改、启动宿主Agent、模型调用或新增实验。旧兼容记录仍明确host_runtime not_tested；本轮不更改该结论。

## 当前环境与锁定依据

当前shell `command -v dsh` / `command -v pi` 均未返回可执行路径。工作区 `.pnpm` 清单没有 dsh 官方包；不能据此推断用户其他目录永远未安装，准确结论是本轮可用环境没有可核 dsh runtime/version。不能把MCP SDK stdio通过冒成dsh宿主支持。

工作区实际官方SDK `packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json` 为 **0.87.1**，bin指向 dist/bundle/cli.js，repository为 earendil-works/pi；adapter devDependency固定同版本。仅读元数据/源码，没有执行该CLI。核对文件SHA256：package.json `627631b613ba4ca29eba8df793f5280fd20b19f01d73826e9ffda14c15def5dc`；types.d.ts `14d00e645b453f4361440da6fcda86ed6cef9a8fc36d483a621a0250e0d4a396`；agent-session-runtime.js `9a502461b1b1df3251b9bc41b786ddbc47413c9115957d6b091e3360a54073fe`。安装版源码是本包Pi行为依据，不把latest网页当已安装版。

## dsh 官方 MCP（文档事实，未本机运行）

查[官方MCP README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)与[package.json](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/package.json)：本轮master package version **0.2.1-alpha.1**，不是已安装版本；未获得可固定commit SHA，后包若执行必须先锁runtime/source。stdio会先临时探测再启动服务进程；发现/重复启动不能产生业务写或ACK。初始发现等待就绪；namespace按serverName+tool稳定，重复scope拒；failOnStartupError只使插件激活失败，不能用整个harness仍启动证明连接。

文档规定断线指数重连并重新同步工具，耗尽尝试需reload/restart；编辑entry就地重连，同名工具稳定。卸载停止重连并等待在途工作，取消/错误透传，MCP prompts不支持。精确参数随锁定版核，不能把当前master行为泛称所有dsh版本已验证。

[官方插件src/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/src/index.ts) apply通过scope effect保留namespace；dispose缓存同一connection.dispose Promise，并注册internal/plugin卸载和effect teardown；初始ready/error按failOnStartupError处理。两独立Agent scope隔离是官方能力声明，Detuned多身份仍需真实无模型scope/重连实验，不能将一个全局token自动视作多actor。

## Pi 0.87.1 官方生命周期与并行事实

已读[官网extensions](https://pi.dev/docs/latest/extensions)、[官方v0.87.1文档入口](https://github.com/earendil-works/pi/blob/v0.87.1/packages/coding-agent/docs/extensions.md)，并用安装版 `docs/extensions.md` / `dist/core/extensions/types.d.ts` / runtime源码核对应版本：

- docs/extensions.md:50–60：factory可能被加载但不启动session，不能在那里启动长期timer/socket/process；session_start启动，session_shutdown幂等关闭。reload换runtime，await ctx.reload后旧ctx不可复用。
- types.d.ts:416–425 session_start reason startup/reload/new/resume/fork；:435–441 before_switch/before_fork可阻止操作；:478–485 shutdown reason quit/reload/new/resume/fork。不能凭历史集成文档猜还有独立session_switch/session_fork事件。
- types.d.ts:365–376 tool executionMode可parallel/sequential；省略遵循宿主默认，不应自行宣称串行。execute五参含signal/onUpdate/ctx。安装文档:115说明同assistant消息工具可并行，兄弟工具顺序不可假定。
- agent-session.js:2603 reload先await session_shutdown，再invalidate旧runner/resourceLoader.reload和新runtime，随后session_start。agent-session-runtime.js:102–112替换前先await session.abort、shutdown，再dispose；:296 quit dispose也先await shutdown。低层AgentSession.dispose:822自身是同步中断/解绑，不代替高层await shutdown路径。扩展pi.on返回unsubscribe（types:988），长期资源清理由扩展handler负责，不是宿主自动回收任意自建timer。
- fork/switch/new后的后续工作通过新ctx/withSession；不将旧captured pi/command ctx跨代复用。actor身份不因fork增加独立评审身份；consumer/ack映射持久策略仍需Detuned自己实现。

## 当前adapter与证据边界

`packages/adapter-pi/src/index.ts` 仅注册8个公共tools与forum-status/forum-check，直接sharedclient；execute忽略toolCallId，转发显式request_key与signal、每次同步token。没有pi.on lifecycle、后台poll/inbox、session/consumer绑定、fork去重或toolCallId持久key映射；没有声明executionMode。**当前没有长期后台资源**，不能把尚不存在的timer报告泄漏；引入可靠通知后才需shutdown/重绑。当前M3.2持久key主要CLI/writeopts路径，不自动贯通Pi通用callTool。

[compatibility.json](../../../../integrations/compatibility.json)保留SDK类型/validator/无UI命令/错误取消为passed、真实宿主not_tested。[M3.1 tools-real](../../2026-10-06-m3-1/verification/tools-real.json)已实际安装0.87.1 validator→tool.execute→sharedclient→真实core等待后取消，零batch/ack；built MCP通过真实SDKstdio。它们不等于TUI/RPC加载、session reload/fork/switch或dsh runtime生命周期实测。

## 后包需要父决定的实验（本轮未执行）

无模型候选：固定Pi0.87.1的真实SDK extension loader/commands与runtime事件，使用私有session/profile目录、不读取用户auth；核load不写/不ACK、reload/new/fork/switch shutdown与旧ctx失效、并行只读与同consumer poll/ack、取消/重连/持久key。先核是否这些API可在无model prompt条件完成，不以手工调用activate或伪事件当真实loader/session证明。dsh目前不可用：先由父决定可提供的固定runtime/临时profile边界，不能自动安装或使用用户全局profile。

真实会话依赖另列：TUI实际呈现、RPC disposition/agent_settled、模型选择工具/理解通知、四宿主身份认证属于后续真实宿主/模型验收；本轮没有运行。RPC可选桥尚未实现，不能强行变首个Pi无模型接入包必需。对其他Codex/Claude不在此次事实范围，也不自行扩大M4设计。
