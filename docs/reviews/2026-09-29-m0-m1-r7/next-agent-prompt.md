# 下一轮提示词：M0/M1-R4-B.3

以下正文可以直接交给 coding agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务为 **M0/M1-R4-B.3：完成历史结果重建、实例分类与引用完整性收口**。关闭 R7-F01–F04，完成原 R4-B 的必需验收条件。本轮不执行 R4-C，不开始 M2.1，不增加附件、Web、正式评审、Agent 调度等功能。

当前基线是 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交实现，实际指纹在 `docs/reviews/2026-09-29-m0-m1-r7/baseline.json`。先检查 Git 状态；不要 reset、clean、checkout 覆盖已有实现，也不要删除历史审查与 observed。默认不启动其他 Agent、不调用模型、不修改全局配置、不提交凭据、不推送/发布/部署；只使用本轮自建测试库。

先读 AGENTS.md、README.md、docs/00-implementation-brief.md、docs/08-roadmap.md、docs/11-development-standards.md，再读 docs/03、04、07、12，以及：

1. 本目录 `README.md`、`coverage-audit.md`、`verification.md`、`baseline.json`。
2. `check-b2-completeness.mjs` 和 `observed-b2-completeness.json`。
3. `check-legacy-fixture.mjs` 和 `observed-legacy-fixture.json`。
4. R6 的 `next-agent-prompt.md`、R4 的原 `next-agent-prompt.md` 中 B01–B12 条件。

独立复跑已确认：84 项正式测试、46 项旧探针、G01–G09、H01–H10 全部通过；U05/U06 仍归 R4-C。新 J01–J06 失败，J07/K01 通过。**不能只修到已知 J 输入变绿就宣布整个包完成；也不要把已验证的修复推倒重写。** 重点保留原子迁移与故障回滚、诊断正文保护、新格式的历史时间/嵌套关系、正常复用关系、撤销凭据不重初始化等行为。

开始时说明任务编号、将改变的可观察行为、涉及模块和验证方式。按以下顺序完成可审阅的变更；先把反例变为正式回归，确认其在现有实现上失败，再改产品代码。除下述明确的旧夹具修正外，不放宽断言。

## 0. 先修正过时的 T06 夹具，固定兼容边界

这一步是审查明确要求的纠正，不是把产品失败改成测试成功：

- `tests/integration/m0-m1-r3-regression.test.ts` 的 T06 和 `docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` 的 T06，目前从当前 v2 库 serialize 后仅删除 metadata，已经不是真正 v1 旧库。
- 将两处正例改成来源明确的支持版本 DDL + 合法数据。可参照 R7 K01：读取/固定 `fa1b35c` 的真实历史 SQL，记录来源与 hash；放入 compatible rows 及旧完整 Post 返回值。不要再仅删除当前版本材料来模拟旧版。
- setup 必须验证其真正满足旧结构：版本集合正确、无该旧版本本来没有的表、必要列/约束存在、外键有效。保留“不新增身份/凭据、不发 token、旧正文缓存转换”的断言，补足关闭重开后的同键重放与重复启动不改业务/事件。
- 另用真正当前 v2 损坏材料的反例，覆盖 bootstrap、init、serve 都拒绝。不要用 T06 期待成功的旧断言为例外入口辩护。
- 保留原审查目录中的 observed 文件；交付时说明改了哪两处 setup、为什么语义等价。测试 fixture 如被固定到新文件，放在有明确命名的测试 fixture 目录，避免反复临时删除 schema 元素。

同时列出简明兼容表：已支持历史 DDL/提交、result_ref 形状、能恢复的固定字段、信息不足时的处理。根据真实历史源码验证，不能把看起来相似的任意 JSON 算作旧格式。重点覆盖真实 full response、直接实体、旧 `$ref`、R4-B compact v1 与 B.2 嵌套关系格式。

## 1. 统一引用的格式验证与语义校验（R7-F04）

涉及 core 幂等服务、必要的 StoragePort/SQLite 实现、迁移调用点。CLI/MCP 不复制业务规则。

### 1.1 明确操作与返回类型

按实际服务调用点建立 11 个操作族的映射：space.create/patch、thread.create/patch、post.create/revision/withdraw、relation.create/resolve/reopen、redaction。每行说明实际 operation 字符串及目标、业务返回类型、编码引用、重建策略。保留现有 actor/space/operation/target/key 作用域。

operation 解析、编码和重建共同使用这个穷尽边界。移除 `extractResultRef` 的宽松前缀分派；`thread.create_unregistered` 等必须拒绝。用明确结果类型与 unknown 边界替代整条链路依靠 string/any 的推断；不用 `as` 强制断言代替运行时验证。

### 1.2 新编码、旧转换输出、重放输入共用新格式约束

- 顶层及嵌套对象只允许规定字段，版本/修订为正的安全整数；校验数组元素、成对可选字段、重复/矛盾引用，以及 relation_ids 与 relations 同时出现时的一致性。
- unreplayable 也走完整验证：op 必须等于已解析的原操作；reason 来自明确登记的集合；无额外字段、正文或其他完整业务缓存。其含义是“合法历史结果的信息不足”，不是吞下解析/SQL/实体冲突错误的通道。
- 所有迁移出口返回前都校验，包括“已经是 v1”、缺字段旧 relation.create 和 unreplayable。不得提前 `return resultRefStr` 绕过检查。
- 含 body 的非法 unreplayable 必须使升级失败并回滚；失败后的源数据保持原状，不能一边报拒绝一边静默删缓存。
- 显式未知引用版本优先拒绝；旧 codec 不绕过版本守卫。错误使用稳定非成功码，保持受控诊断，不输出原始 JSON 或敏感内容。

### 1.3 检查实际实体绑定

给重建与迁移检查传入幂等记录/请求所需的 actor、space、operation、target 上下文，不能只靠 result_ref 自述。按操作定义检查：

- 返回的 thread/post/relation 属于记录作用域与请求目标；initial_post 属于对应 thread；所用修订和关联确实存在。
- resolution 的 relation_id、action、version 与请求操作和引用结果一致；真实存在的另一个 resolution 也应拒绝。
- 嵌套关系的归属、source/target 修订与当前结果相符；缺失对象不被过滤成残缺成功。
- 全局/管理操作按自身定义校验，不要机械要求全局 space.create 的作用域等于新实体 ID。当前权限及脱敏投影继续由业务规则执行。

J05 是持久引用故意错配的完整性测试，不能声称发现无条件远程 DB 写漏洞；但也不能以“正常 API 不会写坏”为由跳过已要求的迁移及重放校验。坏引用升级时拒绝且回滚，若读路径遇到同类坏引用也稳定非成功、无数据暴露、不重新执行 action。

正式回归覆盖 J05/J06 所有子例及同类型合法正例；保留 H05/H06/H07。禁止通过拒绝所有旧库或所有重放获得绿色结果。

## 2. 完整保存与恢复原结果（R7-F01、R7-F03）

### 2.1 关系新建与复用

原关系从 v1/open 到 v2/resolved 后，另一个幂等键调用相同 relation.create 会合法返回已存在的 v2/resolved。将缺字段旧 compact 引用一律补成 v1/open 会篡改该结果。

- 新写必须保存本次实际返回的版本/状态；保留 J07。
- 旧记录有完整可靠历史时，恢复精确原返回值。不能仅凭操作名 create 推断 version=1，也不能读当前状态当作过去。
- 如果旧 compact 格式的信息不足以判断该请求是新建还是复用，依据既定契约明确标记不可重放或拒绝升级，并记录规则及恢复指引；保留原 key 和业务数据，不重跑创建操作，不伪造 201 成功。
- 对“新建”“复用”“可准确恢复”“确实无法恢复”分别有测试，不把任意升级异常都当作历史恢复成功的证据。
- initial_post、post.create/revision 的嵌套关系采用相同原则；旧版仅存 relation_ids 的格式也不能回退到当前关系值假装历史快照。

### 2.2 Thread 时间和冲突

- 明确 thread_versions 的字段语义。若现有 created_at 列实际表示该版本更新时间，应统一写入、读取并在规范中说明；需要调整 schema 时提供相应迁移，不只改新建路径。
- 旧完整 Thread patch 已提供 updated_at，必须准确保存。不能用 `new Date()`，也不能用 thread 最初创建时间代替某次 patch 的更新时间。
- 对相同历史主键的已有行，比较全部固定字段（包含 state、操作时间等）；一致则幂等复用，矛盾则整笔升级回滚。不只比较 title，不覆盖或无声丢弃冲突证据。
- J04 的合法已知时间正例必须升级成功并精确重放；冲突子例必须拒绝并在重开后保持原状态。不可用统一 unreplayable 掩盖本来能恢复的已知数据。

用完整固定字段比较检验后续修改、时钟推进、关闭重开后的原键重放，并检查业务/事件/幂等结果数量不增加。安全或生命周期的动态投影字段单独列在 docs/03、04，不能把历史时间/关系版本重新定义成允许漂移来通过验收。

## 3. 共用只读分类与原子升级（R7-F02）

把判断收回 classifyDatabase/统一预检；删除为了单个 serve 反例新增而 init/bootstrap 不执行的例外分支。在任何持久改写前获得同一结论。

| 输入 | bootstrap/init | serve |
|---|---|---|
| 真正空库或完整确认的空初始化基线 | 原子初始化 | 拒绝，提示先 init |
| 明确受支持、历史上没有 metadata 的完整旧结构 | 原子升级，保留身份/凭据 | 同样允许升级，无新管理员 token |
| 健康当前实例，包括凭据全撤销/过期/actor 禁用 | 不重初始化，不换 secret | 保持相同身份与材料 |
| 当前库缺 metadata 表、缺 initialized/secret 行、材料非法 | 拒绝且不变 | 同样拒绝且不变 |
| 缺必需表/列/约束/索引、版本组合矛盾 | 改写前拒绝 | 同样拒绝且不监听 |
| 未来版本、未知非空结构 | 改写前拒绝 | 同样拒绝且不监听 |

识别依据来自支持版本的实际 schema，不只是 15 个表名和 human actor。不要把缺列/约束的损坏库当成空库或合法旧库并补建修复。使用 PRAGMA/schema 结构信息核实必要列、主键/唯一约束、外键、必要索引；忽略确实允许的运行期差异要有明确规则，不用 SQL 文本空白差异判断损坏。

覆盖 J02/J03 所有入口与材料变体，增加必要结构条件的定向断言，配 K01/G08 合法旧库正例。真实 CLI init/serve 对坏库输出结构化非成功、非零退出；验证本次 DB/app/锁释放，不能清掉别人的锁。secret 比较只输出布尔结果，不记录实际凭据。

保持单一事务覆盖 DDL、历史实体、结果引用、metadata 和版本标记。保留 U01/G03/G04/H10 的真实 SQL 故障与重开后回滚证据。

完成上轮尚未落实的 DDL 来源要求：schema.sql 与 TS 包装采用明确可执行的生成或读取方案，增量迁移有固定来源；比较新建库与升级库的必要表/列/约束/外键/索引。不要继续三处手写同步；无需开发通用迁移框架。fixture 旧 DDL 应作为不可变历史输入单独保留。

## 4. 补齐原 B 矩阵并准确报告

对照 R7 coverage-audit 与原 B01–B12，填写 `要求/子条件 → 触发步骤 → 实际断言 → 文件/行号或探针 ID → 结果 → 真正未覆盖范围`。可以引用有效现有探针，不复制同一测试凑数量。

必须补齐/明确引用：

1. 11 操作族的真实编码与重建，不能把写成功等同于重放通过；检查相关固定字段及权限/脱敏投影。
2. Thread/Post/Relation 在后续变化和关闭重开后的同键结果；至少一个明确“事务已提交、响应未交付”的故障点，再用同键重试证明没有新增业务/事件/结果记录。普通连续两次成功请求不足以替代这个场景。
3. 旧库升级成功、坏数据拒绝、真实 SQL 写失败分开记录。故障确实命中、失败重开后的状态比较、重复成功升级不新增数据，均对应真实断言。
4. 初始化失败后的重开重试，合法历史库与当前库材料损坏的成对正反例。不能把同连接重试注释为 reopened。
5. B03 的 relation.reopen 不等于数据库重开；B06 的 beforeSnapshot 只有取值没有比较不算回滚证据。Promise.all 独立请求的有效并发证据保留，不写成未运行的屏障测试。
6. B12 25 修订脱敏及 U07/U08 的已有回滚证据指向正确脚本。U05/U06 留待 R4-C，仍如实报告 exit 1。

同步 docs/03、04、07、12 中实际引用格式、固定字段/动态投影、支持旧版本与不可重放规则、损坏库恢复边界。README、progress 和审查入口准确说明“实现完成待审”或仍未完成，不能自行写独立验收已通过。历史实现报告不改写成新的观察结果。

## 5. 最终验证与交付

开发时只跑相关快测；完成后运行以下全套一次，有新修改或失败再补跑受影响项。脚本使用 dist，先 build。

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
```

R3 T06 必须先按第 0 节修正；不要把错误 setup 的旧绿色行为当成门禁。若正式 schema/ref 升级使其他逻辑 fixture 不再合法，记录具体冲突，保留原 observed，提供同语义的新正反例及来源；不降低“历史准确、未知格式拒绝、材料丢失拒绝、冲突回滚”的条件。

结果保存到 `docs/reviews/2026-09-29-m0-m1-r7/implementation-r4-b3/`，至少包括：

- 本轮实现后的 HEAD、dirty 状态、产品/测试源码指纹和运行环境。
- 每个实际命令、退出码及原始输出；不要把审查前 baseline 当作实现后的指纹。
- 四类缺陷状态、T06 夹具修正说明、操作/旧格式支持矩阵与恢复边界。
- B01–B12 逐子条件证据，J/K/H/G/U 实测结果，未运行检查与已知限制。
- 可复跑的升级成功、拒绝和恢复说明；使用合成记录定位，不公开正文/secret。

**交回条件：** R7-F01–F04 关闭；J01–J07/K01 通过或经有来源的等价 fixture 修正后通过；G/H 无回归；原 B 必须条件有真实断言；修正后的旧测试通过。R4 仅 U05/U06 失败时仍记 exit 1。不能单靠测试总数或某一批探针全绿宣布包验收。

全部完成后交回审查，停止在本包范围。下一阶段为原 R4-C 契约与取消链补齐；两包验收后再评估 M2.1。论坛继续保持宿主中立，四类真实 harness 未在本包实测；以后改 dsh/Pi 接入时再按官方文档与安装版本核验，不把本次后端检查描述成宿主兼容性证明。
