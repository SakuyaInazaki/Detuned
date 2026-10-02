# M0/M1-R4-B.4-2R2 交付报告：先验证原输入，准确恢复历史时间

## 1. 任务概述与交付边界

- **任务编号**: M0/M1-R4-B.4-2R2
- **目标**:
  - 关闭 [R11 独立复核](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/README.md) 中登记的两个关键缺陷：
    - **R11-F01**：损坏数据在完整校验前被改写或丢弃（对应探针 [`check-validation-pipeline.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs) 中的 **Q01、Q02、Q04**）。
    - **R11-F02**：历史 patch 借用主题创建时间（对应探针 [`check-validation-pipeline.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs) 中的 **Q03**）。
  - 严格保持合法正向对照 **Q05** 以及既有历史审查探针（P01–P06、N01–N05、L01/L02/L04–L08、J01–J07、K01、H01–H10、G01–G09、U01–U04/U07–U08、T01–T11、R1/R2）全部通过。
  - 完成 **R11-E01** 提出的勘误与测试覆盖要求：
    - 在正式回归套件 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 中对 `L02-3c` 实施单字段变异隔离对比与 `fullLogicalSnapshot` 断言。
    - 将 Q01–Q05 正式纳入集成测试套件，使正式测试总数由 112 项增至 117 项并全绿。
    - 勘误上轮交接中的历史编号与缺陷对应关系。
  - 在 [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md) 中记录架构决策 ADR-016，同步更新 [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md)、[`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md)、[`docs/progress.md`](file:///Users/sakimi/Desktop/Detuned/docs/progress.md) 与 [`README.md`](file:///Users/sakimi/Desktop/Detuned/README.md)。
- **交付边界与承诺**:
  - **不声明整个 R4-B 完成**：根据 [R8 remaining-work.md](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r8/remaining-work.md)，L03 结构预检、DDL 单一来源收敛及原 B01–B12 完整证据留待后续独立子包 **M0/M1-R4-B.4-3** 交付。
  - **不执行 R4-C**：U05（非法关系类型枚举拒绝）与 U06（截断 JSON 流拒绝）保持为已知待办契约缺陷，不改动其断言（探针预期退出码为 1）。
  - **不进入 M2.1**：对象存储附件、结构化失败记忆与评审流转保持待开始状态。
  - **不修改全局环境**：测试全过程仅使用自建临时 SQLite 数据库与合成凭据，所有执行过程均通过 `run-record.mjs` 完整留存至 `commands.json` 和 `logs/`。

---

## 2. 缺陷根因分析与代码实现

### 2.1 R11-F01 (Q01): 降级 unreplayable 前必须先验证原输入结构与实体存在性
- **根因**:
  - 之前的迁移器在处理历史引用时，一旦遇到 compact relation 数组或 ID-only 帖子引用，就过早判断并降级为 `unreplayable`。
  - 这导致原输入中存在的严重错误（如：帖子缺少必填 `revision` 字段、关系绑定的 `thread_id` 与实际帖子所属 `thread_id` 不符、或者实体在数据库中根本不存在）被降级逻辑静默跳过，伪造或损坏的数据逃脱了迁移事务的原子回滚。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中导出核心共享预检函数 `validateStoredResultRefPrecheck(ref, expectedSpaceId, storage)`：
     - 校验 `kind`、必填 ID 字段、`v === 1` 标识以及字段白名单（`allowedKeysByKind`）。
     - 针对 `post` 必须提供合法的正整数 `revision`；针对 `thread`，若包含 `initial_post`，必须提供正整数 `revision`。
     - 针对 `relations`，要求为数组，且每个关系必须包含合法 `relation_id`、`type`、正整数 `version`、合法 `state` 枚举、`source_post_id` 与 `target_post_id`，且不能出现重复 `relation_id`。
     - 通过 `StoragePort` 严格校验实体（空间、主题、帖子、关系）在数据库中的真实存在性，并核验 `thread_id` 归属绑定。
  2. 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：
     - 重构 `migrateSingleRef`，在判断是否进行 legacy 紧凑格式降级前，**首先**调用 `validateStoredResultRefPrecheck`。
     - 若预检失败，立即抛出异常中止迁移，触发整笔 SQLite 升级事务的原子回滚。

### 2.2 R11-F01 (Q02): 旧格式规范化器严禁非法默认值与隐式类型转换
- **根因**:
  - `normalizeLegacyResultRef` 在处理未声明或旧格式对象时，对非法的 revision 或 state 使用了宽松的默认值兜底（例如 `parseInt(...) || 1` 或 `=== 'resolved' ? 'resolved' : 'open'`）。
  - 这使得显式传入损坏值（如 `revision: 'not-a-revision'` 或 `state: 'not-a-state'`）的记录被清洗为合法数据，绕过了 422 `RESYNC_REQUIRED` 检查。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 的 `normalizeLegacyResultRef` 中：
     - 对 `revision` 施加严格校验：`typeof rev === 'number' && Number.isSafeInteger(rev) && rev > 0`。若传入了非法类型或非正整数，直接抛出 422 `RESYNC_REQUIRED`，严禁回退默认值 `1`。
     - 对 `state` 施加严格枚举校验：只能为 `'open'` 或 `'resolved'`。传入任何其他值均直接抛出 422 `RESYNC_REQUIRED`，严禁回退默认值 `'open'`。
     - 在 `thread.create` 规范化中增加历史主题版本可恢复性检查：若旧引用缺失 title 且当前数据库中找不到对应的历史版本，安全降级为 `unreplayable` 并记录原因 `historical_thread_version_unrecoverable`。

### 2.3 R11-F02 (Q03): 历史时间准确恢复，严禁借用创建时间作为修改时间
- **根因**:
  - `bootstrap.ts` 在迁移旧库回填 `thread_versions` 表时，对于 `version > 1` 的历史版本，如果缺少 `updated_at`，借用了 `threads.created_at` 作为版本时间戳。
  - 主题的 `created_at` 代表主题创建时刻（版本 1）。版本大于 1 是后续修改产生的，借用创建时间直接篡改了历史时序。
- **修复措施**:
  1. 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 的 `syncThreadVersion` 中：
     - 明确时序语义：版本 1 使用 `created_at`；版本大于 1 只能使用真实的 `updated_at`，绝对不借用 `created_at`。
     - 当历史版本为 `version > 1` 但 `updated_at` 缺失或与创建时间冲突，且无法从数据库已有记录证明其修改时刻时，抛出致命错误中止迁移，触发整笔迁移事务原子回滚。

### 2.4 R11-F01 (Q04): 编码器出口基于 11 个操作族强类型穷举校验
- **根因**:
  - `extractResultRef` 仅在检测到 `Array.isArray(result.relations)` 或 `result.initial_post` 为对象时才进行提取，使用了类似 `if (Array.isArray(...))` 的松散判定。
  - 当调用方传入结构损坏的可选字段（如 `relations: 'not-an-array'`，或 `initial_post: { post: {}, revision: 1 }`）时，编码器静默忽略了损坏字段并生成了残缺的引用。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：
     - 将 `extractResultRef` 按照 11 个标准操作族（`space.create`、`space.patch`、`thread.create`、`thread.patch`、`post.create`、`post.patch`、`relation.create`、`relation.resolve`、`membership.create`、`membership.patch`、`membership.delete`）进行 `switch(family)` 穷举覆盖。
     - 显式检查可选字段的存在性：使用 `'relations' in (result as any)` 和 `'initial_post' in (result as any)`。
     - 若字段存在但不符合严格规范（如 relations 不是数组、其中的 relation 结构残缺、initial_post 结构残缺等），立即抛出 400 `VALIDATION_ERROR`，严禁静默吞掉或生成残缺引用。

### 2.5 R11-E01: L02-3c 隔离快照与 Q01–Q05 正式回归
- **补充内容**:
  1. 在 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 中：
     - 针对 `L02-3c`，严格隔离单字段变异测试，并在事务回滚后对比 `fullLogicalSnapshot`，确保数据库结构与数据未发生任何泄漏。
     - 将 Q01–Q05（Q01: 预检实体绑定优先于降级; Q02: legacy 规范化严禁非法 revision/state 兜底; Q03: 禁止借用创建时间作为历史版本时间; Q04: 编码器 11 族严格结构校验拒绝畸形字段; Q05: 正常旧格式平滑降级与重放）正式作为套件用例运行。
     - 运行 `pnpm test:all`，11 个套件共 117 项正式测试全部通过。

---

## 3. 修改的文件清单

### 3.1 核心与存储实现
- [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts):
  - 实现并导出 `validateStoredResultRefPrecheck`，前置校验存储引用的结构、白名单、必填版本及实体存在性。
  - `normalizeLegacyResultRef` 杜绝非法 revision / state 的默认值回退，遇到非法值抛出 422 `RESYNC_REQUIRED`。
  - `extractResultRef` 按照 11 个操作族穷举，检查可选属性存在性，拒绝畸形字段并抛出 400 `VALIDATION_ERROR`。
- [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts):
  - `migrateSingleRef` 统一调用 `validateStoredResultRefPrecheck` 进行前置强校验。
  - `syncThreadVersion` 明确时序规则：version > 1 严禁借用 `created_at`，无法证实版本修改时间时原子回滚整笔迁移事务。

### 3.2 测试与回归套件
- [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts):
  - 增加 `L02-3c` 单字段变异隔离对比与 `fullLogicalSnapshot` 断言。
  - 增加 `Q01`–`Q05` 专属正式回归测试，测试总数由 112 增至 117。

### 3.3 文档与架构决策
- [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md):
  - 记录 ADR-016：前置强校验、11 族操作类型安全、杜绝非法默认值与严格历史时间恢复。
- [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md):
  - 更新 4.1 节，明确前置校验、版本时间戳不借用与编码器结构校验规则。
- [`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md):
  - 更新错误码说明，明确畸形输入与状态校验行为。
- [`docs/progress.md`](file:///Users/sakimi/Desktop/Detuned/docs/progress.md) & [`README.md`](file:///Users/sakimi/Desktop/Detuned/README.md):
  - 更新项目状态与进度记录，标注 B.4-2R2 完成与后续边界。

### 3.4 交付证据材料
- [`docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/baseline-before.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/baseline-before.json)
- [`docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/baseline-after.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/baseline-after.json)
- [`docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/commands.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/commands.json)
- [`docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/logs/`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/logs/) (包含全部命令的标准输出与标准错误日志)

---

## 4. 验证结果汇总表

| 验证项目 / 命令 | 对应编号 / 关注点 | 预期结果 | 实际执行结果 | 状态 | 记录日志 |
|---|---|---|---|---|---|
| `node .../check-validation-pipeline.mjs` | **Q01–Q05** (R11 关键缺陷探针) | 5 通过，0 失败 | **5 passed, 0 failed** | **PASS** | `logs/07-check-validation-pipeline.stdout.txt` |
| `npx vitest run tests/integration/m0-m1-r4-b-regression.test.ts` | **B01–B12 / L01–L08 / P01–P06 / Q01–Q05** (53 项) | 53 通过，0 失败 | **53 passed, 0 failed** | **PASS** | `logs/08-vitest-regression.stdout.txt` |
| `pnpm test:all` | 全套自动化测试 (11 个文件，117 项) | 117 通过，0 失败 | **117 passed, 0 failed** | **PASS** | `logs/09-pnpm-test-all.stdout.txt` |
| `pnpm typecheck` | 全工作区 TypeScript 类型检查 | 0 错误 | **0 errors (exit 0)** | **PASS** | `logs/02-typecheck.stdout.txt` |
| `pnpm lint` | 代码风格与 TypeScript 规范 (`tsc --noEmit`) | 0 错误 | **0 errors (exit 0)** | **PASS** | `logs/03-lint.stdout.txt` |
| `pnpm build` | 全工作区构建 | 0 错误 | **0 errors (exit 0)** | **PASS** | `logs/01-build.stdout.txt` |
| `node .../check-b4-2-boundaries.mjs` | **P01–P06** (R10 审查探针) | 6 通过，0 失败 | **6 passed, 0 failed** | **PASS** | `logs/24-probe-r10.stdout.txt` |
| `node .../check-b4-1-acceptance.mjs` | **N01–N05** (R9 验收探针) | 5 通过，0 失败 | **5 passed, 0 failed** | **PASS** | `logs/23-probe-r9.stdout.txt` |
| `node .../check-b3-gates.mjs` | **L01–L08** (R8 审查探针) | 7 通过，1 失败 (L03 归 B.4-3) | **7 passed, 1 failed (L03)** | **PASS (边界正确)** | `logs/22-probe-r8.stdout.txt` |
| `node .../check-b2-completeness.mjs` | **J01–J07** (R7 审查探针) | 7 通过，0 失败 | **7 passed, 0 failed** | **PASS** | `logs/20-probe-r7.stdout.txt` |
| `node .../check-legacy-fixture.mjs` | **K01** (真实旧 DDL 升级) | 1 通过，0 失败 | **1 passed, 0 failed** | **PASS** | `logs/21-probe-r7-fixture.stdout.txt` |
| `node .../check-upgrade-boundaries.mjs` | **H01–H10** (R6 审查探针) | 10 通过，0 失败 | **10 passed, 0 failed** | **PASS** | `logs/19-probe-r6.stdout.txt` |
| `node .../check-r4b-gaps.mjs` | **G01–G09** (R5 审查探针) | 9 通过，0 失败 | **9 passed, 0 failed** | **PASS** | `logs/18-probe-r5.stdout.txt` |
| `node .../check-unfinished-contracts.mjs` | **U01–U08** (R4 审查探针) | 6 通过，2 失败 (U05/U06 归 R4-C) | **6 passed, 2 failed (U05/U06)** | **PASS (边界正确)** | `logs/17-probe-r4.stdout.txt` |
| `node .../check-invariants.mjs` | **T01–T11** (R3 审查探针) | 10 通过，0 失败 | **10 passed, 0 failed** | **PASS** | `logs/15-probe-r3.stdout.txt` |
| `node .../check-serve-version.mjs` | R3 CLI serve 探针 | 1 通过，0 失败 | **1 passed, 0 failed** | **PASS** | `logs/16-probe-r3-serve.stdout.txt` |
| `node .../check-remaining.mjs` | R2 剩余检查探针 | 5 通过，0 失败 | **5 passed, 0 failed** | **PASS** | `logs/13-probe-r2.stdout.txt` |
| `node .../check-cli.mjs` | R2 CLI 探针 | 2 通过，0 失败 | **2 passed, 0 failed** | **PASS** | `logs/14-probe-r2-cli.stdout.txt` |
| `node .../check-behavior.mjs` | R1 行为探针 | 20 通过，0 失败 | **20 passed, 0 failed** | **PASS** | `logs/11-probe-r1-behavior.stdout.txt` |
| `node .../check-adapters.mjs` | R1 适配器探针 | 2 通过，0 失败 | **2 passed, 0 failed** | **PASS** | `logs/12-probe-r1-adapters.stdout.txt` |

---

## 5. 勘误与证据澄清 (R11-E01)

为避免后续交接与复核理解分歧，特此明确如下勘误：
1. **上轮报告探针编号对应关系澄清**:
   - `P03` 对应的是旧格式全量结果的在线投影与目标实体存在性校验，而非挂钟时间。
   - `P04` 对应的是缺失历史时间戳在迁移过程中的原子回滚校验，而非编码器。
   - `P05` 对应的是编码器出口防穿透与严格正整数/枚举校验，而非在线重建。
2. **前置补齐证据编号澄清**:
   - 上轮交接中提及的前置故障注入与契约补齐，其对应审查轮次为 **R9-E01/R9-E02**，已在 B.4-1 期间作为先行测试固定。
3. **未完成契约编号澄清**:
   - `U05` 对应非法关系类型枚举拒绝（待 R4-C 处理）。
   - `U06` 对应截断 JSON 请求流拒绝（待 R4-C 处理）。
4. **代码检查命令说明**:
   - 根目录 `package.json` 中的 `pnpm lint` 脚本映射为 `pnpm --filter @detuned/core typecheck && pnpm --filter @detuned/storage-sqlite typecheck && pnpm --filter @detuned/cli typecheck`（即严格的 `tsc --noEmit` 类型与规范核验）。

---

## 6. 后续边界与未完成工作

根据实施路线与各阶段明确边界：
1. **后续任务包 M0/M1-R4-B.4-3**:
   - 解决 R8-F05（L03 启动时结构预检阻断破坏性升级）。
   - 收敛 DDL 单一来源定义。
   - 补齐并固化原 B01–B12 要求的全部可靠性证据。
2. **待办契约缺陷 R4-C**:
   - 关闭 U05（非法关系类型枚举显式拒绝）。
   - 关闭 U06（截断 JSON 流与异常连接处理）。
3. **M2.1 就绪条件**:
   - 必须等待 R4-B 与 R4-C 均完成正式审查验收后方可进入。
