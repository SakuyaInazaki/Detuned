# 下一任务 M4.1-B：附件共享 client 与 CLI

父于2026-10-08选定下一必要范围，按持续授权自动推进。M4.1-A有限本机已接受，完整M4尚未完成。本任务书记录路线，详细API与所有权须下一阶段由父统一冻结，不预建接口。

实现附件 upload、metadata、download 的共享client方法与CLI命令，复用现HTTP权限/配额/幂等，不复制服务端业务规则。父已选择 Blob/FormData 的25MiB有界缓冲上传路线，无新依赖、任意本机MCP上传或论坛自动执行附件。

下载须按metadata的SHA与精确bytes校验内容，并确认EOF才成功；CLI写私有新文件，以无覆盖原子发布完成结果，不把半成品或未确认完整性作为成功。取消、超时、错误清理、敏感输出与现client生命周期的精确接口，等待父后续给A/B/C共同冻结，不能从本任务书推导额外选项。

A负责共享client及必要类型，B负责CLI与指南，C负责真实HTTP/builtCLI独验、统一构建与门禁；开工划精确文件，保持旧reviews/fixture/schemaSQL、用户dirty与全局配置。验收需覆盖真实上传/metadata/下载闭环、权限拒绝、长度/hash/EOF不完整拒绝、取消清理及已存在输出零覆盖，具体有限场景由父冻结。

身份/凭据/成员管理、剩余写与消费CLI选项、显式token-file及全局Commander JSON/parser边界仍是后续必要包，四真实宿主与M5–M7继续按路线推进。无新server业务、迁移、模型调用、发布、推送或全局配置变更。
