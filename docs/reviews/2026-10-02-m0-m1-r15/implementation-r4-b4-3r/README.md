# M0/M1-R4-B.4-3R：完成结构判定、迁移 DDL 复用与真实验收证据交付报告

- **日期**: 2026-10-02
- **工作目录**: `/Users/sakimi/Desktop/Detuned`
- **Git HEAD**: `71aefc1839a59f79ad9b6c48af42e36ff49f781a` (工作区含多轮未提交工作，已完整保留)
- **审查输入**: [docs/reviews/2026-10-02-m0-m1-r15/README.md](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/README.md)
- **任务目标**: 关闭 R15-F01、R15-F02、R15-F03 及交付说明缺陷 R15-E01；实现真实空库与残存初始化材料区分、排查结构与迁移记录矛盾、深入语义级结构预检（非 Partial 索引/外键动作/FTS5 虚拟表）、迁移 DDL 常量单源复用、B01 全量 11 操作族持久回放与 B01–B12 真实映射证据；全量执行 24 项验证命令矩阵。

---

## 1. 基线指纹与差异核对

在工作开始与结束时分别捕获工作区指纹，与 R15 [baseline.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/baseline.json)（85 个产品、测试与构建脚本文件）核对：

- **[baseline-before.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/baseline-before.json)**: 起始指纹与 R15 baseline **0 不匹配**，证明代码输入完全一致。
- **[baseline-after.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/baseline-after.json)**: 交付指纹与 R15 baseline 仅有精确的 **7 个目标文件变更**，无任何附带无关变更或误回退：
  1. [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts): B01 11 操作族重放支持，为 `post.create` / `post.revision` 空关联提供精确空数组保真重放。
  2. [`packages/storage-sqlite/scripts/generate-schema.mjs`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/generate-schema.mjs): 从 `schema.sql` 自动提取并导出 3 个迁移 DDL 常量。
  3. [`packages/storage-sqlite/scripts/check-schema-sync.mjs`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/check-schema-sync.mjs): 强制核验 `schema.sql` 与 `schema.ts`（包含 `SCHEMA_SQL` 及 3 个迁移 DDL 常量）完全一致。
  4. [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts): `classifyDatabase` 落实残存材料与迁移矛盾判定；`applyMigrations` 使用导出的单源迁移常量；corrupt 错误信息规范。
  5. [`packages/storage-sqlite/src/schema.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/schema.ts): 增加外键动作校验、非 Partial 索引与 UNIQUE 校验、FTS5 虚拟表校验，导出 3 个单源迁移 DDL 常量。
  6. [`packages/storage-sqlite/tests/storage.test.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/storage.test.ts): 增强升级库与全新库的全面物理/语义 DDL 对称性测试（`index_xinfo` 与虚拟表）。
  7. [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts): B01 覆盖 11 操作族持久回放、B06 使用 G03 触发器拦截器、B08 重开重试、B2-3/4/5 补齐重开快照不变性断言、新增 Y01–Y04 正式测试套件。

---

## 2. 关键缺陷关闭与技术实现 (R15-F01, F02, F03, E01)

### 2.1 区分空库与残存初始化材料、排查历史迁移矛盾 (R15-F01 / Y02, Y03)

- **根因**: 旧版 `classifyDatabase` 在 `schema_migrations` 表存在但记录为空（`appliedVersions.length === 0`）时，未检查 `instance_metadata`，导致含有已有 secret 和 `initialized=true` 的残余库被误判为 `blank`，进而调用 `bootstrap` 导致重新签发 admin token 并覆写 secret；在库中含有 v2 独有的 `thread_versions` 表但缺少版本 2 迁移记录时，未识别该结构矛盾，试图在 `applyMigrations` 中自动修补版本 2。
- **实现**:
  - 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：
    1. 当 `appliedVersions.length === 0` 时，检查 `instance_metadata` 表。若包含任何行（特别是 `initialized='true'` 或 `token_secret`），判定为 `corrupt`（"数据库包含持久化初始化材料（instance_metadata）但缺失迁移记录与管理员主体"），绝不分类为 `blank`。
    2. 增加结构与迁移矛盾检查：若 `!appliedVersions.includes(2) && tableSet.has('thread_versions')`，判定为 `corrupt`（"数据库结构与迁移记录矛盾（包含 v2 的 thread_versions 表但缺失版本 2 迁移记录）"），绝不在升级中自动修补。
    3. `bootstrapDatabase`、`openAndCoordinateDatabase('init')`、`openAndCoordinateDatabase('serve')` 及 CLI `init`、`serve` 对此类损坏库均直接报错 403 `FORBIDDEN`，释放文件锁且库文件快照保持 100% 不变。
- **证据**:
  - `docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` 中的 **Y02** 与 **Y03** 全部通过。
  - 正式测试套件中 Y02 与 Y03 测试全部通过。

### 2.2 物理与语义级完整结构预检 (R15-F02 / Y01 4 项变体)

- **根因**: 旧版 `verifyTableStructure` 仅检查了索引列名列表，未校验 SQLite 索引的 `partial` 属性（即带有 `WHERE` 谓词的 partial index），使得 `CREATE UNIQUE INDEX ... WHERE 0` 可伪装成 UNIQUE 约束；未校验外键定义的 `on_update` / `on_delete` 动作，使得 `ON DELETE CASCADE` 未被检测；未校验 `post_fts` 是否为合法的 `fts5` 虚拟表，使得普通表可伪装 FTS5。
- **实现**:
  - 在 [`packages/storage-sqlite/src/schema.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/schema.ts) 中：
    1. **非 Partial 索引与 UNIQUE 校验**: 利用 `PRAGMA index_list(tableName)` 的 `partial` 属性，要求所有必需全量 UNIQUE 约束与显式索引（如 `idx_events_space_seq`）必须为 `partial === 0`。若存在 `WHERE` 谓词（如 `WHERE 0` 或 `WHERE seq < 0`），判定为不匹配并报错。
    2. **外键更新/删除动作校验**: 利用 `PRAGMA foreign_key_list(tableName)` 校验 `on_update` 与 `on_delete` 必须与定义的默认值 `'NO ACTION'` 严格一致，拒绝未经授权的 `ON DELETE CASCADE`。
    3. **FTS5 虚拟表校验**: 从 `sqlite_master` 提取 `post_fts` 的 DDL，严格校验必须以 `CREATE VIRTUAL TABLE post_fts USING fts5` 开头，且包含指定的列定义与 `tokenize="trigram"` 配置，普通数据表直接拒绝。
  - 保持全部 5 项健康对照（Y04）：空文件、裸 v2 DDL 库、裸 v1 DDL 库、真实 v1 历史实例及健康 v2 实例均正常启动。
- **证据**:
  - `docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` 中的 **Y01**（4 种变体）与 **Y04**（5 种健康对照）全部通过。
  - 正式测试套件中 Y01 与 Y04 测试全部通过。

### 2.3 迁移 DDL 单源复用与结构对称性验证 (R15-F03)

- **根因**: `bootstrap.ts` 的 `applyMigrations` 中包含手写硬编码的建表 DDL（`schema_migrations`、`instance_metadata`、`thread_versions`），未与权威 `schema.sql` 共享定义；测试套件中的迁移对称性断言缺少深度 `index_xinfo` 与虚拟表比对。
- **实现**:
  - 在 [`packages/storage-sqlite/scripts/generate-schema.mjs`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/generate-schema.mjs) 中从 `schema.sql` 解析生成三个命名常量：`SCHEMA_MIGRATIONS_DDL`、`INSTANCE_METADATA_DDL` 与 `THREAD_VERSIONS_DDL`，并导出至 `schema.ts`。
  - 在 [`packages/storage-sqlite/scripts/check-schema-sync.mjs`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/check-schema-sync.mjs) 中加入对上述 3 个常量的同步校验，集成至 `prebuild` 与 `lint`。
  - 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中重构 `applyMigrations`，完全使用导出的命名常量执行建表。
  - 在 [`packages/storage-sqlite/tests/storage.test.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/storage.test.ts) 中增强测试，通过 `PRAGMA index_xinfo` 全面对比全新库与升级库的索引列、排序、唯一性、partial 状态及 `post_fts` 虚拟表 DDL，证实迁移与基线完全对称。
- **证据**:
  - `docs/reviews/2026-10-02-m0-m1-r15/check-ddl-build.mjs` 测试通过。
  - `pnpm lint` 中的 `check-schema-sync.mjs` 执行通过。
  - `packages/storage-sqlite/tests/storage.test.ts` 全面对称性测试通过。

### 2.4 B01 全量 11 操作族持久回放与真实验收矩阵 (R15-E01)

- **根因**: 历史报告曾提及不存在的伪操作（如 `decision.publish`, `evidence.attach`, `export.create`）；B01 未覆盖全部真实 11 操作族且未在关闭后重开库执行解码回放；B06 测试固件在升级前预创建了 `thread_versions` 表导致过早触发结构损坏拦截；B08 重试未在重开库上执行；B2-3/4/5 缺少重开快照不变性断言。
- **实现**:
  - **纠正勘误**: 确认系统实际支持且已实现的所有 11 个操作族为：`space.create`、`space.patch`、`thread.create`、`thread.patch`、`post.create`、`post.revision`、`post.withdraw`、`relation.create`、`relation.resolve`、`relation.reopen`、`admin.redaction`。报告不再声称不存在的虚构操作。
  - **B01 全量测试**: 为 11 个操作提供独立实体操作上下文，验证初次写入、同连接重放结果深度完全一致、零副作用（事件行数与幂等记录行数完全未变）、以及数据库完全 `close()` 并重新通过 `new Database(dbPath)` 从磁盘打开后的持久解码回放一致性。
  - **B06 固件调整**: 遵循 R5 G03 规范，在升级前不预建 `thread_versions` 表；通过包装 `database.exec` 拦截 `CREATE TABLE IF NOT EXISTS thread_versions` 并动态安装 TEMP 触发器 `fail_thread_history`，验证触发器命中 1 次（`faultHits === 1`）、`bootstrapDatabase` 捕获异常（`threw === true`）、事务完整回滚（`schema_migrations` 最大版本为 1），且重开数据库后 `fullLogicalSnapshot` 与升级前完全深度一致。
  - **B08 真实重试**: 在触发器失败回滚后，显式调用 `freshDb.close()` 并以 `new Database(freshDbPath)` 从磁盘重新打开，验证重开后的干净初始化与仅签发 1 次凭据。
  - **B2-3, B2-4, B2-5 快照不变性**: 在每次非法变更被拒绝后，显式关闭连接并从磁盘重新打开，断言 `fullLogicalSnapshot` 与损坏前完全一致。

---

## 3. B01–B12 真实映射与验收矩阵

| 编号 | 子条件与验收规范 | 状态 | 正式测试位置 | 可复跑独立探针 |
|---|---|---|---|---|
| **B01** | 全量 11 操作族编码为 `v: 1` 引用；同连接回放深度一致；事件/幂等表行数零增长；关闭重开后持久解码回放深度一致；未知操作拒绝 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:107` | `check-validation-pipeline.mjs` (Q05) |
| **B02** | 主题修改、关系解决/重开、帖子脱敏后重放保留原版本与状态；关闭重开后重放保留原值；未脱敏正文不泄露 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:252` | `check-r4b-gaps.mjs` (G01) |
| **B03** | 旧版 `$ref: 'relation'` 经升级后在后续重开中稳定保留操作版本，不随当前状态漂移 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:342` | `check-r4b-gaps.mjs` (G02) |
| **B04** | 未知 kind、未知版本（v: 0, v: 99）、缺失关键字段、操作族与目标不符、以及包含违禁缓存正文的引用，统一以 422 `RESYNC_REQUIRED` 拒绝 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:419` | `check-r4b-gaps.mjs` (G06) |
| **B05** | 历史全量 JSON 响应与直接实体形态（旧 relation/withdraw）迁移为最小有类型引用，移除缓存正文并保留业务数据 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:451` | `check-r4b-gaps.mjs` (G07) |
| **B06** | 迁移过程中历史表插入触发写入故障（真实触发器），事务完整原子回滚，版本维持为 1，重开后全库逻辑快照完全不变 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:531` | `check-r4b-gaps.mjs` (G03) |
| **B07** | 凭据全量吊销、全部过期或管理员被禁用后，已初始化状态不变，重新 bootstrap 绝不增发新 admin token，密钥保持不变 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:585` | `check-unfinished-contracts.mjs` (U03) |
| **B08** | 空库初次初始化遇故障原子回滚，重开后干净重试成功并仅发 1 次凭据；受支持旧 v1 库升级不增发新凭据 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:631` | `check-r4b-gaps.mjs` (G08) |
| **B09** | `openAndCoordinateDatabase` 在执行任何 DDL 变更或监听前，严格拒绝未来版本（v999）与未知非空库，库保持未变 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:675` | `check-r4b-gaps.mjs` (G05) |
| **B10** | `getInstanceSecret` 在密钥缺失时直接抛错，拒绝生成随机临时 secret；`openAndCoordinateDatabase` init/serve 均拒绝 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:725` | `check-upgrade-boundaries.mjs` (H10) |
| **B11** | 相同幂等键被修改 Payload 触发 409 `IDEMPOTENCY_CONFLICT`；并发相同请求成功；不同 space 相同 key 独立作用 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:743` | `check-upgrade-boundaries.mjs` (H06) |
| **B12** | 脱敏审计覆盖超长分页历史修订；脱敏执行故障时事件与业务原子回滚 | **通过** | `tests/integration/m0-m1-r4-b-regression.test.ts:787` | `check-unfinished-contracts.mjs` (U07) |

---

## 4. 全量 24 项验证命令矩阵执行结果

全部 24 项命令通过 [`run-all-24.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/run-all-24.mjs) 真实执行并由 [`run-record.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/run-record.mjs) 记录标准输出与错误输出到 [`logs/`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/)：

| # | 命令名称 | 命令行 | 退出码 | 结果与摘要 | 日志引用 |
|---|---|---|---|---|---|
| 1 | `pnpm-build` | `pnpm build` | 0 | 通过；9 个工作区模块全量编译成功 | [01-pnpm-build.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/01-pnpm-build.stdout.txt) |
| 2 | `pnpm-typecheck` | `pnpm typecheck` | 0 | 通过；0 错误 | [02-pnpm-typecheck.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/02-pnpm-typecheck.stdout.txt) |
| 3 | `pnpm-lint` | `pnpm lint` | 0 | 通过；包含 schema 同步校验通过 | [03-pnpm-lint.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/03-pnpm-lint.stdout.txt) |
| 4 | `pnpm-test-all` | `pnpm test:all` | 0 | **140/140 全部通过** (11 个测试文件，B 回归 76 项) | [04-pnpm-test-all.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/04-pnpm-test-all.stdout.txt) |
| 5 | `probe-r1-behavior` | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 全部通过 | [05-probe-r1-behavior.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/05-probe-r1-behavior.stdout.txt) |
| 6 | `probe-r1-adapters` | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5 全部通过 | [06-probe-r1-adapters.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/06-probe-r1-adapters.stdout.txt) |
| 7 | `probe-r2-remaining` | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 全部通过 | [07-probe-r2-remaining.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/07-probe-r2-remaining.stdout.txt) |
| 8 | `probe-r2-cli` | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3 全部通过 | [08-probe-r2-cli.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/08-probe-r2-cli.stdout.txt) |
| 9 | `probe-r3-invariants` | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 全部通过 | [09-probe-r3-invariants.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/09-probe-r3-invariants.stdout.txt) |
| 10 | `probe-r3-serve-version` | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1/1 全部通过 | [10-probe-r3-serve-version.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/10-probe-r3-serve-version.stdout.txt) |
| 11 | `probe-r4-unfinished-contracts` | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8；仅 U05/U06 失败（符合预期，归属后续 R4-C） | [11-probe-r4-unfinished-contracts.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/11-probe-r4-unfinished-contracts.stdout.txt) |
| 12 | `probe-r5-r4b-gaps` | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 9/9 全部通过 (G01–G09) | [12-probe-r5-r4b-gaps.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/12-probe-r5-r4b-gaps.stdout.txt) |
| 13 | `probe-r6-upgrade-boundaries` | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 10/10 全部通过 (H01–H10) | [13-probe-r6-upgrade-boundaries.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/13-probe-r6-upgrade-boundaries.stdout.txt) |
| 14 | `probe-r7-b2-completeness` | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 7/7 全部通过 (J01–J07) | [14-probe-r7-b2-completeness.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/14-probe-r7-b2-completeness.stdout.txt) |
| 15 | `probe-r7-legacy-fixture` | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 1/1 全部通过 (K01) | [15-probe-r7-legacy-fixture.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/15-probe-r7-legacy-fixture.stdout.txt) |
| 16 | `probe-r8-b3-gates` | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | **8/8 全部通过 (L01–L08，L03 已关闭)** | [16-probe-r8-b3-gates.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/16-probe-r8-b3-gates.stdout.txt) |
| 17 | `probe-r9-b4-1-acceptance` | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 5/5 全部通过 (N01–N05) | [17-probe-r9-b4-1-acceptance.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/17-probe-r9-b4-1-acceptance.stdout.txt) |
| 18 | `probe-r10-b4-2-boundaries` | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 6/6 全部通过 (P01–P06) | [18-probe-r10-b4-2-boundaries.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/18-probe-r10-b4-2-boundaries.stdout.txt) |
| 19 | `probe-r11-validation-pipeline` | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 5/5 全部通过 (Q01–Q05) | [19-probe-r11-validation-pipeline.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/19-probe-r11-validation-pipeline.stdout.txt) |
| 20 | `probe-r12-precheck-completeness` | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 5/5 全部通过 (V01–V05) | [20-probe-r12-precheck-completeness.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/20-probe-r12-precheck-completeness.stdout.txt) |
| 21 | `probe-r13-legacy-input-presence` | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 3/3 全部通过 (W01–W03) | [21-probe-r13-legacy-input-presence.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/21-probe-r13-legacy-input-presence.stdout.txt) |
| 22 | `probe-r14-legacy-helper-boundaries` | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 3/3 全部通过 (X01–X03) | [22-probe-r14-legacy-helper-boundaries.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/22-probe-r14-legacy-helper-boundaries.stdout.txt) |
| 23 | `probe-r15-structural-boundaries` | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | **4/4 全部通过 (Y01, Y02, Y03, Y04)** | [23-probe-r15-structural-boundaries.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/23-probe-r15-structural-boundaries.stdout.txt) |
| 24 | `probe-r15-ddl-build` | `node docs/reviews/2026-10-02-m0-m1-r15/check-ddl-build.mjs` | 0 | **通过** (独立构建与运行时无源码验证) | [24-probe-r15-ddl-build.stdout.txt](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/logs/24-probe-r15-ddl-build.stdout.txt) |

**汇总统计**: 24 项命令中，23 项 exit 0，1 项 exit 1（明确为未开始的 R4-C 范围 U05/U06）。

---

## 5. 遵守约束与边界声明

1. **严格遵守禁令**: 未使用、重新安装或启用 `deepseek-brainstorm`，未通过脚本或其他入口调用该流程。
2. **测试与环境隔离**: 所有测试均在自建临时 SQLite 数据库（`mkdtempSync`）与合成身份（synthetic admin/token）下运行，未读取或修改真实生产数据。
3. **保持未提交工作**: 工作区基于 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 历史累积修改，未执行 `git reset`、`git clean` 或 `git checkout`，完整保留了所有旧审查脚本、基线与交付日志。
4. **工作范围控制**:
   - 本轮完整关闭了 B.4-3R 要求的全部缺陷与验收缺口。
   - **未开始 R4-C**（U05 跨空间关系拒绝、U06 截断流处理保持为待办）。
   - **未开始 M2** 或外部宿主联调。
   - 现正式交回独立复核！
