# M0/M1-R4-B.4-2R4 交付报告：统一旧初始帖字段解析，保持初始帖重放形状

## 1. 任务概述与解决的缺陷

- **任务编号**：`M0/M1-R4-B.4-2R4`
- **工作目录**：`/Users/sakimi/Desktop/Detuned`
- **起始基线**：Git HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留既有多轮未提交实现）。经 `baseline-before.json` 校验，产品与测试集合的全部 83 个文件 SHA-256 哈希与 R13 `baseline.json` 100% 严格一致。
- **关闭缺陷**：
  1. **R13-F01**（W01/W02 反例）：旧版初始帖及嵌套关系输入解析缺失前置显式非法值与 null 校验，导致 `'invalid-revision'` 静默回退为 1、显式 `initial_post: null` 或 `{}` 被跳过丢弃、悬空孤立初始帖字段未被拒绝，以及关系元素中的 `state: null` / `version: null` 误落入 `unreplayable` 标记而非拒绝迁移。
  2. **R13-F02**（W03 反例）：`reconstructFromValidRef` 无条件为初始帖注入 `relations: []`，导致重放与原始 HTTP 创建响应的形状产生差异（多出 `data.initial_post.relations`）。
  3. **R13-E01**（交付报告勘误）：修正上轮说明中关于 11 操作族分类（脱敏操作族为 `admin.redaction` 而非 `post.redact`）、46 项验收项（属于独立审查脚本而非全部为正式测试套件）、Lint 工具链（实际为 `pnpm -r run lint` 即 `tsc --noEmit`，未配置使用 Turbo）的描述，并在正式集成测试套件中正式补充 W01–W03 的回归测试与全库逻辑快照断言。

---

## 2. 根因分析与代码改动单元

### 2.1 单元 1：Post 与 initial_post 的统一旧版解析与严格校验

**根因分析**：
此前在 `normalizeLegacyResultRef` 中，`thread.create` 的 `initial_post` 解析与独立 `post.create` / `post.revision` 使用了分裂的逻辑分支。
- 在 `thread.create` 中，`initial_post.revision` 提取时仅针对 `number` 赋值，非数字直接变成 `undefined`，随后由 `?? 1` 隐式兜底；`initial_post: null` 或 `{}` 因无有效 ID 而直接跳过判断，使坏数据以缺省形式逃逸；
- 在关系解析中，`??` 运算符将显式提供的 `relations: null` 或 `relation_ids: null` 当作未传并降级；
- 在嵌套关系元素中，`state: null` 或 `version: null` 导致 `hasVersionAndState` 计算为 `false`，从而使损坏数据被错误持久化为 `kind: 'unreplayable'` 标记，使迁移错误放行。

**具体改动**：
在 `packages/core/src/services/idempotency-service.ts` 中抽象并统一共享提取与校验流程：
1. `parseAndValidateLegacyRevision(value, fieldName)`：严格判定修订版本。`undefined` 视为合法缺省；`null`、非正整数、非对象或无正整数 `revision` 属性的对象均直接抛出 422 `RESYNC_REQUIRED`。
2. `resolveLegacyRevision(topRev, nestedRev, entityName)`：对顶层与嵌套修订别名进行双重校验，存在冲突立即抛出 422；两处皆合法缺省方可取 `undefined`。
3. `parseAndValidateVersion(value, fieldName)` 与 `parseAndValidateState(value, fieldName)`：对显式提供的 `version`（必须为正整数）与 `state`（必须为 `'open'` 或 `'resolved'`）进行严格校验，拒绝任何 `null`、越界或非法字符串。
4. `validateLegacyRelationIds` 与 `validateLegacyRelations`：严格检查数组结构与非空、去重；对 `relations` 数组内的每个元素逐个校验 `id`、`state`、`version`，任何显式 `null` 或非法值直接报错 422，绝不落入降级分支。
5. `resolveArrayAlias`：对顶层与嵌套关系数组进行严格别名比对，二者必须深层严格一致（`isDeepStrictEqual`），否则报错 422。
6. `processLegacyRelations`：在调用 `validateNestedRelationsKnownFacts` 确证已知事实后，仅当关系版本/状态为旧版合法省略（缺失）时才降级为 `unreplayable`；任何事实损坏或非法显式值均在前期抛错拒绝。
7. 孤立字段检查：在 `thread.create` 中，若既未提供 `initial_post` 也未提供 `initial_post_id`，但提供了 `initial_post_revision`、`relation_ids` 或 `relations`，直接判定为悬空孤立字段并抛出 422。

`post.create` / `post.revision` 与 `thread.create` 均统一接入上述流程，消除分支行为差。

### 2.2 单元 2：初始帖重放响应形状保真与事务原子性

**根因分析**：
`ThreadService.createThread` 在创建主题及初始帖时，若请求未声明嵌套关系，返回的 `initial_post` 仅包含 `{ post, revision }`。
在 `reconstructFromValidRef` 中，重构代码此前无条件向 `initial_post` 组装了 `relations: []`，导致重放结果多出 `relations` 属性，破坏了与原始响应的深层一致性。

**具体改动**：
在 `reconstructFromValidRef` 的 `thread.create` 分支中，改为仅在持久化引用明确声明了 `relations` 或 `relation_ids`（即 `ref.relations !== undefined || ref.relation_ids !== undefined`）时，才向 `outInitialPost` 附加 `relations` 字段。
当引用未包含关系集合时，返回 `{ thread: outThread, initial_post: { post, revision } }`，与原始 HTTP 响应严格深层相等，彻底解决 W03。
同时，所有校验失败均直接中断迁移事务，使损坏数据库在 reopen 后保持字节完全不变（`unchanged_after_reopen: true`）。

---

## 3. 涉及改动文件清单

经 `baseline-after.json` 与 `baseline-before.json` 比对，本轮仅修改了以下 2 个代码文件：
1. `packages/core/src/services/idempotency-service.ts`（统一旧输入校验与重放形状保真）
2. `tests/integration/m0-m1-r4-b-regression.test.ts`（正式补充 W01–W03 回归套件，测试总数增至 125 项）

其余 81 个产品与测试文件哈希完全未变。
文档与审查交付文件更新：
- `docs/12-decisions.md`（新增 ADR-018）
- `docs/03-data-model.md`（补充旧版字段解析与重放形状保真规范）
- `docs/04-protocol.md`（补充幂等重放形状规则）
- `docs/progress.md`（更新进度至 B.4-2R4 完成）
- `README.md`（更新当前状态）
- `docs/reviews/2026-09-30-m0-m1-r13/implementation-r4-b4-2r4/`（本交付归档目录）

---

## 4. 自动化验证与验收执行结果

所有命令均通过 `run-all.mjs` 统一执行，输出记录于 `commands.json` 及 `logs/` 目录：

| # | 命令名称 | 执行命令 | 退出码 | 关键结果与证据 |
|---|---|---|---|---|
| 1 | `build` | `pnpm -r run build` | 0 | 全工作区 9 个包编译通过 (`logs/01-build.stdout.txt`) |
| 2 | `typecheck` | `pnpm -r run typecheck` | 0 | TypeScript 零类型错误 (`logs/02-typecheck.stdout.txt`) |
| 3 | `lint` | `pnpm -r run lint` | 0 | `tsc --noEmit` 校验全绿 (`logs/03-lint.stdout.txt`) |
| 4 | `tests` | `pnpm test` | 0 | 11 个测试文件共 **125/125** 项测试全部通过，B 组回归增至 61 项 (`logs/04-tests.stdout.txt`) |
| 5 | `check-legacy-input-presence` | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | **W01–W03 全部通过 (3/3)**，非法输入全部 422 且事务回滚，重放形状严格一致 (`logs/05-check-legacy-input-presence.stdout.txt`) |
| 6 | `check-precheck-completeness` | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | **V01–V05 全部通过 (5/5)** (`logs/06-check-precheck-completeness.stdout.txt`) |
| 7 | `check-validation-pipeline` | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | **Q01–Q05 全部通过 (5/5)** (`logs/07-check-validation-pipeline.stdout.txt`) |
| 8 | `check-b4-2-boundaries` | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | **P01–P06 全部通过 (6/6)** (`logs/08-check-b4-2-boundaries.stdout.txt`) |
| 9 | `check-b4-1-acceptance` | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | **N01–N05 全部通过 (5/5)** (`logs/09-check-b4-1-acceptance.stdout.txt`) |
| 10 | `check-b3-gates` | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 1 | 7/8 通过；**L03 保持失败**，确认为后续 B.4-3 范围边界 (`logs/10-check-b3-gates-expected-l03.stdout.txt`) |
| 11 | `check-unfinished-contracts` | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8 通过；**U05/U06 保持失败**，确认为后续 R4-C 范围边界 (`logs/11-check-unfinished-contracts-expected-u05-u06.stdout.txt`) |
| 12 | `check-adapters` | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | A01–A05 全部通过 (5/5) (`logs/12-check-adapters.stdout.txt`) |
| 13 | `check-behavior` | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | R01–R11 全部通过 (15/15) (`logs/13-check-behavior.stdout.txt`) |
| 14 | `check-cli` | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | CLI post/revision/withdraw 全部通过 (3/3) (`logs/14-check-cli.stdout.txt`) |
| 15 | `check-remaining` | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | S01–S12 全部通过 (12/12) (`logs/15-check-remaining.stdout.txt`) |
| 16 | `check-invariants` | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | T01–T10 全部通过 (10/10) (`logs/16-check-invariants.stdout.txt`) |
| 17 | `check-serve-version` | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | T11 全部通过 (1/1) (`logs/17-check-serve-version.stdout.txt`) |

---

## 5. 约束与边界守则遵守声明

1. **严格遵守用户禁令**：未安装、启用或使用 deepseek-brainstorm，未通过其脚本或入口执行任何操作。
2. **独立受控测试**：全部验证均基于合成身份、自建临时 SQLite 文件库与受控时钟，未触碰任何真实论坛数据、未外发网络请求、未调用任何模型。
3. **保留工作区历史**：未执行任何 `git reset`、`git clean` 或 `git checkout` 覆盖操作，完整保留了所有旧审查脚本、observed 记录与 `archive/pre-plan.original.md` 原字节。
4. **范围严格受限**：未提前开发 B.4-3（未修改 L03 对应的主键结构预检或 DDL 结构），未开始 R4-C（未修改 U05/U06），未触碰 M2.1 或真实宿主联调，聚焦完成 B.4-2R4 并提交独立复核。
