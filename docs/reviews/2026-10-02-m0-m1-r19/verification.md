# R19 独立验证记录

基线见 [baseline.json](baseline.json)；机器可读的实际命令、时间、退出码见 [commands.json](commands.json)。本轮针对交付声明、R18-F01/F02 与既定生成矩阵复核，没有新增 SQL 语法探针。

## 环境与执行方式

- 工作目录：`/Users/sakimi/Desktop/Detuned`；HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`，另有多轮已有未提交实现。
- Node `v26.3.0`，pnpm `11.7.0`，本地现有锁定依赖。没有运行干净安装、Node 22 指定环境或远程 CI。
- 先 build，再运行其余验证。24 条命令记录在 [commands-batch.json](commands-batch.json)，需要本地回环端口的正式测试和 CLI 检查记录在 [commands-loopback.json](commands-loopback.json)。第一次权限请求超时，工具允许的重试获准后两条命令实际执行成功；权限超时不算产品测试失败或成功。
- 26 份 `observed-*` 保存完整合并 stdout/stderr，不截取 500 字符替代原始结果。命令计数指本轮最终完成的不同命令，权限请求不另计命令。

## 正式测试与既定探针

`pnpm test:all`：**12 个测试文件、152/152**。其中 B 集成回归 82 项、`schema-generation.test.ts` 5 项。新的索引正式用例虽然通过，其变异没有发生，覆盖缺口见 [coverage-audit.md](coverage-audit.md)，不能把总数通过视作全部要求被覆盖。

26 条命令：25 条 exit 0，只有 R4 命令 exit 1，失败集合恰好是 U05/U06。这符合本次 B 任务的延期范围，不等于全局验收通过。下一包 C 完成后 26 条应全部 exit 0。

| # | 实际命令 | exit | 结果 | 证据 |
|---|---|---|---|---|
| 1 | `pnpm build` | 0 | passed | [完整输出](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | passed | [完整输出](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | passed | [完整输出](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 152/152; 12 files; B 82/82; generation 5/5 | [完整输出](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 | [完整输出](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5 | [完整输出](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 | [完整输出](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3 | [完整输出](observed-r2-cli.json) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 | [完整输出](observed-r3.json) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1/1 | [完整输出](observed-r3-serve.json) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8；仅 U05/U06 失败 | [完整输出](observed-r4.json) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 9/9 | [完整输出](observed-r5.json) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 10/10 | [完整输出](observed-r6.json) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 7/7 | [完整输出](observed-r7.json) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 1/1 | [完整输出](observed-r7-fixture.json) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 8/8 | [完整输出](observed-r8.json) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 5/5 | [完整输出](observed-r9.json) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 6/6 | [完整输出](observed-r10.json) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 5/5 | [完整输出](observed-r11.json) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 5/5 | [完整输出](observed-r12.json) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 3/3 | [完整输出](observed-r13.json) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 3/3 | [完整输出](observed-r14.json) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 4/4 | [完整输出](observed-structural-boundaries.json) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 4/4 | [完整输出](observed-schema-semantics.json) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | 4/4 | [完整输出](observed-profile-and-fts.json) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 0 | 4/4 | [完整输出](observed-generation-completeness.json) |

## 核心现象

- AB01：PK NOCASE/DESC 来源变化分别由生成/检查策略拒绝；AB02：源发生变化且缺 BEGIN/END 时均非零，目标文件哈希不变。
- AB03：V1/V2 损坏 profile 可由完整输入重新生成，check 恢复成功，编译产物无 src 仍能运行。AB04：缺驱动/源/helper/必要目标标识拒绝且无部分生成。上述外部证据不能代替缺失的正式回归。
- U05：HTTP 201，返回非法关系类型，relation/event/idempotency 各新增 1 行。U06：一次请求 resolved，data 为 undefined。两者仍是 R4-C 的真实待修问题。
- 对 no-op 索引用例做文本匹配和变异比较：目标出现 0 次、变异后与原文相同；结果见 [test-coverage-audit.json](test-coverage-audit.json)。没有改动实际 SQL 或正式测试。
- 交付 before 的 89 项匹配 R18，after 的 90 项匹配当前；3 个脚本变化、新增 1 个测试、86 项未变。26 份实现日志均可读取，退出码与本次独立复跑一致。见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。

## 辅助核对与限制

辅助命令实际退出码见 [auxiliary-checks.json](auxiliary-checks.json)，最终源文件与历史材料核对见 [review-integrity.json](review-integrity.json)。本轮没有运行真实 dsh/Pi/Codex/Claude Code 宿主认证、模型协作、附件/Web/正式评审验收、网络部署或发布。

`git diff --check` 的全工作区结果仍有既存的 `packages/storage-sqlite/src/schema.ts:3665: new blank line at EOF`；该文件与本轮审查开始时哈希一致，审查没有顺手修产品文件。仅本次三个状态文档的检查单独记录，不能把后者通过写成全工作区无警告。

R17 被覆盖的旧 observed 原字节没有恢复；本轮按现存基线保留，不再次覆盖或重构。其原/现哈希及实现者报告勘误见 R19 README。
