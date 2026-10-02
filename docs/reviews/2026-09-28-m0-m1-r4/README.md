# M0/M1-R3 交付复核与 R4 任务交接

审查日期：2026-09-28。源码基线：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`。开始时工作区干净。本次只增加审查材料、复现脚本并校正状态文档，没有修改产品实现。

**结论：本轮有实质进展，但“三包全部完成、可以进入 M2.1”的结论不成立。** 62 项正式测试、此前 46 项审查探针均已独立复跑通过；补充检查得到 6 项失败、2 项通过。失败均对应上轮任务书已写明的条件，不是新增附件、评审、编排或真实模型需求。

建议下一个实现回合只领取 **R4-B：数据与升级可靠性**。其完成后再处理 **R4-C：请求/响应契约**，两者通过后再评估 M2.1。这样每个回合有可核对的范围，不再把几个未完成的包一并写成完成。

- [下一轮完整提示词：仅 R4-B](next-agent-prompt.md)
- [后续 R4-C 任务书：本回合不执行](follow-up-contracts.md)
- [实际检查命令、环境及边界](verification.md)
- [新增检查脚本](check-unfinished-contracts.mjs) 与 [原始结果](observed-unfinished-contracts.json)

## 交付声明核对

| 声明/包 | 复核结论 | 实际证据与边界 |
|---|---|---|
| build / typecheck / lint | 通过 | 本机 Node 26.3.0、pnpm 11.7.0；lint 仍是 `tsc --noEmit` |
| 10 个文件、62 项正式测试 | 数量和结果属实 | [完整输出](observed-tests.txt)；新增 11 项恰好对应上一轮 T01–T11 |
| 旧探针 46/46 | 属实 | 本目录六份 `observed-r*.json`；与正式测试有重复，不累加为唯一测试数 |
| R3-A 权限/脱敏/ACK | 关键修复得到验证，应保留 | 旧 T04/T05/T08 通过；新 U07 验证全部 25 个修订，新 U08 验证事件/幂等插入失败时整体回滚。这不是对所有权限组合的完整证明 |
| R3-B 幂等/升级 | 未完成 | U01–U04 失败；仍有任意 JSON fallback、无版本推进的转换、初始化与凭据状态混用 |
| R3-C 取消/契约/交付 | 部分完成 | 运行中和 body 阶段取消通过；官方 Pi 类型已引入；U05/U06 失败，部分 HTTP schema 未挂载 |
| Pi 官方类型编译 | 可以认可，范围需准确 | 确实导入 `@earendil-works/pi-coding-agent@0.87.1` 的 ExtensionAPI / ExtensionCommandContext，且构建/类型检查通过；`parameters` 仍有 `as any`，不等于所有 schema/宿主行为通过 |
| CI | 已有工作流，远端执行未验证 | 配置使用 Node 22，本次实测 Node 26.3.0；没有远端 CI 记录，不报告其通过 |
| init/serve 自动升级 | 声明不准确 | 当前转换只由 bootstrap 调用；serve 仅检查 max(version) 和 initialized，随后构造 storage/app，没有执行迁移 |

## 已复现的未关闭项

### R4-F01 / P1：迁移吞掉写入错误并留下部分转换

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，主要为 28–101 行与 120–130 行。

U01 在临时文件库放入两个旧格式完整响应，对第二条 UPDATE 注入 SQLite `RAISE(ABORT)`。调用 bootstrap 后关闭并重开数据库，实际结果：没有报错，第一条已转换，第二条仍保留正文，迁移版本仍为 1。转换循环的 catch 同时吞掉 JSON 错误和 SQL 写入错误，外围也没有原子迁移事务。

这会让服务在混合格式和部分升级状态继续运行。修复需要真实有序迁移、结构预检、事务、完整性校验和失败诊断；只扩大 JSON 匹配分支不能关闭它。serve 绕过迁移也是同一升级入口问题，后者本次为源码核查，未新增真实 serve 升级演练。

对应上轮 R3-B 第 4、6、7 项及“迁移失败回滚”矩阵。

### R4-F02 / P1：旧引用重试混入后来的关系版本

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，主要为 165–190 行；旧引用转换缺失也在 bootstrap。

U02 使用从 `git show c4f041f:.../idempotency-service.ts` 核对的原始格式：`{$ref:'relation', relation_id, resolution_id}`。先 resolve 到 v2，再 reopen 到 v3，升级并重开文件库后用原键重试 resolve，返回 **relation v3/open + resolution v2/resolve**，状态码 200。

恢复 resolution 本身已修好，但旧引用没有补足操作版本，重建仍回退到当前 relation。必须从不可变 resolution 恢复该次操作版本/状态。其他历史数据若确实无法恢复，要明确标为不可重放并解释，不能拼接成成功。

对应上轮 R3-B 第 2、3、4 项。fixture 为来源明确的逻辑格式 fixture，不冒充旧二进制完整升级。

### R4-F03 / P1：撤销全部凭据后，init 重新签发管理员令牌

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)，12–25、135–166、183–195 行。

U03 在已初始化的自建数据库撤销全部凭据：`isDatabaseInitialized()` 变成 false，再执行 bootstrap 新增 1 个管理员 credential，返回新 token，并报告新实例。初始化完成标记明明仍在，却被凭据状态覆盖。

这是**本地初始化/恢复语义错误**，本次没有发现或声称存在远程无认证提权。普通 init 不应隐式承担管理员恢复；即使所有凭据失效，实例身份与初始化事实仍应保留。凭据恢复应有单独、受控的本地流程和说明。

对应上轮 R3-B 第 5 项“初始化完成与当前管理员凭据是否撤销是不同事实”。

### R4-F04 / P2：未知结果引用被原样返回为成功

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts)，提取结果的默认 fallback 与 214 行 `return parsed`。

U04 将一条自建幂等记录改为未知 kind/version，再按原键重试。服务返回 201，data 就是未知引用对象，没有业务实体或错误。当前实现没有版本化、可穷尽的结果解码；直接返回 Thread/Post/Relation 的写操作也继续走完整 JSON fallback。

修复范围是全部已实现操作的结果类型与固定版本重建。未知格式、缺失历史、真实脱敏必须区分，不能用任意 JSON 或临时拼出的 `[REDACTED]` 成功对象掩盖数据损坏。

对应上轮 R3-B 第 1、4 项。与 F02 一起修复，不增加另一套缓存框架。

### R4-F05 / P1：非法关系类型得到 201 并写入三类状态

位置：[relations.ts](../../../packages/server/src/routes/relations.ts)，14–28 行；[relation-service.ts](../../../packages/core/src/services/relation-service.ts)，87–112 行。

U05 使用合法身份、空间和精确帖子引用，只将 type 设为 `not_a_relation_type`。实际返回 201，新增 1 条 relation、1 条 event、1 条幂等记录。`CreateRelationRequestSchema` 已存在，却未用于路由；TypeScript `as` 不检查运行时输入，core 与数据库也没有拦住该值。

应把已启用路由的公共 schema 真正接入校验，并保持核心业务边界的枚举/状态不变量。坏类型、额外业务字段和错误引用应返回稳定 4xx 且不落状态。不能通过客户端过滤来修复 HTTP 写入口。

对应上轮 R3-C 第 5 项。下一回合 R4-B 暂不修改这一独立模块，随后由 R4-C 关闭；仍是 M2.1 前置条件。

### R4-F06 / P2：截断的 HTTP 200 JSON 被当作成功

位置：[client.ts](../../../packages/client/src/client.ts)，121–138 行。

U06 用 Node 原生 `Response('{"data":', {status:200})` 验证 JSON 解析失败，没有网络或模型。`maxRetries=0` 时 Promise 实际 resolved，data 为 undefined。catch 只在非 2xx 时重新抛错，因此“未发生取消但 body 已损坏”的分支仍误报成功。

必须让解析失败以失败结束，并让 CLI/MCP/Pi 看到失败。取消、超时、解析失败的分类与有界重试也要保持一致；写入结果不确定时仍复用原幂等键。

对应上轮 R3-C 第 2、3 项。由 R4-C 关闭。

## 还需落实的既定设计条件

这些是对上轮任务书与当前源码的差异记录，**不算新增的动态反例或额外通过数量**：

| 条件 | 当前事实 | 归属 |
|---|---|---|
| 可判别结果引用、无任意 fallback | 仍使用形状猜测和任意 JSON；thread 标题直接写入 result_ref | R4-B 的操作矩阵与最小不可变历史 |
| 真正迁移版本、单一 DDL | 仍只写 version=1，schema.sql/schema.ts 两份 DDL | R4-B |
| init/serve 共用升级入口 | serve 没有调用迁移 | R4-B |
| 持久实例密钥读取失败要报错 | getInstanceSecret 捕获读/写异常后可返回无法持久化的随机 secret；app 也有动态探测 fallback | R4-B，沿用上轮第 8 项 |
| 取消清理与错误分类 | backoff 的匿名 abort listener 成功后未移除；用户取消和 timeout 均抛普通 Error；交付回复所称“真实 AbortError”不准确 | R4-C，补定向测试再修 |
| 已实现 HTTP 端点清单 | admin/relations/events 等仍有无 schema 路由；OpenAPI/公开契约没有随本轮补齐 | R4-C |
| 工具链版本证据 | 根 engines 为 Node >=22.0.0；本地官方 Pi 0.87.1 package 声明 >=22.19.0。需要准确说明适配器/开发工具链下限 | R4-C 文档与 CI；不据此宣称现有 CI 已失败 |

## dsh / Pi 核查范围

本次重新读取 [Pi 官方 Extensions](https://pi.dev/docs/latest/extensions)，并核对已安装 `0.87.1` 的 package.json、`dist/core/extensions/types.d.ts` 和 `docs/extensions.md`：官方 ExtensionAPI 导入、execute 抛错、signal、content/details 的路线成立。官方区分 TUI/RPC/无 UI 模式，类型编译不能代替这些运行验证。当前真实宿主仍为 not_tested。

重新读取 [dsh 官方 MCP 客户端说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)：继续采用官方 MCP 客户端和 Detuned stdio 桥；stdio 可能先启动探测进程，启动不得产生论坛业务写入；不能依赖 MCP prompt templates。本轮未运行 dsh，不改变宿主支持状态。

加载、类型检查、工具发现、受控本地 HTTP 调用可与真实模型推理分开验证；“没有调用付费模型”不能笼统解释所有宿主/适配验证缺口。四宿主的完整接入仍按 M4 处理，不升级成本轮新前置任务。

## 下一步与验收停止点

1. **现在执行 R4-B**：关闭 F01–F04 和对应既定矩阵，保留 A 的已验证行为；具体步骤见 [可直接交给 Agent 的提示词](next-agent-prompt.md)。
2. **之后执行 R4-C**：关闭 F05/F06，补齐已启用路由与客户端完整取消/失败生命周期，见 [后续任务书](follow-up-contracts.md)。
3. 两包独立验收后才领取 M2.1。M2.1 仍是流式附件、哈希、配额、下载授权和孤儿清理。无向量库、模型调度或研究跑分任务。

不要求重写论坛架构、重做已通过的 R3-A，也不要求现在启动四类真实宿主。若实现者只完成上述一包，应明确报告该包完成和剩余项，不能把整体 M0/M1-R3 或 M2.1 就绪状态一并改绿。
