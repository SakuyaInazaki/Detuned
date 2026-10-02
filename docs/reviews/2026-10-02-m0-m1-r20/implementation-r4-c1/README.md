# M0/M1-R4-C.1 实施交付报告：补齐请求边界、响应错误与重试契约

## 0. 任务标识与交付摘要

- **任务编号**：`M0/M1-R4-C.1`
- **实施周期**：2026-10-02
- **工作区状态**：
  - Git HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留多轮未提交工作，未做任何 reset/clean/checkout）。
  - 基线文件覆盖：覆盖 R20 基线的 **93 个产品/测试/构建文件**，详见 `baseline-before.json`（0 差异）与 `baseline-after.json`（受控修改 11 个文件，其余 82 个文件原哈希保持不变）。
  - 冻结文件校验：
    - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（原字节完好）。
    - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（原字节完好）。
- **执行纪律**：严禁并未使用、安装或启用 `deepseek-brainstorm`；不启动外部 Agent、不调用模型、不更改全局 harness 配置、不擅自推送/部署/发布。
- **验证成果**：
  - 全量 27 条验证命令 **100% exit 0**（26 条既有继承命令全部 exit 0，新 `check-c-boundaries.mjs` 探针 6/6 全部 pass）。
  - 正式测试套件 **169 / 169 项全部通过**（13 个测试文件，无跳过、无失败）。

---

## 1. 核心问题定位与工程修复

在 R20 独立复核中，B 包功能与生成管线已彻底验收关闭，但 C01/C02/C03 暴露了 4 项关键缺陷（R20-F01 ~ R20-F04，导致 `check-c-boundaries.mjs` 在 AC01–AC04 失败）。本轮进行了针对性、外科手术式的修复：

### 1.1 R20-F01 (AC01): 请求边界防护与 32 路由完整清单

1. **未知 Query 参数白名单拦截**：
   - 在 `packages/server/src/utils/query.ts` 引入 `validateAllowedQueryParams(query, allowedKeys)`。
   - 在 `/spaces`、`/spaces/:id/context`、`/spaces/:id/threads`、`/spaces/:id/threads/:id`、`/spaces/:id/posts/:id`、`/spaces/:id/posts/:id/revisions`、`/spaces/:id/search`、`/spaces/:id/views/:name`、`/capabilities`、`/me` 等所有 GET 路由中强制校验允许的 query 键集合，任何未知参数（如 `GET /spaces?bogus=1`）均直接抛出 400 `VALIDATION_ERROR`。
2. **标量与 CSV 数组参数防重复指定**：
   - 实现 `parseStringQuery`，针对标量参数（如 `cursor`、`focus_thread_id`、`thread_id`）拦截数组输入，拒绝 `cursor=a&cursor=b`。
   - 实现 `parseCsvQuery`，针对 `tags` 拦截数组输入（避免 Fastify 将 `tags=a&tags=b` 传给底层引发 `.split` 崩溃），要求逗号分隔格式。
3. **严格枚举与显式空值拒绝**：
   - `threads` 路由严格限制 `state` 只能是 `'open'` 或 `'archived'`，非法状态拒绝 400。
   - `parseIntegerQuery` 严格区分 `undefined`（缺省允许默认值）与 `""`（显式空字符串），对 `GET /posts/:id?revision=` 显式空修订抛出 400 `VALIDATION_ERROR`。
4. **关联实体前置校验与零副作用防线**：
   - 在 `POST /spaces/:id/memberships` 入库前预检 `actor_id`，不存在时直接返回 404 `NOT_FOUND`，杜绝产生数据库外键崩溃或孤立事件与幂等记录。
5. **畸形 JSON 框架错误标准化**：
   - 增强 `packages/server/src/app.ts` 的全局错误处理器，拦截 Fastify 框架抛出的 4xx 状态码（如畸形 JSON 请求体 `'{'`），规范封装为 400 `VALIDATION_ERROR` (`retryable: false`)，避免回退至 500 临时错误。
6. **无正文写操作端点保护**：
   - `POST /admin/credentials/:id/revoke` 校验请求体，拒绝未知业务字段（如 `{ unrecognized_business_field: true }`），防止参数污染与误撤销。
7. **客户端可选 Query 参数缺省容错**：
   - `client.poll(spaceId, consumerId, query)` 当 `query` 缺省（`undefined`）时默认传递 `{}`，保证与服务端 `PollRequestSchema` 完美兼容。
8. **OpenAPI 3.1 规范 32 路由完整同步**：
   - 更新 `packages/protocol/src/openapi.ts` 的 `generateOpenApiSpec()`，将当前已启用的全部 32 个操作完整编入 paths，与 `route-inventory.json` 保持 100% 对应。

### 1.2 R20-F02 (AC02): 成功信封外壳校验与 ClientProtocolError

1. **信封关键字段强校验**：
   - 在 `packages/client/src/client.ts` 导出客户端专用的 `ClientProtocolError extends Error`。
   - 当 HTTP 响应为 200/201 成功状态时，严格检查：
     - `json.api_version === '1'`（非法版本抛出 `ClientProtocolError`）
     - `typeof json.request_id === 'string' && json.request_id.trim() !== ''`（null 或 object 抛出 `ClientProtocolError`）
     - `'data' in json`（缺少 data 抛出 `ClientProtocolError`）
     - `json.error !== undefined && json.error !== null`（成功信封不可含 error，违者抛出 `ClientProtocolError`）
     - 响应体 JSON 解析失败时抛出 `ClientProtocolError`，不再伪装成服务端的 `DetunedError(VALIDATION_ERROR)`。
2. **保真合法 Falsy 数据与前向兼容**：
   - 使用 `'data' in json` 判定，严格保留 `data: false`、`null`、`0`、`[]`、`""` 等合法取值；允许未知的顶层前向字段（如 `{ future_extension: 1 }`）不被截断或丢弃。

### 1.3 R20-F03 (AC03): 独立于错误文本的错误分类

1. **彻底消除基于 message 猜词的脆弱逻辑**：
   - 从 `packages/client/src/client.ts` 中完全移除了 `err.message?.includes('aborted')`。
2. **保真服务端业务错误**：
   - 调整 catch 块顺序，优先确保 `err instanceof DetunedError` 完整抛出，避免将包含 "transaction aborted because revision changed" 描述的 409 `REVISION_CONFLICT` 错误误判为 `UserAbortError`。
   - 仅对真实的外部取消（`opts.signal?.aborted`、`isUserAborted`、原生 fetch 的 `AbortError`）抛出 `UserAbortError`。

### 1.4 R20-F04 (AC04): 有界重试、网络 Cause 识别与 Retry-After 调度

1. **Node 原生 fetch 的 Cause 链识别**：
   - 实现 `isNetworkError`，检查 `err.code` 及 `err.cause?.code`，将包含 `ECONNREFUSED`、`ECONNRESET`、`ENOTFOUND`、`ETIMEDOUT` 的 `TypeError` 识别为重试候选。
2. **客户端错误状态码禁重试前置规则**：
   - 明确状态码重试优先级：状态码在 `[400, 401, 403, 404, 409, 413, 422]` 范围内的客户端错误，**绝对不进行重试**，即便服务端响应体包含 `retryable: true` 亦不重试。
   - 仅针对 429、502、503、504 及网络瞬断进行重试。
3. **支持 Retry-After 头调度**：
   - 实现 `parseRetryAfter`，支持纯秒数字符串与标准 HTTP-date，自动换算毫秒数。对于 `Retry-After: 60` 响应，调度延迟达到 60000ms。
4. **有界重试次数与资源清理**：
   - 严格限制：1 次初始调用 + 最多 `maxRetries` 次重试（共 `maxRetries + 1` 次尝试）。
   - 实现 `sleepWithAbort`，在每次请求结束及退避休眠被中断或自然完成后，立即通过 `cleanup()` 移除 signal 上的 abort 监听器并清除 timer，彻底杜绝内存泄漏。

---

## 2. 交付文件清单

```
docs/reviews/2026-10-02-m0-m1-r20/implementation-r4-c1/
├── README.md                                 # 本实施交付报告
├── coverage-audit.md                         # 缺陷修复、测试覆盖与路由核对审计
├── verification.md                           # 27 条命令实际执行清单与探针结果
├── route-inventory.json                      # 32 个启用操作与 OpenAPI 匹配清单
├── commands.json                             # 27 条命令机器可读执行记录
├── baseline-before.json                      # 实施前 93 个基线文件 SHA256
├── baseline-after.json                       # 实施后 93 个基线文件 SHA256（11 个受控变更）
├── observed-build.txt                        # pnpm build 实际输出
├── observed-typecheck.txt                    # pnpm typecheck 实际输出
├── observed-lint.txt                         # pnpm lint 实际输出
├── observed-tests.txt                        # pnpm test:all 实际输出（169/169）
├── observed-c-boundaries.json                # check-c-boundaries.mjs 实际输出（AC01-AC06 全通）
├── observed-c-boundaries.stderr.txt          # check-c-boundaries.mjs stderr（干净）
└── observed-r*.json                          # 继承的各轮独立探针原始执行输出（全部 exit 0）
```

---

## 3. M2.1 准备就绪度评估 (Readiness Evaluation)

在完成 R4-C.1 的全部修复后，我们对后续进入 M2.1 进行了完备性评估：

1. **已具备条件（Ready）**：
   - **底层存储与结构演进（R4-B）**：单一权威 DDL 来源、严格主键排序与方向约束（AB01）、虚拟表 FTS5 trigram 语义校验、完整操作族序列化重放对称性已彻底闭环并通过全部审查。
   - **HTTP 契约防线（R4-C01）**：全量 32 个路由的 Query 白名单拦截、单值防重复、CSV 校验、枚举限制、前置引用强校验、畸形 JSON 规范化封装已全部落地并通过受控注入验证。
   - **客户端生命周期与容错（R4-C02）**：成功信封强类型校验、ClientProtocolError 分流、独立于 message 文本的业务冲突错误保真、基于 Cause 的网络重试、4xx 禁重试防线、Retry-After 调度以及五个取消阶段的定时器/监听器安全清理已全部完备。
   - **适配器与环境声明（R4-C03）**：MCP stdio 通信、Pi 官方类型编译、headless 与 UI 输出隔离、工作区 Node >=22.19.0 声明对齐已全部通过。
2. **进入下一阶段前的事项（Next Step）**：
   - 交回独立复核（R21 Review），由审查者基于独立探针和交付产物确认 AC01–AC06 真实通过情况。
   - 保持 M2（附件二进制传输、复杂评审流程等）的工作边界，不在此提前启动 M2 代码编写。
