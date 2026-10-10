# M4.1-D A 冻结契约

父已裁定：现 schema2、不迁移、不加字段/索引/事件/依赖。

- Consumer deactivate 在外层 immediate transaction 内 refresh 当前身份、URL observer 授权、查 consumer；missing 成功免 admission；存在核 subscription actor+space（403固定），随后 meter 一次。storage 同事务先删该 consumer 的所有 delivery_batches 再删 consumer；storage 自身 transaction 保证直接调用也原子，嵌套加入已有外层。保论坛 events/posts/subscriptions/其他 consumer；旧批次不可再 ACK，重订同 key 新 consumer/new start。无 ACLepoch 清退限制。
- SubscriptionStartConstraintSchema 单源 TypeBox union：context_checkpoint 必须 minLength1 token；beginning/now/省略 start 禁止 token。根与 tool 保 TObject/allOf 引用，core isSubscriptionStartValid 使用 Value.Check 独立 constraint。组合错误400；签名原先位置（transaction/existing查找之前）不移，原签名/范围422。existing位置不重设，不能借 reuse 绕签名。
- client createSession(CreateSessionRequest) 保原 Session data 信封、private executor retryBudget0；不改变全局/旧write/poll retry。deactivateConsumer 保旧 deactivated:true 信封；仅两触及路径 encode。无需新增公开 DTO/OpenAPI。
- A所有权：core event-service、storage sqlite-storage、protocol events/tools、client client.ts、m4-consumer-lifecycle.test.ts、新 m4-session-subscription-client.test.ts，以及本包 planning/author/core。B CLI、C独验与统一build/fullsuite；旧证据/SQL/DDL不动。

修复前两实证及作者首前置错误保留；有限 source 定向与含新 test noEmit 后冻结，不宣称未运行门禁通过。
