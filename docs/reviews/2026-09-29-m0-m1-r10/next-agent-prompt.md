# 下一轮提示词：M0/M1-R4-B.4-2R

以下正文可以直接交给 coding agent。本轮只补齐已经布置的 B.4-2 边界，不开始 B.4-3。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务是 **M0/M1-R4-B.4-2R：统一验证入口并完成历史结果保真**。关闭 R10-F01–F04（P01–P05），保留 P06 正例及全部既有有效修复，完成尚缺的回归断言与交付归档。

R10 独立复跑已确认：107 项正式测试、R1–R3 46 项、G/H/J/K、N01–N05 通过；L04–L07 也已通过。问题不是这些修复无效，而是原任务要求的其他同类输入和入口尚未受保护。当前新 P01–P05 失败、P06 通过。**不要重做已通过部分，也不要只对探针字面值打补丁。**

HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，工作区有多轮未提交实现，实际审查内容以 R10 baseline 指纹为准。先检查 Git 状态并保存本轮起始指纹；保留现有工作、历史夹具与全部旧 observed。不要 reset/clean/checkout 覆盖文件。默认不启动其他 Agent、不调用模型、不推送/部署/发布、不改全局 harness 配置；使用自建临时库和合成身份。

先读 AGENTS.md、README.md、docs/00、08、11，再读 docs/03、04、07、12，以及：

1. `docs/reviews/2026-09-29-m0-m1-r10/README.md`、`coverage-audit.md`、`verification.md`、`baseline.json`。
2. 同目录 `check-b4-2-boundaries.mjs` 与 `observed-b4-2-boundaries.json`。
3. `docs/reviews/2026-09-29-m0-m1-r9/next-agent-prompt.md` 的 11 操作表和第 1–4 节，及 N01–N05 探针。
4. R8 `remaining-work.md` 的 B.4-3 定义，仅用于保留后续边界。

开始时报告任务编号、行为变化、涉及文件和验收方式。把 P 反例先变成正式回归，确认当前实现失败原因，再修根因。建议分成“共同入口与输入校验”“嵌套实体与历史投影”两个可审阅改动单元，最终一次交回。

## 1. 建立一个真正被所有入口调用的验证流程

现在 typed replay/migration 部分调用新 helper，但 legacy online 仍单独重建，migration 多次提前返回，编码器还会把错误值默认化。继续在每个分支零散加判断容易重复遗漏。

在 core 内合并已有重复代码，让新编码、支持的旧 codec、迁移和重放使用相同的操作解释、规范化引用与验证规则。迁移补写历史表仍留在 storage；core 不依赖 SQLite，不新增通用迁移框架或空接口包。

必须保证的顺序：

1. 解析实际 operation，明确族、目标、记录作用域及其预期结果类型。
2. 识别输入是当前 typed ref、受支持旧格式还是新业务结果。对该输入格式作严格校验，不能先删除/替换非法值。
3. 根据真实已提供字段、可靠历史证据及支持规则，规范化为引用或“确实缺历史”的结果。
4. 对引用做共同格式与实体关系验证；需要持久化 unreplayable 时，既验证原输入的合法已知部分，也验证生成标记的完整 op/reason/字段白名单。
5. 在线重放使用统一历史投影；迁移在同一事务里写入规范化结果；新业务写在 action 后、幂等记录提交前也调用适用的共同验证。

实现 11 操作族到业务结果/ref 的穷尽类型关联，保留现有服务实际 operation 和幂等唯一键语义。不要把 `space.patch` 擅自改成另一种键，也不要误把 relation.create 的裸 Relation 当成 `{relation}`。外部 JSON 用 unknown，逐步收窄；避免在新的公共验证接口继续用 `IdempotencyResultRef | any` 或未约束的 family string 抹掉关联。

不要求重写业务服务的全部实现；复用现有函数和必要的小型读取接口。类型关联是防止不同入口再次分叉的手段，功能出口仍由下面的实测条件判断。

## 2. 原输入必须先合法，再讨论历史不足（R10-F02 / P02、P05）

### 2.1 迁移降级

现有三个提前降级入口位于 bootstrap 的 compact relation、ID-only nested ref、missing thread history 分支。不能仅验证新生成的 marker。

- 已知 operation 与原 kind 必须匹配；scope/目标必须匹配；版本值必须为合法安全正整数；数组、重复项、可选字段成对及额外字段都应按输入格式验证。
- typed ref 包含 body、重复 relation_ids、版本 0、错误目标，均属于损坏，首次迁移必须拒绝并回滚，不能转成 unreplayable。
- 对合法的旧 compact relation 缺版本/状态、合法旧 ID-only 嵌套关系、合法但确实缺失历史的 Thread，可以继续按已定义兼容规则降级。应为这些旧形状定义明确输入校验，只允许其历史上确实缺少的字段；不要直接套新必填字段而拒绝全部旧输入。
- 转成 marker 前，校验仍可确定的实体、空间和操作目标关系；缺证据不是未知操作/错 kind/损坏字段的统一兜底。
- 保留 family-only marker → 所属记录完整 operation 的兼容规范化，保留 N02/N04 合法重启及 L04 的受控历史不足路径。

### 2.2 新业务结果编码

- relation.version 是字符串、state 是未知值、嵌套关系状态非法时立即拒绝；不要先变成 1/open 再交给 validator。
- 新结果缺少必需版本/状态也按错误处理。旧格式的兼容默认必须来自明确规则，不能复用于新业务结果。
- 编码生成的引用继续执行格式验证，并在实际事务调用链检查作用域和实体语义。若 action 后的结果非法，相关业务、事件和幂等记录整体回滚。
- 保留所有合法服务返回形状，包括有/无 initial_post、空关系列表、relation.create 返回已有关系时的真实版本，以及 space.create 的 instance 作用域。

## 3. 验证嵌套关系属于本次历史结果（R10-F01 / P01）

`validateSemanticsForNestedRelations` 必须获得所属 post ID 和返回 revision，不能只接收 spaceId。

- nested relation 的 source_post_id/source_revision 必须等于本次结果的 post/revision；Thread.initial_post 同样适用。
- source/target 的帖子及指定修订存在，且满足同空间规则；不能因关系本身的 space_id 正确就跳过端点检查。
- 引用版本 999 而实体仅到 v2 属不可能历史，应拒绝。对合法旧版本，依据不可变记录、初始状态规则或现有决议历史核验版本/状态；不能简单要求等于当前版本。
- 对新格式有可靠历史的正例继续完整重放；J07/P06 的 v1/open 在关系当前 v2/resolved 时仍应成功。
- 本质错绑的 typed ref 在迁移与在线重放均拒绝。合法旧格式证据不足允许原约定的受控不可重放，但不能用该退路掩盖已知矛盾。

本节同时覆盖普通 Post、Post 修订与 initial_post 路径，复用同一 helper，不分别维护近似规则。

## 4. 旧格式在线重放与迁移必须一致（R10-F03 / P03）

- 把支持的 legacy online 输入先转入共同的规范化/验证/历史投影路径。不要只在当前旧 Post 分支补一个 thread_id 判断，然后继续保留独立规则。
- `post.create:<thread A>` 的旧 ref 指向 thread B，即使在同空间，也必须在在线重放拒绝；与迁移拒绝保持一致。相应合法旧 Post 正例仍成功。
- Thread create/patch 的重放不仅固定 title/version/state，还必须固定原操作的 updated_at；全量业务 data 应与可信原结果相符，并继续应用当前权限/脱敏。
- 不使用旧完整响应里的未验证对象替代数据库实体或恢复已脱敏正文。支持旧完整结果不等于信任其中任意字段。
- 同一个旧输入矩阵分别经“直接在线重放”与“迁移后重放”执行，比较接受/拒绝语义和固定结果。正常 serve 通常先迁移，不是保留两套不一致规则的理由。

## 5. 缺历史时间时明确处理，禁止补造（R10-F04 / P04）

移除两处历史快照的墙上时钟 fallback；不要替换成随便一个当前实体时间。

- 已有同版本快照可以核对/复用；旧完整结果中合法且可信的版本时间可以导入。
- 当目标版本就是当前版本时，使用该版本真正的操作时间，并验证其他固定字段一致；不要把主题创建时间当作任意 patch 的发生时间。
- 对较旧版本缺时间，只有能绑定具体版本的可靠证据才可恢复。不必实现通用历史推理：本包允许按明确支持规则首次原子拒绝，或合法不可重放。
- P04 的合成缺时间旧式输入可以受控拒绝，不要求将其认定为某个已发布格式；不能再次接受后把执行审查时的时间返回为原结果。
- 给定时间的历史冲突检查继续保留；固定字段全部一致才复用。失败后关闭重开，全库逻辑快照一致。

## 6. 正式回归与验收

至少保留下列证据，不只比较状态码/ID：

| 组 | 拒绝 / 故障场景 | 必须配对的成功或状态断言 |
|---|---|---|
| P01 | 同空间错误 source post、source revision、缺失/错空间 target revision、不可能 nested version | 合法旧版本继续成功；迁移与在线两处拒绝；失败无新增业务/事件/结果 |
| P02 | 五种现有降级绕过；补充对应入口的相同格式规则 | 合法 compact relation、ID-only 历史不足、合法 Thread marker 可按支持策略处理；拒绝后关闭重开比较 schema 与所有表行 |
| P03 | 旧 Post 目标错绑；旧 Thread 时间被当前版本替代 | 同输入两入口判定一致；完整合法旧结果准确重放 |
| P04 | 历史 v2 缺时间而实体已到 v3 | 受控拒绝/不可重放或可信精确恢复；完整已知时间的旧结果仍成功 |
| P05 | 非法状态、非数值版本、非法嵌套状态的新结果 | 合法新编码成功；action 后结果验证失败时，业务/事件/幂等同事务回滚 |
| P06 / 既有保护 | 后续修改、迁移、关闭重开后的现代与完整旧结果 | 完整固定 data 相等，无重放写入；N01–N05 和旧 G/H/J/K 无回归 |

R9-E01 剩余补项合并完成：

- L02-3c、L05、L07 的 before/after 不要只比较幂等表，补 schema/业务/历史表/凭据/metadata 的实际逻辑快照。复用小型测试 helper；日志不输出秘密内容。
- 坏 reason/body 用例要以合法 operation/目标为基准，只改待测字段，避免因另一个 op 错配提前失败而根本没测到它。
- L06 若标题写了在线重放，就实际调用在线接口断言；也可调整标题并在证据表精确引用已有外部 L06 的有效验证。
- 标记多次启动/重放的无额外写入可补正式断言或准确引用 N02–N04，不要求机械复制。已经有效的 L01-3 故障与 N01 保持。

开发期运行相关快测；实现结束后在同一源码版本上完成一次：

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
```

本包出口：**P01–P06 全部通过**，新增正式回归通过；N、L01/L02/L04–L08、G/H/J/K、R1–R3 无回归。R8 仍允许仅 L03 失败并真实返回 exit 1；R4 仍允许仅 U05/U06 失败。不要修改旧探针断言、跳过检查或通过拒绝全部旧输入满足验收。必要兼容变更须说明来源、保留旧 observed 并提供等价正反例。

## 7. 交付记录与停止点

本轮从第一条验证命令开始保存输出到 `docs/reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/`。不要到结束时只写一篇总结替代证据。

最少交付：

1. `README.md`：逐项对应 R10-F01–F04、R9-E01/E02 的实际变化、测试位置、限制；明确 B.4-2R 自测完成仍需独立复核。
2. `baseline-before.json`、`baseline-after.json`：HEAD、dirty 状态、产品/测试指纹、环境。历史审查 baseline 不冒作实现后版本。
3. `commands.json`：每条真实命令、退出码、原始输出文件路径；每条命令的 stdout/stderr 保存原文。未运行检查明确标未运行。
4. 更新 docs/03、04、12 的旧 codec 支持条件、固定字段及 marker 规则；同步根 README、docs/progress、审查入口。保留历史交付报告及原方案字节。

本轮完成后停止并交回审查，不自动进入 B.4-3。下一候选 B.4-3 仍包括 L03、支持版本结构预检、DDL 单一来源和原 B01–B12 剩余证据；**不得再次写“修完 L03 即自动完成全部 B 标准”。** R4-C、M2.1、真实 harness 联调和 Web 均保持后续范围。
