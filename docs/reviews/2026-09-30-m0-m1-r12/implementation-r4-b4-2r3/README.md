# M0/M1-R4-B.4-2R3 实施交付报告

交付日期：2026-09-30  
任务代号：**M0/M1-R4-B.4-2R3：完成降级前校验与显式时间冲突检查**  
工作区基线提交：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（含本轮及前序各轮累积未提交实现）  
起始状态指纹：[`baseline-before.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/baseline-before.json)（83 项产品与测试文件与 R12 baseline 100% 吻合）  
交付状态指纹：[`baseline-after.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/baseline-after.json)  
执行记录清单：[`commands.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/commands.json)  

---

## 1. 任务背景与解决的缺陷

本轮任务聚焦于关闭 R12 审查发现的缺陷 **R12-F01** 与 **R12-F02**，保持正例 **V05**，在正式回归套件中补齐 V01–V05 断言，并纠正 **R12-E01** 交付说明中的全部遗留笔误。

### 1.1 R12-F01：降级前已知事实完整确证与旧版畸形集合严格拒绝（关闭）
- **根因分析**：
  - 前序实现的 `validateStoredResultRefPrecheck` 仅对 ID 格式和表级实体存在性作了初步检查，遗漏了对存储中 `post_revisions` 是否真实存在特定版本、以及嵌套关联（`relation_ids` / `relations`）是否真正归属于源帖子及修订的已知事实核验。导致损坏或篡改的引用在尚未确证事实之前便被过早降级为 `unreplayable`。
  - 在旧版结果规范化器 `normalizeLegacyResultRef` 中，当提供畸形非数组 `relation_ids: 'not-an-array'` 或重复关系 ID 时，被错误逻辑归入通配分支而重置为空集合 `[]`，从而吞没了显式非法输入并返回 201 假成功。
- **修复措施**：
  - 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中导出并复用 [`validateNestedRelationsKnownFacts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L260-L304)，并在 [`validateStoredResultRefPrecheck`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L306-L600) 中对 `post`、`thread.create` 及 `relation.create` 强制核验：修订版本必须在 `storage.getPostRevision` 存在，关联 ID 必须在 `storage` 中存在，且 `source_post_id`、`source_revision`、`target_post_id`、`target_revision` 和同空间必须全部吻合，否则抛出校验错误，绝不允许静默降级为不可重放标记。
  - 在 `normalizeLegacyResultRef` 中对 `relation_ids` 进行显式 `Array.isArray` 校验及重复 ID 查重，发现非法结构或重复项直接拒绝并抛出 422 `RESYNC_REQUIRED`。
- **对应探针**：`V01` 与 `V02` 全部通过（exit 0）。

### 1.2 R12-F02：显式 null 输出事务回滚与历史版本 1 显式时间冲突拒绝（关闭）
- **根因分析**：
  - 编码器 [`extractResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L1120-L1250) 在检查可选字段时使用了 `&& field !== null`，将显式返回的 `relations: null` 误判为缺省忽略，导致畸形结果未能在事务提交前被拦截。
  - 主题历史版本同步 [`syncThreadVersion`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts#L240-L300) 在处理 `version === 1` 时，使用了 `createdAt ?? updatedAt` 并仅与选择的时间比较，当旧响应显式提供了互不一致的 `createdAt` 与 `updatedAt`（如 `updatedAt: '1999-01-01T...'`）时，冲突被静默忽略。
- **修复措施**：
  - 更新 `extractResultRef`：可选字段仅允许未提供（`=== undefined`），一旦显式提供必须是合规的对象/数组结构；提供 `null` 或非数组类型直接抛出 400 `VALIDATION_ERROR`，在 `executeIdempotent` 事务内打断并完全回滚业务行、事件行与幂等记录。
  - 更新 `syncThreadVersion` 与 `normalizeLegacyResultRef`：在 `version === 1` 时，若同时显式提供了 `createdAt` 与 `updatedAt`，两者必须绝对一致；且两者不得与现有快照 `existing.created_at` 或 `threads` 表记录发生冲突。任何显式时间冲突均导致整个启动迁移事务原子回滚，数据库保持重开前后完全一致。
- **对应探针**：`V03` 与 `V04` 全部通过（exit 0）。

### 1.3 正例保护与回归补齐
- **V05 正例**：保留合法旧输入、完整历史重放与空关系数组合法重放能力，5/5 探针全部通过。
- **正式集成测试**：在 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 中新增 `describe('R12 review regression (V01-V05)', ...)`，包含 5 项针对真实数据库操作回滚与逻辑快照全等性校验的正式自动化测试，正式测试总数由 117 项增加至 122 项（11 个文件，全部通过）。

---

## 2. R12-E01 交付说明勘误

针对上一轮实施报告中存在的说明偏差，本轮实施报告全面核对并纠正如下：

1. **执行命令与日志路径真实映射**：
   - 彻底杜绝使用猜想路径（如 `logs/test.log`）。所有命令均通过 [`run-record.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/run-record.mjs) 逐一执行并记录到 [`commands.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/commands.json)。每个记录条目包含真实的 `stdout_file` 与 `stderr_file`（位于 [`logs/`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/logs/)），精确对应执行时间与真实退出码。
2. **R1–R3 历史套件准确计数**：
   - R1–R3 历史行为套件总数为 **46 项**，具体分布为：
     - `tests/integration/m0-m1-regression.test.ts`: 15 项（11 项集成测试 + 4 项 CLI 测试）
     - `tests/integration/m1-discussion.test.ts`: 5 项
     - `tests/integration/m0-m1-r2-regression.test.ts`: 12 项
     - `tests/contracts/m0-m1-r2-adapters.test.ts`: 3 项
     - `tests/integration/m0-m1-r3-regression.test.ts`: 11 项（10 项集成测试 + 1 项 CLI 测试）
     - **合计**：15 + 5 + 12 + 3 + 11 = 46 项。全部通过。
3. **11 个操作族穷尽对应关系**：
   - 系统支持的 11 个写操作族为：
     1. `space.create`
     2. `space.patch`
     3. `thread.create`
     4. `thread.patch`
     5. `post.create`
     6. `post.revision`
     7. `post.redact`
     8. `post.withdraw`
     9. `relation.create`
     10. `relation.resolve`
     11. `relation.reopen`
   - 不存在 `post.patch`（帖子内容修改通过新建修订 `post.revision` 完成）或 `membership.*`（成员关系由空间与凭据直接管理，无独立幂等写操作）。
4. **函数确切签名**：
   - [`validateStoredResultRefPrecheck(storage: StoragePort, operation: string, spaceId: string, parsed: IdempotencyResultRef): void`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L306)
   - [`normalizeLegacyResultRef(tx: StoragePort, operation: string, parsed: any, spaceId?: string): IdempotencyResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L1375)
5. **工作区 Lint 说明**：
   - `pnpm -r run lint` 在本工作区中通过 Turbo/pnpm 递归调用各子包的 `tsc --noEmit`，对全仓库所有 9 个子包（protocol, core, client, server, cli, storage-sqlite, adapter-pi, mcp, modules/review）执行完整的严格类型检查，无任何语法或类型警告，退出码为 0。
6. **U06 截断 HTTP 响应说明**：
   - R4 审查脚本中的 `U06` 测试 HTTP 流式响应在 JSON 读取过程中发生网络/数据截断时的恢复能力；该项与 `U05`（非法的关系类型枚举）共同属于已知待关闭的 R4-C 接口契约验收项，在本包（R4-B 数据可靠性）中不予篡改断言，保持预期退出码 1。
7. **代码文件指纹与 Diff 哈希分离**：
   - 在 [`baseline-before.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/baseline-before.json) 与 [`baseline-after.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/baseline-after.json) 中，明确将各个代码文件的 sha256 存储在 `product_and_test_file_hashes` 映射中，而整个 Git tracked 变更的统一 diff 摘要保存在 `tracked_diff_sha256` 中。

---

## 3. 代码变更与文件指纹对比

本轮仅修改了 3 个文件（2 个核心产品文件，1 个测试文件），其余 80 个产品与测试文件完全未改动：

| 文件 | 变更前 SHA-256 | 变更后 SHA-256 | 说明 |
|---|---|---|---|
| [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) | `0537c14ca002cb47f519c27ca75da5e0510819553a20dffde80391d20c819832` | `abd01e8149de996f214de4ba3d8993780fa4720d620844ef2466927e69536558` | 导出已知事实校验 helper，降级前完整核验已知事实，拒绝显式 null 输出，增加旧版规范化严格数组/时间校验 |
| [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) | `f3fc2c210ce110bf1a478cdce309ec27c7c3de5847ab2701d997053dbaa74c33` | `de6fd4ef465a73813d4717c25c6ce4caf1c831d88dcd36b6d671fd5f31c0913c` | `syncThreadVersion` 增加 v1 显式 created_at 与 updated_at 冲突检测及与快照/实体记录冲突检测 |
| [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) | `d3441acfcfc3585f814fd9712e97c19e431174ac2e12ff043b26ae13a46878f6` | `fb6ccecb27011928c517cc4767f1e69dc67caf174d884058fdbf0555d0ead651` | 补充 V01–V05 正式回归测试套件 |

---

## 4. 全套验证矩阵执行结果

全体验证命令均通过统一 runner 运行并持久化于 [`commands.json`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/commands.json) 与 [`logs/`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/logs/) 中：

| ID | 命令名称 | 执行命令 | 退出码 | 预期 / 状态 |
|---|---|---|---|---|
| #1 | `build` | `pnpm build` | 0 | 成功构建所有包 |
| #2 | `typecheck` | `pnpm typecheck` | 0 | 全工作区 TypeScript 类型无报错 |
| #3 | `lint` | `pnpm lint` | 0 | 全工作区 Lint 检查通过 |
| #4 | `test-all` | `pnpm test:all` | 0 | 122 项正式测试全绿 |
| #5 | `probe-r1-behavior` | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15 项通过 |
| #6 | `probe-r1-adapters` | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5 项通过 |
| #7 | `probe-r2-remaining` | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12 项通过 |
| #8 | `probe-r2-cli` | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3 项通过 |
| #9 | `probe-r3-invariants` | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10 项通过 |
| #10 | `probe-r3-serve-version` | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1 项通过 |
| #11 | `probe-r4-contracts` | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 预期退出码 1（已知 U05, U06 归 R4-C） |
| #12 | `probe-r5-gaps` | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | G01–G09 通过 |
| #13 | `probe-r6-boundaries` | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | H01–H10 通过 |
| #14 | `probe-r7-completeness` | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | J01–J07 通过 |
| #15 | `probe-r7-fixture` | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | K01 通过 |
| #16 | `probe-r8-gates` | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 1 | 预期退出码 1（已知 L03 归 B.4-3） |
| #17 | `probe-r9-acceptance` | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | N01–N05 通过 |
| #18 | `probe-r10-boundaries` | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | P01–P06 通过 |
| #19 | `probe-r11-pipeline` | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | Q01–Q05 通过 |
| #20 | `probe-r12-precheck` | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | **V01–V05 全部通过（5 passed, 0 failed）** |
| #21 | `final-build` | `pnpm build` | 0 | 交付最终构建成功 |
| #22 | `final-typecheck` | `pnpm typecheck` | 0 | 交付最终类型检查成功 |
| #23 | `final-lint` | `pnpm lint` | 0 | 交付最终 Lint 成功 |
| #24 | `final-test-all` | `pnpm test:all` | 0 | 交付最终自动化测试全绿 |
| #25 | `generate-baseline-after` | `node .../generate-baseline.mjs baseline-after.json` | 0 | 成功记录交付后状态指纹 |

---

## 5. 工作边界与后续计划

1. **本轮成果**：
   - 彻底完成了降级前所有已知事实的严密核验与结构预检，杜绝了数据损坏向不可重放标记的非法逃逸；
   - 彻底完成了显式 `null` 及非数组等畸形输出的校验与原子回滚，确保业务行、事件行与幂等记录严格零残留；
   - 彻底修复了历史版本 1 显式创建/更新时间冲突的校验，确保数据冲突引发迁移原子回滚，绝无隐式造假；
   - 完整关闭了 R12-F01 与 R12-F02，保持 V05 正例及全部前序修复，正式测试增至 122 项。
2. **严格保持边界**：
   - 未改动 L03 断言（留待后续 B.4-3 处理结构预检、单源 DDL 与原 B01–B12 全矩阵验证）；
   - 未改动 U05 / U06 断言（留待后续 R4-C 处理 relation type enum 校验与截断 JSON 错误处理）；
   - 未开启 M2.1，未调用任何大模型，未改动全局 harness 配置，未部署或推送代码。
