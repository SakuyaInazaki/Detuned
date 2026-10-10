# M2.4-B.1 覆盖与证据核对

2026-10-06有限本机验收。计数来自本轮真实全正式输出与coverage-2026-10-06.json：28唯一文件、276/276；新增space-revision-read core8和space-read contracts5，共13项已含总数。原A263+本包13=276；正式与独立探针不重复累计。当前版本化29/29的真实exit记录包含一次统一build/typecheck/lint/fullformal；原JSON-only历史28/29单独保留。

| 正式文件 | 项数 |
|---|---:|
| `packages/protocol/tests/schema.test.ts` | 5 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `tests/contracts/m2-context-contracts.test.ts` | 4 |
| `tests/contracts/m2-knowledge-view-contracts.test.ts` | 4 |
| `tests/contracts/m2-search-contracts.test.ts` | 5 |
| `tests/contracts/m2-space-read-contracts.test.ts` | 5 |
| `tests/contracts/m2-typed-write-contracts.test.ts` | 5 |
| `tests/contracts/r4-c-contracts.test.ts` | 26 |
| `tests/contracts/r4-c-route-contracts.test.ts` | 4 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/integration/m2-artifacts-cli.test.ts` | 4 |
| `tests/integration/m2-artifacts-core.test.ts` | 9 |
| `tests/integration/m2-artifacts-filesystem.test.ts` | 6 |
| `tests/integration/m2-artifacts-http.test.ts` | 8 |
| `tests/integration/m2-context.test.ts` | 7 |
| `tests/integration/m2-knowledge-views.test.ts` | 7 |
| `tests/integration/m2-search.test.ts` | 9 |
| `tests/integration/m2-space-revision-read.test.ts` | 8 |
| `tests/integration/m2-typed-writes.test.ts` | 12 |
| `tests/probes/m0-probes.test.ts` | 3 |
| **合计** | **276** |

独立SR01–SR09覆盖固定ref/预算省略与optional保留、更新后旧修订重组、真实raw HTTP预算/Unicode/二次转义、真实req.id临界、TTL与游标绑定、每页当前ACL、WAL ref/seq/checkpoint poll、安装Pi/MCPstdio/CLI整page与完整目录。SR10仅当前29/fullformal/SQ/KV通过；三真实旧HTTP原夹具因私有临时DB/凭据ENOENT未完成，不标绿，不宣称所有旧回归保持。A旧成功证据独立保留；原M2.1未提交构建不能从HEAD同版重建，只有原材料恢复后才可重试。

目录实际36routes/20body=19JSON+1multipart，无占位body。ADv2的18行date-time ignored不是值格式验证。原首sandbox localhost EPERM、专项12过1失败和旧历史ENOENT日志保留；解除loopback限制后同脚本/同13正式专项通过，没有产品改动。

[独立验证](verification/verification.md)、[coverage](verification/coverage-2026-10-06.json)、[integrity](verification/integrity-2026-10-06.json)证明执行时125source/config/tests、36docs稳定；2207旧证据、4SQL/archive、2schema零变化，19 tracked dist正常变化，新service四产物单列。本次接受后的8文件状态同步发生在独验冻结之后，不能纳入独验前后36docs零变化声明。

未测：真实四宿主模型/Node22/干净安装/远程CI/10万负载。HTTP cap不含headers/error/toolwrapper，每页O(document)。完整T06/M2.4/M2与M5/M6/M7未完成，B.2.1下一包未开始实现。

## 2026-10-06 最终文档收尾核查报告

仅核获准8文件，未跑产品测试/build：178个本地Markdown链接中172存在，剩余6处均指向父代理正在冻结的同目录next-task.md，检查时尚未落盘。父代理/core随后写入并冻结next-task.md，终核原6处目标已全部resolve，8文件本地链接178/178存在，无缺项。逐文件尾随空白检查为空，`git diff --check -- <8 files>` exit0、无诊断。直接读取本轮coverage JSON确认276/28、新8+5含总数、29个真实exit0、36routes/20body/19JSON+1multipart与18警告数一致。覆盖表按实际全正式stdout提取28文件、合计276，不填补历史ENOENT重放。

本轮仅同步获准8个文档，未修改产品/正式tests/其它规范/旧审查或原日志。历史段保留当时263等数值；当前入口已迁B.1。最终文档检查不替代产品验收。

终核说明：第一条只读链接脚本误把其它历史next-task链接计入“原6处目标”总数，断言在写入前失败，未改文件；随后完整读取确认178链接均存在、无尾随空白，再仅更新本报告。没有产品测试或build。
