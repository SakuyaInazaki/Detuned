# R7：R4-B.2 交付复核

审查日期：2026-09-29。源码为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交修改，以 [baseline.json](baseline.json) 的 81 个产品/测试文件指纹为准。审查对象是用户提交的 R4-B.2 回复及仓库内的 [实现方交付报告](../2026-09-28-m0-m1-r6/implementation-r4-b2/README.md)。本轮未修改产品实现或正式测试。

**结论：R4-B.2 部分完成，数据与升级可靠性包仍未验收。下一任务为 R4-B.3，暂不进入 R4-C 或 M2.1。** 84 项正式测试、46 项 R1–R3 旧探针、G01–G09 和 H01–H10 全绿属实；这些具体输入通过，不能证明交付报告中的完整不变量成立。新增 J01–J06 失败，归为下面四类问题；J07 与真实旧 DDL 正例 K01 通过。

这些问题延续原 B01/B02/B05/B08 及 R6-F01–F04 的要求，不是新增产品范围。U05/U06 仍归后续 R4-C，不作为本轮数据包未验收的理由。

## 已确认的进展

- H01–H10 的原始输入全部通过：新写入的主题时间与嵌套关系引用得到改进；未知版本、部分目标错配、标题冲突和 CLI 正文诊断的原反例已修复。
- 迁移事务及真实 SQL 写故障回滚保持有效，H10 两个故障阶段继续通过。H09 覆盖的诊断正文泄漏可按已测范围关闭。
- J07 确认当前格式能正确保存“复用已有 v2/resolved 关系”的返回值；嵌套关系后续变化时，重放仍返回本次操作保存的 v1/open。
- K01 使用 `fa1b35c` 的真实历史 DDL，加入兼容的合成数据与旧完整 Post 响应。升级后凭据逐行不变、不发管理员 token、清理正文缓存；关闭重开后重放精确一致，重复 serve 不改逻辑状态。它不是旧应用二进制端到端运行。

## 尚未关闭的问题

### R7-F01 / P1：旧 relation.create 被一律补成初始版本

位置：[bootstrap.ts:206](../../../packages/storage-sqlite/src/bootstrap.ts#L206)。证据：J01；正向对照：J07。

合法请求先创建关系，再 resolve 到 v2/resolved；随后用另一个幂等键调用相同 relation.create。业务层复用已有关系，原请求实际返回 **v2/resolved**。将此键的结果设为上一轮确实使用过的 `{v:1,kind:'relation.create',relation_id}`，升级并关闭重开后重试，返回 **201、v1/open**。

迁移器把缺少的版本固定成 1，仅能修好“原请求确实创建新关系”的输入，不能恢复“原请求复用关系”的历史。操作名称 create 不能证明实体是由这次请求新建。R4-B.2 提示词已明确要求覆盖新建与复用，并禁止猜测历史版本。

修复要求：利用可验证历史唯一恢复原返回值；证据不足则采用已说明的不可重放/拒绝升级策略，保留业务数据与原键。不能把当前状态或默认初始状态当作历史。新格式的正确复用行为必须保留。

### R7-F02 / P1：实例分类仍依赖入口，且只验证表名

位置：[bootstrap.ts:30](../../../packages/storage-sqlite/src/bootstrap.ts#L30)、[bootstrap.ts:148](../../../packages/storage-sqlite/src/bootstrap.ts#L148)、[bootstrap.ts:729](../../../packages/storage-sqlite/src/bootstrap.ts#L729)。证据：J02、J03；旧库正例：K01/G08。

| 当前 v2 库的变体 | 观察结果 |
|---|---|
| 删除 metadata 表，直接 bootstrap | 分类为 supported_legacy；成功且生成不同 secret，逻辑状态改变 |
| 删除 metadata 表，经真实 CLI init | exit 0、success=true；生成不同 secret，逻辑状态改变 |
| metadata 表保留，但清空全部行，经 serve coordinator | 分类为 supported_legacy；成功且生成不同 secret |
| 删除 metadata 表，经 serve coordinator | 拒绝且状态不变；这是 H03 已修好的特定入口 |
| 保留全部表名，把 post_revisions.body 改名 | 分类为 current_initialized；init 成功，没有识别缺失必需列 |

serve 分支的局部补丁没有改变共用分类器；有 human actor 仍能使当前损坏实例回退到 supported_legacy。“检查 15 张表结构”的实现实际仅检查这些表名是否存在。

修复要求：把受支持版本的结构与材料判定集中到只读预检，bootstrap/init/serve 使用相同结论。当前实例缺表、缺材料行或缺必需列均应在改写前失败；保留合法历史库升级正例。不得靠补建表、补版本行或换 secret 猜测修复损坏库。

### R7-F03 / P1：已知历史时间被改写，同标题的其他历史冲突未拒绝

位置：[bootstrap.ts:241](../../../packages/storage-sqlite/src/bootstrap.ts#L241)、[bootstrap.ts:292](../../../packages/storage-sqlite/src/bootstrap.ts#L292)。证据：J04。

旧完整 Thread patch 响应包含准确的 `updated_at=2026-09-29T01:01:00.000Z`。迁移时却用墙上时钟填写历史行；关闭重开后同键重放为 200，但 `updated_at=2026-09-28T18:01:27.645Z`，与原结果不一致。

另一个子例中，相同 `(thread_id,version)` 的已有历史行与旧响应 title 相同、state 不同；升级仍成功，逻辑状态被改写。当前冲突检测查询了 title/state，却只比较 title。后续重放使用 `snap.created_at` 的改进，依赖迁移先正确填充这个字段。

修复要求：明确历史行的时间语义，保留已知操作时间；不要以迁移执行时间或实体最初创建时间替代某次 patch 的更新时间。逐一比较历史快照的全部固定字段；矛盾数据导致整笔升级回滚。合法且信息完整的旧结果必须精确恢复，不能一概标为不可重放。

### R7-F04 / P1：格式验证没有覆盖编码、迁移与实体归属的完整链路

位置：[idempotency-service.ts:232](../../../packages/core/src/services/idempotency-service.ts#L232)、[idempotency-service.ts:367](../../../packages/core/src/services/idempotency-service.ts#L367)、[idempotency-service.ts:849](../../../packages/core/src/services/idempotency-service.ts#L849)、[idempotency-service.ts:1101](../../../packages/core/src/services/idempotency-service.ts#L1101)、[bootstrap.ts:206](../../../packages/storage-sqlite/src/bootstrap.ts#L206)。证据：J05、J06。

J05 在自建测试库中故意放入归属错误的持久引用：

- Actor 仅能访问空间 A；普通 GET 空间 B 的私有主题返回 404。A 中 thread.create 键指向 B 的主题后，升级不拒绝，同键重放返回 **201 和 B 的主题**。
- relation A 的 resolve 引用指向 relation B 的真实 resolution；升级不拒绝，重放返回 **200 和不属于 A 的 resolution**。

这证明当前实现缺少受要求的持久引用完整性检查。**前提是存储引用已损坏/错配，未发现普通 API 能直接篡改这些记录；不把它描述为无前提的远程攻击。** `executeIdempotent` 已有 spaceId，但重建调用没有传入；仅检查部分 URL 目标相等无法保证实体归属及 resolution 的 relation/action/version 一致。

J06 还验证了同一链路中的其他绕过（格式问题本身为 P2）：

- 嵌套关系版本 1.5、超过安全整数范围的 revision、嵌套额外字段均被 validator 接受。
- unreplayable 的未知 op、任意 reason、额外字段可越过字段白名单提前返回。
- `extractResultRef('thread.create_unregistered', result)` 仍成功；编码器还用宽松前缀，没有复用新的 operation 解析。
- 含合成 body 的 v1 unreplayable 记录使迁移成功并原样保留正文，绕过 validator。正确行为是拒绝且回滚原库；不是在拒绝时偷偷清除原始数据。

修复要求：新编码、各旧 codec 的转换结果、重放输入都经过共同的严格格式与语义检查；显式传入必要的 actor/space/operation/target 上下文。只检查 JSON 外形不足以证明引用真实且属于本次操作。

## 审查自身的夹具修正

早期 [R3 T06 探针](../2026-09-28-m0-m1-r3/check-invariants.mjs#L100) 和 [正式 T06 测试](../../../tests/integration/m0-m1-r3-regression.test.ts#L285) 从**当前运行库** serialize 后只删除 instance_metadata，并把它称为 v1。当前源库已经是 schema v2，这个构造现在代表损坏的当前实例。继续要求它 bootstrap 成功，与本轮拒绝材料丢失的契约冲突。

这是历史审查夹具没有随 schema 演进更新的问题，下一轮应修正，不能为了保持它通过而保留 bootstrap 漏口。本轮保留原脚本和原 observed，补充 [K01 正例](check-legacy-fixture.mjs) 作为可运行替代构造：实际历史 DDL + 合成兼容行 + 旧完整响应。实现者可以修改上述两处 T06 的 setup，保留“不增发凭据、清除旧正文、成功重放”的语义，并另保留 J02 的当前库拒绝反例。此修正不属于降低验收标准。

## 验证与交接

| 检查 | 本轮实际结果 |
|---|---|
| build / typecheck / lint | 全部 exit 0；lint 主要执行 tsc --noEmit |
| pnpm test:all | 11 文件、84 项通过 |
| R1–R3 旧探针 | 46 项通过；T06 的解释须按上文修正 |
| R4 U01–U08 | 6/8；仅 U05/U06 失败，exit 1，留待 R4-C |
| R5 G01–G09 / R6 H01–H10 | 9/9、10/10，通过 |
| R7 J01–J07 | 1/7；J01–J06 失败，J07 通过，exit 1 |
| R7 K01 | 1/1，通过 |

数字含重叠场景，不相加为独立覆盖量。完整命令、原始输出及边界见 [verification.md](verification.md)。[coverage-audit.md](coverage-audit.md) 核对交付表中仍缺少的断言，以及未完成的 DDL 来源与文档同步要求。

下一轮直接使用 [R4-B.3 实现提示词](next-agent-prompt.md)。出口仍是原数据包：四类问题关闭、必要正反例通过、原 B 矩阵以真实断言补齐、旧夹具修正有来源。不增加附件、Web、正式评审或 Agent 调度任务。R4-B 验收后再独立执行 [R4-C](../2026-09-28-m0-m1-r4/follow-up-contracts.md)。
