# R4-B.1 交付复核：具体反例已修复，数据包仍未验收

日期：2026-09-28。**结论：继续完成 R4-B，下一任务为 R4-B.2；暂不进入 R4-C 或 M2.1。** 本次没有增加产品功能要求，下面的问题均对应原 R4-B / R4-B.1 的既定条件。

审查对象为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` **加工作区内未提交实现**。HEAD 没有变化，不意味着实现没有变化；本轮源码、测试与配置共 81 个文件的指纹见 [baseline.json](baseline.json)。原有未提交工作全部保留，本次不修改产品代码或正式测试。

- [下一轮可直接交付的 R4-B.2 提示词](next-agent-prompt.md)
- [验收声明与实际覆盖核对](coverage-audit.md)
- [验证记录与命令](verification.md)
- [补查脚本](check-upgrade-boundaries.mjs)及[原始结果](observed-upgrade-boundaries.json)

## 已确认的进展

| 检查 | 本次实际结果 | 结论范围 |
|---|---|---|
| build / typecheck / lint | 全部退出 0 | lint 仍运行 TypeScript 检查，不代表独立格式检查 |
| 正式测试 | 11 文件，75/75 通过 | 交付中的测试数字属实 |
| R1–R3 探针 | 46/46 通过 | 已有行为没有在这些检查中回归 |
| R4 U01–U08 | 6/8 通过 | 仅 U05/U06 失败，按计划属于 R4-C，不作为拒绝本包的理由 |
| R5 G01–G09 | **9/9 通过** | 上轮九个具体反例均修复 |
| 本轮 H01–H10 | **1 通过、9 失败** | 失败合并为下述五类；H10 的两个故障阶段均通过 |

有效修复包括：新建 relation.create 的直接重放固定版本；缺失主题历史不再伪造成功；直接 Relation/Post 旧结果能够迁移；历史 INSERT 和损坏 JSON 能中断升级；未知无关表库被拒绝；已初始化标记保留时缺少 secret 会拒绝；CLI 对这些启动失败能释放锁并输出结构化错误。

此外，本轮 H10 独立验证了**版本行与 metadata 的真实 SQLite 写入失败**，两者均命中故障并在关闭重开后恢复原逻辑状态。这是对现有外层事务修复的补充确认，不应重做已经有效的事务部分。

## R6-F01 / P1：原操作结果仍在旧格式和关联对象路径中漂移

源码：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 145–164、335–350 行；[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts) 738–745、778–801 行。

**H01：升级上一轮实际生成的引用。** R4-B 保存的 `relation.create` 引用只有 `{v:1, kind:'relation.create', relation_id}`。创建关系得到 v1/open，再 resolve 为 v2/resolved；将这条历史引用交给本轮升级器，关闭重开后重试原创建键，得到 **201、v2/resolved**。迁移器从当前 relation 填入缺失版本和状态，永久写下了错误的“历史”。附加的旧 `$ref` codec 形态也有相同行为；它不作为实际旧二进制 create 返回形态的证明。

**H02：无需损坏库，正常 HTTP 就能复现。** 使用注入时钟在创建主题后推进一分钟并修改标题，重试创建返回 v1 与原标题，但 `updated_at` 已变成一分钟后的值。同一检查中，创建带 challenges 引用的帖子，再 resolve 该关系，重试原发帖请求得到的 `relations[0]` 从 **v1/open 漂移为 v2/resolved**。修复仅覆盖了独立 relation.create，没有覆盖它作为发帖结果的一部分。

要求来自 R4-B 第一步 4–5、R4-B.1 第二节 1–5：原操作版本、时间、关联结果要固定。已知旧格式确实无法恢复时可以明确不可重放；不能用当前对象补历史，也不能将新建数据一律拒绝来绕过重建。

## R6-F02 / P1：当前实例损坏仍被误判为旧库或健康库

源码：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 30–120、458–482、539–546 行。

**H03：当前 v2 库丢失 metadata。** 保留 schema v2 与现有业务数据，仅删除 instance_metadata。分类器因存在 human actor 将其判为 `supported_legacy`；serve 协调入口成功，重新生成了不同的 token_secret。这里没有增发管理员凭据，但实例密钥已经被静默替换，违反当前实例材料损坏应拒绝的要求。

**H04：结构和版本标记缺失。** 删除必需的 post_revisions 表，分类器仍返回 `current_initialized`，init 协调入口报告成功，表依旧缺失。仅保留 schema_migrations 的 v2、删除 v1 行，则启动成功并回填 v1，未按矛盾版本标记拒绝。

五个核心表名、max(version) 和一个 human actor 不能证明实例结构合法。必须核验已支持历史结构与版本组合；真正从未有过 metadata 的旧版本可升级，当前实例丢失材料不能走相同分支。

特别需要修正正式 B08：它从**当前 v2 库**删去 metadata，却断言应升级成功。这一测试把本次缺陷编码成了期望行为；应拆成真实旧结构成功、当前结构损坏拒绝两个案例。原要求已明确区分这两种情况。

## R6-F03 / P1：迁移输出未统一校验，冲突历史被静默舍弃

源码：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 145–170、173–228、277–323、420–440 行。

**H05：两个不合法输入都提交了升级。**

- 带 `v:99` 的旧 `$ref:'post'` 形状绕过版本检查，被转换成 v1/post，schema 升级到 v2。
- thread.create 记录放入旧 Post 完整结果，迁移器按形状转换成 kind=post，照样提交 v2；该输出随后连它自己的 validateResultRef 都无法通过。

**H08：同一历史主键的数据矛盾。** 当旧完整 Thread 响应与已存在的 thread_versions 同版本标题不一致时，迁移器只检查“是否有行”，不检查内容一致性；它舍弃旧完整结果并返回成功。重试原键后返回 **201 和矛盾标题**。

SQL/解析错误已能触发回滚，但**未被校验发现的错误数据仍会作为成功结果提交**。需要先检查格式版本及 operation，再解码历史形态，对所有转换结果和历史实体关系执行同一约束，冲突或非法输入中止整笔升级。合法但确实缺失历史的记录才能使用不可重放标记。

## R6-F04 / P2：引用验证与重放缺少可选字段、目标和完整性检查

源码：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts) 67–98、111–159、170–202、714–846、894 行。

**H06：五种非法输入都通过 validateResultRef。** 包括未知 operation、前缀相似但未注册的 operation、负数 initial_post_revision、字符串 relation_ids，以及包含嵌套正文副本的额外字段。原因包括未知 operation 得到 null 后跳过匹配、startsWith 接受相似前缀、只验证部分必需字段、只排除顶层三个缓存字段。

**H07：目标和关联完整性没有进入重放校验。** 将某条已提交 PATCH 的引用改为另一个主题的 ID，重试原目标 URL 返回 **200 和另一个主题**；将发帖引用中的 relation_ids 指向不存在的关系，重试返回 **201 和空 relations**，因为 `.filter(Boolean)` 静默丢掉缺失对象。

H06/H07 是持久数据完整性测试，本次没有声称普通 HTTP 调用者具备修改数据库的能力。原任务明确要求解码时核对 operation/target/space 与必要关联，不能仅凭对象存在或 TypeScript 类型断言报告成功。

## R6-F05 / P2：升级诊断将旧正文复制到 CLI 输出

源码：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 416–417 行；[CLI index.ts](../../../packages/cli/src/index.ts) 51–73 行。

**H09 运行真实 CLI 子进程。** 在未知旧格式中放置合成正文标记，`init --json` 将标记写入 stdout；普通 init 将其写入 stderr。两者均非零退出且锁正确释放，但异常消息包含整个 resultRefStr，导致敏感正文可以进入终端和日志。

原 R4-B 与 R4-B.1 都明确禁止把旧正文/凭据/secret 写入诊断。错误应该只包含受控阶段、格式信息和非敏感定位，不应透传完整 JSON 或 JSON.parse 可能附带的原文片段。本次仅使用合成标记，没有读取或暴露用户真实研究内容。

## 验收证据仍需更正

这轮正式测试确实扩展了场景，特别是凭据过期/actor 禁用、独立并发请求和 25 修订脱敏。不能再把 B11 称为上轮的顺序请求测试。

但交付表仍有超出断言的内容：B06 没有比较声明的完整快照或重开库，B08 的“重开”注释下仍使用同一连接，B02 没有响应丢失场景且重开后仅重试主题，B01 没有测试所有操作的编码及重建。已有其他探针补足的部分应引用真实位置；H10 也可作为 metadata/版本故障的有效证据。详见 [逐项核对](coverage-audit.md)。

静态完成项也需准确表述：schema.sql/schema.ts 已有内容一致性检查，这有价值；但没有生成命令，bootstrap 中的手写 DDL 也未纳入同一来源/一致性验证。不能仅声明“单一事实来源”就认为这部分约束全部落实。

## 下一步

按 [R4-B.2 提示词](next-agent-prompt.md) 关闭上述五类缺陷，完成原 B01–B12 的断言证据。禁止通过放宽历史固定、损坏库拒绝或错误不泄露的条件来使探针变绿。

本包通过后再执行已有 [R4-C 任务书](../2026-09-28-m0-m1-r4/follow-up-contracts.md)。四类宿主实测仍保持未测试；本轮未涉及宿主接入代码，不扩大到 dsh/Pi 接入、模型调用、附件、Web 或 Agent 调度。
