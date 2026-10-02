# M0/M1-R4-B.4-3R3 实施与验收交付报告

**任务编号**：M0/M1-R4-B.4-3R3：完成 FTS 配置比较与结构生成验收  
**交付日期**：2026-10-02  
**工作区**：`/Users/sakimi/Desktop/Detuned`  
**Git HEAD**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（保留既有多轮未提交工作）  
**当前状态**：B.4-3R3 自验完成，等待 R18 独立复核（整包未独立验收，不自动开始 R4-C 或 M2）

---

## 一、 任务概述与工作边界

本轮任务严格聚焦于关闭 R17 独立复核报告中指出的剩余缺口：
1. **R17-F01（AA01）**：补充 FTS5 虚拟表完整配置项比较（`tokenize="trigram"`），杜绝 `detail=none`、`content=""` 等破坏性配置绕过预检。
2. **R17-F02（AA02 & AA03 & AA04）**：抽取单源 DDL 结构提取器 `extract-schema-requirements.mjs`；将 `post_fts` 结构化纳入 `TableRequirement`；拒绝表达式索引键（`hasExpression`）；为生成（`generate-schema.mjs`）与同步校验（`check-schema-sync.mjs`）脚本增加缺失驱动/源文件时的严格失败退出码（exit 1）；确保运行时在剥离 `src/` 源码环境下依据生成 profile 正常工作。
3. **R17-E01**：全面勘误交付文档与原 B 验收材料中的事实表述，纠正操作族列表、断言方式与测试语义。

**工作边界与约束**：
- 严格遵守用户禁令：未使用、未安装、未启用 `deepseek-brainstorm`；
- 未启动其他 Agent，未调用外部模型，未修改用户全局 harness 配置，未执行 git reset/clean/checkout；
- 冻结保留 `tests/fixtures/historical-v1-schema.sql`、`archive/pre-plan.original.md` 原字节以及所有历史审查脚本与日志；
- 所有破坏性测试仅在自建临时 SQLite 数据库和合成身份中执行；
- 未开始 R4-C、M2 或宿主接入开发。

---

## 二、 缺陷根因与修复方案

### 1. 关闭 R17-F01：FTS5 完整配置项严格比对（AA01）

- **根本原因**：
  此前 `verifyTableStructure` 仅解析了虚拟表的列名与 `unindexed` 标志，对配置项仅宽松检查了是否存在 `tokenize=trigram`，未能核对整个配置项集合（键名列表与取值）。若攻击者或损坏迁移向 `post_fts` 注入非法的 `detail=none` 或 `content=""` 等配置，虽然 SQLite 能创建该虚拟表，但后续对 `/spaces/:id/search?q=needle` 的全文检索请求将直接引发 500 服务端内部错误。
- **修复方案**：
  - 在 `packages/storage-sqlite/scripts/extract-schema-requirements.mjs` 与 `packages/storage-sqlite/src/schema.ts` 的 `parseFts5Ddl` 中，增强配置字典解析，支持提取全部键值对并去除引号。
  - 在 `verifyTableStructure` 中增加对 FTS 配置项字典的严格全量比对：比对排序后的配置项键集合与每一项的取值。若配置键集合不完全一致（如出现未支持的 `detail` 配置项），或取值不同，立即返回校验失败（`post_fts 配置项数量不匹配...`）。
  - 在 `bootstrapDatabase`、`classifyDatabase` 以及 `openAndCoordinateDatabase`（CLI `init` / `serve`）阶段，任何 FTS 配置损坏均被判定为 `corrupt`，返回 403 `FORBIDDEN`，拒绝启动，不产生任何数据写入，保留数据库快照并释放文件锁。
- **验证证据**：
  - 正式回归测试套件增加用例 `AA01: Unsupported FTS configuration options (detail=none, content=...) are rejected as corrupt`（位于 [m0-m1-r4-b-regression.test.ts](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L3872)），覆盖 `bootstrap`、`init`、`serve` 三种模式下对 `detail=none` 的安全拦截与快照不变性。
  - 探针 `AA01` 在 `check-profile-and-fts.mjs` 中 3 种模式全部通过（`passes: true`）。

---

### 2. 关闭 R17-F02：模式提取器单源、结构化 AST、输入严格失败语义（AA02–AA04）

- **根本原因**：
  1. 此前 `storage.test.ts` 复制了 PRAGMA 提取器逻辑，缺少单源抽取；
  2. `TableRequirement` 未完整包含索引排序规则和方向（`coll`、`desc`）与 FTS 虚拟表完整定义，未能拦截特定配置漂移；
  3. `generate-schema.mjs` 和 `check-schema-sync.mjs` 缺少对必需输入（`better-sqlite3` 驱动、`schema.sql` 权威源、`historical-v1-schema.sql` 历史源）的严格校验，在缺失环境下静默跳过而返回 0。
- **修复方案**：
  - **抽取统一结构提取器**：新建 [packages/storage-sqlite/scripts/extract-schema-requirements.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/extract-schema-requirements.mjs)，导出 `parseFts5Ddl` 与 `extractDatabaseRequirements(db)`，统一从权威数据库连接中抽取全量常规表与 `post_fts` 虚拟表的结构定义。
  - **扩展结构化需求描述**：在 [packages/storage-sqlite/src/schema.ts](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/schema.ts) 中扩展 `TableRequirement`：
    - 为唯一约束与命名索引增加 `keyTerms: Array<{ name: string; cid: number; desc: number; coll: string }>`，严格核验 `COLLATE BINARY` 与 `ASC`；
    - 增加 `virtual?: boolean` 与 `fts?: FtsRequirement`，将 `post_fts` 结构化纳入 `V2_SCHEMA_TABLES` 与 `V1_SCHEMA_TABLES` 模式字典；
    - 针对包含 `cid < 0` 或 `name === null` 的表达式索引键（`hasExpression`），在提取与校验阶段一律视为结构损坏。
  - **构建与校验脚本输入严格失败**：在 [generate-schema.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/generate-schema.mjs) 与 [check-schema-sync.mjs](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/scripts/check-schema-sync.mjs) 顶部增加前置输入检查。若缺失 `better-sqlite3`、`schema.sql` 或 `historical-v1-schema.sql`，立即通过 `console.error` 输出明确错误原因并以非零状态码 `process.exit(1)` 退出，杜绝无环境时的静默假通过。
  - **运行时无源码自包含**：编译后的 `dist/schema.js` 完全内嵌生成的 `V2_SCHEMA_TABLES` 与 `V1_SCHEMA_TABLES` 静态常量，运行时在剥离 `src/` 源码目录的情况下仍可独立、完整地执行全部结构校验逻辑。
- **验证证据**：
  - `storage.test.ts` 更新为直接引用共享模块 `extractDatabaseRequirements`，验证与权威源的完全一致性、故意漂移检测以及通过 `spawnSync` 执行 `check-schema-sync.mjs` 命令行级校验；
  - 探针 `AA02`（修改隔离 SQL 后重新生成、检查并验证编译产物在无 src 目录下运行成功）通过；
  - 探针 `AA03`（故意缺失驱动或历史源文件时，生成与同步工具均以 exit 1 失败退出，损坏 profile 绝不被保留）通过；
  - 探针 `AA04`（完整环境下健康生成与合法列定义变更跟随）通过。

---

## 三、 R17-E01 交付事实勘误清单

本轮严格对照真实代码与 `coverage-audit.md`，对前序交付中的所有不实表述进行逐条核实与纠偏：

1. **真实 11 族操作类型澄清**：
   - 彻底删除历史报告中提及的 `post.reply`、`post.revise`、`actor.register`、`token.rotate` 等产品中从未存在过的非现行操作；
   - 恢复并明确真实且完整的 11 族已实现业务操作类型：
     `space.create`、`space.patch`、`thread.create`、`thread.patch`、`post.create`、`post.revision`、`post.withdraw`、`relation.create`、`relation.resolve`、`relation.reopen`、`admin.redaction`。
2. **断言与实现细节描述对齐**：
   - B01 的快照比对断言在源码中实际使用 `expect(fullLogicalSnapshot(db)).toEqual(before)`，明确基于全库表行排序与 `sqlite_master` 结构的深度等价断言；
   - 表达式索引键判定使用 `hasExpression` 标记（判断 `cid < 0 || name === null`）；
   - 虚拟表校验失败信息规范包含中文提示 `post_fts 必须为使用 fts5 的虚拟表`。
3. **纠正过度绝对化措辞**：
   - 将“100% 任意结构漂移可检测”修正为客观事实：“覆盖全部常规表及 post_fts 虚拟表的列名、类型、NOT NULL、主键列序、外键动作、非 Partial 索引键项排序与校对规则、以及 FTS5 完整配置参数的严格双向漂移检测”；
   - 将“物理和逻辑绝对零副作用”规范为：“通过 `fullLogicalSnapshot` 完整逻辑快照断言验证数据库状态无变更”。
4. **原 B 编号语义与测试范围澄清**：
   - 澄清 N01 实际代表“提交持久化成功后的响应层未交付恢复（undelivered response retry recovery）”，而非事务回滚或 TCP 链路中断；
   - 澄清 U07 为“25 修订全量脱敏”，U08 为“event/idem 写入故障原子回滚”，二者非 CLI 锁测试；
   - 澄清 P 探针实际范围仅为 P01–P06。
5. **验证命令结果客观表述**：
   - 明确指出全部 25 条有效验证命令中，命令 #1–#10 与 #12–#25 共 24 条全部 exit 0，命令 #11 为历史遗留反例测试（U05/U06 归属于后续 R4-C 包）预期 exit 1，绝不混淆或虚报为“全部 25 条零失败”；
   - 已过期的 `check-ddl-build.mjs` 作为历史四文件 SQL 嵌入检查，已被完整的 AA04 探针替代，不再列入主交付门禁。
6. **恪守任务边界，不重复已通过测试**：
   - B01 的 11 族完整数据重放快照与 B03 的对称旧 resolve/reopen 恢复已在 R16/R17 确认通过，本轮不重新编写或伪造该部分功能。

---

## 四、 原 B 编号固定含义与当前验收证据表

依据 [R4 next-agent-prompt.md](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r4/next-agent-prompt.md) 的原始定义，更新后的完整证据链如下：

| 编号 | 原要求 | 实际证据与 B.4-3R3 状态 | 验证位置 |
|---|---|---|---|
| **B01** | 全部已实现操作族的 typed/versioned 编码和重放，无 fallback | 覆盖全部 11 族真实业务操作，在同连接与重启连接后通过 `fullLogicalSnapshot(db)` 的 `.toEqual` 断言保证无状态副作用与完整 data 重放 | [m0-m1-r4-b-regression.test.ts#L40](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L40) |
| **B02** | 立即/后续修改/重开/响应未交付重试，固定原结果且无重复副作用 | 正式 B01/B02；N01 验证提交持久化后未交付响应的重试恢复；P/Q/W 系列测试通过 | [m0-m1-r4-b-regression.test.ts#L330](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L330) |
| **B03** | 旧 `$ref` resolve/reopen 经后续相反动作仍返回原状态和版本 | U02 与新 B03 Symmetric Reopen：v2/v3 完整 data 经关闭重开与启动迁移后完整恢复，当前 v4 状态未回退，快照不变 | [m0-m1-r4-b-regression.test.ts#L425](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L425) |
| **B04** | 未知 kind/version、缺历史、坏 JSON 明确非成功，不重新执行 | 正式 B04、G06 以及 V/W/X 系列非法输入严格报错 422 且不篡改当前状态 | [m0-m1-r4-b-regression.test.ts#L520](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L520) |
| **B05** | 合法历史格式转换、业务/凭据保持、旧正文缓存清理、版本推进、重复执行/重开 | 正式 B05、G07 实体校验、K01 冻结历史 DDL 校验，以及 L/N/P/Q/W/X 历史引用转换与重开证据保持通过 | [m0-m1-r4-b-regression.test.ts#L610](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L610) |
| **B06** | 引用转换、history/metadata/version 写故障的整个升级回滚及重开不变 | U01、G03、H10 以及正式 B06 验证故障注入下的升级事务原子回滚与重开快照不变 | [m0-m1-r4-b-regression.test.ts#L780](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L780) |
| **B07** | 凭据全撤销/过期、管理员禁用，不重初始化或增发 secret/token | 正式 B07、U03 验证凭据全吊销后仍识别已初始化状态，拒绝伪造新实例或增发管理员凭据 | [m0-m1-r4-b-regression.test.ts#L890](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L890) |
| **B08** | 空库初始化失败后安全重试；受支持旧库补 metadata 不增发凭据 | 正式 B08、R2/S11、G08 保持通过，未成功 bootstrap 允许安全重试，旧库迁移不覆盖已有 secret | [m0-m1-r4-b-regression.test.ts#L980](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L980) |
| **B09** | init/真实 serve 遇到未来/未知/损坏结构在监听或变更前拒绝 | 综合覆盖 B2/Y/Z 系列；本轮通过 AA01 补齐 FTS 完整配置项拒绝，通过 AA02–AA04 补齐生成与校验单源及无源码运行保障 | [m0-m1-r4-b-regression.test.ts#L3872](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L3872) |
| **B10** | secret 缺失/读写异常明确诊断，不使用临时 secret；启动失败资源释放 | 正式 B10、G09、H10、Z04 验证损坏库与材料在 CLI init/serve 阶段安全拒绝并可靠释放目录文件锁 | [m0-m1-r4-b-regression.test.ts#L1120](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L1120) |
| **B11** | key/payload 冲突、目标作用域隔离、独立并发请求唯一提交 | 正式 B11、H06/N 系列通过；Z01 验证主键大小写敏感与校对规则严格匹配，支持等价全量唯一索引 | [m0-m1-r4-b-regression.test.ts#L1250](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L1250) |
| **B12** | 已修权限、脱敏、ACK 保持，U07/U08 通过 | U07 验证 25 修订全量脱敏；U08 验证 event/idem 写入故障事务原子回滚 | [m0-m1-r4-b-regression.test.ts#L1410](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts#L1410) |

---

## 五、 全部 25 条有效验证命令最新执行结果

通过 `run-all-25.mjs` 在统一根目录下连续自动化执行全部 25 条命令，详细结果记录于 [observed-25-commands.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r17/implementation-r4-b4-3r3/observed-25-commands.json)。

| 命令编号 | 验证命令 | 预期退出码 | 实际退出码 | 结果与说明 |
|---|---|---|---|---|
| **#1** | `pnpm build` | 0 | 0 | 通过；全包构建成功（含 prebuild 生成 schema.ts） |
| **#2** | `pnpm typecheck` | 0 | 0 | 通过；全包 TypeScript 静态类型检查零错误 |
| **#3** | `pnpm lint` | 0 | 0 | 通过；全包代码检查通过，包含 check-schema-sync.mjs 校验 |
| **#4** | `pnpm test:all` | 0 | 0 | 通过；11 个测试文件 147 项测试全部通过（B 套件 82 项通过） |
| **#5** | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 0 | 通过；R1 核心行为检查 15/15 全绿 |
| **#6** | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 0 | 通过；R1 适配器检查 5/5 全绿 |
| **#7** | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 0 | 通过；R2 剩余功能检查 12/12 全绿 |
| **#8** | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 0 | 通过；R2 CLI 检查 3/3 全绿 |
| **#9** | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 0 | 通过；R3 不变量检查 10/10 全绿 |
| **#10** | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 0 | 通过；R3 服务版本检查 1/1 全绿 |
| **#11** | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | **1** | **1** | **符合预期（6/8 通过，仅 U05/U06 失败归属后续 R4-C 包）** |
| **#12** | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 0 | 通过；G01–G09 缺口回归 9/9 全绿 |
| **#13** | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 0 | 通过；H01–H10 升级边界检查 10/10 全绿 |
| **#14** | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 0 | 通过；J01–J07 完整性检查 7/7 全绿 |
| **#15** | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 0 | 通过；K01 历史 DDL 固化检查 1/1 全绿 |
| **#16** | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 0 | 通过；L01–L08 门禁检查 8/8 全绿（包含 L03 通过） |
| **#17** | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 0 | 通过；N01–N05 幂等重放检查 5/5 全绿 |
| **#18** | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 0 | 通过；P01–P06 边界检查 6/6 全绿 |
| **#19** | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 0 | 通过；Q01–Q05 管线检查 5/5 全绿 |
| **#20** | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 0 | 通过；V01–V05 预检检查 5/5 全绿 |
| **#21** | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 0 | 通过；W01–W03 输入存在性检查 3/3 全绿 |
| **#22** | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 0 | 通过；X01–X03 辅助函数边界检查 3/3 全绿 |
| **#23** | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 0 | 通过；Y01–Y04 结构边界检查 4/4 全绿 |
| **#24** | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 0 | 通过；Z01–Z04 语义检查 4/4 全绿 |
| **#25** | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | 0 | 通过；AA01–AA04 全量通过（4/4 全绿） |

**总结**：25/25 验证项完全满足预期（24 项 exit 0，1 项遗留反例 exit 1）。

---

## 六、 基线文件指纹比对（Baseline Diff）

基于 [baseline-before.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r17/implementation-r4-b4-3r3/baseline-before.json) 与 [baseline-after.json](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-02-m0-m1-r17/implementation-r4-b4-3r3/baseline-after.json)（覆盖 R17 规定的 88 个产品/测试/构建文件与本轮新增文件）：
- **基线未修改文件**：83 个文件 SHA256 哈希值保持绝对一致；
- **计划内修改与新增文件**：共 6 个文件发生预期变更：
  1. `packages/storage-sqlite/scripts/extract-schema-requirements.mjs`（新建）：抽取单一来源数据库结构与 FTS 需求提取器；
  2. `packages/storage-sqlite/scripts/generate-schema.mjs`（修改）：引入提取器，增加前置依赖与源文件严格 exit 1 校验；
  3. `packages/storage-sqlite/scripts/check-schema-sync.mjs`（修改）：引入提取器，增加前置依赖与源文件严格 exit 1 校验；
  4. `packages/storage-sqlite/src/schema.ts`（重新生成与更新）：支持虚拟表 FTS5 完整配置校验、`TableRequirement` 的 `keyTerms` 与 FTS 需求定义，拒绝表达式键；
  5. `packages/storage-sqlite/tests/storage.test.ts`（修改）：引入共享提取器断言 profile 一致性与命令行级同步工具调用；
  6. `tests/integration/m0-m1-r4-b-regression.test.ts`（修改）：新增 AA01 正式回归用例。

无任何计划外文件变更，无越界代码修改。
