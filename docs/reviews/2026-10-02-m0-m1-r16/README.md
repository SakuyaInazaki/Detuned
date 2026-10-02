# R16 独立复核：B.4-3R 有效推进，结构语义仍未收尾

日期：2026-10-02。被审查交付：M0/M1-R4-B.4-3R。工作目录：`/Users/sakimi/Desktop/Detuned`。HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`，审查对象包含多轮未提交实现，以本目录 [baseline.json](baseline.json) 为准。

**结论：部分通过，R4-B 整包暂不验收。** 140/140 正式测试（11 文件、B 76 项）属实；既定 24 条命令独立复跑的结果与实现者一致：23 条 exit 0，仅 R4/U05、U06 对应命令 exit 1。R15 的初始化材料/版本矛盾已修复，三个迁移 DDL 常量确实共用来源，11 个操作族也已补上真实重放。

本轮新增检查 [Z](observed-schema-semantics.json) 为 2/4：Z01、Z02 仍能复现坏结构通过预检，分别影响唯一性/幂等键和正文搜索；Z03 等价健康结构、Z04 实际 CLI 拒绝均通过。此外，结构描述的来源约束与少量 B 证据补项仍未完成。因此下一任务为 [B.4-3R2](next-agent-prompt.md)，完成下列剩余项后交回。R4-C 与 M2 本轮不启动。

这次发现来自上一轮已明确要求的索引键、校对规则与 FTS 列语义检查，不增加新的数据库兼容平台或功能范围。坏结构均由审查脚本在自建临时库内构造；并非声称正常新建库已经出现重复凭据或丢失搜索结果。

## 1. 可以关闭和保留的成果

| 原项 | 独立核验 | 结论 |
|---|---|---|
| R15-F01：初始化材料残留、v2 结构缺 version 2 | Y02/Y03 三个函数入口拒绝且重开快照不变；新增 Z04 实际运行两种坏库的 CLI init/serve，均 exit 3、FORBIDDEN、释放锁、未输出成功凭据，CLI 后重开快照不变 | 关闭本项；不重做空库/初始化修复 |
| R15-F02 的原四个具体反例 | Y01 的 partial UNIQUE、partial 命名索引、FK CASCADE、普通表冒充 FTS 均拒绝；Y04 五个健康组合通过 | 指定反例已修复，完整语义要求仍有 F01/F02 |
| R15-F03 的迁移 DDL 重复 | `applyMigrations` 使用从 schema.sql 提取的三个命名常量；生成/同步检查、隔离编译及无 src 的运行时导入通过；新建/升级 parity 新增 index_xinfo 与 FTS SQL 比较 | 迁移 DDL 复用子项关闭；结构描述来源子项见 F03 |
| R15-E01 的实际 11 族重放 | 正式 B01 真实发送全部 11 族请求，分别比较同连接和文件库重开后的完整 data，事件/幂等行计数不增加 | 核心补测有效；业务表不变的断言还需小补项 |
| B06 / B08 / B2-3、4、5 | B06 在真实建表后安装 TEMP 故障触发器，faultHits=1，重开完整快照不变；B08 真正关闭重开后重试；三组结构拒绝补了重开快照 | 指定补项关闭 |
| 原历史引用修复及其他可靠性检查 | R1–R3、G/H/J/K/L/N/P/Q/V/W/X 全部保持通过 | 保留已确认成果；不重开 B.4-2 的解析工作 |

## 2. R16-F01 / P2：索引检查丢弃真实键项，未检查校对与排序

定位：[schema.ts:1692](../../../packages/storage-sqlite/src/schema.ts#L1692)，主键检查另见 1656 行附近。`index_xinfo` 已调用，但随后过滤 `x.key === 1 && x.name !== null`，将表达式键直接丢掉；保留的键项也仅取 name。主键仅比 table_info.pk，不能覆盖其 collation；命名索引未比较 desc/coll。

Z01 在 bootstrap、init、serve 三个入口各复现以下三种输入，全部被认定 `current_initialized` 并成功放行：

| 临时库变更 | 当前行为及实际后果 |
|---|---|
| 移除 credentials.token_hash 的 UNIQUE，建立 `UNIQUE(token_hash, lower(id))` | 第二个表达式键的 cid=-2、name=null，被过滤后误认成 token_hash 单列 UNIQUE。通过预检后实际插入相同 token_hash、不同 id 成功 |
| idempotency_records.key 列改为 `COLLATE NOCASE`，复合 PK 顺序不变 | 两个不同请求键 `R16CaseKey` / `r16casekey` 被数据库混同；HTTP 首次 201，第二次 409 IDEMPOTENCY_CONFLICT；健康对照二者均 201 |
| idx_events_space_seq 改为 `(space_id COLLATE NOCASE, seq DESC)` | 名称、唯一性及列名顺序一致便放行；未保持权威 DDL 的 BINARY/ASC 定义。此变体仅证明结构差异漏检，不声称已观察到数据损坏 |

上述调用前后快照保持不变，**错误在于允许该坏库继续服务**；重复插入和 HTTP 后果在快照比较之后单独执行。修复需比较完整 `key=1` 项，表达式不能当作不存在，覆盖 PK/UNIQUE/必需索引的键序、排序、collation、唯一性及 partial 定义。项目当前不使用表达式键，无需实现任意 SQL 表达式等价证明。

## 3. R16-F02 / P2：FTS 关键词出现不代表列仍被索引

定位：[schema.ts:1759](../../../packages/storage-sqlite/src/schema.ts#L1759)。检查确认 post_id/space_id 带 UNINDEXED，但对 title/summary/body/tags 只查单词是否出现，也仅查 tokenizer 的前缀。

Z02 将真实 FTS5 表重建为 `body UNINDEXED`，保留全部字段、`tokenize="trigram"` 与全部搜索行。三个入口均认定健康并放行。相同 HTTP 搜索 `needle`：健康库为 200 / 1 条，坏库为 200 / 0 条，目标单词只存在正文中。这是静默漏检，上一轮的“普通表冒充 FTS”反例并未覆盖它。

需要比较受支持 FTS 定义的列顺序/数量、每列索引标志、模块及完整 tokenizer 配置。避免继续堆“必须包含某个单词”的正则。可以对本项目固定语法作结构化解析或规范化后与受支持定义比较，不要求通用 SQL 解析器。

## 4. R16-F03 / P2：结构预期仍未绑定各版本权威来源

这是 R15-F03/提示词 1.2、2 的剩余工程要求，非新的普通启动失败结论：

- [generate-schema.mjs](../../../packages/storage-sqlite/scripts/generate-schema.mjs) 只生成 SCHEMA_SQL 与 MIGRATION_DDL 两块；[check-schema-sync.mjs](../../../packages/storage-sqlite/scripts/check-schema-sync.mjs) 也只校验这些常量。
- [schema.ts:303](../../../packages/storage-sqlite/src/schema.ts#L303) 起的结构预期仍是手写对象，其类型无法描述索引键 collation/desc 或完整 FTS 定义。
- [schema.ts:1620](../../../packages/storage-sqlite/src/schema.ts#L1620) 的 V1_SCHEMA_TABLES 直接过滤当前 V2 对象，未独立绑定冻结的历史 DDL。
- storage.test.ts 的 parity 已能证明**当前这两条建库路径**的具体结构相同，这是有效新增证据；它没有把运行时预检描述与各版本 DDL 做完整一致性断言，不能由此声称该剩余项关闭。

建议在修 F01/F02 时一并整理来源：当前 profile 从 schema.sql 生成或受完整自动比较约束；历史 profile 从固定历史 fixture/明确历史材料生成或核验。继续复用本轮已正确生成的三个迁移常量，保留历史 fixture 原字节，不引入通用迁移框架。

## 5. R16-E01：验收表比上轮准确，但仍不能写全部子条件闭环

这不是日志造假：实现者 24 条命令、48 份 stdout/stderr、85 文件前后指纹均能核对。7 个产品/正式测试/构建文件变化属实，未发现旧审查脚本被修改。旧材料比对只发现操作系统 `.DS_Store` 元数据变化，审查报告/脚本/原始输出保持。

仍需准确完成的项见 [coverage-audit.md](coverage-audit.md)：

1. B01 目前仅比较 events/idempotency_records 计数，没有业务表行/内容不变断言。补在已有重放循环中即可，无需重建 11 个新测试框架。
2. B03 仍只覆盖旧 `$ref` resolve 经后续 reopen；缺“旧 reopen → 后续 resolve → 关闭重开 → 完整原结果”的对称证据。B01 的现代 reopen 重放不能代替它。
3. 报告 B03 引 G02 错误，G02 实际是旧 thread 缺版本；B12 原子回滚应引 U08，U07 是 25 修订脱敏；B02 响应未交付的既有证据是 N01。现有有效证据可直接引用。
4. “partial 谓词全面比较”过度：现有 parity 比了 partial 标志与 index_xinfo，未读任意谓词文本。项目目前要求这些索引全量，正确描述为 `partial=0` 即可，不需要新增部分索引支持。
5. U05 是**非法 relation 枚举仍被写入**，不是本次报告所称“跨空间关系拒绝”；后续 R4-C 按原任务书 C01/C02 实施。

## 6. 下一步与产品距离

下一包限定为 **M0/M1-R4-B.4-3R2：补齐索引与 FTS 语义、固定结构来源并补齐剩余证据**。详细可复制任务见 [next-agent-prompt.md](next-agent-prompt.md)。目标是关闭本页 F01–F03 与 E01；已通过的初始化、DDL 复用、历史引用结果不重做。

当前是有真实 HTTP/CLI、身份、讨论和重试能力的开发原型，仍在 M0/M1 验收收尾。B 通过后，下一包是 [R4-C 请求/响应契约](../2026-09-28-m0-m1-r4/follow-up-contracts.md)，之后才能评估 M2.1。附件、完整记忆/消费/运维、四宿主联调、Web、正式独立评审与外部验证仍按 M2–M7 推进；本轮绿色测试不代表用户的完整研究协作场景已可用，不给无依据的完工百分比或天数。

## 7. 证据和审查边界

- [verification.md](verification.md)：复跑结果、命令与环境限制。
- [commands.json](commands.json)：24 个既定命令加 1 个新探针，真实退出码和原始输出路径。
- [observed-schema-semantics.json](observed-schema-semantics.json)、[check-schema-semantics.mjs](check-schema-semantics.mjs)：Z01–Z04 可复跑证据。
- [delivery-evidence-audit.json](delivery-evidence-audit.json)：交付命令/日志/指纹与历史材料核对。
- [review-integrity.json](review-integrity.json)：审查结束后的完整性检查。

本轮只新增审查材料并同步三个当前状态入口；不修改产品源码、正式测试、历史交付或旧探针。不使用模型、不启动其他 Agent、不执行已禁用技能、不修改全局配置、不提交/推送/部署。不把本地适配器测试当成四种 harness 的真实联调认证。
