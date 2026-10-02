# R9 实际验证记录

日期 2026-09-29；工作区 `/Users/sakimi/Desktop/Detuned`；Node v26.3.0；pnpm CLI 11.7.0。HEAD 与 dirty 工作区内容以 [baseline.json](baseline.json) 为准，包含 83 个产品/测试/夹具指纹与 12 个既有审查脚本指纹。

先构建当前源码，再运行以下验证；产品和正式测试没有因本次审查发生变更。

| 命令 | exit | 结果 / 原始输出 |
|---|---:|---|
| `pnpm build` | 0 | [build](observed-build.txt) |
| `pnpm typecheck` | 0 | [typecheck](observed-typecheck.txt) |
| `pnpm lint` | 0 | [lint](observed-lint.txt)，当前主要执行 tsc --noEmit |
| `pnpm test:all` | 0 | [正式测试](observed-tests.txt)，99/99，11 文件，R4-B 文件 35 项 |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | [R1 业务](observed-r1-behavior.json)，15/15 |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | [R1 适配器](observed-r1-adapters.json)，5/5 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | [R2 业务](observed-r2-remaining.json)，12/12 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | [R2 CLI](observed-r2-cli.json)，3/3 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | [R3 不变量](observed-r3-invariants.json)，10/10，保留修正后的历史 DDL T06 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | [R3 serve](observed-r3-serve.json)，T11 通过 |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | [R4](observed-r4-contracts.json)，6/8，仅 U05/U06 失败 |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | [G](observed-r5-gaps.json)，9/9 |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | [H](observed-r6-boundaries.json)，10/10 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | [J](observed-r7-completeness.json)，7/7 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | [K](observed-r7-legacy.json)，1/1 |
| `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 1 | [L](observed-r8-gates.json)，3/8，L03–L07 失败 |
| `node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs` | 0 | [N](observed-b4-1-acceptance.json)，5/5 |

正式套件和 R2 CLI 经执行环境授权使用本机临时端口。N 脚本使用 Fastify inject、自建临时文件数据库和合成凭据，不监听端口、不调用模型、不使用用户运行中的数据库。

## 新增验证的准确含义

| 探针 | 注入 / 检查点 | 实际结果与限制 |
|---|---|---|
| N01 | 提交后的 onSend 抛错；另一只读连接确认 space/事件/幂等记录可见；原文件关闭重开 | 故障命中 1 次，首次 500，立即重试和重开后 201，完整 data 相同，4 类写入数量不增；不是 TCP 断线实验 |
| N02 | 目标完整的 thread marker 与 family-only 兼容 marker；三次协调启动 | 启动都成功；family 转完整 operation 后不再变化；重试 422，所有表和 schema 的逻辑快照不变 |
| N03 | 错目标、未知 op、未知 reason、额外 body；需升级的逻辑 v1 合成库 | 四种输入均拒绝；关闭重开后 schema 与全部表行不变；此项证明失败原子性，不声称具体 DDL 故障触发器命中，后者另由 H10 验证 |
| N04 | 兼容 compact relation.create 缺历史版本输入生成 marker，三次协调启动 | 标记合法，第二/三次启动不再改写；重试 422，无额外数据/凭据/secret/事件/结果变更 |
| N05 | 合法 space.patch 正例与引用真实另一个空间的反例 | 正例 200 且完整 data 相等；错误绑定在线 422、启动迁移拒绝，重开后全库逻辑快照不变 |

快照在内存中包含凭据/实例元数据用于比较；输出仅保存比较布尔值，不输出 token、secret 或凭据表内容。逻辑快照不是 SQLite 文件逐字节比较，也不能推导物理断电耐久性。

N 脚本首次 setup 误把 relation.create 的裸 Relation 返回当成 `{relation}`，在进入该场景时抛 TypeError，记录保存在 [首次 setup 输出](probe-setup-attempt-1.txt)。已按实际 HTTP 返回修正为 `.id`；没有改变产品代码或预期断言。该次不计入产品失败，最终 5 项结果来自修正后的完整运行。

R3 serve 脚本输出的 reviewed_date 沿用脚本内历史常量；本目录实际执行日期为本页日期，不改历史脚本来调整输出。K/T06 的旧 DDL 来源与合成数据含义延续 R8 说明，未运行完整旧二进制。

## 交付完整性

[review-integrity.json](review-integrity.json) 记录最终源文件/旧脚本/原方案未改检查、本地 Markdown 文件链接、JSON 解析、脚本语法和 diff 检查结果。审查仅新增本目录及修改 README、docs/progress、审查入口；历史 observed 与实现报告不覆盖。后续实现者的输出应保存到自己的 implementation 目录。

未运行：真实四类 harness、远端 CI、模型研究评估、公网服务、真实客户端断网及物理断电。一次独立审查不等于论坛产品自身的“两份独立评审”功能已实现。
