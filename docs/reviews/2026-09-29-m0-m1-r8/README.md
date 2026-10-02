# R8：R4-B.3 交付复核

审查日期：2026-09-29。基线为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交实现，见 [baseline.json](baseline.json)。审查对象是用户贴出的本轮回复及 [R4-B.3 实现方报告](../2026-09-29-m0-m1-r7/implementation-r4-b3/README.md)。本轮只增加审查材料并更新当前状态入口，未修改产品代码、正式测试或历史 observed。

**结论：R4-B.3 部分完成，不能接受“原 R4-B 全部不变量完成”的声明。下一轮先做 R4-B.4-1：恢复空间创建重试与重复启动。** 暂不进入 R4-C 或 M2.1。

91 项正式测试、46 项旧探针、G01–G09、H01–H10、J01–J07、K01 全部通过属实。但新增 L01–L07 失败，归为五类问题；L08 正例通过。其中 L01 是不需要损坏数据库即可触发的正常 HTTP 重试回归，L02 是迁移器产生自己下一次启动不能接受的记录。后续工作已拆成三个有限小包，见 [remaining-work.md](remaining-work.md)，不再要求下一位 Agent 一次宣布整个数据包收口。

## 已验证的改进

- 两处 R3 T06 已改用 `fa1b35c` 历史 DDL 构造，不再用当前 v2 删除 metadata 冒充旧库。历史 SQL 去掉头部说明后与 Git 中原 SQL 相同；TS 夹具中的 SQL 也一致。
- J01 旧 compact relation.create 现在转换为明确不可重放，未继续把已有 v2/resolved 猜成 v1/open；J02/J03 的材料缺失和列缺失具体输入统一拒绝。
- J04 中完整旧 Thread 的已知 updated_at 得以保留，title 相同而 state 冲突的反例也被拒绝。J05 的跨空间及 resolution 属于另一关系的具体反例通过。
- J06 的不安全整数、嵌套额外字段、原 unreplayable 正文绕过和未注册编码操作具体输入通过。J07 的新格式关系历史行为保持正确。
- 新增的新建/升级 schema 对比测试有价值，比较了表集合、table_info、foreign_key_list、index_list。它不能替代运行时损坏结构预检，也未比较索引中的列/表达式。
- K01 的真实旧 DDL 升级、重开重放和重复启动继续通过；L08 的普通主题重试与可恢复完整旧响应经过两次启动仍精确一致。已有原子升级与 SQL 写故障回滚检查保持通过。

## 未关闭的问题

### R8-F01 / P1：正常 space.create 同键重试被误拒绝

位置：[idempotency-service.ts:947](../../../packages/core/src/services/idempotency-service.ts#L947)，调用上下文见 [space-service.ts:46](../../../packages/core/src/services/space-service.ts#L46)。证据：L01。

创建空间成功后，使用同一 actor、请求体和幂等键重试，返回 **422 RESYNC_REQUIRED**，关闭重开后的重试也为 422。所检查的业务、事件和幂等结果计数未增加，但调用者无法恢复已经成功的原请求结果。

原因是 space.create 的幂等作用域为固定值 `instance`，新重建逻辑却要求引用的真实 `spc_...` 与这个作用域相等。此前任务已明确提醒：实例级空间创建不能机械套用空间级操作的归属比较。应按 operation 区分合法实例作用域与空间作用域，保留正常 space.patch 的空间校验，不能删除全部空间检查。

### R8-F02 / P1：一次成功迁移会写入下次启动拒绝的标记

位置：[bootstrap.ts:391](../../../packages/storage-sqlite/src/bootstrap.ts#L391)、[idempotency-service.ts:248](../../../packages/core/src/services/idempotency-service.ts#L248)。证据：L02；稳定正例：K01/L08。

本轮接受的一种旧式 thread.patch 引用缺少可恢复历史时，迁移器写入 `unreplayable.op = 'thread.patch:<id>'`，第一次升级成功。关闭并重开后，validator 要求 `op === parsedOp.family`（`thread.patch`），于是拒绝启动。

L02 的输入是**当前 codec 接受的旧式变体，未宣称该精确形状来自已发布旧二进制**。这里的缺陷仍然成立：若不支持这种输入，应首次迁移就明确拒绝并回滚；若接受并提交，产物必须满足自己的校验，重复启动不应坏掉。不能将失败归咎于“用户应再次 init”。

应统一不可重放标记的 operation 语义，保留实际目标绑定，验证所有迁移返回值后再提交；为本实现及此前实现能够生成的合法标记提供一致的读取/迁移规则。不可重放应阻止该键假成功，不能无故阻止整个合法实例以后启动。

### R8-F03 / P1：旧嵌套关系仍漂移，时间冲突仍被忽略

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 的旧 `$ref:post` 转换、[idempotency-service.ts:1093](../../../packages/core/src/services/idempotency-service.ts#L1093)、[bootstrap.ts:327](../../../packages/storage-sqlite/src/bootstrap.ts#L327)、[bootstrap.ts:379](../../../packages/storage-sqlite/src/bootstrap.ts#L379)。证据：L04/L05。

- L04 使用真实历史源码存在的 `$ref:post + relation_ids` 形状。原 post.create 返回嵌套关系 v1/open；之后 resolve 为 v2/resolved。升级及重开后，原键重放返回 **201、v2/resolved**。旧转换只保留 IDs，重建仍读当前关系，未达到上一轮“旧版只存 relation_ids 也不得假装历史快照”的要求。
- L05 的同一 thread 历史主键 title/state 相同，时间与旧完整响应矛盾；迁移没有拒绝，原键重放把 `2026-09-29T04:00:00.000Z` 变成 `1999-01-01T00:00:00.000Z`。当前只比较 title/state，仍未比较完整固定历史。

要求延续 R7：可唯一证明的历史准确恢复；不足时采用明确不可重放/原子拒绝策略；矛盾历史整笔回滚。不能仅修直接 relation.create 而保留嵌套关系的当前值回退。

### R8-F04 / P1：同空间实体语义及验证入口仍未统一

位置：[idempotency-service.ts:985](../../../packages/core/src/services/idempotency-service.ts#L985)、[idempotency-service.ts:1140](../../../packages/core/src/services/idempotency-service.ts#L1140)、[idempotency-service.ts:407](../../../packages/core/src/services/idempotency-service.ts#L407)、[bootstrap.ts:250](../../../packages/storage-sqlite/src/bootstrap.ts#L250)。证据：L06/L07。

在自建库里故意放入错误引用后：

- initial_post 指向**同空间另一个主题**的帖子，迁移成功，重放 **201**，返回的 `initial_post.post.thread_id` 与外层 `thread.id` 不同。
- resolution 确实属于该关系，但引用声称 version=99，决议真实 version=2。迁移成功，重放 **200**，返回自相矛盾的版本。
- 编码器接受 thread version=0 并生成 v1 引用；validator 接受只有 initial_post_revision、没有 initial_post_id 的未成对字段。
- 未注册 operation 搭配缺版本 compact relation.create，会从迁移的提前返回分支写入不可重放标记并提交，没有通过 operation 绑定校验。

前两项说明空间相同与 resolution 归属相同只是必要条件。后两项格式问题为 P2，归在同一验证链路任务中修复。**这些是持久引用完整性反例，不证明普通远程 API 可以篡改数据库。** 应让新编码、旧转换输出和重放输入共同执行格式与实际实体绑定检查，包含 thread/initial_post、resolution action/version、目标、修订、嵌套关系等，而非每个入口分别加局部 if。

### R8-F05 / P1：缺少幂等唯一约束的当前库仍被视为健康

位置：[bootstrap.ts:30](../../../packages/storage-sqlite/src/bootstrap.ts#L30)、[bootstrap.ts:103](../../../packages/storage-sqlite/src/bootstrap.ts#L103)。证据：L03。

保留所有表名、列名和现有数据，但去掉 idempotency_records 的复合主键。分类仍为 **current_initialized**，init 成功；随后可插入第二条完全相同的幂等键。当前只检查部分列名，没有检查必要主键/唯一约束、外键或索引。

本例是故意构造的损坏结构，用来验证原任务的损坏识别要求；不是声称产品在正常路径会自行删除主键。新建/升级两份健康 schema 相同，也不能证明损坏库会被拒绝。修复应按支持版本的实际结构做只读预检，不静默补建或接受损坏关键约束。

## 覆盖与交付声明

[coverage-audit.md](coverage-audit.md) 记录仍未补齐的 B 子条件。最直接的例子是 B01 虽称 11 个操作都验证了重建，实际上只进行写入和部分引用检查，因此漏掉了 L01 的普通重放回归。B03 的关系 reopen 仍被写成数据库重开，B06 的 beforeSnapshot 仍没有比较；这些问题在上轮已经指出。本轮新增正式 J05 的末尾只改了结果记录，没有执行所声称的 resolution 重放断言；外部 J05 实际覆盖了该事实，应该正确引用。

这不否定 91 项测试通过的真实性，但不足以支撑“全部不变量已完成”。本轮不因美观、风格或未来需求拒绝验收，阻断依据是以上可复现行为及原任务必需条件。

## 验证与下一步

| 检查 | 结果 |
|---|---|
| build / typecheck / lint | exit 0；lint 主要执行 tsc --noEmit |
| pnpm test:all | 11 文件、91 项通过 |
| R1–R3 旧探针 | 46 项通过，T06 使用修正后的夹具 |
| R4 U01–U08 | 6/8，只有 U05/U06 失败；exit 1，留待 R4-C |
| G / H / J / K | 9/9、10/10、7/7、1/1 |
| R8 L01–L08 | L01–L07 失败，L08 通过；exit 1 |

测试有重叠，不能相加成独立覆盖量。命令与原始输出见 [verification.md](verification.md)。下一轮仅交付 [R4-B.4-1 提示词](next-agent-prompt.md) 的两个行为；R8-F03–F05 及剩余 B 条件保留在 [后续小包](remaining-work.md) 中。一个小包完成不等于 R4-B 验收，更不等于整个产品完成。
