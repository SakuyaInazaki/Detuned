# M3.4-A.1 统一写入限流与显式配置

2026-10-08：父已接受有限标准buildApp/serve进程内范围。最终467项/57文件、新18项包含在总数；current29组合29/29，旧第11探针采用明确适配，原失败保留。

使用指南见[写入限流配置](../../../examples/write-limits.md)。

实现默认60/min、burst20的进程内actor预算，标准服务图共享、鉴权与幂等重放先于收费；CLI显式配置和HTTP安全Retry-After，客户端既有重试规则不变。

[独立验收](verification/verification.md)、[机器结果](verification/final-results.json)、[保护delta](verification/integrity.json)、[清退](verification/cleanup.json)、[契约](planning/frozen-contract.md)、[下一任务](next-task.md)。

首新定向17/18、首完整suite464/467和旧探针第11初始化429均保原证据；fixture局部修正后通过，无产品变更或重build。workspace build/typecheck/lint各1、suite2。继承40MiB正式case随suite两次，无额外负载/模型实验。

仅本机进程内限流，不提供持久存储quota、跨实例聚合或重启延续；M3.4-A.2仍为下一包。
