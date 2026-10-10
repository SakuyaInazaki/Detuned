# Claude 2.1.282：受保护的无模型控制实验

2026-10-09。结论：OS 隔离与安装 help 已验证；真实 Claude 控制启动提前退出，discovery/tool execution 未通过。仅 author/claude 新文件，无产品修改、模型请求、真实认证或用户配置变更。

## 过程与证据

1. `guard-first-receipt.json`：独立监听正例 allowed、另一 owned 端口 EPERM，但 sentinel allowed。原因是 owned 来自 `/tmp` alias，Seatbelt literal 未匹配 canonical `/private/tmp`。该轮立即停止，未启动 Claude；原 profile 保留。
2. `guard-second-receipt.json`：改为 `/private/tmp` 后三项通过（allowed/EPERM/EPERM）。env-i 删除 HOME 导致 guarded help exit1；未发控制消息，原证据保留。不能把这轮当 Claude 功能缺陷。
3. 父批准原 HOME 值原样透传，不改变值、不设置 CODEX_HOME、不撤用户路径/Keychains/mach/network deny。最终 `probe-receipt.json`：guard 再次通过；guarded `--help` exit0，九个参数均实际存在。
4. 真实 CLI 使用 receipt argv（settings/MCP/profile 均 private 路径），只发送一个 initialize control request，不发 user/assistant/prompt。自然 exit1、signal=null、stdout 无 control response，stderr 56 bytes；HTTP=0，session_delta=0。因此没有发送 status 或 mcp_call。
5. harness stdout `completed:true` 仅表示 harness 顺序结束，**不表示 Claude initialize/discovery 成功**；准确能力结论以上述 received:false/exit1 为准。

stderr 原文仅在父进程内存中观察，未提交，当前 receipt 只保字节数；未保可复核分类，所以不能凭长度推断 auth-required 或具体失败原因。此证据限制需要明确保留；若父决定诊断复验，应仅增加固定分类/私有原文审阅，不提供假 key 或撤隔离。

## 保护与清理

最终 `guard.sb` 的网络只放一个 owned localhost 端口，另 owned 端口确实 EPERM。私有 sentinel 确实 EPERM；这不是读取真实用户凭据的实验。拒绝用户 `.codex/.claude/.claude.json/.config`、Keychains、Codex/Claude Application Support，并 deny mach-lookup、默认写拒，仅 owned 可写。

CLI 子进程 PID 71305 自然退出并 reap；未使用 TERM/KILL 当成功。论坛 app/SQLite/临时目录均关闭/移除；此次未观察到 bridge 启动，不能虚称 bridge PID/正常关闭已证。父进程 fixture 建立真实磁盘 SQLite、普通 agent contributor 与仅该空间 read/write credential，token 仅私有0600文件与内存，未入证据。帮助3秒、guard3秒、控制25秒、末尾清退有限；此次提前退出未触 deadline。

## 可复核材料与边界

- `probe.mjs` 是已执行的有限 runner；`static-receipt.json` 固定 native hash 与内部 schema 字节位置。
- 官方引用与候选控制来源见 [只读事实](../../planning/claude-facts.md)。内部控制不是公开 SDK 契约认证。
- 没有 generic MCP 替身、fake provider、假模型 key、网络安装、裸 CLI、profile/mcp list 或推理。
- 尚未证 exact eight discovery、mcp_status、context、invalidparams、真实 Claude 模型/完整 CLI 认证。下一步由父决定是否仅诊断 startup，或停在可复核配置交付层。

## 启动诊断补验（父批准，同保护/argv/initialize）

`diagnostic-receipt.json` 保留完整安全错误：`EPERM: operation not permitted, mkdir '/tmp/claude-501'`（含 LF 共56 bytes，SHA256 `95d184c527424ea77100afcd245bdce94b0118dc3a56abafc4dbc785a5c9da4b`）。无需遮盖该普通临时路径；fixture token/actor/space若出现，runner会精确替换固定 REDACTED。guard再次 allowed/EPERM/EPERM，help0；真实控制仍 initialize无响应/native自然exit1/HTTP0/session0，app/DB/temp全部关闭。

此错误确证默认非owned临时目录 mkdir 被完整写保护拒绝，**不是 auth-required 的证据**。首次三轮材料不覆盖；之前“未分类”的记录仍保历史，但此补验已给可行动原因。

[官方 environment reference](https://code.claude.com/docs/en/env-vars) 的 CLAUDE_CODE_TMPDIR 支持进程级内部临时根，Unix再加 `/claude-{uid}/`；建议父若续验，仅把该变量设为新 `<owned>/tmp`，保持内层全部deny/仅owned可写，不扩大系统 `/tmp/claude-501`写权。当前未执行新增变量。

同官方表 CLAUDE_CONFIG_DIR 可覆盖配置目录，承载settings/session/plugins；native2.1.282内实际 `process.env.CLAUDE_CONFIG_DIR` 与默认 `.claude` 路径选择存在。它不是本次错误原因；可给父作为后续 `<owned>/state` 精确候选，不等于已授权迁移/改变HOME或用户配置，且不能声称它自动隔离所有keychain。暂无理由提供任何模型认证。

## 私有目录候选实际结果（父批准）

`private-directory-static.json` 再核安装2.1.282对两变量的真实读取；`private-directory-probe.mjs` 仅加 CLAUDE_CODE_TMPDIR=`<owned>/tmp` 与 CLAUDE_CONFIG_DIR=`<owned>/state`，原HOME原样透传、所有deny保持。`private-directory-receipt.json`：guard三项通过，help0；**initialize与一次mcp_status均真实success**。状态 `detuned:pending`、没有tool列表；这轮即时查询后EOF，不能将pending当加载失败或完整discovery。无论坛HTTP、无session、无stderr，native PID71957 EOF自然exit0且清退；未调用mcp_call/context/invalidparams、未提交模型prompt/key。

当前证明固定版本在完整网络/userstate保护与私有state/tmp下可启动控制并查询MCP状态。exact8与tool execution仍未证明。若父批准下一必要probe，宜在同预算内等待pending终态，不能启动后立即查询便把尚未加载误称不支持。

## 终态 discovery 补全（v4，父批准）

`discovery-probe.mjs` 沿相同保护/私有目录配置，以250ms间隔、至多20秒查询状态。实际两次status后detuned进入 **connected**；真实status payload为mcpServers，server字段name/status/serverInfo/config/scope/source/tools，tools条目字段name/annotations。

`discovery-receipt.json` 实际返回只有四个 raw tool names：forum_context、forum_search、forum_poll、forum_ack。没有namespace前缀，也不是预期的完整八工具，所以没有尝试mcp_call/context/invalidparams。不能用共享MCP静态广告推断此宿主实际全部可用；四缺失原因尚未核定，不能猜成权限、模型或协议特性。

guard再次 allowed/EPERM/EPERM，help0、initialize成功，无stderr、无论坛HTTP/session、no_user_prompt=true。PID72180 EOF自然exit0，未TERM/KILL，app/DB/temp清退。当前明确已证固定2.1.282真实受保护Claude MCP连接与四工具status观察，未证完整八工具、工具execution、业务错误、推理/真实账户/profile。

[私有配置模板](../../../../../examples/claude.mcp.json) 仅绝对占位路径与受限actor token-file。本轮只静态JSON解析，实际probe对应配置只替私有路径/端口；模板不会自动写入用户配置。共享宿主指南由A维护。本轮不改compatibility或全局进度。

## 最后控制调用（v6，父批准；此后不再运行 Claude）

[final-call-receipt.json](final-call-receipt.json)：同一完整 guard 再通过 allowed/EPERM/EPERM，connected 仍 raw 四工具。真实 `mcp_call` 使用 `mcp__detuned__forum_context` 成功，content 与 structuredContent 返回完整 result。HTTP 顺序为 capabilities → me → sessions → context；真实 SQLite 新增一个 ordinary actor/对应 space 的诊断 session。一次额外 unknown 参数调用收到固定 VALIDATION_ERROR，HTTP 总数仍4，未发第二个业务请求。

PID72928 EOF自然 exit0/signal=null，stderr0；child/app/DB/私有目录全部清退。未提交 user/assistant prompt、模型 key 或 ACK。此证据仅固定2.1.282内部 control 的真实无模型连接与一次成功/一次错误，不代表公开SDK契约、完整八工具、模型或用户profile认证。

结果中的私有 actor/space/凭据按精确值脱敏，checkpoint 精确替换为 REDACTED_CHECKPOINT；original_response_sha256 是已脱敏 ID/凭据、尚未替换 checkpoint 的 compact JSON 响应摘要，不是整个原始 stdout 摘要。原始 stderr 摘要另列。执行后 runner 仅补同样 checkpoint 脱敏及简短摘要输出，未重跑；最终 recipe hash 对应此诊断保护末版，实际结果以 receipt 为准。

[根组合兼容事实与父决策边界](../../planning/claude-schema-compatibility-facts.md) 区分 MCP规范有效、宿主有限支持与静态推断；不在本包修改 canonical schema。v1–v5 原证据/manifest保持。
