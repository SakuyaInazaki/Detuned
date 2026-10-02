# R13：R4-B.4-2R3 独立复核

2026-09-30。输入为 HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交工作，见 [baseline.json](baseline.json)。本次只新增审查材料并更新三个当前文档入口，不修改产品代码、正式测试或历史报告。

**结论：V01–V05 的修复确认有效；B.4-2R3 仍未完整验收。下一轮 B.4-2R4，聚焦旧格式 initial_post/关系字段解析与初始帖重放形状。暂不进入 B.4-3。**

## 已确认的完成项

- build/typecheck/lint 全部通过；**122/122 正式测试、11 个文件，B 回归 58/58**。
- R1–R3 **46 项**、G **9/9**、H **10/10**、J **7/7**、K **1/1**、N **5/5**、P **6/6**、Q **5/5**、V **5/5**均通过。
- R8 **7/8**，仅 L03 失败；R4 **6/8**，仅 U05/U06 失败，真实退出码均为 1。继续分别归 B.4-3、R4-C。
- typed Post/initial_post 的修订与关系已知事实检查已增加，原 V01 三例迁移均拒绝且重开快照不变。legacy 普通 Post 的原 V02 三例在线 422、迁移原子拒绝。
- 新 action 的 `relations:null` 已被拒绝，业务/事件/幂等三类写入均回滚。**R12-F01 中 V03 的具体修复通过**。
- v1 明确时间冲突已拒绝，V04 通过；**R12-F02 本次关闭**。原 Q03 和完整历史对照保持通过。
- 实现归档的 25 条命令、50 个 stdout/stderr 文件齐全；前后 83 个产品/测试指纹分别匹配 R12 输入和本次输入，实际只改了 core 幂等服务、SQLite bootstrap、B 回归三个文件。

详见 [独立验证记录](verification.md)、[覆盖与交付核对](coverage-audit.md)。报告摘要仍有错误，但不否定真实的执行日志和上述修复。

## R13-F01 · P1：legacy 初始帖与别名选择仍会吞掉显式坏值

这是 R12-F01 的剩余入口。R12 任务明确要求 Post 与 initial_post 共用适用规则、显式坏值先检查再规范化。当前新增已知事实 helper 有效，但格式检查仍分别写在两条 legacy 分支里，部分原字段在 helper 执行前就已丢失。

复跑：[check-legacy-input-presence.mjs](check-legacy-input-presence.mjs)。最终输出：[observed-legacy-input-presence-final.json](observed-legacy-input-presence-final.json)。W01/W02 使用真实 HTTP 生成的合法结果，在独立临时库中只变异所列字段；在线检查无写入，迁移后关闭重开比较全部 schema/表行。

| 变异 | 实际在线重放 | 实际启动迁移 |
|---|---|---|
| initial_post.revision 改为字符串 | 201，修订被恢复为 1 | 接受并写 typed ref |
| initial_post 改为 null 或空对象 | 201，返回值省略整个初始帖 | 接受并丢弃该字段 |
| compact Thread 只有 initial_post_revision 与关系 IDs，没有 initial_post_id | 201，省略初始帖及悬空字段 | 接受并丢弃字段 |
| initial_post.relations 或 relation_ids 显式为 null | 201，将其当作缺省 | 接受并改写引用 |
| 普通 Post 的嵌套关系 state 或 version 显式为 null | 422 RESYNC_REQUIRED | 接受并写 unreplayable marker |

W01/W02 的八个变体均未被迁移拒绝，重开后的快照均改变。最后两例的在线 422 不能代替迁移原子拒绝：它们不是合法历史缺失，而是已提供字段不符合既定类型。

具体路径：

- [initial_post 分支入口](../../../packages/core/src/services/idempotency-service.ts#L1448) 先提取 ID，再用真值判断决定是否处理整个对象。损坏对象和孤立修订/关系字段因此绕过检查。
- [修订读取](../../../packages/core/src/services/idempotency-service.ts#L1461) 先从“对象或 number”提取；字符串变成 undefined，再被 `?? 1` 纠正。应检查原字段，而非只检查提取后的值。
- [初始帖数组选择](../../../packages/core/src/services/idempotency-service.ts#L1477) 与 [关系 state/version 选择](../../../packages/core/src/services/idempotency-service.ts#L1771) 先用 `??` 选别名，把 null 与未提供合并；随后缺历史分支仍可提前返回 marker。

需要统一适用字段的存在性、类型、成对、别名及数组规则，再做已知实体检查和历史充分性判断。不能靠多加几个具体字符串特判解决，也不需要新增历史格式或扩大产品能力。

## R13-F02 · P2：合法初始帖首次与重放的 data 形状不同

W03 的合法对照发现一个明确的格式差异，**没有发现该对照中的正文、修订或时间被替换**。

真实 `thread.create` 携带合法 initial_post，首次返回的 initial_post 只有 `post`、`revision`；立即同键重试多出 `relations: []`。合法完整旧响应的直接重放和迁移重开后重放也出现相同差异。最终探针记录的唯一差异路径均为 `data.initial_post.relations`。

[投影返回处](../../../packages/core/src/services/idempotency-service.ts#L2157) 无条件加入 relations，而当前 ThreadService 的成功返回没有该字段。原任务要求合法初始帖形状保持、同键 data 精确一致；正式 V05 只断言 Thread 状态 201，未比较完整 initial_post。

本轮随初始帖解析修复其缺省/空数组语义：保留首次合法返回形状；确实记录了关系数组的受支持旧结果继续返回相应数组。不能删除所有关系字段来让此无关系样例相等。无需扩入后续 B.4-3 的全部 11 族证据矩阵。

## R13-E01：正式覆盖与交付说明未完全符合自报

机器核对见 [delivery-evidence-audit.json](delivery-evidence-audit.json)，详细说明见 [coverage-audit.md](coverage-audit.md)。

- 正式 V01/V02 是直接调用 helper 的 toThrow，未验证迁移调用链、HTTP 422 或全库重开快照；独立 V 探针提供了这些有效证据，不能称五个正式用例均完成此类断言。
- 正式 V03/V04 有真实回滚/重开证据，应保留。正式 V05 没有比较完整 Thread/initial_post，也没有完整 patch 对照。
- 11 操作族仍包含 `admin.redaction`，没有 `post.redact`；46 项是独立审查脚本总数，不能按报告中的正式测试文件分配；precheck 的 parsed 仍是 any。
- 本次日志映射正确，产品指纹也正确。摘要中缺陷归属仍错：V03 属 R12-F01，V04 才是 R12-F02。lint 没有使用 Turbo；附件中的 R5 脚本名称也不正确。

文档勘误随下一轮功能交付完成，不单独开修文案任务。不覆盖历史自报和原始日志；在新报告中写正确映射。有限 OperationFamily 已存在，但输入仍大量 any，尚未建立完整业务结果/ref 类型关联；不以风格单独阻断，此轮应至少将重写的共同 legacy 解析边界收窄为明确类型。

## 下一步

执行 [B.4-2R4 完整提示词](next-agent-prompt.md)。本轮已通过的 V、时间修复和旧检查保留；只修上述残余输入规则、初始帖缺省/空数组投影及相应正式覆盖。W01–W03 全通后交回独立复核。

B.4-3 的 L03、必要结构检查、DDL 单一来源、原 B01–B12 证据继续保留；其后是 R4-C，二者验收后再评估 M2.1。本次没有运行真实四宿主或模型，也没有实施 Web、附件或正式评审。当前仍是 M0/M1 后端原型的数据可靠性收尾。
