# M0/M1-R4-B.2 实施与验收报告：历史结果与升级边界

## 1. 任务概述与交付边界

- **任务编号**：M0/M1-R4-B.2（完成历史结果与升级边界，关闭 R6-F01 ~ R6-F05）
- **基线源码**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a` 叠加工作区未提交修改
- **交付目标**：
  1. 关闭最新审查发现 R6-F01 ~ R6-F05。
  2. 通过本轮审查脚本 `check-upgrade-boundaries.mjs` 中的 H01 ~ H10 全部 10 项探针（10/10 通过）。
  3. 保持 R1 ~ R3 历史审查探针（46 项）、R4-B 探针（6/8 通过，仅 U05/U06 保持后续契约缺陷失败）及 R5 探针（9/9 通过）全部通过。
  4. 正式单元与集成测试套件全部通过（84/84 项通过）。
  5. 明确说明：**本轮不执行 R4-C，不进入 M2.1**。U05/U06 为后续契约已知缺陷。

---

## 2. R6-F01 ~ R6-F05 根因分析与修复说明

### 2.1 R6-F01 / P1：原操作结果在旧格式和关联对象路径中漂移（H01、H02）
- **根因**：
  1. `migrateSingleRef` 迁移历史关联创建记录时，查询了可变当前表的 `relations` 状态，若该 relation 在历史操作后被 resolve，迁移器错误地填入当前 state/version（如 `v2/resolved`），永久污染了历史快照。
  2. 重放主题创建操作时，`reconstructResult` 重新组装 thread 对象取用了当前时钟或当前 threads 表的 `updated_at`，导致时钟推进后重放的时间戳漂移。发帖重放中的嵌套关联对象直接使用了当前关系行的版本与状态，而非创建时的历史状态。
- **修复措施**：
  1. 在 [bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中，历史 `relation.create` 迁移直接固定为原操作初始版本（version = 1）和初始状态（`challenges` 关系为 `'open'`，非 challenges 关系为 `'resolved'`），不再从可变表中提取当前状态。
  2. 在 [idempotency-service.ts](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中，`reconstructResult` 从 `thread_versions` 快照恢复 `updated_at: snap.created_at`，严格固定主题创建时的更新时间；嵌套 relations 从引用记录中恢复历史的 `(id, version, state)`。

### 2.2 R6-F02 / P1：当前实例损坏仍被误判为旧库或健康库（H03、H04）
- **根因**：
  1. `classifyDatabase` 在未检查数据库 schema 版本与 v2 表存在性的情况下，因发现存在 human actor 就直接回退判定为 `supported_legacy`，导致缺少 `instance_metadata` 的当前 v2 数据库在 serve/init 流程中被重新生成 token secret 或错误降级。
  2. 核心表校验缺少 `memberships`（此前误拼为 `space_memberships`），且对 v2 必需表结构及迁移版本连续性（如仅有 version 2 缺少 version 1）未做断言。
- **修复措施**：
  1. 在 [bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 的 `classifyDatabase` 中增加当前 v2 库必需表检查（包含 `post_revisions`、`thread_versions` 等 15 张表）；若存在 v2 表或 schema 版本大于等于 2，但缺少 `instance_metadata`，严格判定为损坏并拒绝启动。
  2. 增加版本连续性校验：若 `schema_migrations` 包含版本 2 但缺少版本 1，判定为 `corrupt`。
  3. 在 `openAndCoordinateDatabase` 的 `serve` 模式中，若数据库含有 `thread_versions` 或版本大于等于 2 但缺少 `instance_metadata`，在建立监听前直接以 403 `FORBIDDEN` 拒绝。

### 2.3 R6-F03 / P1：迁移输出未统一校验，冲突历史被静默舍弃（H05、H08）
- **根因**：
  1. `migrateSingleRef` 允许非法版本号（如 `v: 99`）绕过版本守卫；且对转换生成的引用缺少针对目标操作的 `validateResultRef` 验证，导致 thread 操作挂载 post 结果也能被写入。
  2. 迁移历史主题记录时，若已存在相同 `(thread_id, version)` 但 title 不同的记录，直接被跳过，导致历史矛盾被静默丢弃。
- **修复措施**：
  1. 在 [bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中增加前置版本守卫：若 `parsed.v !== undefined && parsed.v !== 1`，立即抛出异常拒绝迁移。
  2. 每一条迁移生成的引用在返回前必须通过 `validateResultRef(operation, ref)` 的全面字段与操作绑定校验。
  3. 历史主题版本检测：若 `thread_versions` 已存在记录且其 `title !== title`，立即抛出历史冲突异常，中止并回滚整笔数据库升级。

### 2.4 R6-F04 / P2：引用验证与重放缺少可选字段、目标和完整性检查（H06、H07）
- **根因**：
  1. `parseOperation` 之前使用宽松前缀或未注册操作返回 null，未严格拒绝前缀相似但非法的操作（如 `thread.patch_unregistered`）。
  2. `validateResultRef` 仅校验了部分必填字段，未限制字段白名单，未递归校验嵌套对象是否包含缓存的正文（`body`、`summary`、`tags`），且未对整数上下界进行约束。
  3. 重放流程中，PATCH/POST 重放未核验 URL 目标对象 ID 与引用中记录的 target ID 是否匹配；缺失关联关系时直接被 `.filter(Boolean)` 静默丢弃并返回假成功。
- **修复措施**：
  1. 在 [idempotency-service.ts](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中建立严格的 `parseOperation` 11 种操作注册表，任何非精确匹配的操作直接抛出 422 `RESYNC_REQUIRED`。
  2. 引入 `hasForbiddenContent` 递归校验，杜绝任何层级包含 `body`/`summary`/`tags` 的缓存字段；`validateResultRef` 按 kind 施加严格字段白名单（`allowedKeysByKind`），校验 revision/version 必须为非负安全整数，`relation_ids` 必须为数组。
  3. 在 `reconstructResult` 中，核验 `thread.patch`、`post.revision`、`post.withdraw`、`relation.resolve` 的 target ID 必须与 URL 一致；关联关系若在数据库中丢失，显式返回 422 `RESYNC_REQUIRED` 结构化错误，不再静默丢弃。

### 2.5 R6-F05 / P3：迁移诊断向 CLI 泄露原始正文（H09）
- **根因**：`migrateSingleRef` 抛出异常的错误消息字符串插值了完整的 `${resultRefStr}`，当异常冒泡至 CLI 输出时，可能将历史正文输出到 stdout/stderr。
- **修复措施**：在 [bootstrap.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 的所有错误抛出点中彻底移除 `resultRefStr` 内容，仅输出经过受控脱敏的操作名与键名标识（如 `(op=${operation}, key=${key})`）。

---

## 3. B01–B12 断言证据矩阵

| 要求 / 子条件 | 触发步骤 | 关键断言 | 测试文件与行号 | 实际结果 | 未覆盖范围 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B01**：所有已实现操作编码并重建强类型版本化引用，无 JSON 回退 | 覆盖全部 11 种操作（space/thread/post/relation/redaction），调用 `extractResultRef` 序列化并 `reconstructResult` 重建 | `validateResultRef` 校验通过，重构对象包含所有必需字段，绝不包含 `body`/`summary`/`tags` | [m0-m1-r4-b-regression.test.ts:72-192](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L72-L192) | 全部 11 种操作序列化与反序列化通过，无未类型化字段 | 未实现或尚未设计的 M2 业务操作 |
| **B02**：Thread/Post/Relation 重放跨修改与重开保持原操作版本与状态 | 发帖、修改或 resolve 关联，重开 DB 并重放原幂等键 | 返回 HTTP 201/200，`version` 与 `state` 保持为创建时值（如 v1/open），不漂移为最新值 | [m0-m1-r4-b-regression.test.ts:194-278](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L194-L278) | 重放完全匹配历史快照，时钟推进不影响 `updated_at` | 分布式跨节点强一致时钟同步 |
| **B03**：升级后的 resolve 引用在重开后保留原操作版本 | 模拟 v1/c4f041f resolve 记录，执行 `migrateIdempotencyRecords`，重开 DB 并重试请求 | 重放返回 200，`relation_version: 2`，`resolution.id` 一致 | [m0-m1-r4-b-regression.test.ts:280-335](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L280-L335) | 迁移后重放与 resolution 历史完全闭合 | 非法外部篡改的孤立 resolution ID |
| **B04**：未知幂等引用 kind 或未来版本被拒绝为 422 RESYNC_REQUIRED | 构造 `v: 99` 或 `kind: 'unsupported.kind'` 的持久化记录并发起重试 | 响应状态为 422，`error.code` 为 `RESYNC_REQUIRED`，不透传原始引用数据 | [m0-m1-r4-b-regression.test.ts:337-375](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L337-L375) | 返回标准 422 结构化错误 | 客户端自动降级重试逻辑 |
| **B05**：历史 full-JSON 与直接实体记录干净迁移为版本化引用 | 在 DB 中注入旧版完整 space/post/relation JSON 与直接实体结果，执行 `bootstrapDatabase` | 记录更新为 `{ v: 1, kind: ... }`，重试原键返回成功且数据与历史一致 | [m0-m1-r4-b-regression.test.ts:377-456](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L377-L456) | 成功迁移，且迁移后的引用不含敏感 body | 无法解析的畸形非 JSON 字符串（由 B06 处理） |
| **B06**：迁移写失败或损坏数据回滚整笔事务，数据库保持不变 | 注入无法解析的非 JSON 或触发 SQLite 故障，尝试启动升级 | 迁移抛出异常，`schema_migrations` 保持 v1，已转换的记录完全回滚 | [m0-m1-r4-b-regression.test.ts:458-525](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L458-L525) | 事务完全原子回滚，重开后保持原状 | 物理断电造成的磁盘扇区损坏 |
| **B07**：撤销所有凭据保留初始化状态，不增发管理员凭据 | 撤销库中所有凭据，重开 DB 并再次调用 `bootstrapDatabase` | `isNewInstance: false`，`adminToken: null`，`credentials` 数量不变 | [m0-m1-r4-b-regression.test.ts:527-570](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L527-L570) | 初始化标记稳固，绝不隐式重置或增发凭据 | 外部系统密钥轮换与吊销协议 |
| **B08**：原子初始化干净重试；旧库升级不增发 token；损坏 v2 库拒绝 serve | 1. 模拟初始化中途失败，重试成功并仅生成 1 个凭据；2. 旧库升级不发 token；3. v2 库缺失 metadata 拒绝 serve | 1. 重试成功；2. 凭据数不变且无 token；3. serve 抛出 403 实例密钥缺失 | [m0-m1-r4-b-regression.test.ts:572-628](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L572-L628) | 所有场景行为完全符合预期 | 多进程并发执行 `detuned init` 竞争（由目录锁保障） |
| **B09**：init 与 serve 在 DDL 变更前拒绝未来版本与未知非空库 | 分别传入版本为 999 的库与含无关表的非空库，调用 `openAndCoordinateDatabase` | 抛出包含明确错误信息的异常，且 DB 内表结构与数量未发生任何变更 | [m0-m1-r4-b-regression.test.ts:630-678](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L630-L678) | 在执行任何 DDL 前直接拒绝并保持无损 | 损坏的 SQLite 文件头（依赖 SQLite 驱动自身校验） |
| **B10**：token_secret 缺失抛出异常，杜绝内存临时随机密钥回退 | 从 `instance_metadata` 中删除 `token_secret`，调用 `getInstanceSecret` | 立即抛出 403 `FORBIDDEN` 异常，拒绝提供临时密钥 | [m0-m1-r4-b-regression.test.ts:680-710](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L680-L710) | 绝无内存随机 fallback，阻断安全隐患 | 硬件安全模块 (HSM) 集成 |
| **B11**：相同键修改负载返回 409 CONFLICT，并发相同请求安全幂等 | 1. 同一键变更请求体发请求；2. `Promise.all` 发送多个完全相同的并发请求 | 1. 返回 409 `IDEMPOTENCY_CONFLICT`；2. 全部返回 201 且 post ID 完全一致 | [m0-m1-r4-b-regression.test.ts:712-760](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L712-L760) | 冲突识别与并发安全完全符合规范 | 跨网络分区的脑裂冲突 |
| **B12**：脱敏审计覆盖多页修订并在失败时原子回滚 | 创建 25 个修订版本后执行脱敏；并在插入审计或事件失败时验证回滚 | 脱敏覆盖全部 25 个版本；注入故障时内容与 FTS 全面回滚无残留 | [m0-m1-r4-b-regression.test.ts:762-840](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L762-L840) | 跨页脱敏与故障原子性通过 | 大于 10,000 个修订的极端大事务压力测试 |

---

## 4. 验证套件运行证据

### 4.1 本轮 R6 审查探针 (`check-upgrade-boundaries.mjs`)
```
H01: Upgrading known old relation.create references never substitutes the current state -> PASS
H02: Fresh thread times and nested relation versions remain tied to the original operation -> PASS
H03: A current instance with lost metadata is refused without generating a replacement secret -> PASS
H04: Missing required schema or contradictory migration markers fail before mutation -> PASS
H05: Unsupported references and incompatible legacy results abort the complete upgrade -> PASS
H06: Reference validation rejects unregistered operations, invalid optional fields and extra cached content -> PASS
H07: Replay checks the operation target and does not silently drop missing associated records -> PASS
H08: Conflicting history for the same immutable key rejects migration instead of discarding the old evidence -> PASS
H09: Migration diagnostics identify the record without copying old body content to CLI output -> PASS
H10: Version-marker and metadata SQL failures both roll back the whole upgrade after reopen -> PASS
Result: 10 passed, 0 failed (10/10)
```

### 4.2 历史审查探针保持情况
- **R1** `check-behavior.mjs`：15/15 通过
- **R1** `check-adapters.mjs`：5/5 通过
- **R2** `check-remaining.mjs`：12/12 通过
- **R2** `check-cli.mjs`：3/3 通过
- **R3** `check-invariants.mjs`：10/10 通过
- **R3** `check-serve-version.mjs`：1/1 通过
- **R4** `check-unfinished-contracts.mjs`：6/8 通过（仅 U05/U06 保持已知后续缺陷，exit code 1）
- **R5** `check-r4b-gaps.mjs`：9/9 通过
- **R6** `check-upgrade-boundaries.mjs`：10/10 通过

### 4.3 单元与集成测试套件 (`pnpm test`)
- 11 个测试文件，84 项测试全部通过（通过率 100%）。

---

## 5. M2.1 就绪状态评估

**明确结论：当前尚未具备进入 M2.1 的条件。**
- 尽管数据与升级可靠性包（R4-B / R4-B.1 / R4-B.2）已彻底完成且全部 10 项升级边界探针变绿，但上一轮划分的 **R4-C 契约与取消链补齐** 尚未执行。
- `check-unfinished-contracts.mjs` 中的 **U05**（关系枚举 HTTP 边界未拦截）与 **U06**（截断响应体假成功）仍作为已知缺陷挂起，必须待 R4-C 独立包完成后方可评估 M2.1 就绪性。
