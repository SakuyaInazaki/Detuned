# M0/M1-R4-B.4-3 交付报告：结构预检与原 B 验收证据（含 R14 前置补项）

## 1. 任务概述与解决的缺陷

- **任务编号**：`M0/M1-R4-B.4-3`
- **工作目录**：`/Users/sakimi/Desktop/Detuned`
- **起始基线**：Git HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`（保留既有多轮未提交实现）。经 `baseline-before.json` 核对，产品与测试集合的 83 个文件 SHA-256 哈希与 R14 `baseline.json` 100% 严格一致。
- **关闭缺陷与交付目标**：
  1. **关闭 R14-F01（探针 X03 失败项）**：在旧版引用解析与降级前逐条强校验 relation 版本号；若引用的 relation 版本严格大于当前库中该关系已知最大版本（`v > rel.version`），或与已知历史事实发生矛盾，一律拒绝静默降级为 marker，必须抛出 422 `RESYNC_REQUIRED`（在线重放）或触发迁移事务回滚（启动升级）。
  2. **补齐正式双入口回归覆盖**：针对 V01/V02、X01–X03 补齐服务层直接调用与真实 Fastify HTTP POST 两套入口的正式回归测试，并对失败场景补齐数据库重开快照对比。
  3. **关闭历史遗留缺陷 L03 / R8-F05（单元 B）**：确立 `schema.sql` 为唯一权威 DDL 来源，建立构建期自动生成与同步核验机制（`generate-schema.mjs`、`check-schema-sync.mjs`、`prebuild`、`build`、`lint`）；实现覆盖全量 22 张 v2 表及 20 张 v1 表的详尽物理结构预检（`TableRequirement`，严格断言表存在性、所有列名、类型亲和性、NOT NULL 约束、主键及复合主键物理排序、外键约束、唯一约束、显式索引列序），彻底关闭 **L03**（`check-b3-gates.mjs` 达成 **8/8 全部通过**）。
  4. **整理原 B01–B12 完整验收矩阵与执行全量 22 项验证命令（单元 C）**：逐项对照 B01–B12 验收条件与子条件，标明正式测试文件位置、复跑脚本及证据路径；全量执行 22 项验证命令（21 项 exit 0，仅 Command #13 `probe-r4-unfinished-contracts` 因 U05/U06 按计划 exit 1，严格归属后续 R4-C）。
  5. **纠正 R14-E01 交付说明**：在新交付中准确说明 G/H/J/K 执行记录来源、V01/V02 正式双入口补齐情况，以及明确快照等价性为表行级“逻辑快照”而非物理文件字节相等。

---

## 2. 根因分析与代码改动单元

### 2.1 单元 A：关系历史版本边界校验与降级前强防线 (R14-F01 / X03)

**根因分析**：
在此前实现中，当处理旧版 `$ref: 'relation'` 记录时，若数据库中找不到对应的历史决议记录，代码曾直接落入降级分支，生成 `kind: 'unreplayable'` 标记。然而，若记录中声称的 relation 版本号严格大于当前数据库中该关系的最大已知版本（例如当前 relation 版本为 1，而记录声称版本为 2），这在因果律上属于“不可能发生的事实”，是伪造或未来数据，绝不属于“历史快照遗失”的合法降级范畴。允许其降级为 marker 会导致损坏数据逃逸迁移事务回滚，破坏历史数据完整性。

**具体改动**：
1. 在 `packages/core/src/services/idempotency-service.ts` 的 `validateNestedRelationsKnownFacts` 中，增加针对 `v > rel.version` 的严格检查：若版本超出已知最大版本，直接抛出 422 `RESYNC_REQUIRED`（`detail: 'Historical relation version exceeds current maximum known version'`）。
2. 在 `validateStoredResultRefPrecheck` 的 `relation.create` 分支中，增加对 `relation_version > rel.version` 的前置校验，超出直接抛出 422。
3. 在 `normalizeLegacyResultRef` 的 `processLegacyRelations` 中，逐条核验关系版本与状态。对缺失决议历史的情况，若 `v > rel.version`，拒绝生成 marker，直接抛出 422，从而触发在线 422 拒绝或启动升级整笔事务回滚。
4. 增强 `tests/integration/m0-m1-r4-b-regression.test.ts`，为 V01、V02、X01、X02、X03 全部补充 Service 直接调用与 Fastify HTTP POST 双入口测试，并断言迁移回滚前后数据库逻辑快照完全一致。

### 2.2 单元 B：权威单一 DDL 来源与全量物理结构预检 (L03 / ADR-019)

**根因分析**：
此前 `check-b3-gates.mjs` 中的探针 L03 构造了一个损坏库：将 `idempotency_records` 表通过 `CREATE TABLE AS SELECT` 重建，导致表结构丢失了主键定义（`PRIMARY KEY (actor_id, space_id, operation, key)` 丢失）以及 `NOT NULL` 约束。旧版 `classifyDatabase` 仅核验了表名是否存在以及 `schema_migrations` 表的版本号，未深入检查表的物理列定义、主键、约束和索引，导致无主键的损坏表被误判为健康当前库（`current_initialized`）而放行启动。此外，DDL 定义此前在 `schema.sql` 与 `schema.ts` 字符串常量中双重硬编码，存在分叉漂移隐患。

**具体改动**：
1. **确立单一 DDL 权威**：
   - 确立 `packages/storage-sqlite/src/schema.sql` 为唯一权威 DDL 源码。
   - 新增 `packages/storage-sqlite/scripts/generate-schema.mjs`：提取 `schema.sql` 并规范化 SQL 注释，生成 `schema.ts` 中的 `CURRENT_SCHEMA` 导出常量。
   - 新增 `packages/storage-sqlite/scripts/check-schema-sync.mjs`：比对 `schema.sql` 与 `schema.ts` 的绝对字符级一致性。
   - 在 `packages/storage-sqlite/package.json` 中配置 `prebuild`、`generate:schema`、`check:schema`，并接入 `build` 与 `lint` 流程。
2. **全量物理结构预检（Fail-Fast）**：
   - 在 `packages/storage-sqlite/src/schema.ts` 中定义 `TableRequirement` 规范，详细列出全部 22 张 v2 表及 20 张 v1 表的结构需求：包含每一列的列名、类型亲和性、NOT NULL 要求、主键列及其复合物理排序（如 `idempotency_records` 必须按 `actor_id` (pk=1)、`space_id` (pk=2)、`operation` (pk=3)、`key` (pk=4) 严格排序）、外键引用及显式索引定义。
   - 实现 `verifyDatabaseStructure(db, tables)` 函数，利用 SQLite 原生 PRAGMA（`PRAGMA table_info`、`PRAGMA foreign_key_list`、`PRAGMA index_list`、`PRAGMA index_info`）全面扫描验证。
   - 在 `packages/storage-sqlite/src/bootstrap.ts` 的 `classifyDatabase` 入口直接调用 `verifyDatabaseStructure`：若发现主键缺失、列类型错误、缺少必需约束等损坏情况，立即返回 `{ kind: 'corrupt', reason: ... }`。
   - CLI `init` 与 `serve` 遇 `corrupt` 库直接返回 403 `FORBIDDEN` 并退出，绝不在损坏库上绑定监听套接字（listen socket）或进行任何数据写入，并立即释放文件锁。
3. **关闭 L03**：
   - 运行 `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs`，L01–L08 **8/8 全部通过**，L03 正式关闭。
   - 在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中增补 B2-1 至 B2-8 共 8 组正式结构矩阵测试。

### 2.3 单元 C：原 B01–B12 验收证据与 22 项验证命令全量执行

1. 逐条梳理并建立 B01–B12 验收条件与正式自动化回归用例的映射关系（见下文第 3 节）。
2. 构建并执行 `run-all-22.mjs`，顺序跑完 22 项验证命令，将全部命令的退出码、标准输出与错误输出完整归档于 `commands.json` 与 `logs/` 目录。
3. 确认 21 项命令以退出码 0 通过，仅 Command #13（`check-unfinished-contracts.mjs`）以退出码 1 退出，其仅失败项 U05（跨空间关系拒绝）与 U06（截断流消费防线）属于 R4-C 范围，严格符合前轮既定边界。

---

## 3. B01–B12 逐项验收状态与证据映射表

| 编号 | 条件与规范要求 | 验收事实与子条件覆盖 | 正式测试文件与用例位置 | 对应审查脚本 / 探针 | 状态 |
|---|---|---|---|---|---|
| **B01** | 全部 11 个已实现操作族（11 operation families）各自 result schema 正确，编码/解码无任意 fallback | 覆盖 `space.create`、`thread.create`、`thread.patch`、`post.create`、`post.revision`、`relation.create`、`relation.resolve`、`decision.publish`、`evidence.attach`、`export.create`、`admin.redaction`。合法 typed ref 精确重构；非法结构/非安全整数/非枚举状态严格报错 400，绝不隐式纠偏。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L140-210), `packages/storage-sqlite/tests/storage.test.ts` | R11 `check-validation-pipeline.mjs` (Q01-Q05), R10 `check-b4-2-boundaries.mjs` (P02) | **已关闭 (PASS)** |
| **B02** | 立即重试/后续变更/重开数据库/响应丢失重试，固定操作 ID/版本/关联记录，不增加业务行和事件，当前脱敏/授权仍生效 | 同键重放返回首次结果引用，重放期间不向业务表或 events 插入重复记录；后续修改目标实体不污染已持久化幂等记录；重启后依然保持一致性；脱敏与权限重新动态评估。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L212-295) | R3 `check-invariants.mjs` (T01-T05), R5 `check-r4b-gaps.mjs` (G01-G04) | **已关闭 (PASS)** |
| **B03** | 旧 `$ref` resolve/reopen + 后续相反操作，重建原操作状态，与 resolution.version/action 一致；U02 通过 | 严格依据历史决议记录重构关系状态，不因后续相反操作篡改早期引用的决议快照；支持 reopen 跨重启持久性。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L297-370) | R4 `check-unfinished-contracts.mjs` (U02), R6 `check-upgrade-boundaries.mjs` (H01-H04) | **已关闭 (PASS)** |
| **B04** | 未知 kind/version、缺失历史、损坏 JSON，明确非成功，不回传任意 JSON，不重新执行 action；U04 通过 | 非法/未知 kind 或未来版本、历史关系版本不可证实、损坏 payload 均返回 422 `RESYNC_REQUIRED` 或标记为 unreplayable，绝不回传未经校验的正文，不二次触发业务写入。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L372-440) | R4 `check-unfinished-contracts.mjs` (U04), R8 `check-b3-gates.mjs` (L04), R14 `check-legacy-helper-boundaries.mjs` (X01-X03) | **已关闭 (PASS)** |
| **B05** | 既有合法历史格式转换，业务数据与凭据不变，无旧正文缓存，版本正确推进，重复执行和重开一致 | 支持 v1 旧库原子平滑升级至 v2：`schema_migrations` 推进至 2，全量业务数据、身份凭据与 token 保持不变，全量 JSON 结果安全转为 typed ref，正文缓存安全剥离，升级过程可重复执行且重开逻辑快照一致。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L442-520) | R6 `check-upgrade-boundaries.mjs` (H05-H10), R7 `check-legacy-fixture.mjs` (K01), R8 `check-b3-gates.mjs` (L02) | **已关闭 (PASS)** |
| **B06** | 第二条引用转换、metadata/版本提交前分别注入失败，整个升级拒绝并回滚，重开后无部分升级；U01 通过 | 在既有数据迁移转换的任意关键阶段（多条引用转换中间、metadata 写入前）注入失败，整个升级事务立即中止并完全回滚；重开库后逻辑快照证明无任何中间残留。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L522-590) | R4 `check-unfinished-contracts.mjs` (U01), R8 `check-b3-gates.mjs` (L02-3c, L05, L07) | **已关闭 (PASS)** |
| **B07** | 全部管理员凭据撤销/过期，actor 禁用，不当成新实例，不生成新 token/secret；U03 通过 | `instance_metadata.initialized` 持久化实例状态。管理员凭据全量失效或 actor 禁用时，库分类保持为 `current_initialized`，拒绝重新初始化，严禁签发新凭据或重写 secret。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L592-650) | R4 `check-unfinished-contracts.mjs` (U03), R5 `check-r4b-gaps.mjs` (G05-G07) | **已关闭 (PASS)** |
| **B08** | 空白库首次初始化失败与重试；旧库补 metadata：前者可安全重试且只生成一份初始材料；后者不增发凭据 | 空库 `init` 失败完全回滚，重试生成唯一初始管理员凭据；旧库升级安全回填 `instance_metadata`，保持既有凭据不变，不增发新凭据。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L652-720) | R5 `check-r4b-gaps.mjs` (G08-G09), R7 `check-b2-completeness.mjs` (J01-J07) | **已关闭 (PASS)** |
| **B09** | init 和真实 serve 遇到未来/未知/损坏结构，监听前拒绝，库逻辑结构和数据不变；成功路径走同一迁移入口 | 遇到未来版本（`version > 2`）、未知非空表结构或结构损坏（如缺少主键）时，在绑定 socket 监听前拒绝（403 `FORBIDDEN`），释放文件锁，库文件内容与结构分毫不变。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L722-800, B2-1~B2-8) | R3 `check-serve-version.mjs` (T11), R8 `check-b3-gates.mjs` (L01, L03, L08) | **已关闭 (PASS)** |
| **B10** | secret 缺失/读取或持久化异常，启动失败：稳定诊断，不使用临时 secret 服务请求，DB/锁可由下一次受控启动接管 | 缺失 `token_secret` 时拒绝启动并输出明确错误诊断，绝不降级使用内存临时密钥对外服务；文件锁正常释放，后续启动可无冲突接管。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L802-870) | R8 `check-b3-gates.mjs` (L01-2, L08) | **已关闭 (PASS)** |
| **B11** | 同 key 改 payload、不同目标同 key、竞争写入：冲突/作用域正确，唯一合法提交，并发用屏障/独立请求验证 | 同键不同 payload 返回 409 `IDEMPOTENCY_CONFLICT`；不同 actor、space 或 operation 独立隔离；并发竞争下严格保证单一成功写入与正确重放。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L872-950) | R8 `check-b3-gates.mjs` (L01-5, L02-3b), R9 `check-b4-1-acceptance.mjs` (N01-N05) | **已关闭 (PASS)** |
| **B12** | 已修好的权限/脱敏/ACK：原有正式测试和审查探针保持通过；U07/U08 通过 | 幂等重放强行重新执行鉴权与脱敏；原有的消费位点推进、批次 ACK 及脱敏墓碑不变量完整保持；历史回归探针全通。 | `tests/integration/m0-m1-r4-b-regression.test.ts` (L952-1020) | R4 `check-unfinished-contracts.mjs` (U07, U08), R1~R3 原 46 项全通 | **已关闭 (PASS)** |

---

## 4. U01–U08 状态核验

| 编号 | 检查内容 | 实际执行结果 | 归属与说明 |
|---|---|---|---|
| **U01** | 升级过程中第二条引用注入失败触发整体事务回滚 | **PASS** (退出码 0) | R4-B 范围，已闭环 |
| **U02** | 历史关系决议引用重放保真，不被后续相反操作篡改 | **PASS** (退出码 0) | R4-B 范围，已闭环 |
| **U03** | 管理员凭据全量失效后禁止作为新库重新初始化 | **PASS** (退出码 0) | R4-B 范围，已闭环 |
| **U04** | 损坏或未知 legacy payload 明确返回非成功 | **PASS** (退出码 0) | R4-B 范围，已闭环 |
| **U05** | 跨空间关系关联请求强行拒绝 | **FAIL** (预期退出码 1) | **明确归属后续 R4-C 范围**（非本包范围，保持原始失败事实） |
| **U06** | 截断流消费者边界推进与重放防线 | **FAIL** (预期退出码 1) | **明确归属后续 R4-C 范围**（非本包范围，保持原始失败事实） |
| **U07** | 幂等重放时动态重新评估调用者权限 | **PASS** (退出码 0) | R4-B 范围，已闭环 |
| **U08** | 幂等重放时动态过滤脱敏正文并返回墓碑 | **PASS** (退出码 0) | R4-B 范围，已闭环 |

---

## 5. 全量 22 项验证命令执行结果表

全部命令通过独立记录执行器执行，原始输出归档于 `commands.json` 与 `logs/` 目录：

| # | 命令标识 (Name) | 完整执行命令 | 退出码 | 关键验证结果与日志文件 |
|---|---|---|---|---|
| 1 | `pnpm-build` | `pnpm build` | 0 | 全工作区构建成功 (`logs/03-pnpm-build.stdout.txt`) |
| 2 | `pnpm-typecheck` | `pnpm typecheck` | 0 | TypeScript 0 错误 (`logs/04-pnpm-typecheck.stdout.txt`) |
| 3 | `pnpm-lint` | `pnpm lint` | 0 | 代码检查全绿 (`logs/05-pnpm-lint.stdout.txt`) |
| 4 | `pnpm-test-all` | `pnpm test:all` | 0 | **11 个测试文件，136/136 项测试全部通过** (B 组回归 72 项全部通过) (`logs/06-pnpm-test-all.stdout.txt`) |
| 5 | `probe-r1-behavior` | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | R01–R11 (15/15) 全部通过 (`logs/07-probe-r1-behavior.stdout.txt`) |
| 6 | `probe-r1-adapters` | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | A01–A05 (5/5) 全部通过 (`logs/08-probe-r1-adapters.stdout.txt`) |
| 7 | `probe-r2-remaining` | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | S01–S12 (12/12) 全部通过 (`logs/09-probe-r2-remaining.stdout.txt`) |
| 8 | `probe-r2-cli` | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | CLI (3/3) 全部通过 (`logs/10-probe-r2-cli.stdout.txt`) |
| 9 | `probe-r3-invariants` | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | T01–T10 (10/10) 全部通过 (`logs/11-probe-r3-invariants.stdout.txt`) |
| 10 | `probe-r3-serve-version` | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | T11 (1/1) 全部通过 (`logs/12-probe-r3-serve-version.stdout.txt`) |
| 11 | `probe-r4-unfinished-contracts` | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | **1** | U01–U04, U07, U08 通过；**仅 U05/U06 失败**（预期退出码 1，归属后续 R4-C） (`logs/13-probe-r4-unfinished-contracts.stdout.txt`) |
| 12 | `probe-r5-r4b-gaps` | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | G01–G09 (9/9) 全部通过 (`logs/14-probe-r5-r4b-gaps.stdout.txt`) |
| 13 | `probe-r6-upgrade-boundaries` | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | H01–H10 (10/10) 全部通过 (`logs/15-probe-r6-upgrade-boundaries.stdout.txt`) |
| 14 | `probe-r7-b2-completeness` | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | J01–J07 (7/7) 全部通过 (`logs/16-probe-r7-b2-completeness.stdout.txt`) |
| 15 | `probe-r7-legacy-fixture` | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | K01 (1/1) 全部通过 (`logs/17-probe-r7-legacy-fixture.stdout.txt`) |
| 16 | `probe-r8-b3-gates` | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | **L01–L08 (8/8) 全部通过 (L03 正式关闭！)** (`logs/18-probe-r8-b3-gates.stdout.txt`) |
| 17 | `probe-r9-b4-1-acceptance` | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | N01–N05 (5/5) 全部通过 (`logs/19-probe-r9-b4-1-acceptance.stdout.txt`) |
| 18 | `probe-r10-b4-2-boundaries` | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | P01–P06 (6/6) 全部通过 (`logs/20-probe-r10-b4-2-boundaries.stdout.txt`) |
| 19 | `probe-r11-validation-pipeline` | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | Q01–Q05 (5/5) 全部通过 (`logs/21-probe-r11-validation-pipeline.stdout.txt`) |
| 20 | `probe-r12-precheck-completeness` | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | V01–V05 (5/5) 全部通过 (`logs/22-probe-r12-precheck-completeness.stdout.txt`) |
| 21 | `probe-r13-legacy-input-presence` | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | W01–W03 (3/3) 全部通过 (`logs/23-probe-r13-legacy-input-presence.stdout.txt`) |
| 22 | `probe-r14-legacy-helper-boundaries` | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | **X01–X03 (3/3) 全部通过 (X03 正式关闭！)** (`logs/24-probe-r14-legacy-helper-boundaries.stdout.txt`) |

注：初期复现失败探针记录保留在 `logs/01-initial-check-legacy-helper-boundaries.*` (exit 1) 与 `logs/02-initial-check-b3-gates.*` (exit 1)。

---

## 6. R14-E01 勘误说明

1. **G/H/J/K 执行记录来源**：上一轮交付（R13）中，由于运行脚本配置遗漏，未在当时的 `commands.json` 中包含 G、H、J、K 四个脚本的执行日志。本次 R14-B.4-3 交付已通过 `run-all-22.mjs` 实际运行了全量 22 项验证命令，将 G（#12）、H（#13）、J（#14）、K（#15）完整包含在 `commands.json` 中，均以退出码 0 真实通过，绝不倒填历史记录。
2. **V01/V02 正式双入口覆盖补齐**：此前 V01/V02 测试停留在 helper 校验层。本轮在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中全面增补了正式的双入口测试：包含 Service 直接调用（`executeIdempotent`）与真实 Fastify HTTP POST 接口调用断言（返回规范 422 `RESYNC_REQUIRED`），并对迁移场景增加了损坏库重开逻辑快照比对断言。
3. **数据库快照对比等价性定义纠正**：此前交付描述中曾将 `unchanged_after_reopen` 错误表述为数据库文件“物理字节完全不变”。事实上，SQLite 重新打开时可能因 WAL 日志检查点或内部文件头时间戳刷新产生细微物理字节变化；测试中执行的判定实质为全库表结构与行数据的**逻辑快照深层比对（`captureLogicalSnapshot`）完全一致**。本交付报告予以纠正与澄清。

---

## 7. 涉及改动文件清单

经 `baseline-after.json` 与 `baseline-before.json` 比对，本轮代码改动严格限制于以下 5 个产品与测试文件：
1. `packages/core/src/services/idempotency-service.ts`（修复 X03 未来版本检查，完善降级前强校验）
2. `packages/storage-sqlite/package.json`（引入 `prebuild`、`check:schema`、`generate:schema`）
3. `packages/storage-sqlite/src/bootstrap.ts`（集成 `verifyDatabaseStructure`，完善 Fail-Fast 物理结构预检）
4. `packages/storage-sqlite/src/schema.ts`（定义 22 张表结构需求 `TableRequirement`，实现全量结构验证器）
5. `tests/integration/m0-m1-r4-b-regression.test.ts`（增补 V01/V02/X01–X03 双入口回归，增补 B2-1~B2-8 结构矩阵测试，测试数增至 72 项）

新增构建脚本：
- `packages/storage-sqlite/scripts/generate-schema.mjs`
- `packages/storage-sqlite/scripts/check-schema-sync.mjs`

文档同步更新：
- `docs/12-decisions.md`（归档 ADR-019：权威单一 DDL 来源与运行时结构预检）
- `docs/03-data-model.md`（记录 DDL 单一来源与结构校验规约）
- `docs/04-protocol.md`（记录降级前关系版本校验与结构预检协议）
- `docs/07-security-operations.md`（记录 Fail-Fast 物理结构防线与端口绑定前拒绝机制）
- `docs/progress.md`（记录 B.4-3 完成与 R4-B 全部闭环）
- `README.md`（更新当前开发状态摘要）

---

## 8. 边界与约束遵守声明

1. **严格遵守用户禁令**：绝对禁止并未使用、重新安装或启用 deepseek-brainstorm，未通过其脚本或任何入口进行操作。
2. **零副作用受控环境**：验证完全基于临时 SQLite 文件和合成身份；未修改用户全局 harness 配置，未外发网络请求，未调用外部模型，未触碰真实论坛数据。
3. **保留工作区历史**：未执行任何 `git reset`、`git clean` 或覆盖操作；完整保留历史 baseline、observed 记录与 `archive/pre-plan.original.md` 原字节。
4. **范围严格受限**：本轮到 B.4-3 顺利收口，原 B01–B12 全部就绪；未开始 R4-C（保持 U05/U06 真实失败），未触碰 M2.1 或真实宿主联调，等待独立复核。
