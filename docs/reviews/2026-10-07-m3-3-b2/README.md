# M3.3-B.2 空间逻辑导入验收包

2026-10-07 开工，2026-10-08 完成本机工程验收，**父已接受（2026-10-08，有限本机工程范围）**。实现 schema2/v1 单空间 NDJSON 离线导入新目录，复用有界单源 decoder，校验完整流与业务历史/引用后持久无覆盖发布。来源身份禁用占位，不继承凭据、会话、消费或权限；新本地 human admin 可以签发普通新身份并实际写入。附件仅 manifest ready→missing，不恢复 bytes、不抓取 URL；来源 hash/projection 仅非认证 provenance，正式评审/检查资格不继承。

实际新增 22 项正式测试（A12+B6+C4），首三文件定向 22/22。唯一 workspace build、typecheck、lint、25 个保留探针均通过。完整 suite 首次 435/436、50/51，FIFO regression 的启动和操作共用 2s watchdog 导致失败；父批准只修测试计时，以 ready/go/done 分开 startup/operation/reap，操作仍2s。必要第二完整 suite **436/436、51/51**，无 unhandled。最终 current29 为组合证据 **29/29**，首28/29及所有原失败保留。没有重复 build/typecheck/lint/25 探针。

C 独立真实源服务/client→built CLI→新服务闭环；来源凭据401、新普通身份写成功；重算合法 SHA 链的语义坏流仍拒；filtered resolution 历史保持 incomplete；URL trap0请求；输入软链/旧目标拒绝；取消和 publication 故障不发表普通部分实例。真实 chmod 导致 post-unlink parent-sync/marker 重建双失败的目标已完整但 durability 未确认、可能可启动，错误准确告知不要使用、保留输入另新目录导入，不能称所有失败必保 gate。

[独立验收](verification/verification.md)、[机器结果](verification/final-results.json)、[执行原记录](verification/commands.json)、[完整性](verification/integrity.json)、[清理](verification/cleanup.json)、[冻结契约](planning/frozen-contract.md)、[A交付](implementation/storage/README.md)、[B交付](implementation/transport/README.md)、[下一任务](next-task.md)。

基线181 source/config/tests，最终187；旧全部 review3763、SQL/archive4、schema2、HEAD 与五 mutable 文档在产品验收窗口保持原字节，dist仅唯一build预期变化。父批准 FIFO test-only snapshot delta 单独记录。核心无模型/网络推理；未重复600秒负载、跨宿主或旧版本迁移。已有导出40MiB case随两次suite实际执行两次，heap样本仅有限佐证，不证明硬RSS上界。当前 M3 完整运维和产品全阶段仍未完成。

使用入口：[本地导入指南](../../../examples/space-import.md) · [当前功能状态](../../progress.md#当前功能状态与未完成能力)。下一 [M3.3-C 升级前保护与旧库迁移/回滚](next-task.md)按持续授权自动衔接；完整迁移、M3.4 及 M4 宿主/M5/M6/M7 尚未完成。
