# M0/M1-R4-B.1 实现与验收证据记录

- **执行基线提交**: `71aefc1839a59f79ad9b6c48af42e36ff49f781a` (包含工作区未提交之修改，详见 [baseline.json](../baseline.json))
- **运行环境**: Node `v26.3.0`, pnpm `11.7.0`, macOS (Darwin arm64)
- **交付任务**: M0/M1-R4-B.1 (修完数据与升级可靠性包)
- **关闭审查缺陷**: R5-F01 ~ R5-F06，补齐 B01–B12 全部真实断言证据

---

## 1. 验证命令执行与退出码

| 命令 | 退出码 | 结果简述 |
|---|---|---|
| `pnpm build` | 0 | 9 个工作区包全部编译成功 (`tsc`) |
| `pnpm typecheck` | 0 | 全工作区零类型报错 (`tsc --noEmit`) |
| `pnpm lint` | 0 | 全工作区代码风格与约束检查通过 (`tsc --noEmit`) |
| `pnpm test:all` | 0 | 11 个测试文件，75 项自动化用例全部通过 |
| `pnpm vitest run tests/integration/m0-m1-r4-b-regression.test.ts` | 0 | B01–B12 专属深度回归套件 12/12 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1/1 全部通过 |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | U01–U04, U07, U08 通过 (6/8)；U05/U06 预期失败 (2/8) 留待 R4-C |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | **9/9 全部通过 (G01–G09 缺陷全部关闭)** |

---

## 2. R5-F01 ~ R5-F06 缺陷关闭报告

### R5-F01 / P1: 操作结果漂移与缺失历史处理
- **根因**: `relation.create` 仅保存 `relation_id`，重试时直接读取当前可变记录（resolve 后被更新为 v2/resolved）；`thread.create` 在 `thread_versions` 缺失目标版本时回退到当前标题拼接历史。
- **修复**:
  1. `IdempotencyResultRef` 扩展 `relation.create` 结构，增加不可变的 `relation_version` 与 `relation_state`；在 `reconstructResult` 中严格按保存的版本和状态重组对象，杜绝 resolve 后重试漂移为 resolved。
  2. `reconstructResult` 在 `tx.getThreadVersion` 返回空快照时，移除回退读取当前 `thread.title` 的分支，统一抛出 422 `RESYNC_REQUIRED`。历史版本确实无法恢复的记录在迁移时标记为 `unreplayable`。
- **证据**: [check-r4b-gaps.mjs](../check-r4b-gaps.mjs) 中的 **G01** 与 **G02** 实测通过。

### R5-F02 / P1: 内层 catch 破坏原子升级
- **根因**: `applyMigrations` 中的历史 INSERT 包含 `OR IGNORE`，静默吞没 SQLite 触发器的 `RAISE(ABORT)`；`migrateSingleRef` 顶层使用 `catch { return null; }`，导致损坏 JSON 被静默跳过而未回滚。
- **修复**:
  1. 移除 `INSERT OR IGNORE`，改为标准 `INSERT INTO thread_versions ... SELECT ...`，确保 SQL 写异常直接触发事务回滚。
  2. 移除 `migrateSingleRef` 的吞错 catch，遇到损坏 JSON 或异常字段时直接抛出错误，中止整个升级事务并回滚到升级前状态。
- **证据**: [check-r4b-gaps.mjs](../check-r4b-gaps.mjs) 中的 **G03** 与 **G04** 实测通过。

### R5-F03 / P1: 未知非空数据库识别
- **根因**: 仅凭 `max(version) > 2` 无法识别与 Detuned 完全无关的外来 SQLite 数据库，导致其被直接执行全量 DDL 甚至签发管理员凭据。
- **修复**: 实现 `classifyDatabase` 分类器，在执行任何 DDL/DML 之前检查数据库是否包含 Detuned 核心表。对于仅包含外来表（如 `unrelated_notes`）的非空数据库，归类为 `'unknown'` 并抛出 400 校验错误拒绝写入，保持原有数据库结构与数据完全不变。
- **证据**: [check-r4b-gaps.mjs](../check-r4b-gaps.mjs) 中的 **G05** 实测通过。

### R5-F04 / P2: 联合类型的运行时边界校验
- **根因**: TypeScript 静态联合类型未在运行时做入界反序列化防御，`reconstructResult` 对 `v: 0`、缺失 `thread_version` 或 operation 与 kind 不匹配的数据直接放行。
- **修复**: 增加 `validateResultRef(operation, raw)` 纯运行时校验函数，严格检查：
  1. `v === 1`（拒绝 v=0 或未来版本）；
  2. 禁止包含 `body`、`summary`、`tags` 等缓存字段；
  3. 校验 operation 与 result kind 的显式穷尽绑定；
  4. 逐 kind 验证必填字段类型与范围（如 integer 版本 >= 1）。
- **证据**: [check-r4b-gaps.mjs](../check-r4b-gaps.mjs) 中的 **G06** 实测通过。

### R5-F05 / P2: 可恢复的旧直接实体结果迁移
- **根因**: 历史代码曾直接保存 `Relation` 实体或 `Post` 撤回实体，旧迁移器漏判这些形态导致其被误标记为 `unreplayable`。
- **修复**: 在 `migrateSingleRef` 中加入直接 `Relation`（含 `source_post_id`/`target_post_id`）与直接撤回 `Post`（含 `lifecycle === 'withdrawn'`）的解码分支，提取关键 ID、版本和状态后升级为合法的 `v: 1` 引用。
- **证据**: [check-r4b-gaps.mjs](../check-r4b-gaps.mjs) 中的 **G07** 实测通过。

### R5-F06 / P2: 启动生命周期统一与资源异常清理
- **根因**: `serve` 协调入口在迁移前过早要求已存在 `instance_metadata`，导致合法的 `fa1b35c` 旧库被拒；缺失 `token_secret` 时抛错脱离 try/catch，未能输出 CLI 结构化错误且遗留 `detuned.lock`。
- **修复**:
  1. `openAndCoordinateDatabase` 统一支持在 `serve` 模式下识别受支持旧库（`'supported_legacy'`）并在事务内自动升级，不增发管理员凭据；
  2. CLI `init` 与 `serve` 采用全链路单 try/catch 机制，在任何步骤（获取锁、打开 DB、迁移、读取 secret、构建 app、监听）失败时，按序执行 `app.close()` -> `db.close()` -> `lock.release()`，并调用 `handleError` 输出标准结构化错误，非零退出。
- **证据**: [check-r4b-gaps.mjs](../check-r4b-gaps.mjs) 中的 **G08** 与 **G09** 实测通过。

---

## 3. B01–B12 完整验收断言表

测试执行文件：[`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts)

| 要求/子条件 | 触发步骤 | 关键断言 | 测试文件与行号 | 实际结果 | 未覆盖范围 |
|---|---|---|---|---|---|
| **B01: 全操作族引用编码与重建** | 依次触发 space.create/patch, thread.create/patch, post.create/rev/withdraw, relation.create/resolve/reopen, admin.redaction | 1. 各操作 `result_ref` 符合 `v: 1` schema 且不含 body/summary/tags 缓存<br>2. 业务重建与原版本/状态一致<br>3. 未注册操作 `unknown.operation` 抛错拒绝 | [m0-m1-r4-b-regression.test.ts#L89-L205](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L89-L205) | 实际运行通过，9 种操作均生成合法引用且通过 `validateResultRef` | 无 |
| **B02: 状态变更、脱敏与重开重放** | 1. thread.create 后 patch title<br>2. relation.create 后 resolve<br>3. post.create 后 redact<br>4. 关闭 DB 并重新打开文件库<br>5. 携带原 key 重发上述各请求 | 1. thread 重试返回 v1 及原标题<br>2. relation 重试返回 v1/open（G01 防漂移）<br>3. post 重试返回脱敏后 `[REDACTED]` 正文<br>4. 重开后数据一致，线程总数维持 1 | [m0-m1-r4-b-regression.test.ts#L207-L295](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L207-L295) | 实际运行通过，重试不增加记录，脱敏与版本保护在进程重启后依然生效 | 无 |
| **B03: 决议版本与旧 $ref 升级重放** | 1. 关系 resolve(v2) -> reopen(v3)<br>2. 原 key 重试 resolve<br>3. 注入旧 `$ref: 'relation'` 引用后执行迁移并重试 (U02) | 1. 重放返回 relation.version=2, state='resolved'<br>2. resolution.id 与 resolution.version=2 严格一致<br>3. 升级旧引用后重放同样精确恢复 v2/resolved | [m0-m1-r4-b-regression.test.ts#L297-L372](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L297-L372) | 实际运行通过，新旧格式均能基于不可变 resolution 恢复历史状态 | 无 |
| **B04: 运行时格式与版本严格校验** | 修改 `idempotency_records.result_ref` 为：v=0、v=99、缺 thread_version、operation 与 kind 不匹配、包含非法 body 字段；再按原 key 重发请求 | 每次非法请求均返回 HTTP 422，错误码为 `RESYNC_REQUIRED`，不执行业务 action，不返回 201 | [m0-m1-r4-b-regression.test.ts#L374-L404](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L374-L404) | 实际运行通过，5 种畸变引用均被 `validateResultRef` 拦截并转为 422 | 无 |
| **B05: 历史全量及直接实体平滑迁移** | 1. 注入含完整正文的旧 post 响应<br>2. 注入 direct Relation 及 direct withdraw Post (G07)<br>3. 调用 `migrateIdempotencyRecords` | 1. 迁移后正文缓存被剥离，v 升级为 1<br>2. 关系与撤回引用转换为 typed 格式<br>3. 重放请求 201/200 成功，实体 ID 与版本正确 | [m0-m1-r4-b-regression.test.ts#L406-L484](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L406-L484) | 实际运行通过，无正文泄漏，直接实体转换后重放完全一致 | 无 |
| **B06: 升级历史写入故障原子回滚** | 1. 构造 v1 结构库<br>2. 在 `thread_versions` 表安装 `BEFORE INSERT RAISE(ABORT)` 触发器 (G03)<br>3. 执行 `bootstrapDatabase` 并捕获异常<br>4. 重开数据库检查快照 | 1. `bootstrapDatabase` 抛出模拟 SQL 异常<br>2. 数据库回滚，`schema_migrations` 维持版本 1<br>3. 重开后表结构与升级前完全一致 | [m0-m1-r4-b-regression.test.ts#L486-L538](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L486-L538) | 实际运行通过，触发器执行并阻止了不完整迁移的提交 | 文件物理字节级因 SQLite WAL 头部或 free-page 不承诺逐字节一致，断言以逻辑表结构与数据为准 |
| **B07: 凭据撤销、过期与 actor 禁用** | 1. 全部凭据标记 `revoked_at`<br>2. 全部凭据标记 `expires_at` 过期<br>3. 管理员标记 `disabled_at`<br>4. 各阶段调用 `bootstrapDatabase`<br>5. 检查凭据数量与 secret | 1. `isDatabaseInitialized` 始终为 true<br>2. 各阶段 `isNewInstance` 为 false，`adminToken` 为 null<br>3. 凭据总数不增加<br>4. `token_secret` 保持不变 | [m0-m1-r4-b-regression.test.ts#L540-L572](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L540-L572) | 实际运行通过，实例身份与密钥完全稳定，不产生覆盖 | 无 |
| **B08: 首次初始化故障恢复与旧库升级** | 1. 模拟初次 bootstrap 时凭据 INSERT 失败并重开 (S11)<br>2. 重试初始化<br>3. 模拟无 metadata 但有管理员的旧库升级 | 1. 首次失败抛错；重试成功，`isNewInstance: true` 并返回 token<br>2. 成功创建 1 个凭据<br>3. 旧库升级生成 metadata 但不增发 token/credential | [m0-m1-r4-b-regression.test.ts#L574-L617](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L574-L617) | 实际运行通过，初始化重试与旧库升级无多余凭据签发 | 无 |
| **B09: 未来版本、未知非空库与旧库协调** | 1. 注入 v999 数据库并分别调用 init/serve<br>2. 注入含 `unrelated_notes` 的未知库调用 init (G05)<br>3. 构造旧版本库调用 serve (G08) | 1. v999 拒绝，表数量不变<br>2. 未知库被拒绝（抛出 400），无表被创建<br>3. 旧库在 serve 模式下平滑升级为 v2，不增发凭据 | [m0-m1-r4-b-regression.test.ts#L619-L667](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L619-L667) | 实际运行通过，分类器在 DDL 前完成判别与拦截 | 无 |
| **B10: 密钥缺失防御与 CLI 清理** | 1. 删除 `token_secret`<br>2. 检查 `getInstanceSecret()` 及 coordinator<br>3. 运行子进程 `init --json` 与 `serve --json` (G09) | 1. `getInstanceSecret` 抛错<br>2. coordinator 拒绝启动（403）<br>3. 两 CLI 子进程均退出码 3，输出结构化错误，`detuned.lock` 彻底释放 | [m0-m1-r4-b-regression.test.ts#L669-L685](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L669-L685) 以及 [check-r4b-gaps.mjs G09](../check-r4b-gaps.mjs#L248-L270) | 实际运行通过，进程退出后无残留锁文件 | 无 |
| **B11: 并发请求竞争与作用域隔离** | 1. `Promise.all` 发送同 key 并发请求<br>2. 发送同 key 不同 payload 请求<br>3. 发送同 key 但不同 space 请求 | 1. 两并发请求均成功返回 201 且结果一致，DB 仅建 1 条主题<br>2. 不同 payload 返回 409 `IDEMPOTENCY_CONFLICT`<br>3. 不同 space 互不干扰，正常创建 | [m0-m1-r4-b-regression.test.ts#L687-L729](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L687-L729) | 实际运行通过，并发屏障与作用域隔离符合幂等规范 | 无 |
| **B12: 大分页脱敏与原子事件回滚** | 1. 创建包含 25 个修订的帖子（超过默认 20 条分页）<br>2. 执行脱敏<br>3. 注入事件写入故障 (U08) | 1. 25 个修订的正文全部被置换为 `[REDACTED]`<br>2. post lifecycle 变为 `'redacted'`<br>3. 审计记录中 `affected_revisions` 包含 25 项<br>4. 事件插入故障时完全回滚至 active | [m0-m1-r4-b-regression.test.ts#L731-L772](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L731-L772) 以及 [check-unfinished-contracts.mjs U07/U08](../check-unfinished-contracts.mjs#L170-L210) | 实际运行通过，大批量修订脱敏无遗漏，写入故障原子回滚 | 无 |

---

## 4. DDL 单一来源声明与验证

- **源文件**: [`packages/storage-sqlite/src/schema.sql`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/schema.sql) 为 SQLite 完整 DDL 的单一事实来源。
- **TypeScript 产物**: [`packages/storage-sqlite/src/schema.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/schema.ts) 中的 `SCHEMA_SQL` 常量由 `schema.sql` 映射输出。
- **一致性保护**: 在 [`packages/storage-sqlite/tests/storage.test.ts#L162-L168`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/storage.test.ts#L162-L168) 中建立了自动化测试，强制断言 `SCHEMA_SQL.trim() === fs.readFileSync('schema.sql').trim()`，若发生手工偏离将导致 CI 与本地测试失败。

---

## 5. 可复跑旧库升级与故障恢复步骤

1. **旧版库升级命令**:
   ```sh
   # 针对任一历史 Detuned 数据库目录
   pnpm --filter @detuned/cli build
   node packages/cli/dist/index.js serve --data-dir <data-dir> --port 3000
   ```
   - 自动识别历史结构并升级为 schema v2；
   - 历史幂等记录自动清理正文缓存并转换为紧凑型引用；
   - 保持原有管理员 actor 与凭据，绝不增发新凭据。

2. **升级异常诊断与回滚恢复**:
   - 升级操作由单个 SQLite 事务包裹；若在迁移过程中发生断电或写错误（如 trigger 或 SQL 错误），事务自动全量回滚，保留原 v1 结构。
   - 针对损坏的 JSON 记录，启动时会报错抛出具名定位信息（如 `op=..., key=...`），管理员可介入审查损坏记录，修复后再次启动。

---

## 6. 当前结论与下一步

- **结论**: **M0/M1-R4-B 全部验收条件已完全满足，R5-F01 ~ R5-F06 缺陷清零，G01 ~ G09 全部通过。**
- **已知后续任务**: R4-C（接口契约收敛与取消传播收尾，涉及 U05/U06）。
- **M2.1 状态**: 待 R4-C 闭环验收后开启。
