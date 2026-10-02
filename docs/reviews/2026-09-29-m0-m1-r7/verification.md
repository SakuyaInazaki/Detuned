# R7 验证记录

日期：2026-09-29；工作区：`/Users/sakimi/Desktop/Detuned`；HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a`，加未提交实现。源码与测试的审查前指纹见 [baseline.json](baseline.json)。运行环境 Node v26.3.0，pnpm CLI 11.7.0。

以下是本轮实际执行结果，不是待运行清单。审查过程中未修改 packages、tests 或工具链；构建会生成 dist。所有行为测试使用自建临时库和合成数据，不操作用户运行中的论坛实例。

| 命令 | 退出码 | 输出 / 结果 |
|---|---:|---|
| `pnpm build` | 0 | [构建输出](observed-build.txt) |
| `pnpm typecheck` | 0 | [类型检查](observed-typecheck.txt) |
| `pnpm lint` | 0 | [lint 输出](observed-lint.txt)；主要是 tsc --noEmit |
| `pnpm test:all` | 0 | [正式测试](observed-tests.txt)：11 文件、84 通过 |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | [R1 业务](observed-r1-behavior.json)：15/15 |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | [R1 适配器](observed-r1-adapters.json)：5/5 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | [R2 业务](observed-r2-remaining.json)：12/12 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | [R2 CLI](observed-r2-cli.json)：3/3 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | [R3 不变量](observed-r3-invariants.json)：10/10；T06 夹具限制见 README |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | [R3 serve](observed-r3-serve-version.json)：T11 通过 |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | [R4](observed-r4-unfinished.json)：6/8，仅 U05/U06 失败 |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | [R5](observed-r5-gaps.json)：G01–G09 通过 |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | [R6](observed-r6-boundaries.json)：H01–H10 通过 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 1 | [R7 反例与对照](observed-b2-completeness.json)：J01–J06 失败，J07 通过 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | [真实旧 DDL 正例](observed-legacy-fixture.json)：K01 通过 |

正式测试及 R2 CLI 测试涉及本机 loopback 监听，在获得执行环境批准后运行成功。R7 新脚本用 Fastify inject、临时文件 SQLite 和本次自建目录中的 CLI init；不开放监听、不发起模型请求。CLI 子进程设有超时，仅清理脚本自行创建的临时目录，未残留锁。

## 夹具与证据边界

- J01 使用上一轮实际的 compact relation.create 形状，业务经过真实 HTTP 新建、resolve、复用；升级前把指定结果记录替换为该旧格式。不是运行旧应用生成的整库。
- J04 使用当前业务生成的完整 Thread 响应作为已知历史载荷，在逻辑 v1 fixture 上验证迁移恢复；第二部分是故意制造的历史内容冲突。
- J02/J03/J05/J06 包含定向的存储损坏/错配输入。J05 不证明外部用户能篡改 SQLite；它验证迁移与重放对于坏引用的完整性要求。
- K01 直接执行 Git 历史 `fa1b35c` 中 schema.ts 的 SQL，导入明确选定表的兼容合成行及一个旧完整 Post 结果。升级前断言无 metadata、无 thread_versions、版本仅 1、外键检查通过；源码 DDL SHA-256 记录在 observed。未执行旧二进制，不据此声称支持全部历史版本/所有旧格式。
- J02 记录的 secret 比较只输出布尔值；没有输出真实 secret、token 或凭据哈希。J06 的正文标记是合成内容。
- 负例通过条件包括明确失败及逻辑状态保持；SQLite 文件的逐字节完全相同不作为事务回滚要求。成功迁移则比较业务/事件/凭据等应保留的内容，并按场景关闭重开。
- 不累加重叠测试数量为独立场景数量。没有运行远端 CI、真实 dsh/Pi/Codex/Claude Code 会话、模型研究评估、物理断电或完整旧二进制升级。

## 复跑约定

脚本使用 dist，改产品代码后先 `pnpm build`。保存新的结果到下一次实现目录，保留本目录 observed。J 脚本 exit 1 表示当前确认的产品反例；R4 exit 1 仅 U05/U06 时属于已登记的后续包，不应包装成全通过。

R3 T06 的当前 setup 已不再代表旧版本。实现时须把它替换为来源明确的真正旧结构，并保留语义等价断言和当前库拒绝反例；不能为了让未经修正的旧脚本继续 exit 0，允许损坏当前实例生成新 secret。K01 可作为这项修正的执行参考。

交付前校验：两个新增脚本均通过 `node --check`，`git diff --check` 通过，pnpm 实测为 11.7.0。[review-integrity.json](review-integrity.json) 确认 HEAD、81 个产品/测试文件和原方案字节未变，7 个当前/新审查文档无失效的本地文件链接，全部 observed JSON 可解析。未因仅编辑审查文档而重复运行整套产品测试。
