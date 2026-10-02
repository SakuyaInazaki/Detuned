# R11 独立验证记录

日期：2026-09-30；目录 `/Users/sakimi/Desktop/Detuned`；Node `v26.3.0`、pnpm `11.7.0`。输入为 [baseline.json](baseline.json) 记录的 dirty 工作区。先构建再执行探针，所有命令退出码来自真实进程结果，stdout/stderr 原样合并保存在下列文件。机器可读清单见 [commands.json](commands.json)。

| 实际命令 | exit | 结果 | 原始输出 |
|---|---:|---|---|
| `pnpm build` | 0 | 通过 | [observed-build.txt](observed-build.txt) |
| `pnpm typecheck` | 0 | 通过 | [observed-typecheck.txt](observed-typecheck.txt) |
| `pnpm lint` | 0 | 通过；实际为 tsc --noEmit | [observed-lint.txt](observed-lint.txt) |
| `pnpm test:all` | 0 | 112/112，11 个文件；B 回归 48/48 | [observed-tests.txt](observed-tests.txt) |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5；不等于 Pi 真实宿主实测 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 | [observed-r2.json](observed-r2.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3 | [observed-r2-cli.json](observed-r2-cli.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 | [observed-r3.json](observed-r3.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 1/1 | [observed-r3-serve.json](observed-r3-serve.json) |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8；仅 U05/U06 失败，后续 R4-C | [observed-r4.json](observed-r4.json) |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | G 9/9 | [observed-r5.json](observed-r5.json) |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | H 10/10 | [observed-r6.json](observed-r6.json) |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | J 7/7 | [observed-r7.json](observed-r7.json) |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | K 1/1 | [observed-r7-fixture.json](observed-r7-fixture.json) |
| `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 1 | 7/8；仅 L03 失败，后续 B.4-3 | [observed-r8.json](observed-r8.json) |
| `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | N 5/5 | [observed-r9.json](observed-r9.json) |
| `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | P 6/6 | [observed-r10.json](observed-r10.json) |
| `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 1 | Q 1/5；Q01–Q04 失败，Q05 通过 | [observed-validation-pipeline.json](observed-validation-pipeline.json) |

## 执行边界与结论

- build/typecheck/lint 和 112 项正式测试全部通过。R1–R3 合计 46 项；G/H/J/K/N/P 通过。R8 的 L03 与 R4 的 U05/U06 是前序已登记且留给后续包的失败，未改断言掩盖。
- 本轮补验脚本使用真实 HTTP 生成基准数据、固定时钟、自建临时文件 SQLite，使用 serialize 克隆后逐项隔离错误；迁移/故障后关闭重开并比较 schema 与全部表行。只输出布尔量、计数、合成时间，不输出 token、凭据 hash 或实例密钥。
- Q01/Q02 是刻意损坏存储输入；Q03 是删除旧式完整响应的 updated_at 的合成变体；Q04 是内部 action 返回形状故障。没有把这些等同于普通用户可利用的攻击或宣称所有旧版本真实产生这些形状。Q05 保留合法新写、旧响应、历史状态、关系复用及语义失败回滚对照。
- pnpm test:all 与 R2 CLI 检查获准使用沙盒外回环端口，临时服务只用于本地跨进程验证；其他探针使用 inject/临时库或其原有无网络路径。未调用真实模型、连接真实论坛、启动其他 Agent、运行禁用技能或修改全局配置。
- 未进行干净安装、新 CI 远端运行、真实 dsh/Pi/Codex/Claude Code 宿主联调，也没有重新扩大执行 B.4-3 的全部结构矩阵、M2–M7 功能验证。旧 R3 T06 使用工作区原已有修正夹具，本次没有再修改。
- 本次只新建 R11 资料并更新根 README、docs/progress 与审查索引；产品/正式测试与旧审查材料完整性结果见 [review-integrity.json](review-integrity.json)。

结果解释与下一步见 [审查报告](README.md) 和 [下一轮提示词](next-agent-prompt.md)。
