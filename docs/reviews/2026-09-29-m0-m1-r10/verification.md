# R10 实际验证记录

工作区 `/Users/sakimi/Desktop/Detuned`；日期 2026-09-29；Node v26.3.0。被审查的是 HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交实现；[baseline.json](baseline.json) 保存 83 个产品/测试/夹具文件、13 个已有审查脚本及原有审查材料的指纹。

本次先构建源码再运行探针，未修改产品代码或正式测试。命令退出码来自实际执行：

| 命令 | exit | 结果 / 原始输出 |
|---|---:|---|
| `pnpm build` | 0 | [build](observed-build.txt) |
| `pnpm typecheck` | 0 | [typecheck](observed-typecheck.txt) |
| `pnpm lint` | 0 | [lint](observed-lint.txt)，当前主要执行 tsc --noEmit |
| `pnpm test:all` | 0 | [正式测试](observed-tests.txt)，107/107，11 文件，R4-B 文件 43 项 |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | [R1 业务](observed-r1-behavior.json)，15/15 |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | [R1 适配器](observed-r1-adapters.json)，5/5 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | [R2 业务](observed-r2-remaining.json)，12/12 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | [R2 CLI](observed-r2-cli.json)，3/3 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | [R3 不变量](observed-r3-invariants.json)，10/10 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | [R3 serve](observed-r3-serve.json)，T11 通过 |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | [R4](observed-r4-contracts.json)，6/8，仅 U05/U06 |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | [G](observed-r5-gaps.json)，9/9 |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | [H](observed-r6-boundaries.json)，10/10 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | [J](observed-r7-completeness.json)，7/7 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | [K](observed-r7-legacy.json)，1/1 |
| `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 1 | [L](observed-r8-gates.json)，7/8，仅 L03 |
| `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | [N](observed-r9-acceptance.json)，5/5 |
| `node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs` | 1 | [P](observed-b4-2-boundaries.json)，1/6；P01–P05 失败，P06 通过 |

正式套件和 R2 CLI 经执行环境批准使用本机临时端口；其余相关审查使用临时库、Fastify inject 或本机子进程。新 P 探针不监听端口、不调用模型、不读用户运行中的论坛库；只清理自己创建的临时目录。

## P 探针证据边界

| ID | 输入与流程 | 证明范围 |
|---|---|---|
| P01 | 真实 HTTP 创建实体后替换一个 typed ref；分别送在线重放及协调启动，重开比较逻辑快照 | 同空间错误 nested source、v999 都被接受；没有宣称普通用户可以修改 DB |
| P02 | 五种受控损坏引用走 serve 协调；关闭重开后比较 schema 与所有表行 | 提前降级分支确实修改坏引用并接受启动；只保留输出 kind/布尔值，不输出缓存正文或凭据 |
| P03 | 旧 Post 指向错误 thread；完整旧 Thread 创建结果在后续修改后先在线重放再迁移重放 | 同输入不同入口的判定/历史投影不一致；正常 serve 通常先迁移，这里单独测试保留的 legacy 在线路径 |
| P04 | 当前 codec 接受的旧式 Thread patch 缺时间，逻辑 v1 库、实体已到 v3 | 原 v2 时间被实际迁移时间替代；不是已发布旧二进制输出的断言；允许实现基于支持规则安全拒绝此输入 |
| P05 | 对新编码函数传入非法状态或字符串版本 | 必需字段错误被默认成 open/1；未据此声称正常 HTTP 会生成这些非法结果 |
| P06 | 现代固定嵌套快照；完整旧 Thread create/patch/Post 结果；迁移后两次启动再重放 | 所有结果完整相等、重放前后逻辑快照相等，保护已实现的正向历史兼容 |

P04 的测试业务时钟固定为 06:00、06:01、06:02；输出 08:03:23.883 是此次运行中迁移器真正生成的墙上时钟值，不是手写的预期结果。新脚本第一次完整执行即生成本目录 P 输出，没有修改产品后重跑。

逻辑快照比较包括 schema、凭据和实例 metadata；输出只记录比较布尔值。它不是数据库文件逐字节比较，也不证明物理断电行为。R3 serve 等旧脚本输出里的日期常量沿用历史值，本目录实际运行日期以此页为准。

## 完整性与未运行项

[review-integrity.json](review-integrity.json) 记录最终 HEAD、83 个产品/正式测试/夹具文件、13 个旧审查脚本、历史审查文件与原方案字节的保持情况，以及新脚本语法、Markdown 文件链接、JSON、diff 检查。允许更新的已有文件仅为项目 README、docs/progress 和 docs/reviews/README；历史报告与 observed 不覆盖。

未运行：真实四类 harness、真实模型研究任务、远端 CI、公网部署、物理断电或完整旧二进制升级。未把小包探针全绿等同完整 B01–B12，也未把本次单次工程审查称为论坛的两份独立评审功能。
