# R18 验证记录

复核日期：2026-10-02。输入基线见 [baseline.json](baseline.json)。本轮只在临时源码副本/临时数据库中做故障注入；最终产品与正式测试文件哈希完整性见 [review-integrity.json](review-integrity.json)。

## 独立执行结果

- build / typecheck / lint 均通过。
- test:all：147/147，11 文件，B 82/82。
- 25 条既定有效命令：24 条 exit 0，R4 因 U05/U06 exit 1；全部与交付退出码一致。
- 新增 AB 检查：2/4，AB01/AB02 失败，AB03/AB04 通过；此命令 exit 1。
- 合计 26 条不同验证命令，24 条 exit 0、2 条 exit 1。两个非零含义不同，不将它们合并为“预期全通过”。

## 命令与完整输出

先运行 build，再运行依赖 dist 的检查。正式套件和 R2 CLI 需要临时回环端口，通过环境审批流程执行；其他命令使用默认隔离环境。日志为完整 stdout + stderr 合并文本，退出码直接读取子进程状态，不使用 `|| true`。

| # | 命令 | 实际退出码 | 结果 | 完整输出 |
|---|---|---|---|---|
| 1 | `pnpm build` | 0 | passed | [observed-build.txt](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | passed | [observed-typecheck.txt](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | passed | [observed-lint.txt](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 147/147; 11 files; B 82/82 | [observed-tests.txt](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15; failing: [] | [observed-r1-behavior.json](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5; failing: [] | [observed-r1-adapters.json](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12; failing: [] | [observed-r2.json](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3; failing: [] | [observed-r2-cli.json](observed-r2-cli.json) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10; failing: [] | [observed-r3.json](observed-r3.json) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | T11: 1/1; real CLI rejects unsupported version before listening | [observed-r3-serve.json](observed-r3-serve.json) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8; failing: ['U05', 'U06'] | [observed-r4.json](observed-r4.json) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 9/9; failing: [] | [observed-r5.json](observed-r5.json) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 10/10; failing: [] | [observed-r6.json](observed-r6.json) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 7/7; failing: [] | [observed-r7.json](observed-r7.json) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 1/1; failing: [] | [observed-r7-fixture.json](observed-r7-fixture.json) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 8/8; failing: [] | [observed-r8.json](observed-r8.json) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 5/5; failing: [] | [observed-r9.json](observed-r9.json) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 6/6; failing: [] | [observed-r10.json](observed-r10.json) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 5/5; failing: [] | [observed-r11.json](observed-r11.json) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 5/5; failing: [] | [observed-r12.json](observed-r12.json) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 3/3; failing: [] | [observed-r13.json](observed-r13.json) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 3/3; failing: [] | [observed-r14.json](observed-r14.json) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 4/4; failing: [] | [observed-structural-boundaries.json](observed-structural-boundaries.json) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 4/4; failing: [] | [observed-schema-semantics.json](observed-schema-semantics.json) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | 4/4; failing: [] | [observed-profile-and-fts.json](observed-profile-and-fts.json) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 1 | 2/4; failing: ['AB01', 'AB02'] | [observed-generation-completeness.json](observed-generation-completeness.json) |

## 新 AB 检查的观察范围

[check-generation-completeness.mjs](check-generation-completeness.mjs) 复制整个 storage-sqlite src/scripts、冻结历史源，链接已安装依赖，在自有临时目录中运行真实生成/检查/编译命令，结束后清理该临时目录。没有改变真实 schema.sql 或数据库。

- AB01：改变 idempotency_records 主键 collation/方向，两次生成和检查均 0，V2 profile 不变，无 src 运行时拒绝。
- AB02：分别缺 BEGIN/END MIGRATION_DDL，临时源改变 applied_at NOT NULL，生成均 0 且输出改变，迁移常量未同步，check 均 1。
- AB03：有完整输入，故意损坏 V1/V2 描述，check 1 → generate 0 → check 0；编译后无 src，运行时有效。
- AB04：缺驱动/历史源/schema.sql/helper/V2 标识，生成与检查均非零，输出文件字节哈希不变。

完整 stdout、stderr、退出码、哈希及运行时拒绝原因保存在 [observed-generation-completeness.json](observed-generation-completeness.json)。执行器为保存证据正常结束不代表其子命令成功；子命令状态以 commands.json 为准。

## 历史证据与未运行项

旧 R15 四文件 check-ddl-build.mjs 继续按 R17 的纠正排除，不复跑、不覆盖旧输出。本轮 AA/AB 使用完整输入；已通过的 AA03/AB04 证明必要依赖缺失可明确失败。

R17/observed-profile-and-fts.json 已在审查开始前被覆盖成新结果；R18 以发现时字节为完整性基线，另保存本轮独立输出。旧哈希和覆盖事实见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。这里的“本轮未改变历史证据”只指 R18 审查过程，不表示历史文件从未被其他轮修改。

未执行干净环境依赖安装、远程 CI、四类 harness 实测或真实模型研究实验；未安装依赖、调度 Agent、调用模型或部署服务。正式本地测试通过不能替代这些尚未执行的验收。

## 附加文件检查

新探针语法和本轮文档链接检查通过。全工作区 `git diff --check` 返回 2，指出 schema.ts:3665 的文件尾多余空行；该文件与 R18 开始时的 SHA256 完全一致，是既有实现的格式问题，本轮审查未修改。针对本轮三个状态文档的 diff 检查通过。此项与上述正式测试/构建结果分别记录，详见 [auxiliary-checks.json](auxiliary-checks.json)。
