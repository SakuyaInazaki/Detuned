# B → A 只读交叉审查

2026-10-08。中断后确认此报告尚不存在，未覆盖既有证据。依据 `planning/frozen-contract.md` 与 `author/core/freeze-manifest.json`，独立阅读 A 的五个生产文件及两份正式测试；本轮不运行测试、build 或复现实验，不修改产品。

结论：在本包冻结范围内未发现新增可达阻断。以下是代码阅读结论，不以作者通过日志代替独立验证，也不宣称任意自定义 StoragePort 已获得 SQLite 的事务保证。

| 检查 | 实际代码与结论 |
| --- | --- |
| 停用授权与计量 | `packages/core/src/services/event-service.ts:280–292` 在外层事务中刷新身份、检查 URL 空间 observer 权限，再查 consumer 与其 subscription。存在时同时核 actor 和 space（287），失败发生在 admission（290）之前。missing 在285返回，仍须通过当前空间授权，但不计量。不存在 namespace 仅按 actor 判定而跨空间删除的路径。 |
| 旧 ACL epoch 清退 | 停用没有调用 `currentConsumer`（151起）；它不套 poll/ACK 的 epoch 门禁。当前有效身份和空间访问仍必须通过，旧 epoch 本身不阻止清退。 |
| 原子子父删除 | `packages/storage-sqlite/src/sqlite-storage.ts:1282–1286` 自身开启事务，先按 consumer_id 删除 delivery_batches，再删 consumer；不删除 subscriptions、forum events 或 posts。64–76 的 nested transaction 加入当前连接外层事务，直接调用则开启 immediate transaction；父删除失败会传播并回滚子删除。计量余额不是数据库事务状态，本包也不承诺失败后退还 admission。 |
| HTTP/MCP 组合单源 | `packages/protocol/src/events.ts:57–78` 定义同一 union constraint，并在根 TObject 的 allOf 引用；`packages/protocol/src/tools.ts:165–173` 同样引用。`events.ts:68–69` 对独立 constraint 调用 Value.Check，core `event-service.ts:63–65` 真正执行该检查并返回400；没有依赖 TObject 的 allOf 在 Value.Check 中自动执行。token 为 minLength1，空白 token 后续仍须通过签名检查。 |
| checkpoint 顺序与复用 | `event-service.ts:72–96` 签名、purpose、actor、space 和 seq 范围检查保留在事务（99）与 existing 查找（107、131）之前，错误仍422。consumer 已存在时不重写 ack_seq；提供 checkpoint 的请求不能借 existing 复用绕过签名校验。 |
| session 单 attempt | `packages/client/src/client.ts:676–677` 将 private retryBudget 显式传0，保留 Session 信封和 signal。executor 在261先递增 attempts；fetch abort/network（318、332）、body abort/network（386、400）、HTTP retry（485）均受同一预算约束，用户取消/timeout 直接结束。225 的旧默认仍是 maxRetries，不全局改变其他方法。 |
| 旧客户端返回和路径 | executor `client.ts:462` 继续返回 `{data,meta}`。createSession（677）与 deactivateConsumer（906–911）encode 各自路径段；停用继续通过原 request 返回 `{deactivated:true}` 信封，无 body/key 新要求，保留旧可重试默认。未改 poll/ACK 默认语义或声称命令总耗时受25秒限制。 |

正式测试源码提供相应验收入口：`tests/integration/m4-consumer-lifecycle.test.ts:32/55/69/95` 覆盖清理、跨空间、直接 core constraint 和 checkpoint 复用；`tests/integration/m4-session-subscription-client.test.ts:8/29` 覆盖 session 各失败分支及旧 poll/停用信封。这里只阅读这些断言，没有重复执行。事务内 refresh 的一致性结论针对本仓库 SqliteStorage 使用同连接、同步事务的实现；同步业务无 await 插入授权与删除之间。

限制：本审查不新增故障注入，不扩大旧签名序号格式、poll/ACK 恢复、任意后端事务或通用客户端路径策略范围。统一 built/全套门禁和最终保护核验由 C 报告；本报告不将尚未运行的检查记为通过。
