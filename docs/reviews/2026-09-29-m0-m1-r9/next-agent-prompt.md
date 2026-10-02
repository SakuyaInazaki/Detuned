# 下一轮提示词：M0/M1-R4-B.4-2

以下正文可直接交给 coding agent。本轮收口已登记的历史结果与引用校验，不扩大到结构预检或整个 M0/M1。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务为 **M0/M1-R4-B.4-2：统一历史结果与引用校验**。关闭 **R8-F03、R8-F04（L04–L07）**，并在开头补齐 R9-E01/E02。**L03 / R8-F05 属于后续 B.4-3**；上轮实现报告把两个包的编号和缺陷对应关系写反了。以本提示词及 R8 原 remaining-work.md 为准。

R9 已独立确认 B.4-1 的两个功能修复：L01/L02/L08、N01–N05 通过。99 项正式测试、R1–R3 46 项及 G/H/J/K 通过；R8 仍 exit 1（L03–L07），R4 仍 exit 1（仅 U05/U06）。不要因历史问题属于后续范围而改其断言，也不要把部分子例通过写成整个包验收。

当前 HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，有未提交实现，内容以 R9 baseline 为准。先记录 Git 状态和本轮起始指纹，保留全部既有实现、夹具及审查材料。不要 reset/clean/checkout 覆盖文件，不覆盖历史 observed/交付报告。默认不创建或调度其他 Agent，不调用模型、不推送/发布/公网部署、不修改全局 harness 配置；验证使用自建临时库及合成凭据。

先读 AGENTS.md、README.md、docs/00-implementation-brief.md、docs/08-roadmap.md、docs/11-development-standards.md，再读 docs/03、04、07、09、12，以及：

1. `docs/reviews/2026-09-29-m0-m1-r9/README.md`、`verification.md`、`baseline.json`。
2. `docs/reviews/2026-09-29-m0-m1-r8/README.md` 的 R8-F03/F04、`remaining-work.md` 的 B.4-2。
3. R8 `check-b3-gates.mjs` 与 R9 `observed-r8-gates.json`，重点 L04–L07；R9 `check-b4-1-acceptance.mjs` 与其 observed。
4. R8 `coverage-audit.md` 及原 B 任务矩阵，理解当前子包与后续完整验收的区别。

开始时报告任务编号、要改变的行为、预计文件与验收方法。建议以“补齐回归—统一引用通路—历史与语义校验—交付验证”的顺序工作，保持改动可审阅。无需另写一套规划文档或创建空接口包。

## 0. 先固定 B.4-1 已修复行为（R9-E01/E02）

这一步补测试和契约，不重新实施已经通过的功能修复。

- 正式测试 L01-3 目前没有故障注入。参照 N01，在响应层确实抛错，断言故障命中一次、事务已提交且另一连接能读到空间/幂等记录；客户端首次未收到成功结果；同键重试及真实关闭重开后恢复完整 data，空间、membership、事件、结果记录均不增加。Fastify onSend 受控 500 是可接受方式，不宣称真实 TCP 断线。
- 正式 L02-3 目前只是纯 validator 调用。参照 N03/N04 补合法 relation marker 多次协调启动与 422 无写入，及坏 op/完整目标/reason/额外正文在迁移时拒绝、关闭重开后逻辑快照不变。纯 validator 单测可保留，但标题应对应其实际能力。
- 保留 N02 的完整 operation 和 family-only 兼容标记，以及 N05 的真实另一空间反例。把缺少的关键断言补进正式回归；已有等价断言可以直接引用，不要求机械复制所有测试。
- 在 docs/03、04、12 明确：规范 marker.op 绑定记录的完整 operation；支持的旧 family-only 标记从所属记录取完整 operation 进行规范化，不改变 actor/space/key/hash；错误完整目标不被兼容。只有已注册 reason 可持久化。
- 旧报告缺原始输出/实现后指纹，本轮从实际命令开始留存；不要补造上轮证据，也不要把 R9 的独立验证改署为自己的历史运行。

## 1. 统一实际操作与引用的验证通路（R8-F04 / L07）

先以业务服务实际传给 executeIdempotent 的参数建立穷尽类型映射。以下是当前实际写法，不能凭接口名猜测后擅自改已有幂等键：

| 操作族 | 当前 operation | 作用域 / 目标 | 业务结果与引用 kind |
|---|---|---|---|
| space.create | `space.create` | `instance`；返回新空间 | `{space, revision}` → space |
| space.patch | `space.patch` | 记录 space_id 是目标 | `{space, revision}` → space |
| thread.create | `thread.create` | 记录 space_id；返回新主题 | `{thread, initial_post?}` → thread.create |
| thread.patch | `thread.patch:<thread_id>` | 记录空间 + 目标主题 | Thread → thread.patch |
| post.create | `post.create:<thread_id>` | 记录空间 + 所属主题 | `{post, revision, relations?}` → post |
| post.revision | `post.revision:<post_id>` | 记录空间 + 目标帖子 | `{post, revision, relations?}` → post |
| post.withdraw | `post.withdraw:<post_id>` | 记录空间 + 目标帖子 | Post → post.withdraw |
| relation.create | `relation.create` | 记录空间；端点来自请求和关系记录 | **裸 Relation** → relation.create |
| relation.resolve | `relation.resolve:<relation_id>` | 记录空间 + 目标关系 | `{relation, resolution}` → relation.resolve |
| relation.reopen | `relation.reopen:<relation_id>` | 记录空间 + 目标关系 | `{relation, resolution}` → relation.reopen |
| admin.redaction | `admin.redaction` | 记录空间；目标在请求/脱敏记录 | `{redaction_id}` → admin.redaction |

解析器还接受的历史/兼容变体要另外写清来源与支持条件，不要误当作上述服务正在生成的格式。operation 到业务结果、引用类型、历史重建规则的关联应由正式类型约束，采用可穷尽 switch 或等价映射；外部/旧 JSON 用 unknown 经运行时解析，避免多套 any + startsWith 分支各自解释规则。只在 core/storage 必要范围重构，客户端不复制业务判断。

必须形成共享链路：解析 operation → 识别受支持输入 → 规范化引用 → 格式验证 → 基于同一事务视图的实体语义验证。新写编码、每一个迁移成功返回、在线重放都进入相应验证；不可重放返回也不能绕过 operation/kind/字段约束。纯格式 validator 不必依赖 SQLite；语义层可以通过最小读取接口或既有 StoragePort 共用，避免 core 反向依赖存储实现。

格式要求：

- 安全正整数版本、必需非空 ID、已注册操作/kind/版本/状态、字段白名单。
- initial_post_id 与 initial_post_revision 同时存在或同时缺省；缺省 initial_post 不允许悬空的关系集合。
- relation_ids 与 relations 同时存在时内容必须一致，重复/多出/缺少的 ID 必须拒绝；顺序按明确的业务返回契约规范化或验证，不随意丢项。
- 验证嵌套引用的允许字段和版本；不能通过默认成 1/open 掩盖未知历史，也不能将未知 operation 或操作-kind 错配变成普通 unreplayable。
- 编码器输出必须经过正式 validator。`extractResultRef('thread.create', thread.version=0)` 必须失败；迁移早退路径同样受保护。L07 的未知 operation 子例现在已经通过，保留该保护。
- 区分受支持的“旧完整业务响应”和“v1 typed ref”：旧 codec 可以读取已有完整响应中的历史字段后产出最小引用；新引用/标记不得持久化 body/summary/tags 等正文缓存。不能为了禁止缓存而把全部合法旧完整响应拒绝。

本节的 11 族映射应完整，但原 B01 全场景证据汇总仍归 B.4-3；本轮为改动到的通路提供真实正反例，不把“映射已穷尽”写成“11 族全部历史语义已验收”。

## 2. 恢复或明确拒绝旧嵌套历史结果（R8-F03 / L04）

旧 `$ref:post + relation_ids` 在重放时把当前关系当成当时关系。L04 原结果为 v1/open，关系后来 resolve 到 v2/resolved，迁移后仍返回 201 及 v2/resolved，这是错误成功。

- 覆盖普通 Post、修订及 Thread.initial_post 中同类嵌套关系路径。
- 只有可靠不可变记录/受支持完整旧响应足以确定操作当时的版本和状态，才重建成功结果；记录证据来源，不能仅因为“看起来是创建”就强行假定 v1，关系创建可能复用已有端点。
- 证据不足时，选择受控 unreplayable 或首次原子拒绝，说明支持策略；保留已提交业务事实与原键，禁止重跑 action、生成新键、清空关系后伪报成功。
- 对合法可恢复旧输入，准确返回完整固定业务字段；对缺证据的旧输入，在线重放也必须安全，不能只在启动时检查。新格式中已有可靠版本的 J07 正例不能被连带拒绝。
- 记录保留的旧 ref 形状及来源。R8 已核对 `$ref:post + relation_ids` 的历史源码；合成兼容变体仍标明合成，不宣称完整旧二进制产物。

## 3. 历史快照的全部固定字段必须一致（R8-F03 / L05）

目前同 `(thread_id, version)` 只比较 title/state，忽略时间冲突，可能接受错误 updated_at。各旧 Thread 创建/修改迁移分支应共用同一插入或核对规则：

- 固定字段至少包括当前历史表的 thread_id、version、title、state、版本时间 created_at（用于投影当时 updated_at）。同一历史键的全部固定字段一致才复用，任意冲突则拒绝并回滚整次迁移。
- 历史时间取自可信旧结果/不可变记录；不要用迁移墙上时钟补造操作历史。存在缺失字段时按明确的支持规则恢复或受控拒绝。
- L05 的“仅时间不同”必须拒绝，关闭重开后 schema、业务、事件、幂等记录、凭据和实例 metadata 的逻辑快照与升级前相同。完整一致历史作为正例必须继续升级成功。
- 对固定操作结果字段与当前授权/脱敏投影在 docs/03、04 明确区分。重放仍先检查当前权限并应用当前脱敏，不通过缓存完整正文冻结旧权限。

## 4. 同一空间内也必须校验完整引用关系（R8-F04 / L06）

格式正确且实体在同一个 space 仍可能错绑。迁移和直接在线重放均校验：

- thread.create 的 initial_post 实际属于该 thread；post revision 确实属于该 post，版本存在。
- 操作的目标 ID、记录的作用域、引用实体的归属一致；space.create 的 instance 特例必须保留，space.patch 不能接受真实其他空间。
- 嵌套关系的 source 指向本次返回的 post 与对应 revision，target post/revision 存在且满足空间约束；只“关系在同空间”不足以证明属于该结果。
- relation.resolve/reopen 的 resolution 同时匹配 relation_id、action、version；ref.relation_version 与 resolution.version 一致，ref 状态与动作一致。不是只查 resolution_id 存在或 relation_id 相等。
- 已知 op 却搭配其他 kind、成对字段不完整、错误实体或决议的输入属于损坏，不用通用 unreplayable 掩盖。
- 语义验证集中实现或共享同一规则，不能 migration 与 replay 各写一个近似版本。所有必要读取处于正确事务边界，新状态、事件和幂等结果仍同事务提交。

## 5. 正式回归与小包出口

先把 L04–L07 的失败及下列相邻边界写成正式回归，确认失败原因后再修实现。R9 补项对应已经修复的功能，不要求回滚产品制造红灯。

| 范围 | 必须包含的反例 | 必须保留的正例 / 断言 |
|---|---|---|
| L04 历史关系 | 旧 ID-only ref 的关系后续 resolve/reopen；包括 initial_post 路径 | 新格式固定嵌套版本与可恢复旧完整结果完整比较；不足时明确非成功且无额外写入 |
| L05 快照冲突 | 仅历史时间不同；同键其他固定字段冲突可引用已有 J05 | 完全相同快照成功；失败实际重开后全库逻辑快照相等，不只 toThrow |
| L06 同空间绑定 | initial_post 在另一 thread；resolution 版本/动作错配；nested source 或修订错配 | 对应合法关系成功；迁移拒绝和直接在线重放拒绝分别验证；无 action/event 重执行 |
| L07 验证入口 | 编码版本 0/非安全整数、单独 initial_post_revision/ID、两数组不一致/重复、已知 op 错 kind、未知 op、额外缓存字段 | 每条合法业务链正常；新编码、迁移（含早退）、重放三处有实质覆盖 |
| B.4-1 防回归 | R9-E01 的响应故障及坏标记迁移 | L01/L02/L08、N01–N05 继续通过，含 instance 作用域和合法 marker 兼容 |

每项拒绝必须确认没有新增业务、事件或幂等记录；升级失败还要确认凭据、metadata、版本行与 schema 不变。结果比较完整固定字段和嵌套内容，不只状态码/ID。不得通过 skip、改坏输入成正常输入、删除旧夹具或固定返回错误满足条件。

开发期按改动运行相关快测；最终在同一实现版本上完成一次下列检查，逐条保存真实退出码和原始输出：

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
```

本包要求：L04–L07 全部通过；L01/L02/L08、N01–N05、G/H/J/K、R1–R3 与正式套件无回归。**允许仅 L03 留待 B.4-3，R8 脚本仍返回 exit 1；R4 仍只允许 U05/U06 失败。** 分别报告失败 ID 和所属任务，不把非零退出码隐藏为整体全绿。

若必要格式/历史支持策略影响旧探针，先说明具体契约来源，保留旧 observed，提供同语义正反例；不能为了过门禁降低现有历史兼容条件。正确的 T06 历史 DDL 夹具不得退回“删 metadata 模拟旧库”。

## 6. 交付与停止点

本轮实现证据放到 `docs/reviews/2026-09-29-m0-m1-r9/implementation-r4-b4-2/`，至少包含：

1. 实现前/后的 HEAD、dirty 状态、源码与测试指纹、环境；未提交工作通过文件指纹标识，不能只写 HEAD。
2. 每条实际命令、退出码、原始 stdout/stderr；未运行检查明确记录，不能回填成成功。
3. R9-E01/E02、R8-F03/F04 的逐项说明、真实测试名称/行号、故障命中与断言；操作映射和旧 codec 支持规则。
4. 剩余 L03、原 B 证据矩阵未覆盖子条件与 U05/U06；本包完成不等于 R4-B 或 M0/M1 完成。

同步 README、docs/progress、docs/reviews/README 的最新状态，docs/03、04 及 docs/12 的规范/决定。必要小型存储读取改动可以完成；结构分类、通用 DDL 重构和完整 B01–B12 汇总留给 B.4-3，不开展新的存储平台或迁移框架。保留 archive/pre-plan.original.md 原字节。

完成后停止并交回审查。不要自动执行 B.4-3、R4-C、M2.1 或 harness 接入。最终回复给出本包结果、证据路径、准确剩余失败与下一候选 B.4-3，不宣称整个数据与升级包已经验收。
