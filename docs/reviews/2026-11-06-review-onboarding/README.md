# 正式评审起步与可行动诊断

完整阅读外部提供的cld-old.md。报告没有给精确受测commit，不用末尾提到并发脚本进入01e0fbf6倒填报告版本；本包基线为当前01e0fbf6。外部报告自述Claude2.1.318及accepted/真实回执闭环，属于提供的证据，不替代本包无模型回归或扩成供应商认证。

功能与产物验收已接受：最终完整后端186文件1130项通过，主代理独立核原始JSON/退出结果与22项关键文件字节一致。唯一自有验收根经归属/marker/父目录/0进程/0嵌套挂载核验后清退，owner及主代理分别禁共享新SSH确认ENOENT、errno2/absent/exit0；完整事实见[results.json](results.json)。

## 逐项处置

| 报告项 | 当前判定与处理 |
|---|---|
| #1默认required/profile不配套 | 当前真实缺陷：省略policy时默认reproduce而无profile。新空间省略policy改无required检查；显式草案仍可保存未补全profile，申请时安全具体诊断，旧空间不自动改写，由维护者明确修复 |
| #2MCP无法独自签verify/写回执 | 既定安全分工，不把verify签发/日志/receipt权限加入普通九工具。清楚连接MCP限maintainer/owner的run动作及普通读状态与维护者CLI/HTTP受限签发、外部真实执行；无required检查可以accepted+not_required，不伪称passed |
| #3finalize expected_version难发现 | 真实自说明缺口。canonical schema本来必需，工具description与主路径补明取forum_read review_request返回的version，意见提交会推进它，冲突重读不猜 |
| #4Claude模板缺type导致失败 | 当前官方文档明确无type的command配置按stdio处理，不能据此认定缺type导致该次ENOENT。模板显式type清楚化，真实Node/桥/token绝对路径与wrapped对象必须替换；ENOENT需核实际进程错误，不修改全局配置 |
| #5非作者contributor申请被拒 | 正确治理门禁，contributor作者能申请自己的claim，其他contributor不是必然有此权。模板/主路径明确作者或maintainer/owner申请，合格独立评审者取得assignment后提交 |
| #6关系枚举不在主路径 | 现cli-writing已有六种关系，但参与者模板与README缺直接列举；补cites/supports/challenges/supersedes/reproduces/addresses，不添加references别名 |
| #7全部写共享key namespace | 当前源码与docs04反证：域为(actor_id,space_id,operation,key)，具体动作参与operation，部分动作绑定目标（如post.create:THREAD）；publish与relation.create隔离。报告旧调用无确切payload/operation证据，不按其归因改治理。Arch真实samekey跨操作隔离及同操作改payload冲突正负控通过 |
| #8challenge issue/impact null | 既有合法投影及文档已解释：这些字段实际在forum_context.blocking_objections摘要中，当前open-questions关系项不含它们；非objection来源不强制伪造issue/impact。补主路径说明missing_fields不代表原帖子非法，不把半空描述转成新拒绝规则 |
| #9claim-only未写清 | 规则原本存在，review-cli/http已有active claim提示但主路径不够连贯。模板、README、first-collaboration明确active claim当前固定修订才可申请，proposal不能代替claim，findings只是视图、普通review帖不自动晋升，安全诊断区分目标类型 |

外部网关503不是论坛产品故障；不重跑模型或改供应商。报告已自行推翻“revision必须字符串”“wrapped input必须JSON字符串”两项子Agent误归因：revision是数字，wrapped input为对象，整体包裹且outer无额外字段。写入原子性、固定修订、封存独立评审及真实回执约束保持。

## 实现与验收边界

仅省略policy的新空间默认变化，不迁移或改写旧实例、不清空显式required配置；not_required不代表passed。普通MCP权限面不扩大，服务不执行帖子/附件，不伪造检查回执。工具仅改forum_review.description，schema与业务规则由对应runtime修复负责。

官方依据为[Claude MCP说明](https://code.claude.com/docs/en/mcp)，已只读打开核对默认stdio规则；没有执行宿主模型或修改用户配置。本机只读/编辑，不运行测试或安装。真实旧红/修后检查、schema自说明、角色/草案修复、同key跨操作、完整回归与清退以Arch独立收据及主代理最终核验为准。

文案勘误：上一包CLI阅读README的owner字节核对数更正为50（含2份guide/example），主代理仍为46；4项未改支持文件为owner独核。仅与其既有results.json对齐，不改原证据或回填测试。

### 运行与独立验收事实

Arch九后端包build/typecheck/lint共27步骤均exit0（10903/9992/10065ms）；旧实现八例实际3失败5通过，修后八例全通过（2009ms）。角色旧case原断言toContain(author)被旧文案authority子串误满足；改为toContain(target post author)，其他权限/隐藏/红删/无写断言保持。旧八例仍记3失败5通过，不冒称强化后重跑角色旧红。

真实CLI及flat/wrapped正式评审旅程首个完整用例通过（3302ms），包含两个普通合格评审者、默认accepted+not_required且无receipt、精确expected_version、operation隔离与Claude模板检查；五个SDK桥为reviewer1 flat、reviewer2 wrapped、author flat、author wrapped及Claude模板派生wrapped只读探针；全部自然0/null且requested signals[]。CLI执行author发claim/申请/读取/finalize。三普通actor、两reviewer为不同协议身份，不宣称模型认知独立。这是无模型接口/桥验证，不扩成Claude宿主或供应商认证。相关12文件56/56项通过（外层22168ms/exit0）。首次旅程Vitest1/1及27步骤/最终八例已由主代理核原始结果，首次child stdout未单独持久化，不伪称拥有首次raw。额外独立raw运行2788ms/exit0、stderr0，stdout实际保存，核三actor/两reviewer actor/两个reviewer session、default checks[]、revealed version3与accepted/not_required且receipt0、封存404及两模式operation正负控。最终fixture仅补观测计数，首个完整回归186文件1130项中1129通过、1失败（外层365513ms/exit1），主代理最终完整回归与22项字节核验已接受；清退已由owner及主代理独立禁共享新SSH确认ENOENT。

### 首个完整回归与必要fixture修正

首full186文件1130项为1129通过、1失败，原始结果单独保留。唯一失败KS04是既有“冻结检查保持pending”用例只设置profile、隐含旧默认reproduce；新默认[]正确产生not_required。仅在该case setup显式设置原意required_checks:[reproduce]并保其它policy/profile，不改变任何pending/stale断言、timeout或生产源码。独立审查确认保原测试意图；修后完整m6-knowledge-status文件7/7项通过（外层1878ms/exit0），另一最终完整回归全通过，结果独立记录，不拼成首full通过。

### 最终完整回归

第二次完整后端单次自然exit0：186唯一文件、1130唯一项全部passed，failed/pending/todo均0，Vitest362883.31ms、外层363343ms。首完整回归1129通过1失败（365513ms）及KS04整文件7/7独立保留，不拼定向结果；生产代码和九后端27步骤对应产物未变。主代理已独立核22项源/test/fixture/dist字节一致；主代理已新SSH独立核最终完整原始JSON及退出结果并接受，清退已由owner及主代理独立禁共享新SSH确认ENOENT、errno2/absent/exit0。机器记录见[results.json](results.json)。
