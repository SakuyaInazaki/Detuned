# R13 独立验证记录

2026-09-30，在 `/Users/sakimi/Desktop/Detuned` 运行。Node v26.3.0、pnpm 11.7.0。输入是 [baseline.json](baseline.json) 中 HEAD 加未提交文件。所有下列结果为审查者本轮实际复跑，未用实现者日志替代。

## 命令结果

[commands.json](commands.json) 保存 22 次执行、21 个不同验证命令及真实退出码；输出是原始 stdout/stderr 合并结果。W 运行两次，第二次增加差异字段和真实立即重试诊断，第一次输出保留，最终以 final 文件为准。

| 检查 | 实际结果 | exit | 原始输出 |
|---|---|---:|---|
| build | 通过 | 0 | [输出](observed-build.txt) |
| typecheck | 通过 | 0 | [输出](observed-typecheck.txt) |
| lint | 通过，实际各包 tsc --noEmit | 0 | [输出](observed-lint.txt) |
| test:all | 122/122，11 个文件，B 58/58 | 0 | [输出](observed-tests.txt) |
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
| R7 K | 1/1 | 0 | [输出](observed-r7-fixture.json) |
| R8 L | 7/8，仅 L03 失败 | 1 | [输出](observed-r8.json) |
| R9 N | 5/5 | 0 | [输出](observed-r9.json) |
| R10 P | 6/6 | 0 | [输出](observed-r10.json) |
| R11 Q | 5/5 | 0 | [输出](observed-r11.json) |
| R12 V | 5/5 | 0 | [输出](observed-r12.json) |
| R13 W | 0/3；W01/W02 原输入遗漏，W03 初始帖额外空数组 | 1 | [最终输出](observed-legacy-input-presence-final.json) |

正式测试与探针有重叠，不能累加为独立场景数。R4/R8 的保留失败仍是真实失败，分别留给 R4-C/B.4-3；本轮也有 W 未通过，不能称全部检查通过。

完整测试和独立 CLI 检查在获准的本地回环端口环境执行；没有公网服务或外部模型调用。

## 新检查的范围与解释

[W 脚本](check-legacy-input-presence.mjs) 使用固定时钟、HTTP 生成合法 Thread/Post/Relation，再分别克隆自建临时 SQLite 文件。W01/W02 对存储结果做单类变异；记录在线响应、只读性、启动是否拒绝、最终引用 kind，关闭重开后比较 schema 和全部表行。

W01 的四个变体都在线 201、迁移接受；W02 的两个 initial_post null 数组变体在线 201，两个关系 null 字段变体在线 422 但迁移仍接受 marker。所有迁移都改变了损坏输入。它们是合成存储损坏检查，不代表普通客户端能提交 result_ref 或真实论坛已损坏。

W03 使用合法完整响应，先检查真实新写的立即重试，再比较旧响应在线、迁移和重开后的完整 data。三处唯一差异均为 `data.initial_post.relations`：重放多出空数组。该组其他合法对照——无初始帖、完整 Post、合法初始 ID-only、重复启动和只读性——均通过。不能将 0/3 总数解释为这些正例全部失败。

首次 W 输出见 [初次记录](observed-legacy-input-presence.json)，第二次仅增加差异路径及立即重试诊断；未改产品代码。

## 文件和记录完整性

起始指纹覆盖 83 个产品/测试、16 个既有检查脚本、425 个既有审查材料。实现者前后指纹、25 条命令和 50 个日志文件的核对见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。源码/正式测试相对 R12 仅三个文件变化，记录的 after 指纹匹配实际输入。

最终 [review-integrity.json](review-integrity.json) 核对本次审查没有改产品/测试、旧脚本和历史报告。仅三个当前入口文档更新：根 README、docs/progress、审查总索引；历史材料哈希检查排除这个有意更新的总索引。原方案字节保持。新增探针做 node --check，JSON、本地 Markdown 链接和 git diff --check 一并检查。

## 未运行或未证明

没有运行真实 dsh/Pi/Codex/Claude Code 宿主、真实研究模型、远程 CI、全新环境依赖重装或真实数据升级；适配契约测试不等同于宿主认证。B.4-3 的结构矩阵/DDL 单源/原 B01–B12 全条件和 R4-C 不在本轮重新实施；M2 及以后能力未新增。
