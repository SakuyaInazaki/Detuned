# R12：R4-B.4-2R2 独立复核

日期：2026-09-30。源码为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交实现，实际输入见 [baseline.json](baseline.json)。本次只新增审查探针、验证记录和交接文档，未修改产品代码、正式测试或历史审查材料。

**结论：指定 Q01–Q05 已修复，B.4-2R2 的完整出口仍未通过。下一轮执行 B.4-2R3，暂不进入 B.4-3。** 剩余问题仍是先验证原输入的同一要求，以及版本时间冲突检查的一处遗漏；没有增加新产品能力。

## 已确认的成果

- build/typecheck/lint 通过，**117/117 正式测试、11 个文件**通过，B 回归 **53/53**。
- R1–R3 **46 项**、G **9/9**、H **10/10**、J **7/7**、K **1/1**、N **5/5**、P **6/6**、Q **5/5**通过。
- R8 **7/8**，仅 L03 失败；R4 **6/8**，仅 U05/U06 失败，退出码均真实为 1。分别继续留给 B.4-3 和 R4-C。
- storage 现在确实调用 core 的 `normalizeLegacyResultRef`；大量重复迁移解码已删除。新增有限 `OperationFamily` 和穷尽 switch；新结果的字符串 relations、损坏 initial_post 会被拒绝。
- 历史 patch 仅缺 updated_at 时不会再借用主题 created_at，R11-Q03 通过；`syncThreadVersion` 已共用于两条历史导入路径。
- 正式 L02-3c 已改为全库逻辑快照并关闭重开比较；reason/body 例子的 operation 错配已纠正。Q04 的 action 出口错误现在有真实业务/事件写入后回滚断言。
- 31 条命令均有原始 stdout/stderr；本次实现归档包含全部 R1–R3 命令。83 个产品/测试的前后指纹与相应审查输入匹配。

因此，上轮具体样例与证据补项中的有效修复予以确认。问题是相同规则仍有入口遗漏，不能由 Q 全绿推导“根因彻底关闭”。详见 [独立验证记录](verification.md) 与 [覆盖/交付核对](coverage-audit.md)。

## R12-F01 · P1：已知事实检查与显式坏值处理尚未覆盖全部降级路径

继承 R11-F01 的未完成条件。受影响点集中在 precheck、legacy 规范化和新结果编码，不要求扩展数据库或重新实现已通过的功能。

复现脚本：[check-precheck-completeness.mjs](check-precheck-completeness.mjs)；实际结果：[observed-precheck-completeness.json](observed-precheck-completeness.json)。V01–V04 失败、V05 正例通过。

### V01：typed ID-only 路径只检查帖子，漏查已知修订和关系

[precheck 的 Post 分支](../../../packages/core/src/services/idempotency-service.ts#L446) 检查 ID、修订号格式、帖子空间/主题，但未核验该修订实际存在，也未核验 relation_ids 的实体与来源。随后 [迁移第 354 行](../../../packages/storage-sqlite/src/bootstrap.ts#L354) 直接生成 marker，跳过后续完整语义检查。

三个独立损坏输入均被接受并持久化为 `unreplayable`，关闭重开后的全库快照均改变：

| 原输入中的确定矛盾 | 实际结果 |
|---|---|
| Post 指向并不存在的 revision 999，带 ID-only 关系 | 启动成功，改写为 marker |
| relation_ids 指向同空间另一帖子创建的关系 | 启动成功，改写为 marker |
| relation_ids 中的关系根本不存在 | 启动成功，改写为 marker |

这些事实均能通过现有数据库证明，与“缺少关系当时的 version/state”不同。应先核验仍可确定的修订、端点及归属，再允许历史不足降级；不能用 marker 删除错误诊断信息。

### V02：legacy ID-only 分支仍可丢字段或掩盖错绑

[normalizeLegacyResultRef](../../../packages/core/src/services/idempotency-service.ts#L1550) 对 relation_ids 仅判断 Array.isArray，而没有针对显式非法字段报错；合法性与实体检查仍在某些 marker 返回之后。

- `relation_ids: 'not-an-array'`：在线重放 **HTTP 201**，返回 `relations: []`；迁移同样成功，将含关系的原结果规范化为没有关系的引用。这是错误成功。
- Post 属于另一个 Thread，同时带 ID-only 关系：在线为 422，但启动仍成功并写 marker。在线拒绝不代表迁移已经验证原数据。
- 重复 relation_ids：同样在线 422、迁移成功写 marker。

同一个 core normalizer 被两处调用是必要改进，但该函数内部仍须在丢字段或返回 marker 前完成共用规则。

### V03：新业务结果 `relations: null` 仍被当作省略

[编码条件](../../../packages/core/src/services/idempotency-service.ts#L1148) 明确排除了 null，未按结果契约的数组类型拒绝。真实 `executeIdempotent` 故障注入显示：action 返回 `relations: null` 后，**帖子 1 行、事件 1 行、幂等记录 1 行全部提交**；同键重放返回空数组，首次/重试 data 不同。

这是内部业务返回值边界的故障注入，不是普通 HTTP 客户端可提交 result_ref 的漏洞声明。V05 的合法 `relations: []` 配对结果成功且精确重放；应保留合法缺省语义，但不能把契约不允许的 null 当缺省。

### 类型约束的实际进展

`OperationFamily` 有限联合和 switch/never 已落实，认可。`ParsedOperation.expectedKind` 仍是宽联合，`extractResultRef` 的业务结果仍为 any，预检与 legacy 输入也是 any；尚未建立 operation → 业务结果 → ref 的类型关联。此项作为上述运行时修复的配套约束完成，**不单独因编码风格拒绝验收**。

## R12-F02 · P2：选择创建时间时忽略了明确提供的 v1 版本时间冲突

R11 的“缺 patch 时间不借出生时间”具体问题已修复。本项属于原历史固定字段冲突要求在新 `syncThreadVersion` 中的遗漏。

[bootstrap.ts:251](../../../packages/storage-sqlite/src/bootstrap.ts#L251) 对版本 1 选择 `createdAt ?? updatedAt`，随后只比较选中的时间。若两个字段都存在，明确给出的 updated_at 冲突会被忽略。

V04 保留合法主题 v1 快照及旧完整响应的 created_at，只把旧响应 updated_at 改成 `1999-01-01T00:00:00.000Z`。迁移成功，原损坏输入被转换为 typed ref，HTTP 201 返回快照时间 `2026-09-29T06:00:00.000Z`。**返回的是已有快照时间，并非把 1999 写成真实历史；缺陷在于应拒绝的显式冲突被静默抹掉。**

需要先核验所有已提供、含义明确的固定字段，再选择恢复来源。不能为解决缺字段而跳过显式冲突，也不能恢复“patch 借用创建时间”的旧错误。正常完整 Thread 与 patch 正例在 V05/P06 保持成功。

## R12-E01：报告准确性仍需修正

原始执行记录是真实且齐全的，但报告摘要与记录不一致，机器核对见 [delivery-evidence-audit.json](delivery-evidence-audit.json)：

1. 交付 README 中 **19 个日志路径不存在**；commands.json 指向的原始文件全部存在。应从清单生成验证表，不能手写猜文件名。
2. R1 behavior/adapters、R2 remaining/CLI 实际分别为 **15/5/12/3**，不是报告表中的 20/2/5/2。R3 是 10 加 serve 1，总计 46。
3. 报告列举了不存在于本次 11 族映射的 `post.patch`、`membership.create/patch/delete`；实际代码仍是正确的 post.revision/post.withdraw/relation.reopen/admin.redaction 等族。错误仅在报告，不应为了迎合报告去新增这些操作。
4. precheck 签名实际为 `(storage, operation, spaceId, parsed)`；NestedRelationRef 为 `{id,version,state}`，报告对参数及字段的描述不正确。
5. lint 实际入口为 `pnpm -r run lint`，子包使用 tsc --noEmit；并不是报告所述的三个 filter 命令。U06 测的是截断 **HTTP 响应** JSON，不是请求流。
6. before 产品指纹与 R11 输入相同，但整体 tracked diff hash 不同，附件“diff 完全一致”不准确。R11 在捕获输入后更新过审查文档，整体 diff 不同本身不构成源码漂移。

保留历史自报和日志原样，新交付补勘误及正确证据。无需制造一轮只改报告的任务，随功能收尾完成。

## 下一步及阶段边界

使用 [下一轮提示词](next-agent-prompt.md) 完成 **M0/M1-R4-B.4-2R3**。重点是把“已知事实验证”放在所有降级之前、完整拒绝显式坏值，并补齐时间冲突核对。退出条件为 V01–V05 全通、旧检查无新增失败、实际调用链和证据一致。

本次未发现所运行正常对照的回归，但合成故障检查仍未达到本包已约定的可靠性要求。项目继续处于 M0/M1 数据包收尾。B.4-3 仍包含 L03、结构预检、DDL 单一来源和原 B01–B12 证据；其后才是 R4-C、M2.1。真实四宿主、Web、附件与正式评审均未在本轮运行或实施。
