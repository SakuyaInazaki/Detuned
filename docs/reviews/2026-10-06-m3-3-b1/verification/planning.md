# M3.3-B.1 C：fresh保护基线与独立验收短计划

2026-10-06。父方向为单空间当前权限过滤NDJSON逻辑导出，具体snapshot/流/完成协议等待一次冻结。C只做fresh基线与少量只读接口定位，未build/测试/运行导出或重复大suite，不写产品与旧测试/证据。

## Fresh事实

新baseline.json：HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44与dirty；171 source/config/tests、39当前docs、5mutable，3623旧review文件（必须完整包含M3.3-A，前包3491数量不能沿用），4SQL/archive、2schema，208tracked+68untracked dist。Node/pnpm/OS与逐文件SHA256在本包。前包实际393/45是已接受历史结论，不预填本包测试数量或结果。

现StoragePort.readSnapshot明确同步callback；SQLite实现拒async callback，不能将它直接包跨await导出。server buildApp现注入StoragePort，当前docs04有GET S/export规划但现routes/client/CLI没有实现。parent需选择独立一致reader或有界分页/fence语义，C不决定路线或先造镜像接口。

## C提议所有权

仅新增 tests/integration/m3-export-independent.test.ts、tests/helpers/m3-export-worker.mjs 与新review/verification。helper固定server/client/raw-stream-fixture三模式，私有IPC管理局部屏障、连接与观测计数，不执行任意shell。CLI真实built子进程，stdout按UTF8流decoder并逐行验证/丢弃大内容，单child/每case合理deadline、finally关进程删私有目录。产品作者与既有fixtures/tests完全不动。

## 精简独验矩阵（待协议冻结适配，预期不是已跑结果）

1. **真实HTTP→sharedclient→CLI输出及内容隔离。** 普通actor和admin都只导请求单空间；固定旧修订、稳定对象ID、关系/解决历史、withdrawn状态、可授权附件manifest及墓碑保真。fixture在跨空间/private对象、credential/session/instanceSecret/内部storage_key放唯一标记，逐行采集字段与允许内容作独立oracle；标记无泄漏、attachment无inline bytes/任意URL fetch、不写event/ack/idempotency。普通review帖子不冒充M6正式封存认证。
2. **真实并发与权限/脱敏边界。** IPC屏障停在父冻结的可观测输出边界；另一真实client先完成新修订/成员撤权/脱敏写，再release导出。核snapshot一致或父冻结准确变化语义，不能将旧snapshot当永久授权；已交付bytes不能撤回，后续敏感row/complete按契约拒。写入必须在导出仍未结束且屏障关闭时完成，直接证明主写connection没有跨await被导出snapshot复用。不能用sleep或尝试写被塞入同读事务的旧数据冒成功。
3. **sharedclient面对真实raw HTTP坏流。** 固定raw-stream-fixture按IPC逐段提供坏Content-Type/version header、非法/超限line、UTF8跨chunk、重复/缺失完成、早断/截断等父冻结协议反例；取消/超时/transport/protocol分类保真，收到若干合法record不能冒完整成功。不直接依赖新parser内部实现，也不将不存在import/compile失败当before产品反例。
4. **slow reader、cancel与实际大材料。** 真实socket暂停读取直至服务观测write-backpressure或父冻结pull边界屏障；证明不继续无限拉取/聚合、取消关闭导出reader/事务/连接。固定本机有限大材料、边读边丢弃，比较独立server/client峰值内存/活跃资源及writer仍完成；具体dataset/line/total cap与验收内存界限由父决定，不能从源码常量复制期待或以RSS单点抖动否定路线。CLI目标文件若要求原子交付，则坏流/cancel保原文件或没有完成输出，不留下伪成功。

A/B正式规则测试与C独验互补，C尽量4个有实际失效机制的闭环case，不将每个字段做镜像测试。若父采用有界分页而非持续流，slowreader/完成marker验证按所冻API对应调整，不自行扩大snapshot路线。

## 需要父/A/B一次冻结的信息

- 实际GET path/query、response Content-Type/版本header、NDJSON header/record/footer与错误/partial协议；完成时计数/hash/ID来源与reference语义。
- 一致snapshot生命周期、reader与主writer连接隔离、当前权限/脱敏重核边界、每line/total/候选资源上限、背压/取消行为。
- 共用client async iterator/reader方法与CLI stdout/file原子交付规则、错误类/退出码、可注入局部输出屏障（只用于确定边界，不修改业务结果）。
- 新测试精确路径/author ownership及最终build窗口；C捕运行前/后稳定manifest，保护所有3623旧材料与SQL/schema/archive/dist，首失败明确产品/夹具/环境归因。最终统一build/typecheck/lint/fullsuite/current29待作者freeze后安排，formal/probe不相加，不调用模型或无证据重复600秒。
