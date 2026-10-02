# M0/M1-R4-B.4-3R4 实施与验收交付报告

**任务编号**：M0/M1-R4-B.4-3R4：主键来源约束与生成失败原子性  
**交付日期**：2026-10-02  
**工作区**：`/Users/sakimi/Desktop/Detuned`  
**Git HEAD**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（保留既有多轮未提交工作）  
**当前状态**：B.4-3R4 自验通过，待独立复核（整包未独立验收，不自动开始 R4-C 或 M2）

---

## 一、 任务概述与工作边界

本轮任务严格聚焦于关闭 R18 独立复核报告中指出的剩余缺口：
1. **R18-F01（AB01）**：主键属性来源约束与生成校验。在共享提取器 `extract-schema-requirements.mjs` 中识别 `idx.origin === "pk"`，核查主键排序规则（`coll === 'BINARY'`）、方向（`desc === 0`）与非表达式键（`cid >= 0 && name !== null`），对不支持的 NOCASE、DESC 或表达式主键直接抛出结构错误，由生成脚本与同步校验工具以 exit 1 阻断。
2. **R18-F02（AB02）**：生成失败原子性与缺失迁移标记处理。在 `generate-schema.mjs` 中预先在内存中校验模版与迁移标记（`// BEGIN MIGRATION_DDL` / `// END MIGRATION_DDL`）的完整性与生成内容，遇到错误立即退出（exit 1），绝不调用 `writeFileSync` 污染或截断磁盘文件，保持源文件 SHA256 绝对一致。
3. **R18-E01**：在 `packages/storage-sqlite/tests/schema-generation.test.ts` 中建立正式生成链路回归测试套件；如实澄清 R17 历史文件覆盖原委，执行全部 26 条验证命令并将完整 stdout/stderr 独立归档至本轮隔离日志目录，原审查材料保持原始字节与哈希。

**工作边界与约束**：
- 严格遵守用户禁令：未使用、未安装、未启用 `deepseek-brainstorm`；
- 未启动其他 Agent，未调用外部模型，未修改用户全局 harness 配置，未执行 git reset/clean/checkout，未提交/推送/部署；
- 冻结保留 `tests/fixtures/historical-v1-schema.sql`、`archive/pre-plan.original.md` 原字节以及所有历史审查脚本与日志；
- 所有破坏性/故障实验仅在隔离临时目录与临时 SQLite 数据库中执行；
- 恪守任务边界，未触及 R4-C、M2，不宣称整个 B 包验收完毕。

---

## 二、 缺陷根因与修复方案

### 1. 关闭 R18-F01：主键属性来源约束与生成校验（AB01）

- **根本原因**：
  SQLite 支持在 `PRIMARY KEY` 声明中包含排序规则（如 `COLLATE NOCASE`）、排序方向（如 `DESC`）或表达式键。此前提取器 `extract-schema-requirements.mjs` 仅检查了显式命名索引，在过滤 `PRAGMA index_list` 时忽略了 `origin === "pk"` 的自动索引（autoindex），导致含有 `NOCASE` 或 `DESC` 的主键定义未被检查而直接逃逸，生成脚本与同步检查工具返回成功。但在运行时，Detuned 的 SQLite 存储层和幂等服务依赖标准的二进制升序唯一主键约束（`BINARY ASC`），大小写不敏感或表达式主键会隐式破坏业务隔离与幂等命中语义。
- **修复方案**：
  - 在 [extract-schema-requirements.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/extract-schema-requirements.mjs) 中，遍历每个表的索引列表时，显式检查 `idx.origin === "pk"` 的主键索引：
    1. 校验索引必须为非 Partial（`idx.partial === 0`）且唯一（`idx.unique === 1`）；
    2. 通过 `PRAGMA index_xinfo` 获取所有索引列，要求无表达式键（`hasExpression` 必须为 false，`cid >= 0 && name !== null`）；
    3. 要求每个键项的排序规则必须为 `coll === 'BINARY'`，方向必须为正向 `desc === 0`；
    4. 发现任何不合规项立即抛出附带表名与列名的明确异常（如 `Table idempotency_records: primary key column actor_id must have COLLATE BINARY, got NOCASE` 或 `must be ASC, got DESC`）。
  - 在 [generate-schema.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/generate-schema.mjs) 与 [check-schema-sync.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/check-schema-sync.mjs) 中捕获提取异常，向 stderr 输出清晰诊断并以非零状态码 `process.exit(1)` 退出，阻断非法主键进入静态 profile。
- **验证证据**：
  - 探针 `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` 中 AB01 两种变异（NOCASE / DESC）全部以 exit 1 拦截，探针通过；
  - 新增正式测试 [packages/storage-sqlite/tests/schema-generation.test.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/schema-generation.test.ts#L43) 用例 `extractDatabaseRequirements rejects unsupported primary key collation (NOCASE) and direction (DESC)` 验证通过。

---

### 2. 关闭 R18-F02：生成失败原子性与缺失迁移标记处理（AB02）

- **根本原因**：
  此前 `generate-schema.mjs` 在读入 `schema.ts` 源码后直接进行正则或位置替换，若模板中由于人工维护或意外编辑缺失了 `// BEGIN MIGRATION_DDL` 或 `// END MIGRATION_DDL` 标记，或者提取过程抛错，脚本可能产生残缺输出，甚至可能在写入途中部分写出文件，造成磁盘文件损坏且不可还原。
- **修复方案**：
  - 在 [generate-schema.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/generate-schema.mjs) 中增加全内存前置预检机制：
    1. 在内存中解析 `schema.ts` 源码，严格校验 `// BEGIN MIGRATION_DDL` 与 `// END MIGRATION_DDL` 两个标记必须同时存在且起始位置早于结束位置；
    2. 校验 `SCHEMA_SQL`、`V2_SCHEMA_TABLES` 和 `V1_SCHEMA_TABLES` 三个常量定义块在内存中均能完整匹配与提取；
    3. 全程在内存中生成新的代码字符串；
    4. 只有在所有检查、提取与字符串格式化全部无异常完成后，才在最后一步执行 `writeFileSync(schemaTsPath, resultSource)`；
    5. 若发生任何标记缺失或处理异常，立即在控制台打印错误并以 `process.exit(1)` 退出，绝不调用 `writeFileSync`，确保磁盘上的 `schema.ts` 文件内容与字节 SHA256 绝对不受污染。
- **验证证据**：
  - 探针 `check-generation-completeness.mjs` 中 AB02 破坏性测试通过：故意删除标记后执行生成，工具以 exit 1 退出，磁盘文件 SHA256 与修改前完全一致（保持不变）；
  - 新增正式测试 [packages/storage-sqlite/tests/schema-generation.test.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/schema-generation.test.ts#L106) 用例 `generate-schema.mjs fails atomically with exit 1 and leaves schema.ts unmodified when markers are missing` 验证通过。

---

## 三、 R18-E01 交付事实勘误与历史覆盖声明

### 1. 历史文件覆盖原委声明（Immutable Review Integrity）
- 在 R17 轮次运行检查脚本时，`check-profile-and-fts.mjs` 曾直接将其输出写回到了 `docs/reviews/2026-10-02-m0-m1-r17/observed-profile-and-fts.json`。R18 审查报告已确认该情况，并固定了其被覆盖前的预存哈希 `2d21046fe75399587a8f15858cfd7be1ae9f9d784a92cfa76e9389a9fba11b81`。
- 本轮（B.4-3R4）严格执行历史审查记录不可篡改规范：
  - **绝不改动任何历史轮次目录（R17 及之前）的任何文件**；
  - **绝不篡改 R18 独立复核已确立的既有基线与探针文件**（包括保留 `observed-generation-completeness.json` 的原字节与 SHA256）；
  - 本轮全部 26 条验证命令的执行结果与完整 stdout/stderr 均统一定向写入至本轮专用日志目录 [docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/) 与 [commands.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/commands.json)。

### 2. 术语与测试细节精确对齐
- **真实 11 族业务操作**：严格核实并使用真实实现的 11 族操作类型：`space.create`、`space.patch`、`thread.create`、`thread.patch`、`post.create`、`post.revision`、`post.withdraw`、`relation.create`、`relation.resolve`、`relation.reopen`、`admin.redaction`。
- **快照断言方式**：B01 数据重放快照基于 `expect(fullLogicalSnapshot(db)).toEqual(before)` 进行逻辑表数据与 master 结构的深度相等比对。
- **表达式键判定**：统一使用 `hasExpression` 标记（核对 `cid < 0 || name === null`）。
- **关键测试语义**：
  - N01 代表“持久化提交成功后的未交付响应重试恢复（undelivered response retry recovery）”；
  - U07 验证“25 修订全量脱敏”；
  - U08 验证“event/idem 写入故障事务原子回滚”；
  - P 探针实际范围为 P01–P06；
  - 命令 #11 明确记录：`check-unfinished-contracts.mjs` 中仅未完成的历史遗留反例 U05（旧版本保留）和 U06（旧版本回退）两项失败，归属后续 R4-C 包，命令 exit 1 完全符合受控预期；其余 25 条命令全部 exit 0。

---

## 四、 原 B 编号固定含义与当前验收证据表

依据 [R4 next-agent-prompt.md](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r4/next-agent-prompt.md) 的原始定义，更新后的完整证据链如下：

| 编号 | 原要求 | 实际证据与 B.4-3R4 状态 | 验证位置 |
|---|---|---|---|
| **B01** | 全部已实现操作族的 typed/versioned 编码和重放，无 fallback | 覆盖全部 11 族真实业务操作，在同连接与重启连接后通过 `fullLogicalSnapshot(db)` 的 `.toEqual` 断言保证无状态副作用与完整 data 重放 | [m0-m1-r4-b-regression.test.ts#L107](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L107) |
| **B02** | 立即/后续修改/重开/响应未交付重试，固定原结果且无重复副作用 | 正式 B01/B02；N01 验证提交持久化后未交付响应的重试恢复；P/Q/W 系列测试通过 | [m0-m1-r4-b-regression.test.ts#L263](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L263) |
| **B03** | 旧 `$ref` resolve/reopen 经后续相反动作仍返回原状态和版本 | U02 与新 B03 Symmetric Reopen：v2/v3 完整 data 经关闭重开与启动迁移后完整恢复，当前 v4 状态未回退，快照不变 | [m0-m1-r4-b-regression.test.ts#L353](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L353) |
| **B04** | 未知 kind/version、缺历史、坏 JSON 明确非成功，不重新执行 | 正式 B04、G06 以及 V/W/X 系列非法输入严格报错 422 且不篡改当前状态 | [m0-m1-r4-b-regression.test.ts#L525](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L525) |
| **B05** | 合法历史格式转换、业务/凭据保持、旧正文缓存清理、版本推进、重复执行/重开 | 正式 B05、G07 实体校验、K01 冻结历史 DDL 校验，以及 L/N/P/Q/W/X 历史引用转换与重开证据保持通过 | [m0-m1-r4-b-regression.test.ts#L557](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L557) |
| **B06** | 引用转换、history/metadata/version 写故障的整个升级回滚及重开不变 | U01、G03、H10 以及正式 B06 验证故障注入下的升级事务原子回滚与重开快照不变 | [m0-m1-r4-b-regression.test.ts#L637](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L637) |
| **B07** | 凭据全撤销/过期、管理员禁用，不重初始化或增发 secret/token | 正式 B07、U03 验证凭据全吊销后仍识别已初始化状态，拒绝伪造新实例或增发管理员凭据 | [m0-m1-r4-b-regression.test.ts#L703](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L703) |
| **B08** | 空库初始化失败后安全重试；受支持旧库补 metadata 不增发凭据 | 正式 B08、R2/S11、G08 保持通过，未成功 bootstrap 允许安全重试，旧库迁移不覆盖已有 secret | [m0-m1-r4-b-regression.test.ts#L737](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L737) |
| **B09** | init/真实 serve 遇到未来/未知/损坏结构在监听或变更前拒绝 | 综合覆盖 B2/Y/Z 系列；AA01 覆盖 FTS 配置；AB01/AB02 覆盖主键来源约束与生成原子性保护；schema-generation 正式测试保障无源码运行与严格失败 | [m0-m1-r4-b-regression.test.ts#L799](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L799) 及 [schema-generation.test.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/tests/schema-generation.test.ts) |
| **B10** | secret 缺失/读写异常明确诊断，不使用临时 secret；启动失败资源释放 | 正式 B10、G09、H10、Z04 验证损坏库与材料在 CLI init/serve 阶段安全拒绝并可靠释放目录文件锁 | [m0-m1-r4-b-regression.test.ts#L849](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L849) |
| **B11** | key/payload 冲突、目标作用域隔离、独立并发请求唯一提交 | 正式 B11、H06/N 系列通过；Z01 验证主键大小写敏感与校对规则严格匹配，支持等价全量唯一索引 | [m0-m1-r4-b-regression.test.ts#L867](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L867) |
| **B12** | 已修权限、脱敏、ACK 保持，U07/U08 通过 | U07 验证 25 修订全量脱敏；U08 验证 event/idem 写入故障事务原子回滚 | [m0-m1-r4-b-regression.test.ts#L911](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L911) |

---

## 五、 全部 26 条验证命令最新执行结果

通过 `run-all-26.mjs` 在统一根目录下自动化连续执行全部 26 条命令，完整元数据记录于 [commands.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/commands.json)，各命令的独立完整日志保存在 `logs/` 目录下：

| 命令编号 | 验证命令 | 预期退出码 | 实际退出码 | 判定 | 日志文件 | 说明 |
|---|---|---|---|---|---|---|
| **#1** | `pnpm build` | 0 | 0 | 通过 | [cmd-01-build.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-01-build.log) | 全包构建成功（含 prebuild 生成 schema.ts） |
| **#2** | `pnpm typecheck` | 0 | 0 | 通过 | [cmd-02-typecheck.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-02-typecheck.log) | 全包 TypeScript 静态检查零错误 |
| **#3** | `pnpm lint` | 0 | 0 | 通过 | [cmd-03-lint.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-03-lint.log) | 全包 lint 检查与 schema-sync 同步核验通过 |
| **#4** | `pnpm test:all` | 0 | 0 | 通过 | [cmd-04-tests.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-04-tests.log) | 12 个测试文件 152 项测试全部通过（B 套件 82 项通过） |
| **#5** | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 0 | 通过 | [cmd-05-r1-behavior.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-05-r1-behavior.log) | R1 核心行为检查 15/15 全绿 |
| **#6** | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 0 | 通过 | [cmd-06-r1-adapters.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-06-r1-adapters.log) | R1 适配器检查 5/5 全绿 |
| **#7** | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 0 | 通过 | [cmd-07-r2.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-07-r2.log) | R2 剩余功能检查 12/12 全绿 |
| **#8** | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 0 | 通过 | [cmd-08-r2-cli.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-08-r2-cli.log) | R2 CLI 检查 3/3 全绿 |
| **#9** | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 0 | 通过 | [cmd-09-r3.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-09-r3.log) | R3 不变量检查 10/10 全绿 |
| **#10** | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 0 | 通过 | [cmd-10-r3-serve.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-10-r3-serve.log) | R3 服务版本检查 1/1 全绿 |
| **#11** | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | **1** | **1** | **通过（受控失败）** | [cmd-11-r4.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-11-r4.log) | 严格确认 6/8 通过，仅 U05/U06 归属后续 R4-C 包，exit 1 符合预期 |
| **#12** | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 0 | 通过 | [cmd-12-r5.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-12-r5.log) | G01–G09 缺口回归 9/9 全绿 |
| **#13** | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 0 | 通过 | [cmd-13-r6.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-13-r6.log) | H01–H10 升级边界检查 10/10 全绿 |
| **#14** | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 0 | 通过 | [cmd-14-r7.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-14-r7.log) | J01–J07 完整性检查 7/7 全绿 |
| **#15** | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 0 | 通过 | [cmd-15-r7-fixture.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-15-r7-fixture.log) | K01 历史 DDL 固化检查 1/1 全绿 |
| **#16** | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 0 | 通过 | [cmd-16-r8.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-16-r8.log) | L01–L08 门禁检查 8/8 全绿（包含 L03 通过） |
| **#17** | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 0 | 通过 | [cmd-17-r9.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-17-r9.log) | N01–N05 幂等重放检查 5/5 全绿 |
| **#18** | `node docs/reviews/2026-10-02-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 0 | 通过 | [cmd-18-r10.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-18-r10.log) | P01–P06 边界检查 6/6 全绿 |
| **#19** | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 0 | 通过 | [cmd-19-r11.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-19-r11.log) | Q01–Q05 管线检查 5/5 全绿 |
| **#20** | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 0 | 通过 | [cmd-20-r12.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-20-r12.log) | V01–V05 预检检查 5/5 全绿 |
| **#21** | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 0 | 通过 | [cmd-21-r13.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-21-r13.log) | W01–W03 输入存在性检查 3/3 全绿 |
| **#22** | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 0 | 通过 | [cmd-22-r14.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-22-r14.log) | X01–X03 辅助函数边界检查 3/3 全绿 |
| **#23** | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 0 | 通过 | [cmd-23-r15.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-23-r15.log) | Y01–Y04 结构边界检查 4/4 全绿 |
| **#24** | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 0 | 通过 | [cmd-24-r16.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-24-r16.log) | Z01–Z04 语义检查 4/4 全绿 |
| **#25** | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | 0 | 通过 | [cmd-25-r17.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-25-r17.log) | AA01–AA04 FTS 与 Profile 检查 4/4 全绿 |
| **#26** | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 0 | 0 | 通过 | [cmd-26-r18.log](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/logs/cmd-26-r18.log) | AB01–AB04 生成完整性检查 4/4 全绿 |

---

## 六、 基线文件指纹比对（Baseline Diff）

基于 [baseline-before.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/baseline-before.json) 与 [baseline-after.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r18/implementation-r4-b4-3r4/baseline-after.json)（覆盖 R18 规定的 89 个受控产品/测试/构建文件以及本轮新增文件，共 90 个）：

- **基线未修改受控文件**：86 个文件 SHA256 哈希值与 R18 baseline 保持绝对一致；
- **计划内修改与新增文件**：共 4 个产品/构建/测试文件发生预期变更：
  1. `packages/storage-sqlite/scripts/extract-schema-requirements.mjs`（修改）：对主键自动索引（`idx.origin === 'pk'`）增加 collation、direction 与表达式键属性核查；
  2. `packages/storage-sqlite/scripts/generate-schema.mjs`（修改）：增加内存中迁移标记与模版完整性预检，提取或标记异常时以 exit 1 退出，杜绝磁盘破坏；
  3. `packages/storage-sqlite/scripts/check-schema-sync.mjs`（修改）：增加对提取异常的安全捕获与 exit 1 报错；
  4. `packages/storage-sqlite/tests/schema-generation.test.ts`（新建）：正式测试生成脚本在无源码环境下的健康性、主键约束拒绝、profile 自修复与缺失标记时的原子失败（5 项测试全部通过）。
- **契约与记录文档变更**：
  - `docs/12-decisions.md`：记录 ADR-022《主键约束来源提取与模式生成失败原子性》；
  - `docs/03-data-model.md`：明确 SQLite 主键统一采用默认升序与 BINARY 校对规则约束；
  - `docs/07-security-operations.md`：记录构建期模式生成原子失败与零破坏契约；
  - `docs/progress.md`：状态更新为 B.4-3R4 已自验通过，待独立复核；
  - `README.md`：更新当前状态为 B.4-3R4 自验通过，待独立复核。

所有变更均严格局限于任务要求范围，无越界修改，无计划外文件污染。
