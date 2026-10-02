# R6 独立验证记录

## 环境与范围

- 日期：2026-09-28；工作区 `/Users/sakimi/Desktop/Detuned`。
- HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`；工作区原本已有未提交实现和文档。
- 运行时 Node `v26.3.0`、pnpm `11.7.0`，沿用已安装依赖；未安装或升级包。
- [baseline.json](baseline.json) 保存审查开始时状态、tracked diff 哈希、81 个产品/测试/配置文件 SHA-256 和原始归档 SHA-256。最终核对这些文件未被审查修改。
- 仅在自建临时库执行变更。核心 HTTP 检查使用 Fastify.inject；既有正式/CLI 测试涉及本机回环监听，按已有本地测试授权执行。新 H 脚本不监听端口。
- 未调用真实模型，未启动真实四类宿主，未修改全局配置，未测试公网部署或执行远端 CI，未提交/推送。

## 实际运行

所有输出均写入本目录，不覆盖旧 observed。build 完成后执行依赖 dist 的探针；下列退出码均来自实际命令。

| 命令 | 退出码 | 结果/输出 |
|---|---|---|
| `pnpm build` | 0 | [build](observed-build.txt) |
| `pnpm typecheck` | 0 | [typecheck](observed-typecheck.txt) |
| `pnpm lint` | 0 | [lint](observed-lint.txt) |
| `pnpm test:all` | 0 | 11 文件、75/75；[正式测试](observed-tests.txt) |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | 15/15；[输出](observed-r1-behavior.json) |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | 5/5；[输出](observed-r1-adapters.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | 12/12；[输出](observed-r2-remaining.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | 3/3；[输出](observed-r2-cli.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | 10/10；[输出](observed-r3-invariants.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | T11 通过；[输出](observed-r3-serve-version.json) |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | 6/8，仅 U05/U06 失败；[输出](observed-r4-unfinished.json) |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | 9/9；[输出](observed-r5-gaps.json) |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 1 | H01–H09 失败、H10 通过；[输出](observed-upgrade-boundaries.json) |

正式套件通过后没有反复重跑全套；新探针不修改产品，单独验证其新增反例。脚本最后的非零退出是断言失败结果，不是环境阻塞。

## 新探针的复现边界

- H01：先以合法 HTTP 创建、resolve 关系，再在拷贝库中放入上一轮 R4-B 的真实紧凑编码。另一分支是历史 c4f041f 定义的 `$ref` codec 形态；c4f041f 的原生 relation.create 实际返回直接实体，因此本次不把 `$ref` 分支称为该旧二进制真实 create 返回演练。两个分支都在关闭重开后重试。
- H02：真实业务 HTTP，注入固定时钟并推进一分钟；没有损坏引用或篡改业务行。分别检查主题 updated_at 与发帖结果中嵌套关系的固定版本/状态。
- H03/H04：故意删除当前库的 metadata、必需表或历史迁移行，检验拒绝策略；不是声称正常使用会自行删除这些材料。比较逻辑 schema/数据，不声称 SQLite 文件物理字节相同。
- H05：逻辑 v1 fixture（从当前库去掉 thread_versions 和 v2 版本行），注入未来版本引用或 operation 不匹配的旧响应，调用生产协调入口，再关闭重开检查。没有运行旧应用二进制。
- H06：直接调用生产 validateResultRef，验证输入边界。未知 operation、可选字段和额外正文不是公开 HTTP 写库能力的模拟。
- H07/H08：主动构造引用目标/缺失关联/同主键历史冲突，检验读取与迁移的完整性保护。H07 不声称未经认证远程用户可以篡改幂等表。
- H09：两个真实 CLI 子进程（JSON、文本输出）；仅检测合成正文标记是否出现在 stdout/stderr，输出文件不保存旧完整记录或凭据。每个子进程有 5 秒超时，本次没有超时且锁均清理。
- H10：真实 SQLite TEMP trigger，分别在 v2 版本标记和 initialized metadata INSERT 时执行 `RAISE(ABORT)`。外部计数确认各命中 1 次；关闭重开后比较全部主 schema 和表数据，两个阶段均完整回滚。

所有新脚本数据库与 CLI 数据目录都在独立临时目录，finally 删除自身资源。没有访问用户运行中的论坛数据目录。

## 未完成的验证不作成功声明

未新增真实旧二进制升级演练；历史形态采用来源明确的逻辑 fixture，G08 则使用已核对的 fa1b35c 历史 DDL。没有执行四宿主端到端认证、真实模型协作、附件、Web 或正式评审模块验收。本轮未改接入层，因此没有重新核查上游 harness 版本或改变其兼容性状态。

本次结论仅是 R4-B.1 的代码和证据复核；R4-B、R4-C 与整个 M0/M1 阶段的完成情况应分开报告。
