# R17 独立验证记录

2026-10-02；HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` + 本轮输入未提交实现。Node v26.3.0，pnpm 11.7.0。先保存 88 文件基线，再 build 后执行探针。

旧 25 命令：24 条 exit 0，R4/U05、U06 对应命令 exit 1；新增 AA 命令 exit 1（AA01–AA03 失败，AA04 通过）。本轮共 26 个不同验证命令，24 条 exit 0、2 条 exit 1。正式测试 146/146，11 文件，B 81 项。

| # | 命令 | 退出码 | 摘要 | 原始输出 |
|---|---|---|---|---|
| 1 | `pnpm build` | 0 | 通过 | [observed-build.txt](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | 通过 | [observed-typecheck.txt](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | 通过；schema sync + tsc --noEmit | [observed-lint.txt](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 146/146; 11 files; B 81/81 | [observed-tests.txt](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5；不等于 Pi 真实宿主实测 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 | [observed-r2.json](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3 | [observed-r2-cli.json](observed-r2-cli.json) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 | [observed-r3.json](observed-r3.json) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1/1 | [observed-r3-serve.json](observed-r3-serve.json) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8；仅 U05/U06 失败，后续 R4-C | [observed-r4.json](observed-r4.json) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | G 9/9 | [observed-r5.json](observed-r5.json) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | H 10/10 | [observed-r6.json](observed-r6.json) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | J 7/7 | [observed-r7.json](observed-r7.json) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | K 1/1 | [observed-r7-fixture.json](observed-r7-fixture.json) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | L 8/8; L03 now passes | [observed-r8.json](observed-r8.json) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | N 5/5 | [observed-r9.json](observed-r9.json) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | P 6/6 | [observed-r10.json](observed-r10.json) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | Q 5/5 | [observed-r11.json](observed-r11.json) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | V 5/5 | [observed-r12.json](observed-r12.json) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | W 3/3 | [observed-r13.json](observed-r13.json) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | X 3/3; X03 now passes | [observed-r14.json](observed-r14.json) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | Y 4/4; all previous structural cases pass | [observed-structural-boundaries.json](observed-structural-boundaries.json) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r15/check-ddl-build.mjs` | 0 | Pass as an old four-file SQL embedding check; native profile generation/checks silently skip. Superseded for full generation verification by AA04. | [observed-ddl-build.json](observed-ddl-build.json) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | Z 4/4; all prior semantic cases pass | [observed-schema-semantics.json](observed-schema-semantics.json) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 1 | AA 1/4; AA01/AA02/AA03 fail; AA04 complete-fixture healthy controls pass | [observed-profile-and-fts.json](observed-profile-and-fts.json) |

## 隔离检查范围的修正

第 24 条旧 R15 脚本仍返回 0，但不提供 native driver/历史 fixture，使新增 profile 分支被跳过；不能据此声称完整生成已验证。R17 的 AA02–AA04 提供完整 src/scripts、历史源和依赖，明确区分健康生成、来源语义变化及缺输入。下轮以完整继任夹具替代旧四文件门槛；旧脚本/历史输出保留。

新 review probe 在第一次运行后，将隔离复制范围从现有四文件扩大为全部 src/scripts，以容纳共享 helper；因此仅此新脚本复跑一次。最终原始输出对应最终脚本，结果仍为 AA 1/4，产品源未变。其他产品验证未重复扩跑。

## 交付证据与限制

- [delivery-evidence-audit.json](delivery-evidence-audit.json)：25 个不同交付命令、50 份原始日志与 85 文件前后指纹核对；6 文件变化属实。R17 新纳入的三个已有 modules/review 文件与 HEAD 一致。
- [review-integrity.json](review-integrity.json)：本轮结束后的产品/正式测试、旧脚本、历史材料、archive 与文档链接检查。
- test:all 与原 R2 CLI 在审批后的临时 SQLite/本地回环环境运行；其他场景使用内存/文件 SQLite、Fastify inject、隔离源码副本或本任务临时子进程。
- 没有真实模型调用、其他 Agent、真实用户数据库、远程 CI、全新依赖安装、四类 harness 宿主认证、公网部署。
- 没有进行任意 SQLite 语法穷举；AA01 是受支持配置比较遗漏，AA02/AA03 是本轮明确要求的来源和执行保证。正常未修改的权威源生成/升级仍通过。
- 只新增审查材料与当前状态文档，不修改产品源码或正式测试；历史审查证据保持。
