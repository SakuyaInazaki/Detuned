# M0/M1-R4-C.1 覆盖与交付核对 (Coverage & Delivery Audit)

## 1. 任务概述与交付状态

本轮任务 **M0/M1-R4-C.1：补齐请求边界、响应错误与重试契约** 已全部实施完毕。
- 基线前快照：`docs/reviews/2026-10-02-m0-m1-r20/implementation-r4-c1/baseline-before.json`（93 个产品/测试/构建文件，0 差异匹配 R20 基线）。
- 实施后快照：`docs/reviews/2026-10-02-m0-m1-r20/implementation-r4-c1/baseline-after.json`（93 个文件，受控修改 11 个文件，其余 82 个文件原哈希保持不变）。
- 冻结文件字节校验：
  - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（字节严格不变）。
  - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（字节严格不变）。
- 验证套件执行：**全量 27 条命令 100% exit 0 成功通过**（26 条继承命令全部 exit 0，新 `check-c-boundaries.mjs` 探针 6/6 全部通过）。
- 正式测试套件：**169/169 项通过**（13 个测试文件，无跳过、无失败）。

---

## 2. 缺陷修复矩阵 (R20-F01 ~ R20-F04)

| 缺陷编号 | 关联探针 | 问题根因 | 修复方案与工程落地 | 验证结果 |
|---|---|---|---|---|
| **R20-F01** | AC01 | 1. GET 路由缺少未知 query 参数拦截，且未校验重复标量参数与 CSV 格式。<br>2. 显式空值 `?revision=` 被当作缺省静默降级。<br>3. `POST /spaces/:id/memberships` 缺少 `actor_id` 存在性预检触发 500 外键崩溃并产生脏状态。<br>4. Fastify 解析畸形 JSON (`'{'`) 抛出框架 400 状态未被捕获而回退至 500。<br>5. 撤销凭据写接口未保护无正文约束。<br>6. `client.poll` 缺省 query 时未默认传空对象。 | 1. 在 `packages/server/src/utils/query.ts` 实现 `validateAllowedQueryParams`、`parseStringQuery`、`parseCsvQuery` 与严格 `parseIntegerQuery`。<br>2. `parseIntegerQuery` 明确区分 `val === undefined`（允许默认值）与 `val === ''`（拒绝 400）。<br>3. `adminRoutes` 预检 `actor_id`，不存在时返回 404 `NOT_FOUND`。<br>4. `app.setErrorHandler` 拦截 4xx 状态码并规范格式化为 400 `VALIDATION_ERROR` (`retryable: false`)。<br>5. 撤销凭据接口校验请求体，拒绝未知业务字段。<br>6. `client.poll` 设 `body: query ?? {}`。<br>7. `openapi.ts` 完整同步 32 个启用操作。 | `check-c-boundaries.mjs` AC01 9 项细项全部 pass 且状态无副作用。<br>`r4-c-contracts.test.ts` C01-5 正式回归通过。 |
| **R20-F02** | AC02 | 客户端未对成功响应的信封进行严格字段校验，对畸形响应抛出服务端的 `DetunedError(VALIDATION_ERROR)` 破坏错误源边界。 | 1. 在 `packages/client/src/client.ts` 导出并抛出客户端专用 `ClientProtocolError`。<br>2. 校验 `api_version === '1'`。<br>3. 校验 `typeof request_id === 'string' && request_id.trim() !== ''`。<br>4. 校验 `'data' in json` 并拒绝成功响应携带 `error`。<br>5. 严格保留 `data: false/null/0/[]/""` 等合法 falsy 值并允许前向未知字段。 | `check-c-boundaries.mjs` AC02 5 项细项全部 pass。<br>`r4-c-contracts.test.ts` C02-1 ~ C02-3 正式回归通过。 |
| **R20-F03** | AC03 | 客户端通过 `err.message?.includes('aborted')` 粗暴猜词，将服务端返回的 409 `REVISION_CONFLICT`（附带 "transaction aborted because revision changed"）错误转成了 `UserAbortError`。 | 1. 彻底删除 `client.ts` 中的 `err.message?.includes('aborted')` 猜词逻辑。<br>2. 优先保证 `DetunedError` 完整抛出，保留服务端的 `code: 'REVISION_CONFLICT'`、`statusCode: 409`、`details` 与 `retryable: false`。<br>3. 仅当真正发生用户主动 abort（`opts.signal?.aborted`、`isUserAborted`、`DOMException AbortError`）时抛出 `UserAbortError`。 | `check-c-boundaries.mjs` AC03 全部 pass。<br>`r4-c-contracts.test.ts` C02-7 正式回归通过。 |
| **R20-F04** | AC04 | 1. Node 原生 fetch 将底层连接错误包装在 `TypeError` 的 `err.cause.code` 中（如 `ECONNREFUSED`），旧客户端未检查 cause 导致未能触发网络重试。<br>2. 服务端返回 400 且 body 包含 `retryable: true` 时，客户端发生非法重试。<br>3. 缺少对服务端 `Retry-After` 头（秒数及 HTTP-date）的解析与调度等待。 | 1. 实现 `isNetworkError` 辅助函数，递归检查 `err.code` 与 `err.cause?.code`，精准匹配重试白名单。<br>2. 设定客户端不可重试状态码前置检查：`[400, 401, 403, 404, 409, 413, 422]` 绝对不重试，即便服务端误标 `retryable: true`。<br>3. 实现 `parseRetryAfter` 支持数字秒与 HTTP 日期，在退避逻辑中优先使用服务端指定的延迟，并支持优雅清理 timer 与 signal listener。 | `check-c-boundaries.mjs` AC04 3 项细项全部 pass（`fetch_cause_econnrefused` 重试 2 次成功、`retry_after_503` 调度 >=60000ms、`retryable_400` 单次调用即终止）。<br>`r4-c-contracts.test.ts` C02-8 正式回归通过。 |

---

## 3. 正式测试套件覆盖情况 (13 个文件，169 项)

| 测试文件 | 用例数 | 覆盖重点 | 状态 |
|---|---|---|---|
| `tests/contracts/r4-c-contracts.test.ts` | 16 | C01（请求属性、query 解析、无副作用边界、核心枚举拒绝、关系幂等对称性）、C02（信封字段严格校验、falsy 语义保留、用户取消与超时判别、无泄漏监听器清理、有界重试保持 requestKey、REVISION_CONFLICT 错误分类保真、网络 cause 重试与 Retry-After）、C03（Pi 适配器 headless 与 UI 模式观察输出、Node >=22.19.0 依赖对齐） | 全部通过 |
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

## 4. 路由清单与 OpenAPI 同步 (Route Inventory)

本轮对服务器注册的全部路由与 OpenAPI 规范进行了 100% 对齐。
详见 `route-inventory.json`：
- 总路由记录数：33（包含 1 条全局 CORS 通配符 `OPTIONS *` 与 32 个有效业务入口）。
- OpenAPI 覆盖数：**32 / 32 业务路由全部包含**（100% 覆盖）。
- 涵盖分类：
  1. Meta 路由（2）：`GET /capabilities`、`GET /me`
  2. Spaces 路由（5）：`GET /spaces`、`POST /spaces`、`PATCH /spaces/:space_id`、`POST /spaces/:space_id/sessions`、`GET /spaces/:space_id/context`
  3. Threads 路由（4）：`GET /spaces/:space_id/threads`、`POST /spaces/:space_id/threads`、`GET /spaces/:space_id/threads/:id`、`PATCH /spaces/:space_id/threads/:id`
  4. Posts 路由（4）：`POST /spaces/:space_id/threads/:id/posts`、`GET /spaces/:space_id/posts/:id`、`GET /spaces/:space_id/posts/:id/revisions`、`POST /spaces/:space_id/posts/:id/revisions`、`POST /spaces/:space_id/posts/:id/withdraw`
  5. Relations 路由（3）：`POST /spaces/:space_id/relations`、`POST /spaces/:space_id/relations/:id/resolve`、`POST /spaces/:space_id/relations/:id/reopen`
  6. Events / Consumers 路由（4）：`POST /spaces/:space_id/subscriptions`、`POST /spaces/:space_id/consumers/:id/poll`、`POST /spaces/:space_id/consumers/:id/ack`、`DELETE /spaces/:space_id/consumers/:id`
  7. Search / Views 路由（2）：`GET /spaces/:space_id/search`、`GET /spaces/:space_id/views/:name`
  8. Admin / Memberships 路由（7）：`POST /admin/actors`、`POST /admin/credentials`、`POST /admin/credentials/:id/revoke`、`POST /spaces/:space_id/memberships`、`PATCH /spaces/:space_id/memberships/:actor_id`、`DELETE /spaces/:space_id/memberships/:actor_id`、`POST /spaces/:space_id/redactions`
