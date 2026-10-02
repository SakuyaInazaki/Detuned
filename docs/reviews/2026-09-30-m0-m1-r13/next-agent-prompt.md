# 下一轮提示词：M0/M1-R4-B.4-2R4

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务是 **M0/M1-R4-B.4-2R4：统一旧初始帖字段解析，保持初始帖重放形状**。

关闭 R13-F01/F02，补齐 R13-E01。已确认 R12 V01–V05 全通、122 项正式测试通过；v1 显式时间冲突的 R12-F02 已关闭，不重做该修复。剩余工作集中在 `normalizeLegacyResultRef` 的 initial_post/关系字段存在性与 `reconstructFromValidRef` 的初始帖输出。

## 0. 约束和输入

遵守用户禁令：不得使用、重装、启用 deepseek-brainstorm，也不得通过其脚本或其他入口继续该流程。不自动启动其他 Agent，不调用模型、不修改全局 harness 配置、不部署/推送/发布。只用临时 SQLite 和合成身份验证。

先读 AGENTS.md、README.md、docs/00、08、11、03、04，以及本目录 `README.md`、`coverage-audit.md`、`verification.md`、`check-legacy-input-presence.mjs`、`observed-legacy-input-presence-final.json`。R12 next-agent-prompt 第 1、2 节是本轮共同规则的来源；不要把其 initial_post 要求再次漏掉。

当前 HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，多轮未提交工作尚在。保存起始状态/指纹，与 R13 baseline 的 83 个产品/测试文件比较；有变化先记录。不得 reset/clean/checkout 覆盖已有工作。保留所有旧审查材料与 `archive/pre-plan.original.md` 原字节。

开始时说明任务编号、行为变化、涉及文件和验收办法。先将 W 反例加入正式回归并看到失败，再修代码。本轮不开始 B.4-3、R4-C、M2 或宿主联调；不新建框架或扩展历史格式。

## 1. 先验证每个原字段，再提取 ID、选择别名或应用默认值

现状：普通 Post 的字符串 revision 已拒绝，initial_post 的字符串 revision 却先变成 undefined 再默认 1。initial_post 为 null/空对象时 ID 提取失败，整个对象被忽略。嵌套数组及关系 state/version 的 `??` 选择也会把 null 当缺失。

请将 **Post 与 initial_post 适用的 legacy 字段解析共用**，不要只给八个 W 字面值各添一个 if。实现至少包含以下可明确审阅的步骤：

1. **识别格式和字段是否存在。** 当前 typed ref、受支持 compact ref、旧完整业务响应保留各自规则。JSON 边界接收 unknown，先确定对象/字段形状；只有该历史格式允许的缺省才进入缺省路径。
2. **检查原值。** 对明确提供的 `initial_post`、`post`、`revision`、`initial_post_revision`、`relations`、`relation_ids`、关系 `state/relation_state` 和 `version/relation_version`，先验证其原值。原值未通过验证时，不允许因可选链、真值判断、`typeof` 筛选或 `??` 消失。
3. **选择已验证的别名。** 需要支持的扁平/嵌套字段使用明确来源。多个别名都提供时分别检查，冲突应拒绝，不能用一个合法字段覆盖另一个非法字段。不要机械禁止所有别名，也不要把合法旧响应的 body/summary/tags 当成 typed ref 非法正文。
4. **检查成对与集合关系。** initial_post 缺省时不允许孤立的初始修订或关系字段；提供 initial_post 时必须属于受支持完整形状或明确 compact 形状。数组/元素/重复/顺序按已有规则检查。
5. **检查已知实体事实。** 复用本轮已经有效的修订/来源/端点检查。只有通过原输入检查和已知事实检查后，确实缺历史的合法结果才可生成 marker。

可以使用小型解析结果联合，例如“未提供 / 已验证值”，以免用 undefined 同时表示缺省和坏值。具体 API 自行选择，但不要在 Post 和 initial_post 两处继续维护近似复制的验证循环。core 保有规则，storage 复用，不引入 SQLite 依赖到 core。

### 固定验收矩阵

| 输入 | 在线重放 | 启动迁移 |
|---|---|---|
| initial_post.revision 为非法字符串/null/错误对象 | 422 RESYNC_REQUIRED | 拒绝，关闭重开后全库不变 |
| initial_post 显式为 null、非对象、空/缺少必需结构的对象 | 422 | 同上 |
| 没有 initial_post ID，却携带初始修订/关系集合 | 422 | 同上 |
| initial_post 的 relations/relation_ids 显式为 null 或非数组 | 422 | 同上 |
| Post/initial_post 的关系 state/version 显式非法，包括 null | 422 | 同上，不能变 marker |
| 合法未提供 initial_post | 正常、形状保持 | 正常 |
| 合法完整 initial_post、合法空数组、完整关系历史 | 正常、固定 data 精确重放 | 正常，重复启动后仍精确 |
| 已知事实正确，但旧关系确实未记录 version/state | 原有受控 422 | 按原兼容策略处理，marker 可重复启动 |

R13 W01/W02 的八个变体必须全部通过。迁移应明确拒绝损坏记录，不能把在线已有的 422 误算作迁移合格。不要一律拒绝所有旧格式以绕过这些测试。

## 2. 初始帖缺省与空数组语义必须在首次/重试保持一致

R13 W03 证明当前真实 API 的普通合法路径也有差异：

```text
thread.create 携带 initial_post：首次 initial_post = { post, revision }
立即同键重试：initial_post = { post, revision, relations: [] }
```

旧完整响应在线重放和迁移重开后重放也多出同一个字段。正文、修订和时间没有变化；这是响应形状问题，别写成历史内容损坏。

修复无条件添加空数组的投影逻辑。**保持当前首次成功返回的合法形状**，从引用中保留/识别“未提供关系字段”与“明确记录空数组/完整数组”的区别；受支持旧结果确实记录了关系数组时，继续返回相应数组及固定版本。不要靠给所有首次响应新增字段、删除所有 relations、或让测试忽略差异来通过。

对实际 ThreadService 创建结果验证立即重试和文件库重开后的重试；对完整旧响应验证直接在线与迁移两入口。比较完整 data，且无重复 action/业务/事件写入。授权与脱敏变化的既有例外继续适用，本组固定合法身份和未脱敏数据不应有差异。

## 3. 正式测试必须经过真实入口

本轮新正式 V01/V02 目前只是 helper 的 toThrow，未达到原任务要求的迁移/重开与 HTTP 证明；独立 V 探针实际补足了证据，但其断言不能被写成正式测试已有。

- 将 V01/V02 与 W01/W02 的关键变体通过正式测试接入真实记录、HTTP 重放及 `openAndCoordinateDatabase`。可采用共享参数化夹具，避免复制启动代码。helper 单测可以保留，但不是唯一证据。
- 损坏引用写入临时库后再截取“调用前快照”，调用拒绝后关闭重开，对 schema/所有表行比较。断言期望错误分类，避免无关外键/夹具错误让 toThrow 假通过。
- W03 使用真实 HTTP 首次响应作为期望结果，完整比较新格式立即重试、重开重试、旧完整结果两入口；同时保留合法初始 ID-only marker 正例。
- 正式 V03/V04 的真实回滚与重开快照、L02-3c、Q 等有效断言不回退。无需机械重复已覆盖的完整历史 patch 对照，但报告必须指向其真实来源。

有限 OperationFamily 和 switch 已存在。当前还没有完整 operation → 返回值 → ref 类型关联；本轮重写的共用解析模块至少用 unknown 与明确的解析结果类型收窄，避免新增 any/强转。不要把文档改成“完全强类型”来代替实现，也不因类型改造扩进其他服务。

## 4. 验收、执行记录与出口

开发期先跑受影响的正式用例与 W。最终源码稳定后，按本目录 **commands.json 的 21 个不同验证命令**复跑：build/typecheck/lint/test:all，R1–R12 全部旧探针，以及本目录 W 探针。commands.json 中 W 的两条记录是审查时增加诊断后的复跑，最终验收只需在最终脚本上执行一次，不必复制旧诊断过程。先 build，再运行依赖 dist 的探针。

必须达到：

1. W01–W03 全通；正式测试具备上述两入口与重开断言。
2. V01–V05、Q、P、N、G/H/J/K、R1–R3 无回归；正式测试全部通过，数量据实际输出填写。
3. R8 只允许 L03 失败，R4 只允许 U05/U06 失败；保存其真实 exit 1。任何其他失败先解决，不用 `|| true` 隐藏状态。
4. 所有实际执行保存命令、退出码、原始 stdout/stderr。必要的本地回环端口测试按环境权限机制运行；未运行或环境失败明确报告。
5. 产品改动保持在本包需要的 core/调用边界与测试范围。B.4-3 的全部结构矩阵和 B01–B12 证据不在本轮重复展开。

新交付归档到 `docs/reviews/2026-09-30-m0-m1-r13/implementation-r4-b4-2r4/`，包含 baseline-before/after、commands、原始日志、验证与变更 README。不要覆盖旧报告、探针或 observed。

随功能交付修正 R13-E01，具体按 coverage-audit 与 delivery-evidence-audit：11 族含 admin.redaction，不含 post.redact；46 项是独立脚本而非报告所列正式文件；签名、缺陷归属、lint 和断言描述必须从当前源码/输出核对。使用可移植的仓库相对链接，检查文件存在。日志本轮确实齐全，不必重新制造旧输出。

同步根 README 和 docs/progress 为“本包实现与自验完成，待独立复核”，引用新交付；保留 R13 作为当前独立结论，可附待复核交付链接。涉及缺省/空数组语义的契约与 ADR 如有调整，同步 docs/03、04、12。不要提前把 B.4-3 标为已开始或当前包标为独立验收通过。

最终汇报：修复的规则、W/V 正式与独立证据、完整命令结果、未运行项与限制。验收后下一候选仍为 B.4-3（L03、结构预检、DDL 单一来源、原 B 证据），不自动开始。
