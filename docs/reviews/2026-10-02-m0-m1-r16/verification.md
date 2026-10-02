# R16 独立验证记录

日期：2026-10-02。HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` + 未提交实现。Node v26.3.0，pnpm 11.7.0。先保存 85 个产品/正式测试/构建文件、20 个已有审查脚本与历史材料指纹，再 build 后验证。

既定 24 个命令：23 条 exit 0，R4 因 U05/U06 exit 1；新增 Z 探针 exit 1，Z01/Z02 失败、Z03/Z04 通过。共 25 个不同验证命令，23 条 exit 0、2 条 exit 1。正式测试 140/140（11 文件，B 76 项）；不可将重复正式测试和探针计数相加为独立场景数。

| # | 命令 | 退出码 | 结果 | 原始输出 |
|---|---|---|---|---|
| 1 | `pnpm build` | 0 | 通过 | [observed-build.txt](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | 通过 | [observed-typecheck.txt](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | 通过；schema sync + tsc --noEmit | [observed-lint.txt](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 140/140; 11 files; B 76/76 | [observed-tests.txt](observed-tests.txt) |
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
| 24 | `node docs/reviews/2026-10-02-m0-m1-r15/check-ddl-build.mjs` | 0 | Isolated source generation/compilation and runtime-without-src check pass | [observed-ddl-build.json](observed-ddl-build.json) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 1 | Z 2/4; Z01/Z02 fail; Z03 healthy and Z04 CLI pass | [observed-schema-semantics.json](observed-schema-semantics.json) |

## 额外核验

- 交付 before/after 指纹、24 条命令与 48 份日志：见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。
- Z01 三类索引变体 × 三个函数入口；Z02 正文 UNINDEXED × 三个入口；Z03 健康等价索引 × 三个入口；Z04 两类坏初始化材料 × CLI init/serve。只用本脚本创建的临时目录与合成身份。
- Z 先比较启动前后重开逻辑快照，再单独演示 SQL/HTTP 后果；不把后果操作产生的变化误归给启动流程。
- 新增源检查仅为 review-only 脚本语法和文档/链接完整性；最终指纹见 [review-integrity.json](review-integrity.json)。

## 边界与未运行项目

本地 test:all 和旧 R2 CLI 探针通过环境审批执行回环端口/临时 SQLite 验证；其余 probe 使用 Fastify inject 或进程内夹具，Z04 坏库在监听前失败。没有真实模型调用、其他 Agent、真实用户库、远程 CI、全新依赖安装、四类 harness 宿主认证或公网部署。

未执行任意 SQL 语法穷举/跨数据库兼容测试；F03 是已约定来源要求的静态缺口，不能据此宣称健康普通迁移已经失败。当前新建/升级 parity 与旧隔离 DDL 构建均通过。

审查开始的 `git diff --check` 发现输入中 docs/progress.md 末尾多余空行；本轮同步该当前状态文档时移除，未改产品或历史材料。
