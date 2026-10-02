# R14：B.4-2R4 独立复核与下一任务

审查日期：2026-10-01（Asia/Shanghai）。被审查任务：**M0/M1-R4-B.4-2R4：统一旧初始帖字段解析，保持初始帖重放形状**。

**结论：上轮 R13-F01/F02 的具体修复已验证，125 项正式测试与 W01–W03 全通；数据与升级包尚未整体验收。** 新补查发现一处 P2：明确超过数据库当前版本的关系引用，仍可因缺少历史状态而在启动迁移中被改写为 `unreplayable`。在线重放保持 422 且只读，没有复现返回虚假成功或泄露数据。

下一任务为 [M0/M1-R4-B.4-3：结构预检与原 B 验收证据（含 R14 前置补项）](next-agent-prompt.md)。先关闭下述 R14-F01 并补齐正式入口测试，再继续原定结构预检、DDL 单源和 B01–B12 证据。将同属迁移验证的工作放在一个任务内按顺序交付，不再单独拆一轮 B.4-2R5；这不表示剩余问题已经通过验收。B.4-3 通过独立复核之后才进入 R4-C，M2 仍未开始。

## 1. 输入与已确认的进展

输入为 HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加多轮未提交改动，见 [baseline.json](baseline.json)。相对 R13 的 83 个产品/测试文件，仅两个文件有本轮变化：`packages/core/src/services/idempotency-service.ts` 与 `tests/integration/m0-m1-r4-b-regression.test.ts`。本次审查没有修改产品或正式测试。

| 上轮要求 | 本次独立结论 | 证据 |
|---|---|---|
| R13-F01：旧 initial_post 原值、显式 null、孤立字段 | 指定反例修复通过；Post/initial_post 现共用修订与关系解析 | W01/W02 全通；X01 的 7 个别名坏值/冲突变体全部拒绝，迁移重开后逻辑快照不变 |
| R13-F02：初始帖重放多出 relations: [] | 修复通过 | W03 首次/立即重试及旧结果迁移重放精确一致；X02 另证合法空数组、完整关系数组、等价别名均保真 |
| R12 时间及此前历史重放修复 | 原有效检查无回归 | G/H/J/K/N/P/Q/V 全通，R8 仍仅 L03 失败 |
| 正式覆盖 | W01/W02 已有真实 HTTP、迁移、关闭重开快照；W03 已比完整 data | B 正式套件 61/61；V01/V02 仍只有 helper toThrow，原入口覆盖补项未完成 |
| 交付证据 | 17 条所记录命令与原始日志确实存在；其中四个必跑脚本被遗漏 | 详见 [覆盖核对](coverage-audit.md) 与 [归档核对](delivery-evidence-audit.json) |

## 2. R14-F01（P2）：缺少历史字段不能掩盖已知的未来关系版本

### 可复现的输入和影响

在真实 HTTP 生成的合法夹具中，关系当前版本为 1 或 2。仅将临时库的历史 `result_ref` 改为含 `version: 1001` / `relation_version: 1002` 的受支持旧形状，同时省略状态，随后调用在线重放与真实启动迁移入口。该版本肯定尚不存在，不属于仅缺少历史证据的情况。

[X03 最终原始输出](observed-legacy-helper-boundaries-final.json) 中五种变体表现一致：

| 变体 | 在线重放 | 启动迁移 | 关闭重开后 |
|---|---|---|---|
| 旧 Post 嵌套关系：未来 version，省略 state | 422 RESYNC_REQUIRED，只读 | 接受，写入 unreplayable | 逻辑快照改变 |
| 旧 initial_post 嵌套关系：未来 version，省略 state | 同上 | 同上 | 同上 |
| 同一数组：一项有完整未来 version/state，另一项只有合法 ID | 同上 | 同上 | 同上 |
| typed relation.create：未来 relation_version，省略 relation_state | 同上 | 同上 | 同上 |
| legacy relation.create：未来 version，省略 state | 同上 | 同上 | 同上 |

配对对照也已运行：只有一项完整未来 version/state 的数组会正确拒绝迁移，且重开后不变；合法 `version: 1`、缺 state 的旧关系仍可受控降级，重复启动稳定、重放 422 且只读。所需修复是先排除已知矛盾，再决定是否降级，不能改成拒绝所有历史缺失。

这组探针主动构造了存储中的损坏引用，不表示普通客户端可以提交 `result_ref`，也不表示用户的实际数据库已经损坏。当前后果是迁移将确定矛盾的原记录改写成缺历史标记，丢失了该矛盾；因此评为 P2。没有观察到在线成功返回不存在的版本、重复执行 action 或正文泄漏。

### 根因与修复边界

- [processLegacyRelations](../../../packages/core/src/services/idempotency-service.ts) 第 407–416 行先检查已知事实，但其调用的 `validateNestedRelationsKnownFacts`（525 行）只检查实体、空间及来源/端点。422–445 行用整个数组的 `allHaveVersionAndState` 决定是否提前返回 marker，未先核对每个已提供版本。
- 同文件 1096 行的 `validateSemanticsForNestedRelations` 已有完整引用语义检查，1130 行明确拒绝 `r.version > rel.version`；提前变成 marker 后，该检查接触不到原值。混合数组中的完整坏项也因此被另一项的历史缺失遮住。
- 独立关系有相同遗漏：typed `relation.create` 的预检位于约 807 行，[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 365–386 行预检后直接降级；legacy `relation.create` 于 core 2080 行在缺 version/state 时提前降级。

将“已提供版本是否可能存在”和可执行的完整关系语义检查放到共同的降级前验证中，并由嵌套 Post、initial_post、typed/legacy 独立关系复用。数组必须逐项检查，不能要求所有元素先齐全才检查其他完整元素。格式校验、实体/作用域、已知矛盾和缺历史的边界保持分明；缺失的信息不得用当前可变状态补造。

验收：X03 五种坏输入均在线 422 且只读、迁移明确拒绝、关闭重开后 schema 与全部表行等于调用前快照；两个配对对照保持原有正确行为；X01/X02、W/V/Q/P 等不得回退。具体实现及正式测试要求见 [下一轮提示词](next-agent-prompt.md)。

## 3. R14-E01：交付证据与正式覆盖补项

本轮实现归档有 17 条命令，并非前轮要求的 21 个不同命令。G/H/J/K 四个脚本没有出现在 `commands.json` 或 `run-all.mjs`，但当前状态摘要声称全部通过。本次独立审查已实际补跑并确认四者通过，不能将这个结果倒填为实现方当时已运行。

W01/W02 的正式两入口断言已经补齐，应予确认；V01/V02 仍停留在 helper 抛错，未完成前轮明确要求的真实记录、HTTP 和迁移重开覆盖。保留原历史报告，以新交付说明更正来源。`unchanged_after_reopen` 比较的是 schema/表行逻辑快照，不能写成数据库文件“字节完全不变”。这些是证据补项，不另算新的产品故障。

## 4. 复跑结果与范围

build、typecheck、lint 通过；正式测试 **125/125，11 个文件，其中 B 61/61**。R1–R3 原 46 项、G/H/J/K/N/P/Q/V/W 全通。R8 为 7/8，仅既有 L03 失败；R4 为 6/8，仅后续 R4-C 的 U05/U06 失败。新增 X 为 2/3，X03 如上。

完整命令和原始输出见 [verification.md](verification.md) 与 [commands.json](commands.json)，共 23 次执行、22 个不同验证命令。正式测试与探针有重叠，不相加为独立场景总数。R8/L03 与 DDL/B 全条件仍属下一任务，不因 125 项通过而视为完成。

未运行真实 harness 宿主、外部模型、远程 CI、全新依赖安装或用户真实库升级。未实现 M2 附件/记忆、M5 Web、M6/M7 正式评审及外部验证。本次仅新增独立审查材料、探针和当前状态文档；保留历史材料及原方案字节，最终核对见 [review-integrity.json](review-integrity.json)。
