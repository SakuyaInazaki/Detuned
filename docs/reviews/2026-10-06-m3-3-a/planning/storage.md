# M3.3-A 本地维护契约（父冻结）

2026-10-06。职责为storage-sqlite新offline-backup/directory-state、公开exports、正式10场景及docs07/ADR036。CLI由B、统一build与独验由C。没有改schema/lock/bootstrap，没有新依赖。

API：backupOffline({dataDir,outputDir,offline:true,hooks?})→{backupDir,manifest}；restoreBackup({backupDir,dataDir,hooks?})→{dataDir,adminActorId,adminToken}；assertDataDirReady(dataDir)同步，CLI mkdir前与acquire后DBopen前检查。MaintenanceError codes INVALID_OPTIONS/OFFLINE_REQUIRED（CLI2），INVALID_SOURCE/INVALID_BACKUP/INCOMPLETE_DIRECTORY/DESTINATION_EXISTS/MAINTENANCE_FAILED（CLI1）。错误不包含业务正文或凭据。

manifest固定backup-manifest.json，strict字段format='detuned-physical-backup'/version=1/schemaVersion=2/createdAt/database:{path='detuned.sqlite',bytes,sha256}/artifacts:[{id,storageKey,path,state,present,bytes,sha256}]。8MiB、10000artifact、单artifact25MiB、safe integer大小；DB不设小型人为cap。登记清单exactmatch，ready必present，redacted/missing存在字节也hash校验保存，缺失present=false。只包含登记文件、不复制orphan/staging/log/clientkeys/锁/WAL/明文凭据。

source目录先真实路径与runtime gate，再DirectoryLock后才打开fileMustExist DB；只接受classify current_initialized且迁移max=2，integrity/FK检查，checkpoint(TRUNCATE) busy=0并log==checkpointed（无WAL -1/-1合法），正常close再copy主DB至私有staging并重新校验。成功checkpoint可改变source物理布局；失败或恢复不覆盖source/backup。

目标canonical realparent+basename，父目录既存，不递归创建。拒目标既存任意路径/链接/内含源/包含源。私有staging先验证；同父确定性.detuned-incomplete-SHA256(canonical target) sidecar O_EXCL、完整fsync与parent sync先于目标mkdir，mkdir独占不会覆盖。目标持DirectoryLock，完整copy及各文件/目录sync，最后去sidecar并sync parent才ready。若mkdir因竞争EEXIST，本次从未拥有目标，解除自己sidecar并sync，不改竞争目标；其它未完成保留sidecar/target供准确人工处置。ready unlink后parent sync失败尽力重建marker。缺标志旧用户目录继续兼容；fixed backup manifest存在无论格式都拒runtime。可信合作进程边界，不抵挡同UID恶意绕锁。

恢复只在staged DB事务撤旧credentials、换token_secret、创建新独立human recovery admin+read/write/admin/['*']凭据。管理员由credential capability判断，现无is_admin字段；不复活禁用actor，保留其余历史。明文token仅一次结果交CLI输出，不落盘。ready后stdout前crash可能丢输出，原backup可再恢复另一新目录，不能保证一次输出被接收。

同步测试hooks atStage(stage)，阶段checkpoint/copy/file-sync/manifest/recovery-transaction/reservation/destination-created/publication/directory-sync/readiness。仅定向故障注入，无CLI故障开关。
