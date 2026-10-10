# M3.4-B 运维事实与有限拆分

本文件只读盘点与下一包范围，不是产品实施或验收。当前A.2结果/接受状态以本包README及verification为准；不复制计数。父决定连续推进B.1安全日志/健康/adminstats，再B.2有界关闭；具体接口、默认值和实验下包fresh后冻结。

## B.1 可复用点与缺口

server/app.ts当前logger:false（约106），响应req.id；身份由preHandler真实authenticateToken后放req.auth（约247），未验证身份不可从header/payload猜actor。没有health/operationalstats路由。日志应有限sink和固定字段白名单；requestID必须可信服务生成，operation用route模板而非raw URL/query，actor/space来自受信鉴权/固定参数，失败未鉴权不伪填。正文、附件、token、SQL、headers、原error cause及研究structured不能直接进日志。默认logger/field集合、sink背压/错误处理、认证位置均待父冻结；不预建shutdown空框架。

SqliteStorage持private db，无现operationalstats port。A.2 configure读取page_size/page_count/max_page_count；usage(maxObjects)最多10001row内部BigInt，count为overlimit sentinel，不能直接JSON stringify BigInt或号称精确无限聚合。安全候选一次同步pages/free/max及wal_checkpoint(NOOP)、受限正规文件stat，区分逻辑分配页与物理DB/WAL文件bytes；实例管理员才见stats，健康仅Boolean/状态不泄漏目录/对象/SQL。NOOP不checkpointframes；PASSIVE会checkpoint/sync，不是纯只读health，busy0也不等于全部完成。安装better-sqlite3 13.0.3 vendored SQLite3.53.4含NOOP；依据[SQLite pragma](https://www.sqlite.org/pragma.html#pragma_wal_checkpoint)。已有storage pragma WAL/FULL/busy_timeout5000在try内可吞失败，readiness必须准确核支持状态，不假设初始化成功。固定reader可观察WAL frame backlog/physicalbytes/exportactive，不推断阻塞者身份或回收根因。

## B.2 当前关闭/资源事实

CLI index.ts约368–389：重复signal由isShuttingDown保护，awaitapp.close→db.close→lock.release→exit0，三段catch吞错；启动失败也吞cleanup，SIGINT/SIGTERM监听没有off。DirectoryLock.release内部又吞close/unlink错并finally清fd，故外层catch不足以报告失败，需要下一包明确窄strict错误传播且保维护原行为。SqliteStorage没有close所有权，DB由CLI持有。

events route已有preClose closing+abort controllers、断连监听清退；core poll25000ms/128等待，100ms调度，finally减计数，取消不ACK。export route已有preClose destroy streams+service.closeAll；activeCount、4并发、120s默认deadline真实timer，reader rollback/close幂等；无需重新当未实现。同步SQL与单native next不能被JS timer硬抢占。

artifact route只activeUploads计数和req.aborted controller，没有preClose全部上传取消/closing gate；下载直接Readable.from(chunks)未跟踪。stage signal能取消等待producer并不无限awaititerator.return，但已开始filewrite/fsync/link等OS I/O不能立即打断。core create接手后awaitpublish→当前鉴权/短事务→finallycleanup，不收signal；关闭必须追踪finalization/cleanup，不可在其还活时先closeDB/release锁。上传/慢下载无应用级duration；server没有显式requestTimeout/connectionTimeout/keepAlive/forceClose配置，本包不对Fastify默认值作猜测，准确框架关闭约束由B核官方及安装源码后父冻。

最小候选：B.1 protocol/server日志health组合/CLI与storage窄安全stats；B.2 CLIshutdown组合、server活动资源/routeartifact/必要artifact-files、现events/export lifecycle接线、DirectoryLock严格release。无新schema/后台daemon/WAL硬cap。候选验收：真实日志敏感探针与可信ID；live/ready/admin权限与坏库固定诊断；NOOP持reader观察不checkpoint；真实signal取消poll/export/慢upload/download并重启拿锁；publish未commit屏障确保DB最后关闭；超budget/close各失败非零，native不可抢占准确报告。

## 工程里程碑边界

主DB页与登记附件cap不覆盖WAL/SHM/temp/log/backup/staging/orphan全目录物理硬限；长期WAL策略仍待规划。M3最终gate后按docs09 T12/T13逐支持场景核真实证据：已支持profile schema1→2、current2备份/新目录恢复、逻辑导出导入、损坏拒绝、旧credential/cursor隔离和pending恢复；脱敏read/history/FTS/context/artifact/export/replay与快照失效各单列。不能扩成任意历史版本或任何平台无限要求，也不能凭本包运维通过省略真实缺口。
