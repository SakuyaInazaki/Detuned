# R10：R4-B.4-2 交付复核

**结论：已完成具体 L04–L07 反例修复，但 B.4-2 的统一验证与历史保真要求仍未完成，暂不进入 B.4-3。** 本轮实测确认 107 项正式测试、旧回归及 N01–N05 全部保持通过；新增的定向边界检查 P01–P05 失败，归为下面四类遗漏，合法正例 P06 通过。

下一轮只做 [R4-B.4-2R：补齐本包遗漏](next-agent-prompt.md)。这些要求已在 [上一轮提示词](../2026-09-29-m0-m1-r9/next-agent-prompt.md) 第 1–4 节明确，不增加产品范围，不要求重做已通过部分。L03 仍归后续 B.4-3，U05/U06 仍归 R4-C。

审查输入：HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交实现，见 [baseline.json](baseline.json)。相对 R9，83 个既有产品/测试文件中仅 idempotency-service、bootstrap 和 R4-B 回归测试发生变化；不能只用 HEAD 标识本轮实现。审查未修改产品代码或正式测试。

## R10-F01 / P1：嵌套关系只验证存在和空间，仍能返回错误来源与不存在的版本

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，463–482 行的 `validateSemanticsForNestedRelations`；调用点约 556、599 行，重建约 1299、1381 行。

该 helper 没有收到所属 post/revision，也未验证历史版本。**P01 实测两个变体均在线返回 201，启动迁移也接受：**

- 把嵌套关系换成同空间另一帖子创建的关系，返回 `relations[0].source_post_id !== post.id`。
- 把嵌套版本写为 999，底层关系当前只有 v2，仍成功返回关系 v999。

这会把不属于该操作的关系或不存在的历史呈现为成功结果。需要绑定 source post/revision、target 的实体/修订/空间，并验证所引用版本和状态的证据。不能简单要求“等于当前版本”，否则会破坏合法历史重放。P06 和已有 J07 提供历史 v1 在当前 v2 时仍须成功的对照。

原要求对应：上一轮第 4 节“嵌套关系的 source 指向本次返回的 post 与对应 revision”、第 1 节版本与语义验证。

## R10-F02 / P1：生成合法引用前先吞掉坏输入，验证仍存在绕过

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，250–275、292–327 行，正式原输入校验到 332 行才执行；[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，约 697–708、736–743、767–768 行。

**P02 的五种损坏输入全部被成功迁移成 unreplayable，重开后原结果记录已改变：** typed Post 引用夹带 body、重复 relation_ids、已知 thread.create 配 relation.create kind、thread_version=0、thread.patch 指向另一主题并给缺失版本。提前返回分支只验证自己新生成的 marker，没有先证明原输入属于合法但历史不足的记录。

**P05 的三个新编码反例也全部被接受：** 非法关系状态被改成 open，字符串版本被改成 1，非法嵌套状态被改成 open。出口 validator 只看到了已经被“修成合法”的引用。

应先校验输入的已知操作/kind、格式、提供的字段与实体归属，再判断是否确实缺少历史证据。新业务结果的必需字段错误直接拒绝；旧格式缺失字段的兼容规则单独定义，不能覆盖显式非法值。有效旧 marker 兼容仍需保留。

静态核对还发现，新写 action 后的 `executeIdempotent`（1509–1524 行）仅调用编码器，未进入共同实体语义检查；`ParsedOperation.family`、编码输入和旧解析仍大量为 string/any，多入口并未形成上轮要求的穷尽类型关联。这是本项修复的实现缺口，不另增一个纯风格阻塞项。

原要求对应：上一轮第 1 节“每一个迁移成功返回”“不能将操作-kind 错配变成普通 unreplayable”“不能默认成 1/open”。

## R10-F03 / P2：旧格式在线重放仍是另一套规则

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，816 行后的 legacy 分支，尤其 935–940、1032–1086 行。

**P03 实测：**

- `post.create:<thread A>` 的旧 `$ref:post` 指向同空间 thread B 的帖子，在线重放返回 201 及 thread B 的帖子；同一记录走启动迁移却正确拒绝。
- 完整旧 Thread 创建结果在线重放时，原 `updated_at=06:00` 被换为当前 v3 的 `06:02`；同一记录经过迁移后重放又能完整还原原结果。

迁移与在线路径对同一格式给出不同判断，根因是 legacy 分支没有汇入统一规范化、验证和历史投影。正常 CLI serve 会先协调迁移，因此此处不是“所有正常新请求都跨主题返回”的结论；它验证的是代码仍公开支持的旧格式在线重放路径，属于本包承诺的兼容边界。

原要求对应：上一轮第 1 节共享链路、第 2 节“在线重放也必须安全”、第 3 节完整固定字段。

## R10-F04 / P2：缺失历史时间时仍用当前时间补造

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，365–368、445–448 行，两处 `fallbackCreated` 仍以 `new Date().toISOString()` 兜底。

**P04 实测：** 为当前 codec 接受的旧式 thread.patch v2 结果去掉时间，提供逻辑 v1 库且主题已到 v3。升级成功，把原 v2 的 `06:01:00.000Z` 写成审查执行时 `08:03:23.883Z`，原键重放返回 200 及这个新时间。

该精确缺时间变体是合成兼容性输入，不宣称某个旧版本确实生成过它。系统可以依据明确支持规则原子拒绝，或从可信证据恢复，或受控不可重放；不能接受后制造历史。报告中“严禁使用挂钟时间”的完成声明与源码及实测不符。仅改成当前 thread.created_at/updated_at 也不足以恢复旧 v2 的时间，必须绑定实际版本。

原要求对应：上一轮第 3 节明确禁止迁移墙上时钟补造历史。

## 已确认的进展与交付补项

- L04 的 ID-only 历史关系现在不会直接读当前状态冒充历史；L05 给定时间的冲突被拒绝；L06 两个指定错配被拦截；L07 版本 0 编码和成对字段反例已通过。
- 正式 L01-3 已真正加入 onSend 故障与另一连接可见性检查，正式 L02-3b/d 已执行真实多次关闭重开，属于实质改进。docs/03、04、12 的 marker 决定已同步。
- **R9-E01 仍有断言补项：** L02-3c、L05、L07 的“回滚快照”只比较 idempotency_records；正式 L06 只调用迁移，没有标题声称的在线重放断言。独立旧探针的有效证据可引用，不要求为了数量机械复制；详细核对见 [coverage-audit.md](coverage-audit.md)。
- **R9-E02 的归档部分仍未完成：** [实现目录](../2026-09-29-m0-m1-r9/implementation-r4-b4-2/README.md) 依旧只有 README，没有实现后指纹或逐命令原始输出。本次独立复跑不补充为实现者当时的证据。
- 报告把 L05 标为 R8-F04，原归属应为 R8-F03。报告中“修完 L03 即完成 B01–B12”也不成立：B.4-3 仍包含 DDL 单一来源、必要结构约束及原 B 证据矩阵，见 [原拆分](../2026-09-29-m0-m1-r8/remaining-work.md)。

## 验证与范围

构建、typecheck、lint 通过；正式套件 **107/107（11 文件，B 文件 43 项）**；R1–R3 **46/46**；G/H/J/K **9/9、10/10、7/7、1/1**；N **5/5**。R8 **7/8，exit 1，仅 L03**；R4 **6/8，exit 1，仅 U05/U06**。新增 [P 探针](check-b4-2-boundaries.mjs) **1/6，exit 1**，P01–P05 失败，P06 合法现代/旧完整结果正例通过。

全部输出见 [verification.md](verification.md)；不同套件有重叠，不能累加为独立场景数。反例使用自建临时库与合成数据，不表示外部普通用户能改写 SQLite；未进行真实 harness/模型测试或公网部署。
