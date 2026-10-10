# M2.4-A 覆盖审计

按 [独立正式输出](verification/observed-tests.txt)逐文件提取，并对照 [coverage](verification/coverage.json)：26文件、263/263。新core7+contract4已在总数内，不重复累计定向或独立探针。

| 正式文件 | 通过条目 |
|---|---:|
| [tests/contracts/m0-m1-adapters-regression.test.ts](../../../tests/contracts/m0-m1-adapters-regression.test.ts) | 6 |
| [tests/contracts/m2-search-contracts.test.ts](../../../tests/contracts/m2-search-contracts.test.ts) | 5 |
| [tests/integration/m0-m1-r3-regression.test.ts](../../../tests/integration/m0-m1-r3-regression.test.ts) | 11 |
| [tests/integration/m2-artifacts-http.test.ts](../../../tests/integration/m2-artifacts-http.test.ts) | 8 |
| [tests/integration/m0-m1-r2-regression.test.ts](../../../tests/integration/m0-m1-r2-regression.test.ts) | 12 |
| [tests/integration/m2-artifacts-cli.test.ts](../../../tests/integration/m2-artifacts-cli.test.ts) | 4 |
| [tests/contracts/r4-c-route-contracts.test.ts](../../../tests/contracts/r4-c-route-contracts.test.ts) | 4 |
| [tests/integration/m1-discussion.test.ts](../../../tests/integration/m1-discussion.test.ts) | 5 |
| [tests/integration/m0-m1-regression.test.ts](../../../tests/integration/m0-m1-regression.test.ts) | 11 |
| [tests/integration/m2-artifacts-filesystem.test.ts](../../../tests/integration/m2-artifacts-filesystem.test.ts) | 6 |
| [tests/contracts/m2-typed-write-contracts.test.ts](../../../tests/contracts/m2-typed-write-contracts.test.ts) | 5 |
| [tests/contracts/m2-knowledge-view-contracts.test.ts](../../../tests/contracts/m2-knowledge-view-contracts.test.ts) | 4 |
| [packages/storage-sqlite/tests/storage.test.ts](../../../packages/storage-sqlite/tests/storage.test.ts) | 7 |
| [tests/contracts/cross-interface-contract.test.ts](../../../tests/contracts/cross-interface-contract.test.ts) | 2 |
| [tests/integration/m2-typed-writes.test.ts](../../../tests/integration/m2-typed-writes.test.ts) | 12 |
| [tests/integration/m2-artifacts-core.test.ts](../../../tests/integration/m2-artifacts-core.test.ts) | 9 |
| [tests/integration/m2-search.test.ts](../../../tests/integration/m2-search.test.ts) | 9 |
| [tests/integration/m2-context.test.ts](../../../tests/integration/m2-context.test.ts) | 7 |
| [tests/contracts/m2-context-contracts.test.ts](../../../tests/contracts/m2-context-contracts.test.ts) | 4 |
| [tests/integration/m2-knowledge-views.test.ts](../../../tests/integration/m2-knowledge-views.test.ts) | 7 |
| [tests/probes/m0-probes.test.ts](../../../tests/probes/m0-probes.test.ts) | 3 |
| [tests/contracts/m0-m1-r2-adapters.test.ts](../../../tests/contracts/m0-m1-r2-adapters.test.ts) | 3 |
| [packages/protocol/tests/schema.test.ts](../../../packages/protocol/tests/schema.test.ts) | 5 |
| [tests/contracts/r4-c-contracts.test.ts](../../../tests/contracts/r4-c-contracts.test.ts) | 26 |
| [packages/storage-sqlite/tests/schema-generation.test.ts](../../../packages/storage-sqlite/tests/schema-generation.test.ts) | 6 |
| [tests/integration/m0-m1-r4-b-regression.test.ts](../../../tests/integration/m0-m1-r4-b-regression.test.ts) | 82 |
| **合计** | **263** |

既有knowledge7+4、search9+5、typed12+5、artifact9/6/8/4、B82/C26/G4保持。三份获准旧正式适配保留原语义：cross-interface三断言移.data、knowledge静态类型改ContextPage、V06改整pin删除/实际4096上限并保留65536完整40sources；未删测试凑绿。详见 [独立报告](verification/verification.md)。

| 独立证据 | 结果与有限边界 |
|---|---|
| 当前版本化29 | 每项exit0，含统一build/typecheck/lint/full；AC6/ADv2 5/AE5/U8保持，[commands](verification/commands.json) |
| CX实际HTTP | raw成功body4096/65536/default12288、非法400、mandatory过大422、整pin删除、50sources完整控制、focus拒绝；不是近似对象估算 |
| request_id临界 | 1759quote实际4095bytes成功，再加一quote422，相同材料；[临界输出](verification/observed-request-id.txt) |
| 双WAL快照 | writer屏障提交新规则/event，response旧规则+seq1，后续新规则+seq2；checkpoint订阅实际poll新event，不只检查token存在 |
| Clock消费 | 注入2030时钟、24hTTL，到期等号201、+1秒422 |
| 本机工具 | 安装Pi validateToolArguments→注册execute、真实MCPstdio，4096 true/65536 false meta与50sources控制均保持；不是四真实宿主模型认证 |
| 旧独立回归 | SQ/native长URL、KV、三真实旧成功HTTP原key201/新key400、revision stale409后坏材料400、改payload409、重启/墓碑/撤凭据保持 |
| 稳定与保护 | 122product+35当前docs执行稳定；2078旧证据、4SQL/archive、2schema/profile不变，21tracked dist正常变化无新增输出，[integrity](verification/integrity.json) |

CX与旧探针的实际命令/结果映射见 [coverage.json](verification/coverage.json)，不手编独立计数。当前35操作、19JSON+1multipart未改，沿用 [M2.1政策表](../2026-10-03-m2-1/coverage-audit.md)。新ContextPage/Envelope与三个同源函数见 [单元B](implementation/protocol/README.md)，快照/预算/时钟见 [单元A](implementation/core/README.md)。

成功compact HTTPbodycap不含status/header/error/SDK外壳；focus不支持、CLIdata-only、mandatory422暂无规则ref续读均是批准A边界。M2.4-B.1规则/B.2正文续读后续，完整T06/M2.4/M2未完。ADv2的16行date-time ignored不能证明格式值验证，原R21 JSON-only历史28/29与当前versioned29分列。Node22/干净安装/远程CI/真实宿主模型/10万负载未测。
