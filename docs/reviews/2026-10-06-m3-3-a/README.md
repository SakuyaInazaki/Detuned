# M3.3-A 离线物理备份与新目录恢复：本机有限验收通过

2026-10-06。父已接受本机有限工程结果。当前schema2、backup format1；CLI明确offline、目标必须新目录。备份校验一致数据库与登记附件，恢复新目录后事务撤销所有旧凭据、轮换签名secret、新建独立human recovery管理员；历史业务与pending批次保持。结构化导出导入、legacy升级与完整M3.3/T12/M3运维仍后续。

[使用与限制](../../../examples/backup-recovery.md) · [独立验证](verification/verification.md) · [结果](verification/final-results.json) · [完整性](verification/integrity.json) · [命令与首失败](verification/commands.json) · [下一包M3.3-B.1](next-task.md)。

实际393/393正式测试、45文件，新20已含总数；current29最终组合通过。fullsuite最终只运行一次；全workspace build首次成功后因精确诊断补项，另执行一次必要storage增量build；typecheck前/后补项各一次，最终lint一次。首新formal原19项17通过、2夹具失败，canonical路径期待与单行FK变造修正保留；首窗口运行期授权delta不冒称稳定。末窗口171 source/config/tests、39 docs、5mutable稳定，3491全部旧证据（完整含M3.2）、SQL/archive4、schema2及历史fixture保持；正常dist变化单列。

真实独立服务/client/CLI闭环证明：活source持锁拒备份，恢复正文/修订/关系/附件与事件/幂等/pending保真；旧token拒绝后给同原actor发有效新token，旧checkpoint/ack/固定read/search cursor仍拒，newpoll重投原batch并newcursor可ack。备份前旧cursor有效证据独立保留，未提前ack。manifest/DB-FK/symlink/覆盖、非ready物理状态、copy/fsync/事务/publication/readiness fault及runtime gate均有正式回归。

sidecar是协作式本机启动门禁，不抵挡恶意无锁writer或同uid替换。普通中途失败保incomplete；完成数据后最后parent-sync与marker重建双失败时，完整目标可能可启动但durability未确认，拒使用并保好backup另新目录恢复。ready后stdout凭据丢失也应另新目录恢复。这些不是半套数据损坏，诊断与独立反例已准确记录。

物理备份私有DB包含旧凭据hash、原签名secret及可能敏感研究正文；不能当已脱敏公共导出。有限knownrawtoken扫描无命中，只stdout内存解析，实际owned process/private temp残留均0。未重跑600秒、模型或四宿主完整认证；无发布、推送、安装或全局配置修改。

下一包仅按当前权限过滤的空间NDJSON逻辑导出；新空实例逻辑导入、完整迁移和M3.4运维后续独立完成。备份只恢复备份时点的数据，不能找回之后写入；本轮结论不覆盖跨平台物理介质认证。父接受后的入口/状态文档同步另立收尾窗口，无新增产品测试或build。
