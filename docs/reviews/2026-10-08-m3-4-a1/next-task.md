# 下一任务：M3.4-A.2 服务主库页数与实例登记附件配额

父已选定本包方向与下列默认值，精确port、配置与flags接口在下一包fresh baseline后按当前代码事实一次冻结。A.1已由父接受有限标准buildApp/serve进程内范围，接受状态与最终证据以[本包README](README.md)及[独立验证](verification/)为准，不复制计数。用户持续授权自动推进；主代理负责方案/所有权/验收，gpt-6.1-sol子Agent在冻结边界内实现。本文是下一包任务书，未实施或验证以下能力。

## 范围与默认

服务SQLite连接每次显式apply `PRAGMA main.max_page_count`，限制主库有效分配页。父选定默认主DB 1GiB，允许配置1MiB..1TiB安全整数bytes；按真实page_size向下取整为页数。现page_count超过目标，或设置后实际返回不等目标，启动前安全拒绝；不能依SQLite自动抬高上限却宣称配置生效。每个新运行连接重新apply，不把此设置写入数据库header/instance_metadata，不迁移schema、不新增ledger/counter triggers，不影响bootstrap与offline backup/restore/import/upgrade维护路径。原实例或逻辑import已超运行额度时由操作者提高允许范围或处理材料，不静默删除或修改研究数据。

实例登记附件默认累计4GiB、10000对象，bytes配置1..1TiB安全整数、objects配置1..10000，保持现physical维护10000登记范围。所有登记状态ready/redacted/missing均计费；既有单文件25MiB、单空间1GiB及upload并发约束保留。fresh附件创建在同业务事务内检查全球bytes/objects与现空间配额，然后登记、事件和幂等结果同提交；成功replay不新占额度。恢复/重启必须从真实登记材料得到准确额度，不能只靠运行期内存累计而漏历史或rollback。

主DB页额度与登记附件额度是两个明确scope。它们不保证WAL、SHM、SQLitetemp、日志、备份、上传暂存、未登记孤儿或整个目录的物理硬bytecap。重复修改相同页与长期reader可使WAL大于主DB额度；随后M3.4-B再做可观察性、持有reader等有限验证、健康与有界shutdown，不提前称完整运维或磁盘永不耗尽。A.1进程内写入限流继续保持，也不替代本包耐久材料约束。

## 开工短规划与一次接口冻结

先核SQLite/安装better-sqlite3的真实事务及pragma行为，确定服务连接配置注入与严格返回验证的位置，不能把新pragma失败塞进既有吞错catch。配置由组合根严格解析/验证后显式注入，业务不读env，CLI/MCP/Pi不复制配额规则；默认、范围、端口与flags单源。逐文件划分core/storage、protocol/server/CLI、独立验证所有权；不改SQL/schema/静态历史fixture或旧审查证据。

统一额度错误为 `QUOTA_EXCEEDED` HTTP507、retryable=false、安全固定诊断和明确scope，不含原SQL、token、正文。SQLITE_FULL必须在驱动退出事务后映射；不能catch后继续执行可能已自动rollback的“同事务”SQL。FULL也可能来自真实磁盘或临时资源，不诊断成肯定触发配置上限；需覆盖事务写及管理/session直接写的传播路径。标准client完整解析507不自动重试；transport失败仍沿既有bounded retry规则，不改client重试算法。

登记aggregate不得因异常长声明bytes变成500：逻辑import的missing可带大于25MiB的safeinteger声明，多个相加可超JS安全范围或SQLite SUM整数范围。开工确定objects先bounded检查及bytes饱和聚合/BigInt等最小实现，既有overlimit必须确定性拒绝。不能以每次遍历全部研究历史来计算额度；只读登记附件的单row聚合或有界遍历需明确工作量与溢出策略，不虚称SUM因索引变O(1)。不得增加无必要schema/持久计数破坏export/import/physicalbackup兼容。

## 必须真实验收

- 新连接、重开及重启重新apply；配置非法或既有超额度在listen前拒绝，无敏感回显、无数据偷偷改动；实际page_size取整/pragma返回严格验证。
- 私有小页数实例真实触发SQLITE_FULL，在业务写、事件及幂等尾端分别证明整事务回滚、无部分业务成功/错误replay记录，连接后续读取可用；不只用模拟异常替代真实页分配。
- 附件已publish再遇FULL，确认本调用stage/published对象清理与登记/事件/幂等一致；cleanup失败不掩盖主错，不把残留孤儿宣称成功附件。
- 两个真实upload竞争最后global bytes或objects额度，一胜一507，空间配额仍有效；全状态登记均计、成功replay免新增、失败不漏记、restart保真实额度。超大missing声明与安全整数/SUM溢出边界返回确定性额度错误。
- 真CLI与HTTP错误契约、标准client不对完整507自动重试；配套运维guide说明调整额度/历史超额、各scope与非全目录保证。作者定向、独立oracle和C统一门禁分别保留真实结果、首失败与适用条件，不把未跑项写通过。

后续兼容gate必须复用本包已归档current29第11适配入口[check-unfinished-contracts.mjs](verification/adapters/check-unfinished-contracts.mjs)，按[适配manifest](verification/adapters/manifest.json)和[精确diff](verification/adapters/adaptation.diff)核来源/hash/显式高量配置；保留旧原script与默认20导致U07高量初始化429的原失败条件、输出，不改旧材料、不把原命令写成通过。不要下包再次让非限流高量seed撞默认20后反复重写历史脚本；该适配只用于既有研究/审计兼容gate，不能替代默认限流正式验收。

完成A.2后衔接M3.4-B。全M3/T12未覆盖边界仍按roadmap单列，不能将本包额度能力包装成完整运维验收。
