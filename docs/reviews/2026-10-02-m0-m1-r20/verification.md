# R20 独立验证记录

本次复核 B-GATE+C 的最终工作区，未修改产品实现。基线见 [baseline.json](baseline.json)，机器可读清单见 [commands.json](commands.json)。

## 执行环境

- CWD `/Users/sakimi/Desktop/Detuned`；HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，另有已有未提交实现。
- Node v26.3.0，pnpm 11.7.0，使用本地已安装锁定依赖。未执行干净安装、Node 22 指定版本或远程 CI。
- 先完成 build，再运行其他命令。24 条无需监听的检查由 [run-existing.py](run-existing.py) 的 batch 模式执行；正式套件和 CLI 检查通过环境授权后在 loopback 模式执行，只使用本地回环与临时数据。
- 原有脚本只把新输出保存到 R20，不调用会覆盖交付日志的实现者 runner。旧检查的输出保存完整合并 stdout/stderr；新 AC 的 stdout/stderr 分开保存。
- 新 [check-c-boundaries.mjs](check-c-boundaries.mjs) 使用内存 SQLite、app.inject、受控 fetch、阶段屏障和真实监听器计数，不访问外部服务器或模型。Retry-After 用例记录计划等待时间后加速等待，不实际睡 60 秒。

## 实际结果

**原 26 条命令全部 exit 0，正式测试 166/166（13 文件）。** 新 AC 检查 exit 1，AC01–AC04 失败、AC05/AC06 通过。最终验收清单共 27 条，26 条 exit 0、1 条 exit 1。

| # | 命令 | exit | 结果 | 输出 |
|---|---|---|---|---|
| 1 | `pnpm build` | 0 | 通过 | [原始输出](observed-build.txt) |
| 2 | `pnpm typecheck` | 0 | 通过 | [原始输出](observed-typecheck.txt) |
| 3 | `pnpm lint` | 0 | 通过 | [原始输出](observed-lint.txt) |
| 4 | `pnpm test:all` | 0 | 166/166; 13 files; B 82; generation 6; C 13 | [原始输出](observed-tests.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15 | [原始输出](observed-r1-behavior.json) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5 | [原始输出](observed-r1-adapters.json) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12 | [原始输出](observed-r2.json) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 通过 | [原始输出](observed-r2-cli.json) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10 | [原始输出](observed-r3.json) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | 通过 | [原始输出](observed-r3-serve.json) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 0 | 8/8 | [原始输出](observed-r4.json) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 9/9 | [原始输出](observed-r5.json) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | 10/10 | [原始输出](observed-r6.json) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | 7/7 | [原始输出](observed-r7.json) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | 1/1 | [原始输出](observed-r7-fixture.json) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 | 8/8 | [原始输出](observed-r8.json) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | 5/5 | [原始输出](observed-r9.json) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 | 6/6 | [原始输出](observed-r10.json) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 | 5/5 | [原始输出](observed-r11.json) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 | 5/5 | [原始输出](observed-r12.json) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 | 3/3 | [原始输出](observed-r13.json) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 | 3/3 | [原始输出](observed-r14.json) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 | 4/4 | [原始输出](observed-structural-boundaries.json) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 | 4/4 | [原始输出](observed-schema-semantics.json) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 | 4/4 | [原始输出](observed-profile-and-fts.json) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 0 | 4/4 | [原始输出](observed-generation-completeness.json) |
| 27 | `node docs/reviews/2026-10-02-m0-m1-r20/check-c-boundaries.mjs` | 1 | 2/6；失败 AC01,AC02,AC03,AC04 | [原始输出](observed-c-boundaries.json) |

AC 结果按组统计；一个组中包含多对正反例。AC05 包括请求前/头/body/退避取消和超时，AC06 包括注册 Pi 命令/tool；它们是受控行为验证，不是实际模型或宿主认证。测试、探针存在重叠，不能相加成研究场景数量。

## 交付核对

- after 的 93 项哈希匹配当前；相对 R19，13 个旧文件变化、3 个新增、77 项保持。Gate A 快照只有生成测试变化，且该测试与最终版本一致。
- Gate A/final 各 26 份日志共 52 份存在；Gate A 记录正确保留仅 U05/U06 失败。最终原 26 项实际结果与本次独立复跑一致。
- 最终 runner 成功时未采集 stderr，且测试摘要硬编码。本轮另存完整独立输出，不能据此倒填旧 stderr。没有 before 文件的事实如实保留，不事后制造历史时间的快照。
- 可比的旧历史文件未发现新增变化。详见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。

## 辅助检查与未运行项

[auxiliary-checks.json](auxiliary-checks.json) 记录 Node/Python 审查脚本语法、版本、git diff 检查等实际退出码。[review-integrity.json](review-integrity.json) 核对 93 个产品/测试/构建文件、旧探针、历史材料、原文及本次状态文档的变更边界。

全工作区 diff 检查与本次三份状态文档检查分别记录；若仍有既存 schema.ts EOF 空行，不将局部检查成功描述为全仓库无警告，也不由审查顺手改产品文件。

未运行：真实 dsh/Pi/Codex/Claude Code 认证与模型交互、M2 附件、Web、正式评审、部署/发布、研究价值评估。没有向这些未实现或未验证能力发放通过结论。
