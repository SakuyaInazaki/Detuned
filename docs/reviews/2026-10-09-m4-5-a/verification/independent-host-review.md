# M4.5-A 独立宿主审查

2026-10-09。审查者只读检查作者实际脚本、完整安全诊断、receipt、安装文件与生成 schema；未启动 Codex/Claude CLI、模型、网络安装或核心 gate。唯一审查输出位于本包 verification。已核 Claude v6 最后实验冻结、Codex第四轮/生成器收尾与共享指南最终冻结。

## 当前独立结论

本包可以作为**版本化配置交付与有限宿主实测**接受，但不能宣布 Codex/Claude 完整相同端到端论坛场景通过或 M4 完成。Codex 在明确用户 state 写保护下初始化前退出；Claude 已真实 initialize/status/connected、成功context及固定非法参数反例，但status仅四工具。没有发现阻止本有限包接受的 P1。八工具schema兼容是明确后续工程项，不能转嫁为用户需要提供模型key或降级保护；具体归因仍是有静态依据的推断。

最终作者freeze：Codex v4 **父授权勘误前389/389 hash一致**、SHA256 `b9720da360aa4c987dfcb33b8ff5124e33eabf871524b8cc6cc12780399de584`；Claude v6 **30/30一致**。独验先核Codex历史v3时遇七个父拥有的当前摘要已更新，原差异收存 `final-protection-first-receipt.json`；v4已覆盖这些摘要，不将历史metadata差异归作者实验或产品故障。此后父仅授权修正 `compatibility.json.summary`：当前对v4为 **388项一致+1个明确metadata delta**，不是最终389全匹配；原v4不改，前后SHA/diff见 `compatibility-summary-postfreeze-delta.json`。其余adapter数据逐结构相等。后续任务书独立SHA `b0ced7eec3f4502b170a4e011231af4966a4efdd59a455518a6dbf6e33851551`，不在作者freeze中。

既有核心 638 项/92 文件是上包接受结果，本包没有新核心测试结果，不重跑且不把 337 个 schema 算成测试。四宿主完整 T10/D02、M4.5 相同输入/业务错误/取消场景仍有未完成项。`docs/09-validation.md:30` T20 的 dsh/Pi 生命周期条件不能据本包 Codex/Claude 启动材料扩大成全宿主验收；可选 RPC 的 accepted/queued/settled 亦未由本包验证。

## 安装与协议来源

- Codex 固定 **0.144.6**。独立逐个核对 `author/codex/local-metadata.json` 中 launcher package、JS launcher、native metadata、native binary 四个 bytes/SHA256，全部一致；native hash `80a3933d11a9d13ef806aa24f7bb8afc9169cfe4e9b09d6da6a92922cbde9cff`。版本来自明确安装 metadata 及作者记录的隔离 version；未为审查重跑 version。
- Claude 安装 symlink 解析到 `/Users/sakimi/.local/share/claude/versions/2.1.282`，独立读安装 native 并核 SHA256 `fcfd837103965c64de34a6b9b94370d77a347ea71819715a27d5f0ef01775ea4`，与 `author/claude/static-receipt.json` 一致。内部 initialize/mcp_status/mcp_call 字符串与两个 owned 环境变量的读取记录为该固定安装的有限事实，**不是公开 SDK 契约认证**。
- Codex 生成器首轮 exit71/0.106s：完整 stderr `sandbox-exec: sandbox_apply: Operation not permitted`，未进入生成器。获批准后相同 argv/完整 profile 的 managed run exit0/0.528s；stderr 仅 PATH alias File exists warning。生成器不是 app-server 主循环或 MCP 业务测试。
- `author/codex/generated-protocol-manifest.json` **337** 项与目录实际 **337** 文件、managed receipt 路径集合一致；独立核每项字节数/hash且解析所有 JSON：无差异、337 成功。总字节来源可从 manifest 重算。`ClientRequest.json` 实际包含 `mcpServerStatus/list`、`mcpServer/tool/call`；对应 params 中 threadId/server/tool 和 detail=`toolsAndAuthOnly` 等与实验候选一致。schema 存在不证明 RPC 已可执行。

## Codex：真实失败边界

材料：`author/codex/stdio-probe.mjs`、三个 `stdio-probe*-receipt.json`、原 stdout/stderr 及 `stdio-guard-third.sb`；最终 `stdio-probe-manifest-v2.json` 的三项 hash 独立一致。

1. 首 guard profile 使用 `127.0.0.1:PORT` 不被 Seatbelt 地址语法接受，guard child exit65；完整 parse diagnostic 保留，未启动 native。不能归作产品失败。
2. 改 localhost 后 guard 正例 allowed、另一 owned 端口 EPERM、私有 sentinel EPERM，exit0。no-HOME 的 native exit1/`Could not find home directory`，rpc=[]；这是 fixture 环境限制。
3. 父批准原 HOME 值原样透传，CODEX_HOME 不设置，网络/userstate/mach/write deny 不变。guard 再次三项通过；native PID71110 自然 exit1/signal=null，在 initialize 响应前报告完整安全错误：`failed to initialize sqlite state runtime under /Users/sakimi/.codex`。receipt RPC 仍为空。
4. 父以官方目录override证据批准最后一次，`stdio-state-probe.mjs` 只增加 `-c sqlite_home=<owned>/state`、`-c log_dir=<owned>/logs`（TOML字符串），原HOME/完整deny不变。guard73599三项通过，native73600自然exit1/signal=null。完整receipt stderr为PATH alias warning、用户`config.toml`读取EPERM/`Invalid configuration; using defaults`、`File exists (os error 17)`；无initialize响应、rpc=[]。可以确认该受保护配置读取边界与退出，**不能从该诊断确定owned SQLite已经有效初始化或File exists的具体根因**。第三轮state拒与第四轮config拒分别保留，不混归auth-required。

因此 Codex 未证 initialize/status/tool discovery/context/invalidparams。初始化失败证明本次默认 state 前提与用户路径写保护冲突，**不是 auth-required**，也不否定上游 RPC/论坛算法。没有发送 thread/start/turn 或模型请求；脚本候选 thread/start 位于 initialize 成功之后，本次未到达。该 fixture 使用真实 SQLite `:memory:`，不要称磁盘持久测试。

保护：最小 PATH/CI/原 HOME；owned cwd 和0600 forum token file，普通 observer agent、仅该空间 read capability。runtime profile deny 全网络后只允许 owned forum localhost 端口；deny mach-lookup；明确拒绝用户 .codex/.claude/.claude.json/.config、Keychains 和两宿主 Application Support；默认写拒、仅 owned 写允许。无账户/keychain CLI、裸宿主重试或用户配置写入。不是 deny 全 HOME 的证明。

生成器 profile 与 runtime 的边界必须分开：生成器只有 network/file/write deny，没有 runtime 的 `deny mach-lookup`；仅可宣称在这些文件和网络禁令下静态生成完成，不能宣称 generator 的所有 Keychain IPC 访问均经 guard 拒绝。没有实际 IPC 访问证据。

## Claude：保护、诊断及有限成功

材料：`author/claude/*probe.mjs`、各轮 receipt/profile；v3 时16项、v5 时25项、v6 时30项 hash 均一致。v6 manifest SHA256 `3b875e9a5a0953b0065194cf4283449fed765efe27471cd848320e6e13d7dab4`。v4/v5/v6 receipt、guard、runner 已完整阅读。

- 首 `/tmp` alias sentinel 竟 allowed，立即停止；未启动 Claude，原失效 guard 不覆盖。改 canonical `/private/tmp` 后 guard allowed/EPERM/EPERM；no-HOME help exit1，同样不是宿主功能缺陷。
- 原 HOME 原样透传后，九项 installed help flags 均存在、help0；首次 initialize 提前 exit1/无响应。原 receipt 仅保56字节未分类，不能从该旧记录推断 auth。
- 同保护诊断补验保留全部56字节 stderr 与 SHA256 `95d184c527424ea77100afcd245bdce94b0118dc3a56abafc4dbc785a5c9da4b`：`EPERM: operation not permitted, mkdir '/tmp/claude-501'`。确为非owned默认临时目录写拒，不是缺认证的证据。
- 父批准仅 `CLAUDE_CODE_TMPDIR=<owned>/tmp`、`CLAUDE_CONFIG_DIR=<owned>/state`，原 HOME 不改，全部 deny 保持。v3 initialize 和一次 mcp_status 真实 success，detuned pending，无 tool list；即时 pending 不能叫加载失败。PID71957 EOF自然 exit0。
- v4 相同保护下250ms间隔、最多20秒等待；**2 polls 后 connected**。`discovery-receipt.json` 实际 server tool_count=4、raw names=`forum_context`, `forum_search`, `forum_poll`, `forum_ack`，条目只有 name/annotations。这里确实只有四项，不是只因旧 exact8 断言误用 namespace 前缀。未确认四缺失原因，不猜权限/模型/协议过滤。
- v4 initialize/status 成功，无工具调用、论坛 HTTP=[]、diagnostic session_delta=0、stderr空、no_user_prompt=true；PID72180 EOF自然 exit0/signal=null，无 TERM/KILL。不得把 harness completed 或 connected 当作八工具 discovery/业务调用通过，也不能把共享 MCP 静态八工具广告替代真实宿主结果。

Claude 使用 `--bare -p --input-format stream-json --output-format stream-json --verbose --setting-sources '' --settings <owned> --strict-mcp-config --mcp-config <owned> --no-session-persistence`。只有 initialize/mcp_status 控制，无 user/assistant/prompt/模型 key。runtime profile 与 Codex同保护范式、只有一 owned forum端口，另端口与sentinel被拒；deny mach-lookup和Keychain文件路径，不读取真实凭据来“验证”隔离。父进程搭建真实私有磁盘SQLite、contributor agent、仅该空间 read/write token、0600本地文件；setup/guard HTTP被清零后统计 native阶段。子进程无授权外网、无提交推理输入；不宣称有完整网络 syscall audit。

### v5 四与八的只读对照

`bridge-list-snapshot.mjs/json` 真实使用官方 MCP SDK +同 built bridge、普通 contributor/仅该空间凭据：listTools八项、HTTP0，SDK/app/DB/temp关闭。本地 SDK package.json 独立核为1.30.1。它没有启动 Claude、没有 OS guard，receipt沿用Claude环境/版本/control_kind模板标签是元数据误标；独验按 runner 实际操作分类为 **直接SDK桥快照**，不能将其冒充 Claude 八工具通过。首生成语法错的小记录保留，纠正后作者run成功；该小记录不是完整原始stderr。

快照缺失的 read/publish/relate 根 anyOf、subscribe 根 allOf，与Claude缺四项吻合。`schema-filter-static.json` 六个byte-offset excerpt逐字匹配固定安装native。独验在限定邻域另核 **207015148**：fetch工具调用 `nwt(j.inputSchema,{normalizeEnabled:q,apiValidateEnabled:ee})`，drop/normalize_gated路径跳过该工具；静态函数明确 top-level组合需要normalize开关。这是有依据的强解释，仍缺本次运行具体 drop reason，因此不当成直接 runtime 分类证明。status只给rawname、控制 mcp_call要fully-qualified，两种表示分别正确。当前 argv没有permission bypass/工具范围限定，且poll/ack也会改变消费状态，不能解释成“只展示只读工具”。可行动后续是限定schema兼容反例与转换，不是擅开内部flag、去deny或提权；本包不改产品schema。

### v6 最后一轮实际工具调用

`final-call-receipt.json`：同保护guard allowed/EPERM/EPERM、help0、initialize成功、2 polls后connected，仍raw四工具。fully-qualified `mcp__detuned__forum_context` 返回控制success；独验解析content后与structuredContent逐结构相等，包含真实空间规则结果，而不是details.error伪成功。

调用阶段实际HTTP严格为 GET capabilities → GET me → POST空间sessions → GET空间context（共4）。SQLite session_delta=1 且所有session的actor_id/space_id均为fixture普通contributor/对应空间，排除了空集合every的假正例。后续unknown字段反例收到控制error，其JSON为固定 `{error:{code:VALIDATION_ERROR,message:Invalid forum tool arguments.}}`，HTTP仍4；没有第二业务请求，也没有ACK。此正例是0HTTP反例有效的真实前置，不能只用无HTTP宣称功能通过。

PID72928自然EOF exit0/signal=null、stderr空，作者receipt四项cleanup为true；独验 final guard SHA与receipt一致、仅一个network-outbound allow、含mach-lookup deny，精确owned目录已不存在；精确process group只读查询exit1空输出。该轮不提供真实模型/账户/profile认证、完整八工具、写工具、在途取消或撤权场景证据。

诊断脱敏限制明确：fixture actor/space/凭据与checkpoint均精确替换；`original_response_sha256`只摘要“已脱敏ID/凭据、尚未替换checkpoint”的compact响应JSON，不是完整原stdout。执行后recipe仅补checkpoint脱敏和简短输出，未重跑；因此最终recipehash不是原执行字节hash，不能声称机械相同重放。本审查依据实际receipt的控制响应、HTTP与DB断言及披露的诊断差异，没有从摘要反推原秘密或扩称完整stdout取证。

## 资源与证据完整性

所有读取均为本包档案或明确安装文件。独立读取完整 Codex安全诊断与Claude最终stderr（不是仅日志尾）；历史失败未改记成功。作者 stdout简报不是 native exitcode。身份/论坛token未写入独验报告；schema与普通临时路径不是模型凭据。

- 只读 `kill(pid,0)` 核作者记录的10个 guard/native/generator PID均不存在；三轮Codex stdio owned目录与Claude v3 owned目录不存在。Claude receipt明确 app/DB/private关闭，runner finally顺序吻合。
- 为补 descendant证据，sandbox内 `pgrep -g 72180/71957/71110` 因 sysmon不可见失败；获最小只读 escalation后这三个精确 process group及最终72928查询均 **exit1、无输出**，无该组遗留进程。未读取完整进程参数或启动CLI。不是全系统进程/历史访问审计。
- 第四Codex精确owned目录独立stat已不存在，group73600只读查询同为exit1空输出；app/SQLite/listeners关闭依据runner实际finally与作者记录，不伪造未保存的DB关闭flag。第四轮无RPC响应，初始化之后的thread/tool路径未到达；没有已证的native论坛业务HTTP。
- 初次独验观察到 generator-owned `/private/tmp/detuned-codex-schema-cq4jmk5q` 尚存在、managed runner无cleanup段；已交父，由作者补 `author/codex/generator-cleanup-receipt.json`。独验后续stat确认该精确owned目录不存在；归档337项hash/字节完整。独验没有擅自清理作者或held dsh资产。
- `examples/codex.config.toml` 与 `examples/claude.mcp.json` 独立TOML/JSON解析成功，各只配置detuned，使用绝对占位path和TOKEN_FILE，不包含inline DETUNED_TOKEN。仅静态交付核查，不能称配置已在用户profile激活或宿主加载成功。

末核baseline：278产品source/config/tests原hash和路径集合无增删；5913旧review、4SQL/archive、2schema profile、208tracked及220untracked dist全部保持；lock在source集合、HEAD `b8dacd56779a007a2e7045b682bca0c036fdfc44`保持。首次375JSON/23Markdown/308本地目标无错；加入本独验收口与授权delta后最终378JSON/24Markdown/313本地目标无错，git diff --check再次exit0。最终freeze只差父授权summary单字段，其余均匹配。详细receipt与范围见 `final-protection-receipt.json` / `finalization.md`，数字是静态核查计数，不是新增正式测试。

未运行本包 core/fullsuite/current29、泛化CLI/profile/keychain命令或新增宿主试验。受限真实宿主未完成不是模型账号阻塞的推断；父已裁下一包 **M4.5-B显式flat|wrapped**：默认flat保旧契约，wrapped把完整canonical放在input内，先严格校验再unwrap，不删组合约束。后续真实八工具发现仍待实施与验收；Codex再试先有不触用户state的获准初始化方式。无需提供假key、撤deny或升级普通actor权限。之后M5.1-A同源认证→M5.1-B真实UI，不预填成功；fresh baseline须父接受本包后创建。
