# M0/M1-R4-B.4-2 交付报告：统一历史结果与引用校验

## 1. 任务概述与交付边界

- **任务编号**: M0/M1-R4-B.4-2
- **核心目标**:
  - 关闭审查意见 [`docs/reviews/2026-09-29-m0-m1-r8/README.md`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r8/README.md) 中的 **R8-F03、R8-F04（L04–L07）**。
  - 完成并加固 **R9-E01 / R9-E02**:
    - 针对 L01 与 L02 补充完整真实的回归用例（L01-3 真实 Fastify onSend 500 故障注入与重启重放；L02-3 纯验证器检查、跨 3 次启动稳定标记与原子拒绝回滚）。
    - 将不可重放标记完整操作绑定（`marker.op`）、启动时规整、注册原因白名单正式记录为决策并同步至 [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md)、[`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md) 与 [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md#adr-014)（ADR-014）。
- **交付边界与约束**:
  - **L03 / R8-F05 属于后续 B.4-3**: 本轮不对 L03 进行越权修复，不放宽其探针断言，保持其在预期失败状态。
  - **U05 / U06 属于后续 R4-C**: 保持为已知后续契约缺陷，不放宽断言，不伪报成功。
  - **不执行 R4-C，不进入 M2.1**: 不声明整个 R4-B 完成。
  - 保留所有既有验证：原子迁移、故障回滚、诊断正文脱敏保护、已提交凭据安全、正常复用与历史时间戳。

---

## 2. 缺陷根因分析与代码修复

### 2.1 R9-E01 & R9-E02: 固化 B.4-1 成果与文档决策对齐 (ADR-014)

- **内容与修复**:
  1. 在 [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md#adr-014) 中正式新增 **ADR-014: 规范不可重放标记的完整操作绑定、启动规整与白名单机制**。
  2. 同步 [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md) 与 [`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md)：明确标记必须严格绑定完整目标 `op`（如 `thread.patch:thd_...`），说明启动时基于幂等记录所属操作的规整逻辑，固定 `REGISTERED_UNREPLAYABLE_REASONS` 白名单，并详述 422 `RESYNC_REQUIRED` 状态语义。
  3. 在 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 中增加真实 onSend 故障与多连接、跨重启隔离测试（L01-3, L01-5, L02-3a–d）。

### 2.2 R8-F03 (L04): 修复历史嵌套关系的快照真实性与不可重放降级

- **根因**:
  - 历史格式中 `$ref: 'post'` 和 `$ref: 'thread'` 仅存储 `relation_ids: [rel_id]`，未保留 `version` 与 `state`。在线重放时如果直接调用 `findRelationById(id)` 读取当前关系，会导致原先在 v1/open 状态创建的嵌套关系，在后续被 resolve 变成 v2/resolved 后，重放错误地返回了 v2/resolved，假装这是初始结果。
- **修复**:
  - 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：迁移历史数据时，若嵌套关联关系缺失可证明的 `version`/`state` 快照，安全转为 `unreplayable` 标记（原因标记为 `historical_relation_version_unrecoverable`），并在写入前调用 `validateResultRef` 校验。
  - 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：在 `reconstructFromValidRef` 中校验嵌套关系快照；若引用只包含孤立的 `relation_ids` 且无对应关系快照，拒绝伪造历史快照，安全抛出 422 `RESYNC_REQUIRED`；同时若 `post.create` 初始无关联关系，忠实保留 `relations: []`。

### 2.3 R8-F04 (L05): 历史操作时间戳冲突纳入快照原子校验与回滚

- **根因**:
  - 在 SQLite 升级过程生成/校验 `thread_versions` 时，先前仅比较了 `existing.title` 与 `existing.state`，忽略了 `created_at`。当底层存在相同版本号但时间戳冲突的历史记录时，无法被检测并回滚，导致历史不可变版本被篡改。
- **修复**:
  - 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：比对现有 `thread_versions` 时严格校验 `created_at`（`existing.created_at !== thd.updated_at` 则立即中止迁移并触发事务原子回滚）。
  - 若历史记录未显式携带时间戳，仅允许回溯 `threads` 表原生的历史修改时间，绝不允许使用 `new Date().toISOString()` 挂钟时间伪造历史。

### 2.4 R8-F04 (L06): 强化跨实体引用完整性与语义边界校验

- **根因**:
  - 先前的校验仅在类型层面断言字段类型，缺少业务语义与外键所属关系的完整性校验。例如：`thread.create` 关联的 `initial_post_id` 属于同空间但不同的主题，或者 `relation.resolve` 关联的 `resolution_id` 其版本号与引用的 `relation_version` 不一致。重放和迁移均未检查这些语义绑定。
- **修复**:
  - 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中抽取出统一的语义校验函数 [`validateResultRefSemantics`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts)：
    - 针对 `thread.create`：核验 `initial_post` 必须真实存在且其 `thread_id` 必须等于当前主题 ID，修订版本号必须存在。
    - 针对 `relation.resolve` / `relation.reopen`：核验 `resolution_id` 必须指向合法的决议记录，且该决议记录的 `relation_id`、`version` 与动作类型（resolve/reopen）必须与引用精确一致。
    - 针对 `post` / `thread` 的嵌套关系：逐一校验关系 ID 存在性、空间归属以及版本一致性。
  - 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 的迁移路径中：对所有既有 v1 引用及新转换引用，均同步执行 [`validateResultRefSemantics`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts)，确保非法篡改的引用在升级阶段即被原子拒绝。

### 2.5 R8-F04 (L07): 编码器输出校验与成对字段无缝防穿透

- **根因**:
  - [`extractResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 在组装各操作返回值引用后，未在出口处统一调用 `validateResultRef`；且当返回数据异常（如 `thread.version = 0`）时会生成不合法引用。此外，`initial_post_id` 与 `initial_post_revision` 缺乏成对存在性约束。
- **修复**:
  - 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 的 [`extractResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 函数出口处，强制执行 `validateResultRef(operation, ref)`。
  - 在 [`validateResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：强制要求 `initial_post_id` 与 `initial_post_revision` 必须同时出现或同时缺省；且未携带初始帖子时严禁携带嵌套关系字段；空关系列表在编码时规范化。
  - 在 SQLite 升级迁移过程中遇到未注册未知操作时，直接中止并原子回滚整个数据库迁移事务。

---

## 3. 修改的文件清单

1. **核心逻辑与边界校验**:
   - [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts):
     - 新增 [`validateNestedRelationsFormat`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 与 [`validateSemanticsForNestedRelations`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts)。
     - 导出并实现 [`validateResultRefSemantics`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts)，覆盖所有操作族的实体存在性、版本匹配与空间所属关系。
     - 规范 [`extractResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 出口必验与空关联关系的处理。
2. **存储层迁移与启动协调**:
   - [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts):
     - 引入并执行 [`validateResultRefSemantics`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts)。
     - 无法证明历史关系的旧格式受控降级为 `unreplayable`。
     - 线程历史比对增加 `created_at` 严格校验，防止时间戳篡改。
3. **架构与协议决策文档**:
   - [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md): 记录操作绑定、不可重放原因白名单与只读投影。
   - [`docs/04-protocol.md`](file:///Users/sakimi/Desktop/Detuned/docs/04-protocol.md): 记录 422 RESYNC_REQUIRED 重建协议。
   - [`docs/12-decisions.md`](file:///Users/sakimi/Desktop/Detuned/docs/12-decisions.md#adr-014): 正式归档 ADR-014。
4. **集成回归测试**:
   - [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts):
     - 扩充 L01-3, L01-5, L02-3a–d, L04, L05, L06, L07 等 8 项完整回归测试。

---

## 4. 验证结果与探针状态

### 4.1 核心测试套件 (`pnpm test:all` / `vitest`)
- **11 个测试文件，107 项正式测试全部通过（0 失败）**。
- `tests/integration/m0-m1-r4-b-regression.test.ts` 全部 43 项测试 100% 通过。
- `pnpm typecheck` 全部 9 个工作区项目 0 错误通过。
- `pnpm lint` 0 警告 0 错误通过。

### 4.2 本轮探针 (`check-b3-gates.mjs` & `check-b4-1-acceptance.mjs`)
1. **R9 探针 (`node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs`)**:
   - **5/5 全部通过** (N01–N05)。
2. **R8 探针 (`node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs`)**:
   - **7/8 通过**:
     - **L01 通过**: 空间创建重试与实例作用域一致性。
     - **L02 通过**: 不可重放标记跨重启稳定自洽。
     - **L04 通过**: 旧嵌套关系安全处理，杜绝返回当前状态假冒历史。
     - **L05 通过**: 历史时间戳冲突引发原子回滚。
     - **L06 通过**: 初始帖子错属主题与决议版本不符均被拦截。
     - **L07 通过**: 编码器与未配对字段校验无绕过，未知操作原子回滚。
     - **L08 通过**: 正向控制组验证通过。
     - **L03 保持预期失败 (未通过)**: 明确归属后续任务 **B.4-3 / R8-F05**。

### 4.3 历史探针全矩阵回归
- **R1–R3 46 项探针**: 全部通过。
- **R4 探针 (`check-unfinished-contracts.mjs`)**: 6/8 通过（仅 U05/U06 保持为 R4-C 已知缺陷）。
- **R5 探针 (`check-r4b-gaps.mjs`)**: 9/9 全部通过 (G01–G09)。
- **R6 探针 (`check-upgrade-boundaries.mjs`)**: 10/10 全部通过 (H01–H10)。
- **R7 探针 (`check-legacy-fixture.mjs` & `check-b2-completeness.mjs`)**: 全部通过 (K01, J01–J07)。

---

## 5. 剩余工作与后续说明

1. **后续子包 M0/M1-R4-B.4-3**:
   - 目标：关闭 **R8-F05 / L03**（缺少主键/唯一约束的非标准当前库在变更前分类为 `corrupt` 并安全拒绝）。
   - 完成后将实现原 R4-B 全部 12 条验收标准（B01–B12）。
2. **契约包 M0/M1-R4-C**:
   - 解决 U05（关系枚举边界校验）与 U06（HTTP 截断流报错拒绝）。
3. **M2.1 就绪状态**:
   - **未就绪**。本轮严格遵循增量交付原则，不提前宣称完成或引入后续范围变更。
