# R14 独立验证记录

2026-10-01（Asia/Shanghai），在 `/Users/sakimi/Desktop/Detuned` 运行。Node v26.3.0、pnpm 11.7.0。输入是 [baseline.json](baseline.json) 中 HEAD 加未提交文件；以下为审查者实际执行，未用实现方日志替代。

## 命令结果

[commands.json](commands.json) 保存 23 次执行、22 个不同验证命令及真实退出码。原始输出为合并的 stdout/stderr。X 初次运行后增加混合数组、独立关系变体和完整未来版本对照，再运行最终脚本；两份输出均保留，最终以 final 文件为准。

| 命令 | 实际结果 | exit | 原始输出 |
|---|---|---:|---|
| `pnpm build` | 通过 | 0 | [输出](observed-build.txt) |
| `pnpm typecheck` | 通过 | 0 | [输出](observed-typecheck.txt) |
| `pnpm lint` | 通过；实际为 tsc --noEmit | 0 | [输出](observed-lint.txt) |
| `pnpm test:all` | 125/125; 11 files; B regression 61/61 | 0 | [输出](observed-tests.txt) |
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
| `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 7/8；仅 L03 失败，后续 B.4-3 | 1 | [输出](observed-r8.json) |
| `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | N 5/5 | 0 | [输出](observed-r9.json) |
| `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | P 6/6 | 0 | [输出](observed-r10.json) |
| `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | Q 5/5 | 0 | [输出](observed-r11.json) |
| `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | V 5/5 | 0 | [输出](observed-r12.json) |
| `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | W 3/3 | 0 | [输出](observed-r13.json) |
| `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | Initial X run: X01/X02 pass; X03 fails for nested partial future versions. | 1 | [输出](observed-legacy-helper-boundaries.json) |
| `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | Final X run: 2/3. X03 has 5 invalid variants accepted; complete future control rejects; legal partial control passes. | 1 | [输出](observed-legacy-helper-boundaries-final.json) |

正式套件与探针有重叠，不累加为独立场景总数。R8/L03 和 R4/U05/U06 是仍未关闭的已知失败；本轮还有 X03 失败，因此不能称全部检查通过。lint 实际运行 tsc --noEmit。

完整测试和独立 CLI 检查在获准的本地回环端口环境执行，其余探针使用本地临时库或 Fastify inject；未调用模型、公网服务或真实数据。

## 新探针的范围

[check-legacy-helper-boundaries.mjs](check-legacy-helper-boundaries.mjs) 使用固定时钟、真实 HTTP 生成的业务夹具和自建临时 SQLite 文件。每个坏变体仅修改对应存储结果，修改后截取调用前快照，验证在线响应/只读性、启动是否拒绝、关闭重开后的 schema 和全部表行。

- X01：7 个明确非法/冲突的别名变体均被在线与迁移拒绝，重开逻辑快照不变。
- X02：显式空数组、完整关系数组、等价别名三个合法变体，在线及迁移重开后的完整 data 一致，重放只读。
- X03：5 个包含未来关系版本的坏变体均在线 422 且只读，但迁移接受并改写为 marker，重开逻辑快照改变，故失败。单项完整未来版本的拒绝对照与合法部分历史的降级对照均正确。

这些是合成的存储损坏/兼容边界实验，不代表实际用户库损坏或公开 HTTP 能提交 result_ref。原始输出中的 unchanged_after_reopen 表示逻辑快照等价，不是 SQLite/WAL 文件字节等价。

## 交付归档与文件完整性

实现方记录的 17 条命令及 34 个 stdout/stderr 日志均存在；遗漏的 G/H/J/K 本次已独立运行通过。产品 before/after 指纹分别匹配 R13/R14，共 83 个文件中 2 个有实现变化。详情见 [delivery-evidence-audit.json](delivery-evidence-audit.json) 和 [coverage-audit.md](coverage-audit.md)。

本轮起始指纹覆盖 83 个产品/测试文件、17 个既有检查脚本及 497 个既有审查材料。最终 [review-integrity.json](review-integrity.json) 核对产品/测试、旧脚本、历史材料与原方案字节保持；历史材料比对仅排除有意更新的审查总索引。当前入口只更新根 README、docs/progress、docs/reviews/README。新增审查探针做 node --check，并检查 JSON、本地 Markdown 链接和 git diff --check。

## 未运行或未证明

未运行真实 dsh/Pi/Codex/Claude Code 宿主、外部模型、真实研究任务、远程 CI、全新依赖安装、用户真实数据库升级。adapter 契约测试不等同宿主认证。未重新完成 B.4-3 的结构矩阵、可执行 DDL 单源和原 B01–B12 全部子条件；这些仍是下一轮工作。R4-C、M2 及之后能力本轮没有新增。
