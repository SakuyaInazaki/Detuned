# M0/M1-R4-B 实现与验收证据记录

- **执行基线提交**: `71aefc1839a59f79ad9b6c48af42e36ff49f781a`
- **运行环境**: Node `v26.3.0`, pnpm `11.7.0`, macOS (Darwin arm64)
- **交付包**: M0/M1-R4-B (数据与升级可靠性)
- **关闭缺陷**: R4-F01 ~ R4-F04 及对应的 R3-B 全部验收不变量

---

## 1. 验证命令执行与退出码

| 命令 | 退出码 | 结果简述 |
|---|---|---|
| `pnpm build` | 0 | 9 个工作区包全部编译成功 (`tsc`) |
| `pnpm typecheck` | 0 | 全工作区零类型报错 (`tsc --noEmit`) |
| `pnpm lint` | 0 | 全工作区代码风格与约束检查通过 |
| `pnpm test:all` | 0 | 11 个测试文件，74 项自动化用例全部通过 |
| `pnpm vitest run tests/integration/m0-m1-r4-b-regression.test.ts` | 0 | B01–B12 专属回归套件 12/12 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1/1 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | U01–U04, U07, U08 通过 (6/8)；U05, U06 预期失败 (2/8) 留待 R4-C |

---

## 2. B01–B12 验收矩阵

测试文件位置：[`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts)

| 编号 | 条件 | 验收事实 | 状态 |
|---|---|---|---|
| **B01** | 全部已实现操作族 (space/thread/post/relation/redaction) | 各自 result schema 正确，编码/解码无任意 fallback，未知操作类型 400 明确拒绝 | **PASS** |
| **B02** | 立即/后续变更/重开/响应丢失重试 | 固定操作 ID/版本/关联记录，查询不可变 `thread_versions` 表恢复原标题与版本；不增加业务行和事件；脱敏生效 | **PASS** |
| **B03** | 旧 `$ref` resolve/reopen + 后续相反操作 | 从不可变 `RelationResolution` 重建原操作状态，与 `resolution.version`/`action` 严格一致；关闭 U02 | **PASS** |
| **B04** | 未知 kind/version、缺失历史、损坏 JSON | 明确非成功 422 `RESYNC_REQUIRED`；不回传任意 JSON，不重新执行 action；关闭 U04 | **PASS** |
| **B05** | 既有合法历史格式转换 | 业务数据与凭据不变，无旧正文缓存，版本正确推进到 v2，重复执行和重开一致 | **PASS** |
| **B06** | 第二条引用转换、metadata/版本提交前分别注入失败 | 整个升级在事务内完整回滚，重开后数据库快照与升级前逐字节一致；关闭 U01 | **PASS** |
| **B07** | 全部管理员凭据撤销/过期，actor 禁用 | 不当成新实例，不生成新 token/secret，`isDatabaseInitialized` 保持 true；关闭 U03 | **PASS** |
| **B08** | 空白库首次初始化失败与重试；旧库补 metadata | 前者可安全重试且只生成一份初始材料；后者不增发管理员凭据 | **PASS** |
| **B09** | init 和真实 serve 遇到未来/未知结构 (如 v999) | 监听与 DDL 前拒绝，库逻辑结构和数据不变；两者均统一调用 `openAndCoordinateDatabase` | **PASS** |
| **B10** | secret 缺失/读取或持久化异常；启动失败 | 稳定抛错退出，不使用临时随机 secret 服务请求，防止签发无效凭据 | **PASS** |
| **B11** | 同 key 改 payload、不同目标同 key、竞争写入 | 冲突 409 `IDEMPOTENCY_CONFLICT`；唯一合法提交 | **PASS** |
| **B12** | 已修好的权限/脱敏/ACK | 原有正式测试和审查探针保持通过；U07/U08 保持通过 | **PASS** |

---

## 3. U01–U08 状态核对

源探针：[`docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs)

| 探针 | 描述 | 本轮状态 | 归属说明 |
|---|---|---|---|
| **U01** | 迁移写故障中止升级并原子回滚 | **PASS** | 本轮 R4-B 修复：完整事务包含引用迁移与 schema_migrations |
| **U02** | 旧 resolve 引用在 reopen 后保持原操作版本 | **PASS** | 本轮 R4-B 修复：基于不可变 `RelationResolution` 还原版本与状态 |
| **U03** | 吊销所有凭据保留初始化状态，不增发新 admin token | **PASS** | 本轮 R4-B 修复：初始化状态判定解耦凭据活跃度 |
| **U04** | 未知/损坏幂等引用拒绝并返回 422，不返回 201 | **PASS** | 本轮 R4-B 修复：移除 fallback，校验 schema 与未来版本 |
| **U05** | 非法 relation 枚举在 HTTP 边界拦截 | **FAIL (预期)** | 属后续 **R4-C** 交付包范围，保留未完成状态 |
| **U06** | 截断流 HTTP 响应不能解析为 undefined 成功 | **FAIL (预期)** | 属后续 **R4-C** 交付包范围，保留未完成状态 |
| **U07** | 脱敏审计与内容清除覆盖超出单页上限 (25+ 条) | **PASS** | 前轮 R3-A 修复保持有效 |
| **U08** | 脱敏事件/结果插入失败原子回滚正文与 FTS | **PASS** | 前轮 R3-A 修复保持有效 |

---

## 4. 旧库升级、损坏库处理与凭据恢复

1. **旧库升级执行方式**:
   - 运行 `detuned init` 或启动 `detuned serve` 均可触发自动升级。
   - 系统将首先预检 `schema_migrations.max(version)`：若版本高于当前受支持的 `v2`，立即终止并提示升级 Detuned 二进制。
   - 升级事务依次执行：
     1. 补齐缺失的 `instance_metadata` 表；
     2. 创建 `thread_versions` 表并从现有 `threads` 回填历史基线；
     3. 迁移所有旧 `idempotency_records.result_ref` 为版本化最小引用，清除正文缓存；
     4. 记录 `schema_migrations (version = 2)`。
2. **损坏库处理**:
   - 任何 SQL 写错误、约束异常或触发器失败均使整个升级事务回滚，保留原库不变。
   - 实例持久密钥 `token_secret` 缺失时，拒绝静默降级为临时 secret，提示管理员进行受控恢复。
3. **凭据恢复边界**:
   - 凭据全量吊销属于正常安全运维状态，不可借由 `detuned init` 重置为新实例。
   - 遗失管理员凭据需通过专用恢复工具或已授权的人类管理员会话重发，而非隐式重置数据库。

---

## 5. M2.1 就绪结论

- **结论**: **尚未就绪**。
- **原因**: 依照实施路线和验收规范，必须待 R4-C 包完成 U05（关系类型契约校验）与 U06（响应体流式截断保护）后，方可正式开启 M2.1 任务。
