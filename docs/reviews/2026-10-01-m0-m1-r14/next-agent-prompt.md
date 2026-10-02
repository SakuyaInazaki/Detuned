# 下一轮提示词：M0/M1-R4-B.4-3（含 R14 前置补项）

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务是 **M0/M1-R4-B.4-3：结构预检与原 B 验收证据（含 R14 前置补项）**。

当前独立结论：B.4-2R4 的 W01–W03 修复通过，125 项正式测试通过；R14 新增 X01/X02 通过，X03 发现确定矛盾的未来关系版本仍能被迁移降级为 marker。数据包未整体验收。按下面三个单元顺序推进：**A 关闭 R14-F01 及入口覆盖补项 → B 完成结构预检与 DDL 单源 → C 补齐原 B 验收证据并统一验收**。A 通过后继续 B/C，不另行申请一轮 B.4-2R5，也不在只完成 A 时宣布整个任务完成。

## 0. 开始方式与工作边界

先读 `AGENTS.md`、`README.md`、`docs/00-implementation-brief.md`、`docs/08-roadmap.md`、`docs/11-development-standards.md`，再读 `docs/03-data-model.md`、`docs/04-protocol.md`、`docs/07-security-operations.md` 中的幂等/升级契约，以及以下材料：

- 本目录 `README.md`、`coverage-audit.md`、`verification.md`、`commands.json`、`check-legacy-helper-boundaries.mjs`、`observed-legacy-helper-boundaries-final.json`。
- `docs/reviews/2026-09-29-m0-m1-r8/remaining-work.md` 的 B.4-3 和 `check-b3-gates.mjs` 的 L03。
- `docs/reviews/2026-09-28-m0-m1-r4/next-agent-prompt.md` 的原始 B01–B12 定义；R8 `coverage-audit.md` 仅作历史缺口清单，须与当前代码核对，不照抄为当前结论。

开始时用简短说明给出任务编号、预期行为、涉及文件和验收方法，然后实际实现。HEAD 基线是 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，多轮未提交工作仍在。保存自己的 baseline-before，核对 R14 baseline 的 83 个产品/测试文件，有差异如实记录；不要 reset/clean/checkout 覆盖已有工作。

禁止使用、重装或启用 deepseek-brainstorm，禁止走其脚本或其他入口。不自动启动其他 Agent，不调用外部模型、不改用户全局 harness 配置、不推送/发布/部署。仅在自建临时数据库与合成身份中做故障实验，保留所有旧报告、探针、observed 和 `archive/pre-plan.original.md` 原字节。

本轮到 B.4-3 为止；R4-C、M2、Web、评审模块和真实宿主联调不进入本轮。无需通用迁移框架、新 ORM 或数据库。预期改动集中在 core 验证、storage-sqlite 启动/DDL、必要构建配置、正式测试及相关契约文档。CLI 复用统一入口，不另写业务判定。

## A. 先关闭 R14-F01，并补正式入口覆盖

### A1. 降级前逐条检查已提供的关系版本

当前 `processLegacyRelations` 检查实体端点后，只要一个元素缺 version/state，就把整组转成 marker。完整语义检查中的 `version > current.version` 被绕过；typed/legacy 独立 `relation.create` 也存在同类提前返回。

将共同规则放在 core 中，由在线重放与迁移复用：

1. 先验证所有原值和别名，保持 W/X01 已修好的 null、非法值、冲突与集合规则。
2. 对每个关系逐项检查已知事实。**只要提供了合法数值的 version，就必须检查它不超过该关系实际当前 version**，不能因该项缺 state 或另一项缺历史而跳过。
3. 某项已经有完整 version/state 时，应完成该项的既有语义验证，包括初始状态及可核验的决议动作/版本匹配；不要等所有元素齐全才验证完整元素。不要将“另一项历史不足”作为忽略此项确定矛盾的理由。
4. 完成上述检查后，再按既有策略对真正不足的历史生成受控 marker。未提供的状态或历史不得用当前可变对象补造；合法 `version: 1`、缺 state 的历史正例须继续可迁移为 marker。
5. 同一规则覆盖 Post、initial_post 嵌套关系、typed 独立 relation.create 预检、legacy 独立 relation.create。处理输入缺省的 wrapper 可以不同，核心事实判断不可在多个分支复制出不同语义。core 不依赖 SQLite。

保留现有格式和 reason；不要为通过 X03 一律禁止旧格式、清空引用、吞掉迁移异常或补造关系历史。当前线上已是 422，不以“HTTP 仍 422”代替证明迁移拒绝。

### A2. 固定反例和配对正例

先将 X03 转为正式回归，并确认修复前能因正确原因失败，再修代码。五个坏变体全部保留：

| 变体 | 必须满足 |
|---|---|
| 旧 Post 关系：未来 version + 缺 state | 在线 422 RESYNC_REQUIRED、只读；迁移明确拒绝；关闭重开后全库逻辑快照不变 |
| 旧 initial_post 关系：未来 version + 缺 state | 同上 |
| 混合数组：完整未来 version/state + 另一项合法 ID-only | 同上，证明不会整组提前跳过验证 |
| typed relation.create：未来 relation_version + 缺 relation_state | 同上 |
| legacy relation.create：未来 version + 缺 state | 同上 |
| 对照：只有完整未来 version/state | 仍拒绝且不变 |
| 对照：合法旧 version: 1 + 缺 state | 可生成原有受控 marker，重复启动稳定，重放 422 且只读 |

测试应真正写入临时库的 `idempotency_records`，通过 HTTP 及 `openAndCoordinateDatabase` 执行。坏输入写入后、被测调用前截取 schema/所有表行；拒绝后关闭数据库、重新打开再比较。断言期望错误，防止夹具错误/无关 SQL 失败伪装成成功拒绝。这里要求逻辑快照相同，不能表述为 SQLite 文件字节相同。

把既有 V01/V02 的关键坏输入补成同样的正式两入口测试；目前 `m0-m1-r4-b-regression.test.ts:2333`、`:2368` 的 helper toThrow 不足。W01/W02 的入口覆盖已有，不机械重写；W03、X02 的合法缺省、显式空数组、完整关系与等价别名保真必须保持。不要把整个外部探针包进一个 exec 测试来冒充细化正式覆盖。

A 的阶段出口是正式相关用例、X01–X03、W、V 全通。通过后继续下面 B/C。

## B. 完成原定结构预检与可执行 DDL 单源

### B1. 所有入口共享只读结构判断

按实际受支持版本建立必要结构描述。区分真正空库、受支持的完整未初始化 Detuned 结构、受支持旧实例、健康当前实例、未来版本、未知库与损坏库；分类前不能偷偷补表、补版本行、生成 secret 或发管理员凭据。

当前 `classifyDatabase` 的缺口包括：只对“已经存在”的字典表检查列、未检查主键/唯一约束/外键/索引，以及只看少数表是否空便提前返回 blank。修复完整规则，不能只给 L03 的幂等表名加特殊判断。

需要验证的结构和材料：

- 对每个支持版本检查全部必需表与列，以及影响正确性的类型、非空、主键顺序、唯一约束、外键绑定。旧版本按真实历史 DDL 判断，不要求它预先拥有 v2 新结构。
- 核验必要索引的实际列/顺序、唯一性及适用的表达式/部分索引条件，不能仅比较名字或索引数量。使用 `PRAGMA table_info/table_xinfo`、`foreign_key_list`、`index_list/index_xinfo` 与必要的 schema 信息，具体实现自行选择。
- 检查迁移表自身结构和版本行，再依规则判版本连续性与支持范围；明确拒绝矛盾记录，不靠 MAX(version) 假定所有前序迁移都完成。
- 完整检查当前版本 metadata/初始化事实/持久化 secret 等必需材料。凭据全吊销、过期或 actor 禁用仍是既有实例，不能回到 blank；原有撤销与失败重试规则保持。
- 合法空库及受支持的空 DDL/初始化失败后重试路径继续通过。不能将仅具备五张空表的损坏库认作新库；也不能把合法 SQLite 内部表/FTS 结构误判为外来库。结构描述须来自支持版本，避免随意扩展历史兼容范围。

bootstrap、CLI init、CLI serve 使用相同结论；坏库在迁移 DDL/DML、持久化配置修改、凭据生成和监听前拒绝。诊断指出缺失或矛盾的结构，资源和锁正确释放；不返回通用成功状态。

### B2. 结构正反例矩阵

把 L03 转为正式回归，并覆盖至少下列不同检查类别。现有测试已达到要求时直接精确引用。

| 输入 | 结果与证据 |
|---|---|
| 幂等复合主键缺失或组成错误 | init/serve/统一启动入口拒绝；重开后不变 |
| 必需表缺失、必要列损坏 | 受影响的旧/当前结构拒绝；不补表修复 |
| 必要唯一约束/外键损坏 | 只读拒绝；有健康结构配对对照 |
| 索引同名但列、顺序或唯一性错误 | 检查实际定义后拒绝，而非只看索引名 |
| 迁移表缺列/主键、版本行不连续或版本与结构矛盾 | 修改前拒绝；全库重开快照相同 |
| 看似空库但只剩部分 Detuned 表/结构损坏 | 不能 blank 初始化；不新增 secret/凭据 |
| 真正空库、完整受支持未初始化结构、真实历史 v1、健康 v2 | 按既有契约初始化/迁移/重复启动，业务与凭据保持 |

用自建文件库对 init 和 serve 的共享分类做验证，并有实际 CLI serve 在拒绝前未监听的证据。不要用内存库的 toThrow 代替关闭重开，也不要仅调用 `classifyDatabase` 就宣称所有入口无写入。

### B3. DDL 必须只有一个可编辑的权威来源

目前 `schema.sql`、`schema.ts` 和迁移内 DDL 仍需要人工维持一致；只做字符串相等测试不是可执行单源。

选择一种简单方案：以 SQL 为源并通过构建可靠打包/生成运行时模块，或以模块为源自动生成 SQL。生成产物如需提交，须有校验确保不可手改漂移。新建与升级共用当前 schema 定义中相同的新增对象，迁移按明确版本执行；历史 v1 fixture 保持原字节，不能按新源重生成而丢失历史意义。无需把所有历史迁移拼成当前建库 SQL。

验证源文件变更会实际进入构建产物；干净构建后的运行时不依赖偶然残留 dist 或源目录路径。不要为此清理用户的整个工作区。新建库与真实旧库升级后的结构按语义比较，涵盖表、约束、外键及索引实际定义；“健康结构等价”和“损坏结构应拒绝”是两种独立验收。

仅因新增只读校验不必自动提升 schema 版本。若实际存储布局需要变化，按已有版本/兼容契约做正规迁移并保存旧夹具，禁止假装还是同一结构。

## C. 补齐原 B01–B12 的实际验收证据

建立一张简洁的验收映射表：每个必需子条件 → 当前正式测试或独立脚本的测试名/断言位置 → 本轮实际输出 → 仍未证明项。已有效的证据可复用，不重复造同义测试；不能把“12 个 it 全绿”直接等同全部子条件完成。

| 原项 | 本轮需核对并补空缺的行为 |
|---|---|
| B01 | 11 个 operation 族实际编码并同键重放，验证合法作用域、引用种类、完整固定业务结果和无新增副作用。只验证初次写入/JSON kind 不够 |
| B02 | 立即重试、后续对象变更、时钟推进、文件库关闭重开、提交成功但响应未交付后的重试；比较固定 ID/版本/时间及嵌套结果。当前授权/脱敏例外另有真实断言 |
| B03 | 旧 `$ref` 的 resolve/reopen 经升级及后续相反动作后，仍返回原 action/version/resolution；重开后相同 |
| B04 | 未知 kind/ref version、损坏 JSON、缺历史受控失败，无 action 重执行、无任意 JSON fallback；本轮 X/V/W 补项纳入 |
| B05 | 真正支持的历史库成功升级，业务/凭据保持、旧正文缓存清理、版本正确；关闭重开与重复升级稳定，并有坏输入拒绝对照 |
| B06 | 第二条引用转换、metadata/版本提交等既定故障阶段的真实 SQL 写失败命中，完整事务回滚；关闭重开比较 schema 与所有表行。故障钩子必须证明实际命中，不能预检先拒绝就算测试通过 |
| B07 | 凭据全部吊销/过期或 actor 禁用后不成为新实例、不增发 token；使用真实状态修改和断言 |
| B08 | 初始化失败后真正关闭重开重试，产生一次初始材料；合法旧库不增发凭据，坏旧库不被初始化“修复” |
| B09 | init 与实际 serve 对未来/未知/损坏库在监听和修改前拒绝；本轮结构矩阵与共享入口有据 |
| B10 | 持久化 secret 缺失/读写失败按契约诊断，不生成临时替代；失败后资源/锁可供下一次正确启动使用 |
| B11 | 同键异 payload 冲突、不同目标作用域隔离、实际并发仅一次提交；并发场景用同步屏障或可证明交叠的请求 |
| B12 | 权限、脱敏、ack、25 修订覆盖与 U07/U08 的实际回滚断言保持；按真实测试来源写证据 |

11 族是：space.create、space.patch、thread.create、thread.patch、post.create、post.revision、post.withdraw、relation.create、relation.resolve、relation.reopen、admin.redaction。使用当前 `parseOperation` 与服务调用的真实 operation/目标，不臆造 post.redact。增加证据时优先参数化夹具和清晰断言，避免继续把所有差异塞入难以审阅的单个长测试。

保持服务端业务层的幂等、事务与授权规则。新解析入口用 unknown 和明确结果类型；不需要为类型风格重写无关服务，不得声称尚未实现的静态类型关联已完成。

## D. 最终验证和交付出口

先做各单元受影响的验证。最终源码稳定后执行以下 **22 个不同命令**，先 build 再运行依赖 dist 的探针。X 的两次历史执行只须在最终脚本上跑一次；G/H/J/K 不可再次漏掉。新增结构/构建验证另记实际命令。

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm test:all
node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs
node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs
node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs
node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs
node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs
node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs
node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs
node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs
node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs
node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs
node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs
node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs
node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs
node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs
node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs
node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs
node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs
node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs
```

使用能记录失败并继续收集其余命令真实退出码的执行器；不以 `|| true` 抹平失败，也不因已知 R4 exit 1 漏跑后续命令。本地回环端口测试按环境权限机制执行，若受限记录具体失败原因。没有运行的命令必须标为未运行。

本轮完成门槛：

1. R14 X01–X03、R13 W、R12 V 全通过，正式入口覆盖补齐；合法旧格式和精确响应形状无回退。
2. **R8 L01–L08 全通过，L03 不再是允许保留的失败。** 结构矩阵、DDL 构建产物、真实旧库升级和新建等价证据成立。
3. 原 B01–B12 必需子条件逐条有真实证据。正式套件全通过，数量根据实际输出；R1–R3、G/H/J/K/N/P/Q 无回归。
4. 仅 R4 的 U05/U06 继续归后续 R4-C，保存其真实 exit 1；不能把本轮新增失败或其他旧失败写成预期。若尚未完成某单元，如实交付部分完成状态，不能以时间不足或大量测试通过代替出口。
5. 历史审查和 SQL fixture 不改断言/不覆盖输出；新测试进入正常正式测试命令。核心验证不依赖模型账户。

归档到 `docs/reviews/2026-10-01-m0-m1-r14/implementation-r4-b4-3/`，包含 baseline-before/after（HEAD、状态、实际改动、文件哈希）、原始 stdout/stderr、commands 与退出码、B 子条件证据映射、变更和未覆盖范围的 README。记录修复前失败和最终结果，不复制独立审查输出冒充实现者执行。

更正 R14-E01：上一交付遗漏 G/H/J/K，R14 审查已独立补跑通过；正式 W 有两入口而 V01/V02 当时没有；快照是逻辑等价。保留原归档，在新交付说明准确来源。同步 docs/03、04、07 和必要 ADR，特别是结构支持范围、单一 DDL 来源、确定矛盾与缺历史的边界。

更新根 README 与 docs/progress 为本包真实实现/自验状态，引用新交付并保留 R14 为最新独立结论。未经过下一次独立复核，不写“R4-B 已验收”或“M1 完成”。本任务结束后交回，下一候选才是原 `docs/reviews/2026-09-28-m0-m1-r4/follow-up-contracts.md` 的 R4-C；不要自动开始。
