# MCP 接续与首次设置

本包针对用户外部提供的cld2.md及代码复核。基线为已提交343fcf38所对应内容；实际受测快照以本包机器收据为准。报告记录真实Claude原生会话与其自报费用，但本包不调用模型、不以费用显示认证供应商身份，也不沿用报告实验当本次回归。

## 问题处置

| 报告项 | 实证与处置 |
|---|---|
| #1关系内容不可读 | 新增服务端授权的单关系与固定帖子关系目录，client/HTTP/CLI和forum_read复用，六种关系与状态/固定引用可核；不只把使用缺口列为愿望 |
| #2failure挑战缺项 | 在MCP工具自说明中解释非objection来源的issue/impact可能null；不伪造字段，不将合法帖子当漏填 |
| #3纯MCP缺身份/空间起点 | forum_read支持无space_id的me/spaces，使用当前服务身份和可见目录；禁止解码opaque token找身份，visible_spaces不是完整ACL |
| #4consumer key接续 | 显式只读lookup按当前actor/key/原过滤条件取consumer.id，无写入/ACK；停用实际DELETE后404不重建，旧epoch明确resync_required，后续poll沿原409 |
| #5上手门槛 | README首屏操作优先，官方固定Node入口；setup连接已运行服务，一次建空间和1–32个普通参与者，新0700输出/0600凭据收据，不自动serve/模型/全局配置 |
| #6CLI help | 全部required选项显式必需；health提示live/ready；view列三枚举，解析/退出语义保持 |
| #7help与文档 | migrate源1–5/新schema6与实现对齐；request_key body是兼容输入且显式flag优先，两者不能和持久选项混用 |
| #8其它 | provided表示有可读固定引用非独立验证；完整post与固定JSON片分别说明；事件revision按对象type解释；具体SSH wrapped配置用远端可信wrapper，token不进ssh参数；保留完整严格九工具schema并实测大小；serve只在完整close后静态提示 |

### #8逐项说明

| 小项 | 具体处置或保留语义 |
|---|---|
| 推理反例与evidence | provided表示存在可读固定证据引用，不是独立核验；可将推理存为证据帖再固定引用。无引用unverified不否定推理 |
| 两种read格式 | 现post读解析对象；post_revision是固定JSON内容的chunk，须按cursor拼完整再JSON.parse；保留有界读协议，指南和工具自说明明确 |
| 九工具schema体积 | 保留完整静态严格schema及自发现能力，属于上下文代价取舍；最终按紧凑JSON.stringify各inputSchema的UTF8合计分别记录flat/wrapped，不与报告约46KB跨口径称下降 |
| 事件revision | relation.resolved等关系事件中的revision表示关系version，帖子事件才是帖子revision |
| 主题标题 | 显式include_titles；同快照当前修订标题、红删省略、预算和cursor模式绑定，默认保持 |
| SSH配置 | Claude指南给可信远端固定wrapper和绝对Node/桥/token-file，秘密不在ssh参数，无自动信任主机或改全局配置 |
| 关闭提示 | serve仅在完整成功收尾后stderr静态提示，失败不假报 |

## setup边界与失败处理

`setup --input space.json --participant a --participant b --output NEW_DIR`先验证参数和新目录，再用当前凭据读取真实身份。服务端逐步裁决space/actor/membership/credential权限，不以actor.kind猜管理员。每位仅contributor、read/write及新空间scope，不分发admin。

每一步写前持久记录started；业务4xx标failed，运输/5xx等结果不明标unknown并停止，不自动重试一次性credential、不删除远端数据。token预留no-clobber0600文件，保存失败尝试独立私有recovery文件；仍失败则明确received_not_saved与credential_id供管理员撤销，不误报成功。已发token和部分收据保留，不自动覆盖输出或重放setup；unknown步骤即使已有私有token文件，也不得视为可分发的成功身份。进程在started时被中断也须先核实际服务状态。大批次第19写起保守1.1s间隔；更严实例仍可能拒绝，不保证所有配置成功。

## 实施与验收

Arch最终完整后端回归单次自然exit0：176个唯一文件、1072/1072项通过，fail/pending均0，外层345802ms。主代理通过新SSH直接独立核验原始JSON；不是拼接定向结果。九后端包build/typecheck/lint共27步骤均exit0（分别10642/9789/9955ms），本包最终相关7文件29项通过。

首个完整回归有7项失败，定位为四个旧transport测试中的/me mock仅提供actor.id，不符合既有MeResponse必填契约；仅补完整身份形状，原actor/admin/A/B身份、身份切换、断言、时序、timeout及取消/0POST检查保持。四文件29项补测通过后，重新运行上述完整回归。首full失败与最终full分别保存。

CLI首红测试曾因helper缺Promise闭合未收集，已修正后对旧built取得3/3真实失败；setup首红3例中2失败、参数拒绝对照1通过。测试语法失败不算产品红；113项源/test/fixture/dist与guide已由主代理独立逐字核对一致；唯一自有验收根经归属/父目录/0进程/0嵌套挂载核验后清退，owner及主代理分别新SSH确认ENOENT；主代理末核禁用连接共享，errno2/absent/exit0。

本机只编辑与静态读取，不安装/构建/重测，不改用户reports、旧审查、现缓存或全局配置。最终相关测试、完整回归、新原文setup协作旅程、MCP flat/wrapped/Pi接续与tools/list大小等按Arch实际收据填写。

### 实际功能验收

冻结指南四块shell在fresh私有目录按原命令执行（仅替换自有路径与loopback端口），全部exit0：setup收据completed，两位普通身份；proposal修订[1,2]且v1不变，challenge固定v1；只读旁路确认addresses后仍open，再由原B resolve，最终open0，管理员无研究帖。serve自然close0/null且观察到成功关闭提示。独立transport另用三普通身份，通过flat MCP、wrapped MCP及Pi SDK验证新只读发现与接续。主代理已用新SSH读取原始旅程/transport/catalog JSON及只读SQLite，独立核对旧revision完整字段、两普通作者、固定challenge与原B resolve并接受功能。主代理另已独立核对113项源/test/fixture/dist与guide逐字相同并接受；清退已由owner与主代理另开SSH确认ENOENT，必要机器摘要见[results.json](results.json)。

实际built tools/list的紧凑JSON UTF8口径：flat各inputSchema单独序列化字节合计39576B，wrapped40395B；若序列化inputSchema数组则分别39586B/40405B，序列化完整tools数组分别43004B/43823B。数组口径含括号与逗号开销，不混用，也不与外部报告约46KB宣称同口径下降。
