# M3.3-C 父冻结：离线复制旧实例后升级新目录

API upgradeOffline({dataDir,outputDir,offline:true,adminName,signal?,timeoutMs?,hooks?})；timeout默认/最大120000、adminName trim1..128码点；返回{data_dir,source_data_dir,source_schema_version:1,schema_version:2,upgrade_id,admin_actor_id,admin_token}。UpgradeError.code沿维护语义INVALID_OPTIONS/OFFLINE_REQUIRED/INVALID_SOURCE/INCOMPLETE_DIRECTORY/DESTINATION_EXISTS/UPGRADE_CANCELLED/UPGRADE_TIMEOUT/UPGRADE_FAILED，前两exit2其余exit1，无正文/token/SQL诊断。

源严格supported_legacy/version1+原v1结构，显式integrity/FK首错，拒blank/current/future/corrupt；既有metadata只在classify不矛盾时容许。先DirectoryLock/gate后DB正规file readonly/fileMustExist，不源SqliteStorage/bootstrap/checkpoint。源.db/-WAL现存字节及登记附件保持，lock/SHM可变单列，合作锁不防绕锁writer。

readonly backup私有stage：安装driver progress每步≤100pages检查signal/deadline，await后再check，单native step不可硬抢占。附件支持profile artifacts/objects/storage_key，原fa1b35c只有DDL而无HTTP附件实现，人工附件fixture标明；source目录/file无软链越界，ready存在hash/bytes，redacted/missing有file校验保留，无file不制造ready；未知state拒。最多10000登记/单25MiB，keyset逐row，未登记objects/staging/log/keys/locks不复制，不改backup-format。

副本bootstrapDatabase既有事务迁移，不补造未知thread历史。current结构/FK/integrity/附件复核后，新身份事务撤全部旧credentials、新secret、新独立humanadmin/一次token，旧actor禁用/membership/session/research/idempotency/pending保留。回退用原实例+匹配旧runtime+原外部签名secret，不用逻辑import。

staging→reservation/O_EXCL→独占mkdir→lock→copy/fsync全部file/dir→unlinkgate→parentsync；失败不覆盖源/旧目标，自有半目录gate、unlink后双失败完整目标准确诊断，token丢失另新目标重做。hooks after-source-lock/backup-step/after-copy/before-migrate/after-migrate/credential-reset +既有publication stages（含readiness-unlinked/gate-restoring）。ready后的迟到abort不误报半套。Aowner offline-upgrade/index/offline-backup窄helper、newformal/docs03/07/ADR039及本包；B旧runtime/CLI、C独验统一build。

父已裁定必要thread窄修：现存thread_version唯一且整数1..current，current必有且title/state匹配；允许未保存的历史缺口，不填造，provenance thread.history_complete=count==current/min1/maxcurrent。space/post连续约束不动。原v1backfill只有current，但migrateIdempotencyRecords也可从旧成功补history；完整旧create/patch可得到[1,2]。gap正例需明确来源缺可重建的旧creation幂等记录条件（已报父），不能虚称全部v1升级必gap。

canonical源内/等同/alias目标拒绝，不污染原实例。源字节比较在oldruntime回退后新写之前完成；回退另外授权fixture写不计入维护源不变断言。

兼容fixture准确条件：fa1线程create/patch API必需key、旧IdempotencyService没有TTL。完整旧成功缓存可补[1,2]（首反例假设失败保留）。父批准仅private fixture显式删除thread.create key=thread缓存行，研究行保真实旧HTTP来源，模拟受支持legacy缓存不完整边界；不称原API自然过期。该来源条件先记录，再跑原import拒稀疏流before，后窄修。

原有WAL仍须逐字节保持；原无WAL时允许SQLite新建正规0-byte协调WAL，与SHM/lock同属协调sidecar变化。禁止非空新增WAL或业务写；不清理源empty WAL，不引入unlink竞态，也不使用会漏读遗留WAL的immutable打开。此边界不承诺源目录完全零写。
