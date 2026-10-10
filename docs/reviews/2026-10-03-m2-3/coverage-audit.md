# M2.3 覆盖审计

本表逐文件计数直接提取 [独立正式输出](verification/observed-tests.txt)，并对照 [coverage.json](verification/coverage.json)：24文件、252/252。它包含既有测试，独立探针不与正式项相加。父代理已接受本机工程范围。

| 正式文件 | 通过条目 |
|---|---:|
| [tests/integration/m0-m1-regression.test.ts](../../../tests/integration/m0-m1-regression.test.ts) | 11 |
| [tests/integration/m2-artifacts-http.test.ts](../../../tests/integration/m2-artifacts-http.test.ts) | 8 |
| [tests/contracts/m2-knowledge-view-contracts.test.ts](../../../tests/contracts/m2-knowledge-view-contracts.test.ts) | 4 |
| [tests/integration/m0-m1-r3-regression.test.ts](../../../tests/integration/m0-m1-r3-regression.test.ts) | 11 |
| [tests/integration/m0-m1-r2-regression.test.ts](../../../tests/integration/m0-m1-r2-regression.test.ts) | 12 |
| [tests/contracts/r4-c-route-contracts.test.ts](../../../tests/contracts/r4-c-route-contracts.test.ts) | 4 |
| [tests/integration/m1-discussion.test.ts](../../../tests/integration/m1-discussion.test.ts) | 5 |
| [tests/integration/m2-artifacts-cli.test.ts](../../../tests/integration/m2-artifacts-cli.test.ts) | 4 |
| [tests/contracts/m0-m1-adapters-regression.test.ts](../../../tests/contracts/m0-m1-adapters-regression.test.ts) | 6 |
| [tests/contracts/cross-interface-contract.test.ts](../../../tests/contracts/cross-interface-contract.test.ts) | 2 |
| [tests/contracts/m2-typed-write-contracts.test.ts](../../../tests/contracts/m2-typed-write-contracts.test.ts) | 5 |
| [packages/storage-sqlite/tests/storage.test.ts](../../../packages/storage-sqlite/tests/storage.test.ts) | 7 |
| [tests/contracts/m2-search-contracts.test.ts](../../../tests/contracts/m2-search-contracts.test.ts) | 5 |
| [tests/integration/m2-artifacts-filesystem.test.ts](../../../tests/integration/m2-artifacts-filesystem.test.ts) | 6 |
| [tests/integration/m2-typed-writes.test.ts](../../../tests/integration/m2-typed-writes.test.ts) | 12 |
| [tests/integration/m2-artifacts-core.test.ts](../../../tests/integration/m2-artifacts-core.test.ts) | 9 |
| [tests/probes/m0-probes.test.ts](../../../tests/probes/m0-probes.test.ts) | 3 |
| [tests/integration/m2-search.test.ts](../../../tests/integration/m2-search.test.ts) | 9 |
| [tests/integration/m2-knowledge-views.test.ts](../../../tests/integration/m2-knowledge-views.test.ts) | 7 |
| [packages/protocol/tests/schema.test.ts](../../../packages/protocol/tests/schema.test.ts) | 5 |
| [tests/contracts/m0-m1-r2-adapters.test.ts](../../../tests/contracts/m0-m1-r2-adapters.test.ts) | 3 |
| [tests/contracts/r4-c-contracts.test.ts](../../../tests/contracts/r4-c-contracts.test.ts) | 26 |
| [packages/storage-sqlite/tests/schema-generation.test.ts](../../../packages/storage-sqlite/tests/schema-generation.test.ts) | 6 |
| [tests/integration/m0-m1-r4-b-regression.test.ts](../../../tests/integration/m0-m1-r4-b-regression.test.ts) | 82 |
| **合计** | **252** |

新搜索 core9 + contracts5=14。既有 B82、C26、G4、附件 core9/FS6/HTTP8/CLI4、typed core12/protocol5、knowledge core7/contracts4保持。实际新 schema、工具与 HTTP 断言见 [单元 B](implementation/protocol/README.md)；签名、过滤、权限与预算见 [单元 A](implementation/core/README.md)。

| 有限独立证据 | 结果与边界 |
|---|---|
| 当前版本化命令 | 29/29 exit0；含 build/typecheck/lint/full formal，AC6、ADv2 5、AE5、U8通过，见 [commands](verification/commands.json) |
| 新搜索 | SQ01–08首跑通过：Unicode/字面符号/标签、分页与签名负例、权限生命周期、真实SQLite候选与items字节边界；[observed-search-first](verification/observed-search-first.json) |
| native传输 | 真实app/client 8104字节逻辑标签，编码URL超过16 KiB仍成功；不是inject或假server替代产品 |
| SQ09 | current29与integrity回归完成；原探针的pending为顺序来源，不改旧结果冒充同期完成 |
| 既有知识与历史 | [KV结果](verification/observed-knowledge.json)、[真实旧HTTP夹具](verification/observed-historical.json)保持；三个原键201，新create400，revision stale409/仅调整expected后400，改payload409，重启/墓碑/撤凭据通过 |
| 完整性 | 120产品/config/test、34当前规范材料执行稳定；1953旧证据、4SQL/archive、2schema/profile保持，正常24 tracked dist+4新search-cursor输出（untracked32→36）单列；[integrity](verification/integrity.json) |

操作仍35、19 JSON正文+1 multipart，沿用 [M2.1已验收政策表](../2026-10-03-m2-1/coverage-audit.md)，本包不新增接口。OpenAPI 的共享 q/cursor/响应 schema 与 x-logical-query-schema、限额扩展明确表达逻辑/传输预算，不能把 JSON 字节预算伪称普通 min/maxLength。

当前29包含 media-aware ADv2；原历史 JSON-only28/29失败证据保持，两者分列。16条 ignored date-time 不提供日期值格式验证。候选/items JSON限额不是VM/CPU/envelope硬限，context硬预算待M2.4；CLI无分页选项。Node22/干净安装/远程CI/10万负载/真实四宿主与模型未测，本机Pi/MCP受控契约不等于真实宿主认证。
