# M4.5-A Codex 作者证据

结论：本机Codex CLI0.144.6的静态MCP协议已确认、单端口OS guard已通过；真实native app-server在禁止用户Codex state访问的保护下初始化失败。**未通过native initialize/discovery/tool call**，不以静态产物冒充宿主兼容完成。未使用模型、账户或用户MCP配置。

## 各轮实际结果

|轮次|真实结果|适用条件与边界|
|---|---|---|
|静态本地核查|version/help/metadata及binary两method标识|不是RPC实跑；已读官方滚动URL与本机版本分开|
|generator nested|child71/0.106s|外层sandbox不允许sandbox_apply，generator未运行|
|generator managed|child0/0.528s；337JSON/3,159,797bytes|同完整denyprofile/argv；仅静态生成，不初始化宿主|
|stdio guard-first|child70538/65|Seatbelt要求localhost地址token，profile解析失败；未发RPC|
|stdio guard-second|guard70667/0；Codex70668/1|单端口允许、另端口/sentinelEPERM；env-i无HOME使Codex无法定位home，夹具失败|
|stdio guard-third|guard71109/0；Codex71110/1|原HOME原值透传，用户state deny不变；Codex SQLite state初始化失败，rpc=[]|
|模板静态解析|exit0|TOML结构/既有dist入口布局核验；没加载宿主配置|

所有首失败记录保留。第三run止于真实状态前提，不撤deny、不改CODEX_HOME、不再retry主循环。native child均自然close/reap，未watchdog/强杀；自有两个HTTPlistener、app、DB与私有目录均在finally清理。generator owned目录337份live/archive hashes已逐项一致核验，所需receipt保存后实际删除，见generator-cleanup-receipt.json；未触held dsh。stdio脚本的token-file仅其私有目录，最终删除，不归档明文。

## 可复核材料

- planning/codex-facts.md：准确事实、官方实际打开URL及未满足条件。
- local-metadata.json/read-only-receipt.md：安装文件SHA/布局；先前未保存rawstdout只称工具结果摘要。
- generator-managed-before/receipt、generated-protocol-manifest.json及generated-protocol/：installed JSON schemas真实归档；无auth/配置值。
- stdio-probe各receipt/profile/stdout/stderr：guard正负、自有PID、真实退出和初始化前错误。
- config-parse.stdout：仓库模板静态验证结果。

本轮交付配置是 examples/codex.config.toml，需操作者替换绝对路径并选择trusted项目/用户作用域；仓库不写用户全局配置。共享 integrations/codex-claude.md 的Claude段待其owner冻结事实合入后统一文档冻结。未改compatibility.json/progress/SQL/schema/lock/HEAD或产品，未跑corefullsuite/current29；本包验证是隔离宿主实验，不扩大主工程回归。

静态generator profile只有network与用户state/Keychains文件访问拒绝，**没有deny mach-lookup**，不能宣称Keychain IPC隔离；stdio runtime profile另有deny mach-lookup且真实guard自检，二者不混用，不回填旧profile/receipt。

## 官方目录 override 有限补核

安装native二进制可匹配sqlite_home/log_dir；官方[配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)明确两path字段，既有help确认-c。新单次stdio-state-probe仅增加两owned路径，原HOME原值与全部deny保持。guard73599自然exit0，三项allowed/EPERM/EPERM；native73600自然exit1，rpc=[]，完整安全stderr报告用户config.toml读取EPERM、using defaults及File exists17。没有扩大保护范围或追加试探。新receipt/profile/stdout/stderr保留，owned目录已finally删除，app/DB已关闭。
