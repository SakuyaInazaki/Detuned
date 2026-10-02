# R18 独立复核：FTS 配置修复通过，结构生成仍有两个遗漏

日期：2026-10-02。复核任务：**M0/M1-R4-B.4-3R3**。输入为 HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加累积未提交实现，准确指纹见 [baseline.json](baseline.json)。

**结论：部分通过；R17-F01 可以关闭，R17-F02 尚有两个生成可靠性遗漏，R4-B 暂不整体验收。** 本轮独立执行 147/147 正式测试（11 文件，B 82 项）。上轮规定的 25 条有效命令均复跑，24 条 exit 0，仅 R4 探针因 U05/U06 exit 1，与交付一致；AA01–AA04、Z01–Z04 全部通过。

新增 [AB 检查](observed-generation-completeness.json) 为 2/4：AB01、AB02 失败，AB03、AB04 正例通过。两个失败都直接对应 R17 提示词 A2/A3 的既定要求；不增加新存储功能，不改变实际 schema.sql，也不要求支持任意 SQL 语法。下一包为 [B.4-3R4：主键来源约束与生成失败原子性](next-agent-prompt.md)。

## 1. 本轮可确认关闭的部分

| 项目 | 独立证据 | 结论 |
|---|---|---|
| FTS 配置漏检 / R17-F01 | AA01 三入口均将 detail=none 判 corrupt、拒绝启动，重开逻辑快照不变；健康正文查询 200/1 条；新增正式 AA01 通过 | 关闭该功能缺陷 |
| UNIQUE/命名索引及 FTS 的生成来源 | AA02 在完整隔离副本中改变命名索引的 collation/desc 或 FTS 索引标志，生成描述随源变化，无 src 运行时校验通过，V1 不变 | 指定修复有效；主键另见 F01 |
| 缺驱动/历史源不再静默成功 | AA03 通过；AB04 进一步确认缺驱动、历史源、当前 SQL、提取器或 V2 标识时均非零且原输出字节不变 | 这些失败路径关闭；迁移块另见 F02 |
| 完整输入的真实生成/检查 | AA04 健康及普通列变更正例通过；AB03 故意损坏 V1/V2 描述后，真实 check 非零，generate 修复、check 归零，编译后移除 src 仍通过 | 当前正常工具链可用 |
| 共享提取器 | generate、check、storage 正式测试均使用 extractDatabaseRequirements | 不再是三份 PRAGMA 提取器；不能因此推断已覆盖全部属性 |
| 既有历史结果/升级行为 | 原 B01/B03 等正式回归、R1–R3 和 G/H/J/K/L/N/P/Q/V/W/X/Y/Z 保持通过 | 不重做已关闭的幂等、初始化和索引拒绝修复 |
| 上轮报告的主要编号勘误 | 真实 11 操作族、B01–B12 原含义、N01/U07/U08/P 范围已改正 | 这些勘误可以关闭；证据保存仍见 E01 |

正常源与正常数据库的现有测试通过；下面的失败由本轮明确构造的**隔离源文件变更或缺失标记**触发。没有据此声称当前健康数据库会自行损坏。

## 2. R18-F01 / P2：主键键项仍被丢弃，构建可能接受运行时拒绝的定义

定位：[extract-schema-requirements.mjs:125](../../../packages/storage-sqlite/scripts/extract-schema-requirements.mjs#L125)、[schema.ts:3562](../../../packages/storage-sqlite/src/schema.ts#L3562)。

共享提取器读取 index_xinfo 的 coll/desc，却只保存 `origin === "u"` 和 `origin === "c"` 的记录；`origin === "pk"` 被跳过。普通列的 pk 只保存主键列序，不能表示校对规则或 ASC/DESC。运行时主键校验仍固定要求 BINARY/ASC。

AB01 分别在有驱动、有历史源的临时源码副本中修改 idempotency_records 的主键：

| 隔离变更 | generate | check | V2 描述变化 | 无 src 运行时 |
|---|---|---|---|---|
| actor_id 增加 COLLATE NOCASE | 0 | 0 | 否 | 拒绝：期望 BINARY，实际 NOCASE |
| 最后一列 key 增加 DESC | 0 | 0 | 否 | 拒绝：期望 ASC，实际 DESC |

V1 描述均未变化，编译成功。问题是生成与同步命令给出成功，而同一产物无法通过自己的结构检查。这与 R17-A2 明确包含 PK/UNIQUE/必需索引的要求不符，不是要求真实产品改成 NOCASE/DESC。

最小修复可以选择：**在共享提取器中明确拒绝不受支持的主键属性**，让生成和检查同时非零；也可以把主键键项完整纳入版本描述、运行时消费该描述。当前布局固定时优先采用清晰的受支持策略，不必为关闭此项扩展数据库语义。保留健康主键、当前已通过的命名索引/UNIQUE/FTS 跟随能力和旧 V1。

## 3. R18-F02 / P2：迁移生成块缺标记时静默跳过并写出半套产物

定位：[generate-schema.mjs:94](../../../packages/storage-sqlite/scripts/generate-schema.mjs#L94)。

更新 MIGRATION_DDL 时只有 `if (migRegex.test(updatedTs))`，没有失败分支。SCHEMA_SQL 与 V1/V2 描述已更新，最终仍执行 writeFileSync 并打印生成成功。

AB02 在完整隔离副本中，分别删除 BEGIN 或 END MIGRATION_DDL 标记，并将 schema_migrations.applied_at 的 NOT NULL 去掉：

- generate 均 **exit 0**，输出文件哈希改变；
- SCHEMA_SQL/profile 跟随新源，SCHEMA_MIGRATIONS_DDL 仍保留旧定义；
- 随后的 check 均 **exit 1**，准确报迁移常量与源不匹配。

同步检查能发现问题，但不能替代生成器本身的失败语义。R17-A3 已要求必要模板/标记缺失时明确失败、生成失败不留下部分更新。修复应在写出前验证完整生成目标；缺块时明确失败并保持输出原字节，或采用经测试的完整重建方式。不要吞错或去掉同步检查。

## 4. R18-E01：正式回归与历史证据保存尚未完整交付

这些问题不要求重新开发 B01/B03，也不否定本轮独立复跑得到的成功结果。

### 4.1 正式测试只增加 AA01，生成故障检查仍未进入正式套件

正式总数 146 → 147，B 81 → 82；storage 仍 7 项。storage.test.ts 的一致性测试现在共用提取器，并调用一次**健康工作区**的同步脚本返回 0；故意变化仍只有对象 `.not.toEqual`，未在故障副本中执行 generate/check。

所以 R17 要求的 AA02–AA04 生成/缺输入/无 src 场景主要仍依赖独立审查脚本，不在默认 `pnpm test:all` 中。本轮 AB03/AB04 已证明部分行为正确，下一轮把相关真实命令断言纳入正式测试，并加入 AB01/AB02 反例即可。避免增加只重复提取器实现的镜像测试。

### 4.2 一份 R17 观测已被覆盖，交付仅保存 500 字符摘要

[delivery-evidence-audit.json](delivery-evidence-audit.json) 记录了事实：

- before 的 88 文件与 R17 基线一致；after 的 89 文件与当前实现一致：5 个既有文件修改、1 个新 helper、83 个不变。旧审查脚本未变。
- R17 的 `observed-profile-and-fts.json` 与 R17 `review-integrity.json` 保存的哈希不符：原为 `2d21046f8ccf75cd52d1b4aa396b2b67438f7e3ca954457c8c256cab42228815`，本轮开始时为 `67b0c7e3a4b8435c3b6eb6d474950c78392aafe1686c9910d80a18b6aab75308`。旧报告记 1/4，当前文件已变为 4/4。
- 交付 run-all-25.mjs 仅将每条 stdout/stderr 的前 500 字符保存到 observed-25-commands.json；交付目录没有逐命令完整日志。不能把这些 sample 称为完整原始证据。
- 本轮实际复跑的 25 个退出码全部与交付一致；R18 已另存完整输出。因此不把上述保存问题表述为测试结果伪造，也不把覆盖归因于未经证明的主观意图。

本次审查保留发现时的文件原字节，准确登记覆盖。若无原字节备份，不能凭摘要编造“恢复后的原日志”；此处不要求找不到原文件就一直阻塞功能修复。后续交付在新目录声明覆盖事实和保留的原哈希，所有新运行只写新交付目录，并记录完整 stdout/stderr 与真实退出码。历史报告和脚本保持原样。

小项勘误一并处理：实际 IndexKeyTerm 无 cid 字段；AA01 正式测试只注入 detail=none，不包含 content=""，且是函数调用而非该输入的真实 CLI 锁测试；缺输入时应保留原文件，不是把损坏 profile 擦掉。以真实代码和断言为准，不把这些措辞问题扩展成新功能任务。

## 5. 下一步与证据索引

下一包 **M0/M1-R4-B.4-3R4：主键来源约束与生成失败原子性**。仅完成 F01/F02、相关正式回归和 E01 归档勘误；[完整提示词](next-agent-prompt.md) 包含具体反例、可选最小修复与结束条件。

完成后交回独立复核。R4-B 通过后再进入 R4-C（U05 非法关系枚举、U06 客户端成功响应校验与取消契约），随后评估 M2.1。本次不自动领取新里程碑，也不宣称四类 harness 或正式评审已可用。

- [verification.md](verification.md) / [commands.json](commands.json)：26 个命令与完整原始输出。
- [check-generation-completeness.mjs](check-generation-completeness.mjs) / [observed-generation-completeness.json](observed-generation-completeness.json)：AB01–AB04。
- [coverage-audit.md](coverage-audit.md)：已关闭项、正式回归缺口与固定 B 编号。
- [delivery-evidence-audit.json](delivery-evidence-audit.json)：交付基线、覆盖事实、命令对照。
- [review-integrity.json](review-integrity.json)：审查后文件完整性。

本轮仅新增审查材料并同步三个当前状态入口；运行使用临时源码副本、临时 SQLite 与合成凭据。未运行真实模型、四类宿主认证、干净安装或远程 CI。未改动产品代码和正式测试、未使用禁用技能、未调度其他 Agent，未提交、推送或部署。
