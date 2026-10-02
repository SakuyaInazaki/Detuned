# R4 复核证据

日期：2026-09-28（Asia/Shanghai）。工作目录：`/Users/sakimi/Desktop/Detuned`。

| 项目 | 值 |
|---|---|
| 被审查源码 HEAD | `71aefc1839a59f79ad9b6c48af42e36ff49f781a` |
| 上一源码基线 | `c4f041f899cf3224d42deeb3ecfc19cf379368f7` |
| 开始时 Git 工作区 | 干净 |
| Node | v26.3.0 |
| pnpm | 11.7.0 |
| 官方 Pi 开发依赖 | `@earendil-works/pi-coding-agent@0.87.1` |
| 本次产品源码改动 | 无；只增加审查脚本/证据/任务书并修正状态文档 |
| archive/pre-plan.original.md SHA-256 | `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`，原字节保留 |

## 实际执行

以下路径均相对仓库根目录。没有省略失败检查，也没有用当前错误作为“预期正确行为”。

| 命令 | 退出码/结果 | 保存证据 |
|---|---|---|
| `pnpm build` | 0 | 本次工具输出，所有 9 个包构建通过 |
| `pnpm typecheck` | 0 | 本次工具输出 |
| `pnpm lint` | 0 | 本次工具输出；其含义仍是 tsc --noEmit |
| `pnpm test:all` | 0；10 文件 / 62 项通过 | [observed-tests.txt](observed-tests.txt) |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0；15/15 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0；5/5 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0；12/12 | [observed-r2-remaining.json](observed-r2-remaining.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0；3/3 | [observed-r2-cli.json](observed-r2-cli.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0；10/10 | [observed-r3-invariants.json](observed-r3-invariants.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0；1/1 | [observed-r3-serve-version.json](observed-r3-serve-version.json) |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | **1；2 通过 / 6 失败** | [observed-unfinished-contracts.json](observed-unfinished-contracts.json) |

正式套件使用临时回环 HTTP 和 MCP/CLI 子进程，需要本地监听权限；相应命令在获准的环境中成功执行。新增 U01–U08 使用临时文件 SQLite、Fastify inject 和原生 Response fixture，没有网络监听或模型调用。U01、U02 包含 close/reopen；U08 使用 SQLite trigger 注入写失败。正常完成后均清理自身临时目录。

`62` 是当前正式测试数量；`46` 是此前审查脚本的断言数量，二者有重复；新增 `8` 也是独立审查断言，并非已纳入 CI 的新正式测试。不能宣称“116 个不同场景全部通过”。

## 未执行及解释范围

- 没有再次安装依赖；没有独立复跑 `pnpm install --frozen-lockfile`。使用现有安装与本轮 build 产物。
- 未在 GitHub Actions 或 Node 22 环境执行，不能据工作流文件声称远端通过。
- 未运行真实 dsh、Pi、Codex、Claude Code 宿主和模型；已运行的 MCP stdio 是实际跨进程协议测试，不等于上述宿主接入测试。
- U01/U02 的历史记录格式来自 Git 历史代码，是来源明确的逻辑 fixture，不是用旧应用二进制生成并演练整个升级过程。
- serve 的旧库升级缺失、匿名取消监听器清理、持久密钥 fallback 为源码核查结论；本次未为它们另建动态失败编号。
- 未执行 M2–M8 的验收。未提交、推送、发布或修改任何用户全局 Agent 配置。

修复后的 observed 应另存，注明 HEAD、dirty diff 和实际版本，不覆盖本目录的审查基线结果。未来若 schema 的合法升级使 fixture 构造需调整，应保留等价失败断言并解释调整，不能仅删除本脚本或将 201 假成功改为预期。
