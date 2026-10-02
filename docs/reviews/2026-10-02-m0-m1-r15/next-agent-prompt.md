# 下一轮提示词：M0/M1-R4-B.4-3R

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务是 **M0/M1-R4-B.4-3R：完成结构判定、迁移 DDL 复用与真实验收证据**。

R15 已确认 136 项正式测试通过、前轮全部 22 条命令执行属实；R14-F01/X03、V01/V02 正式入口补测、L03 原复合主键反例都已修复。**单元 A 已通过，不重做旧引用解析。** B.4-3 尚未整体验收，剩余为 R15-F01/F02/F03 和 R15-E01。完成下面三个单元后统一交回，不自动开始 R4-C 或 M2。

## 0. 输入、约束与开始方式

先读 AGENTS.md、README.md、docs/00、08、11，再读 docs/03、04、07 中相关契约，以及：

- 本目录 README.md、coverage-audit.md、verification.md、commands.json。
- 本目录 check-structural-boundaries.mjs、observed-structural-boundaries.json、check-ddl-build.mjs、observed-ddl-build.json。
- R14 next-agent-prompt.md 的 B/C 原要求；R4 原始 next-agent-prompt.md 的 B01–B12。以 R15 当前范围与明确修正为准，历史报告不再作为“已完成”依据。

开始用简短说明列出编号、预期行为、文件范围、验收办法，然后实施。HEAD 仍为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，已有多轮未提交工作。保存本轮 baseline-before，至少覆盖 R15 baseline 的 85 个产品/测试/构建脚本，并包含本轮新增文件；差异如实记录。禁止 reset/clean/checkout 覆盖已有工作。

禁止使用、重装、启用 deepseek-brainstorm 或走其脚本/其他入口。不自动启动其他 Agent，不调用模型，不改全局 harness 配置，不推送、部署或发布。只用自建临时库与合成身份做故障实验，保留 archive/pre-plan.original.md 原字节。旧审查脚本和历史输出保持不变。

预期范围：storage-sqlite 分类/结构/DDL、相关生成脚本、正式测试、证据和契约文档。CLI 仍调用共享入口，不能自己复制判定。无需新 ORM、数据库、通用迁移框架或恢复向导。不得以报告措辞修正代替下面的功能/覆盖要求。

## 1. 完成 F01/F02：分类先验证事实，结构检查比较实际语义

### 1.1 禁止把损坏材料当空库重新初始化

R15 Y02 的输入是：完整 Detuned 表结构，instance_metadata 中已有 initialized=true 与 token_secret，但缺迁移行/管理员主体，spaces/posts/credentials/actors 都为空。当前 classifyDatabase 只看四张表的计数便返回 blank；init/bootstrap 生成新管理员并覆盖原 secret。

修复共同只读分类：

- 真正空库、完整受支持的未初始化 DDL 和材料矛盾的损坏库明确区分。核对全部有关业务/初始化材料，不能仅统计四张表。SQLite/FTS 自带的内部行不能机械当作已初始化证据。
- 只要已有初始化事实或持久化材料，却缺管理员、迁移记录或其他必要配套，就按当前契约拒绝；不得把缺失解释成创建新实例的授权。不覆盖 secret、不新增 actor/credential、不补版本行。
- 对完整 v2 结构及初始化材料却缺 version=2 的 Y03，也必须拒绝，不能因为存在 thread_versions 就视为健康，然后让 applyMigrations 补写版本。支持的 v1 历史组合须有明确来源，不能任意把矛盾 v2 归入旧库。
- bootstrap、openAndCoordinateDatabase(init/serve)、实际 CLI 使用同一结论；错误指向具体材料/版本问题。serve 不应把损坏库诊断为“尚未初始化，请 init”。

Y02/Y03 都要通过三个函数入口拒绝、调用后关闭重开保持全库 schema/表行不变。增加至少实际 CLI init 的负例，断言非零退出、没有输出新 token、锁释放且数据库不变；无需打印任何 token/secret 来验证。

保持合法初始化失败后的重试、健康当前库重复启动、凭据全吊销/过期/主体禁用的不重初始化行为。按实际支持历史列出未初始化组合，避免一律拒绝空 DDL。

### 1.2 约束、索引、外键和 FTS 必须保留实际含义

当前 verifyTableStructure 忽略索引 partial 条件及外键动作，verifyDatabaseStructure 只看 post_fts 表名。先把 R15 Y01 的四类反例纳入正式测试并验证修复前失败，然后修共同结构描述与比较：

| 变体 | 必须达到 |
|---|---|
| 完整 token_hash UNIQUE 被相同列的 UNIQUE INDEX ... WHERE 0 替代 | 判 corrupt，拒绝；部分唯一索引不能证明完整唯一性 |
| idx_events_space_seq 名字/列序不变，却增加 WHERE seq < 0 | 按规范中的完整索引定义识别差异并拒绝 |
| credentials→actors 外键改为 ON DELETE CASCADE | 比较外键动作及绑定语义，按受支持定义拒绝 |
| post_fts 被同名普通表替代 | 判 corrupt，在启动/业务搜索前拒绝；健康 FTS 搜索仍为 200 |

结构比较至少包含本轮相关的唯一性、partial/predicate、实际键列及顺序/排序和校对规则、表达式（如受支持定义使用）、外键绑定/动作，以及 FTS 模块、列和 tokenizer。可用 index_list/index_xinfo、foreign_key_list、sqlite_schema 与受支持定义做规范化比较。不需要为项目没有的任意 SQL 提供通用等价证明器，但不能用名字或四个特例替代语义。

新建 schema 的预期描述应从权威来源生成或有可执行一致性约束，避免继续手动同步多份上千行定义。历史版本的描述必须绑定固定历史 DDL，不能随当前 schema 更新而悄悄改变支持范围。

### 1.3 正式回归与正确的故障夹具

新增正式结构用例进入 pnpm test:all，可以另建聚焦的测试文件。坏结构写入后、被测调用前取快照；拒绝后关闭重开，比较 schema 和所有表行并断言原因。B2-3/4/5 等现有结构测试缺少的重开断言一并补齐；配对健康正例保留。

必须保持 R15 Y04 的五个正例：真正空库、完整原始 v2 DDL、完整原始 v1 DDL、真实历史 v1 fixture、健康 v2；初始化材料策略与重复启动结果正确。

**正式 B06 需调整故障注入位置。** 当前它先创建 thread_versions、保留 v1 migration 行，再调用 bootstrap。F01 修复后，这种夹具会因结构/版本矛盾提前被拒绝，不能算命中迁移写失败。参考 R5 G03：从合法旧库开始，在真实迁移创建历史表之后安装 TEMP 触发器，仍由 SQLite 执行失败写入；记录 fault_hits，关闭重开比较完整逻辑快照。不能放宽分类保护旧夹具，也不能只断言 toThrow。

已有 G03/H10 的 SQL 故障证据有效，保留它们；不要改历史脚本或放宽其断言。新 DDL 组织须保持这些检查真正命中故障。

## 2. 完成 F03：把现有生成链延伸到迁移定义

已确认 schema.sql→SCHEMA_SQL 的生成、校验和隔离编译有效，不推翻重写这部分。剩余问题在 bootstrap.ts 的 applyMigrations：schema_migrations、instance_metadata、thread_versions 三段 CREATE TABLE 仍手工维护。

用一个简单方案让新建与升级共用这些当前对象的权威 DDL 定义，例如从 SQL 权威源生成命名片段和运行时常量，迁移只负责顺序及版本相关 DML。具体组织自行决定；不再留两段需要人工保持一致的当前表定义。冻结的历史迁移/fixture 可独立保存，但必须注明版本来源，不按新 DDL 覆盖。

结构预期也需有可执行的来源关系。可以从各受支持版本 DDL 生成描述，或用等价的自动化核验约束手写部分，避免 schema.sql 改动后只有 SCHEMA_SQL 变化、预检仍接受旧描述。无需引入庞大的迁移框架。

验收：

1. R15 check-ddl-build.mjs 保持通过；源改动能进入编译产物，运行时不靠残留 dist 或源目录。
2. 正式测试比较新建库与真实 v1 升级库的表/列/约束/外键及索引实际定义；不能只比 index_list。新建和升级共用新增对象来源可从代码直接确认。
3. 当前结构语义拒绝测试与健康结构等价测试分别存在；不把字符串相等当作全部语义证明。
4. 保留 tests/fixtures/historical-v1-schema.sql 原字节与旧材料指纹。除非真实布局变化需要迁移，不因为校验器重构随意升级 schema 版本。

## 3. 完成 E01：补真实的 B 验收条件，按断言重建交付表

上一报告列出的 decision.publish、evidence.attach、export.create 没有实现，必须在新交付中明确更正，不能编造这些用例或顺手新增产品功能。真实 11 族是：

```text
space.create
space.patch
thread.create
thread.patch
post.create
post.revision
post.withdraw
relation.create
relation.resolve
relation.reopen
admin.redaction
```

### 3.1 B01 必须补实际 11 族编码—重放

当前同名 B01 主要验证首次写入，不能证明所有 decoder/重建分支。增加参数化或分组的正式场景，每族都：

1. 通过真实业务请求取得成功结果，使用服务实际 operation 和作用域保存的引用。
2. 用相同身份、目标、请求体和 key 真正重放；固定授权/未发生后续脱敏的情况下比较完整预期 data，动态例外按契约单独测，不能 blanket 忽略字段。
3. 断言没有新增业务行、事件、幂等结果或重复副作用。只检查 status/kind/id 不足。
4. 文件库关闭重开后重复重放，覆盖持久化解码路径。relation.reopen 也要真正执行并重放，不能只有注释。

### 3.2 其余 B 条件逐条映射已有证据，只补空缺

以本目录 coverage-audit.md 为当前核对依据，以原 B01–B12 为完整要求。证据表每行写“具体子条件 → 测试名/关键断言及位置 → 本轮原始输出 → 结果/未覆盖”，不要只有一个 PASS。

- B02/B03：把立即重试、后续变更、固定时间/嵌套字段、数据库重开、提交后响应未交付分别定位。relation.reopen 是业务动作，不等于重新打开数据库。旧 resolve 和旧 reopen 的原结果与后续相反动作应有完整历史 data/重开证据；不存在的补齐。
- B05：真实旧库与不同已支持结果形状、业务/凭据保持、正文清理、重复升级及重开分别定位。可复用 K、L、N、P、Q、W、X 中已经有效的断言。
- B06：引用更新/历史插入/version/metadata 等真实写故障必须证明命中和回滚。U01、G03、H10 已有有效证据，可直接引用，不必重复；原正式 B06 夹具按 1.3 修正。
- B08：同连接重试不能写 reopened。已有 R2/S11 的真正重开可引用；正式测试的错误注释修正，坏/好旧库配对与不增发材料另指向实际断言。
- B07/B09/B10/B11/B12：现有撤销、启动诊断、锁释放、冲突/作用域、双请求、25 修订和 U07/U08 证据保持。Promise.all 请求不称显式屏障；实际缺少的必需条件再补，未执行的场景不写通过。

同时更正常量名 SCHEMA_SQL、规范化 SQL 相同与原字节相同的区别、G/H/J/K 实际命令编号、V01/V02 直接调用的 helper 名称。声明五个既有文件变化时，另列两个新增脚本并将其纳入基线。根 README、进度摘要与阶段表必须一致。

保留旧交付归档，在新交付中纠正旧说明；不能重写旧日志成全绿或复制审查者输出冒充本轮运行。类型、错误码、能力和测试数都从源码/输出核对。

## 4. 最终验证与交付

先对每个新反例确认修复前失败，再修根因。最终源码稳定后按本目录 **commands.json 的 24 个不同命令**运行一次：前轮 22 命令，加 R15 结构探针与隔离 DDL 构建检查。先 build，再跑依赖 dist 的探针；G/H/J/K 不能漏。必要的新正式测试、DDL 语义等价或构建验证一并保存输出。

完成门槛：

- R15 Y01–Y04 全通，尤其 Y02/Y03 不修改损坏库、不发 token、不覆盖 secret、不补版本。三个函数入口和实际 CLI 的相应拒绝与资源释放有据。
- X、W、V、Q、P、N、G/H/J/K、R1–R3 全部无回归；L 仍 8/8，正式套件全部通过，数量据实际输出填写。
- DDL 当前定义不再在 bootstrap 重复手写，新建/升级和预检来源关系明确，索引语义等价检查成立。
- B01 的 11 族真实重放已经补齐；原 B 全部必需子条件有可核查证据。测试名、注释或一次绿色总数不能代替实际步骤。
- 仅 R4 的 U05/U06 归后续 R4-C，保存真实 exit 1。任何新增失败如实记录并处理，不能通过删断言、改历史脚本或归为“预期”绕过。

使用能记录每条真实退出码并继续收集日志的执行器，不能用 `|| true` 隐藏状态。本地回环端口测试遵循环境权限机制；未运行项目与环境失败单独记录，不标为通过。

新交付归档到 `docs/reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/`：baseline-before/after（覆盖实际全部产品/正式测试/构建脚本）、commands、原始 stdout/stderr、按子条件的 B 证据表和 README。阶段结论区分已实现、自验通过、待独立复核。

同步 docs/03、04、07 和必要 ADR；根 README、docs/progress、审查索引保留 R15 为最新独立结论，可链接新实现待复核交付。没有下一次独立复核，不写“R4-B 已验收”或“M1 全部完成”。本轮若未完成某项，明确剩余条件，不能因其余测试多而宣布任务完成。完成后交回，下一候选仍为 R4-C，不自动开始。
