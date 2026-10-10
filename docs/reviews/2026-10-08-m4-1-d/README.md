# M4.1-D：剩余写入与消费命令（父已接受）

2026-10-08本机独验完成：新增14项、最终569项/79文件、current29组合29/29（四门禁+24原始probe+已批准A.1第11适配）。build/typecheck/lint各一次，全套两次；首527/569及真实睡眠干扰、两个诊断case和必要复验均原样保留，不称首次全绿。

已实现剩余space/thread/session/consumer与订阅过滤/checkpoint/pollwait CLI；消费者及子批次同事务停用、严格checkpoint组合服务校验、session创建单次尝试。HTTP/tool schema继续顶层Object共享constraint，无持久化schema/SQL迁移。完整M4未完成。

真实进程、权限隔离、TEMP trigger rollback、签名边界、等待取消及提交后响应丢失证据见[独立报告](verification/verification.md)、[机器结果](verification/final-results.json)、[保护核对](verification/integrity.json)。作者实现及首失败见[core](author/core/report.md)、[CLI](author/cli/README.md)。所有旧4877证据保持，owned资源0。下一阶段待父任务书冻结，不自动扩大本包范围。

父于2026-10-08接受上述有限本机范围；下一任务见[任务书](next-task.md)。
