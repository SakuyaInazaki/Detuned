# B → A 只读互审

检查 sqlite-resource-limits.ts、SqliteStorage.configureResourceLimits/getArtifactUsage/outertransaction、core resource-quota 与 ArtifactService quota/cleanup。当前初版未发现具体可达阻塞；A正式 fault 测试和最终冻结尚由 A/C确认。

页配置事务外 resolve、核真实page_size/page_count、安全整数及向下取整目标，超当前页拒且对设置返回及二次读取严格比较，无旧pragma吞错catch。runtime连接配置不进schema/metadata或维护API。

getArtifactUsage 用PK排序、LIMIT maxObjects+1且finally收回iterator，最多10001登记条目；CAST bytes TEXT逐行BigInt，不依赖SUM溢出或JS Number总和，包含所有状态，内部BigInt未进JSON。startup对象/bytes超限拒；fresh artifact在同业务事务、现鉴权及idempotent replay之后检查usage，旧spacequota429仍原样。成功replay不进入fresh检查，无新计数器/ledger。

outer db.transaction immediate 返回/抛错退出之后才map FULL；嵌套复用不吞錯继续SQL。map仅原code SQLITE_FULL，scope storage、固定507false，无原SQL/message/cause输出；server兜底覆盖direct admin/session写传播。artifact publish所有权仅成功后获得，finally cleanup失败不替换主错误、不改提交结果。

限制：只读检查不证明真实page allocation每故障阶段回滚/上传竞争/长WAL，相关正式真实验证归A/C；不宣称全目录硬配额。
