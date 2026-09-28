# M0-R / M1-R 第二轮实现审查

审查日期：2026-09-28。代码基线：`fa1b35c80de02c1d601288847706495062935925`。这是对该提交和本轮 Agent 回复的复核；上一轮审查与 observed 文件保留原样。

**结论：本轮有实际进展，但不能认定 F01–F12 已全部闭环，也不具备直接进入 M2.1 的条件。下一轮先完成下述有限范围的根因修复。**

仓库原有 36 项测试和上一轮 20 项探针确实通过。不过，这些探针是最小反例，不是对上一轮任务书全部要求的证明。本轮补查相邻入口、正向兼容、故障回滚后，另有 15 个定向断言未满足。这些是有目的选择的反例，不是随机抽样的产品失败率，也不等于 15 个独立根因。

本次仅新增本目录的审查材料，没有修改产品实现、既有测试、进度声明或用户数据库。所有动态反例使用自建临时文件型 SQLite；CLI 使用回环地址临时端口。没有调用模型、安装宿主、改全局配置或启动其他 Agent。

## 1. 复测证据与真实进展

| 检查 | 本次结果 | 证明范围 |
|---|---|---|
| `pnpm build` | 通过 | 当前依赖环境内 9 个 workspace 包构建 |
| `pnpm typecheck` | 通过 | 当前本地类型声明；不等于官方 Pi SDK 类型验证 |
| `pnpm lint` | 通过 | 目前仍是各包 `tsc --noEmit`，没有独立 lint 规则 |
| `pnpm test:all` | 7 文件、36 项通过 | 实际运行；包含官方 MCP SDK 到构建后桥的 stdio 通信 |
| 上轮 `check-behavior.mjs` | 15/15 通过 | 原来那些特定业务反例 |
| 上轮 `check-adapters.mjs` | 5/5 通过 | 原来那些 schema、注册 fixture、工具发现反例 |
| 本轮 `check-remaining.mjs` | 0/12 满足预期 | 11 项当前行为检查，加 1 项应明确归入 M2.2 的类型化失败记录检查 |
| 本轮 `check-cli.mjs` | 0/3 满足预期 | 真实 CLI 发布、修订、撤回均失败 |

运行环境：Node `v26.3.0`，当前 `pnpm --version` 为 `11.7.0`，临时库 journal mode 为 WAL。没有进行从空缓存安装的验证；不能把本次 build 通过等同于全新机器可复现安装。

应保留的修复包括：跨空间脱敏拒绝、只读 token 写入拒绝、空间列表按凭据范围过滤、部分 HTTP body schema 接入、MCP schema 与真实 stdio 发现/调用、若干帖子操作的目标幂等范围、初始帖子引用持久化、ACK 与服务端 batch 高水位相等校验、部分订阅过滤、已死亡 PID 的基本锁恢复，以及 Pi 的命令双参注册和工具 label。

## 2. 当前需要修复的根因

### R2-F01 / P1：脱敏仍被历史响应绕过，且写入不原子

位置：[幂等保存与重放](/Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts:45)、[脱敏清理](/Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/sqlite-storage.ts:1269)、[路由直接调用存储](/Users/sakimi/Desktop/Detuned/packages/server/src/routes/admin.ts:249)。对应上轮 F06。

- **S01**：创建主题时带 `initial_post`，脱敏初始帖子，再用原键重放主题创建。返回 201，仍含原正文。
- **S02**：给普通帖子添加敏感标签，脱敏后重放其创建。返回 201，标签原文仍存在。
- **S10**：在临时库给 `redactions` 插入加失败触发器。接口返回 500，但帖子已经成为 `redacted`、正文已经被覆盖，审计记录为 0。事务没有回滚这些变更。

原因是 `result_ref` 仍保存完整响应 JSON，脱敏只识别最外层 `parsed.post`。主题创建的 `initial_post.post/revision` 被遗漏；现有清理也不覆盖 tags。这不符合 docs/04“只缓存对象引用与版本，重放时重新鉴权和应用脱敏”。另外管理路由绕过 core，在多条自动提交 SQL 之后才插入审计。

修复应采用可重建的结果引用、统一可见内容投影、旧记录迁移，以及包含业务状态、索引、审计、事件、幂等结果的事务。不要继续递归搜索 JSON 字段名来补洞。规范允许保留的不可变引用/哈希与需要隐藏的内容字段应明确区分。

### R2-F02 / P1：固定签名密钥和 checkpoint 身份绑定未修复

位置：[默认密钥](/Users/sakimi/Desktop/Detuned/packages/server/src/app.ts:47)、[checkpoint 签发](/Users/sakimi/Desktop/Detuned/packages/core/src/services/context-service.ts:37)、[订阅验证](/Users/sakimi/Desktop/Detuned/packages/core/src/services/event-service.ts:40)。对应上轮 F07。

- **S04**：使用源码中的默认密钥，签发 `seq=当前事件序号+10000` 的 checkpoint；接口返回 201，consumer 的 ack_seq 被直接设置到未来。
- **S05**：B 使用 A 正常获得的 checkpoint 建立订阅，同样返回 201；契约要求绑定 actor 与 space。

ACK 不能超过已持久化 batch 的修复有效，但 checkpoint 是另一个推进初始位置的入口。生产 CLI 的 `serve` 也没有传入其他密钥。

Agent 回复把原问题写成“Server 未暴露 TokenSecret”，并以向 Fastify 对象挂载 `tokenSecret` 作为修复。这误解了问题：需要消除可预测签名材料，不是增加读取密钥的入口。挂载对象字段本身不等于暴露 HTTP 密钥，但也没有解决原缺陷。

应使用实例随机持久密钥或数据库随机句柄；验证签名用途、actor、space、过期和合理高水位。旧固定密钥签发的 token 应失效并要求重新同步。对已经暴露的 ACK/POLL 路径补查 ACL 变更后的行为，不扩展完整 M3 平台。

### R2-F03 / P1：异议 resolve/reopen 的幂等仍漏掉目标资源

位置：[resolve](/Users/sakimi/Desktop/Detuned/packages/core/src/services/relation-service.ts:131)、[reopen](/Users/sakimi/Desktop/Detuned/packages/core/src/services/relation-service.ts:243)。对应上轮 F05。

**S03**：同一身份对两个不同 challenge 使用同一键、相同 `expected_version` 和理由引用。第二次返回 200，却返回第一个 relation；第二个仍是 open。

帖子相关 operation 已加入目标 ID，relation 仍使用固定 `relation.resolve`/`relation.reopen`，请求 hash 又没有 URL 目标。本次动态复现 resolve；reopen 同模式由源码确认，需补等价回归。合理行为可以是按目标分别执行，也可以在统一且明确的目标感知契约下返回冲突；绝不能假报另一个对象成功。优先沿用仓库已采用的按目标 operation 方案。

### R2-F04 / P1：严格校验打断正常 CLI，并误拒合法中文标题

位置：[CLI publish 转发](/Users/sakimi/Desktop/Detuned/packages/cli/src/index.ts:253)、[标题字节校验](/Users/sakimi/Desktop/Detuned/packages/core/src/services/post-service.ts:112)、[初始帖子与主题校验](/Users/sakimi/Desktop/Detuned/packages/core/src/services/thread-service.ts:111)。这是本轮新增校验产生的兼容回归。

- **CLI 三项**：真实子进程执行 post/revision/withdraw，全部退出码 2、`VALIDATION_ERROR`、`body must NOT have additional properties`。
- CLI 从 input 取出 `thread_id`/`post_id` 后仍把整个 input 发送到严格 HTTP body。body 中的 `request_key` 也应转为请求头并移除。
- **S08**：60 个汉字的标题被返回 400。契约是 title ≤160 Unicode 码点，而新增实现用 160 UTF-8 字节作为上限。正文的 64 KiB 才是字节限制。

保持服务端严格 schema；修正适配器参数拆分，不要通过允许任意字段或静默丢弃未知字段使测试通过。每个已实现写操作至少要有合法正例与非法反例。admin/relations/events 等路由仍缺少完整 schema，不能继续声明“所有公开接口已完整校验”；按已实现接口逐一核对。

### R2-F05 / P1：没有 read capability 的凭据仍可读空间内容

位置：[授权检查](/Users/sakimi/Desktop/Detuned/packages/core/src/services/auth-service.ts:155)。对应上轮 F02。

**S07**：给已有 contributor 身份签发 `capabilities: []` 的 token，读取 context 返回 200。当前只检查非 observer 操作所需的 write，读操作没有对应 capability 校验。

应按操作需求计算 capability、空间范围、当前 membership、对象可见性的交集。`allowed_space_ids=[]` 当前还代表无限定空间，这一语义应明确；建议空集合拒绝、`['*']` 才表示通配，升级时不得静默扩大旧凭据权限。未知 capability/role 必须 fail closed。

### R2-F06 / P1：bootstrap 失败后留下无法正常初始化的实例

位置：[bootstrap](/Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts:27)。对应上轮 F10 的初始化原子性要求。

**S11**：通过触发器让初始 credential 插入失败；关闭并重开文件库，移除故障后再 bootstrap，返回 `isNewInstance=false`、没有 token、凭据数为 0。原因是 human actor 先独立提交，重试只凭存在 human actor 就判定初始化已完成。

迁移版本行与死 PID 恢复解决了部分样例，不能代替初始化事务及升级检查。`init` 仍没有取得目录锁；`serve` 仍会自动 bootstrap 并丢弃返回的一次性 token；退出处理先释放锁而没有先等服务/数据库关闭。这三项由源码确认，本次未再做完整 CLI 生命周期故障矩阵。

应明确初始化完成标识，将身份/凭据/实例材料在事务内创建；已有损坏状态要有受控恢复方式。为旧版幂等记录升级提供真正的 migration runner，保留业务记录，不能靠删库恢复。

### R2-F07 / P2：订阅主题后反而收不到该主题内的异议关系事件

位置：[thread 事件筛选](/Users/sakimi/Desktop/Detuned/packages/core/src/services/event-service.ts:183)。对应上轮 F09。

**S06**：订阅 T 的 `relation.created`，再在 T 内的两个帖子之间建立 challenge。poll 不含该事件。分支仅处理 `thread.*` 与 `post.*`，其他类型全部跳过。

这是协作论坛的关键行为：关注者应能看到对材料提出、解决和重开的异议。应明确关系事件归属源主题/目标主题的规则并统一实现；无论跨主题策略如何，两端都在 T 内的事件不能被过滤掉。保留空匹配 batch 的确认语义。

### R2-F08 / P2：Pi 错误仍按成功返回，官方契约验证声明过度

位置：[自定义 Pi 类型](/Users/sakimi/Desktop/Detuned/packages/adapter-pi/src/index.ts:5)、[异常处理](/Users/sakimi/Desktop/Detuned/packages/adapter-pi/src/index.ts:53)、[兼容性记录](/Users/sakimi/Desktop/Detuned/integrations/compatibility.json:5)。对应上轮 F11/F12。

**S12**：用 fetch fixture 返回 HTTP 403，实际注册的 `execute` 没有抛异常，而是 resolve 一个 `{isError:true,...}` 对象。Pi 官方要求工具失败从 execute 抛出；普通返回对象不会标记失败。本次重新核对了 [Pi Extensions 官方说明](https://pi.dev/docs/latest/extensions)。

本地仍是手写的宽松 `PiExtensionContext`，没有接入官方类型；只在调用开始前检查 `signal.aborted`，没有把信号传入 HTTP 调用链。因此“双参注册和 label fixture 通过”不能称为整个官方 SDK 契约验证。运行中取消问题由源码确认，本次 S12 只动态复现错误语义。

应固定官方 SDK 版本并直接编译校验；无模型 fixture 验证错误传播、开始前/进行中取消、命令输出和必要的资源清理。真实 Pi 宿主可以在 M4 验收，继续如实标为 not_tested；不得以没有运行付费模型来解释为何不做官方类型或无推理契约检查。

### R2-F09 / P2：进度与完成条件需要按证据重写

[docs/progress.md](/Users/sakimi/Desktop/Detuned/docs/progress.md:10) 宣称全部闭环；当前代码和反例不支持这一结论。README、AGENTS 中又仍有“仅有设计”的旧描述。此次没有替实现者修改这些状态，下一轮应随实际修复同步更新。

其他需要纠正的声明：

- M2 是附件、类型化失败记忆、FTS5 和上下文预算；原路线没有向量检索任务。不要据回复中的“附件与向量检索”新增向量库。
- 插入 migration version=1 不是完整升级框架，也不证明事务故障恢复。
- 当前实际 pnpm CLI 为 11.7.0；需要解释/更正文档中的 11.28.0，并固定受支持工具链。
- 已实现 MCP stdio 握手、工具发现/调用测试是有效证据，但不等于 dsh、Pi、Codex、Claude Code 的宿主实测。
- 不能以“发现 9 个工具”证明正式 review 已实现；client 尚无 `forum_review` 分支。应按启用模块发布工具目录，未实现能力不能宣称可用。

## 3. 明确延期，避免无止境扩大本轮

**S09 属于 M2.2 的后续验收项**：category 为 `banana`，且没有证据字段、未排除变体及重试条件的 failure 仍返回 201。它说明现有“类型规则完整”的表述不准确；本轮不要求顺便完成全部知识视图。可以补已有 kind 的最小严格校验，也可以明确标记剩余 M2.2 工作；不得将此项计成已通过。

完整附件、FTS5 性能/中文检索矩阵、context 严格输出预算、长轮询、备份/恢复平台、Pi 会话分叉 inbox、四宿主研究演示、Web、正式双评审和 M8 研究效果均不在本轮根因修复范围。已公开的接口若暂不修复，应明确关闭相应能力并同步发现目录与示例，不能一面宣称可用一面延期。

本次在当前 shell 的 PATH 未找到 dsh/Pi 命令；不代表机器任意位置都不存在安装。本次重新阅读了 [dsh 官方 MCP 客户端说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)：stdio 有启动探测进程，接入失败也不必然使整个 harness 退出。后续 M4 仍须用独立 profile 验证实际工具和身份隔离。没有改动 dsh 接入方案。

## 4. 下一轮与退出条件

执行同目录 [next-agent-prompt.md](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r2/next-agent-prompt.md) 的 R2.1–R2.6。先把反例变为正式测试，再修根因；保留本轮原始 observed。

退出条件是：上述 P1 全部有回归证据；继续暴露的事件/Pi/CLI 入口符合声明；R2-F09 文档与实际一致；升级保留数据并有回滚/拒绝策略；36 项既有测试和旧探针保持有效。S09 可按上述规则明确延期，四宿主实测仍可 not_tested。全部通过后提交 M2.1 就绪评估，下一次再领取附件任务。

最重要的验收改变：不要只逐项抄写探针。对同一个不变量检查 **所有入口 × 正向/反向 × 首次/重放 × 正常/注入失败 × 关闭重开**。例如“正文脱敏”要涵盖初始帖子和普通帖子，“严格 schema”要同时验证合法 CLI，“迁移行存在”要补初始化中断后的恢复。

## 5. 文件与复现

- [check-remaining.mjs](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs)：12 项业务/适配器补充断言，无监听端口。
- [observed.json](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r2/observed.json)：基线的原始结果。
- [check-cli.mjs](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs)：真实构建后 CLI → 回环 HTTP → 临时 SQLite。
- [observed-cli.json](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r2/observed-cli.json)：三个 CLI 操作的原始退出码和错误。
- [verification.json](/Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-28-m0-m1-r2/verification.json)：本次基础验证和边界记录。

```sh
cd /Users/sakimi/Desktop/Detuned
pnpm build
node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs
node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs
```

脚本在本基线上预期以 1 退出，表示产品保证未满足；不是脚本运行中断。CLI 脚本需要允许本机临时监听，不能把 EPERM 当成业务反例。后续验证另存文件，勿覆盖 observed。原方案 SHA-256 仍为 `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`。
