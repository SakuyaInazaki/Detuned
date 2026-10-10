# M3.3-A 单元 B：CLI 与 runtime readiness 只读规划

2026-10-06，承接M3.2父接受373/42、当前29最终组合。本文件只规划；不表示M3.3已实现或验收。已核最新AGENTS/README/progress/reviews、任务书与facts，并沿已读docs00/08/11开发边界及docs07§6、03/04相关契约；旧历史/归档/全局配置保持。

## 最小接口候选

backup命令：required `--data-dir <dir>` / `--output <dir>`，布尔 `--offline` 无默认true；缺offline由action验证抛VALIDATION_ERROR exit2。restore命令：required `--backup <dir>` / `--data-dir <dir>`，不接受offline。缺required、未知选项仍由现Commander exit1，保留现行为；空白路径action拒2，真正路径/锁/清单/格式规则由A本地受信业务层裁决，不在CLI复制。A公开错误类型/映射由父冻结。

CLI直接调用 `backupOffline({dataDir,outputDir,offline:true})` 和 `restoreBackup({backupDir,dataDir})`，不getClient、不认证HTTP、不读token-file、不改网络或全局配置。目录解析只在组合根path.resolve。备份成功输出非敏感目录/format；恢复沿init现printOutput一次输出admin_actor_id/admin_token，并标明敏感与仅本地human保管。不得把结果或错误cause写stderr/日志形成第二份token，失败不输出token；清单不含凭据。返回字段准确名字等待父冻结。

Gate候选为A/storage-sqlite公开同步 `assertRuntimeDirectoryReady(dataDir):void`，init/serve必须在acquire DirectoryLock之后、new Database之前调用。拒A父目录确定性incomplete sidecar与物理备份manifest/类型标记，保持legacy正常无标记目录的既有初始化/启动规则。

## 竞争与兼容

- init先创建目标：A独占mkdir失败，不覆盖；如果此时A已sidecar预留，init锁后gate明确拒绝，不open DB。
- A先创建sidecar但尚未final mkdir：init可能mkdir成功，但锁后gate见sidecar拒，不能让半套启用；A看到已存在目标后失败而非覆盖。
- A已final mkdir且持final DirectoryLock：init/serve互斥拒；A完成数据后最后移除sidecar并同步，释放锁后才可启动恢复目录。
- 完成物理备份即使没有sidecar也不能做runtime；必须由manifest/专用kind标记拒，不能仅按detuned.sqlite存在判断。
- 双方必须复用相同parent realpath+basename/sidecar计算，等价父目录别名不能产生不同incomplete名。可信同OS用户目录前提仍需明示，不扩大为任意敌对writer防护。

legacy无标记正常目录gate通过后由原openAndCoordinateDatabase决定版本，CLI不新增迁移行为；backup/restore current-only仍由A负责，不用init误升备份。

## 文件与真实验收建议

B所有权候选：packages/cli/src/index.ts、新tests/contracts/m3-backup-cli.test.ts、新examples/backup-recovery.md、本planning与implementation/cli/。A-owned directory-state.ts / offline-backup.ts不修改。

新built CLI合同：明确offline与required/unknown/空白参数退出、真实init→backup→restore新目录、一次敏感stdout（只断言字段不归档实际token）、全旧credential拒绝与新管理员可用由C补跨HTTP深验；active serve持锁backup拒、备份目录init/serve拒、未完成sidecar init/serve不生成DB或监听、正常legacy既有目录兼容。复制/hash/DB事务故障边界主要归A/C；B不写另一套备份逻辑。

正式before记录旧built对backup/restore unknown command真实首失败；父冻结后才新增正式tests/实现；新进程built路径由C统一build后跑，无临时复杂编译框架。每child有合理有界门禁，多真实进程case按实际工作给有界case timeout。不build/运行产品或凭据恢复实验于此规划阶段。


## 父冻结后实施边界

准确入口packages/cli/src/index.ts；新增正式tests/contracts/m3-backup-cli.test.ts，仅此一份。公开同步gate为assertDataDirReady，init/serve mkdir前与acquire后DBopen前各调用一次；fixed backup-manifest.json存在即拒runtime。API backupOffline返回backupDir/manifest，manifest.schemaVersion→CLI schema_version；restoreBackup返回dataDir/adminActorId/adminToken。MaintenanceError INVALID_OPTIONS/OFFLINE_REQUIRED映射2，其余INVALID_SOURCE/INVALID_BACKUP/INCOMPLETE_DIRECTORY/DESTINATION_EXISTS/MAINTENANCE_FAILED映射1。Commander required/unknown仍exit1，旧HTTP映射不变。只current schema2/format1，源/备份/目标业务校验归A。
