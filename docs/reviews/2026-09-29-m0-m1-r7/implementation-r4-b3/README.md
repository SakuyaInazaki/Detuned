# M0/M1-R4-B.3 实施与验收报告：历史结果重建、实例分类与引用完整性收口

## 1. 任务概述与交付边界

- **任务编号**：M0/M1-R4-B.3（完成历史结果重建、实例分类与引用完整性收口，关闭 R7-F01 ~ R7-F04）
- **基线源码**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a` 叠加工作区未提交修改
- **环境信息**：macOS (Darwin arm64), Node.js v26.3.0, pnpm v11.7.0, better-sqlite3 v13.0.3 (WAL 模式)
- **历史真实 DDL 证据**：
  - 文件：[tests/fixtures/historical-v1-schema.sql](file:///Users/sakimi/Desktop/Detuned/tests/fixtures/historical-v1-schema.sql)
  - 来源提交：`fa1b35c`
  - SHA256 校验和：`a68b02a5d4335c3d0fe48f481212d4d46205ac7f43823fd951e4ccfeca5b0890`（已在 K01 探针中完成校验）
- **交付目标**：
  1. 关闭最新审查发现 R7-F01 ~ R7-F04。
  2. 通过本轮审查脚本 `check-b2-completeness.mjs` 中的 J01 ~ J07 全部 7 项探针（7/7 通过）。
  3. 通过本轮真实历史 DDL 审查脚本 `check-legacy-fixture.mjs` 中的 K01 探针（1/1 通过）。
  4. 保持 R1 ~ R3 历史审查探针（46 项）、R4-B 探针（6/8 通过，仅 U05/U06 保持后续契约缺陷失败）、R5 探针（9/9 通过）及 R6 探针（10/10 通过）全部通过。
  5. 全量自动化测试套件全部通过（11 个测试文件，91/91 项通过）。
  6. 严格边界声明：**本轮不执行 R4-C，不进入 M2.1**。U05/U06 为已知后续契约缺陷，保持预期失败，未放宽断言。

---

## 2. R7-F01 ~ R7-F04 根因分析与修复说明

### 2.1 R7-F01 / P1：关联复用历史结果在旧格式升级后失真或静默失败 (J01)
- **根因**：
  历史旧格式中的 `relation.create` 引用（如早期 v1 紧凑格式 `{ v: 1, kind: 'relation.create', relation_id: '...' }`）未记录 `relation_version` 和 `relation_state`。在升级迁移时，若直接使用当前表的可变版本与状态，将篡改历史；若直接抛错则会导致包含合法复用历史的数据库无法升级。
- **修复措施**：
  1. 在 [packages/storage-sqlite/src/bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 的 `migrateSingleRef` 中，对缺少 `relation_version` 或 `relation_state` 的旧版 `relation.create` 引用，统一将其安全降级为不可重放标记：
     `{ v: 1, kind: 'unreplayable', op: 'relation.create', reason: 'historical_relation_version_unrecoverable' }`。
  2. 在 [packages/core/src/services/idempotency-service.ts](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中，重放遇到 `unreplayable` 时，明确返回 HTTP 422 `RESYNC_REQUIRED` 结构化错误，告知调用方操作已提交但无法确证历史响应快照，杜绝错误套用当前状态。

### 2.2 R7-F02 / P1：当前实例材料损坏在多入口判别不一致与列级缺失漏判 (J02, J03)
- **根因**：
  1. `classifyDatabase` 仅核对了表名的存在性，若表名存在但关键列缺失（如被人为篡改或迁移中途损坏），无法被识别为 `corrupt`。
  2. 针对材料损坏的数据库，`bootstrapDatabase`、CLI `init` 和 `serve` 在某些分支下回退到空库初始化或重新生成 `token_secret`。
- **修复措施**：
  1. 在 [packages/storage-sqlite/src/bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中引入 `REQUIRED_SCHEMA_COLUMNS` 表列全量字典，通过 `PRAGMA table_info` 对所有当前存在的表进行列级完整性核验；若缺失必需列，严格判定分类为 `corrupt`。
  2. 严格化分类逻辑：若存在任意 Detuned 表但 `instance_metadata` 损坏（表丢失、无记录、无 `initialized` 标记或无 `token_secret`），统一分类为 `corrupt`。
  3. `bootstrapDatabase`、CLI `init` 与 `serve` 对 `corrupt` 状态实施统一阻断：以 403 `FORBIDDEN` 明确拒绝，绝不执行任何 DDL，绝不重写 `token_secret`，安全退出并释放锁。

### 2.3 R7-F03 / P1：主题更新历史时间戳丢失与跨空间/实体引用未绑定 (J04, J05)
- **根因**：
  1. 历史主题修订在迁移转换为 `thread.patch` 引用时，未从历史实体或日志中恢复原操作时间戳，导致重放时时间戳变成当前时间。
  2. 幂等引用重建未核验空间归属与对象关系绑定，恶意构造或损坏的引用可能通过修改 `space_id` 越权访问其他空间的主题或关联。
- **修复措施**：
  1. 在 [packages/storage-sqlite/src/bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 的 `migrateSingleRef` 中，历史 `thread.patch` 转换严格读取并绑定其对应的历史 `updated_at` 时间戳；若存在状态冲突则立即中止迁移并原子回滚。
  2. 在 [packages/core/src/services/idempotency-service.ts](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 与迁移器中增加引用归属与实体绑定双重强校验：
     - 主题/帖子所属 `space_id` 必须与请求/记录空间完全一致；
     - `relation.resolve` 引用的 `resolution_id` 必须严格属于目标 `relation_id`。

### 2.4 R7-F04 / P2：引用校验未约束安全整数、白名单字段与合法原因 (J06, J07)
- **根因**：
  1. `validateResultRef` 对数值字段仅检查了 `typeof === 'number'`，未排除浮点数、NaN 和非安全大整数。
  2. 引用对象缺少严格字段白名单（`ALLOWED_KEYS_BY_KIND`），存在携带未定义冗余字段甚至正文缓存的风险。
  3. `unreplayable` 类型未白名单化 `op` 和 `reason` 注册项。
- **修复措施**：
  1. 在 [packages/core/src/services/idempotency-service.ts](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：
     - 所有版本与修订号严格使用 `Number.isSafeInteger(v) && v >= 0` 判定；
     - 建立严格的每类引用允许字段白名单 `ALLOWED_KEYS_BY_KIND`，包含嵌套 relations 数组中的每个元素；
     - 注册合法的 `REGISTERED_UNREPLAYABLE_REASONS` 与已注册操作白名单，未注册的操作或原因直接抛出 422 `RESYNC_REQUIRED`。

---

## 3. B01–B12 断言证据矩阵

| 要求 / 子条件 | 触发步骤 | 关键断言 | 测试文件与行号 | 实际结果 | 未覆盖范围 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B01**：所有已实现操作编码并重建强类型版本化引用，无 JSON 回退 | 覆盖全部 11 种操作（space/thread/post/relation/redaction），调用 `extractResultRef` 序列化并 `reconstructResult` 重建 | `validateResultRef` 校验通过，重构对象包含所有必需字段，绝不包含 `body`/`summary`/`tags` | [m0-m1-r4-b-regression.test.ts:89-205](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L89-L205) | 全部 11 种操作序列化与反序列化通过，无未类型化字段 | 未实现或尚未设计的 M2 业务操作 |
| **B02**：Thread/Post/Relation 重放跨修改与重开保持原操作版本与状态 | 发帖、修改或 resolve 关联，重开 DB 并重放原幂等键 | 返回 HTTP 201/200，`version` 与 `state` 保持为创建时值（如 v1/open），不漂移为最新值 | [m0-m1-r4-b-regression.test.ts:207-295](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L207-L295) | 重放完全匹配历史快照，时钟推进不影响 `updated_at` | 分布式跨节点强一致时钟同步 |
| **B03**：升级后的 resolve 引用在重开后保留原操作版本 | 模拟 v1/c4f041f resolve 记录，执行 `migrateIdempotencyRecords`，重开 DB 并重试请求 | 重放返回 200，`relation_version: 2`，`resolution.id` 一致 | [m0-m1-r4-b-regression.test.ts:297-372](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L297-L372) | 迁移后重放与 resolution 历史完全闭合 | 非法外部篡改的孤立 resolution ID |
| **B04**：未知幂等引用 kind 或未来版本被拒绝为 422 RESYNC_REQUIRED | 构造 `v: 99` 或 `kind: 'unsupported.kind'` 的持久化记录并发起重试 | 响应状态为 422，`error.code` 为 `RESYNC_REQUIRED`，不透传原始引用数据 | [m0-m1-r4-b-regression.test.ts:374-404](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L374-L404) | 返回标准 422 结构化错误 | 客户端自动降级重试逻辑 |
| **B05**：历史 full-JSON 与直接实体记录干净迁移为版本化引用 | 在 DB 中注入旧版完整 space/post/relation JSON 与直接实体结果，执行 `bootstrapDatabase` | 记录更新为 `{ v: 1, kind: ... }`，重试原键返回成功且数据与历史一致 | [m0-m1-r4-b-regression.test.ts:406-484](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L406-L484) | 成功迁移，且迁移后的引用不含敏感 body | 无法解析的畸形非 JSON 字符串（由 B06 处理） |
| **B06**：迁移写失败或损坏数据回滚整笔事务，数据库保持不变 | 注入无法解析的非 JSON 或触发 SQLite 故障，尝试启动升级 | 迁移抛出异常，`schema_migrations` 保持 v1，已转换的记录完全回滚 | [m0-m1-r4-b-regression.test.ts:486-538](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L486-L538) | 事务完全原子回滚，重开后保持原状 | 物理断电造成的磁盘扇区损坏 |
| **B07**：撤销所有凭据保留初始化状态，不增发管理员凭据 | 撤销库中所有凭据，重开 DB 并再次调用 `bootstrapDatabase` | `isNewInstance: false`，`adminToken: null`，`credentials` 数量不变 | [m0-m1-r4-b-regression.test.ts:540-572](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L540-L572) | 初始化标记稳固，绝不隐式重置或增发凭据 | 外部系统密钥轮换与吊销协议 |
| **B08**：原子初始化干净重试；旧库升级不增发 token；损坏 v2 库拒绝 serve | 1. 模拟初始化中途失败，重试成功并仅生成 1 个凭据；2. 旧库升级不发 token；3. v2 库缺失 metadata 拒绝 serve | 1. 重试成功；2. 凭据数不变且无 token；3. serve 抛出 403 实例密钥缺失 | [m0-m1-r4-b-regression.test.ts:574-628](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L574-L628) | 所有场景行为完全符合预期 | 多进程并发执行 `detuned init` 竞争（由目录锁保障） |
| **B09**：init 与 serve 在 DDL 变更前拒绝未来版本与未知非空库 | 分别传入版本为 999 的库与含无关表的非空库，调用 `openAndCoordinateDatabase` | 抛出包含明确错误信息的异常，且 DB 内表结构与数量未发生任何变更 | [m0-m1-r4-b-regression.test.ts:630-678](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L630-L678) | 在执行任何 DDL 前直接拒绝并保持无损 | 损坏的 SQLite 文件头（依赖 SQLite 驱动自身校验） |
| **B10**：token_secret 缺失抛出异常，杜绝内存临时随机密钥回退 | 从 `instance_metadata` 中删除 `token_secret`，调用 `getInstanceSecret` | 立即抛出 403 `FORBIDDEN` 异常，拒绝提供临时密钥 | [m0-m1-r4-b-regression.test.ts:680-696](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L680-L696) | 绝无内存随机 fallback，阻断安全隐患 | 硬件安全模块 (HSM) 集成 |
| **B11**：相同键修改负载返回 409 CONFLICT，并发相同请求安全幂等 | 1. 同一键变更请求体发请求；2. `Promise.all` 发送多个完全相同的并发请求 | 1. 返回 409 `IDEMPOTENCY_CONFLICT`；2. 全部返回 201 且 post ID 完全一致 | [m0-m1-r4-b-regression.test.ts:698-740](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L698-L740) | 冲突识别与并发安全完全符合规范 | 跨网络分区的脑裂冲突 |
| **B12**：脱敏审计覆盖多页修订并在失败时原子回滚 | 创建 25 个修订版本后执行脱敏；并在插入审计或事件失败时验证回滚 | 脱敏覆盖全部 25 个版本；注入故障时内容与 FTS 全面回滚无残留 | [m0-m1-r4-b-regression.test.ts:742-796](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L742-L796) | 跨页脱敏与故障原子性通过 | 大于 10,000 个修订的极端大事务压力测试 |

---

## 4. 验证套件运行证据

### 4.1 本轮 R7 审查探针 (`check-b2-completeness.mjs`)
```
J01: Migration preserves the result of a relation.create that reused an existing v2 relation -> PASS
J02: Current instance material loss is refused consistently by bootstrap, init and serve -> PASS
J03: A current schema with all table names but a missing required column is rejected -> PASS
J04: Migration recovers known historical timestamps and detects non-title snapshot conflicts -> PASS
J05: Reconstruction validates space ownership and resolution-to-relation binding -> PASS
J06: Encoding, validation and unreplayable migration have no bypasses for invalid fields or content -> PASS
J07: Current-format reuse and newly encoded nested relation snapshots remain correct -> PASS
Result: 7 passed, 0 failed (7/7)
```

### 4.2 真实旧 DDL 审查探针 (`check-legacy-fixture.mjs`)
```
historical_schema_source_sha256: a68b02a5d4335c3d0fe48f481212d4d46205ac7f43823fd951e4ccfeca5b0890
K01: A genuine old schema preserves credentials, cleans old content cache and replays correctly across reopen -> PASS
Result: 1 passed, 0 failed (1/1)
```

### 4.3 升级前后 DDL 严格等价性证据 (`storage.test.ts`)
在 [packages/storage-sqlite/tests/storage.test.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/storage.test.ts) 中增加全新测试，对比全新 bootstrap 的数据库与经由 `fa1b35c` 升级而来的数据库：
- 表集合对比：100% 一致（15 张表完全匹配）。
- 列名、类型、非空约束、默认值对比：100% 一致。
- 外键约束对比：100% 一致。
- 索引定义对比：100% 一致。
6 项 storage 测试全部通过。

### 4.4 历史审查探针保持情况
- **R1** `check-behavior.mjs`：15/15 通过
- **R1** `check-adapters.mjs`：5/5 通过
- **R2** `check-remaining.mjs`：12/12 通过
- **R2** `check-cli.mjs`：3/3 通过
- **R3** `check-invariants.mjs`：10/10 通过（T06 夹具已修正为真实 `fa1b35c` DDL）
- **R3** `check-serve-version.mjs`：1/1 通过
- **R4** `check-unfinished-contracts.mjs`：6/8 通过（U01–U04, U07, U08 通过；U05, U06 保持预期失败，归入 R4-C）
- **R5** `check-r4b-gaps.mjs`：9/9 通过
- **R6** `check-upgrade-boundaries.mjs`：10/10 通过

### 4.5 全量自动化测试套件 (`pnpm test`)
```
 Test Files  11 passed (11)
      Tests  91 passed (91)
   Duration  3.21s
```
涵盖：
1. `tests/contracts/cross-interface-contract.test.ts` (2 tests)
2. `tests/contracts/m0-m1-adapters-regression.test.ts` (6 tests)
3. `tests/contracts/m0-m1-r2-adapters.test.ts` (3 tests)
4. `tests/integration/m0-m1-regression.test.ts` (11 tests)
5. `tests/integration/m0-m1-r2-regression.test.ts` (12 tests)
6. `tests/integration/m0-m1-r3-regression.test.ts` (11 tests)
7. `tests/integration/m0-m1-r4-b-regression.test.ts` (27 tests)
8. `tests/integration/m1-discussion.test.ts` (5 tests)
9. `tests/probes/m0-probes.test.ts` (3 tests)
10. `packages/storage-sqlite/tests/storage.test.ts` (6 tests)
11. `packages/storage-sqlite/tests/index.test.ts` (5 tests)

---

## 5. 后续阶段准备说明

- **M2.1 就绪状态**：**尚未就绪**。
- **未完成事项**：
  `check-unfinished-contracts.mjs` 中的 U05（关系枚举在 HTTP 边界的严格校验）与 U06（截断 HTTP 流在客户端的处理）作为已知后续契约缺陷，保持预期失败状态，将在后续 **R4-C：契约与取消链完善** 任务包中集中解决。
- **本轮交付结论**：
  M0/M1-R4-B 数据与升级可靠性收口任务全部完成，历史结果不可变性、多入口实例分类与损坏识别、引用完整性约束与升级原子性已获得充分真实凭证闭环。
