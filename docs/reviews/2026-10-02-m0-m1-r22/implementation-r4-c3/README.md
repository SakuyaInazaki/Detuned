# M0/M1-R4-C.3 实施交付报告：恢复 Pi 写工具参数校验、统一客户端正文生命周期与完成当前接口契约验收

## 0. 任务标识与交付摘要

- **任务编号**：`M0/M1-R4-C.3`
- **实施周期**：2026-10-03
- **工作区状态**：
  - Git HEAD：`b8dacd56779a007a2e7045b682bca0c036fdfc44`（工作区保留多轮未提交工作，未做任何 `reset` / `clean` / `checkout`）。
  - 基线文件覆盖：覆盖 R22 基线的 **93 个产品/测试/构建文件**，详见 `baseline-before.json`（0 差异）与 `baseline-after.json`（受控修改 6 个文件，其余 87 个文件原哈希保持不变）。
  - 冻结文件校验：
    - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（原字节严格一致）。
    - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（原字节严格一致）。
- **执行纪律**：严禁并未使用、安装或启用 `deepseek-brainstorm` 及其任何派生形态；不启动外部 Agent、不调用模型、不更改全局 harness 配置、不擅自提交/推送/部署/发布；不提前开始 M2.1。
- **验证成果**：
  - 全量 29 条验证命令 **100% exit 0**（28 条既有继承命令全部 exit 0，当期 `check-c2-boundaries.mjs` 探针 5/5 全部 pass）。
  - 正式测试套件 **180 / 180 项全部通过**（13 个测试文件，无跳过、无失败；`tests/contracts/r4-c-contracts.test.ts` 从 22 项扩增至 27 项）。
  - 预修复失败留存：在修复前将 AE01–AE05 反例落入正式测试套件，执行并留存失败现场至 `pre-fix-failures.txt`（4 tests failed, 22 passed），彻底杜绝无真实重现与修复验证的假通过。

---

## 1. 核心问题定位与工程修复

在 R22 独立复核中，B 包数据/升级功能与 C.2 的 175 项测试及 28 条命令已确认通过。但 R22 在 AE01–AE05 的有限补查中发现 4 组遗留缺陷（R22-F01 ~ R22-F03，导致 `check-c2-boundaries.mjs` 仅 1/5 通过）。本轮针对这三组缺陷进行了彻底、外科手术式的工程修复：

### 1.1 单元 A (R22-F01, P1 级缺陷, AE04): 恢复 Pi 写工具参数校验

1. **根因定位**：
   - 在 `packages/adapter-pi/src/index.ts` 中，`adaptToolSchema()` 对所有传入的 schema 强行注入了顶层的 `properties: {}` 和 `additionalProperties: false`。
   - 对于普通简单对象 Schema 尚能勉强工作，但对于 `forum_publish`（包含 thread, post, revision, withdraw 4 个 union 分支）和 `forum_relate`（包含 create, resolve, reopen 3 个 union 分支），顶层注入的空 properties 导致 Pi 0.87.1 官方参数校验器（基于 Ajv）将联合分支的所有合法字段视作未声明的额外属性而全部拒绝报错（`must NOT have additional properties`）。
2. **工程修复**：
   - 修复 `packages/adapter-pi/src/index.ts` 中的 `adaptToolSchema()`，彻底移除顶层盲目注入的 `properties: {}` 与 `additionalProperties: false`，直接保真返回原始 schema 对象。
   - 联合 Schema 与普通对象 Schema 均能无损交由 Pi 0.87.1 原生参数校验器处理。
3. **效果验证**：
   - Pi 0.87.1 官方校验器对 `forum_publish` 4 个分支（thread, post, revision, withdraw）与 `forum_relate` 3 个分支（create, resolve, reopen）合法入参全部通过（AE04 passes）。
   - 坏 JSON 依然抛出 `ClientProtocolError`，业务 409 `REVISION_CONFLICT` 保真透传。
   - 正式测试 `tests/contracts/r4-c-contracts.test.ts` 中新增 `C03-5` 覆盖该联合 schema 校验。

### 1.2 单元 B (R22-F02, AE01/AE02/AE05): 客户端正文生命周期、控制信号与传输错误分类

1. **正文 await 结算后控制信号优先**：
   - 在 `packages/client/src/client.ts` 中，在 `await res.json()` 之后立即检查 `isUserAborted || opts.signal?.aborted` 与 `isTimedOut`。
   - 若外部 signal 触发 abort 或超时定时器触发，立即抛出 `UserAbortError` 或 `TimeoutError`，即使服务端响应体恰好返回 200 或 409，外部取消与超时也绝对优先于业务响应。
2. **正文流式网络中断与 4xx 状态码保护**：
   - 用 `try...catch` 包裹 `res.json()`，对流式读取阶段抛出的网络错误、孤立 AbortError（如 `UND_ERR_SOCKET`、`ECONNRESET`）捕获并统一包装为 `ClientTransportError`。
   - 检查 HTTP 状态码，若为不可重试的 4xx（400, 401, 403, 404, 409, 413, 422），即使正文读取中断亦绝不进入重试，直接抛出 `ClientTransportError`（标记 `retryable: false`）并立即终止重试循环（`calls === 1`）。
3. **消除正则猜词过度**：
   - 移除 `isNetworkError` 中的 `/fetch failed/i` 文本匹配，精确基于 cause code 白名单（`ECONNREFUSED`、`ECONNRESET`、`ENOTFOUND`、`ETIMEDOUT` 等）判定重试。
   - TLS 证书过期错误（`CERT_HAS_EXPIRED`）统一作为不可重试的 `ClientTransportError` 抛出，杜绝永久错误死循环重试。
4. **Retry-After 正例覆盖**：
   - 补齐 HTTP-date 解析测试、非法格式退避回退测试、以及超出预算立即终止重试的控制组测试（AE05 passes）。

### 1.3 单元 C (R22-F03, AE03): OpenAPI 3.1 参数、认证与路由契约全面对齐

1. **列表 limit 参数与查询约束**：
   - 在 `packages/protocol/src/openapi.ts` 中，为 `/spaces`、`/threads`、`/revisions`、`/search` 等接口的 `limit` 参数补齐 `minimum: 1, maximum: 100, default: 20`；为 `/threads/{id}` 的 `limit` 设置 `default: 50`；为 `/context` 的 `max_bytes` 设置 `minimum: 4096, maximum: 65536, default: 12288`；为 `/posts/{id}` 的 `revision` 设置 `minimum: 1`。
2. **搜索类型枚举绑定**：
   - 在 `packages/protocol/src/posts.ts` 导出 `POST_KINDS` 常量（`['root', 'reply', 'review_comment', 'decision']`）并在 `@detuned/protocol` 根统一导出，在 `packages/server/src/routes/search.ts` 中复用。
   - OpenAPI 搜索接口 `kind` 参数绑定 `POST_KINDS` 枚举；视图接口 `name` 参数绑定已知视图枚举。
3. **匿名访问显式声明**：
   - 为 `GET /capabilities` 显式声明 `security: []`，明确支持匿名访问。
4. **订阅与轮询端点对齐**：
   - 将订阅端点 `POST /spaces/{space_id}/subscriptions` 的 `Idempotency-Key` 参数声明改为 `required: false`。
   - 将轮询端点 `POST /spaces/{space_id}/consumers/{id}/poll` 的 `requestBody` 改为 `required: true`。

---

## 2. 交付文件清单

```
docs/reviews/2026-10-02-m0-m1-r22/implementation-r4-c3/
├── README.md                                 # 本实施交付报告
├── coverage-audit.md                         # 缺陷修复、测试覆盖与 32 操作契约核对表
├── verification.md                           # 29 条命令实际执行清单与 AE01-AE05 结果
├── commands.json                             # 29 条命令机器可读执行记录（全绿 exit 0）
├── baseline-before.json                      # 实施前 93 个基线文件 SHA256（0 差异）
├── baseline-after.json                       # 实施后 93 个基线文件 SHA256（6 个受控变更）
├── pre-fix-failures.txt                      # 修复前正式测试套件捕获的 4 项预期失败留存
├── observed-c2-boundaries.json               # check-c2-boundaries.mjs 实际输出（AE01-AE05 5/5 全通）
├── observed-c2-boundaries.stderr.txt         # check-c2-boundaries.mjs stderr（干净）
├── observed-build.txt                        # pnpm build 实际输出
├── observed-typecheck.txt                    # pnpm typecheck 实际输出
├── observed-lint.txt                         # pnpm lint 实际输出
├── observed-tests.txt                        # pnpm test:all 实际输出（180/180）
└── observed-*.json / .txt                    # 继承的全部 28 条命令原始执行输出（全部 exit 0）
```

---

## 3. 验收建议与后续安排

本轮修改严格局限于有限缺陷清单，未修改历史固定资产，未触碰已验收的 B 包数据结构与生成逻辑。
在独立复核确认全套 29 条命令、AE01–AE05、以及 180 项正式测试通过后，M0/M1-R4-C 接口契约包整体可宣布收尾，后续可推进下一阶段的 **M2.1 附件与记忆包**。
