# B01–B12：交付声明与实际断言

核对对象：本次工作区中的 [m0-m1-r4-b-regression.test.ts](../../../tests/integration/m0-m1-r4-b-regression.test.ts) 和实现方 [验收记录](../2026-09-28-m0-m1-r4/implementation-r4-b/README.md)。正式 12/12 测试通过已经复跑确认；下表核对的是其证明范围。

| 编号 | 新增测试实际执行 | 与报告/原矩阵的差异 |
|---|---|---|
| B01 | space.create、thread.create、post.create、thread.patch 的引用字段；unknown.operation 拒绝 | 没有覆盖全部操作族或各族重建。relation.create 漂移见 G01，旧直接实体缺口见 G07 |
| B02 | 创建主题、修改标题、按原键重试；检查 v1/原标题及线程数 | 没有 post、重开 DB、响应丢失或脱敏操作；标题也不能证明完整时间/关联结果固定 |
| B03 | 本轮新格式的 resolve→reopen→重试 resolve | 此测试本身没有注入旧 `$ref`。旧格式另由 U02 实测通过，应准确引用 U02 |
| B04 | 将 v 改为 99 后重试，断言 422 | 未测当前版本的字段损坏、operation-kind 不匹配、历史实体缺失；G06 的三种输入被放过 |
| B05 | 当前已为 v2 的库注入一条旧 post.create 完整响应，直接调用 migrateIdempotencyRecords | 没有跨版本 bootstrap、重开、全部历史格式或凭据比较；不能证明整库升级矩阵 |
| B06 | 测试主动在外面包 db.transaction，第二条 result_ref UPDATE 失败；比较前后记录数组 | 未走完整协调入口的 DDL/history/metadata/版本提交故障；没有重开或文件字节比较。U01 另有 bootstrap/reopen 覆盖；G03 证明历史 INSERT 路径仍错误 |
| B07 | 撤销全部凭据，再 bootstrap，比较 credential 数量与返回值 | 撤销路径确实通过；过期、actor 禁用及 secret 稳定性没有在本测试逐项断言 |
| B08 | 新库第一次成功初始化、第二次正常 init；另删 metadata 后升级并比较凭据数 | 新增 B08 没有制造“首次初始化失败”。旧 R2 S11 另有凭据插入故障路径，应引用真实覆盖而非归到 B08 |
| B09 | 对 v999 调用两个 coordinator mode，比较表数 | 没运行 CLI 子进程，没测未知非空结构或合法旧库 serve。旧 T11 另覆盖真实 serve 的 v999；G05/G08 仍失败 |
| B10 | 删除 secret 后，断言 storage.getInstanceSecret 抛错 | getter 已修复；未测 init/serve 整体、结构化错误、DB/锁清理。G09 的真实 CLI 路径失败 |
| B11 | 顺序发送同 key、不同 title，断言第二次 409 | 不是竞争写入；没有并发屏障/独立竞争请求，也未检查另一目标同 key |
| B12 | 创建 2 个修订并成功脱敏；断言生命周期和第 1 版正文 | 没有超过默认分页，也没有故障注入。U07/U08 另提供 25 修订与事件/结果插入失败覆盖，不能归为此测试已经完成 |

这份核对不否定已通过的断言，也不要求重复现有有效测试。要求是把报告与证据正确关联。下一轮可以直接复用旧测试或审查探针，但应列出其确切断言和结果，不能把矩阵文字复制为测试标题后就统一标 PASS。

命名与结果的最低规范：

- 只有实际发生并断言的行为才能进入测试标题和完成记录。
- 说明真实文件库、close/reopen、进程与故障注入位置；模拟模式明确标识。
- 顺序请求不称为并发；函数调用不称为真实 CLI；逻辑数组相等不称为文件逐字节一致。
- 测试“损坏被拒绝”时，同时验证合法路径仍可用，避免一律拒绝造成假通过。
- U/G 编号是审查局部编号，与 docs/09 的产品验收编号分开。
