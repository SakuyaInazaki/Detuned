# R4-B 复核执行记录

2026-09-28，工作目录 `/Users/sakimi/Desktop/Detuned`。运行时 Node `v26.3.0`，pnpm `11.7.0`。

源码基线是 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` **加原有未提交修改**。[baseline.json](baseline.json) 保存了初始状态与产品/测试文件指纹。旧探针输出的 reviewed_commit 仅取 Git HEAD，不能用它代替该工作区指纹。本次未改动产品源码或原有正式测试。

| 命令 | 结果 | 证据 |
|---|---|---|
| `pnpm build` | exit 0，9 包构建通过 | 本次工具输出 |
| `pnpm typecheck` | exit 0 | [observed-typecheck.txt](observed-typecheck.txt) |
| `pnpm lint` | exit 0；含义为 tsc --noEmit | [observed-lint.txt](observed-lint.txt) |
| `pnpm test:all` | exit 0，11 文件 / 74 项通过 | [observed-tests.txt](observed-tests.txt) |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | exit 0，15/15 | [observed-r1-behavior.json](observed-r1-behavior.json) |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | exit 0，5/5 | [observed-r1-adapters.json](observed-r1-adapters.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | exit 0，12/12 | [observed-r2-remaining.json](observed-r2-remaining.json) |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | exit 0，3/3 | [observed-r2-cli.json](observed-r2-cli.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | exit 0，10/10 | [observed-r3-invariants.json](observed-r3-invariants.json) |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | exit 0，1/1 | [observed-r3-serve-version.json](observed-r3-serve-version.json) |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | exit 1，6 通过 / 2 失败；仅 U05/U06 | [observed-r4-unfinished.json](observed-r4-unfinished.json) |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | **exit 1，0 通过 / 9 失败** | [observed-r4b-gaps.json](observed-r4b-gaps.json) |

正式套件与旧 CLI 检查在获准的本机回环监听环境运行。新增脚本只操作自身创建的临时文件库；G09 的真实 CLI 子进程因缺失密钥在监听前退出，没有外网或模型请求，结束后清理自身资源。

G03 的测试包装 db.exec，仅在实际创建 history 表之后安装 SQLite TEMP trigger；真正的 INSERT 仍由 SQLite 执行，trigger 触发次数在输出中记录。不是伪造服务返回值。G02/G03 包含关闭重开文件库。

G02/G03/G04/G07 是来源明确的逻辑旧格式 fixture；G08 读取 Git 中 `fa1b35c` 的真实 SCHEMA_SQL，植入合成管理员/credential 并调用当前协调入口。没有声称完整运行旧应用二进制。实际执行的历史 DDL 不含 instance_metadata，已检查该前提。

新增脚本最初要求 G02 在历史不可恢复时明确报错；随后将断言放宽为“准确恢复原结果或明确非成功”，避免排斥未来有可靠证据的恢复方案，并重新执行。两次均为 9 项失败；本目录保存最终脚本对应结果，没有把错误行为改成预期通过。

## 未执行

- 未重新安装依赖，未运行 frozen-lockfile 安装或远端 CI，未验证 CI 的 Node 22 环境。
- 未运行真实 dsh/Pi/Codex/Claude Code 宿主或模型。此次实现未改动这些接入层，不重复宣称新宿主验证。
- 未重新审查完整 R4-C 范围；仅复跑已有 U05/U06，延期仍有效。
- 未执行 M2–M8，未提交、推送、发布、修改全局 Agent 配置或触碰真实论坛数据目录。

计数说明：74 是正式测试函数数；46 是旧审查断言数；R4 的 8 项和本次 9 项也属于审查检查。存在重叠，不能累加成不同场景总数，更不能称全部通过。

归档 SHA-256 保持 `82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`。修复后的证据另存，不覆盖基线 observed、此前审查和实现方交付记录。
