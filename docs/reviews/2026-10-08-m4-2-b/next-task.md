# 下一任务：M4.3-A 固定 dsh 官方运行时并验证无模型 MCP 插件链

M4.2-B 已由父于2026-10-08按有限范围接受，实际结果以[本包README](README.md)及[verification](verification/)最终材料为准，不复制计数。下一包技术路线由父选定；先fresh，再分两关执行，不把本任务书或未运行配置称为交付。

## 目标与固定来源

首目标为同SHA官方 Cordis + systemPrompt + ToolRuntime + scope + MCP plugin 的真实load/discover→registry execute→dispose链。不能新造仿host；不能称完整dsh CLI/HMR或真实模型认证。后者依后续T20，核心product预计无改，实际问题先报父。

官方源码固定 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`；已核MCP包0.2.1-alpha.1/MIT/client2.0.0，必须同版本依赖闭合，不混master。依据[固定来源](planning/dsh-pin-facts.md)、[公开loader接点与缺口](planning/dsh-loader-facts.md)；其余workspace版本/官方tests/构建可行性待第一关实际核。

## 第一关：隔离获取与只读依赖闭合

C fresh后已授权A在**新建自有/private/tmp目录**匿名获取该官方Git固定源码；使用最小环境，禁credential helper、系统/用户global Git配置及交互，允许public-only require_escalated网络审批。记录source commit/tree/hash和首失败。源码不复制进本项目src；此关**不安装、不执行**。

读取真实manifests/lock、官方tests与loader/systemPrompt入口，给父最小可构建依赖图、各版本/许可，以及不读用户profile、不调用模型的具体public构造/激活与dispose等待接口；列第二关拟用的有限安装/构建/实验命令。已有编译产物或发布tarball仅在可核版本来源时列候选。

不运行CLI/app-boot/profile/skills/agent-loop/provider，不读真实配置/凭据。只读包源码时不把静态API存在当实跑成功，不把任意定义execute替身当官方registry链。网络审批拒绝或固定版本不可用时保存精确失败，不绕行/反复猜版本。

## 第二关：父再批准有限安装、构建与实验

父根据第一关材料选最小方式并冻结明确命令与文件owner，**未经此批准不装全仓、不跑scripts、不替换官方库**。只在owned隔离依赖目录，不改主pnpm-lock/global配置；安装默认ignore-scripts，必要官方build另单独界定。

真实论坛用私有临时SQLite、受限不同actor token及自有环境。禁止模型prompt/stream/账号访问；不借用户配置启动宿主。所有native child、HTTP与目录必须owned登记，真实清退并归档退出结果；失败保留，不能以dispose Promise返回就代替进程清退。

## 协作与所有权

主代理负责方案、实验取舍与验收；gpt-6.1-sol子代理执行已划边界。开工重读AGENTS/规范入口，保护已接受产品/旧reviews/fixtures/SQL/archive/dirty，不commit/push/全局修改/deepseek-brainstorm技能/模型调用。

- A第一关：隔离官方源码获取与闭合事实、版本许可/命令提案；第二关具体runtime helper/test或证据路径待父根据实际API划定，不先造空包或framework。
- B第一关：核固定版patch格式与公开Config，planning列整份cordis.patch.example.yml字段与加载方式差异；未验证前不写“可用”配置。A回后父再定integrations/dsh.md/样例/compatibility修改范围。
- C：fresh、旧依赖与输入保护，设计独立证据；真实runtime执行待父批准。统一门禁复用现current29与已批准适配入口，保原脚本/失败证据。

## 候选第二关最小真实验收

1. 官方scope里真实plugin加载与registry发现8个正确names；stdio probe/init阶段HTTP/session/post/ACK均零，不能假设只有一个子进程。
2. 真实registry执行forum_context与带request_key的publish，核数据库作者/研究数据和HTTP错误语义；仍由服务端唯一判断权限、幂等与业务规则。
3. dispose后工具注销、owned桥进程清退，所有HTTP/native资源结束；结果记录actual请求/状态而非只看宿主启动。
4. 取消、双身份与reload/reconnect是否本包含，由第一关成熟度及父第二关裁定。真实HMR缺口另列，dispose/reinstall不自动等同HMR。

公开结果必须分别标official plugin+registry、完整CLI、模型会话的实际证据层级；本包不能以指南/空包完成。网络/SDK不可用时给具体可复现失败，由父推进无依赖Pi后续工程，不把同一缺口反复交用户，不擅自跳安装或无限预研。
