# 下一轮提示词：R4-B 数据与升级可靠性

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 实现 Detuned。本回合只完成 **M0/M1-R4-B：数据与升级可靠性**，关闭 R4-F01–F04，以及这些问题对应的上一轮 R3-B 验收条件。**不开始 M2.1，不执行 R4-C，不重新设计已通过的 R3-A。**

当前被审查源码为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`。62 项正式测试和此前 46 项探针通过属实；本次新增 U01–U08 中 U01–U06 失败、U07/U08 通过。R4-C 的 U05/U06 是已经确认的后续契约缺陷，不在本回合修复，但必须保留为未完成，不能据 R4-B 完成宣称 M2.1 就绪。

先读 AGENTS.md、README.md、docs/00-implementation-brief.md、docs/08-roadmap.md、docs/11-development-standards.md，再读 docs/03、04、07、12，以及本目录 README.md、verification.md、observed-unfinished-contracts.json 和 check-unfinished-contracts.mjs。核对上轮 `docs/reviews/2026-09-28-m0-m1-r3/next-agent-prompt.md` 的 **R3-B 全部八项**，本文件负责收窄本回合范围，没有取消这些数据不变量。

开始时报告任务编号、计划涉及的模块和验收办法。检查当前 Git 状态，保留用户修改与未提交的审查材料；不得回退到较老源码，不覆盖此前 observed，不修改原始归档。默认不启动其他 Agent、不发布、不推送、不部署、不修改全局 harness 配置、不调用模型。

## 交付边界

主要修改位置为 core 的幂等结果建模与相关服务调用、storage-sqlite 的历史实体/迁移/bootstrap、CLI init/serve 打开库路径、必要 protocol/ADR 与正式测试。目录结构沿用已有仓库，不增加 ORM、通用迁移平台或调度框架。

最终要让别人回答三个具体问题：这条重试对应哪次已提交操作；这个旧库是否完整升级；这次启动是否改变了实例身份或凭据。每个答案都要有数据库事实和可重跑检查。

## 第一步：列出操作结果，再实现有版本的结果引用

先在交付记录放出下表的实际类型，确认现有源码，而不是按对象形状猜测：

| 操作族 | 必须覆盖的返回形态 |
|---|---|
| space.create / space.patch | space 与固定 SpaceRevision |
| thread.create | thread 与可选 initial_post、修订和关联关系 |
| thread.patch | 直接返回 Thread 的路径 |
| post.create / post.revision | post、固定 PostRevision、可选 relations |
| post.withdraw | 直接返回 Post 的路径 |
| relation.create | 直接返回 Relation 的路径 |
| relation.resolve / relation.reopen | relation 与固定 RelationResolution |
| redaction | redaction_id |

要求：

1. operation 与 result kind 显式绑定，编码/解码使用可判别类型和版本字段。参数可作为 `unknown` 进入验证器；业务层不能继续靠 `any` 形状猜测。每种已实现写操作有对应 codec；新操作遗漏会在类型检查或明确注册检查中暴露。
2. 删除任意对象 `JSON.stringify(result)` / `return parsed` 的兜底成功路径。未知 kind/version、非法字段、引用实体缺失要输出稳定非成功错误。**不能因一条记录损坏而再次执行其业务 action。** 保留原键避免重复提交，并给可读诊断。
3. result_ref 只保存格式版本、操作种类、对象 ID、固定修订/操作版本与必要关联 ID。正文/摘要/tags 不缓存其中。thread 这种缺少不可变版本存储的对象，只增加重建所需的最小历史结构，再引用该结构；不要把标题直接塞回 result_ref 当作完成。
4. 明确区分原操作结果和当前安全投影。原操作版本、标题、时间与 resolution_id 不随新修改漂移；当前授权与脱敏仍生效。把合法允许变化的生命周期字段写入契约，不能把完整当前对象加几个旧字段就称为固定结果。
5. resolve/reopen 的旧引用只要包含 resolution_id，就能从真实 RelationResolution 得到 version/action。重试原 resolve 必须是 v2/resolved + 原 v2 resolution，即使当前 relation 已是 v3/open。其他关系/初始帖子关联也核对固定版本，不丢失关联。
6. 找不到历史修订不能伪造 `[REDACTED]` 成功响应。真正已脱敏与存储损坏/历史不可恢复必须有可区分的数据库事实与处理。

至少覆盖立即重试、后续对象变化后重试、关闭重开后重试、提交后响应丢失再重试。保持原 actor/space/operation/target/key 作用域、payload 冲突 409、授权检查与同事务写结果的既有行为。

## 第二步：区分初始化、升级与凭据恢复

1. 初始化完成是实例生命周期事实，不取决于现在是否有未撤销 credential。已初始化实例在凭据全部撤销、过期或 actor 被禁用后，普通 init 不能新增管理员 token、不能改称新实例、不能改变已有身份和实例 secret。
2. 空白数据库初始化时，管理员身份、凭据、密钥和完成标记按既有原子性要求提交；首次失败后可安全重试。
3. 合法旧库缺少 metadata 时属于升级，凭据/actor 保留，不增发 token。识别旧库依据实际历史结构及数据，不用“随便有一个 human 和一条 credential”作为完整性证明。
4. 损坏库或丢失实例材料应停止并给明确恢复指引；不能静默当新库。无需为本回合新增完整备份/恢复产品界面或开放重置 API。
5. 持久 secret 经正式 storage 端口或组合根获取。读取/持久化失败要使启动失败，移除“失败后返回随机临时 secret”的生产 fallback。显式传入测试 secret 的既有可测试接口可以保留。
6. init 与 serve 的 DB 打开、版本识别、迁移、材料验证使用同一入口/协调逻辑。serve 在迁移与检查成功后才监听；不能只复制一份 `max(version)>1` 判断。异常关闭本次 DB/服务后释放目录锁，保留已修好的正常关闭顺序。

## 第三步：有序、原子、可验证的旧库迁移

1. 根据实际结构制定新的受支持 schema version，不能继续以 `INSERT OR IGNORE version=1` 代替迁移。一个 DDL 来源；若保留 schema.sql 与 TS 包装，明确生成关系并验证一致性。
2. DDL/DML 和会修改持久状态的配置前进行结构/版本预检。未来版本 999、未知旧结构、矛盾的版本标记拒绝；不得在拒绝之前新增表、密钥、credential 或迁移行。
3. 本地 SQLite 的一次升级把待执行迁移、历史实体、引用转换、metadata 与版本标记放在可整体回滚的事务中。先验证再提交，失败记录诊断后向上传播。禁止 catch SQL 错误后继续，禁止只回滚最后一条 UPDATE。
4. 明确支持已有基线 `a6c437d`、`fa1b35c`、`c4f041f`，同时覆盖审查基线 `71aefc1` 已生成的格式。至少包括旧完整 JSON、嵌套 initial_post、SpaceRevision 对象、旧 `$ref`、直接实体 fallback。每个 fixture 写出生成来源、必要字段与已知差异。
5. 能恢复的数据迁成新引用；例如旧 resolution_id 可恢复精确版本。**确实缺少旧值且无法恢复**的已知历史记录可按 ADR 转成有类型的“原结果不可重放”标记，保留原请求键/哈希和业务对象，重试给稳定非成功错误。不得猜造旧标题，不得回退到当前对象，不得建议直接换键重做同一次写入。
6. 真正损坏/未知的格式采用明确拒绝策略并给记录定位信息；不能静默跳过，也不要把原始正文/令牌写入诊断。若采用隔离策略，需要先定义、验证其无内容泄露与不重复执行保证，不能直接把整个旧响应搬到另一张无生命周期管理的缓存表。
7. 完成转换后验证已支持记录均为合法新引用/明确不可重放标记，旧正文副本清除，业务数据和既有凭据未变。重复启动/升级无额外变更；close/reopen 后相同。
8. 至少提供一个别人能复跑的旧库构造与升级命令。来源明确的逻辑 fixture 可以使用，但不要把它写成“完整历史二进制升级已测试”；若真实运行旧源码，单独记录版本、命令与结果。

## 必须补进正式测试的矩阵

先新增能在修复前失败的测试，再修对应行为。不能把整个审查脚本套入一个测试，或只照抄 U01–U04 的单点输入。

| 编号 | 条件 | 验收事实 |
|---|---|---|
| B01 | 以上全部已实现操作族 | 各自 result schema 正确，编码/解码无任意 fallback |
| B02 | 立即/后续变更/重开/响应丢失重试 | 固定操作 ID/版本/关联记录；不增加业务行和事件；当前脱敏/授权仍生效 |
| B03 | 旧 `$ref` resolve/reopen + 后续相反操作 | 重建原操作状态，与 resolution.version/action 一致；U02 通过 |
| B04 | 未知 kind/version、缺失历史、损坏 JSON | 明确非成功；不回传任意 JSON，不重新执行 action；U04 通过 |
| B05 | 既有合法历史格式转换 | 业务数据与凭据不变，无旧正文缓存，版本正确推进，重复执行和重开一致 |
| B06 | 第二条引用转换、metadata/版本提交前分别注入失败 | 整个升级拒绝并回滚；重开后也无部分升级；U01 通过 |
| B07 | 全部管理员凭据撤销/过期，actor 禁用 | 不当成新实例，不生成新 token/secret；U03 通过 |
| B08 | 空白库首次初始化失败与重试；旧库补 metadata | 前者可安全重试且只生成一份初始材料；后者不增发凭据 |
| B09 | init 和真实 serve 遇到未来/未知结构 | 监听前拒绝，库逻辑结构和数据不变；成功路径确实走同一迁移入口 |
| B10 | secret 缺失/读取或持久化异常；启动失败 | 稳定诊断，不使用临时 secret 服务请求，DB/锁可由下一次受控启动接管 |
| B11 | 同 key 改 payload、不同目标同 key、竞争写入 | 冲突/作用域正确；唯一合法提交；并发用屏障/独立请求验证 |
| B12 | 已修好的权限/脱敏/ACK | 原有正式测试和审查探针保持通过；U07/U08 通过 |

小范围快测用于开发反馈，完成后再跑一次完整验证；不要因测试数量少而增加镜像实现的测试。没有执行的矩阵项明确写未完成。

## 命令、证据与完成判断

最终实际运行：

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
```

R4-B 出口是 B01–B12 的正式证据与 U01–U04/U07/U08 通过。**如果仅剩本回合明确延期的 U05/U06 失败，最后一个命令仍退出 1，这是 R4-C 未完成的事实，不得改成 0 或宣称全绿。** 完整记录所有结果并逐条归属。出现其他失败则继续处理本包回归。

若新 schema 使历史 probe 的构造方式不再合法，应更新来源清楚的 fixture/等价断言并说明迁移格式变化，保留基线 observed。不得放宽未知数据拒绝、原版本保持、失败回滚或凭据不增发的断言。

更新 docs/12-decisions.md 与受影响的 docs/03、04、07；同步 progress 和 README。AGENTS 维持长期规则，不写易过期的“全部完成”宣言。四宿主仍按真实证据保留 not_tested，不为了本包改动全局配置或发起推理。

建议将新增实现记录与修复后输出放到本目录的 `implementation-r4-b/`，标明实际 HEAD、dirty diff、Node/pnpm 版本、命令退出码；不要覆盖审查方的 observed。维持可审阅变更，不捏造独立同行评审或远端 CI 成绩。

最终交付用以下结构：

```text
任务：M0/M1-R4-B
完成行为与数据格式/迁移版本：
B01–B12：逐项状态、测试位置、实际结果
U01–U08：逐项结果，明确 U05/U06 仍属 R4-C
旧库升级命令、损坏库处理、凭据恢复边界：
实际运行检查与证据路径：
未运行检查与原因：
已知限制与下一步：R4-C，M2.1 尚未就绪
```

达到本包出口后停止，交给维护者复核。下一次再领取 [R4-C](follow-up-contracts.md)。不要自行扩展到附件、Web、正式评审、向量检索或 Agent 调度。
