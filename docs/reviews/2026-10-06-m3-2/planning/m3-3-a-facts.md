# M3.3-A 下一包只读事实：离线一致备份与新目录恢复

2026-10-06。依据docs07§6与roadmap M3.3窄查现实现；本文件是事实/候选，不是已实现能力或后续实施许可。未运行备份实验、改用户数据、增加依赖或开始后续产品代码。结构化导入导出另包。

## 当前复用点与缺口

- `packages/storage-sqlite/src/lock.ts`：DirectoryLock(dataDir)以detuned.lock的O_CREAT|O_EXCL实现现CLI进程互斥，写PID；发现PID存活或无法证明ESRCH即拒，ESRCH才尝试回收。CLI init与serve在打开detuned.sqlite之前acquire，serve退出close DB/release。它是协作式目录锁，不是SQLite所有外部连接的OS锁；不遵循Detuned目录锁的任意SQLite writer不能仅凭它证明不存在。lock内容不可读/未知PID会拒，不应绕过它备份。
- `packages/cli/src/index.ts`：init创建目录→锁→new Database→openAndCoordinateDatabase('init')→关闭解锁→输出admin_token；serve同锁→当前实例协调→SqliteStorage→getInstanceSecret→ArtifactFileStore创建/cleanupOrphans→listen。现无backup/restore命令，也无本地恢复管理员重发入口；不能用init重发，因为已初始化库bootstrap明确返回adminToken=null。
- `bootstrap.ts`：CURRENT_SCHEMA_VERSION=2，classifyDatabase六类并verifyDatabaseStructure；current_initialized需initialized=true、非空token_secret及human主体。corrupt/future/unknown拒绝，bootstrap迁移同事务。可复用只读分类/物理结构防线，但备份不应调用可迁移的bootstrap静默升级原库；恢复是否接受legacy须父冻结版本范围。现SQL schema/table version材料已有，备份format version、完整文件manifest和哈希验证尚无。
- `sqlite-storage.ts`：初始化journal_mode=WAL、synchronous=FULL、foreign_keys=ON、busy_timeout=5000，但pragma异常被吞；新备份步骤必须显式检查checkpoint结果，不把现构造器当checkpoint成功证据。现无备份协调/helper。服务停止后仍可能有残WAL，不能仅拷detuned.sqlite；需持锁正常打开、显式checkpoint、确认无busy再关闭得到一致主DB。
- `schema.sql`/`sqlite-storage.ts:getInstanceSecret`：持久元数据只有initialized/token_secret相关用途；未见独立instance delivery epoch。spaces.acl_epoch为权限代际，不能冒称实例恢复epoch。server/app.ts把同token_secret供EventService/context/search及三种固定read cursor签名；轮换它会同时令旧checkpoint/batch cursor/search/content游标失效。credential.token_hash直接SHA256(raw token)，认证不依赖token_secret，所以只换secret**不能禁用旧凭据**。必须另在恢复库事务撤销全部旧credentials并发新本地管理员token；原库保留原凭据状态。
- `artifact-files.ts`：dataDir/artifacts/staging与objects；storage_key单段[A-Za-z0-9_-]{1,160}，stage_32hex；真实目录校验、O_NOFOLLOW、完整fsync和无覆盖link已有思路。cleanupOrphans删stage和未登记objects；listArtifactStorageKeys查询全部artifacts行，**不按ready过滤**，保留redacted/missing登记key。因此backup不能复用cleanup做清单、不能把全部key等同必须可下载对象。
- artifacts记录含sha256/bytes/storage_key/state（默认ready）。ArtifactService只允许ready读；redacted返回410，其余state与ready缺物理file均404。redaction在DB把state改redacted，现文件清理没有同步删该登记对象。故备份须准确区分ready必要字节、redacted已保留物理字节与missing合法墓碑；备份不自动修复ready缺失，也不因恢复而把missing/redacted改ready。hash/bytes必须与DB已登记材料核对，不仅信manifest自报。
- 管理HTTP `/admin/credentials`有真实新token→hash→createCredential、一次性返回；需当前管理员认证，无法从全部撤销库自举。createCredential/revokeCredential与createActor可窄复用到明确的本地恢复事务；不删除initialized或借fresh bootstrap制造新实例。管理员权限不可发普通Agent，token不可写备份manifest/日志。

## 最小候选边界

候选命令：`detuned backup --offline --data-dir SOURCE --output NEW_BACKUP_DIR`与`detuned restore --backup BACKUP_DIR --data-dir NEW_DATA_DIR`。backup只接受离线明确flag，先校验source真实目录与已初始化当前库并持DirectoryLock，活跃serve拒绝；新output必须不存在、不得source内或source别名。完整备份只含一致detuned.sqlite、已选择登记objects、version/hash/bytes/path manifest，不含锁/WAL副本/logs/staging或本机客户端凭据。数据库中的credential hashes敏感，整个备份私有存储。

restore先只读检验manifest严格shape/版本/尺寸、safe固定相对路径、重复名/路径穿越/绝对路径/链接拒绝，核每文件sha256/bytes并核DB结构、foreign_key_check与附件DB关联。必须NEW_DATA_DIR不存在、不覆盖任何材料、不得backup/source别名。私有staging准备全部材料并验证，再以无覆盖方式原子启用新目录；失败不部分启用且源/备份不改。恢复只在新DB事务轮换cursor secret、撤销旧凭据、创建一份明确本地human admin新凭据，然后关闭/fsync/发布；明文token仅按最终CLI约定一次输出或专用私有文件返回，不进manifest。新凭据管理员可启动后通过现HTTP reissue其余actor凭据，历史actor/session/membership/幂等/event数据保持。

## 父需裁定的三个实质选择

1. **恢复版本范围**：首包只接受当前schema2/当前backup format（最窄且不迁移原材料），还是兼容受支持legacy并在staging迁移。建议首包current-only；未来/未知严格拒，升级演练另包。
2. **登记非ready附件**：ready必须存在且匹配hash/bytes；对redacted物理file若存在是否保留其敏感bytes到物理备份（完整恢复语义），missing是否只保留DB墓碑并禁止file冒充ready。建议物理备份准确保留已存在登记file及墓碑，manifest列明state/present；ready缺失与任何已存在file哈希不符失败；不得把物理备份称已脱敏公开导出。
3. **恢复隔离与管理员**：复用token_secret轮换一次让全部旧签名游标失效，或新增独立delivery epoch（会扩schema/cursor契约）。建议首包轮换secret并全部撤销旧credentials，在原human admin主体上签发一份新本地管理员凭据；若改建新human主体则须明确历史membership继承规则。不调用init，不静默启用旧token。明文token建议沿既有init的一次JSON输出方式并明确敏感，不默认写全局配置。

当前未证明离线备份/新目录恢复可用。实现前须由父冻结路径/manifest/原子发布、附件state策略及权限恢复接口，然后安排真实active-writer拒绝、损坏/穿越/覆盖拒绝、新目录重启数据/附件/旧凭据/旧cursor失效与新管理员恢复测试。
