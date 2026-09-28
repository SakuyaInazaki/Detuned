# 第一轮实现审查：M0 / M1

审查日期：2026-09-28。代码基线：`a6c437d`。审查对象：用户提供的交接回复、实际源代码、既有测试，以及隔离环境中的补充复现。没有修改产品代码、真实数据、用户的 harness 配置或模型账号。

**结论：已有可保留的基本实现，但 M0/M1 尚不能按原验收规格判定完成。下一轮应为 M0-R / M1-R 修复与重新验收，暂不增加 M2 附件功能。**

普通发帖、精确版本引用、乐观版本冲突、SQLite 短事务与基础检索已存在；应在这些代码上修复，不需要推倒重写。问题集中在权限交集、运行时契约、幂等、恢复与验收覆盖。

## 1. 实际运行证据

| 检查 | 本次结果 | 能证明的范围 |
|---|---|---|
| `pnpm build` | 通过，9 个子包 | 编译产物可生成 |
| `pnpm typecheck` | 通过 | 当前 TS 类型约束内可编译；不能证明自行定义的 Pi 接口符合宿主 |
| `pnpm lint` | 通过 | 当前脚本就是 `tsc --noEmit`，与类型检查重复，不是另一套 lint 检查 |
| `pnpm test` | 17 通过；2 个契约测试因沙盒禁止监听 127.0.0.1 而失败 | 环境限制不算产品缺陷 |
| `pnpm test:contracts` | 获准本地端口后复跑，2/2 通过 | 与上项合计复核了现有 19 个测试；不是额外 2 个独立测试 |
| `check-behavior.mjs` | 15 个定向断言不满足 | 文件型临时 SQLite，实测 `journal_mode=wal`，Fastify inject，无监听端口 |
| `check-adapters.mjs` | 5 个定向断言不满足 | 工具 schema、实际 MCP stdio 工具发现，以及对照官方 API 的 Pi 注册夹具 |

定向检查是针对源码中已发现风险构造的反例，不代表抽样估计的产品失败率。它们暴露的是若干共同根因，也不是“20 个完全独立漏洞”。

复现产物：

- [业务边界复现脚本](check-behavior.mjs) 与 [原始结果](observed.json)。
- [适配层复现脚本](check-adapters.mjs) 与 [原始结果](observed-adapters.json)。
- [下一轮完整提示词](next-agent-prompt.md)。

运行方式（仓库根目录，先完成构建）：

```sh
pnpm build
node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs
node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs
```

存在反例时脚本退出码为 1，这是预期的审查失败信号。业务脚本只创建并删除自己拥有的临时目录；适配脚本只启动本项目 MCP 桥并发现工具，不调用模型、不发送论坛 HTTP 请求。Pi 检查是官方接口约束夹具，**没有在真实 Pi 中加载**。修复后的输出另存文件，保留本次原始结果。

## 2. 必须处理的发现

### F01 · P1：A 空间 owner 可以脱敏 B 空间的帖子

位置：[admin.ts](../../../packages/server/src/routes/admin.ts) 第 124–155 行；[sqlite-storage.ts](../../../packages/storage-sqlite/src/sqlite-storage.ts) 第 1215–1251 行。

脱敏路由只检查 URL 中的 space_id，随后存储层按 target_id 直接更新对象，没有确认目标属于同一空间。R07 使用仅有 A 空间凭据的 owner，将 B 空间帖子 ID 放进 A 的脱敏请求，得到 201，B 帖子确实变成 redacted。这是跨空间写入，不能留待完整 M3 运维阶段才处理。

修复：把脱敏作为业务用例，在同一事务内检查目标归属和当前权限，维护全部受影响修订、投影、审计与事件；无权目标统一 404。补充 post/artifact 两种跨空间测试。若暂不提供完整脱敏，必须关闭该入口并如实标记，不保留有副作用的半成品。

### F02 · P1：成员角色取代了凭据能力；受限凭据还会泄漏空间目录

位置：[auth-service.ts](../../../packages/core/src/services/auth-service.ts) 第 87–160 行；[spaces.ts](../../../packages/server/src/routes/spaces.ts) 第 9–25 行；[meta.ts](../../../packages/server/src/routes/meta.ts) 第 27–43 行。

`requireSpaceAccess` 检查成员角色和空间列表，却不检查本次操作所需的 read/write capability。R01：同一 contributor 使用仅含 read 的 token 仍能创建主题，返回 201。R02：actor 属于 A/B，但 token 仅允许 A，`/spaces` 与 `/me` 仍列出 B 的 ID/slug。

修复：操作权限必须是成员权限、token 能力、token 空间范围、对象可见性的交集。列表在查询和分页之前就按该交集过滤。明确空 allowed_space_ids 的语义，不要把空列表悄悄当全空间。未知角色必须拒绝，不能因 `undefined < level` 为 false 而放行。设计中的 participant/verifier 与当前 contributor 命名不一致，需统一契约或记清 ADR，不能依靠宽松字符串接入。

### F03 · P1：定义了 schema，却没有在 HTTP 边界使用

位置：[posts.ts](../../../packages/server/src/routes/posts.ts) 第 15–28 行及其他 routes；[post-service.ts](../../../packages/core/src/services/post-service.ts) 第 28–70 行。

路由直接把 req.body 断言为 TS 类型，未挂入 Fastify schema；`as` 不会做运行时校验。R03a/R03b/R03c：未知属性、161 字符主题名、没有 structured 的 claim 全都返回 201。`validateStructuredContent` 在字段缺失时直接 return，初始帖子路径还绕过了这段校验。

修复：从 protocol 导出并挂载 body/query/params/headers schema；拒绝未知字段和缺少幂等键，不要只静默删字段。领域层继续验证 kind 对应字段、引用和状态不变量。中文 body 上限按 UTF-8 字节检查，不能用字符数替代；M0/M1 已暴露的路由必须统一覆盖。坏输入不能产生半条对象或 500。

### F04 · P1：工具 schema 会拒绝合法输入，真实 MCP 工具发现失败

位置：[tools.ts](../../../packages/protocol/src/tools.ts) 第 103–114、139–149 行及 review 定义；[MCP 入口](../../../packages/mcp/src/index.ts) 第 46–54 行。

公共字段对象与 `additionalProperties:false` 的各操作分支做 intersection，导致分支把 space_id/request_key 当成未知字段。A01/A02：文档中合法的 publish-thread、relate-create 输入均无法通过自己的 schema。

A05 还实际启动了构建后的 stdio 桥，用已安装官方 MCP SDK 连接并调用 listTools。初始化之后工具发现失败：`forum_publish`、`forum_relate`、`forum_review` 的 inputSchema 缺少根级 `type: "object"`。先前的 InMemoryTransport 探针创建的是另一个简单测试服务，没有检验 Detuned 桥的真实输出。

修复：按宿主接受的 JSON Schema 表达完整判别联合；公共字段应合并进每个严格分支，不能只补一个 type 掩盖分支冲突。对所有操作做正反例校验，并对真正的 stdio 产物执行发现及调用测试。未实现 review 的工具应通过 capability 明确禁用/不暴露，不要让它出现在可用目录中后再落入 Unknown tool。

### F05 · P1：幂等键没有包含目标资源，缺失键也被自动放行

位置：[post-service.ts](../../../packages/core/src/services/post-service.ts) 第 83–90 行及其他写入；[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts) 第 30–60 行；[posts.ts](../../../packages/server/src/routes/posts.ts) 第 19 行。

operation 只有 `post.create` 等动作名，请求摘要没有 threadId/postId。R05a：相同 actor、空间、正文与键，先向 T1 发帖，再向 T2 发帖，第二次返回 T1 的旧帖子且状态为 201。目标 T2 没有收到帖子，客户端却以为成功。修订、撤回和其他对象动作也要一起审计。

路由又用 req.id 兜底缺失的幂等键。R05b：同一个无键写入重试两次，得到两次 201；请求 ID 无法提供稳定的重放身份。

修复：operation/摘要覆盖动作和实际目标路径，按 docs/04 统一定义；缺键写入返回 400/422。client/CLI 如生成键，须在第一次发送前持久保存并在自动重试中复用。补充两个目标、同目标变正文、换 session、响应丢失重试等测试。

### F06 · P1：脱敏后，历史接口和幂等结果仍返回原文

位置：[idempotency-service.ts](../../../packages/core/src/services/idempotency-service.ts) 第 44–59 行；[posts.ts](../../../packages/server/src/routes/posts.ts) 第 43–70 行；[sqlite-storage.ts](../../../packages/storage-sqlite/src/sqlite-storage.ts) 的 createRedaction。

result_ref 实际保存整个业务返回对象 JSON，其中包含正文，并原样重放。脱敏只改 lifecycle/FTS，历史列表未检查 redacted。R06：普通 read 已返回 410，但 revisions 和同键重放仍包含本次构造的测试标记正文。

修复：幂等存储只保存对象/修订引用，重放时重新按当前授权和脱敏规则构造响应。检查历史、主题概要、context 异议、导出和缓存等所有读取路径。既有数据库里的旧 result_ref 副本也需要迁移或受控清理，不能仅修改新请求路径。

### F07 · P1：默认签名密钥公开，ACK 信任客户端携带的进度

位置：[app.ts](../../../packages/server/src/app.ts) 第 47 行；[event-service.ts](../../../packages/core/src/services/event-service.ts) 第 220–268 行。

buildApp 使用源码内固定 secret；CLI serve 没有传入不同值。ACK 验证签名后直接用 token 的 through_seq 更新进度，没有和数据库中的 batch.through_seq 比较。R08：测试 actor 对自己已领取的一批重新签出“未来 10,000 条”的游标，ACK 返回 200，进度大于当前事件总进度。后续真实消息可被直接跳过。

修复：实例随机密钥持久保存且与恢复 epoch 绑定，或采用设计已允许的随机句柄；最终确认位置必须来自持久 batch，而非客户端声明。事务内检查 actor/space/consumer/batch 归属、版本、ACL epoch 和 active batch。单独换随机 secret 不能替代 batch 边界校验。补测不匹配游标、旧批次重放、权限变更与恢复。

### F08 · P1：initial_post 是另一套不完整的发帖实现

位置：[thread-service.ts](../../../packages/core/src/services/thread-service.ts) 第 80–124 行；对照 [post-service.ts](../../../packages/core/src/services/post-service.ts)。

R04：通过创建主题提交的初始帖子带 refs，请求成功，但数据库中对应关系数是 0。它还不复用 kind 校验，hash 计算不含 structured，和普通发帖路径不同。普通帖子也未处理 artifact_ids。帖子入口不同会改变证据与引用语义，违反 M1 的原子创建要求。

修复：抽出事务内共用的帖子创建/修订逻辑，统一校验、哈希、关系与事件；初始帖子失败时回滚整个主题。附件尚未实现时不得静默忽略已声明的附件，可明确拒绝暂不支持的参数，后续 M2 再实现。

### F09 · P2：订阅条件没有实际保持；thread_ids 被忽略

位置：[event-service.ts](../../../packages/core/src/services/event-service.ts) 第 56–69、158–170 行。

R09a：同 actor/space 的新订阅直接复用第一条 subscription，新传入的 event_types/thread_ids 被丢弃。R09b：单独新身份订阅 T2 的 post.created，仍收到 T1 发帖事件。当前不是完整的可靠消费实现。

修复：不可变过滤条件参与订阅复用判断；不同条件新建或明确冲突，不能静默替换。实现线程归属过滤及无匹配页的确认语义。完整长轮询、备份与更广泛恢复仍属于 M3；已暴露的错误行为必须先修好或明确关闭。

### F10 · P2：初始化、迁移与锁尚不构成可恢复的 M1 基线

位置：[bootstrap.ts](../../../packages/storage-sqlite/src/bootstrap.ts)、[lock.ts](../../../packages/storage-sqlite/src/lock.ts)、[CLI](../../../packages/cli/src/index.ts) 的 init/serve。

R10：创建了 schema_migrations 表，但初始化后没有任何已应用版本记录，启动只重复执行 CREATE IF NOT EXISTS。R11：持锁子进程结束后，新进程仍永久被残留锁文件拒绝；现有锁测试仅验证正常 release 后可再次 acquire。

另外，代码审阅发现 serve 会对空目录自动 bootstrap，却丢弃首次生成的 adminToken；init 不取得目录锁；初始化判断是“是否存在任意 human actor”，而非完整实例状态；信号处理先删锁再直接退出，未完成 Fastify/数据库关闭。这些尚未全部做独立 CLI 动态复现，应补测，不能和已复现项混称。

修复：明确本地 init 流程、重复初始化规则、原子管理员创建与恢复办法；serve 要求已初始化或有可靠的首次凭据交付。真正记录/校验迁移版本，只维护一份 DDL 来源；带完整性检查地接纳当前遗留 baseline。死进程锁须有安全恢复机制，不可见锁就无条件删除；关闭服务/数据库后再释放锁。不要用“删除数据库”代替迁移回滚方案。

### F11 · P2：Pi 的自行定义类型掩盖了官方 API 不兼容

位置：[Pi adapter](../../../packages/adapter-pi/src/index.ts) 第 4–16、30–48、53–77 行。

本次重新核读官方 [Extensions](https://pi.dev/docs/latest/extensions) 和 [扩展类型](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)。官方 registerCommand 接收名称和选项两个参数；当前自定义接口只接收一个对象，A03 证实注册调用形状不匹配。官方工具定义还要求 label，当前 9 项全部缺失，A04 证实。

代码还忽略 DETUNED_TOKEN_FILE、没有传递 signal，并把异常包装为普通成功返回对象。此部分对照官方错误语义修复，不能照搬 MCP 的 isError 返回格式。当前编译成功只证明符合自己写的 PiExtensionContext，并未证明符合 Pi。

修复可安排在 M4，但现在必须撤销“跨 Pi 契约已验证”的表述。若本轮保留可用 adapter 声明，就应使用锁定的官方类型、修正注册与错误/取消/凭据处理，并补宿主契约测试。没有真实 Pi 环境仍保持 not_tested，不能伪造认证。

### F12 · P2：完成声明和验收证据范围不匹配

位置：[进度](../../progress.md)、[跨接口测试](../../../tests/contracts/cross-interface-contract.test.ts)、[M1 测试](../../../tests/integration/m1-discussion.test.ts)、[OpenAPI](../../../packages/protocol/src/openapi.ts)。

- T02 是顺序重试；T03 是先等第一次完成再提交第二次，没有覆盖所声称的并发场景。
- T04 只检验 outsider 的 context/search；没有覆盖 token scope 列表、历史、脱敏、事件等其他入口。T09 撤销直接操作 storage，尚无完整用户可操作的成员停用/凭据撤销路径。
- 业务集成使用 `:memory:`，不等于文件型 WAL/进程重启/故障恢复验收。
- “跨接口”测试只查工具名字与 HTTP client 的两个调用，没有启动 CLI/MCP/Pi；工具名字一致不能证明 schema/执行行为一致。
- OpenAPI 目前是手写的部分路由概要，没有从统一 schema 生成完整请求/响应。测试只断言路径数大于 5。
- 未发现已提交 CI workflow；没有 packageManager 精确版本约束；文档仍写“没有 package.json/尚无代码”，与 progress 的全完成矛盾。源码 commit 和宿主兼容记录仍未冻结到可复现状态。

应把 M0/M1 调整为“基本路径已实现，验收未完成”；明确已测/未测/延后范围。M2/M3/M4 的探索代码不应自动计为对应里程碑完成。

## 3. 下一轮范围和顺序

1. **M0-R.1：契约修复。** 处理 F03/F04；让 schema 在真实入口生效，最小合法工具输入可通过，真正的 stdio 发现可运行。
2. **M1-R.1：授权与脱敏。** 处理 F01/F02/F06；统一业务层检查，并通过跨空间/受限 token/脱敏全部已实现读取入口的负向测试。
3. **M1-R.2：写入一致性。** 处理 F05/F08；补充目标资源幂等、初始帖子与普通帖子一致性、失败回滚与旧引用稳定。
4. **M1-R.3：现有事件与恢复底座。** 处理 F07/F09/F10；仅修当前暴露的行为，不扩建完整 M3 运维平台。
5. **M0-R.2：证据与状态。** 处理 F11/F12；纠正 Pi 声明、补必要管理能力、测试矩阵、CI、版本和进度文件。

本轮出口：P1 反例全部有回归与修复；本轮声称可用的接口不保留已知错误行为；P2 已处理或有明确关闭/延期边界；M0/M1 的验收报告可以由另一开发者复跑。随后再开 M2.1，沿用已有设计，无需重新写总体方案。

## 4. 给维护者的判断

可以认可第一轮的基础工程进展，但不要认可“M0/M1 全部断言通过”和“跨接口已经对齐”的结论。当前最有价值的下一步是让已有接口可信，而不是增加更多包、路由或表。
