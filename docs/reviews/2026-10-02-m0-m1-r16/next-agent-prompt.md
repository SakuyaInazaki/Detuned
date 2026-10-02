# 下一轮提示词：M0/M1-R4-B.4-3R2

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务是 **M0/M1-R4-B.4-3R2：补齐索引与 FTS 语义、固定结构来源并补齐剩余证据**。

R16 独立复核已确认：140/140 正式测试（B 76 项）、原 24 条命令执行及结果属实；Y01–Y04 均通过。R15-F01 的初始化材料/迁移矛盾、三个迁移 DDL 常量的单源复用、B01 的 11 族实际重放、B06 故障命中与回滚、B08 和 B2-3/4/5 的重开补项均有效。**不要重做这些已通过功能，也不要重开 B.4-2 历史解析任务。**

剩余功能缺口是 R16-F01/F02，结构描述来源要求为 F03，验收补项为 E01。新 Z 探针 2/4：Z01/Z02 失败；Z03 等价健康结构和 Z04 真实 CLI 拒绝通过。完成本提示词后交回独立复核，不自动开始 R4-C 或 M2。

## 0. 读取、范围和约束

先读 AGENTS.md、README.md、docs/00、08、11，再读 docs/03、04、07 的现行契约；本目录 README.md、coverage-audit.md、verification.md、commands.json、check-schema-semantics.mjs 与 observed-schema-semantics.json。需要核对旧范围时读 R15 next-agent-prompt.md，不把旧交付自报当作独立验收。

开工先说明任务编号、预期行为、文件范围和验收方法。保存本轮 baseline-before，覆盖 R16 baseline 的 85 个产品/正式测试/构建文件及本轮新增文件。HEAD 仍为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，工作区包含多轮未提交修改，禁止 reset/clean/checkout 覆盖。保留旧审查脚本、历史交付和日志、tests/fixtures/historical-v1-schema.sql、archive/pre-plan.original.md 原字节。

禁止使用、重装或启用 deepseek-brainstorm 或其间接脚本。不开其他 Agent、不调用模型、不修改全局 harness 配置、不自行推送/部署/发布。只使用自建临时 SQLite 和合成身份。默认本轮不涉及 dsh/Pi 接入，无需为后端修复扩展宿主研究。

预期变更集中在 storage-sqlite 结构描述/生成/校验及其正式测试、现有 B 集成测试、契约与交付记录。CLI 继续复用服务启动入口；不复制校验到 CLI/MCP/Pi。非必要不动 core 幂等重建。不要增加新产品接口、ORM、通用迁移框架、修复数据库向导或未来 schema 版本。

## 1. 单元 A：完成 F01/F02/F03 的共同根因修复

先将 Z01/Z02 的反例加入正式回归，记录它们在当前输入上的失败，再修共同结构描述与比较。不要只按探针名称添加四个拒绝分支。

### 1.1 索引键必须保留完整语义

已复现：

1. 移除 token_hash 的 UNIQUE，换成 `UNIQUE(token_hash, lower(id))`，当前过滤 name=null 后误认成单列唯一约束；插入重复 token_hash 实际成功。
2. idempotency_records.key 改为 `COLLATE NOCASE`，主键列顺序不变便通过；HTTP 中不同 key `R16CaseKey`、`r16casekey` 发生错误冲突。
3. idx_events_space_seq 改成 `(space_id COLLATE NOCASE, seq DESC)`，当前未识别排序/collation 的变化。

实现要求：

- 收集并按 seqno 保留全部 `index_xinfo.key=1` 项；`cid=-2/name=null` 是表达式，不能过滤后把剩余列当成完整定义。当前受支持定义没有表达式键，遇到冒充必需约束的表达式键应不匹配，不必实现任意表达式等价。
- 比较实际键项数、列绑定、顺序、ASC/DESC、collation；连同 unique、partial 完整比较。PK、UNIQUE、命名索引都覆盖，不能只在显式索引分支补字段。INTEGER PRIMARY KEY 等 SQLite 特有的无独立索引情况按真实支持 DDL 表示。
- 表的 `table_info.pk` 列序仍需保留，但它不代替 PK 索引的校对规则检查。
- 保持全量唯一约束要求；当前必需索引 partial=0，拒绝部分索引即可，不增加任意 partial WHERE 的产品支持。
- PK/UNIQUE 的 SQLite 自动生成索引名不应作为语义身份；Z03 的等价全量独立 UNIQUE 索引必须继续被接受。显式必需索引按既有契约检查名字。

验收：三个入口 bootstrap/init/serve 均将上述坏库判 corrupt 并在写入前拒绝；每个夹具调用后关闭重开，schema/所有表行与调用前相同。健康库两个大小写不同的 key 均能正常创建；等价全量 UNIQUE 结构继续启动。保留 partial/FK 等旧负例。

### 1.2 FTS 比较列和配置的实际定义

Z02 的 `body UNINDEXED` 仍是合法 FTS5，列名和 trigram 字样都存在，所以当前正则放行。它在相同 HTTP 查询中返回 200/0 条，健康对照为 200/1 条。

建立本项目受支持 FTS 结构的确定描述，比较模块、列名/数量/顺序、每列 indexed/UNINDEXED、完整 tokenizer 配置。title/summary/body/tags 应被索引，post_id/space_id 不索引。额外列、遗漏列、改变索引标志或改变配置不能仅因关键字仍在 SQL 中便通过。

可使用固定受支持语法的解析/规范化，再与版本定义比较；不需要支持 SQLite 任意语法的通用解析器。不要执行从被检查库提取的 DDL 来“验证”它，不修改被检查库。不要只增加 `body UNINDEXED` 黑名单或另一个 tokenizer 前缀正则。

验收：Z02 坏结构在三个入口拒绝且重开不变；健康 FTS 与等价结构正例继续工作，正文独有词、现有 trigram/短查询回退测试保持通过。正式测试可用参数化分别覆盖被索引列的标志差异和 tokenizer 配置差异；不机械扩张为大量同构测试。

### 1.3 结构预期绑定权威源与固定历史

本轮已经完成 `schema.sql → SCHEMA_SQL + SCHEMA_MIGRATIONS_DDL / INSTANCE_METADATA_DDL / THREAD_VERSIONS_DDL → applyMigrations`，保留它。剩余是 schema.ts 中独立手写的 V2_SCHEMA_TABLES，以及通过过滤 V2 得到的 V1_SCHEMA_TABLES。

在修语义时一并完成来源关系，二选一即可：

- 从当前权威 schema.sql 与固定历史 DDL，生成包含上述必要语义的结构描述；或
- 保留小规模声明，但加入自动化的完整一致性检查，分别与对应版本 DDL 的实际结构逐项比较，缺项或不同必须使检查失败。

推荐复用项目现有 SQLite 驱动在自建内存库读取可信权威 DDL 的 metadata，生成当前/历史描述；运行时只消费编译产物。FTS 中 PRAGMA 没有完整暴露的部分，以可信版本 DDL 的明确配置为来源。不要为此引入新依赖。

具体门槛：

1. 当前定义生成/校验覆盖表/列、PK/UNIQUE/命名索引完整键语义、既有外键动作及 FTS 结构。不能仅把 SCHEMA_SQL 文本比较当成预检描述同步。
2. v1 绑定冻结的 historical-v1-schema.sql 及仓库已明确支持的历史材料组合。不要让其内容随 V2 对象变化。保留旧版可选 instance_metadata 布局的已验证支持，不把合法旧库一律拒绝。
3. 在隔离源码副本中修改一个确实进入 profile 的当前定义：生成后描述跟随变化，或一致性检查明确报错；历史 profile 保持原义。无需修改产品 schema 版本、真实 DDL 或冻结 fixture 来做这个测试。
4. 当前源和预检描述故意不同步时，项目检查能发现；健康生成后通过。没有 src/schema.sql 文件时，构建产物仍能独立运行。
5. 保持新建库/真实历史升级库的现有 parity 测试通过。它与“profile 对来源一致性”是两个验证目标，都要有断言。

生成脚本若调整组织，保留旧 R15 check-ddl-build.mjs 可复跑的导出/构建路径。现有三个 DDL 常量已正确复用，不另写一份 CREATE TABLE。不要因为重构随意改变现存库布局。

## 2. 单元 B：只补实际缺失的 B 证据

### 2.1 B01 业务状态不变

已有 11 族真实请求、同连接重放、文件库重开重放和完整 data 相等保留。在两种重放循环中增加业务状态不变断言；可复用 fullLogicalSnapshot，比较包括业务行、事件、幂等引用在内的逻辑快照，或明确覆盖每族涉及的表行与内容。仅比较 events/idem 计数不足以证明没有其他写副作用。不再创建第二套 11 族样板测试。

### 2.2 B03 旧 resolve/reopen 的对称历史结果

现有 B03 只覆盖旧 `$ref` resolve→后续 reopen。补一个紧凑的真实集成场景：

1. 创建关系并 resolve(v2)，保存完整返回 data 和幂等 key；reopen(v3)，同样保存；再执行后续 resolve(v4)，使两个旧结果均不是当前状态。
2. 将两个已有 result_ref 置为仓库真实支持的旧 `$ref:'relation'` 形状，分别绑定各自 relation_id/resolution_id；不要伪造正式服务没有生成过的业务结果。
3. 通过真正的启动/迁移入口规范化，关闭 app/DB，从原文件重新打开并启动，再使用原请求、原 key 通过 HTTP 重放 resolve(v2) 与 reopen(v3)。
4. 完整 data 应等于最初对应操作结果，包括 relation 的 version/state 和 resolution 的 id/version/action/时间/引用；当前关系仍是后续 v4。重放前后逻辑快照不变。
5. 不把业务动作 reopen 当成数据库重新打开；不只比较 status、id 或单个 version。

如发现真实产品问题，按该最小反例修复共享业务层；未发现则只增加覆盖。不得为了报告统一强行改变已有正确返回形状。

### 2.3 纠正证据归属，复用已有有效检查

按 coverage-audit.md 更新 B01–B12 的“子条件 → 测试名/断言位置 → 本轮原始日志 → 结果”。不是给每项写一个 PASS 即结束。

- B02 的提交后响应未交付/重开证据引用 N01；说明是响应层故障，不称真实 TCP 断线。
- B03 的旧 relation 证据是 U02/正式 B03；G02 是旧 thread 缺失历史版本，不能继续错引。
- B05 列出实际已支持的历史形状与 K/L/N/P/Q/W/X 等相关断言，已有证据不重复抄成新测试。
- B06 保持当前真实 history 写失败；其他故障阶段引 U01、H10。
- B12 的 25 修订是 U07；event/idempotency 写故障回滚是 U08。
- 本轮 Z04 已验证 Y02/Y03 的 CLI init/serve 快照、锁与失败输出。可转入正式测试或准确引用；不得把尚未写入正式函数的断言说成它已有。
- 正确区分调用前坏库快照与“损坏前”；partial 标志与任意谓词文本；规范化 SQL 同步与原文件字节一致；现代结果重放与旧格式升级。
- U05 是非法 relation 枚举写入；U06 是客户端将截断成功 JSON 当作成功。两者按后续 R4-C 原任务书处理，本轮不顺手修复。

## 3. 最终验证、交付与停止条件

最终源稳定后按本目录 **commands.json 的 25 个不同命令**运行一次：原 24 命令 + R16 Z 探针。先 build，再跑使用 dist 的探针。所有命令保存真实退出码与 stdout/stderr；不能 `|| true` 隐藏失败，也不能改旧脚本或覆盖旧 observed 文件。

完成门槛：

| 门槛 | 要求 |
|---|---|
| 正式检查 | build/typecheck/lint/test:all 通过；正式测试总数从实际输出读取；新语义/来源/B01/B03 断言进入自动化 |
| 新负例与正例 | Z01/Z02 变为通过，Z03/Z04 保持通过；Y01–Y04 全部通过 |
| 历史回归 | R1–R3、G/H/J/K/L/N/P/Q/V/W/X 与 R15 隔离构建检查全部保持通过 |
| DDL/profile 来源 | 迁移仍用已有单源常量；当前 profile 与权威源一致，历史 profile 独立固定；失步检查/隔离变更证据有效 |
| B 验收 | B01 业务不变、B03 两种旧结果的完整重开重放补齐；其余有效证据准确映射，无虚报条件 |
| 已延期命令 | 只允许 R4 探针因 U05/U06 exit 1；保存原始失败输出，明确它归 R4-C，不称全套零失败 |

本地回环测试按环境权限机制运行，不跳过再填写成功。记录未执行的真实宿主/模型/干净环境测试，不把本地适配测试当成四种 harness 支持认证。

新交付归档在 `docs/reviews/2026-10-02-m0-m1-r16/implementation-r4-b4-3r2/`，至少有 baseline-before/after、commands、原始日志、精确 B 子条件表、来源一致性验证材料和 README。before/after 覆盖 85 个既有文件以及全部新增产品/正式测试/生成脚本；文档变更单列。不要重写任何历史归档的报告或失败输出。

同步当前契约与必要 ADR，以及根 README、docs/progress.md 和审查索引。阶段表应写“B.4-3R2 已实现/自验结果，待独立复核”，R16 仍是最新独立结论；不要一边在顶部写旧任务未实现、一边在末尾声称整包验收。根因尚未修完的条目须明示，不因其他测试多而宣称全部关闭。

达到上述明确门槛后交回，停止本包开发。下一候选是 R4-C，待 R4-B 独立验收后领取；附件、Web、真实 harness 联调、正式评审与模型研究实验均不进入本轮。
