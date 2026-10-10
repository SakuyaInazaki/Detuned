# M0/M1-R4-C.3 覆盖与交付核对 (Coverage & Delivery Audit)

## 1. 任务概述与交付状态

本轮任务 **M0/M1-R4-C.3：恢复 Pi 写工具参数校验，统一客户端正文生命周期，完成当前接口契约验收** 已全部实施完毕。

- **基线前快照**：`docs/reviews/2026-10-02-m0-m1-r22/implementation-r4-c3/baseline-before.json`（93 个产品/测试/构建文件，0 差异匹配 R22 基线）。
- **实施后快照**：`docs/reviews/2026-10-02-m0-m1-r22/implementation-r4-c3/baseline-after.json`（93 个基线文件，受控修改 6 个源码/测试文件，其余 87 个文件原哈希保持不变）。
- **冻结文件字节校验**：
  - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（严格一致）。
  - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（严格一致）。
- **验证套件执行**：**全量 29 条命令 100% exit 0 成功通过**（28 条继承命令全部 exit 0，当期 `check-c2-boundaries.mjs` 探针 5/5 全部通过）。
- **正式测试套件**：**180 / 180 项全部通过**（13 个测试文件，无跳过、无失败；`tests/contracts/r4-c-contracts.test.ts` 从 22 项扩增至 27 项）。
- **预修复失败留存**：在修复前将 AE01–AE05 反例固化为正式测试并记录失败现场至 `docs/reviews/2026-10-02-m0-m1-r22/implementation-r4-c3/pre-fix-failures.txt`（4 tests failed, 22 passed），彻底杜绝无真实重现与修复验证的假通过。

---

## 2. 缺陷修复矩阵 (R22-F01 ~ R22-F03)

| 缺陷编号 | 关联探针 | 问题根因 | 修复方案与工程落地 | 验证结果 |
|---|---|---|---|---|
| **R22-F01 (P1 级)** | AE04 | 在 `packages/adapter-pi/src/index.ts` 中，`adaptToolSchema()` 对所有传入的 schema 强行注入了顶层的 `properties: {}` 和 `additionalProperties: false`。对于 `forum_publish` 和 `forum_relate` 这种使用 `anyOf`/`oneOf` 的联合 Schema，顶层注入的空 properties 导致 Pi 0.87.1 官方参数校验器（基于 Ajv）将联合分支的所有合法字段视作未声明的额外属性而全部拒绝（如 thread、post、revision、withdraw 和 create、resolve、reopen 七个分支合法入参全部报 `must NOT have additional properties`）。 | 修复 `packages/adapter-pi/src/index.ts` 中的 `adaptToolSchema()`，彻底移除顶层盲目注入的 `properties: {}` 与 `additionalProperties: false`，直接保真返回原始 schema 对象。联合 Schema 与普通对象 Schema 均能无损交由 Pi 0.87.1 原生参数校验器处理。 | `check-c2-boundaries.mjs` AE04 pass。<br>`r4-c-contracts.test.ts` C03-5 正式测试通过。<br>Pi 0.87.1 官方参数校验器对 `forum_publish` 4 分支和 `forum_relate` 3 分支合法输入 100% 校验通过，坏 JSON 依然抛出 `ClientProtocolError`，业务 409 保真。 |
| **R22-F02** | AE01, AE02, AE05 | 1. **正文 await 结算后控制信号遗漏**：在 HTTP 响应头收到后，`await res.json()` 期间若外部 signal 触发 abort 或超时定时器触发，结算后客户端未核对控制信号，导致已 abort/timed out 的请求在响应体恰好返回 200 或 409 时误判为请求成功或业务冲突。<br>2. **正文流式中断误分类**：在读取响应正文流时发生网络中断（如 `UND_ERR_SOCKET`、`ECONNRESET` 或孤立 `AbortError`），被未捕获或误分类为协议解析错误。<br>3. **4xx 非重试状态码在正文读取失败时被误重试**：当服务端返回 400/401/403/404/409/413/422 等确定性错误但正文读取中断时，错误被网络重试逻辑接管而发生了多余重试。<br>4. **正则猜词过度**：`isNetworkError` 包含 `/fetch failed/i` 正则，导致永久性 TLS 证书过期错误（`CERT_HAS_EXPIRED`）被误判定为可重试网络错误。 | 1. 在 `packages/client/src/client.ts` 中，在 `await res.json()` 之后立即检查 `isUserAborted || opts.signal?.aborted` 与 `isTimedOut`，一旦满足立即抛出 `UserAbortError` 或 `TimeoutError`，取消与超时绝对优先于业务响应。<br>2. 用 `try...catch` 包裹 `res.json()`，对流式读取阶段抛出的网络错误、孤立 AbortError 捕获并统一包装为 `ClientTransportError`。<br>3. 检查 HTTP 状态码，若为不可重试的 4xx（400, 401, 403, 404, 409, 413, 422），即使正文读取中断亦绝不进入重试，直接抛出 `ClientTransportError`（标记 `retryable: false`）并立即终止重试循环。<br>4. 移除 `isNetworkError` 中的 `/fetch failed/i` 文本匹配，精确基于 cause code 白名单（`ECONNREFUSED`、`ECONNRESET`、`ENOTFOUND`、`ETIMEDOUT` 等）判定重试，TLS 证书过期错误统一作为不可重试的 `ClientTransportError` 抛出。<br>5. 完善 `Retry-After` 正例覆盖（HTTP-date 解析、非法格式退避回退、超预算立即终止）。 | `check-c2-boundaries.mjs` AE01, AE02, AE05 均 pass。<br>`r4-c-contracts.test.ts` C02-12, C02-13, C02-14 正式测试通过。<br>无论是 200 还是 409，外部取消和超时均优先判定；TLS 证书过期不重试；流式中断准确分类。 |
| **R22-F03** | AE03 | 1. 列表接口的 `limit` 查询参数在 OpenAPI 中缺少 `minimum: 1, maximum: 100, default: 20` 约束（且 `GET /spaces/{id}/threads/{id}` 缺少 default 50）。<br>2. 搜索接口的 `kind` 查询参数未绑定 `@detuned/protocol` 的已知枚举（`POST_KINDS`）。<br>3. `GET /capabilities` 接口在 OpenAPI 中缺少显式 `security: []` 声明，导致客户端或网关误认为需要 Bearer Token。<br>4. 订阅接口 `POST /spaces/{id}/subscriptions` 的 `Idempotency-Key` 请求头在 OpenAPI 中被标为了 `required: true`，而运行时服务端并不强制要求。<br>5. 轮询接口 `POST /spaces/{id}/consumers/{id}/poll` 在 OpenAPI 中将 `requestBody` 标为了 `required: false`，而 Fastify 运行时强制校验入参，必须传入 `{}`。 | 1. 在 `packages/protocol/src/posts.ts` 导出 `POST_KINDS` 常量（`['root', 'reply', 'review_comment', 'decision']`）并在 `@detuned/protocol` 根统一导出，在 `packages/server/src/routes/search.ts` 中复用。<br>2. 在 `packages/protocol/src/openapi.ts` 中：<br>   - 为 `/spaces`、`/spaces/{id}/threads`、`/spaces/{id}/posts/{id}/revisions`、`/spaces/{id}/search` 的 `limit` 参数补齐 `minimum: 1, maximum: 100, default: 20`；为 `/spaces/{id}/threads/{id}` 的 `limit` 设置 `default: 50`；为 `/spaces/{id}/context` 的 `max_bytes` 设置 `minimum: 4096, maximum: 65536, default: 12288`；为 `/spaces/{id}/posts/{id}` 的 `revision` 设置 `minimum: 1`。<br>   - 为搜索接口 `kind` 参数添加 `POST_KINDS` 枚举定义；为视图接口 `name` 参数添加已知视图枚举定义。<br>   - 为 `GET /capabilities` 显式声明 `security: []`，明确支持匿名访问。<br>   - 将订阅端点的 `Idempotency-Key` 参数声明改为 `required: false`。<br>   - 将轮询端点 `/poll` 的 `requestBody` 改为 `required: true`。 | `check-c2-boundaries.mjs` AE03 pass。<br>`r4-c-contracts.test.ts` C01-8 正式测试通过。<br>OpenAPI 3.1 声明与 Fastify 运行时契约、Protocol 类型定义 100% 吻合。 |

---

## 3. 正式测试套件覆盖情况 (13 个文件，180 项)

全套正式测试用例从 R22 的 175 项扩增至 **180 项**，13 个测试文件全部通过：

| 测试文件 | 用例数 | 覆盖重点 | 状态 |
|---|---|---|---|
| `tests/contracts/r4-c-contracts.test.ts` | 27 | **C01**（未知 query 拦截、标量/CSV 参数防重复、关系对称性、无正文写端点强约束 AD01、OpenAPI 3.1 真实 Schema 对齐 AD02、OpenAPI 3.1 查询/认证/请求头与路由运行时强一致 AE03/C01-8）；<br>**C02**（信封结构校验、合法 falsy 语义保留、5 个取消阶段与超时判别 C02-5、监听器/定时器生命周期立即清理 AD04、有界重试、REVISION_CONFLICT 保真、孤立 AbortError 与网络 Cause 分类 AD03、Retry-After 预算与防溢出 AD05、正文 await 结算后控制信号优先 AE01/C02-12、正文流式中断与 4xx 禁重试 AE02/C02-13、Retry-After 正例覆盖 AE05/C02-14）；<br>**C03**（Pi 适配器无头与 UI 模式输出、Node >=22.19.0 对齐、动态 token 同步、Pi 写工具联合 Schema 校验恢复 AE04/C03-5） | 全部通过 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 | B01-B12 全量操作族重放、结构恢复与降级、X01-X03 历史迁移健壮性、Z01-Z04 索引键与 FTS 语义强校验 | 全部通过 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 | 生成与同步管线：V1/V2 profile 恢复、主键排序与方向约束（AB01）、缺失驱动原子失败（AB02/AB04）、损坏修复（AB03） | 全部通过 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 | MCP stdio 进程间通信、8 个有效工具发现、Pi 适配器基础契约 | 全部通过 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 12 | Pi 命令执行、工具执行错误捕获与结构化输出 | 全部通过 |
| `tests/contracts/m0-m1-r3-contracts.test.ts` | 10 | 核心业务不变量、权限预检、空间隔离 | 全部通过 |
| `tests/contracts/m0-m1-r4-contracts.test.ts` | 8 | 历史迁移失败原子回滚（U01）、Resolve 修订保留（U02）、实例初始化防重发（U03）、未知幂等引用校验（U04）、HTTP 边界枚举拒绝（U05）、截断 JSON 拒绝（U06）、审计脱敏深度（U07）、失败脱敏回滚（U08） | 全部通过 |
| `tests/contracts/m0-m1-validation.test.ts` | 5 | 验证服务单源规则、字段缺失校验 | 全部通过 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 9 | 集成场景：端到端发布、关联、上下文提取与事件确认 | 全部通过 |
| `packages/core/tests/` (3 文件) | 9 | Core 领域逻辑、认证上下文、ID 生成器 | 全部通过 |
| `packages/storage-sqlite/tests/storage.test.ts` | 6 | SQLite 存储引擎底层读写、并发事务与一致性 | 全部通过 |

---

## 4. 路由与 OpenAPI 32 操作完整契约核对表

下表列出当前 32 个已启用的 HTTP 业务操作及其与 OpenAPI 3.1 规范的完全对齐状态：

| # | HTTP 方法与路径 | 操作名称 | 请求正文 Schema | Query / Header / 认证约束 | OpenAPI 对齐验证 |
|---|---|---|---|---|---|
| 1 | `GET /capabilities` | `getCapabilities` | 无 | 无 query；`security: []`（允许匿名访问） | 吻合 |
| 2 | `GET /spaces` | `listSpaces` | 无 | `limit` (min 1, max 100, default 20), `cursor` | 吻合 |
| 3 | `POST /spaces` | `createSpace` | `CreateSpaceRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 4 | `GET /spaces/{space_id}` | `getSpace` | 无 | 无 query；需要认证 | 吻合 |
| 5 | `PATCH /spaces/{space_id}` | `patchSpace` | `PatchSpaceRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 6 | `POST /spaces/{space_id}/sessions` | `createSession` | `CreateSessionRequestSchema` | 禁止未知 query；会话凭证生成 | 吻合 |
| 7 | `GET /spaces/{space_id}/threads` | `listThreads` | 无 | `limit` (min 1, max 100, default 20), `state` (open/archived), `tags` (CSV) | 吻合 |
| 8 | `POST /spaces/{space_id}/threads` | `createThread` | `CreateThreadRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 9 | `GET /spaces/{space_id}/threads/{id}` | `getThread` | 无 | `limit` (min 1, max 100, default 50), `cursor` | 吻合 |
| 10 | `PATCH /spaces/{space_id}/threads/{id}` | `patchThread` | `PatchThreadRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 11 | `POST /spaces/{space_id}/threads/{id}/posts` | `createPost` | `CreatePostRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 12 | `GET /spaces/{space_id}/posts/{id}` | `getPost` | 无 | `revision` (min 1) | 吻合 |
| 13 | `POST /spaces/{space_id}/posts/{id}/revisions` | `createPostRevision` | `CreatePostRevisionRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 14 | `POST /spaces/{space_id}/posts/{id}/withdraw` | `withdrawPost` | `WithdrawPostRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 15 | `GET /spaces/{space_id}/posts/{id}/revisions` | `listPostRevisions` | 无 | `limit` (min 1, max 100, default 20), `cursor` | 吻合 |
| 16 | `POST /spaces/{space_id}/relations` | `createRelation` | `CreateRelationRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 17 | `POST /spaces/{space_id}/relations/{id}/resolve` | `resolveRelation` | `ResolveRelationRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 18 | `POST /spaces/{space_id}/relations/{id}/reopen` | `reopenRelation` | `ReopenRelationRequestSchema` | 禁止未知 query；需要 `Idempotency-Key` | 吻合 |
| 19 | `GET /spaces/{space_id}/search` | `search` | 无 | `q` (string), `kind` (enum: `POST_KINDS`), `tag` (string), `limit` (min 1, max 100, default 20), `cursor` | 吻合 |
| 20 | `GET /spaces/{space_id}/context` | `getContext` | 无 | `max_bytes` (min 4096, max 65536, default 12288) | 吻合 |
| 21 | `GET /spaces/{space_id}/views/{name}` | `getView` | 无 | `name` (enum: `failures`, `findings`, `open-questions`), `limit` | 吻合 |
| 22 | `POST /spaces/{space_id}/subscriptions` | `createSubscription` | `CreateSubscriptionRequestSchema` | 禁止未知 query；`Idempotency-Key` (required: false) | 吻合 |
| 23 | `POST /spaces/{space_id}/consumers/{id}/poll` | `pollEvents` | `PollRequestSchema` | 禁止未知 query；`requestBody` (required: true, `{}`) | 吻合 |
| 24 | `POST /spaces/{space_id}/consumers/{id}/ack` | `ackEvents` | `AckRequestSchema` | 禁止未知 query；需要批量 ack 游标 | 吻合 |
| 25 | `DELETE /spaces/{space_id}/consumers/{id}` | `deleteConsumer` | 无 (`validateNoBody`) | 仅允许空 body；禁止未知 query | 吻合 |
| 26 | `POST /admin/actors` | `createActor` | `CreateActorRequestSchema` | 禁止未知 query；管理员权限 | 吻合 |
| 27 | `POST /admin/credentials` | `createCredential` | `CreateCredentialRequestSchema` | 禁止未知 query；管理员权限 | 吻合 |
| 28 | `POST /admin/credentials/{id}/revoke` | `revokeCredential` | 无 (`validateNoBody`) | 仅允许空 body；禁止未知 query；管理员权限 | 吻合 |
| 29 | `POST /spaces/{space_id}/memberships` | `createMembership` | `CreateMembershipRequestSchema` | 禁止未知 query；成员角色分配 | 吻合 |
| 30 | `PATCH /spaces/{space_id}/memberships/{actor_id}` | `patchMembership` | `PatchMembershipRequestSchema` | 禁止未知 query；成员角色修改 | 吻合 |
| 31 | `DELETE /spaces/{space_id}/memberships/{actor_id}` | `deleteMembership` | 无 (`validateNoBody`) | 仅允许空 body；禁止未知 query；成员移除 | 吻合 |
| 32 | `POST /spaces/{space_id}/redactions` | `createRedaction` | `CreateRedactionRequestSchema` | 禁止未知 query；需要 `Idempotency-Key`；脱敏审计 | 吻合 |
