# 第三次复核：c4f041f

日期：2026-09-28。审查提交：`c4f041f899cf3224d42deeb3ecfc19cf379368f7`。

**结论：上一轮的具体反例已修复，但 R2.1–R2.6 的全部要求并未完成，仍应暂缓 M2.1。** 下一步是三个有明确出口的修复包，详见 [下一轮提示词](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/next-agent-prompt.md)。这些任务集中于已实现功能，没有新增研究论坛能力。

本轮的实际进展值得保留：51 项正式测试及两轮 35 项旧检查全部通过；CLI 发布/修订/撤回恢复；随机持久密钥、checkpoint 身份绑定、中文标题长度、Pi 抛错、关系事件过滤和脱敏回滚反例均修复。MCP 现在正确发布 8 个启用工具。没有证据要求推倒重写。

但“检查脚本通过”被扩大成了“任务包全部完成”。本次针对上轮明确要求的重放、旧库升级、权限交集、脱敏事件、运行中取消补查，共有 11 项定向断言未满足；它们归属于下列几个根因，不能理解为随机失败率或 11 个独立新功能。

本次只新增本目录的审查文档和脚本，未修改产品、正式测试、既有 observed、进度声明或真实用户数据库。没有调用模型、安装宿主、修改全局配置、启动其他 Agent。

## 一、复测结果

| 项目 | 本次实际结果 | 边界 |
|---|---|---|
| `pnpm build` | 通过，9 个 workspace 包 | 当前依赖环境，未做空缓存安装 |
| `pnpm typecheck` | 通过 | 现有本地类型，不代表 Pi 官方类型编译 |
| `pnpm lint` | 通过 | 仍是 `tsc --noEmit`，不重复计算为独立静态检查 |
| `pnpm test:all` | 9 文件、51 项通过 | 真实执行，包括 CLI 和 MCP stdio 子进程 |
| 第一轮 behavior / adapters 探针 | 15/15、5/5 | 真实复测 |
| 第二轮 remaining / CLI 探针 | 12/12、3/3 | 真实复测，原始结果未覆盖 |
| 本轮 `check-invariants.mjs` | 10 项运行完成、10 项不满足预期 | 文件库、Fastify inject、受控 fetch fixture |
| 本轮 `check-serve-version.mjs` | 1 项运行完成、不满足预期 | 真实构建后 CLI，临时回环端口 |

后两项退出码 1 是断言失败，不是脚本或监听权限错误。两轮旧脚本中有硬编码的旧 `reviewed_commit`，本次执行对象以这里和 verification.json 的真实 HEAD 为准。后续应让验证记录自动读取实际提交，且记录是否存在未提交变更。

## 二、仍阻止验收的事实

### R3-F01 / P1：空空间范围在枚举与直接读取中含义相反

位置：[AuthService](/Users/sakimi/Desktop/Detuned/packages/core/src/services/auth-service.ts:102)、[空间列表过滤](/Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/sqlite-storage.ts:269)。对应 R2.2 的范围交集要求。

**T04 实测：**一个有空间成员身份、带 read/write 的凭据，设置 `allowed_space_ids=[]` 后，GET /spaces 返回 0 项，但直接 GET 该空间的 context 返回 200。

列表已把空集当作“不允许任何空间”；core 仍把 `length===0` 当作无限制。这会绕过凭据对该身份已有成员空间的进一步限制。修复应统一授权语义，不能只让列表隐藏内容。

### R3-F02 / P1：脱敏仍没有完整的事务业务入口和重试语义

位置：[redactions 路由](/Users/sakimi/Desktop/Detuned/packages/server/src/routes/admin.ts:204)、[存储操作](/Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/sqlite-storage.ts:1258)。对应 R2.3 的第 5 项。

**T05 实测：**同一目标、同一正文、同一 Idempotency-Key 脱敏两次，得到两个不同 redaction_id、2 条审计、0 条 `post.redacted` 事件。

本轮 SQLite 事务有效解决了“审计失败但内容已擦除”的反例。不过路由仍直接调用 storage，幂等键只检查存在而不使用，也没有追加事件。其他客户端无法通过事件得知其本地内容缓存需要删除。应将权限、结果引用、审计和失效事件一起纳入 core 的一次幂等业务事务。

### R3-F03 / P1：引用化之后，幂等响应出现丢字段、版本漂移和旧格式错误

位置：[引用提取](/Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts:6)、[关系重建](/Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts:150)、[旧空间结果解析](/Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts:162)。对应 R2.3 的第 1–4 项。

- **T01：**同键重试一次 resolve，首次有 resolution，重试后消失。代码保存 `resolution_id`，重建却读取 `parsed.resolution`，没有查询保存的记录。
- **T02：**创建主题后修改标题，再重放原创建，返回版本 2 和新标题，原操作是版本 1。引用中没有记录 thread 的操作版本，直接读了可变的最新行。此项也说明固定操作结果与当前对象状态尚未区分。
- **T03：**将合法 space.create 记录恢复成旧版真实使用的完整 JSON 形状，再重放，返回 500 / TEMPORARILY_UNAVAILABLE。旧 `revision` 是对象，新分支直接把它当 SQL revision 参数。

`extractResultRef` 还通过对象形状猜操作，无法识别直接返回的 Thread/Post/Relation，最终 fallback 仍是整个 JSON。新的引用方向正确，但不能以“多数帖子不再缓存正文”证明所有操作均正确。

应采用按操作定义的可判别结果引用，穷尽处理创建/修订/撤回/解决/重开/脱敏等返回类型；固定操作版本与可变状态分别处理，查不到记录要有确定错误，不伪造成功墓碑来吞掉不一致。旧格式应迁移或经明确解码处理，不混用对象与整数。

### R3-F04 / P1：初始化修复不等于旧库迁移，版本保护有两条遗漏路径

位置：[bootstrap](/Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts:32)、[CLI serve](/Users/sakimi/Desktop/Detuned/packages/cli/src/index.ts:170)。对应 R2.1 和 R2.6 的升级演练要求。

- **T06：**在自建的逻辑 v1 库中保留合法管理员、凭据、业务记录和旧 JSON 缓存，移除旧版没有的 instance_metadata；执行 bootstrap 后新增 1 个管理员凭据、返回新 admin token，旧正文缓存仍在库中。这是把升级当成新初始化，没有执行旧幂等记录迁移。
- **T07：**对 schema version=999 的自建库调用 bootstrap，虽然最终拒绝，但拒绝前先执行 SCHEMA_SQL，已新增 26 张表（含 FTS 内部表）。版本检查发生得太晚。
- **T11：**给当前正常初始化的临时库加上 version=999，真实执行 `detuned serve`，服务仍成功监听，直到审查脚本主动 SIGTERM 停止。serve 没有进行 schema 兼容性检查。

T06 是结构/序列化形状对应旧版的隔离 fixture，不冒充运行过完整旧版本二进制升级。它足以反驳“已完成历史缓存迁移”，但正式验收还应覆盖 a6c437d、fa1b35c、c4f041f 各版本的 fixture 及关闭重开。

旧缓存仍含正文是数据库存储/迁移缺口；本轮旧探针覆盖的 HTTP 脱敏路径已通过，不能把两者混写成那些 API 仍泄漏。另有两份 DDL 已漂移：schema.ts 新增 instance_metadata，schema.sql 没有。需要一套实际的有序迁移来源与所有启动入口共用的只读预检。

### R3-F05 / P2：ACL 失效只阻止 poll，未阻止同批 ACK

位置：[ACK](/Users/sakimi/Desktop/Detuned/packages/core/src/services/event-service.ts:274)。对应 R2.2 第 5 项。

**T08 实测：**poll 生成待确认 batch 后，把该成员从 contributor 改为 observer，空间 acl_epoch 已更新；再次 poll 返回 409 RESYNC_REQUIRED，但同一旧 batch 的 ACK 返回 200。

这不是声称完全被撤权的人仍能读取内容；它证明同一消费者的权限版本失效在两个操作里不一致。应按已声明的 ACL epoch 规则统一验证，并保证失效 ACK 不推进进度。无需借此扩展完整 M3。

### R3-F06 / P2：Pi 运行中取消仍丢失，HTTP 读正文阶段也不受取消保护

位置：[callTool](/Users/sakimi/Desktop/Detuned/packages/client/src/client.ts:380)、[HTTP 清理时机](/Users/sakimi/Desktop/Detuned/packages/client/src/client.ts:108)、[现有取消测试](/Users/sakimi/Desktop/Detuned/tests/contracts/m0-m1-r2-adapters.test.ts:47)。对应 R2.5 第 3 项。

- **T09：**调用实际注册的 Pi tool，等 fetch 开始后取消。fetch 的 signal 未被取消，tool 最后仍成功 resolve。adapter 虽把 opts.signal 传入 callTool，但 callTool 只做了开始前检查，调用各 HTTP wrapper 时把 opts 丢了。
- **T10：**直接使用带 signal 的底层 client.request，等响应体开始读取后取消。fetch signal 仍未取消，调用仍 resolve。timeout/abort 监听器在拿到响应头后就被清理，而 JSON body 尚未读完；JSON 读取异常还会被 catch 成 null。

当前正式测试仅覆盖调用前已 abort。它不能证明进行中取消、重试退避中取消或响应体阶段取消。修复必须贯穿各 wrapper，取消和 timeout 的生命周期覆盖读取正文及退避，用户取消不得触发新重试。

本轮重新核查 [Pi 官方扩展文档](https://pi.dev/docs/latest/extensions)：官方提供 ExtensionAPI 类型与 execute 抛错规则。抛错已修好，但 adapter 依旧使用手写 PiExtensionContext，没有官方 SDK 依赖或直接类型校验；compatibility 中“官方契约通过”的整体表述仍过度。真实宿主可继续 not_tested，已做的 fixture 应明确命名。

## 三、上轮任务书里仍缺证据的交付项

以下为源码/目录核查，不冒充本轮动态反例：

| 上轮要求 | 当前状态 | 下一步处理 |
|---|---|---|
| 已实现 admin/relations/events 的公共 schema | 路由仍以 req.body 类型断言为主，未挂完整 schema | 在修相应入口时补齐；用接口矩阵列出遗漏 |
| Pi 官方 SDK 类型编译 | 仍是自定义宽松接口 | 接入官方固定版本，或撤回支持声明并保留 M4 缺口 |
| 版本迁移、DDL 单一来源 | 只登记 version=1，新增 DDL 未同步另一份来源 | R3-B 完成真实迁移 |
| CI 与工具链固定 | 没有 .github/workflows；package.json 无 packageManager，engines 仍是宽范围 | 不得称“固定 pnpm CLI”；交付机器可执行的约束和 CI |
| OpenAPI 与已启用路由一致 | 本提交没有对应生成/契约更新 | 在路由 schema 收口时同步验证，不以路径数量代替 |
| 并发、旧库升级、活锁争用 | 新测试主要对应已有单条探针，未提交完整演练证据 | 对变更涉及的不变量补真实文件库/子进程验证 |

README 新句子称“文中的 HTTP/CLI 均已可用”，但其中仍链接大量 M2–M7 设计；结尾又保留“未初始化 Git/安装依赖”。docs/progress 同时保留 9 工具/8 工具描述。应按具体能力维护状态，避免一句全局结论覆盖未来计划。正式评审在 M6，外部检查在 M7，研究价值评估在 M8；不要将 forum_review 推迟到“M7/M8”后宣称仍遵循原路线。

## 四、下一步与范围控制

执行 [下一轮提示词](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/next-agent-prompt.md) 的三个包：

1. **R3-A：授权、脱敏与 ACK 业务边界**，验收 T04/T05/T08。
2. **R3-B：幂等结果和旧库升级**，验收 T01/T02/T03/T06/T07/T11。
3. **R3-C：取消链、契约和交付证据**，验收 T09/T10 及明确的 schema/兼容记录。

每包单独验证和交接，失败时继续当前包。不要再次用 11 个探针变绿代替整个任务包的出口条件；对每项写“完成/未完成/批准范围内延期”及真实证据。没有在此加入附件、向量库、Web、正式评审、调度器或真实模型研究。

四宿主完整实测、Pi 会话分支/inbox、M2.2 的完整知识视图、M2.4 context 预算、M3 完整运维按原路线保留。当前 shell PATH 仍未发现 dsh/Pi 命令，本轮也未运行任何宿主集成。不能以未安装宿主为由宣称完成官方类型验证，也不因缺少它们阻止无模型核心修复。

三个包通过并完成旧库升级证据后，再评估 M2.1。M2.1 仍仅为流式附件、哈希、配额、下载授权与孤儿清理；本轮不实施。

## 五、复现材料

- [不变量复现脚本](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs) 与 [原始结果](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/observed.json)。
- [真实 serve 版本检查](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs) 与 [原始结果](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/observed-serve.json)。
- [本轮验证记录](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r3/verification.json)。

```sh
cd /Users/sakimi/Desktop/Detuned
pnpm build
node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs
node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs
```

第二条脚本需要本机临时端口权限。全部使用自建临时数据并清理；修改接口后应等价更新复现方式，但不能覆盖本次 observed。原方案 SHA-256：`82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`，保持不变。
