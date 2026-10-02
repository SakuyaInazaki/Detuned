# R15 独立验证记录

2026-10-02（Asia/Shanghai），在 `/Users/sakimi/Desktop/Detuned` 运行。Node v26.3.0、pnpm 11.7.0。输入为 [baseline.json](baseline.json) 中 HEAD 加未提交文件。下列运行均由审查者独立执行，没有用交付者日志替代。

## 实际命令与结果

[commands.json](commands.json) 记录 24 个不同命令：前轮指定的 22 个与本轮新增的两个检查。输出为真实 stdout/stderr 合并内容；文档完整性检查另列于最终 review-integrity.json。

| 命令 | 实际结果 | exit | 原始输出 |
|---|---|---:|---|
| `pnpm build` | 通过 | 0 | [输出](observed-build.txt) |
| `pnpm typecheck` | 通过 | 0 | [输出](observed-typecheck.txt) |
| `pnpm lint` | 通过；实际为 tsc --noEmit | 0 | [输出](observed-lint.txt) |
| `pnpm test:all` | 136/136; 11 files; B 72/72 | 0 | [输出](observed-tests.txt) |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 15/15 | 0 | [输出](observed-r1-behavior.json) |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 5/5；不等于 Pi 真实宿主实测 | 0 | [输出](observed-r1-adapters.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 12/12 | 0 | [输出](observed-r2.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 3/3 | 0 | [输出](observed-r2-cli.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 10/10 | 0 | [输出](observed-r3.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 1/1 | 0 | [输出](observed-r3-serve.json) |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 6/8；仅 U05/U06 失败，后续 R4-C | 1 | [输出](observed-r4.json) |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | G 9/9 | 0 | [输出](observed-r5.json) |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | H 10/10 | 0 | [输出](observed-r6.json) |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | J 7/7 | 0 | [输出](observed-r7.json) |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | K 1/1 | 0 | [输出](observed-r7-fixture.json) |
| `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | L 8/8; L03 now passes | 0 | [输出](observed-r8.json) |
| `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | N 5/5 | 0 | [输出](observed-r9.json) |
| `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | P 6/6 | 0 | [输出](observed-r10.json) |
| `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | Q 5/5 | 0 | [输出](observed-r11.json) |
| `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | V 5/5 | 0 | [输出](observed-r12.json) |
| `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | W 3/3 | 0 | [输出](observed-r13.json) |
| `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | X 3/3; X03 now passes | 0 | [输出](observed-r14.json) |
| `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | Y 1/4; Y01/Y02/Y03 fail; Y04 healthy controls pass | 1 | [输出](observed-structural-boundaries.json) |
| `node docs/reviews/2026-10-02-m0-m1-r15/check-ddl-build.mjs` | Isolated source generation/compilation and runtime-without-src check pass | 0 | [输出](observed-ddl-build.json) |

R1–R3 的 46 项以及 G/H/J/K/N/P/Q/V/W/X、L 均通过。R4 为 6/8，仅 U05/U06 继续属于后续 R4-C。正式测试 136/136（11 个文件、B 72/72）并不覆盖新 Y 反例；不同套件间可能重复，不累加为独立场景数。

pnpm lint 当前运行 TypeScript 检查，并在 storage-sqlite 包运行新增的 schema 同步检查。正式套件与独立 CLI 探针使用获准的本地回环端口和临时库，其他检查为本地进程/临时文件/Fastify inject。

## 新结构探针与隔离构建

[check-structural-boundaries.mjs](check-structural-boundaries.mjs) 自建临时 SQLite，先由真实 HTTP 生成健康讨论/搜索夹具，再克隆单类坏输入。每个坏输入分别经过 bootstrap、统一入口 init、统一入口 serve，调用前后及关闭重开后比较 schema 和所有表行。

- Y01：4 个结构变体，各经 3 个入口均被错误接受；入口前后快照不变。对唯一约束变体在快照比较后实际插入重复 token_hash 成功；对同名普通 FTS 表发真实 HTTP 搜索返回 500。该后续写入只发生在临时夹具，不代表正常业务 API 可制造该结构。
- Y02：有 initialized=true/secret 但无迁移行/主体的材料矛盾库，被分类 blank。bootstrap/init 发出新 token、覆盖 secret；serve 以未初始化 404 拒绝，未写入。
- Y03：完整 v2 初始化库缺 version=2 行，被当健康库；三个入口均补写该版本行，重开后状态改变，没有新发 token。
- Y04：真正空库、完整 raw v1/raw v2 DDL、历史 v1 fixture 和健康 v2 全部保持成功与正确材料策略，重启稳定；健康 HTTP 搜索返回 200。

结构探针结果为 1/4；Y01/Y02/Y03 失败，Y04 通过。这里 unchanged_after_reopen 比较逻辑状态，不是物理 SQLite/WAL 文件字节。

[check-ddl-build.mjs](check-ddl-build.mjs) 把两个构建脚本及 schema 源复制到自建临时目录，仅在该副本加无副作用 SELECT 标记，然后运行生成、同步检查和本地 TypeScript 编译。移除副本 src 后导入产物，确认标记进入运行时常量且规范化 SQL 完全一致，结果通过。它证明已有生成链有效，不证明 bootstrap 内手写迁移 DDL 也来自同一源，不是全工作区干净安装。所有临时副本运行结束后清理。

## 交付归档与来源核对

实现方归档实际有 24 条命令：前 2 条修复前失败，后 22 条最终复测，48 个原始日志文件齐全。before/after 的原 83 文件指纹分别匹配 R14/当前输入，其中 5 个变化；另新增 2 个构建脚本，R15 已纳入 85 文件基线。没有漏跑上一轮要求的最终命令。报告仍存在能力列表、测试归属及 DDL 范围错误，详见 [coverage-audit.md](coverage-audit.md) 与 [delivery-evidence-audit.json](delivery-evidence-audit.json)。

本轮起始指纹还包括 18 个既有检查脚本、584 个既有审查材料。最终 [review-integrity.json](review-integrity.json) 核对：产品/测试/构建脚本、旧探针、历史材料及原方案均保持原字节；历史材料仅排除有意更新的 docs/reviews/README.md。当前入口只改根 README、docs/progress 和审查索引。

## 未运行或未证明

未运行真实 dsh/Pi/Codex/Claude Code 宿主、外部模型、研究任务、远程 CI、全新依赖安装或用户真实库升级。未实际触发 FK CASCADE 删除；只验证动作变化被预检接受。未重新穷举原 B01–B12 每个子条件，未证明健康库发生 DDL 漂移；F03 是代码与任务要求的对照结论。原 B 证据缺口和 Y 失败留给下一实现包。未新增 R4-C、M2、Web 或正式评审能力。
