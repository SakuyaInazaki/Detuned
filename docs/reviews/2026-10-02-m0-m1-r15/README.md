# R15：B.4-3 独立复核

日期：2026-10-02（Asia/Shanghai）。审查对象：**M0/M1-R4-B.4-3：结构预检与原 B 验收证据（含 R14 前置补项）**。

**结论：单元 A 已通过本次复核，L03 的原反例也已修复；B.4-3 整体未通过，暂不进入 R4-C。** 136 项正式测试和全部 22 条既定命令的运行结果属实，但新增结构检查发现损坏库仍可被接受，其中一类会被重新初始化、覆盖已有 secret。DDL 单源尚未覆盖迁移定义，B01–B12 的交付表也不能证明全部子条件已经完成。

下一任务：[M0/M1-R4-B.4-3R：完成结构判定、迁移 DDL 复用与真实验收证据](next-agent-prompt.md)。保留已通过的关系历史修复，集中完成本包剩余要求。

## 已确认的进展

| 项目 | 独立结论 |
|---|---|
| R14-F01 / X03 | 关闭。未来版本在降级前被拒绝；X01–X03 全通，合法缺历史对照保持；共同已知事实检查也逐条验证完整项的历史状态 |
| V01/V02 正式入口覆盖 | 已补齐 HTTP 重放、真实迁移拒绝、关闭重开后的全库逻辑快照。上轮这项补测要求已完成 |
| W01–W03 及旧兼容行为 | 保持通过，没有复现初始帖形状回退 |
| L03 原复合主键丢失反例 | 已修复；L01–L08 为 8/8。不能由此推出整个结构预检已经完整 |
| SQL → TS 常量生成 | 有实质实现。独立临时副本试验确认 SQL 改动进入生成常量和编译产物，删掉副本 src 后仍可导入运行时常量 |
| 测试及执行归档 | 136/136、11 文件、B 72/72；最终 22 命令全部有日志，21 个 exit 0，仅 R4/U05/U06 为 exit 1；G/H/J/K 本轮没有漏跑 |

基线 HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，加已有未提交实现。原 83 个产品/测试文件中 5 个改变，另有 2 个新增构建脚本；R15 [baseline.json](baseline.json) 将共 85 个文件纳入指纹。审查者未修改产品代码或正式测试。

## R15-F01（P1）：初始化材料与版本事实仍可被错误修复

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 105–137 行的空结构分支，以及 149–180 行的 v2 分类分支。

**Y02：完整表结构中已有 `initialized=true` 与持久化 secret，但迁移行、管理员主体及四张计数表为空。** 当前只统计 spaces/posts/credentials/actors，未检查初始化材料就返回 `blank`。实际结果：

- 直接 bootstrap 与 `openAndCoordinateDatabase(..., 'init')` 接受输入，`isNewInstance=true`，发出新的管理员 token，覆盖原 secret；关闭重开后逻辑快照改变。
- serve 分支因 blank 返回 404“尚未初始化”，未修改库；其分类及建议 init 仍不正确。这个输入应是材料矛盾的损坏库，三个入口都应拒绝且保留原数据。

**Y03：健康、已初始化、尚无讨论内容的 v2 库只删除 migration version=2 行。** 当前因为存在 `thread_versions` 就认作 `current_initialized`，bootstrap/init/serve 均重新插入 version=2，未先拒绝版本记录与结构的矛盾；重开快照改变。本变体不增发 token，与 Y02 的后果不同。

Y02 的已有密钥被覆盖是 P1 的主要原因。这些都是主动构造的损坏库，不是普通 HTTP 请求可提交的参数，也没有证据表明用户实际库已受影响。应修复分类规则，不提供自动修复或重新初始化绕过检查。

修复时注意：正式 B06 目前在调用前手工创建 `thread_versions` 却保留 v1 版本行，以便挂故障触发器。严格预检后，它可能先被拒绝而根本没命中写故障。应把该**正式测试**的故障注入放在合法迁移创建表之后，沿用独立 G03 已验证的办法；不能为了通过 B06 继续允许此类矛盾库。历史探针与输出保留不变。

## R15-F02（P2）：结构比较遗漏实际约束和虚拟表语义

位置：[schema.ts](../../../packages/storage-sqlite/src/schema.ts) 1648–1697 行的外键/索引比较、1709–1714 行的 FTS 检查。

Y01 使用四个独立变体，每个都通过 bootstrap/init/serve 三个入口验证：

| 损坏结构 | 实际结果 | 已验证的影响 |
|---|---|---|
| 移除 credentials.token_hash 全局 UNIQUE，改成相同列的 `UNIQUE INDEX ... WHERE 0` | 分类为 current_initialized，允许启动 | 启动后实际能插入重复 token_hash，完整唯一约束已经失效 |
| `idx_events_space_seq` 保留名字和列序，改为 `WHERE seq < 0` 的部分索引 | 允许启动 | 部分索引被误当作规范中的完整索引 |
| credentials 外键从默认动作改为 ON DELETE CASCADE | 允许启动 | 外键动作差异未被检查；本次未执行删主体动作 |
| 将 post_fts 替换成同名普通表 | 允许启动 | 真实 HTTP 搜索由健康夹具的 200 变成 500 TEMPORARILY_UNAVAILABLE |

这些入口调用后逻辑快照保持，不代表检查合格：本组要求拒绝，而当前都接受。重复 token_hash 的插入和搜索调用属于隔离夹具中的后续影响验证，发生在入口重开快照比较之后。

根因是索引描述只保留 unique 和 `index_info` 列名，忽略 partial/predicate、排序/校对等定义；外键只比 from/table/to；FTS 只验证存在名为 post_fts 的 table。需要比较受支持 DDL 的实际语义，不能只增加四个字面值判断。Y04 的五类健康/历史正例必须继续通过。

## R15-F03（P2，未完成的工程要求）：迁移 DDL 仍有独立手写来源

`generate-schema.mjs` 确实生成 [schema.ts](../../../packages/storage-sqlite/src/schema.ts) 的 `SCHEMA_SQL` 区块。但 [bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts) 509–545 行仍另写 `schema_migrations`、`instance_metadata`、`thread_versions` 的 CREATE TABLE，升级 v1 时没有从唯一源复用这些定义。约 1300 行结构描述也不在当前生成脚本的同步范围内。

因此“SQL 与 TS 常量同步”通过，但上一任务 B3 要求的新建/升级共用当前新增对象定义尚未完成。本项是静态审查确认的范围缺口，**不声称当前健康库已发生 DDL 升级失败**。独立 [构建正例](observed-ddl-build.json) 证明生成和编译链已有效，不应推翻这部分成果。

当前 `storage.test.ts:172` 的健康新建/升级等价测试仍只比 `index_list`，没有比较索引实际键列/表达式/顺序等定义。完成 DDL 复用后补齐这种语义等价验证；历史 v1 fixture 必须保持固定来源。

## R15-E01：验收表与实现证据仍不一致

详见 [coverage-audit.md](coverage-audit.md)。最影响验收的三点：

1. 交付 B01 表列出未实现的 `decision.publish`、`evidence.attach`、`export.create`，漏掉真实的 `space.patch`、`post.withdraw`、`relation.reopen`。正式 B01 仍主要验证首次写入及部分引用编码，未完成 11 族逐项重放；其 resolve/reopen 注释下没有调用 reopen。
2. B06 的 beforeSnapshot 没有被比较，也未关闭重开；B08 的 reopened 注释实际是同连接重试。其他独立探针有有效的故障/重开证据，应精确引用，不把它们归给这些函数。
3. 22 条最终命令和 48 个日志文件确实存在，不能据报告错误否定真实运行。V01/V02 两入口补齐和快照术语修正也有效。需重建按子条件的证据映射，区分已有证据与尚缺测试。

本次没有重新穷举原 B 全部场景；交付矩阵明显不足以支持“全部关闭”。下一提示词指定实际缺口和有效证据来源，避免重做已验证的内容。

## 验证范围与下一步

共执行 24 个不同验证命令：前轮规定的 22 个，加结构边界和隔离构建两个新检查。详见 [commands.json](commands.json)、[verification.md](verification.md)。Y 为 1/4：Y01/Y02/Y03 未通过，Y04 健康对照通过；DDL 构建正例通过。正式套件与探针有重叠，不相加为独立场景总数。

下一轮完成 **B.4-3R** 的 F01/F02/F03 与 E01 后再独立复核；当前仍保留 R4-C 的 U05/U06，未开始 M2。未运行真实 dsh/Pi/Codex/Claude Code 宿主、外部模型、远程 CI、全新依赖安装或用户真实数据库升级。原方案、历史审查与产品文件完整性见 [review-integrity.json](review-integrity.json)。
