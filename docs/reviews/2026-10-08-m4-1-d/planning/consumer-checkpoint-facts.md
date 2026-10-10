# Consumer 生命周期与 checkpoint：修复前事实

仅私有真实 SQLite + Fastify app.inject；没有监听端口、子进程或生产修改。token 仅在内存。每 fixture finally 关闭 app/DB 并删除私有目录。

## 两个真实反例

- `tests/integration/m4-consumer-lifecycle.test.ts` 第一用例：两 consumer 分别持 pending 与已 ACK 的 batch。before/after 均 consumers=2、delivery_batches=2、events=2、subscriptions=1、posts=0；两 DELETE 实际均 500/TEMPORARILY_UNAVAILABLE，正确期望 200 失败，consumer 未清退。原记录：`../author/core/repro-first.stdout.txt`、stderr、exit-code。
- 首 run 第二用例在前置断言停止：仅 A 凭据访问 B URL 的现隐藏规则是 404/NOT_FOUND，不是作者最初写的 403。仅该前置改正后单独重跑 cross-space；A URL 携 B consumer ID 实际 200，consumers 1→0，batches=0/events=2/subscriptions=1/posts=0 不变，consumerRemains=false；正确目标期望 403/B 不变失败。记录：`../author/core/repro-cross-space.stdout.txt`、stderr、exit-code。未重复 pending 用例。

## 最小事务入口（待父批准实施）

- `core/src/services/event-service.ts:276–287` 现 deactivate 先查 URL 空间权限，继而只核 subscription.actor_id，漏 space_id；无外层 transaction，随后 meter、DELETE。
- `storage-sqlite/src/sqlite-storage.ts:1282` 仅 DELETE consumer；`schema.sql:172–191` batches.consumer_id 是无 cascade FK，consumer 无 active/deactivated 字段，active_batch_id 无 FK。没有其他 consumer FK；消费者唯一键为 subscription_id+consumer_key。删除 batch 不删论坛 events/post/subscription；不可宣称旧 batch 可恢复。
- `sqlite-storage.ts:64–79` 外层 immediate transaction，嵌套 StoragePort.transaction 加入同一事务；throw 由驱动回滚。最小候选是在同一 transaction 内 refresh/空间授权、查 consumer/sub、核 actor+space，再 admission 与 storage 先删 batches 后删 consumer。不存在保持 success 且免 fresh admission。中途故障须回滚两 DELETE。
- `event-service.ts:147–165` poll/ACK 的 currentConsumer 已核 actor+space，但还拒旧 ACL epoch、missing 404；不可整段移用到允许缺失成功及旧 epoch 清退的 deactivate。deactivate 唯一业务 caller 是该 EventService；HTTP routes/events、client 薄包装调用它。

## 共享 checkpoint 形状约束

- `protocol/events.ts:55` HTTP schema 是 TObject，`protocol/tools.ts:165` subscribe tool 是另一 TObject（另含既有 space_id/request_key）。可定义单一 TypeBox union constraint：context_checkpoint+minLength1 token，或非 context/省略 start+禁止 token；两个 TObject options 添加 allOf:[constraint]，core 直接 Value.Check(constraint,req)。不需要 CLI 复制组合规则或注册全局 format。
- 安装 TypeBox Value.Check 的 Object 分派不遍历 TObject options.allOf；Intersect 才遍历 allOf。因此 core 必须检查独立 constraint，不能仅 Check 根 TObject。HTTP AJV 标准 allOf 和工具 JSON schema 保持该约束。
- `mcp/src/index.ts:53` 传完整 tool.schema；`adapter-pi/src/index.ts:23–29,51` 完整对象 cast，未只挑 properties，没有丢 allOf 的组装点。
- **现签名位置与父描述有差异**：`event-service.ts:68–94` 在 transaction/consumer 查找之前验证 checkpoint（已有 consumer 也验证），不是仅 new consumer 分支；`121–141` existing consumer 原样复用，不重置 ack_seq。需父裁定是否仅新 consumer 验签；不能将移位描述为保持原位置。
- 现缺 token 的 context silently beginning；非context token 被忽略。有限检索的 context 测试均提供 token；未找到依赖无 token fallback 的正式断言。docs04 §5 尚未明确组合错误 400。形状 400 与原签名/范围 422 应分开，签名业务仍 core。

本记录是修复前事实；未创建新字段、索引、DDL 或事件，未运行 build/fullsuite。
