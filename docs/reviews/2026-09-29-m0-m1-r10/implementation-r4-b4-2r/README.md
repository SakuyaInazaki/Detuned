# M0/M1-R4-B.4-2R 交付报告：统一验证入口并完成历史结果保真

## 1. 任务概述与交付边界

- **任务编号**: M0/M1-R4-B.4-2R
- **目标**:
  - 关闭 [R10 审查](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r10/README.md) 中登记的四个关键缺陷 **R10-F01–F04**（对应探针 [`check-b4-2-boundaries.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs) 中的 **P01–P05**）。
  - 严格保持合法正向对照 **P06** 以及既有历史修复（N01–N05、L01/L02/L04–L08、J01–J07、K01、H01–H10、G01–G09 等）全部通过。
  - 在正式回归测试套件 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 中补齐缺失的断言：为 L02-3c、L05、L07 补齐完整数据库逻辑快照回滚对比；为 L06 补齐真实 Fastify HTTP 在线重放校验；并补齐 P01–P05 专属测试。
  - 在 [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md) 归档 ADR-015，同步更新 [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md) 与 [`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md)。
- **交付边界与承诺**:
  - **不声明整个 R4-B 完成**：根据 [R8 remaining-work.md](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r8/remaining-work.md)，L03 结构预检、DDL 单一来源收敛及原 B01–B12 完整证据留待后续独立子包 **M0/M1-R4-B.4-3** 交付。
  - **不执行 R4-C**：U05（跨空间关系校验拒绝）与 U06（截断流处理）保持为已知待办缺陷，不改动其断言。
  - **不进入 M2.1**：对象存储附件、结构化失败记忆与评审流转保持待开始状态。
  - **不修改全局环境**：测试全过程仅使用临时内存/临时文件 SQLite 数据库与合成凭据，所有执行过程均通过 `run-record.mjs` 完整留存至 `commands.json` 和 `logs/`。

---

## 2. 缺陷根因分析与代码实现

### 2.1 R10-F01 (P01): 嵌套关联关系历史版本强校验与实体所属绑定
- **根因**:
  - 先前的 `validateResultRefSemantics` 对嵌套 relations 仅核验了 relation 记录在 relations 表中的存在性，未校验其所属的 `source_post_id`、`source_revision`、`target_post_id` 是否位于当前 space 内。
  - 校验器未核验传入的 `version` 和 `state` 是否与该版本决议历史真实一致，造成不一致版本或伪造状态绕过。
- **修复措施**:
  1. 在 [`packages/core/src/ports/storage.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/ports/storage.ts) 中增加 `findRelationResolutionByVersion(relationId: string, version: number): RelationResolution | null` 端口定义，并在 [`packages/storage-sqlite/src/sqlite-storage.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/sqlite-storage.ts) 中实现，精准查询不可变历史决议。
  2. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中实现 `validateSemanticsForNestedRelations`:
     - 校验 `relation.space_id === spaceId`、`relation.source_post_id === expectedPostId`、`relation.source_revision === expectedPostRevision`。
     - 校验目标帖子存在于同一 space，且修订版本合法存在。
     - 校验版本上界 `r.version <= rel.version`。
     - 校验版本 1 初始状态（`challenges` 必须为 `'open'`，`supports` 必须为 `'resolved'`）。
     - 当 `1 < r.version < rel.version` 时，通过 `findRelationResolutionByVersion` 检查历史决议动作与版本；若状态不匹配，立即抛出 422 `RESYNC_REQUIRED`。

### 2.2 R10-F02 (P02): 编码器出口与迁移严格前置校验
- **根因**:
  - `extractResultRef` 针对非法的非安全整数或非枚举状态进行了默认值回退（如 `version ?? 1`、`state ?? 'open'`），掩盖了上游业务层逻辑缺陷。
  - `bootstrap.ts` 迁移器在将旧引用转换为 `unreplayable` 之前，未前置校验既有 `v === 1` 引用的结构合法性（包括 forbidden content、kind-op 不匹配、多余未声明键、重复 relation_id 等），使伪造结构逃脱了整笔迁移事务回滚。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：
     - `extractResultRef` 严格要求安全正整数（`Number.isSafeInteger(v) && v > 0`）与合法枚举状态（`'open'` | `'resolved'`），发现非法直接抛出 400 `VALIDATION_ERROR`，杜绝任何静默修正。
     - 导出 `allowedKeysByKind` 共享白名单。
     - `executeIdempotent` 在事务内提交前，对新生成的 `IdempotencyResultRef` 同步调用 `validateResultRef` 与 `validateResultRefSemantics`，保证进入持久化的引用必定合法。
  2. 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：
     - `migrateSingleRef` 对 `v === 1` 引用实施前置结构校验，遇到 forbidden content、字段白名单越界、kind 与 op 不匹配、targetId 不匹配、非安全整数或重复 relation_id 时，直接抛出异常触发数据库迁移事务原子回滚。

### 2.3 R10-F03 (P03, P04): 旧格式在线重放路径与投影统一
- **根因**:
  - 旧版全量 JSON 结果的在线重放保留了一套单独的分支逻辑，未与当前规范的 `IdempotencyResultRef` 验证/重建逻辑对齐，导致旧格式重放路径出现行为分叉；且对旧格式中的伪造实体缺少语义过滤。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：
     - 在 `normalizeLegacyResultRef` 中统一支持包外壳格式（`{ thread: { id, ... } }`）与直接实体格式（`{ id, space_id, title, ... }`），统一映射为标准的 `IdempotencyResultRef`。
     - 在 `reconstructResult` 中，全面收口至：无论输入为新引用还是旧格式结果，一律先规范化为 `IdempotencyResultRef`，然后统一委托给 `reconstructFromValidRef` 并执行 `validateResultRefSemantics`。
     - 彻底消除 legacy 在线重建与 typed 重建的分叉，统一了历史实体的投影与语义核验。

### 2.4 R10-F04 (P05): 彻底消除挂钟时间伪造，历史冲突强原子回滚
- **根因**:
  - `bootstrap.ts` 在迁移旧库回填 `thread_versions` 表时，在缺失历史时间戳处回退使用了 `new Date().toISOString()` 挂钟时间，导致多次迁移运行产生的指纹不确定，违反了历史保真与快照一致性要求。
- **修复措施**:
  1. 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：
     - 彻底移除所有 `new Date().toISOString()` 挂钟时间回退代码。
     - 当无法从当前实体真实状态证明历史时间戳时，直接抛出异常中止迁移，触发整笔升级事务原子回滚。

### 2.5 R10-E01 / R10-E02 / R10-E03: 补齐缺失的正式回归与在线断言
- **补充内容**:
  1. 在 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 中：
     - 为 `L02-3c`、`L05`、`L07` 补齐了 `fullLogicalSnapshot` 对比，断言在迁移失败触发回滚后，整个数据库的表结构与数据行严格还原为初始状态，无任何残留写入。
     - 为 `L06` 补齐了真实 Fastify HTTP 在线重放断言，验证跨实体引用损坏时在线接口返回结构化 422 `RESYNC_REQUIRED`。
     - 增加了 P01–P05 的专属测试用例（覆盖嵌套关系所属、编码器防穿透、旧格式统一投影、旧格式分叉消除、挂钟时间禁止等），确认在当前代码下稳定通过。

---

## 3. 修改的文件清单

### 3.1 核心与存储实现
- [`packages/core/src/ports/storage.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/ports/storage.ts):
  - 增加 `findRelationResolutionByVersion` 接口方法。
- [`packages/storage-sqlite/src/sqlite-storage.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/sqlite-storage.ts):
  - 实现 `findRelationResolutionByVersion` 查询。
- [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts):
  - 导出 `allowedKeysByKind` 白名单。
  - 实现 `validateSemanticsForNestedRelations` 强校验嵌套 relations 的空间所属、源目标匹配、版本单调性与历史决议状态。
  - `extractResultRef` 移除默认值回退，施加严格正整数与状态枚举校验。
  - `executeIdempotent` 事务提交前强断言 `validateResultRef` 与 `validateResultRefSemantics`。
  - `reconstructResult` 将旧版 JSON 格式统一规范化为 `IdempotencyResultRef` 后委托给 `reconstructFromValidRef`，彻底消灭分叉。
- [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts):
  - `migrateSingleRef` 对 `v === 1` 引用实施前置结构校验，杜绝非法引用绕过。
  - 移除所有 `new Date().toISOString()` 挂钟时间伪造，无法证明历史时间时原子回滚。

### 3.2 测试与回归套件
- [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts):
  - 补齐 `L02-3c`、`L05`、`L07` 完整逻辑快照对比。
  - 补齐 `L06` 真实 Fastify 在线 HTTP 重放断言。
  - 增加 P01–P05 专属回归用例（总测试数由 43 提升至 48，全部通过）。

### 3.3 文档与架构决策
- [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md):
  - 记录 ADR-015：统一验证入口、严格编码器、嵌套关系历史验证与消除挂钟时间回退。
- [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md):
  - 更新 4.1 节，明确关系历史版本与决议动作绑定规则、严格正整数与状态校验。
- [`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md):
  - 完善 422 `RESYNC_REQUIRED` 协议说明与语义约束。
- [`README.md`](file:///Users/sakimi/Desktop/Detuned/README.md) & [`docs/progress.md`](file:///Users/sakimi/Desktop/Detuned/docs/progress.md):
  - 更新项目状态与阶段概览，完整记录 B.4-2R 的交付成果与后续边界。

### 3.4 交付证据材料
- [`docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/baseline-before.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/baseline-before.json)
- [`docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/baseline-after.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/baseline-after.json)
- [`docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/commands.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/commands.json)
- [`docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/logs/`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/logs/) (包含全部命令的标准输出与标准错误日志)

---

## 4. 验证结果汇总表

| 验证项目 / 命令 | 对应编号 / 关注点 | 预期结果 | 实际执行结果 | 状态 | 记录日志 |
|---|---|---|---|---|---|
| `node .../check-b4-2-boundaries.mjs` | **P01–P06** (R10-F01–F04) | 6 通过，0 失败 | **6 passed, 0 failed** | **PASS** | `logs/09-probe-b4-2-final.stdout.txt` |
| `npx vitest run tests/integration/m0-m1-r4-b-regression.test.ts` | **B01–B12 / L01–L08 / P01–P05** (48 项) | 48 通过，0 失败 | **48 passed, 0 failed** | **PASS** | `logs/08-vitest-regression-2.stdout.txt` |
| `pnpm test:all` | 全套自动化测试 (11 个文件，112 项) | 112 通过，0 失败 | **112 passed, 0 failed** | **PASS** | `logs/10-pnpm-test-all.stdout.txt` |
| `pnpm typecheck` | 全工作区 TypeScript 类型检查 | 0 错误 | **0 errors (exit 0)** | **PASS** | `logs/11-typecheck.stdout.txt` |
| `pnpm lint` | 代码风格与 ESLint 规范 | 0 错误 | **0 errors (exit 0)** | **PASS** | `logs/12-lint.stdout.txt` |
| `node .../check-b4-1-acceptance.mjs` | **N01–N05** (R9 验收探针) | 5 通过，0 失败 | **5 passed, 0 failed** | **PASS** | `logs/21-probe-r9.stdout.txt` |
| `node .../check-b3-gates.mjs` | **L01–L08** (R8 审查探针) | 7 通过，1 失败 (L03 归 B.4-3) | **7 passed, 1 failed (L03)** | **PASS (边界正确)** | `logs/20-probe-r8.stdout.txt` |
| `node .../check-b2-completeness.mjs` | **J01–J07** (R7 审查探针) | 7 通过，0 失败 | **7 passed, 0 failed** | **PASS** | `logs/18-probe-r7.stdout.txt` |
| `node .../check-legacy-fixture.mjs` | **K01** (真实旧 DDL 升级) | 1 通过，0 失败 | **1 passed, 0 failed** | **PASS** | `logs/19-probe-r7-fixture.stdout.txt` |
| `node .../check-upgrade-boundaries.mjs` | **H01–H10** (R6 审查探针) | 10 通过，0 失败 | **10 passed, 0 failed** | **PASS** | `logs/17-probe-r6.stdout.txt` |
| `node .../check-r4b-gaps.mjs` | **G01–G09** (R5 审查探针) | 9 通过，0 失败 | **9 passed, 0 failed** | **PASS** | `logs/16-probe-r5.stdout.txt` |
| `node .../check-unfinished-contracts.mjs` | **U01–U08** (R4 审查探针) | 6 通过，2 失败 (U05/U06 归 R4-C) | **6 passed, 2 failed (U05/U06)** | **PASS (边界正确)** | `logs/14-probe-r4.stdout.txt` |
| `node .../check-invariants.mjs` | **T01–T11** (R3 审查探针) | 10 通过，0 失败 | **10 passed, 0 failed** | **PASS** | `logs/13-probe-r3.stdout.txt` |

---

## 5. 后续边界与未完成工作

根据实施路线与各阶段明确边界：
1. **后续任务包 M0/M1-R4-B.4-3**:
   - 解决 R8-F05（L03 启动时结构预检阻断破坏性升级）。
   - 收敛 DDL 单一来源定义。
   - 补齐并固化原 B01–B12 要求的全部可靠性证据。
2. **待办契约缺陷 R4-C**:
   - 关闭 U05（跨 space 关系显式拒绝）。
   - 关闭 U06（截断流与异常连接处理）。
3. **M2.1 就绪条件**:
   - 必须等待 R4-B 与 R4-C 均完成正式审查验收后方可进入。
