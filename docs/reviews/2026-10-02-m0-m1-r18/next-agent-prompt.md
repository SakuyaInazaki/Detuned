# 下一轮提示词：M0/M1-R4-B.4-3R4

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务为 **M0/M1-R4-B.4-3R4：主键来源约束与生成失败原子性**。

R18 已独立确认：147/147 正式测试（B 82 项），25 条既定有效命令与交付一致；AA01–AA04、Z01–Z04 全通。**FTS 配置修复、普通索引/FTS 来源、缺驱动/历史源拒绝、原 B01/B03 已通过。** 不重做这些功能。本轮只修 R18-F01/F02、补正式生成回归并处理 E01 的证据保存问题；完成后交回，不开始 R4-C/M2。

## 0. 先读与工作范围

读取 AGENTS.md、README.md、docs/00、08、11、相关 docs/03/07，以及本目录 README.md、coverage-audit.md、verification.md、commands.json、check-generation-completeness.mjs、observed-generation-completeness.json。开工先说明任务编号、要改变的行为、文件范围及验收办法。

HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，有多轮未提交工作。保存 before/after，覆盖本目录 baseline 的 **89 个产品/正式测试/构建文件及本轮全部新增文件**。不 reset/clean/checkout 覆盖已有工作，不擅自提交/推送/部署/发布。

禁止使用、安装或启用 deepseek-brainstorm 及其间接流程；不调用模型，不启动其他 Agent，不改全局 harness 配置。仅在自己创建的临时源码副本与数据库上做故障实验。固定 historical-v1-schema.sql、archive/pre-plan.original.md 和历史审查材料保留原字节。

预期改动集中于 storage-sqlite 的共享提取器、生成器、必要的同步/运行时描述和正式测试。不要修改真实 schema.sql 的布局、增加 schema 版本或重写 core 幂等服务。测试中的 NOCASE/DESC、列变更、标记缺失都仅发生在临时副本。

## 1. 单元 A：修复两个已经复现的生成遗漏

先将 AB01/AB02 转成正式回归，确认在现有实现中失败，再修根因并保留修复前输出。

### A1. 主键属性不能被提取器丢弃

AB01 已提供两个完整输入的反例：修改 idempotency_records 主键中 actor_id 的 COLLATE NOCASE，或最后 key 的 DESC；目前 generate/check 都 exit 0，V2 profile 不变，无 src 运行时却拒绝新建库。

根因：extractDatabaseRequirements 的索引循环只保存 origin=u/c，遗漏 origin=pk；运行时主键固定 BINARY/ASC。

采用下列一个简单方案，明确写入契约与测试：

1. **建议采用固定支持策略**：当前真实布局只支持既定主键语义，在共享提取器中验证 PK key 项，遇到不支持的 collation/desc 等明确抛出带表/键项信息的错误；generate 和 check 共用此策略，不能成功生成运行时拒绝的描述。正常 INTEGER 主键与现有非 INTEGER/复合主键保持通过。
2. 或把主键完整 keyTerms 纳入当前/历史 profile，并让运行时消费；必须证明生成、同步、运行时一致，无需增加新产品功能。

两种方案都允许；不要求真实产品支持 NOCASE/DESC。不要只针对表名或反例字符串加黑名单。当前 UNIQUE/命名索引/FTS 的来源跟随能力已经通过，应保持；V1 仍来自冻结历史源，不因当前源变化而改变。

验收：AB01 两例明确非零拒绝，或正确生成且编译产物认可同一 DDL；健康生成、AA04 普通列变化、无 src 运行保持可用。不能把编译/环境异常误当成有意的策略拒绝，断言诊断内容。

### A2. 缺少迁移块时不能写半套生成结果

AB02 已提供两个反例：缺 BEGIN 或 END MIGRATION_DDL 标记，同时在临时源改变 schema_migrations.applied_at 的 NOT NULL。目前 generate exit 0，SCHEMA_SQL/profile 更新，迁移常量保留旧值，check 再报不一致。

建议在生成器写入前验证迁移块的必要边界，缺失时明确非零且原 schema.ts 哈希不变。也可可靠重建完整块，但不必为了兼容损坏模板增加复杂恢复机制。

- 全部生成内容先在内存中准备并验证，成功后统一写出。
- 必需输入/生成目标缺失时不打印成功，不跳过任何生成区块；保持已通过的缺驱动、缺源、缺 helper、缺 V2 标识失败路径。
- 失败诊断说明缺哪一块及如何恢复。不要删除 check 的迁移常量一致性检查。
- BEGIN 和 END 分别缺失都需验证；失败前后按**文件字节哈希**比较，不只比较对象或某一片段。
- 恢复完整输入后，同一生成命令恢复成功，SCHEMA_SQL、三个迁移 DDL 常量与 profile 全部一致。

## 2. 单元 B：把必要验证放进正式测试，保存真实证据

### B1. 正式测试补齐生成链的关键路径

现有 storage.test.ts 只在健康工作区执行一次 check；改变 NOT NULL 后做对象 not.toEqual，无法检验工具故障行为。保留正常一致性检查，新增少量有行为断言的正式用例，可放在 `packages/storage-sqlite/tests/schema-generation.test.ts`，避免继续把所有场景塞进近四千行的 B 文件。

夹具使用完整 src/scripts、冻结历史源及已安装依赖；不要恢复旧 R15 四文件夹具，也不要依赖 docs/reviews 下的审查脚本作为正式测试实现。可共用一个小型临时项目 helper，不再复制业务提取器。

覆盖以下有限矩阵，允许参数化合并，不要求每项都有独立大套件：

| 场景 | 必须实际观察的结果 |
|---|---|
| 健康输入及允许的 NOT NULL 变化 | 真实 generate/check 为 0；V2 正确跟随，V1 不变；编译后移除 src，运行时仍有效 |
| 既有命名索引/FTS 语义来源 | 保持 AA02 已通过的跟随或明确策略拒绝，不能再丢属性而误报成功 |
| PK collation/desc 变化 | AB01 两例满足 A1；若拒绝，诊断指向 PK 策略 |
| V1/V2 描述故意改坏 | 完整输入下真实 check 非零；generate 修复后 check 归零；不能只有对象不等断言（AB03 是正例） |
| 缺驱动、缺历史源/当前源/helper、缺必要标记 | check/generate 按各自责任明确非零；生成失败时输出哈希不变；恢复输入后可成功；AB02/AB04 提供边界 |

不增加新依赖，不在真实工作区改文件后再还原，不调用网络或模型。确保这些用例由默认 `pnpm test:all` 收集。正式 AA01 已通过，保持即可；如不增加 content 变体，就把测试/报告标题写成实际 detail=none 范围。

### B2. 处理证据覆盖并改进新交付归档

R18 已登记：R17/observed-profile-and-fts.json 被从原报告的 1/4 覆盖成 4/4；原哈希与现哈希见本目录 delivery-evidence-audit.json。R18 已保存独立复跑原始输出。

- 不再把新运行写进任何历史 observed 文件，不改旧脚本、报告、日志或其指纹以掩盖差异。
- 若没有可验证的原字节备份，在新交付 README 明确“此前文件被覆盖，原日志未恢复，原哈希保留”，引用 R18 记录即可。不得从报告摘要编造旧 JSON，也不需要为寻找不可得备份无限停工。
- 新交付每条命令保存完整 stdout 和 stderr（可分文件，也可保留完整合并输出并注明），记录实际退出码、时间、相对文件路径。500 字符 sample 可作摘要，不能替代原始日志。
- 运行器根据 stdout 真实结果核对 R4 命令仅 U05/U06 失败；不要把任何 exit 1 都当预期通过。不用 `|| true` 隐藏失败。
- before/after 同时核对旧审查脚本和历史材料；已存在的覆盖事实以 R18 开始时状态为基线保留并说明，不能再写“全部历史日志从未改变”。

原 11 操作族与 B01–B12 含义已经纠正，可引用 R17 coverage 表及 R18 更新。不重新分配编号、不重写 B01/B03。报告准确写 keyTerms 类型（无 cid）、实际测试输入/入口和缺输入时文件保持不变；源码使用固定语法解析，不宣称通用 SQL AST。

## 3. 最终验收与停止条件

最终源码稳定后，先 build，再执行本目录 commands.json 的 **26 条命令**：25 条既定有效检查加 R18 AB。旧 R15 check-ddl-build.mjs 仍不计门槛，不因它缺依赖而保留静默跳过。

| 验收项 | 通过条件 |
|---|---|
| 正式检查 | build、typecheck、lint、test:all 通过；新增命令故障回归被正式套件收集，数量以真实输出为准 |
| 本包 | AA01–AA04、AB01–AB04 全通；AB03/AB04 等正例不因修复被破坏 |
| 既有行为 | R1–R3、G/H/J/K/L/N/P/Q/V/W/X/Y/Z 保持通过；既有历史重放/初始化行为不重写 |
| 已延期事实 | 仅 R4 因 U05/U06 exit 1，归 R4-C；其他有效门槛不能新增失败 |
| 产物与归档 | 缺块时无部分输出；所有本轮命令有完整日志与真实退出码；历史材料不再覆盖 |

相关说明同步 docs/03、07、必要 ADR 与进度，但只写已实现的保障，不增加 schema 版本或存储抽象。根 README、docs/progress.md、审查索引仍以 **R18 为最新独立结论**，实现后补“B.4-3R4 已实现/自验结果，待独立复核”，不能自行宣布 R4-B 已获独立验收。

归档到 `docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/`：README、before/after 指纹、commands、逐命令完整日志、反例修复前后证据、历史覆盖说明。覆盖 89 个现有文件及新增正式测试/helper；文档变化单列。回环端口测试按环境权限流程执行，未运行的干净安装、宿主认证、模型评估或远程 CI 明写未运行。

达到以上明确条件后交回复核，不自行扩展结构校验的其他语法或新功能。本轮后续候选仍为 R4-C；此提示词不授权提前进入该包或 M2。
