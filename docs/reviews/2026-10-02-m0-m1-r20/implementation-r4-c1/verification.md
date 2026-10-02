# M0/M1-R4-C.1 验证与执行记录 (Verification Record)

## 1. 执行环境与基准说明

- 工作目录：`/Users/sakimi/Desktop/Detuned`
- Git HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`（工作区保留多轮未提交改动，未执行任何 reset/clean/checkout）。
- 运行时：Node v26.3.0，pnpm 11.7.0，使用工作区锁定的依赖。
- 基线覆盖：基于 R20 基线的 93 个产品/测试/构建文件，录得 `baseline-before.json`（0 差异）与 `baseline-after.json`（受控修改 11 个文件，其余 82 个文件原哈希保持不变）。
- 冻结资产校验：
  - `tests/fixtures/historical-v1-schema.sql`: `0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`（严格一致）
  - `archive/pre-plan.original.md`: `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`（严格一致）
- 全量验证套件：27 条既定命令全部执行，**27 条全部 exit 0**。命令日志完整采集 stdout 与 stderr，生成机器可读清单 `commands.json`。

---

## 2. 27 条命令实际执行清单

| # | 命令 | exit | 预期 exit | 结果与摘要 | 输出日志 |
|---|---|---|---|---|---|
| 1 | `pnpm build` | 0 | 0 | 9 个工作区包完整构建成功 | [observed-build.txt](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | 0 | 9 个工作区包 TypeScript 检查无报错 | [observed-typecheck.txt](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | 0 | 代码格式与 schema 同步检查通过 | [observed-lint.txt](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 0 | 169/169 通过（13 文件，B 82 项，生成 6 项，C 16 项） | [observed-tests.txt](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 0 | 15/15 探针通过 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 0 | 5/5 探针通过 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 0 | 12/12 探针通过 | [observed-r2.json](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 0 | CLI 功能检查通过 | [observed-r2-cli.json](observed-r2-cli.json) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 0 | 10/10 探针通过 | [observed-r3.json](observed-r3.json) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 0 | Serve 版本检查通过 | [observed-r3-serve.json](observed-r3-serve.json) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 0 | 0 | 8/8 探针全通（U01-U08 全部 pass，原 U05/U06 修复通过） | [observed-r4.json](observed-r4.json) |
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
| 27 | `node docs/reviews/2026-10-02-m0-m1-r20/check-c-boundaries.mjs` | 0 | 0 | 6/6 探针全通（AC01-AC06 全部 pass） | [observed-c-boundaries.json](observed-c-boundaries.json) / [stderr](observed-c-boundaries.stderr.txt) |

---

## 3. R20 独立探针 check-c-boundaries.mjs 详尽表现

在本次修复后，`docs/reviews/2026-10-02-m0-m1-r20/check-c-boundaries.mjs` 的 6 个探针全部通过（`passed: 6, failed: 0`）：

1. **AC01: C01 query/body/reference validation rejects without side effects (`passes: true`)**
   - `unknown_query`: 400，状态无变化，通过。
   - `duplicate_cursor`: 400，状态无变化，通过。
   - `duplicate_tags`: 400，状态无变化，通过。
   - `invalid_state`: 400，状态无变化，通过。
   - `explicit_empty_revision`: 400，状态无变化，通过。
   - `missing_actor_reference`: 404，状态无变化，通过。
   - `malformed_json`: 400 (`VALIDATION_ERROR`, `retryable: false`)，状态无变化，通过。
   - `revoke_unknown_body`: 400，凭据未被意外撤销，通过。
   - `client_poll_omitted_optional_query`: 默认缺省 query 与显式 `{}` 均成功 resolve，正例 status 200，通过。

2. **AC02: C02 validates known successful envelope fields (`passes: true`)**
   - `wrong_api_version`: 抛出 `ClientProtocolError`，通过。
   - `null_request_id`: 抛出 `ClientProtocolError`，通过。
   - `object_request_id`: 抛出 `ClientProtocolError`，通过。
   - `error_and_data`: 抛出 `ClientProtocolError`，通过。
   - 正例 `envelope(false, { future_extension: 1 })`: 正确解析 `data: false` 且兼容未来扩展字段，通过。

3. **AC03: C02 preserves server errors independently of message wording (`passes: true`)**
   - `revision conflict`: 保留 `DetunedError` (`code: 'REVISION_CONFLICT'`, status 409)，通过。
   - `transaction aborted because revision changed`: 彻底摆脱猜词逻辑，严格保留 `DetunedError` (`code: 'REVISION_CONFLICT'`, status 409, `isUserAbort: false`)，通过。

4. **AC04: C02 network/status retry policy and Retry-After (`passes: true`)**
   - `fetch_cause_econnrefused`: 准确识别 Node 原生 fetch 抛出之 `TypeError` 中 `err.cause.code === 'ECONNREFUSED'`，重发 1 次重用 stable-key 并成功 resolve，通过。
   - `retry_after_503`: 准确解析 `Retry-After: 60` 头并调度 >= 60000ms 延迟，重试成功，通过。
   - `retryable_400`: 客户端错误 400 严禁重试，调用次数为 1，直接抛出 `DetunedError`，通过。

5. **AC05: C02 cancellation phases, final listener cleanup, and timeout positive controls (`passes: true`)**
   - 全部 5 个阶段（`before_request`、`headers`、`body`、`backoff`、`timeout`）精确对应预期取消/超时分类，调用次数严格受控，最终 `final_abort_listeners === 0`，无监听器泄漏。

6. **AC06: C03 registered Pi command/tool controlled positive and failure paths (`passes: true`)**
   - `/forum-check` 与 `/forum-status` 在 `hasUI: true`（发送 ui.notify）与 `hasUI: false`（输出到控制台）下均行为准确；工具遇到畸形 JSON 时干净 reject。
