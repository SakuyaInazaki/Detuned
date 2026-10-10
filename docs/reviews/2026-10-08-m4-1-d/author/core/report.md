# M4.1-D A source 交付

## 实现

consumer 清退事务刷新身份与 URL 空间授权，核 subscription actor+space；不存在免扣成功；存在扣一次后先删该 consumer batches 再删 consumer。storage 自身 transaction 与业务外层同 immediate transaction 嵌套，直接 storage 调用也不暴露半删。保留论坛事件/研究/subscription，旧 epoch 不阻清退；新订同 key 创建新 ID/new start。

checkpoint 组合为单一 SubscriptionStartConstraintSchema，根 HTTP TObject 与 subscribe tool TObject allOf 引用；core 直接 Value.Check constraint。组合400，签名原次序与422不动，existing consumer位置不重设。TypeBox Object 直接检查广告 schema 不保证 allOf 生效，HTTP/core负责强制，没有泛称宿主 SDK 已强制。

session client 使用 CreateSessionRequest/Session 旧信封，局部 retryBudget0；deactivateConsumer 仅准确旧信封 typing/这两个路径encode。没有新增 DTO、OpenAPI、依赖、SQL/字段/索引/迁移/事件。

## 实际检查（原失败均保留）

- repro-first：两个正确期望回归失败；pending/acked FK500；第二在作者错误的隐藏404前置断言停止。repro-cross-space：仅修前置后1失败1skip，真实 A URL 删除 B consumer200。
- source-first：consumer4/4通过，client2/2失败（作者成功 Response 缺 api_version/request_id，poll晚观察继发 unhandled）。runner码未直接捕获，shell readonly status 捕获异常独立记录；不把推断1写作直接runner码。
- source-client-second：1通过1失败，已消除 unhandled；作者批量 fixture 改写误把 wire api_version/request_id 加入 client返回期望。修正回原 data/meta 后 source-client-third：1通过1skip。故最新 source 六组均分别实际绿，不声称首次六组全绿或最终同次全绿。
- source-noemit：含两新测试与生产 source alias，唯一实际 tsc exit0。没有 build/fullsuite/current29，C统一窗口覆盖。

## 边界

删除不是持久停用旗标，旧 batch不能恢复；process内meter不随SQL rollback退费，原约定不变。HTTP/app.inject实测无监听端口；测试token内存，私有DB/目录finally清理。C独验负责中间删除故障回滚/旧epoch；A不重复整个M3矩阵。
