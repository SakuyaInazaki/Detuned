# M0/M1-R4-C.3 验证与执行记录 (Verification Record)

## 1. 执行环境与基准说明

- **工作目录**：`/Users/sakimi/Desktop/Detuned`
- **Git HEAD**：`b8dacd56779a007a2e7045b682bca0c036fdfc44`（工作区保留多轮未提交改动，未执行任何 `reset` / `clean` / `checkout`）。
- **运行时环境**：Node v26.3.0，pnpm 11.7.0，使用工作区锁定的依赖。
- **基线覆盖**：基于 R22 基线的 93 个产品/测试/构建文件，录得 `baseline-before.json`（0 差异）与 `baseline-after.json`（受控修改 6 个文件，其余 87 个文件原哈希保持不变）。
- **冻结资产校验**：
  - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（严格一致）
  - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（严格一致）
- **全量验证套件**：全量 29 条既定命令全部执行，**29 条全部 exit 0**。命令日志完整采集 stdout 与 stderr，生成机器可读清单 `commands.json`。
- **预修复失败留存**：在修复前将 AE01–AE05 反例固化为正式测试并记录失败现场至 `pre-fix-failures.txt`（4 tests failed, 22 passed），修复后全量套件 180 / 180 全部通过。

---

## 2. 29 条命令实际执行清单

| # | 命令 | exit | 预期 exit | 结果与摘要 | 输出日志 |
|---|---|---|---|---|---|
| 1 | `pnpm build` | 0 | 0 | 9 个工作区包完整构建成功 | [observed-build.txt](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | 0 | 9 个工作区包 TypeScript 检查无报错 | [observed-typecheck.txt](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | 0 | 代码格式与 schema.sql/ts 强一致同步检查通过 | [observed-lint.txt](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 0 | **180/180 全部通过**（13 个测试文件，B 82 项，生成 6 项，C 27 项） | [observed-tests.txt](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 0 | 15/15 探针通过 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 0 | 5/5 探针通过 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 0 | 12/12 探针通过 | [observed-r2.json](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 0 | CLI 功能检查通过（3/3 项通过） | [observed-r2-cli.json](observed-r2-cli.json) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 0 | 10/10 探针通过 | [observed-r3.json](observed-r3.json) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 0 | Serve 版本检查通过 | [observed-r3-serve.json](observed-r3-serve.json) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 0 | 0 | 8/8 探针全通（U01-U08 全部 pass） | [observed-r4.json](observed-r4.json) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 0 | 9/9 探针通过 | [observed-r5.json](observed-r5.json) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 0 | 10/10 探针通过 | [observed-r6.json](observed-r6.json) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 0 | 7/7 探针通过 | [observed-r7.json](observed-r7.json) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 0 | 1/1 探针通过 | [observed-r7-fixture.json](observed-r7-fixture.json) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 0 | 8/8 探针通过 | [observed-r8.json](observed-r8.json) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 0 | 5/5 探针通过 | [observed-r9.json](observed-r9.json) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 0 | 6/6 探针通过 | [observed-r10.json](observed-r10.json) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 0 | 5/5 探针通过 | [observed-r11.json](observed-r11.json) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 0 | 5/5 探针通过 | [observed-r12.json](observed-r12.json) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 0 | 3/3 探针通过 | [observed-r13.json](observed-r13.json) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 0 | 3/3 探针通过 | [observed-r14.json](observed-r14.json) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 0 | 4/4 探针通过（Y01-Y04 全部 pass） | [observed-structural-boundaries.json](observed-structural-boundaries.json) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 0 | 4/4 探针通过（Z01-Z04 全部 pass） | [observed-schema-semantics.json](observed-schema-semantics.json) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | 0 | 4/4 探针通过（AA01-AA04 全部 pass） | [observed-profile-and-fts.json](observed-profile-and-fts.json) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 0 | 0 | 4/4 探针通过（AB01-AB04 全部 pass） | [observed-generation-completeness.json](observed-generation-completeness.json) |
| 27 | `node docs/reviews/2026-10-02-m0-m1-r20/check-c-boundaries.mjs` | 0 | 0 | 6/6 探针通过（AC01-AC06 全部 pass） | [observed-c-boundaries.json](observed-c-boundaries.json) |
| 28 | `node docs/reviews/2026-10-02-m0-m1-r21/check-c-completion.mjs` | 0 | 0 | 5/5 探针全部通过（AD01-AD05 全部 pass） | [observed-c-completion.json](observed-c-completion.json) |
| 29 | `node docs/reviews/2026-10-02-m0-m1-r22/check-c2-boundaries.mjs` | 0 | 0 | **5/5 探针全部通过（AE01-AE05 全部 pass）** | [observed-c2-boundaries.json](observed-c2-boundaries.json) / [stderr](observed-c2-boundaries.stderr.txt) |

---

## 3. 当期独立探针 check-c2-boundaries.mjs (AE01-AE05) 详尽表现

在本次实施完成后，`docs/reviews/2026-10-02-m0-m1-r22/check-c2-boundaries.mjs` 的 5 个探针全部通过（`passed: 5, failed: 0`，exit 0）：

1. **AE01: Client control signals (user abort / timeout) win after body resolution (`passes: true`)**
   - `user_abort_after_200_body`: 外部 signal 在 `await res.json()` 期间触发中止，请求结果返回 `UserAbortError`（`isUserAbort: true, isTimeout: false, isDetunedError: false`），通过。
   - `user_abort_after_409_body`: 外部 signal 中止，即使服务端响应体包含 `REVISION_CONFLICT`，客户端仍判定为 `UserAbortError`，通过。
   - `timeout_after_200_body`: 超时定时器触发，客户端判定为 `TimeoutError`（`isTimeout: true, isUserAbort: false`），通过。
   - `timeout_after_409_body`: 超时定时器触发，客户端判定为 `TimeoutError`，不伪装成业务 409，通过。

2. **AE02: Stream transport errors during body reading are classified as transport and not retried for 4xx (`passes: true`)**
   - `body_und_err_socket`: 响应流断开抛出 `UND_ERR_SOCKET`，客户端分类为 `ClientTransportError`（`isTransportError: true, retryable: true`），通过。
   - `body_stream_abort`: 孤立 AbortError 流式中断，分类为 `ClientTransportError`（`isUserAbort: false, retryable: true`），通过。
   - `body_failure_409`: 服务端返回 409 且正文流中断，客户端抛出 `ClientTransportError` 且 `retryable: false`，调用次数精确为 1（`calls === 1`，绝不进入重试），通过。
   - `cert_expired_permanent`: TLS 证书过期错误（`CERT_HAS_EXPIRED`），客户端作为不可重试的 `ClientTransportError`（`retryable: false`）抛出，调用次数精确为 1，通过。

3. **AE03: Complete OpenAPI 3.1 parameter, security, and operation alignment (`passes: true`)**
   - `limit_constraints`: 检查 `/spaces`、`/threads`、`/revisions`、`/search` 等接口的 `limit` 参数，确认具有 `minimum: 1, maximum: 100, default: 20`（且 `/threads/{id}` 为 default 50），通过。
   - `search_kind_enum`: 检查搜索路由 `kind` 参数，确认绑定 `POST_KINDS` 枚举（`['root', 'reply', 'review_comment', 'decision']`），通过。
   - `capabilities_security`: 检查 `GET /capabilities`，确认显式声明 `security: []`，通过。
   - `subscription_idempotency_key`: 检查 `POST /subscriptions`，确认 `Idempotency-Key` 为 `required: false`，通过。
   - `poll_request_body`: 检查 `POST /consumers/{id}/poll`，确认 `requestBody.required === true`，通过。

4. **AE04: Pi tool schemas accept all union branches under installed Pi validator (`passes: true`)**
   - `forum_publish` 4 个联合分支：
     - `op: 'thread'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
     - `op: 'post'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
     - `op: 'revision'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
     - `op: 'withdraw'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
   - `forum_relate` 3 个联合分支：
     - `op: 'create'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
     - `op: 'resolve'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
     - `op: 'reopen'` -> `adapted_accepts: true`, `installed_pi_validator_adapted: resolved`, `passes: true`
   - 控制组：
     - 损坏 JSON 输入抛出 `ClientProtocolError`（`resolved: false`），通过。
     - 服务端 409 `REVISION_CONFLICT` 错误透传保真（`resolved: false, code: 'REVISION_CONFLICT'`），通过。

5. **AE05: Finite Retry-After positive controls: HTTP-date, invalid fallback, and date over budget (`passes: true`)**
   - `http_date`: 接收标准 HTTP-date 格式（`Fri, 02 Oct 2026 00:00:05 GMT`），调度延迟 5000ms，调用 2 次成功，通过。
   - `invalid_header`: 接收非法格式（`not-a-date-or-seconds`），安全回退至指数退避 1000ms，调用 2 次成功，通过。
   - `date_over_budget`: 接收超出预算的 HTTP-date（超过 120s 预算），立即终止重试，调用次数精确为 1，向调用方抛出 503 `DetunedError`，通过。
