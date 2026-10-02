# R11：R4-B.4-2R 交付复核

审查日期：2026-09-30。对象为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加当前未提交实现，精确文件指纹见 [baseline.json](baseline.json)。本轮只做独立复核、补充审查探针和任务交接，没有修改产品代码、正式测试或旧审查材料。

**结论：本轮有实质进展，但 B.4-2R 尚不能验收；下一轮执行 B.4-2R2，暂不进入 B.4-3。** 上轮 P01–P06 已全部通过；新增补验 Q01–Q04 失败、Q05 正例通过。剩余问题归并为两个根因：原输入尚未完整验证就被改写/丢弃，以及把主题创建时间当成历史修改时间。这些都是 R10 任务书明确要求的边界，未扩大到新产品能力或结构预检。

## 已确认的进展

- `pnpm build/typecheck/lint` 成功，正式测试 **112/112，11 个文件**通过，其中 B 回归 **48/48**。
- R1–R3 的 **46 项**检查通过；G **9/9**、H **10/10**、J **7/7**、K **1/1**、N **5/5**、P **6/6**通过。
- R8 **7/8**，仍仅 L03 失败；R4 **6/8**，仍仅 U05/U06 失败。它们真实返回 exit 1，分别属于后续 B.4-3、R4-C。
- 嵌套关系现在检查源帖子/修订、目标修订和历史版本；新写确实在事务内调用语义校验。Q05 额外确认语义失败会撤销业务、事件、结果记录，合法新写、关系复用 v2、现代嵌套历史和合法完整旧结果继续成功。
- legacy 在线重放已复用最终历史投影，P03 的错误帖子目标和 `updated_at` 漂移得到修复；缺少两个时间字段时不再用墙上时钟补造历史，P04 通过。
- 实现归档已包含 27 条命令及对应原始输出，前后产品/测试指纹与 R10 输入、本轮实际输入相符。L05/L07 的全库快照与 L06 的实际 HTTP 断言也已补上。

完整命令和限制见 [verification.md](verification.md)，交付声明逐项核对见 [coverage-audit.md](coverage-audit.md)。正式测试与审查探针有重叠，数量不能相加当作独立场景数。

## R11-F01 · P1：原输入校验仍可被规范化和提前降级绕过

对应未完成的 **R10-F02** 与 R10 任务书第 1、2、6 节。复现见 [Q01/Q02/Q04](observed-validation-pipeline.json)，命令为：

```sh
node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs
```

### Q01：typed 引用在完整校验前被改成 marker

迁移增加了一份手写预检，但 [bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts#L413) 的三处早退仍位于完整格式/语义验证之前。预检只检查“字段存在时是否正确”，没有完整覆盖必填、成对字段以及仍可确定的实体归属。

以下四个合成损坏输入均被接受、改写为 `unreplayable`；关闭重开后的全库逻辑快照均已变化：

| 输入 | 应拒绝的明确矛盾 |
|---|---|
| typed Post 有 `relation_ids`，缺少 `revision` | 缺必填修订，不能归类为只缺关系历史 |
| `post.create:<thread A>` 指向 thread B 的 Post，带 ID-only 关系 | 已知帖子与操作目标不匹配 |
| compact relation.create 指向不存在的 relation | 实体不存在，不能仅因缺 version/state 降级 |
| thread.create 没有 initial_post，却带非空 relation_ids | 无所属初始帖子的悬空关系集合 |

这不是要求补齐无法恢复的历史。合法旧 ID-only/compact 输入仍可按契约不可重放；有确定矛盾或损坏字段的输入必须拒绝，保留原记录供诊断。

### Q02：legacy 中明确提供的非法值仍被改成合法值

[在线规范化](../../../packages/core/src/services/idempotency-service.ts#L1048) 与 [迁移规范化](../../../packages/storage-sqlite/src/bootstrap.ts#L717) 仍各自解释旧 JSON。两者均可把旧完整 Post 响应中的：

- 非法嵌套关系 state 改为 `open`；
- 非法字符串 revision 改为 `1`。

Q02 两个输入均在线返回 **201**，启动迁移也成功并永久保存改写后的引用。最终 validator 检查的是已经变“正确”的对象，看不到原错误。这里测试的是合成损坏缓存，不是声称普通 HTTP 用户可以直接控制 result_ref，也不要求拒绝合法旧完整响应中的正文。

### Q04：新业务返回值中的损坏字段可被丢弃并提交

[编码器](../../../packages/core/src/services/idempotency-service.ts#L739) 只在 `initial_post.post.id` 成立或 `Array.isArray(relations)` 成立时处理可选字段；显式提供的错误字段会被当成未提供。

`relations: 'not-an-array'` 和 `initial_post: {post: {}, revision: 1}` 均未被拒绝。Q04 在真实 `executeIdempotent` 中注入前者，action 写入一个帖子和一个事件，结果为：**业务 1 行、事件 1 行、幂等记录 1 行全部提交；重放结果与首次结果不同**。这是内部 action 出口故障注入，不是普通请求绕过 HTTP schema 的证明。

Q05 的合法 `relations: []` 成功，合法数组但关系来源错误时整体回滚，说明新增事务语义检查有效；问题仍在其前面的原始结果识别。

### 必须修正的共同原因

当前 `ParsedOperation.family` 仍是 `string`，`extractResultRef` 接收 `any`，语义接口仍为 `IdempotencyResultRef | any`；11 族的穷尽类型关联未实现。`normalizeLegacyResultRef` 仅服务在线路径，storage 仍维护另一套迁移解码和预检。不能据此声称所有入口已经统一。

需要按实际 operation 识别输入，先完整验证该格式的原始字段和已知实体，再规范化/降级；共享规则供新编码、在线与迁移使用。不要继续只增加针对上述字面值的 if 分支。

## R11-F02 · P2：历史 patch 仍会借用主题创建时间

对应未完成的 **R10-F04** 和 R10 任务书第 5 节的“不要把主题创建时间当作任意 patch 的发生时间”。见 [Q03 原始结果](observed-validation-pipeline.json)。

[bootstrap.ts:579](../../../packages/storage-sqlite/src/bootstrap.ts#L579) 使用 `parsed.updated_at ?? parsed.created_at` 作为版本时间。Thread 的 `created_at` 是主题创建时间；历史表的 `created_at` 才是具体版本的时间。二者字段同名，含义不同。

Q03 从真实 HTTP 生成的旧式完整 patch 结果中**仅删除 updated_at**，保留 created_at；主题已到 v3，待恢复 v2 历史不存在。结果：

| 值 | 实际时间 |
|---|---|
| 主题 created_at | `2026-09-29T06:00:00.000Z` |
| 原 v2 patch updated_at | `2026-09-29T06:01:00.000Z` |
| 迁移写入的 v2 时间 | `2026-09-29T06:00:00.000Z` |
| 重放 HTTP 200 返回 updated_at | `2026-09-29T06:00:00.000Z` |

此输入是合成缺字段兼容变体，不宣称由某个已发布旧二进制产生。允许首次原子拒绝、合法不可重放或依据可靠版本证据恢复；不能接受后返回错误的成功结果。需同时核查有/无 `thread` 外壳的迁移分支以及当前版本回退，区分创建事件与后续修改事件。

## R11-E01：交付和覆盖说明还需纠正

这些是交接补项，不单独扩展产品范围：

1. 正式 **L02-3c 第 1699/1704 行仍只比较 idempotency_records**，报告声称已使用 fullLogicalSnapshot 不实。unknown_reason/extra_body 两个例子还同时错配 operation，不能隔离证明 reason/body 校验。补合法基准、单字段变体、真实重开和全库快照。
2. commands.json 没有本轮 R1–R3 的执行记录；报告中的 `logs/13-probe-r3.stdout.txt` 不存在。R11 已独立确认这 46 项通过，但不能把本次复核改署为实现者上轮执行。另有 test-all/typecheck 日志路径写错，正确路径见 coverage-audit。
3. P 编号应为 P03=legacy 投影/目标，P04=缺历史时间，P05=编码器；交付报告混用了这三个编号。补项原编号为 R9-E01/E02，不存在报告新称的 R10-E01/E02/E03。
4. U05 实际是**非法 relation type 枚举被 HTTP 接受并写入**，不是跨空间关系；`pnpm lint` 实际运行 `tsc --noEmit`，不是 ESLint。

历史报告与日志按原样保留，在新交付中写勘误及本轮新证据即可。

## 本轮判定与下一步

| 上轮事项 | R11 判定 |
|---|---|
| R10-F01 嵌套来源/历史证明 | 目标修复通过；继续保留正反例 |
| R10-F02 先验证原输入 | 部分修复；P02/P05 通过，但 Q01/Q02/Q04 证明未完整关闭 |
| R10-F03 legacy 错误目标与时间投影 | P03 目标修复通过；最终投影复用有效，不能外推为所有解码规则已统一 |
| R10-F04 缺时间不补造 | 墙上时钟问题修复；Q03 创建时间替代问题未关闭 |
| 回归/交付补项 | L05/L06/L07 和归档明显改善；L02-3c 与报告准确性仍待补齐 |

将 [下一轮完整提示词](next-agent-prompt.md) 交给实现 Agent，完成 **B.4-2R2** 后交回。该包只收尾 R11-F01/F02 与 E01，保留当前已通过修复。后续 B.4-3 仍包含 L03、支持版本结构预检、DDL 单一来源及原 B01–B12 证据；R4-C 和 M2.1 继续等待前置验收。

项目仍处于 M0/M1 后端可靠性收尾。四类真实宿主接入、M2 附件/记忆、M5 Web、M6/M7 正式评审仍未在本轮实施或验证。不能以本轮测试全绿宣称产品已可日常研究使用。
