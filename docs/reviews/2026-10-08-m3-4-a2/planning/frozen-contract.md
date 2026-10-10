# M3.4-A.2 冻结契约

父已裁定服务main SQLite connection每次显式apply max_page_count、实例全状态登记artifact累计bytes/objects；本包不实现WAL/全目录硬额度，不改schema/SQL/维护/clientretry/A.1。

protocol ResourceLimits字段database_max_bytes/artifact_max_total_bytes/artifact_max_objects，默认1GiB/4GiB/10000；范围database1MiB..1TiB、artifactbytes1..1TiB、objects1..10000安全整数。B resolver/组合根/CLI单源。StoragePort必需configureResourceLimits(limits):void；标准buildApp缺runtime方法明确拒绝。SqliteStorage旧ctor不自动apply，offline维护不受运行连接额度。configure按真实page_size向下floor页，先currentpages拒超额，再set和query核实际返回完全相同，不静默抬高、不持久header/metadata；全状态已有附件超额启动拒，不删改材料。

getArtifactUsage(maxObjects):{objects:number,bytes:bigint}按PK逐row<=maxObjects+1，CAST bytes为十进制文本再BigInt；objects上限+1为sentinel而非全量精确count，O(cap)非索引SUM常数。iterator任何异常/提前stop释放，不全历史数组、不SQLiteSUM溢出。配置允许10000因此最多10001row；BigInt不publicJSON。ArtifactService existingArtifactLimits之后尾ResourceLimits默认resolved，生产传唯一配置。fresh短事务先globalusage cap再原spaceSUM，所有state计、replay免新占、登记/event/idem同提交。缺能力拒，不silentskip。

新额度与nativeFULL统一QUOTA_EXCEEDED507retryablefalse，安全details仅scope：database为已知配置启动拒、instance_artifacts为globalcap、storage为nativeFULL不确定磁盘/temp来源。原spacequota/upload/export/poll等429兼容保持。FULL在driver退出transaction后mapping，不catch继续同事务；server兜底directadmin/session错误。A.1 admission退款语义不改。标准client完整507不自动retry，transport仍原bounded规则。

限额不保证WAL/SHM/temp/log/backup/staging/orphan全目录物理bytes；existingmissing大声明照计，确定性超额而非SUM溢出500。运行启动超额只安全拒，操作者提高允许范围或处理数据；不静默修改。

A own新sqlite-resource-limits.ts/sqlite-storage.ts/storageindex、coreStoragePort/artifactservice、新resource-quota.ts/coreindex、新m3-resource-limits.test.ts、docs07/ADR041与本目录。B protocol/serverapp/CLI；C独验统一build。作者真FULL正式采用私有固定testtable zeroblob>cap、包装业务/event/idem方法有限定位，是测试注入触真实FULL，非自然负载，无产品fault面；另<=32自然合法大正文写触FULL，显式高writeRate避免429遮盖。两connect/reopen/oversize事实随正式，不额外重复实验。
