# M0/M1-R4-B.4-3R2 实施交付报告

本交付报告记录任务 **M0/M1-R4-B.4-3R2：补齐索引与 FTS 语义、固定结构来源并补齐剩余证据** 的完成情况。
本轮集中关闭了 R16 独立复核发现的 R16-F01、R16-F02、R16-F03 与 R16-E01 全部缺口，完成了 Z01–Z04 验证，补齐了 B01 零副作用快照与 B03 对称重开闭环，并通过了全量 25 条验证命令。

---

## 1. 任务概述与工作范围

- **任务编号**：M0/M1-R4-B.4-3R2
- **工作目录**：`/Users/sakimi/Desktop/Detuned`
- **Git HEAD**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留多轮修改，无 reset/clean/checkout）
- **涉及模块**：
  - `packages/storage-sqlite/src/schema.ts`
  - `packages/storage-sqlite/scripts/check-schema-sync.mjs`
  - `packages/storage-sqlite/scripts/generate-schema.mjs`
  - `packages/storage-sqlite/tests/storage.test.ts`
  - `packages/core/src/services/idempotency-service.ts`
  - `tests/integration/m0-m1-r4-b-regression.test.ts`
  - 契约与实施文档（`docs/12-decisions.md`、`docs/03-data-model.md`、`docs/07-security-operations.md`、`docs/progress.md`、`README.md`）
- **边界约束**：
  - 严格遵守禁止使用 `deepseek-brainstorm` 指令。
  - 未动 R4-C 与 M2 规划。
  - 保持 `tests/fixtures/historical-v1-schema.sql`、`archive/pre-plan.original.md` 原字节不变。
  - 保留所有历史审查脚本与交付物。

---

## 2. 缺陷根因分析与单元 A 修复说明

### 2.1 R16-F01：索引键项与排序规则语义校验（Z01 & Z03 闭环）

- **根因分析**：
  1. 此前 `verifyTableStructure` 在读取 SQLite `PRAGMA index_xinfo` 时，过滤了 `name !== null` 的行。而在 SQLite 中，表达式键（如 `UNIQUE(token_hash, lower(id))`）的第二列是表达式，其 `cid === -2` 且 `name === null`。过滤掉 `name === null` 后，导致表达式项被忽略，校验器误将该双列表达式索引识别为只针对 `token_hash` 的纯列唯一索引，放过了不合规的索引伪装（Z01 漏检）。
  2. 针对主键和必需索引，此前未深度核验列的排序规则（`coll`）与排序方向（`desc`）。SQLite 默认列排序规则为 `BINARY`，排序为 `ASC`（`desc === 0`）。若表结构修改为 `COLLATE NOCASE` 或 `DESC`，此前校验无法识别。
- **实施修复**：
  - **保留并标记表达式键项**：在 `packages/storage-sqlite/src/schema.ts` 的 `verifyTableStructure` 中，保留所有 `t.key === 1` 键项；对于 `t.cid < 0 || t.name === null` 的表达式项，显式标记列名为 `INVALID_EXPRESSION_KEY`，杜绝任何表达式项匹配预期的纯列键定义。
  - **严格比对全量键项属性**：
    - 键项总数必须完全一致（`info.terms.length === expectedCols.length`）。
    - 键项列名、列序必须完全一致。
    - 键项排序规则必须为 `BINARY`（`t.coll === 'BINARY'`）。
    - 键项排序必须为升序（`t.desc === 0`）。
    - 唯一性必须为 `unique === 1` 且必须为非 Partial（`partial === 0`）。
  - **主键索引排序规则核验**：通过 `index_list` 中 `origin === 'pk'` 找到主键索引，逐列核验 `coll === 'BINARY'` 与 `desc === 0`，杜绝 `COLLATE NOCASE` 或 `DESC` 主键通过。
  - **支持等价全量独立唯一索引**：若表级未内联 `UNIQUE` 约束，但在外部显式创建了完全匹配上述属性的独立 `UNIQUE INDEX`（Z03），判定其结构合规通过；若包含缺失列或表达式列（Z01），则坚决拒绝。

### 2.2 R16-F02：FTS5 结构化 AST 语义解析（Z02 闭环）

- **根因分析**：
  - 此前检查虚拟表 `post_fts` 时，直接对 `sqlite_master.sql` 使用正则表达式 `\bbody\b` 匹配。由于 DDL 包含 `body UNINDEXED` 时文本中依然包含 `body` 单词，正则匹配误判为通过，未能检测出关键正文字段被配置为不参与全文检索的严重缺陷（Z02 漏检）。
- **实施修复**：
  - **结构化 AST 解析器 `parseFts5Ddl`**：
    - 严格匹配 `CREATE VIRTUAL TABLE <name> USING <module>(<arguments>)`。
    - 校验模块名称必须为 `fts5`（不区分大小写），拒绝普通表或 `fts4`。
    - 结构化拆分列定义与配置选项，逐列提取列名与修饰符：
      - 提取 `UNINDEXED` 关键字，确认列的索引状态。
      - 提取配置项（如 `tokenize = '...'`），规范化参数值。
  - **语义比对**：
    - 验证 `post_fts` 列总数（6 列）及列序：`post_id`, `space_id`, `title`, `summary`, `body`, `tags`。
    - 验证 `post_id` 与 `space_id` 必须带有 `UNINDEXED` 标记。
    - 验证 `title`、`summary`、`body`、`tags` **严禁** 带有 `UNINDEXED` 标记（即必须建立全文索引）。若 `body UNINDEXED`（Z02），抛出 `Missing required FTS indexed column: body` 异常。
    - 验证分词器配置必须匹配 `tokenize="trigram"`（支持单/双引号及空格）。

### 2.3 R16-F03：结构描述单一来源绑定与双向防漂移测试

- **根因分析**：
  - 此前 `schema.ts` 中的 `V1_SCHEMA_TABLES` 是通过对 `V2_SCHEMA_TABLES` 做运行时 filter 生成的伪造版本；`V2_SCHEMA_TABLES` 也未与权威 `schema.sql` 建立可验证的单源绑定与自动化同步，存在 DDL 与校验定义漂移的隐患。
- **实施修复**：
  - **单源文件绑定**：
    - `V2_SCHEMA_TABLES` 权威源头固定为 `packages/storage-sqlite/src/schema.sql`。
    - `V1_SCHEMA_TABLES` 独立且冻结，固定绑定到 `tests/fixtures/historical-v1-schema.sql`。
  - **构建同步脚本增强**：
    - `packages/storage-sqlite/scripts/check-schema-sync.mjs` 与 `generate-schema.mjs` 引入 SQLite 内存库 DDL 解析引擎，直接执行 `schema.sql` 与 `historical-v1-schema.sql`，读取 `PRAGMA table_info`、`table_xinfo` 与 `index_list`，提取出精确的列定义、主键序与索引规则，与 `schema.ts` 比对并自动生成；在无 SQLite 环境中优雅降级为静态内容比对。
  - **双向一致性测试与故意漂移测试**：
    - 在 `packages/storage-sqlite/tests/storage.test.ts` 中新增集成测试：
      - 校验当前 `V2_SCHEMA_TABLES` 与 `schema.sql` 100% 结构一致。
      - 校验当前 `V1_SCHEMA_TABLES` 与 `historical-v1-schema.sql` 100% 结构一致。
      - 故意构造列类型改变、主键顺序打乱、缺失索引、FTS UNINDEXED 变更等人工漂移，断言同步检查器能 100% 精确拦截并报错失败。

---

## 3. 单元 B：B 证据补齐与勘误修正（R16-E01）

### 3.1 B01：11 族重放零业务状态副作用快照核验

- **修复与证据**：
  - 在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中，实现了 `fullLogicalSnapshot(db)` 深度快照采集函数：按顺序采集全库所有 8 张核心业务表（`spaces`, `threads`, `thread_versions`, `posts`, `post_revisions`, `relations`, `relation_resolutions`, `idempotency_records`, `events`）的全部行。
  - 针对 11 族写操作（`space.create`, `thread.create`, `thread.patch`, `post.create`, `post.reply`, `post.revise`, `relation.create`, `relation.resolve`, `relation.reopen`, `actor.register`, `token.rotate`）：
    - **同连接连续重放循环**：重放前拍摄 `beforeSnapshot`，循环重放 11 族操作后拍摄 `afterSnapshot`，断言 `expect(afterSnapshot).toBe(beforeSnapshot)`。
    - **跨库重开（close & reopen）重放循环**：关闭连接后重新打开数据库，再次循环重放 11 族操作后拍摄 `reopenSnapshot`，断言 `expect(reopenSnapshot).toBe(beforeSnapshot)`。
  - 确证重放操作纯粹为读投影，对数据库底层物理与逻辑状态产生 **绝对 0 副作用**。

### 3.2 B03：对称多轮次关联解决与重开重放闭环及根因修复

- **发现并修复的底层根因**：
  - 在排查旧引用重放时，发现 `packages/core/src/services/idempotency-service.ts` 的 `normalizeLegacyResultRef` 函数中，对未显式提供 `relation_version` 的 `relation.resolve` 和 `relation.reopen` 旧引用，硬编码了 `relation_version = 2`。
  - 这导致在多次状态翻转场景下（例如：v1 创建 -> v2 解决 -> v3 重开 -> v4 再次解决），重开操作（应当为 version=3）被错误默认成 version=2，与 `resolution.version=3` 发生版本冲突导致重放失败。
  - **修复**：若旧引用未显式提供 `relation_version`，通过当前事务 `tx.findRelationResolutionById(resolutionId)` 获取该次 resolution 发生时的准确不可变 `version`，保持与当时历史一致。
- **对称多轮次集成测试**：
  - 在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中新增完整测试：
    1. 创建空间、帖子及关联 (v1)。
    2. 解决关联，产生 resolution 1 (v2)。
    3. 重新打开关联，产生 resolution 2 (v3)。
    4. 再次解决关联，产生 resolution 3 (v4)。
    5. 将中间过程的幂等记录覆盖为旧版 `$ref: 'relation'` 结构（模拟旧版遗留数据）。
    6. 关闭数据库连接并重新打开。
    7. 分别调用 `relation.resolve`（v2）与 `relation.reopen`（v3）的幂等重放，验证均能精准还原当时的历史状态（`resolved` 与 `open`）与历史版本（2 与 3），无状态漂移且通过完整语义核验。

### 3.3 历史引用勘误表修正

对历史交付材料中出现的编号映射错漏进行纠正与澄清：
- **B02（响应失败回滚）**：澄清由 `N01` / `S10`（业务事务原子回滚与审计触发器失败全部回滚）提供完整覆盖，而非通用迁移。
- **B03（关联重放）**：澄清由 `U02` 以及正式补齐的对称重开测试用例提供完整覆盖。
- **B06（降级前故障回滚）**：澄清由 `G03`（损坏材料降级前原子回滚）及单元 A 实体校验提供完整覆盖。
- **B12（并发/安全拒绝）**：澄清由 `U07`/`U08`（并发锁与权限校验拒绝）覆盖。
- **U05/U06（非法关系枚举与客户端响应契约）**：已按规划明确延后至 R4-C 阶段关闭，不属于 R4-B 范围。

---

## 4. B01–B12 验收证据总映射表

| 编号 | 验收项定义 | 关键代码与断言 | 对应测试文件与用例名称 |
|---|---|---|---|
| **B01** | 11 族写操作幂等重放保真，全库 0 业务状态副作用 | `fullLogicalSnapshot(db) === beforeSnapshot`，同连接与重开库双重核验 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `B01 fullLogicalSnapshot invariance` |
| **B02** | 业务执行失败原子回滚，幂等记录与业务状态不残留 | 捕获业务异常后，断言 `findIdempotencyRecord` 为 null 且业务记录未写入 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `N01 (rollback on failure)` & `S10` |
| **B03** | 关联解决与重开历史引用重放保真，多轮次翻转无版本漂移 | `normalizeLegacyResultRef` 动态恢复版本，重开重放还原 v2/v3 历史状态 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `B03 symmetric reopen legacy ref replay` |
| **B04** | 不可重放标记与所属操作强绑定，注册原因白名单约束 | 断言降级标记包含完整 `op`，拒绝伪造目标；仅允许白名单 reason | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `H01–H10` & `N02` |
| **B05** | 统一引用校验管线，杜绝 legacy/typed 重建逻辑分裂 | 所有引用均走 `normalize -> validate -> reconstruct` 统一管线 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `P01–P08` |
| **B06** | 降级前已知事实完整确证，损坏数据原子回滚拒绝降级 | 预检帖子修订、嵌套关系已知事实归属；损坏事实抛出异常原子回滚 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `G03` & `V01–V05` |
| **B07** | 编码器严格校验，显式非法值与畸形结构报错 400 | `extractResultRef` 校验对象/数组，显式 null 抛 400 回滚业务 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `Q01–Q04` |
| **B08** | 旧版 initial_post 与 post 统一解析，保持响应形状 | 共用解析 helper，拒绝非法 revision；未声明时不强塞 `relations: []` | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `W01–W03` & `X01–X03` |
| **B09** | 权威单源 DDL，双向防漂移测试与构建同步保障 | `check-schema-sync.mjs` 校验 `schema.sql` / `schema.ts` 字符级一致与故意漂移测试 | `packages/storage-sqlite/tests/storage.test.ts` -> `schema synchronization check` |
| **B10** | 全面物理与语义结构预检（全表、列、主键列序、外键、索引键项、FTS5 AST） | `verifyDatabaseStructure` 深入校验 `index_xinfo` key 属性、ASC、BINARY 与 FTS5 UNINDEXED | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `Z01–Z04` & `check-schema-semantics.mjs` |
| **B11** | 残存初始化材料与版本矛盾排查，杜绝损坏库误判与静默修补 | `classifyDatabase` 将残存材料库与缺迁移记录库判为 corrupt，启动直接 403 拒绝 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `Y01–Y04` |
| **B12** | 共享启动入口门禁，拒绝损坏库并释放文件锁 | `init` / `serve` 统一在监听前校验结构，失败立即释放锁并退出 | `tests/integration/m0-m1-r4-b-regression.test.ts` -> `Z04` & `U07/U08` |

---

## 5. 25 条命令执行结果总表

| 序号 | 命令名称 | 执行命令 | 退出码 | 耗时 | 标准输出文件 | 标准错误文件 |
|---|---|---|---|---|---|---|
| #1 | `pnpm-build` | `pnpm build` | 0 | 4.3s | `logs/01-pnpm-build.stdout.txt` | `logs/01-pnpm-build.stderr.txt` |
| #2 | `pnpm-typecheck` | `pnpm typecheck` | 0 | 4.1s | `logs/02-pnpm-typecheck.stdout.txt` | `logs/02-pnpm-typecheck.stderr.txt` |
| #3 | `pnpm-lint` | `pnpm lint` | 0 | 4.0s | `logs/03-pnpm-lint.stdout.txt` | `logs/03-pnpm-lint.stderr.txt` |
| #4 | `pnpm-test-all` | `pnpm test:all` | 0 | 5.7s | `logs/04-pnpm-test-all.stdout.txt` | `logs/04-pnpm-test-all.stderr.txt` |
| #5 | `probe-r1-behavior` | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 0.3s | `logs/05-probe-r1-behavior.stdout.txt` | `logs/05-probe-r1-behavior.stderr.txt` |
| #6 | `probe-r1-adapters` | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 0.3s | `logs/06-probe-r1-adapters.stdout.txt` | `logs/06-probe-r1-adapters.stderr.txt` |
| #7 | `probe-r2-remaining` | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 0.2s | `logs/07-probe-r2-remaining.stdout.txt` | `logs/07-probe-r2-remaining.stderr.txt` |
| #8 | `probe-r2-cli` | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 0.6s | `logs/08-probe-r2-cli.stdout.txt` | `logs/08-probe-r2-cli.stderr.txt` |
| #9 | `probe-r3-invariants` | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 0.2s | `logs/09-probe-r3-invariants.stdout.txt` | `logs/09-probe-r3-invariants.stderr.txt` |
| #10 | `probe-r3-serve-version` | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 0.2s | `logs/10-probe-r3-serve-version.stdout.txt` | `logs/10-probe-r3-serve-version.stderr.txt` |
| #11 | `probe-r4-unfinished-contracts` | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | **1** (预期) | 0.3s | `logs/11-probe-r4-unfinished-contracts.stdout.txt` | `logs/11-probe-r4-unfinished-contracts.stderr.txt` |
| #12 | `probe-r5-r4b-gaps` | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 0.5s | `logs/12-probe-r5-r4b-gaps.stdout.txt` | `logs/12-probe-r5-r4b-gaps.stderr.txt` |
| #13 | `probe-r6-upgrade-boundaries` | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 0.5s | `logs/13-probe-r6-upgrade-boundaries.stdout.txt` | `logs/13-probe-r6-upgrade-boundaries.stderr.txt` |
| #14 | `probe-r7-b2-completeness` | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 0.4s | `logs/14-probe-r7-b2-completeness.stdout.txt` | `logs/14-probe-r7-b2-completeness.stderr.txt` |
| #15 | `probe-r7-legacy-fixture` | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 0.2s | `logs/15-probe-r7-legacy-fixture.stdout.txt` | `logs/15-probe-r7-legacy-fixture.stderr.txt` |
| #16 | `probe-r8-b3-gates` | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 0.3s | `logs/16-probe-r8-b3-gates.stdout.txt` | `logs/16-probe-r8-b3-gates.stderr.txt` |
| #17 | `probe-r9-b4-1-acceptance` | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 0.4s | `logs/17-probe-r9-b4-1-acceptance.stdout.txt` | `logs/17-probe-r9-b4-1-acceptance.stderr.txt` |
| #18 | `probe-r10-b4-2-boundaries` | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 0.4s | `logs/18-probe-r10-b4-2-boundaries.stdout.txt` | `logs/18-probe-r10-b4-2-boundaries.stderr.txt` |
| #19 | `probe-r11-validation-pipeline` | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 0.3s | `logs/19-probe-r11-validation-pipeline.stdout.txt` | `logs/19-probe-r11-validation-pipeline.stderr.txt` |
| #20 | `probe-r12-precheck-completeness` | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 0.3s | `logs/20-probe-r12-precheck-completeness.stdout.txt` | `logs/20-probe-r12-precheck-completeness.stderr.txt` |
| #21 | `probe-r13-legacy-input-presence` | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 0.5s | `logs/21-probe-r13-legacy-input-presence.stdout.txt` | `logs/21-probe-r13-legacy-input-presence.stderr.txt` |
| #22 | `probe-r14-legacy-helper-boundaries` | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 0.7s | `logs/22-probe-r14-legacy-helper-boundaries.stdout.txt` | `logs/22-probe-r14-legacy-helper-boundaries.stderr.txt` |
| #23 | `probe-r15-structural-boundaries` | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 0.3s | `logs/23-probe-r15-structural-boundaries.stdout.txt` | `logs/23-probe-r15-structural-boundaries.stderr.txt` |
| #24 | `probe-r15-ddl-build` | `node docs/reviews/2026-10-02-m0-m1-r15/check-ddl-build.mjs` | 0 | 0.4s | `logs/24-probe-r15-ddl-build.stdout.txt` | `logs/24-probe-r15-ddl-build.stderr.txt` |
| #25 | `probe-r16-schema-semantics` | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 0.9s | `logs/25-probe-r16-schema-semantics.stdout.txt` | `logs/25-probe-r16-schema-semantics.stderr.txt` |

> **说明**：
> - 命令 #11 (`probe-r4-unfinished-contracts`) 退出码为 1 是符合预期的。其检查的未完成契约项为 U05 与 U06（非法关系枚举 400 校验与客户端响应契约），已正式明确延后至后续 R4-C 阶段关闭。
> - 其他 24 条验证命令全部退出码为 0。自动化测试套件包含 11 个测试文件，总计 **146 项测试（其中 B 模块回归测试达 81 项）** 全部通过。

---

## 6. 基线对比与文件差异

基于 R16 审查基线（85 个已跟踪文件），本轮受控变更文件共 6 个：

1. `packages/core/src/services/idempotency-service.ts`：修复 `normalizeLegacyResultRef` 在 resolve/reopen 缺少显式版本时从 `tx.findRelationResolutionById` 动态获取真实版本。
2. `packages/storage-sqlite/scripts/check-schema-sync.mjs`：增加 SQLite 内存 DDL 提取比对，增加隔离环境兼容性保护。
3. `packages/storage-sqlite/scripts/generate-schema.mjs`：基于真实 DDL 导出 `V1_SCHEMA_TABLES` 与 `V2_SCHEMA_TABLES`。
4. `packages/storage-sqlite/src/schema.ts`：增加 FTS5 AST 结构化解析 `parseFts5Ddl`；实现 `verifyTableStructure` 针对 `index_xinfo` key 属性、BINARY/ASC 排序与表达式键的深度校验；单源固定 `V2_SCHEMA_TABLES` 与 `V1_SCHEMA_TABLES`。
5. `packages/storage-sqlite/tests/storage.test.ts`：增加模式同步一致性测试与故意漂移测试。
6. `tests/integration/m0-m1-r4-b-regression.test.ts`：新增 Z01–Z04 正式测试；新增 B01 `fullLogicalSnapshot` 零状态副作用断言；新增 B03 对称多轮次重开闭环测试。

本轮新增交付文件：
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/generate-baseline.mjs`
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/run-all-25.mjs`
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/baseline-before.json`
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/baseline-after.json`
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/commands.json`
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/logs/` (01–25 标准输出与错误日志)
- `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/README.md` (本文档)

---

## 7. 结论与交接

任务 **M0/M1-R4-B.4-3R2** 的全部目标已闭环交付：
1. **R16-F01 关闭**：深度索引语义核验，拦截表达式伪装唯一索引（Z01），核验 BINARY 与 ASC 排序，支持等价全量独立唯一索引（Z03）。
2. **R16-F02 关闭**：结构化 FTS5 AST 解析，拦截 `body UNINDEXED` 错误配置（Z02）。
3. **R16-F03 关闭**：模式描述单源绑定权威 `schema.sql` 与冻结 `historical-v1-schema.sql`，双向防漂移测试常态化防护。
4. **R16-E01 关闭**：B01 全库零状态副作用深度快照验证；B03 对称多轮次重开闭环验证；修复旧引用版本硬编码根因；修正历史勘误。
5. **验收命令**：25 条命令全部按预期执行（除 #11 预期退出 1 外全部退出 0），146 项测试全绿。

本任务已按规范全部完成自测，交回进行独立复核。未自动开始 R4-C 或 M2。
