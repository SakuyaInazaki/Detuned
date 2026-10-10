# R22 验证记录

本轮独立执行 C.2 的全部既有验收命令，再执行有限 AE 检查。结果是 **28 条既有命令通过；新增 1 条 exit 1**，不能合并宣称全绿。

## 环境与源码

- HEAD：`b8dacd56779a007a2e7045b682bca0c036fdfc44` + C.2 未提交实现。
- 实际 Node `v26.3.0`，pnpm `11.7.0`；使用已安装锁定依赖，没有重装。
- 先保存 baseline 再 build；93 个产品/测试/构建配置、212 个 dist、25 个旧探针与历史审查文件已纳入比对。
- C.2 的 before 与 R21 93 文件完全一致，after 的 9 个变化与本轮开工源码一致；详见 [delivery-comparison.json](delivery-comparison.json)。交付记录的旧 HEAD 不用于定位本次已公开快照后的工作区。
- 正式全套测试与旧 CLI 检查使用临时数据库和 127.0.0.1，经工具批准运行；其他检查在默认权限下执行，没有对外服务或模型推理。

## 命令与原始输出

每个链接为本轮新采集；stderr 空文件表示本次确实采集为空，不代表未收集。非空 stderr 仅四条包管理器命令回显，无失败警告。`commands.json` 保存开始/结束时间、目录、真实退出码和期望退出码。

| # | 命令 | exit / 期望 | stdout | stderr |
|---|---|---|---|---|
| 1 | `pnpm build` | 0 / 0 | [observed-build.txt](observed-build.txt) | [stderr](observed-build.stderr.txt) |
| 2 | `pnpm typecheck` | 0 / 0 | [observed-typecheck.txt](observed-typecheck.txt) | [stderr](observed-typecheck.stderr.txt) |
| 3 | `pnpm lint` | 0 / 0 | [observed-lint.txt](observed-lint.txt) | [stderr](observed-lint.stderr.txt) |
| 4 | `pnpm test:all` | 0 / 0 | [observed-tests.txt](observed-tests.txt) | [stderr](observed-tests.stderr.txt) |
| 5 | `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 / 0 | [observed-r1-behavior.json](observed-r1-behavior.json) | [stderr](observed-r1-behavior.stderr.txt) |
| 6 | `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 / 0 | [observed-r1-adapters.json](observed-r1-adapters.json) | [stderr](observed-r1-adapters.stderr.txt) |
| 7 | `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 / 0 | [observed-r2.json](observed-r2.json) | [stderr](observed-r2.stderr.txt) |
| 8 | `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 / 0 | [observed-r2-cli.json](observed-r2-cli.json) | [stderr](observed-r2-cli.stderr.txt) |
| 9 | `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 / 0 | [observed-r3.json](observed-r3.json) | [stderr](observed-r3.stderr.txt) |
| 10 | `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 / 0 | [observed-r3-serve.json](observed-r3-serve.json) | [stderr](observed-r3-serve.stderr.txt) |
| 11 | `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 0 / 0 | [observed-r4.json](observed-r4.json) | [stderr](observed-r4.stderr.txt) |
| 12 | `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 / 0 | [observed-r5.json](observed-r5.json) | [stderr](observed-r5.stderr.txt) |
| 13 | `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 / 0 | [observed-r6.json](observed-r6.json) | [stderr](observed-r6.stderr.txt) |
| 14 | `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 / 0 | [observed-r7.json](observed-r7.json) | [stderr](observed-r7.stderr.txt) |
| 15 | `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 / 0 | [observed-r7-fixture.json](observed-r7-fixture.json) | [stderr](observed-r7-fixture.stderr.txt) |
| 16 | `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 0 / 0 | [observed-r8.json](observed-r8.json) | [stderr](observed-r8.stderr.txt) |
| 17 | `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 / 0 | [observed-r9.json](observed-r9.json) | [stderr](observed-r9.stderr.txt) |
| 18 | `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 0 / 0 | [observed-r10.json](observed-r10.json) | [stderr](observed-r10.stderr.txt) |
| 19 | `node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs` | 0 / 0 | [observed-r11.json](observed-r11.json) | [stderr](observed-r11.stderr.txt) |
| 20 | `node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs` | 0 / 0 | [observed-r12.json](observed-r12.json) | [stderr](observed-r12.stderr.txt) |
| 21 | `node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs` | 0 / 0 | [observed-r13.json](observed-r13.json) | [stderr](observed-r13.stderr.txt) |
| 22 | `node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs` | 0 / 0 | [observed-r14.json](observed-r14.json) | [stderr](observed-r14.stderr.txt) |
| 23 | `node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs` | 0 / 0 | [observed-structural-boundaries.json](observed-structural-boundaries.json) | [stderr](observed-structural-boundaries.stderr.txt) |
| 24 | `node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs` | 0 / 0 | [observed-schema-semantics.json](observed-schema-semantics.json) | [stderr](observed-schema-semantics.stderr.txt) |
| 25 | `node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs` | 0 / 0 | [observed-profile-and-fts.json](observed-profile-and-fts.json) | [stderr](observed-profile-and-fts.stderr.txt) |
| 26 | `node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs` | 0 / 0 | [observed-generation-completeness.json](observed-generation-completeness.json) | [stderr](observed-generation-completeness.stderr.txt) |
| 27 | `node docs/reviews/2026-10-02-m0-m1-r20/check-c-boundaries.mjs` | 0 / 0 | [observed-c-boundaries.json](observed-c-boundaries.json) | [stderr](observed-c-boundaries.stderr.txt) |
| 28 | `node docs/reviews/2026-10-02-m0-m1-r21/check-c-completion.mjs` | 0 / 0 | [observed-c-completion.json](observed-c-completion.json) | [stderr](observed-c-completion.stderr.txt) |
| 29 | `node docs/reviews/2026-10-02-m0-m1-r22/check-c2-boundaries.mjs` | 1 / 0 | [observed-c2-boundaries.json](observed-c2-boundaries.json) | [stderr](observed-c2-boundaries.stderr.txt) |

## 关键观察

- 正式测试 **175 passed、13 files**，其中 B 82、生成 6、C 22；完整真实文件表见 [coverage-audit.md](coverage-audit.md)。
- AC 6/6、AD 5/5、U 8/8。AD04 退避开始只剩 60000ms timer 和一个等待 listener；30 秒时旧请求未 abort；最终资源为零。AD05 在一次请求后返回服务端错误，未安排溢出 timer。
- AE01 四个 body 兑现后的用户取消/超时组合均失败；AE02 正文网络分类/恢复与永久 TLS 不重试失败，完整坏 JSON 的控制组通过。
- AE03 五处非 body 规范差异失败；完整 32 路由集合和 19 body 定义比对通过，poll `{}` 正例通过。
- AE04 七种合法联合写参数在原 schema/安装版 Pi 校验中通过，在注册后的 schema/安装版 Pi 校验中全部拒绝；八个命令组合以及注册工具坏 JSON/409 透传通过。
- AE05 HTTP-date 5 秒、非法 header 后备 1 秒、超过预算的 121 秒日期三例通过；实际 delay 在控制环境压缩，完整时间顺序另由 AD04 检查。

## 复跑与输出保护

本目录 `run-existing.py` 的 batch、loopback、new 分别采集 26、2、1 条，最后合并为 29 条。它只启动所列命令，未调用任何历史交付 runner。新增 AE 只使用内存 SQLite、Fastify inject、受控 fetch、原生 Response 和安装版 Pi 校验器。

本轮结束后此目录是历史证据。下一实现包要把采集器复制到自己的新目录并修改输入/输出，不能直接运行它覆盖本轮 observed。

## 未执行与限制

没有执行干净安装、Node 22 实跑、远程 GitHub CI、真实 Pi/dsh/Codex/Claude Code 联调或模型研究效果评估。AE01 是受控 continuation 顺序验证，不是已复现的真实宿主竞态。Pi 参数拒绝在安装版官方校验器中已证实，不需要调用模型才能验证。

本轮只新增审查材料并更新三个当前状态入口，未修产品实现、未修改正式测试、未提交或推送；构建/测试不代表远程执行。冻结文件与原有内容的最终哈希比较见 [integrity.json](integrity.json)。
