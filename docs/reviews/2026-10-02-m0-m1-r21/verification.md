# R21 独立验证记录

运行环境：Node v26.3.0；pnpm 11.7.0；实际工作区见 baseline.json。先 build 再复跑。所有命令在 `/Users/sakimi/Desktop/Detuned` 执行。

**继承的 27 条命令全部 exit 0；新增 AD 命令 exit 1。因此当前 28 条中 27 条通过，C 整体尚未通过。** 正式测试 169/169、13 文件；AC 6/6、U 8/8。AD 0/5 是已要求条件的补查，不能换算成产品完成百分比。

每条命令均分别保存 stdout/stderr；test:all 和 R2 CLI 使用本地随机端口，获执行权限后运行，不调用外部模型/服务。其余检查使用本地临时材料。

| # | 命令 | 退出码 | stdout / stderr |
|---|---|---|---|
| 1 | `pnpm build` | 0 | [stdout](observed-build.txt) / [stderr](observed-build.stderr.txt) |
| 2 | `pnpm typecheck` | 0 | [stdout](observed-typecheck.txt) / [stderr](observed-typecheck.stderr.txt) |
| 3 | `pnpm lint` | 0 | [stdout](observed-lint.txt) / [stderr](observed-lint.stderr.txt) |
| 4 | `pnpm test:all` | 0 | [stdout](observed-tests.txt) / [stderr](observed-tests.stderr.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | [stdout](observed-r1-behavior.json) / [stderr](observed-r1-behavior.stderr.txt) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | [stdout](observed-r1-adapters.json) / [stderr](observed-r1-adapters.stderr.txt) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | [stdout](observed-r2.json) / [stderr](observed-r2.stderr.txt) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | [stdout](observed-r2-cli.json) / [stderr](observed-r2-cli.stderr.txt) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | [stdout](observed-r3.json) / [stderr](observed-r3.stderr.txt) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | [stdout](observed-r3-serve.json) / [stderr](observed-r3-serve.stderr.txt) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 0 | [stdout](observed-r4.json) / [stderr](observed-r4.stderr.txt) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | [stdout](observed-r5.json) / [stderr](observed-r5.stderr.txt) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | [stdout](observed-r6.json) / [stderr](observed-r6.stderr.txt) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | [stdout](observed-r7.json) / [stderr](observed-r7.stderr.txt) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | [stdout](observed-r7-fixture.json) / [stderr](observed-r7-fixture.stderr.txt) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | [stdout](observed-r8.json) / [stderr](observed-r8.stderr.txt) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | [stdout](observed-r9.json) / [stderr](observed-r9.stderr.txt) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | [stdout](observed-r10.json) / [stderr](observed-r10.stderr.txt) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | [stdout](observed-r11.json) / [stderr](observed-r11.stderr.txt) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | [stdout](observed-r12.json) / [stderr](observed-r12.stderr.txt) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | [stdout](observed-r13.json) / [stderr](observed-r13.stderr.txt) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | [stdout](observed-r14.json) / [stderr](observed-r14.stderr.txt) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | [stdout](observed-structural-boundaries.json) / [stderr](observed-structural-boundaries.stderr.txt) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | [stdout](observed-schema-semantics.json) / [stderr](observed-schema-semantics.stderr.txt) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | [stdout](observed-profile-and-fts.json) / [stderr](observed-profile-and-fts.stderr.txt) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 0 | [stdout](observed-generation-completeness.json) / [stderr](observed-generation-completeness.stderr.txt) |
| 27 | `node docs/reviews/2026-10-02-m0-m1-r20/check-c-boundaries.mjs` | 0 | [stdout](observed-c-boundaries.json) / [stderr](observed-c-boundaries.stderr.txt) |
| 28 | `node docs/reviews/2026-10-02-m0-m1-r21/check-c-completion.mjs` | 1 | [stdout](observed-c-completion.json) / [stderr](observed-c-completion.stderr.txt) |

命令开始/结束时间见 [commands.json](commands.json)。没有用历史 manifest 的通过数量代替本次执行。旧 observed 均未改写。

## 实际正式文件清单

下表从本轮 stdout 提取，不复制交付方覆盖表。

| 文件 | 通过数 |
|---|---|
| `packages/protocol/tests/schema.test.ts` | 5 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `tests/contracts/r4-c-contracts.test.ts` | 16 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/probes/m0-probes.test.ts` | 3 |

## 补查结果

| 探针 | 结果 | 已有任务依据 |
|---|---|---|
| AD01 | 未知写 query 和无正文 DELETE 的未知 body 被接受并产生副作用 | R20 §1.1 / §1.2 |
| AD02 | OpenAPI 接受三种 HTTP/protocol 已拒绝的创建空间 body；19 个 body 都是占位 object | R20 §1.3 |
| AD03 | 未取消的底层 AbortError 被归为用户取消；传输与真实服务器 503 无稳定来源区别 | R20 §2.2 |
| AD04 | 退避开始后仍有请求 timer/listener；完成后的资源清理正例通过 | R20 §3.6 |
| AD05 | 真实 Node 将超限 Retry-After timer 压成 1ms 并提前重试 | R20 §3.3 |

本轮只读辅助核对、探针初稿修正见 [auxiliary-checks.md](auxiliary-checks.md)。首次 AD02 的 helper 错误不计为产品缺陷，最终五项均没有 probe_error。

未运行：干净重装、Node 22 实测、远程 CI、四类真实宿主、模型或研究评估。
