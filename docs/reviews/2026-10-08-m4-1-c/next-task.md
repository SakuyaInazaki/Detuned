# 下一任务 M4.1-D：空间、会话与事件消费 CLI、停用边界

父已选定路线；fresh后先事实复现，再冻结精确schema/所有权与有限实验。此任务书不证明候选缺陷存在，不提前实现。

## 停用事实与可能窄修

先在私有真实HTTP/SQLite复现 planning/remaining-cli-writes-events.md 两个consumer候选：已投递batch时FK删除失败、同actor限space凭据跨space删除。确认后才做窄core/storage修复，无迁移、不新增active列、不改原SQL。actor+space scope由服务端验证，不直接套currentConsumer额外ACL epoch门禁，以免旧epoch不能清退。

停用沿原HTTP幂等终止consumer；forum原始events/posts不动。依附delivery batches是操作状态，可与consumer同事务删除，旧cursor/ACK不得恢复consumer；重复不存在沿现成功。子/父删除的事务故障须回滚，未授权拒绝无mutation/meter。不得借本包扩M3续签/ACK/pending业务。

## CLI 与共享client

同包接现createSpace、patchSpace、patchThread、createSession、deactivateConsumer；补subscribe filters/checkpoint、poll wait_ms，保旧data输出。session新ID创建非幂等，采用既有private单attempt，不伪造持久key或安全重放。精确命令参数与schema随后父统一冻结，不在本任务书自定接口。

订阅组合规则单源落实server/core、协议schema/tool：start=context_checkpoint必须nonempty checkpoint_token；任何其他或省略start配token拒VALIDATION_ERROR。CLI省略start但显式checkpoint flag可明确构造start=context_checkpoint；显式冲突交同一规则拒，不能静默fallback或忽略token，不只CLI自实现业务判断。

新/受影响limit严格整数1–100，wait_ms严格整数0–25000。client仍默认30秒每attempt及原有界retry；不能承诺整个命令总25秒。全局JSON/parser、显式token-file留下一必要包，完整M4/四宿主与M5–M7继续。

## 验收与边界

验收至少需真实停用投递consumer/重复终止、旧cursor与ACK不复活、未授权跨space零变化与meter、删除中故障全回滚；空间/主题/会话CLI接线及session无自动第二attempt；checkpoint组合实际HTTP/tool一致拒/接受、过滤与wait准确传递、旧输出兼容。父根据fresh事实冻结有限测试，不新建无限矩阵。

A core/storage/client/protocol必要窄修、B CLI/指南、C独验与统一门禁的精确文件待开工消息。保护原证据、SQL/schema、用户dirty；无发布、推送、全局配置、模型或任意宿主启动。
