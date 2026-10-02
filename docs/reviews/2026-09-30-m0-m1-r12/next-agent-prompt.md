# 下一轮提示词：M0/M1-R4-B.4-2R3

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务为 **M0/M1-R4-B.4-2R3：完成降级前校验与显式时间冲突检查**。

关闭 R12-F01/F02，随包修正 R12-E01 的交付说明。B.4-2R2 的有效修复保留：共同 legacy normalizer、有限 OperationFamily、Q01–Q05、真实 action 回滚测试、L02-3c 全库重开快照均已有进展，无需重做。下一步先完成这个包，交回独立复核后再决定 B.4-3。

当前独立结果：117/117 正式测试（11 个文件，B 回归 53 项），R1–R3 46 项，G/H/J/K/N/P/Q 全通；R8 仅 L03、R4 仅 U05/U06 失败。R12 新 V01–V04 失败、V05 正例通过。剩余是已经约定的输入校验和历史固定字段一致性要求，不是新功能。

## 0. 范围、输入及工作顺序

遵守用户禁令：**禁止使用、重新安装、启用 deepseek-brainstorm，也禁止通过其脚本或其他入口继续该流程。** 默认不启动其他 Agent；不调用模型、不修改全局 harness 配置、不发布/推送/部署。测试使用自建临时库与合成身份，不改真实论坛数据。

先读 AGENTS.md、README.md、docs/00、08、11，再读 docs/03、04、07、12，以及：

1. 本目录 `README.md`、`coverage-audit.md`、`verification.md`、`baseline.json`。
2. 本目录 `check-precheck-completeness.mjs` 与 `observed-precheck-completeness.json`；它们给出本轮可复跑反例及合法对照。
3. R11 `next-agent-prompt.md` 第 1、2 节及 Q 探针，理解未完成规则；原 Q 样例现在已通过，不能回退。
4. R8 `remaining-work.md`，只用于保留后续 B.4-3 的边界。

当前 HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，工作区含多轮未提交变更。先保存自己的起始 Git 状态和文件指纹，与 R12 baseline 比较产品/测试文件；不要把 HEAD 相同当作输入相同，不得 reset/clean/checkout 覆盖旧工作。保留 `archive/pre-plan.original.md` 原字节及所有旧审查脚本、baseline、observed 和实现日志。

开始时说明任务编号、预期行为、涉及文件和验收方法。先将 V01–V04 的失败纳入正式回归，再修共同规则，最后运行本任务的完整验证。建议按“输入规则与事务回滚”“历史时间冲突与交付证据”两个可审阅单元组织，不新增空包或通用迁移框架。

本包不处理 B.4-3 的结构预检/DDL/原 B 全矩阵，也不开始 R4-C、M2、宿主联调或 UI。

## 1. 所有 marker 必须在已知事实验证之后产生（R12-F01，V01/V02）

当前 `validateStoredResultRefPrecheck` 对 Post 只验证修订号格式与 Post 归属，遗漏该修订是否存在，以及 ID-only 关系是否存在、是否属于该源 Post/修订。`normalizeLegacyResultRef` 内部也仍有先返回 marker、后做语义判断的路径；`relation_ids` 不是数组时甚至会被丢弃并补成空数组。

请以共同输入规则解决，而不是只追加 revision=999 或某个字符串的特判。core 保有验证逻辑，storage 仅协调迁移、历史写入和事务；core 不依赖 SQLite。审查所有“生成 unreplayable”的分支，保证顺序为：

1. 解析实际 operation、目标与作用域，识别明确支持的输入格式。
2. 检查原始字段类型、必需字段、成对字段、数组元素/重复/顺序及适用的字段白名单。明确提供的非法值不能被规范化丢弃。
3. 检查当前存储中仍能确定的事实：实体/修订存在，空间/目标一致，关系来源和固定端点/修订正确。
4. 输入合法且已知事实一致后，才判断是否缺少无法恢复的历史 version/state；合法历史不足可以按原契约生成 marker。
5. 完整结果继续走共同的格式、语义验证与历史投影。在线重放只读；迁移失败在同一事务内回滚所有改动。

可以用小型判别联合表达“已验证且可重放 / 已验证但历史不足”，或使用等价结构，避免各处分支直接把未经验证的原输入换成 marker。不要仅对 marker 自身校验后就认为原记录合法。

必须覆盖的原输入矩阵如下，Post 与 thread.create 的 initial_post 共用适用规则：

| 维度 | 已知非法输入的结果 | 合法对照 |
|---|---|---|
| Post 修订 | 必需修订缺失、类型非法、引用不存在的修订均拒绝 | 已存在的正确修订可继续 |
| relation_ids | 显式非数组、null（当该格式不允许）、非字符串元素、重复或与完整关系数组不一致均拒绝 | 空数组；合法且不重复的 ID-only |
| 关系实体和端点 | 不存在、跨空间、错误源 Post/源修订或其他可确定端点矛盾均拒绝 | 来源/端点正确但旧 version/state 确实缺失，可按原策略降级 |
| operation 绑定 | Post 属于另一 Thread、目标或 scope 错绑不能变 marker | 原有合法 scoped op 与已支持历史变体 |
| 两种历史入口 | typed 与 legacy 均不得绕过上述已知规则 | 完整旧业务结果保留当前兼容与脱敏行为 |

至少让 V01 三个变体、V02 三个变体都通过：迁移明确拒绝、关闭重开后全库逻辑快照不变；可直接重放的损坏记录返回 422，不能成功返回空关系。在线已经 422 的情况仍必须验证迁移拒绝，不能以一次重放失败代替迁移检查。

不要把 typed 引用禁止正文的规则机械套给受支持的旧完整业务响应。旧 body/summary/tags 仍可用于识别历史输入，最后只保存最小引用并应用当前脱敏。不得把正常历史不足全部改为拒绝来绕过 V05/N 正例。

## 2. 新业务结果显式坏值必须回滚（R12-F01，V03）

`extractResultRef` 目前用 `!== undefined && !== null` 过滤可选字段，使 `relations: null` 被当作未提供。V03 使用真实 SqliteStorage 的 `executeIdempotent`：action 先写业务和事件，再返回 null 关系，结果三类写入全部提交，首次 data 与重试不同。

依据现有业务结果契约区分：合法缺省、合法空数组、明确提供但非法。数组字段的 null 不是数组；嵌套对象同样不能在显式损坏时静默丢弃。检查所有适用的 Post/initial_post 结果编码入口；不改变当前服务的合法返回形状。允许的 optional undefined、无 initial_post 的 Thread、合法 `relations: []`、当前 initial_post 形状、真实裸 Relation 及复用 resolved v2 均要保留。

正式回归必须有真实 action 事务断言，而非只调用 encoder 的 toThrow：

- action 先写业务、事件，再返回非法结果；拒绝确实由结果校验触发。
- 业务、事件、幂等结果均无新增；关闭重开后 schema 与全部表行等于故障调用前。
- 配对合法结果正常提交；同键重试 data 精确一致且不重复运行 action、不追加业务或事件。

有限 OperationFamily 和穷尽 switch 已落实，保留。继续完成 R11 已要求的 operation → 业务结果 → ref 关联：JSON/历史边界以 unknown 收窄，新结果使用具体关联类型，避免 any/强制断言抹掉关系。不要求重写全部服务或为类型美观单独扩包。

真实 11 族是 `space.create`、`space.patch`、`thread.create`、`thread.patch`、`post.create`、`post.revision`、`post.withdraw`、`relation.create`、`relation.resolve`、`relation.reopen`、`admin.redaction`；具体 scoped operation 沿用现状和 R11 表格。不要新增交付报告误列的 post.patch 或 membership 操作。

## 3. 核对所有明确提供的历史时间，再选择来源（R12-F02，V04）

本轮已修好的“旧 patch 缺 updated_at 时不借用主题 created_at”继续有效。本次问题是 `syncThreadVersion` 对 v1 使用 `createdAt ?? updatedAt` 后，只比较选中值，忽略另一个明确提供但矛盾的固定字段。

V04 的数据库已有正确 v1 快照，旧完整创建响应保留正确 created_at，却把 updated_at 改为 1999。迁移目前成功，返回的是已有正确快照时间；**缺陷是冲突被接受和抹掉，不是把 1999 写成真实历史。** 此输入必须原子拒绝，不能改成 marker 掩盖明确矛盾。

把“核对已提供字段”与“缺字段时选择可信恢复来源”分开：

- 明确给出的、能归属到目标版本的固定字段必须与已有该版本快照和可证明事实一致。不能因另一个字段优先级更高就不检查它。
- v1 的创建时间与版本时间按其实际语义核对；后续版本的 Thread.created_at 仍仅表示主题出生时间，不能要求它等于 patch 时间，也不能拿来填补 patch 时间。
- 当前实体只在版本和相关固定字段确实匹配时才是可信来源；已有历史快照、完整旧响应按既定规则核对/复用。
- 确实缺乏时间证据的输入沿用已有拒绝/合法不可重放政策；不得借当前时钟、其他版本时间或错误出生时间。

把相同字段核对规则用于当前支持的两条历史导入路径。用成对用例区分“缺失但可恢复”“明确冲突”“正常 v1”“正常 patch”，保留 Q03、P04 原子拒绝与 P06/V05 的完整历史精确重放。无需扩展历史格式或实现通用事件推断。

## 4. 测试出口与范围控制

正式测试优先放入现有 B 回归文件，复用全库快照与合法夹具；避免每个案例都复制大段启动流程。V 之外仅增加上述同一规则的等价入口覆盖，不展开无关功能。

验收条件：

1. V01–V05 全部通过，正式测试覆盖其行为及必要入口矩阵，证明故障回滚和合法兼容。
2. Q01–Q05、P01–P06、N01–N05 与所有原本通过的旧检查继续通过；117 项只是本次起点，不预填下一轮数量。
3. R8 只能保留 L03，R4 只能保留 U05/U06；任一其他失败先修复再交付。两个预期失败命令应保存真实 exit 1，不能用 `|| true` 抹掉。
4. 检查所有 marker 生成点确实经过已知事实验证；在线/迁移不能在同一个 normalizer 内部继续绕行。
5. 已补齐的 L02-3c 和正式 Q04 事务证据不回退，不再将它们列为待修项。

开发阶段先跑相关测试。最终在同一源码版本上执行下面整组并保存真实命令、退出码、原始 stdout/stderr；构建完成后再运行依赖 dist 的探针：

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
```

如果本机沙箱阻止测试临时监听回环端口，按环境权限机制运行获准的本地测试，并注明实际环境；不将环境失败写成产品通过。没有运行的检查明确写未运行。

## 5. 交付记录与勘误（R12-E01）

新交付放入 `docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/`。包含起止 baseline、实际 commands 清单、逐次原始输出、变更/验证 README。保留失败运行，避免只留最终绿色日志；不复制旧 observed 冒充本轮执行。

上一轮 31 条执行记录及输出是真实齐全的，问题在报告摘要。历史交付原样保留，新报告集中勘误：

- 按 commands 清单和实际 JSON 结果生成验证表，检查每个本地日志路径存在；上一轮 README 有 19 个错误路径，正确清单见 R12 delivery-evidence-audit。
- R1 behavior/adapters、R2 remaining/CLI 实际是 15/5/12/3，R3 是 10+1，总计 46；报告不能沿用 20/2/5/2。
- 正确列出 11 操作族、precheck 实际签名与 NestedRelationRef 字段，不为迎合报告改产品契约。
- lint 实际是根脚本调用各包 tsc --noEmit；U06 是截断 HTTP 响应 JSON，不能写成请求流测试。
- 区分产品/测试指纹与整个 tracked diff hash。前者相同不代表后者相同；审查文档更新可能改变整体 diff。
- 区分正式 Q05 覆盖与独立 Q05/P06 正例覆盖，不声称某一测试含有并不存在的断言。

同步根 README、docs/progress.md 的当前状态为“本包实现与自验完成，待独立复核”，链接新证据。审查入口仍保留 R12 结论，并可附待复核交付链接；不得覆写旧审查报告为通过。实际契约/决策若改变，同步 docs/03、04、12；没有改变则不额外扩写。

结束汇报：关闭的缺陷与代码规则、V 矩阵及正式测试证据、旧检查真实结果、限制与未运行项。不得宣称已通过独立评审、B.4-3 已完成或整个 M0/M1 已验收。下一候选包仍是 B.4-3（L03、结构预检、DDL 单一来源与原 B01–B12 证据），本轮不自动开始。
