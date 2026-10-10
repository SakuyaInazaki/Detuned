# M3.3-B.1 B→A 只读互审

2026-10-06，依据A finalfreeze/frozen-contract，未改产品/tests、未执行新实验。互审不计正式测试重跑。

具体SQL成本finding已报父/A/C待裁定：space-export-snapshot.ts FAMILIES的relation_resolution采用(r.relation_id,r.version,r.id) tuple keyset及ORDERBY；schema.sql relation_resolutions只有id PRIMARYKEY，无该composite索引。因此每次LIMIT1可能重复扫描/临时排序剩余resolution，不能因使用keyset语法就证明单调索引seek。最小压力反例是同空间大量不同relation_id的resolution连续导出；不授权新实验、不直接改A。候选用已有id主键作为单key保持确定family次序，不需新schema。A已授权10k smallrow probe若只覆盖posts，不能替代resolution成本证明。

其余只读核实：专用readonly file reader只查询journal_mode，非WAL/:memory:不可用，不沿SqliteStorage写pragma；query_only/cache限额/BEGIN后space元数据与CASTMAX事件seq建立T0，close rollback+dbclose。内容、固定ref与artifact状态全来自同reader T0，无current混读；当前身份由主storage短snapshot refreshContext/observer，每line/end前acl epoch、(checkedthrough,through] redaction及事件高水位回退检查，string绑定+BigInt保64位。两连接单独职责，主事务不跨await。

FIELDS显式白名单与专用SQL列，不导credentials/secret/session/private内部；post/旧revision及redacted/missing artifact墓碑如父定。refs四known structured与空间pins精确shape+同space固定ref/visibility，redacted pointer按冻结允许，跨space/private/缺失过滤；未知用户内容保持而不识别任意秘密。projected改变后省source_content_hash，否则存原hash；普通review不升正式status。

hash从raw32zero逐exactUTF8+LF，header/record链、end不链；bytes含end，bytes_before_end取此前值，seq/count限额连贯；raw在SQL测后才textparse，编码再测line/total。过滤最多128候选pending让出，无全空间JS数组（限额row内的tags/refs除外），一line/一chain。nextLine throw closes session，timer即下游暂停也terminate/readerclose/slotrelease并onError；closeAll/断开由route触close，幂等清timer。JS timer无法中断执行中的同步SQL，长read transaction可能延迟WAL截断，是明确限制。

B按父要求自核：CLI index.ts sink使用FileHandle.writeFile(line)且await，每次便捷函数完整写盘后才下一line，不用单次write声称成功；client export-stream首次header schema检查后绑定source.space_id===请求spaceId，错误空间在sink之前拒，非客户端ACL复制。完成end+EOF后才Promise成功、CLI发布；这些事实不需要新增镜像测试。

## 2026-10-07 keyset finding closure（只读）

已关闭上述 relation_resolution 复合排序成本 finding。核实重新冻结的 space-export-snapshot.ts:15 使用 keys:['r.id']，共用 nextCandidate:51–62 据此构造 r.id > ?、ORDER BY r.id、精确主键取材料；采用现有 id TEXT PRIMARY KEY，不新增索引/迁移。relation 仍先于 relation_resolution，白名单继续保留 relation_id/version/reason_ref 原值，没有改写版本或承诺关系内版本连续排序。docs/03-data-model.md:227 与 planning/frozen-contract.md:25 已同步主键升序契约。

旧 resolution-before.log 保留实际 schema/index 与旧查询 SCAN r、USE TEMP B-TREE FOR ORDER BY 事实。修后 resolution-author-probe.ts/log 是合法同空间10,000条解决历史的真实有界逐行探针，检查id递增、原version/ref与全count；最终 complete=true、10009行、2508.757584ms、最长单next 3.6655ms、未越30秒。作者首探针最终relation state夹具不符合最后reopen动作，原log保留，修为open后最终结果另存；不把两轮计作新增正式测试。该probe支持此fixture消除已报明显重复排序问题，不证明异空间巨量扫描、100k容量或同步SQLite硬CPU截止。本次仅阅读现有源码/契约/日志，未运行测试、实验或修改产品；保留原finding历史及其适用限制。
