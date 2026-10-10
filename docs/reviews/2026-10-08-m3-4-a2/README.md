# M3.4-A.2 主库页数与登记附件配额

2026-10-08，父已接受有限主库分配页与全状态登记附件配额范围：最终485项/60文件、新18包含总数，current29组合29/29（24原probe+1复用A.1批准适配）。build/typecheck/lint/fullsuite各一次；首new17/18及RSB04 fixture修正保留，无重build或产品运行期修复。

使用指南见[服务资源限额](../../../examples/resource-limits.md)，下一任务见[M3.4-B.1](next-task.md)。

默认主DB1GiB、实例登记附件4GiB/10000；运行连接明确重apply页cap与真实登记计量，同事务global配额与安全507false。完整507 sharedclient不重试。

[独立验收](verification/verification.md) · [机器结果](verification/final-results.json) · [保护delta](verification/integrity.json) · [清退](verification/cleanup.json) · [作者core](implementation/core/README.md) · [作者transport](implementation/transport/README.md)。

本机有限范围，只约束主DB有效页和附件登记声明；不保证WAL/temp/整个目录物理hardcap。私有missing及TEMP真实FULL注入材料明确单列；无600s/model/额外材料实验。M3.4-B尚未完成。
