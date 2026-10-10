# A交付（产品/正式测试冻结，待统一独验）

当前离线物理备份与新目录恢复API、sidecar gate、strict manifest/current schema/附件exactmatch、恢复凭据事务完成。10个源码定向case最终10/10、1文件；storage-sqlite noEmit exit0（tests-final.log/typecheck-final.log）。无build/fullsuite，真实CLI/新进程cursor/pending闭环由C统一验证。

before.log仅旧built API盘点（无backup/restore/gate），不伪称产品失败。首次8通过tests-first；新增DELETE/WAL/current矩阵后tests-v2有一次测试夹具预期路径失败（tmp /var vs canonical /private），原日志保留；修test按maintenanceTarget canonical预期后tests-v3 10通过。mkdir竞争清自有marker窄修后tests-final同10再次通过，数量不累加。

文件范围：storage-sqlite新directory-state.ts/offline-backup.ts与index exports；新m3-backup-recovery.test.ts；docs07/ADR036；planning/storage.md。本次未改lock/bootstrap/schema，也未新增依赖/安装/用户全局配置/commit/push/模型。

已知限制：合作目录锁不阻止任意外部writer；成功checkpoint可改变源库布局；备份敏感物理bytes非公开导出；一次明文token输出未必被收到，完整backup可另新目录重恢复；incomplete保留需人工检查，不可绕gate。真实介质灾难/完整T12/M3.3与导出导入/升级演练不在本包结论。

父授权诊断窄修：B真实chmod反例见implementation/cli/ready-double-fault.*，先保留原现象。post-unlink parent sync失败时重建marker成功仍走通常incomplete诊断；重建也失败则不吞为必不可启动，准确报完整数据/持久性与交付未确认/可能可启动，要求勿用并从原backup恢复另一新目录。没有改变发布协议。新增一条真实chmod定向回归，final diagnostic版11/11、1文件（tests-diagnostic.log），检查原backup保持、target完整DB/新human/旧cred撤销、gate确实可能不存在。pre-ready半数据仍被gate拒启，两边界不混淆；不可盲删marker。C已协调暂停后修改，须增量build与最终针对门禁，未重复fullsuite。
