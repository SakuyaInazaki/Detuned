# R8 实际验证记录

工作区 `/Users/sakimi/Desktop/Detuned`；日期 2026-09-29；HEAD `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加未提交 R4-B.3 实现。[baseline.json](baseline.json) 保存 83 个产品/测试文件指纹，以及现有 11 个审查脚本的指纹。环境为 Node v26.3.0、pnpm CLI 11.7.0。

本轮未修改产品/正式测试，仅构建 dist、运行验证、新增审查材料和更新状态文档。以下结果来自实际执行，不是待办清单：

| 命令 | exit | 输出与结果 |
|---|---:|---|
| `pnpm build` | 0 | [build](observed-build.txt) |
| `pnpm typecheck` | 0 | [typecheck](observed-typecheck.txt) |
| `pnpm lint` | 0 | [lint](observed-lint.txt)，主要是 tsc --noEmit |
| `pnpm test:all` | 0 | [正式测试](observed-tests.txt)，11 文件、91 通过 |
| `node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs` | 0 | [R1 业务](observed-r1-behavior.json)，15/15 |
| `node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs` | 0 | [R1 适配器](observed-r1-adapters.json)，5/5 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs` | 0 | [R2 业务](observed-r2-remaining.json)，12/12 |
| `node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs` | 0 | [R2 CLI](observed-r2-cli.json)，3/3 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` | 0 | [R3 不变量](observed-r3-invariants.json)，10/10，使用修正 T06 |
| `node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs` | 0 | [R3 serve](observed-r3-serve-version.json)，T11 通过 |
| `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` | 1 | [R4](observed-r4-unfinished.json)，6/8，仅 U05/U06 失败 |
| `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` | 0 | [R5](observed-r5-gaps.json)，9/9 |
| `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` | 0 | [R6](observed-r6-boundaries.json)，10/10 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` | 0 | [R7 J](observed-r7-completeness.json)，7/7 |
| `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` | 0 | [R7 K](observed-r7-legacy.json)，1/1 |
| `node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs` | 1 | [R8 L](observed-b3-gates.json)，L01–L07 失败、L08 通过 |

正式套件与 R2 CLI 需要临时本机 loopback 监听，在执行环境批准后运行。新 L 脚本只用 Fastify inject 和自建临时文件 SQLite，不监听端口、不调用模型，不接触用户运行中的论坛库；finally 清理自行创建的临时目录。

## 证据边界

- L01 是普通合法 HTTP 操作，无数据库篡改；同键正常重试及重开后均返回 422。L08 提供正常新主题重放与可恢复旧完整响应的正向对照。
- L02 使用当前 codec 接受的旧式变体，检验“接受并提交的产物不能在下次启动被自己拒绝”。不声称该精确 `$ref:thread + thread_version` patch 形状是某个已发布旧二进制的输出。
- L04 的 `$ref:post + relation_ids` 形状已与 `c4f041f`、`71aefc1` 的 idempotency-service 源码核对；用当前 HTTP 生成实体，再替换指定键为旧格式。没有运行旧二进制整库。
- L03/L05/L06/L07 含定向损坏、错配或非法编码输入，验证已有完整性要求。它们不证明外部用户能直接修改 SQLite，也不代表正常新建库缺主键。
- L03 在记录启动前后快照后，额外尝试插入重复幂等键，以证明缺约束的含义；这个后续故意写入不是 bootstrap 自发产生的数据。
- 真实旧 DDL 来源与合成行的 K01/T06 能证明相关路径，不能据此概括全部历史版本/codec 已验证。新 SQL 夹具的注释头不影响实际 schema；源码 hash 与 SQL 文件 hash 分开记录。
- 初次编写 L 探针时 refs setup 漏了 target_ref 外层，得到 400；已按现有公开 schema 修正，仅测试输入改变，没有产品改动。最终 JSON 的 8 项结果均来自完成 setup 后的执行，该 400 不计为产品缺陷。
- 未运行远端 CI、真实四类 harness、模型研究评估、物理断电或完整旧二进制升级。测试场景重叠，不能累加成独立覆盖数。

## 复跑与保存

脚本使用 dist，源码变化后先 build。后续实现结果保存到相应 implementation 目录，不覆盖本目录 observed。小包 B.4-1 只要求 L01/L02/L08 通过，其他已登记 L 失败仍如实返回 exit 1；整个数据包验收才要求全部 L 通过。

交付检查：`node --check` 与 `git diff --check` 均通过，pnpm 实测为 11.7.0。[review-integrity.json](review-integrity.json) 确认 83 个产品/测试/夹具文件、11 个已有审查脚本、HEAD 和原方案字节未被本轮改变；8 个当前及新增 Markdown 文档的本地文件链接有效，所有已保存 JSON 可解析，observed 未检出当前格式管理员 token。未因只改审查文档而重复运行整套产品测试。
