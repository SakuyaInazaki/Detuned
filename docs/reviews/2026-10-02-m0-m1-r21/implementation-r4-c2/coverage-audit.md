# M0/M1-R4-C.2 覆盖与交付核对 (Coverage & Delivery Audit)

## 1. 任务概述与交付状态

本轮任务 **M0/M1-R4-C.2：统一当前请求契约，完成错误分类与重试生命周期** 已全部实施完毕。
- **基线前快照**：`docs/reviews/2026-10-02-m0-m1-r21/implementation-r4-c2/baseline-before.json`（93 个产品/测试/构建文件，0 差异匹配 R21 基线）。
- **实施后快照**：`docs/reviews/2026-10-02-m0-m1-r21/implementation-r4-c2/baseline-after.json`（93 个文件，受控修改 9 个源码/测试文件，其余 84 个文件原哈希保持不变）。
- **冻结文件字节校验**：
  - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（字节严格不变）。
  - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（字节严格不变）。
- **验证套件执行**：**全量 28 条命令 100% exit 0 成功通过**（27 条继承命令全部 exit 0，当期 `check-c-completion.mjs` 探针 5/5 全部通过）。
- **正式测试套件**：**175 / 175 项全部通过**（13 个测试文件，无跳过、无失败）。
- **预修复失败留存**：在修复前将 AD01–AD05 反例落入正式测试套件，执行并留存失败现场至 `pre-fix-failures.txt`（8 tests failed, 14 passed），彻底杜绝无真实重现与修复验证的假通过。

---

## 2. 缺陷修复矩阵 (R21-F01 ~ R21-F03)

| 缺陷编号 | 关联探针 | 问题根因 | 修复方案与工程落地 | 验证结果 |
|---|---|---|---|---|
| **R21-F01** | AD01, AD02 | 1. 写路由（POST/PATCH/PUT/DELETE）允许未声明的 query 参数（如 `POST /spaces?bogus=1` 未被拒绝且造成了副作用）。<br>2. 无正文写端点（revoke, delete membership, delete consumer）未实施统一输入约束，接收未知业务属性未拒绝。<br>3. OpenAPI 3.1 规范中存在 19 处 `{ type: 'object' }` 宽泛占位符，与 `@detuned/protocol` 的具体校验 Schema 脱节。 | 1. 在 `packages/server/src/app.ts` 注册全局 `preValidation` 钩子，强制对所有写动词执行 `validateAllowedQueryParams(req.query, [])`，在执行任何业务与状态修改前直接拦截并返回 400 `VALIDATION_ERROR`，保证数据库状态 0 变更。<br>2. 在 `packages/server/src/utils/query.ts` 导出 `validateNoBody`，约束三个无正文端点统一仅接受 `undefined`、`null` 或 `{}`，传入非空对象/未知字段直接抛出 400 `VALIDATION_ERROR`。<br>3. 在 `packages/protocol/src/openapi.ts` 中将所有 19 个带正文操作绑定具体 TypeBox Request Schema，彻底消除占位符。 | `check-c-completion.mjs` AD01、AD02 均 pass。<br>`r4-c-contracts.test.ts` C01-6, C01-7 正式测试通过。<br>OpenAPI 32 个业务路由与实际 HTTP 在缺失字段、类型错误、未知属性、合法正文四种情况 100% 吻合。 |
| **R21-F02** | AD03 | 1. 客户端直接根据 `err.name === 'AbortError'` 判定为用户取消，忽视了上游网络异常中断抛出的孤立 AbortError 并非外部取消。<br>2. 传输错误未单独导出为特征完备的错误类，被转成了服务端 `DetunedError(503)`，导致传输层失败与服务端真实 503 无法区分。<br>3. 包含 "transaction aborted because revision changed" 描述的 409 冲突响应存在被误分类的风险。 | 1. 严格以 `opts.signal?.aborted` 作为用户显式取消（`UserAbortError`）的唯一判定标准；上游孤立 AbortError 归类为传输错误并支持可重试特性。<br>2. 导出 `ClientTransportError`，标明 `isTransportError: true`、`isDetunedError: false`、`kind: 'transport'` 并完整保留 `cause`。<br>3. 严格区分五类错误，409 `REVISION_CONFLICT` 完整保真服务端状态码、错误码、details 与不可重试属性。 | `check-c-completion.mjs` AD03 pass。<br>`r4-c-contracts.test.ts` C02-9 正式测试通过。<br>传输错误与服务端错误分类标记完全互斥。 |
| **R21-F03** | AD04, AD05 | 1. 单次请求的超时定时器和外部 signal 监听器在进入退避等待阶段时仍未被清理，导致 30s 请求超时定时器在 60s 退避期间错误触发并中止了已完成尝试的 signal，且 abort 监听器数量在退避起始阶段发生泄露（达 2 个）。<br>2. 服务端返回超大 `Retry-After`（如 `2147484` 秒）时，毫秒数超出 Node.js `setTimeout` 32 位带符号整数上限，触发 Node 溢出警告并回绕为 1ms，导致客户端发生毫秒级立即违规重发。 | 1. 将单次 HTTP 尝试作用域隔离在独立的 `try...finally` 中，单次尝试结束时其 `finally` 块**立即**清除 `timeoutId` 并移除外部 signal 的监听器；退避休眠使用独立的 `sleepWithAbort`，监听器数量严格 <= 1，结算后完全归 0。<br>2. 在客户端引入 `maxRetryAfterMs` 等待预算（默认 120,000ms），在 `parseRetryAfter` 中拦截超出预算或超出 Node 32 位上限（2147483647 ms）的超大延迟，立即终止自动重试并向调用方抛出服务端的原始错误，杜绝定时器溢出回绕。 | `check-c-completion.mjs` AD04、AD05 均 pass。<br>`r4-c-contracts.test.ts` C02-10, C02-11 正式测试通过。<br>单次尝试 signal 在退避期间保持未中止，超大等待安全停止于第 1 次调用。 |

---

## 3. 正式测试套件覆盖情况 (13 个文件，175 项)

本轮将 AD01–AD05 反例及 Pi 适配器扩展全部正式固化至 `tests/contracts/r4-c-contracts.test.ts`，全套正式测试用例从 R21 的 169 项扩增至 **175 项**：

| 测试文件 | 用例数 | 覆盖重点 | 状态 |
|---|---|---|---|
| `tests/contracts/r4-c-contracts.test.ts` | 22 | C01（未知 query 拦截、标量/CSV 参数防重复、关系对称性、无正文写端点输入约束 AD01、OpenAPI 3.1 真实 Schema 对齐 AD02）、C02（信封结构校验、合法 falsy 语义保留、5 个取消阶段与超时判别 C02-5、监听器/定时器生命周期立即清理 AD04、有界重试、REVISION_CONFLICT 保真、孤立 AbortError 与网络 Cause 分类 AD03、Retry-After 预算与防溢出 AD05）、C03（Pi 适配器无头与 UI 模式输出、Node >=22.19.0 对齐、Pi 参数 TypeBox 适配与业务错误透传） | 全部通过 |
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

## 4. 路由与 OpenAPI 规范核对 (Route Inventory & Schema Sync)

本轮对 OpenAPI 规范中的所有请求正文 Schema 进行了彻底审查与同步：
- 启用业务操作总数：32
- 带请求正文的操作数：19
- `{ type: 'object' }` 宽泛占位符数：**0**（已从 19 彻底清零）
- 请求体与 `@detuned/protocol` 绑定明细：
  1. `POST /spaces` -> `CreateSpaceRequestSchema`
  2. `PATCH /spaces/{space_id}` -> `PatchSpaceRequestSchema`
  3. `POST /spaces/{space_id}/sessions` -> `CreateSessionRequestSchema`
  4. `POST /spaces/{space_id}/threads` -> `CreateThreadRequestSchema`
  5. `PATCH /spaces/{space_id}/threads/{id}` -> `PatchThreadRequestSchema`
  6. `POST /spaces/{space_id}/threads/{id}/posts` -> `CreatePostRequestSchema`
  7. `POST /spaces/{space_id}/posts/{id}/revisions` -> `CreatePostRevisionRequestSchema`
  8. `POST /spaces/{space_id}/posts/{id}/withdraw` -> `WithdrawPostRequestSchema`
  9. `POST /spaces/{space_id}/relations` -> `CreateRelationRequestSchema`
  10. `POST /spaces/{space_id}/relations/{id}/resolve` -> `ResolveRelationRequestSchema`
  11. `POST /spaces/{space_id}/relations/{id}/reopen` -> `ReopenRelationRequestSchema`
  12. `POST /spaces/{space_id}/subscriptions` -> `CreateSubscriptionRequestSchema`
  13. `POST /spaces/{space_id}/consumers/{id}/poll` -> `PollRequestSchema`
  14. `POST /spaces/{space_id}/consumers/{id}/ack` -> `AckRequestSchema`
  15. `POST /admin/actors` -> `CreateActorRequestSchema`
  16. `POST /admin/credentials` -> `CreateCredentialRequestSchema`
  17. `POST /spaces/{space_id}/memberships` -> `CreateMembershipRequestSchema`
  18. `PATCH /spaces/{space_id}/memberships/{actor_id}` -> `PatchMembershipRequestSchema`
  19. `POST /spaces/{space_id}/redactions` -> `CreateRedactionRequestSchema`
- Ajv 校验验证：通过 Ajv 针对 OpenAPI 编译出的校验器与原生 `@detuned/protocol` 编译出的校验器对齐测试，在 `missing_required_fields`、`wrong_field_type`、`unknown_body_field` 以及 `valid_body` 四类测试输入下，OpenAPI 校验结果、Protocol 校验结果与实际 HTTP 响应结果 100% 达成一致。
