# 下一轮提示词：M0/M1-R4-B.4-2R2

下面正文可直接交给实现 Agent。本轮完成现有验证流程的收尾，交回后再评估 B.4-3。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务是 **M0/M1-R4-B.4-2R2：先验证原输入，准确恢复历史时间**。

关闭 R11-F01/F02（Q01–Q04），保持 Q05 和全部有效旧修复，补齐 R11-E01。不要从零重做 B.4-2，不开始 B.4-3、R4-C、M2 或 harness 联调。本轮不再只按探针里的几个值追加分支：请把上轮明确要求但尚未落实的共享输入验证与 11 操作族类型关联真正完成。

R11 独立证据：112 项正式测试、R1–R3 46 项、G/H/J/K/N/P 全部通过；R8 仅 L03 失败，R4 仅 U05/U06 失败。新 Q01–Q04 失败、Q05 正例通过。两个问题是原范围内的遗漏：损坏数据在完整校验前被改写或丢弃；历史 patch 借用了主题创建时间。认可已通过的嵌套关系校验、最终历史投影复用、新写语义校验与墙上时钟移除，保留这些实现。

## 0. 工作边界与必读材料

遵守用户最新 AGENTS 指令：**禁止使用、重新安装、启用 deepseek-brainstorm，禁止通过脚本或其他入口继续该流程。** 默认不启动其他 Agent，不调用模型、不修改全局 harness 配置、不发布/推送/部署。所有验证使用自建临时库、合成身份；不要读取或改写真实论坛数据。

先检查 Git 状态并保存起始指纹。当前 HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，有多轮未提交工作；不得 reset/clean/checkout 覆盖。审查基线是 R11 baseline，若源码已变化先记录差异，不把同一 HEAD 误作同一实现。保留 `archive/pre-plan.original.md` 原字节、所有旧 baseline/observed/审查脚本和实现交付日志。

先读 AGENTS.md、README.md、docs/00、08、11，再读 docs/03、04、07、12，以及：

1. `docs/reviews/2026-09-30-m0-m1-r11/README.md`、`coverage-audit.md`、`verification.md`、`baseline.json`。
2. R11 `check-validation-pipeline.mjs`、`observed-validation-pipeline.json`、`delivery-evidence-audit.json`。
3. R10 `next-agent-prompt.md` 第 1、2、5、6 节及 P01–P06 探针；R9 `next-agent-prompt.md` 第 1 节的真实 operation 表。
4. R8 `remaining-work.md`，只用于保留 B.4-3 边界。

开始时说明任务编号、预期行为、涉及文件及验收办法。先将本轮反例转成正式回归并确认失败，再修根因。建议按“共享输入解析/验证与原子性”“历史时间与证据整理”两个可审阅改动单元交付，无需另写大规划或新建空包。

## 1. 先验证原输入，再决定规范化或不可重放（R11-F01）

### 1.1 统一规则的实际调用位置

当前问题位置：

- `bootstrap.ts` 的 typed 手写预检与三个提前 marker 返回；完整 validator 仍在其后。
- `idempotency-service.ts` 的 `normalizeLegacyResultRef` 与 storage 中迁移解码重复，非法值被变成 1/open。
- `extractResultRef` 用真值/Array.isArray 判断“是否提供可选字段”，把显式坏值丢掉。

把共同输入规则放在 core，可使用现有 StoragePort 的必要只读能力；storage 只负责迁移协调、真实历史表写入及事务。core 不导入 SQLite。不要再复制第三套近似规则，也不要引入通用迁移框架。

形成明确的阶段顺序：

1. 解析记录的实际 operation、family、目标及作用域，未知操作立即拒绝。
2. 识别受支持输入格式：当前 typed ref、明确支持的旧 compact/ID-only 形状、旧完整业务结果、新业务返回值。JSON 边界用 unknown 收窄。
3. 按该格式检查原始字段；区分“缺省且该旧格式允许”与“明确提供但非法”。检查已知实体、作用域和操作目标；已知矛盾不能当缺历史。
4. 只有输入合法、关系正确但缺少不可恢复历史时，生成受控 marker；其他输入规范化为引用和必要历史材料。
5. 对规范化产物执行共用格式/语义验证；新 action 在写幂等记录前完成验证，失败回滚业务/事件/结果；迁移在同一事务内核对/导入历史并存结果；在线重放只读投影，不能偷偷修库。

可用小型判别联合表示“可重放引用 / 合法但缺历史”，具体 API 自行选择。**marker 只能由通过原输入及已知实体验证的分支产生**；验证 marker 本身不能代替验证被它覆盖的原记录。

### 1.2 11 操作族的类型关联

按现有服务调用建立可穷尽的关联，保留原 operation/唯一键：

| 族 / 实际 operation | 新业务结果 | 引用 kind |
|---|---|---|
| `space.create`，instance 作用域 | `{space, revision}` | space |
| `space.patch`，记录 space_id 为目标 | `{space, revision}` | space |
| `thread.create` | `{thread, initial_post?}` | thread.create |
| `thread.patch:<thread_id>` | Thread | thread.patch |
| `post.create:<thread_id>` | `{post, revision, relations}` | post |
| `post.revision:<post_id>` | `{post, revision, relations}` | post |
| `post.withdraw:<post_id>` | Post | post.withdraw |
| `relation.create` | 裸 Relation，可能复用已有版本 | relation.create |
| `relation.resolve:<relation_id>` | `{relation, resolution}` | relation.resolve |
| `relation.reopen:<relation_id>` | `{relation, resolution}` | relation.reopen |
| `admin.redaction` | `{redaction_id}` | admin.redaction |

family 使用有限联合，关联 operation、业务结果与 ref；用穷尽 switch 或等价映射，不让公共入口的 `any` 抹掉关联。不要仅把 any 改名后强制断言，也不要求重写全部业务服务。支持的历史 `space.patch:<id>` 等变体单独归为兼容输入，不改服务实际写法。完整 B01 round-trip 证据汇总仍归 B.4-3；本轮验证受影响通路即可。

### 1.3 typed / compact / ID-only 的明确处理

Q01 四例必须首次迁移拒绝，关闭重开后全库逻辑快照完全一致：

- Post 缺必需 revision，不能因 relation_ids 非空而降级。
- post.create 的 Post 属于另一 Thread，不能因缺关系快照而掩盖错绑。
- compact relation 引用实体不存在，不能直接变 marker。
- Thread 没有 initial_post 却携带关系集合，不能提前变 marker。

同时检查原 R10 已要求的必需 ID/安全整数、字段白名单、initial_post 成对、两关系数组内容/重复/顺序，以及目标/空间/实体绑定。使用一个输入矩阵覆盖这些规则经过正常路径及缺历史路径，避免每修一个早退再漏下一个。

合法历史 compact relation 缺版本/状态、合法 Post/initial_post ID-only 缺历史、合法 Thread 缺旧快照仍按明确兼容策略处理。先检查能够确定的实体和修订；不要要求旧数据拥有历史上不存在的字段，也不能因为缺未知历史而跳过已知结构。保留 N02/N04 标记重启和 family-only → 完整 op 兼容。

### 1.4 legacy 显式坏值不能自动纠正

Q02 的旧完整 Post 响应包含非法 nested state 或字符串 revision，在线重放必须 422，迁移必须拒绝且回滚。不能先把非法 state 变 open、非法 revision/version 变 1/2，再说格式合法。

检查 legacy 的同类字段：提供的非法枚举/版本/数组/配对字段应拒绝；真正缺省的字段只能使用该旧格式有依据的兼容规则。完整旧响应可以包含当年的 body/summary/tags，解析后只输出最小引用并应用当前脱敏；不要将 typed ref 禁正文的规则机械套到旧完整响应，拒绝所有合法旧结果。

同一组受支持旧输入分别走直接在线重放和迁移后重放。已知实体矛盾/显式非法字段的结论一致；合法完整结果在两个入口的固定 data 一致。在线不写历史表，所需历史确实缺失时可安全返回 422；迁移可以导入可信材料，不能因此复制另一套输入规则。

### 1.5 新返回值：显式错误不等于未提供

Q04 两个编码输入必须失败：`relations: 'not-an-array'`、`initial_post: {post: {}, revision: 1}`。检查字段是否存在后再验证其形状，不可用 `if (x?.id)` 或 `if (Array.isArray(x))` 直接忽略其余情况。

新结果缺少必需字段、错误枚举/版本或非法已提供嵌套字段，应在编码阶段返回清晰错误。合法未提供 initial_post、当前 ThreadService 的 initial_post 形状、合法空关系数组、真实裸 Relation/已有 resolved v2 必须继续支持。不要为了严格而改变现有成功响应形状。

把 Q04/Q05 的真实 action 出口故障注入放进正式测试：action 先产生业务和事件，再返回非法结果；验证拒绝、实际命中预期校验、三类写入均回滚、重开后全库相等。配对合法 action 必须成功且同键重试不得再次运行 action。纯 extractResultRef 的 toThrow 无法替代事务证明。

## 2. 区分主题创建时间与版本发生时间（R11-F02）

现在 `parsed.updated_at ?? parsed.created_at` 把 Thread.created_at 视作任意版本时间。Q03 的主题创建于 06:00，v2 修改于 06:01；删除旧 v2 结果 updated_at 后，迁移错误写入 06:00 并返回 HTTP 200。

抽取现有两条 Thread 历史导入/冲突判断共用的规则，明确时间证据来源：

- 已有同版本 thread_versions 快照可核对/复用，已提供固定字段不能与其冲突。
- 旧完整结果中合法、属于目标版本的 updated_at 可以使用。
- 当前实体的 updated_at 只在该实体确为目标版本、其固定字段一致时使用。
- Thread.created_at 只有能证明是创建版本时才可作该版本时间，不能用于任意后续 patch。历史表 ThreadVersion.created_at 则是版本发生时间，二者语义不同。
- 无充分证据时，本包允许原子拒绝或合法不可重放；不需要实现通用事件历史推断，不借用迁移时钟、其他版本时间或主题出生时间。

覆盖无外壳/有外壳的受支持旧形状、只缺 updated_at、两个时间都缺失、已有正确快照、已有冲突快照、目标为当前版本和旧版本的相关分支。用配对数据表避免重复代码。Q03 是合成变体，允许明确拒绝；不要求新增支持某个不存在的历史版本。

保留 P04 的原子拒绝与 P06/J05/L05 的完整历史成功/冲突保护。若选择 marker，沿用已注册且语义匹配的历史不足原因，并验证重复启动稳定；不要为了通过探针跳过整个库的错误记录。

## 3. 补齐实际断言与交付勘误（R11-E01）

1. 正式 L02-3c 仍只比较幂等表。复用全库逻辑快照 helper，覆盖 sqlite_master、所有表行、版本行、凭据、metadata；拒绝后关闭重开再比。敏感原值只在内存断言，不输出日志。
2. unknown_reason、extra_body 要从一个合法 operation/目标/scope 的 marker 开始，只改 reason 或追加 body。先有合法正例，再隔离反例；不要以另一个 op 错配的提前失败冒充测试命中。
3. 保留已补齐的 L05/L06/L07，不重写过去 observed。新增 Q 正式回归应涵盖原输入、两入口与真实事务；P06 可精确引用既有独立正例，不必为数量机械复制。
4. 新交付写清勘误：P03=旧在线投影/目标，P04=缺时间，P05=编码器；前序证据补项为 R9-E01/E02。U05 是非法 relation type 枚举，U06 是截断 JSON 不能成功返回 undefined。lint 是 tsc --noEmit。
5. 上轮 commands 未包含 R1–R3，R11 由审查者独立复跑通过；如引用须写明来源。不存在的旧日志链接在新勘误中给正确路径，不补造历史输出。历史交付 README 原样保留。

## 4. 验收与命令

开发期先跑相关测试；实现结束后在同一源码版本上完成下面整组，逐条记录真实命令、退出码及原始输出。不要因为外部审查曾通过就自报本轮已运行。

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
```

出口固定如下：

| 条件 | 完成标准 |
|---|---|
| 本轮反例 | Q01–Q05 **5/5**；Q01/Q02 损坏原输入不能被改写，Q04 非法 action 无三类写入，Q03 不返回错误时间 |
| 前序保护 | P01–P06、N01–N05、G/H/J/K、R1–R3 及正式回归无新增失败 |
| 允许遗留 | R8 仍仅 L03 失败并 exit 1；R4 仍仅 U05/U06 失败并 exit 1 |
| 结构落实 | operation/family/业务结果/ref 有真实穷尽关联；迁移与在线共用输入规则；早退无法跳过原输入/已知实体检查 |
| 正式回归/档案 | 本轮反例、合法配对、L02-3c 有真实断言；命令可追溯且日志链接存在 |

不更改旧探针断言、不跳过已有夹具、不全部拒绝旧格式、不重执行业务 action。不要将 R8/R4 的限定遗留失败写成 exit 0 或“全部验收通过”。任何环境限制写清，未执行不能填成功。

## 5. 交付及停止点

归档到 `docs/reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/`，从真实运行开始记录：

- README：R11-F01/F02/E01 对应实现、正式测试定位、共享调用链说明、旧格式支持矩阵、限制及勘误。
- baseline-before/after：HEAD、dirty 状态、产品/测试指纹与运行环境；若沿用前序基线，明确来源并实际核对一致性。
- commands.json 和原始 stdout/stderr，保留失败及后续修正的运行，不伪造、删改历史。
- 同步 README、docs/progress、审查入口，表述为“实现者自测完成、待独立复核”；涉及契约/兼容处理的实际变化同步 docs/03、04、12。

完成本包后停止并交回审查。**本轮出口通过后，下一候选才是 B.4-3**（L03、结构预检、单一 DDL、原 B 证据），之后 R4-C，再评估 M2.1。不得把本包完成写成整个 R4-B 或论坛产品完成。
