# 下一任务：M3.2 可选持久 request_key

2026-10-06。父已选择路线B；本文是下一包任务指导，不是本轮实施许可。M3.1产品/tests继续冻结，M3.2尚未实现或运行验收。事实依据：[request_key盘点](planning/m3-2-facts.md)。完整M3及后续运维/接入能力不由本包宣称完成。

## 行为目标与取舍

实现共用可注入RequestKeyStore及真实可选Node文件实现，按调用者明确提供的稳定logicalOperationId取得同一个持久key。至少贯通CLI publish/relate：先持久取得key，再经现有共用client发送HTTP。不能只交空Port，或要求用户自己手工拼接才算交付。

保持旧显式requestKey/--request-key/input.request_key合法调用；新持久操作选项与任何显式key同时出现时明确拒冲突，不能悄悄选一方。文件store显式opt-in，旧无store调用不自动落盘。Node FS实现进入独立可选入口，基础HTTP client不得强制import fs破坏未来browser使用。

scope隔离服务base namespace、当前认证actor、space以及实际operation/target。开工先窄查现whoami/getMe及调用生命周期，由父一次冻结准确接口/字段/URL规范化规则和各单元文件所有权，不自行扩路线。不得以token摘要充当actor；同actor轮换credential仍能恢复，不同actor或server隔离。URL不得把userinfo/query秘密原样存盘。

logicalOperationId来自显式调用者语义，不能仅以payload hash代替：相同内容两次有意独立写必须可用不同logicalOperationId分别提交。服务端继续唯一裁决业务规范化hash、当前权限与幂等结果；客户端store不复制其状态机，不持久token、header、业务正文、响应正文或附件材料。

## 文件持久化边界

本机私有权限、跨进程原子getOrCreate；同scope+logicalOperationId竞争只产生同key。发送之前完成必要持久化，写盘失败绝不发包。损坏必须可见拒绝且不覆盖旧材料，不能静默另发新key。不能在失败、cancel或未知提交结果时删除key；应保留供后续进程恢复，成功也不隐式抹去恢复依据。保留/人工清理与锁/原子落盘具体协议在开工planning提出并由父冻结。

取舍：提供真正跨进程恢复接口而不是隐式内容去重；增加明确逻辑ID和私有store配置，由调用者控制恢复范围。只保存最小必要key/身份域/操作标识；即使没有正文，元数据仍可能暴露对象关联，需在接口和文档准确说明。不能替用户修改全局配置。

## 有限验收

先fresh baseline与真实before，保留首失败，再新增定向反例并实现。至少用真实新client进程验证：

1. 发送前中止不产生业务副作用；落盘失败/拒写/损坏不发包，不覆盖原store。
2. 服务提交后代理丢响应或client进程退出，后续新进程以同logicalOperationId取回同key重放，实际对象/修订/事件/幂等记录只提交一次。
3. 多进程同scope+logicalOperationId竞争得到同key；不同logicalOperationId允许相同payload两次有意写。
4. 改变payload但恢复同key由服务返回409 IDEMPOTENCY_CONFLICT，不在client改键绕过；当前权限仍先检查。
5. 同actor credential轮换恢复原操作；不同actor/server/space/实际目标隔离。不能用session变化或token变化人为制造新逻辑操作。
6. CLI publish/relate真实贯通，旧显式key输出与调用兼容，新选项+显式key冲突可见拒绝。
7. Node可选入口与基础client依赖分离，原timeout/cancel/retry契约保留；独验记录实际命令/退出/唯一测试数，不预填通过。

复用M3.1/T08及现client传输能力，不重写retry/timeout，不机械重复C2 600秒；如有性能影响由父决定实验。不扩inbox、自动ack、模型/后台Agent、真实宿主配置或M3.3备份恢复。保护所有历史证据与依赖/dist，不commit/push/reset/clean/global安装。开工按主代理编排划分core/client持久接口、CLI接入和独验单元后实施。
