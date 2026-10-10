# M0/M1-R4-C.2 验证与执行记录 (Verification Record)

## 1. 执行环境与基准说明

- **工作目录**：`/Users/sakimi/Desktop/Detuned`
- **Git HEAD**：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留多轮未提交改动，未执行任何 `reset` / `clean` / `checkout`）。
- **运行时环境**：Node v26.3.0，pnpm 11.7.0，使用工作区锁定的依赖。
- **基线覆盖**：基于 R21 基线的 93 个产品/测试/构建文件，录得 `baseline-before.json`（0 差异）与 `baseline-after.json`（受控修改 9 个文件，其余 84 个文件原哈希保持不变）。
- **冻结资产校验**：
  - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（严格一致）
  - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（严格一致）
- **全量验证套件**：全量 28 条既定命令全部执行，**28 条全部 exit 0**。命令日志完整采集 stdout 与 stderr，生成机器可读清单 `commands.json`。
- **预修复失败留存**：在修复前将 AD01–AD05 反例固化为正式测试并记录失败现场至 `pre-fix-failures.txt`（8 tests failed, 14 passed），修复后全量套件 175 / 175 全部通过。

---

## 2. 28 条命令实际执行清单

| # | 命令 | exit | 预期 exit | 结果与摘要 | 输出日志 |
|---|---|---|---|---|---|
| 1 | `pnpm build` | 0 | 0 | 9 个工作区包完整构建成功 | [observed-build.txt](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | 0 | 9 个工作区包 TypeScript 检查无报错 | [observed-typecheck.txt](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | 0 | 代码格式与 schema.sql/ts 强一致同步检查通过 | [observed-lint.txt](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 0 | 175/175 全部通过（13 个测试文件，B 82 项，生成 6 项，C 22 项） | [observed-tests.txt](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 0 | 15/15 探针通过 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 0 | 5/5 探针通过 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 0 | 12/12 探针通过 | [observed-r2.json](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 0 | CLI 功能检查通过 | [observed-r2-cli.json](observed-r2-cli.json) |
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
| 28 | `node docs/reviews/2026-10-02-m0-m1-r21/check-c-completion.mjs` | 0 | 0 | **5/5 探针全部通过（AD01-AD05 全部 pass）** | [observed-c-completion.json](observed-c-completion.json) / [stderr](observed-c-completion.stderr.txt) |

---

## 3. 当期独立探针 check-c-completion.mjs (AD01-AD05) 详尽表现

在本次实施完成后，`docs/reviews/2026-10-02-m0-m1-r21/check-c-completion.mjs` 的 5 个探针全部通过（`passed: 5, failed: 0`，exit 0）：

1. **AD01: C01 unknown write query and no-body delete inputs reject before mutation (`passes: true`)**
   - `create_space_unknown_query` (`POST /api/v1/spaces?bogus=1`): 状态码 400，`code: VALIDATION_ERROR`，数据库快照对比（spaces, events, idempotency_records 等）100% 保持未变，通过。
   - `delete_membership_unknown_body` (`DELETE /api/v1/spaces/:sid/memberships/:aid` 带 `{ bogus: true }`): 状态码 400，状态未修改，通过。
   - `delete_consumer_unknown_body` (`DELETE /api/v1/spaces/:sid/consumers/:cid` 带 `{ bogus: true }`): 状态码 400，状态未修改，通过。
   - 正例 `GET /spaces?limit=1`: 状态码 200，通过。

2. **AD02: C01 OpenAPI body constraints agree with existing protocol and HTTP (`passes: true`)**
   - `missing_required_fields`: OpenAPI 拒绝 (false), Protocol 拒绝 (false), HTTP 拒绝 (400)，三者行为一致，通过。
   - `wrong_field_type`: OpenAPI 拒绝 (false), Protocol 拒绝 (false), HTTP 拒绝 (400)，三者行为一致，通过。
   - `unknown_body_field`: OpenAPI 拒绝 (false), Protocol 拒绝 (false), HTTP 拒绝 (400)，三者行为一致，通过。
   - `valid_body`: OpenAPI 接受 (true), Protocol 接受 (true), HTTP 接受 (201)，三者行为一致，通过。
   - 路径中 19 个带 body 的操作全部完成具体 Schema 绑定，占位符数量 `placeholder_body_count: 0`，业务路由总数 32，通过。

3. **AD03: C02 unsolicited AbortError is not user cancellation and transport source is distinguishable (`passes: true`)**
   - `unsolicited AbortError`: `external_signal_aborted: false`，客户端抛出 `ClientTransportError`（`isUserAbort: false`, `isTimeout: false`, `isTransportError: true`, `kind: 'transport'`），通过。
   - `transport ECONNRESET`: 抛出 `ClientTransportError`（`isTransportError: true`, `isDetunedError: false`），通过。
   - `server 503`: 抛出 `DetunedError`（`isDetunedError: true`, `isTransportError: false`），通过。
   - 错误分类特征比对：`classification(transport.error)` 与 `classification(server.error)` 完全互斥异构，通过。
   - 服务端 409 `REVISION_CONFLICT`（含 "aborted" 描述文本）：保留 `DetunedError`（`code: 'REVISION_CONFLICT'`, status 409, `retryable: false`），通过。

4. **AD04: C02 request timer/listener finish before Retry-After backoff starts (`passes: true`)**
   - 退避起始阶段：30000ms 的单次超时定时器**不在**待处理定时器列表中（`pending_timer_delays_ms: [60000]`），外部 abort 监听器数量仅为 1（`external_abort_listeners <= 1`），通过。
   - 虚拟时间推进至 30s：未提前结束（`settled: false`），调用次数仍为 1，第 1 次尝试的 signal 保持未被超时中止（`completed_attempt_signal_aborted: false`），通过。
   - 虚拟时间推进至 60s：第 2 次尝试触发并成功 resolve，总调用次数 2，最终残留定时器为 0，外部 abort 监听器为 0，无任何资源泄露，通过。

5. **AD05: C02 oversized Retry-After must stop or wait safely, never overflow into an immediate retry (`passes: true`)**
   - 接收 `Retry-After: 2147484`（换算达 2,147,484,000 ms，超出 `maxRetryAfterMs` 与 Node 32 位定时器上限）：客户端立即终止自动重试，严禁向 Node 调度溢出定时器，直接向调用方抛出服务端的 503 `DetunedError`。
   - 实际调用次数精确保持为 1（`calls === 1`），没有发生 1ms 溢出回绕导致的立即重试，外部 abort 监听器完全归 0，通过。
