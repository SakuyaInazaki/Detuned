# R4-B 交付复核：继续完成数据包

日期：2026-09-28。**结论：R4-B 部分完成，尚不能转入 R4-C。** 上轮 U01–U04 的具体反例已修复，但其对应的完整数据不变量仍有缺口，且关系创建重放出现回归。R4-C 的 U05/U06 按计划延期，不计为本包未完成的理由。

本次审查的是 **`71aefc1` 加工作区内尚未提交的实现**，不是一个新的已提交版本。开始时已有产品源码、测试及文档修改，已保留；[baseline.json](baseline.json) 记录完整 HEAD、初始状态、diff 摘要哈希和 81 个产品/测试文件的 SHA-256。本次没有修改这些实现文件。

- [下一轮可直接交给实现 Agent 的提示词](next-agent-prompt.md)：继续 R4-B，任务名 R4-B.1。
- [测试声明与实际断言核对](coverage-audit.md)：解释为何 74 项通过仍不足以关闭本包。
- [验证记录](verification.md)、[补查脚本](check-r4b-gaps.mjs)、[原始补查结果](observed-r4b-gaps.json)。

## 实测结果与已经完成的部分

| 检查 | 结果 | 判断范围 |
|---|---|---|
| build / typecheck / lint | 通过 | 本地 Node 26.3.0、pnpm 11.7.0；lint 仍是 tsc，不是额外风格检查 |
| 正式测试 | 11 文件、74/74 通过 | 比此前增加 12 个测试函数，不等于 B01–B12 所有子条件均覆盖 |
| R1–R3 旧探针 | 46/46 通过 | 已有回归保持，含实际 MCP stdio 和 CLI 测试 |
| R4 U01–U08 | 6 通过、2 失败 | U01–U04/U07/U08 通过；U05/U06 属后续 R4-C |
| 本次 G01–G09 | **0 通过、9 失败** | 针对 R4-B 已有条件的补查，合并为下述六类缺陷 |

可以保留的改进：schema v2 与 thread_versions 已存在；正常新主题可从快照恢复原标题；旧 resolve 引用能恢复正确版本；撤销凭据不再导致重新初始化；持久 secret getter 不再生成临时替代值；外层 bootstrap 事务能处理已测的引用 UPDATE 失败。这些改进无需推倒重做。

## R5-F01 / P1：操作结果仍漂移，缺失历史仍被拼成成功

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，286–299 行和 402–421 行。

- **G01，普通合法 HTTP 操作，无旧库注入**：创建 challenges 关系得到 v1/open，resolve 后按原创建键重试，返回 201、v2/resolved。新的 `relation.create` 引用只存 ID，重放直接返回当前 relation。这是从此前完整结果缓存切换到引用时引入的回归。
- **G02，旧 c4f041f 引用缺少主题标题历史**：主题已经从 v1 修改至 v2；迁移后按原键重试创建，返回 201、version=1，但 title 是 v2 的标题。缺失 `thread_versions` 时的 fallback 仍把当前内容拼成历史结果。

修复应固定各操作实际返回的版本及关联历史；无法恢复时明确非成功。若能凭可靠原始证据恢复，则可以返回准确原结果。不能一律把关系写死为 v1/open：relation.create 还存在复用已有关系的合法路径，必须保存该次操作实际返回的版本。

对应 R4-B 第一步第 4–6 项及 B01/B02/B04。

## R5-F02 / P1：内层 catch 仍破坏原子升级

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，41–47、74–80、248–270 行。

- **G03**：在迁移刚创建 thread_versions 后安装真实 SQLite trigger，对旧 v1 快照的 INSERT 执行 `RAISE(ABORT)`。确认 trigger 确实触发 1 次；bootstrap 却没有抛错，关闭重开后 schema 已为 v2，旧快照不存在，库已改变。外层事务没有收到异常，因而提交了不完整结果。
- **G04**：旧 result_ref 含损坏 JSON，迁移返回成功并推进为 v2，原始含正文标记的损坏缓存仍在。`catch -> null -> 跳过` 没有变成失败或可审计的隔离处理。

因此，回复中的“任何 SQL 写错误都整体回滚”尚不成立。需要移除错误吞噬、严格校验转换结果和完整性，并让历史实体、引用、metadata、版本行一起成功或一起回滚。当前已经通过的 UPDATE 故障用例应保留，再覆盖历史实体 INSERT 等实际阶段。

对应 R4-B 第三步第 3、6、7 项及 B04/B06。检查要求是逻辑结构和数据一致；不把它夸大为 SQLite 文件逐字节一致。

## R5-F03 / P1：未知非空数据库被当成新实例改写

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，325–345、353–414 行。

**G05** 用仅有一张 unrelated_notes 表的临时 SQLite 文件执行 init 协调入口。实际没有拒绝，新增 **28 张 SQLite 表（含 FTS 影子表）**，并返回管理员 token。原来的笔记行仍在；问题是未知数据库被未经结构识别就当成 Detuned 新库写入，而不是已证实原行遭到删除。

仅检查 max(version)>2，以及“是否有 actor”，不足以区分空白库、受支持旧库、损坏库和其他数据库。应在 DDL/DML 前分类并校验所支持历史结构，未知非空库保持逻辑状态不变并报错。此问题是本地初始化边界错误，本次没有声称存在远程无认证提权。

对应 R4-B 第二步第 3、4 项、第三步第 2 项及 B09。

## R5-F04 / P2：联合类型没有成为运行时解码约束

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，解析到 `any`、232 行版本判断、250 行 kind 分派；[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 29–30 行直接接受新格式。

**G06** 的三种持久引用均返回 201：v=0、缺少 thread_version、thread.create 操作下存入 space kind。最后一项在主题创建响应中返回了空间对象。

定义 IdempotencyResultRef 并不等于运行时验证它。引用需要严格验证格式版本、必需字段、取值范围和 operation-kind 对应关系；新格式也不能只凭 `v===1 && kind` 就直接跳过迁移校验。异常记录不能重执行业务 action。

对应 R4-B 第一步第 1、2 项及 B01/B04。G06 为数据库完整性检查，没有模拟通过公开 API 任意修改数据库的攻击能力。

## R5-F05 / P2：可恢复的旧直接实体结果被错误废弃

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，历史格式分派及 241–247 行兜底 unreplayable。

**G07** 采用历史源码确实使用的直接 Relation 和 Post 返回形态，分别构造 relation.create、post.withdraw 缓存。这些原结果含有恢复所需的信息，迁移后却都成为 unreplayable，两次合法重试均返回 422。

这不是“旧历史确实缺失”的情况，而是迁移器漏掉了已明确要求支持的返回形态。应按 operation 分派旧 codec，恢复合法结果；仅对确认无法恢复的记录使用明确的不可重放标记。不得为了通过本例恢复任意 JSON 兜底返回。

对应 R4-B 第一步操作清单、第三步第 4、5 项及 B05。

## R5-F06 / P2：统一入口仍缺少正确的检查顺序与清理范围

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，440–445 行；[CLI index.ts](../../../packages/cli/src/index.ts)，119–135、172–191 行。

- **G08** 直接读取 `fa1b35c` 的历史 DDL，构造带合法管理员/凭据但没有新 metadata 的最小旧库。serve 协调入口在迁移前按新 initialized 标记拒绝，停留 v1。它不能完成回复所称的这一受支持旧库自动升级。这里运行了真实历史 DDL，没有运行旧应用二进制。
- **G09** 运行真实 CLI 子进程，库已初始化但 secret 被删除。`init --json` 退出 0 并报告 success；`serve --json` 退出 1，但没有结构化错误，且遗留 detuned.lock。getter 的抛错发生在 bootstrap try/catch 之外，整体启动材料验证与清理未覆盖它。

遗留锁可被现有 stale-lock 逻辑在后续尝试中回收，本次不把它描述成永久锁死。应让协调入口在成功返回前验证持久材料；将 DB 打开、迁移、构建 app、监听失败纳入统一异常清理，先关本次资源再释放锁。

对应 R4-B 第二步第 5、6 项及 B09/B10。空白 serve 仍应拒绝；不能为了升级旧库让 serve 自动创建新管理员。

## 验收报告需要怎样修正

问题不在测试数量不足，而在“测试名称”被当成了整个验收矩阵已经成立的证据。例如 B02 只检查一次主题修改后重试，没有它报告的重开、响应丢失与脱敏场景；B11 是两次顺序请求；B06 比较的是查询数组，不是文件字节。详见 [逐项核对](coverage-audit.md)。

下一轮每个条件应给出**触发步骤、关键断言、文件与行号、实际运行结果、未覆盖范围**。已有其他套件或探针的有效覆盖可以引用，不必复制测试；没有对应断言的部分保留未完成。

另有两项静态核查待办仍属原任务：schema.sql/schema.ts/迁移内 DDL 尚无单一生成来源与一致性验证；operation 仍为 string、结果仍为 any 并通过 startsWith 分派，未建立可穷尽的操作—结果类型关联。它们不计入 G01–G09 的动态失败数。

## 下一步

执行 [R4-B.1 修复提示词](next-agent-prompt.md)，关闭以上六类缺陷并补齐原 B01–B12 的真实证据。保留 schema v2、thread_versions 和已通过修复；不启动真实模型，不扩展新功能。

R4-B 验收后再领取已有 [R4-C 任务书](../2026-09-28-m0-m1-r4/follow-up-contracts.md)。M2.1 仍在两包之后，范围仍为附件上传、哈希、配额、授权和孤儿清理，没有向量检索或 Agent 调度任务。
