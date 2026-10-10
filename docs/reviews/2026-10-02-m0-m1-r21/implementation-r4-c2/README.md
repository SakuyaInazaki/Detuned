# M0/M1-R4-C.2 实施交付报告：统一请求契约、错误分类与重试生命周期

## 0. 任务标识与交付摘要

- **任务编号**：`M0/M1-R4-C.2`
- **实施周期**：2026-10-02
- **工作区状态**：
  - Git HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留多轮未提交工作，未做任何 `reset` / `clean` / `checkout`）。
  - 基线文件覆盖：覆盖 R21 基线的 **93 个产品/测试/构建文件**，详见 `baseline-before.json`（0 差异）与 `baseline-after.json`（受控修改 9 个文件，其余 84 个文件原哈希保持不变）。
  - 冻结文件校验：
    - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（原字节完好）。
    - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（原字节完好）。
- **执行纪律**：严禁并未使用、安装或启用 `deepseek-brainstorm` 及其任何派生形态；不启动外部 Agent、不调用模型、不更改全局 harness 配置、不擅自提交/推送/部署/发布。
- **验证成果**：
  - 全量 28 条验证命令 **100% exit 0**（27 条既有继承命令全部 exit 0，当期 `check-c-completion.mjs` 探针 5/5 全部 pass）。
  - 正式测试套件 **175 / 175 项全部通过**（13 个测试文件，无跳过、无失败）。
  - 预修复失败留存：在修复前将 AD01–AD05 反例落入正式测试套件，执行并留存失败现场至 `pre-fix-failures.txt`（8 tests failed, 14 passed），彻底杜绝无真实重现与修复验证的假通过。

---

## 1. 核心问题定位与工程修复

在 R21 独立复核中，B 包数据/升级功能与 C.1 的 169 项测试及 27 条命令已确认通过。但 C.1 遗留了 3 组既定要求未达标（R21-F01 ~ R21-F03，导致 `check-c-completion.mjs` 在 AD01–AD05 全部失败 0/5）。本轮针对这三组缺陷进行了彻底、外科手术式的工程修复：

### 1.1 单元 A (R21-F01, AD01/AD02): 写路由 Query 统一拦截、无正文写端点强约束与 OpenAPI 3.1 真实 Schema 对齐

1. **写路由 Query 参数零容忍拦截（无副作用拒绝）**：
   - 在 `packages/server/src/app.ts` 注册全局 `preValidation` 钩子，对所有写动词（`['POST', 'PATCH', 'PUT', 'DELETE']`）通过 `validateAllowedQueryParams(req.query, [])` 执行统一校验。
   - 当收到类似 `POST /api/v1/spaces?bogus=1` 的带参写请求时，在 Fastify 路由处理、服务层调用与幂等记录检查之前立即返回 400 `VALIDATION_ERROR`，且完全不触碰数据库，保证状态 snapshot（spaces, events, idempotency_records 等）100% 不变。
2. **无正文写端点统一边界校验（`validateNoBody`）**：
   - 在 `packages/server/src/utils/query.ts` 导出 `validateNoBody(body: unknown, operationName?: string)`。
   - 统合三个无正文写操作端点：
     - `POST /api/v1/admin/credentials/:id/revoke`
     - `DELETE /api/v1/spaces/:space_id/memberships/:actor_id`
     - `DELETE /api/v1/spaces/:space_id/consumers/:id`
   - 统一规则：仅允许 `undefined`、`null` 或 `{}`。传入未知业务属性（如 `{ bogus: true }`）、非空数组或基础类型时，直接返回 400 `VALIDATION_ERROR`，拒绝在任何状态变更前提交。
3. **OpenAPI 3.1 规范彻底替换 19 处 `{ type: 'object' }` 占位符**：
   - 在 `packages/protocol/src/openapi.ts` 中，为所有 19 个带正文的操作显式绑定 `@detuned/protocol` 的具体 TypeBox Request Schema（如 `CreateSpaceRequestSchema`、`CreatePostRevisionRequestSchema`、`CreateRelationRequestSchema`、`PollRequestSchema` 等）。
   - 消除所有空占位符，使 `specValidator`、`protocolValidator` 与实际 HTTP 行为在缺少必填字段、字段类型错误、未知附加字段及合法正文 4 类场景下 100% 达成一致，并通过 Ajv 校验。

### 1.2 单元 B (R21-F02, AD03): 消除猜词取消误判、五类错误区分与 ClientTransportError

1. **彻底解耦孤立 AbortError 与用户取消**：
   - 修正 `packages/client/src/client.ts`，不再直接将 `err.name === 'AbortError'` 视为用户显式取消。
   - 严格遵循：**只有外部传入的 `opts.signal?.aborted === true` 才是 `UserAbortError`**。
   - 上游或网络层触发的孤立 `AbortError`（`DOMException('upstream stopped', 'AbortError')`）被归类为可重试的传输错误。
2. **导出独立且特征完备的 `ClientTransportError`**：
   - 在 `packages/client/src/client.ts` 定义并导出 `ClientTransportError extends Error`：
     - `isTransportError: true`
     - `isDetunedError: false`
     - `isUserAbort: false`
     - `isTimeout: false`
     - `kind: 'transport'`
     - 保留原始 `cause` 与错误码（如 `ECONNRESET`、`ABORT_ERROR`）。
3. **清晰隔离五大类客户端/服务端错误**：
   - `DetunedError`：服务端返回的标准 HTTP/业务错误（`isDetunedError: true`）。
   - `UserAbortError`：用户外部 signal 主动中止（`isUserAbort: true`）。
   - `TimeoutError`：单次请求超时触发（`isTimeout: true`）。
   - `ClientTransportError`：底层网络中断、连接重置或网络连接中止（`isTransportError: true`, `kind: 'transport'`）。
   - `ClientProtocolError`：响应体损坏、非 1.0 版本、缺少必需字段等协议信封错误。
4. **服务端 409 `REVISION_CONFLICT` 完整保真**：
   - 包含 "transaction aborted because revision changed" 描述的 409 冲突响应完整保留为 `DetunedError(REVISION_CONFLICT, ...)`，状态码 409，`retryable: false`，`details` 结构完整无损，分类标识与传输错误完全异构。

### 1.3 单元 C (R21-F03, AD04/AD05): 单次尝试生命周期立即清理与 Retry-After 预算保护

1. **单次尝试与退避休眠的生命周期彻底解耦**：
   - 将 `request` 内部循环中的单次 HTTP 尝试置于独立的 `try...finally` 块中。
   - 单次尝试完成时（无论是成功、待重试还是失败），其 `finally` 块**立即**调用 `clearTimeout(timeoutId)` 并移除 `opts.signal` 上的 abort 监听器。
   - 严禁在进入退避休眠时保持上一次尝试的 30s 超时定时器运行（彻底避免 AD04 中 30s 定时器在 60s 退避期间错误触发并中止已完成尝试的 signal）。
   - 退避阶段使用独立的 `sleepWithAbort`，外部 abort 监听器数量稳定为 1（<= 1），请求结算后监听器数量与定时器数量完全归 0。
2. **Retry-After 调度预算控制与 Node 32 位定时器防溢出**：
   - 在 `DetunedClientOptions` 增加 `maxRetryAfterMs` 配置项（默认 120,000ms / 2 分钟）。
   - 在 `parseRetryAfter` 中增加预算与溢出检测：
     - 若服务端返回的 `Retry-After`（例如 `2147484` 秒 = 2,147,484,000 毫秒）超出 `maxRetryAfterMs`，或超出 Node.js `setTimeout` 的 32 位带符号整数上限（`2147483647` 毫秒），客户端**立即停止自动重试**，直接向调用方抛出服务端的原始 `DetunedError`。
     - 坚决杜绝 Node 定时器溢出回绕至 1ms 导致的立即违规重发请求。
3. **Pi 适配器架构增强与参数适配**：
   - 在 `packages/adapter-pi/src/index.ts` 导出并应用 `adaptToolSchema`，规范包装 TypeBox 工具参数结构。
   - 增加动态 token 同步（`syncClientToken`），使得命令处理器与工具执行时动态读取环境变量/凭据文件，与宿主运行时凭据生命周期保持一致。

---

## 2. 交付文件清单

```
docs/reviews/2026-10-02-m0-m1-r21/implementation-r4-c2/
├── README.md                                 # 本实施交付报告
├── coverage-audit.md                         # 缺陷修复、测试覆盖与代码变更审计
├── verification.md                           # 28 条命令实际执行清单与探针结果
├── commands.json                             # 28 条命令机器可读执行记录（全绿 exit 0）
├── baseline-before.json                      # 实施前 93 个基线文件 SHA256（0 差异）
├── baseline-after.json                       # 实施后 93 个基线文件 SHA256（9 个受控变更）
├── pre-fix-failures.txt                      # 修复前正式测试套件捕获的 8 项预期失败留存
├── observed-c-completion.json                # check-c-completion.mjs 实际输出（AD01-AD05 5/5 全通）
├── observed-c-completion.stderr.txt          # check-c-completion.mjs stderr（干净）
├── observed-build.txt                        # pnpm build 实际输出
├── observed-typecheck.txt                    # pnpm typecheck 实际输出
├── observed-lint.txt                         # pnpm lint 实际输出
├── observed-tests.txt                        # pnpm test:all 实际输出（175/175）
└── observed-*.json / .txt                    # 继承的全部 27 条命令原始执行输出（全部 exit 0）
```

---

## 3. 受控修改文件列表与证据

本轮仅受控修改了 9 个产品与测试源码文件，没有任何多余或投机性改动：

| 文件 | 变更说明 |
|---|---|
| `packages/protocol/src/openapi.ts` | 将 19 处 `{ type: 'object' }` 占位符替换为真实 TypeBox Request Schema |
| `packages/protocol/src/errors.ts` | `DetunedError` 显式增加 `isDetunedError = true` 与 `isTransportError = false` 属性 |
| `packages/server/src/utils/query.ts` | 增加 `validateNoBody` 校验函数，约束无正文写端点输入 |
| `packages/server/src/app.ts` | 增加 `preValidation` 钩子拦截所有写动词上的 query 参数，无副作用拒绝 |
| `packages/server/src/routes/admin.ts` | `DELETE membership` 与 `revoke credential` 端点调用 `validateNoBody` |
| `packages/server/src/routes/events.ts` | `DELETE consumer` 端点调用 `validateNoBody` |
| `packages/client/src/client.ts` | 导出 `ClientTransportError`；单次尝试 finally 立即清理定时器与监听器；Retry-After 预算保护与 32 位定时器溢出防护；解耦孤立 AbortError |
| `packages/adapter-pi/src/index.ts` | 导出 `adaptToolSchema`；工具与命令处理器增加 `syncClientToken` 动态凭据同步 |
| `tests/contracts/r4-c-contracts.test.ts` | 扩充 C01-6 (AD01), C01-7 (AD02), C02-5, C02-9 (AD03), C02-10 (AD04), C02-11 (AD05), C03-4 (Pi) 正式测试 |
