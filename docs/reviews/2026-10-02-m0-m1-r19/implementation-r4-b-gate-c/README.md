# M0/M1-R4-B-GATE+C 实施报告：完成验收补项并收口请求/响应契约

- **日期**：2026-10-02
- **工作区**：`/Users/sakimi/Desktop/Detuned`
- **Git HEAD**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留多轮未提交工作，未做 git reset / clean / checkout）
- **受保护文件原字节核验**：
  - `tests/fixtures/historical-v1-schema.sql`：`0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（完全一致）
  - `archive/pre-plan.original.md`：`82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（完全一致）
- **运行环境**：Node `v26.3.0`（工作区 engines 声明已对齐 `>=22.19.0`），pnpm `11.7.0`
- **禁止项遵守**：未安装、启用或使用 `deepseek-brainstorm`；未启动外部 Agent；未调用外部模型；未修改全局 harness 配置；未推送、部署或发布。

---

## 一、任务目标与达成概览

本轮任务依据 R19 提示词要求，在同一实现回合内先达到 **单元 A（B 包验收补项门槛 Gate A）**，随后推进并收口 **单元 B（R4-C 请求/响应契约与生命周期）**，最终统一交回复核。

| 单元 | 核心要求 | 达成状态 | 验证证据 |
| :--- | :--- | :---: | :--- |
| **单元 A** | 修复 `schema-generation.test.ts` 中无操作索引变更；补齐有限回归矩阵（真实命名索引/FTS、列可空性/冻结 V1、主键约束 AB01、损坏 Profile 修复 AB03、缺失输入/标记原子失败恢复 AB02/AB04）；达到 Gate A 门槛 | **达成** | 6 项有限矩阵测试通过；Gate A 26 条命令真实执行：25 条 exit 0，仅命令 #11 因 U05/U06 exit 1 |
| **单元 B (C01)** | 关闭 R4-F05/U05：公共路由挂载严格 request schema（`additionalProperties: false`）；核心领域服务 `RelationService` 防御；`parseIntegerQuery` 严格整数解析（拒绝 `1bad`、负数、数组、超范围）；规范 `Idempotency-Key` | **达成** | U05 真实执行通过；`tests/contracts/r4-c-contracts.test.ts` 4 项 C01 回归全部通过 |
| **单元 B (C02)** | 关闭 R4-F06/U06：`DetunedClient` 修复 200/201 截断/坏 JSON 拒绝（不返回 `{ data: undefined }`）；严格校验成功响应外壳；区分有效 falsy 数据值与缺少 data 属性；区分 `UserAbortError` 与 `TimeoutError`；清理 abort listener 与 timer（零内存泄漏）；有界重试保持同一 `requestKey` | **达成** | U06 真实执行通过；`tests/contracts/r4-c-contracts.test.ts` 6 项 C02 回归全部通过 |
| **单元 B (C03)** | 对齐根 `package.json` `engines.node` 为 `>=22.19.0`（匹配锁定 Pi 依赖）；`packages/adapter-pi` 无 UI / headless 模式（`!ctx?.hasUI`）下 `/forum-status` 与 `/forum-check` 输出可观察控制台日志；更新 `integrations/compatibility.json` | **达成** | `package.json` 与 `compatibility.json` 同步更新；`tests/contracts/r4-c-contracts.test.ts` 3 项 C03 回归全部通过 |
| **终验结果** | 全量 26 项验证命令全部 exit 0（含命令 #11 8/8 全通）；全套 vitest 13 文件 166 项测试全部通过；build/typecheck/lint 全部 exit 0 | **达成** | `final-commands.json` 真实记录 26/26 exit 0；全量测试 166/166 pass |

---

## 二、单元 A：B 包验收补项实施细节

### 1. 真实命名索引替换证据
在 `packages/storage-sqlite/src/schema.sql` 中，检索原测试使用的 `idx_posts_thread_created`：
- 该名称在真实 `schema.sql` 中出现次数为 **0**。原测试的字符串替换实际上未修改任何有效 DDL，导致测试为 no-op。
- 替换为真实存在的命名索引：`idx_events_space_seq ON events(space_id, seq)`。
- 在 `packages/storage-sqlite/tests/schema-generation.test.ts` 中针对真实索引定义进行重写，确保生成器与提取器准确识别索引并同步至运行时 profile。

### 2. 有限回归矩阵覆盖
`packages/storage-sqlite/tests/schema-generation.test.ts` 重写后包含 6 项独立受控测试，覆盖 `coverage-audit.md` 要求的全部有限矩阵：
1. **真实列可空性与冻结 V1 对比**：修改 `space_revisions.objective` 可空性，断言生成的 `V2` profile 捕获 `is_nullable: true`，且 `historical-v1-schema.sql` 提取的 `V1` profile 保持不变。
2. **真实命名索引与 FTS 变更**：测试 `idx_events_space_seq` 字段变更及 `post_fts` 内容列移除，断言 `schema.ts` 正确反映变更且属性完整。
3. **主键属性约束拒绝 (AB01)**：临时副本注入 `PRIMARY KEY (id COLLATE NOCASE)` 或 `PRIMARY KEY (id DESC)`，断言生成管道与同步检查均抛出明确错误并拒绝写出。
4. **损坏 V2 profile 修复 (AB03)**：注入损坏的 V2 profile，`check-schema-sync.mjs` 准确识别损坏并报错，经 `generate-schema.mjs` 重新生成后完全恢复健康。
5. **损坏 V1 profile 修复 (AB03)**：注入损坏的 V1 profile，同步检查检测到 V1 不一致，重新生成后自动提取 `tests/fixtures/historical-v1-schema.sql` 并修复。
6. **原子失败与恢复 (AB02 & AB04)**：缺失输入或代码标记时，生成脚本原子失败退出非 0，不写出半生不熟产物；恢复标记后立即能够正常生成。

### 3. Gate A 门槛达成证据
在开始单元 B 之前，运行了 `run-gate-a-26.mjs`：
- **25 条命令 exit 0**；
- **第 11 条命令**（`docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs`）**exit 1**；
- 失败项严格且仅有 `['U05', 'U06']`，U01–U04 与 U07–U08 全部 passes: true；
- 所有输出日志完整保存在 `gate-a-logs/cmd-XX-*.log`，汇总记录在 `gate-a-commands.json`。

---

## 三、单元 B：R4-C 请求/响应契约与生命周期收口

### 1. C01：路由 Schema 验证与输入解析收口（关闭 R4-F05/U05）
1. **公共路由 request schema 挂载与 `{ additionalProperties: false }` 强化**：
   - 在 `packages/protocol/src/admin.ts` 中新建并导出了管理端请求 schema：`CreateActorRequestSchema`, `CreateCredentialRequestSchema`, `CreateMembershipRequestSchema`, `PatchMembershipRequestSchema`, `CreateRedactionRequestSchema`，均配置 `{ additionalProperties: false }`。
   - 在 `packages/server/src/routes/relations.ts` 挂载 `CreateRelationRequestSchema`, `ResolveRelationRequestSchema`, `ReopenRelationRequestSchema`。
   - 在 `packages/server/src/routes/events.ts` 挂载 `CreateSubscriptionRequestSchema`, `PollRequestSchema`, `AckRequestSchema`。
   - 在 `packages/server/src/routes/admin.ts` 挂载所有管理端请求 schema。
   - 在 `packages/server/src/routes/spaces.ts` 挂载 `CreateSpaceRequestSchema`, `PatchSpaceRequestSchema`, `CreateSessionRequestSchema`。
   - 在 `packages/server/src/routes/threads.ts` 挂载 `CreateThreadRequestSchema`, `PatchThreadRequestSchema`。
   - 在 `packages/server/src/routes/posts.ts` 挂载 `CreatePostRequestSchema`, `CreatePostRevisionRequestSchema`, `WithdrawPostRequestSchema`。
2. **核心领域防御**：
   - 在 `packages/core/src/services/relation-service.ts` 的 `createRelation` 入口增加 `VALID_RELATION_TYPES` 校验，即便绕过路由层直接调用核心服务，非法的关系类型也会在写入状态或幂等记录之前被拦截并抛出 400 `VALIDATION_ERROR`。
3. **严格查询参数解析**：
   - 在 `packages/server/src/utils/query.ts` 中实现 `parseIntegerQuery`，严格拒绝带字符（如 `1bad`）、负数、数组输入、超范围数值（如 `limit > 100`），统一抛出 400 `VALIDATION_ERROR`。在 `spaces.ts`、`threads.ts`、`posts.ts`、`search.ts` 中替换了所有不安全的 `parseInt`。
   - 在 `search.ts` 中严格校验 `q` 为非空字符串，并校验 `kind` 必须属于合法的 `PostKind` 枚举。

### 2. C02：客户端生命周期与失败处理收口（关闭 R4-F06/U06）
在 `packages/client/src/client.ts` 中重构 `request()`：
1. **修复 U06**：在 HTTP 200/201 成功响应时，若 `res.json()` 解析失败（例如截断的 JSON `{"data":`），不再吞掉错误返回 `{ data: undefined }`，而是抛出 `DetunedError(ErrorCode.VALIDATION_ERROR, ...)`。
2. **外壳校验**：
   - 成功响应必须为非数组对象；
   - 必须包含合法的 `api_version`（字符串）、`request_id`（存在）、`'data' in json`（属性存在）；
   - 严格区分数据值为 `null` / `false` / `0` / `[]` / `""` 与完全缺少 `data` 属性；
   - 允许存在向前兼容的额外未知属性，不破坏扩展性。
3. **错误分类与命名**：
   - 导出 `UserAbortError`（`isUserAbort: true`），当外部 `signal` 触发时抛出；
   - 导出 `TimeoutError`（`isTimeout: true`），当客户端 `timeoutMs` 到期时抛出；
   - 服务端错误抛出 `DetunedError`；
   - 严禁通过判断错误信息是否包含 `aborted` 猜测分类。
4. **生命周期与资源清理（零泄漏）**：
   - 请求无论成功、失败还是超时，均在 `finally` 块中清理 `timeoutId` 并移除外部 `signal` 上的 abort 监听器；
   - 在重试退避等待阶段，封装了带 `cleanup()` 的 Promise，退避 timer 正常完成或被 abort 时，均确保移除事件监听器，彻底解决此前 backoff 匿名 listener 泄漏问题。
5. **有界重试**：重试次数受 `maxRetries`（默认 3）严格限制，且重试时发送与原请求完全相同的 `opts.requestKey` / `Idempotency-Key`。

### 3. C03：Pi 适配器与环境兼容对齐
1. **Node 引擎对齐**：根 `package.json` 中的 `engines.node` 对齐为 `>=22.19.0`，与锁定的 `@earendil-works/pi-coding-agent@0.87.1` 要求保持一致。
2. **无 UI / Headless 模式支持**：在 `packages/adapter-pi/src/index.ts` 中，`/forum-status` 与 `/forum-check` 检测 `ctx?.hasUI && typeof ctx.ui?.notify === 'function'`；当处于无头模式（`!ctx?.hasUI`）或无 notify 回调时，通过 `console.log` / `console.error` 输出结构化可观察消息，杜绝静默失败。
3. **兼容性状态记录**：更新 `integrations/compatibility.json`，准确记录 C01/C02/C03 完成状态，真实宿主保持 `not_tested`。

---

## 四、验证证据

### 1. 正式契约与单元测试通过
运行 `tests/contracts/r4-c-contracts.test.ts`，13 项针对 C01、C02、C03 的正式回归测试全部通过：
```
 ✓ tests/contracts/r4-c-contracts.test.ts (13 tests) 3772ms
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C01: Route Schema Validation & Query Integer Parsing > C01-1: Route rejects undeclared body properties (additionalProperties: false)
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C01: Route Schema Validation & Query Integer Parsing > C01-2: parseIntegerQuery rejects non-digits, negative numbers, and out-of-range values
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C01: Route Schema Validation & Query Integer Parsing > C01-3: Core RelationService rejects invalid relation type without committing state
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C01: Route Schema Validation & Query Integer Parsing > C01-4: Valid relation creation and resolve/reopen lifecycle maintains idempotency and symmetry
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C02: Client Response Envelope, Error Classification, and Lifecycle > C02-1: HTTP 200/201 with malformed JSON rejects with DetunedError VALIDATION_ERROR (U06)
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C02: Client Response Envelope, Error Classification, and Lifecycle > C02-2: Missing envelope fields (api_version, request_id, data) reject with VALIDATION_ERROR
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C02: Client Response Envelope, Error Classification, and Lifecycle > C02-3: Strictly preserves valid falsy data values and allows forward-compatible envelope fields
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C02: Client Response Envelope, Error Classification, and Lifecycle > C02-4: Distinguishes UserAbortError from TimeoutError
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C02: Client Response Envelope, Error Classification, and Lifecycle > C02-5: Abort listener and timer are cleanly removed after settle (no memory leak)
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C02: Client Response Envelope, Error Classification, and Lifecycle > C02-6: Bounded retries maintain original requestKey and terminate at maxRetries
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C03: Pi Adapter Headless Output & Compatibility > C03-1: /forum-status and /forum-check log to console when hasUI is false (headless)
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C03: Pi Adapter Headless Output & Compatibility > C03-2: /forum-status and /forum-check notify ui when hasUI is true
   ✓ R4-C Contracts: Route Schemas, Client Lifecycle, and Pi Adapter > C03: Pi Adapter Headless Output & Compatibility > C03-3: Root package.json engines.node is >=22.19.0 to match Pi dependency requirements
```

### 2. 全套正式测试套件（166/166 全部通过）
运行 `pnpm test:all`：
- **测试文件数**：13 文件
- **测试用例总数**：166 项
- **通过率**：166/166 (100%)

### 3. 全量 26 项验证命令全部 exit 0
由 `run-final-26.mjs` 依次执行，全部 26 条命令 exit 0：
```
[01/26] Running: pnpm build ... OK (exit 0, passed)
[02/26] Running: pnpm typecheck ... OK (exit 0, passed)
[03/26] Running: pnpm lint ... OK (exit 0, passed)
[04/26] Running: pnpm test:all ... OK (exit 0, 166/166; 13 files)
[05/26] Running: node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs ... OK (exit 0, 15/15)
[06/26] Running: node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs ... OK (exit 0, 5/5)
[07/26] Running: node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs ... OK (exit 0, 12/12)
[08/26] Running: node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs ... OK (exit 0, passed)
[09/26] Running: node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs ... OK (exit 0, 10/10)
[10/26] Running: node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs ... OK (exit 0, passed)
[11/26] Running: node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs ... OK (exit 0, 8/8)  <-- U01-U08 全部通过！
[12/26] Running: node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs ... OK (exit 0, 9/9)
[13/26] Running: node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs ... OK (exit 0, 10/10)
[14/26] Running: node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs ... OK (exit 0, 7/7)
[15/26] Running: node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs ... OK (exit 0, 1/1)
[16/26] Running: node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs ... OK (exit 0, 8/8)
[17/26] Running: node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs ... OK (exit 0, 5/5)
[18/26] Running: node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs ... OK (exit 0, 6/6)
[19/26] Running: node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs ... OK (exit 0, 5/5)
[20/26] Running: node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs ... OK (exit 0, 5/5)
[21/26] Running: node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs ... OK (exit 0, 3/3)
[22/26] Running: node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs ... OK (exit 0, 3/3)
[23/26] Running: node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs ... OK (exit 0, 4/4)
[24/26] Running: node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs ... OK (exit 0, 4/4)
[25/26] Running: node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs ... OK (exit 0, 4/4)
[26/26] Running: node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs ... OK (exit 0, 4/4)
```
所有命令的完整 stdout 和 stderr 均归档于 `final-logs/`。

---

## 五、基线与文件变更核对

本次构建与产品基线覆盖 93 个文件（R19 原 90 个基线文件 + 本轮新增 3 个文件）。
`baseline-after.json` 记录的差异严格对应本轮修改的 16 个文件：

| 序号 | 文件路径 | 状态 | 变更目的 |
| :---: | :--- | :---: | :--- |
| 1 | `package.json` | 修改 | C03: 对齐 `engines.node` 为 `>=22.19.0` |
| 2 | `packages/adapter-pi/src/index.ts` | 修改 | C03: 增加无头/无 UI 场景下的控制台日志输出 |
| 3 | `packages/client/src/client.ts` | 修改 | C02: 修复 U06 截断 JSON 拒绝、外壳校验、取消/超时生命周期与清理 |
| 4 | `packages/core/src/services/relation-service.ts` | 修改 | C01: 增加核心层合法关系枚举防御 |
| 5 | `packages/protocol/src/admin.ts` | **新增** | C01: 管理端公共请求 schema 声明（`additionalProperties: false`） |
| 6 | `packages/protocol/src/index.ts` | 修改 | C01: 导出 admin.js |
| 7 | `packages/server/src/routes/admin.ts` | 修改 | C01: 挂载严格 request schema 与幂等头处理 |
| 8 | `packages/server/src/routes/events.ts` | 修改 | C01: 挂载事件相关路由 request schema |
| 9 | `packages/server/src/routes/posts.ts` | 修改 | C01: 使用 `parseIntegerQuery` 严格校验 query revision/limit |
| 10 | `packages/server/src/routes/relations.ts` | 修改 | C01: 挂载 relations 路由 request schema |
| 11 | `packages/server/src/routes/search.ts` | 修改 | C01: 严格校验 query q、kind 与 limit |
| 12 | `packages/server/src/routes/spaces.ts` | 修改 | C01: 严格校验 query limit/max_bytes，挂载 session schema |
| 13 | `packages/server/src/routes/threads.ts` | 修改 | C01: 严格校验 query limit |
| 14 | `packages/server/src/utils/query.ts` | **新增** | C01: 严格整数 query 解析器（拒绝非法格式、负数、超范围） |
| 15 | `packages/storage-sqlite/tests/schema-generation.test.ts` | 修改 | Unit A: 重写真实命名索引/FTS、列可空性、主键约束等有限矩阵 |
| 16 | `tests/contracts/r4-c-contracts.test.ts` | **新增** | Unit B: 13 项 C01/C02/C03 综合契约正式测试 |

基线内其余 77 个文件 SHA-256 哈希值与 R19 基线保持 100% 逐字节一致。

---

## 六、交付声明

1. 单元 A 门槛与有限矩阵已完全闭环，无任何 no-op 替换。
2. 单元 B（R4-C）所涉公共 HTTP 路由 schema 验证（C01）、客户端生命周期与错误分类（C02）、Pi 适配器与环境兼容（C03）均已实现并通过严格定向回归测试。
3. 全量 26 项验证命令全部 exit 0，其中命令 #11（`check-unfinished-contracts.mjs`）8 项探针（U01–U08）全数 passes。
4. 本轮工作已全部完成，统一交回独立复核，**不自动开始 R4-D 或 M2**。
