# R12 独立验证记录

2026-09-30，在 `/Users/sakimi/Desktop/Detuned` 执行。Node v26.3.0，pnpm 11.7.0。输入是 [baseline.json](baseline.json) 记录的 HEAD 加未提交文件，不能仅以 commit 标识本次实现。以下为审查者实际复跑结果，与实现者自报分开保存。

## 命令与原始输出

[commands.json](commands.json) 记录 20 条验证命令、实际退出码和输出文件。输出为各命令原始 stdout/stderr 合并留存，未替换历史目录中的 observed。

| 检查 | 实际结果 | exit | 原始输出 |
|---|---|---:|---|
| pnpm build | 通过 | 0 | [build](observed-build.txt) |
| pnpm typecheck | 通过 | 0 | [typecheck](observed-typecheck.txt) |
| pnpm lint | 通过；实际为各包 tsc --noEmit | 0 | [lint](observed-lint.txt) |
| pnpm test:all | 117/117，11 个文件；B 回归 53/53 | 0 | [tests](observed-tests.txt) |
| R1 behavior | 15/15 | 0 | [输出](observed-r1-behavior.json) |
| R1 adapters | 5/5 | 0 | [输出](observed-r1-adapters.json) |
| R2 remaining | 12/12 | 0 | [输出](observed-r2.json) |
| R2 CLI | 3/3 | 0 | [输出](observed-r2-cli.json) |
| R3 invariants | 10/10 | 0 | [输出](observed-r3.json) |
| R3 serve | 1/1 | 0 | [输出](observed-r3-serve.json) |
| R4 unfinished contracts | 6/8，仅 U05/U06 失败 | 1 | [输出](observed-r4.json) |
| R5 G | 9/9 | 0 | [输出](observed-r5.json) |
| R6 H | 10/10 | 0 | [输出](observed-r6.json) |
| R7 J | 7/7 | 0 | [输出](observed-r7.json) |
| R7 K fixture | 1/1 | 0 | [输出](observed-r7-fixture.json) |
| R8 L | 7/8，仅 L03 失败 | 1 | [输出](observed-r8.json) |
| R9 N | 5/5 | 0 | [输出](observed-r9.json) |
| R10 P | 6/6 | 0 | [输出](observed-r10.json) |
| R11 Q | 5/5 | 0 | [输出](observed-r11.json) |
| R12 V | 1/5，V01–V04 失败、V05 通过 | 1 | [输出](observed-precheck-completeness.json) |

正式测试与探针存在重叠，不把它们相加宣称独立场景数。已知 U05/U06 继续由 R4-C 处理，L03 由 B.4-3 处理；它们仍是失败检查，不写成“全仓所有检查通过”。完整测试和独立 CLI 检查使用获准的本地回环端口环境；其余检查在本地临时夹具上运行。

## 新补验的方法与范围

[check-precheck-completeness.mjs](check-precheck-completeness.mjs) 使用 HTTP 生成合法业务与幂等结果，再对各自的临时文件库做单类变异；固定时钟区分 v1/v2/v3。涉及迁移时比较 schema 和全部表行的逻辑快照，失败后关闭重开再检查；不以文件二进制散列代替 SQLite 逻辑一致性。

- V01：typed ID-only 中不存在的 Post 修订、错误源关系、不存在的关系，三例仍被迁移为 marker。
- V02：legacy 非数组 relation_ids 被返回为成功空关系；错 Thread/重复 IDs 在线 422，但启动仍写 marker。
- V03：真实 executeIdempotent 的 action 已写业务与事件后返回 relations:null，三类写入提交且重试 data 不同。
- V04：已有正确 v1 历史；完整旧响应明确提供矛盾 updated_at。迁移接受并抹掉冲突，重放返回已有快照时间。
- V05：合法 ID-only 降级、完整 Thread/patch 在重复启动后的精确重放、无重放写入、合法空关系 action 均通过。

这是合成存储损坏和内部 action 故障检查。它证明这些校验边界未闭合，并不声称普通 API 用户能直接提交 result_ref，也不声称已在用户真实数据库发生数据损坏。

## 输入与交付证据核对

起始指纹含 83 个产品/测试文件、15 个既有探针及 339 个既有审查材料。对照 R11 的产品/测试指纹，本轮实现只改变 core 幂等服务、SQLite bootstrap 和 B 正式回归三个文件；文档另有同步修改。

实现者的 31 条命令输出齐全，before/after 产品指纹与对应输入匹配。报告摘要错误单列在 [coverage-audit.md](coverage-audit.md) 与 [delivery-evidence-audit.json](delivery-evidence-audit.json)，不据此否定真实已通过的检查。

本次只新增 R12 审查材料，更新根 README、docs/progress.md、审查总索引三个当前入口。最终指纹核对见 [review-integrity.json](review-integrity.json)：产品/测试和旧探针不变，历史材料除当前总索引外不变，原方案字节保留。新增探针通过 node --check，文档链接/JSON 与 git diff --check 一并检查。

## 未运行或未证明的范围

未运行真实 dsh/Pi/Codex/Claude Code 宿主或模型研究，不将适配契约检查等同于宿主联调；未跑公网服务、远程 CI、新环境依赖重装或真实数据升级。没有重新完成 B.4-3 的结构矩阵、DDL 单一来源及原 B01–B12 全条件；R4-C、M2 及以后阶段不在本轮范围。117 项通过不等于整个 M0/M1 验收完成。
