# M4.5-A Codex 只读事实（2026-10-09）

- 本地 executable `/opt/homebrew/bin/codex` 是 `/opt/homebrew/lib/node_modules/@openai/codex/bin/codex.js` 薄 Node launcher；package、env-i --version 均为 **0.144.6**/Apache-2.0。
- 安装 native `node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex`；同目录 codex-package.json 精确 version0.144.6/target aarch64-apple-darwin/layout1。JS只选平台与spawn native，未提供 Rust app-server/generator 源码或已装 TS protocol。
- 本次受限 strings 仅提取固定method标识：**mcpServerStatus/list、mcpServer/tool/call 均存在于本机native binary**。这证明符号确在安装版本，不证明隔离初始化/可执行RPC/响应结构已实跑。
- 原先 env-i CLI --help 与 app-server --help 已读：`-c key=value` 覆盖用户 config，`-p profile` 仍layer CODEX_HOME；`--stdio`/`--listen` 并非config隔离。没有观察到 `--config-file`/禁全部用户config层的公开flag；不可把覆盖mcp_servers当不读取用户配置。
- 本次仅新 help：`codex app-server generate-ts --out <DIR> [--experimental] [--prettier <BIN>]`；`generate-json-schema --out <DIR> [--experimental]`。均支持显式private输出，保有全局 `-c` 文案。未执行generator，help不足以证明dispatch是否先load user config/auth。
- 帮助调用出现既有 `could not create PATH aliases: Operation not permitted` warning；并非产品/MCP连接失败。不以env-i推断native不会用系统home解析用户目录。

## 官方实际打开页面（滚动版，非0.144.6源码）

- [MCP配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)（从developers.openai.com/codex/mcp重定向）：用户 ~/.codex/config.toml、可信project .codex/config.toml、CLI/IDE共享配置。
- [App server](https://learn.chatgpt.com/docs/app-server)（从developers.openai.com/codex/app-server重定向）：mcpServerStatus/list 可列工具/资源/auth，mcpServer/tool/call 可直接调用线程配置MCP，不要求先model turn。只是文档候选，尚未验证installed参数/feature gating。
- 本地Claude Code symlink `/Users/sakimi/.local/bin/claude`→native versions/2.1.282；env-i --version确认。已有help的 bare/setting-sources/settings/strict-mcp-config/mcp-config事实和[官方MCP](https://code.claude.com/docs/en/mcp)、[CLI reference](https://code.claude.com/docs/en/cli-reference)已实际打开。没有执行mcp list/会话/账号检查。

## 父待裁定的最小下一步

候选 argv：`/usr/bin/env -i PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/codex app-server generate-json-schema --experimental --out <new owned private directory>`。该命令不启动app-server主循环、不带formatter；**当前没有证据保证它不载用户config/auth，所以尚未运行，需父先确认入口源码/受限文件访问观察边界或给新约束**。

现 no-HOME/CODEX_HOME重设、不得读用户config/auth 的要求下，没有已证实private config-only启动方式。需要明确“只允许读取owned配置且跳过用户/managed配置”的实际公开入口；若只有CODEX_HOME重定位可满足，则需父针对本实验重新裁定该冲突，不能本代理脚本绕过。

## 父批准的嵌套 sandbox 静态生成单次实验

`/usr/bin/sandbox-exec`存在。生成命令加独立profile：deny全部network、用户.codex/.claude/.claude.json/.config/Keychains及Codex/Claude app-state读写，仅允许新owned目录写入；env只PATH、不设置HOME/CODEX_HOME。60s watchdog及各stdout/stderr≤1MiB监督。实际sandbox-exec child exit71/0.106s，未触截止：`sandbox-exec: sandbox_apply: Operation not permitted`。这是嵌套sandbox自身拒绝，未到generator，不能据此判生成器读取profile或RPC不可用。没有放宽限制/升级权限/再次尝试。

receipt/profile/argv/owned PID及stdout/stderr见author/codex/generator-probe-receipt.json；owned `/private/tmp/detuned-codex-schema-cq4jmk5q`（schema目录为空）。尚无installed导出schema，不称RPC实跑或profile隔离成功。本条路径到此停止。

## 受管单次重试：installed protocol 已实得

父明确重新裁定后，经exec require_escalated运行**同一sandbox-exec/同一完整profile/同一argv**；before manifest比对profile原文及SHA，所有用户state/network deny不变。真实child exit0/0.528s，未触60s截止；输出337个JSON/3,159,797 bytes，归档author/codex/generated-protocol与逐文件hash manifest。只运行静态generator，未启动app-server主循环/线程/模型。stderr仅PATH aliases `File exists` warning，不虚称无任何失败访问尝试；成功证明这些禁止访问与禁止网络条件下生成器可以完成，不证明将来的主循环安全隔离。

- 本机 ClientRequest.json 真广告 `mcpServerStatus/list`、`mcpServer/tool/call`，不再只依赖strings/滚动doc。
- initialize: required clientInfo{name,version}；capabilities.experimentalApi可true（experimental生成不等于握手已实跑），初始化后initialized通知顺序仍依官方文档，当前未实跑。
- ThreadStartParams：无required字段，可显式cwd/config/ephemeral等；**这不证明thread/start不会读用户profile/账号或无需auth**。
- ListMcpServerStatusParams：cursor/detail/limit/threadId均optional；detail=full|toolsAndAuthOnly。
- McpServerToolCallParams：required server/threadId/tool，optional arguments/_meta；response required content，可structuredContent/isError。数据字段精确保在生成JSON，不作额外类型猜测。
- 保留前次嵌套EPERM证据；本次是受管权限执行同完整内层保护，未削弱profile，未重设HOME/CODEX_HOME。此实验仅installed schema确认，**尚未RPC实跑**；到此停止，不扩主循环。

## 新 MCP 无模型实验：guard 首run未达标并停止

父授权的新profile保全部用户state/Keychains deny、增加deny mach-lookup，network默认deny，仅拟放私有论坛一个端口，私有sentinel也deny。实际guard child PID70538/exit65，Seatbelt解析错误：`host must be * or localhost in network address`，拒`remote ip "127.0.0.1:<ownedport>"`。尚未进行任何正负访问，未启动Codex/stdinRPC。首receipt/stdout/profile/runner保存；finally清退ownedchild、两个私有listener、DB与目录。外层runner记录结果exit0不等于guard成功。按父guard失败即停，未削减规则/改裸进程或自行重试；仅报localhost精确port的OS语法候选待裁定。

## 最小 syntax 修正后的 guard 和 Codex 实际启动层次

父批准唯一 syntax 修正：`remote ip "localhost:<ownedport>"`（无*、无额外端口）；客户端仍127.0.0.1。guard第二run真实child70667/exit0：私有论坛listener可访问，另一个自有listener端口EPERM，私有sentinel文件EPERM；完整userstate/Keychain/mach-lookup/network deny保留。合法profile已保存stdio-guard-second.sb，B只可用作需替换其独立ownedport/sentinel后重验的模板。

同profile下一层native Codex app-server child70668/exit1，初始化响应前退出：`Could not find home directory`。env白名单PATH/CI，不设置/继承HOME或CODEX_HOME。rpc=[]，没有status/tools/threads/model请求；未将宿主启动失败误报RPC能力失败、认证缺失或profile访问反证。自然reap全部ownedchild、服务/DB关闭、私有目录删除；未触30s watchdog。原首parsefail日志保留，不覆盖。此轮实际证明OS guard可行，但当前环境约束下Codex启动尚不可行；需要父明确home定位允许范围，当前没有自行加环境/减deny/继续启动。

## 原 HOME 透传后的真实状态边界

父纠正env夹具：禁止重设HOME不意味着删去原HOME；本次仅原值透传，不打印/修改，不设CODEX_HOME。第三run独立guard仍通过：child71109/exit0，allowed私有端口，跨端口/sentinel均EPERM。Codex child71110/exit1在初始化前明确：`failed to initialize sqlite state runtime under /Users/sakimi/.codex`。完整deny阻止其默认用户state初始化，rpc=[]；此处才是本机app-server真实状态前提边界，不是前次无HOME夹具失败。没有去deny/替换globalhome/state路径或进一步主循环重试。日志/第三receipt保存，所有child正常reap、服务/DB/temp finally清退，原证据均保留。

补核：2026-10-09官方配置reference与installed native支持sqlite_home/log_dir；仅新增owned CLI override后guard三项仍过，native在initialize前因用户config读取EPERM而回退默认/退出1（fourth receipt）。无进一步尝试，原SQLite失败仍保留。
