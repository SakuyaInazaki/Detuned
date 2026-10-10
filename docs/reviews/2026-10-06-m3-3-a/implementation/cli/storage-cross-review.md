# M3.3-A B 对 A 的只读交叉审查

2026-10-06，依据implementation/storage/freeze-manifest。只读源码审查，无产品修改/新实验，不计正式测试重跑。

发现一个父已裁定为诊断/文档精确补项的ready后双故障边界：offline-backup.ts publish:130–133先unlink sidecar，再sync父目录；失败catch尝试reserve，但其失败被catch(()=>{})吞掉。如果post-unlink父目录sync失效且无法重新创建marker（例如同步hook模拟父目录变为0500后throw，或真实FS后续写失败），restore返回MAINTENANCE_FAILED，final却没有sidecar或backup-manifest，init/serve gate可通过，恢复token未输出。所有数据已copy/fsync并完成事务，这不是缺半份文件，却偏离“失败结果拒启”的强表述。父裁定所有数据已durable完成，此双故障不能冒称半套/数据损坏；ready最终持久性未确认与一次凭据输出丢失才是准确限制。已依授权运行受控小反例：post-unlink hook chmod父目录0500并throw EIO，finally恢复0700并清临时目录；exit0，MAINTENANCE_FAILED、marker absent、gate allows=true，同时DB integrity ok、旧credential revoked、新human存在。只保布尔/codes，无secret；见ready-double-fault.*。单一sync fault通常能重新reserve，与双故障区分。建议A错误message明确marker重建成功/失败；失败时完整target可能可启动，应保留原backup另新dir恢复，不声称必拒启。

其余核对：

- backup先真实source与readiness、取得DirectoryLock，再DB fileMustExist当前schema2分类/integrity/foreign-key校验。wal_checkpoint(TRUNCATE)检查busy=0与log/checkpointed，关闭后才拷主DB；同约定writer互斥，不防绕过锁writer。
- canonical realparent+basename计算sidecar，新目标与source不得互含；已存在目录/marker拒绝。发布先O_EXCL sidecar+fsync父、exclusive mkdir、final lock；mkdir EEXIST只清自有sidecar，不修改并发出现目标，不用可覆盖rename。中途copy/fsync/manifest/txn/publication失败保留拒启marker。
- manifest严格v1/schema2/字段shape、安全固定相对路径、重复id/storageKey/path、8MiB/10000/25MiB上限；layout只允许固定私有目录/文件，symlink与额外材料拒绝。所有声明present文件复核bytes/hash，stage DB结构及artifact inventory id/key/state/hash/bytes exactmatch。
- ready必须present；missing/redacted缺失仍写墓碑present=false，存在则bytes/hash验证保留。恢复match保持原DB state，不把它们改ready。源/备份只读验证与拷贝，不对backup重发token或迁移。
- 恢复只在staged新库事务撤所有未撤credentials、轮换token_secret、新建human与新admin credential；原actor disabled_at及旧membership/history/pending/幂等不重写。事务fault回滚，stage最终清理，返回新明文token仅在publish完成后；包装错误message不含token，CLI不输出cause。ready后stdout丢失的接收保证仍是明确限制。
- B gate两位置（mkdir前、锁后open前）与A sidecar匹配，固定backup manifest坏也拒runtime；普通无marker旧目录兼容现coordinator逻辑。

已获父批准的新BKCLI02两canonical返回路径期望窄修，非产品bug。由于C专项开始与窄修时间交错，已告C精确mtime/hash，不能称该窗口测试源码零变化。后续A任何父授权fix需新freeze/C重新窗口，旧证据保持。

## 诊断窄修 closure（只读，保留原 finding）

A新freeze后核实offline-backup.ts:132–138：父目录sync失败时仍尽力reserve；reserve失败不再静默吞，而抛稳定MAINTENANCE_FAILED，明确Target fully written / durability unconfirmed / startup gate could not be rebuilt / may be startable / do not use / retain backup and restore another new directory。没有把该状态误报半份数据或清理final，没有输出adminToken或cause到CLI；reserve成功仍保留既有失败包装与门禁事实。

新增正式tests/integration/m3-backup-recovery.test.ts相应case使用readiness后parent-sync模拟故障/权限不可写，匹配明确诊断，并核marker缺失、gate可通过、完整DB/新human与旧credential撤销；finally恢复mode。这是A正式回归，由C统一执行，B未重跑。docs07与ADR冻结边界、example两句均明确同一双故障例外，与ready后stdout丢失分开；不再泛称所有失败必拒启。

本项按父限定诊断/文档补项已关闭；物理FS禁止后续写入时无法保证marker重建的明确限制仍保留。此closure只读核实，不覆盖原反例与先前源码事实，不替代C新build/正式结果。
